import { describe, expect, it } from 'vitest';
import { assessCommunityText, generatePseudonym } from '../../shared/moderation';
import { makeTestApp, registered, setRole } from './helpers';

describe('moderación automática', () => {
  it('publica mensajes de apoyo normales', () => {
    expect(assessCommunityText('Hoy fue mi día 10 sin escribirle y me siento un poco más tranquila.').action).toBe('publish');
  });
  it('retiene crisis, insultos, datos personales y enlaces', () => {
    expect(assessCommunityText('ya no quiero vivir').flags).toContain('crisis');
    expect(assessCommunityText('eres una idiota').flags).toContain('insulto');
    expect(assessCommunityText('escríbeme al +57 300 123 4567').flags).toContain('datos-personales');
    expect(assessCommunityText('su instagram es @fulano.real').flags).toContain('datos-personales');
    expect(assessCommunityText('mira https://ejemplo.com').flags).toContain('enlace');
  });
  it('no etiqueta personas: las marcas describen el texto, no a nadie', () => {
    const r = assessCommunityText('mi ex es un narcisista');
    expect(r.action).toBe('publish');
  });
  it('genera seudónimos sin datos personales', () => {
    expect(generatePseudonym(() => 0)).toMatch(/^[A-ZÁÉÍÓÚ][a-záéíóú]+ [a-z]+ \d{2}$/);
  });
});

describe('comunidad (API)', () => {
  it('exige correo verificado para publicar', async () => {
    const t = await makeTestApp();
    const { c } = await registered(t);
    const res = await c.json('/api/community/rooms/primeros-dias/posts', { json: { body: 'Hola a todas y todos' } });
    expect(res.status).toBe(403);
  });

  it('publica, responde y reacciona con seudónimo sin exponer la cuenta', async () => {
    const t = await makeTestApp();
    const { c } = await registered(t, 'ana@example.com', { verify: true });
    const me = await c.json<{ pseudonym: string }>('/api/community/me');
    expect(me.body.pseudonym).not.toMatch(/Ana/);
    const post = await c.json<{ post: { id: string; status: string; pseudonym: string } }>('/api/community/rooms/primeros-dias/posts', { json: { body: 'Hoy me costó pero lo logré' } });
    expect(post.status).toBe(201);
    expect(post.body.post.status).toBe('visible');
    expect(JSON.stringify(post.body)).not.toMatch(/ana@example|author_id/);
    const { c: other } = await registered(t, 'luz@example.com', { verify: true });
    await other.json(`/api/community/rooms/primeros-dias/posts`, { json: { body: 'Te leo, ánimo', parentId: post.body.post.id } });
    await other.json(`/api/community/posts/${post.body.post.id}/reactions`, { json: { kind: 'abrazo' } });
    const thread = await c.json<{ post: { reactions: Record<string, number>; replies: number }; replies: unknown[] }>(`/api/community/posts/${post.body.post.id}`);
    expect(thread.body.post.reactions.abrazo).toBe(1);
    expect(thread.body.replies).toHaveLength(1);
  });

  it('retiene en revisión los mensajes con señales de crisis y avisa al cliente', async () => {
    const t = await makeTestApp();
    const { c } = await registered(t, 'ana@example.com', { verify: true });
    const res = await c.json<{ held: boolean; crisis: boolean; post: { status: string } }>('/api/community/rooms/noches-dificiles/posts', { json: { body: 'Esta noche quiero hacerme daño' } });
    expect(res.body).toMatchObject({ held: true, crisis: true, post: { status: 'pending' } });
    const { c: other } = await registered(t, 'luz@example.com', { verify: true });
    const list = await other.json<{ posts: unknown[] }>('/api/community/rooms/noches-dificiles/posts');
    expect(list.body.posts).toHaveLength(0);
    const own = await c.json<{ posts: { status: string }[] }>('/api/community/rooms/noches-dificiles/posts');
    expect(own.body.posts[0].status).toBe('pending');
  });

  it('oculta automáticamente tras varias denuncias y la moderación decide', async () => {
    const t = await makeTestApp();
    const { c } = await registered(t, 'autor@example.com', { verify: true });
    const post = await c.json<{ post: { id: string } }>('/api/community/rooms/contacto-cero/posts', { json: { body: 'Un mensaje cualquiera' } });
    const id = post.body.post.id;
    for (const e of ['a@example.com', 'b@example.com', 'd@example.com']) {
      const { c: r } = await registered(t, e, { verify: true });
      await r.json(`/api/community/posts/${id}/report`, { json: { reason: 'ofensivo' } });
    }
    const row = await t.deps.db.selectFrom('community_posts').select('status').where('id', '=', id).executeTakeFirstOrThrow();
    expect(row.status).toBe('pending');

    expect((await c.json('/api/community/moderation/queue')).status).toBe(403);
    const { c: mod, id: modId } = await registered(t, 'mod@example.com');
    await setRole(t, modId, 'moderador');
    const q = await mod.json<{ pending: { id: string }[]; reports: unknown[] }>('/api/community/moderation/queue');
    expect(q.body.pending.map((p) => p.id)).toContain(id);
    expect(q.body.reports).toHaveLength(3);
    await mod.json(`/api/community/moderation/posts/${id}`, { json: { action: 'approve' } });
    const after = await mod.json<{ reports: unknown[] }>('/api/community/moderation/queue');
    expect(after.body.reports).toHaveLength(0);
  });

  it('al borrar la cuenta, sus mensajes quedan anonimizados', async () => {
    const t = await makeTestApp();
    const { c } = await registered(t, 'ana@example.com', { verify: true });
    await c.json('/api/community/rooms/reconstruirme/posts', { json: { body: 'Volví a pintar' } });
    await c.json('/api/account', { method: 'DELETE', json: { confirm: 'BORRAR', password: 'contraseña-segura' } });
    const rows = await t.deps.db.selectFrom('community_posts').selectAll().execute();
    expect(rows[0]).toMatchObject({ author_id: null, status: 'removed' });
    expect(rows[0].body).not.toMatch(/pintar/);
  });
});
