'use client';

// components/story/EnableNotificationsButton.tsx
//
// One-tap opt-in for Story call notifications. Shown on the Story user
// page. Registers the push service worker, requests notification
// permission, creates a Web Push subscription, and saves it to the
// server so the admin's call can reach this device when the app is
// closed.
//
// iOS note: Web Push only works inside the PWA installed to the Home
// Screen (iOS 16.4+). In a plain Safari tab `PushManager` is undefined —
// the component then shows an "add to Home Screen" hint instead.

import { useCallback, useEffect, useState } from 'react';

type State =
  | 'checking'      // figuring out support / current state
  | 'unsupported'   // no Push API here (e.g. iOS Safari tab — not installed)
  | 'idle'          // supported, not yet enabled — show the button
  | 'enabling'      // in flight
  | 'enabled'       // done — render nothing
  | 'denied'        // permission blocked
  | 'error';        // something went wrong / push not configured server-side

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export default function EnableNotificationsButton() {
  const [state, setState] = useState<State>('checking');
  const [errorMsg, setErrorMsg] = useState('');

  // Decide the initial state once, after mount (browser APIs only).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pushSupported()) {
        if (!cancelled) setState('unsupported');
        return;
      }
      if (Notification.permission === 'denied') {
        if (!cancelled) setState('denied');
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration('/story/');
        const existing = reg ? await reg.pushManager.getSubscription() : null;
        if (!cancelled) {
          setState(
            existing && Notification.permission === 'granted' ? 'enabled' : 'idle'
          );
        }
      } catch {
        if (!cancelled) setState('idle');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    setState('enabling');
    setErrorMsg('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'idle');
        return;
      }

      // Fetch the VAPID public key — 503 if push isn't configured server-side.
      const keyRes = await fetch('/api/story/push/public-key');
      if (!keyRes.ok) {
        setErrorMsg(
          keyRes.status === 503
            ? 'Call notifications aren’t switched on yet.'
            : 'Could not set up notifications.'
        );
        setState('error');
        return;
      }
      const { publicKey } = (await keyRes.json()) as { publicKey: string };

      // Register the push-only service worker, scoped to /story/.
      await navigator.serviceWorker.register('/story-sw.js', { scope: '/story/' });
      const reg = await navigator.serviceWorker.ready;

      // Re-use an existing subscription, or create one.
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
      }

      // Save it to the server. Auth via the story-auth cookie + Bearer.
      const token =
        typeof window !== 'undefined' ? sessionStorage.getItem('story_session') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const saveRes = await fetch('/api/story/push/subscribe', {
        method: 'POST',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!saveRes.ok) {
        setErrorMsg('Could not save your notification settings.');
        setState('error');
        return;
      }

      setState('enabled');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Could not set up notifications.');
      setState('error');
    }
  }, []);

  if (state === 'checking' || state === 'enabled') {
    return null;
  }

  if (state === 'unsupported') {
    return (
      <p className="text-center text-xs text-gray-400 mt-2">
        📱 Add Story to your Home Screen, then open it from the icon, to get call alerts.
      </p>
    );
  }

  if (state === 'denied') {
    return (
      <p className="text-center text-xs text-gray-400 mt-2">
        Call notifications are blocked. Turn them on for this site in your browser settings.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5 mt-2">
      <button
        onClick={enable}
        disabled={state === 'enabling'}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white text-sm font-semibold transition-colors"
      >
        🔔 {state === 'enabling' ? 'Enabling…' : 'Enable call notifications'}
      </button>
      {state === 'error' && errorMsg && (
        <p className="text-center text-xs text-rose-500">{errorMsg}</p>
      )}
    </div>
  );
}
