import { Link, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Seo, articleLd } from '../../components/Seo';
import { EmptyState, Notice, formatDate } from '../../components/ui';
import { BLOG_STATUS_NOTICE, type BlogPost } from '../../content/blog';
import { STATIC, toBlogPost, useContent } from '../../lib/content';
import { Markdown, plainText } from '../../lib/markdown';
import type { BlogData } from '../../../shared/content';

export function useBlogPosts() {
  return useContent<BlogData, BlogPost>('blog', toBlogPost, STATIC.blog);
}

export function BlogIndex() {
  const { items } = useBlogPosts();
  return (
    <div className="container section">
      <Seo title="Artículos" description="Lecturas sobre relaciones, identidad, límites y sanación emocional después de una relación que te hizo daño." path="/blog" />
      <div className="section-head">
        <span className="eyebrow">Artículos</span>
        <h1>Blog</h1>
        <p className="muted">Lecturas sobre relaciones, identidad y sanación emocional.</p>
      </div>
      <div className="grid">
        {items.map((p) => (
          <Link key={p.slug} to={`/blog/${p.slug}`} className="card card-link">
            <span className="badge">{p.category}</span>
            <h2 style={{ fontSize: '1.2rem', marginTop: '0.75rem' }}>{p.title}</h2>
            <p className="small muted" style={{ margin: 0 }}>
              {p.readingMinutes ? `${p.readingMinutes} min de lectura` : 'Lectura breve'} · {p.author}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function BlogPostPage() {
  const { slug } = useParams();
  const { items, loading } = useBlogPosts();
  const post = items.find((p) => p.slug === slug);
  if (!post) {
    if (loading) return <div className="container narrow section" aria-busy="true" />;
    return (
      <div className="container narrow section">
        <Seo title="Artículo no encontrado" noindex />
        <EmptyState icon="book" title="No encontramos este artículo">
          <Link to="/blog" className="btn btn-outline">
            Ver todos los artículos
          </Link>
        </EmptyState>
      </div>
    );
  }
  const pending = post.status === 'pendiente-migracion' || !post.body.trim();
  const description = post.seoDescription || post.summary || plainText(post.body).slice(0, 160);
  const notice = BLOG_STATUS_NOTICE[post.status];
  return (
    <article className="container narrow section prose">
      <Seo
        title={post.seoTitle || post.title}
        description={description}
        path={`/blog/${post.slug}`}
        type="article"
        image={post.ogImage || undefined}
        jsonLd={articleLd({ title: post.title, description, slug: post.slug, author: post.author, datePublished: post.publishedAt })}
      />
      <Link to="/blog" className="muted" style={{ textDecoration: 'none' }}>
        <Icon name="back" size={16} /> Artículos
      </Link>
      <div style={{ margin: '1rem 0' }}>
        <span className="badge">{post.category}</span>
      </div>
      <h1>{post.title}</h1>
      <p className="muted">
        {post.author}
        {post.readingMinutes ? ` · ${post.readingMinutes} min de lectura` : ''}
        {post.publishedAt ? ` · ${formatDate(post.publishedAt, { dateStyle: 'long' })}` : ''}
      </p>
      {pending ? (
        <div className="stack">
          <p className="muted">{post.summary}</p>
          <Notice icon="clock">
            <strong>Contenido pendiente de migración.</strong> El texto completo de este artículo se está trasladando desde el sitio anterior y
            aparecerá aquí tal como fue publicado.
          </Notice>
        </div>
      ) : (
        <>
          {notice && post.status !== 'publicado' && <Notice icon="info">{notice}</Notice>}
          <Markdown source={post.body} />
        </>
      )}
      <div className="row" style={{ marginTop: '2rem' }}>
        <Link to="/bienvenida" className="btn btn-primary">
          Comenzar mi proceso
        </Link>
        <Link to="/test" className="btn btn-outline">
          Hacer el test
        </Link>
      </div>
    </article>
  );
}
