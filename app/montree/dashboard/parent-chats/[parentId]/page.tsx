// /montree/dashboard/parent-chats/[parentId]/page.tsx
//
// 🚨 Session 119 — WeChat-style per-parent stream. Every thread the
// teacher shares with this parent collapsed into one chronological
// chat. Sticky reply composer at the bottom, full screen scroll for
// history. Each message bubble carries a tiny "(about Amy)" subtitle
// when its originating thread had a child anchor.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Video, Phone, PlayCircle, Calendar, Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useI18n, getIntlLocale } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';
import { parseVideoCallInvite } from '@/lib/montree/messaging/video-call-invite';
import { parseAppointmentInvite } from '@/lib/montree/messaging/appointment-invite';
import AppointmentInviteCard from '@/components/montree/messaging/AppointmentInviteCard';
// Lazy-load the quick appointment modal — only loads when the teacher
// actually taps the calendar button. Keeps initial chat-page bundle slim.
const QuickSetAppointmentModal = dynamic(
  () => import('@/components/montree/appointments/QuickSetAppointmentModal'),
  { ssr: false }
);

const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  toolbarBg: 'linear-gradient(180deg, rgba(7,18,12,0.96), rgba(7,18,12,0.90))',
  toolbarBorder: '1px solid rgba(52,211,153,0.15)',
  emerald: '#34d399',
  emeraldDeep: '#1D6B48',
  gold: '#E8C96A',
  goldSoft: 'rgba(232,201,106,0.18)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.42)',
  red: '#f87171',
  bubbleSelfBg: 'linear-gradient(135deg, #34d399 0%, #1D6B48 100%)',
  bubbleOtherBg: 'rgba(255,255,255,0.08)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface ParentInfo {
  id: string;
  name: string;
  email: string | null;
}

interface FlatMessage {
  id: string;
  thread_id: string;
  sender_role: string;
  sender_id: string;
  sender_name: string;
  body: string;
  sent_at: string;
  ai_drafted: boolean;
  child_id: string | null;
  child_name: string | null;
}

export default function ParentChatStreamPage({ params }: { params: Promise<{ parentId: string }> }) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [parentId, setParentId] = useState<string | null>(null);
  const [parent, setParent] = useState<ParentInfo | null>(null);
  const [messages, setMessages] = useState<FlatMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [startingCall, setStartingCall] = useState<'voice' | 'video' | null>(null);
  // 🚨 Session 120 — quick-set-appointment modal state. The modal locks
  // parent + child from this thread context so the teacher doesn't have
  // to pick again. childAnchor derives from the most-recent message OR
  // any message with a non-null child_id.
  const [showApptModal, setShowApptModal] = useState(false);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  // Derive child anchor from messages — use the first message that has
  // a non-null child_id. Falls back to null when none exist (teacher
  // should send at least one regular message first).
  const childAnchor: { id: string; name: string | null } | null = (() => {
    if (!messages) return null;
    for (const m of messages) {
      if (m.child_id) return { id: m.child_id, name: m.child_name };
    }
    return null;
  })();

  // Unwrap params
  useEffect(() => {
    params.then(p => setParentId(p.parentId));
  }, [params]);

  const load = useCallback(async () => {
    if (!parentId) return;
    try {
      const res = await montreeApi(`/api/montree/dashboard/parent-chats/${parentId}`);
      if (res.status === 401 || res.status === 403) {
        router.push('/montree/login');
        return;
      }
      if (res.status === 404) {
        setError('Parent not found.');
        return;
      }
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      setParent(data.parent);
      setMessages(data.messages || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load chat');
    }
  }, [parentId, router]);

  useEffect(() => { load(); }, [load]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages && scrollEndRef.current) {
      scrollEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!parentId) return;
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      const res = await montreeApi(`/api/montree/dashboard/parent-chats/${parentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const errText = await res.text();
        setError(`Send failed: ${errText.slice(0, 200)}`);
        return;
      }
      setDraft('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setSending(false);
    }
  }, [parentId, draft, load]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send, Shift+Enter for newline (iMessage / WeChat default)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ✨ Parent Q&A loop — Guru drafts a grounded reply into the composer.
  // Uses the parent's most-recent message as the question (if any), grounded
  // on the thread's anchored child. Teacher reviews + edits + sends.
  const handleDraftWithGuru = useCallback(async () => {
    if (!parentId || !childAnchor || drafting || sending) return;
    setDrafting(true);
    setError(null);
    try {
      const lastParent = messages
        ? [...messages].reverse().find(m => m.sender_role === 'parent')
        : null;
      const res = await montreeApi(`/api/montree/dashboard/parent-chats/${parentId}/draft-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childAnchor.id, question: lastParent?.body || '' }),
      });
      if (res.status === 402) {
        setError('AI drafting needs an active AI tier for this school.');
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || 'Could not draft a reply.');
        return;
      }
      const data = await res.json();
      if (data?.draft) setDraft(data.draft);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Draft failed');
    } finally {
      setDrafting(false);
    }
  }, [parentId, childAnchor, drafting, sending, messages]);

  // 🚨 Session 119 Task 3 — instant call. Creates an Agora appointment
  // for RIGHT NOW + auto-posts the invite into this thread + redirects
  // the host into the call. Parent sees the invite card in real time
  // when their messages list refetches.
  const handleInstantCall = useCallback(async (mode: 'voice' | 'video') => {
    if (!parentId || startingCall) return;
    setStartingCall(mode);
    try {
      const res = await montreeApi(
        `/api/montree/dashboard/parent-chats/${parentId}/instant-call${mode === 'voice' ? '?audio=1' : ''}`,
        { method: 'POST' },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || `Could not start call (HTTP ${res.status}).`);
        setStartingCall(null);
        return;
      }
      const data = await res.json();
      if (!data?.join_url) {
        setError('Call started but no join URL — try refreshing.');
        setStartingCall(null);
        return;
      }
      // Refresh the chat so the invite message appears before the host
      // leaves the page (graceful — they'll see it again when they
      // come back from the call).
      await load();
      router.push(data.join_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start call');
      setStartingCall(null);
    }
  }, [parentId, startingCall, load, router]);

  return (
    <div style={{
      minHeight: '100dvh',
      background: T.bg,
      backgroundImage: T.glow,
      backgroundAttachment: 'fixed',
      color: T.textPrimary,
      fontFamily: T.sans,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Sticky header — sits directly below the DashboardHeader (57px tall),
          which itself grows by env(safe-area-inset-top) on a notched iPhone.
          Mirror that inset here so the two headers don't overlap. */}
      <header style={{
        position: 'sticky',
        top: 'calc(57px + env(safe-area-inset-top))',
        zIndex: 40,
        background: T.toolbarBg,
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        borderBottom: T.toolbarBorder,
        padding: '12px 16px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          maxWidth: 720,
          margin: '0 auto',
        }}>
          <Link
            href="/montree/dashboard/parent-chats"
            aria-label={t('common.back')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '7px 10px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: T.textPrimary,
              fontSize: 13,
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={15} strokeWidth={1.75} />
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: T.serif,
              fontSize: 17,
              fontWeight: 500,
              color: T.textPrimary,
              letterSpacing: -0.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {parent?.name || 'Loading…'}
            </div>
            {parent?.email && (
              <div style={{ fontSize: 11, color: T.textMuted, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {parent.email}
              </div>
            )}
          </div>

          {/* Session 119 Task 3 — instant call buttons. One-tap from the
              chat header to start a call with this parent right now.
              Voice and video share the same Agora SDK (audio=1 query
              param skips the camera track via the dedicated /calls
              page's `audioOnly` flag — full SDK wire-up is deferred so
              v1 voice-mode still joins with video and the user can mute
              their cam from the in-call controls). */}
          {parent && (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => handleInstantCall('voice')}
                disabled={!!startingCall}
                aria-label={`Voice call ${parent.name}`}
                title="Voice call"
                style={callBtnStyle(startingCall === 'voice')}
              >
                <Phone size={16} strokeWidth={1.75} />
              </button>
              <button
                onClick={() => handleInstantCall('video')}
                disabled={!!startingCall}
                aria-label={`Video call ${parent.name}`}
                title="Video call"
                style={callBtnStyle(startingCall === 'video')}
              >
                <Video size={16} strokeWidth={1.75} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <main style={{
        flex: 1,
        maxWidth: 720,
        width: '100%',
        margin: '0 auto',
        padding: '16px 12px 16px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>
        {error && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(248,113,113,0.10)',
            border: '1px solid rgba(248,113,113,0.30)',
            color: T.red,
            fontSize: 13,
            marginBottom: 8,
          }}>
            {error}
          </div>
        )}
        {!messages ? (
          <div style={{ padding: '60px 16px', textAlign: 'center', color: T.textMuted, fontSize: 14 }}>
            Loading…
          </div>
        ) : messages.length === 0 ? (
          <div style={{
            padding: '60px 24px',
            textAlign: 'center',
            color: T.textMuted,
            fontSize: 14,
            lineHeight: 1.5,
          }}>
            No messages yet. Type something below to start the conversation.
          </div>
        ) : (
          messages.map((m, idx) => {
            const isMe = m.sender_role !== 'parent';
            const prev = messages[idx - 1];
            const showSenderName = !isMe && (!prev || prev.sender_id !== m.sender_id);
            return (
              <MessageBubble
                key={m.id}
                message={m}
                isMe={isMe}
                showSenderName={showSenderName}
                locale={locale}
              />
            );
          })
        )}
        <div ref={scrollEndRef} />
      </main>

      {/* Sticky reply composer */}
      <footer style={{
        position: 'sticky',
        bottom: 0,
        background: T.toolbarBg,
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        borderTop: T.toolbarBorder,
        padding: '10px 12px calc(10px + env(safe-area-inset-bottom))',
        zIndex: 30,
      }}>
        <div style={{
          maxWidth: 720,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
        }}>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            placeholder={`Message ${parent?.name || 'parent'}…`}
            rows={1}
            style={{
              flex: 1,
              minHeight: 40,
              maxHeight: 140,
              padding: '10px 14px',
              borderRadius: 20,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: T.textPrimary,
              fontSize: 16,
              fontFamily: T.sans,
              outline: 'none',
              resize: 'none',
              lineHeight: 1.4,
            }}
          />
          <button
            onClick={handleDraftWithGuru}
            disabled={sending || drafting || !parent || !childAnchor}
            aria-label="Draft a reply with Guru"
            title={childAnchor ? 'Draft a reply with Guru' : 'Send a message first to anchor the thread to a child'}
            style={{
              flexShrink: 0,
              width: 40,
              height: 40,
              borderRadius: 20,
              border: '1px solid rgba(232,201,106,0.35)',
              background: 'rgba(232,201,106,0.12)',
              color: '#E8C96A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: childAnchor && !drafting && !sending ? 'pointer' : 'not-allowed',
              opacity: childAnchor ? 1 : 0.4,
            }}
          >
            <Sparkles size={16} strokeWidth={2} style={drafting ? { animation: 'pulse 1s ease-in-out infinite' } : undefined} />
          </button>
          <button
            onClick={() => setShowApptModal(true)}
            disabled={sending || !parent || !childAnchor}
            aria-label="Set appointment"
            title={childAnchor ? 'Set an appointment' : 'Send a message first to anchor the thread to a child'}
            style={{
              flexShrink: 0,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(232,201,106,0.10)',
              border: '1px solid rgba(232,201,106,0.32)',
              color: childAnchor ? '#E8C96A' : T.textMuted,
              cursor: childAnchor && !sending ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: childAnchor ? 1 : 0.45,
              transition: 'background 120ms ease',
            }}
          >
            <Calendar size={16} strokeWidth={2} />
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !draft.trim()}
            aria-label="Send"
            style={{
              flexShrink: 0,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: draft.trim() && !sending ? T.emerald : 'rgba(255,255,255,0.08)',
              border: 0,
              color: draft.trim() && !sending ? '#06281a' : T.textMuted,
              cursor: draft.trim() && !sending ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 120ms ease',
            }}
          >
            <Send size={16} strokeWidth={2} />
          </button>
        </div>
      </footer>

      {showApptModal && parent && childAnchor && (
        <QuickSetAppointmentModal
          parentId={parent.id}
          parentName={parent.name || 'this parent'}
          childId={childAnchor.id}
          childName={childAnchor.name || undefined}
          onClose={() => setShowApptModal(false)}
          onSent={() => {
            setShowApptModal(false);
            // Refresh messages so the new [[APPT:]] card appears.
            void load();
          }}
        />
      )}
    </div>
  );
}

function callBtnStyle(active: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 10,
    background: active ? 'rgba(52,211,153,0.30)' : 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.10)',
    color: active ? T.emerald : T.textPrimary,
    cursor: active ? 'wait' : 'pointer',
  };
}

function MessageBubble({
  message,
  isMe,
  showSenderName,
  locale,
}: {
  message: FlatMessage;
  isMe: boolean;
  showSenderName: boolean;
  locale: string;
}) {
  const time = new Date(message.sent_at).toLocaleTimeString(getIntlLocale(locale), {
    hour: 'numeric',
    minute: '2-digit',
  });

  // 🚨 Session 119 Task 3 — detect video-call invite messages and render
  // them as a rich card with embedded Join button. The card body comes
  // from parseVideoCallInvite which strips the [[VCALL:id]] marker.
  const invite = parseVideoCallInvite(message.body);
  // 🚨 Session 120 — detect [[APPT:]] appointment-invite messages.
  // Parsed BEFORE VCALL so APPT cards win when both markers somehow
  // overlap (they're disjoint by design but defense in depth).
  const apptInvite = parseAppointmentInvite(message.body);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isMe ? 'flex-end' : 'flex-start',
      marginTop: showSenderName ? 8 : 2,
    }}>
      {showSenderName && (
        <div style={{
          fontSize: 11,
          color: T.textMuted,
          marginBottom: 2,
          marginLeft: 10,
          fontFamily: T.sans,
        }}>
          {message.sender_name}
        </div>
      )}
      {apptInvite ? (
        <div style={{ maxWidth: '80%' }}>
          <AppointmentInviteCard
            appointmentId={apptInvite.appointmentId}
            initialStatus={apptInvite.status}
            caption={apptInvite.caption}
            viewer="staff"
          />
        </div>
      ) : invite ? (
        <Link
          href={`/montree/dashboard/calls/${invite.appointmentId}${invite.audioOnly ? '?audio=1' : ''}`}
          style={{
            maxWidth: '80%',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: '14px 16px',
            borderRadius: 18,
            background: 'rgba(232,201,106,0.10)',
            border: '1px solid rgba(232,201,106,0.42)',
            color: T.textPrimary,
            fontFamily: T.sans,
            textDecoration: 'none',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            fontWeight: 700,
            color: T.gold,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
          }}>
            {invite.audioOnly ? <Phone size={14} strokeWidth={2} /> : <Video size={14} strokeWidth={2} />}
            {invite.audioOnly ? 'Voice call' : 'Video call'}
          </div>
          {invite.caption && (
            <div style={{ fontSize: 15, lineHeight: 1.4, color: T.textPrimary }}>
              {invite.caption}
            </div>
          )}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 999,
            background: 'linear-gradient(135deg, #34d399 0%, #1D6B48 100%)',
            color: '#06281a',
            fontSize: 14,
            fontWeight: 700,
            alignSelf: 'flex-start',
            marginTop: 2,
          }}>
            <PlayCircle size={16} strokeWidth={2.25} />
            Join now
          </div>
        </Link>
      ) : (
      <div style={{
        maxWidth: '78%',
        padding: '8px 14px',
        borderRadius: 18,
        background: isMe ? T.bubbleSelfBg : T.bubbleOtherBg,
        border: isMe ? '1px solid rgba(52,211,153,0.45)' : '1px solid rgba(255,255,255,0.06)',
        color: isMe ? '#06281a' : T.textPrimary,
        fontSize: 15,
        lineHeight: 1.4,
        fontFamily: T.sans,
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
      }}>
        {message.body}
      </div>
      )}
      <div style={{
        marginTop: 2,
        fontSize: 10,
        color: T.textMuted,
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        paddingLeft: isMe ? 0 : 10,
        paddingRight: isMe ? 10 : 0,
      }}>
        <span>{time}</span>
        {message.child_name && (
          <span style={{
            padding: '0 6px',
            borderRadius: 8,
            background: T.goldSoft,
            color: T.gold,
            fontWeight: 600,
          }}>
            about {message.child_name}
          </span>
        )}
        {message.ai_drafted && (
          <span style={{
            padding: '0 6px',
            borderRadius: 8,
            background: T.goldSoft,
            color: T.gold,
            fontWeight: 600,
          }}>
            ✨ Astra drafted
          </span>
        )}
      </div>
    </div>
  );
}
