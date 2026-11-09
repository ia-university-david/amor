import { detectCrisis } from '../crisis';
import { localProvider } from './localProvider';
import type { AssistantContext, AssistantProvider, AssistantReply, ChatMessage } from './types';

export const ASSISTANT_ENDPOINT = (import.meta.env.VITE_ASSISTANT_ENDPOINT as string | undefined)?.trim() || '';

/**
 * Calls a server-side proxy (VITE_ASSISTANT_ENDPOINT) that owns the LLM
 * credentials and the system prompt. The browser never holds API keys.
 *
 * Request:  { messages: {role, text}[], context: { name?, memory } }
 * Response: { reply: string, suggestions?: {label, to}[] }
 *
 * Crisis detection always runs locally first; on any network error the
 * guided local provider answers instead.
 */
export function createRemoteProvider(endpoint: string): AssistantProvider {
  return {
    id: 'remote',
    async reply(history: ChatMessage[], ctx: AssistantContext): Promise<AssistantReply> {
      const last = [...history].reverse().find((m) => m.role === 'user');
      if (last) {
        const crisis = detectCrisis(last.text);
        if (crisis.detected) return localProvider.reply(history, ctx);
      }
      if (!ctx.aiSensitiveConsent) return localProvider.reply(history, ctx);
      const window = ctx.memoryConsent ? history.slice(-20) : history.slice(-6);
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: window.map((m) => ({ role: m.role, text: m.text })),
            context: { name: ctx.name, memory: ctx.memoryConsent },
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { reply?: string; suggestions?: { label: string; to: string }[] };
        if (!body.reply) throw new Error('Respuesta vacía');
        return { text: body.reply, suggestions: body.suggestions, provider: 'remote' };
      } catch {
        return localProvider.reply(history, ctx);
      }
    },
  };
}

export function getAssistantProvider(): AssistantProvider {
  return ASSISTANT_ENDPOINT ? createRemoteProvider(ASSISTANT_ENDPOINT) : localProvider;
}
