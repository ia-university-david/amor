import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { auth, MIN_PASSWORD_LENGTH, type AuthProviders, type Session } from '../lib/auth';
import { useApp } from '../state/AppContext';
import { Icon } from './Icon';
import { Notice } from './ui';

export const COUNTRIES = [
  'Argentina', 'Bolivia', 'Chile', 'Colombia', 'Costa Rica', 'Cuba', 'Ecuador', 'El Salvador', 'España', 'Estados Unidos',
  'Guatemala', 'Honduras', 'México', 'Nicaragua', 'Panamá', 'Paraguay', 'Perú', 'Puerto Rico', 'República Dominicana',
  'Uruguay', 'Venezuela', 'Otro',
];

export type AuthMode = 'registro' | 'login' | 'enlace' | 'olvido';

export interface AuthExtra {
  country?: string;
  language?: string;
  adultConfirmed: boolean;
}

const linkBtn: React.CSSProperties = { border: 0, background: 'none', color: 'var(--indigo)', cursor: 'pointer', padding: 0, font: 'inherit', textDecoration: 'underline' };

export function AuthForm({ initialMode = 'registro', onDone, compact }: { initialMode?: AuthMode; onDone: (s: Session, extra: AuthExtra) => Promise<void> | void; compact?: boolean }) {
  const { server } = useApp();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [providers, setProviders] = useState<AuthProviders | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('');
  const [adult, setAdult] = useState(false);
  const [sync, setSync] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    auth.providers().then(setProviders);
  }, [server.online]);

  const offline = auth.mode === 'remote' && providers !== null && !providers.password;

  const run = async (fn: () => Promise<void>) => {
    setError('');
    setInfo('');
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      if (mode === 'registro') {
        if (!adult) return setError('Para continuar, confirma que eres mayor de edad.');
        const r = await auth.register({ name, email, password, adultConfirmed: true, consents: { sync } });
        if (!r.ok || !r.session) return setError(r.error ?? 'No se pudo crear la cuenta.');
        await onDone(r.session, { country: country || undefined, language: 'es', adultConfirmed: true });
      } else if (mode === 'login') {
        const r = await auth.login(email, password);
        if (!r.ok || !r.session) return setError(r.error ?? 'No se pudo iniciar sesión.');
        await onDone(r.session, { adultConfirmed: Boolean(r.session.adultConfirmed) });
      } else if (mode === 'enlace') {
        const r = await auth.requestMagicLink(email, { name: name || undefined, adultConfirmed: adult || undefined });
        if (!r.ok) return setError(r.error ?? 'No se pudo enviar el enlace.');
        setInfo(r.message ?? 'Revisa tu correo: te enviamos un enlace para entrar.');
      } else {
        const r = await auth.forgotPassword(email);
        if (!r.ok) return setError(r.error ?? 'No se pudo enviar el correo.');
        setInfo(r.message ?? 'Si el correo es correcto, te llegará un enlace para elegir una contraseña nueva.');
      }
    });
  };

  const titles: Record<AuthMode, string> = {
    registro: 'Crea tu cuenta',
    login: 'Inicia sesión',
    enlace: 'Entrar con un enlace por correo',
    olvido: 'Recuperar tu contraseña',
  };

  return (
    <form className="fade-in" onSubmit={submit} noValidate aria-busy={busy}>
      {!compact && <h2>{titles[mode]}</h2>}
      <p className="muted">
        {mode === 'registro' && 'Puedes usar un seudónimo. '}
        {mode === 'registro' || mode === 'enlace' || mode === 'olvido' ? (
          <button type="button" style={linkBtn} onClick={() => setMode('login')}>
            Ya tengo una cuenta
          </button>
        ) : (
          <button type="button" style={linkBtn} onClick={() => setMode('registro')}>
            Crear una cuenta nueva
          </button>
        )}
      </p>

      {offline && (
        <Notice tone="warn" icon="info">
          No hay conexión con el servidor en este momento. Puedes seguir en modo invitado: todas las herramientas funcionan en tu dispositivo.
        </Notice>
      )}

      {(mode === 'registro' || mode === 'enlace') && (
        <div className="field">
          <label htmlFor="r-name">
            Nombre o seudónimo {mode === 'enlace' && <span className="hint">(solo si es tu primera vez)</span>}
          </label>
          <input id="r-name" type="text" autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </div>
      )}
      <div className="field">
        <label htmlFor="r-email">Correo electrónico</label>
        <input id="r-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      {(mode === 'registro' || mode === 'login') && (
        <div className="field">
          <label htmlFor="r-pass">
            Contraseña {mode === 'registro' && <span className="hint">(mínimo {MIN_PASSWORD_LENGTH} caracteres)</span>}
          </label>
          <input id="r-pass" type="password" autoComplete={mode === 'registro' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
          {mode === 'login' && (
            <p className="small" style={{ margin: '0.4rem 0 0' }}>
              <button type="button" style={linkBtn} onClick={() => setMode('olvido')}>
                Olvidé mi contraseña
              </button>
            </p>
          )}
        </div>
      )}
      {mode === 'registro' && (
        <div className="field">
          <label htmlFor="r-country">País</label>
          <select id="r-country" value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">Prefiero no decirlo</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}
      {(mode === 'registro' || mode === 'enlace') && (
        <label className="check" style={{ marginBottom: '0.75rem' }}>
          <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
          <span>Confirmo que soy mayor de edad.</span>
        </label>
      )}
      {mode === 'registro' && (
        <label className="check" style={{ marginBottom: '1rem' }}>
          <input type="checkbox" checked={sync} onChange={(e) => setSync(e.target.checked)} />
          <span>
            Guardar mi progreso en mi cuenta
            <span className="muted small" style={{ display: 'block' }}>
              Plan, avances, límites, contadores y registros de ánimo, para recuperarlos en otro dispositivo. Tu diario, tus mensajes sin enviar y tus
              conversaciones nunca se sincronizan.
            </span>
          </span>
        </label>
      )}

      {error && (
        <p role="alert" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}
      {info && (
        <div role="status">
          <Notice icon="mail">{info}</Notice>
        </div>
      )}
      <button type="submit" className="btn btn-primary btn-block" disabled={busy || offline}>
        {busy ? 'Un momento…' : mode === 'registro' ? 'Crear mi cuenta' : mode === 'login' ? 'Entrar' : 'Enviarme el enlace'}
      </button>

      <div className="stack" style={{ marginTop: '1rem', ['--gap' as string]: '0.5rem' }}>
        {mode !== 'enlace' && providers?.magicLink && (
          <button type="button" className="btn btn-outline btn-block" onClick={() => setMode('enlace')}>
            <Icon name="mail" size={18} /> Recibir un enlace de acceso por correo
          </button>
        )}
        {(['google', 'apple'] as const).map((p) =>
          providers?.[p] ? (
            <a key={p} className="btn btn-outline btn-block" href={auth.oauthUrl(p)}>
              Continuar con {p === 'google' ? 'Google' : 'Apple'}
            </a>
          ) : (
            <button key={p} type="button" className="btn btn-outline btn-block" disabled aria-describedby="sso-note">
              Continuar con {p === 'google' ? 'Google' : 'Apple'}
            </button>
          ),
        )}
        {providers && (!providers.google || !providers.apple) && (
          <p id="sso-note" className="small muted" style={{ textAlign: 'center', margin: 0 }}>
            {!providers.google && !providers.apple ? 'Google y Apple' : !providers.google ? 'Google' : 'Apple'} estará disponible cuando se configure en el servidor.
          </p>
        )}
        {server.devMailbox && (
          <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>
            Modo desarrollo: los correos se muestran en <Link to="/cuenta/buzon-dev">el buzón de pruebas</Link>.
          </p>
        )}
      </div>
      {auth.mode === 'local-dev' && (
        <Notice icon="info">Modo local de desarrollo: la cuenta existe solo en este dispositivo.</Notice>
      )}
    </form>
  );
}
