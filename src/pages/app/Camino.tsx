import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { PageHeader, Progress } from '../../components/ui';
import { CHAPTERS, chapterById, type ChapterId } from '../../content/chapters';
import { MODULES, type ProgramModule } from '../../content/program';
import { orderedChapters } from '../../lib/journey';
import { data } from '../../lib/data';
import { useModuleProgress } from '../../lib/progress';
import type { OnboardingAnswers } from '../../content/onboarding';
import { useApp } from '../../state/AppContext';

export function moduleHref(m: ProgramModule): string {
  if (m.exerciseId) return `/app/camino/ejercicio/${m.exerciseId}`;
  if (m.to) return m.to;
  return `/app/camino/modulo/${m.id}`;
}

export default function Camino() {
  const { completed } = useModuleProgress();
  const { profile } = useApp();
  const [view, setView] = useState<'mapa' | 'lista'>('mapa');
  const [answers, setAnswers] = useState<OnboardingAnswers>({});

  useEffect(() => {
    data()
      .get<OnboardingAnswers>('onboarding', 'answers')
      .then((a) => setAnswers(a ?? {}));
  }, []);

  const order: ChapterId[] = profile?.plan?.focusChapters?.length ? profile.plan.focusChapters : orderedChapters(answers);
  const done = MODULES.filter((m) => completed[m.id]).length;
  const startHere = MODULES.find((m) => m.stage === order[0] && !completed[m.id]);

  return (
    <div>
      <PageHeader
        eyebrow="Mi Camino"
        title="Según donde estás, no según un plazo"
        subtitle="Siete capítulos inspirados en el libro de Laura Rojas. Puedes saltar, volver y dejar uno a medias. Un momento difícil no borra lo que ya hiciste."
      />

      <div className="segmented" role="tablist" aria-label="Vista del camino">
        <button type="button" role="tab" aria-selected={view === 'mapa'} className={view === 'mapa' ? 'on' : ''} onClick={() => setView('mapa')}>
          <Icon name="path" size={16} /> Mi Camino
        </button>
        <button type="button" role="tab" aria-selected={view === 'lista'} className={view === 'lista' ? 'on' : ''} onClick={() => setView('lista')}>
          <Icon name="list" size={16} /> Todos los ejercicios
        </button>
      </div>

      <div className="card" style={{ margin: '1rem 0 1.5rem' }}>
        <div className="row between">
          <strong>Lo que ya recorriste</strong>
          <span className="small muted">
            {done} de {MODULES.length}
          </span>
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <Progress value={done / MODULES.length} label="Progreso del camino" />
        </div>
        <p className="small muted" style={{ margin: '0.5rem 0 0' }}>
          Completar un ejercicio se queda guardado. Reiniciar el contador de un límite no lo borra.
        </p>
      </div>

      {view === 'mapa' ? (
        <div className="winding">
          {order.map((id) => {
            const chapter = chapterById(id);
            const mods = MODULES.filter((m) => m.stage === id);
            return (
              <section key={id} aria-labelledby={`cap-${id}`}>
                <header className="chapter-mark">
                  <span>Capítulo {chapter.number}</span>
                  <h2 id={`cap-${id}`}>{chapter.title}</h2>
                  <p>{chapter.subtitle}</p>
                </header>
                {mods.map((m, i) => (
                  <ModuleNode key={m.id} module={m} side={i % 2 === 0 ? 'left' : 'right'} done={Boolean(completed[m.id])} here={startHere?.id === m.id} />
                ))}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="stack" style={{ ['--gap' as string]: '1.75rem' }}>
          {order.map((id) => {
            const chapter = chapterById(id);
            const mods = MODULES.filter((m) => m.stage === id);
            return (
              <section key={id}>
                <h2 className="list-kicker">{chapter.title}</h2>
                <ul className="plain-list">
                  {mods.map((m) => (
                    <li key={m.id}>
                      <Link to={moduleHref(m)}>
                        <span>
                          <strong>{m.title}</strong>
                          <span className="muted small">{m.summary}</span>
                        </span>
                        {completed[m.id] ? <span className="badge ok">Hecho</span> : <Icon name="next" className="muted" />}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <p className="small muted">
        Los capítulos del libro ({CHAPTERS.map((c) => c.book.split('(')[0].trim()).slice(0, 1).join('')}…) se muestran como paráfrasis hasta que Laura autorice el texto completo. Cada ejercicio pendiente de revisión lo dice en su pantalla.
      </p>
    </div>
  );
}

function ModuleNode({ module: m, side, done, here }: { module: ProgramModule; side: 'left' | 'right'; done: boolean; here: boolean }) {
  return (
    <Link to={moduleHref(m)} className={`wind-node ${side}${done ? ' done' : ''}${here ? ' here' : ''}`}>
      <span className="wind-dot" aria-hidden>
        <Icon name={done ? 'check' : m.kind === 'herramienta' ? 'sparkle' : 'heart'} size={18} />
      </span>
      <span className="wind-copy">
        <strong>{m.title}</strong>
        {here && <span className="here-label">Empieza aquí</span>}
        {m.source !== 'original' && <span className="mini-note">Revisión pendiente</span>}
      </span>
    </Link>
  );
}
