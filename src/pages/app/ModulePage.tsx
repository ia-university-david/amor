import { Link, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { EmptyState, Notice, PageHeader } from '../../components/ui';
import { AUTHOR, LINKS } from '../../content/links';
import { QUOTE_NOTICE } from '../../content/quotes';
import { MODULES, PILLARS } from '../../content/program';
import { STATIC, toLaura, useContent, type LauraItem } from '../../lib/content';
import { Markdown } from '../../lib/markdown';
import { useModuleProgress } from '../../lib/progress';
import { useApp } from '../../state/AppContext';
import { entitlementsFor } from '../../../shared/plans';
import type { LauraData } from '../../../shared/content';

function AuthorizedContent({ item, onDone, done }: { item: LauraItem; onDone: () => void; done: boolean }) {
  const { session } = useApp();
  const locked = item.premium && !entitlementsFor(session?.plan).authorMedia;
  return (
    <div className="card stack prose">
      <p className="small muted" style={{ margin: 0 }}>
        Contenido de {AUTHOR.name}, publicado con su autorización.
      </p>
      {item.summary && <p>{item.summary}</p>}
      {locked ? (
        <Notice icon="lock">
          Este material forma parte del plan premium. <Link to="/app/planes">Ver planes</Link>
        </Notice>
      ) : (
        <>
          {item.mediaUrl && (
            <a href={item.mediaUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }}>
              <Icon name={item.kind === 'audio' ? 'mic' : 'play'} size={16} /> {item.kind === 'audio' ? 'Escuchar' : 'Ver'}
              {item.durationMinutes ? ` · ${item.durationMinutes} min` : ''}
            </a>
          )}
          {item.body && <Markdown source={item.body} />}
          <button type="button" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={onDone} disabled={done}>
            {done ? 'Completado' : 'Marcar como leído'}
          </button>
        </>
      )}
    </div>
  );
}

export default function ModulePage() {
  const { id } = useParams();
  const mod = MODULES.find((m) => m.id === id);
  const { completed, markDone } = useModuleProgress();
  const { items: laura } = useContent<LauraData, LauraItem>('laura', toLaura, STATIC.laura);
  const authorized = laura.find((l) => l.slug === id);

  if (!mod) {
    return (
      <EmptyState icon="path" title="No encontramos este módulo">
        <Link to="/app/camino" className="btn btn-outline">
          Volver a Mi Camino
        </Link>
      </EmptyState>
    );
  }
  const pillar = PILLARS.find((p) => p.id === mod.pillar)!;
  const related = MODULES.filter((m) => m.pillar === mod.pillar && m.id !== mod.id && m.source === 'original');

  return (
    <div className="container narrow" style={{ padding: 0 }}>
      <PageHeader back="/app/camino" eyebrow={`Pilar ${pillar.id} · ${pillar.title}`} title={mod.title} subtitle={mod.summary} />
      {mod.source === 'laura-pendiente' && authorized ? (
        <AuthorizedContent item={authorized} done={Boolean(completed[mod.id])} onDone={() => void markDone(mod.id)} />
      ) : mod.source === 'laura-pendiente' ? (
        <div className="stack">
          <Notice icon="clock">
            <strong>Texto de Laura pendiente de autorización.</strong> Puedes hacer la paráfrasis ahora. El capítulo completo se publicará aquí, con el mismo identificador, cuando ella lo apruebe.
            {mod.book && (
              <span>
                {' '}
                Referencia: cap. {mod.book.chapter}, pp. {mod.book.pages}.
              </span>
            )}
          </Notice>
          {mod.quote && (
            <figure className="quote-card">
              <blockquote>«{mod.quote.text}»</blockquote>
              <figcaption>
                {AUTHOR.name}, <em>Amor tóxico</em>, p. {mod.quote.page}. {QUOTE_NOTICE}
              </figcaption>
            </figure>
          )}
          {mod.mediaSlot && (
            <div className="card tint-lavanda">
              <strong>Audio y video</strong>
              <p className="small" style={{ marginBottom: 0 }}>
                Hueco reservado para una grabación de Laura. Todavía no hay archivo. No hace falta un plan de pago para la pausa ni para el plan de protección.
              </p>
            </div>
          )}
          <div className="card">
            <h3>Mientras tanto</h3>
            <p className="small">Puedes trabajar este pilar con los ejercicios disponibles o leer el libro.</p>
            <div className="row">
              {related.map((r) => (
                <Link key={r.id} to={r.exerciseId ? `/app/camino/ejercicio/${r.exerciseId}` : r.to ?? '/app/camino'} className="btn btn-outline btn-sm">
                  {r.title}
                </Link>
              ))}
              <a href={LINKS.book} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                El libro <Icon name="external" size={14} />
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <p>{mod.summary}</p>
          <Link to={mod.to ?? '/app/camino'} className="btn btn-primary" onClick={() => markDone(mod.id)}>
            Abrir
          </Link>
          {completed[mod.id] && <p className="small muted">Completado.</p>}
        </div>
      )}
    </div>
  );
}
