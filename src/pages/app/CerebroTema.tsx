import { Seo } from '../../components/Seo';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { EmptyState, Notice, PageHeader } from '../../components/ui';
import { BRAIN_MODULE_NOTICE } from '../../content/brain';
import { EVIDENCE_LABELS } from '../../content/library';
import { useModuleProgress } from '../../lib/progress';
import { useApp } from '../../state/AppContext';
import { useBrainBase, useBrainTopics } from './Cerebro';

export default function CerebroTema() {
  const { id } = useParams();
  const base = useBrainBase();
  const inApp = base.startsWith('/app');
  const { library, settings } = useApp();
  const { markDone } = useModuleProgress();
  const BRAIN_TOPICS = useBrainTopics();
  const idx = BRAIN_TOPICS.findIndex((t) => t.id === id);
  const topic = BRAIN_TOPICS[idx];

  useEffect(() => {
    if (topic && inApp && settings.onboardingComplete) void markDone('cerebro');
  }, [topic, inApp, settings.onboardingComplete, markDone]);

  if (!topic) {
    return (
      <EmptyState icon="brain" title="No encontramos este tema">
        <Link to={base} className="btn btn-outline">
          Ver todos los temas
        </Link>
      </EmptyState>
    );
  }

  const prev = BRAIN_TOPICS[idx - 1];
  const next = BRAIN_TOPICS[idx + 1];
  const refs = topic.evidence.refs.map((r) => library.find((l) => l.id === r)).filter(Boolean);

  return (
    <article className={inApp ? 'container narrow' : 'container narrow section'} style={inApp ? { padding: 0 } : undefined}>
      <Seo title={topic.title} description={topic.summary} path={`/cerebro/${topic.id}`} type="article" noindex={inApp} />
      <PageHeader back={base} eyebrow={`Tema ${topic.n} de ${BRAIN_TOPICS.length}`} title={topic.title} subtitle={topic.summary} />
      {topic.body.map((p, i) => (
        <p key={i} style={{ fontSize: '1.05rem' }}>
          {p}
        </p>
      ))}
      <div className="card tint-lavanda" style={{ margin: '1.5rem 0' }}>
        <span className="eyebrow">Un ejemplo cotidiano</span>
        <p style={{ margin: 0 }}>{topic.example}</p>
      </div>
      {topic.metaphor && (
        <Notice icon="sparkle">
          <strong>Esto es una metáfora.</strong> {topic.metaphor}
        </Notice>
      )}
      <section className="card" style={{ marginTop: '1.5rem' }} aria-labelledby="evid">
        <h3 id="evid">
          <Icon name="library" size={18} /> Qué dice la evidencia
        </h3>
        <p className="small">{topic.evidence.text}</p>
        {refs.length > 0 && (
          <ul className="small" style={{ paddingLeft: '1.1rem' }}>
            {refs.map((r) => (
              <li key={r!.id}>
                <a href={r!.url} target="_blank" rel="noreferrer">
                  {r!.authors.split(',')[0]} et al. ({r!.year}). {r!.title}
                </a>{' '}
                <span className="badge">{EVIDENCE_LABELS[r!.evidenceLevel]}</span>
                <br />
                <span className="muted">Limitaciones: {r!.limitations}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="small muted" style={{ margin: 0 }}>
          Recuerda: que dos cosas aparezcan juntas (correlación) no significa que una cause la otra.
        </p>
      </section>
      <p className="small muted" style={{ marginTop: '1rem' }}>
        {BRAIN_MODULE_NOTICE}
      </p>
      <nav className="row between" style={{ marginTop: '1.5rem' }} aria-label="Temas">
        {prev ? (
          <Link to={`${base}/${prev.id}`} className="btn btn-outline btn-sm">
            <Icon name="back" size={16} /> Anterior
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={`${base}/${next.id}`} className="btn btn-primary btn-sm">
            Siguiente <Icon name="next" size={16} />
          </Link>
        )}
      </nav>
    </article>
  );
}
