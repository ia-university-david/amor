export interface BlogPost {
  slug: string;
  title: string;
  category: string;
  readingMinutes: number | null;
  summary: string;
  /** Real article body, to be migrated from the current site. Empty until then. */
  body: string[];
  status: 'pendiente-migracion' | 'publicado';
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'te-convertiste-en-otra-persona',
    title: '¿Te convertiste en otra persona? Señales de que tu relación está cambiando quién eres',
    category: 'Identidad',
    readingMinutes: 8,
    summary: 'Sobre las señales de que una relación puede estar cambiando quién eres.',
    body: [],
    status: 'pendiente-migracion',
  },
  {
    slug: 'como-identificar-relacion-toxica',
    title: '¿Cómo identificar si estás en una relación tóxica?',
    category: 'Relaciones',
    readingMinutes: 5,
    summary: 'Sobre cómo reconocer si una relación te está haciendo daño.',
    body: [],
    status: 'pendiente-migracion',
  },
  {
    slug: 'contacto-cero-guia-completa',
    title: 'Contacto Cero: la guía completa para sanar',
    category: 'Sanación',
    readingMinutes: 7,
    summary: 'Sobre el contacto cero como herramienta para sanar después de una relación.',
    body: [],
    status: 'pendiente-migracion',
  },
  {
    slug: 'amor-propio-despues-relacion-toxica',
    title: 'Amor propio después de una relación tóxica',
    category: 'Amor propio',
    readingMinutes: null,
    summary: 'Sobre cómo reconstruir el amor propio después de una relación que te hizo daño.',
    body: [],
    status: 'pendiente-migracion',
  },
];
