'use client';

// TryItRequestsTab — the landing page's "Try it" gate, from this side.
//
// Two lists, one route (/api/montree/super-admin/tryit):
//   • CLICKS   — anonymous "someone pressed Try it" events. Counts intent,
//                including everyone who opened the gate and walked away.
//   • MESSAGES — the people who actually wrote in. Reply opens the mail
//                client; "Mark replied" flips the row so the queue drains.
//
// Self-contained and plain-English like every other super-admin tab (these
// screens are Tredoux-only — no i18n keys are spent on them).

import { useCallback, useEffect, useState } from 'react';

interface ClickRow {
  id: string;
  created_at: string;
  ip: string | null;
  user_agent: string | null;
  referrer: string | null;
  locale: string | null;
}

interface MessageRow {
  id: string;
  created_at: string;
  name: string;
  email: string;
  organisation: string;
  message: string;
  ip: string | null;
  user_agent: string | null;
  status: string;
  replied_at: string | null;
}

interface TryItRequestsTabProps {
  saToken: string;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** "Chrome · macOS" from a raw UA string — enough to tell a phone from a bot. */
function shortUa(ua: string | null): string {
  if (!ua) return 'unknown device';
  const browser =
    /Edg\//.test(ua) ? 'Edge'
      : /OPR\//.test(ua) ? 'Opera'
      : /Chrome\//.test(ua) ? 'Chrome'
      : /Safari\//.test(ua) ? 'Safari'
      : /Firefox\//.test(ua) ? 'Firefox'
      : 'Browser';
  const os =
    /iPhone|iPad|iPod/.test(ua) ? 'iOS'
      : /Android/.test(ua) ? 'Android'
      : /Mac OS X/.test(ua) ? 'macOS'
      : /Windows/.test(ua) ? 'Windows'
      : /Linux/.test(ua) ? 'Linux'
      : 'unknown OS';
  return `${browser} · ${os}`;
}

export default function TryItRequestsTab({ saToken }: TryItRequestsTabProps) {
  const [clicks, setClicks] = useState<ClickRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [clickTotal, setClickTotal] = useState(0);
  const [click7d, setClick7d] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false); // migration 316 not run yet
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [showClicks, setShowClicks] = useState(false);

  const load = useCallback(async () => {
    if (!saToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/montree/super-admin/tryit', {
        headers: { 'x-super-admin-token': saToken },
        cache: 'no-store',
      });
      if (!res.ok) {
        setError('Could not load try-it requests.');
        return;
      }
      const data = await res.json();
      setPending(Boolean(data.pending));
      setClicks(data.clicks || []);
      setMessages(data.messages || []);
      setClickTotal(data.clickTotal || 0);
      setClick7d(data.click7d || 0);
    } catch (err) {
      console.error('[TryItRequests] load failed:', err);
      setError('Could not load try-it requests.');
    } finally {
      setLoading(false);
    }
  }, [saToken]);

  useEffect(() => { load(); }, [load]);

  const setStatus = useCallback(async (id: string, status: 'new' | 'replied') => {
    setBusy(id);
    try {
      const res = await fetch('/api/montree/super-admin/tryit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-super-admin-token': saToken },
        body: JSON.stringify({ id, status }),
      });
      // Only move the row locally if the server actually wrote it — otherwise
      // the change would silently reappear on the next refresh.
      if (res.ok) {
        setMessages(prev =>
          prev.map(m =>
            m.id === id
              ? { ...m, status, replied_at: status === 'replied' ? new Date().toISOString() : null }
              : m
          )
        );
      }
    } catch (err) {
      console.error('[TryItRequests] status update failed:', err);
    } finally {
      setBusy(null);
    }
  }, [saToken]);

  const newCount = messages.filter(m => m.status === 'new').length;

  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
        <div className="animate-pulse text-4xl">🎟️</div>
        <p className="text-slate-400 mt-2">Loading try-it requests...</p>
      </div>
    );
  }

  if (pending) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
        <span className="text-5xl block mb-4">🧱</span>
        <h3 className="text-xl font-semibold text-white mb-2">Not set up yet</h3>
        <p className="text-slate-400">Run migration 316 and the Try It gate starts recording.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Stats + clicks ─────────────────────────────────────────────── */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-white">Try It gate</h2>
          <button onClick={load} className="text-sm text-slate-400 hover:text-white">
            ↻ Refresh
          </button>
        </div>

        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-white">{click7d}</div>
            <div className="text-slate-400 text-xs mt-0.5">Clicks · last 7 days</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-white">{clickTotal}</div>
            <div className="text-slate-400 text-xs mt-0.5">Clicks · all time</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-emerald-400">{messages.length}</div>
            <div className="text-slate-400 text-xs mt-0.5">Messages</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className={`text-2xl font-bold ${newCount > 0 ? 'text-red-400' : 'text-white'}`}>
              {newCount}
            </div>
            <div className="text-slate-400 text-xs mt-0.5">Awaiting reply</div>
          </div>
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={() => setShowClicks(v => !v)}
            className="text-sm text-slate-400 hover:text-white"
          >
            {showClicks ? '▾' : '▸'} Recent clicks ({clicks.length} shown)
          </button>
          {showClicks && (
            <div className="mt-3 divide-y divide-slate-700 border border-slate-700 rounded-lg overflow-hidden">
              {clicks.length === 0 ? (
                <p className="text-slate-400 text-sm p-4">No clicks recorded yet.</p>
              ) : (
                clicks.map(c => (
                  <div key={c.id} className="p-3 text-sm flex items-center gap-3 flex-wrap">
                    <span className="text-slate-300 shrink-0">{timeAgo(c.created_at)}</span>
                    <span className="text-slate-500">{shortUa(c.user_agent)}</span>
                    {c.locale && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-slate-500/20 text-slate-300">
                        {c.locale}
                      </span>
                    )}
                    {c.referrer && (
                      <span className="text-slate-500 text-xs truncate max-w-xs">
                        from {c.referrer}
                      </span>
                    )}
                    <span className="text-slate-600 text-xs ml-auto shrink-0">{c.ip || '—'}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────────────────── */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Messages</h2>
        </div>

        {error ? (
          <div className="p-12 text-center">
            <span className="text-5xl block mb-4">⚠️</span>
            <p className="text-red-400">{error}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-5xl block mb-4">📭</span>
            <h3 className="text-xl font-semibold text-white mb-2">No requests yet</h3>
            <p className="text-slate-400">
              Nobody has written in through the landing page gate yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {messages.map(m => (
              <div
                key={m.id}
                className={`p-4 ${m.status === 'new' ? 'bg-emerald-500/5 border-l-4 border-emerald-500' : ''}`}
              >
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-white font-medium">{m.name}</span>
                  <span className="text-slate-400 text-sm">· {m.organisation}</span>
                  {m.status === 'new' ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400">
                      new
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                      replied
                    </span>
                  )}
                  <span className="text-slate-500 text-sm ml-auto shrink-0">
                    {timeAgo(m.created_at)}
                  </span>
                </div>

                <a
                  href={`mailto:${m.email}`}
                  className="text-emerald-400 text-sm hover:text-emerald-300 underline"
                >
                  {m.email}
                </a>

                {/* Rendered as text, never as HTML. */}
                <p className="text-slate-200 text-sm whitespace-pre-wrap break-words mt-2">
                  {m.message}
                </p>

                <div className="flex items-center gap-2 flex-wrap mt-3">
                  <a
                    href={`mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(
                      'Montree'
                    )}&body=${encodeURIComponent(`Hi ${m.name.split(' ')[0] || m.name},\n\n`)}`}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-sm font-medium hover:bg-emerald-500/30 transition-colors"
                  >
                    ✉ Reply
                  </a>
                  {m.status === 'new' ? (
                    <button
                      onClick={() => setStatus(m.id, 'replied')}
                      disabled={busy === m.id}
                      className="px-3 py-1.5 rounded-lg bg-slate-700/60 text-slate-200 border border-slate-600 text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-40"
                    >
                      {busy === m.id ? 'Saving…' : '✓ Mark replied'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setStatus(m.id, 'new')}
                      disabled={busy === m.id}
                      className="px-3 py-1.5 rounded-lg bg-slate-700/40 text-slate-400 border border-slate-700 text-sm hover:bg-slate-700/60 transition-colors disabled:opacity-40"
                    >
                      {busy === m.id ? 'Saving…' : 'Reopen'}
                    </button>
                  )}
                  {m.replied_at && (
                    <span className="text-slate-500 text-xs">
                      replied {timeAgo(m.replied_at)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
