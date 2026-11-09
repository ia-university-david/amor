import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthForm, type AuthExtra, type AuthMode } from '../../components/AuthForm';
import { Icon, Logo } from '../../components/Icon';
import { Seo } from '../../components/Seo';
import { Notice } from '../../components/ui';
import { api } from '../../lib/api';
import { auth, MIN_PASSWORD_LENGTH, type Session } from '../../lib/auth';
import { data } from '../../lib/data';
import { syncEngine } from '../../lib/sync';
import { useApp, type Settings } from '../../state/AppContext';

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="container section" style={{ maxWidth: 520 }}>
      <Seo title={title} noindex />
      <div className="card stack">
        <div className="row" style={{ gap: '0.6rem' }}>
          <Logo size={30} />
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

function useAfterAuth() {
  const { setSession, updateProfile, profile } = useApp();
  const navigate = useNavigate();
  return async (s: Session, extra?: Partial<AuthExtra>) => {
    setSession(s);
    await updateProfile({ name: profile?.name || s.name, email: s.email, ...(extra?.country ? { country: extra.country } : {}), adultConfirmed: s.adultConfirmed ?? extra?.adultConfirmed });
    navigate('/cuenta/listo', { replace: true });
  };
}

export function SignIn() {
  const [params] = useSearchParams();
  const after = useAfterAuth();
  const mode = (params.get('modo') as AuthMode | null) ?? 'login';
  return (
    <Shell title="Tu cuenta">
      {params.get('error') === 'oauth' && (
        <Notice tone="warn" icon="alert">
          No pudimos completar el acceso con ese proveedor. Puedes intentarlo otra vez o entrar con tu correo.
        </Notice>
      )}
      <AuthForm initialMode={mode} onDone={after} compact />
      <p className="small muted" style={{ margin: 0 }}>
        ¿Prefieres no crear una cuenta? <Link to="/app">Explora en modo invitado</Link>: tus datos se quedan solo en este dispositivo.
      </p>
    </Shell>
  );
}

/** Landing point after any sign-in: confirms age, pulls synced data and routes to the right place. */
export function AccountReady() {
  const { refreshSession, updateSettings } = useApp();
  const navigate = useNavigate();
  const once = useRef(false);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    (async () => {
      const s = await refreshSession();
      if (!s) return navigate('/entrar', { replace: true });
      if (s.mode === 'remote' && !s.adultConfirmed) return navigate('/cuenta/confirmar-edad', { replace: true });
      if (s.consents?.sync) {
        await syncEngine.enable();
        await syncEngine.syncNow();
      }
      const settings = await data().get<Settings>('settings', 'app');
      if (settings?.onboardingComplete) {
        await updateSettings({ ...settings, guest: false });
        navigate('/app', { replace: true });
      } else {
        navigate('/bienvenida?paso=identidad', { replace: true });
      }
    })();
  }, [navigate, refreshSession, updateSettings]);
  return (
    <div className="empty" style={{ paddingTop: '25vh' }} aria-busy="true">
      <Logo size={44} />
      <p>Preparando tu espacio…</p>
    </div>
  );
}

function useToken() {
  const [params] = useSearchParams();
  return params.get('token') ?? '';
}

export function VerifyEmail() {
  const token = useToken();
  const { refreshSession } = useApp();
  const [state, setState] = useState<'working' | 'ok' | 'error'>('working');
  const [error, setError] = useState('');
  const once = useRef(false);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    auth.verifyEmail(token).then(async (r) => {
      if (r.ok) {
        setState('ok');
        await refreshSession();
      } else {
        setState('error');
        setError(r.error ?? 'No se pudo confirmar.');
      }
    });
  }, [token, refreshSession]);
  return (
    <Shell title="Confirmar tu correo">
      {state === 'working' && <p aria-busy="true">Confirmando…</p>}
      {state === 'ok' && (
        <>
          <p role="status">Listo, tu correo está confirmado. Gracias.</p>
          <Link to="/app" className="btn btn-primary">
            Ir a mi espacio
          </Link>
        </>
      )}
      {state === 'error' && (
        <>
          <p role="alert">{error}</p>
          <Link to="/app/perfil#cuenta" className="btn btn-outline">
            Pedir un enlace nuevo desde Perfil
          </Link>
        </>
      )}
    </Shell>
  );
}

export function MagicLink() {
  const token = useToken();
  const after = useAfterAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Shell title="Entrar con tu enlace">
      <p className="muted">Por seguridad, el enlace solo funciona una vez y caduca en 15 minutos.</p>
      {error && <p role="alert">{error}</p>}
      <button
        type="button"
        className="btn btn-primary"
        disabled={busy || !token}
        onClick={async () => {
          setBusy(true);
          const r = await auth.consumeMagicLink(token);
          setBusy(false);
          if (r.ok && r.session) await after(r.session);
          else setError(r.error ?? 'El enlace no es válido.');
        }}
      >
        {busy ? 'Entrando…' : 'Entrar a mi espacio'}
      </button>
      {error && <Link to="/entrar?modo=enlace">Pedir un enlace nuevo</Link>}
    </Shell>
  );
}

export function ResetPassword() {
  const token = useToken();
  const after = useAfterAuth();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Shell title="Elige una contraseña nueva">
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (password !== repeat) return setError('Las contraseñas no coinciden.');
          setBusy(true);
          const r = await auth.resetPassword(token, password);
          setBusy(false);
          if (r.ok && r.session) await after(r.session);
          else setError(r.error ?? 'No se pudo cambiar la contraseña.');
        }}
      >
        <div className="field">
          <label htmlFor="np">
            Contraseña nueva <span className="hint">(mínimo {MIN_PASSWORD_LENGTH} caracteres)</span>
          </label>
          <input id="np" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="np2">Repítela</label>
          <input id="np2" type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
        </div>
        {error && <p role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          Guardar y entrar
        </button>
        <p className="small muted">Al cambiarla, se cerrará la sesión en tus otros dispositivos.</p>
      </form>
    </Shell>
  );
}

export function ConfirmAge() {
  const { signOut } = useApp();
  const navigate = useNavigate();
  const [adult, setAdult] = useState(false);
  const [minor, setMinor] = useState(false);
  const [error, setError] = useState('');
  if (minor) {
    return (
      <Shell title="Gracias por tu sinceridad">
        <p>Amor Tóxico está pensado para personas adultas, así que no podemos crear tu cuenta. Lo que sientes importa igual.</p>
        <p>Si estás pasando por algo difícil, habla con una persona adulta de confianza. Si estás en peligro, llama al número de emergencias de tu país.</p>
        <Link to="/" className="btn btn-outline">
          Volver al inicio
        </Link>
      </Shell>
    );
  }
  return (
    <Shell title="Antes de seguir">
      <p>Para usar Amor Tóxico necesitas ser mayor de edad.</p>
      <label className="check">
        <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
        <span>Confirmo que soy mayor de edad.</span>
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="row">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!adult}
          onClick={async () => {
            const r = await api('/account/confirm-age', { json: { adultConfirmed: true } });
            if (!r.ok) return setError(r.error ?? 'No se pudo guardar.');
            navigate('/cuenta/listo', { replace: true });
          }}
        >
          Continuar
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={async () => {
            await api('/account', { method: 'DELETE', json: { confirm: 'BORRAR' } });
            await signOut();
            setMinor(true);
          }}
        >
          No soy mayor de edad
        </button>
      </div>
    </Shell>
  );
}

export function ConfirmEbook() {
  const token = useToken();
  const [state, setState] = useState<'working' | 'ok' | 'error'>('working');
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState('');
  const once = useRef(false);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    api<{ ebookAvailable: boolean }>('/leads/confirm', { json: { token } }).then((r) => {
      if (r.ok) {
        setAvailable(Boolean(r.data?.ebookAvailable));
        setState('ok');
      } else {
        setError(r.error ?? 'No se pudo confirmar.');
        setState('error');
      }
    });
  }, [token]);
  return (
    <Shell title="Tu eBook">
      {state === 'working' && <p aria-busy="true">Confirmando…</p>}
      {state === 'ok' && (
        <p role="status">
          ¡Gracias por confirmar! {available ? 'Te enviamos el eBook a tu correo.' : 'Te lo enviaremos a tu correo en cuanto esté disponible.'}
        </p>
      )}
      {state === 'error' && <p role="alert">{error}</p>}
      <Link to="/bienvenida" className="btn btn-primary">
        Conocer la app
      </Link>
    </Shell>
  );
}

interface DevMail {
  to: string;
  subject: string;
  kind: string;
  text: string;
  at: string;
}

export function DevMailbox() {
  const [messages, setMessages] = useState<DevMail[] | null>(null);
  const load = () => api<{ messages: DevMail[] }>('/dev/mailbox').then((r) => setMessages(r.ok ? (r.data?.messages ?? []) : null));
  useEffect(() => {
    void load();
  }, []);
  return (
    <Shell title="Buzón de desarrollo">
      <Notice icon="info">Solo existe en desarrollo (EMAIL_TRANSPORT=console). En producción los correos se envían por SMTP o Resend.</Notice>
      <button type="button" className="btn btn-outline btn-sm" onClick={load}>
        Actualizar
      </button>
      {messages === null && <p>No disponible.</p>}
      {messages?.length === 0 && <p className="muted">Todavía no hay correos.</p>}
      {messages?.map((m, i) => {
        const url = /(https?:\/\/\S+token=\S+)/.exec(m.text)?.[1];
        const local = url ? new URL(url) : null;
        return (
          <article key={i} className="card stack" style={{ ['--gap' as string]: '0.3rem' }}>
            <strong>{m.subject}</strong>
            <span className="small muted">
              Para {m.to} · {new Date(m.at).toLocaleString('es')}
            </span>
            {local && (
              <Link to={local.pathname + local.search} className="btn btn-primary btn-sm">
                <Icon name="external" size={16} /> Abrir enlace
              </Link>
            )}
          </article>
        );
      })}
    </Shell>
  );
}
