import type { Config } from '../config';

export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmRequest {
  system: string;
  messages: LlmMessage[];
  maxTokens: number;
  signal?: AbortSignal;
}

export interface LlmProvider {
  readonly id: string;
  stream(req: LlmRequest): AsyncIterable<string>;
}

/** Parses a text/event-stream body into `data:` payloads. */
export async function* sseData(body: ReadableStream<Uint8Array>): AsyncIterable<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) !== -1 || (idx = buffer.indexOf('\r\n\r\n')) !== -1) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + (buffer.startsWith('\r\n', idx) ? 4 : 2));
      const data = chunk
        .split(/\r?\n/)
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trimStart())
        .join('\n');
      if (data) yield data;
    }
  }
}

export function openAICompatible(opts: { apiKey: string; model: string; baseUrl: string }): LlmProvider {
  return {
    id: 'openai',
    async *stream(req) {
      const res = await fetch(`${opts.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        signal: req.signal,
        headers: { Authorization: `Bearer ${opts.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: opts.model,
          stream: true,
          max_tokens: req.maxTokens,
          temperature: 0.6,
          messages: [{ role: 'system', content: req.system }, ...req.messages],
        }),
      });
      if (!res.ok || !res.body) throw new Error(`LLM respondió ${res.status}`);
      for await (const data of sseData(res.body)) {
        if (data === '[DONE]') return;
        try {
          const json = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
          const text = json.choices?.[0]?.delta?.content;
          if (text) yield text;
        } catch {
          // Ignore keep-alive or malformed lines.
        }
      }
    },
  };
}

export function anthropic(opts: { apiKey: string; model: string; baseUrl: string }): LlmProvider {
  return {
    id: 'anthropic',
    async *stream(req) {
      const res = await fetch(`${opts.baseUrl.replace(/\/$/, '')}/v1/messages`, {
        method: 'POST',
        signal: req.signal,
        headers: { 'x-api-key': opts.apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: opts.model, stream: true, max_tokens: req.maxTokens, system: req.system, messages: req.messages }),
      });
      if (!res.ok || !res.body) throw new Error(`LLM respondió ${res.status}`);
      for await (const data of sseData(res.body)) {
        try {
          const json = JSON.parse(data) as { type?: string; delta?: { type?: string; text?: string } };
          if (json.type === 'content_block_delta' && json.delta?.text) yield json.delta.text;
          if (json.type === 'message_stop') return;
        } catch {
          // Ignore.
        }
      }
    },
  };
}

export function createLlm(config: Config): LlmProvider | null {
  if (!config.features.llm) return null;
  if (config.LLM_PROVIDER === 'anthropic') {
    return anthropic({ apiKey: config.LLM_API_KEY!, model: config.LLM_MODEL ?? 'claude-3-5-haiku-latest', baseUrl: config.LLM_BASE_URL ?? 'https://api.anthropic.com' });
  }
  return openAICompatible({ apiKey: config.LLM_API_KEY!, model: config.LLM_MODEL ?? 'gpt-4o-mini', baseUrl: config.LLM_BASE_URL ?? 'https://api.openai.com/v1' });
}

/** Collects a full reply (used for memory summaries). */
export async function complete(llm: LlmProvider, req: LlmRequest): Promise<string> {
  let out = '';
  for await (const t of llm.stream(req)) out += t;
  return out.trim();
}
