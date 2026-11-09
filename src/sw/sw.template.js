/* Amor Tóxico service worker. Generated at build time from src/sw/sw.template.js. */
/* eslint-disable no-restricted-globals */

const VERSION = __CACHE_VERSION__;
const PRECACHE = 'amor-precache-' + VERSION;
const RUNTIME = 'amor-runtime-v1';
const PRECACHE_URLS = __PRECACHE_LIST__;
const OFFLINE_URL = '/offline.html';
const SHELL_URL = '/app.html';

// Never cache API calls or anything that might carry personal data.
const NEVER_CACHE = [/^\/api\//, /\/auth\//, /\/leads?\b/, /\/assistant\b/];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('amor-precache-') && k !== PRECACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER_CACHE.some((re) => re.test(url.pathname))) return;

  if (request.mode === 'navigate') {
    // Network first for pages; offline falls back to the cached SPA shell,
    // and to the offline page if the shell is somehow missing.
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(PRECACHE);
        return (await cache.match(SHELL_URL)) || (await cache.match(OFFLINE_URL)) || Response.error();
      }),
    );
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    // Hashed, immutable build assets: cache first.
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(RUNTIME).then((c) => c.put(request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Other static files (icons, manifest): stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((hit) => {
      const network = fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(RUNTIME).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || network;
    }),
  );
});

// Push payloads never carry sensitive content; only a short generic text and an in-app path.
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  const title = typeof payload.title === 'string' ? payload.title : 'Amor Tóxico';
  const body = typeof payload.body === 'string' ? payload.body : 'Un momento para ti.';
  const url = typeof payload.url === 'string' && payload.url.startsWith('/') ? payload.url : '/app';
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: typeof payload.tag === 'string' ? payload.tag : 'recordatorio',
      data: { url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/app';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => new URL(c.url).pathname.startsWith('/app'));
      if (existing) {
        if ('navigate' in existing) existing.navigate(url).catch(() => undefined);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
