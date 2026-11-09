import { StrictMode } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { Writable } from 'node:stream';
import { App } from './App';
import { HeadContext, headTags, type SeoProps } from './components/Seo';
import { BLOG_POSTS } from './content/blog';
import { BRAIN_TOPICS } from './content/brain';
import { AppProvider } from './state/AppContext';
import { PUBLIC_ROUTES, SITE_URL, buildRobots, buildSitemap } from '../shared/seo';

/** Every URL written to disk at build time (public pages, blog posts and brain topics). */
export function prerenderRoutes(): string[] {
  return [
    ...PUBLIC_ROUTES.map((r) => r.path),
    ...BLOG_POSTS.filter((p) => p.status !== 'borrador').map((p) => `/blog/${p.slug}`),
    ...BRAIN_TOPICS.map((t) => `/cerebro/${t.id}`),
  ];
}

export function sitemapXml(): string {
  const extra = prerenderRoutes()
    .filter((p) => !PUBLIC_ROUTES.some((r) => r.path === p))
    .map((path) => ({ path, lastmod: BLOG_POSTS.find((b) => `/blog/${b.slug}` === path)?.publishedAt }));
  return buildSitemap(SITE_URL, extra);
}

export function robotsTxt(): string {
  return buildRobots(SITE_URL);
}

export function render(url: string): Promise<{ html: string; head: string }> {
  let seo: SeoProps = {};
  const collector = { set: (p: SeoProps) => (seo = p) };
  return new Promise((resolve, reject) => {
    let html = '';
    const sink = new Writable({
      write(chunk, _enc, cb) {
        html += chunk.toString();
        cb();
      },
    });
    sink.on('finish', () => resolve({ html, head: headTags(seo, url) }));
    const stream = renderToPipeableStream(
      <StrictMode>
        <HeadContext.Provider value={collector}>
          <StaticRouter location={url}>
            <AppProvider>
              <App />
            </AppProvider>
          </StaticRouter>
        </HeadContext.Provider>
      </StrictMode>,
      {
        onAllReady() {
          stream.pipe(sink);
        },
        onShellError: reject,
        onError(err) {
          reject(err);
        },
      },
    );
  });
}
