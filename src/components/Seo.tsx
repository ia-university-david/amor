import { createContext, useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SITE_NAME, SITE_URL } from '../../shared/seo';
import { AUTHOR, BOOK, LINKS } from '../content/links';

export interface SeoProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article';
  jsonLd?: object | object[];
  noindex?: boolean;
}

export const DEFAULT_DESCRIPTION =
  'Un espacio de acompañamiento para comprender lo que sientes después de una relación que te hizo daño, manejar los impulsos y reconstruir tu vida a tu ritmo. Inspirado en el libro Amor Tóxico de Laura Rojas.';
const DEFAULT_IMAGE = '/icons/icon-512.png';

/** Collects head tags during prerendering (server side). */
export const HeadContext = createContext<{ set(p: SeoProps): void } | null>(null);

export function fullTitle(title?: string) {
  return title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · Volver a ti también es una forma de sanar`;
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function jsonLdText(obj: object) {
  // Escape "<" so content can never close the script element.
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

export function headTags(p: SeoProps, pathname: string): string {
  const url = SITE_URL + (p.path ?? pathname);
  const image = (p.image ?? DEFAULT_IMAGE).startsWith('http') ? p.image! : SITE_URL + (p.image ?? DEFAULT_IMAGE);
  const title = fullTitle(p.title);
  const desc = p.description ?? DEFAULT_DESCRIPTION;
  const ld = p.jsonLd ? (Array.isArray(p.jsonLd) ? p.jsonLd : [p.jsonLd]) : [];
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    p.noindex ? '<meta name="robots" content="noindex, nofollow" />' : '',
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:type" content="${p.type ?? 'website'}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    '<meta property="og:locale" content="es_ES" />',
    '<meta name="twitter:card" content="summary" />',
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(desc)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    ...ld.map((o) => `<script type="application/ld+json">${jsonLdText(o)}</script>`),
  ]
    .filter(Boolean)
    .join('\n    ');
}

function setMeta(attr: 'name' | 'property', key: string, value: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (value === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = value;
}

export function Seo(props: SeoProps) {
  const head = useContext(HeadContext);
  const { pathname } = useLocation();
  head?.set(props);
  const ldKey = JSON.stringify(props.jsonLd ?? null);

  useEffect(() => {
    const url = SITE_URL + (props.path ?? pathname);
    const title = fullTitle(props.title);
    const desc = props.description ?? DEFAULT_DESCRIPTION;
    const image = (props.image ?? DEFAULT_IMAGE).startsWith('http') ? props.image! : SITE_URL + (props.image ?? DEFAULT_IMAGE);
    document.title = title;
    setMeta('name', 'description', desc);
    setMeta('name', 'robots', props.noindex ? 'noindex, nofollow' : null);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:type', props.type ?? 'website');
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:image', image);
    setMeta('name', 'twitter:card', 'summary');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', desc);
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;
    document.head.querySelectorAll('script[type="application/ld+json"]').forEach((s) => s.remove());
    const ld = props.jsonLd ? (Array.isArray(props.jsonLd) ? props.jsonLd : [props.jsonLd]) : [];
    for (const o of ld) {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.textContent = jsonLdText(o);
      document.head.appendChild(s);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.title, props.description, props.path, props.image, props.type, props.noindex, ldKey, pathname]);

  return null;
}

export const ORGANIZATION_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/icons/icon-512.png`,
  sameAs: [LINKS.instagram, LINKS.youtube],
};

export const WEBSITE_LD = { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: SITE_URL, inLanguage: 'es' };

export const BOOK_LD = {
  '@context': 'https://schema.org',
  '@type': 'Book',
  name: BOOK.title,
  author: { '@type': 'Person', name: AUTHOR.name },
  description: BOOK.description,
  inLanguage: 'es',
  url: LINKS.book,
};

export function faqLd(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
  };
}

export function articleLd(a: { title: string; description: string; slug: string; author: string; datePublished?: string; dateModified?: string }) {
  const isTeam = !a.author || a.author.startsWith('Equipo');
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.description,
    inLanguage: 'es',
    mainEntityOfPage: `${SITE_URL}/blog/${a.slug}`,
    author: isTeam ? { '@type': 'Organization', name: a.author || SITE_NAME } : { '@type': 'Person', name: a.author },
    publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: `${SITE_URL}/icons/icon-512.png` } },
    ...(a.datePublished ? { datePublished: a.datePublished } : {}),
    ...(a.dateModified ? { dateModified: a.dateModified } : {}),
  };
}
