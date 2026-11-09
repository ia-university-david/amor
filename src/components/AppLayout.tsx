import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { useOnline } from '../lib/pwa';
import { Icon, Logo, type IconName } from './Icon';
import { InstallPrompt } from './InstallPrompt';

const MAIN_NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/app', label: 'Inicio', icon: 'home', end: true },
  { to: '/app/camino', label: 'Mi Camino', icon: 'path' },
  { to: '/app/pausa', label: 'Pausa', icon: 'pause' },
  { to: '/app/espacio', label: 'Mi Espacio', icon: 'space' },
  { to: '/app/perfil', label: 'Perfil', icon: 'user' },
];

const SECONDARY_NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/app/asistente', label: 'Hablar con el asistente', icon: 'chat' },
  { to: '/app/cerebro', label: 'Tu cerebro', icon: 'brain' },
  { to: '/app/limites', label: 'Contacto y límites', icon: 'shield' },
  { to: '/app/dificil', label: 'Hoy fue difícil', icon: 'cloud' },
  { to: '/app/biblioteca', label: 'Biblioteca', icon: 'library' },
];

export function AppLayout() {
  const { ready, settings } = useApp();
  const location = useLocation();
  const online = useOnline();

  if (!ready) {
    return (
      <div className="empty" style={{ paddingTop: '30vh' }} aria-busy="true">
        <Logo size={48} />
        <p>Preparando tu espacio…</p>
      </div>
    );
  }
  if (!settings.onboardingComplete && !settings.guest) return <Navigate to="/bienvenida" replace />;

  const onPause = location.pathname.startsWith('/app/pausa');

  return (
    <div className="app">
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <aside className="side-nav" aria-label="Navegación de la app">
        <Link to="/app" className="brand">
          <Logo size={32} /> Amor Tóxico
        </Link>
        {MAIN_NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <Icon name={n.icon} /> {n.label}
          </NavLink>
        ))}
        <hr style={{ border: 0, borderTop: '1px solid var(--border)', width: '100%', margin: '0.75rem 0' }} />
        {SECONDARY_NAV.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <Icon name={n.icon} /> {n.label}
          </NavLink>
        ))}
        <div className="spacer" />
        <Link to="/" className="nav-link muted small">
          <Icon name="back" size={18} /> Sitio público
        </Link>
      </aside>

      <div>
        <div className="app-topbar">
          <Link to="/app" className="brand">
            <Logo size={30} /> Amor Tóxico
          </Link>
          <Link to="/app/asistente" className="icon-btn" aria-label="Hablar con el asistente">
            <Icon name="chat" />
          </Link>
        </div>
        <main id="contenido" className="app-main">
          {settings.guest && !settings.onboardingComplete && (
            <div className="notice" style={{ marginBottom: '1rem', maxWidth: 920, marginInline: 'auto' }}>
              <Icon name="eye" size={20} />
              <div>
                Estás explorando en modo invitado. Algunas secciones estarán disponibles cuando crees tu perfil.{' '}
                <Link to="/bienvenida?paso=registro">Crear mi perfil</Link>
              </div>
            </div>
          )}
          <div className="app-content">
            <Outlet />
          </div>
        </main>
      </div>

      {!onPause && (
        <Link to="/app/pausa" className="pause-fab">
          <Icon name="pause" size={20} /> Necesito una pausa
        </Link>
      )}

      <nav className="bottom-nav" aria-label="Navegación principal">
        {MAIN_NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) => `${isActive ? 'active' : ''} ${n.icon === 'pause' ? 'pause-tab' : ''}`}
          >
            {n.icon === 'pause' ? (
              <span className="pill">
                <Icon name="pause" />
              </span>
            ) : (
              <Icon name={n.icon} />
            )}
            {n.label}
          </NavLink>
        ))}
      </nav>

      {!online && (
        <div className="offline-banner" role="status">
          Sin conexión. Tus herramientas siguen disponibles.
        </div>
      )}
      <InstallPrompt />
    </div>
  );
}

export function RequireProfile({ children }: { children: React.ReactNode }) {
  const { settings } = useApp();
  if (settings.onboardingComplete) return <>{children}</>;
  return (
    <div className="card empty">
      <span className="card-icon">
        <Icon name="lock" />
      </span>
      <h2>Esta sección necesita tu perfil</h2>
      <p>Para guardar tu diario, mensajes y conversaciones de forma privada y cifrada, crea primero tu perfil. Solo toma unos minutos.</p>
      <Link to="/bienvenida?paso=registro" className="btn btn-primary">
        Crear mi perfil
      </Link>
    </div>
  );
}
