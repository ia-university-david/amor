import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../context';
import type { Logger } from '../logger';
import { newId } from '../util';

export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // React sets inline style attributes; no inline <style> or scripts are used.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' https:",
  "font-src 'self'",
  "connect-src 'self'",
  'frame-src https://www.youtube-nocookie.com https://player.vimeo.com',
  "worker-src 'self'",
  "manifest-src 'self'",
  "base-uri 'self'",
  "form-action 'self' https://appleid.apple.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join('; ');

export function securityHeaders(isProd: boolean): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('X-Frame-Options', 'DENY');
    c.header('Cross-Origin-Opener-Policy', 'same-origin');
    c.header('Permissions-Policy', 'camera=(), geolocation=(), payment=(), usb=(), microphone=(self)');
    if (!c.res.headers.has('Content-Security-Policy')) c.header('Content-Security-Policy', CSP);
    if (isProd) c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    if (c.req.path.startsWith('/api/')) c.header('Cache-Control', 'no-store');
  };
}

/**
 * CSRF protection for cookie sessions: unsafe methods must come from an
 * allowed Origin (browsers always send it on cross-site POST/PUT/DELETE).
 * Combined with SameSite=Lax cookies and JSON bodies.
 */
export const CANONICAL_HOST = 'amortoxico.com';
export const WWW_HOST = 'www.amortoxico.com';

function hostnames(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((part) => part.trim().toLowerCase().replace(/:\d+$/, ''))
    .filter(Boolean);
}

/**
 * Single canonical host. When this process serves the HTML, a request whose
 * public host is www.amortoxico.com is redirected to https://amortoxico.com
 * with the same path and query. /api is left alone: a 301 would turn POST
 * into GET, and the www origin stays on the allowlist for that case.
 */
export function canonicalHostRedirect(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const path = c.req.path;
    if (path === '/api' || path.startsWith('/api/')) return next();
    const hosts = [...hostnames(c.req.header('x-forwarded-host')), ...hostnames(c.req.header('host'))];
    if (!hosts.includes(WWW_HOST)) return next();
    const url = new URL(c.req.url);
    return c.redirect(`https://${CANONICAL_HOST}${url.pathname}${url.search}`, 301);
  };
}

export function originCheck(allowed: string[], exempt: string[] = []): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const method = c.req.method;
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS' || exempt.some((p) => c.req.path.startsWith(p))) return next();
    const origin = c.req.header('origin');
    if (origin) {
      if (!allowed.includes(origin)) return c.json({ error: 'Origen no permitido' }, 403);
    } else {
      const fetchSite = c.req.header('sec-fetch-site');
      if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') return c.json({ error: 'Origen no permitido' }, 403);
    }
    return next();
  };
}

/** Access log: method, route, status and latency only — never bodies, query strings or cookies. */
export function requestLog(log: Logger): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const id = c.req.header('x-request-id')?.slice(0, 64) || newId();
    c.set('requestId', id);
    const start = performance.now();
    try {
      await next();
    } finally {
      if (c.req.path.startsWith('/api/')) {
        log.info('http', {
          id,
          method: c.req.method,
          path: c.req.routePath || c.req.path.replace(/[0-9a-f-]{20,}/gi, ':id'),
          status: c.res.status,
          ms: Math.round(performance.now() - start),
        });
      }
    }
  };
}
