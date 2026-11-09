import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import type { AppEnv, Deps } from '../context';
import { rateLimit } from '../middleware/rateLimit';
import { requireUser } from '../middleware/session';
import { ASSISTANT_MODES, CRISIS_REPLY, SUMMARY_PROMPT, buildSystemPrompt, type AssistantMode } from '../assistant/prompt';
import { complete } from '../services/llm';
import { bumpMetric } from '../services/tokens';
import { detectCrisis } from '../../shared/crisis';
import { SUGGESTIONS, classifyTopic, topicSuggestions } from '../../shared/assistant/local';
import { entitlementsFor } from '../../shared/plans';
import { dayKey } from '../util';
import { body } from './validate';

const Message = z.object({ role: z.enum(['user', 'assistant']), text: z.string().min(1).max(4000) });

const ChatBody = z.object({
  messages: z.array(Message).min(1).max(30),
  mode: z.enum(ASSISTANT_MODES).optional(),
  name: z.string().trim().max(40).optional(),
  memorySummary: z.string().max(2000).optional(),
  consent: z.object({ aiSensitive: z.literal(true), memory: z.boolean().optional() }),
});

const MODE_SUGGESTIONS: Record<AssistantMode, { label: string; to: string }[]> = {
  impulso: [SUGGESTIONS.pausa, SUGGESTIONS.escribir],
  tristeza: [SUGGESTIONS.respirar, SUGGESTIONS.diario],
  rumiacion: [SUGGESTIONS.rumiacion, SUGGESTIONS.creencias],
  entender: [SUGGESTIONS.cerebro],
  hablar: [],
};

export function suggestionsFor(text: string, mode?: AssistantMode) {
  const topic = classifyTopic(text);
  if (topic) return topicSuggestions(topic);
  return mode ? MODE_SUGGESTIONS[mode] : [];
}

/** Crisis check over the latest user turns (a risk mentioned one message ago still counts). */
export function crisisIn(messages: { role: string; text: string }[]) {
  const recent = messages.filter((m) => m.role === 'user').slice(-3);
  for (let i = recent.length - 1; i >= 0; i--) {
    const r = detectCrisis(recent[i].text);
    if (r.detected) return r;
  }
  return null;
}

export function assistantRoutes(deps: Deps) {
  const r = new Hono<AppEnv>();
  const { db, config, limiter, log } = deps;

  r.get('/status', (c) => {
    const user = c.get('user');
    return c.json({ llm: Boolean(deps.llm), signedIn: Boolean(user), dailyLimit: entitlementsFor(user?.plan).assistantDailyMessages });
  });

  r.use('/chat', requireUser);
  r.use('/summary', requireUser);
  r.use('*', rateLimit(limiter, { name: 'assistant-burst', limit: 12, windowMs: 60_000, trustProxy: config.TRUST_PROXY, by: 'user' }));

  r.post('/chat', body(ChatBody), async (c) => {
    const input = c.req.valid('json');
    const user = c.get('user')!;
    const crisis = crisisIn(input.messages);
    if (crisis) {
      await bumpMetric(db, 'assistant_crisis');
      log.info('assistant.crisis', { categories: crisis.categories });
      return streamSSE(c, async (s) => {
        await s.writeSSE({ event: 'crisis', data: JSON.stringify({ categories: crisis.categories }) });
        await s.writeSSE({ event: 'delta', data: JSON.stringify({ text: CRISIS_REPLY }) });
        await s.writeSSE({ event: 'done', data: JSON.stringify({ suggestions: [], provider: 'safety' }) });
      });
    }
    if (!deps.llm) return c.json({ error: 'El asistente con IA no está configurado.', fallback: true }, 503);

    const limit = entitlementsFor(user.plan).assistantDailyMessages;
    const day = dayKey();
    const usage = await db.selectFrom('assistant_usage').select('count').where('user_id', '=', user.id).where('day', '=', day).executeTakeFirst();
    if ((usage?.count ?? 0) >= limit) {
      return c.json({ error: `Llegaste al límite de ${limit} mensajes con la IA por hoy. El asistente guiado sigue disponible.`, fallback: true }, 429);
    }
    await db
      .insertInto('assistant_usage')
      .values({ user_id: user.id, day, count: 1 })
      .onConflict((oc) => oc.columns(['user_id', 'day']).doUpdateSet((eb) => ({ count: eb('assistant_usage.count', '+', 1) })))
      .execute();
    await bumpMetric(db, 'assistant_message');

    const system = buildSystemPrompt({ mode: input.mode, name: input.name, memorySummary: input.consent.memory ? input.memorySummary : undefined });
    const messages = input.messages.map((m) => ({ role: m.role, content: m.text }));
    while (messages.length && messages[0].role !== 'user') messages.shift();
    const lastUser = [...input.messages].reverse().find((m) => m.role === 'user')?.text ?? '';
    const llm = deps.llm;
    const started = Date.now();

    return streamSSE(c, async (s) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), config.LLM_TIMEOUT_MS);
      s.onAbort(() => ctrl.abort());
      let chars = 0;
      try {
        await s.writeSSE({ event: 'meta', data: JSON.stringify({ provider: llm.id, remaining: Math.max(0, limit - (usage?.count ?? 0) - 1) }) });
        for await (const text of llm.stream({ system, messages, maxTokens: config.LLM_MAX_TOKENS, signal: ctrl.signal })) {
          chars += text.length;
          await s.writeSSE({ event: 'delta', data: JSON.stringify({ text }) });
        }
        await s.writeSSE({ event: 'done', data: JSON.stringify({ suggestions: suggestionsFor(lastUser, input.mode), provider: llm.id }) });
        log.info('assistant.reply', { provider: llm.id, mode: input.mode ?? null, chars, ms: Date.now() - started });
      } catch (err) {
        log.warn('assistant.error', { provider: llm.id, error: (err as Error).name });
        await s.writeSSE({ event: 'error', data: JSON.stringify({ fallback: true, partial: chars > 0 }) });
      } finally {
        clearTimeout(timer);
      }
    });
  });

  r.post(
    '/summary',
    body(z.object({ messages: z.array(Message).min(1).max(60), consent: z.object({ memory: z.literal(true) }) })),
    async (c) => {
      if (!deps.llm) return c.json({ error: 'El resumen con IA no está configurado.', fallback: true }, 503);
      const transcript = c.req
        .valid('json')
        .messages.map((m) => `${m.role === 'user' ? 'Persona' : 'Asistente'}: ${m.text}`)
        .join('\n');
      try {
        const summary = await complete(deps.llm, { system: SUMMARY_PROMPT, messages: [{ role: 'user', content: transcript }], maxTokens: 300 });
        // Not stored on the server: the client keeps it encrypted on the device.
        return c.json({ summary: summary.slice(0, 2000) });
      } catch {
        return c.json({ error: 'No se pudo generar el resumen.', fallback: true }, 502);
      }
    },
  );

  return r;
}
