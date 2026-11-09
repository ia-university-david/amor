import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { CrisisScreen } from '../../components/Safety';
import { Seo } from '../../components/Seo';
import { Notice, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { TOPIC_LABELS } from '../../lib/assistant/localProvider';
import { getAssistantProvider } from '../../lib/assistant/remoteProvider';
import type { AssistantTopic, ChatMessage } from '../../lib/assistant/types';
import { data, newId } from '../../lib/data';
import { useApp } from '../../state/AppContext';
import { ASSISTANT_MODES, MODE_LABELS, type AssistantMode } from '../../../shared/assistant/modes';

export interface MemorySummary {
  id: string;
  text: string;
  at: string;
}

export async function loadMemories(): Promise<MemorySummary[]> {
  return (await data().get<MemorySummary[]>('chat', 'memories')) ?? [];
}

export async function saveMemories(list: MemorySummary[]) {
  await data().put('chat', 'memories', list.slice(-10));
}

export default function Asistente() {
  const { settings, profile, server, session } = useApp();
  const signedIn = session?.mode === 'remote';
  const provider = useMemo(() => getAssistantProvider({ llm: server.assistant.llm, signedIn }), [server.assistant.llm, signedIn]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [mode, setMode] = useState<AssistantMode | undefined>();
  const [notice, setNotice] = useState<string | null>(null);
  const [memories, setMemories] = useState<MemorySummary[]>([]);
  const [summaryState, setSummaryState] = useState<'idle' | 'working' | 'saved' | 'error'>('idle');
  const [params, setParams] = useSearchParams();
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const memory = settings.consents.memory;
  const memorySummary = memory ? memories.map((m) => m.text).join('\n').slice(-2000) : undefined;
  const ctx = { aiSensitiveConsent: settings.consents.aiSensitive, memoryConsent: memory, name: profile?.name, mode, memorySummary };

  useEffect(() => {
    (async () => {
      const saved = memory ? await data().get<ChatMessage[]>('chat', 'history') : undefined;
      setMemories(memory ? await loadMemories() : []);
      if (saved?.length) {
        setMessages(saved);
      } else {
        const hello = await provider.reply([], ctx);
        setMessages([{ id: newId(), role: 'assistant', text: hello.text, at: new Date().toISOString() }]);
      }
    })();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memory]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: settings.reducedMotion ? 'auto' : 'smooth' });
  }, [messages, streaming, settings.reducedMotion]);

  const send = async (text: string, topic?: AssistantTopic) => {
    if (!text.trim() || busy) return;
    const userMsg: ChatMessage = { id: newId(), role: 'user', text: text.trim(), at: new Date().toISOString(), topic };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setBusy(true);
    setNotice(null);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const reply = await provider.reply(history, ctx, { onDelta: (t) => setStreaming(t), signal: ctrl.signal });
      if (reply.crisis?.detected) setCrisis(true);
      if (reply.notice) setNotice(reply.notice);
      const all = [...history, { id: newId(), role: 'assistant' as const, text: reply.text, at: new Date().toISOString(), suggestions: reply.suggestions }];
      setMessages(all);
      if (memory) await data().put('chat', 'history', all.slice(-200));
    } catch {
      /* aborted */
    } finally {
      setStreaming(null);
      setBusy(false);
    }
  };

  useEffect(() => {
    const tema = params.get('tema') as AssistantTopic | null;
    if (tema && TOPIC_LABELS[tema] && messages.length === 1) {
      setParams({}, { replace: true });
      void send(TOPIC_LABELS[tema], tema);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const clear = async () => {
    abortRef.current?.abort();
    await data().remove('chat', 'history');
    const hello = await provider.reply([], ctx);
    setMessages([{ id: newId(), role: 'assistant', text: hello.text, at: new Date().toISOString() }]);
    setSummaryState('idle');
  };

  const summarize = async () => {
    setSummaryState('working');
    const res = await api<{ summary: string }>('/assistant/summary', {
      json: { messages: messages.slice(-60).map((m) => ({ role: m.role, text: m.text.slice(0, 4000) })), consent: { memory: true } },
    });
    if (!res.ok || !res.data?.summary) return setSummaryState('error');
    const list = [...memories, { id: newId(), text: res.data.summary, at: new Date().toISOString() }];
    await saveMemories(list);
    setMemories(list);
    setSummaryState('saved');
  };

  const userTurns = messages.filter((m) => m.role === 'user').length;

  return (
    <div>
      <Seo title="Asistente" noindex />
      <PageHeader
        eyebrow="Tu espacio para hablar"
        title="Asistente de acompañamiento"
        subtitle={
          <>
            <span className="badge">
              <Icon name="sparkle" size={14} /> Inteligencia artificial
            </span>{' '}
            No es Laura Rojas, ni una persona, ni un terapeuta. No sustituye la ayuda profesional.
          </>
        }
      />
      <div className="stack" style={{ ['--gap' as string]: '0.75rem', marginBottom: '1rem' }}>
        {!settings.consents.aiSensitive && (
          <Notice icon="lock">
            El análisis de texto sensible está desactivado: el asistente responderá a los temas que elijas con los botones. Puedes cambiarlo
            en <Link to="/app/perfil#permisos">Perfil</Link>.
          </Notice>
        )}
        {server.assistant.llm && !signedIn && settings.consents.aiSensitive && (
          <Notice icon="user">
            Estás en modo invitado: te acompaña el asistente guiado. <Link to="/entrar">Crea una cuenta o entra</Link> para conversar con la IA.
          </Notice>
        )}
        <p className="small muted" style={{ margin: 0 }}>
          {memory
            ? 'Memoria activada: la conversación y los resúmenes que elijas guardar quedan cifrados en este dispositivo.'
            : 'Memoria desactivada: esta conversación se olvidará al salir.'}{' '}
          {provider.id === 'local' ? 'Modo guiado.' : 'Conversación con IA: tus mensajes se envían cifrados en tránsito y no se guardan en el servidor.'}
        </p>
      </div>

      <fieldset className="row" style={{ gap: '0.4rem', border: 0, padding: 0, margin: '0 0 1rem' }}>
        <legend className="small muted" style={{ marginBottom: '0.4rem' }}>
          ¿Cómo quieres que te acompañe ahora?
        </legend>
        {ASSISTANT_MODES.map((m) => (
          <button key={m} type="button" className={`chip${mode === m ? ' active' : ''}`} aria-pressed={mode === m} onClick={() => setMode(mode === m ? undefined : m)}>
            {MODE_LABELS[m]}
          </button>
        ))}
      </fieldset>

      <div className="chat" aria-live="polite" aria-busy={busy}>
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.role}`}>
            {m.text}
            {m.suggestions && m.suggestions.length > 0 && (
              <div className="row" style={{ marginTop: '0.6rem', gap: '0.4rem' }}>
                {m.suggestions.map((s) => (
                  <Link key={s.to} to={s.to} className="btn btn-outline btn-sm">
                    {s.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className={`bubble assistant${streaming ? '' : ' muted'}`} aria-label={streaming ? undefined : 'El asistente está escribiendo'}>
            {streaming || '…'}
          </div>
        )}
        <div ref={endRef} />
      </div>
      {notice && (
        <p className="small muted" role="status" style={{ marginTop: '0.5rem' }}>
          <Icon name="info" size={14} /> {notice}
        </p>
      )}

      <div className="row" style={{ gap: '0.4rem', margin: '1rem 0 0' }} aria-label="Temas sugeridos">
        {(Object.keys(TOPIC_LABELS) as AssistantTopic[]).map((t) => (
          <button key={t} type="button" className="chip" onClick={() => send(TOPIC_LABELS[t], t)} disabled={busy}>
            {TOPIC_LABELS[t]}
          </button>
        ))}
      </div>

      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <label htmlFor="chat-text" className="sr-only">
          Escribe tu mensaje
        </label>
        <textarea
          id="chat-text"
          value={input}
          maxLength={4000}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe lo que necesites…"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
        />
        <button type="submit" className="btn btn-primary" disabled={!input.trim() || busy} aria-label="Enviar">
          <Icon name="next" />
        </button>
      </form>
      <div className="row between">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCrisis(true)}>
          <Icon name="alert" size={16} /> Necesito ayuda urgente
        </button>
        <div className="row" style={{ gap: '0.25rem' }}>
          {memory && provider.id === 'remote' && userTurns >= 2 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={summarize} disabled={busy || summaryState === 'working'}>
              <Icon name="sparkle" size={16} />{' '}
              {summaryState === 'working' ? 'Resumiendo…' : summaryState === 'saved' ? 'Resumen guardado' : summaryState === 'error' ? 'No se pudo resumir' : 'Guardar un resumen'}
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
            <Icon name="trash" size={16} /> Borrar conversación
          </button>
        </div>
      </div>
      {memory && memories.length > 0 && (
        <p className="small muted">
          El asistente recuerda {memories.length === 1 ? '1 resumen' : `${memories.length} resúmenes`} que elegiste guardar. Puedes verlos y borrarlos en{' '}
          <Link to="/app/perfil#memoria">Perfil</Link>.
        </p>
      )}
      {crisis && <CrisisScreen onClose={() => setCrisis(false)} />}
    </div>
  );
}
