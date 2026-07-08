'use client';

// FoundingInbox
//
// Migration 292 — Tredoux's side of the Founding school ↔ super-admin
// messaging surface, rendered inside the 🚀 Founding 100 tab. Shows ALL
// principal_super_admin threads across all founding schools. Clicking a
// thread reveals the conversation inline (single-component state, no separate
// route). Mirrors AgentInboxTab's inline pattern; kept compact.
//
// Replying flows through POST /super-admin/founding-messages/threads/[id]/messages.

import { useCallback, useEffect, useRef, useState } from 'react';

interface ThreadRow {
  id: string;
  subject: string | null;
  created_at: string;
  last_message_at: string;
  school_id: string | null;
  school_name: string;
  principal_id: string | null;
  principal_name: string;
  principal_email: string | null;
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

export default function FoundingInbox({ saToken }: { saToken: string }) {
  const [collapsed, setCollapsed] = useState(true);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected thread + its messages.
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [openTitle, setOpenTitle] = useState<string>('');
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
      const res = await fetch('/api/montree/super-admin/founding-messages/threads', {
        headers: { 'x-super-admin-token': saToken },
        cache: 'no-store',
      });
      if (!res.ok) {
        setError('Could not load founder messages.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setThreads(data.threads || []);
    } catch (err) {
      console.error('[FoundingInbox] threads load:', err);
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }, [saToken]);

  const loadMessages = useCallback(async (threadId: string) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/montree/super-admin/founding-messages/threads/${threadId}/messages`, {
        headers: { 'x-super-admin-token': saToken },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
      // Mark read
      void fetch(`/api/montree/super-admin/founding-messages/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'x-super-admin-token': saToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read' }),
      }).catch(() => { /* non-critical */ });
    } catch (err) {
      console.error('[FoundingInbox] messages load:', err);
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
    setOpenTitle(`${t.school_name} — ${t.principal_name}`);
    // Optimistically clear unread locally.
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
      const res = await fetch(`/api/montree/super-admin/founding-messages/threads/${openThreadId}/messages`, {
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
      console.error('[FoundingInbox] send:', err);
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

  const unreadTotal = threads.filter((t) => t.unread_for_me > 0).length;

  // ── Section shell (collapsible) ──────────────────────────────────────────
  const card: React.CSSProperties = {
    background: '#0f172a', border: '1px solid rgba(148,163,184,0.14)',
    borderRadius: 14, padding: 20,
  };

  return (
    <div style={{ ...card, marginBottom: 16 }}>
      <button
        onClick={() => setCollapsed((c) => !c)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: '#e2e8f0',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          💬 Founder messages
          {unreadTotal > 0 && (
            <span style={{ background: 'rgba(52,211,153,0.20)', color: '#34d399', borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>
              {unreadTotal} unread
            </span>
          )}
        </span>
        <span style={{ color: '#64748b', fontSize: 13 }}>{collapsed ? '▸ Show' : '▾ Hide'}</span>
      </button>

      {!collapsed && (
        <div style={{ marginTop: 16 }}>
          {error && (
            <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#fca5a5', fontSize: 13, marginBottom: 10 }}>
              {error}
            </div>
          )}

          {/* ── List view ── */}
          {!openThreadId && (
            <>
              {loading && (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: 13 }}>Loading…</div>
              )}
              {!loading && threads.length === 0 && (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                  No founder messages yet. When a Founding school principal messages you from their cockpit, it appears here.
                </div>
              )}
              {!loading && threads.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {threads.map((t) => {
                    const unread = t.unread_for_me > 0;
                    return (
                      <button
                        key={t.id}
                        onClick={() => openThread(t)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 12,
                          background: unread ? 'rgba(52,211,153,0.10)' : 'rgba(15,23,42,0.6)',
                          border: unread ? '1px solid rgba(52,211,153,0.30)' : '1px solid rgba(148,163,184,0.16)',
                          cursor: 'pointer', color: '#e2e8f0',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: unread ? 700 : 500, color: unread ? '#fff' : '#e2e8f0', fontSize: 14 }}>
                                {t.school_name}
                              </span>
                              <span style={{ color: '#94a3b8', fontSize: 12 }}>{t.principal_name}</span>
                              {t.subject && <span style={{ color: '#64748b', fontSize: 12 }}>— {t.subject}</span>}
                              {unread && (
                                <span style={{ background: '#34d399', color: '#04150c', borderRadius: 6, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>
                                  {t.unread_for_me} new
                                </span>
                              )}
                            </div>
                            {t.last_snippet && (
                              <div style={{ marginTop: 4, color: '#94a3b8', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span style={{ color: '#64748b' }}>{t.last_sender_is_me ? 'You: ' : ''}</span>
                                {t.last_snippet}
                              </div>
                            )}
                          </div>
                          <span style={{ flexShrink: 0, color: '#64748b', fontSize: 12 }}>{daysAgo(t.last_message_at)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── Detail view ── */}
          {openThreadId && (
            <div style={{ display: 'flex', flexDirection: 'column', height: 440 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 10, borderBottom: '1px solid rgba(148,163,184,0.16)' }}>
                <button onClick={backToList} style={{ background: 'transparent', border: 'none', color: '#34d399', cursor: 'pointer', fontSize: 13 }}>
                  ← Inbox
                </button>
                <span style={{ color: '#fff', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {openTitle}
                </span>
              </div>

              <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {messagesLoading && (
                  <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: '20px 0' }}>Loading…</div>
                )}
                {!messagesLoading && messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: '20px 0' }}>No messages yet.</div>
                )}
                {messages.map((m) => {
                  const mine = m.sender_role === 'super_admin';
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '78%', padding: '8px 12px', borderRadius: 14, fontSize: 13, lineHeight: 1.5,
                        background: mine ? 'linear-gradient(180deg, #34d399 0%, #10b981 100%)' : '#1e293b',
                        color: mine ? '#04150c' : '#e2e8f0',
                        border: mine ? 'none' : '1px solid rgba(148,163,184,0.16)',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      }}>
                        {!mine && (
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#34d399', marginBottom: 3 }}>{m.sender_name}</div>
                        )}
                        <div>{m.body}</div>
                        <div style={{ fontSize: 10, marginTop: 3, textAlign: 'right', color: mine ? 'rgba(4,21,12,0.6)' : '#64748b' }}>
                          {daysAgo(m.sent_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={send} style={{ borderTop: '1px solid rgba(148,163,184,0.16)', paddingTop: 10, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Reply to the founder…"
                  rows={1}
                  disabled={sending}
                  maxLength={10000}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      void send(e);
                    }
                  }}
                  style={{
                    flex: 1, padding: '9px 12px', background: '#0b1220', color: '#e2e8f0',
                    border: '1px solid rgba(148,163,184,0.2)', borderRadius: 12, fontSize: 13,
                    resize: 'none', minHeight: 42, maxHeight: 140, fontFamily: 'inherit',
                  }}
                />
                <button
                  type="submit"
                  disabled={sending || !reply.trim()}
                  style={{
                    padding: '10px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    border: 'none', color: '#fff', background: 'linear-gradient(180deg, #27815a 0%, #1D6B48 100%)',
                    opacity: !reply.trim() ? 0.5 : 1,
                  }}
                >
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
