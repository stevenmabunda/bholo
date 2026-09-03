// BHOLO service worker — minimal by design. This isn't an offline-first
// app: the feed, auth and live fixtures always need a real network round
// trip, so this worker's only job is (a) make the site installable as a
// PWA/TWA and (b) show something better than a blank tab on a navigation
// that genuinely has no network — never to serve stale feed/profile data.
const CACHE = 'bholo-shell-v1';
const OFFLINE_URL = '/offline.html';
const SHELL_ASSETS = [OFFLINE_URL, '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never intercept Supabase, analytics, or any other cross-origin call —
  // this worker has no business caching auth/data responses.
  if (url.origin !== self.location.origin) return;

  // Page navigations: always try the network first (this is live data),
  // and only fall back to the offline shell when there's truly no connection.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Hashed Next.js build assets (and the shell icons above) are safe to
  // cache indefinitely — their filename changes whenever their content does.
  if (url.pathname.startsWith('/_next/static/') || SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        });
      })
    );
  }
});
