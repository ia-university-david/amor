import { Link, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { EmptyState, Notice, PageHeader } from '../../components/ui';
import { AUTHOR, LINKS } from '../../content/links';
import { MODULES, PILLARS } from '../../content/program';
import { useModuleProgress } from '../../lib/progress';

export default function ModulePage() {
  const { id } = useParams();
  const mod = MODULES.find((m) => m.id === id);
  const { completed, markDone } = useModuleProgress();

  if (!mod) {
    return (
      <EmptyState icon="path" title="No encontramos este módulo">
        <Link to="/app/camino" className="btn btn-outline">
          Volver a Mi Camino
        </Link>
      </EmptyState>
    );
  }
  const pillar = PILLARS.find((p) => p.id === mod.pillar)!;
  const related = MODULES.filter((m) => m.pillar === mod.pillar && m.id !== mod.id && m.source === 'original');

  return (
    <div className="container narrow" style={{ padding: 0 }}>
      <PageHeader back="/app/camino" eyebrow={`Pilar ${pillar.id} · ${pillar.title}`} title={mod.title} subtitle={mod.summary} />
      {mod.source === 'laura-pendiente' ? (
        <div className="stack">
          <Notice icon="clock">
            <strong>Contenido autorizado pendiente.</strong> Este módulo desarrollará uno de los temas del libro <em>Amor Tóxico</em> de{' '}
            {AUTHOR.name}. Lo publicaremos cuando tengamos el texto aprobado por la autora; no queremos escribir en su nombre.
          </Notice>
          <div className="card">
            <h3>Mientras tanto</h3>
            <p className="small">Puedes trabajar este pilar con los ejercicios disponibles o leer el libro.</p>
            <div className="row">
              {related.map((r) => (
                <Link key={r.id} to={r.exerciseId ? `/app/camino/ejercicio/${r.exerciseId}` : r.to ?? '/app/camino'} className="btn btn-outline btn-sm">
                  {r.title}
                </Link>
              ))}
              <a href={LINKS.book} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                El libro <Icon name="external" size={14} />
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <p>{mod.summary}</p>
          <Link to={mod.to ?? '/app/camino'} className="btn btn-primary" onClick={() => markDone(mod.id)}>
            Abrir
          </Link>
          {completed[mod.id] && <p className="small muted">Completado.</p>}
        </div>
      )}
    </div>
  );
}
