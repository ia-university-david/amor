import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { buildCorsOrigins } from '../server/config';
import { canonicalHostRedirect, originCheck } from '../server/middleware/security';

describe('orígenes permitidos', () => {
  it('acepta los dos orígenes de producción y rechaza uno ajeno', async () => {
    const allowed = buildCorsOrigins('https://amortoxico.com', undefined, true);
    expect(allowed).toContain('https://amortoxico.com');
    expect(allowed).toContain('https://www.amortoxico.com');
    expect(allowed).not.toContain('https://malicioso.example');
    expect(allowed).not.toContain('http://localhost:5173');

    const app = new Hono();
    app.use('*', originCheck(allowed));
    app.post('/api/auth/login', (c) => c.json({ ok: true }));

    for (const origin of ['https://amortoxico.com', 'https://www.amortoxico.com']) {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json' },
        body: '{}',
      });
      expect(res.status).toBe(200);
    }

    const rejected = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { Origin: 'https://malicioso.example', 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(rejected.status).toBe(403);
    expect(await rejected.json()).toEqual({ error: 'Origen no permitido' });
  });

  it('en desarrollo conserva localhost', () => {
    const allowed = buildCorsOrigins('http://localhost:5173', 'https://preview.example', false);
    expect(allowed).toEqual(
      expect.arrayContaining([
        'http://localhost:5173',
        'http://localhost:8787',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:8787',
        'https://amortoxico.com',
        'https://www.amortoxico.com',
        'https://preview.example',
      ]),
    );
  });

  it('redirige las páginas de www al dominio canónico y no toca la API', async () => {
    const app = new Hono();
    app.use('*', canonicalHostRedirect());
    app.all('*', (c) => c.text('ok'));

    const page = await app.request('https://www.amortoxico.com/app/hoy?dia=1', {
      headers: { Host: 'www.amortoxico.com' },
    });
    expect(page.status).toBe(301);
    expect(page.headers.get('location')).toBe('https://amortoxico.com/app/hoy?dia=1');

    const viaProxy = await app.request('http://127.0.0.1:8787/guia-72-horas', {
      headers: { Host: '127.0.0.1:8787', 'X-Forwarded-Host': 'www.amortoxico.com' },
    });
    expect(viaProxy.status).toBe(301);
    expect(viaProxy.headers.get('location')).toBe('https://amortoxico.com/guia-72-horas');

    const api = await app.request('https://www.amortoxico.com/api/auth/login', {
      method: 'POST',
      headers: { Host: 'www.amortoxico.com', Origin: 'https://www.amortoxico.com' },
    });
    expect(api.status).toBe(200);

    const apex = await app.request('https://amortoxico.com/');
    expect(apex.status).toBe(200);
  });
});
