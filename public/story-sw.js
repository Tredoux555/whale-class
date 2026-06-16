/* public/story-sw.js
 *
 * Story system service worker — Web Push ONLY. It does not intercept
 * fetches or cache anything, so it can't interfere with the Story app's
 * normal operation. Its single job: receive a push when the admin places
 * a call and show a notification the user can tap to join.
 *
 * Registered from the Story user page with scope '/story/'.
 */

self.addEventListener('install', () => {
  // Activate immediately — no old SW to wait out (Story had none before).
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// A call push arrived. Show the notification.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }

  const title = data.title || 'Story';
  const callId = data.callId || null;
  const isCall = !!callId;
  // Calls jump to the call surface; everything else (e.g. the emergency board)
  // carries its own target url in the payload.
  const url = isCall
    ? '/story/call?call=' + encodeURIComponent(callId) + '&as=user'
    : (data.url || '/story/active');

  const options = {
    body: data.body || (isCall ? 'Tap to join the call.' : 'Tap to open.'),
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    // A call replaces a stale call; board messages group under their own tag.
    tag: isCall ? 'story-call' : (data.tag || 'story-board'),
    renotify: true,
    requireInteraction: isCall, // calls stay up until acted on; messages don't
    vibrate: isCall ? [200, 100, 200, 100, 200] : [120, 60, 120],
    data: { callId: callId, url: url },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// The user tapped the call notification — open / focus the call surface.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || '/story/active';

  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of wins) {
        if (client.url.includes('/story') && 'focus' in client) {
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
