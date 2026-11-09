import type { MiddlewareHandler } from 'hono';
import type { AppEnv, Ctx } from '../context';

/**
 * Fixed-window in-memory rate limiter. Good for a single instance; for
 * several instances put a shared store (Redis) behind the same interface.
 */
export class RateLimiter {
  private hits = new Map<string, { count: number; reset: number }>();
  private lastSweep = Date.now();

  constructor(private readonly clock: () => number = Date.now) {}

  /** Returns remaining requests, or -1 when the limit is exceeded. */
  take(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
    const t = this.clock();
    if (t - this.lastSweep > 60_000) this.sweep(t);
    const entry = this.hits.get(key);
    if (!entry || entry.reset <= t) {
      this.hits.set(key, { count: 1, reset: t + windowMs });
      return { ok: true, retryAfter: 0 };
    }
    entry.count++;
    if (entry.count > limit) return { ok: false, retryAfter: Math.ceil((entry.reset - t) / 1000) };
    return { ok: true, retryAfter: 0 };
  }

  reset() {
    this.hits.clear();
  }

  private sweep(t: number) {
    for (const [k, v] of this.hits) if (v.reset <= t) this.hits.delete(k);
    this.lastSweep = t;
  }
}

export function clientIp(c: Ctx, trustProxy: boolean): string {
  if (trustProxy) {
    const fwd = c.req.header('x-forwarded-for');
    if (fwd) return fwd.split(',')[0].trim();
    const real = c.req.header('x-real-ip');
    if (real) return real;
  }
  // @hono/node-server exposes the socket on env.incoming.
  const incoming = (c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined)?.incoming;
  return incoming?.socket?.remoteAddress ?? 'local';
}

export function rateLimit(
  limiter: RateLimiter,
  opts: { name: string; limit: number; windowMs: number; trustProxy: boolean; by?: 'ip' | 'user' },
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const who = opts.by === 'user' ? (c.get('user')?.id ?? clientIp(c, opts.trustProxy)) : clientIp(c, opts.trustProxy);
    const r = limiter.take(`${opts.name}:${who}`, opts.limit, opts.windowMs);
    if (!r.ok) {
      c.header('Retry-After', String(r.retryAfter));
      return c.json({ error: 'Has hecho muchas solicitudes seguidas. Espera un momento y vuelve a intentarlo.' }, 429);
    }
    await next();
  };
}
