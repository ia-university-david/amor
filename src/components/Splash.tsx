import { Link } from 'react-router-dom';
import { Logo } from './Icon';

export function Splash({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="splash" role="dialog" aria-label="Bienvenida a Amor Tóxico">
      <Logo size={72} />
      <h1>Amor Tóxico</h1>
      <p>Un lugar para acompañarte, no para decirte en cuántos días vas a estar bien.</p>
      <button type="button" className="btn btn-primary btn-block" onClick={onEnter}>
        Entrar a mi espacio
      </button>
      <Link to="/app/pausa" className="splash-quiet" onClick={onEnter}>
        Necesito una pausa ahora
      </Link>
    </div>
  );
}
