import type { Deps, UserRow } from '../context';
import { bumpMetric } from './tokens';
import { newId, normalizeEmail, now } from '../util';

export async function findUserByEmail(deps: Deps, email: string): Promise<UserRow | undefined> {
  return deps.db.selectFrom('users').selectAll().where('email', '=', normalizeEmail(email)).executeTakeFirst();
}

export async function findUserById(deps: Deps, id: string): Promise<UserRow | undefined> {
  return deps.db.selectFrom('users').selectAll().where('id', '=', id).executeTakeFirst();
}

export async function createUser(
  deps: Deps,
  input: { email: string; name: string; passwordHash: string | null; adultConfirmed: boolean; emailVerified?: boolean; consents?: Record<string, boolean> },
): Promise<UserRow> {
  const t = now();
  const email = normalizeEmail(input.email);
  const row: UserRow = {
    id: newId(),
    email,
    email_verified_at: input.emailVerified ? t : null,
    password_hash: input.passwordHash,
    name: input.name.trim().slice(0, 60) || 'Tú',
    role: deps.config.adminEmails.includes(email) ? 'admin' : 'user',
    adult_confirmed_at: input.adultConfirmed ? t : null,
    consents: JSON.stringify(input.consents ?? {}),
    plan: 'free',
    stripe_customer_id: null,
    subscription_status: null,
    subscription_period_end: null,
    created_at: t,
    updated_at: t,
  };
  await deps.db.insertInto('users').values(row).execute();
  await bumpMetric(deps.db, 'signup');
  return row;
}

/** Grants admin to emails listed in ADMIN_EMAILS on sign-in (bootstrap for the first admin). */
export async function applyAdminBootstrap(deps: Deps, user: UserRow): Promise<UserRow> {
  if (user.role === 'admin' || !deps.config.adminEmails.includes(user.email)) return user;
  await deps.db.updateTable('users').set({ role: 'admin', updated_at: now() }).where('id', '=', user.id).execute();
  return { ...user, role: 'admin' };
}
