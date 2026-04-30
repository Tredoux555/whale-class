// public/montree-sw.js
// Service Worker for Montree PWA
// Provides offline caching and background sync

// Bumped to v3 (Apr 30, 2026 — second time this day) — i18n completeness +
// area-letter changes shipped, but PWA installs were still serving the v2
// JS bundle (cached) so the new AreaDot + UI translations never appeared.
// Bumping the version forces activate → purges old cache → serves fresh JS.
const CACHE_NAME = 'montree-v3';
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

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/montree/parent/login',
  '/montree/parent/dashboard',
  '/montree-manifest.json',
  '/montree-icons/icon-192.png',
  '/montree-icons/icon-512.png',
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Montree SW] Precaching assets');
      return cache.addAll(PRECACHE_ASSETS);
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

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API calls - always go to network
  if (event.request.url.includes('/api/')) return;

  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache only immutable static assets. HTML pages must always go to the
        // network so we never serve a stale shell while APIs fail (Apr 30, 2026
        // incident). Navigation requests still get an offline-page fallback below.
        if (response.status === 200 && isCacheable(event.request.url)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(async () => {
        // Network failed - try cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // If it's a navigation request, show offline page
        if (event.request.mode === 'navigate') {
          const offlineResponse = await caches.match(OFFLINE_URL);
          if (offlineResponse) {
            return offlineResponse;
          }
        }

        // Return a basic offline response
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable',
        });
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
