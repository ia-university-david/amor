import { Hono } from 'hono';
import { sql } from 'kysely';
import type { AppEnv, Deps } from '../context';
import { MemoryTransport } from '../services/email';
import { buildSitemap } from '../../shared/seo';

export const VERSION = process.env.npm_package_version ?? '2.0.0';

export function metaRoutes(deps: Deps) {
  const r = new Hono<AppEnv>();
  const { config, db } = deps;

  r.get('/health', async (c) => {
    try {
      await sql`select 1`.execute(db);
      return c.json({ ok: true, db: 'ok', version: VERSION });
    } catch {
      return c.json({ ok: false, db: 'error', version: VERSION }, 503);
    }
  });

  /** Public, non-secret runtime configuration for the client. */
  r.get('/config', (c) =>
    c.json({
      auth: { password: true, magicLink: config.features.magicLink, google: config.features.google, apple: config.features.apple },
      assistant: { llm: config.features.llm },
      billing: { enabled: config.features.billing },
      push: { enabled: config.features.push, publicKey: config.features.push ? config.VAPID_PUBLIC_KEY : null },
      community: { requireVerified: config.COMMUNITY_REQUIRE_VERIFIED },
      devMailbox: !config.isProd && deps.mailer.transport instanceof MemoryTransport,
    }),
  );

  // Development mailbox: lets you open verification and magic links without a real email provider.
  r.get('/dev/mailbox', (c) => {
    if (config.isProd || !(deps.mailer.transport instanceof MemoryTransport)) return c.json({ error: 'No disponible.' }, 404);
    return c.json({ messages: deps.mailer.transport.sent.map((m) => ({ to: m.to, subject: m.subject, kind: m.kind, text: m.text, at: m.at })) });
  });

  return r;
}

export function seoRoutes(deps: Deps) {
  const r = new Hono<AppEnv>();
  r.get('/sitemap.xml', async (c) => {
    const base = new URL(deps.config.APP_URL).origin;
    const posts = await deps.db
      .selectFrom('content_items')
      .select(['slug', 'updated_at'])
      .where('type', '=', 'blog')
      .where('status', 'in', ['publicado', 'pendiente-revision', 'pendiente-migracion'])
      .execute();
    c.header('Content-Type', 'application/xml; charset=utf-8');
    c.header('Cache-Control', 'public, max-age=3600');
    return c.body(buildSitemap(base, posts.map((p) => ({ path: `/blog/${p.slug}`, lastmod: p.updated_at }))));
  });
  return r;
}
