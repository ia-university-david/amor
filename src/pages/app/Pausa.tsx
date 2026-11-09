import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Breathing, Connect, Motives, PauseTimer, WriteUnsent } from '../../components/PauseTools';
import { ChoiceList, IntensitySlider, Progress } from '../../components/ui';
import {
  NEED_EXPLANATIONS,
  STRATEGIES,
  TRIGGERS,
  URGE_ACTIONS,
  URGE_EXPLANATION,
  URGE_NEEDS,
  type StrategyId,
  type TriggerId,
  type UrgeActionId,
  type UrgeNeedId,
} from '../../content/pause';
import { data, newId } from '../../lib/data';
import type { PauseEvent } from '../../lib/events';
import { useModuleProgress } from '../../lib/progress';

type Step = 'accion' | 'intensidad' | 'necesidad' | 'explicacion' | 'menu' | 'herramienta' | 'revaluar' | 'registro' | 'fin';
const ORDER: Step[] = ['accion', 'intensidad', 'necesidad', 'explicacion', 'menu', 'herramienta', 'revaluar', 'registro', 'fin'];

const DIRECT_TOOLS: Record<string, StrategyId> = {
  respiracion: 'respiracion',
  motivos: 'motivos',
  conectar: 'conectar',
  temporizador: 'pausa-guiada',
  escribir: 'escribir',
};

function ToolView({ id }: { id: StrategyId }) {
  switch (id) {
    case 'pausa-guiada':
      return <PauseTimer />;
    case 'respiracion':
      return <Breathing />;
    case 'escribir':
      return <WriteUnsent />;
    case 'motivos':
      return <Motives />;
    case 'conectar':
      return <Connect />;
    case 'asistente':
      return (
        <div className="stack">
          <p>El asistente es una inteligencia artificial de acompañamiento. Puede ayudarte a ordenar lo que sientes; no es una persona ni un terapeuta.</p>
          <Link to="/app/asistente?tema=impulso" className="btn btn-primary">
            Abrir el asistente
          </Link>
        </div>
      );
  }
}

export default function Pausa() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const direct = params.get('herramienta');
  const directTool = direct ? DIRECT_TOOLS[direct] : undefined;

  const [step, setStep] = useState<Step>('accion');
  const [action, setAction] = useState<UrgeActionId>();
  const [initial, setInitial] = useState(6);
  const [need, setNeed] = useState<UrgeNeedId>();
  const [tool, setTool] = useState<StrategyId>();
  const [final, setFinal] = useState(6);
  const [trigger, setTrigger] = useState<TriggerId>();
  const [contact, setContact] = useState<'si' | 'no' | 'no-se'>();
  const [learning, setLearning] = useState('');
  const [triedTools, setTriedTools] = useState<StrategyId[]>([]);
  const { markDone } = useModuleProgress();

  if (directTool) {
    const info = STRATEGIES.find((s) => s.id === directTool)!;
    return (
      <div className="flow">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          <Icon name="back" size={18} /> Volver
        </button>
        <h1>{info.label}</h1>
        <div className="card">
          <ToolView id={directTool} />
        </div>
        <div className="flow-actions">
          <Link to="/app/pausa" className="btn btn-outline">
            Hacer la pausa completa
          </Link>
          <Link to="/app" className="btn btn-ghost">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const idx = ORDER.indexOf(step);
  const go = (s: Step) => {
    setStep(s);
    window.scrollTo(0, 0);
  };
  const back = () => {
    if (step === 'accion') return navigate(-1);
    go(ORDER[idx - 1]);
  };

  const saveEvent = async () => {
    const event: PauseEvent = {
      kind: 'pausa',
      id: newId(),
      at: new Date().toISOString(),
      action,
      need,
      initialIntensity: initial,
      finalIntensity: final,
      strategy: tool,
      trigger,
      contactHappened: contact === 'si' ? true : contact === 'no' ? false : undefined,
      learning: learning.trim() || undefined,
    };
    await data().put('events', event.id, event);
    await markDone('pausa-practica');
    go('fin');
  };

  const header = (
    <div className="flow-top">
      <button type="button" className="icon-btn" aria-label="Atrás" onClick={back}>
        <Icon name="back" />
      </button>
      <Progress value={(idx + 1) / ORDER.length} label="Progreso de la pausa" />
      <Link to="/app" className="btn btn-ghost btn-sm">
        Salir
      </Link>
    </div>
  );

  const body = (() => {
    switch (step) {
      case 'accion':
        return (
          <>
            <span className="eyebrow">Necesito una pausa</span>
            <h1>¿Qué tienes ganas de hacer?</h1>
            <p className="muted">No vamos a impedirte nada. Solo te ofrecemos un momento para elegir con más calma.</p>
            <ChoiceList
              label="¿Qué tienes ganas de hacer?"
              options={URGE_ACTIONS}
              value={action}
              onChange={(v) => {
                setAction(v as UrgeActionId);
                setTimeout(() => go('intensidad'), 150);
              }}
            />
          </>
        );
      case 'intensidad':
        return (
          <>
            <h2>¿Qué tan intenso es el impulso ahora?</h2>
            <IntensitySlider label="Intensidad del impulso, de 0 a 10" value={initial} onChange={setInitial} minLabel="Muy leve" maxLabel="Muy intenso" />
            <div className="flow-actions">
              <button type="button" className="btn btn-primary" onClick={() => go('necesidad')}>
                Continuar
              </button>
            </div>
          </>
        );
      case 'necesidad':
        return (
          <>
            <h2>¿Qué sientes que necesitas?</h2>
            <ChoiceList
              label="¿Qué sientes que necesitas?"
              options={URGE_NEEDS}
              value={need}
              onChange={(v) => {
                setNeed(v as UrgeNeedId);
                setTimeout(() => go('explicacion'), 150);
              }}
            />
          </>
        );
      case 'explicacion':
        return (
          <>
            <h2>Lo que está pasando</h2>
            <div className="card tint-niebla stack">
              <p style={{ margin: 0 }}>{URGE_EXPLANATION}</p>
              {need && NEED_EXPLANATIONS[need] && <p style={{ margin: 0 }}>{NEED_EXPLANATIONS[need]}</p>}
            </div>
            <p className="small muted" style={{ marginTop: '0.75rem' }}>
              Explicación general y educativa, no un diagnóstico. <Link to="/app/cerebro/deseo-de-contactar">Saber más</Link>
            </p>
            <div className="flow-actions">
              <button type="button" className="btn btn-primary" onClick={() => go('menu')}>
                Elegir qué hacer ahora
              </button>
            </div>
          </>
        );
      case 'menu':
        return (
          <>
            <h2>¿Qué te gustaría probar?</h2>
            <p className="muted">Elige una opción. Puedes cambiar después.</p>
            <div className="choices" style={{ ['--min' as string]: '260px' }}>
              {STRATEGIES.filter((s) => !triedTools.includes(s.id)).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="choice"
                  onClick={() => {
                    setTool(s.id);
                    setTriedTools((t) => [...t, s.id]);
                    go('herramienta');
                  }}
                >
                  <Icon name={s.icon} />
                  <span>
                    {s.label}
                    <span className="muted small" style={{ display: 'block', fontWeight: 400 }}>
                      {s.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </>
        );
      case 'herramienta':
        return (
          <>
            <h2>{STRATEGIES.find((s) => s.id === tool)?.label}</h2>
            <div className="card">{tool && <ToolView id={tool} />}</div>
            <div className="flow-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setFinal(initial);
                  go('revaluar');
                }}
              >
                Ya está, continuar
              </button>
              <button type="button" className="btn btn-outline" onClick={() => go('menu')}>
                Probar otra cosa
              </button>
            </div>
          </>
        );
      case 'revaluar':
        return (
          <>
            <h2>¿Y ahora? ¿Qué tan intenso es el impulso?</h2>
            <IntensitySlider label="Intensidad del impulso ahora, de 0 a 10" value={final} onChange={setFinal} minLabel="Muy leve" maxLabel="Muy intenso" />
            <div className="card" style={{ marginTop: '1.5rem' }} aria-live="polite">
              {final < initial ? (
                <p style={{ margin: 0 }}>
                  Pasó de {initial} a {final}. No tiene que desaparecer para que cuente: te diste un espacio para elegir.
                </p>
              ) : (
                <div className="stack">
                  <p style={{ margin: 0 }}>
                    Sigue {final > initial ? 'más' : 'igual de'} intenso, y eso también está bien. A veces hace falta más de un recurso, o hablar con
                    alguien.
                  </p>
                  <div className="row">
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => go('menu')}>
                      Probar otro recurso
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setTool('conectar');
                        go('herramienta');
                      }}
                    >
                      <Icon name="users" size={16} /> Hablar con alguien de confianza
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flow-actions">
              <button type="button" className="btn btn-primary" onClick={() => go('registro')}>
                Continuar
              </button>
            </div>
          </>
        );
      case 'registro':
        return (
          <>
            <h2>Antes de terminar</h2>
            <p className="muted">Estas preguntas son opcionales. Te ayudan a reconocer tus propios patrones con el tiempo.</p>
            <div className="field">
              <label id="trig">¿Qué crees que lo desencadenó?</label>
              <div className="row" role="group" aria-labelledby="trig" style={{ gap: '0.4rem' }}>
                {TRIGGERS.map((t) => (
                  <button key={t.id} type="button" className="chip" aria-pressed={trigger === t.id} onClick={() => setTrigger(trigger === t.id ? undefined : t.id)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label id="cont">¿Hubo contacto al final?</label>
              <div className="row" role="group" aria-labelledby="cont" style={{ gap: '0.4rem' }}>
                {(
                  [
                    ['no', 'No'],
                    ['si', 'Sí'],
                    ['no-se', 'Todavía no lo sé'],
                  ] as const
                ).map(([id, label]) => (
                  <button key={id} type="button" className="chip" aria-pressed={contact === id} onClick={() => setContact(id)}>
                    {label}
                  </button>
                ))}
              </div>
              {contact === 'si' && <p className="small muted">Gracias por decirlo. No borra nada de lo que has hecho hoy.</p>}
            </div>
            <div className="field">
              <label htmlFor="learn">
                ¿Algo que quieras recordar de este momento? <span className="hint">(opcional)</span>
              </label>
              <textarea id="learn" value={learning} onChange={(e) => setLearning(e.target.value)} style={{ minHeight: 90 }} />
            </div>
            <div className="flow-actions">
              <button type="button" className="btn btn-primary" onClick={saveEvent}>
                Guardar y terminar
              </button>
            </div>
          </>
        );
      case 'fin':
        return (
          <div style={{ textAlign: 'center' }}>
            <span className="card-icon">
              <Icon name="heart" />
            </span>
            <h2>Gracias por darte esta pausa</h2>
            <p className="muted">Puedes sentir el impulso sin actuar inmediatamente. Hoy lo practicaste.</p>
            <div className="flow-actions" style={{ justifyContent: 'center' }}>
              <Link to="/app" className="btn btn-primary">
                Volver al inicio
              </Link>
              {contact === 'si' && (
                <Link to="/app/dificil" className="btn btn-outline">
                  Contar cómo fue
                </Link>
              )}
            </div>
          </div>
        );
    }
  })();

  return (
    <div className="flow">
      {step !== 'fin' && header}
      <div key={step} className="fade-in">
        {body}
      </div>
    </div>
  );
}
