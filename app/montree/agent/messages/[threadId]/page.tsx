// /montree/agent/messages/[threadId]/page.tsx
// Session 104 — Agent thread detail + reply composer.
// Same flag-style gate as parent: 401 → login, 403/404 → bounce to messages list.

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';
import { useI18n } from '@/lib/montree/i18n';
import { getIntlLocale } from '@/lib/montree/i18n/locales';

const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  cardRadius: 18,
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldDeep: '#10b981',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface Thread {
  id: string;
  subject: string | null;
  thread_type: string;
  school_id: string;
}

interface Participant {
  role: string;
  id: string;
  name: string | null;
  is_observer: boolean;
  can_reply: boolean;
  is_me: boolean;
}

interface Message {
  id: string;
  thread_id: string;
  sender_role: string;
  sender_id: string;
  sender_name: string;
  body: string;
  ai_drafted: boolean;
  sent_at: string;
}

interface School {
  id: string;
  name: string;
}

interface ThreadResponse {
  thread: Thread;
  participants: Participant[];
  school: School | null;
}

export default function AgentThreadDetailPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const params = useParams<{ threadId: string }>();
  const threadId = params?.threadId;

  const [loading, setLoading] = useState(true);
  const [thread, setThread] = useState<Thread | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [school, setSchool] = useState<School | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    if (!threadId) return;
    let active = true;

    (async () => {
      try {
        const [threadRes, messagesRes] = await Promise.all([
          fetch(`/api/montree/agent/messages/threads/${threadId}`, { credentials: 'include' }),
          fetch(`/api/montree/agent/messages/threads/${threadId}/messages`, { credentials: 'include' }),
        ]);

        if (threadRes.status === 401) { router.replace('/montree/login-select'); return; }
        if (threadRes.status === 403 || threadRes.status === 404) {
          router.replace('/montree/agent/messages'); return;
        }
        if (!threadRes.ok) {
          if (active) setLoading(false);
          return;
        }

        const threadData = (await threadRes.json()) as ThreadResponse;
        const messagesData = messagesRes.ok ? await messagesRes.json() : { messages: [] };

        if (!active) return;
        setThread(threadData.thread);
        setParticipants(threadData.participants);
        setSchool(threadData.school);
        setMessages(messagesData.messages || []);
        setLoading(false);

        // Mark as read.
        fetch(`/api/montree/agent/messages/threads/${threadId}`, {
          method: 'PATCH', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_read' }),
        }).catch((e) => console.error('[agent thread] mark_read failed', e));
      } catch (err) {
        console.error('[agent thread] load failed', err);
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [threadId, router]);

  // Auto-scroll to bottom when messages change.
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length]);

  const myParticipant = participants.find((p) => p.is_me);
  const canReply = !!myParticipant?.can_reply;

  const handleSend = useCallback(async () => {
    if (!threadId || !reply.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/montree/agent/messages/threads/${threadId}/messages`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: reply.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || t('agentThread.failedToSend'));
        setSending(false);
        return;
      }
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      setReply('');
      setSending(false);
    } catch (err) {
      console.error('[agent send] failed', err);
      setError(t('agentThread.networkError'));
      setSending(false);
    }
  }, [threadId, reply, sending, t]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(getIntlLocale(locale), {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  };

  const principal = participants.find((p) => p.role === 'principal');
  const subtitle = school?.name || '';
  const title = thread?.subject || (principal?.name ? `${principal.name}` : t('agentThread.conversation'));

  if (loading) {
    return (
      <div style={{
        minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: T.sans, color: T.textSecondary,
      }}>
        <p style={{ fontSize: 14, color: T.textMuted }}>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div style={{
      color: T.textPrimary, fontFamily: T.sans,
      display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)',
    }}>
      {/* Sticky header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: T.card, backdropFilter: T.blur,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{
          maxWidth: 720, margin: '0 auto', padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <button
            onClick={() => router.push('/montree/agent/messages')}
            style={{
              background: 'none', border: 'none', color: T.textSecondary,
              cursor: 'pointer', display: 'flex', padding: 4,
            }}
            aria-label={t('common.back')}
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              margin: 0, fontSize: 16, fontWeight: 600,
              fontFamily: T.serif, color: T.textPrimary,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{
                margin: '2px 0 0', fontSize: 12, color: T.textMuted,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div style={{
        flex: 1, maxWidth: 720, margin: '0 auto', width: '100%',
        padding: '20px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {messages.length === 0 ? (
          <p style={{ textAlign: 'center', fontSize: 13, color: T.textMuted, marginTop: 60 }}>
            {t('agentThread.noMessages')}
          </p>
        ) : (
          messages.map((m) => {
            const isMine = m.sender_role === 'agent' && myParticipant && m.sender_id === myParticipant.id;
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: isMine ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{
                  maxWidth: '78%',
                  background: isMine ? `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})` : T.card,
                  color: isMine ? '#0a1a0f' : T.textPrimary,
                  border: isMine ? 'none' : T.cardBorder,
                  borderRadius: 16,
                  padding: '10px 14px',
                  fontSize: 14, lineHeight: 1.45,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {!isMine && (
                    <p style={{
                      margin: '0 0 4px', fontSize: 11, fontWeight: 700,
                      color: m.sender_role === 'principal' ? T.emerald : T.textMuted,
                      textTransform: 'uppercase', letterSpacing: 0.4,
                    }}>
                      {m.sender_name} {m.sender_role === 'principal' && `· ${t('agentThread.principalBadge')}`}
                    </p>
                  )}
                  {m.body}
                </div>
                <span style={{ fontSize: 10, color: T.textMuted, marginTop: 4 }}>
                  {formatTime(m.sent_at)}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply composer */}
      {canReply && (
        <div style={{
          position: 'sticky', bottom: 0, zIndex: 10,
          background: 'rgba(10,26,15,0.95)', backdropFilter: T.blur,
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '12px 16px',
        }}>
          <div style={{
            maxWidth: 720, margin: '0 auto',
            display: 'flex', gap: 10, alignItems: 'flex-end',
          }}>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              maxLength={10000}
              rows={1}
              placeholder={t('agentThread.replyPlaceholder')}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 18,
                background: T.card, border: T.cardBorder, color: T.textPrimary,
                fontSize: 14, fontFamily: T.sans, boxSizing: 'border-box',
                resize: 'none', maxHeight: 120, minHeight: 40,
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              onClick={handleSend}
              disabled={!reply.trim() || sending}
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: reply.trim() && !sending
                  ? `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})`
                  : 'rgba(52,211,153,0.2)',
                border: 'none',
                color: reply.trim() && !sending ? '#0a1a0f' : T.textMuted,
                cursor: reply.trim() && !sending ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-label={t('agentThread.send')}
            >
              <Send size={16} strokeWidth={2} />
            </button>
          </div>
          {error && (
            <p style={{
              maxWidth: 720, margin: '6px auto 0', fontSize: 12, color: '#f87171',
              padding: '0 4px',
            }}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
