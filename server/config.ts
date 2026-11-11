import { z } from 'zod';

const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : ['1', 'true', 'yes', 'si', 'sí'].includes(v.toLowerCase())));

const str = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(8787),
  HOST: z.string().default('0.0.0.0'),
  APP_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: str,
  TRUST_PROXY: bool(false),
  STATIC_DIR: str,
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  DATABASE_URL: z.string().default('sqlite:./data/amor.db'),
  DATA_ENCRYPTION_KEY: str,
  SESSION_DAYS: z.coerce.number().int().positive().default(30),
  ADMIN_EMAILS: str,

  EMAIL_TRANSPORT: z.enum(['console', 'smtp', 'resend', 'memory']).default('console'),
  EMAIL_FROM: z.string().default('Amor Tóxico <hola@amortoxico.com>'),
  SMTP_URL: str,
  RESEND_API_KEY: str,
  CONTACT_INBOX: str,
  EBOOK_URL: str,

  GOOGLE_CLIENT_ID: str,
  GOOGLE_CLIENT_SECRET: str,
  APPLE_CLIENT_ID: str,
  APPLE_TEAM_ID: str,
  APPLE_KEY_ID: str,
  APPLE_PRIVATE_KEY: str,

  LLM_PROVIDER: z.enum(['none', 'openai', 'anthropic']).default('none'),
  LLM_API_KEY: str,
  LLM_MODEL: str,
  LLM_BASE_URL: str,
  LLM_MAX_TOKENS: z.coerce.number().int().positive().default(600),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),

  STRIPE_SECRET_KEY: str,
  STRIPE_WEBHOOK_SECRET: str,
  STRIPE_PRICE_MONTHLY: str,
  STRIPE_PRICE_YEARLY: str,

  VAPID_PUBLIC_KEY: str,
  VAPID_PRIVATE_KEY: str,
  VAPID_SUBJECT: z.string().default('mailto:hola@amortoxico.com'),
  PUSH_SCHEDULER: bool(true),

  COMMUNITY_REQUIRE_VERIFIED: bool(true),
});

export type Env = z.infer<typeof EnvSchema>;

/** Public site. Both hosts must be allowed: www currently serves the same app. */
export const PRODUCTION_WEB_ORIGINS = ['https://amortoxico.com', 'https://www.amortoxico.com'] as const;

/** Vite (5173) and the API (8787), by name and by loopback. Only outside production. */
export const DEV_LOCAL_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:8787',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8787',
] as const;

export function buildCorsOrigins(appOrigin: string, extra: string | undefined, isProd: boolean): string[] {
  const fromEnv = extra?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
  const locals = isProd ? [] : DEV_LOCAL_ORIGINS;
  return [...new Set([appOrigin, ...PRODUCTION_WEB_ORIGINS, ...locals, ...fromEnv])];
}

export interface Config extends Env {
  isProd: boolean;
  corsOrigins: string[];
  adminEmails: string[];
  features: {
    google: boolean;
    apple: boolean;
    magicLink: boolean;
    llm: boolean;
    billing: boolean;
    push: boolean;
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Configuración inválida: ${issues}`);
  }
  const e = parsed.data;
  const isProd = e.NODE_ENV === 'production';
  if (isProd && !e.DATA_ENCRYPTION_KEY) {
    throw new Error('DATA_ENCRYPTION_KEY es obligatoria en producción (genera una con `npm run secrets`).');
  }
  if (isProd && e.EMAIL_TRANSPORT === 'memory') throw new Error('EMAIL_TRANSPORT=memory no está permitido en producción.');
  const appOrigin = new URL(e.APP_URL).origin;
  const corsOrigins = buildCorsOrigins(appOrigin, e.CORS_ORIGINS, isProd);
  return {
    ...e,
    isProd,
    corsOrigins,
    adminEmails: e.ADMIN_EMAILS?.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) ?? [],
    features: {
      google: Boolean(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET),
      apple: Boolean(e.APPLE_CLIENT_ID && e.APPLE_TEAM_ID && e.APPLE_KEY_ID && e.APPLE_PRIVATE_KEY),
      magicLink: e.EMAIL_TRANSPORT !== 'console' || !isProd,
      llm: e.LLM_PROVIDER !== 'none' && Boolean(e.LLM_API_KEY),
      billing: Boolean(e.STRIPE_SECRET_KEY && e.STRIPE_WEBHOOK_SECRET && (e.STRIPE_PRICE_MONTHLY || e.STRIPE_PRICE_YEARLY)),
      push: Boolean(e.VAPID_PUBLIC_KEY && e.VAPID_PRIVATE_KEY),
    },
  };
}
