import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalDataAdapter } from '../src/lib/data/LocalDataAdapter';
import { SyncEngine } from '../src/lib/sync';

interface Sent {
  collection: string;
  id: string;
  value?: unknown;
  deleted?: boolean;
}

let sent: Sent[] = [];
let remoteDocs: unknown[] = [];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => {
  sent = [];
  remoteDocs = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url.startsWith('/api/sync') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as { changes: Sent[] };
        sent.push(...body.changes);
        return json({ accepted: body.changes.length });
      }
      if (url.startsWith('/api/sync')) return json({ docs: remoteDocs, serverTime: new Date().toISOString() });
      return json({ error: 'no' }, 404);
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

let n = 0;
function setup() {
  const engine = new SyncEngine();
  const local = new LocalDataAdapter(`sync-test-${n++}`);
  const store = engine.wrap(local);
  return { engine, local, store };
}

describe('motor de sincronización', () => {
  it('no envía nada mientras la sincronización está desactivada', async () => {
    const { engine, store } = setup();
    await store.put('profile', 'me', { name: 'Ana', createdAt: '2026-01-01' });
    await engine.push();
    expect(sent).toHaveLength(0);
  });

  it('nunca envía el diario, las cartas ni las conversaciones', async () => {
    const { engine, store } = setup();
    await store.put('diary', 'd1', { text: 'secreto' });
    await store.put('unsent', 'u1', { text: 'carta' });
    await store.put('chat', 'history', [{ text: 'conversación' }]);
    await store.put('reflections', '2026-11-02', { wentWell: 'algo' });
    await store.put('progress', 'modules', { m1: '2026-01-01' });
    await engine.enable();
    await engine.push();
    const collections = sent.map((s) => s.collection);
    expect(collections).toContain('progress');
    expect(collections).not.toContain('diary');
    expect(collections).not.toContain('unsent');
    expect(collections).not.toContain('chat');
    expect(collections).not.toContain('reflections');
    expect(JSON.stringify(sent)).not.toMatch(/secreto|carta|conversación/);
  });

  it('quita el texto libre de pausas, días difíciles y perfil', async () => {
    const { engine, store } = setup();
    await engine.enable();
    await store.put('events', 'e1', { kind: 'pausa', id: 'e1', at: '2026-11-01T22:00:00Z', initialIntensity: 8, finalIntensity: 4, learning: 'me ayudó llamar a mi hermana' });
    await store.put('events', 'e2', { kind: 'dificil', id: 'e2', at: '2026-11-02T22:00:00Z', type: 'envie-mensaje', reflection: 'muy privado', seeking: 'buscaba', nextStrategy: 'x', counterReset: false });
    await store.put('profile', 'me', { name: 'Ana', createdAt: '2026-01-01', reminder: 'mi frase íntima', email: 'ana@x.com' });
    await engine.push();
    const e1 = sent.find((s) => s.id === 'e1')!.value as Record<string, unknown>;
    expect(e1.initialIntensity).toBe(8);
    expect(e1).not.toHaveProperty('learning');
    const e2 = sent.find((s) => s.id === 'e2')!.value as Record<string, unknown>;
    expect(e2).not.toHaveProperty('reflection');
    expect(e2).not.toHaveProperty('seeking');
    const profile = sent.find((s) => s.collection === 'profile')!.value as Record<string, unknown>;
    expect(profile.name).toBe('Ana');
    expect(profile).not.toHaveProperty('reminder');
    expect(JSON.stringify(sent)).not.toMatch(/hermana|muy privado|frase íntima/);
  });

  it('envía los borrados', async () => {
    const { engine, store } = setup();
    await engine.enable();
    await store.put('moods', '2026-11-01', { date: '2026-11-01', emotion: 'Tristeza' });
    await store.remove('moods', '2026-11-01');
    await engine.push();
    expect(sent.some((s) => s.id === '2026-11-01' && s.deleted)).toBe(true);
  });

  it('al recibir datos remotos conserva los campos que solo viven en el dispositivo', async () => {
    const { engine, local } = setup();
    await local.put('events', 'e1', { kind: 'pausa', id: 'e1', at: '2026-11-01T22:00:00Z', initialIntensity: 8, learning: 'privado' });
    remoteDocs = [{ collection: 'events', id: 'e1', updatedAt: new Date(Date.now() + 1000).toISOString(), deleted: false, value: { kind: 'pausa', id: 'e1', at: '2026-11-01T22:00:00Z', initialIntensity: 8, finalIntensity: 3 } }];
    await engine.enable();
    const merged = await local.get<Record<string, unknown>>('events', 'e1');
    expect(merged?.finalIntensity).toBe(3);
    expect(merged?.learning).toBe('privado');
  });
});
