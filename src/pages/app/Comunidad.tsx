import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { CrisisScreen } from '../../components/Safety';
import { Seo } from '../../components/Seo';
import { EmptyState, Modal, Notice, PageHeader, formatDate } from '../../components/ui';
import { LINKS } from '../../content/links';
import { api } from '../../lib/api';
import { detectCrisis } from '../../lib/crisis';
import { useApp } from '../../state/AppContext';
import { REACTIONS, type ReactionKind } from '../../../shared/moderation';

export interface Room {
  id: string;
  name: string;
  description: string;
  locked: boolean;
  posts: number;
}

export interface Post {
  id: string;
  roomId: string;
  parentId: string | null;
  pseudonym: string;
  body: string;
  createdAt: string;
  status: string;
  mine: boolean;
  replies: number;
  reactions: Partial<Record<ReactionKind, number>>;
  myReactions: ReactionKind[];
}

interface Me {
  pseudonym: string;
  mutedUntil: string | null;
  canPost: boolean;
  needsVerification: boolean;
}

function WhatsAppCard() {
  return (
    <div className="card stack" style={{ ['--gap' as string]: '0.5rem' }}>
      <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Grupo de WhatsApp</h2>
      <p className="small muted" style={{ margin: 0 }}>
        También existe el grupo de la comunidad en WhatsApp. Ten en cuenta que allí tu número de teléfono es visible para el resto del grupo.
      </p>
      <a className="btn btn-outline btn-sm" href={LINKS.community} target="_blank" rel="noopener noreferrer" style={{ alignSelf: 'flex-start' }}>
        <Icon name="external" size={16} /> Unirme al grupo
      </a>
    </div>
  );
}

function NeedsAccount() {
  const { server } = useApp();
  return (
    <div className="stack">
      <EmptyState icon="users" title="La comunidad necesita una cuenta">
        <p className="small muted">
          Para cuidar el espacio, cada persona participa con un seudónimo anónimo ligado a una cuenta verificada. Nadie ve tu nombre ni tu correo.
        </p>
        {server.online ? (
          <Link to="/entrar?modo=registro&volver=/app/comunidad" className="btn btn-primary">
            Crear cuenta o entrar
          </Link>
        ) : (
          <p className="small">Ahora mismo no hay conexión con el servidor.</p>
        )}
      </EmptyState>
      <WhatsAppCard />
    </div>
  );
}

function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  const reload = useCallback(async () => {
    const r = await api<Me>('/community/me');
    if (r.ok) setMe(r.data);
  }, []);
  useEffect(() => void reload(), [reload]);
  return { me, setMe, reload };
}

export default function Comunidad() {
  const { session } = useApp();
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { me, setMe } = useMe();
  const signedIn = session?.mode === 'remote';

  useEffect(() => {
    if (!signedIn) return;
    void api<{ rooms: Room[] }>('/community/rooms').then((r) => (r.ok ? setRooms(r.data!.rooms) : setError(r.error ?? 'No se pudo cargar.')));
  }, [signedIn]);

  return (
    <div className="stack" style={{ ['--gap' as string]: '1.25rem' }}>
      <Seo title="Comunidad" noindex />
      <PageHeader
        eyebrow="Comunidad"
        title="No estás sola ni solo en esto"
        subtitle="Un espacio anónimo y moderado para compartir y leer a otras personas que atraviesan algo parecido."
      />
      {!signedIn ? (
        <NeedsAccount />
      ) : (
        <>
          <Notice icon="shield">
            Antes de participar, lee las <Link to="/comunidad/normas">normas de la comunidad</Link>. No es un espacio de terapia ni de emergencias:
            si estás en peligro, llama al número de emergencias de tu país.
          </Notice>
          {me && (
            <div className="card row between">
              <span>
                Participas como <strong>{me.pseudonym}</strong>
                <span className="small muted" style={{ display: 'block' }}>
                  Nunca mostramos tu nombre ni tu correo.
                </span>
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={async () => {
                  const r = await api<{ pseudonym: string }>('/community/me/pseudonym', { json: {} });
                  if (r.ok) setMe({ ...me, pseudonym: r.data!.pseudonym });
                }}
              >
                Cambiar seudónimo
              </button>
            </div>
          )}
          {me?.needsVerification && (
            <Notice icon="mail" tone="warn">
              Confirma tu correo para poder escribir. Puedes reenviar el enlace desde <Link to="/app/perfil#cuenta">Perfil</Link>.
            </Notice>
          )}
          {error && <Notice tone="warn">{error}</Notice>}
          {!rooms ? (
            !error && <p className="muted">Cargando salas…</p>
          ) : (
            <div className="grid" style={{ ['--min' as string]: '240px' }}>
              {rooms.map((r) => (
                <Link key={r.id} to={`/app/comunidad/${r.id}`} className="card card-link">
                  <h2 style={{ fontSize: '1.15rem', margin: 0 }}>{r.name}</h2>
                  <p className="small muted" style={{ margin: '0.4rem 0' }}>
                    {r.description}
                  </p>
                  <span className="small">{r.posts === 1 ? '1 conversación' : `${r.posts} conversaciones`}</span>
                </Link>
              ))}
            </div>
          )}
          <WhatsAppCard />
        </>
      )}
    </div>
  );
}

function Reactions({ post, onChange }: { post: Post; onChange: (p: Post) => void }) {
  if (post.status !== 'visible') return null;
  return (
    <div className="row" style={{ gap: '0.3rem' }}>
      {(Object.keys(REACTIONS) as ReactionKind[]).map((k) => {
        const active = post.myReactions.includes(k);
        const n = post.reactions[k] ?? 0;
        return (
          <button
            key={k}
            type="button"
            className={`chip${active ? ' active' : ''}`}
            aria-pressed={active}
            onClick={async () => {
              const r = await api<{ active: boolean }>(`/community/posts/${post.id}/reactions`, { json: { kind: k } });
              if (!r.ok) return;
              const on = r.data!.active;
              onChange({
                ...post,
                myReactions: on ? [...post.myReactions, k] : post.myReactions.filter((x) => x !== k),
                reactions: { ...post.reactions, [k]: Math.max(0, n + (on ? 1 : -1)) },
              });
            }}
          >
            {REACTIONS[k]}
            {n > 0 ? ` · ${n}` : ''}
          </button>
        );
      })}
    </div>
  );
}

const REPORT_REASONS = [
  { id: 'riesgo', label: 'Creo que esta persona está en riesgo' },
  { id: 'ofensivo', label: 'Es ofensivo o agresivo' },
  { id: 'datos-personales', label: 'Comparte datos personales' },
  { id: 'spam', label: 'Es publicidad o spam' },
  { id: 'otro', label: 'Otro motivo' },
] as const;

function ReportModal({ post, onClose }: { post: Post; onClose: () => void }) {
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]['id']>('ofensivo');
  const [details, setDetails] = useState('');
  const [done, setDone] = useState(false);
  return (
    <Modal title="Reportar mensaje" onClose={onClose}>
      {done ? (
        <div className="stack">
          <p>Gracias. El equipo de moderación lo revisará. Si varias personas lo reportan, el mensaje se oculta mientras tanto.</p>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      ) : (
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await api(`/community/posts/${post.id}/report`, { json: { reason, details: details.trim() || undefined } });
            if (r.ok) setDone(true);
          }}
        >
          <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, ['--gap' as string]: '0.4rem' }}>
            <legend>¿Qué ocurre?</legend>
            {REPORT_REASONS.map((r) => (
              <label key={r.id} className="check">
                <input type="radio" name="reason" value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} />
                <span>{r.label}</span>
              </label>
            ))}
          </fieldset>
          <div className="field">
            <label htmlFor="rep-details">Detalle (opcional)</label>
            <textarea id="rep-details" rows={3} maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary">
            Enviar reporte
          </button>
        </form>
      )}
    </Modal>
  );
}

function PostCard({ post, onChange, link }: { post: Post; onChange: (p: Post) => void; link?: boolean }) {
  const [reporting, setReporting] = useState(false);
  const pending = post.status === 'pending';
  return (
    <article className="card stack" style={{ ['--gap' as string]: '0.6rem' }} aria-label={`Mensaje de ${post.pseudonym}`}>
      <div className="row between">
        <strong>{post.pseudonym}</strong>
        <span className="small muted">{formatDate(post.createdAt)}</span>
      </div>
      {pending && (
        <p className="small" style={{ margin: 0 }}>
          <Icon name="clock" size={14} /> Solo tú lo ves por ahora: el equipo de moderación lo revisará antes de publicarlo.
        </p>
      )}
      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{post.body}</p>
      <Reactions post={post} onChange={onChange} />
      <div className="row between">
        {link ? (
          <Link to={`/app/comunidad/mensaje/${post.id}`} className="small">
            {post.replies === 0 ? 'Responder' : post.replies === 1 ? 'Ver 1 respuesta' : `Ver ${post.replies} respuestas`}
          </Link>
        ) : (
          <span />
        )}
        <div className="row" style={{ gap: '0.25rem' }}>
          {post.mine && post.status !== 'removed' ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                if (!window.confirm('¿Eliminar tu mensaje?')) return;
                const r = await api(`/community/posts/${post.id}`, { method: 'DELETE' });
                if (r.ok) onChange({ ...post, status: 'removed', body: '[Mensaje eliminado por su autor]' });
              }}
            >
              <Icon name="trash" size={14} /> Eliminar
            </button>
          ) : (
            !post.mine && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReporting(true)}>
                <Icon name="flag" size={14} /> Reportar
              </button>
            )
          )}
        </div>
      </div>
      {reporting && <ReportModal post={post} onClose={() => setReporting(false)} />}
    </article>
  );
}

function Composer({ roomId, parentId, me, onPosted }: { roomId: string; parentId?: string; me: Me | null; onPosted: (p: Post) => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [crisis, setCrisis] = useState(false);
  const muted = me?.mutedUntil && me.mutedUntil > new Date().toISOString();
  if (me && !me.canPost) {
    return (
      <Notice icon="lock">
        {me.needsVerification ? (
          <>
            Confirma tu correo para escribir. Puedes reenviar el enlace desde <Link to="/app/perfil#cuenta">Perfil</Link>.
          </>
        ) : (
          <>
            Para escribir, confirma que eres mayor de edad en <Link to="/cuenta/confirmar-edad">tu cuenta</Link>.
          </>
        )}
      </Notice>
    );
  }
  if (muted) return <Notice icon="clock">Tu participación está en pausa hasta el {formatDate(me!.mutedUntil!, { dateStyle: 'long' })} por las normas de la comunidad.</Notice>;
  return (
    <form
      className="stack"
      style={{ ['--gap' as string]: '0.5rem' }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (text.trim().length < 3) return;
        setBusy(true);
        setMsg(null);
        const r = await api<{ post: Post; held: boolean; crisis: boolean }>(`/community/rooms/${roomId}/posts`, { json: { body: text.trim(), parentId } });
        setBusy(false);
        if (!r.ok) return setMsg(r.error ?? 'No se pudo publicar.');
        setText('');
        onPosted(r.data!.post);
        if (r.data!.crisis || detectCrisis(text).detected) setCrisis(true);
        setMsg(r.data!.held ? 'Gracias por compartir. Tu mensaje quedó en revisión antes de publicarse.' : 'Publicado.');
      }}
    >
      <label htmlFor={`composer-${parentId ?? roomId}`} className="sr-only">
        {parentId ? 'Escribe una respuesta' : 'Escribe un mensaje'}
      </label>
      <textarea
        id={`composer-${parentId ?? roomId}`}
        rows={3}
        maxLength={2000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={parentId ? 'Responde con cuidado y sin juzgar…' : 'Comparte lo que quieras. Evita nombres, teléfonos o datos que identifiquen a nadie.'}
      />
      <div className="row between">
        <span className="small muted">{text.length}/2000</span>
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy || text.trim().length < 3}>
          {busy ? 'Enviando…' : parentId ? 'Responder' : 'Publicar'}
        </button>
      </div>
      {msg && (
        <p className="small" role="status" style={{ margin: 0 }}>
          {msg}
        </p>
      )}
      {crisis && <CrisisScreen context="comunidad" onClose={() => setCrisis(false)} />}
    </form>
  );
}

export function ComunidadSala() {
  const { room: roomId } = useParams();
  const { session } = useApp();
  const [room, setRoom] = useState<Room | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [more, setMore] = useState(false);
  const { me } = useMe();
  const signedIn = session?.mode === 'remote';

  const load = useCallback(
    async (before?: string) => {
      const r = await api<{ posts: Post[] }>(`/community/rooms/${roomId}/posts${before ? `?before=${encodeURIComponent(before)}` : ''}`);
      if (!r.ok) return;
      setPosts((cur) => (before ? [...(cur ?? []), ...r.data!.posts] : r.data!.posts));
      setMore(r.data!.posts.length === 30);
    },
    [roomId],
  );

  useEffect(() => {
    if (!signedIn) return;
    void api<{ rooms: Room[] }>('/community/rooms').then((r) => r.ok && setRoom(r.data!.rooms.find((x) => x.id === roomId) ?? null));
    void load();
  }, [signedIn, roomId, load]);

  if (!signedIn) return <NeedsAccount />;
  const update = (p: Post) => setPosts((list) => (list ?? []).map((x) => (x.id === p.id ? p : x)));

  return (
    <div className="stack" style={{ ['--gap' as string]: '1rem' }}>
      <Seo title={room?.name ?? 'Comunidad'} noindex />
      <PageHeader eyebrow="Comunidad" title={room?.name ?? 'Sala'} subtitle={room?.description} back="/app/comunidad" />
      {room && !room.locked && <Composer roomId={room.id} me={me} onPosted={(p) => setPosts((list) => [p, ...(list ?? [])])} />}
      {!posts ? (
        <p className="muted">Cargando…</p>
      ) : posts.length === 0 ? (
        <EmptyState icon="message" title="Aún no hay conversaciones">
          <p className="small muted">Puedes ser la primera persona en escribir.</p>
        </EmptyState>
      ) : (
        <>
          {posts.map((p) => (
            <PostCard key={p.id} post={p} onChange={update} link />
          ))}
          {more && (
            <button type="button" className="btn btn-outline" onClick={() => load(posts[posts.length - 1].createdAt)}>
              Ver más
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function ComunidadMensaje() {
  const { id } = useParams();
  const { session } = useApp();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Post[]>([]);
  const [missing, setMissing] = useState(false);
  const { me } = useMe();
  const signedIn = session?.mode === 'remote';

  useEffect(() => {
    if (!signedIn) return;
    void api<{ post: Post; replies: Post[] }>(`/community/posts/${id}`).then((r) => {
      if (!r.ok) return setMissing(true);
      setPost(r.data!.post);
      setReplies(r.data!.replies);
    });
  }, [signedIn, id]);

  if (!signedIn) return <NeedsAccount />;
  if (missing) {
    return (
      <EmptyState icon="message" title="No encontramos este mensaje">
        <button type="button" className="btn btn-outline" onClick={() => navigate('/app/comunidad')}>
          Volver a la comunidad
        </button>
      </EmptyState>
    );
  }
  if (!post) return <p className="muted">Cargando…</p>;
  return (
    <div className="stack" style={{ ['--gap' as string]: '1rem' }}>
      <Seo title="Conversación" noindex />
      <PageHeader eyebrow="Comunidad" title="Conversación" back={`/app/comunidad/${post.roomId}`} />
      <PostCard post={post} onChange={setPost} />
      <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{replies.length === 1 ? '1 respuesta' : `${replies.length} respuestas`}</h2>
      {replies.map((r) => (
        <div key={r.id} style={{ marginLeft: '1rem' }}>
          <PostCard post={r} onChange={(p) => setReplies((list) => list.map((x) => (x.id === p.id ? p : x)))} />
        </div>
      ))}
      {post.status === 'visible' && <Composer roomId={post.roomId} parentId={post.id} me={me} onPosted={(p) => setReplies((list) => [...list, p])} />}
    </div>
  );
}
