import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '../../components/Icon';
import { Progress, formatDate } from '../../components/ui';
import { BRAIN_TOPICS } from '../../content/brain';
import { messageOfTheDay } from '../../content/messages';
import { MODULES } from '../../content/program';
import { data } from '../../lib/data';
import type { UrgeEvent } from '../../lib/events';
import { detectPatterns } from '../../lib/patterns';
import { todayKey, useModuleProgress, type MoodEntry } from '../../lib/progress';
import { useCollection } from '../../lib/useCollection';
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
  const [mood, setMood] = useState<MoodEntry | null>(null);
  const [better, setBetter] = useState(false);
  const [editingReminder, setEditingReminder] = useState(false);
  const [reminderDraft, setReminderDraft] = useState('');

  useEffect(() => {
    data().get<MoodEntry>('moods', todayKey()).then((m) => setMood(m ?? null));
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
    const order = plan?.focusPillars ?? [1, 2, 3, 4, 5];
    const candidate = order
      .flatMap((p) => MODULES.filter((m) => m.pillar === p))
      .find((m) => !completed[m.id] && m.source === 'original');
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

  return (
    <div className="stack" style={{ ['--gap' as string]: '1.25rem' }}>
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
    </div>
  );
}
