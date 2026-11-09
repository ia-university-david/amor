#!/usr/bin/env node
/**
 * Writes static HTML for every public route after `vite build`, so search
 * engines and link previews get real content and per-page meta tags.
 *
 * - dist/app.html is the untouched SPA shell (fallback for /app, /admin…).
 * - dist/<route>/index.html is the prerendered page; the browser then
 *   renders the live app over it.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const ssrDir = join(root, 'dist-ssr');

const template = await readFile(join(dist, 'index.html'), 'utf8');
await writeFile(join(dist, 'app.html'), template);

const { render, prerenderRoutes, sitemapXml, robotsTxt } = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href);

const DEFAULT_HEAD = [
  /<title>[\s\S]*?<\/title>\s*/,
  /<meta\s+name="description"[\s\S]*?\/>\s*/,
  /<meta\s+property="og:title"[^>]*>\s*/,
  /<meta\s+property="og:description"[^>]*>\s*/,
  /<meta\s+property="og:type"[^>]*>\s*/,
  /<meta\s+property="og:locale"[^>]*>\s*/,
];

function page(head, html) {
  let out = template;
  for (const re of DEFAULT_HEAD) out = out.replace(re, '');
  out = out.replace('</head>', `    ${head}\n  </head>`);
  return out.replace('<div id="root"></div>', `<div id="root">${html}</div>`);
}

let count = 0;
for (const route of prerenderRoutes()) {
  const { html, head } = await render(route);
  const file = route === '/' ? join(dist, 'index.html') : join(dist, route.slice(1), 'index.html');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, page(head, html));
  count++;
}

await writeFile(join(dist, 'sitemap.xml'), sitemapXml());
await writeFile(join(dist, 'robots.txt'), robotsTxt());
await rm(ssrDir, { recursive: true, force: true });
console.log(`prerender: ${count} páginas, sitemap.xml y robots.txt`);
