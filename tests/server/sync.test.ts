import { describe, expect, it } from 'vitest';
import { mergeFromRemote, sanitizeForSync } from '../../shared/sync';
import { makeTestApp, registered } from './helpers';

describe('reglas de sincronización', () => {
  it('nunca sincroniza texto libre ni colecciones privadas', () => {
    expect(sanitizeForSync('diary', 'x', { text: 'querido diario' })).toBeNull();
    expect(sanitizeForSync('unsent', 'x', { text: 'hola' })).toBeNull();
    expect(sanitizeForSync('chat', 'history', [{ text: 'hola' }])).toBeNull();
    expect(sanitizeForSync('events', 'e1', { kind: 'pausa', initialIntensity: 8, learning: 'secreto' })).toEqual({ kind: 'pausa', initialIntensity: 8 });
    expect(sanitizeForSync('moods', '2026-01-01', { date: '2026-01-01', emotion: 'tristeza', note: 'nota privada' })).toEqual({ date: '2026-01-01', emotion: 'tristeza' });
    expect(sanitizeForSync('profile', 'me', { name: 'Ana', motives: ['privado'], reminder: 'texto' })).toEqual({ name: 'Ana' });
    expect(sanitizeForSync('limits', 'counter', { enabled: true, startedAt: 'x', resets: [{ at: 'a', note: 'privada' }] })).toEqual({ enabled: true, startedAt: 'x', resets: [{ at: 'a' }] });
  });

  it('al traer datos del servidor conserva lo que solo existe en el dispositivo', () => {
    const merged = mergeFromRemote('limits', 'counter', { enabled: true, resets: [{ at: 'a', note: 'mi nota' }] }, { enabled: false, resets: [{ at: 'a' }, { at: 'b' }] }) as { enabled: boolean; resets: { at: string; note?: string }[] };
    expect(merged.enabled).toBe(false);
    expect(merged.resets).toEqual([{ at: 'a', note: 'mi nota' }, { at: 'b' }]);
    expect(mergeFromRemote('profile', 'me', { name: 'A', motives: ['m'] }, { name: 'B' })).toEqual({ name: 'B', motives: ['m'] });
  });
});

describe('API de sincronización', () => {
  it('exige el consentimiento de sincronización', async () => {
    const t = await makeTestApp();
    const { c } = await registered(t, 'ana@example.com', { sync: false });
    expect((await c.json('/api/sync')).status).toBe(403);
  });

  it('filtra en el servidor, cifra en reposo y aplica la última escritura', async () => {
    const t = await makeTestApp();
    const { c } = await registered(t, 'ana@example.com', { sync: true });
    const res = await c.json<{ accepted: number; rejected: number }>('/api/sync', {
      json: {
        changes: [
          { collection: 'events', id: 'e1', updatedAt: '2026-01-02T00:00:00.000Z', value: { kind: 'pausa', initialIntensity: 7, learning: 'texto privado' } },
          { collection: 'diary', id: 'd1', updatedAt: '2026-01-02T00:00:00.000Z', value: { text: 'mi diario' } },
        ],
      },
    });
    expect(res.body).toEqual(expect.objectContaining({ accepted: 1, rejected: 1 }));
    const raw = await t.deps.db.selectFrom('sync_docs').selectAll().execute();
    expect(raw).toHaveLength(1);
    expect(raw[0].payload).not.toMatch(/pausa|privado/);
    const pulled = await c.json<{ docs: { value: Record<string, unknown> }[] }>('/api/sync');
    expect(pulled.body.docs[0].value).toEqual({ kind: 'pausa', initialIntensity: 7 });

    const older = await c.json<{ accepted: number }>('/api/sync', { json: { changes: [{ collection: 'events', id: 'e1', updatedAt: '2025-01-01T00:00:00.000Z', value: { kind: 'pausa', initialIntensity: 1 } }] } });
    expect(older.body.accepted).toBe(0);
  });

  it('al desactivar el consentimiento borra lo sincronizado', async () => {
    const t = await makeTestApp();
    const { c } = await registered(t, 'ana@example.com', { sync: true });
    await c.json('/api/sync', { json: { changes: [{ collection: 'moods', id: 'd', updatedAt: '2026-01-01T00:00:00.000Z', value: { date: 'd', emotion: 'calma' } }] } });
    await c.json('/api/account', { method: 'PATCH', json: { consents: { sync: false } } });
    expect(await t.deps.db.selectFrom('sync_docs').selectAll().execute()).toHaveLength(0);
  });
});

describe('copia cifrada de extremo a extremo', () => {
  it('guarda solo texto cifrado y parámetros del KDF', async () => {
    const t = await makeTestApp();
    const { c } = await registered(t);
    const bad = await c.json('/api/backup', { method: 'PUT', json: { ciphertext: 'AAAAAAAAAAAAAAAAAAAA', iv: 'AAAAAAAAAAAA', salt: 'AAAAAAAAAAAAAAAAAAAAAA', kdf: 'PBKDF2-SHA256', iterations: 1000 } });
    expect(bad.status).toBe(400);
    const put = await c.json('/api/backup', { method: 'PUT', json: { ciphertext: 'Q2lmcmFkbw'.repeat(4), iv: 'AAAAAAAAAAAAAAAA', salt: 'c2FsdHNhbHRzYWx0c2FsdA', kdf: 'PBKDF2-SHA256', iterations: 600000 } });
    expect(put.status).toBe(200);
    const meta = await c.json<{ backup: { iterations: number } }>('/api/backup/meta');
    expect(meta.body.backup.iterations).toBe(600000);
    await c.json('/api/backup', { method: 'DELETE' });
    expect((await c.json('/api/backup')).status).toBe(404);
  });
});
