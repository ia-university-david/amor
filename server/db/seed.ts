import type { DB } from './index';
import { BLOG_POSTS } from '../../src/content/blog';
import { BRAIN_TOPICS } from '../../src/content/brain';
import { DEFAULT_LIBRARY } from '../../src/content/library';
import { DEFAULT_MESSAGES } from '../../src/content/messages';
import { MODULES } from '../../src/content/program';
import { DEFAULT_PLANS } from '../../shared/plans';
import type { ContentType } from '../../shared/content';
import { newId, now } from '../util';

interface SeedItem {
  slug: string;
  title: string;
  status: string;
  data: unknown;
}

function defaults(): Record<ContentType, SeedItem[]> {
  return {
    message: DEFAULT_MESSAGES.map((m) => ({ slug: m.id, title: m.text, status: 'publicado', data: { text: m.text } })),
    blog: BLOG_POSTS.map((p) => ({
      slug: p.slug,
      title: p.title,
      status: p.status,
      data: { category: p.category, readingMinutes: p.readingMinutes, summary: p.summary, body: p.body, author: p.author, publishedAt: p.publishedAt },
    })),
    library: DEFAULT_LIBRARY.map((l) => {
      const { id, title, ...rest } = l;
      return { slug: id, title, status: 'publicado', data: { ...rest, reviewer: '' } };
    }),
    brain: BRAIN_TOPICS.map((t) => {
      const { id, title, ...rest } = t;
      return { slug: id, title, status: 'publicado', data: rest };
    }),
    laura: MODULES.filter((m) => m.source === 'laura-pendiente').map((m) => ({
      slug: m.id,
      title: m.title,
      status: 'borrador',
      data: { kind: 'capitulo', summary: m.summary, body: '', authorization: '' },
    })),
    plan: DEFAULT_PLANS.map((p) => ({ slug: p.id, title: p.name, status: 'publicado', data: p })),
  };
}

/** Seeds each content type once, only when it has no rows yet (editors' changes are never overwritten). */
export async function seedContent(db: DB): Promise<void> {
  for (const [type, items] of Object.entries(defaults()) as [ContentType, SeedItem[]][]) {
    const existing = await db.selectFrom('content_items').select('id').where('type', '=', type).limit(1).executeTakeFirst();
    if (existing) continue;
    const t = now();
    for (const [i, item] of items.entries()) {
      await db
        .insertInto('content_items')
        .values({ id: newId(), type, slug: item.slug, title: item.title, status: item.status, data: JSON.stringify(item.data), sort: i, updated_at: t, updated_by: null })
        .execute();
    }
  }
}
