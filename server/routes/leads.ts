import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv, Deps } from '../context';
import { rateLimit } from '../middleware/rateLimit';
import { templates } from '../services/email';
import { bumpMetric, consumeToken, issueToken } from '../services/tokens';
import { newId, normalizeEmail, now } from '../util';
import { body } from './validate';

const LeadBody = z.object({
  kind: z.enum(['ebook', 'contacto']),
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  message: z.string().trim().max(3000).optional(),
  consent: z.literal(true),
  /** Honeypot: real people never fill it. */
  website: z.string().max(200).optional(),
});

export function leadRoutes(deps: Deps) {
  const r = new Hono<AppEnv>();
  const { db, mailer, config, limiter } = deps;
  const origin = new URL(config.APP_URL).origin;

  r.post('/', rateLimit(limiter, { name: 'leads', limit: 8, windowMs: 60 * 60_000, trustProxy: config.TRUST_PROXY }), body(LeadBody), async (c) => {
    const input = c.req.valid('json');
    if (input.website) return c.json({ ok: true, status: 'received' });
    const email = normalizeEmail(input.email);
    const id = newId();
    if (input.kind === 'ebook') {
      const existing = await db.selectFrom('leads').select(['id', 'status']).where('kind', '=', 'ebook').where('email', '=', email).executeTakeFirst();
      if (existing?.status === 'confirmed') {
        await mailer.send(templates.ebook(email, config.EBOOK_URL));
        return c.json({ ok: true, status: 'confirmed' });
      }
      const leadId = existing?.id ?? id;
      if (!existing) {
        await db.insertInto('leads').values({ id, kind: 'ebook', name: input.name, email, message: null, consent: 1, status: 'pending', created_at: now(), confirmed_at: null }).execute();
        await bumpMetric(db, 'lead_ebook');
      }
      const token = await issueToken(db, { kind: 'lead', email, data: { leadId }, ttlMinutes: 7 * 24 * 60 });
      await mailer.send(templates.leadConfirm(email, `${origin}/confirmar-ebook?token=${encodeURIComponent(token)}`));
      return c.json({ ok: true, status: 'pending-confirmation' }, 201);
    }
    if (!input.message || input.message.length < 5) return c.json({ error: 'Escribe tu mensaje.', fields: ['message'] }, 400);
    await db.insertInto('leads').values({ id, kind: 'contacto', name: input.name, email, message: input.message, consent: 1, status: 'received', created_at: now(), confirmed_at: null }).execute();
    await bumpMetric(db, 'lead_contacto');
    if (config.CONTACT_INBOX) await mailer.send(templates.contactNotice(config.CONTACT_INBOX, `${origin}/admin`));
    return c.json({ ok: true, status: 'received' }, 201);
  });

  r.post('/confirm', rateLimit(limiter, { name: 'lead-confirm', limit: 20, windowMs: 60 * 60_000, trustProxy: config.TRUST_PROXY }), body(z.object({ token: z.string().min(10).max(200) })), async (c) => {
    const row = await consumeToken(db, 'lead', c.req.valid('json').token);
    if (!row) return c.json({ error: 'El enlace caducó o ya se usó.' }, 400);
    await db.updateTable('leads').set({ status: 'confirmed', confirmed_at: now() }).where('kind', '=', 'ebook').where('email', '=', row.email).execute();
    await mailer.send(templates.ebook(row.email, config.EBOOK_URL));
    return c.json({ ok: true, ebookAvailable: Boolean(config.EBOOK_URL) });
  });

  return r;
}
