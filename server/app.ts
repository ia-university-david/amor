import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppEnv, Deps } from './context';
import type { Config } from './config';
import { createDb, migrate } from './db';
import { seedContent } from './db/seed';
import { createLogger, type Logger } from './logger';
import { RateLimiter } from './middleware/rateLimit';
import { originCheck, requestLog, securityHeaders } from './middleware/security';
import { loadSession } from './middleware/session';
import { BillingService } from './services/billing';
import { Vault } from './services/crypto';
import { Mailer, createTransport, type EmailTransport } from './services/email';
import { createLlm, type LlmProvider } from './services/llm';
import { PushService, webPushSender, type PushSender } from './services/push';
import { accountRoutes, backupRoutes, syncRoutes } from './routes/account';
import { assistantRoutes } from './routes/assistant';
import { authRoutes } from './routes/auth';
import { billingRoutes } from './routes/billing';
import { communityRoutes, seedRooms } from './routes/community';
import { adminRoutes, contentRoutes } from './routes/content';
import { leadRoutes } from './routes/leads';
import { metaRoutes, seoRoutes } from './routes/meta';
import { pushRoutes } from './routes/push';
import { mountStatic } from './static';

export interface DepOverrides {
  log?: Logger;
  transport?: EmailTransport;
  llm?: LlmProvider | null;
  billing?: BillingService | null;
  pushSender?: PushSender | null;
}

export async function buildDeps(config: Config, o: DepOverrides = {}): Promise<Deps> {
  const log = o.log ?? createLogger(config.LOG_LEVEL);
  const db = await createDb(config.DATABASE_URL);
  await migrate(db);
  await seedContent(db);
  const deps: Deps = {
    config,
    db,
    log,
    mailer: new Mailer(o.transport ?? createTransport(config), log),
    vault: new Vault(config.DATA_ENCRYPTION_KEY, !config.isProd),
    llm: o.llm !== undefined ? o.llm : createLlm(config),
    billing: null,
    push: null,
    limiter: new RateLimiter(),
  };
  deps.billing = o.billing !== undefined ? o.billing : config.features.billing ? new BillingService(config, db, log) : null;
  const sender = o.pushSender !== undefined ? o.pushSender : config.features.push ? webPushSender(config) : null;
  deps.push = sender ? new PushService(db, sender, log, config.VAPID_PUBLIC_KEY ?? 'test-key') : null;
  await seedRooms(deps);
  return deps;
}

export function createApp(deps: Deps, opts: { staticDir?: string } = {}) {
  const app = new Hono<AppEnv>();
  const { config, log } = deps;

  app.use('*', requestLog(log));
  app.use('*', securityHeaders(config.isProd));
  app.use('/api/*', cors({ origin: config.corsOrigins, credentials: true, allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], maxAge: 600 }));
  app.use('/api/*', originCheck(config.corsOrigins, ['/api/billing/webhook', '/api/auth/oauth/apple/callback']));
  app.use('/api/*', loadSession(deps));

  const api = new Hono<AppEnv>();
  api.route('/', metaRoutes(deps));
  api.route('/auth', authRoutes(deps));
  api.route('/account', accountRoutes(deps));
  api.route('/sync', syncRoutes(deps));
  api.route('/backup', backupRoutes(deps));
  api.route('/assistant', assistantRoutes(deps));
  api.route('/community', communityRoutes(deps));
  api.route('/billing', billingRoutes(deps));
  api.route('/push', pushRoutes(deps));
  api.route('/content', contentRoutes(deps));
  api.route('/admin', adminRoutes(deps));
  api.route('/leads', leadRoutes(deps));
  api.all('*', (c) => c.json({ error: 'No encontrado.' }, 404));
  app.route('/api', api);
  app.route('/', seoRoutes(deps));

  if (opts.staticDir) mountStatic(app, opts.staticDir);

  app.onError((err, c) => {
    log.error('unhandled', { error: err.message, path: c.req.path, id: c.get('requestId') });
    return c.json({ error: 'Algo salió mal en el servidor. Inténtalo de nuevo en un momento.' }, 500);
  });

  return app;
}
