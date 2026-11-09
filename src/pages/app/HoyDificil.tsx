import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { ChoiceList, IntensitySlider, Progress } from '../../components/ui';
import { EMOTION_OPTIONS, type EmotionId } from '../../content/onboarding';
import {
  AFTER_FEELINGS,
  DIFFICULT_TYPES,
  NOW_NEEDS,
  TRIGGERS,
  type AfterFeelingId,
  type DifficultTypeId,
  type NowNeedId,
  type TriggerId,
} from '../../content/pause';
import { newId } from '../../lib/data';
import { difficultDayResponse } from '../../lib/difficultDay';
import type { DifficultEvent, UrgeEvent } from '../../lib/events';
import { EMPTY_COUNTER, eventAffectsCounter, resetCounter, type NoContactCounter } from '../../lib/noContact';
import { detectPatterns } from '../../lib/patterns';
import { useCollection, useDoc } from '../../lib/useCollection';
import { useSpeech } from '../../lib/useSpeech';

type Step = 'intro' | 'tipo' | 'buscabas' | 'intensidad' | 'emocion' | 'desencadenante' | 'despues' | 'ahora' | 'respuesta' | 'listo';
const FLOW: Step[] = ['tipo', 'buscabas', 'intensidad', 'emocion', 'desencadenante', 'despues', 'ahora', 'respuesta'];

const NEXT_ACTIONS: Record<NowNeedId, { label: string; to: string; icon: 'wind' | 'users' | 'brain' | 'shield' | 'moon' }[]> = {
  calma: [{ label: 'Un ejercicio breve de calma', to: '/app/pausa?herramienta=respiracion', icon: 'wind' }],
  hablar: [
    { label: 'Hablar con alguien de confianza', to: '/app/pausa?herramienta=conectar', icon: 'users' },
    { label: 'Hablar con el asistente', to: '/app/asistente', icon: 'users' },
  ],
  entender: [{ label: 'Por qué deseamos contactar', to: '/app/cerebro/deseo-de-contactar', icon: 'brain' }],
  plan: [{ label: 'Revisar mis motivos y límites', to: '/app/pausa?herramienta=motivos', icon: 'shield' }],
  descansar: [{ label: 'Una pausa guiada antes de dormir', to: '/app/pausa?herramienta=temporizador', icon: 'moon' }],
};

export default function HoyDificil() {
  const [step, setStep] = useState<Step>('intro');
  const [type, setType] = useState<DifficultTypeId>();
  const [seeking, setSeeking] = useState('');
  const [intensity, setIntensity] = useState(5);
  const [emotion, setEmotion] = useState<EmotionId>();
  const [trigger, setTrigger] = useState<TriggerId>();
  const [after, setAfter] = useState<AfterFeelingId>();
  const [needNow, setNeedNow] = useState<NowNeedId>();
  const [reflection, setReflection] = useState('');
  const [nextStrategy, setNextStrategy] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const { value: counter, save: saveCounter } = useDoc<NoContactCounter>('limits', 'counter', EMPTY_COUNTER);
  const events = useCollection<UrgeEvent>('events');

  const appendSpeech = useCallback((t: string) => setSeeking((s) => (s ? `${s} ${t}` : t)), []);
  const speech = useSpeech(appendSpeech);

  const idx = FLOW.indexOf(step);
  const go = (s: Step) => {
    setStep(s);
    window.scrollTo(0, 0);
  };
  const next = () => go(FLOW[idx + 1]);
  const back = () => go(idx <= 0 ? 'intro' : FLOW[idx - 1]);

  const counterApplies = !!type && counter.enabled && eventAffectsCounter(type);

  const save = async () => {
    const event: DifficultEvent = {
      kind: 'dificil',
      id: newId(),
      at: new Date().toISOString(),
      type: type!,
      seeking: seeking.trim() || undefined,
      intensity,
      emotion,
      trigger,
      after,
      needNow,
      reflection: reflection.trim() || undefined,
      nextStrategy: nextStrategy.trim() || undefined,
      counterReset: counterApplies && confirmReset,
    };
    await events.add(event, event.id);
    if (counterApplies && confirmReset) await saveCounter(resetCounter(counter, { confirmed: true, note: 'Registrado en «Hoy fue difícil»' }));
    go('listo');
  };

  if (step === 'intro') {
    return (
      <div className="flow fade-in">
        <span className="card-icon">
          <Icon name="cloud" />
        </span>
        <h1>Hoy fue difícil.</h1>
        <p style={{ fontSize: '1.15rem' }}>Podemos entender qué pasó y decidir qué necesitas ahora.</p>
        <p className="muted">Nada de lo que cuentes aquí borra lo que has avanzado. Tus capítulos y aprendizajes siguen contigo.</p>
        <button type="button" className="btn btn-primary" onClick={() => go('tipo')}>
          Quiero contar lo que ocurrió
        </button>
      </div>
    );
  }

  if (step === 'listo') {
    const insights = detectPatterns(events.items.map((i) => i.value));
    return (
      <div className="flow fade-in stack">
        <h1>Gracias por contarlo</h1>
        <p>Un momento difícil no borra lo que has aprendido. ¿Qué te vendría bien ahora?</p>
        {insights.map((i) => (
          <div key={i.id} className="notice">
            <Icon name="sparkle" size={20} />
            <div>
              {i.message} {i.suggestion && <Link to={i.suggestion.to}>{i.suggestion.label}</Link>}
            </div>
          </div>
        ))}
        <div className="choices" style={{ ['--min' as string]: '240px' }}>
          <Link className="choice" to="/app/asistente">
            <Icon name="chat" /> Conversar un momento
          </Link>
          <Link className="choice" to="/app/pausa?herramienta=respiracion">
            <Icon name="wind" /> Un ejercicio corto
          </Link>
          <Link className="choice" to="/app/pausa?herramienta=motivos">
            <Icon name="heart" /> Leer mi recordatorio
          </Link>
          <Link className="choice" to="/app/espacio?seccion=recordatorios">
            <Icon name="calendar" /> Planear las próximas horas
          </Link>
          <Link className="choice" to="/app/pausa?herramienta=conectar">
            <Icon name="users" /> Hablar con una persona
          </Link>
        </div>
        <Link to="/app" className="btn btn-ghost">
          Volver al inicio
        </Link>
      </div>
    );
  }

  const body = (() => {
    switch (step) {
      case 'tipo':
        return (
          <>
            <h2>¿Qué sucedió?</h2>
            <ChoiceList label="¿Qué sucedió?" options={DIFFICULT_TYPES} value={type} onChange={(v) => { setType(v as DifficultTypeId); setTimeout(() => go('buscabas'), 150); }} />
          </>
        );
      case 'buscabas':
        return (
          <>
            <h2>¿Qué intentabas conseguir en ese momento?</h2>
            <p className="muted">Por ejemplo: sentir algo de tranquilidad, saber si me extraña, resolver algo práctico…</p>
            <div className="field">
              <label htmlFor="seek" className="sr-only">
                Qué intentabas conseguir
              </label>
              <textarea id="seek" value={seeking} onChange={(e) => setSeeking(e.target.value)} />
            </div>
            {speech.supported && (
              <>
                <button type="button" className="btn btn-outline btn-sm" onClick={speech.toggle} aria-pressed={speech.listening}>
                  <Icon name="mic" size={16} /> {speech.listening ? 'Detener dictado' : 'Dictar con la voz'}
                </button>
                <p className="small muted">El dictado usa el reconocimiento de voz de tu navegador, que puede procesar el audio en sus servidores.</p>
              </>
            )}
          </>
        );
      case 'intensidad':
        return (
          <>
            <h2>¿Qué tan intenso fue?</h2>
            <IntensitySlider label="Intensidad, de 0 a 10" value={intensity} onChange={setIntensity} minLabel="Muy leve" maxLabel="Muy intenso" />
          </>
        );
      case 'emocion':
        return (
          <>
            <h2>¿Qué emoción estaba más presente?</h2>
            <ChoiceList label="Emoción" options={EMOTION_OPTIONS} value={emotion} onChange={(v) => setEmotion(v as EmotionId)} min={160} />
          </>
        );
      case 'desencadenante':
        return (
          <>
            <h2>¿Qué crees que lo desencadenó?</h2>
            <ChoiceList label="Desencadenante" options={TRIGGERS} value={trigger} onChange={(v) => setTrigger(v as TriggerId)} />
          </>
        );
      case 'despues':
        return (
          <>
            <h2>¿Cómo te sentiste después?</h2>
            <ChoiceList label="Cómo te sentiste después" options={AFTER_FEELINGS} value={after} onChange={(v) => setAfter(v as AfterFeelingId)} />
          </>
        );
      case 'ahora':
        return (
          <>
            <h2>¿Qué necesitas ahora?</h2>
            <ChoiceList label="Qué necesitas ahora" options={NOW_NEEDS} value={needNow} onChange={(v) => setNeedNow(v as NowNeedId)} />
          </>
        );
      case 'respuesta':
        return (
          <div className="stack">
            <div className="card tint-lavanda">
              <p style={{ margin: 0, fontSize: '1.08rem' }}>{difficultDayResponse({ type: type!, seeking, after, needNow })}</p>
            </div>
            {needNow && (
              <div className="row">
                {NEXT_ACTIONS[needNow].map((a) => (
                  <Link key={a.to} to={a.to} className="btn btn-outline btn-sm">
                    <Icon name={a.icon} size={16} /> {a.label}
                  </Link>
                ))}
              </div>
            )}
            <div className="field">
              <label htmlFor="refl">
                ¿Qué te llevas de esto? <span className="hint">(opcional)</span>
              </label>
              <textarea id="refl" value={reflection} onChange={(e) => setReflection(e.target.value)} style={{ minHeight: 90 }} />
            </div>
            <div className="field">
              <label htmlFor="strat">
                La próxima vez, ¿qué te gustaría probar? <span className="hint">(opcional)</span>
              </label>
              <textarea id="strat" value={nextStrategy} onChange={(e) => setNextStrategy(e.target.value)} style={{ minHeight: 90 }} placeholder="Por ejemplo: esperar 20 minutos, escribir sin enviar, llamar a mi hermana…" />
            </div>
            {counterApplies && (
              <div className="card">
                <h3>Tu contador</h3>
                <p className="small muted">
                  Tienes activo el contador de días. No se reinicia automáticamente: decides tú. Reiniciarlo no borra tus capítulos,
                  aprendizajes ni avances.
                </p>
                <label className="check">
                  <input type="checkbox" checked={confirmReset} onChange={(e) => setConfirmReset(e.target.checked)} />
                  <span>Sí, quiero reiniciar el contador desde hoy.</span>
                </label>
              </div>
            )}
            {type === 'necesario' && <p className="small muted">Como fue un contacto necesario, tu contador no cambia.</p>}
          </div>
        );
    }
  })();

  return (
    <div className="flow">
      <div className="flow-top">
        <button type="button" className="icon-btn" aria-label="Atrás" onClick={back}>
          <Icon name="back" />
        </button>
        <Progress value={(idx + 1) / FLOW.length} label="Progreso" />
        {step !== 'tipo' && step !== 'respuesta' && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={next}>
            Omitir
          </button>
        )}
      </div>
      <div key={step} className="fade-in">
        {body}
      </div>
      {step !== 'tipo' && (
        <div className="flow-actions">
          <button type="button" className="btn btn-primary" onClick={step === 'respuesta' ? save : next}>
            {step === 'respuesta' ? 'Guardar' : 'Continuar'}
          </button>
        </div>
      )}
    </div>
  );
}
