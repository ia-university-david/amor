import { useEffect, useState } from 'react';
import type { BlogData, ContentItem, ContentType, LauraData, LibraryData } from '../../shared/content';
import { DEFAULT_PLANS, type PlanConfig } from '../../shared/plans';
import { BLOG_POSTS, type BlogPost, type BlogStatus } from '../content/blog';
import { BRAIN_TOPICS, type BrainTopic } from '../content/brain';
import { DEFAULT_LIBRARY, type EvidenceLevel, type LibraryEntry } from '../content/library';
import { DEFAULT_MESSAGES, type ProductMessage } from '../content/messages';
import { api } from './api';
import { data } from './data';

export type { ContentItem };

/** Fetches published CMS items; caches them on the device for offline use. */
export async function fetchContent<T>(type: ContentType): Promise<ContentItem<T>[] | null> {
  const r = await api<{ items: ContentItem<T>[] }>(`/content/${type}`);
  if (!r.ok || !r.data) return null;
  await data().put('content', `cms-${type}`, r.data.items);
  return r.data.items;
}

export async function cachedContent<T>(type: ContentType): Promise<ContentItem<T>[] | null> {
  return (await data().get<ContentItem<T>[]>('content', `cms-${type}`)) ?? null;
}

export type ContentSource = 'api' | 'cache' | 'static';

/** Static → cache → API, so the page renders immediately and works offline. */
export function useContent<T, R>(type: ContentType, map: (item: ContentItem<T>) => R, fallback: R[]): { items: R[]; source: ContentSource; loading: boolean } {
  const [state, setState] = useState<{ items: R[]; source: ContentSource; loading: boolean }>({ items: fallback, source: 'static', loading: true });
  useEffect(() => {
    let alive = true;
    (async () => {
      const cached = await cachedContent<T>(type).catch(() => null);
      if (alive && cached?.length) setState({ items: cached.map(map), source: 'cache', loading: true });
      const fresh = await fetchContent<T>(type).catch(() => null);
      if (!alive) return;
      if (fresh) setState({ items: fresh.map(map), source: 'api', loading: false });
      else setState((s) => ({ ...s, loading: false }));
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);
  return state;
}

export const toMessage = (i: ContentItem<{ text: string }>): ProductMessage => ({ id: i.slug, text: i.data.text });

export const toBlogPost = (i: ContentItem<BlogData>): BlogPost => ({
  slug: i.slug,
  title: i.title,
  category: i.data.category,
  readingMinutes: i.data.readingMinutes,
  summary: i.data.summary,
  body: i.data.body ?? '',
  author: i.data.author,
  status: i.status as BlogStatus,
  publishedAt: i.data.publishedAt,
  seoTitle: i.data.seoTitle,
  seoDescription: i.data.seoDescription,
  ogImage: i.data.ogImage,
});

export const toLibraryEntry = (i: ContentItem<LibraryData>): LibraryEntry & { reviewer?: string } => ({
  id: i.slug,
  title: i.title,
  authors: i.data.authors,
  source: i.data.source,
  year: i.data.year,
  url: i.data.url,
  evidenceLevel: i.data.evidenceLevel as EvidenceLevel,
  summary: i.data.summary,
  limitations: i.data.limitations,
  reviewedAt: i.data.reviewedAt,
  reviewer: i.data.reviewer,
});

export const toBrainTopic = (i: ContentItem<Omit<BrainTopic, 'id' | 'title'>>): BrainTopic => ({ id: i.slug, title: i.title, ...i.data });

export interface LauraItem extends LauraData {
  slug: string;
  title: string;
}
export const toLaura = (i: ContentItem<LauraData>): LauraItem => ({ slug: i.slug, title: i.title, ...i.data });

export const toPlan = (i: ContentItem<PlanConfig>): PlanConfig => i.data;

export const STATIC = {
  messages: DEFAULT_MESSAGES,
  blog: BLOG_POSTS.filter((p) => p.status !== 'borrador'),
  library: DEFAULT_LIBRARY,
  brain: BRAIN_TOPICS,
  plans: DEFAULT_PLANS,
  laura: [] as LauraItem[],
};
