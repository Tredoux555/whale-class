// /montree/agent/messages-tredoux/[threadId]/page.tsx
// Phase 4 — Agent ↔ Tredoux thread detail.

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send } from 'lucide-react';

const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  emerald: '#34d399',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface Message {
  id: string;
  sender_role: string;
  sender_id: string;
  sender_name: string;
  body: string;
  ai_drafted: boolean;
  sent_at: string;
}

interface ThreadInfo {
  id: string;
  subject: string | null;
  created_at: string;
  last_message_at: string;
}

export default function AgentThreadDetailPage() {
  const router = useRouter();
  const params = useParams<{ threadId: string }>();
  const threadId = params?.threadId;
  const [loading, setLoading] = useState(true);
  const [thread, setThread] = useState<ThreadInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myAgentId, setMyAgentId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Get the agent's own id from /agent/me so we can detect "my" messages.
  useEffect(() => {
    fetch('/api/montree/agent/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.agent?.id) setMyAgentId(d.agent.id); })
      .catch(() => { /* render without it */ });
  }, []);

  const load = useCallback(async () => {
    if (!threadId) return;
    try {
      const [threadRes, messagesRes] = await Promise.all([
        fetch(`/api/montree/agent/messages-tredoux/threads/${threadId}`, { credentials: 'include' }),
        fetch(`/api/montree/agent/messages-tredoux/threads/${threadId}/messages`, { credentials: 'include' }),
      ]);
      if ((threadRes.status === 401 || threadRes.status === 403)) {
        router.replace('/montree/login-select');
        return;
      }
      if (threadRes.status === 403 || threadRes.status === 404) {
        router.replace('/montree/agent/messages-tredoux');
        return;
      }
      if (threadRes.ok) {
        const t = await threadRes.json();
        setThread(t.thread);
      }
      if (messagesRes.ok) {
        const m = await messagesRes.json();
        setMessages(m.messages || []);
      }
      setLoading(false);
      // Mark read on open
      void fetch(`/api/montree/agent/messages-tredoux/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'mark_read' }),
      }).catch(() => { /* non-critical */ });
    } catch (err) {
      console.error('[agent thread detail] load failed', err);
      setLoading(false);
    }
  }, [threadId, router]);

  useEffect(() => { load(); }, [load]);

  // Scroll to bottom when messages change.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending || !threadId) return;
    const draft = text.trim();
    setSending(true);
    setError(null);

    // Optimistic
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: tempId,
      sender_role: 'agent',
      sender_id: myAgentId || 'me',
      sender_name: 'You',
      body: draft,
      ai_drafted: false,
      sent_at: new Date().toISOString(),
    }]);
    setText('');

    try {
      const res = await fetch(`/api/montree/agent/messages-tredoux/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body: draft }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not send.');
        // Rollback optimistic
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setText(draft);
        setSending(false);
        return;
      }
      // Replace optimistic with real
      setMessages((prev) => prev.map((m) => m.id === tempId ? data.message : m));
    } catch (err) {
      console.error('[agent thread send] failed', err);
      setError('Network error.');
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(draft);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const isMine = (m: Message): boolean => m.sender_role === 'agent';

  return (
    <div style={{
      minHeight: '100dvh',
      background: T.bg,
      color: T.textPrimary,
      fontFamily: T.sans,
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: T.glow, pointerEvents: 'none' }} />

      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(10,26,15,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(52,211,153,0.12)',
        padding: '14px 20px',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <Link
            href="/montree/agent/messages-tredoux"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: T.textMuted, fontSize: 12, textDecoration: 'none', marginBottom: 4 }}
          >
            <ArrowLeft size={13} /> Back to threads
          </Link>
          <h1 style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 500, marginTop: 2 }}>
            {thread?.subject || 'Tredoux'}
          </h1>
        </div>
      </div>

      {/* Messages scroll area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 20px 16px',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading && (
            <div style={{ color: T.textMuted, fontSize: 14, padding: 24, textAlign: 'center' }}>Loading…</div>
          )}
          {!loading && messages.length === 0 && (
            <div style={{ color: T.textMuted, fontSize: 14, padding: 24, textAlign: 'center' }}>
              No messages yet.
            </div>
          )}
          {messages.map((m) => {
            const mine = isMine(m);
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  justifyContent: mine ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{
                  maxWidth: '78%',
                  padding: '10px 14px',
                  background: mine ? 'linear-gradient(180deg, #34d399 0%, #10b981 100%)' : T.card,
                  border: mine ? 'none' : T.cardBorder,
                  color: mine ? '#06140e' : T.textPrimary,
                  borderRadius: 16,
                  fontSize: 14,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {!mine && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.emerald, marginBottom: 4 }}>
                      {m.sender_name}
                      {m.ai_drafted && (
                        <span style={{
                          marginLeft: 8, padding: '1px 6px',
                          background: 'rgba(232,201,106,0.15)', color: '#E8C96A',
                          borderRadius: 999, fontSize: 10, fontWeight: 500,
                        }}>
                          Tracy drafted
                        </span>
                      )}
                    </div>
                  )}
                  <div>{m.body}</div>
                  <div style={{
                    fontSize: 10, marginTop: 4,
                    color: mine ? 'rgba(6,20,14,0.55)' : T.textMuted,
                    textAlign: 'right',
                  }}>
                    {formatTime(m.sent_at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky composer */}
      <form
        onSubmit={send}
        style={{
          position: 'sticky', bottom: 0, zIndex: 20,
          background: 'rgba(10,26,15,0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(52,211,153,0.12)',
          padding: '14px 20px',
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your message…"
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
              flex: 1,
              padding: '10px 14px',
              background: 'rgba(0,0,0,0.3)',
              color: T.textPrimary,
              border: T.cardBorder,
              borderRadius: 16,
              fontSize: 14,
              fontFamily: T.sans,
              lineHeight: 1.5,
              resize: 'none',
              maxHeight: 160,
              minHeight: 42,
            }}
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            style={{
              padding: '10px 16px',
              background: 'linear-gradient(180deg, #27815a 0%, #1D6B48 100%)',
              color: '#fff',
              border: '1px solid rgba(130,217,174,0.18)',
              borderRadius: 999,
              fontSize: 13,
              cursor: 'pointer',
              opacity: !text.trim() ? 0.5 : 1,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            <Send size={13} />
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
        {error && (
          <div style={{ maxWidth: 720, margin: '8px auto 0', color: '#f87171', fontSize: 12 }}>
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
