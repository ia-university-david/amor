import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_MESSAGES } from '../content/messages';
import type { LimitsState } from '../content/limits';
import { useCollection, useDoc } from '../lib/useCollection';
import { useApp } from '../state/AppContext';
import { Icon } from './Icon';
import { EmergencyNumbers, TrustedQuickList } from './Safety';

function useReducedMotion(): boolean {
  const { settings } = useApp();
  const [system, setSystem] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const on = () => setSystem(mq.matches);
    mq?.addEventListener?.('change', on);
    return () => mq?.removeEventListener?.('change', on);
  }, []);
  return settings.reducedMotion || system;
}

const TIMER_LINES = [
  'Puedes sentir el impulso sin actuar inmediatamente.',
  'No tienes que decidir nada en este momento.',
  'Las olas suben y también bajan.',
  'Nota tus pies en el suelo.',
  'Extrañar a alguien no significa que debas regresar.',
];

export function PauseTimer() {
  const [minutes, setMinutes] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setRemaining((r) => (r <= 1 ? 0 : r - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (running && remaining === 0) setRunning(false);
  }, [remaining, running]);

  if (minutes === null) {
    return (
      <div className="stack">
        <p>Elige cuánto tiempo quieres darte. Durante la pausa no tienes que hacer nada especial.</p>
        <div className="row">
          {[2, 5, 10].map((m) => (
            <button
              key={m}
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setMinutes(m);
                setRemaining(m * 60);
                setRunning(true);
              }}
            >
              {m} minutos
            </button>
          ))}
        </div>
      </div>
    );
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const line = TIMER_LINES[Math.floor((minutes * 60 - remaining) / 20) % TIMER_LINES.length];

  return (
    <div className="stack" style={{ textAlign: 'center' }}>
      <div className="timer-display" role="timer" aria-label={`Quedan ${mm} minutos y ${ss} segundos`}>
        {mm}:{ss}
      </div>
      <p aria-live="polite" style={{ minHeight: '3em' }}>
        {remaining === 0 ? 'Terminaste tu pausa. Gracias por darte este tiempo.' : line}
      </p>
      <div className="row" style={{ justifyContent: 'center' }}>
        {remaining > 0 && (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setRunning((r) => !r)}>
            <Icon name={running ? 'stop' : 'play'} size={16} /> {running ? 'Pausar' : 'Reanudar'}
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMinutes(null)}>
          Elegir otro tiempo
        </button>
      </div>
    </div>
  );
}

const PHASES = [
  { label: 'Inhala con suavidad', seconds: 4, cls: 'in' },
  { label: 'Suelta el aire despacio', seconds: 6, cls: 'out' },
] as const;

export function Breathing() {
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<'respiracion' | 'anclaje'>('respiracion');
  const [phase, setPhase] = useState(0);
  const [active, setActive] = useState(false);
  const [cycles, setCycles] = useState(0);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => {
      setPhase((p) => {
        if (p === PHASES.length - 1) setCycles((c) => c + 1);
        return (p + 1) % PHASES.length;
      });
    }, PHASES[phase].seconds * 1000);
    return () => clearTimeout(t);
  }, [active, phase]);

  return (
    <div className="stack">
      <div className="tabs" role="tablist" aria-label="Tipo de ejercicio">
        <button type="button" role="tab" aria-selected={mode === 'respiracion'} className="chip" aria-pressed={mode === 'respiracion'} onClick={() => setMode('respiracion')}>
          Respiración cómoda
        </button>
        <button type="button" role="tab" aria-selected={mode === 'anclaje'} className="chip" aria-pressed={mode === 'anclaje'} onClick={() => setMode('anclaje')}>
          5-4-3-2-1 (sin respiración)
        </button>
      </div>
      {mode === 'respiracion' ? (
        <>
          <p className="small muted">
            Respira a un ritmo que te resulte cómodo; sigue el círculo solo si te ayuda. Si en algún momento te incomoda, para y prueba el
            ejercicio con los sentidos.
          </p>
          <div className="breath">
            <div className={`breath-circle ${active && !reduced ? PHASES[phase].cls : ''}`} aria-live="polite">
              {active ? PHASES[phase].label : 'Cuando quieras'}
            </div>
          </div>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setActive((a) => !a);
                setPhase(0);
              }}
            >
              <Icon name={active ? 'stop' : 'play'} size={18} /> {active ? 'Detener' : 'Comenzar'}
            </button>
          </div>
          {cycles > 0 && <p className="small muted" style={{ textAlign: 'center' }}>{cycles} {cycles === 1 ? 'ciclo' : 'ciclos'}</p>}
        </>
      ) : (
        <Grounding />
      )}
    </div>
  );
}

const GROUNDING = [
  { n: 5, text: 'cosas que puedes ver a tu alrededor' },
  { n: 4, text: 'cosas que puedes tocar (la ropa, la silla, el suelo)' },
  { n: 3, text: 'sonidos que puedes oír' },
  { n: 2, text: 'olores que puedes notar, o dos que te gusten' },
  { n: 1, text: 'cosa que puedas saborear, o algo amable que puedas decirte' },
];

function Grounding() {
  const [i, setI] = useState(0);
  const done = i >= GROUNDING.length;
  return (
    <div className="card tint-niebla" style={{ textAlign: 'center' }}>
      {done ? (
        <>
          <p style={{ fontSize: '1.15rem' }}>Volviste al presente. Este momento es lo único que tienes que atravesar ahora.</p>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setI(0)}>
            Repetir
          </button>
        </>
      ) : (
        <>
          <div className="stat" aria-hidden="true">
            {GROUNDING[i].n}
          </div>
          <p style={{ fontSize: '1.15rem' }} aria-live="polite">
            Nombra {GROUNDING[i].n} {GROUNDING[i].text}.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => setI(i + 1)}>
            Listo, siguiente
          </button>
        </>
      )}
    </div>
  );
}

export interface UnsentMessage {
  text: string;
  createdAt: string;
}

export function WriteUnsent({ onSaved }: { onSaved?: () => void }) {
  const { add } = useCollection<UnsentMessage>('unsent');
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.focus(), []);

  if (saved) {
    return (
      <div className="notice" role="status">
        <Icon name="lock" size={20} />
        <div>
          Guardado y cifrado en este dispositivo. No se envió a nadie. Puedes releerlo ahora en{' '}
          <Link to="/app/espacio?seccion=sin-enviar">Mi Espacio → Sin enviar</Link>, también si estás explorando sin cuenta.
        </div>
      </div>
    );
  }
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        await add({ text: text.trim(), createdAt: new Date().toISOString() });
        setSaved(true);
        onSaved?.();
      }}
    >
      <label htmlFor="unsent">Escribe lo que te gustaría decirle. Esto no se enviará.</label>
      <textarea id="unsent" ref={ref} value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 180 }} />
      <p className="small muted">
        <Icon name="lock" size={14} /> Se guarda cifrado solo en este dispositivo.
      </p>
      <button type="submit" className="btn btn-primary" disabled={!text.trim()}>
        Guardar sin enviar
      </button>
    </form>
  );
}

export function Motives() {
  const { profile, updateProfile, messages } = useApp();
  const { value: limits } = useDoc<LimitsState>('limits', 'state', { modality: null, rules: [] });
  const [draft, setDraft] = useState('');
  const active = limits.rules.filter((r) => r.active);
  const motives = profile?.motives ?? [];
  const pool = messages.length ? messages : DEFAULT_MESSAGES;
  const [pick] = useState(() => Math.floor(Math.random() * pool.length));

  return (
    <div className="stack">
      {profile?.reminder && (
        <div className="card tint-lavanda">
          <p className="small muted" style={{ margin: 0 }}>
            Tu recordatorio
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', margin: 0 }}>“{profile.reminder}”</p>
        </div>
      )}
      <div>
        <h3>Los límites que elegiste</h3>
        {active.length ? (
          <ul className="list">
            {active.map((r) => (
              <li key={r.id} className="card" style={{ padding: '0.75rem 1rem' }}>
                <strong>{r.text}</strong>
                {r.why && <span className="muted small" style={{ display: 'block' }}>Porque: {r.why}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="small muted">
            Aún no has definido límites. <Link to="/app/limites">Definir mis límites</Link>
          </p>
        )}
      </div>
      <div>
        <h3>Mis motivos</h3>
        {motives.length > 0 && (
          <ul>
            {motives.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        )}
        <form
          className="row"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            await updateProfile({ motives: [...motives, draft.trim()] });
            setDraft('');
          }}
        >
          <label htmlFor="motive" className="sr-only">
            Añadir un motivo
          </label>
          <input id="motive" type="text" style={{ flex: 1, minWidth: 200 }} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Por qué elegí cuidarme…" />
          <button type="submit" className="btn btn-outline">
            Añadir
          </button>
        </form>
      </div>
      <div className="card tint-niebla">
        <p style={{ margin: 0 }}>{pool[pick % pool.length].text}</p>
      </div>
    </div>
  );
}

export function Connect() {
  return (
    <div className="stack">
      <p>Hablar con alguien de confianza puede ayudarte a no atravesar este momento en soledad. No necesitas explicar todo.</p>
      <TrustedQuickList />
      <details>
        <summary className="small">Si estás en peligro</summary>
        <EmergencyNumbers />
      </details>
    </div>
  );
}
