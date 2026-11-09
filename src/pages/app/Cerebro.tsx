import { Seo } from '../../components/Seo';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Notice, PageHeader } from '../../components/ui';
import { BRAIN_MODULE_NOTICE, type BrainTopic } from '../../content/brain';
import { STATIC, toBrainTopic, useContent } from '../../lib/content';

export function useBrainBase(): string {
  return useLocation().pathname.startsWith('/app') ? '/app/cerebro' : '/cerebro';
}

export function useBrainTopics() {
  return useContent<Omit<BrainTopic, 'id' | 'title'>, BrainTopic>('brain', toBrainTopic, STATIC.brain).items;
}

export default function Cerebro() {
  const base = useBrainBase();
  const BRAIN_TOPICS = useBrainTopics();
  const inApp = base.startsWith('/app');
  return (
    <div className={inApp ? '' : 'container section'}>
      <Seo
        title="Tu cerebro después de una ruptura"
        description="Quince temas breves para entender por qué una ruptura se siente tan intensa: apego, recompensa, rumiación y más, con ejemplos cotidianos."
        path="/cerebro"
        noindex={inApp}
      />
      <PageHeader
        eyebrow="Pilar 2 · Entender por qué mi cerebro sigue buscando a esa persona"
        title="Tu cerebro después de una ruptura"
        subtitle="Quince temas breves, con ejemplos cotidianos. Te ayudan a entender por qué todo se siente tan intenso, sin convertirlo en una etiqueta."
      />
      <Notice icon="info">{BRAIN_MODULE_NOTICE}</Notice>
      <ol className="list" style={{ marginTop: '1.5rem' }}>
        {BRAIN_TOPICS.map((t) => (
          <li key={t.id}>
            <Link to={`${base}/${t.id}`} className="card card-link row" style={{ flexWrap: 'nowrap' }}>
              <span className="card-icon" style={{ marginBottom: 0, flexShrink: 0 }} aria-hidden="true">
                {t.n}
              </span>
              <span style={{ flex: 1 }}>
                <strong>{t.title}</strong>
                <span className="small muted" style={{ display: 'block' }}>
                  {t.summary}
                </span>
              </span>
              <Icon name="next" className="muted" />
            </Link>
          </li>
        ))}
      </ol>
      <p className="small" style={{ marginTop: '1.5rem' }}>
        <Link to={inApp ? '/app/biblioteca' : '/biblioteca'}>
          <Icon name="library" size={16} /> Ver la biblioteca de referencias
        </Link>
      </p>
    </div>
  );
}
