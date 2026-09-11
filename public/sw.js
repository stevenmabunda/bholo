// BHOLO service worker — minimal by design. This isn't an offline-first
// app: the feed, auth and live fixtures always need a real network round
// trip, so this worker's only job is (a) make the site installable as a
// PWA/TWA and (b) show something better than a blank tab on a navigation
// that genuinely has no network — never to serve stale feed/profile data.
//
// v1 also cache-first-served hashed /_next/static/ JS chunks out of this
// worker's own CacheStorage. That doubled up work the browser's own HTTP
// cache already does correctly (Next ships those with immutable, far-future
// cache-control, keyed by content hash) — and it went stale in a way the
// browser cache can't: a tab that had an old deploy's chunks cached here
// kept serving them after a new deploy shipped a differently-shaped route
// tree (a new parallel route slot, in the incident that found this), so
// the old JS and the new page's RSC payload disagreed with each other and
// crashed client-side navigation ("e is not iterable") instead of Next's
// own chunk-load-failure recovery ever getting a chance to run. Simplest
// fix is to stop shadowing the browser cache at all — this worker now only
// ever caches the tiny true-offline shell (icons + offline.html).
const CACHE = 'bholo-shell-v2';
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
  // Bumping CACHE's name (v1 -> v2) means this also deletes every existing
  // visitor's old cache, chunks and all, the first time their browser
  // activates this worker — the actual fix for anyone already stuck.
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

  // Everything else — /_next/static/ chunks included — falls through to
  // the browser's normal fetch handling. No respondWith here at all.
});
