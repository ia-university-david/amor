/** CMS item shapes shared by the API, the admin panel and the public pages. */
export const CONTENT_TYPES = ['message', 'laura', 'blog', 'library', 'brain', 'plan'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_STATUSES: Record<ContentType, readonly string[]> = {
  message: ['publicado', 'borrador'],
  // Laura's material is only shown once it is explicitly authorized.
  laura: ['borrador', 'autorizado'],
  blog: ['borrador', 'pendiente-migracion', 'pendiente-revision', 'publicado'],
  library: ['publicado', 'borrador'],
  brain: ['publicado', 'borrador'],
  plan: ['publicado', 'borrador'],
};

/** Statuses visible on the public site. */
export const PUBLIC_STATUSES: Record<ContentType, readonly string[]> = {
  message: ['publicado'],
  laura: ['autorizado'],
  blog: ['pendiente-migracion', 'pendiente-revision', 'publicado'],
  library: ['publicado'],
  brain: ['publicado'],
  plan: ['publicado'],
};

export interface ContentItem<T = Record<string, unknown>> {
  id: string;
  type: ContentType;
  slug: string;
  title: string;
  status: string;
  sort: number;
  updatedAt: string;
  data: T;
}

export interface BlogData {
  category: string;
  readingMinutes: number | null;
  summary: string;
  /** Markdown. Empty while the original article is pending migration. */
  body: string;
  author: string;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  publishedAt?: string;
}

export interface LauraData {
  kind: 'capitulo' | 'video' | 'audio' | 'ejercicio';
  summary: string;
  /** Markdown with the authorized text. */
  body: string;
  mediaUrl?: string;
  durationMinutes?: number;
  premium?: boolean;
  /** Who approved the content and when (free text, e.g. "Laura Rojas, correo 2026-05-02"). */
  authorization?: string;
}

export interface LibraryData {
  authors: string;
  source: string;
  year: string;
  url: string;
  evidenceLevel: string;
  summary: string;
  limitations: string;
  reviewedAt: string | null;
  reviewer?: string;
}

export const ROLE_LABELS: Record<string, string> = {
  user: 'Persona usuaria',
  moderador: 'Moderación',
  editor: 'Edición',
  admin: 'Administración',
};
