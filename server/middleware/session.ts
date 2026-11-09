import type { MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { AppEnv, Deps, Role } from '../context';
import { now, randomToken, sha256 } from '../util';

export const SESSION_COOKIE = 'amor_sid';

export function sessionCookieOptions(isProd: boolean, maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'Lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

export async function createSession(deps: Deps, c: Parameters<MiddlewareHandler<AppEnv>>[0], userId: string): Promise<void> {
  const token = randomToken();
  const days = deps.config.SESSION_DAYS;
  const t = now();
  await deps.db
    .insertInto('sessions')
    .values({ id: sha256(token), user_id: userId, created_at: t, last_seen_at: t, expires_at: new Date(Date.now() + days * 86_400_000).toISOString() })
    .execute();
  setCookie(c, SESSION_COOKIE, token, sessionCookieOptions(deps.config.isProd, days * 86_400));
}

export async function destroySession(deps: Deps, c: Parameters<MiddlewareHandler<AppEnv>>[0]): Promise<void> {
  const id = c.get('sessionId');
  if (id) await deps.db.deleteFrom('sessions').where('id', '=', id).execute();
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

/** Loads the user for the session cookie, if any. Expired sessions are removed. */
export function loadSession(deps: Deps): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    c.set('user', null);
    c.set('sessionId', null);
    const token = getCookie(c, SESSION_COOKIE);
    if (token && token.length < 200) {
      const id = sha256(token);
      const row = await deps.db
        .selectFrom('sessions')
        .innerJoin('users', 'users.id', 'sessions.user_id')
        .selectAll('users')
        .select(['sessions.expires_at as session_expires', 'sessions.last_seen_at as session_seen'])
        .where('sessions.id', '=', id)
        .executeTakeFirst();
      if (row && row.session_expires > now()) {
        const { session_expires: _e, session_seen, ...user } = row;
        c.set('user', user);
        c.set('sessionId', id);
        if (Date.now() - new Date(session_seen).getTime() > 3_600_000) {
          await deps.db.updateTable('sessions').set({ last_seen_at: now() }).where('id', '=', id).execute();
        }
      } else if (row) {
        await deps.db.deleteFrom('sessions').where('id', '=', id).execute();
        deleteCookie(c, SESSION_COOKIE, { path: '/' });
      }
    }
    await next();
  };
}

export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.get('user')) return c.json({ error: 'Necesitas iniciar sesión.' }, 401);
  await next();
};

const RANK: Record<Role, number> = { user: 0, moderador: 1, editor: 1, admin: 2 };

/** Allows the listed roles; admin is always allowed. */
export function requireRole(...roles: Role[]): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const user = c.get('user');
    if (!user) return c.json({ error: 'Necesitas iniciar sesión.' }, 401);
    const role = user.role as Role;
    if (role !== 'admin' && !roles.includes(role)) return c.json({ error: 'No tienes permiso para esta sección.' }, 403);
    await next();
  };
}

export function hasRole(role: string, ...roles: Role[]): boolean {
  return role === 'admin' || roles.includes(role as Role) || (RANK[role as Role] ?? 0) >= 2;
}
