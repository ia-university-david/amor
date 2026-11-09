import { detectCrisis } from '../crisis';
import { localProvider } from './localProvider';
import type { AssistantContext, AssistantProvider, AssistantReply, ChatMessage, ReplyOptions } from './types';

export interface SSEEvent {
  event: string;
  data: string;
}

/** Incremental parser for `text/event-stream` chunks. */
export function createSSEParser(onEvent: (e: SSEEvent) => void) {
  let buffer = '';
  return (chunk: string) => {
    buffer += chunk.replace(/\r\n?/g, '\n');
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      let event = 'message';
      const data: string[] = [];
      for (const line of raw.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
      }
      if (data.length) onEvent({ event, data: data.join('\n') });
    }
  };
}

const FALLBACK_NOTICE = 'La IA no está disponible ahora; te acompaña el asistente guiado.';

/**
 * Streams replies from the server proxy (`/api/assistant/chat`), which owns
 * the LLM credentials and the system prompt. Crisis detection runs on the
 * device first and again on the server. On any failure the guided local
 * provider answers instead, so the person is never left without a reply.
 */
export function createRemoteProvider(endpoint = '/api/assistant/chat'): AssistantProvider {
  return {
    id: 'remote',
    async reply(history: ChatMessage[], ctx: AssistantContext, opts: ReplyOptions = {}): Promise<AssistantReply> {
      const last = [...history].reverse().find((m) => m.role === 'user');
      if (last && detectCrisis(last.text).detected) return localProvider.reply(history, ctx);
      if (!ctx.aiSensitiveConsent) return localProvider.reply(history, ctx);

      const fallback = async (notice = FALLBACK_NOTICE): Promise<AssistantReply> => ({ ...(await localProvider.reply(history, ctx)), notice });
      const window = (ctx.memoryConsent ? history.slice(-20) : history.slice(-8)).filter((m) => m.text.trim());

      let res: Response;
      try {
        res = await fetch(endpoint, {
          method: 'POST',
          credentials: 'same-origin',
          signal: opts.signal,
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify({
            messages: window.map((m) => ({ role: m.role, text: m.text.slice(0, 4000) })),
            mode: ctx.mode,
            name: ctx.name?.slice(0, 40),
            memorySummary: ctx.memoryConsent ? ctx.memorySummary?.slice(0, 2000) : undefined,
            consent: { aiSensitive: true, memory: ctx.memoryConsent },
          }),
        });
      } catch {
        return fallback();
      }
      if (!res.ok || !res.body) {
        let notice = FALLBACK_NOTICE;
        try {
          const body = (await res.json()) as { error?: string };
          if (res.status === 429 && body.error) notice = body.error;
        } catch {
          /* ignore */
        }
        return fallback(notice);
      }

      let text = '';
      let crisis: AssistantReply['crisis'];
      let suggestions: AssistantReply['suggestions'];
      let provider: AssistantReply['provider'] = 'remote';
      let failed = false;
      const parse = createSSEParser(({ event, data }) => {
        let payload: Record<string, unknown> = {};
        try {
          payload = JSON.parse(data) as Record<string, unknown>;
        } catch {
          return;
        }
        if (event === 'delta' && typeof payload.text === 'string') {
          text += payload.text;
          opts.onDelta?.(text);
        } else if (event === 'crisis') {
          crisis = { detected: true, categories: (payload.categories as NonNullable<AssistantReply['crisis']>['categories']) ?? [] };
        } else if (event === 'done') {
          suggestions = payload.suggestions as AssistantReply['suggestions'];
          if (payload.provider === 'safety') provider = 'safety';
        } else if (event === 'error') {
          failed = true;
        }
      });

      try {
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          parse(value);
        }
        parse('\n\n');
      } catch {
        failed = true;
      }

      if (failed || !text.trim()) {
        if (text.trim()) return { text, suggestions, crisis, provider, notice: 'La respuesta se interrumpió. Puedes volver a intentarlo.' };
        return fallback();
      }
      return { text, suggestions, crisis, provider };
    },
  };
}

export function getAssistantProvider(opts: { llm: boolean; signedIn: boolean }): AssistantProvider {
  return opts.llm && opts.signedIn ? createRemoteProvider() : localProvider;
}
