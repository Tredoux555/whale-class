'use client';

// CreatorInboxTab — messages sent from the Teachers' Room on the public
// SATPIN page ("Message the creator") straight to Tredoux.
//
// Self-contained on purpose: the list comes from this feature's own read-only
// route (/api/montree/community/dm/admin, which carries the sender's email and
// whether they have an account), while the thread and the reply go through the
// EXISTING /api/montree/dm — same pipe as every other conversation, same
// definition of "read", so the global unread badge can never disagree with
// what this tab shows.
//
// It deliberately does NOT reuse the page-level lead DM modal: that modal is
// wired to the leads table's conversation ids and its own unread bookkeeping.

import { useCallback, useEffect, useState } from 'react';

interface Conversation {
  conversationId: string;
  name: string;
  email: string | null;
  isAccount: boolean;
  lastMessageAt: string;
  createdAt: string;
  unreadCount: number;
  lastMessagePreview: string;
  messageCount: number;
}

/** Raw montree_dm row shape — /api/montree/dm returns the columns as-is. */
interface ThreadMessage {
  id: string;
  sender_type: 'admin' | 'user';
  sender_name: string;
  message: string;
  created_at: string;
}

interface CreatorInboxTabProps {
  saToken: string;
  /** Told after a successful mark-read PATCH so the page-level unread badge
   *  (adminData.dmUnreadPerConvo / dmUnreadTotal) can drop the same count. */
  onRead?: (conversationId: string) => void;
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

export default function CreatorInboxTab({ saToken, onRead }: CreatorInboxTabProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false); // migration 310 not run yet

  const [openId, setOpenId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState('');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const open = conversations.find((c) => c.conversationId === openId) || null;

  const load = useCallback(async () => {
    // No token means the session died under us — leave the empty state rather
    // than spinning forever on a request that can only 403.
    if (!saToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/montree/community/dm/admin', {
        headers: { 'x-super-admin-token': saToken },
        cache: 'no-store',
      });
      if (res.status === 503) {
        // Migration 310 hasn't run — not an incident, just not set up.
        setPending(true);
        setConversations([]);
        return;
      }
      if (!res.ok) {
        setError('Could not load the inbox.');
        return;
      }
      const data = await res.json();
      setPending(false);
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('[CreatorInbox] load failed:', err);
      setError('Could not load the inbox.');
    } finally {
      setLoading(false);
    }
  }, [saToken]);

  useEffect(() => { load(); }, [load]);

  /** Open a thread: fetch it, mark it read server-side, zero it locally. */
  const openThread = useCallback(async (conversationId: string) => {
    setOpenId(conversationId);
    setMessages([]);
    setReply('');
    setThreadError('');
    setThreadLoading(true);
    try {
      const res = await fetch(
        `/api/montree/dm?conversation_id=${encodeURIComponent(conversationId)}&reader_type=admin`,
        { headers: { 'x-super-admin-token': saToken }, cache: 'no-store' }
      );
      if (!res.ok) {
        setThreadError('Could not load this conversation.');
        return;
      }
      const data = await res.json();
      setMessages(data.messages || []);

      const patch = await fetch('/api/montree/dm', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-super-admin-token': saToken },
        body: JSON.stringify({ conversation_id: conversationId, reader_type: 'admin' }),
      });
      // Only clear the local badge if the server actually cleared it —
      // otherwise the count would come back on the next refresh and look like
      // a bug rather than the failed write it is.
      if (patch.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.conversationId === conversationId ? { ...c, unreadCount: 0 } : c))
        );
        onRead?.(conversationId);
      }
    } catch (err) {
      console.error('[CreatorInbox] thread load failed:', err);
      setThreadError('Could not load this conversation.');
    } finally {
      setThreadLoading(false);
    }
  }, [saToken, onRead]);

  const sendReply = useCallback(async () => {
    const text = reply.trim();
    if (!openId || !text || sending) return;
    setSending(true);
    setThreadError('');
    try {
      const res = await fetch('/api/montree/dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-super-admin-token': saToken },
        body: JSON.stringify({
          conversation_id: openId,
          sender_type: 'admin',
          sender_name: 'Tredoux',
          message: text,
        }),
      });
      if (!res.ok) {
        setThreadError('Could not send that. Try again.');
        return;
      }
      const data = await res.json();
      if (data.message) setMessages((prev) => [...prev, data.message]);
      setReply('');
      // Keep the list row honest without a full refetch.
      setConversations((prev) =>
        prev.map((c) =>
          c.conversationId === openId
            ? {
                ...c,
                lastMessagePreview: text.slice(0, 120),
                lastMessageAt: new Date().toISOString(),
                messageCount: c.messageCount + 1,
              }
            : c
        )
      );
    } catch (err) {
      console.error('[CreatorInbox] send failed:', err);
      setThreadError('Could not send that. Try again.');
    } finally {
      setSending(false);
    }
  }, [openId, reply, sending, saToken]);

  // ── Thread view ─────────────────────────────────────────────────────────
  if (open) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-white truncate">{open.name}</h2>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  open.isAccount
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-500/20 text-slate-400'
                }`}
              >
                {open.isAccount ? 'signed in' : 'anonymous'}
              </span>
            </div>
            {open.email ? (
              <a
                href={`mailto:${open.email}`}
                className="text-emerald-400 text-sm hover:text-emerald-300 underline"
              >
                {open.email}
              </a>
            ) : (
              <span className="text-slate-500 text-sm">No email — they can only read the reply here</span>
            )}
          </div>
          <button
            onClick={() => setOpenId(null)}
            className="btn btn-ghost btn-sm shrink-0"
          >
            ← Back
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[26rem] overflow-y-auto">
          {threadLoading && <p className="text-slate-400 text-sm">Loading…</p>}
          {!threadLoading && messages.length === 0 && !threadError && (
            <p className="text-slate-400 text-sm">Nothing in this conversation yet.</p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
                m.sender_type === 'admin'
                  ? 'ml-auto bg-emerald-500/15 border border-emerald-500/30'
                  : 'bg-slate-900/60 border border-slate-700'
              }`}
            >
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span className="text-xs font-medium text-slate-300">{m.sender_name}</span>
                <span className="text-[11px] text-slate-500 shrink-0">{timeAgo(m.created_at)}</span>
              </div>
              {/* Rendered as text, never as HTML. */}
              <p className="text-white text-sm whitespace-pre-wrap break-words">{m.message}</p>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-700">
          {threadError && <p className="text-red-400 text-sm mb-2">{threadError}</p>}
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value.slice(0, 2000))}
            rows={3}
            placeholder="Reply as Tredoux…"
            disabled={sending}
            className="w-full p-3 rounded-lg bg-slate-900/60 border border-slate-700 text-white text-sm placeholder-slate-500 outline-none focus:border-emerald-500/50 disabled:opacity-50"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-slate-500 text-xs">{reply.length}/2000</span>
            <button
              onClick={sendReply}
              disabled={sending || reply.trim().length === 0}
              className="btn btn-primary btn-md"
            >
              {sending ? 'Sending…' : 'Send reply'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── List view ───────────────────────────────────────────────────────────
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Creator inbox</h2>
        <button onClick={load} className="btn btn-ghost btn-sm">
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <div className="animate-pulse text-4xl">📮</div>
          <p className="text-slate-400 mt-2">Loading messages...</p>
        </div>
      ) : pending ? (
        <div className="p-12 text-center">
          <span className="text-5xl block mb-4">🧱</span>
          <h3 className="text-xl font-semibold text-white mb-2">Not set up yet</h3>
          <p className="text-slate-400">Run migration 310 and the creator inbox turns on.</p>
        </div>
      ) : error ? (
        <div className="p-12 text-center">
          <span className="text-5xl block mb-4">⚠️</span>
          <p className="text-red-400">{error}</p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="p-12 text-center">
          <span className="text-5xl block mb-4">📭</span>
          <h3 className="text-xl font-semibold text-white mb-2">No messages yet</h3>
          <p className="text-slate-400">
            No messages yet — teachers can reach you from the staff room on the SATPIN page.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-700">
          {conversations.map((c) => (
            <div
              key={c.conversationId}
              className={`p-4 hover:bg-slate-800/50 transition-colors ${
                c.unreadCount > 0 ? 'bg-emerald-500/5 border-l-4 border-emerald-500' : ''
              }`}
            >
              {/* The row opener is a button and the mailto is a sibling link —
                  a link nested inside a button is invalid markup and swallows
                  the click on some browsers. */}
              <button
                onClick={() => openThread(c.conversationId)}
                className="w-full text-left"
              >
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-white font-medium">{c.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.isAccount
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}
                  >
                    {c.isAccount ? 'signed in' : 'anonymous'}
                  </span>
                  {c.unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400">
                      {c.unreadCount} new
                    </span>
                  )}
                  <span className="text-slate-500 text-sm ml-auto shrink-0">
                    {timeAgo(c.lastMessageAt)}
                  </span>
                </div>
                <p className="text-slate-300 text-sm truncate">{c.lastMessagePreview}</p>
                <p className="text-slate-500 text-xs mt-1">
                  {c.messageCount} message{c.messageCount === 1 ? '' : 's'}
                </p>
              </button>
              {c.email && (
                <a
                  href={`mailto:${c.email}`}
                  className="text-emerald-400 text-xs hover:text-emerald-300 underline mt-1 inline-block"
                >
                  {c.email}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
