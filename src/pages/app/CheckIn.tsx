import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { IntensityRing } from '../../components/IntensityRing';
import { useSpeech } from '../../lib/useSpeech';
import { newId } from '../../lib/data';
import {
  CHECKIN_EMOTIONS,
  EMPTY_CHECKIN,
  MOMENT_OPTIONS,
  canSaveCheckIn,
  compassionateClose,
  settleMoment,
  type CheckInDraft,
  type CheckInEmotion,
} from '../../lib/checkin';
import type { CheckInEvent, UrgeEvent } from '../../lib/events';
import { EMPTY_COUNTER, type NoContactCounter } from '../../lib/noContact';
import { useModuleProgress } from '../../lib/progress';
import { useCollection, useDoc } from '../../lib/useCollection';

const STEPS = ['momento', 'intensidad', 'emocion', 'nota', 'cierre'] as const;

export default function CheckIn() {
  const events = useCollection<UrgeEvent>('events');
  const counter = useDoc<NoContactCounter>('limits', 'counter', EMPTY_COUNTER);
  const { completed } = useModuleProgress();
  const [params] = useSearchParams();
  const preset = params.get('tipo');
  const presetKind = preset === 'sostuve' || preset === 'dificil' || preset === 'necesario' ? preset : null;
  const [step, setStep] = useState(presetKind ? 1 : 0);
  const [draft, setDraft] = useState<CheckInDraft>({ ...EMPTY_CHECKIN, kind: presetKind });
  const [saved, setSaved] = useState<ReturnType<typeof compassionateClose> | null>(null);
  const speech = useSpeech((text) => setDraft((d) => ({ ...d, note: `${d.note} ${text}`.trim(), dictated: true })));

  const patch = (p: Partial<CheckInDraft>) => setDraft((d) => ({ ...d, ...p }));
  const close = compassionateClose(draft);

  const save = async () => {
    if (!canSaveCheckIn(draft) || !draft.kind || !draft.emotion) return;
    const settled = settleMoment({
      progress: completed,
      counter: counter.value,
      kind: draft.kind,
      confirmReset: draft.confirmReset,
      note: draft.note,
    });
    const event: CheckInEvent = {
      kind: 'checkin',
      id: newId(),
      at: new Date().toISOString(),
      moment: draft.kind,
      intensity: draft.intensity,
      emotion: draft.emotion,
      note: draft.note.trim() || undefined,
      dictated: draft.dictated || undefined,
      counterReset: settled.resetApplied,
    };
    await events.add(event, event.id);
    if (settled.resetApplied) await counter.save(settled.counter);
    setSaved(close);
  };

  if (saved) {
    return (
      <div className="flow close-screen fade-in">
        <h1>{saved.title}</h1>
        <p className="lead">{saved.body}</p>
        <p className="small muted">Lo que ya completaste en Mi Camino sigue en su sitio.</p>
        <div className="stack">
          <Link to="/app/asistente" className="btn btn-primary">
            Si quieres, cuéntaselo al asistente
          </Link>
          <Link to="/app" className="btn btn-outline">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const id = STEPS[step];
  return (
    <div className="flow">
      <div className="flow-top">
        <button type="button" className="icon-btn" aria-label="Atrás" onClick={() => (step === 0 ? window.history.back() : setStep(step - 1))}>
          <Icon name="back" />
        </button>
        <div className="step-bar" aria-hidden>
          <span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <Link to="/app" className="icon-btn" aria-label="Cerrar">
          <Icon name="close" />
        </Link>
      </div>

      {id === 'momento' && (
        <div className="fade-in">
          <h1>¿Cómo fue este momento?</h1>
          <p className="muted">No hay una respuesta mala. El contacto por hijos, trámites o seguridad no es un retroceso.</p>
          <div className="stack">
            {MOMENT_OPTIONS.map((o) => (
              <button key={o.id} type="button" className="choice" aria-pressed={draft.kind === o.id} onClick={() => patch({ kind: o.id, confirmReset: false })}>
                <span>
                  <strong>{o.label}</strong>
                  <span className="small muted" style={{ display: 'block' }}>
                    {o.hint}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {id === 'intensidad' && (
        <div className="fade-in" style={{ textAlign: 'center' }}>
          <h1>{draft.kind === 'dificil' ? '¿Qué tan fuerte fue?' : '¿Qué tan presente está?'}</h1>
          <p className="muted">De 0, casi nada, a 10, lo más intenso que recuerdas.</p>
          <IntensityRing value={draft.intensity} onChange={(n) => patch({ intensity: n })} />
        </div>
      )}

      {id === 'emocion' && (
        <div className="fade-in">
          <h1>¿Qué emoción se parece más?</h1>
          <p className="muted">Elige una. Si no encaja ninguna, «Otra» también vale.</p>
          <div className="bubbles" role="radiogroup" aria-label="Emoción">
            {CHECKIN_EMOTIONS.map((e) => (
              <button key={e.id} type="button" role="radio" aria-checked={draft.emotion === e.id} className={draft.emotion === e.id ? 'on' : ''} onClick={() => patch({ emotion: e.id as CheckInEmotion })}>
                {e.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {id === 'nota' && (
        <div className="fade-in">
          <h1>Cuenta este momento</h1>
          <p className="muted">Está bien. Con una frase alcanza. No se envía a nadie.</p>
          <label className="sr-only" htmlFor="nota">
            Qué sentiste y qué pasó
          </label>
          <textarea id="nota" value={draft.note} maxLength={800} placeholder="¿Qué sentiste y qué pasó?" onChange={(e) => patch({ note: e.target.value })} style={{ minHeight: 140 }} />
          <div className="row between">
            <button type="button" className="btn btn-outline btn-sm" onClick={speech.toggle} disabled={!speech.supported}>
              <Icon name="mic" size={16} /> {speech.listening ? 'Detener dictado' : 'Dictar'}
            </button>
            <span className="small muted">{draft.note.length}/800</span>
          </div>
          <p className="small muted">El dictado lo procesa tu navegador y, en algunos, sus servidores. Puedes escribir a mano si lo prefieres.</p>
        </div>
      )}

      {id === 'cierre' && (
        <div className="fade-in close-screen">
          <h1>{close.title}</h1>
          <p className="lead">{close.body}</p>
          {draft.kind === 'dificil' && counter.value.enabled && (
            <label className="check">
              <input type="checkbox" checked={draft.confirmReset} onChange={(e) => patch({ confirmReset: e.target.checked })} />
              <span>
                Quiero reiniciar el contador del límite que elegí
                <span className="muted small" style={{ display: 'block', fontWeight: 400 }}>
                  Solo si tú lo confirmas. Los ejercicios que ya completaste no se borran.
                </span>
              </span>
            </label>
          )}
          {draft.kind === 'necesario' && <p className="small muted">Este contacto no mueve el contador.</p>}
        </div>
      )}

      <div className="flow-actions">
        {id === 'cierre' ? (
          <button type="button" className="btn btn-primary" onClick={() => void save()}>
            Guardar este momento
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={(id === 'momento' && !draft.kind) || (id === 'emocion' && !draft.emotion)}
            onClick={() => setStep(step + 1)}
          >
            Continuar
          </button>
        )}
      </div>
    </div>
  );
}
