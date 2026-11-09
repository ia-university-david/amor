import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import type { Hono } from 'hono';
import type { AppEnv } from './context';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.pdf': 'application/pdf',
};

/** Old amortoxico.com URLs → new routes (301). Keep in sync with deploy/nginx.conf. */
export const LEGACY_REDIRECTS: Record<string, string> = {
  '/vsl': '/test',
  '/vsl/': '/test',
  '/index.html': '/',
  '/inicio': '/',
  '/home': '/',
  '/articulos': '/blog',
  '/articulos/': '/blog',
  '/guia': '/guia-72-horas',
  '/guia-72h': '/guia-72-horas',
  '/test-amor-toxico': '/test',
  '/contact': '/contacto',
  '/privacy': '/privacidad',
  '/politica-de-privacidad': '/privacidad',
};

async function fileAt(path: string): Promise<string | null> {
  try {
    const s = await stat(path);
    return s.isFile() ? path : null;
  } catch {
    return null;
  }
}

export function mountStatic(app: Hono<AppEnv>, dir: string) {
  const root = resolve(dir);
  app.on(['GET', 'HEAD'], '*', async (c, next) => {
    const url = new URL(c.req.url);
    let path = decodeURIComponent(url.pathname);
    if (path.startsWith('/api/')) return next();
    const legacy = LEGACY_REDIRECTS[path];
    if (legacy) return c.redirect(legacy + url.search, 301);
    // Trailing slashes from the old site: /blog/ → /blog
    if (path.length > 1 && path.endsWith('/')) return c.redirect(path.replace(/\/+$/, '') + url.search, 301);
    path = normalize(path).replace(/^([/\\])+/, '');
    const candidates = [join(root, path), join(root, path, 'index.html')];
    let file: string | null = null;
    for (const cand of candidates) {
      if (!cand.startsWith(root + sep) && cand !== root) continue;
      file = await fileAt(cand);
      if (file) break;
    }
    const isAsset = path.startsWith('assets/');
    if (!file) {
      if (isAsset || extname(path)) return c.text('No encontrado', 404);
      file = join(root, 'index.html');
    }
    const body = await readFile(file);
    const type = TYPES[extname(file)] ?? 'application/octet-stream';
    c.header('Content-Type', type);
    if (isAsset) c.header('Cache-Control', 'public, max-age=31536000, immutable');
    else if (file.endsWith('sw.js')) {
      c.header('Cache-Control', 'no-cache');
      c.header('Service-Worker-Allowed', '/');
    } else if (type.startsWith('text/html') || file.endsWith('.webmanifest')) c.header('Cache-Control', 'no-cache');
    else c.header('Cache-Control', 'public, max-age=86400');
    return c.req.method === 'HEAD' ? c.body(null) : c.body(new Uint8Array(body));
  });
}
