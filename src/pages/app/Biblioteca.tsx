import { useLocation } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { EmptyState, PageHeader, formatDate } from '../../components/ui';
import { EVIDENCE_LABELS } from '../../content/library';
import { useApp } from '../../state/AppContext';

export default function Biblioteca() {
  const { library } = useApp();
  const inApp = useLocation().pathname.startsWith('/app');
  return (
    <div className={inApp ? '' : 'container section'}>
      <PageHeader
        eyebrow="Biblioteca"
        title="Referencias y fuentes"
        subtitle="Las fuentes que respaldan el contenido educativo, con su nivel de evidencia y sus limitaciones."
      />
      {library.length === 0 ? (
        <EmptyState icon="library" title="La biblioteca está vacía" />
      ) : (
        <ul className="list">
          {library.map((r) => (
            <li key={r.id} className="card stack" style={{ ['--gap' as string]: '0.5rem' }}>
              <div className="row">
                <span className="badge">{EVIDENCE_LABELS[r.evidenceLevel]}</span>
                {r.reviewedAt ? (
                  <span className="badge ok">Revisado el {formatDate(r.reviewedAt, { dateStyle: 'medium' })}</span>
                ) : (
                  <span className="badge warn">Pendiente de revisión editorial</span>
                )}
              </div>
              <h3 style={{ margin: 0 }}>{r.title}</h3>
              <p className="small muted" style={{ margin: 0 }}>
                {r.authors} · {r.source} · {r.year}
              </p>
              <p className="small" style={{ margin: 0 }}>
                {r.summary}
              </p>
              <p className="small muted" style={{ margin: 0 }}>
                <strong>Limitaciones:</strong> {r.limitations}
              </p>
              <a href={r.url} target="_blank" rel="noreferrer" className="small">
                Ver la fuente original <Icon name="external" size={14} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
