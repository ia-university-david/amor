/** Public routes indexed by search engines (also used for prerendering and the sitemap). */
export const SITE_URL = 'https://amortoxico.com';
export const SITE_NAME = 'Amor Tóxico';

export const PUBLIC_ROUTES: { path: string; priority: number; changefreq: 'weekly' | 'monthly' }[] = [
  { path: '/', priority: 1, changefreq: 'weekly' },
  { path: '/blog', priority: 0.8, changefreq: 'weekly' },
  { path: '/test', priority: 0.8, changefreq: 'monthly' },
  { path: '/guia-72-horas', priority: 0.8, changefreq: 'monthly' },
  { path: '/planes', priority: 0.5, changefreq: 'monthly' },
  { path: '/comunidad/normas', priority: 0.4, changefreq: 'monthly' },
  { path: '/cerebro', priority: 0.7, changefreq: 'monthly' },
  { path: '/biblioteca', priority: 0.5, changefreq: 'monthly' },
  { path: '/contacto', priority: 0.4, changefreq: 'monthly' },
  { path: '/privacidad', priority: 0.3, changefreq: 'monthly' },
];

export function buildSitemap(base: string, extra: { path: string; lastmod?: string }[]): string {
  const urls = [
    ...PUBLIC_ROUTES.map((r) => ({ loc: base + r.path, priority: r.priority, changefreq: r.changefreq, lastmod: undefined as string | undefined })),
    ...extra.map((e) => ({ loc: base + e.path, priority: 0.6, changefreq: 'monthly' as const, lastmod: e.lastmod })),
  ];
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ''}<changefreq>${u.changefreq}</changefreq><priority>${u.priority.toFixed(1)}</priority></url>`)
  .join('\n')}
</urlset>
`;
}

export function buildRobots(base: string): string {
  return `User-agent: *
Allow: /
Disallow: /app
Disallow: /admin
Disallow: /api/
Disallow: /bienvenida
Disallow: /cuenta/
Disallow: /entrar

Sitemap: ${base}/sitemap.xml
`;
}
