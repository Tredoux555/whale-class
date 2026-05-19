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
import { ArrowLeft, Send } from 'lucide-react';
import { useI18n, getIntlLocale } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';

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
  created_at: string;
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
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

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
      {/* Sticky header */}
      <header style={{
        position: 'sticky',
        top: 57,
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
    </div>
  );
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
  const time = new Date(message.created_at).toLocaleTimeString(getIntlLocale(locale), {
    hour: 'numeric',
    minute: '2-digit',
  });

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
            ✨ Tracy drafted
          </span>
        )}
      </div>
    </div>
  );
}
