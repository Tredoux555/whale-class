// /montree/parent/messages/[threadId]/page.tsx
// Session 98 — Parent thread detail + reply composer.
//
// Same flag gate as the list page: 404 from any API call → redirect to dashboard.
// AI is off on parent posts: composer never offers Tracy drafting.

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { ArrowLeft, Send, Video, Calendar } from 'lucide-react';
import { useI18n, getIntlLocale } from '@/lib/montree/i18n';
import { useThreadPolling } from '@/hooks/useThreadPolling';
import VoiceComposer, { type VoiceReady } from '@/components/montree/messaging/VoiceComposer';
import VoiceBubble from '@/components/montree/messaging/VoiceBubble';
import MontreeLogo from '@/components/montree/MonteeLogo';

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
  // Voice notes: when media_type='audio', body carries the transcript and
  // media_url is the stable proxy URL to the audio file in voice-obs.
  media_url?: string | null;
  media_type?: 'image' | 'video' | 'document' | 'audio' | null;
  media_filename?: string | null;
  // 🚨 Perf Tier 4.3 — optimistic send state. Set on locally-added bubbles
  // until the server confirms. Cleared when load() refetches.
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

interface ThreadAppointment {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number;
  status: string;
  provider?: 'jitsi' | 'agora' | null;
  video_url?: string | null;
  location?: string | null;
  intake_subject?: string | null;
}

interface ThreadResponse {
  thread: Thread;
  participants: Participant[];
  child: Child | null;
  classroom: Classroom | null;
  appointments?: ThreadAppointment[];
}

export default function ParentThreadDetailPage() {
  const router = useRouter();
  const params = useParams<{ threadId: string }>();
  const threadId = params?.threadId;
  const { t, locale } = useI18n();

  const [loading, setLoading] = useState(true);
  const [thread, setThread] = useState<Thread | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [child, setChild] = useState<Child | null>(null);
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [appointments, setAppointments] = useState<ThreadAppointment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Initial load
  useEffect(() => {
    if (!threadId) return;
    let active = true;
    (async () => {
      try {
        const [threadRes, messagesRes] = await Promise.all([
          fetch(`/api/montree/parent/messages/threads/${threadId}`, { credentials: 'include' }),
          fetch(`/api/montree/parent/messages/threads/${threadId}/messages`, { credentials: 'include' }),
        ]);

        // Flag off, no access, or thread doesn't exist for this parent → bounce.
        if (threadRes.status === 401 || threadRes.status === 403 || threadRes.status === 404) {
          router.replace('/montree/parent/dashboard');
          return;
        }
        if (!threadRes.ok) {
          if (active) {
            toast.error('Could not load conversation');
            setLoading(false);
          }
          return;
        }

        const threadData = (await threadRes.json()) as ThreadResponse;
        const messagesData = messagesRes.ok ? await messagesRes.json() : { messages: [] };

        if (active) {
          setThread(threadData.thread);
          setParticipants(threadData.participants || []);
          setChild(threadData.child);
          setClassroom(threadData.classroom);
          setAppointments(threadData.appointments || []);
          setMessages(messagesData.messages || []);
          setLoading(false);
        }

        // Mark as read.
        await fetch(`/api/montree/parent/messages/threads/${threadId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_read' }),
        }).catch(() => {});
      } catch (err) {
        console.error('[parent thread detail] load failed', err);
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [threadId, router]);

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  // Live updates — poll the messages endpoint every 5s while the page is
  // visible and a send isn't in flight. Pauses on tab-hidden + during send.
  useThreadPolling<Message>({
    endpoint: `/api/montree/parent/messages/threads/${threadId}/messages`,
    setMessages,
    enabled: !loading && !!threadId,
    pause: sending,
  });

  const myParticipant = participants.find((p) => p.is_me);
  const canReply = myParticipant?.can_reply ?? false;

  // State-backed clock so the "joinable" window flips reactively as time
  // passes. Ticks once a minute — close enough for a 15-min pre-window.
  // useMemo bodies must be pure, so we read clock from state, not Date.now().
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Find the next live appointment to surface at the top of the thread.
  // ONLY shown when the meeting is within range: starts within 7 days, OR
  // ended within the last 2 hours. Past/distant-future meetings stay in
  // the message timeline below — we don't want a 3-month-old appointment
  // pinned permanently at the top.
  const nextMeeting = useMemo<ThreadAppointment | null>(() => {
    const live = appointments.filter((a) => a.status !== 'cancelled');
    if (live.length === 0) return null;
    const inWindow = live
      .filter((a) => {
        const start = new Date(a.scheduled_start).getTime();
        const end = new Date(a.scheduled_end).getTime();
        return nowTick >= start - 7 * 24 * 60 * 60 * 1000 && nowTick <= end + 2 * 60 * 60 * 1000;
      })
      .sort((a, b) => {
        // Prefer the meeting closest to "now" — currently-running first,
        // then soonest upcoming, then most recently ended.
        const aStart = new Date(a.scheduled_start).getTime();
        const bStart = new Date(b.scheduled_start).getTime();
        return Math.abs(aStart - nowTick) - Math.abs(bStart - nowTick);
      });
    return inWindow[0] || null;
  }, [appointments, nowTick]);

  const isMeetingJoinable = useMemo(() => {
    if (!nextMeeting) return false;
    const start = new Date(nextMeeting.scheduled_start).getTime();
    const end = new Date(nextMeeting.scheduled_end).getTime();
    // Joinable from 15 min before start until 30 min after end. Same window
    // the appointments page uses for the green Join button.
    return nowTick >= start - 15 * 60 * 1000 && nowTick <= end + 30 * 60 * 1000;
  }, [nextMeeting, nowTick]);

  const meetingHeader = useMemo(() => {
    if (!nextMeeting) return null;
    const dl = getIntlLocale(locale);
    const start = new Date(nextMeeting.scheduled_start);
    const sameDay = start.toDateString() === new Date(nowTick).toDateString();
    const dateLabel = sameDay
      ? t('parentMessages.today') || 'Today'
      : start.toLocaleDateString(dl, { weekday: 'short', month: 'short', day: 'numeric' });
    const timeLabel = start.toLocaleTimeString(dl, { hour: 'numeric', minute: '2-digit' });
    return `${dateLabel} · ${timeLabel}`;
  }, [nextMeeting, locale, t, nowTick]);

  const headerName = (() => {
    // Show the non-me, non-observer participants as the "title" of the thread.
    const others = participants.filter((p) => !p.is_me && !p.is_observer);
    if (thread?.subject) return thread.subject;
    if (others.length === 1) return others[0].name || (others[0].role === 'principal' ? 'Principal' : 'Teacher');
    if (others.length > 1) return others.map((p) => p.name || p.role).join(', ');
    return t('parentMessages.title') || 'Conversation';
  })();

  const handleSend = useCallback(async () => {
    if (!reply.trim() || !threadId || sending) return;
    setSending(true);

    // 🚨 Perf Tier 4.3 — optimistic send. Insert the bubble locally first.
    // On VPN flap the parent still sees their message land while the round
    // trip resolves in the background. On failure, mark the bubble failed
    // and restore the draft to the input for retry.
    const bodyText = reply.trim();
    const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: Message = {
      id: tempId,
      thread_id: threadId,
      sender_role: 'parent',
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
      const res = await fetch(`/api/montree/parent/messages/threads/${threadId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: bodyText }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, sendFailed: true, optimistic: false } : m)));
        setReply(bodyText);
        toast.error(err.error || (t('parentMessages.sendFailed') || 'Could not send'));
        setSending(false);
        return;
      }
      const data = await res.json();
      // Replace the optimistic temp with the canonical server row.
      setMessages((prev) => prev.map((m) => (m.id === tempId ? data.message : m)));
      setSending(false);
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, sendFailed: true, optimistic: false } : m)));
      setReply(bodyText);
      toast.error(t('parentMessages.sendFailed') || 'Could not send');
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
      sender_role: 'parent',
      sender_id: 'me',
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
      const res = await fetch(`/api/montree/parent/messages/threads/${threadId}/messages`, {
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
        toast.error(err.error || 'Could not send voice note');
        setSending(false);
        return;
      }
      const respJson = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === tempId ? respJson.message : m)));
      setSending(false);
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, sendFailed: true, optimistic: false } : m)));
      toast.error('Could not send voice note');
      setSending(false);
    }
  }, [threadId, sending]);

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
    if (msg.sender_role === 'parent' && myParticipant && msg.sender_id === myParticipant.id) {
      return t('parentMessages.you') || 'You';
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

      {/* ═══ Sticky Header — Montree home link + Back + thread title ═══ */}
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
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          {/* Montree home anchor — tap takes you straight to the parent dashboard. */}
          <Link
            href="/montree/parent/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
              color: T.textPrimary,
              padding: '4px 6px 4px 0',
            }}
            aria-label="Montree home"
          >
            <MontreeLogo size={26} />
            <span style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>
              Montree
            </span>
          </Link>
          <button
            onClick={() => router.push('/montree/parent/messages')}
            style={{
              background: 'none',
              border: 'none',
              color: T.textSecondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              fontSize: 12,
              fontWeight: 500,
            }}
            aria-label={t('parentMessages.backToList') || 'Back to messages'}
          >
            <ArrowLeft size={14} strokeWidth={2} />
            {t('parentMessages.messages') || 'Messages'}
          </button>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
            <div style={{
              fontFamily: T.serif,
              fontSize: 14,
              fontWeight: 600,
              color: T.textPrimary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {headerName}
            </div>
            {(child?.name || classroom?.name) && (
              <div style={{ fontSize: 10, color: T.textMuted, marginTop: 1 }}>
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
        {/* Pinned upcoming-meeting card — appears when this thread has a
            non-cancelled appointment within 24h, in-progress, or in the past
            30min. Click → /montree/parent/appointments where Join lives. */}
        {nextMeeting && (
          <Link
            href="/montree/parent/appointments"
            style={{
              display: 'block',
              padding: '14px 16px',
              borderRadius: 14,
              background: isMeetingJoinable
                ? 'linear-gradient(135deg, rgba(52,211,153,0.22), rgba(16,185,129,0.16))'
                : 'rgba(52,211,153,0.10)',
              border: isMeetingJoinable
                ? '1px solid rgba(52,211,153,0.55)'
                : T.cardBorder,
              textDecoration: 'none',
              color: T.textPrimary,
              marginBottom: 4,
            }}
            aria-label={isMeetingJoinable ? 'Join the video call' : 'Open the meeting'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: isMeetingJoinable ? 'rgba(52,211,153,0.30)' : 'rgba(52,211,153,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {isMeetingJoinable
                  ? <Video size={18} strokeWidth={2} color={T.emerald} />
                  : <Calendar size={16} strokeWidth={1.75} color={T.emerald} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', color: isMeetingJoinable ? T.emerald : T.textMuted }}>
                  {isMeetingJoinable
                    ? (t('parentMessages.meetingLive') || 'Meeting ready')
                    : (t('parentMessages.upcomingMeeting') || 'Upcoming meeting')}
                </div>
                <div style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 600, color: T.textPrimary, marginTop: 2 }}>
                  {meetingHeader}
                </div>
              </div>
              <div style={{
                padding: '8px 14px',
                borderRadius: 999,
                background: isMeetingJoinable ? T.emerald : 'rgba(255,255,255,0.08)',
                color: isMeetingJoinable ? '#0a1a0f' : T.textSecondary,
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {isMeetingJoinable
                  ? (t('parentMessages.joinCall') || 'Join')
                  : (t('parentMessages.openMeeting') || 'Open')}
              </div>
            </div>
          </Link>
        )}

        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: T.textMuted, fontSize: 13 }}>
            {t('parentMessages.noMessagesYet') || 'No messages yet.'}
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_role === 'parent' && myParticipant?.id === msg.sender_id;
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
                      Tracy drafted
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
              placeholder={t('parentMessages.replyPlaceholder') || 'Write a reply…'}
              rows={1}
              maxLength={10000}
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: 14,
                background: T.card,
                border: T.cardBorder,
                color: T.textPrimary,
                // 16px prevents iOS Safari zoom-in on focus — parents are
                // overwhelmingly on mobile so this matters here.
                fontSize: 16,
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
              aria-label={t('parentMessages.send') || 'Send'}
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
