// public/montree-sw.js
// Service Worker for Montree PWA
// Provides offline caching and background sync

// Bumped to v4 (May 3, 2026) — fix for the ghost 503 console noise that has
// been chasing us across multiple sessions. The previous fetch handler called
// event.respondWith() on EVERY same-origin GET (including Next.js RSC
// prefetches the SW had no business handling). When any such fetch failed —
// briefly aborted, cancelled, network blip — the .catch() block fabricated a
// synthetic 503 response with `new Response('Offline', { status: 503 })`.
// That 503 was logged in console even though Railway never returned one
// (confirmed by absence of [req] log lines for the page in Railway logs).
// New behavior: only intercept cacheable static assets + navigation requests.
// Everything else (RSC prefetches, page documents going to network normally,
// data fetches) is left to the browser's default stack — no fake 503s.
//
// Also: OFFLINE_URL is now actually pre-cached on install. Previously listed
// as the navigation fallback but never added to PRECACHE_ASSETS, so the
// fallback always missed and fell through to the synthetic 503.
// Bumped to v6 (May 4, 2026) — Tracy avatar refreshed to the stretched-borders
// T monogram (no more white edges). Cache bump forces existing PWA installs
// to discard the cached old tracy-avatar.png on next activation.
// (v5 was the M-monogram favicon/icon uniform brand bump earlier same day.)
const CACHE_NAME = 'montree-v6';
const OFFLINE_URL = '/montree/offline';

// Only cache immutable assets — static files that change with build hashes.
// HTML pages always go to the network so dashboards can't get stuck on a stale
// shell while live API calls fail (the bug we hit Apr 30, 2026).
const IMMUTABLE_EXT = /\.(js|css|woff2?|ttf|otf|eot|png|jpe?g|gif|svg|ico|webp|map)$/i;
function isCacheable(url) {
  try {
    const u = new URL(url);
    if (u.pathname.startsWith('/_next/static/')) return true;
    if (u.pathname.startsWith('/montree-icons/')) return true;
    if (IMMUTABLE_EXT.test(u.pathname)) return true;
    return false;
  } catch {
    return false;
  }
}

// Assets to cache immediately on install. OFFLINE_URL is now included so
// the navigation-failure fallback below actually works.
const PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/montree/parent/login',
  '/montree/parent/dashboard',
  '/montree-manifest.json',
  '/montree-icons/icon-192.png',
  '/montree-icons/icon-512.png',
];

// Install event - cache core assets.
// We use per-URL cache.add wrapped in Promise.allSettled instead of
// cache.addAll because addAll rejects the entire install if ANY URL returns
// non-200. A single transient 404 (e.g., during a deploy where a route is
// briefly unavailable, or if a future commit accidentally deletes a precache
// route) would break offline support for everyone. allSettled lets us skip
// individual failures and still install with whatever assets we did get.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Montree SW] Precaching assets');
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[Montree SW] Precache failed for', url, err);
          })
        )
      );
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[Montree SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event — narrow scope.
// We ONLY intercept things we actually serve from cache:
//   1. Cacheable static assets (so we can read-through cache + populate it)
//   2. Top-level navigation requests (so we can fall back to the offline page
//      when the network is down)
// Everything else — RSC prefetches, dynamic pages, data fetches — passes
// straight through the browser's default stack. This eliminates the synthetic
// 503 console noise that the old broad-intercept caused: any time a Next.js
// prefetch flickered, the SW's .catch() fabricated a 503 even though the
// server never returned one.
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API calls — always go to network, never SW-touched.
  if (event.request.url.includes('/api/')) return;

  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  const isNavigation = event.request.mode === 'navigate';
  const cacheable = isCacheable(event.request.url);

  // If we're not going to do anything special, don't intercept at all.
  // Browser handles the request normally. No fake 503 on transient failures.
  if (!isNavigation && !cacheable) return;

  if (cacheable) {
    // Static asset path: try network, populate cache on success, fall back to
    // cache on failure. Failures don't synthesize a status code — we either
    // return the cached version or let the error propagate.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;
          // Re-throw so the browser sees a normal network failure instead of
          // a fake 503. This is what would have happened without the SW.
          throw new TypeError('Asset fetch failed and no cache fallback');
        })
    );
    return;
  }

  // Navigation path: try network, fall back to offline page on failure. The
  // offline page is now actually pre-cached (PRECACHE_ASSETS above), so this
  // fallback no longer falls through to a synthetic 503.
  event.respondWith(
    fetch(event.request)
      .catch(async () => {
        const offlineResponse = await caches.match(OFFLINE_URL);
        if (offlineResponse) return offlineResponse;
        // Last resort: re-throw so the browser shows its native offline UI.
        throw new TypeError('Navigation fetch failed and offline page missing from cache');
      })
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New update available',
    icon: '/montree-icons/icon-192.png',
    badge: '/montree-icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/montree/parent/dashboard',
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Montree', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/montree/parent/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes('/montree/') && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

console.log('[Montree SW] Service worker loaded');
