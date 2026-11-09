import { Link, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { EmptyState, Notice } from '../../components/ui';
import { BLOG_POSTS } from '../../content/blog';

export function BlogIndex() {
  return (
    <div className="container section">
      <div className="section-head">
        <span className="eyebrow">Artículos</span>
        <h1>Blog</h1>
        <p className="muted">Lecturas sobre relaciones, identidad y sanación emocional.</p>
      </div>
      <div className="grid">
        {BLOG_POSTS.map((p) => (
          <Link key={p.slug} to={`/blog/${p.slug}`} className="card card-link">
            <span className="badge">{p.category}</span>
            <h2 style={{ fontSize: '1.2rem', marginTop: '0.75rem' }}>{p.title}</h2>
            <p className="small muted" style={{ margin: 0 }}>
              {p.readingMinutes ? `${p.readingMinutes} min de lectura` : 'Lectura breve'}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function BlogPostPage() {
  const { slug } = useParams();
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) {
    return (
      <div className="container narrow section">
        <EmptyState icon="book" title="No encontramos este artículo">
          <Link to="/blog" className="btn btn-outline">
            Ver todos los artículos
          </Link>
        </EmptyState>
      </div>
    );
  }
  return (
    <article className="container narrow section">
      <Link to="/blog" className="muted" style={{ textDecoration: 'none' }}>
        <Icon name="back" size={16} /> Artículos
      </Link>
      <div style={{ margin: '1rem 0' }}>
        <span className="badge">{post.category}</span>
      </div>
      <h1>{post.title}</h1>
      {post.readingMinutes && <p className="muted">{post.readingMinutes} min de lectura</p>}
      {post.status === 'pendiente-migracion' || post.body.length === 0 ? (
        <div className="stack">
          <p className="muted">{post.summary}</p>
          <Notice icon="clock">
            <strong>Contenido pendiente de migración.</strong> El texto completo de este artículo se está trasladando desde el sitio
            anterior y aparecerá aquí muy pronto, tal como fue publicado.
          </Notice>
          <div className="row">
            <Link to="/bienvenida" className="btn btn-primary">
              Comenzar mi proceso
            </Link>
            <Link to="/test" className="btn btn-outline">
              Hacer el test
            </Link>
          </div>
        </div>
      ) : (
        post.body.map((para, i) => <p key={i}>{para}</p>)
      )}
    </article>
  );
}
