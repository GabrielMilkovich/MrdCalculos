// =====================================================
// MRD Calc — Service Worker for Offline Support (PWA)
// =====================================================

const CACHE_NAME = 'mrd-calc-v1';
const STATIC_CACHE = 'mrd-calc-static-v1';
const DATA_CACHE = 'mrd-calc-data-v1';

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
];

// Install: pre-cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
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
// - App shell (HTML/JS/CSS): Cache-first, fallback to network
// - Supabase API calls: Network-first, fallback to cache
// - Index/table data: Cache with background refresh (stale-while-revalidate)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Supabase API calls — network first with cache fallback
  if (url.hostname.includes('supabase.co')) {
    // Cache reference table data for offline use
    if (url.pathname.includes('reference_tables') ||
        url.pathname.includes('pjecalc_indices') ||
        url.pathname.includes('pjecalc_faixas')) {
      event.respondWith(
        staleWhileRevalidate(event.request, DATA_CACHE)
      );
      return;
    }
    // Other API calls — network first
    event.respondWith(
      networkFirst(event.request, DATA_CACHE)
    );
    return;
  }

  // Static assets — cache first
  event.respondWith(
    cacheFirst(event.request, STATIC_CACHE)
  );
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
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}
