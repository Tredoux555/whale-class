'use client';

// AgentInboxTab
//
// Phase 4 — Tredoux's side of the agent ↔ super-admin messaging surface.
// Shows ALL agent_super_admin threads across all agents. Clicking a thread
// reveals the conversation view inline (single-component state, no separate
// route). Back button returns to the inbox.
//
// Replying to an agent flows through POST /super-admin/agent-messages/threads/[id]/messages.
// ai_drafted=false (Tracy-assisted drafting will be a future extension).

import { useCallback, useEffect, useRef, useState } from 'react';

interface ThreadRow {
  id: string;
  subject: string | null;
  created_at: string;
  last_message_at: string;
  agent_id: string | null;
  agent_name: string;
  agent_email: string | null;
  last_snippet: string | null;
  last_sender_role: string | null;
  last_sender_name: string | null;
  last_sender_is_me: boolean;
  unread_for_me: number;
}

interface Message {
  id: string;
  sender_role: string;
  sender_id: string;
  sender_name: string;
  body: string;
  ai_drafted: boolean;
  ai_draft_source: string | null;
  sent_at: string;
}

function daysAgo(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 7) return `${diff}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function AgentInboxTab({ saToken }: { saToken: string }) {
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected thread + its messages.
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [openAgentName, setOpenAgentName] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Reply composer.
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const loadThreads = useCallback(async () => {
    if (!saToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/montree/super-admin/agent-messages/threads', {
        headers: { 'x-super-admin-token': saToken },
      });
      if (!res.ok) {
        setError('Could not load agent inbox.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setThreads(data.threads || []);
    } catch (err) {
      console.error('[AgentInboxTab] threads load:', err);
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }, [saToken]);

  const loadMessages = useCallback(async (threadId: string) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/montree/super-admin/agent-messages/threads/${threadId}/messages`, {
        headers: { 'x-super-admin-token': saToken },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
      // Mark read
      void fetch(`/api/montree/super-admin/agent-messages/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'x-super-admin-token': saToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read' }),
      }).catch(() => { /* non-critical */ });
    } catch (err) {
      console.error('[AgentInboxTab] messages load:', err);
    } finally {
      setMessagesLoading(false);
    }
  }, [saToken]);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  useEffect(() => {
    if (openThreadId) loadMessages(openThreadId);
    else setMessages([]);
  }, [openThreadId, loadMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const openThread = (t: ThreadRow) => {
    setOpenThreadId(t.id);
    setOpenAgentName(t.agent_name);
    // Optimistically clear unread count locally so the inbox badge updates fast.
    setThreads((prev) => prev.map((row) => row.id === t.id ? { ...row, unread_for_me: 0 } : row));
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || sending || !openThreadId) return;
    const draft = reply.trim();
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: tempId,
      sender_role: 'super_admin',
      sender_id: '00000000-0000-0000-0000-000000000000',
      sender_name: 'Tredoux',
      body: draft,
      ai_drafted: false,
      ai_draft_source: null,
      sent_at: new Date().toISOString(),
    }]);
    setReply('');

    try {
      const res = await fetch(`/api/montree/super-admin/agent-messages/threads/${openThreadId}/messages`, {
        method: 'POST',
        headers: { 'x-super-admin-token': saToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setReply(draft);
        setError(data.error || 'Could not send.');
        return;
      }
      setMessages((prev) => prev.map((m) => m.id === tempId ? data.message : m));
      // Refresh thread list so last_snippet updates.
      void loadThreads();
    } catch (err) {
      console.error('[AgentInboxTab] send:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setReply(draft);
    } finally {
      setSending(false);
    }
  };

  const backToList = () => {
    setOpenThreadId(null);
    setMessages([]);
    setReply('');
  };

  // ─── List view ─────────────────────────────────────────────────────────
  if (!openThreadId) {
    return (
      <div className="space-y-3">
        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="px-4 py-8 text-center text-slate-400 text-sm">Loading…</div>
        )}

        {!loading && threads.length === 0 && (
          <div className="px-6 py-12 text-center bg-slate-900/40 border border-slate-700 rounded-xl">
            <div className="text-3xl mb-3">📬</div>
            <div className="text-white text-base font-medium mb-2">No agent messages yet</div>
            <div className="text-slate-400 text-sm max-w-md mx-auto">
              When Gloria or any other agent sends you a message from their dashboard, it'll appear here.
            </div>
          </div>
        )}

        {!loading && threads.length > 0 && (
          <div className="space-y-2">
            {threads.map((t) => {
              const unread = t.unread_for_me > 0;
              return (
                <button
                  key={t.id}
                  onClick={() => openThread(t)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${
                    unread
                      ? 'bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/15'
                      : 'bg-slate-900/40 border border-slate-700 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium ${unread ? 'text-white' : 'text-slate-200'}`}>
                          {t.agent_name}
                        </span>
                        {t.subject && (
                          <span className="text-slate-400 text-xs">— {t.subject}</span>
                        )}
                        {unread && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500 text-emerald-950">
                            {t.unread_for_me} new
                          </span>
                        )}
                      </div>
                      {t.last_snippet && (
                        <div className="mt-1 text-sm text-slate-400 line-clamp-1">
                          <span className="text-slate-500">
                            {t.last_sender_is_me ? 'You: ' : ''}
                          </span>
                          {t.last_snippet}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">{daysAgo(t.last_message_at)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="text-xs text-slate-500 pt-2">
          {threads.length > 0 && `${threads.length} thread${threads.length === 1 ? '' : 's'} · ${threads.filter((t) => t.unread_for_me > 0).length} unread`}
        </div>
      </div>
    );
  }

  // ─── Detail view ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-220px)]">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-700">
        <button
          onClick={backToList}
          className="text-emerald-300 hover:text-emerald-200 text-sm flex items-center gap-1"
        >
          ← Inbox
        </button>
        <h3 className="text-white font-medium ml-2 flex-1 truncate">{openAgentName}</h3>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-2 pr-1">
        {messagesLoading && (
          <div className="text-slate-400 text-sm text-center py-8">Loading…</div>
        )}
        {!messagesLoading && messages.length === 0 && (
          <div className="text-slate-400 text-sm text-center py-8">No messages yet.</div>
        )}
        {messages.map((m) => {
          const mine = m.sender_role === 'super_admin';
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm ${
                  mine
                    ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-emerald-950'
                    : 'bg-slate-800 text-slate-100 border border-slate-700'
                }`}
              >
                {!mine && (
                  <div className="text-[11px] font-semibold text-emerald-300 mb-1">
                    {m.sender_name}
                  </div>
                )}
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
                {m.ai_drafted && mine && (
                  <div className="text-[10px] mt-1 opacity-70">Tracy drafted</div>
                )}
                <div className={`text-[10px] mt-1 ${mine ? 'text-emerald-950/60' : 'text-slate-400'} text-right`}>
                  {daysAgo(m.sent_at)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="border-t border-slate-700 pt-3 flex gap-2 items-end">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Reply to the agent…"
          rows={1}
          disabled={sending}
          maxLength={10000}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send(e);
            }
          }}
          className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm resize-none focus:border-emerald-500 outline-none min-h-[42px] max-h-[140px]"
        />
        <button
          type="submit"
          disabled={sending || !reply.trim()}
          className="px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-b from-emerald-500 to-emerald-700 text-white disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
