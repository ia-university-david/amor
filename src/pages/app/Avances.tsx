import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Seo } from '../../components/Seo';
import { EmptyState, Notice, PageHeader, formatDate } from '../../components/ui';
import { data } from '../../lib/data';
import type { UrgeEvent } from '../../lib/events';
import { emotionCounts, intensityPoints, smallWins, weekKey, weekSummary, type IntensityPoint, type WeeklyReflection } from '../../lib/insights';
import { daysSince, type NoContactCounter } from '../../lib/noContact';
import { detectPatterns } from '../../lib/patterns';
import { useModuleProgress, type MoodEntry } from '../../lib/progress';
import { useCollection } from '../../lib/useCollection';
import { useApp } from '../../state/AppContext';
import { entitlementsFor } from '../../../shared/plans';

function EmotionChart({ counts }: { counts: { emotion: string; count: number }[] }) {
  const id = useId();
  const max = Math.max(1, ...counts.map((c) => c.count));
  const row = 30;
  const labelW = 110;
  const width = 360;
  const height = counts.length * row + 4;
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-labelledby={`${id}-t`} style={{ maxWidth: 560, display: 'block' }}>
        <title id={`${id}-t`}>Emociones anotadas: {counts.map((c) => `${c.emotion} ${c.count}`).join(', ')}</title>
        {counts.map((c, i) => {
          const w = ((width - labelW - 36) * c.count) / max;
          return (
            <g key={c.emotion} transform={`translate(0 ${i * row})`}>
              <text x={labelW - 8} y={row / 2 + 5} textAnchor="end" fontSize="13" fill="currentColor">
                {c.emotion}
              </text>
              <rect x={labelW} y={6} width={Math.max(2, w)} height={row - 12} rx={6} fill="var(--primary)" opacity={0.85} />
              <text x={labelW + w + 6} y={row / 2 + 5} fontSize="13" fill="currentColor">
                {c.count}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="small muted">Cuántos días anotaste cada emoción. No hay emociones buenas ni malas.</figcaption>
    </figure>
  );
}

function IntensityChart({ points }: { points: IntensityPoint[] }) {
  const id = useId();
  const shown = points.slice(-14);
  const width = 360;
  const height = 170;
  const pad = { l: 28, r: 8, t: 10, b: 24 };
  const step = shown.length > 1 ? (width - pad.l - pad.r) / (shown.length - 1) : 0;
  const y = (v: number) => pad.t + (height - pad.t - pad.b) * (1 - v / 10);
  const x = (i: number) => pad.l + (shown.length > 1 ? i * step : (width - pad.l - pad.r) / 2);
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-labelledby={`${id}-t`} style={{ maxWidth: 560, display: 'block' }}>
        <title id={`${id}-t`}>
          Intensidad al empezar y al terminar tus últimas {shown.length} pausas, en una escala de 0 a 10.
        </title>
        {[0, 5, 10].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={width - pad.r} y1={y(v)} y2={y(v)} stroke="currentColor" opacity={0.12} />
            <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="currentColor" opacity={0.7}>
              {v}
            </text>
          </g>
        ))}
        {shown.map((p, i) => (
          <g key={p.at}>
            <line x1={x(i)} x2={x(i)} y1={y(p.initial)} y2={y(p.final)} stroke="currentColor" opacity={0.3} strokeWidth={2} />
            <circle cx={x(i)} cy={y(p.initial)} r={5} fill="var(--coral, #e07a5f)" />
            <rect x={x(i) - 4.5} y={y(p.final) - 4.5} width={9} height={9} rx={2} fill="var(--primary)" />
          </g>
        ))}
      </svg>
      <figcaption className="small muted">
        <span aria-hidden="true" style={{ color: 'var(--coral, #e07a5f)' }}>
          ●
        </span>{' '}
        al empezar ·{' '}
        <span aria-hidden="true" style={{ color: 'var(--primary)' }}>
          ■
        </span>{' '}
        al terminar. Cada impulso es distinto; esto solo muestra lo que anotaste.
      </figcaption>
      <table className="sr-only">
        <caption>Intensidad de tus pausas</caption>
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">Al empezar</th>
            <th scope="col">Al terminar</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((p) => (
            <tr key={p.at}>
              <td>{formatDate(p.at)}</td>
              <td>{p.initial}</td>
              <td>{p.final}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function WeeklyReflectionCard({ events, moods }: { events: UrgeEvent[]; moods: MoodEntry[] }) {
  const week = weekKey();
  const reflections = useCollection<WeeklyReflection>('reflections');
  const current = reflections.items.find((r) => r.id === week)?.value;
  const [draft, setDraft] = useState<WeeklyReflection>({ week, wentWell: '', hard: '', nextStep: '', at: '' });
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (current) setDraft(current);
  }, [current]);
  const summary = weekSummary(events, moods, week);
  const past = reflections.items.filter((r) => r.id !== week).sort((a, b) => b.id.localeCompare(a.id));

  return (
    <section className="card stack" aria-labelledby="refl-h">
      <h2 id="refl-h" style={{ fontSize: '1.2rem', margin: 0 }}>
        Reflexión de la semana
      </h2>
      <p className="small muted" style={{ margin: 0 }}>
        Esta semana anotaste {summary.checkIns === 1 ? '1 día' : `${summary.checkIns} días`} cómo te sentías
        {summary.topEmotion ? ` (lo más frecuente: ${summary.topEmotion.toLowerCase()})` : ''}, {summary.pauses === 1 ? '1 pausa' : `${summary.pauses} pausas`}
        {summary.difficult ? ` y ${summary.difficult === 1 ? '1 día difícil' : `${summary.difficult} días difíciles`}` : ''}. Tus respuestas se
        guardan cifradas solo en este dispositivo.
      </p>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          await data().put('reflections', week, { ...draft, week, at: new Date().toISOString() });
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        }}
      >
        {(
          [
            ['wentWell', '¿Qué hiciste esta semana que te cuidó, aunque sea pequeño?'],
            ['hard', '¿Qué fue lo más difícil?'],
            ['nextStep', '¿Qué pequeño paso quieres darte la próxima semana?'],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="field">
            <label htmlFor={`refl-${key}`}>{label}</label>
            <textarea id={`refl-${key}`} rows={2} maxLength={1000} value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
          </div>
        ))}
        <div className="row">
          <button type="submit" className="btn btn-primary btn-sm" disabled={!draft.wentWell.trim() && !draft.hard.trim() && !draft.nextStep.trim()}>
            Guardar reflexión
          </button>
          {saved && (
            <span className="small" role="status">
              <Icon name="check" size={14} /> Guardada
            </span>
          )}
        </div>
      </form>
      {past.length > 0 && (
        <details>
          <summary className="small">Semanas anteriores ({past.length})</summary>
          <ul className="stack small" style={{ listStyle: 'none', padding: 0, ['--gap' as string]: '0.75rem', marginTop: '0.75rem' }}>
            {past.map(({ id, value }) => (
              <li key={id} className="card" style={{ padding: '0.75rem' }}>
                <strong>Semana del {formatDate(`${id}T12:00:00`, { dateStyle: 'long' })}</strong>
                {value.wentWell && <p style={{ margin: '0.3rem 0 0' }}>Me cuidó: {value.wentWell}</p>}
                {value.hard && <p style={{ margin: '0.3rem 0 0' }}>Difícil: {value.hard}</p>}
                {value.nextStep && <p style={{ margin: '0.3rem 0 0' }}>Próximo paso: {value.nextStep}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

const WINDOWS = [7, 30, 90] as const;

export default function Avances() {
  const { session } = useApp();
  const events = useCollection<UrgeEvent>('events');
  const moodsC = useCollection<MoodEntry>('moods');
  const { completed } = useModuleProgress();
  const [counter, setCounter] = useState<NoContactCounter | null>(null);
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(30);
  const maxDays = entitlementsFor(session?.plan).insightsHistoryDays;

  useEffect(() => {
    void data()
      .get<NoContactCounter>('limits', 'counter')
      .then((c) => setCounter(c ?? null));
  }, []);

  const evs = events.items.map((e) => e.value);
  const moods = moodsC.items.map((m) => m.value);
  const counts = emotionCounts(moods, days);
  const points = intensityPoints(evs, days);
  const wins = smallWins({
    events: evs,
    moods,
    completedActivities: Object.keys(completed).length,
    noContactDays: counter?.enabled && counter.startedAt ? daysSince(counter.startedAt) : null,
  });
  const patterns = detectPatterns(evs);

  return (
    <div className="stack" style={{ ['--gap' as string]: '1.25rem' }}>
      <Seo title="Mis pequeños avances" noindex />
      <PageHeader
        eyebrow="Progreso"
        title="Mis pequeños avances"
        subtitle="Sanar no es una línea recta. Aquí ves lo que has ido haciendo por ti; nada de esto se borra si tienes un día difícil."
      />

      <section className="card stack" aria-labelledby="wins-h">
        <h2 id="wins-h" style={{ fontSize: '1.2rem', margin: 0 }}>
          Lo que ya hiciste
        </h2>
        {wins.length === 0 ? (
          <p className="small muted" style={{ margin: 0 }}>
            Cuando uses la pausa, anotes cómo te sientes o completes una actividad, lo verás aquí. Cada paso cuenta.
          </p>
        ) : (
          <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0, ['--gap' as string]: '0.5rem' }}>
            {wins.map((w) => (
              <li key={w.id} className="row" style={{ gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                <Icon name="leaf" size={18} /> <span>{w.text}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="row" role="group" aria-label="Periodo">
        {WINDOWS.map((w) => {
          const locked = w > maxDays;
          return (
            <button key={w} type="button" className={`chip${days === w ? ' active' : ''}`} aria-pressed={days === w} disabled={locked} onClick={() => setDays(w)}>
              Últimos {w} días{locked ? ' · premium' : ''}
            </button>
          );
        })}
      </div>

      <section className="card stack" aria-labelledby="emo-h">
        <h2 id="emo-h" style={{ fontSize: '1.2rem', margin: 0 }}>
          Cómo te has sentido
        </h2>
        {counts.length === 0 ? (
          <EmptyState icon="smile" title="Aún no hay registros en este periodo">
            <Link to="/app" className="btn btn-outline btn-sm">
              Anotar cómo me siento hoy
            </Link>
          </EmptyState>
        ) : (
          <EmotionChart counts={counts} />
        )}
      </section>

      <section className="card stack" aria-labelledby="int-h">
        <h2 id="int-h" style={{ fontSize: '1.2rem', margin: 0 }}>
          Tus pausas
        </h2>
        {points.length === 0 ? (
          <p className="small muted" style={{ margin: 0 }}>
            Cuando completes una pausa y anotes la intensidad al final, verás aquí cómo cambió.{' '}
            <Link to="/app/pausa">Ir a la pausa</Link>
          </p>
        ) : (
          <IntensityChart points={points} />
        )}
      </section>

      {patterns.length > 0 && (
        <section className="card stack" aria-labelledby="pat-h">
          <h2 id="pat-h" style={{ fontSize: '1.2rem', margin: 0 }}>
            Algo que notamos en tus registros
          </h2>
          <p className="small muted" style={{ margin: 0 }}>
            Son coincidencias en lo que anotaste, no explicaciones. Tú sabes mejor que nadie qué significan.
          </p>
          {patterns.map((p) => (
            <Notice key={p.id} icon="sparkle">
              {p.message}{' '}
              {p.suggestion && (
                <Link to={p.suggestion.to} className="small">
                  {p.suggestion.label}
                </Link>
              )}
            </Notice>
          ))}
        </section>
      )}

      <WeeklyReflectionCard events={evs} moods={moods} />
    </div>
  );
}
