import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { CrisisScreen } from '../../components/Safety';
import { Notice, PageHeader } from '../../components/ui';
import { TOPIC_LABELS } from '../../lib/assistant/localProvider';
import { getAssistantProvider } from '../../lib/assistant/remoteProvider';
import type { AssistantTopic, ChatMessage } from '../../lib/assistant/types';
import { data, newId } from '../../lib/data';
import { useApp } from '../../state/AppContext';

export default function Asistente() {
  const { settings, profile } = useApp();
  const provider = useMemo(() => getAssistantProvider(), []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [params, setParams] = useSearchParams();
  const endRef = useRef<HTMLDivElement>(null);
  const memory = settings.consents.memory;
  const ctx = { aiSensitiveConsent: settings.consents.aiSensitive, memoryConsent: memory, name: profile?.name };

  useEffect(() => {
    (async () => {
      const saved = memory ? await data().get<ChatMessage[]>('chat', 'history') : undefined;
      if (saved?.length) {
        setMessages(saved);
      } else {
        const hello = await provider.reply([], ctx);
        setMessages([{ id: newId(), role: 'assistant', text: hello.text, at: new Date().toISOString() }]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memory]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: settings.reducedMotion ? 'auto' : 'smooth' });
  }, [messages, settings.reducedMotion]);

  const send = async (text: string, topic?: AssistantTopic) => {
    if (!text.trim() || busy) return;
    const userMsg: ChatMessage = { id: newId(), role: 'user', text: text.trim(), at: new Date().toISOString(), topic };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setBusy(true);
    try {
      const reply = await provider.reply(history, ctx);
      if (reply.crisis?.detected) setCrisis(true);
      const all = [...history, { id: newId(), role: 'assistant' as const, text: reply.text, at: new Date().toISOString(), suggestions: reply.suggestions }];
      setMessages(all);
      if (memory) await data().put('chat', 'history', all.slice(-200));
    } finally {
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
    await data().remove('chat', 'history');
    const hello = await provider.reply([], ctx);
    setMessages([{ id: newId(), role: 'assistant', text: hello.text, at: new Date().toISOString() }]);
  };

  return (
    <div>
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
        <p className="small muted" style={{ margin: 0 }}>
          {memory
            ? 'Memoria activada: la conversación se guarda cifrada en este dispositivo.'
            : 'Memoria desactivada: esta conversación se olvidará al salir.'}{' '}
          {provider.id === 'local' ? 'Modo guiado sin conexión.' : ''}
        </p>
      </div>

      <div className="chat" aria-live="polite">
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
          <div className="bubble assistant muted" aria-label="El asistente está escribiendo">
            …
          </div>
        )}
        <div ref={endRef} />
      </div>

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
        <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
          <Icon name="trash" size={16} /> Borrar conversación
        </button>
      </div>
      {crisis && <CrisisScreen onClose={() => setCrisis(false)} />}
    </div>
  );
}
