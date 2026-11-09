import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRemoteProvider, createSSEParser } from '../src/lib/assistant/remoteProvider';
import type { ChatMessage } from '../src/lib/assistant/types';

const ctx = { aiSensitiveConsent: true, memoryConsent: false, name: 'Ana' };
const msg = (text: string): ChatMessage => ({ id: Math.random().toString(), role: 'user', text, at: new Date().toISOString() });

function sseResponse(events: [string, unknown][], splitAt = 7) {
  const raw = events.map(([e, d]) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`).join('');
  const chunks: string[] = [];
  for (let i = 0; i < raw.length; i += splitAt) chunks.push(raw.slice(i, i + splitAt));
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      for (const ch of chunks) c.enqueue(new TextEncoder().encode(ch));
      c.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

afterEach(() => vi.unstubAllGlobals());

describe('parser SSE', () => {
  it('reconstruye eventos partidos en varios fragmentos', () => {
    const got: { event: string; data: string }[] = [];
    const parse = createSSEParser((e) => got.push(e));
    parse('event: delta\nda');
    parse('ta: {"text":"Ho"}\n\nevent: delta\ndata: {"text":"la"}\n');
    parse('\n');
    expect(got).toEqual([
      { event: 'delta', data: '{"text":"Ho"}' },
      { event: 'delta', data: '{"text":"la"}' },
    ]);
  });
});

describe('asistente remoto', () => {
  it('transmite la respuesta por partes', async () => {
    const fetchMock = vi.fn(async () =>
      sseResponse([
        ['meta', { provider: 'openai', remaining: 9 }],
        ['delta', { text: 'Te leo. ' }],
        ['delta', { text: '¿Qué necesitas ahora?' }],
        ['done', { suggestions: [{ label: 'Pausa', to: '/app/pausa' }], provider: 'openai' }],
      ]),
    );
    vi.stubGlobal('fetch', fetchMock);
    const deltas: string[] = [];
    const reply = await createRemoteProvider().reply([msg('Hoy me siento muy sola')], { ...ctx, mode: 'tristeza' }, { onDelta: (t) => deltas.push(t) });
    expect(reply.provider).toBe('remote');
    expect(reply.text).toBe('Te leo. ¿Qué necesitas ahora?');
    expect(deltas.at(-1)).toBe(reply.text);
    expect(reply.suggestions?.[0].to).toBe('/app/pausa');
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.mode).toBe('tristeza');
    expect(body.consent).toEqual({ aiSensitive: true, memory: false });
    expect(body.memorySummary).toBeUndefined();
  });

  it('ante una crisis responde en el dispositivo sin llamar al servidor', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const reply = await createRemoteProvider().reply([msg('ya no quiero vivir')], ctx);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(reply.crisis?.detected).toBe(true);
    expect(reply.provider).toBe('local');
  });

  it('sin permiso de análisis sensible no envía nada', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const reply = await createRemoteProvider().reply([msg('hola')], { ...ctx, aiSensitiveConsent: false });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(reply.provider).toBe('local');
  });

  it('si el servidor no tiene IA, responde el asistente guiado con un aviso', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'no', fallback: true }), { status: 503, headers: { 'Content-Type': 'application/json' } })));
    const reply = await createRemoteProvider().reply([msg('me siento triste')], ctx);
    expect(reply.provider).toBe('local');
    expect(reply.text.length).toBeGreaterThan(10);
    expect(reply.notice).toMatch(/asistente guiado/);
  });

  it('muestra el mensaje del límite diario', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Llegaste al límite de 15 mensajes con la IA por hoy.', fallback: true }), { status: 429, headers: { 'Content-Type': 'application/json' } })));
    const reply = await createRemoteProvider().reply([msg('hola')], ctx);
    expect(reply.provider).toBe('local');
    expect(reply.notice).toMatch(/límite de 15/);
  });

  it('sin conexión, responde el asistente guiado', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))));
    const reply = await createRemoteProvider().reply([msg('hola')], ctx);
    expect(reply.provider).toBe('local');
  });

  it('respeta el aviso de crisis del servidor', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sseResponse([['crisis', { categories: ['peligro'] }], ['delta', { text: 'Tu seguridad es lo primero.' }], ['done', { suggestions: [], provider: 'safety' }]])));
    const reply = await createRemoteProvider().reply([msg('algo ambiguo')], ctx);
    expect(reply.crisis?.detected).toBe(true);
    expect(reply.provider).toBe('safety');
  });
});
