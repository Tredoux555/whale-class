// lib/montree/push-client.ts
// App Store build (Jun 2026): client-side push registration for the native
// shell. Follows the same graceful-degradation pattern as sync-triggers.ts /
// NetworkStatusBanner.tsx — dynamic import of the Capacitor plugin inside a
// catch, silent no-op on web or when the plugin isn't synced.
//
// On iOS the token delivered here is a raw APNs device token; on Android it
// is an FCM registration token. The server's sender (lib/montree/push/
// sender.ts) routes by the stored platform, so the client doesn't care.

import { isNative, getPlatform } from '@/lib/montree/platform';
import { getSession } from '@/lib/montree/auth';
import { getParentSession } from '@/lib/montree/parent-auth';

let initialized = false;

/**
 * True when SOMEONE is signed in on this device (teacher/principal session
 * or parent session in localStorage). Audit-fix (Jun 2026): without this
 * gate the iOS permission prompt fired on the LOGIN screen (parent/principal
 * layouts wrap their login pages), the token POST 401'd, and the one-shot
 * flag was burned so registration never happened post-login.
 */
function hasAnySession(): boolean {
  try {
    return !!getSession() || !!getParentSession();
  } catch {
    return false;
  }
}

/**
 * Request permission, register with APNs/FCM, and store the device token
 * server-side against the current session (cookie-authenticated).
 *
 * Call after login / on authenticated layout mount and on route changes.
 * Runs once per page lifetime AFTER a session exists; no-ops (without
 * burning the one-shot flag) when signed out, on web, or when the push
 * plugin isn't installed in the shell.
 */
export async function initPushRegistration(): Promise<void> {
  if (initialized) return;
  if (!isNative()) return;
  if (!hasAnySession()) return; // not signed in yet — try again on next route change
  initialized = true;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Tapping a notification: follow its deep link if one was attached.
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      try {
        const url = (action.notification?.data as Record<string, string> | undefined)?.url;
        if (url && typeof url === 'string' && url.startsWith('/')) {
          window.location.href = url;
        }
      } catch {
        /* never break the app over a notification tap */
      }
    });

    await PushNotifications.addListener('registration', async (token) => {
      try {
        const res = await fetch('/api/montree/push/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            token: token.value,
            platform: getPlatform(),
            appVersion: '1.0',
          }),
        });
        if (!res.ok) {
          console.warn('[push-client] token registration failed:', res.status);
        }
      } catch (e) {
        console.warn('[push-client] token registration error:', e);
      }
    });

    await PushNotifications.addListener('registrationError', (err) => {
      // Common in dev: missing entitlement / provisioning profile.
      console.warn('[push-client] registration error:', JSON.stringify(err));
    });

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== 'granted') {
      // User said no — respect it quietly. iOS re-prompting requires Settings.
      return;
    }

    await PushNotifications.register();
  } catch (e) {
    // Plugin not installed in this shell build / not native — degrade silently
    // (same contract as the @capacitor/app and @capacitor/network fallbacks).
    console.log('[push-client] push unavailable in this shell:', e);
  }
}

/**
 * Best-effort unregister of this device's token on logout.
 * (We don't have the token cached client-side; instead we ask the plugin to
 * remove delivered notifications and rely on owner re-assignment on next
 * login. Kept minimal deliberately.)
 */
export async function teardownPushOnLogout(): Promise<void> {
  if (!isNative()) return;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.removeAllDeliveredNotifications();
  } catch {
    /* no-op */
  }
}
