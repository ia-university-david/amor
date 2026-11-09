import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv, Deps } from '../context';
import { rateLimit } from '../middleware/rateLimit';
import { requireUser } from '../middleware/session';
import { PUSH_COPY } from '../services/push';
import { now, sha256 } from '../util';
import { body } from './validate';

const HM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export function pushRoutes(deps: Deps) {
  const r = new Hono<AppEnv>();
  const { db, push, config, limiter } = deps;

  r.get('/config', (c) => c.json({ enabled: Boolean(push), publicKey: push?.publicKey ?? null }));

  r.use('*', requireUser);

  r.post(
    '/subscribe',
    body(z.object({ endpoint: z.string().url().max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) })),
    async (c) => {
      if (!push) return c.json({ error: 'Las notificaciones push no están configuradas.' }, 503);
      const s = c.req.valid('json');
      const id = sha256(s.endpoint);
      const row = { id, user_id: c.get('user')!.id, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth, created_at: now() };
      await db
        .insertInto('push_subscriptions')
        .values(row)
        .onConflict((oc) => oc.column('id').doUpdateSet({ user_id: row.user_id, p256dh: row.p256dh, auth: row.auth }))
        .execute();
      return c.json({ ok: true });
    },
  );

  r.post('/unsubscribe', body(z.object({ endpoint: z.string().max(1000) })), async (c) => {
    await db.deleteFrom('push_subscriptions').where('id', '=', sha256(c.req.valid('json').endpoint)).where('user_id', '=', c.get('user')!.id).execute();
    return c.json({ ok: true });
  });

  r.get('/preferences', async (c) => {
    const p = await db.selectFrom('reminder_prefs').selectAll().where('user_id', '=', c.get('user')!.id).executeTakeFirst();
    const devices = await db.selectFrom('push_subscriptions').select((eb) => eb.fn.countAll<number>().as('n')).where('user_id', '=', c.get('user')!.id).executeTakeFirstOrThrow();
    return c.json({
      devices: Number(devices.n),
      preferences: {
        dailyEnabled: Boolean(p?.daily_enabled),
        dailyTime: p?.daily_time ?? '21:00',
        nightEnabled: Boolean(p?.night_enabled),
        nightTime: p?.night_time ?? '22:30',
        quietStart: p?.quiet_start ?? null,
        quietEnd: p?.quiet_end ?? null,
        timezone: p?.timezone ?? 'UTC',
      },
    });
  });

  r.put(
    '/preferences',
    body(
      z.object({
        dailyEnabled: z.boolean(),
        dailyTime: HM,
        nightEnabled: z.boolean(),
        nightTime: HM,
        quietStart: HM.nullable(),
        quietEnd: HM.nullable(),
        timezone: z.string().max(64),
      }),
    ),
    async (c) => {
      const p = c.req.valid('json');
      let tz = p.timezone;
      try {
        new Intl.DateTimeFormat('en', { timeZone: tz });
      } catch {
        tz = 'UTC';
      }
      const row = {
        user_id: c.get('user')!.id,
        daily_enabled: p.dailyEnabled ? 1 : 0,
        daily_time: p.dailyTime,
        night_enabled: p.nightEnabled ? 1 : 0,
        night_time: p.nightTime,
        quiet_start: p.quietStart,
        quiet_end: p.quietEnd,
        timezone: tz,
        last_daily_sent: null,
        last_night_sent: null,
        updated_at: now(),
      };
      const { user_id: _u, last_daily_sent: _d, last_night_sent: _n, ...update } = row;
      await db.insertInto('reminder_prefs').values(row).onConflict((oc) => oc.column('user_id').doUpdateSet(update)).execute();
      return c.json({ ok: true });
    },
  );

  r.post('/test', rateLimit(limiter, { name: 'push-test', limit: 5, windowMs: 3_600_000, trustProxy: config.TRUST_PROXY, by: 'user' }), async (c) => {
    if (!push) return c.json({ error: 'Las notificaciones push no están configuradas.' }, 503);
    const sent = await push.sendToUser(c.get('user')!.id, { ...PUSH_COPY.test[0], url: '/app/perfil#notificaciones', tag: 'prueba' });
    return c.json({ sent });
  });

  return r;
}
