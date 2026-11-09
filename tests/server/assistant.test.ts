import { describe, expect, it } from 'vitest';
import { buildSystemPrompt } from '../../server/assistant/prompt';
import type { LlmProvider, LlmRequest } from '../../server/services/llm';
import { sseData } from '../../server/services/llm';
import { makeTestApp, readSSE, registered } from './helpers';

function mockLlm(chunks: string[] = ['Te leo. ', 'Tiene sentido que te sientas así.']) {
  const calls: LlmRequest[] = [];
  const llm: LlmProvider = {
    id: 'mock',
    async *stream(req) {
      calls.push(req);
      for (const c of chunks) yield c;
    },
  };
  return { llm, calls };
}

const consent = { aiSensitive: true as const };

describe('system prompt', () => {
  it('se identifica como IA y no como Laura ni terapeuta, sin órdenes sobre el contacto', () => {
    const p = buildSystemPrompt({ mode: 'impulso' });
    expect(p).toMatch(/Eres una inteligencia artificial/);
    expect(p).toMatch(/No eres Laura Rojas/);
    expect(p).toMatch(/No eres psicólogo, psiquiatra, terapeuta/);
    expect(p).toMatch(/Nunca ordenes contactar ni no contactar/);
    expect(p).toMatch(/no diagnosticas/);
    expect(p).toMatch(/No inventes otras líneas de ayuda/);
    expect(p).toMatch(/MODO IMPULSO/);
  });

  it('solo incluye la memoria cuando se pasa', () => {
    expect(buildSystemPrompt({})).not.toMatch(/RESUMEN DE MEMORIA/);
    expect(buildSystemPrompt({ memorySummary: '- habló de las noches' })).toMatch(/RESUMEN DE MEMORIA/);
  });
});

describe('proxy del asistente', () => {
  it('requiere sesión', async () => {
    const t = await makeTestApp({}, { llm: mockLlm().llm });
    const res = await t.client().json('/api/assistant/chat', { json: { messages: [{ role: 'user', text: 'hola' }], consent } });
    expect(res.status).toBe(401);
  });

  it('requiere el consentimiento de análisis de texto sensible', async () => {
    const t = await makeTestApp({}, { llm: mockLlm().llm });
    const { c } = await registered(t);
    const res = await c.json('/api/assistant/chat', { json: { messages: [{ role: 'user', text: 'hola' }], consent: { aiSensitive: false } } });
    expect(res.status).toBe(400);
  });

  it('sin LLM configurado pide usar el proveedor local', async () => {
    const t = await makeTestApp();
    const { c } = await registered(t);
    const res = await c.json<{ fallback: boolean }>('/api/assistant/chat', { json: { messages: [{ role: 'user', text: 'hola' }], consent } });
    expect(res.status).toBe(503);
    expect(res.body.fallback).toBe(true);
  });

  it('transmite la respuesta del modelo en streaming con sugerencias', async () => {
    const { llm, calls } = mockLlm();
    const t = await makeTestApp({}, { llm });
    const { c } = await registered(t);
    const res = await c.req('/api/assistant/chat', { json: { messages: [{ role: 'user', text: 'tengo ganas de escribirle' }], mode: 'impulso', consent } });
    expect(res.headers.get('content-type')).toMatch(/text\/event-stream/);
    const events = await readSSE(res);
    const text = events.filter((e) => e.event === 'delta').map((e) => e.data.text).join('');
    expect(text).toBe('Te leo. Tiene sentido que te sientas así.');
    const done = events.find((e) => e.event === 'done')!;
    expect((done.data.suggestions as { to: string }[]).map((s) => s.to)).toContain('/app/pausa');
    expect(calls[0].system).toMatch(/MODO IMPULSO/);
    expect(calls[0].messages).toEqual([{ role: 'user', content: 'tengo ganas de escribirle' }]);
  });

  it('ante señales de crisis responde con seguridad sin llamar al modelo', async () => {
    const { llm, calls } = mockLlm();
    const t = await makeTestApp({}, { llm });
    const { c } = await registered(t);
    const res = await c.req('/api/assistant/chat', { json: { messages: [{ role: 'user', text: 'ya no quiero vivir' }], consent } });
    const events = await readSSE(res);
    expect(events[0].event).toBe('crisis');
    expect(events[0].data.categories).toContain('suicidio');
    const text = events.filter((e) => e.event === 'delta').map((e) => e.data.text).join('');
    expect(text).toMatch(/número de emergencias de tu país/);
    expect(text).toMatch(/123/);
    expect(calls).toHaveLength(0);
  });

  it('aplica el límite diario por plan', async () => {
    const { llm } = mockLlm(['ok']);
    const t = await makeTestApp({}, { llm });
    const { c, id } = await registered(t);
    await t.deps.db.insertInto('assistant_usage').values({ user_id: id, day: new Date().toISOString().slice(0, 10), count: 15 }).execute();
    const res = await c.json<{ fallback: boolean }>('/api/assistant/chat', { json: { messages: [{ role: 'user', text: 'hola' }], consent } });
    expect(res.status).toBe(429);
    expect(res.body.fallback).toBe(true);
  });

  it('si el modelo falla emite un evento de error con fallback', async () => {
    const llm: LlmProvider = {
      id: 'roto',
      // eslint-disable-next-line require-yield
      async *stream() {
        throw new Error('caído');
      },
    };
    const t = await makeTestApp({}, { llm });
    const { c } = await registered(t);
    const events = await readSSE(await c.req('/api/assistant/chat', { json: { messages: [{ role: 'user', text: 'hola' }], consent } }));
    expect(events.find((e) => e.event === 'error')?.data.fallback).toBe(true);
  });

  it('el resumen de memoria exige consentimiento y no se guarda en el servidor', async () => {
    const { llm } = mockLlm(['- Quiso trabajar las noches difíciles']);
    const t = await makeTestApp({}, { llm });
    const { c } = await registered(t);
    const bad = await c.json('/api/assistant/summary', { json: { messages: [{ role: 'user', text: 'hola' }], consent: { memory: false } } });
    expect(bad.status).toBe(400);
    const ok = await c.json<{ summary: string }>('/api/assistant/summary', { json: { messages: [{ role: 'user', text: 'hola' }], consent: { memory: true } } });
    expect(ok.body.summary).toMatch(/noches/);
  });
});

describe('parser SSE de proveedores', () => {
  it('lee eventos data: aunque lleguen partidos', async () => {
    const enc = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(ctrl) {
        ctrl.enqueue(enc.encode('data: {"a":1}\n\nda'));
        ctrl.enqueue(enc.encode('ta: [DONE]\n\n'));
        ctrl.close();
      },
    });
    const out: string[] = [];
    for await (const d of sseData(stream)) out.push(d);
    expect(out).toEqual(['{"a":1}', '[DONE]']);
  });
});
