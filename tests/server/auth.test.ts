import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../server/services/crypto';
import { makeTestApp, registered, tokenFrom } from './helpers';

describe('contraseñas', () => {
  it('usa scrypt con sal y verifica', async () => {
    const h = await hashPassword('una frase larga');
    expect(h.startsWith('scrypt$')).toBe(true);
    expect(h).not.toContain('una frase');
    expect(await verifyPassword('una frase larga', h)).toBe(true);
    expect(await verifyPassword('otra', h)).toBe(false);
    expect(await hashPassword('una frase larga')).not.toBe(h);
  });
});

describe('autenticación', () => {
  it('exige confirmar la mayoría de edad', async () => {
    const t = await makeTestApp();
    const res = await t.client().json('/api/auth/register', { json: { name: 'A', email: 'a@example.com', password: '12345678', adultConfirmed: false } });
    expect(res.status).toBe(400);
  });

  it('registra, crea sesión con cookie httpOnly y envía verificación', async () => {
    const t = await makeTestApp();
    const c = t.client();
    const raw = await c.req('/api/auth/register', { json: { name: 'Ana', email: 'Ana@Example.com', password: 'contraseña-segura', adultConfirmed: true } });
    expect(raw.status).toBe(201);
    const cookie = raw.headers.get('set-cookie')!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    const s = await c.json<{ user: { email: string; emailVerified: boolean } }>('/api/auth/session');
    expect(s.body.user.email).toBe('ana@example.com');
    expect(s.body.user.emailVerified).toBe(false);
    const token = tokenFrom(t.mail, 'verify');
    expect((await c.json('/api/auth/verify-email', { json: { token } })).status).toBe(200);
    expect((await c.json('/api/auth/verify-email', { json: { token } })).status).toBe(400);
    const s2 = await c.json<{ user: { emailVerified: boolean } }>('/api/auth/session');
    expect(s2.body.user.emailVerified).toBe(true);
  });

  it('no guarda la contraseña en claro ni el token de sesión', async () => {
    const t = await makeTestApp();
    const { c } = await registered(t);
    const user = await t.deps.db.selectFrom('users').selectAll().executeTakeFirstOrThrow();
    expect(user.password_hash).not.toContain('contraseña');
    const token = c.cookie.split('=')[1];
    const sessions = await t.deps.db.selectFrom('sessions').select('id').execute();
    expect(sessions.map((s) => s.id)).not.toContain(token);
  });

  it('login con error genérico y cierre de sesión', async () => {
    const t = await makeTestApp();
    await registered(t);
    const c = t.client();
    const bad = await c.json<{ error: string }>('/api/auth/login', { json: { email: 'ana@example.com', password: 'mal' } });
    expect(bad.status).toBe(401);
    const unknown = await c.json<{ error: string }>('/api/auth/login', { json: { email: 'nadie@example.com', password: 'mal' } });
    expect(unknown.body.error).toBe(bad.body.error);
    expect((await c.json('/api/auth/login', { json: { email: 'ana@example.com', password: 'contraseña-segura' } })).status).toBe(200);
    await c.json('/api/auth/logout', { method: 'POST' });
    const s = await c.json<{ user: unknown }>('/api/auth/session');
    expect(s.body.user).toBeNull();
  });

  it('limita los intentos de login', async () => {
    const t = await makeTestApp();
    const c = t.client();
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await c.json('/api/auth/login', { json: { email: 'x@example.com', password: 'nope' } })).status;
    expect(last).toBe(429);
  });

  it('restablece la contraseña e invalida sesiones anteriores', async () => {
    const t = await makeTestApp();
    const { c: old } = await registered(t);
    const c = t.client();
    await c.json('/api/auth/password/forgot', { json: { email: 'ana@example.com' } });
    const token = tokenFrom(t.mail, 'reset');
    expect((await c.json('/api/auth/password/reset', { json: { token, password: 'nueva-contraseña' } })).status).toBe(200);
    expect(((await old.json<{ user: unknown }>('/api/auth/session')).body.user)).toBeNull();
    expect((await t.client().json('/api/auth/login', { json: { email: 'ana@example.com', password: 'nueva-contraseña' } })).status).toBe(200);
  });

  it('no revela si un correo existe al pedir recuperación', async () => {
    const t = await makeTestApp();
    const a = await t.client().json('/api/auth/password/forgot', { json: { email: 'nadie@example.com' } });
    expect(a.status).toBe(200);
    expect(t.mail.sent).toHaveLength(0);
  });

  it('enlace mágico: crea la cuenta solo con confirmación de edad y es de un solo uso', async () => {
    const t = await makeTestApp();
    const c = t.client();
    await c.json('/api/auth/magic-link', { json: { email: 'nueva@example.com' } });
    expect(t.mail.sent).toHaveLength(0);
    await c.json('/api/auth/magic-link', { json: { email: 'nueva@example.com', adultConfirmed: true, name: 'Luz' } });
    const token = tokenFrom(t.mail, 'magic');
    const res = await c.json<{ user: { name: string; emailVerified: boolean; adultConfirmed: boolean } }>('/api/auth/magic-link/consume', { json: { token } });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: 'Luz', emailVerified: true, adultConfirmed: true });
    expect((await t.client().json('/api/auth/magic-link/consume', { json: { token } })).status).toBe(400);
  });

  it('rechaza peticiones de otro origen (CSRF)', async () => {
    const t = await makeTestApp();
    const res = await t.app.request('/api/auth/login', {
      method: 'POST',
      headers: { Origin: 'https://malicioso.example', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@example.com', password: 'x' }),
    });
    expect(res.status).toBe(403);
  });

  it('da rol admin a ADMIN_EMAILS y protege /api/admin', async () => {
    const t = await makeTestApp({ ADMIN_EMAILS: 'jefa@example.com' });
    const { c: user } = await registered(t, 'ana@example.com');
    expect((await user.json('/api/admin/metrics')).status).toBe(403);
    const { c: admin } = await registered(t, 'jefa@example.com');
    const m = await admin.json<{ totals: Record<string, unknown> }>('/api/admin/metrics');
    expect(m.status).toBe(200);
    expect(m.body.totals.users).toBe('<5');
  });

  it('exporta y elimina la cuenta con confirmación', async () => {
    const t = await makeTestApp();
    const { c } = await registered(t);
    const exp = await c.json<{ cuenta: { email: string } }>('/api/account/export');
    expect(exp.body.cuenta.email).toBe('ana@example.com');
    expect((await c.json('/api/account', { method: 'DELETE', json: { confirm: 'no' } })).status).toBe(400);
    expect((await c.json('/api/account', { method: 'DELETE', json: { confirm: 'BORRAR', password: 'mal' } })).status).toBe(400);
    expect((await c.json('/api/account', { method: 'DELETE', json: { confirm: 'BORRAR', password: 'contraseña-segura' } })).status).toBe(200);
    expect(await t.deps.db.selectFrom('users').selectAll().execute()).toHaveLength(0);
    expect(await t.deps.db.selectFrom('sessions').selectAll().execute()).toHaveLength(0);
  });

  it('expone la configuración pública sin secretos', async () => {
    const t = await makeTestApp({ GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'muy-secreto' });
    const res = await t.app.request('/api/config');
    const text = await res.text();
    expect(text).not.toContain('muy-secreto');
    expect(JSON.parse(text).auth.google).toBe(true);
    expect(JSON.parse(text).auth.apple).toBe(false);
  });
});
