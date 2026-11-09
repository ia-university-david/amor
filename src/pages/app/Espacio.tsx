import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon, type IconName } from '../../components/Icon';
import { EmptyState, Modal, PageHeader, formatDate } from '../../components/ui';
import { TOOLS } from '../../content/tools';
import type { Collection } from '../../lib/data';
import { useCollection } from '../../lib/useCollection';
import { useApp } from '../../state/AppContext';

interface Note {
  title?: string;
  text: string;
  createdAt: string;
}

const SECTIONS: { id: string; label: string; icon: IconName }[] = [
  { id: 'diario', label: 'Diario', icon: 'book' },
  { id: 'notas', label: 'Recuerdos y notas', icon: 'heart' },
  { id: 'sin-enviar', label: 'Sin enviar', icon: 'pen' },
  { id: 'recordatorios', label: 'Recordatorios', icon: 'bell' },
  { id: 'herramientas', label: 'Herramientas', icon: 'grid' },
];

function NotesSection({
  collection,
  prompt,
  placeholder,
  emptyTitle,
  emptyText,
  withTitle,
  extraAction,
}: {
  collection: Collection;
  prompt: string;
  placeholder: string;
  emptyTitle: string;
  emptyText: string;
  withTitle?: boolean;
  extraAction?: (note: Note) => React.ReactNode;
}) {
  const { items, add, update, remove, loading } = useCollection<Note>(collection);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<{ id: string; note: Note } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <div className="stack">
      <form
        className="card stack"
        style={{ ['--gap' as string]: '0.6rem' }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim()) return;
          await add({ title: title.trim() || undefined, text: text.trim(), createdAt: new Date().toISOString() });
          setTitle('');
          setText('');
        }}
      >
        <label htmlFor={`${collection}-text`}>{prompt}</label>
        {withTitle && (
          <input type="text" aria-label="Título (opcional)" placeholder="Título (opcional)" value={title} onChange={(e) => setTitle(e.target.value)} />
        )}
        <textarea id={`${collection}-text`} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} />
        <div className="row between">
          <span className="small muted">
            <Icon name="lock" size={14} /> Cifrado en este dispositivo
          </span>
          <button type="submit" className="btn btn-primary btn-sm" disabled={!text.trim()}>
            Guardar
          </button>
        </div>
      </form>

      {!loading && items.length === 0 ? (
        <EmptyState icon="book" title={emptyTitle}>
          <p className="small">{emptyText}</p>
        </EmptyState>
      ) : (
        <ul className="list">
          {items.map(({ id, value }) => (
            <li key={id} className="card">
              <div className="row between" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <p className="small muted" style={{ margin: 0 }}>
                    {formatDate(value.createdAt)}
                  </p>
                  {value.title && <h3 style={{ margin: '0.25rem 0' }}>{value.title}</h3>}
                  <p style={{ margin: '0.25rem 0 0', whiteSpace: 'pre-wrap' }}>{value.text}</p>
                </div>
                <div className="row" style={{ flexWrap: 'nowrap', gap: 0 }}>
                  <button type="button" className="icon-btn" aria-label="Editar" onClick={() => setEditing({ id, note: value })}>
                    <Icon name="edit" size={18} />
                  </button>
                  <button type="button" className="icon-btn" aria-label="Eliminar" onClick={() => setConfirmDelete(id)}>
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              </div>
              {extraAction?.(value)}
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Modal title="Editar" onClose={() => setEditing(null)}>
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              await update(editing.id, editing.note);
              setEditing(null);
            }}
          >
            {withTitle && (
              <input type="text" aria-label="Título" value={editing.note.title ?? ''} onChange={(e) => setEditing({ ...editing, note: { ...editing.note, title: e.target.value } })} />
            )}
            <textarea aria-label="Texto" value={editing.note.text} onChange={(e) => setEditing({ ...editing, note: { ...editing.note, text: e.target.value } })} style={{ minHeight: 200 }} />
            <button type="submit" className="btn btn-primary">
              Guardar cambios
            </button>
          </form>
        </Modal>
      )}
      {confirmDelete && (
        <Modal title="¿Eliminar esta entrada?" onClose={() => setConfirmDelete(null)}>
          <p>Se eliminará de este dispositivo y no se podrá recuperar.</p>
          <div className="row">
            <button
              type="button"
              className="btn btn-danger"
              onClick={async () => {
                await remove(confirmDelete);
                setConfirmDelete(null);
              }}
            >
              Eliminar
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function Espacio() {
  const [params, setParams] = useSearchParams();
  const section = params.get('seccion') ?? 'diario';
  const { updateProfile, profile } = useApp();

  return (
    <div>
      <PageHeader eyebrow="Mi Espacio" title="Tu lugar privado" subtitle="Todo lo que guardas aquí está cifrado y solo vive en este dispositivo." />
      <div className="tabs" role="tablist" aria-label="Secciones de Mi Espacio">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={section === s.id}
            className="chip"
            aria-pressed={section === s.id}
            onClick={() => setParams({ seccion: s.id }, { replace: true })}
          >
            <Icon name={s.icon} size={16} /> {s.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" key={section} className="fade-in">
        {section === 'diario' && (
          <NotesSection
            collection="diary"
            prompt="¿Cómo llegas hoy?"
            placeholder="No tienes que explicarlo todo. Unas líneas son suficientes."
            emptyTitle="Tu diario está vacío"
            emptyText="Escribir unas líneas al día puede ayudarte a notar cómo cambias. Si alguna vez sientes que escribir te hace dar vueltas a lo mismo, está bien parar."
          />
        )}
        {section === 'notas' && (
          <NotesSection
            collection="notes"
            withTitle
            prompt="Un recuerdo, una idea o algo que quieras guardar"
            placeholder="Puede ser algo de la relación que quieras recordar con honestidad, o algo tuyo que quieras recuperar."
            emptyTitle="Sin notas todavía"
            emptyText="Aquí puedes guardar recuerdos, ideas o cosas que quieras recuperar de ti."
          />
        )}
        {section === 'sin-enviar' && (
          <NotesSection
            collection="unsent"
            prompt="Lo que te gustaría decirle (no se enviará)"
            placeholder="Escríbelo aquí. Nadie más lo leerá."
            emptyTitle="Ningún mensaje sin enviar"
            emptyText="Cuando sientas ganas de escribirle, puedes hacerlo aquí primero. Muchas veces, escribirlo ya es suficiente."
          />
        )}
        {section === 'recordatorios' && (
          <NotesSection
            collection="reminders"
            prompt="Un recordatorio para ti"
            placeholder="Una frase, una rutina para la noche, un plan para las próximas horas…"
            emptyTitle="Sin recordatorios"
            emptyText="Escribe frases o planes que quieras tener a mano en los momentos difíciles."
            extraAction={(note) =>
              profile?.reminder === note.text ? (
                <span className="badge ok" style={{ marginTop: '0.5rem' }}>
                  Recordatorio principal
                </span>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => updateProfile({ reminder: note.text })}>
                  Usar como mi recordatorio principal
                </button>
              )
            }
          />
        )}
        {section === 'herramientas' && (
          <div className="grid">
            {Object.values(TOOLS).map((t) => (
              <Link key={t.id} to={t.to} className="card card-link">
                <span className="card-icon">
                  <Icon name={t.icon} />
                </span>
                <h3>{t.title}</h3>
                <p className="small muted" style={{ margin: 0 }}>
                  {t.description}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
