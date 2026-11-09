import { Hono } from 'hono';
import { z } from 'zod';
import type { Selectable } from 'kysely';
import type { AppEnv, Ctx, Deps } from '../context';
import { ROLES, type Role } from '../context';
import type { ContentItemsTable } from '../db/schema';
import { requireRole } from '../middleware/session';
import { audit } from '../services/tokens';
import { CONTENT_STATUSES, CONTENT_TYPES, PUBLIC_STATUSES, type ContentType } from '../../shared/content';
import { newId, now, parseJSON } from '../util';
import { body } from './validate';

const text = (max: number) => z.string().max(max);
const optText = (max: number) => z.string().max(max).optional();

export const DATA_SCHEMAS: Record<ContentType, z.ZodType> = {
  message: z.object({ text: text(300).min(1) }),
  laura: z.object({
    kind: z.enum(['capitulo', 'video', 'audio', 'ejercicio']),
    summary: text(600),
    body: text(60_000),
    mediaUrl: z.union([z.literal(''), z.string().url().max(500)]).optional(),
    durationMinutes: z.number().int().min(0).max(600).optional(),
    premium: z.boolean().optional(),
    authorization: optText(300),
  }),
  blog: z.object({
    category: text(60),
    readingMinutes: z.number().int().min(1).max(120).nullable(),
    summary: text(400),
    body: text(80_000),
    author: text(80).min(1),
    seoTitle: optText(70),
    seoDescription: optText(170),
    ogImage: z.union([z.literal(''), z.string().max(500)]).optional(),
    publishedAt: optText(30),
  }),
  library: z.object({
    authors: text(400),
    source: text(200),
    year: text(30),
    url: z.union([z.literal(''), z.string().url().max(500)]),
    evidenceLevel: z.enum(['estudio-pequeno', 'estudio-observacional', 'ensayo-aleatorizado', 'revision', 'guia-institucional', 'divulgacion']),
    summary: text(2000),
    limitations: text(2000),
    reviewedAt: z.string().max(40).nullable(),
    reviewer: optText(120),
  }),
  brain: z.object({
    n: z.number().int().min(1).max(99),
    summary: text(400),
    body: z.array(text(3000)).max(20),
    example: text(1000),
    metaphor: optText(600),
    evidence: z.object({ text: text(2000), refs: z.array(text(80)).max(20) }),
  }),
  plan: z.object({
    id: z.enum(['free', 'premium']),
    name: text(60),
    tagline: text(200),
    priceLabel: text(60),
    priceKeys: z.array(z.enum(['monthly', 'yearly'])).max(2),
    features: z.array(text(200)).max(20),
    highlighted: z.boolean().optional(),
  }),
};

/** Who may edit each content type (admin can always). */
const EDITORS: Record<ContentType, Role[]> = {
  message: ['editor'],
  laura: ['editor'],
  blog: ['editor'],
  library: ['editor'],
  brain: ['editor'],
  plan: [],
};

const isType = (t: string): t is ContentType => (CONTENT_TYPES as readonly string[]).includes(t);

export function presentItem(row: Selectable<ContentItemsTable>) {
  return { id: row.id, type: row.type, slug: row.slug, title: row.title, status: row.status, sort: row.sort, updatedAt: row.updated_at, data: parseJSON<Record<string, unknown>>(row.data, {}) };
}

export function contentRoutes(deps: Deps) {
  const r = new Hono<AppEnv>();
  const { db } = deps;

  r.get('/:type', async (c) => {
    const type = c.req.param('type');
    if (!isType(type)) return c.json({ error: 'Tipo desconocido.' }, 404);
    const rows = await db.selectFrom('content_items').selectAll().where('type', '=', type).where('status', 'in', [...PUBLIC_STATUSES[type]]).orderBy('sort').orderBy('updated_at', 'desc').execute();
    c.header('Cache-Control', 'public, max-age=60');
    return c.json({ items: rows.map(presentItem) });
  });

  r.get('/:type/:slug', async (c) => {
    const type = c.req.param('type');
    if (!isType(type)) return c.json({ error: 'Tipo desconocido.' }, 404);
    const row = await db.selectFrom('content_items').selectAll().where('type', '=', type).where('slug', '=', c.req.param('slug')).where('status', 'in', [...PUBLIC_STATUSES[type]]).executeTakeFirst();
    if (!row) return c.json({ error: 'No encontrado.' }, 404);
    c.header('Cache-Control', 'public, max-age=60');
    return c.json({ item: presentItem(row) });
  });

  return r;
}

const ItemBody = z.object({
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug'),
  title: z.string().trim().min(1).max(300),
  status: z.string().max(40),
  sort: z.number().int().min(0).max(100_000).optional(),
  data: z.record(z.string(), z.unknown()),
});

function suppress(n: number): number | '<5' {
  return n > 0 && n < 5 ? '<5' : n;
}

export function adminRoutes(deps: Deps) {
  const r = new Hono<AppEnv>();
  const { db } = deps;
  r.use('*', requireRole('editor', 'moderador'));

  const guard = (type: ContentType) => requireRole(...(EDITORS[type].length ? EDITORS[type] : (['admin'] as Role[])));

  r.get('/me', (c) => {
    const u = c.get('user')!;
    return c.json({ role: u.role, name: u.name });
  });

  r.get('/content/:type', async (c) => {
    const type = c.req.param('type');
    if (!isType(type)) return c.json({ error: 'Tipo desconocido.' }, 404);
    const rows = await db.selectFrom('content_items').selectAll().where('type', '=', type).orderBy('sort').orderBy('updated_at', 'desc').execute();
    return c.json({ items: rows.map(presentItem), statuses: CONTENT_STATUSES[type] });
  });

  const save = async (c: Ctx, type: ContentType, id: string | null) => {
    const actor = c.get('user')!;
    const role = actor.role as Role;
    if (role !== 'admin' && !EDITORS[type].includes(role)) return c.json({ error: 'No tienes permiso para editar este contenido.' }, 403);
    const parsed = ItemBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: 'Revisa los campos.', fields: parsed.error.issues.map((i) => i.path.join('.')) }, 400);
    const input = parsed.data;
    if (!CONTENT_STATUSES[type].includes(input.status)) return c.json({ error: 'Estado no válido.', fields: ['status'] }, 400);
    const data = DATA_SCHEMAS[type].safeParse(input.data);
    if (!data.success) return c.json({ error: 'Revisa los campos.', fields: data.error.issues.map((i) => `data.${i.path.join('.')}`) }, 400);
    const clash = await db.selectFrom('content_items').select('id').where('type', '=', type).where('slug', '=', input.slug).executeTakeFirst();
    if (clash && clash.id !== id) return c.json({ error: 'Ya existe un elemento con ese identificador (slug).', fields: ['slug'] }, 409);
    const t = now();
    const values = { slug: input.slug, title: input.title, status: input.status, data: JSON.stringify(data.data), sort: input.sort ?? 0, updated_at: t, updated_by: actor.id };
    if (id) {
      const res = await db.updateTable('content_items').set(values).where('id', '=', id).where('type', '=', type).executeTakeFirst();
      if (!Number(res.numUpdatedRows)) return c.json({ error: 'No encontrado.' }, 404);
    } else {
      id = newId();
      await db.insertInto('content_items').values({ id, type, ...values }).execute();
    }
    await audit(db, actor.id, `content.${type}.save`, input.slug);
    const row = await db.selectFrom('content_items').selectAll().where('id', '=', id).executeTakeFirstOrThrow();
    return c.json({ item: presentItem(row) });
  };

  r.post('/content/:type', async (c) => {
    const type = c.req.param('type');
    if (!isType(type)) return c.json({ error: 'Tipo desconocido.' }, 404);
    return save(c, type, null);
  });

  r.put('/content/:type/:id', async (c) => {
    const type = c.req.param('type');
    if (!isType(type)) return c.json({ error: 'Tipo desconocido.' }, 404);
    return save(c, type, c.req.param('id'));
  });

  r.delete('/content/:type/:id', async (c) => {
    const type = c.req.param('type');
    if (!isType(type)) return c.json({ error: 'Tipo desconocido.' }, 404);
    const res = await guard(type)(c, async () => {});
    if (res) return res;
    await db.deleteFrom('content_items').where('id', '=', c.req.param('id')).where('type', '=', type).execute();
    await audit(db, c.get('user')!.id, `content.${type}.delete`, c.req.param('id'));
    return c.json({ ok: true });
  });

  // ── Admin only
  const adminOnly = requireRole();

  r.get('/users', adminOnly, async (c) => {
    const q = (c.req.query('q') ?? '').trim().toLowerCase();
    let query = db.selectFrom('users').select(['id', 'email', 'name', 'role', 'plan', 'created_at', 'email_verified_at']);
    if (q) query = query.where('email', 'like', `${q.replace(/[%_]/g, '')}%`);
    else query = query.where('role', '!=', 'user');
    const rows = await query.orderBy('created_at', 'desc').limit(50).execute();
    return c.json({ users: rows.map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, plan: u.plan, createdAt: u.created_at, verified: Boolean(u.email_verified_at) })) });
  });

  r.patch('/users/:id', adminOnly, body(z.object({ role: z.enum(ROLES) })), async (c) => {
    const actor = c.get('user')!;
    const id = c.req.param('id');
    if (id === actor.id) return c.json({ error: 'No puedes cambiar tu propio rol.' }, 400);
    await db.updateTable('users').set({ role: c.req.valid('json').role, updated_at: now() }).where('id', '=', id).execute();
    await audit(db, actor.id, `user.role.${c.req.valid('json').role}`, id);
    return c.json({ ok: true });
  });

  r.get('/metrics', adminOnly, async (c) => {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const week = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const count = async (q: Promise<{ n: number | string | bigint } | undefined>) => Number((await q)?.n ?? 0);
    const [users, verified, premium, newWeek, active, visible, pending, reports, leads] = await Promise.all([
      count(db.selectFrom('users').select((eb) => eb.fn.countAll<number>().as('n')).executeTakeFirst()),
      count(db.selectFrom('users').select((eb) => eb.fn.countAll<number>().as('n')).where('email_verified_at', 'is not', null).executeTakeFirst()),
      count(db.selectFrom('users').select((eb) => eb.fn.countAll<number>().as('n')).where('plan', '=', 'premium').executeTakeFirst()),
      count(db.selectFrom('users').select((eb) => eb.fn.countAll<number>().as('n')).where('created_at', '>=', week).executeTakeFirst()),
      count(db.selectFrom('sessions').select((eb) => eb.fn.count<number>('user_id').distinct().as('n')).where('last_seen_at', '>=', week).executeTakeFirst()),
      count(db.selectFrom('community_posts').select((eb) => eb.fn.countAll<number>().as('n')).where('status', '=', 'visible').executeTakeFirst()),
      count(db.selectFrom('community_posts').select((eb) => eb.fn.countAll<number>().as('n')).where('status', '=', 'pending').executeTakeFirst()),
      count(db.selectFrom('community_reports').select((eb) => eb.fn.countAll<number>().as('n')).where('status', '=', 'open').executeTakeFirst()),
      db.selectFrom('leads').select(['kind', 'status']).select((eb) => eb.fn.countAll<number>().as('n')).groupBy(['kind', 'status']).execute(),
    ]);
    const daily = await db.selectFrom('metrics_daily').select(['name']).select((eb) => eb.fn.sum<number>('count').as('n')).where('day', '>=', since).groupBy('name').execute();
    return c.json({
      note: 'Solo cifras agregadas y anónimas. Los valores entre 1 y 4 se muestran como «<5» para evitar identificar a nadie.',
      totals: { users: suppress(users), verified: suppress(verified), premium: suppress(premium), newLast7Days: suppress(newWeek), activeLast7Days: suppress(active) },
      community: { visiblePosts: suppress(visible), pendingPosts: pending, openReports: reports },
      last30Days: Object.fromEntries(daily.map((d) => [d.name, suppress(Number(d.n))])),
      leads: leads.map((l) => ({ kind: l.kind, status: l.status, n: suppress(Number(l.n)) })),
    });
  });

  r.get('/leads', adminOnly, async (c) => {
    const rows = await db.selectFrom('leads').selectAll().orderBy('created_at', 'desc').limit(500).execute();
    if (c.req.query('format') === 'csv') {
      const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const csv = ['tipo,nombre,correo,estado,creado,confirmado,mensaje', ...rows.map((l) => [l.kind, l.name, l.email, l.status, l.created_at, l.confirmed_at, l.message].map(esc).join(','))].join('\n');
      c.header('Content-Type', 'text/csv; charset=utf-8');
      c.header('Content-Disposition', 'attachment; filename="formularios.csv"');
      return c.body(csv);
    }
    return c.json({ leads: rows.map((l) => ({ id: l.id, kind: l.kind, name: l.name, email: l.email, message: l.message, status: l.status, createdAt: l.created_at, confirmedAt: l.confirmed_at })) });
  });

  r.get('/audit', adminOnly, async (c) => {
    const rows = await db
      .selectFrom('audit_log')
      .leftJoin('users', 'users.id', 'audit_log.actor_id')
      .select(['audit_log.id', 'audit_log.action', 'audit_log.target', 'audit_log.at', 'users.name as actor'])
      .orderBy('audit_log.at', 'desc')
      .limit(100)
      .execute();
    return c.json({ entries: rows });
  });

  return r;
}
