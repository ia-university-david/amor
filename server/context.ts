import type { Context } from 'hono';
import type { Selectable } from 'kysely';
import type { Config } from './config';
import type { DB } from './db';
import type { UsersTable } from './db/schema';
import type { Logger } from './logger';
import type { Mailer } from './services/email';
import type { Vault } from './services/crypto';
import type { LlmProvider } from './services/llm';
import type { BillingService } from './services/billing';
import type { PushService } from './services/push';
import type { RateLimiter } from './middleware/rateLimit';

export type UserRow = Selectable<UsersTable>;

export interface Deps {
  config: Config;
  db: DB;
  log: Logger;
  mailer: Mailer;
  vault: Vault;
  llm: LlmProvider | null;
  billing: BillingService | null;
  push: PushService | null;
  limiter: RateLimiter;
}

export type AppEnv = {
  Variables: {
    user: UserRow | null;
    sessionId: string | null;
    requestId: string;
  };
};

export type Ctx = Context<AppEnv>;

export const ROLES = ['user', 'moderador', 'editor', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export function publicUser(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role as Role,
    emailVerified: Boolean(u.email_verified_at),
    adultConfirmed: Boolean(u.adult_confirmed_at),
    plan: u.plan,
    subscriptionStatus: u.subscription_status,
    subscriptionPeriodEnd: u.subscription_period_end,
    hasPassword: Boolean(u.password_hash),
    consents: JSON.parse(u.consents || '{}') as Record<string, boolean>,
    createdAt: u.created_at,
  };
}
export type PublicUser = ReturnType<typeof publicUser>;
