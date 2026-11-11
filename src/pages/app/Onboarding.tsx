import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon, Logo } from '../../components/Icon';
import { GentleSafetyCard } from '../../components/Safety';
import { ChoiceList, MultiChoice, Notice, Progress } from '../../components/ui';
import {
  BREAKUP_DATE_OPTIONS,
  CIRCUMSTANCE_OPTIONS,
  CONTACT_OPTIONS,
  DIFFICULTY_OPTIONS,
  DURATION_OPTIONS,
  EMOTION_OPTIONS,
  IDENTITY_OPTIONS,
  NEED_OPTIONS,
  SITUATION_OPTIONS,
  type OnboardingAnswers,
} from '../../content/onboarding';
import { TOOLS } from '../../content/tools';
import { AuthForm, type AuthExtra } from '../../components/AuthForm';
import type { Session } from '../../lib/auth';
import { data } from '../../lib/data';
import { generatePlan, type InitialPlan } from '../../lib/plan';
import { useApp } from '../../state/AppContext';


type StepId =
  | 'bienvenida'
  | 'registro'
  | 'identidad'
  | 'situacion'
  | 'duracion'
  | 'ruptura'
  | 'circunstancias'
  | 'contacto'
  | 'emociones'
  | 'dificultad'
  | 'necesidad'
  | 'privacidad'
  | 'plan';

const STEP_TITLES: Record<StepId, string> = {
  bienvenida: 'Este espacio es para ti',
  registro: 'Crea tu cuenta',
  identidad: 'Cómo te identificas',
  situacion: 'Tu situación',
  duracion: 'Cuánto tiempo estuvieron juntos',
  ruptura: 'Cuándo terminó',
  circunstancias: 'Qué ocurrió',
  contacto: 'El contacto ahora',
  emociones: 'Qué estás sintiendo',
  dificultad: 'Lo que más te cuesta',
  necesidad: 'Qué quieres conseguir',
  privacidad: 'Tu privacidad',
  plan: 'Tu plan inicial',
};

const ALL_STEPS: StepId[] = [
  'bienvenida', 'registro', 'identidad', 'situacion', 'duracion', 'ruptura', 'circunstancias',
  'contacto', 'emociones', 'dificultad', 'necesidad', 'privacidad', 'plan',
];

function stepsFor(answers: OnboardingAnswers): StepId[] {
  const stillTogether = answers.situation === 'sigo-relacion' || answers.situation === 'considerando';
  return ALL_STEPS.filter((s) => !(s === 'ruptura' && stillTogether));
}

export default function Onboarding() {
  const { session, setSession, updateSettings, updateProfile, settings } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [step, setStep] = useState<StepId>('bienvenida');
  const [loaded, setLoaded] = useState(false);
  const [consents, setConsents] = useState(settings.consents);
  const [plan, setPlan] = useState<InitialPlan | null>(null);

  useEffect(() => {
    (async () => {
      const [saved, savedStep] = await Promise.all([
        data().get<OnboardingAnswers>('onboarding', 'answers'),
        data().get<StepId>('onboarding', 'step'),
      ]);
      if (saved) setAnswers(saved);
      const requested = params.get('paso') as StepId | null;
      if (requested && ALL_STEPS.includes(requested)) setStep(requested);
      else if (savedStep && savedStep !== 'plan') setStep(savedStep);
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const steps = stepsFor(answers);
  const index = steps.indexOf(step);
  const questionSteps = steps.filter((s) => s !== 'bienvenida' && s !== 'plan');
  const progress = Math.max(0, (questionSteps as StepId[]).indexOf(step) + 1) / questionSteps.length;

  const save = async (next: OnboardingAnswers) => {
    setAnswers(next);
    await data().put('onboarding', 'answers', next);
  };

  const goTo = async (s: StepId) => {
    setStep(s);
    await data().put('onboarding', 'step', s);
    window.scrollTo(0, 0);
  };

  const next = async () => {
    const nextStep = steps[Math.min(steps.length - 1, index + 1)];
    if (nextStep === 'plan') {
      const p = generatePlan(answers);
      setPlan(p);
      await updateSettings({ consents });
      await updateProfile({ plan: p });
    }
    await goTo(nextStep);
  };
  const back = () => goTo(steps[Math.max(0, index - 1)]);

  const set = <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => save({ ...answers, [key]: value });

  useEffect(() => {
    if (!loaded) return;
    document.title = `${STEP_TITLES[step]} · Amor Tóxico`;
  }, [loaded, step]);

  if (!loaded) return null;

  const shell = (title: string, body: React.ReactNode, opts: { skippable?: boolean; canContinue?: boolean; subtitle?: string } = {}) => (
    <div className="container section flow">
      <div className="flow-top">
        <button type="button" className="icon-btn" aria-label="Paso anterior" onClick={back}>
          <Icon name="back" />
        </button>
        <Progress value={progress} label="Progreso del registro" />
        {opts.skippable && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={next}>
            Omitir
          </button>
        )}
      </div>
      <div key={step} className="fade-in">
        <h2>{title}</h2>
        {opts.subtitle && <p className="muted">{opts.subtitle}</p>}
        {body}
        <div className="flow-actions">
          <button type="button" className="btn btn-primary" onClick={next} disabled={opts.canContinue === false}>
            Continuar <Icon name="next" size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  switch (step) {
    case 'bienvenida':
      return (
        <div className="container section flow fade-in" style={{ textAlign: 'center', paddingTop: '12vh' }}>
          <Logo size={64} />
          <h1 style={{ marginTop: '1.5rem' }}>Este espacio es para ti.</h1>
          <p className="muted" style={{ fontSize: '1.15rem' }}>
            Vamos a conocerte un poco para adaptar tu experiencia.
          </p>
          <div className="stack" style={{ maxWidth: 360, margin: '2rem auto 0' }}>
            <button type="button" className="btn btn-primary btn-block" onClick={next}>
              Empezar
            </button>
            <button
              type="button"
              className="btn btn-outline btn-block"
              onClick={async () => {
                await updateSettings({ guest: true });
                navigate('/app');
              }}
            >
              Explorar primero
            </button>
            <p className="small muted">
              Puedes saltarte cualquier pregunta sensible. Nunca te pediremos que relates lo que te dolió.
            </p>
            <Link to="/" className="small">
              Volver al sitio
            </Link>
          </div>
        </div>
      );

    case 'registro':
      return (
        <div className="container section flow">
          <div className="flow-top">
            <button type="button" className="icon-btn" aria-label="Paso anterior" onClick={back}>
              <Icon name="back" />
            </button>
            <Progress value={progress} label="Progreso del registro" />
          </div>
          <RegisterStep
            session={session}
            onDone={async (s, extra) => {
              setSession(s);
              await updateProfile({ name: s.name, email: s.email, ...extra });
              await next();
            }}
          />
          <button
            type="button"
            className="btn btn-outline btn-block"
            onClick={async () => {
              await updateSettings({ guest: true });
              navigate('/app');
            }}
          >
            Explorar primero
          </button>
          <p className="small muted">Puedes mirar la app sin crear una cuenta. Lo que escribas se queda en este dispositivo.</p>
        </div>
      );

    case 'identidad':
      return shell(
        '¿Cómo te identificas?',
        <>
          <ChoiceList label="Identidad" options={IDENTITY_OPTIONS} value={answers.identity} onChange={(v) => set('identity', v as never)} />
          <p className="small muted" style={{ marginTop: '1rem' }}>
            Solo lo usamos para dirigirnos a ti con respeto. Nunca para hacer generalizaciones psicológicas.
          </p>
        </>,
        { skippable: true },
      );

    case 'situacion':
      return shell(
        '¿Cuál de estas frases se parece más a tu situación?',
        <ChoiceList label="Situación" options={SITUATION_OPTIONS} value={answers.situation} onChange={(v) => set('situation', v as never)} min={280} />,
        { skippable: true },
      );

    case 'duracion':
      return shell(
        '¿Cuánto tiempo duró (o dura) la relación?',
        <>
          <ChoiceList
            label="Duración"
            options={DURATION_OPTIONS}
            value={answers.duration?.mode}
            onChange={(v) => set('duration', { mode: v as never, value: answers.duration?.value })}
          />
          {answers.duration && answers.duration.mode !== 'prefiero-no' && (
            <div className="field" style={{ marginTop: '1rem' }}>
              <label htmlFor="dur">
                {answers.duration.mode === 'fecha' ? 'Fecha aproximada de inicio' : `Número de ${answers.duration.mode === 'meses' ? 'meses' : 'años'}`}
              </label>
              <input
                id="dur"
                type={answers.duration.mode === 'fecha' ? 'date' : 'number'}
                min={0}
                value={answers.duration.value ?? ''}
                onChange={(e) => set('duration', { mode: answers.duration!.mode, value: e.target.value })}
              />
            </div>
          )}
        </>,
        { skippable: true },
      );

    case 'ruptura':
      return shell(
        '¿Cuándo terminó la relación?',
        <>
          <ChoiceList
            label="Fecha de ruptura"
            options={BREAKUP_DATE_OPTIONS}
            value={answers.breakup?.mode}
            onChange={(v) => set('breakup', { mode: v as never, date: answers.breakup?.date })}
          />
          {answers.breakup && answers.breakup.mode !== 'desconocida' && (
            <div className="field" style={{ marginTop: '1rem' }}>
              <label htmlFor="br">{answers.breakup.mode === 'exacta' ? 'Fecha' : 'Fecha aproximada'}</label>
              <input id="br" type="date" value={answers.breakup.date ?? ''} onChange={(e) => set('breakup', { mode: answers.breakup!.mode, date: e.target.value })} />
            </div>
          )}
        </>,
        { skippable: true },
      );

    case 'circunstancias':
      return shell(
        '¿Qué circunstancias formaron parte de lo que pasó?',
        <>
          <MultiChoice
            label="Circunstancias"
            options={CIRCUMSTANCE_OPTIONS}
            values={answers.circumstances ?? []}
            onChange={(v) => set('circumstances', v as never)}
          />
          {answers.circumstances?.includes('violencia') && (
            <div style={{ marginTop: '1rem' }}>
              <GentleSafetyCard />
            </div>
          )}
          <div className="field" style={{ marginTop: '1rem' }}>
            <label htmlFor="circ-note">
              Si quieres, añade algo más <span className="hint">(opcional)</span>
            </label>
            <textarea id="circ-note" value={answers.circumstancesNote ?? ''} onChange={(e) => set('circumstancesNote', e.target.value)} placeholder="No es necesario dar detalles." />
          </div>
        </>,
        { skippable: true, subtitle: 'Puedes elegir varias. No las usamos para etiquetar a nadie.' },
      );

    case 'contacto':
      return shell(
        '¿Mantienes contacto con esa persona?',
        <MultiChoice label="Contacto actual" options={CONTACT_OPTIONS} values={answers.contact ?? []} onChange={(v) => set('contact', v as never)} />,
        { skippable: true, subtitle: 'Puedes elegir varias.' },
      );

    case 'emociones':
      return shell(
        '¿Qué emociones están más presentes estos días?',
        <MultiChoice label="Emociones" options={EMOTION_OPTIONS} values={answers.emotions ?? []} onChange={(v) => set('emotions', v as never)} min={160} />,
        { skippable: true, subtitle: 'Todas son válidas. Elige las que quieras.' },
      );

    case 'dificultad':
      return shell(
        '¿Qué es lo que más te cuesta ahora?',
        <ChoiceList label="Dificultad principal" options={DIFFICULTY_OPTIONS} value={answers.difficulty} onChange={(v) => set('difficulty', v as never)} />,
        { skippable: true },
      );

    case 'necesidad':
      return shell(
        '¿Qué necesitas más en este momento?',
        <ChoiceList label="Necesidad principal" options={NEED_OPTIONS} value={answers.need} onChange={(v) => set('need', v as never)} />,
        { skippable: true },
      );

    case 'privacidad':
      return shell(
        'Tu privacidad y tus permisos',
        <div className="stack">
          <div className="card stack">
            <h3>
              <Icon name="lock" size={18} /> Qué guardamos y por qué
            </h3>
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              <li>Tus respuestas, para adaptar tu plan y tus sugerencias.</li>
              <li>Lo que escribas en tu diario y en la pausa, para que puedas volver a ello.</li>
              <li>Todo se guarda cifrado en este dispositivo. Si lo eliges, tu progreso (sin textos libres) se guarda también en tu cuenta.</li>
              <li>Puedes exportar o borrar todos tus datos desde Perfil, en cualquier momento.</li>
              <li>Las notificaciones y la memoria se pueden desactivar cuando quieras.</li>
            </ul>
          </div>
          <div className="card stack">
            <label className="check">
              <input type="checkbox" checked={consents.memory} onChange={(e) => setConsents({ ...consents, memory: e.target.checked })} />
              <span>
                <strong>Memoria personalizada</strong>
                <span className="muted small" style={{ display: 'block', fontWeight: 400 }}>
                  Guardar mis conversaciones con el asistente para retomarlas después.
                </span>
              </span>
            </label>
            <label className="check">
              <input type="checkbox" checked={consents.aiSensitive} onChange={(e) => setConsents({ ...consents, aiSensitive: e.target.checked })} />
              <span>
                <strong>Análisis de texto sensible por la IA</strong>
                <span className="muted small" style={{ display: 'block', fontWeight: 400 }}>
                  Permitir que el asistente interprete lo que escribo libremente. Sin este permiso, solo responderá a temas que elija con
                  botones. Por seguridad, siempre se revisará localmente si hay señales de peligro.
                </span>
              </span>
            </label>
          </div>
          <p className="small muted">Ambos permisos son opcionales e independientes.</p>
        </div>,
      );

    case 'plan': {
      const p = plan ?? generatePlan(answers);
      return (
        <div className="container section flow fade-in">
          <span className="eyebrow">Tu plan inicial</span>
          <h1>Este es tu punto de partida</h1>
          <div className="stack">
            <div className="card">
              <h3>Tu situación</h3>
              <p style={{ margin: 0 }}>{p.situationSummary}</p>
            </div>
            {p.showSafety && <GentleSafetyCard />}
            <div className="card tint-lavanda">
              <h3>Tu primer objetivo</h3>
              <p style={{ margin: 0, fontSize: '1.1rem' }}>{p.firstGoal}</p>
              <p className="small muted" style={{ margin: '0.5rem 0 0' }}>
                {p.immediateNeed}
              </p>
            </div>
            <div>
              <h3>Dos herramientas para empezar</h3>
              <div className="split">
                {p.tools.map((t) => (
                  <div key={t} className="card">
                    <span className="card-icon">
                      <Icon name={TOOLS[t].icon} />
                    </span>
                    <h3>{TOOLS[t].title}</h3>
                    <p className="small muted" style={{ margin: 0 }}>
                      {TOOLS[t].description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="card tint-verde">
              <span className="badge ok">
                <Icon name="clock" size={14} /> {p.firstActivity.minutes} min
              </span>
              <h3 style={{ marginTop: '0.5rem' }}>Primera actividad: {p.firstActivity.title}</h3>
              <p className="small" style={{ margin: 0 }}>
                {p.firstActivity.description}
              </p>
            </div>
            <Notice icon="chat">{p.assistantNote}</Notice>
          </div>
          <div className="flow-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                await updateSettings({ onboardingComplete: true, guest: false });
                await data().put('onboarding', 'step', 'plan');
                navigate('/app');
              }}
            >
              Empezar mi camino <Icon name="next" size={18} />
            </button>
          </div>
        </div>
      );
    }
  }
}

function RegisterStep({ session, onDone }: { session: Session | null; onDone: (s: Session, extra: AuthExtra) => Promise<void> }) {
  if (session) {
    return (
      <div className="fade-in stack">
        <h2>Ya tienes tu cuenta, {session.name}</h2>
        <p className="muted">Sesión iniciada con {session.email}.</p>
        <button type="button" className="btn btn-primary" onClick={() => onDone(session, { adultConfirmed: Boolean(session.adultConfirmed) })}>
          Continuar <Icon name="next" size={18} />
        </button>
      </div>
    );
  }
  return <AuthForm onDone={onDone} />;
}
