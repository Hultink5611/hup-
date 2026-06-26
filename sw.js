/* Hup! — Service Worker
 * Strategy (belangrijk voor zelfherstel bij updates):
 *   - Navigatie (HTML) en de kern-app (app.js): NETWORK-FIRST.
 *     Verse code wint altijd zolang er internet is; de cache is enkel
 *     een offline-fallback. Zo kan een oude/kapotte gecachte app.js de
 *     gebruiker NOOIT permanent blokkeren.
 *   - Overige same-origin assets (manifest, icons): cache-first.
 *   - Cross-origin CDN's (React/Tailwind/Babel/Lucide/fonts):
 *     stale-while-revalidate, zodat offline blijft werken.
 */
const VERSION = 'hup-v25';
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './icon.svg',
  './icon-maskable.svg',
  './og.svg',
];

// Same-origin paden die ALTIJD network-first moeten (de levende app-code).
const CORE = ['/', '/index.html', '/app.js', '/sw.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      // addAll faalt als één asset mislukt → val terug op best-effort per asset.
      .then((cache) => Promise.allSettled(SHELL_ASSETS.map((a) => cache.add(a))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function networkFirst(request) {
  return fetch(request)
    .then((resp) => {
      if (resp && (resp.ok || resp.type === 'opaqueredirect')) {
        const copy = resp.clone();
        caches.open(SHELL_CACHE).then((c) => c.put(request, copy));
      }
      return resp;
    })
    .catch(() => caches.match(request).then((c) => c || caches.match('./index.html')));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // Navigaties en kern-app: network-first.
  if (request.mode === 'navigate') { event.respondWith(networkFirst(request)); return; }

  if (sameOrigin) {
    const path = url.pathname.replace(/\/hup-\//, '/'); // pad t.o.v. app-root
    const isCore = CORE.some((p) => path === p || path.endsWith('/app.js') || path.endsWith('/sw.js') || path.endsWith('/index.html'));
    if (isCore) { event.respondWith(networkFirst(request)); return; }

    // Overige same-origin: cache-first (manifest, icons).
    event.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request).then((resp) => {
          const copy = resp.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(request, copy));
          return resp;
        })
      )
    );
    return;
  }

  // Cross-origin CDN's: stale-while-revalidate.
  event.respondWith(
    caches.open(RUNTIME_CACHE).then((cache) =>
      cache.match(request).then((cached) => {
        const network = fetch(request)
          .then((resp) => { if (resp && (resp.ok || resp.type === 'opaque')) cache.put(request, resp.clone()); return resp; })
          .catch(() => cached);
        return cached || network;
      })
    )
  );
});
