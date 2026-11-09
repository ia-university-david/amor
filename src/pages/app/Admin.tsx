import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Seo } from '../../components/Seo';
import { EmptyState, Modal, Notice, formatDate } from '../../components/ui';
import { EVIDENCE_LABELS } from '../../content/library';
import { API_BASE, api } from '../../lib/api';
import { Markdown } from '../../lib/markdown';
import { useApp } from '../../state/AppContext';
import { CONTENT_STATUSES, ROLE_LABELS, type ContentItem, type ContentType } from '../../../shared/content';

type Role = 'user' | 'moderador' | 'editor' | 'admin';
type FieldKind = 'text' | 'textarea' | 'markdown' | 'number' | 'select' | 'checkbox' | 'lines' | 'paragraphs' | 'date' | 'multi';

interface Field {
  path: string;
  label: string;
  kind: FieldKind;
  options?: { value: string; label: string }[];
  help?: string;
  nullable?: boolean;
  max?: number;
}

const TYPE_LABELS: Record<ContentType, string> = {
  message: 'Mensajes del día',
  laura: 'Biblioteca de Laura',
  blog: 'Blog',
  library: 'Biblioteca científica',
  brain: 'Cerebro',
  plan: 'Planes',
};

const STATUS_LABELS: Record<string, string> = {
  publicado: 'Publicado',
  borrador: 'Borrador',
  autorizado: 'Autorizado por la autora',
  'pendiente-migracion': 'Pendiente de migración',
  'pendiente-revision': 'Pendiente de revisión',
};

const FIELDS: Record<ContentType, Field[]> = {
  message: [{ path: 'text', label: 'Mensaje', kind: 'textarea', max: 300 }],
  laura: [
    {
      path: 'kind',
      label: 'Tipo',
      kind: 'select',
      options: [
        { value: 'capitulo', label: 'Capítulo o lectura' },
        { value: 'video', label: 'Video' },
        { value: 'audio', label: 'Audio' },
        { value: 'ejercicio', label: 'Ejercicio' },
      ],
    },
    { path: 'summary', label: 'Resumen', kind: 'textarea', max: 600 },
    { path: 'body', label: 'Texto autorizado (Markdown)', kind: 'markdown' },
    { path: 'mediaUrl', label: 'Enlace al video o audio (opcional)', kind: 'text' },
    { path: 'durationMinutes', label: 'Duración en minutos', kind: 'number' },
    { path: 'premium', label: 'Solo para plan premium', kind: 'checkbox' },
    { path: 'authorization', label: 'Registro de autorización', kind: 'text', help: 'Quién aprobó y cuándo, p. ej. «Laura Rojas, correo del 2 de mayo».' },
  ],
  blog: [
    { path: 'category', label: 'Categoría', kind: 'text' },
    { path: 'author', label: 'Autoría', kind: 'text', help: 'Usa «Equipo Amor Tóxico» salvo que la autora haya aprobado el texto como suyo.' },
    { path: 'readingMinutes', label: 'Minutos de lectura', kind: 'number', nullable: true },
    { path: 'summary', label: 'Resumen', kind: 'textarea', max: 400 },
    { path: 'body', label: 'Cuerpo (Markdown)', kind: 'markdown' },
    { path: 'seoTitle', label: 'Título SEO (máx. 70)', kind: 'text', max: 70 },
    { path: 'seoDescription', label: 'Descripción SEO (máx. 170)', kind: 'textarea', max: 170 },
    { path: 'ogImage', label: 'Imagen para redes (URL o ruta)', kind: 'text' },
    { path: 'publishedAt', label: 'Fecha de publicación', kind: 'date' },
  ],
  library: [
    { path: 'authors', label: 'Autores', kind: 'text' },
    { path: 'source', label: 'Fuente', kind: 'text' },
    { path: 'year', label: 'Año', kind: 'text' },
    { path: 'url', label: 'Enlace', kind: 'text' },
    { path: 'evidenceLevel', label: 'Nivel de evidencia', kind: 'select', options: Object.entries(EVIDENCE_LABELS).map(([value, label]) => ({ value, label })) },
    { path: 'summary', label: 'Qué dice', kind: 'textarea' },
    { path: 'limitations', label: 'Limitaciones', kind: 'textarea' },
    { path: 'reviewedAt', label: 'Fecha de revisión profesional', kind: 'date', nullable: true },
    { path: 'reviewer', label: 'Revisado por', kind: 'text' },
  ],
  brain: [
    { path: 'n', label: 'Orden', kind: 'number' },
    { path: 'summary', label: 'Resumen', kind: 'textarea', max: 400 },
    { path: 'body', label: 'Explicación (un párrafo por bloque, separados por una línea en blanco)', kind: 'paragraphs' },
    { path: 'example', label: 'Ejemplo', kind: 'textarea' },
    { path: 'metaphor', label: 'Metáfora (opcional)', kind: 'textarea' },
    { path: 'evidence.text', label: 'Qué dice la evidencia', kind: 'textarea' },
    { path: 'evidence.refs', label: 'Referencias de la biblioteca (una por línea)', kind: 'lines' },
  ],
  plan: [
    {
      path: 'id',
      label: 'Plan',
      kind: 'select',
      options: [
        { value: 'free', label: 'Gratuito' },
        { value: 'premium', label: 'Premium' },
      ],
    },
    { path: 'name', label: 'Nombre', kind: 'text' },
    { path: 'tagline', label: 'Frase corta', kind: 'text' },
    { path: 'priceLabel', label: 'Precio mostrado', kind: 'text', help: 'El cobro real lo define Stripe; esto es solo el texto.' },
    {
      path: 'priceKeys',
      label: 'Opciones de pago',
      kind: 'multi',
      options: [
        { value: 'monthly', label: 'Mensual' },
        { value: 'yearly', label: 'Anual' },
      ],
    },
    { path: 'features', label: 'Incluye (una por línea)', kind: 'lines' },
    { path: 'highlighted', label: 'Destacar', kind: 'checkbox' },
  ],
};

const EMPTY_DATA: Record<ContentType, Record<string, unknown>> = {
  message: { text: '' },
  laura: { kind: 'capitulo', summary: '', body: '', premium: false, authorization: '' },
  blog: { category: 'Reflexiones', author: 'Equipo Amor Tóxico', readingMinutes: null, summary: '', body: '' },
  library: { authors: '', source: '', year: '', url: '', evidenceLevel: 'divulgacion', summary: '', limitations: '', reviewedAt: null },
  brain: { n: 1, summary: '', body: [], example: '', evidence: { text: '', refs: [] } },
  plan: { id: 'premium', name: '', tagline: '', priceLabel: 'Precio por definir', priceKeys: [], features: [] },
};

const TYPES_FOR: Record<Role, ContentType[]> = {
  admin: ['message', 'laura', 'blog', 'library', 'brain', 'plan'],
  editor: ['message', 'laura', 'blog', 'library', 'brain'],
  moderador: [],
  user: [],
};

function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);
}

function setPath(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const [head, ...rest] = path.split('.');
  if (!rest.length) return { ...obj, [head]: value };
  return { ...obj, [head]: setPath((obj[head] as Record<string, unknown>) ?? {}, rest.join('.'), value) };
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Drops empty optional strings so server validation (URLs, enums) accepts the item. */
function cleanData(type: ContentType, data: Record<string, unknown>) {
  let out = { ...data };
  for (const f of FIELDS[type]) {
    const v = getPath(out, f.path);
    if (f.kind === 'number' && (v === '' || v === undefined || Number.isNaN(v))) out = setPath(out, f.path, f.nullable ? null : undefined);
    if ((f.kind === 'text' || f.kind === 'date' || f.kind === 'textarea') && v === '' && !['text', 'summary', 'category', 'author', 'name', 'tagline', 'priceLabel', 'authors', 'source', 'year', 'url', 'limitations', 'example', 'evidence.text'].includes(f.path)) {
      out = setPath(out, f.path, f.nullable ? null : undefined);
    }
  }
  return JSON.parse(JSON.stringify(out)) as Record<string, unknown>;
}

function FieldInput({ field, value, onChange, invalid }: { field: Field; value: unknown; onChange: (v: unknown) => void; invalid: boolean }) {
  const id = `f-${field.path}`;
  const [preview, setPreview] = useState(false);
  const common = { id, 'aria-invalid': invalid || undefined, 'aria-describedby': field.help ? `${id}-help` : undefined };
  let input: React.ReactNode;
  switch (field.kind) {
    case 'textarea':
      input = <textarea {...common} rows={3} maxLength={field.max} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'markdown':
      input = preview ? (
        <div className="card prose" style={{ minHeight: 160 }}>
          <Markdown source={(value as string) ?? ''} />
        </div>
      ) : (
        <textarea {...common} rows={12} style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.9rem' }} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
      );
      break;
    case 'number':
      input = <input {...common} type="number" value={value === null || value === undefined ? '' : String(value)} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />;
      break;
    case 'select':
      input = (
        <select {...common} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)}>
          {field.options!.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
      break;
    case 'checkbox':
      return (
        <label className="check">
          <input id={id} type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          <span>{field.label}</span>
        </label>
      );
    case 'multi': {
      const list = (value as string[]) ?? [];
      return (
        <fieldset className="row" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="small" style={{ fontWeight: 600 }}>
            {field.label}
          </legend>
          {field.options!.map((o) => (
            <label key={o.value} className="check">
              <input type="checkbox" checked={list.includes(o.value)} onChange={(e) => onChange(e.target.checked ? [...list, o.value] : list.filter((x) => x !== o.value))} />
              <span>{o.label}</span>
            </label>
          ))}
        </fieldset>
      );
    }
    case 'lines':
      input = <textarea {...common} rows={4} value={((value as string[]) ?? []).join('\n')} onChange={(e) => onChange(e.target.value.split('\n').map((s) => s.trimStart()).filter((s, i, a) => s || i < a.length - 1))} />;
      break;
    case 'paragraphs':
      input = <textarea {...common} rows={8} value={((value as string[]) ?? []).join('\n\n')} onChange={(e) => onChange(e.target.value.split(/\n\s*\n/))} />;
      break;
    case 'date':
      input = <input {...common} type="date" value={typeof value === 'string' ? value.slice(0, 10) : ''} onChange={(e) => onChange(e.target.value)} />;
      break;
    default:
      input = <input {...common} type="text" maxLength={field.max} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <div className="field">
      <div className="row between">
        <label htmlFor={id}>{field.label}</label>
        {field.kind === 'markdown' && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPreview(!preview)}>
            <Icon name={preview ? 'edit' : 'eye'} size={14} /> {preview ? 'Editar' : 'Vista previa'}
          </button>
        )}
      </div>
      {input}
      {field.help && (
        <p id={`${id}-help`} className="small muted" style={{ margin: 0 }}>
          {field.help}
        </p>
      )}
    </div>
  );
}

function ItemEditor({ type, item, onClose, onSaved }: { type: ContentType; item: ContentItem | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [slug, setSlug] = useState(item?.slug ?? '');
  const [status, setStatus] = useState(item?.status ?? CONTENT_STATUSES[type].find((s) => s === 'borrador') ?? CONTENT_STATUSES[type][0]);
  const [sort, setSort] = useState(item?.sort ?? 0);
  const [values, setValues] = useState<Record<string, unknown>>({ ...EMPTY_DATA[type], ...(item?.data ?? {}) });
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const autoSlug = !item;

  const save = async () => {
    setError(null);
    if (type === 'laura' && status === 'autorizado' && !String(values.authorization ?? '').trim()) {
      setFields(['data.authorization']);
      return setError('Para marcarlo como autorizado, registra quién lo aprobó y cuándo.');
    }
    setBusy(true);
    const payload = { title: title.trim(), slug: slug.trim(), status, sort: Number(sort) || 0, data: cleanData(type, values) };
    const res = item ? await api(`/admin/content/${type}/${item.id}`, { method: 'PUT', json: payload }) : await api(`/admin/content/${type}`, { json: payload });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'No se pudo guardar.');
      const body = res.details as { fields?: string[] } | null;
      setFields(body?.fields ?? []);
      return;
    }
    onSaved();
  };

  return (
    <Modal title={item ? `Editar: ${item.title}` : `Nuevo en ${TYPE_LABELS[type]}`} onClose={onClose}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {type === 'laura' && (
          <Notice icon="shield" tone="warn">
            Solo marca «Autorizado por la autora» con una aprobación escrita de Laura Rojas. Hasta entonces, el contenido no se muestra en la app.
          </Notice>
        )}
        <div className="field">
          <label htmlFor="f-title">Título</label>
          <input
            id="f-title"
            type="text"
            required
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (autoSlug) setSlug(slugify(e.target.value));
            }}
          />
        </div>
        <div className="grid" style={{ ['--min' as string]: '180px' }}>
          <div className="field">
            <label htmlFor="f-slug">Identificador (URL)</label>
            <input id="f-slug" type="text" required pattern="[a-z0-9]+(-[a-z0-9]+)*" aria-invalid={fields.includes('slug') || undefined} value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="f-status">Estado</label>
            <select id="f-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              {CONTENT_STATUSES[type].map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s] ?? s}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-sort">Orden</label>
            <input id="f-sort" type="number" min={0} value={sort} onChange={(e) => setSort(Number(e.target.value))} />
          </div>
        </div>
        {FIELDS[type].map((f) => (
          <FieldInput key={f.path} field={f} value={getPath(values, f.path)} invalid={fields.includes(`data.${f.path}`)} onChange={(v) => setValues((cur) => setPath(cur, f.path, v))} />
        ))}
        {error && (
          <p role="alert" className="small" style={{ color: 'var(--danger)' }}>
            {error}
            {fields.length > 0 && ` (${fields.map((f) => f.replace(/^data\./, '')).join(', ')})`}
          </p>
        )}
        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={busy || !title.trim() || !slug.trim()}>
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ContentTab({ types, role }: { types: ContentType[]; role: Role }) {
  const [type, setType] = useState<ContentType>(types[0]);
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [editing, setEditing] = useState<ContentItem | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setItems(null);
    const r = await api<{ items: ContentItem[] }>(`/admin/content/${type}`);
    if (r.ok) setItems(r.data!.items);
    else setError(r.error ?? 'No se pudo cargar.');
  }, [type]);
  useEffect(() => void load(), [load]);

  const visible = (items ?? []).filter((i) => !q || i.title.toLowerCase().includes(q.toLowerCase()) || i.slug.includes(q.toLowerCase()));
  const canDelete = role === 'admin' || role === 'editor';

  return (
    <div className="stack">
      <div className="row" role="tablist" aria-label="Tipo de contenido">
        {types.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={t === type} className={`chip${t === type ? ' active' : ''}`} onClick={() => setType(t)}>
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>
      <div className="row between">
        <input type="search" aria-label="Buscar" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 260 }} />
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>
          <Icon name="plus" size={16} /> Nuevo
        </button>
      </div>
      {type === 'blog' && (
        <p className="small muted" style={{ margin: 0 }}>
          Los artículos originales del sitio anterior conservan su dirección y quedan «pendientes de migración» hasta que se pegue su texto
          original. No publiques textos como si fueran de Laura sin su aprobación.
        </p>
      )}
      {error && <Notice tone="warn">{error}</Notice>}
      {!items ? (
        <p className="muted" aria-busy="true">
          Cargando…
        </p>
      ) : visible.length === 0 ? (
        <EmptyState icon="list" title="No hay elementos" />
      ) : (
        <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0, ['--gap' as string]: '0.5rem' }}>
          {visible.map((i) => (
            <li key={i.id} className="card row between" style={{ padding: '0.75rem 1rem' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.title}</strong>
                <span className="small muted">
                  /{i.slug} · <span className="badge">{STATUS_LABELS[i.status] ?? i.status}</span> · {formatDate(i.updatedAt)}
                </span>
              </div>
              <div className="row" style={{ gap: '0.25rem' }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(i)}>
                  <Icon name="edit" size={14} /> Editar
                </button>
                {canDelete && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    aria-label={`Eliminar ${i.title}`}
                    onClick={async () => {
                      if (!window.confirm(`¿Eliminar «${i.title}»? No se puede deshacer.`)) return;
                      const r = await api(`/admin/content/${type}/${i.id}`, { method: 'DELETE' });
                      if (r.ok) void load();
                      else setError(r.error ?? 'No se pudo eliminar.');
                    }}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <ItemEditor
          type={type}
          item={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

interface Queue {
  pending: { id: string; roomId: string; parentId: string | null; pseudonym: string; body: string; createdAt: string; flags: string[] }[];
  reports: { id: string; postId: string; reason: string; details: string | null; createdAt: string; body: string; pseudonym: string; postStatus: string; roomId: string }[];
}

const FLAG_LABELS: Record<string, string> = {
  crisis: 'Posible riesgo',
  insulto: 'Insulto',
  odio: 'Odio',
  'datos-personales': 'Datos personales',
  enlace: 'Enlace',
  acoso: 'Acoso',
  spam: 'Spam',
};

function ModerationTab() {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await api<Queue>('/community/moderation/queue');
    if (r.ok) setQueue(r.data);
    else setMsg(r.error ?? 'No se pudo cargar.');
  }, []);
  useEffect(() => void load(), [load]);

  const act = async (postId: string, action: 'approve' | 'hide' | 'remove', muteDays?: number) => {
    const r = await api(`/community/moderation/posts/${postId}`, { json: { action, muteDays } });
    setMsg(r.ok ? 'Hecho.' : (r.error ?? 'No se pudo aplicar.'));
    void load();
  };

  const Actions = ({ postId }: { postId: string }) => (
    <div className="row" style={{ gap: '0.25rem' }}>
      <button type="button" className="btn btn-outline btn-sm" onClick={() => act(postId, 'approve')}>
        <Icon name="check" size={14} /> Publicar
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => act(postId, 'hide')}>
        <Icon name="eye" size={14} /> Ocultar
      </button>
      <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => act(postId, 'remove')}>
        <Icon name="trash" size={14} /> Retirar
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => act(postId, 'hide', 7)}>
        Ocultar y silenciar 7 días
      </button>
    </div>
  );

  if (!queue) return <p className="muted">{msg ?? 'Cargando…'}</p>;
  return (
    <div className="stack">
      <Notice icon="shield">
        Si un mensaje sugiere riesgo para la vida de alguien, la persona ya vio en pantalla los números de emergencia. Publicar o no es una decisión
        de moderación: prioriza la seguridad y no compartas datos fuera del panel.
      </Notice>
      {msg && (
        <p className="small" role="status">
          {msg}
        </p>
      )}
      <h3 style={{ margin: 0 }}>Pendientes de revisión ({queue.pending.length})</h3>
      {queue.pending.length === 0 ? (
        <p className="small muted">No hay mensajes retenidos.</p>
      ) : (
        queue.pending.map((p) => (
          <article key={p.id} className="card stack" style={{ ['--gap' as string]: '0.5rem' }}>
            <div className="row between">
              <strong>{p.pseudonym}</strong>
              <span className="small muted">
                {p.roomId} · {formatDate(p.createdAt)}
                {p.parentId ? ' · respuesta' : ''}
              </span>
            </div>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{p.body}</p>
            <div className="row" style={{ gap: '0.25rem' }}>
              {p.flags.map((f) => (
                <span key={f} className="badge" style={f === 'crisis' ? { background: 'var(--danger)', color: '#fff' } : undefined}>
                  <Icon name="flag" size={12} /> {FLAG_LABELS[f] ?? f}
                </span>
              ))}
            </div>
            <Actions postId={p.id} />
          </article>
        ))
      )}
      <h3 style={{ margin: '1rem 0 0' }}>Reportes abiertos ({queue.reports.length})</h3>
      {queue.reports.length === 0 ? (
        <p className="small muted">No hay reportes abiertos.</p>
      ) : (
        queue.reports.map((r) => (
          <article key={r.id} className="card stack" style={{ ['--gap' as string]: '0.5rem' }}>
            <div className="row between">
              <span>
                <span className="badge">{r.reason}</span> sobre <strong>{r.pseudonym}</strong>
              </span>
              <span className="small muted">
                {r.roomId} · estado: {r.postStatus}
              </span>
            </div>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{r.body}</p>
            {r.details && <p className="small muted" style={{ margin: 0 }}>Detalle del reporte: {r.details}</p>}
            <div className="row" style={{ gap: '0.25rem' }}>
              <Actions postId={r.postId} />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={async () => {
                  await api(`/community/moderation/reports/${r.id}`, { json: { action: 'dismiss' } });
                  void load();
                }}
              >
                Descartar reporte
              </button>
            </div>
          </article>
        ))
      )}
    </div>
  );
}

const METRIC_LABELS: Record<string, string> = {
  users: 'Cuentas',
  verified: 'Correos verificados',
  premium: 'Premium',
  newLast7Days: 'Nuevas (7 días)',
  activeLast7Days: 'Activas (7 días)',
  visiblePosts: 'Mensajes visibles',
  pendingPosts: 'Mensajes retenidos',
  openReports: 'Reportes abiertos',
};

function MetricsTab() {
  const [m, setM] = useState<{ note: string; totals: Record<string, number | string>; community: Record<string, number | string>; last30Days: Record<string, number | string>; leads: { kind: string; status: string; n: number | string }[] } | null>(null);
  useEffect(() => void api<typeof m>('/admin/metrics').then((r) => r.ok && setM(r.data)), []);
  if (!m) return <p className="muted">Cargando…</p>;
  const Grid = ({ data }: { data: Record<string, number | string> }) => (
    <div className="grid" style={{ ['--min' as string]: '150px' }}>
      {Object.entries(data).map(([k, v]) => (
        <div key={k} className="card">
          <div className="stat">{v}</div>
          <p className="small muted" style={{ margin: 0 }}>
            {METRIC_LABELS[k] ?? k.replace(/_/g, ' ')}
          </p>
        </div>
      ))}
    </div>
  );
  return (
    <div className="stack">
      <p className="small muted">{m.note}</p>
      <Grid data={m.totals} />
      <h3 style={{ margin: 0 }}>Comunidad</h3>
      <Grid data={m.community} />
      <h3 style={{ margin: 0 }}>Uso en los últimos 30 días</h3>
      {Object.keys(m.last30Days).length ? <Grid data={m.last30Days} /> : <p className="small muted">Aún no hay datos.</p>}
      <h3 style={{ margin: 0 }}>Formularios</h3>
      {m.leads.length ? <Grid data={Object.fromEntries(m.leads.map((l) => [`${l.kind} · ${l.status}`, l.n]))} /> : <p className="small muted">Aún no hay formularios.</p>}
    </div>
  );
}

function UsersTab() {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<{ id: string; email: string; name: string | null; role: Role; plan: string; createdAt: string; verified: boolean }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(async (query: string) => {
    const r = await api<{ users: typeof users }>(`/admin/users${query ? `?q=${encodeURIComponent(query)}` : ''}`);
    if (r.ok) setUsers(r.data!.users);
  }, []);
  useEffect(() => void load(''), [load]);
  return (
    <div className="stack">
      <p className="small muted" style={{ margin: 0 }}>
        Sin búsqueda se muestran solo las personas con un rol del equipo. Busca por el inicio del correo para asignar un rol.
      </p>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          void load(q);
        }}
      >
        <input type="search" aria-label="Buscar por correo" placeholder="correo@…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 280 }} />
        <button type="submit" className="btn btn-outline btn-sm">
          Buscar
        </button>
      </form>
      {msg && (
        <p className="small" role="status">
          {msg}
        </p>
      )}
      <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0, ['--gap' as string]: '0.5rem' }}>
        {users.map((u) => (
          <li key={u.id} className="card row between" style={{ padding: '0.75rem 1rem' }}>
            <span>
              <strong>{u.email}</strong>
              <span className="small muted" style={{ display: 'block' }}>
                {u.verified ? 'Verificado' : 'Sin verificar'} · {u.plan} · desde {formatDate(u.createdAt, { dateStyle: 'medium' })}
              </span>
            </span>
            <label className="sr-only" htmlFor={`role-${u.id}`}>
              Rol de {u.email}
            </label>
            <select
              id={`role-${u.id}`}
              value={u.role}
              style={{ width: 'auto' }}
              onChange={async (e) => {
                const role = e.target.value as Role;
                const r = await api(`/admin/users/${u.id}`, { method: 'PATCH', json: { role } });
                setMsg(r.ok ? `Rol actualizado: ${ROLE_LABELS[role]}.` : (r.error ?? 'No se pudo cambiar.'));
                if (r.ok) setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, role } : x)));
              }}
            >
              {(['user', 'moderador', 'editor', 'admin'] as Role[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LeadsTab() {
  const [leads, setLeads] = useState<{ id: string; kind: string; name: string | null; email: string; message: string | null; status: string; createdAt: string }[] | null>(null);
  useEffect(() => void api<{ leads: NonNullable<typeof leads> }>('/admin/leads').then((r) => r.ok && setLeads(r.data!.leads)), []);
  if (!leads) return <p className="muted">Cargando…</p>;
  return (
    <div className="stack">
      <div className="row between">
        <p className="small muted" style={{ margin: 0 }}>
          Solo personas que dejaron sus datos voluntariamente. El eBook se envía tras confirmar el correo (doble confirmación).
        </p>
        <a className="btn btn-outline btn-sm" href={`${API_BASE}/admin/leads?format=csv`}>
          <Icon name="download" size={16} /> Descargar CSV
        </a>
      </div>
      {leads.length === 0 ? (
        <EmptyState icon="mail" title="Aún no hay formularios" />
      ) : (
        <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0, ['--gap' as string]: '0.5rem' }}>
          {leads.map((l) => (
            <li key={l.id} className="card" style={{ padding: '0.75rem 1rem' }}>
              <div className="row between">
                <strong>
                  {l.name || 'Sin nombre'} · {l.email}
                </strong>
                <span className="small muted">
                  <span className="badge">{l.kind}</span> {l.status} · {formatDate(l.createdAt)}
                </span>
              </div>
              {l.message && (
                <p className="small" style={{ margin: '0.4rem 0 0', whiteSpace: 'pre-wrap' }}>
                  {l.message}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AuditTab() {
  const [rows, setRows] = useState<{ id: string; action: string; target: string | null; at: string; actor: string | null }[] | null>(null);
  useEffect(() => void api<{ entries: NonNullable<typeof rows> }>('/admin/audit').then((r) => r.ok && setRows(r.data!.entries)), []);
  if (!rows) return <p className="muted">Cargando…</p>;
  return (
    <ul className="stack small" style={{ listStyle: 'none', padding: 0, margin: 0, ['--gap' as string]: '0.25rem' }}>
      {rows.map((r) => (
        <li key={r.id}>
          <span className="muted">{formatDate(r.at)}</span> · <strong>{r.actor ?? 'Sistema'}</strong> · {r.action} {r.target ? `· ${r.target}` : ''}
        </li>
      ))}
    </ul>
  );
}

type Tab = 'contenido' | 'moderacion' | 'metricas' | 'personas' | 'formularios' | 'auditoria';
const TAB_LABELS: Record<Tab, string> = {
  contenido: 'Contenido',
  moderacion: 'Moderación',
  metricas: 'Métricas',
  personas: 'Equipo y roles',
  formularios: 'Formularios',
  auditoria: 'Registro',
};

export function tabsFor(role: Role): Tab[] {
  if (role === 'admin') return ['contenido', 'moderacion', 'metricas', 'personas', 'formularios', 'auditoria'];
  if (role === 'editor') return ['contenido'];
  if (role === 'moderador') return ['moderacion'];
  return [];
}

export default function Admin() {
  const { session, ready } = useApp();
  const role = (session?.mode === 'remote' ? session.role : 'user') as Role;
  const tabs = useMemo(() => tabsFor(role), [role]);
  const [tab, setTab] = useState<Tab | null>(null);
  const active = tab && tabs.includes(tab) ? tab : tabs[0];

  return (
    <div className="container section stack" style={{ ['--gap' as string]: '1.5rem' }}>
      <Seo title="Administración" noindex />
      <header>
        <span className="eyebrow">Administración</span>
        <h1>Panel del equipo</h1>
        {session?.mode === 'remote' && (
          <p className="muted" style={{ margin: 0 }}>
            {session.email} · {ROLE_LABELS[role]}
          </p>
        )}
      </header>
      {!ready ? null : session?.mode !== 'remote' ? (
        <EmptyState icon="lock" title="Necesitas entrar con tu cuenta del equipo">
          <Link to="/entrar?volver=/admin" className="btn btn-primary">
            Entrar
          </Link>
        </EmptyState>
      ) : tabs.length === 0 ? (
        <EmptyState icon="lock" title="Tu cuenta no tiene acceso al panel">
          <p className="small muted">Si formas parte del equipo, pide a una persona administradora que te asigne un rol.</p>
        </EmptyState>
      ) : (
        <>
          <nav className="row" role="tablist" aria-label="Secciones del panel">
            {tabs.map((t) => (
              <button key={t} type="button" role="tab" aria-selected={t === active} className={`btn btn-sm ${t === active ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(t)}>
                {TAB_LABELS[t]}
              </button>
            ))}
          </nav>
          <section role="tabpanel" aria-label={TAB_LABELS[active!]}>
            {active === 'contenido' && <ContentTab types={TYPES_FOR[role]} role={role} />}
            {active === 'moderacion' && <ModerationTab />}
            {active === 'metricas' && <MetricsTab />}
            {active === 'personas' && <UsersTab />}
            {active === 'formularios' && <LeadsTab />}
            {active === 'auditoria' && <AuditTab />}
          </section>
        </>
      )}
    </div>
  );
}
