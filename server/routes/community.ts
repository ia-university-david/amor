import { Hono } from 'hono';
import type { ExpressionBuilder } from 'kysely';
import { z } from 'zod';
import type { Database } from '../db/schema';
import type { AppEnv, Deps, UserRow } from '../context';
import { rateLimit } from '../middleware/rateLimit';
import { requireRole, requireUser } from '../middleware/session';
import { audit, bumpMetric } from '../services/tokens';
import { AUTO_HIDE_REPORTS, DEFAULT_ROOMS, REACTIONS, assessCommunityText, generatePseudonym, type ReactionKind } from '../../shared/moderation';
import { addMinutes, newId, now, parseJSON } from '../util';
import { body } from './validate';

const REACTION_KINDS = Object.keys(REACTIONS) as [ReactionKind, ...ReactionKind[]];

export async function seedRooms(deps: Deps) {
  for (const [i, room] of DEFAULT_ROOMS.entries()) {
    await deps.db
      .insertInto('community_rooms')
      .values({ ...room, sort: i, locked: 0 })
      .onConflict((oc) => oc.column('id').doNothing())
      .execute();
  }
}

async function ensureProfile(deps: Deps, user: UserRow) {
  const existing = await deps.db.selectFrom('community_profiles').selectAll().where('user_id', '=', user.id).executeTakeFirst();
  if (existing) return existing;
  for (let i = 0; i < 8; i++) {
    const row = { user_id: user.id, pseudonym: generatePseudonym(), muted_until: null, created_at: now() };
    try {
      await deps.db.insertInto('community_profiles').values(row).execute();
      return row;
    } catch {
      // Pseudonym collision: try another one.
    }
  }
  throw new Error('No se pudo generar un seudónimo');
}

type PostRow = { id: string; room_id: string; parent_id: string | null; pseudonym: string; body: string; created_at: string; status: string; author_id: string | null; flags: string };

export function communityRoutes(deps: Deps) {
  const r = new Hono<AppEnv>();
  const { db, config, limiter } = deps;
  r.use('*', requireUser);

  async function present(rows: PostRow[], viewer: UserRow) {
    if (!rows.length) return [];
    const ids = rows.map((p) => p.id);
    const [reactions, mine, replies] = await Promise.all([
      db.selectFrom('community_reactions').select(['post_id', 'kind']).select((eb) => eb.fn.countAll<number>().as('n')).where('post_id', 'in', ids).groupBy(['post_id', 'kind']).execute(),
      db.selectFrom('community_reactions').select(['post_id', 'kind']).where('post_id', 'in', ids).where('user_id', '=', viewer.id).execute(),
      db.selectFrom('community_posts').select('parent_id').select((eb) => eb.fn.countAll<number>().as('n')).where('parent_id', 'in', ids).where('status', '=', 'visible').groupBy('parent_id').execute(),
    ]);
    return rows.map((p) => ({
      id: p.id,
      roomId: p.room_id,
      parentId: p.parent_id,
      pseudonym: p.pseudonym,
      body: p.body,
      createdAt: p.created_at,
      status: p.status,
      mine: p.author_id === viewer.id,
      replies: Number(replies.find((x) => x.parent_id === p.id)?.n ?? 0),
      reactions: Object.fromEntries(reactions.filter((x) => x.post_id === p.id).map((x) => [x.kind, Number(x.n)])),
      myReactions: mine.filter((x) => x.post_id === p.id).map((x) => x.kind),
    }));
  }

  const visibleOrMine = (viewerId: string) => (eb: ExpressionBuilder<Database, 'community_posts'>) =>
    eb.or([eb('status', '=', 'visible'), eb.and([eb('author_id', '=', viewerId), eb('status', '=', 'pending')])]);

  r.get('/me', async (c) => {
    const user = c.get('user')!;
    const p = await ensureProfile(deps, user);
    return c.json({
      pseudonym: p.pseudonym,
      mutedUntil: p.muted_until,
      canPost: (!config.COMMUNITY_REQUIRE_VERIFIED || Boolean(user.email_verified_at)) && Boolean(user.adult_confirmed_at),
      needsVerification: config.COMMUNITY_REQUIRE_VERIFIED && !user.email_verified_at,
    });
  });

  r.post('/me/pseudonym', rateLimit(limiter, { name: 'pseudo', limit: 5, windowMs: 3_600_000, trustProxy: config.TRUST_PROXY, by: 'user' }), async (c) => {
    const user = c.get('user')!;
    await ensureProfile(deps, user);
    for (let i = 0; i < 8; i++) {
      const pseudonym = generatePseudonym();
      try {
        await db.updateTable('community_profiles').set({ pseudonym }).where('user_id', '=', user.id).execute();
        return c.json({ pseudonym });
      } catch {
        // collision
      }
    }
    return c.json({ error: 'Inténtalo de nuevo.' }, 500);
  });

  r.get('/rooms', async (c) => {
    const rooms = await db.selectFrom('community_rooms').selectAll().orderBy('sort').execute();
    const counts = await db
      .selectFrom('community_posts')
      .select('room_id')
      .select((eb) => eb.fn.countAll<number>().as('n'))
      .where('status', '=', 'visible')
      .where('parent_id', 'is', null)
      .groupBy('room_id')
      .execute();
    return c.json({ rooms: rooms.map((room) => ({ id: room.id, name: room.name, description: room.description, locked: Boolean(room.locked), posts: Number(counts.find((x) => x.room_id === room.id)?.n ?? 0) })) });
  });

  r.get('/rooms/:id/posts', async (c) => {
    const viewer = c.get('user')!;
    const before = c.req.query('before');
    let q = db
      .selectFrom('community_posts')
      .select(['id', 'room_id', 'parent_id', 'pseudonym', 'body', 'created_at', 'status', 'author_id', 'flags'])
      .where('room_id', '=', c.req.param('id'))
      .where('parent_id', 'is', null)
      .where(visibleOrMine(viewer.id));
    if (before) q = q.where('created_at', '<', before);
    const rows = await q.orderBy('created_at', 'desc').limit(30).execute();
    return c.json({ posts: await present(rows, viewer) });
  });

  r.get('/posts/:id', async (c) => {
    const viewer = c.get('user')!;
    const post = await db.selectFrom('community_posts').selectAll().where('id', '=', c.req.param('id')).where(visibleOrMine(viewer.id)).executeTakeFirst();
    if (!post || post.parent_id) return c.json({ error: 'No encontramos este mensaje.' }, 404);
    const replies = await db.selectFrom('community_posts').selectAll().where('parent_id', '=', post.id).where(visibleOrMine(viewer.id)).orderBy('created_at').limit(200).execute();
    const [p, ...rs] = await present([post, ...replies], viewer);
    return c.json({ post: p, replies: rs });
  });

  r.post(
    '/rooms/:id/posts',
    rateLimit(limiter, { name: 'post', limit: 10, windowMs: 3_600_000, trustProxy: config.TRUST_PROXY, by: 'user' }),
    body(z.object({ body: z.string().trim().min(3).max(2000), parentId: z.string().max(64).optional() })),
    async (c) => {
      const user = c.get('user')!;
      if (config.COMMUNITY_REQUIRE_VERIFIED && !user.email_verified_at) return c.json({ error: 'Confirma tu correo para participar en la comunidad.' }, 403);
      if (!user.adult_confirmed_at) return c.json({ error: 'Confirma que eres mayor de edad para participar.' }, 403);
      const profile = await ensureProfile(deps, user);
      if (profile.muted_until && profile.muted_until > now()) return c.json({ error: 'Tu participación está en pausa temporalmente por las normas de la comunidad.' }, 403);
      const room = await db.selectFrom('community_rooms').selectAll().where('id', '=', c.req.param('id')).executeTakeFirst();
      if (!room || room.locked) return c.json({ error: 'Esta sala no admite mensajes ahora.' }, 404);
      const input = c.req.valid('json');
      if (input.parentId) {
        const parent = await db.selectFrom('community_posts').select(['id', 'room_id', 'parent_id', 'status']).where('id', '=', input.parentId).executeTakeFirst();
        if (!parent || parent.room_id !== room.id || parent.parent_id || parent.status !== 'visible') return c.json({ error: 'No se puede responder a este mensaje.' }, 400);
      }
      const verdict = assessCommunityText(input.body);
      const t = now();
      const row = {
        id: newId(),
        room_id: room.id,
        author_id: user.id,
        pseudonym: profile.pseudonym,
        parent_id: input.parentId ?? null,
        body: input.body,
        status: verdict.action === 'publish' ? 'visible' : 'pending',
        flags: JSON.stringify(verdict.flags),
        created_at: t,
        updated_at: t,
      };
      await db.insertInto('community_posts').values(row).execute();
      await bumpMetric(db, verdict.action === 'publish' ? 'community_post' : 'community_held');
      const [post] = await present([row], user);
      return c.json({ post, held: verdict.action === 'hold', crisis: verdict.crisis.detected }, 201);
    },
  );

  r.delete('/posts/:id', async (c) => {
    const user = c.get('user')!;
    const res = await db
      .updateTable('community_posts')
      .set({ body: '[Mensaje eliminado por su autor]', status: 'removed', updated_at: now() })
      .where('id', '=', c.req.param('id'))
      .where('author_id', '=', user.id)
      .executeTakeFirst();
    return Number(res.numUpdatedRows) ? c.json({ ok: true }) : c.json({ error: 'No encontrado.' }, 404);
  });

  r.post(
    '/posts/:id/reactions',
    rateLimit(limiter, { name: 'react', limit: 120, windowMs: 3_600_000, trustProxy: config.TRUST_PROXY, by: 'user' }),
    body(z.object({ kind: z.enum(REACTION_KINDS) })),
    async (c) => {
      const user = c.get('user')!;
      const postId = c.req.param('id');
      const kind = c.req.valid('json').kind;
      const post = await db.selectFrom('community_posts').select('status').where('id', '=', postId).executeTakeFirst();
      if (!post || post.status !== 'visible') return c.json({ error: 'No encontrado.' }, 404);
      const existing = await db.selectFrom('community_reactions').select('kind').where('post_id', '=', postId).where('user_id', '=', user.id).where('kind', '=', kind).executeTakeFirst();
      if (existing) await db.deleteFrom('community_reactions').where('post_id', '=', postId).where('user_id', '=', user.id).where('kind', '=', kind).execute();
      else await db.insertInto('community_reactions').values({ post_id: postId, user_id: user.id, kind, created_at: now() }).execute();
      return c.json({ active: !existing });
    },
  );

  r.post(
    '/posts/:id/report',
    rateLimit(limiter, { name: 'report', limit: 20, windowMs: 3_600_000, trustProxy: config.TRUST_PROXY, by: 'user' }),
    body(z.object({ reason: z.enum(['riesgo', 'ofensivo', 'datos-personales', 'spam', 'otro']), details: z.string().trim().max(500).optional() })),
    async (c) => {
      const user = c.get('user')!;
      const postId = c.req.param('id');
      const post = await db.selectFrom('community_posts').select(['id', 'status']).where('id', '=', postId).executeTakeFirst();
      if (!post) return c.json({ error: 'No encontrado.' }, 404);
      const dup = await db.selectFrom('community_reports').select('id').where('post_id', '=', postId).where('reporter_id', '=', user.id).where('status', '=', 'open').executeTakeFirst();
      if (!dup) {
        const input = c.req.valid('json');
        await db.insertInto('community_reports').values({ id: newId(), post_id: postId, reporter_id: user.id, reason: input.reason, details: input.details ?? null, status: 'open', created_at: now(), resolved_by: null, resolved_at: null }).execute();
      }
      const open = await db.selectFrom('community_reports').select((eb) => eb.fn.countAll<number>().as('n')).where('post_id', '=', postId).where('status', '=', 'open').executeTakeFirstOrThrow();
      if (post.status === 'visible' && Number(open.n) >= AUTO_HIDE_REPORTS) {
        await db.updateTable('community_posts').set({ status: 'pending', updated_at: now() }).where('id', '=', postId).execute();
      }
      return c.json({ ok: true });
    },
  );

  // ── Moderation (moderador, admin)
  const mod = new Hono<AppEnv>();
  mod.use('*', requireRole('moderador'));

  mod.get('/queue', async (c) => {
    const pending = await db.selectFrom('community_posts').selectAll().where('status', '=', 'pending').orderBy('created_at').limit(100).execute();
    const reports = await db
      .selectFrom('community_reports')
      .innerJoin('community_posts', 'community_posts.id', 'community_reports.post_id')
      .select(['community_reports.id', 'community_reports.post_id', 'community_reports.reason', 'community_reports.details', 'community_reports.created_at', 'community_posts.body', 'community_posts.pseudonym', 'community_posts.status as post_status', 'community_posts.room_id'])
      .where('community_reports.status', '=', 'open')
      .orderBy('community_reports.created_at')
      .limit(100)
      .execute();
    return c.json({
      pending: pending.map((p) => ({ id: p.id, roomId: p.room_id, parentId: p.parent_id, pseudonym: p.pseudonym, body: p.body, createdAt: p.created_at, flags: parseJSON<string[]>(p.flags, []) })),
      reports: reports.map((x) => ({ id: x.id, postId: x.post_id, reason: x.reason, details: x.details, createdAt: x.created_at, body: x.body, pseudonym: x.pseudonym, postStatus: x.post_status, roomId: x.room_id })),
    });
  });

  mod.post('/posts/:id', body(z.object({ action: z.enum(['approve', 'hide', 'remove']), muteDays: z.number().int().min(1).max(90).optional() })), async (c) => {
    const actor = c.get('user')!;
    const id = c.req.param('id');
    const { action, muteDays } = c.req.valid('json');
    const status = action === 'approve' ? 'visible' : action === 'hide' ? 'hidden' : 'removed';
    const post = await db.selectFrom('community_posts').select(['author_id']).where('id', '=', id).executeTakeFirst();
    if (!post) return c.json({ error: 'No encontrado.' }, 404);
    await db.updateTable('community_posts').set({ status, updated_at: now(), ...(action === 'remove' ? { body: '[Mensaje retirado por moderación]' } : {}) }).where('id', '=', id).execute();
    await db.updateTable('community_reports').set({ status: 'resolved', resolved_by: actor.id, resolved_at: now() }).where('post_id', '=', id).where('status', '=', 'open').execute();
    if (muteDays && post.author_id) {
      await db.updateTable('community_profiles').set({ muted_until: addMinutes(muteDays * 1440) }).where('user_id', '=', post.author_id).execute();
    }
    await audit(db, actor.id, `community.${action}${muteDays ? `+mute${muteDays}d` : ''}`, id);
    return c.json({ ok: true, status });
  });

  mod.post('/reports/:id', body(z.object({ action: z.enum(['dismiss']) })), async (c) => {
    const actor = c.get('user')!;
    const id = c.req.param('id');
    await db.updateTable('community_reports').set({ status: 'dismissed', resolved_by: actor.id, resolved_at: now() }).where('id', '=', id).execute();
    await audit(db, actor.id, 'community.report.dismiss', id);
    return c.json({ ok: true });
  });

  r.route('/moderation', mod);
  return r;
}
