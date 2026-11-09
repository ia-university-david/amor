import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Modal, Notice, formatDate } from '../../components/ui';
import { api } from '../../lib/api';
import { auth } from '../../lib/auth';
import { MIN_PASSPHRASE, backupMeta, createBackup, deleteBackup, restoreBackup } from '../../lib/backup';
import { data } from '../../lib/data';
import type { UrgeEvent } from '../../lib/events';
import { notificationPermission, requestNotificationPermission, showLocalNotification } from '../../lib/notifications';
import { detectPatterns } from '../../lib/patterns';
import {
  getPushPreferences,
  iosNeedsInstall,
  localTimezone,
  pushSupported,
  savePushPreferences,
  sendTestPush,
  subscribePush,
  unsubscribePush,
  type PushPreferences,
} from '../../lib/push';
import { useCollection } from '../../lib/useCollection';
import { useApp } from '../../state/AppContext';
import { loadMemories, saveMemories, type MemorySummary } from './Asistente';

function download(name: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const SYNC_LABEL = { off: 'Desactivada', idle: 'Al día', syncing: 'Sincronizando…', offline: 'Sin conexión (se enviará después)', error: 'Error al sincronizar' };

export function AccountSection() {
  const { session, server, syncStatus, setSyncConsent, signOut, resetAll } = useApp();
  const navigate = useNavigate();
  const [msg, setMsg] = useState<string | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);

  if (!session || session.mode !== 'remote') {
    return (
      <div className="stack">
        <p className="small muted" style={{ margin: 0 }}>
          Estás usando la app sin cuenta: todo se guarda solo en este dispositivo. Con una cuenta puedes sincronizar tu progreso entre
          dispositivos (tus textos libres siguen siendo solo tuyos).
        </p>
        {server.online ? (
          <div className="row">
            <Link to="/entrar?modo=registro" className="btn btn-primary">
              Crear cuenta
            </Link>
            <Link to="/entrar" className="btn btn-outline">
              Entrar
            </Link>
          </div>
        ) : (
          <p className="small muted">Las cuentas no están disponibles sin conexión con el servidor.</p>
        )}
      </div>
    );
  }

  return (
    <div className="stack">
      <p style={{ margin: 0 }}>
        <strong>{session.email}</strong>{' '}
        {session.emailVerified ? (
          <span className="badge">
            <Icon name="check" size={12} /> Verificado
          </span>
        ) : (
          <span className="badge">Sin verificar</span>
        )}
      </p>
      {!session.emailVerified && (
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={async () => {
            const r = await auth.requestVerification();
            setMsg(r.ok ? 'Te enviamos un enlace para verificar tu correo.' : (r.error ?? 'No se pudo enviar.'));
          }}
        >
          <Icon name="mail" size={16} /> Reenviar verificación
        </button>
      )}
      <p className="small" style={{ margin: 0 }}>
        Plan: <strong>{session.plan === 'premium' ? 'Premium' : 'Gratuito'}</strong> · <Link to="/app/planes">Ver planes</Link>
      </p>

      <label className="check">
        <input
          type="checkbox"
          checked={Boolean(session.consents?.sync)}
          onChange={async (e) => {
            const ok = await setSyncConsent(e.target.checked);
            setMsg(ok ? (e.target.checked ? 'Sincronización activada.' : 'Sincronización desactivada y copia del servidor borrada.') : 'No se pudo cambiar ahora.');
          }}
        />
        <span>
          Sincronizar mi progreso con mi cuenta
          <span className="muted small" style={{ display: 'block', fontWeight: 400 }}>
            Se sincronizan tu perfil básico, plan, avances, límites, contadores y estados de ánimo. Nunca tu diario, notas, cartas, reflexiones
            ni conversaciones. Al desactivarla, borramos la copia del servidor.
          </span>
        </span>
      </label>
      {session.consents?.sync && (
        <p className="small muted" style={{ margin: 0 }} role="status">
          <Icon name="cloud" size={14} /> {SYNC_LABEL[syncStatus]}
        </p>
      )}
      {msg && (
        <p className="small" role="status">
          {msg}
        </p>
      )}
      <div className="row">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setPwOpen(true)}>
          <Icon name="key" size={16} /> {session.hasPassword ? 'Cambiar contraseña' : 'Crear contraseña'}
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={async () => {
            const r = await api<unknown>('/account/export');
            if (r.ok) download(`amor-toxico-cuenta-${new Date().toISOString().slice(0, 10)}.json`, r.data);
            else setMsg(r.error ?? 'No se pudo exportar.');
          }}
        >
          <Icon name="download" size={16} /> Exportar datos de mi cuenta
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={async () => {
            await signOut();
            navigate('/app');
          }}
        >
          Cerrar sesión
        </button>
      </div>
      <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', alignSelf: 'flex-start' }} onClick={() => setDelOpen(true)}>
        <Icon name="trash" size={16} /> Eliminar mi cuenta
      </button>
      {pwOpen && <PasswordModal hasPassword={Boolean(session.hasPassword)} onClose={() => setPwOpen(false)} onDone={(m) => setMsg(m)} />}
      {delOpen && (
        <DeleteAccountModal
          hasPassword={Boolean(session.hasPassword)}
          onClose={() => setDelOpen(false)}
          onDeleted={async (wipeLocal) => {
            if (wipeLocal) await resetAll();
            else await signOut();
            navigate('/', { replace: true });
          }}
        />
      )}
    </div>
  );
}

function PasswordModal({ hasPassword, onClose, onDone }: { hasPassword: boolean; onClose: () => void; onDone: (msg: string) => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={hasPassword ? 'Cambiar contraseña' : 'Crear contraseña'} onClose={onClose}>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const r = await api('/account/password', { json: { current: hasPassword ? current : undefined, next } });
          setBusy(false);
          if (!r.ok) return setError(r.error ?? 'No se pudo cambiar.');
          onDone('Contraseña actualizada. Cerramos las demás sesiones abiertas.');
          onClose();
        }}
      >
        {hasPassword && (
          <div className="field">
            <label htmlFor="pw-current">Contraseña actual</label>
            <input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
        )}
        <div className="field">
          <label htmlFor="pw-next">Nueva contraseña (mínimo 8 caracteres)</label>
          <input id="pw-next" type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required />
        </div>
        {error && (
          <p className="small" role="alert" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy || next.length < 8}>
          Guardar
        </button>
      </form>
    </Modal>
  );
}

function DeleteAccountModal({ hasPassword, onClose, onDeleted }: { hasPassword: boolean; onClose: () => void; onDeleted: (wipeLocal: boolean) => void }) {
  const [confirm, setConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [wipeLocal, setWipeLocal] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Eliminar tu cuenta" onClose={onClose}>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const r = await api('/account', { method: 'DELETE', json: { confirm: 'BORRAR', password: hasPassword ? password : undefined } });
          setBusy(false);
          if (!r.ok) return setError(r.error ?? 'No se pudo eliminar.');
          onDeleted(wipeLocal);
        }}
      >
        <p>
          Borraremos tu cuenta, tus datos sincronizados, tu copia cifrada, tus suscripciones a avisos y tu seudónimo. Tus publicaciones en la
          comunidad quedarán anónimas como «Cuenta eliminada». <strong>No se puede deshacer.</strong>
        </p>
        <label className="check">
          <input type="checkbox" checked={wipeLocal} onChange={(e) => setWipeLocal(e.target.checked)} />
          <span>Borrar también todo lo guardado en este dispositivo</span>
        </label>
        {hasPassword && (
          <div className="field">
            <label htmlFor="del-pw">Tu contraseña</label>
            <input id="del-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
        )}
        <div className="field">
          <label htmlFor="del-confirm">
            Escribe <strong>BORRAR</strong> para confirmar
          </label>
          <input id="del-confirm" type="text" autoComplete="off" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && (
          <p className="small" role="alert" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-danger" disabled={busy || confirm.trim().toUpperCase() !== 'BORRAR'}>
          Eliminar definitivamente
        </button>
      </form>
    </Modal>
  );
}

const DEFAULT_PREFS: PushPreferences = { dailyEnabled: true, dailyTime: '21:00', nightEnabled: false, nightTime: '22:30', quietStart: null, quietEnd: null, timezone: 'UTC' };

export function RemindersSection() {
  const { settings, updateSettings, profile, session, server } = useApp();
  const [permission, setPermission] = useState(notificationPermission());
  const events = useCollection<UrgeEvent>('events');
  const nightPattern = detectPatterns(events.items.map((e) => e.value)).some((p) => p.id === 'noche');
  const canPush = server.push.enabled && Boolean(server.push.publicKey) && session?.mode === 'remote' && pushSupported();
  const [prefs, setPrefs] = useState<PushPreferences | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const usingPush = Boolean(settings.notifications.push);

  useEffect(() => {
    if (!canPush || !usingPush) return;
    void getPushPreferences().then((r) => r.ok && r.data && setPrefs(r.data.preferences));
  }, [canPush, usingPush]);

  const savePrefs = async (patch: Partial<PushPreferences>) => {
    const next = { ...(prefs ?? DEFAULT_PREFS), ...patch, timezone: localTimezone() };
    setPrefs(next);
    const r = await savePushPreferences(next);
    setMsg(r.ok ? 'Preferencias guardadas.' : (r.error ?? 'No se pudieron guardar.'));
  };

  return (
    <div className="stack">
      <p className="small muted" style={{ margin: 0 }}>
        Solo te enviaremos recordatorios si los activas. Los avisos nunca incluyen lo que escribes: solo un texto breve y general.
      </p>
      {canPush ? (
        usingPush ? (
          <>
            <label className="check">
              <input type="checkbox" checked={prefs?.dailyEnabled ?? false} onChange={(e) => savePrefs({ dailyEnabled: e.target.checked })} />
              <span>Recordatorio diario para registrar cómo estás</span>
            </label>
            <div className="row">
              <label htmlFor="push-daily" style={{ margin: 0 }}>
                Hora
              </label>
              <input id="push-daily" type="time" style={{ width: 140 }} value={prefs?.dailyTime ?? '21:00'} onChange={(e) => e.target.value && savePrefs({ dailyTime: e.target.value })} />
            </div>
            <label className="check">
              <input type="checkbox" checked={prefs?.nightEnabled ?? false} onChange={(e) => savePrefs({ nightEnabled: e.target.checked })} />
              <span>
                Acompañamiento nocturno
                <span className="muted small" style={{ display: 'block', fontWeight: 400 }}>
                  {nightPattern
                    ? 'Tus registros muestran que las noches suelen ser más difíciles. Un aviso suave puede recordarte que tu pausa está a un toque.'
                    : 'Un aviso suave por la noche que te recuerda que tu pausa está a un toque.'}
                </span>
              </span>
            </label>
            <div className="row">
              <label htmlFor="push-night" style={{ margin: 0 }}>
                Hora de la noche
              </label>
              <input id="push-night" type="time" style={{ width: 140 }} value={prefs?.nightTime ?? '22:30'} onChange={(e) => e.target.value && savePrefs({ nightTime: e.target.value })} />
            </div>
            <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, ['--gap' as string]: '0.4rem' }}>
              <legend className="small" style={{ fontWeight: 600 }}>
                Horas de silencio
              </legend>
              <div className="row">
                <label htmlFor="quiet-start" className="small" style={{ margin: 0 }}>
                  Desde
                </label>
                <input id="quiet-start" type="time" style={{ width: 130 }} value={prefs?.quietStart ?? ''} onChange={(e) => savePrefs({ quietStart: e.target.value || null })} />
                <label htmlFor="quiet-end" className="small" style={{ margin: 0 }}>
                  hasta
                </label>
                <input id="quiet-end" type="time" style={{ width: 130 }} value={prefs?.quietEnd ?? ''} onChange={(e) => savePrefs({ quietEnd: e.target.value || null })} />
              </div>
            </fieldset>
            <div className="row">
              <button type="button" className="btn btn-ghost btn-sm" onClick={async () => setMsg((await sendTestPush()).ok ? 'Aviso de prueba enviado.' : 'No se pudo enviar la prueba.')}>
                Probar
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={async () => {
                  await unsubscribePush();
                  await updateSettings({ notifications: { ...settings.notifications, enabled: false, push: false } });
                  setMsg('Avisos desactivados en este dispositivo.');
                }}
              >
                Desactivar en este dispositivo
              </button>
            </div>
          </>
        ) : (
          <>
            {iosNeedsInstall() && (
              <Notice icon="info">
                En iPhone y iPad los avisos solo llegan si añades la app a tu pantalla de inicio (Compartir → «Añadir a pantalla de inicio») y la
                abres desde ahí. Requiere iOS 16.4 o posterior.
              </Notice>
            )}
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const r = await subscribePush(server.push.publicKey!);
                setBusy(false);
                setPermission(notificationPermission());
                if (!r.ok) return setMsg(r.error ?? 'No se pudo activar.');
                await updateSettings({ notifications: { ...settings.notifications, enabled: true, push: true } });
                await savePrefs({ ...DEFAULT_PREFS, dailyTime: settings.notifications.time, nightEnabled: nightPattern });
              }}
            >
              <Icon name="bell" size={18} /> Activar recordatorios en este dispositivo
            </button>
          </>
        )
      ) : (
        <LocalReminders permission={permission} setPermission={setPermission} reminderText={profile?.reminder} />
      )}
      {msg && (
        <p className="small" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}

function LocalReminders({
  permission,
  setPermission,
  reminderText,
}: {
  permission: ReturnType<typeof notificationPermission>;
  setPermission: (p: ReturnType<typeof notificationPermission>) => void;
  reminderText?: string;
}) {
  const { settings, updateSettings } = useApp();
  if (permission === 'unsupported') return <p className="small">Tu navegador no admite notificaciones.</p>;
  if (permission !== 'granted') {
    return (
      <>
        <p className="small muted" style={{ margin: 0 }}>
          Sin cuenta, los recordatorios son locales: llegan mientras la app está abierta o en segundo plano reciente.
        </p>
        <button
          type="button"
          className="btn btn-outline"
          onClick={async () => {
            const p = await requestNotificationPermission();
            setPermission(p);
            if (p === 'granted') await updateSettings({ notifications: { ...settings.notifications, enabled: true } });
          }}
          disabled={permission === 'denied'}
        >
          <Icon name="bell" size={18} /> {permission === 'denied' ? 'Notificaciones bloqueadas en el navegador' : 'Permitir recordatorios'}
        </button>
      </>
    );
  }
  return (
    <>
      <label className="check">
        <input type="checkbox" checked={settings.notifications.enabled} onChange={(e) => updateSettings({ notifications: { ...settings.notifications, enabled: e.target.checked } })} />
        <span>Recordatorio diario</span>
      </label>
      <div className="row">
        <label htmlFor="rem-time" style={{ margin: 0 }}>
          Hora
        </label>
        <input
          id="rem-time"
          type="time"
          style={{ width: 140 }}
          value={settings.notifications.time}
          onChange={(e) => updateSettings({ notifications: { ...settings.notifications, time: e.target.value } })}
        />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => showLocalNotification('Amor Tóxico', reminderText || 'Un momento para ti: ¿cómo estás hoy?')}>
          Probar
        </button>
      </div>
    </>
  );
}

export function BackupSection() {
  const { session } = useApp();
  const [meta, setMeta] = useState<{ updatedAt: string; size: number } | null>(null);
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [mode, setMode] = useState<'none' | 'create' | 'restore'>('none');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const remote = session?.mode === 'remote';

  useEffect(() => {
    if (remote) void backupMeta().then(setMeta);
  }, [remote]);

  if (!remote) {
    return (
      <p className="small muted" style={{ margin: 0 }}>
        Con una cuenta puedes guardar una copia cifrada de extremo a extremo de todo (incluido tu diario). Solo tú tienes la frase para abrirla.
      </p>
    );
  }

  return (
    <div className="stack">
      <p className="small muted" style={{ margin: 0 }}>
        Tu diario, notas y cartas se cifran en este dispositivo con una frase que solo tú conoces antes de subirse. Nosotros no podemos leerla ni
        recuperarla: si olvidas la frase, la copia no se puede abrir.
      </p>
      <p className="small" style={{ margin: 0 }}>
        {meta ? `Última copia: ${formatDate(meta.updatedAt)} (${Math.max(1, Math.round(meta.size / 1024))} KB cifrados).` : 'Aún no tienes copia guardada.'}
      </p>
      {mode === 'none' ? (
        <div className="row">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setMode('create')}>
            <Icon name="cloudUp" size={16} /> {meta ? 'Actualizar copia' : 'Crear copia cifrada'}
          </button>
          {meta && (
            <>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setMode('restore')}>
                <Icon name="download" size={16} /> Restaurar
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={async () => {
                  if (await deleteBackup()) {
                    setMeta(null);
                    setMsg('Copia eliminada del servidor.');
                  }
                }}
              >
                <Icon name="trash" size={16} /> Borrar copia
              </button>
            </>
          )}
        </div>
      ) : (
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMsg(null);
            if (mode === 'create') {
              const r = await createBackup(pass);
              setMsg(r.ok ? 'Copia cifrada guardada.' : (r.error ?? 'No se pudo guardar.'));
              if (r.ok) setMeta(await backupMeta());
            } else {
              const r = await restoreBackup(pass);
              setMsg(r.ok ? `Restauramos ${r.restored} elementos. Recarga la página para verlos.` : (r.error ?? 'No se pudo restaurar.'));
            }
            setBusy(false);
            setPass('');
            setPass2('');
            setMode('none');
          }}
        >
          <div className="field">
            <label htmlFor="bk-pass">Frase de la copia (mínimo {MIN_PASSPHRASE} caracteres)</label>
            <input id="bk-pass" type="password" autoComplete="off" minLength={MIN_PASSPHRASE} value={pass} onChange={(e) => setPass(e.target.value)} required />
          </div>
          {mode === 'create' && (
            <div className="field">
              <label htmlFor="bk-pass2">Repite la frase</label>
              <input id="bk-pass2" type="password" autoComplete="off" value={pass2} onChange={(e) => setPass2(e.target.value)} required />
            </div>
          )}
          <div className="row">
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy || pass.length < MIN_PASSPHRASE || (mode === 'create' && pass !== pass2)}>
              {busy ? 'Cifrando…' : mode === 'create' ? 'Cifrar y guardar' : 'Descifrar y restaurar'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode('none')}>
              Cancelar
            </button>
          </div>
        </form>
      )}
      {msg && (
        <p className="small" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}

export function MemorySection() {
  const { settings } = useApp();
  const [items, setItems] = useState<MemorySummary[]>([]);
  useEffect(() => {
    void loadMemories().then(setItems);
  }, [settings.consents.memory]);
  if (!settings.consents.memory) {
    return (
      <p className="small muted" style={{ margin: 0 }}>
        La memoria está desactivada: el asistente no guarda conversaciones ni resúmenes.
      </p>
    );
  }
  return (
    <div className="stack">
      <p className="small muted" style={{ margin: 0 }}>
        Estos son los resúmenes que elegiste guardar. El asistente los usa para recordar el contexto; se guardan cifrados en este dispositivo y
        solo se envían junto a tu mensaje cuando conversas con la IA.
      </p>
      {items.length === 0 ? (
        <p className="small">No hay resúmenes guardados.</p>
      ) : (
        <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0, ['--gap' as string]: '0.5rem' }}>
          {items.map((m) => (
            <li key={m.id} className="card" style={{ padding: '0.75rem' }}>
              <p className="small" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {m.text}
              </p>
              <div className="row between" style={{ marginTop: '0.4rem' }}>
                <span className="small muted">{formatDate(m.at)}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={async () => {
                    const next = items.filter((x) => x.id !== m.id);
                    await saveMemories(next);
                    setItems(next);
                  }}
                >
                  <Icon name="trash" size={14} /> Borrar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {items.length > 0 && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ alignSelf: 'flex-start' }}
          onClick={async () => {
            await data().remove('chat', 'memories');
            setItems([]);
          }}
        >
          Borrar todos los resúmenes
        </button>
      )}
    </div>
  );
}
