// =====================================================
// MRD Calc — Service Worker for Offline Support (PWA)
// VERSÃO 2: fix cache-first em HTML causando tela branca após deploy
// =====================================================

const CACHE_VERSION = 'v3';
const STATIC_CACHE = `mrd-calc-static-${CACHE_VERSION}`;
const DATA_CACHE = `mrd-calc-data-${CACHE_VERSION}`;

// Install: skip waiting to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: clean ALL old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DATA_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch strategy:
// - Navigation (HTML): ALWAYS network-first (never serve stale HTML)
// - Hashed assets (/assets/*): cache-first (immutable, hash changes on deploy)
// - Supabase API: network-first with cache fallback
// - Everything else: network-first
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET
  if (event.request.method !== 'GET') return;

  // Navigation requests (HTML pages): ALWAYS network-first
  // This is critical — cache-first on HTML causes blank screen after deploy
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Hashed static assets (/assets/index-XXXX.js) — cache-first (immutable)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // Supabase API — network-first
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(networkFirst(event.request, DATA_CACHE));
    return;
  }

  // Everything else — network-first
  event.respondWith(networkFirst(event.request, STATIC_CACHE));
});

// ── Strategies ──

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503 });
  }
}
