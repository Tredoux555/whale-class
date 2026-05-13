// /montree/agent/messages-tredoux/page.tsx
// Phase 4 — Agent ↔ Tredoux thread list + compose.
//
// Single recipient (Tredoux), so compose is simpler than the per-school
// principal flow. Visual language mirrors /agent/messages/page.tsx for
// consistency.

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Plus, X, Send } from 'lucide-react';

const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  cardBorderStrong: '1px solid rgba(52,211,153,0.35)',
  cardRadius: 18,
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface ThreadRow {
  id: string;
  subject: string | null;
  created_at: string;
  last_message_at: string;
  last_snippet: string | null;
  last_sender_name: string | null;
  last_sender_role: string | null;
  last_sender_is_me: boolean;
  unread_for_me: number;
}

export default function AgentMessagesTredouxPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/montree/agent/messages-tredoux/threads', { credentials: 'include' });
      if (res.status === 401) {
        router.replace('/montree/login-select');
        return;
      }
      if (res.status === 403) {
        router.replace('/montree/agent/dashboard');
        return;
      }
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      setThreads(data.threads || []);
      setLoading(false);
    } catch (err) {
      console.error('[agent messages-tredoux] load failed', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const submitCompose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/montree/agent/messages-tredoux/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subject: subject.trim() || null, body: body.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not send.');
        setSending(false);
        return;
      }
      setComposeOpen(false);
      setSubject('');
      setBody('');
      // Reload threads, then navigate into the new one.
      await load();
      if (data.thread_id) {
        router.push(`/montree/agent/messages-tredoux/${data.thread_id}`);
      }
    } catch (err) {
      console.error('[agent messages-tredoux] send failed', err);
      setError('Network error.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      color: T.textPrimary,
      fontFamily: T.sans,
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: T.glow, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto', padding: '32px 20px 80px' }}>

        <Link
          href="/montree/agent/dashboard"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: T.textMuted, textDecoration: 'none',
            fontSize: 13, marginBottom: 18,
          }}
        >
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: T.serif, fontSize: 30, letterSpacing: '-0.5px', fontWeight: 500 }}>
            Tredoux
          </h1>
          <p style={{ color: T.textSecondary, marginTop: 6, fontSize: 14 }}>
            Your direct line to Tredoux. Anything you need — questions, ideas, issues with a prospect.
          </p>
        </div>

        {loading && (
          <div style={{ color: T.textMuted, fontSize: 14, padding: 24 }}>Loading…</div>
        )}

        {!loading && threads.length === 0 && (
          <div style={{
            padding: 36,
            background: T.card,
            border: T.cardBorder,
            borderRadius: T.cardRadius,
            backdropFilter: T.blur,
            WebkitBackdropFilter: T.blur,
            textAlign: 'center',
          }}>
            <MessageSquare size={32} color={T.emerald} style={{ margin: '0 auto 12px' }} />
            <div style={{ fontFamily: T.serif, fontSize: 20, marginBottom: 8 }}>
              No threads yet
            </div>
            <p style={{ color: T.textSecondary, fontSize: 14, maxWidth: 380, margin: '0 auto 18px' }}>
              Start a conversation with Tredoux. He reads every message personally and replies as fast as he can.
            </p>
            <button
              onClick={() => setComposeOpen(true)}
              style={{
                padding: '11px 22px',
                background: 'linear-gradient(180deg, #27815a 0%, #1D6B48 100%)',
                color: '#fff',
                border: '1px solid rgba(130,217,174,0.18)',
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} style={{ display: 'inline-block', marginRight: 6, verticalAlign: '-2px' }} />
              Start a message
            </button>
          </div>
        )}

        {!loading && threads.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
              <button
                onClick={() => setComposeOpen(true)}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(180deg, #27815a 0%, #1D6B48 100%)',
                  color: '#fff',
                  border: '1px solid rgba(130,217,174,0.18)',
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                <Plus size={13} /> New message
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {threads.map((t) => (
                <Link
                  key={t.id}
                  href={`/montree/agent/messages-tredoux/${t.id}`}
                  style={{
                    display: 'block',
                    padding: 16,
                    background: t.unread_for_me > 0 ? T.emeraldSoft : T.card,
                    border: t.unread_for_me > 0 ? T.cardBorderStrong : T.cardBorder,
                    borderRadius: 14,
                    backdropFilter: T.blur,
                    WebkitBackdropFilter: T.blur,
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <div style={{ fontWeight: t.unread_for_me > 0 ? 600 : 500, color: T.textPrimary, fontSize: 14 }}>
                      {t.subject || (t.last_sender_is_me ? 'You started this thread' : 'Tredoux')}
                    </div>
                    <div style={{ fontSize: 11, color: T.textMuted, whiteSpace: 'nowrap' }}>
                      {formatTime(t.last_message_at)}
                    </div>
                  </div>
                  {t.last_snippet && (
                    <div style={{ marginTop: 6, fontSize: 13, color: T.textSecondary, lineHeight: 1.5 }}>
                      <span style={{ color: T.textMuted }}>
                        {t.last_sender_is_me ? 'You: ' : 'Tredoux: '}
                      </span>
                      {t.last_snippet.length > 140 ? t.last_snippet.slice(0, 140) + '…' : t.last_snippet}
                    </div>
                  )}
                  {t.unread_for_me > 0 && (
                    <div style={{ marginTop: 8, display: 'inline-block', padding: '2px 8px',
                      background: T.emerald, color: '#06140e',
                      borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
                      {t.unread_for_me} new
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Compose modal */}
        {composeOpen && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => !sending && setComposeOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(6,20,14,0.7)',
              backdropFilter: 'blur(4px)',
              zIndex: 60,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 16,
            }}
          >
            <form
              onClick={(e) => e.stopPropagation()}
              onSubmit={submitCompose}
              style={{
                width: '100%', maxWidth: 520,
                background: '#08140d',
                border: T.cardBorderStrong,
                borderRadius: 18,
                padding: 24,
                color: T.textPrimary,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h2 style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 500 }}>Message Tredoux</h2>
                <button
                  type="button"
                  onClick={() => !sending && setComposeOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: T.textMuted, cursor: 'pointer', padding: 4 }}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <label style={{ display: 'block', fontSize: 12, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Subject (optional)
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Cambridge prospect — pricing question"
                maxLength={200}
                disabled={sending}
                style={{
                  width: '100%', padding: '10px 12px',
                  background: 'rgba(0,0,0,0.3)', color: T.textPrimary,
                  border: T.cardBorder, borderRadius: 10,
                  fontSize: 14, fontFamily: T.sans,
                  marginBottom: 14,
                }}
              />

              <label style={{ display: 'block', fontSize: 12, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Message *
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                rows={5}
                maxLength={10000}
                disabled={sending}
                style={{
                  width: '100%', padding: '10px 12px',
                  background: 'rgba(0,0,0,0.3)', color: T.textPrimary,
                  border: T.cardBorder, borderRadius: 10,
                  fontSize: 14, fontFamily: T.sans, lineHeight: 1.5,
                  resize: 'vertical', minHeight: 110,
                }}
              />

              {error && (
                <div style={{
                  marginTop: 12, padding: 10,
                  background: 'rgba(248,113,113,0.1)',
                  border: '1px solid rgba(248,113,113,0.3)',
                  borderRadius: 8,
                  color: '#f87171', fontSize: 13,
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                <button
                  type="button"
                  onClick={() => setComposeOpen(false)}
                  disabled={sending}
                  style={{
                    padding: '9px 18px',
                    background: 'transparent', color: T.textSecondary,
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 999, fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending || !body.trim()}
                  style={{
                    padding: '9px 18px',
                    background: 'linear-gradient(180deg, #27815a 0%, #1D6B48 100%)',
                    color: '#fff',
                    border: '1px solid rgba(130,217,174,0.18)',
                    borderRadius: 999, fontSize: 13, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    opacity: !body.trim() ? 0.5 : 1,
                  }}
                >
                  <Send size={13} />
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
