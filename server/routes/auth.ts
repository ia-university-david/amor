import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';
import type { AppEnv, Ctx, Deps } from '../context';
import { publicUser } from '../context';
import { rateLimit } from '../middleware/rateLimit';
import { createSession, destroySession, requireUser } from '../middleware/session';
import { DUMMY_HASH, hashPassword, verifyPassword } from '../services/crypto';
import { templates } from '../services/email';
import { finishOAuth, startOAuth, type OAuthProvider } from '../services/oauth';
import { consumeToken, issueToken } from '../services/tokens';
import { applyAdminBootstrap, createUser, findUserByEmail, findUserById } from '../services/users';
import { normalizeEmail, now, parseJSON } from '../util';
import { body } from './validate';

export const MIN_PASSWORD = 8;
const email = z.string().trim().max(254).email();
const password = z.string().min(MIN_PASSWORD).max(200);

const GENERIC_SENT = { ok: true, message: 'Si el correo es correcto, te llegará un mensaje en unos minutos.' };
const OAUTH_COOKIE = 'amor_oauth';

export function authRoutes(deps: Deps) {
  const r = new Hono<AppEnv>();
  const { config, db, mailer, limiter } = deps;
  const origin = new URL(config.APP_URL).origin;
  const link = (path: string, token: string) => `${origin}${path}?token=${encodeURIComponent(token)}`;
  const strict = (name: string, limit: number) => rateLimit(limiter, { name, limit, windowMs: 15 * 60_000, trustProxy: config.TRUST_PROXY });

  async function sendVerification(userId: string, to: string) {
    const token = await issueToken(db, { kind: 'verify', email: to, userId, ttlMinutes: 24 * 60 });
    await mailer.send(templates.verify(to, link('/cuenta/verificar', token)));
  }

  r.get('/session', (c) => {
    const user = c.get('user');
    return c.json({ user: user ? publicUser(user) : null });
  });

  r.post(
    '/register',
    strict('register', 10),
    body(
      z.object({
        name: z.string().trim().min(1).max(60),
        email,
        password,
        adultConfirmed: z.literal(true),
        consents: z.object({ sync: z.boolean().optional(), marketing: z.boolean().optional() }).optional(),
      }),
    ),
    async (c) => {
      const input = c.req.valid('json');
      const existing = await findUserByEmail(deps, input.email);
      if (existing) {
        // Do not reveal whether the email exists: same response, and the owner gets a sign-in link.
        const token = await issueToken(db, { kind: 'magic', email: existing.email, userId: existing.id, ttlMinutes: 15 });
        await mailer.send(templates.magic(existing.email, link('/cuenta/enlace', token)));
        return c.json({ error: 'No pudimos crear la cuenta con ese correo. Si ya tienes una, inicia sesión; te enviamos un enlace de acceso.' }, 409);
      }
      const user = await createUser(deps, {
        email: input.email,
        name: input.name,
        passwordHash: await hashPassword(input.password),
        adultConfirmed: true,
        consents: { sync: Boolean(input.consents?.sync), marketing: Boolean(input.consents?.marketing) },
      });
      await createSession(deps, c, user.id);
      await sendVerification(user.id, user.email);
      return c.json({ user: publicUser(user) }, 201);
    },
  );

  r.post('/login', strict('login', 10), body(z.object({ email, password: z.string().min(1).max(200) })), async (c) => {
    const input = c.req.valid('json');
    const perEmail = limiter.take(`login-email:${normalizeEmail(input.email)}`, 8, 15 * 60_000);
    if (!perEmail.ok) return c.json({ error: 'Demasiados intentos. Espera unos minutos o usa “Olvidé mi contraseña”.' }, 429);
    const user = await findUserByEmail(deps, input.email);
    const ok = await verifyPassword(input.password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !ok) return c.json({ error: 'El correo o la contraseña no coinciden.' }, 401);
    const u = await applyAdminBootstrap(deps, user);
    await createSession(deps, c, u.id);
    return c.json({ user: publicUser(u) });
  });

  r.post('/logout', async (c) => {
    await destroySession(deps, c);
    return c.json({ ok: true });
  });

  r.post(
    '/magic-link',
    strict('magic', 5),
    body(z.object({ email, name: z.string().trim().max(60).optional(), adultConfirmed: z.boolean().optional() })),
    async (c) => {
      if (!config.features.magicLink) return c.json({ error: 'El acceso por enlace no está disponible.' }, 503);
      const input = c.req.valid('json');
      const to = normalizeEmail(input.email);
      const user = await findUserByEmail(deps, to);
      if (user || input.adultConfirmed) {
        const token = await issueToken(db, {
          kind: 'magic',
          email: to,
          userId: user?.id ?? null,
          data: user ? undefined : { name: input.name ?? '', adultConfirmed: true },
          ttlMinutes: 15,
        });
        await mailer.send(templates.magic(to, link('/cuenta/enlace', token)));
      }
      return c.json(GENERIC_SENT);
    },
  );

  r.post('/magic-link/consume', strict('magic-consume', 20), body(z.object({ token: z.string().min(10).max(200) })), async (c) => {
    const row = await consumeToken(db, 'magic', c.req.valid('json').token);
    if (!row) return c.json({ error: 'El enlace caducó o ya se usó. Pide uno nuevo.' }, 400);
    let user = row.user_id ? await findUserById(deps, row.user_id) : await findUserByEmail(deps, row.email);
    if (!user) {
      const data = parseJSON<{ name?: string; adultConfirmed?: boolean }>(row.data, {});
      user = await createUser(deps, { email: row.email, name: data.name || 'Tú', passwordHash: null, adultConfirmed: Boolean(data.adultConfirmed), emailVerified: true });
    } else if (!user.email_verified_at) {
      await db.updateTable('users').set({ email_verified_at: now(), updated_at: now() }).where('id', '=', user.id).execute();
      user = { ...user, email_verified_at: now() };
    }
    user = await applyAdminBootstrap(deps, user);
    await createSession(deps, c, user.id);
    return c.json({ user: publicUser(user) });
  });

  r.post('/verify-email/request', requireUser, strict('verify-req', 5), async (c) => {
    const user = c.get('user')!;
    if (user.email_verified_at) return c.json({ ok: true, already: true });
    await sendVerification(user.id, user.email);
    return c.json({ ok: true });
  });

  r.post('/verify-email', strict('verify', 20), body(z.object({ token: z.string().min(10).max(200) })), async (c) => {
    const row = await consumeToken(db, 'verify', c.req.valid('json').token);
    if (!row?.user_id) return c.json({ error: 'El enlace caducó o ya se usó.' }, 400);
    await db.updateTable('users').set({ email_verified_at: now(), updated_at: now() }).where('id', '=', row.user_id).execute();
    return c.json({ ok: true });
  });

  r.post('/password/forgot', strict('forgot', 5), body(z.object({ email })), async (c) => {
    const user = await findUserByEmail(deps, c.req.valid('json').email);
    if (user) {
      const token = await issueToken(db, { kind: 'reset', email: user.email, userId: user.id, ttlMinutes: 60 });
      await mailer.send(templates.reset(user.email, link('/cuenta/restablecer', token)));
    }
    return c.json(GENERIC_SENT);
  });

  r.post('/password/reset', strict('reset', 10), body(z.object({ token: z.string().min(10).max(200), password })), async (c) => {
    const input = c.req.valid('json');
    const row = await consumeToken(db, 'reset', input.token);
    if (!row?.user_id) return c.json({ error: 'El enlace caducó o ya se usó. Pide uno nuevo.' }, 400);
    const t = now();
    await db
      .updateTable('users')
      .set({ password_hash: await hashPassword(input.password), email_verified_at: t, updated_at: t })
      .where('id', '=', row.user_id)
      .execute();
    await db.deleteFrom('sessions').where('user_id', '=', row.user_id).execute();
    await createSession(deps, c, row.user_id);
    const user = await findUserById(deps, row.user_id);
    return c.json({ user: user ? publicUser(user) : null });
  });

  // ── OAuth (Google, Apple). Only active when their env vars are set.
  const enabled = (p: string): p is OAuthProvider => (p === 'google' && config.features.google) || (p === 'apple' && config.features.apple);

  r.get('/oauth/:provider/start', strict('oauth', 20), (c) => {
    const provider = c.req.param('provider');
    if (!enabled(provider)) return c.json({ error: 'Proveedor no configurado.' }, 404);
    const s = startOAuth(config, provider);
    setCookie(c, OAUTH_COOKIE, JSON.stringify({ p: provider, s: s.state, v: s.verifier, n: s.nonce }), {
      httpOnly: true,
      secure: config.isProd,
      // Apple returns with a cross-site form POST, which only carries SameSite=None cookies.
      sameSite: config.isProd ? 'None' : 'Lax',
      path: '/api/auth/oauth',
      maxAge: 600,
    });
    return c.redirect(s.url);
  });

  const callback = async (c: Ctx) => {
    const provider = c.req.param('provider') ?? '';
    const fail = (reason: string) => {
      deps.log.warn('oauth.failed', { provider, reason });
      return c.redirect(`${origin}/entrar?error=oauth`);
    };
    if (!enabled(provider)) return fail('disabled');
    const saved = parseJSON<{ p?: string; s?: string; v?: string; n?: string }>(getCookie(c, OAUTH_COOKIE), {});
    deleteCookie(c, OAUTH_COOKIE, { path: '/api/auth/oauth' });
    const params: Record<string, string> =
      c.req.method === 'POST' ? ((await c.req.parseBody()) as Record<string, string>) : (c.req.query() as Record<string, string>);
    if (!saved.s || saved.p !== provider || params.state !== saved.s || !params.code) return fail('state');
    try {
      const appleUser = params.user ? parseJSON<{ name?: { firstName?: string; lastName?: string } }>(params.user, {}) : undefined;
      const id = await finishOAuth(config, provider, params.code, saved.v ?? '', saved.n ?? '', appleUser);
      const linked = await db.selectFrom('oauth_accounts').select('user_id').where('provider', '=', id.provider).where('provider_user_id', '=', id.providerUserId).executeTakeFirst();
      let user = linked ? await findUserById(deps, linked.user_id) : undefined;
      if (!user) {
        const byEmail = await findUserByEmail(deps, id.email);
        if (byEmail && !id.emailVerified) return fail('unverified-email');
        user = byEmail ?? (await createUser(deps, { email: id.email, name: id.name ?? 'Tú', passwordHash: null, adultConfirmed: false, emailVerified: id.emailVerified }));
        await db.insertInto('oauth_accounts').values({ provider: id.provider, provider_user_id: id.providerUserId, user_id: user.id, created_at: now() }).execute();
      }
      user = await applyAdminBootstrap(deps, user);
      await createSession(deps, c, user.id);
      return c.redirect(`${origin}${user.adult_confirmed_at ? '/cuenta/listo' : '/cuenta/confirmar-edad'}`);
    } catch (err) {
      return fail((err as Error).message);
    }
  };
  r.get('/oauth/:provider/callback', callback);
  r.post('/oauth/:provider/callback', callback);

  return r;
}
