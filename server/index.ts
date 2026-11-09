import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { serve } from '@hono/node-server';
import { buildDeps, createApp } from './app';
import { loadConfig } from './config';
import { purgeExpired } from './services/tokens';

async function main() {
  if (existsSync('.env')) process.loadEnvFile('.env');
  const config = loadConfig();
  const deps = await buildDeps(config);
  const staticDir = config.STATIC_DIR ?? (config.isProd ? resolve('dist') : undefined);
  const app = createApp(deps, { staticDir: staticDir && existsSync(staticDir) ? staticDir : undefined });

  const server = serve({ fetch: app.fetch, port: config.PORT, hostname: config.HOST }, (info) => {
    deps.log.info('server.listening', {
      port: info.port,
      env: config.NODE_ENV,
      db: config.DATABASE_URL.split(':')[0],
      static: Boolean(staticDir),
      features: config.features,
      emailTransport: config.EMAIL_TRANSPORT,
    });
  });

  const timers: NodeJS.Timeout[] = [];
  if (deps.push && config.PUSH_SCHEDULER) {
    timers.push(setInterval(() => deps.push!.tick().catch((e) => deps.log.error('push.tick', { error: (e as Error).message })), 60_000));
  }
  timers.push(setInterval(() => purgeExpired(deps.db).catch(() => undefined), 6 * 3_600_000));

  const shutdown = async (signal: string) => {
    deps.log.info('server.shutdown', { signal });
    timers.forEach(clearInterval);
    server.close();
    await deps.db.destroy();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  process.stderr.write(`No se pudo iniciar el servidor: ${(err as Error).message}\n`);
  process.exit(1);
});
