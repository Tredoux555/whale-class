// /montree/admin/page.tsx
//
// Principal home — "ask anything about your school" agent chat (May 3 2026,
// pivot from same-day search-first design).
//
// The principal types a question. The page streams back a Sonnet agent's
// reasoning + tool calls + final answer, all rendered live. Conversation
// thread persists in localStorage so refreshing the page doesn't lose state.
//
// What the agent can do (tools):
//   - find_children_by_name
//   - get_child_briefing
//   - answer_about_child
//   - list_classrooms_with_summary
//   - list_teachers_with_summary
//
// Every exchange is logged server-side to montree_principal_agent_log.
// Tredoux reads that log via super-admin to learn what to build next.
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Sparkles, RotateCcw, Wrench } from 'lucide-react';

const T = {
  emerald: '#34d399',
  emeraldDim: 'rgba(52,211,153,0.65)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  emeraldGlow: 'rgba(52,211,153,0.22)',
  gold: '#E8C96A',
  cardBg: 'rgba(8,20,12,0.55)',
  cardBgStrong: 'rgba(8,20,12,0.80)',
  cardBorder: '1px solid rgba(52,211,153,0.18)',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: '1px solid rgba(52,211,153,0.25)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.62)',
  textMuted: 'rgba(255,255,255,0.40)',
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
  // RFC 4122 v4-ish, doesn't need to be cryptographically perfect — server
  // re-validates and the conversation_id is just a grouping key.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'c-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function AdminAgentPage() {
  const router = useRouter();

  // Header data
  const [school, setSchool] = useState<School | null>(null);
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [plan, setPlan] = useState<PlanSummary | null>(null);
  const [headerLoading, setHeaderLoading] = useState(true);

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

    // Resolve or create the active conversation id
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

    // Header data
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
      .catch((err) => console.error('[admin agent] today fetch error', err))
      .finally(() => setHeaderLoading(false));
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

  const submit = useCallback(async () => {
    const q = question.trim();
    if (!q || submitting || !convId) return;
    setSubmitting(true);

    // Optimistic: append user turn + a pending assistant turn
    const userTurn: ConvTurn = { role: 'user', text: q };
    const assistantTurn: ConvTurn = {
      role: 'assistant',
      text: '',
      tools: [],
      pending: true,
    };
    setTurns((prev) => [...prev, userTurn, assistantTurn]);
    setQuestion('');

    // Build short history for the server (last 6 turns, role + text only)
    const history: { role: 'user' | 'assistant'; content: string }[] = [];
    const recent = [...turns, userTurn].slice(-7); // include the new user turn
    for (const t of recent) {
      if (t.text) history.push({ role: t.role, content: t.text });
    }
    // Drop the very last item (it's the current question — server adds it)
    history.pop();

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
                    'AI features require an active AI tier. Please contact support.',
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
                    "I couldn't process that. Please try again.",
                }
              : t
          )
        );
        return;
      }

      // Stream parser
      const reader = res.body?.getReader();
      if (!reader) {
        setTurns((prev) =>
          prev.map((t, i) =>
            i === prev.length - 1
              ? { ...t, pending: false, error: 'No response stream.' }
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

        // Parse out complete `data: ...\n\n` events
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
                error: 'Connection failed. Please try again.',
              }
            : t
        )
      );
    } finally {
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, submitting, convId, turns]);

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
          // Match the most recent in-flight tool with the same name
          for (let i = tools.length - 1; i >= 0; i--) {
            if (tools[i].name === String(evt.tool) && tools[i].success === null) {
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
          updated.thinking =
            (updated.thinking || '') + String(evt.text || '');
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
          updated.error = String(evt.error || 'Something went wrong.');
          break;
        }
      }

      return [...prev.slice(0, -1), updated];
    });
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const firstName = (principal?.name || '').split(' ')[0] || '';
  const greeting = firstName ? `Welcome back, ${firstName}.` : 'Welcome back.';

  return (
    <div style={{ fontFamily: T.sans, color: T.textPrimary }}>
      {/* Hero */}
      <div style={{ marginBottom: 18 }}>
        <h1
          style={{
            fontFamily: T.serif,
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 500,
            letterSpacing: -0.6,
            color: T.textPrimary,
            margin: 0,
            lineHeight: 1.1,
            opacity: headerLoading ? 0 : 1,
            transition: 'opacity 200ms ease',
          }}
        >
          {school?.name || ' '}
        </h1>
        <p
          style={{
            color: T.emeraldDim,
            fontSize: 14,
            marginTop: 10,
            letterSpacing: 0.2,
          }}
        >
          <span style={{ color: T.textPrimary }}>{greeting}</span>{' '}
          <span style={{ color: T.textSecondary }}>
            Ask me anything about your school — children, classrooms, teachers, the week so far.
          </span>
        </p>
      </div>

      {/* Viewer banner */}
      {plan?.is_teacher_led && (
        <div
          style={{
            background: 'rgba(232,201,106,0.08)',
            border: '1px solid rgba(232,201,106,0.22)',
            borderRadius: 14,
            padding: '12px 16px',
            marginBottom: 18,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: T.gold,
              marginTop: 7,
              flexShrink: 0,
            }}
          />
          <div
            style={{
              flex: 1,
              fontSize: 12.5,
              lineHeight: 1.55,
              color: 'rgba(255,255,255,0.78)',
            }}
          >
            <strong style={{ color: T.gold }}>You're a viewer.</strong> This is
            a teacher's classroom — you can ask about everything below for free.
            To add your own classrooms or invite your other teachers,{' '}
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
        </div>
      )}

      {/* Conversation thread */}
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          marginBottom: 18,
          maxHeight: '60vh',
          overflowY: 'auto',
          paddingRight: 4,
        }}
      >
        {turns.length === 0 ? (
          <Suggestions
            childName={undefined}
            onPick={(text) => {
              setQuestion(text);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
          />
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

      {/* Input */}
      <div
        style={{
          background: T.cardBgStrong,
          backdropFilter: 'blur(18px)',
          border: T.cardBorder,
          borderRadius: 18,
          padding: '16px 18px',
        }}
      >
        <textarea
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything…"
          rows={2}
          maxLength={1500}
          disabled={submitting}
          style={{
            width: '100%',
            padding: '10px 12px',
            background: T.inputBg,
            border: T.inputBorder,
            borderRadius: 12,
            color: T.textPrimary,
            fontFamily: T.sans,
            fontSize: 16,
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
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              background: T.emerald,
              color: '#0a1a0f',
              border: 'none',
              borderRadius: 999,
              fontFamily: T.sans,
              fontSize: 14,
              fontWeight: 600,
              cursor:
                submitting || !question.trim() ? 'not-allowed' : 'pointer',
              opacity: submitting || !question.trim() ? 0.4 : 1,
            }}
          >
            <Send size={14} strokeWidth={2} />
            {submitting ? 'Thinking…' : 'Ask'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────────

function UserBubble({ text }: { text: string }) {
  return (
    <div
      style={{
        alignSelf: 'flex-end',
        maxWidth: '85%',
        padding: '10px 14px',
        background: T.emeraldSoft,
        border: '1px solid rgba(52,211,153,0.20)',
        borderRadius: 14,
        color: T.textPrimary,
        fontFamily: T.sans,
        fontSize: 15,
        lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
      }}
    >
      {text}
    </div>
  );
}

function AssistantBubble({ turn }: { turn: ConvTurn }) {
  const hasOnlyTools = !turn.text && !turn.error && (turn.tools?.length || 0) > 0;
  return (
    <div style={{ alignSelf: 'flex-start', maxWidth: '95%', width: '100%' }}>
      {/* Tool chips */}
      {turn.tools && turn.tools.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: 8,
          }}
        >
          {turn.tools.map((t, i) => (
            <ToolChip key={i} tool={t} />
          ))}
        </div>
      )}

      {/* Thinking text (intermediate text between tool calls) */}
      {turn.thinking && (
        <div
          style={{
            color: T.textMuted,
            fontStyle: 'italic',
            fontSize: 13,
            marginBottom: 8,
            lineHeight: 1.55,
          }}
        >
          {turn.thinking}
        </div>
      )}

      {/* Final answer */}
      {turn.text && (
        <div
          style={{
            padding: '14px 16px',
            background: T.cardBg,
            backdropFilter: 'blur(18px)',
            border: T.cardBorder,
            borderRadius: 14,
            fontFamily: T.serif,
            fontSize: 16,
            lineHeight: 1.65,
            color: T.textPrimary,
            whiteSpace: 'pre-wrap',
          }}
        >
          {turn.text}
        </div>
      )}

      {/* Error */}
      {turn.error && (
        <div
          style={{
            padding: '12px 14px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.22)',
            borderRadius: 12,
            color: '#f87171',
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          {turn.error}
        </div>
      )}

      {/* Pending indicator (before any text arrives) */}
      {turn.pending && !turn.text && !turn.error && !hasOnlyTools && (
        <div
          style={{
            padding: '12px 14px',
            color: T.textMuted,
            fontSize: 13,
            fontStyle: 'italic',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Sparkles size={14} strokeWidth={1.75} color={T.emerald} />
          Thinking…
        </div>
      )}
    </div>
  );
}

function ToolChip({ tool }: { tool: ToolEvent }) {
  const inFlight = tool.success === null;
  const failed = tool.success === false;
  const color = failed ? '#f87171' : inFlight ? T.textMuted : T.emeraldDim;
  const bg = failed
    ? 'rgba(239,68,68,0.10)'
    : inFlight
    ? 'rgba(255,255,255,0.04)'
    : T.emeraldSoft;
  const border = failed
    ? '1px solid rgba(239,68,68,0.25)'
    : inFlight
    ? '1px solid rgba(255,255,255,0.10)'
    : '1px solid rgba(52,211,153,0.22)';
  const label = friendlyToolName(tool.name);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        background: bg,
        border,
        borderRadius: 999,
        fontSize: 11,
        color,
        fontFamily: T.sans,
        letterSpacing: 0.2,
      }}
    >
      <Wrench size={10} strokeWidth={1.75} />
      {label}
      {tool.summary && !inFlight && !failed && (
        <span
          style={{
            color: T.textMuted,
            marginLeft: 4,
            fontSize: 10.5,
          }}
        >
          · {tool.summary}
        </span>
      )}
    </div>
  );
}

function friendlyToolName(raw: string): string {
  const map: Record<string, string> = {
    find_children_by_name: 'Looking up children',
    get_child_briefing: 'Reading the child briefing',
    answer_about_child: 'Answering about the child',
    list_classrooms_with_summary: 'Checking classrooms',
    list_teachers_with_summary: 'Checking teachers',
  };
  return map[raw] || raw;
}

function Suggestions({
  childName,
  onPick,
}: {
  childName?: string;
  onPick: (text: string) => void;
}) {
  const suggestions = [
    "How is the school doing this week?",
    "Which classrooms have been quiet?",
    "Which teachers have been most active?",
    childName
      ? `How is ${childName} doing this week?`
      : 'How is [child name] doing this week?',
  ];
  return (
    <div
      style={{
        padding: '20px 4px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: T.emeraldDim,
          textTransform: 'uppercase',
          letterSpacing: 1.4,
          marginBottom: 8,
        }}
      >
        Try one of these
      </div>
      {suggestions.map((s, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(s)}
          style={{
            textAlign: 'left',
            padding: '12px 16px',
            background: T.cardBg,
            backdropFilter: 'blur(18px)',
            border: T.cardBorder,
            borderRadius: 12,
            color: T.textPrimary,
            fontFamily: T.sans,
            fontSize: 14,
            cursor: 'pointer',
            transition: 'background 120ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = T.cardBgStrong;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = T.cardBg;
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
