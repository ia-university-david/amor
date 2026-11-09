import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon';
import { Modal, Notice, formatDate } from '../../components/ui';
import { EVIDENCE_LABELS, type EvidenceLevel, type LibraryEntry } from '../../content/library';
import type { ProductMessage } from '../../content/messages';
import { newId } from '../../lib/data';
import type { Lead } from '../../lib/leads';
import { useCollection } from '../../lib/useCollection';
import { useApp } from '../../state/AppContext';

const EMPTY_ENTRY: LibraryEntry = {
  id: '',
  title: '',
  authors: '',
  source: '',
  year: '',
  url: '',
  evidenceLevel: 'divulgacion',
  summary: '',
  limitations: '',
  reviewedAt: null,
};

export default function Admin() {
  const { messages, saveMessages, library, saveLibrary } = useApp();
  const [draft, setDraft] = useState<ProductMessage[]>(messages);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState<LibraryEntry | null>(null);
  const leads = useCollection<Lead>('leads');

  useEffect(() => setDraft(messages), [messages]);

  const saveAll = async () => {
    await saveMessages(draft.filter((m) => m.text.trim()));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const saveEntry = async (entry: LibraryEntry) => {
    const exists = library.some((l) => l.id === entry.id);
    const next = exists ? library.map((l) => (l.id === entry.id ? entry : l)) : [...library, { ...entry, id: entry.id || newId() }];
    await saveLibrary(next);
    setEditing(null);
  };

  const exportLeads = () => {
    const blob = new Blob([JSON.stringify(leads.items.map((l) => l.value), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formularios-locales.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container section stack" style={{ ['--gap' as string]: '2rem' }}>
      <header>
        <span className="eyebrow">Administración</span>
        <h1>Panel editorial</h1>
        <Notice tone="warn" icon="lock">
          <strong>Modo local de desarrollo.</strong> Los cambios se guardan solo en este navegador y cualquiera con acceso a él puede verlos.
          El acceso real por roles (editor, revisor, administrador) requiere el servidor y la autenticación de la fase 2.
        </Notice>
      </header>

      <section className="card stack" aria-labelledby="msg-h">
        <div className="row between">
          <h2 id="msg-h" style={{ margin: 0 }}>
            Mensajes del producto
          </h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => saveMessages(null)}>
            Restaurar originales
          </button>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          Aparecen en Inicio, en la pausa y como recordatorio del día.
        </p>
        {draft.map((m, i) => (
          <div key={m.id} className="row" style={{ flexWrap: 'nowrap' }}>
            <label htmlFor={`msg-${m.id}`} className="sr-only">
              Mensaje {i + 1}
            </label>
            <input
              id={`msg-${m.id}`}
              type="text"
              value={m.text}
              onChange={(e) => setDraft(draft.map((d) => (d.id === m.id ? { ...d, text: e.target.value } : d)))}
            />
            <button type="button" className="icon-btn" aria-label={`Eliminar mensaje ${i + 1}`} onClick={() => setDraft(draft.filter((d) => d.id !== m.id))}>
              <Icon name="trash" size={18} />
            </button>
          </div>
        ))}
        <div className="row">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setDraft([...draft, { id: newId(), text: '' }])}>
            <Icon name="plus" size={16} /> Añadir mensaje
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={saveAll}>
            Guardar mensajes
          </button>
          {saved && (
            <span className="badge ok" role="status">
              Guardado
            </span>
          )}
        </div>
      </section>

      <section className="card stack" aria-labelledby="lib-h">
        <div className="row between">
          <h2 id="lib-h" style={{ margin: 0 }}>
            Biblioteca editorial
          </h2>
          <div className="row">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => saveLibrary(null)}>
              Restaurar originales
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing({ ...EMPTY_ENTRY })}>
              <Icon name="plus" size={16} /> Nueva referencia
            </button>
          </div>
        </div>
        <table className="simple">
          <thead>
            <tr>
              <th>Referencia</th>
              <th>Evidencia</th>
              <th>Revisión</th>
              <th>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {library.map((l) => (
              <tr key={l.id}>
                <td>
                  <strong>{l.title}</strong>
                  <div className="muted small">
                    {l.authors} · {l.year}
                  </div>
                </td>
                <td className="small">{EVIDENCE_LABELS[l.evidenceLevel]}</td>
                <td className="small">{l.reviewedAt ? formatDate(l.reviewedAt, { dateStyle: 'medium' }) : <span className="badge warn">Pendiente</span>}</td>
                <td>
                  <div className="row" style={{ flexWrap: 'nowrap', gap: 0 }}>
                    <button type="button" className="icon-btn" aria-label={`Editar ${l.title}`} onClick={() => setEditing(l)}>
                      <Icon name="edit" size={18} />
                    </button>
                    <button type="button" className="icon-btn" aria-label={`Eliminar ${l.title}`} onClick={() => saveLibrary(library.filter((x) => x.id !== l.id))}>
                      <Icon name="trash" size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card stack" aria-labelledby="leads-h">
        <h2 id="leads-h" style={{ margin: 0 }}>
          Formularios guardados localmente
        </h2>
        <p className="small muted" style={{ margin: 0 }}>
          Envíos de eBook y contacto que no se mandaron a un servidor porque <code>VITE_LEADS_ENDPOINT</code> no está configurado.
        </p>
        <p style={{ margin: 0 }}>
          <strong>{leads.items.length}</strong> envíos en este navegador.
        </p>
        {leads.items.length > 0 && (
          <button type="button" className="btn btn-outline btn-sm" onClick={exportLeads}>
            <Icon name="download" size={16} /> Exportar JSON
          </button>
        )}
      </section>

      {editing && (
        <Modal title={editing.id ? 'Editar referencia' : 'Nueva referencia'} onClose={() => setEditing(null)}>
          <form
            className="stack"
            style={{ ['--gap' as string]: '0.25rem' }}
            onSubmit={(e) => {
              e.preventDefault();
              void saveEntry(editing);
            }}
          >
            {(
              [
                ['title', 'Título'],
                ['authors', 'Autores'],
                ['source', 'Revista o fuente'],
                ['year', 'Año o fecha'],
                ['url', 'Enlace'],
              ] as const
            ).map(([k, label]) => (
              <div key={k} className="field">
                <label htmlFor={`lib-${k}`}>{label}</label>
                <input id={`lib-${k}`} type="text" value={editing[k]} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} required={k === 'title'} />
              </div>
            ))}
            <div className="field">
              <label htmlFor="lib-ev">Nivel de evidencia</label>
              <select id="lib-ev" value={editing.evidenceLevel} onChange={(e) => setEditing({ ...editing, evidenceLevel: e.target.value as EvidenceLevel })}>
                {Object.entries(EVIDENCE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="lib-sum">Resumen en lenguaje sencillo</label>
              <textarea id="lib-sum" value={editing.summary} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="lib-lim">Limitaciones</label>
              <textarea id="lib-lim" value={editing.limitations} onChange={(e) => setEditing({ ...editing, limitations: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="lib-rev">Fecha de revisión editorial</label>
              <input
                id="lib-rev"
                type="date"
                value={editing.reviewedAt?.slice(0, 10) ?? ''}
                onChange={(e) => setEditing({ ...editing, reviewedAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Guardar referencia
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
