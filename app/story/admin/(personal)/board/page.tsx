'use client';

// Board — the shared emergency room for the whole inner circle.
// One common room: everyone posts and reads the same messages (sender-labelled).
// Messages are kept (never auto-deleted). Optional push alerts the others when
// the app is closed. Auth + identity come from the admin session token.

import { useCallback, useEffect, useRef, useState } from 'react';
import { getStoryAdminToken } from '@/lib/story/personal-client';
import { T } from '@/lib/story/personal-theme';

interface BoardMessage {
  id: string;
  from_space: string;
  from_label: string;
  body: string;
  created_at: string;
  isMine: boolean;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator
    && 'PushManager' in window && 'Notification' in window;
}
function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    return sameDay
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

export default function BoardPage() {
  const [messages, setMessages] = useState<BoardMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const [notif, setNotif] = useState<'idle' | 'enabling' | 'enabled' | 'unsupported' | 'denied' | 'error' | 'hidden'>('idle');
  const [notifMsg, setNotifMsg] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    const token = getStoryAdminToken();
    if (!token) return;
    try {
      const res = await fetch('/api/story/board', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { setErr('Could not load the board.'); return; }
      const data = await res.json();
      setErr('');
      setMessages(data.messages || []);
    } catch {
      setErr('Could not load the board.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Refresh on focus + a gentle poll so a new message appears without reload.
  useEffect(() => {
    const onFocus = () => { void load(); };
    window.addEventListener('focus', onFocus);
    const iv = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 25000);
    return () => { window.removeEventListener('focus', onFocus); clearInterval(iv); };
  }, [load]);

  // Decide initial notification state after mount.
  useEffect(() => {
    (async () => {
      if (!pushSupported()) { setNotif('unsupported'); return; }
      if (Notification.permission === 'denied') { setNotif('denied'); return; }
      try {
        const reg = await navigator.serviceWorker.getRegistration('/story/');
        const existing = reg ? await reg.pushManager.getSubscription() : null;
        setNotif(existing && Notification.permission === 'granted' ? 'hidden' : 'idle');
      } catch { setNotif('idle'); }
    })();
  }, []);

  useEffect(() => {
    if (loaded) endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, loaded]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setErr('');
    try {
      const token = getStoryAdminToken();
      const res = await fetch('/api/story/board', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data.error || 'Could not send.'); return; }
      setMessages((prev) => [...prev, data.message]);
      setDraft('');
    } catch {
      setErr('Could not send.');
    } finally {
      setSending(false);
    }
  }

  const enableNotifs = useCallback(async () => {
    setNotif('enabling'); setNotifMsg('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setNotif(permission === 'denied' ? 'denied' : 'idle'); return; }
      const keyRes = await fetch('/api/story/push/public-key');
      if (!keyRes.ok) {
        setNotifMsg(keyRes.status === 503 ? 'Notifications aren’t switched on yet.' : 'Could not set up notifications.');
        setNotif('error'); return;
      }
      const { publicKey } = (await keyRes.json()) as { publicKey: string };
      await navigator.serviceWorker.register('/story-sw.js', { scope: '/story/' });
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
      }
      const token = getStoryAdminToken();
      const saveRes = await fetch('/api/story/push/member-subscribe', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!saveRes.ok) { setNotifMsg('Could not save your notification settings.'); setNotif('error'); return; }
      setNotif('hidden');
    } catch (e) {
      setNotifMsg(e instanceof Error ? e.message : 'Could not set up notifications.');
      setNotif('error');
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '60vh' }}>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 600, color: T.text, margin: '0 0 4px' }}>
          Board
        </h1>
        <p style={{ color: T.textMid, fontSize: 14, margin: 0, lineHeight: 1.5 }}>
          The shared room — for when all else fails. Everyone here can read and write to it.
        </p>
      </div>

      {/* Enable notifications */}
      {notif !== 'hidden' && (
        <div style={{ marginBottom: 16 }}>
          {notif === 'unsupported' ? (
            <p style={{ color: T.textDim, fontSize: 12.5, margin: 0 }}>
              📱 Add this to your Home Screen and open it from the icon to get alerts.
            </p>
          ) : notif === 'denied' ? (
            <p style={{ color: T.textDim, fontSize: 12.5, margin: 0 }}>
              Notifications are blocked — turn them on for this site in your browser settings.
            </p>
          ) : (
            <div>
              <button
                onClick={enableNotifs} disabled={notif === 'enabling'}
                style={{
                  appearance: 'none', border: `1px solid ${T.border}`, cursor: 'pointer',
                  background: 'rgba(52,211,153,0.10)', color: T.text, borderRadius: 999,
                  padding: '8px 15px', fontSize: 13, fontWeight: 600, fontFamily: T.sans,
                }}
              >
                🔔 {notif === 'enabling' ? 'Enabling…' : 'Enable alerts'}
              </button>
              {notif === 'error' && notifMsg && (
                <span style={{ color: '#f2a3a3', fontSize: 12, marginLeft: 10 }}>{notifMsg}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 12 }}>
        {!loaded ? (
          <p style={{ color: T.textDim, fontSize: 14 }}>Loading…</p>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: T.textDim, padding: '40px 12px' }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>🕊️</div>
            <p style={{ fontSize: 14, margin: 0 }}>Nothing here yet. This is the room for when it matters.</p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: m.isMine ? 'flex-end' : 'flex-start' }}>
              <div
                style={{
                  maxWidth: '78%',
                  background: m.isMine ? 'rgba(52,211,153,0.16)' : T.card,
                  border: `1px solid ${m.isMine ? 'rgba(52,211,153,0.32)' : T.border}`,
                  borderRadius: 16,
                  borderBottomRightRadius: m.isMine ? 4 : 16,
                  borderBottomLeftRadius: m.isMine ? 16 : 4,
                  padding: '9px 13px',
                }}
              >
                {!m.isMine && (
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: T.emerald, marginBottom: 3, fontFamily: T.sans }}>
                    {m.from_label}
                  </div>
                )}
                <div style={{ fontSize: 14.5, color: T.text, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {m.body}
                </div>
                <div style={{ fontSize: 10.5, color: T.textDim, marginTop: 4, textAlign: 'right' }}>
                  {fmtTime(m.created_at)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {err && <p style={{ color: '#f2a3a3', fontSize: 13, margin: '4px 0' }}>{err}</p>}

      {/* Composer */}
      <form
        onSubmit={send}
        style={{
          position: 'sticky', bottom: 0, paddingTop: 10,
          display: 'flex', gap: 8, alignItems: 'flex-end',
          background: 'linear-gradient(to top, rgba(10,26,15,1) 60%, rgba(10,26,15,0))',
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(e as unknown as React.FormEvent); } }}
          placeholder="Write to the board…"
          rows={1}
          style={{
            flex: 1, resize: 'none', boxSizing: 'border-box', padding: '11px 14px',
            borderRadius: 14, background: 'rgba(8,20,12,0.7)', border: `1px solid ${T.border}`,
            color: T.text, fontFamily: T.sans, fontSize: 15, outline: 'none', maxHeight: 140,
          }}
        />
        <button
          type="submit" disabled={sending || !draft.trim()}
          style={{
            appearance: 'none', border: 'none',
            cursor: sending || !draft.trim() ? 'default' : 'pointer',
            background: `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})`,
            color: '#06140c', fontFamily: T.sans, fontSize: 15, fontWeight: 600,
            padding: '11px 18px', borderRadius: 14, opacity: sending || !draft.trim() ? 0.5 : 1,
          }}
        >
          {sending ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
