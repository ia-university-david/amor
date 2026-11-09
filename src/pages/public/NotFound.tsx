import { Seo } from '../../components/Seo';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/ui';

export function NotFound() {
  return (
    <div className="container narrow section">
      <Seo title="Página no encontrada" noindex />
      <EmptyState icon="path" title="Esta página no existe">
        <p>Quizás cambió de lugar. Puedes volver al inicio y seguir desde allí.</p>
        <Link to="/" className="btn btn-primary">
          Ir al inicio
        </Link>
      </EmptyState>
    </div>
  );
}
