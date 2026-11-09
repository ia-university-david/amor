import * as webpush from 'web-push';
import type { Config } from '../config';
import type { DB } from '../db';
import type { Logger } from '../logger';
import { now } from '../util';

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

/**
 * Notification copy is intentionally generic: it can appear on a lock screen
 * that someone else sees, so it never mentions the ex, contact, the diary or
 * anything the person wrote.
 */
export const PUSH_COPY = {
  daily: [
    { title: 'Un momento para ti', body: '¿Cómo estás hoy? Tu espacio te espera.' },
    { title: 'Amor Tóxico', body: 'Un minuto para notar cómo te sientes.' },
    { title: 'Un momento para ti', body: 'Hoy no necesitas resolverlo todo. Solo un próximo paso.' },
  ],
  night: [
    { title: 'Amor Tóxico', body: 'Si la noche se hace larga, tu pausa está a un toque.' },
    { title: 'Un momento para ti', body: 'Antes de dormir: respira un poco, a tu ritmo.' },
  ],
  test: [{ title: 'Amor Tóxico', body: 'Las notificaciones funcionan. Puedes cambiarlas cuando quieras en Perfil.' }],
};

export interface PushSender {
  send(sub: { endpoint: string; p256dh: string; auth: string }, payload: PushPayload): Promise<{ gone: boolean }>;
}

export function webPushSender(config: Config): PushSender {
  webpush.setVapidDetails(config.VAPID_SUBJECT, config.VAPID_PUBLIC_KEY!, config.VAPID_PRIVATE_KEY!);
  return {
    async send(sub, payload) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: 3600, urgency: 'normal' });
        return { gone: false };
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) return { gone: true };
        throw err;
      }
    },
  };
}

/** "HH:MM" and weekday in an IANA time zone. */
export function localParts(date: Date, timeZone: string): { hm: string; day: string } {
  let tz = timeZone;
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
  } catch {
    tz = 'UTC';
  }
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return { hm: `${hour}:${get('minute')}`, day: `${get('year')}-${get('month')}-${get('day')}` };
}

const toMin = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
};

export function inQuietHours(hm: string, start: string | null, end: string | null): boolean {
  if (!start || !end || start === end) return false;
  const t = toMin(hm);
  const s = toMin(start);
  const e = toMin(end);
  return s < e ? t >= s && t < e : t >= s || t < e;
}

/** True when `hm` is within [target, target + windowMin). Handles midnight wrap. */
export function isDue(hm: string, target: string, windowMin = 30): boolean {
  const diff = (toMin(hm) - toMin(target) + 1440) % 1440;
  return diff < windowMin;
}

export class PushService {
  constructor(private readonly db: DB, private readonly sender: PushSender, private readonly log: Logger, readonly publicKey: string) {}

  async sendToUser(userId: string, payload: PushPayload): Promise<number> {
    const subs = await this.db.selectFrom('push_subscriptions').selectAll().where('user_id', '=', userId).execute();
    let sent = 0;
    for (const s of subs) {
      try {
        const r = await this.sender.send(s, payload);
        if (r.gone) await this.db.deleteFrom('push_subscriptions').where('id', '=', s.id).execute();
        else sent++;
      } catch (err) {
        this.log.warn('push.failed', { error: (err as Error).message });
      }
    }
    return sent;
  }

  /** One scheduler tick: sends due daily check-ins and night reminders, respecting quiet hours. */
  async tick(at = new Date()): Promise<number> {
    const prefs = await this.db
      .selectFrom('reminder_prefs')
      .selectAll()
      .where((eb) => eb.or([eb('daily_enabled', '=', 1), eb('night_enabled', '=', 1)]))
      .execute();
    let count = 0;
    for (const p of prefs) {
      const { hm, day } = localParts(at, p.timezone);
      if (inQuietHours(hm, p.quiet_start, p.quiet_end)) continue;
      const pick = <T,>(arr: T[]) => arr[Number(day.slice(-2)) % arr.length];
      if (p.daily_enabled && p.last_daily_sent !== day && isDue(hm, p.daily_time)) {
        await this.db.updateTable('reminder_prefs').set({ last_daily_sent: day }).where('user_id', '=', p.user_id).execute();
        const c = pick(PUSH_COPY.daily);
        count += await this.sendToUser(p.user_id, { ...c, url: '/app', tag: 'checkin' });
      }
      if (p.night_enabled && p.last_night_sent !== day && isDue(hm, p.night_time)) {
        await this.db.updateTable('reminder_prefs').set({ last_night_sent: day }).where('user_id', '=', p.user_id).execute();
        const c = pick(PUSH_COPY.night);
        count += await this.sendToUser(p.user_id, { ...c, url: '/app/pausa', tag: 'noche' });
      }
    }
    if (count) this.log.info('push.tick', { sent: count, at: now() });
    return count;
  }
}
