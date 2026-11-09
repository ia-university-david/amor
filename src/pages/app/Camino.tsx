import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { PageHeader, Progress } from '../../components/ui';
import { MODULES, PILLARS, type ProgramModule } from '../../content/program';
import { useModuleProgress } from '../../lib/progress';
import { useApp } from '../../state/AppContext';

export function moduleHref(m: ProgramModule): string {
  if (m.exerciseId) return `/app/camino/ejercicio/${m.exerciseId}`;
  if (m.to) return m.to;
  return `/app/camino/modulo/${m.id}`;
}

export default function Camino() {
  const { completed } = useModuleProgress();
  const { profile } = useApp();
  const order = profile?.plan?.focusPillars ?? [1, 2, 3, 4, 5];
  const pillars = order.map((id) => PILLARS.find((p) => p.id === id)!);
  const done = MODULES.filter((m) => completed[m.id]).length;

  return (
    <div>
      <PageHeader
        eyebrow="Mi Camino"
        title="Tu programa, a tu ritmo"
        subtitle="Cinco pilares para volver a ti. Puedes empezar por cualquiera; el orden se adapta a lo que nos contaste."
      />
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="row between">
          <strong>Tu progreso</strong>
          <span className="small muted">
            {done} de {MODULES.length}
          </span>
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <Progress value={done / MODULES.length} label="Progreso total del programa" />
        </div>
        <p className="small muted" style={{ margin: '0.5rem 0 0' }}>
          Lo que completas queda guardado. Un día difícil no lo borra.
        </p>
      </div>

      <div className="stack" style={{ ['--gap' as string]: '2rem' }}>
        {pillars.map((p) => {
          const mods = MODULES.filter((m) => m.pillar === p.id);
          return (
            <section key={p.id} aria-labelledby={`pilar-${p.id}`}>
              <span className="eyebrow">Pilar {p.id}</span>
              <h2 id={`pilar-${p.id}`}>{p.title}</h2>
              <p className="muted">{p.description}</p>
              <div className="grid" style={{ ['--min' as string]: '250px' }}>
                {mods.map((m) => (
                  <Link key={m.id} to={moduleHref(m)} className="card card-link">
                    <div className="row between" style={{ marginBottom: '0.5rem' }}>
                      {m.source === 'laura-pendiente' ? (
                        <span className="badge warn">Contenido autorizado pendiente</span>
                      ) : (
                        <span className="badge">{m.kind === 'ejercicio' ? 'Ejercicio' : m.kind === 'herramienta' ? 'Herramienta' : 'Lectura'}</span>
                      )}
                      {completed[m.id] && (
                        <span className="badge ok">
                          <Icon name="check" size={14} /> Hecho
                        </span>
                      )}
                    </div>
                    <h3>{m.title}</h3>
                    <p className="small muted" style={{ margin: 0 }}>
                      {m.summary}
                    </p>
                    <p className="small muted" style={{ margin: '0.5rem 0 0' }}>
                      <Icon name="clock" size={14} /> {m.minutes} min
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
