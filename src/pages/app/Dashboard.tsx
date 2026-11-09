import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '../../components/Icon';
import { Progress, formatDate } from '../../components/ui';
import { BRAIN_TOPICS } from '../../content/brain';
import { messageOfTheDay } from '../../content/messages';
import { MODULES } from '../../content/program';
import { type LimitsState } from '../../content/limits';
import { QUOTE_NOTICE, quoteFor } from '../../content/quotes';
import type { OnboardingAnswers } from '../../content/onboarding';
import { data } from '../../lib/data';
import type { UrgeEvent } from '../../lib/events';
import { companionLine } from '../../lib/companion';
import { daysSince, EMPTY_COUNTER, type NoContactCounter } from '../../lib/noContact';
import { weekKey } from '../../lib/insights';
import { detectPatterns } from '../../lib/patterns';
import { todayKey, useModuleProgress, type MoodEntry } from '../../lib/progress';
import { kindWeek } from '../../lib/weeklyKind';
import { milestones } from '../../lib/milestones';
import { useCollection, useDoc } from '../../lib/useCollection';
import { useApp } from '../../state/AppContext';

const NEEDS: { label: string; icon: IconName; to?: string; action?: 'mejor' }[] = [
  { label: 'Tengo ganas de escribirle', icon: 'pause', to: '/app/pausa' },
  { label: 'Me siento triste', icon: 'cloud', to: '/app/asistente?tema=tristeza' },
  { label: 'No puedo dejar de pensar', icon: 'brain', to: '/app/cerebro/rumiacion' },
  { label: 'Quiero entender lo que me pasa', icon: 'book', to: '/app/cerebro' },
  { label: 'Hoy me siento mejor', icon: 'sun', action: 'mejor' },
  { label: 'Necesito hablar', icon: 'chat', to: '/app/asistente' },
];

const QUICK_MOODS = ['Tranquilidad', 'Tristeza', 'Ansiedad', 'Nostalgia', 'Rabia', 'Confusión', 'Esperanza', 'No sé'];

export default function Dashboard() {
  const { profile, settings, messages, updateProfile } = useApp();
  const navigate = useNavigate();
  const { completed, markDone } = useModuleProgress();
  const events = useCollection<UrgeEvent>('events');
  const diary = useCollection<unknown>('diary');
  const unsent = useCollection<unknown>('unsent');
  const counter = useDoc<NoContactCounter>('limits', 'counter', EMPTY_COUNTER);
  const limits = useDoc<LimitsState>('limits', 'state', { modality: null, rules: [] });
  const identity = useDoc<{ stopped: string; likes: string }>('identity', 'map', { stopped: '', likes: '' });
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [mood, setMood] = useState<MoodEntry | null>(null);
  const [better, setBetter] = useState(false);
  const [editingReminder, setEditingReminder] = useState(false);
  const [reminderDraft, setReminderDraft] = useState('');

  useEffect(() => {
    data().get<MoodEntry>('moods', todayKey()).then((m) => setMood(m ?? null));
    data().get<OnboardingAnswers>('onboarding', 'answers').then((a) => setAnswers(a ?? {}));
  }, []);

  const saveMood = async (emotion: string) => {
    const entry: MoodEntry = { date: todayKey(), emotion };
    setMood(entry);
    await data().put('moods', entry.date, entry);
  };

  const name = profile?.name ?? '';
  const todayRaw = formatDate(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long' });
  const today = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);
  const doneCount = MODULES.filter((m) => completed[m.id]).length;
  const topic = BRAIN_TOPICS[Math.floor(Date.now() / 86_400_000) % BRAIN_TOPICS.length];
  const daily = messageOfTheDay(messages);

  const nextStep = useMemo(() => {
    const plan = profile?.plan;
    if (plan && !completed['primera-actividad']) return { title: plan.firstActivity.title, text: plan.firstActivity.description, to: plan.firstActivity.to, minutes: plan.firstActivity.minutes, isPlan: true };
    const byChapter = plan?.focusChapters?.flatMap((id) => MODULES.filter((m) => m.stage === id));
    const order = plan?.focusPillars ?? [1, 2, 3, 4, 5];
    const pool = byChapter?.length ? byChapter : order.flatMap((p) => MODULES.filter((m) => m.pillar === p));
    const candidate = pool.find((m) => !completed[m.id]);
    if (!candidate) return null;
    return {
      title: candidate.title,
      text: candidate.summary,
      to: candidate.exerciseId ? `/app/camino/ejercicio/${candidate.exerciseId}` : candidate.to ?? `/app/camino/modulo/${candidate.id}`,
      minutes: candidate.minutes,
      isPlan: false,
    };
  }, [profile?.plan, completed]);

  const pauseEvents = events.items.map((i) => i.value).filter((e) => e.kind === 'pausa');
  const lowered = pauseEvents.filter((e) => e.kind === 'pausa' && e.finalIntensity !== undefined && e.finalIntensity < e.initialIntensity).length;
  const insights = detectPatterns(events.items.map((i) => i.value));
  const facts: string[] = [];
  if (pauseEvents.length) facts.push(`Usaste la pausa ${pauseEvents.length} ${pauseEvents.length === 1 ? 'vez' : 'veces'}.`);
  if (lowered) facts.push(`En ${lowered} de esas pausas, la intensidad que anotaste al final fue menor que al principio.`);
  if (diary.items.length) facts.push(`Escribiste ${diary.items.length} ${diary.items.length === 1 ? 'entrada' : 'entradas'} en tu diario.`);
  if (doneCount) facts.push(`Completaste ${doneCount} ${doneCount === 1 ? 'actividad' : 'actividades'} de tu camino.`);

  const weekStart = weekKey();
  const inWeek = (iso: string) => iso.slice(0, 10) >= weekStart;
  const allCheckIns = events.items.map((i) => i.value).filter((e) => e.kind === 'checkin');
  const checkIns = allCheckIns.filter((e) => inWeek(e.at));
  const weekNote = kindWeek({
    pauses: pauseEvents.filter((e) => inWeek(e.at)).length,
    difficult: checkIns.filter((e) => e.moment === 'dificil').length + events.items.filter((e) => e.value.kind === 'dificil' && inWeek(e.value.at)).length,
    necessary: checkIns.filter((e) => e.moment === 'necesario').length,
    checkIns: checkIns.length,
    exercises: Object.values(completed).filter((iso) => inWeek(iso)).length,
    topEmotion: mood?.emotion ?? null,
  });
  const badges = milestones({
    exercisesDone: doneCount,
    pauses: pauseEvents.length,
    checkIns: allCheckIns.length,
    difficultMoments: allCheckIns.filter((e) => e.moment === 'dificil').length,
    rules: limits.value.rules.length,
    unsent: unsent.items.length,
    identityNotes: (identity.value.stopped.trim() ? 1 : 0) + (identity.value.likes.trim() ? 1 : 0),
  }).filter((m) => m.reached);

  return (
    <div className="stack" style={{ ['--gap' as string]: '1.25rem' }}>
      <HomeCompanion
        name={name}
        situation={answers.situation}
        contactMode={profile?.plan?.contactMode}
        nightPattern={insights.some((i) => i.id === 'noche')}
        counterOn={Boolean(counter.value.enabled && counter.value.startedAt)}
        days={daysSince(counter.value.startedAt)}
        necessary={profile?.plan?.contactMode === 'necesario'}
      />

      <header className="fade-in">
        <p className="muted small" style={{ margin: 0 }}>
          {today}
        </p>
        <h1 style={{ marginBottom: '0.25rem' }}>
          Hola{name ? `, ${name}` : ''}. ¿Cómo estás hoy?
        </h1>
        <p className="muted">No hace falta que estés bien. Solo date un momento para notar cómo llegas.</p>
      </header>

      <section className="card tint-lavanda" aria-labelledby="need-title">
        <h2 id="need-title" style={{ fontSize: '1.35rem' }}>
          ¿Qué necesitas en este momento?
        </h2>
        <div className="choices" style={{ ['--min' as string]: '230px' }}>
          {NEEDS.map((n) => (
            <button
              key={n.label}
              type="button"
              className="choice"
              onClick={() => {
                if (n.action === 'mejor') {
                  setBetter(true);
                  void saveMood('Me siento mejor');
                } else if (n.to) {
                  const needsProfile = n.to.startsWith('/app/asistente') && !settings.onboardingComplete;
                  navigate(needsProfile ? '/app/pausa?herramienta=respiracion' : n.to);
                }
              }}
            >
              <Icon name={n.icon} /> <span>{n.label}</span>
            </button>
          ))}
        </div>
        {better && (
          <div className="notice fade-in" role="status" style={{ marginTop: '1rem', background: 'var(--surface)' }}>
            <Icon name="smile" size={20} />
            <div>
              Me alegra leerlo. Vale la pena notar qué ayudó hoy, para tenerlo cerca en días más difíciles.{' '}
              {settings.onboardingComplete && <Link to="/app/espacio?seccion=diario">Escribirlo en mi diario</Link>}
            </div>
          </div>
        )}
      </section>

      <section aria-label="Herramientas">
        <h2 className="list-kicker">Para este momento</h2>
        <div className="tool-grid">
          {[
            { to: '/app/checkin', label: 'Cómo estoy', icon: 'heart' as const },
            { to: '/app/espacio?seccion=calendario', label: 'Calendario', icon: 'calendar' as const },
            { to: '/app/limites', label: 'Mis reglas', icon: 'shield' as const },
            { to: '/app/espacio?seccion=recordatorios', label: 'Recordatorios', icon: 'bell' as const },
            { to: '/app/camino', label: 'Ejercicios', icon: 'path' as const },
            { to: '/app/asistente', label: 'Asistente', icon: 'chat' as const },
            { to: '/app/pausa', label: 'Pausa', icon: 'pause' as const },
            { to: '/app/espacio?seccion=carta', label: 'Carta sin enviar', icon: 'pen' as const },
          ].map((t) => (
            <Link key={t.label} to={t.to} className="card card-link tool-tile">
              <Icon name={t.icon} />
              <span>{t.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {badges.length > 0 && (
        <section className="card" aria-labelledby="hitos">
          <h2 id="hitos" style={{ fontSize: '1.2rem' }}>
            Hitos que no se pierden
          </h2>
          <ul className="small" style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {badges.map((b) => (
              <li key={b.id}>
                <strong>{b.title}.</strong> {b.detail}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card tint-verde">
        <h2 style={{ fontSize: '1.2rem' }}>Esta semana, con cariño</h2>
        <p style={{ marginBottom: 0 }}>{weekNote}</p>
      </section>

      <div className="grid" style={{ ['--min' as string]: '280px' }}>
        <section className="card" aria-labelledby="camino-t">
          <span className="card-icon">
            <Icon name="path" />
          </span>
          <h3 id="camino-t">Mi camino</h3>
          <Progress value={doneCount / MODULES.length} label="Progreso del programa" />
          <p className="small muted" style={{ margin: '0.5rem 0' }}>
            {doneCount === 0 ? 'Aún no has empezado. No hay prisa.' : `${doneCount} de ${MODULES.length} actividades completadas.`}
          </p>
          <Link to="/app/camino" className="btn btn-outline btn-sm">
            Ver mi camino
          </Link>
        </section>

        <section className="card" aria-labelledby="emo-t">
          <span className="card-icon">
            <Icon name="heart" />
          </span>
          <h3 id="emo-t">Mi emoción de hoy</h3>
          {mood ? (
            <p className="small">
              Hoy anotaste: <strong>{mood.emotion}</strong>.{' '}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMood(null)}>
                Cambiar
              </button>
            </p>
          ) : (
            <div className="row" style={{ gap: '0.4rem' }}>
              {QUICK_MOODS.map((m) => (
                <button key={m} type="button" className="chip" onClick={() => saveMood(m)}>
                  {m}
                </button>
              ))}
            </div>
          )}
        </section>

        {nextStep && (
          <section className="card tint-verde" aria-labelledby="next-t">
            <span className="badge ok">
              <Icon name="clock" size={14} /> {nextStep.minutes} min
            </span>
            <h3 id="next-t" style={{ marginTop: '0.5rem' }}>
              Mi siguiente paso
            </h3>
            <p className="small" style={{ marginBottom: '0.25rem' }}>
              <strong>{nextStep.title}</strong>
            </p>
            <p className="small muted">{nextStep.text}</p>
            <Link to={nextStep.to} className="btn btn-primary btn-sm" onClick={() => nextStep.isPlan && void markDone('primera-actividad')}>
              Empezar
            </Link>
          </section>
        )}

        <section className="card tint-niebla" aria-labelledby="brain-t">
          <span className="card-icon">
            <Icon name="brain" />
          </span>
          <h3 id="brain-t">Un minuto para comprender tu cerebro</h3>
          <p className="small">
            <strong>{topic.title}.</strong> {topic.summary}
          </p>
          <Link to={`/app/cerebro/${topic.id}`} className="btn btn-outline btn-sm">
            Leer
          </Link>
        </section>

        <section className="card" aria-labelledby="avances-t">
          <span className="card-icon">
            <Icon name="star" />
          </span>
          <h3 id="avances-t">Mis pequeños avances</h3>
          {facts.length === 0 ? (
            <p className="small muted">Aquí irán apareciendo hechos concretos de lo que vas haciendo. Sin presiones ni metas impuestas.</p>
          ) : (
            <ul className="small" style={{ paddingLeft: '1.1rem', margin: 0 }}>
              {facts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
          {insights.slice(0, 1).map((i) => (
            <div key={i.id} className="notice" style={{ marginTop: '0.75rem' }}>
              <Icon name="sparkle" size={18} />
              <div className="small">
                {i.message} {i.suggestion && <Link to={i.suggestion.to}>{i.suggestion.label}</Link>}
              </div>
            </div>
          ))}
        </section>

        <section className="card" aria-labelledby="rec-t">
          <span className="card-icon">
            <Icon name="bell" />
          </span>
          <h3 id="rec-t">Tu recordatorio</h3>
          {editingReminder ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await updateProfile({ reminder: reminderDraft.trim() });
                setEditingReminder(false);
              }}
              className="stack"
              style={{ ['--gap' as string]: '0.5rem' }}
            >
              <label htmlFor="rem" className="sr-only">
                Tu recordatorio
              </label>
              <textarea id="rem" value={reminderDraft} onChange={(e) => setReminderDraft(e.target.value)} style={{ minHeight: 80 }} placeholder="Una frase que quieras leer en los momentos difíciles." />
              <div className="row">
                <button type="submit" className="btn btn-primary btn-sm">
                  Guardar
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingReminder(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>“{profile?.reminder || daily?.text}”</p>
              {settings.onboardingComplete && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setReminderDraft(profile?.reminder ?? '');
                    setEditingReminder(true);
                  }}
                >
                  <Icon name="edit" size={16} /> {profile?.reminder ? 'Editar' : 'Escribir el mío'}
                </button>
              )}
            </>
          )}
        </section>

        <section className="card" aria-labelledby="ia-t">
          <span className="card-icon">
            <Icon name="chat" />
          </span>
          <h3 id="ia-t">Hablar con el asistente</h3>
          <p className="small muted">Un espacio para ordenar lo que sientes. Es una inteligencia artificial, no una persona ni un terapeuta.</p>
          <Link to="/app/asistente" className="btn btn-outline btn-sm">
            Abrir conversación
          </Link>
        </section>
      </div>

      <Link to="/app/dificil" className="card card-link row" style={{ flexWrap: 'nowrap' }}>
        <span className="card-icon" style={{ marginBottom: 0 }}>
          <Icon name="cloud" />
        </span>
        <span>
          <strong>¿Hoy fue difícil?</strong>
          <span className="muted small" style={{ display: 'block' }}>
            Podemos entender qué pasó y decidir qué necesitas ahora, sin juzgarte.
          </span>
        </span>
        <Icon name="next" className="muted" />
      </Link>

      <div className="grid" style={{ ['--min' as string]: '220px' }}>
        <Link to="/app/avances" className="card card-link row" style={{ flexWrap: 'nowrap' }}>
          <span className="card-icon" style={{ marginBottom: 0 }}>
            <Icon name="chart" />
          </span>
          <span>
            <strong>Mis pequeños avances</strong>
            <span className="muted small" style={{ display: 'block' }}>
              Lo que has hecho por ti y tu reflexión semanal.
            </span>
          </span>
        </Link>
        <Link to="/app/comunidad" className="card card-link row" style={{ flexWrap: 'nowrap' }}>
          <span className="card-icon" style={{ marginBottom: 0 }}>
            <Icon name="users" />
          </span>
          <span>
            <strong>Comunidad</strong>
            <span className="muted small" style={{ display: 'block' }}>
              Un espacio anónimo y moderado entre personas que te entienden.
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}

function HomeCompanion({
  name,
  situation,
  contactMode,
  nightPattern,
  counterOn,
  days,
  necessary,
}: {
  name: string;
  situation?: OnboardingAnswers['situation'];
  contactMode?: 'dentro' | 'necesario' | 'voluntario' | 'sin-definir';
  nightPattern: boolean;
  counterOn: boolean;
  days: number;
  necessary: boolean;
}) {
  const line = companionLine({ name, situation, contactMode, nightPattern });
  const quoteKey =
    situation === 'sigo-relacion' || situation === 'considerando' || contactMode === 'dentro'
      ? 'dentro'
      : situation === 'reciente'
        ? 'recien'
        : situation === 'hace-mucho'
          ? 'identidad'
          : nightPattern
            ? 'noche'
            : 'distancia';
  const quote = quoteFor(quoteKey);
  const turn = Math.min(100, (days % 30) * (100 / 30));
  return (
    <>
      <section className="card tint-niebla">
        <h2 style={{ fontSize: '1.35rem' }}>{line.title}</h2>
        <p>{line.body}</p>
        <Link to={line.suggestion.to} className="btn btn-primary btn-sm">
          {line.suggestion.label}
        </Link>
      </section>
      {counterOn && (
        <section className="card day-ring-card" aria-label="Contador del límite que elegiste">
          <p style={{ marginTop: 0 }}>Días cuidando el límite que elegiste</p>
          <div className="day-ring" style={{ ['--turn' as string]: `${turn}%` }}>
            <strong>{days}</strong>
            <span>días</span>
          </div>
          <p className="small muted">{necessary ? 'El contacto por hijos, trámites o seguridad no cuenta aquí.' : 'Es una medida entre otras. No mide tu valor.'}</p>
          <div className="row">
            <Link to="/app/checkin?tipo=sostuve" className="btn btn-outline btn-sm">
              Sostuve lo que elegí
            </Link>
            <Link to="/app/checkin?tipo=dificil" className="btn btn-outline btn-sm">
              Fue un momento difícil
            </Link>
            {necessary && (
              <Link to="/app/checkin?tipo=necesario" className="btn btn-ghost btn-sm">
                Fue un contacto necesario
              </Link>
            )}
          </div>
        </section>
      )}
      {!counterOn && (
        <section className="card">
          <h2 style={{ fontSize: '1.2rem' }}>Un momento para mirar cómo estás</h2>
          <p className="small muted">No se trata de resistir o fallar. Se trata de notar qué pasó, sin borrar lo aprendido.</p>
          <Link to="/app/checkin" className="btn btn-primary btn-sm">
            Hacer un check-in
          </Link>
        </section>
      )}
      <figure className="card quote-card">
        <blockquote>«{quote.text}»</blockquote>
        <figcaption>
          Laura Rojas, <em>Amor tóxico</em>, p. {quote.page}. {QUOTE_NOTICE}
        </figcaption>
      </figure>
    </>
  );
}
