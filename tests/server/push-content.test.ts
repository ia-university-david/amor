import { describe, expect, it } from 'vitest';
import { PUSH_COPY, inQuietHours, isDue, localParts, type PushPayload } from '../../server/services/push';
import { makeTestApp, registered, setRole } from './helpers';

describe('programación de recordatorios', () => {
  it('calcula hora local por zona horaria', () => {
    const at = new Date('2026-03-10T02:30:00Z');
    expect(localParts(at, 'America/Bogota')).toEqual({ hm: '21:30', day: '2026-03-09' });
    expect(localParts(at, 'Zona/Invalida').hm).toBe('02:30');
  });
  it('respeta horas de silencio que cruzan la medianoche', () => {
    expect(inQuietHours('23:30', '23:00', '07:00')).toBe(true);
    expect(inQuietHours('06:59', '23:00', '07:00')).toBe(true);
    expect(inQuietHours('12:00', '23:00', '07:00')).toBe(false);
    expect(inQuietHours('12:00', null, null)).toBe(false);
  });
  it('considera una ventana de 30 minutos', () => {
    expect(isDue('21:00', '21:00')).toBe(true);
    expect(isDue('21:29', '21:00')).toBe(true);
    expect(isDue('21:30', '21:00')).toBe(false);
    expect(isDue('00:10', '23:50')).toBe(true);
  });
  it('los textos no incluyen contenido sensible', () => {
    const all = [...PUSH_COPY.daily, ...PUSH_COPY.night, ...PUSH_COPY.test].map((c) => `${c.title} ${c.body}`).join(' ').toLowerCase();
    expect(all).not.toMatch(/\bex\b|expareja|escribirle|diario|contacto cero/);
  });

  it('envía una vez al día y nunca en horas de silencio', async () => {
    const sent: PushPayload[] = [];
    const t = await makeTestApp({ VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv' }, { pushSender: { async send(_s, p) { sent.push(p); return { gone: false }; } } });
    const { c } = await registered(t);
    await c.json('/api/push/subscribe', { json: { endpoint: 'https://push.example/abc', keys: { p256dh: 'k', auth: 'a' } } });
    await c.json('/api/push/preferences', { method: 'PUT', json: { dailyEnabled: true, dailyTime: '21:00', nightEnabled: true, nightTime: '23:30', quietStart: '23:00', quietEnd: '07:00', timezone: 'UTC' } });
    await t.deps.push!.tick(new Date('2026-03-10T21:05:00Z'));
    await t.deps.push!.tick(new Date('2026-03-10T21:10:00Z'));
    await t.deps.push!.tick(new Date('2026-03-10T23:35:00Z'));
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe('/app');
  });
});

describe('CMS y roles', () => {
  it('el público solo ve contenido publicado o autorizado', async () => {
    const t = await makeTestApp();
    const laura = await t.client().json<{ items: unknown[] }>('/api/content/laura');
    expect(laura.body.items).toHaveLength(0);
    const blog = await t.client().json<{ items: { slug: string; status: string }[] }>('/api/content/blog');
    expect(blog.body.items.map((b) => b.slug)).toContain('contacto-cero-guia-completa');
  });

  it('editor edita contenido; persona usuaria no; planes solo admin', async () => {
    const t = await makeTestApp();
    const { c: user } = await registered(t, 'u@example.com');
    const item = { slug: 'nuevo-articulo', title: 'Nuevo', status: 'borrador', data: { category: 'X', readingMinutes: 3, summary: 's', body: '# Hola', author: 'Equipo Amor Tóxico' } };
    expect((await user.json('/api/admin/content/blog', { json: item })).status).toBe(403);
    const { c: ed, id } = await registered(t, 'e@example.com');
    await setRole(t, id, 'editor');
    const saved = await ed.json<{ item: { id: string } }>('/api/admin/content/blog', { json: item });
    expect(saved.status).toBe(200);
    expect((await ed.json('/api/admin/content/blog', { json: item })).status).toBe(409);
    const pub = await ed.json('/api/admin/content/blog/' + saved.body.item.id, { method: 'PUT', json: { ...item, status: 'publicado' } });
    expect(pub.status).toBe(200);
    expect((await t.client().json('/api/content/blog/nuevo-articulo')).status).toBe(200);
    const plans = await ed.json<{ items: { id: string; data: unknown }[] }>('/api/admin/content/plan');
    const p = plans.body.items[0];
    expect((await ed.json('/api/admin/content/plan/' + p.id, { method: 'PUT', json: { ...p, slug: 'free', title: 'Gratis' } })).status).toBe(403);
    const bad = await ed.json('/api/admin/content/library', { json: { slug: 'ref', title: 'R', status: 'publicado', data: { evidenceLevel: 'inventado' } } });
    expect(bad.status).toBe(400);
  });

  it('leads con doble confirmación', async () => {
    const t = await makeTestApp({ EBOOK_URL: 'https://amortoxico.com/ebook.pdf' });
    const c = t.client();
    const r = await c.json<{ status: string }>('/api/leads', { json: { kind: 'ebook', name: 'Ana', email: 'ana@example.com', consent: true } });
    expect(r.body.status).toBe('pending-confirmation');
    const link = t.mail.sent.find((m) => m.kind === 'lead-confirm')!.text;
    const token = /token=([A-Za-z0-9_-]+)/.exec(link)![1];
    const conf = await c.json<{ ebookAvailable: boolean }>('/api/leads/confirm', { json: { token } });
    expect(conf.body.ebookAvailable).toBe(true);
    expect(t.mail.sent[0].kind).toBe('ebook');
    const lead = await t.deps.db.selectFrom('leads').selectAll().executeTakeFirstOrThrow();
    expect(lead.status).toBe('confirmed');
  });

  it('sirve sitemap con artículos y redirige URLs antiguas', async () => {
    const t = await makeTestApp();
    const xml = await (await t.app.request('/sitemap.xml')).text();
    expect(xml).toContain('/blog/contacto-cero-guia-completa');
  });
});
