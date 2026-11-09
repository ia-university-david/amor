import { Link, NavLink, Outlet } from 'react-router-dom';
import { AUTHOR, LINKS } from '../content/links';
import { useApp } from '../state/AppContext';
import { Icon, Logo } from './Icon';
import { InstallPrompt } from './InstallPrompt';

export function PublicLayout() {
  const { settings } = useApp();
  const inApp = settings.onboardingComplete || settings.guest;
  return (
    <>
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <header className="public-header">
        <div className="inner">
          <Link to="/" className="brand" aria-label="Amor Tóxico, inicio">
            <Logo size={34} />
            <span>Amor Tóxico</span>
          </Link>
          <nav className="public-nav" aria-label="Principal">
            <NavLink to="/blog" className="hide-sm">
              Artículos
            </NavLink>
            <NavLink to="/test" className="hide-sm">
              Test
            </NavLink>
            <NavLink to="/guia-72-horas" className="hide-sm">
              Guía 72 horas
            </NavLink>
            <Link to={inApp ? '/app' : '/bienvenida'} className="btn btn-primary btn-sm" style={{ color: undefined }}>
              {inApp ? 'Mi espacio' : 'Comenzar'}
            </Link>
          </nav>
        </div>
      </header>
      <main id="contenido">
        <Outlet />
      </main>
      <footer className="public-footer">
        <div className="container stack">
          <div className="row between" style={{ alignItems: 'flex-start' }}>
            <div style={{ maxWidth: 420 }}>
              <div className="brand" style={{ marginBottom: '0.5rem' }}>
                <Logo size={28} /> Amor Tóxico
              </div>
              <p>
                Un espacio de acompañamiento y educación emocional inspirado en el trabajo de {AUTHOR.name}. No es terapia ni atención
                médica automatizada, y no reemplaza a un profesional de la salud mental.
              </p>
            </div>
            <nav aria-label="Pie de página" className="stack" style={{ ['--gap' as string]: '0.4rem' }}>
              <Link to="/blog">Artículos</Link>
              <Link to="/test">¿Tienes un amor tóxico?</Link>
              <Link to="/guia-72-horas">Guía de las primeras 72 horas</Link>
              <Link to="/privacidad">Privacidad</Link>
              <Link to="/contacto">Contacto</Link>
            </nav>
            <div className="row">
              <a className="icon-btn" href={LINKS.instagram} target="_blank" rel="noreferrer" aria-label="Instagram @lamortoxico">
                <Icon name="instagram" />
              </a>
              <a className="icon-btn" href={LINKS.youtube} target="_blank" rel="noreferrer" aria-label="YouTube @lamortoxico">
                <Icon name="youtube" />
              </a>
            </div>
          </div>
          <p className="small">
            Si estás en peligro, llama al número de emergencias de tu país. © {new Date().getFullYear()} amortoxico.com
          </p>
        </div>
      </footer>
      <InstallPrompt />
    </>
  );
}
