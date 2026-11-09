import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import type { AppEnv, Deps } from '../context';
import { publicUser } from '../context';
import { rateLimit } from '../middleware/rateLimit';
import { createSession, destroySession, requireUser } from '../middleware/session';
import { hashPassword, verifyPassword } from '../services/crypto';
import { templates } from '../services/email';
import { sanitizeForSync, isSyncCollection, SYNC_COLLECTIONS } from '../../shared/sync';
import { now, parseJSON } from '../util';
import { body } from './validate';
import { MIN_PASSWORD } from './auth';

export function accountRoutes(deps: Deps) {
  const r = new Hono<AppEnv>();
  const { db, config, limiter } = deps;
  r.use('*', requireUser);

  r.get('/', (c) => c.json({ user: publicUser(c.get('user')!) }));

  r.patch(
    '/',
    body(z.object({ name: z.string().trim().min(1).max(60).optional(), consents: z.object({ sync: z.boolean().optional(), marketing: z.boolean().optional() }).optional() })),
    async (c) => {
      const user = c.get('user')!;
      const input = c.req.valid('json');
      const consents = { ...parseJSON<Record<string, boolean>>(user.consents, {}), ...(input.consents ?? {}) };
      await db
        .updateTable('users')
        .set({ ...(input.name ? { name: input.name } : {}), consents: JSON.stringify(consents), updated_at: now() })
        .where('id', '=', user.id)
        .execute();
      // Turning sync off deletes what was synced: the consent covers storage, not just transfer.
      if (input.consents?.sync === false) await db.deleteFrom('sync_docs').where('user_id', '=', user.id).execute();
      return c.json({ user: publicUser({ ...user, name: input.name ?? user.name, consents: JSON.stringify(consents) }) });
    },
  );

  r.post('/confirm-age', body(z.object({ adultConfirmed: z.literal(true) })), async (c) => {
    const user = c.get('user')!;
    const t = now();
    await db.updateTable('users').set({ adult_confirmed_at: t, updated_at: t }).where('id', '=', user.id).execute();
    return c.json({ user: publicUser({ ...user, adult_confirmed_at: t }) });
  });

  r.post(
    '/password',
    rateLimit(limiter, { name: 'pwchange', limit: 10, windowMs: 15 * 60_000, trustProxy: config.TRUST_PROXY, by: 'user' }),
    body(z.object({ current: z.string().max(200).optional(), next: z.string().min(MIN_PASSWORD).max(200) })),
    async (c) => {
      const user = c.get('user')!;
      const input = c.req.valid('json');
      if (user.password_hash && !(await verifyPassword(input.current ?? '', user.password_hash))) {
        return c.json({ error: 'La contraseña actual no coincide.' }, 400);
      }
      await db.updateTable('users').set({ password_hash: await hashPassword(input.next), updated_at: now() }).where('id', '=', user.id).execute();
      await db.deleteFrom('sessions').where('user_id', '=', user.id).execute();
      await createSession(deps, c, user.id);
      return c.json({ ok: true });
    },
  );

  r.get('/export', async (c) => {
    const user = c.get('user')!;
    const [docs, backup, posts, prefs, subs, oauth] = await Promise.all([
      db.selectFrom('sync_docs').selectAll().where('user_id', '=', user.id).where('deleted', '=', 0).execute(),
      db.selectFrom('backups').selectAll().where('user_id', '=', user.id).executeTakeFirst(),
      db.selectFrom('community_posts').select(['id', 'room_id', 'parent_id', 'body', 'status', 'created_at']).where('author_id', '=', user.id).execute(),
      db.selectFrom('reminder_prefs').selectAll().where('user_id', '=', user.id).executeTakeFirst(),
      db.selectFrom('push_subscriptions').select(['created_at']).where('user_id', '=', user.id).execute(),
      db.selectFrom('oauth_accounts').select(['provider', 'created_at']).where('user_id', '=', user.id).execute(),
    ]);
    const pseudonym = await db.selectFrom('community_profiles').select('pseudonym').where('user_id', '=', user.id).executeTakeFirst();
    c.header('Content-Disposition', 'attachment; filename="amor-toxico-cuenta.json"');
    return c.json({
      exportadoEl: now(),
      cuenta: publicUser(user),
      accesosVinculados: oauth,
      sincronizado: docs.map((d) => ({ coleccion: d.collection, id: d.doc_id, actualizado: d.updated_at, valor: d.payload ? deps.vault.open(d.payload) : null })),
      copiaCifrada: backup ? { actualizada: backup.updated_at, tamano: backup.size, kdf: backup.kdf, iteraciones: backup.iterations, salt: backup.salt, iv: backup.iv, ciphertext: backup.ciphertext } : null,
      comunidad: { seudonimo: pseudonym?.pseudonym ?? null, mensajes: posts },
      recordatorios: prefs ?? null,
      dispositivosConNotificaciones: subs.length,
    });
  });

  r.delete(
    '/',
    rateLimit(limiter, { name: 'delete', limit: 5, windowMs: 15 * 60_000, trustProxy: config.TRUST_PROXY, by: 'user' }),
    body(z.object({ confirm: z.literal('BORRAR'), password: z.string().max(200).optional() })),
    async (c) => {
      const user = c.get('user')!;
      const input = c.req.valid('json');
      if (user.password_hash && !(await verifyPassword(input.password ?? '', user.password_hash))) {
        return c.json({ error: 'La contraseña no coincide.' }, 400);
      }
      if (deps.billing) {
        try {
          await deps.billing.cancelAll(user);
        } catch (err) {
          deps.log.error('account.delete.billing', { error: (err as Error).message });
        }
      }
      await db
        .updateTable('community_posts')
        .set({ body: '[Mensaje eliminado por su autor]', status: 'removed', author_id: null, pseudonym: 'Cuenta eliminada', updated_at: now() })
        .where('author_id', '=', user.id)
        .execute();
      await destroySession(deps, c);
      await db.deleteFrom('users').where('id', '=', user.id).execute();
      await deps.mailer.send(templates.accountDeleted(user.email));
      deps.log.info('account.deleted');
      return c.json({ ok: true });
    },
  );

  return r;
}

const MAX_DOC_BYTES = 64 * 1024;

export function syncRoutes(deps: Deps) {
  const r = new Hono<AppEnv>();
  const { db, vault } = deps;
  r.use('*', requireUser);
  r.use('*', async (c, next) => {
    const consents = parseJSON<Record<string, boolean>>(c.get('user')!.consents, {});
    if (!consents.sync) return c.json({ error: 'La sincronización está desactivada en tu cuenta.' }, 403);
    await next();
  });

  r.get('/', async (c) => {
    const since = c.req.query('since');
    let q = db.selectFrom('sync_docs').selectAll().where('user_id', '=', c.get('user')!.id);
    if (since) q = q.where('updated_at', '>', since);
    const rows = await q.orderBy('updated_at').limit(2000).execute();
    return c.json({
      collections: SYNC_COLLECTIONS,
      serverTime: now(),
      docs: rows.map((d) => ({ collection: d.collection, id: d.doc_id, updatedAt: d.updated_at, deleted: Boolean(d.deleted), value: d.payload && !d.deleted ? vault.open(d.payload) : null })),
    });
  });

  r.post(
    '/',
    bodyLimit({ maxSize: 2 * 1024 * 1024, onError: (c) => c.json({ error: 'Demasiados datos en una sola sincronización.' }, 413) }),
    body(
      z.object({
        changes: z
          .array(z.object({ collection: z.string().max(40), id: z.string().min(1).max(120), updatedAt: z.string().max(40), deleted: z.boolean().optional(), value: z.unknown().optional() }))
          .max(500),
      }),
    ),
    async (c) => {
      const userId = c.get('user')!.id;
      let accepted = 0;
      let rejected = 0;
      for (const ch of c.req.valid('json').changes) {
        if (!isSyncCollection(ch.collection) || Number.isNaN(Date.parse(ch.updatedAt))) {
          rejected++;
          continue;
        }
        // The server applies the same allowlist as the client: free text never gets stored even if sent.
        const value = ch.deleted ? null : sanitizeForSync(ch.collection, ch.id, ch.value);
        if (!ch.deleted && (value === null || JSON.stringify(value).length > MAX_DOC_BYTES)) {
          rejected++;
          continue;
        }
        const existing = await db
          .selectFrom('sync_docs')
          .select('updated_at')
          .where('user_id', '=', userId)
          .where('collection', '=', ch.collection)
          .where('doc_id', '=', ch.id)
          .executeTakeFirst();
        if (existing && existing.updated_at > ch.updatedAt) {
          rejected++;
          continue;
        }
        const row = { user_id: userId, collection: ch.collection, doc_id: ch.id, payload: value === null ? null : vault.seal(value), deleted: ch.deleted ? 1 : 0, updated_at: ch.updatedAt };
        await db
          .insertInto('sync_docs')
          .values(row)
          .onConflict((oc) => oc.columns(['user_id', 'collection', 'doc_id']).doUpdateSet({ payload: row.payload, deleted: row.deleted, updated_at: row.updated_at }))
          .execute();
        accepted++;
      }
      return c.json({ accepted, rejected, serverTime: now() });
    },
  );

  r.delete('/', async (c) => {
    await db.deleteFrom('sync_docs').where('user_id', '=', c.get('user')!.id).execute();
    return c.json({ ok: true });
  });

  return r;
}

const B64 = /^[A-Za-z0-9+/=_-]+$/;

/** End-to-end encrypted backup: the server only ever sees ciphertext and KDF parameters. */
export function backupRoutes(deps: Deps) {
  const r = new Hono<AppEnv>();
  const { db } = deps;
  r.use('*', requireUser);

  r.get('/meta', async (c) => {
    const b = await db.selectFrom('backups').select(['updated_at', 'size', 'kdf', 'iterations']).where('user_id', '=', c.get('user')!.id).executeTakeFirst();
    return c.json({ backup: b ? { updatedAt: b.updated_at, size: b.size, kdf: b.kdf, iterations: b.iterations } : null });
  });

  r.get('/', async (c) => {
    const b = await db.selectFrom('backups').selectAll().where('user_id', '=', c.get('user')!.id).executeTakeFirst();
    if (!b) return c.json({ error: 'No hay copia guardada.' }, 404);
    return c.json({ ciphertext: b.ciphertext, iv: b.iv, salt: b.salt, kdf: b.kdf, iterations: b.iterations, updatedAt: b.updated_at });
  });

  r.put(
    '/',
    bodyLimit({ maxSize: 8 * 1024 * 1024, onError: (c) => c.json({ error: 'La copia supera el tamaño máximo (8 MB).' }, 413) }),
    body(
      z.object({
        ciphertext: z.string().min(16).max(8 * 1024 * 1024).regex(B64),
        iv: z.string().min(8).max(64).regex(B64),
        salt: z.string().min(16).max(128).regex(B64),
        kdf: z.literal('PBKDF2-SHA256'),
        iterations: z.number().int().min(100_000).max(5_000_000),
      }),
    ),
    async (c) => {
      const userId = c.get('user')!.id;
      const b = c.req.valid('json');
      const row = { user_id: userId, ciphertext: b.ciphertext, iv: b.iv, salt: b.salt, kdf: b.kdf, iterations: b.iterations, size: b.ciphertext.length, updated_at: now() };
      await db
        .insertInto('backups')
        .values(row)
        .onConflict((oc) => oc.column('user_id').doUpdateSet({ ciphertext: row.ciphertext, iv: row.iv, salt: row.salt, kdf: row.kdf, iterations: row.iterations, size: row.size, updated_at: row.updated_at }))
        .execute();
      return c.json({ ok: true, updatedAt: row.updated_at });
    },
  );

  r.delete('/', async (c) => {
    await db.deleteFrom('backups').where('user_id', '=', c.get('user')!.id).execute();
    return c.json({ ok: true });
  });

  return r;
}
