'use client';

// components/story/lyf-coach/EnableRemindersBell.tsx
//
// One-tap opt-in for Lyf Coach reminder push. A small, unobtrusive bell in the
// coach header. Registers the push-only coach service worker (scope /lyf-coach/),
// requests notification permission, creates a Web Push subscription, and saves
// it to the server keyed by the caller's space (via the story-admin bearer) so
// the reminder cron can reach this device when the app is closed.
//
// iOS note: Web Push only works inside the app installed to the Home Screen
// (iOS 16.4+). In a plain Safari tab PushManager is undefined — the bell then
// shows a short "add to Home Screen" hint instead of a dead button.

import { useCallback, useEffect, useState } from 'react';
import { getStoryAdminToken } from '@/lib/story/personal-client';
import { T } from '@/lib/story/personal-theme';

type State =
  | 'checking'
  | 'unsupported'
  | 'idle'
  | 'enabling'
  | 'enabled'
  | 'denied'
  | 'error';

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

export default function EnableRemindersBell() {
  const [state, setState] = useState<State>('checking');
  const [errorMsg, setErrorMsg] = useState('');

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
        const reg = await navigator.serviceWorker.getRegistration('/lyf-coach/');
        const existing = reg ? await reg.pushManager.getSubscription() : null;
        if (!cancelled) setState(existing && Notification.permission === 'granted' ? 'enabled' : 'idle');
      } catch {
        if (!cancelled) setState('idle');
      }
    })();
    return () => { cancelled = true; };
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

      const keyRes = await fetch('/api/story/push/public-key');
      if (!keyRes.ok) {
        setErrorMsg(keyRes.status === 503 ? 'Reminders aren’t switched on yet.' : 'Could not set up reminders.');
        setState('error');
        return;
      }
      const { publicKey } = (await keyRes.json()) as { publicKey: string };

      await navigator.serviceWorker.register('/coach-sw.js', { scope: '/lyf-coach/' });
      const reg = await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
      }

      const token = getStoryAdminToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const saveRes = await fetch('/api/story/coach/push/subscribe', {
        method: 'POST',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!saveRes.ok) {
        setErrorMsg('Could not save your reminder settings.');
        setState('error');
        return;
      }

      setState('enabled');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Could not set up reminders.');
      setState('error');
    }
  }, []);

  // Enabled or still checking → render nothing (stay quiet once it's on).
  if (state === 'checking' || state === 'enabled') return null;

  if (state === 'unsupported') {
    return (
      <span style={{ fontSize: 11.5, color: T.textDim }} title="Add Lyf Coach to your Home Screen, then open it from the icon, to get reminders">
        📱 Install to get reminders
      </span>
    );
  }

  if (state === 'denied') {
    return (
      <span style={{ fontSize: 11.5, color: T.textDim }} title="Notifications are blocked — turn them on for this site in your browser settings">
        🔕 Reminders blocked
      </span>
    );
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
      <button
        onClick={enable}
        disabled={state === 'enabling'}
        title="Let your coach send you reminders (a push to this device)"
        style={{
          appearance: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
          border: `1px solid ${T.borderSoft}`, background: 'rgba(255,255,255,0.04)',
          color: state === 'enabling' ? T.textDim : T.textMid, fontFamily: T.sans,
          fontSize: 12.5, padding: '6px 11px', borderRadius: 11,
          cursor: state === 'enabling' ? 'default' : 'pointer',
        }}
      >
        🔔 {state === 'enabling' ? 'Enabling…' : 'Enable reminders'}
      </button>
      {state === 'error' && errorMsg && (
        <span style={{ fontSize: 11, color: '#f87171' }}>{errorMsg}</span>
      )}
    </span>
  );
}
