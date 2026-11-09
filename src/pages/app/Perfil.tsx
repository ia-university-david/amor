import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { TrustedContactsManager } from '../../components/TrustedContacts';
import { Modal, Notice, PageHeader, formatDate } from '../../components/ui';
import { MODULES } from '../../content/program';
import { data } from '../../lib/data';
import type { UrgeEvent } from '../../lib/events';
import { Seo } from '../../components/Seo';
import { AccountSection, BackupSection, MemorySection, RemindersSection } from './PerfilSections';
import { useModuleProgress } from '../../lib/progress';
import { useCollection } from '../../lib/useCollection';
import { useApp } from '../../state/AppContext';

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card stack" aria-labelledby={`${id ?? title}-h`} style={{ scrollMarginTop: '5rem' }}>
      <h2 id={`${id ?? title}-h`} style={{ fontSize: '1.25rem', margin: 0 }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function Perfil() {
  const { profile, session, settings, updateSettings, resetAll } = useApp();
  const navigate = useNavigate();
  const { completed } = useModuleProgress();
  const events = useCollection<UrgeEvent>('events');
  const diary = useCollection<unknown>('diary');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [memoryOffPrompt, setMemoryOffPrompt] = useState(false);

  const pauses = events.items.filter((e) => e.value.kind === 'pausa').length;
  const done = MODULES.filter((m) => completed[m.id]).length;

  const exportData = async () => {
    const dump = await data().exportAll();
    const blob = new Blob([JSON.stringify({ exportadoEl: new Date().toISOString(), app: 'Amor Tóxico', datos: dump }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amor-toxico-mis-datos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="stack" style={{ ['--gap' as string]: '1.25rem' }}>
      <PageHeader eyebrow="Perfil" title={profile?.name ? profile.name : 'Tu perfil'} subtitle={session ? session.email : 'Modo invitado'} />
      <Seo title="Perfil" noindex />

      {!settings.onboardingComplete && (
        <Notice icon="user">
          Estás en modo invitado. <Link to="/bienvenida?paso=registro">Crea tu perfil</Link> para guardar tu diario y recibir un plan
          personalizado.
        </Notice>
      )}

      <Section title="En números (solo para ti)">
        <div className="grid" style={{ ['--min' as string]: '140px' }}>
          <div>
            <div className="stat">{pauses}</div>
            <p className="small muted" style={{ margin: 0 }}>
              pausas registradas
            </p>
          </div>
          <div>
            <div className="stat">{diary.items.length}</div>
            <p className="small muted" style={{ margin: 0 }}>
              entradas de diario
            </p>
          </div>
          <div>
            <div className="stat">{done}</div>
            <p className="small muted" style={{ margin: 0 }}>
              actividades completadas
            </p>
          </div>
        </div>
        {profile?.createdAt && <p className="small muted">Empezaste el {formatDate(profile.createdAt, { dateStyle: 'long' })}.</p>}
      </Section>

      <Section title="Apariencia y movimiento">
        <div className="field">
          <label htmlFor="theme">Tema</label>
          <select id="theme" value={settings.theme} onChange={(e) => updateSettings({ theme: e.target.value as typeof settings.theme })}>
            <option value="system">Según mi dispositivo</option>
            <option value="light">Claro</option>
            <option value="dark">Oscuro</option>
          </select>
        </div>
        <label className="check">
          <input type="checkbox" checked={settings.reducedMotion} onChange={(e) => updateSettings({ reducedMotion: e.target.checked })} />
          <span>
            Reducir animaciones
            <span className="muted small" style={{ display: 'block', fontWeight: 400 }}>
              También respetamos la preferencia de movimiento reducido de tu sistema.
            </span>
          </span>
        </label>
      </Section>

      <Section id="cuenta" title="Cuenta">
        <AccountSection />
      </Section>

      <Section id="notificaciones" title="Recordatorios">
        <RemindersSection />
      </Section>

      <Section id="contactos" title="Contactos de confianza">
        <TrustedContactsManager />
      </Section>

      <Section id="permisos" title="Permisos y privacidad">
        <label className="check">
          <input
            type="checkbox"
            checked={settings.consents.memory}
            onChange={(e) => {
              if (!e.target.checked) setMemoryOffPrompt(true);
              void updateSettings({ consents: { ...settings.consents, memory: e.target.checked } });
            }}
          />
          <span>
            Memoria personalizada
            <span className="muted small" style={{ display: 'block', fontWeight: 400 }}>
              Guardar mis conversaciones con el asistente (cifradas, en este dispositivo).
            </span>
          </span>
        </label>
        {memoryOffPrompt && (
          <Notice>
            Memoria desactivada. ¿Quieres borrar también las conversaciones ya guardadas?{' '}
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={async () => {
                await data().remove('chat', 'history');
                await data().remove('chat', 'memories');
                setMemoryOffPrompt(false);
              }}
            >
              Borrarlas
            </button>
          </Notice>
        )}
        <label className="check">
          <input type="checkbox" checked={settings.consents.aiSensitive} onChange={(e) => updateSettings({ consents: { ...settings.consents, aiSensitive: e.target.checked } })} />
          <span>
            Análisis de texto sensible por la IA
            <span className="muted small" style={{ display: 'block', fontWeight: 400 }}>
              Permitir que el asistente interprete lo que escribo libremente. La detección de riesgo por seguridad siempre se hace en este
              dispositivo.
            </span>
          </span>
        </label>
        <Link to="/privacidad" className="small">
          Leer la política de privacidad
        </Link>
      </Section>

      <Section id="memoria" title="Lo que recuerda el asistente">
        <MemorySection />
      </Section>

      <Section id="copia" title="Copia cifrada de extremo a extremo">
        <BackupSection />
      </Section>

      <Section title="Tus datos en este dispositivo">
        <p className="small muted" style={{ margin: 0 }}>
          Descarga una copia de todo lo que has guardado (descifrado, en formato JSON) o bórralo por completo de este dispositivo.
        </p>
        <div className="row">
          <button type="button" className="btn btn-outline" onClick={exportData}>
            <Icon name="download" size={18} /> Exportar mis datos
          </button>
          <button type="button" className="btn btn-outline" style={{ color: 'var(--danger)' }} onClick={() => setDeleteOpen(true)}>
            <Icon name="trash" size={18} /> Borrar todos mis datos
          </button>
        </div>
      </Section>

      {deleteOpen && (
        <Modal title="Borrar todos tus datos" onClose={() => setDeleteOpen(false)}>
          <div className="stack">
            <p>
              Se eliminarán de este dispositivo tu perfil, tu diario, tus mensajes, tus registros, tus conversaciones, tus contactos y la clave de
              cifrado. <strong>No se puede deshacer.</strong>
            </p>
            <p className="small">Si quieres conservar una copia, exporta tus datos antes.</p>
            <div className="field">
              <label htmlFor="confirm-del">
                Escribe <strong>BORRAR</strong> para confirmar
              </label>
              <input id="confirm-del" type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
            </div>
            <button
              type="button"
              className="btn btn-danger"
              disabled={confirmText.trim().toUpperCase() !== 'BORRAR'}
              onClick={async () => {
                await resetAll();
                navigate('/', { replace: true });
              }}
            >
              Borrar definitivamente
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
