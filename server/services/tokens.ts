import type { DB } from '../db';
import { addMinutes, newId, now, randomToken, sha256 } from '../util';

export type TokenKind = 'verify' | 'magic' | 'reset' | 'lead';

/** Single-use tokens are stored hashed; only the email link carries the raw value. */
export async function issueToken(
  db: DB,
  opts: { kind: TokenKind; email: string; userId?: string | null; data?: unknown; ttlMinutes: number },
): Promise<string> {
  const raw = randomToken();
  await db
    .insertInto('auth_tokens')
    .values({
      id: sha256(raw),
      kind: opts.kind,
      email: opts.email,
      user_id: opts.userId ?? null,
      data: opts.data === undefined ? null : JSON.stringify(opts.data),
      expires_at: addMinutes(opts.ttlMinutes),
      used_at: null,
      created_at: now(),
    })
    .execute();
  return raw;
}

export async function consumeToken(db: DB, kind: TokenKind, raw: string) {
  if (!raw || raw.length > 200) return null;
  const id = sha256(raw);
  const t = now();
  const res = await db
    .updateTable('auth_tokens')
    .set({ used_at: t })
    .where('id', '=', id)
    .where('kind', '=', kind)
    .where('used_at', 'is', null)
    .where('expires_at', '>', t)
    .executeTakeFirst();
  if (!res.numUpdatedRows || Number(res.numUpdatedRows) === 0) return null;
  return db.selectFrom('auth_tokens').selectAll().where('id', '=', id).executeTakeFirst();
}

export async function purgeExpired(db: DB): Promise<void> {
  const t = now();
  await db.deleteFrom('auth_tokens').where('expires_at', '<', t).execute();
  await db.deleteFrom('sessions').where('expires_at', '<', t).execute();
}

/** Anonymous daily counters for aggregate metrics (no user ids). */
export async function bumpMetric(db: DB, name: string, by = 1): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  await db
    .insertInto('metrics_daily')
    .values({ day, name, count: by })
    .onConflict((oc) => oc.columns(['day', 'name']).doUpdateSet((eb) => ({ count: eb('metrics_daily.count', '+', by) })))
    .execute();
}

export async function audit(db: DB, actorId: string | null, action: string, target: string): Promise<void> {
  await db.insertInto('audit_log').values({ id: newId(), actor_id: actorId, action, target, at: now() }).execute();
}
