// /montree/dashboard/messages/[threadId]/page.tsx
// Session 103 — Teacher thread detail + reply composer.
//
// Mirrors parent's Session 98 thread detail. Auto-marks read on open.
// Server forces ai_drafted=false on every teacher post — Tracy drafting is
// principal-only. The "Tracy drafted" amber pill renders on incoming
// messages with ai_drafted=true so the teacher can see when a principal
// reply was AI-assisted (transparency).

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { ArrowLeft, Send } from 'lucide-react';
import { useI18n, getIntlLocale } from '@/lib/montree/i18n';
import { useThreadPolling } from '@/hooks/useThreadPolling';
import VoiceComposer, { type VoiceReady } from '@/components/montree/messaging/VoiceComposer';
import VoiceBubble from '@/components/montree/messaging/VoiceBubble';

// Dark forest tokens
const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  cardBorderStrong: '1px solid rgba(52,211,153,0.35)',
  cardRadius: 18,
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldDeep: '#10b981',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  amberSoft: 'rgba(245,158,11,0.18)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface Thread {
  id: string;
  subject: string | null;
  thread_type: string;
  child_id: string | null;
  classroom_id: string | null;
}

interface Participant {
  role: string;
  id: string;
  name: string | null;
  email: string | null;
  is_observer: boolean;
  can_reply: boolean;
  is_primary: boolean;
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
  // Voice notes: when media_type='audio', body carries the Whisper transcript
  // and media_url is the stable proxy URL to the audio in voice-obs.
  media_url?: string | null;
  media_type?: 'image' | 'video' | 'document' | 'audio' | null;
  media_filename?: string | null;
  // 🚨 Perf Tier 4.3 — optimistic state for locally-added bubbles.
  optimistic?: boolean;
  sendFailed?: boolean;
}

interface Child {
  id: string;
  name: string;
}

interface Classroom {
  id: string;
  name: string;
}

interface ThreadResponse {
  thread: Thread;
  participants: Participant[];
  child: Child | null;
  classroom: Classroom | null;
}

interface MeResponse {
  authenticated: boolean;
  teacher?: { id: string; name: string; role: string; email: string };
}

export default function TeacherThreadDetailPage() {
  const router = useRouter();
  const params = useParams<{ threadId: string }>();
  const threadId = params?.threadId;
  const { t, locale } = useI18n();

  const [loading, setLoading] = useState(true);
  const [thread, setThread] = useState<Thread | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [child, setChild] = useState<Child | null>(null);
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Initial load
  useEffect(() => {
    if (!threadId) return;
    let active = true;
    (async () => {
      try {
        const [threadRes, messagesRes, meRes] = await Promise.all([
          fetch(`/api/montree/messages/threads/${threadId}`, { credentials: 'include' }),
          fetch(`/api/montree/messages/threads/${threadId}/messages`, { credentials: 'include' }),
          fetch('/api/montree/auth/me', { credentials: 'include' }),
        ]);

        if (threadRes.status === 401) {
          router.replace('/montree/login');
          return;
        }
        if (threadRes.status === 403 || threadRes.status === 404) {
          router.replace('/montree/dashboard/messages');
          return;
        }
        if (!threadRes.ok) {
          if (active) {
            toast.error(t('teacherMessages.loadFailed') || 'Could not load conversation');
            setLoading(false);
          }
          return;
        }

        const threadData = (await threadRes.json()) as ThreadResponse;
        const messagesData = messagesRes.ok ? await messagesRes.json() : { messages: [] };

        // Best-effort: pull my id from auth/me so we can mark "is me" on bubbles.
        // /api/montree/auth/me historically 401s for principals (Session 85 note)
        // but works fine for teachers — which is what this page targets.
        let resolvedMyId: string | null = null;
        if (meRes.ok) {
          try {
            const meData = (await meRes.json()) as MeResponse;
            resolvedMyId = meData?.teacher?.id || null;
          } catch {
            /* ignore */
          }
        }

        if (active) {
          setThread(threadData.thread);
          setParticipants(threadData.participants || []);
          setChild(threadData.child);
          setClassroom(threadData.classroom);
          setMessages(messagesData.messages || []);
          setMyId(resolvedMyId);
          setLoading(false);
        }

        // Mark as read.
        await fetch(`/api/montree/messages/threads/${threadId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_read' }),
        }).catch(() => {});
      } catch (err) {
        console.error('[teacher thread detail] load failed', err);
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [threadId, router, t]);

  // Auto-scroll to bottom on new messages. Skip the initial mount — on
  // mobile, smooth-scrolling into the bottom on first load drags the
  // sticky header out of view. After messages arrive, future inserts
  // (your own replies, polled incoming) scroll smoothly.
  const isInitialScrollRef = useRef(true);
  useEffect(() => {
    if (messages.length === 0) return;
    if (isInitialScrollRef.current) {
      isInitialScrollRef.current = false;
      // Jump (no smooth animation) to the bottom on first paint.
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  // Live updates — poll every 5s while visible. Pauses during send so
  // optimistic bubbles aren't trampled by an in-flight server fetch.
  useThreadPolling<Message>({
    endpoint: `/api/montree/messages/threads/${threadId}/messages`,
    setMessages,
    enabled: !loading && !!threadId,
    pause: sending,
  });

  // Find my participant row. Falls back to the unique teacher participant if
  // we couldn't resolve myId (auth/me failed) — in 1:1 threads this is safe.
  const myParticipant = (() => {
    if (myId) {
      const byId = participants.find((p) => p.role === 'teacher' && p.id === myId);
      if (byId) return byId;
    }
    const teachers = participants.filter((p) => p.role === 'teacher' && !p.is_observer);
    if (teachers.length === 1) return teachers[0];
    return null;
  })();
  // Default to false when we can't resolve our participant row — the server's
  // POST handler is the authoritative gate, but optimistically showing the
  // composer and then 403-erroring on Send is a worse UX than hiding it.
  const canReply = myParticipant?.can_reply ?? false;

  const headerName = (() => {
    if (thread?.subject) return thread.subject;
    const others = participants.filter(
      (p) => !p.is_observer && (myParticipant ? p.id !== myParticipant.id || p.role !== myParticipant.role : true)
    );
    if (others.length === 1) {
      const o = others[0];
      return o.name || (o.role === 'principal'
        ? t('teacherMessages.principalLabel') || 'Principal'
        : o.role === 'parent'
          ? t('teacherMessages.parentLabel') || 'Parent'
          : t('teacherMessages.teacherLabel') || 'Teacher');
    }
    if (others.length > 1) return others.map((p) => p.name || p.role).join(', ');
    if (thread?.thread_type === 'internal') return t('teacherMessages.internalLabel') || 'Staff conversation';
    return t('teacherMessages.title') || 'Conversation';
  })();

  const handleSend = useCallback(async () => {
    if (!reply.trim() || !threadId || sending) return;
    setSending(true);

    // 🚨 Perf Tier 4.3 — optimistic send.
    const bodyText = reply.trim();
    const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: Message = {
      id: tempId,
      thread_id: threadId,
      sender_role: 'teacher',
      sender_id: 'me',
      sender_name: 'You',
      body: bodyText,
      ai_drafted: false,
      sent_at: new Date().toISOString(),
      optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setReply('');

    try {
      const res = await fetch(`/api/montree/messages/threads/${threadId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: bodyText }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, sendFailed: true, optimistic: false } : m)));
        setReply(bodyText);
        toast.error(err.error || (t('teacherMessages.sendFailed') || "Couldn't send"));
        setSending(false);
        return;
      }
      const data = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === tempId ? data.message : m)));
      setSending(false);
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, sendFailed: true, optimistic: false } : m)));
      setReply(bodyText);
      toast.error(t('teacherMessages.sendFailed') || "Couldn't send");
      setSending(false);
    }
  }, [reply, threadId, sending, t]);

  // Voice-note send. Mirrors handleSend but with media_* on the payload.
  const handleVoiceReady = useCallback(async (data: VoiceReady) => {
    if (!threadId || sending) return;
    setSending(true);
    const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: Message = {
      id: tempId,
      thread_id: threadId,
      sender_role: 'teacher',
      sender_id: myId || 'me',
      sender_name: 'You',
      body: data.transcript,
      ai_drafted: false,
      sent_at: new Date().toISOString(),
      media_url: data.audioUrl,
      media_type: 'audio',
      media_filename: data.filename,
      optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const res = await fetch(`/api/montree/messages/threads/${threadId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: data.transcript,
          media_url: data.audioUrl,
          media_type: 'audio',
          media_filename: data.filename,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, sendFailed: true, optimistic: false } : m)));
        toast.error(err.error || "Couldn't send voice note");
        setSending(false);
        return;
      }
      const respJson = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === tempId ? respJson.message : m)));
      setSending(false);
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, sendFailed: true, optimistic: false } : m)));
      toast.error("Couldn't send voice note");
      setSending(false);
    }
  }, [threadId, sending, myId]);

  const formatStamp = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const dl = getIntlLocale(locale);
    const sameDay = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString(dl, { hour: 'numeric', minute: '2-digit' });
    if (sameDay) return time;
    return `${d.toLocaleDateString(dl, { month: 'short', day: 'numeric' })} · ${time}`;
  };

  const senderLabel = (msg: Message): string => {
    if (msg.sender_role === 'teacher' && myParticipant && msg.sender_id === myParticipant.id) {
      return t('teacherMessages.you') || 'You';
    }
    return msg.sender_name;
  };

  // --- Loading
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: T.bg,
        backgroundImage: T.glow,
        backgroundAttachment: 'fixed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: T.sans,
        color: T.textSecondary,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: T.emeraldSoft,
            animation: 'cg-pulse 1.6s ease-in-out infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ fontSize: 14, color: T.textMuted }}>{t('common.loading') || 'Loading…'}</p>
        </div>
        <style>{`
          @keyframes cg-pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      backgroundImage: T.glow,
      backgroundAttachment: 'fixed',
      color: T.textPrimary,
      fontFamily: T.sans,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Toaster position="top-center" />

      {/* ═══ Sticky Header ═══ */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: T.card,
        backdropFilter: T.blur,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <button
            onClick={() => router.push('/montree/dashboard/messages')}
            style={{
              background: 'none',
              border: 'none',
              color: T.textSecondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: 4,
            }}
            aria-label={t('common.back') || 'Back'}
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: T.serif,
              fontSize: 16,
              fontWeight: 600,
              color: T.textPrimary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {headerName}
            </div>
            {(child?.name || classroom?.name) && (
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                {[child?.name, classroom?.name].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ═══ Messages ═══ */}
      <main style={{
        flex: 1,
        maxWidth: 720,
        width: '100%',
        margin: '0 auto',
        padding: '24px 20px 100px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: T.textMuted, fontSize: 13 }}>
            {t('teacherMessages.noMessagesYet') || 'No messages yet.'}
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_role === 'teacher' && myParticipant?.id === msg.sender_id;
            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{
                  fontSize: 11,
                  color: T.textMuted,
                  paddingLeft: isMe ? 0 : 4,
                  paddingRight: isMe ? 4 : 0,
                  textAlign: isMe ? 'right' : 'left',
                }}>
                  {senderLabel(msg)}
                  {msg.ai_drafted && (
                    <span style={{
                      marginLeft: 6,
                      padding: '1px 6px',
                      borderRadius: 999,
                      background: T.amberSoft,
                      color: '#fbbf24',
                      fontSize: 9,
                      fontWeight: 700,
                    }}>
                      {t('teacherMessages.tracyDrafted') || 'Tracy drafted'}
                    </span>
                  )}
                </div>
                <div style={{
                  padding: '12px 14px',
                  borderRadius: 14,
                  background: isMe ? T.emeraldStrong : T.card,
                  border: isMe ? '1px solid rgba(52,211,153,0.30)' : T.cardBorder,
                  color: T.textPrimary,
                  fontSize: 14,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {msg.media_type === 'audio' && msg.media_url ? (
                    <VoiceBubble audioUrl={msg.media_url} transcript={msg.body} isMine={isMe} />
                  ) : (
                    msg.body
                  )}
                </div>
                <div style={{
                  fontSize: 10,
                  color: T.textMuted,
                  paddingLeft: isMe ? 0 : 4,
                  paddingRight: isMe ? 4 : 0,
                  textAlign: isMe ? 'right' : 'left',
                }}>
                  {formatStamp(msg.sent_at)}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* ═══ Reply composer (sticky bottom) ═══ */}
      {canReply && (
        <div style={{
          position: 'sticky',
          bottom: 0,
          background: T.bg,
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '12px 20px 20px',
        }}>
          <div style={{
            maxWidth: 720,
            margin: '0 auto',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-end',
          }}>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={t('teacherMessages.replyPlaceholder') || 'Write a reply…'}
              rows={1}
              maxLength={10000}
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: 14,
                background: T.card,
                border: T.cardBorder,
                color: T.textPrimary,
                fontSize: 14,
                fontFamily: T.sans,
                outline: 'none',
                resize: 'none',
                minHeight: 44,
                maxHeight: 160,
                lineHeight: 1.4,
              }}
            />
            <VoiceComposer onReady={handleVoiceReady} disabled={sending} />
            <button
              onClick={handleSend}
              disabled={sending || !reply.trim()}
              style={{
                padding: '12px 16px',
                borderRadius: 14,
                background: `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})`,
                border: 'none',
                color: '#0a1a0f',
                cursor: sending || !reply.trim() ? 'not-allowed' : 'pointer',
                opacity: sending || !reply.trim() ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label={t('teacherMessages.send') || 'Send'}
            >
              <Send size={18} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes cg-pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}
