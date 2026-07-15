/* public/coach-sw.js
 *
 * Lyf Coach service worker — Web Push ONLY. It does NOT intercept fetches and
 * caches nothing, so it can never serve a stale app shell or interfere with the
 * coach's normal operation. Its single job: receive a reminder push (dispatched
 * by /api/story/cron/send-reminders) and show a notification the user can tap to
 * open their coach.
 *
 * Registered from the Lyf Coach page with scope '/lyf-coach/'.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// A reminder push arrived. Show the notification.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }

  const title = data.title || 'Lyf Coach';
  const url = data.url || '/lyf-coach/coach';

  const options = {
    body: data.body || 'A reminder from your coach.',
    icon: '/montree-icons/icon-192.png',
    badge: '/montree-icons/icon-192.png',
    tag: data.tag || 'lyf-coach-reminder',
    renotify: true,
    vibrate: [120, 60, 120],
    data: { url: url },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// The user tapped the reminder — focus an open coach tab or open one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || '/lyf-coach/coach';

  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of wins) {
        if (client.url.includes('/lyf-coach') && 'focus' in client) {
          try {
            await client.navigate(url);
          } catch (e) {
            /* navigate can reject on some clients — focus anyway */
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })()
  );
});
