// /montree/admin/page.tsx
//
// Tracy — the principal's chief-of-staff AI.
//
// The principal opens the page, sees a quiet greeting from Tracy, and asks.
// Tracy streams back a chief-of-staff answer that always ends with one
// concrete next action. That's the whole surface.
//
// What stays under the hood (load-bearing — do not remove):
//   - SSE stream consumption from /api/montree/admin/principal-agent
//   - localStorage conversation persistence per conversation_id
//   - history sanitisation (server re-sanitises but client also stays clean)
//   - Auth redirect on 401, viewer-mode banner for teacher-led schools
//
// What this rewrite changes (the visual port from the mockup):
//   - Strips the school-name hero + verbose subtitle (no system noise)
//   - Empty state is just Tracy's avatar + "Hi [name]." + "How can I help you?"
//   - Tool chips are hidden — Tracy's mechanism is invisible to the principal
//   - Thinking interludes are hidden — Tracy speaks once at the end
//   - Closing action line ("I'd …") is parsed out and rendered distinctly
//   - Tracy's avatar (gold T circle) sits beside her replies
//
// The tool/thinking event data is still received and stored on the turn —
// just not rendered. Future "show your work" toggle would be one render swap.
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Send, RotateCcw } from 'lucide-react';

const T = {
  emerald: '#34d399',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  gold: '#E8C96A',
  goldText: '#f0d68a',
  goldOnGold: '#2a1f08',
  goldDimDash: 'rgba(232,201,106,0.55)',
  cardBg: 'rgba(8,20,12,0.55)',
  cardBgStrong: 'rgba(8,20,12,0.80)',
  cardBorder: '1px solid rgba(52,211,153,0.18)',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: '1px solid rgba(52,211,153,0.25)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSoft: '#eaf1e6',
  textHelloBright: '#f5f8ef',
  textSecondary: 'rgba(234,241,230,0.55)',
  textMuted: 'rgba(255,255,255,0.40)',
  bubbleSoft: 'rgba(234,241,230,0.06)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface School {
  id: string;
  name: string;
}
interface Principal {
  id: string;
  name: string;
  email: string;
}
interface PlanSummary {
  plan_type: string;
  subscription_status: string;
  is_teacher_led: boolean;
}

interface ToolEvent {
  name: string;
  success: boolean | null; // null = in-flight
  summary?: string;
}

interface ConvTurn {
  role: 'user' | 'assistant';
  text: string;
  tools?: ToolEvent[];
  thinking?: string;
  pending?: boolean;
  error?: string;
  costUsd?: number;
}

const CONV_KEY_PREFIX = 'montree.admin.agentConv.';
const CONV_ID_KEY = 'montree.admin.agentConvId';
const MAX_PERSISTED_TURNS = 30;

function readConv(convId: string): ConvTurn[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CONV_KEY_PREFIX + convId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_PERSISTED_TURNS) : [];
  } catch {
    return [];
  }
}

function writeConv(convId: string, turns: ConvTurn[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      CONV_KEY_PREFIX + convId,
      JSON.stringify(turns.slice(-MAX_PERSISTED_TURNS))
    );
  } catch {
    // localStorage may be full / disabled — ignore
  }
}

function newConvId(): string {
  // RFC 4122 v4-ish — server treats it as a grouping key so we don't need
  // strong cryptographic uniqueness, just collision-resistant enough.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'c-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Tracy's responses end with a single closing action line that begins with
 * "I'd ..." (per her system prompt). Split that off so we can render it
 * distinctly from the body prose.
 *
 * Matches the LAST paragraph of the response if it starts with "I'd " or
 * "I'd " (smart-quote variant), case-insensitive. Returns the body without
 * the action line and the action line itself. If no match, the whole text
 * is body and action is null.
 */
function splitActionLine(text: string): { body: string; action: string | null } {
  if (!text || !text.trim()) return { body: text, action: null };
  const paragraphs = text.split(/\n\s*\n/);
  if (paragraphs.length === 0) return { body: text, action: null };
  const last = paragraphs[paragraphs.length - 1].trim();
  if (/^I['’]d\s/i.test(last)) {
    const body = paragraphs.slice(0, -1).join('\n\n').trim();
    return { body, action: last };
  }
  // Fallback: also try splitting on single newlines if the action came back
  // on its own single-newline line rather than after a blank line.
  const lines = text.split(/\n/);
  if (lines.length >= 2) {
    const lastLine = lines[lines.length - 1].trim();
    if (/^I['’]d\s/i.test(lastLine)) {
      const body = lines.slice(0, -1).join('\n').trim();
      return { body, action: lastLine };
    }
  }
  return { body: text, action: null };
}

// ── Subcomponents ────────────────────────────────────────────────────────

function TracyAvatar({ size = 36 }: { size?: number }) {
  // CSS-rendered placeholder. When the Canva-generated T monogram lands as
  // an image asset, swap this to an <img> with the same outer dimensions.
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: T.gold,
        color: T.goldOnGold,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: T.serif,
        fontSize: Math.round(size * 0.47),
        fontWeight: 500,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      T
    </div>
  );
}

function EmptyState({ firstName }: { firstName: string }) {
  return (
    <div style={{ padding: '24px 0 12px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 6,
        }}
      >
        <TracyAvatar size={36} />
        <p
          style={{
            fontFamily: T.serif,
            fontSize: 22,
            color: T.textHelloBright,
            margin: 0,
            letterSpacing: -0.005,
          }}
        >
          Hi{firstName ? ` ${firstName}` : ''}.
        </p>
      </div>
      <p
        style={{
          color: T.textSecondary,
          fontSize: 14,
          margin: 0,
          paddingLeft: 50,
          lineHeight: 1.55,
        }}
      >
        How can I help you?
      </p>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div
        style={{
          maxWidth: '75%',
          padding: '11px 16px',
          background: T.bubbleSoft,
          borderRadius: 14,
          color: T.textSoft,
          fontFamily: T.sans,
          fontSize: 14.5,
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
        }}
      >
        {text}
      </div>
    </div>
  );
}

function AssistantBubble({ turn }: { turn: ConvTurn }) {
  const { body, action } = splitActionLine(turn.text);
  const showThinkingDots = turn.pending && !turn.text && !turn.error;

  return (
    <div
      style={{ display: 'flex', alignItems: 'flex-start', gap: 14, width: '100%' }}
    >
      <TracyAvatar size={36} />
      <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
        {/* Pre-text pending indicator — soft ellipsis while she composes */}
        {showThinkingDots && (
          <div
            style={{
              color: T.textMuted,
              fontSize: 14,
              fontStyle: 'italic',
              letterSpacing: 1.5,
            }}
            aria-label="Tracy is thinking"
          >
            …
          </div>
        )}

        {/* Body prose (everything except the closing action line) */}
        {body && (
          <div
            style={{
              fontFamily: T.sans,
              fontSize: 14.5,
              lineHeight: 1.7,
              color: T.textSoft,
              whiteSpace: 'pre-wrap',
            }}
          >
            {body}
          </div>
        )}

        {/* Action line — distinct gold treatment, set apart by spacing */}
        {action && (
          <div
            style={{
              marginTop: 18,
              fontSize: 14.5,
              lineHeight: 1.55,
              color: T.goldText,
              fontFamily: T.sans,
            }}
          >
            <span style={{ color: T.goldDimDash, marginRight: 4 }}>—</span>
            {action}
          </div>
        )}

        {/* Error path — quiet but visible */}
        {turn.error && (
          <div
            style={{
              marginTop: body ? 12 : 0,
              padding: '10px 14px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.22)',
              borderRadius: 12,
              color: '#f87171',
              fontSize: 13.5,
              lineHeight: 1.55,
            }}
          >
            {turn.error}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────

export default function AdminAgentPage() {
  const router = useRouter();

  // Header data — kept for first-name + viewer-mode banner only
  const [school, setSchool] = useState<School | null>(null);
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [plan, setPlan] = useState<PlanSummary | null>(null);

  // Conversation state
  const [convId, setConvId] = useState<string>('');
  const [turns, setTurns] = useState<ConvTurn[]>([]);
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Initial load ────────────────────────────────────────────────────
  useEffect(() => {
    const principalData = localStorage.getItem('montree_principal');
    if (!principalData) {
      router.replace('/montree/login-select');
      return;
    }

    let id = '';
    try {
      id = localStorage.getItem(CONV_ID_KEY) || '';
    } catch {
      id = '';
    }
    if (!id) {
      id = newConvId();
      try {
        localStorage.setItem(CONV_ID_KEY, id);
      } catch {
        // ignore
      }
    }
    setConvId(id);
    setTurns(readConv(id));

    fetch('/api/montree/admin/today', { credentials: 'include' })
      .then((res) => {
        if (res.status === 401) {
          router.replace('/montree/login-select');
          return null;
        }
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setSchool(data.school);
        setPrincipal(data.principal);
        setPlan(data.plan || null);
      })
      .catch((err) => console.error('[admin agent] today fetch error', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist conversation on every change
  useEffect(() => {
    if (convId) writeConv(convId, turns);
  }, [convId, turns]);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns]);

  const startNewConversation = useCallback(() => {
    const id = newConvId();
    setConvId(id);
    setTurns([]);
    try {
      localStorage.setItem(CONV_ID_KEY, id);
      localStorage.removeItem(CONV_KEY_PREFIX + (convId || ''));
    } catch {
      // ignore
    }
    inputRef.current?.focus();
  }, [convId]);

  const handleEvent = useCallback((evt: Record<string, unknown>) => {
    setTurns((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.role !== 'assistant') return prev;

      const updated = { ...last };
      switch (evt.type) {
        case 'tool_call': {
          const tool: ToolEvent = {
            name: String(evt.tool || 'tool'),
            success: null,
          };
          updated.tools = [...(updated.tools || []), tool];
          break;
        }
        case 'tool_result': {
          const tools = [...(updated.tools || [])];
          for (let i = tools.length - 1; i >= 0; i--) {
            if (
              tools[i].name === String(evt.tool) &&
              tools[i].success === null
            ) {
              tools[i] = {
                ...tools[i],
                success: !!evt.success,
                summary:
                  typeof evt.summary === 'string' ? evt.summary : undefined,
              };
              break;
            }
          }
          updated.tools = tools;
          break;
        }
        case 'thinking': {
          updated.thinking = (updated.thinking || '') + String(evt.text || '');
          break;
        }
        case 'text': {
          updated.text = (updated.text || '') + String(evt.text || '');
          break;
        }
        case 'done': {
          updated.pending = false;
          updated.costUsd =
            typeof evt.cost_usd === 'number' ? evt.cost_usd : undefined;
          break;
        }
        case 'error': {
          updated.pending = false;
          updated.error = String(
            evt.error || 'Something stopped me — try again in a second.'
          );
          break;
        }
      }

      return [...prev.slice(0, -1), updated];
    });
  }, []);

  const submit = useCallback(async () => {
    const q = question.trim();
    if (!q || submitting || !convId) return;
    setSubmitting(true);

    const userTurn: ConvTurn = { role: 'user', text: q };
    const assistantTurn: ConvTurn = {
      role: 'assistant',
      text: '',
      tools: [],
      pending: true,
    };
    setTurns((prev) => [...prev, userTurn, assistantTurn]);
    setQuestion('');

    // Build short history for the server (last 6 turns, role + text only).
    // Server sanitises again on its end — this is just a courtesy clamp.
    const history: { role: 'user' | 'assistant'; content: string }[] = [];
    const recent = [...turns, userTurn].slice(-7);
    for (const t of recent) {
      if (t.text) history.push({ role: t.role, content: t.text });
    }
    history.pop(); // drop the just-added question — server adds it itself

    try {
      const res = await fetch('/api/montree/admin/principal-agent', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          conversation_id: convId,
          history,
        }),
      });

      if (res.status === 402) {
        const payload = await res.json().catch(() => ({}));
        setTurns((prev) =>
          prev.map((t, i) =>
            i === prev.length - 1
              ? {
                  ...t,
                  pending: false,
                  error:
                    payload?.error ||
                    'AI features need an active plan — please contact support.',
                }
              : t
          )
        );
        return;
      }
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setTurns((prev) =>
          prev.map((t, i) =>
            i === prev.length - 1
              ? {
                  ...t,
                  pending: false,
                  error:
                    payload?.error ||
                    "Something stopped me there — give me a second and try again.",
                }
              : t
          )
        );
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setTurns((prev) =>
          prev.map((t, i) =>
            i === prev.length - 1
              ? {
                  ...t,
                  pending: false,
                  error: 'No response stream — try again in a second.',
                }
              : t
          )
        );
        return;
      }
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nlIdx;
        // eslint-disable-next-line no-cond-assign
        while ((nlIdx = buffer.indexOf('\n\n')) !== -1) {
          const raw = buffer.slice(0, nlIdx);
          buffer = buffer.slice(nlIdx + 2);
          if (!raw.startsWith('data:')) continue;
          const json = raw.slice(5).trim();
          if (!json) continue;
          let evt: Record<string, unknown>;
          try {
            evt = JSON.parse(json);
          } catch {
            continue;
          }
          handleEvent(evt);
        }
      }
    } catch (err) {
      console.error('[admin agent] stream error', err);
      setTurns((prev) =>
        prev.map((t, i) =>
          i === prev.length - 1
            ? {
                ...t,
                pending: false,
                error: 'Connection failed — try again in a moment.',
              }
            : t
        )
      );
    } finally {
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, submitting, convId, turns, handleEvent]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const firstName = (principal?.name || '').split(' ')[0] || '';

  return (
    <div style={{ fontFamily: T.sans, color: T.textSoft }}>
      {/* Viewer-mode banner — kept because it's a real product fact the
          principal needs to know. Quieter visual treatment than before. */}
      {plan?.is_teacher_led && (
        <div
          style={{
            background: 'rgba(232,201,106,0.06)',
            border: '1px solid rgba(232,201,106,0.18)',
            borderRadius: 12,
            padding: '10px 14px',
            marginBottom: 18,
            fontSize: 12.5,
            lineHeight: 1.55,
            color: 'rgba(255,255,255,0.74)',
          }}
        >
          <strong style={{ color: T.gold }}>You're a viewer.</strong>{' '}
          {school?.name || 'This school'} is teacher-led — you can ask about
          anything below for free. To add your own classrooms or invite
          teachers,{' '}
          <a
            href="https://montree.xyz/pricing"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: T.gold, textDecoration: 'underline' }}
          >
            upgrade to a school plan
          </a>
          .
        </div>
      )}

      {/* Conversation thread — empty state OR a list of turns */}
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
          marginBottom: 22,
          maxHeight: '64vh',
          overflowY: 'auto',
          paddingRight: 4,
        }}
      >
        {turns.length === 0 ? (
          <EmptyState firstName={firstName} />
        ) : (
          turns.map((t, i) =>
            t.role === 'user' ? (
              <UserBubble key={i} text={t.text} />
            ) : (
              <AssistantBubble key={i} turn={t} />
            )
          )
        )}
      </div>

      {/* Input area — quiet, subordinate to the conversation */}
      <div
        style={{
          background: T.cardBgStrong,
          backdropFilter: 'blur(18px)',
          border: T.cardBorder,
          borderRadius: 18,
          padding: '14px 16px',
        }}
      >
        <textarea
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type here…"
          rows={2}
          maxLength={1500}
          disabled={submitting}
          style={{
            width: '100%',
            padding: '8px 10px',
            background: T.inputBg,
            border: T.inputBorder,
            borderRadius: 10,
            color: T.textSoft,
            fontFamily: T.sans,
            fontSize: 15,
            outline: 'none',
            resize: 'none',
            lineHeight: 1.55,
            opacity: submitting ? 0.7 : 1,
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 10,
          }}
        >
          <button
            type="button"
            onClick={startNewConversation}
            disabled={submitting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: 'none',
              color: T.textMuted,
              cursor: submitting ? 'not-allowed' : 'pointer',
              padding: 4,
              fontSize: 12,
              fontFamily: T.sans,
            }}
          >
            <RotateCcw size={12} strokeWidth={1.75} />
            New conversation
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !question.trim()}
            aria-label="Send message"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 38,
              height: 38,
              background: T.emerald,
              color: '#0a1a0f',
              border: 'none',
              borderRadius: '50%',
              cursor:
                submitting || !question.trim() ? 'not-allowed' : 'pointer',
              opacity: submitting || !question.trim() ? 0.4 : 1,
              transition: 'opacity 120ms ease',
            }}
          >
            <Send size={15} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
