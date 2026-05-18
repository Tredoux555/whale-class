// /montree/admin/communication/threads/[threadId]/page.tsx
// Session 97 — single thread view for the principal Communication hub.
//
// Principal-only surface. Shows full transcript + composer. Tracy tools:
//   - "Tracy, scan this thread" → POST /api/montree/admin/tracy/scan-thread
//   - "Tracy, draft a response" → POST /api/montree/admin/tracy/draft-response
// When the principal posts, the thread is school-scoped + observer-aware.
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Sparkles, Eye, Loader2 } from 'lucide-react';
import UpgradeCard, { extractUpgradeFromResponse } from '@/components/montree/UpgradeCard';
import { useThreadPolling } from '@/hooks/useThreadPolling';

const T = {
  emerald: '#34d399',
  emeraldDim: 'rgba(52,211,153,0.65)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  gold: '#E8C96A',
  goldSoft: 'rgba(232,201,106,0.18)',
  cardBg: 'rgba(8,20,12,0.55)',
  cardBgStrong: 'rgba(8,20,12,0.75)',
  cardBorder: '1px solid rgba(52,211,153,0.18)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.62)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  inputBg: 'rgba(0,0,0,0.30)',
};

interface Participant {
  role: string;
  id: string;
  name: string | null;
  email: string | null;
  is_observer: boolean;
  is_primary: boolean;
  can_reply: boolean;
}

interface Thread {
  id: string;
  thread_type: string;
  subject: string | null;
  classroom_id: string | null;
  child_id: string | null;
  created_at: string;
  last_message_at: string;
}

interface Message {
  id: string;
  sender_role: string;
  sender_id: string;
  sender_name: string;
  body: string;
  ai_drafted: boolean;
  ai_draft_source: string | null;
  approved_by_id: string | null;
  sent_at: string;
  // 🚨 Perf Tier 4.3 — optimistic send state. Set on locally-added
  // bubbles before the server confirms. Cleared when load() re-fetches.
  // Real messages from the server never carry these fields.
  optimistic?: boolean;
  sendFailed?: boolean;
}

export default function ThreadPage() {
  const params = useParams();
  const router = useRouter();
  const threadId = (params?.threadId as string) || '';
  const [thread, setThread] = useState<Thread | null>(null);
  const [classroom, setClassroom] = useState<{ name: string } | null>(null);
  const [child, setChild] = useState<{ name: string; photo_url?: string } | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [aiDrafted, setAiDrafted] = useState(false);
  const [tracyBriefing, setTracyBriefing] = useState<string | null>(null);
  const [tracyLoading, setTracyLoading] = useState<'scan' | 'draft' | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 402 + requires_upgrade → render UpgradeCard instead of red error.
  const [upgrade, setUpgrade] = useState<{ feature: string; upgradeUrl: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const [tRes, mRes] = await Promise.all([
        fetch(`/api/montree/messages/threads/${threadId}`, { credentials: 'include' }),
        fetch(`/api/montree/messages/threads/${threadId}/messages`, { credentials: 'include' }),
      ]);
      if (!tRes.ok) {
        if (tRes.status === 404) {
          router.replace('/montree/admin/communication');
          return;
        }
        throw new Error('Failed to load thread');
      }
      const tData = await tRes.json();
      setThread(tData.thread);
      setClassroom(tData.classroom);
      setChild(tData.child);
      setParticipants(tData.participants || []);

      const mData = await mRes.json();
      setMessages(mData.messages || []);

      // Mark as read.
      void fetch(`/api/montree/messages/threads/${threadId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read' }),
      });
    } catch (err) {
      console.error('Load thread:', err);
    } finally {
      setLoading(false);
    }
  }, [threadId, router]);

  useEffect(() => {
    if (threadId) void load();
  }, [threadId, load]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Live updates — poll the messages endpoint every 5s while visible.
  // Pauses during send so optimistic bubbles aren't trampled.
  useThreadPolling<Message>({
    endpoint: `/api/montree/messages/threads/${threadId}/messages`,
    setMessages,
    enabled: !loading && !!threadId,
    pause: sending,
  });

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    setError(null);

    // 🚨 Perf Tier 4.3 (PERF_HEALTH_CHECK.md) — optimistic send.
    // Insert the message into the thread immediately so the bubble appears
    // instantly. Capture the values now (state may reset before the request
    // resolves). The temp id starts with `optimistic-` so the load() re-fetch
    // can dedupe against the server's real row by checking sent_at + body.
    const draftBody = draft.trim();
    const aiDraftedNow = aiDrafted;
    const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage: Message = {
      id: tempId,
      sender_role: 'principal',  // best-guess; server response replaces this
      sender_id: 'me',
      sender_name: 'You',
      body: draftBody,
      ai_drafted: aiDraftedNow,
      ai_draft_source: aiDraftedNow ? 'tracy.draft_parent_response' : null,
      approved_by_id: null,
      sent_at: new Date().toISOString(),
      optimistic: true,
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    // Clear the input right away — feels instant.
    setDraft('');
    setAiDrafted(false);

    try {
      const res = await fetch(`/api/montree/messages/threads/${threadId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: draftBody,
          ai_drafted: aiDraftedNow,
          ai_draft_source: aiDraftedNow ? 'tracy.draft_parent_response' : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Send failed');
      }
      // Success — replace JUST the optimistic temp with the canonical server
      // row using a functional update. Previously this called `void load()`
      // which setMessages(replace entire array) and could wipe a SECOND
      // optimistic-message-in-flight (Session 107 audit M3 fix). Pattern
      // canonical at parent/teacher/agent thread pages.
      const data = await res.json();
      if (data?.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? data.message : m))
        );
      } else {
        // Defensive: if server response shape changes, fall back to refetch.
        void load();
      }
    } catch (err: unknown) {
      // Failure — keep the bubble visible but mark it as failed so the user
      // can see what went wrong + retry. Restore the draft so they can edit.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, sendFailed: true, optimistic: false } : m
        )
      );
      setDraft(draftBody);
      setAiDrafted(aiDraftedNow);
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  }

  async function tracyScan() {
    setTracyLoading('scan');
    setError(null);
    setUpgrade(null);
    try {
      const res = await fetch('/api/montree/admin/tracy/scan-thread', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: threadId }),
      });
      if (res.status === 402) {
        const u = await extractUpgradeFromResponse(res);
        if (u) { setUpgrade({ feature: u.feature, upgradeUrl: u.upgradeUrl }); return; }
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Tracy could not scan');
      }
      const data = await res.json();
      setTracyBriefing(data.summary);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Tracy scan failed');
    } finally {
      setTracyLoading(null);
    }
  }

  async function tracyDraft() {
    setTracyLoading('draft');
    setError(null);
    setUpgrade(null);
    try {
      const res = await fetch('/api/montree/admin/tracy/draft-response', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: threadId }),
      });
      if (res.status === 402) {
        const u = await extractUpgradeFromResponse(res);
        if (u) { setUpgrade({ feature: u.feature, upgradeUrl: u.upgradeUrl }); return; }
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Tracy could not draft');
      }
      const data = await res.json();
      setDraft(data.draft);
      setAiDrafted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Tracy draft failed');
    } finally {
      setTracyLoading(null);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: T.textSecondary, fontFamily: T.sans }}>
        Loading thread…
      </div>
    );
  }

  if (!thread) return null;

  const isParentThread = thread.thread_type === 'parent_teacher' || thread.thread_type === 'parent_principal';

  return (
    <div style={{ fontFamily: T.sans, color: T.textPrimary, maxWidth: 880 }}>
      {/* Back link */}
      <button
        onClick={() => router.push('/montree/admin/communication')}
        style={{
          background: 'transparent',
          border: 'none',
          color: T.emeraldDim,
          fontFamily: T.sans,
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: 0,
          marginBottom: 16,
        }}
      >
        <ArrowLeft size={14} strokeWidth={1.75} />
        Communication
      </button>

      {/* Header */}
      <header
        style={{
          background: T.cardBg,
          border: T.cardBorder,
          borderRadius: 16,
          padding: 22,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: T.emerald,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {threadTypeLabel(thread.thread_type)}
          </span>
          {child && (
            <span style={{ fontSize: 12, color: T.textMuted }}>
              · about <span style={{ color: T.textPrimary }}>{child.name}</span>
            </span>
          )}
          {classroom && (
            <span style={{ fontSize: 12, color: T.textMuted }}>
              · {classroom.name}
            </span>
          )}
        </div>
        <h1 style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 500, margin: 0, letterSpacing: -0.3 }}>
          {thread.subject || '(no subject)'}
        </h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {participants.map((p) => (
            <span
              key={`${p.role}:${p.id}`}
              style={{
                fontSize: 11,
                padding: '4px 10px',
                background: p.is_observer ? 'rgba(255,255,255,0.06)' : T.emeraldSoft,
                color: p.is_observer ? T.textMuted : T.emerald,
                borderRadius: 999,
                border: '1px solid rgba(52,211,153,0.20)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {p.is_observer && <Eye size={10} strokeWidth={1.75} />}
              {p.name || p.email || 'Unknown'}
              <span style={{ opacity: 0.6, textTransform: 'uppercase', fontSize: 9, letterSpacing: 0.5 }}>
                {p.role}
              </span>
            </span>
          ))}
        </div>
      </header>

      {/* Tracy actions (only for parent threads) */}
      {isParentThread && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(232,201,106,0.10), rgba(232,201,106,0.04))',
            border: '1px solid rgba(232,201,106,0.25)',
            borderRadius: 14,
            padding: 14,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <Sparkles size={16} strokeWidth={1.75} color={T.gold} />
          <span style={{ fontSize: 13, color: T.textSecondary, flex: 1 }}>
            Ask Tracy to scan this thread or draft your reply.
          </span>
          <button
            onClick={() => void tracyScan()}
            disabled={tracyLoading !== null}
            style={{
              padding: '8px 14px',
              background: 'transparent',
              border: '1px solid rgba(232,201,106,0.35)',
              borderRadius: 999,
              color: T.gold,
              fontSize: 12,
              fontWeight: 500,
              cursor: tracyLoading ? 'not-allowed' : 'pointer',
              opacity: tracyLoading ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {tracyLoading === 'scan' ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} strokeWidth={1.75} />}
            Scan thread
          </button>
          <button
            onClick={() => void tracyDraft()}
            disabled={tracyLoading !== null}
            style={{
              padding: '8px 14px',
              background: T.gold,
              border: 'none',
              borderRadius: 999,
              color: '#0a1a0f',
              fontSize: 12,
              fontWeight: 600,
              cursor: tracyLoading ? 'not-allowed' : 'pointer',
              opacity: tracyLoading ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {tracyLoading === 'draft' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} strokeWidth={1.75} />}
            Draft my reply
          </button>
        </div>
      )}

      {/* Tracy briefing */}
      {tracyBriefing && (
        <div
          style={{
            background: T.goldSoft,
            border: '1px solid rgba(232,201,106,0.30)',
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
            color: T.textPrimary,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: T.gold,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            Tracy&apos;s read
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{tracyBriefing}</div>
        </div>
      )}

      {/* Message list */}
      <div
        style={{
          background: T.cardBg,
          border: T.cardBorder,
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          maxHeight: 'min(60vh, 600px)',
          overflowY: 'auto',
        }}
      >
        {messages.length === 0 ? (
          <p style={{ color: T.textMuted, fontSize: 13, textAlign: 'center', padding: 30 }}>
            No messages yet. Be the first to write.
          </p>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div
        style={{
          background: T.cardBgStrong,
          border: T.cardBorder,
          borderRadius: 16,
          padding: 16,
        }}
      >
        {aiDrafted && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 8,
              fontSize: 11,
              color: T.gold,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            <Sparkles size={12} strokeWidth={1.75} />
            Tracy drafted this — review before sending
          </div>
        )}
        <textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            // If user edits the AI draft, clear the AI flag — they own it.
            if (aiDrafted) setAiDrafted(false);
          }}
          placeholder="Write your reply…"
          rows={5}
          style={{
            width: '100%',
            padding: '12px 14px',
            background: T.inputBg,
            border: aiDrafted ? '1px solid rgba(232,201,106,0.45)' : T.cardBorder,
            borderRadius: 10,
            color: T.textPrimary,
            fontFamily: T.sans,
            fontSize: 14,
            outline: 'none',
            resize: 'vertical',
            marginBottom: 12,
          }}
        />
        {upgrade && (
          <div style={{ marginBottom: 8 }}>
            <UpgradeCard feature={upgrade.feature} upgradeUrl={upgrade.upgradeUrl} />
          </div>
        )}
        {error && !upgrade && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 8 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={() => void send()}
            disabled={sending || !draft.trim()}
            style={{
              padding: '10px 20px',
              background: T.emerald,
              color: '#0a1a0f',
              border: 'none',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              cursor: sending || !draft.trim() ? 'not-allowed' : 'pointer',
              opacity: sending || !draft.trim() ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Send size={14} strokeWidth={1.75} />
            {sending ? 'Sending…' : aiDrafted ? 'Send Tracy\'s draft' : 'Send'}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .animate-spin {
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  // 🚨 Perf Tier 4.3 — optimistic / failed visual state.
  const isOptimistic = !!message.optimistic;
  const isFailed = !!message.sendFailed;
  return (
    <div style={{ marginBottom: 14, opacity: isOptimistic ? 0.65 : 1, transition: 'opacity 0.2s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.textPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
          {message.sender_name}
          <span style={{ fontSize: 10, color: T.emeraldDim, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {message.sender_role}
          </span>
          {message.ai_drafted && (
            <span
              style={{
                fontSize: 10,
                color: T.gold,
                background: T.goldSoft,
                padding: '2px 6px',
                borderRadius: 999,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <Sparkles size={9} strokeWidth={1.75} />
              Tracy drafted
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: isFailed ? '#fca5a5' : T.textMuted }}>
          {isOptimistic ? 'Sending…' : isFailed ? 'Failed — tap retry above' : formatDateTime(message.sent_at)}
        </span>
      </div>
      <div
        style={{
          background: isFailed ? 'rgba(239,68,68,0.08)' : T.cardBgStrong,
          border: isFailed ? '1px solid rgba(239,68,68,0.30)' : T.cardBorder,
          borderRadius: 12,
          padding: '10px 14px',
          fontSize: 14,
          lineHeight: 1.5,
          color: T.textPrimary,
          whiteSpace: 'pre-wrap',
        }}
      >
        {message.body}
      </div>
    </div>
  );
}

function threadTypeLabel(t: string): string {
  switch (t) {
    case 'parent_teacher': return 'Parent · Teacher';
    case 'parent_principal': return 'Parent · Principal';
    case 'internal': return 'Internal';
    case 'broadcast': return 'Broadcast';
    case 'group': return 'Group';
    default: return t;
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleString();
}
