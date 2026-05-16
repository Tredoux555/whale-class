// components/montree/agent/MiraFloat.tsx
//
// Mira as a floating growth partner that lives in the agent dashboard
// shell. Visible on every /montree/agent/* page EXCEPT /montree/agent/mira
// (the dedicated chat page IS Mira there — the float would just duplicate
// the surface).
//
// Mirror of TracyFloat (components/montree/admin/TracyFloat.tsx) with these
// adaptations:
//   - Identity resolved from /api/montree/agent/me (NOT localStorage 'montree_school')
//   - Storage keys scoped by agent_id (NOT school_id)
//   - Hits /api/montree/agent/mira (NOT /api/montree/admin/principal-agent)
//   - hasMet flag flips ONLY on successful 'done' SSE event (audit fix from
//     Session 97 commit aa23920b — same rule as Tracy)
//
// BEHAVIOUR:
//   - First mount of the browser session → fire [GREETING_FIRST] (or
//     [GREETING] if Mira has met this agent before), stream her situational
//     reading back, auto-open the panel.
//   - Subsequent mounts (page navigation in the same session) → respect
//     persisted open/closed state. Do NOT re-greet.
//   - Conversation state SHARED with /montree/agent/mira full chat page
//     (same convId, same localStorage keys via miraKeys).
//   - Question-form action lines ending in "?" surface inline Yes/No buttons.
//
// PRIVACY: All Mira localStorage keys are scoped by agent_id. Logging into
// different agent accounts on the same browser never bleeds conversations.
//
// NO TIER GATE: agents are paid partners, Mira is platform infrastructure
// for them. The /api/montree/agent/mira route enforces a per-day rate limit
// internally — the float just surfaces 4xx/5xx errors as friendly inline notes.

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Send, Minus } from 'lucide-react';
import MiraAvatar from './MiraAvatar';
import { miraKeys } from '@/lib/montree/mira/storage-keys';
// Canonical action-line parser — Session 113 V2 audit MED-5.
import { splitActionLine } from '@/lib/montree/ai/split-action-line';

const MIRA_FLOAT_OPEN_KEY = 'montree.miraFloat.open';

// Dark forest tokens — same palette as TracyFloat / agent dashboard.
const T = {
  emerald: '#34d399',
  gold: '#E8C96A',
  goldText: '#f0d68a',
  goldDimDash: 'rgba(232,201,106,0.55)',
  cardBg: 'rgba(8,20,12,0.94)',
  cardBorder: '1px solid rgba(232,201,106,0.30)',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: '1px solid rgba(52,211,153,0.25)',
  textSoft: '#eaf1e6',
  textHelloBright: '#f5f8ef',
  textSecondary: 'rgba(234,241,230,0.55)',
  textMuted: 'rgba(255,255,255,0.40)',
  bubbleSoft: 'rgba(234,241,230,0.06)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface ToolEvent {
  name: string;
  success: boolean | null;
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

const MAX_PERSISTED_TURNS = 30;

const GREETING_PROMPT = '[GREETING]';
const GREETING_FIRST_PROMPT = '[GREETING_FIRST]';

function isHiddenKickoff(text: string): boolean {
  return text === GREETING_PROMPT || text === GREETING_FIRST_PROMPT;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function readConv(agentId: string, convId: string): ConvTurn[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(miraKeys.agentConv(agentId, convId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_PERSISTED_TURNS) : [];
  } catch {
    return [];
  }
}

function writeConv(agentId: string, convId: string, turns: ConvTurn[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      miraKeys.agentConv(agentId, convId),
      JSON.stringify(turns.slice(-MAX_PERSISTED_TURNS))
    );
  } catch {
    /* localStorage may be full / disabled — ignore */
  }
}

function newConvId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'c-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// splitActionLine is imported from the canonical helper at the top of this file.
// Session 113 V2 audit MED-5 — drift across 4 copies eliminated.

function isQuestionOffer(action: string | null): boolean {
  if (!action) return false;
  const trimmed = action.trim();
  if (!trimmed.endsWith('?')) return false;
  return /(want me to|would you like me to|shall i|should i|可以让我|让我|要不要我|¿quieres que)/i.test(
    trimmed
  );
}

interface AgentLite {
  id: string;
  name: string | null;
  email: string | null;
}

// ── Component ────────────────────────────────────────────────────────────

export default function MiraFloat() {
  const pathname = usePathname() || '';

  const [agent, setAgent] = useState<AgentLite | null>(null);
  const [convId, setConvId] = useState<string>('');
  const [turns, setTurns] = useState<ConvTurn[]>([]);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [mounted, setMounted] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialisedRef = useRef(false);

  // ── Load agent identity ─────────────────────────────────────────────
  useEffect(() => {
    if (initialisedRef.current) return;
    initialisedRef.current = true;
    setMounted(true);

    let cancelled = false;
    fetch('/api/montree/agent/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { agent?: AgentLite } | null) => {
        if (cancelled || !data?.agent) return;
        const a = data.agent;
        setAgent(a);

        // Resolve convId — scoped to this agent
        let id = '';
        try {
          id = localStorage.getItem(miraKeys.agentConvId(a.id)) || '';
        } catch {
          id = '';
        }
        if (!id) {
          id = newConvId();
          try {
            localStorage.setItem(miraKeys.agentConvId(a.id), id);
          } catch {
            /* ignore */
          }
        }
        setConvId(id);
        setTurns(readConv(a.id, id));

        // Session 113 V2: starts CLOSED on every page load.
        // Previously this restored the `open` flag from localStorage so
        // navigating between agent pages kept Mira open. User directive
        // is now "leave it there" — meaning Mira should NEVER pop open
        // by itself, only when the agent clicks the trigger. Persistence
        // within a single open session is still desired (don't close on
        // every navigation IF the agent opened her), so the persist-on-
        // change effect below stays as-is. But we force CLOSED at mount.
        setOpen(false);

        // Session 113 V2: auto-open + auto-greet on first session DISABLED
        // per user directive "Let the agent explore the dashboard by themselves."
        // Mira trigger stays visible but starts CLOSED. The greeting fires
        // the first time the agent OPENS the panel manually — see the
        // setOpen handler below. This means a new agent sees a clean
        // dashboard, with Mira waiting in the corner if they want her.
      })
      .catch(() => {
        /* not signed in as agent — float stays inert */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist conversation on every change
  useEffect(() => {
    if (agent && convId) writeConv(agent.id, convId, turns);
  }, [agent, convId, turns]);

  // Persist open/closed state
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(MIRA_FLOAT_OPEN_KEY, open ? 'true' : 'false');
    } catch {
      /* ignore */
    }
    if (open) setHasUnread(false);
  }, [open, mounted]);

  // Auto-scroll to bottom on new content (only when expanded)
  useEffect(() => {
    if (!open) return;
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, open]);

  // ── Streaming submit ─────────────────────────────────────────────────
  const handleEvent = useCallback((evt: Record<string, unknown>) => {
    setTurns((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.role !== 'assistant') return prev;
      const updated: ConvTurn = { ...last };
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
          updated.error = String(evt.error || 'Something went wrong.');
          break;
        }
      }
      return [...prev.slice(0, -1), updated];
    });
  }, []);

  const sendMessage = useCallback(
    async (
      questionText: string,
      currentConvId: string,
      currentAgent: AgentLite,
      addUserTurn = true
    ) => {
      if (!questionText.trim() || !currentConvId) return;

      const userTurn: ConvTurn = { role: 'user', text: questionText };
      const assistantTurn: ConvTurn = {
        role: 'assistant',
        text: '',
        tools: [],
        pending: true,
      };
      setTurns((prev) => {
        if (addUserTurn) return [...prev, userTurn, assistantTurn];
        return [...prev, assistantTurn];
      });

      // Build short history (last 6 turns)
      const history: { role: 'user' | 'assistant'; content: string }[] = [];
      const turnsForHistory = addUserTurn
        ? [...turns, userTurn].slice(-7)
        : [...turns].slice(-6);
      for (const turn of turnsForHistory) {
        if (turn.text) history.push({ role: turn.role, content: turn.text });
      }
      if (
        addUserTurn &&
        history.length > 0 &&
        history[history.length - 1].content === questionText
      ) {
        history.pop();
      }

      let succeeded = false;

      try {
        const res = await fetch('/api/montree/agent/mira', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: questionText,
            conversation_id: currentConvId,
            history,
          }),
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          const msg = payload?.error || 'Something went wrong.';
          setTurns((prev) =>
            prev.map((tt, i) =>
              i === prev.length - 1 ? { ...tt, pending: false, error: msg } : tt
            )
          );
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setTurns((prev) =>
            prev.map((tt, i) =>
              i === prev.length - 1 ? { ...tt, pending: false, error: 'No stream.' } : tt
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
          let nlIdx = buffer.indexOf('\n\n');
          while (nlIdx !== -1) {
            const raw = buffer.slice(0, nlIdx);
            buffer = buffer.slice(nlIdx + 2);
            if (!raw.startsWith('data:')) continue;
            const json = raw.slice(5).trim();
            if (!json) continue;
            try {
              const evt = JSON.parse(json);
              handleEvent(evt);
              if (evt.type === 'done') succeeded = true;
              if (evt.type === 'error') succeeded = false;
              if (
                !open &&
                (evt.type === 'text' || evt.type === 'done' || evt.type === 'error')
              ) {
                setHasUnread(true);
              }
            } catch {
              /* ignore malformed event */
            }
            nlIdx = buffer.indexOf('\n\n');
          }
        }

        // Flip hasMet=true ONLY when the GREETING_FIRST kickoff lands successfully.
        if (succeeded && questionText === GREETING_FIRST_PROMPT) {
          try {
            localStorage.setItem(miraKeys.hasMet(currentAgent.id), 'true');
          } catch {
            /* ignore */
          }
        }
      } catch (err) {
        console.error('[MiraFloat] stream error', err);
        setTurns((prev) =>
          prev.map((tt, i) =>
            i === prev.length - 1
              ? { ...tt, pending: false, error: 'Could not reach Mira.' }
              : tt
          )
        );
      }
    },
    [turns, handleEvent, open]
  );

  const fireGreeting = useCallback(
    async (currentConvId: string, kickoff: string, currentAgent: AgentLite) => {
      setSubmitting(true);
      try {
        await sendMessage(kickoff, currentConvId, currentAgent, true);
      } finally {
        setSubmitting(false);
      }
    },
    [sendMessage]
  );

  const submit = useCallback(
    async (textOverride?: string) => {
      const q = (textOverride ?? question).trim();
      if (!q || submitting || !convId || !agent) return;
      setQuestion('');
      setSubmitting(true);
      try {
        await sendMessage(q, convId, agent, true);
      } finally {
        setSubmitting(false);
      }
    },
    [question, submitting, convId, agent, sendMessage]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  // Hide on the dedicated chat page — must come AFTER all hooks.
  if (pathname === '/montree/agent/mira') return null;
  if (!mounted || !agent) return null;

  // Filter out hidden kickoff turns
  const visibleTurns = turns.filter(
    (turn) => !(turn.role === 'user' && isHiddenKickoff(turn.text))
  );
  const lastAssistantIdx = (() => {
    for (let i = visibleTurns.length - 1; i >= 0; i--) {
      if (visibleTurns[i].role === 'assistant') return i;
    }
    return -1;
  })();

  // Open + fire greeting on FIRST manual open (only if Mira has never
  // greeted this agent in this session AND we have agent identity).
  // Auto-open-on-mount was disabled per user directive — this is the
  // recovery so the agent still gets a friendly first hello when they
  // actually click the trigger.
  const handleManualOpen = () => {
    setOpen(true);
    if (!agent || !convId) return;
    let alreadyGreeted = false;
    try {
      alreadyGreeted = sessionStorage.getItem(miraKeys.greetedSession(agent.id)) === 'true';
    } catch {
      /* sessionStorage disabled — treat as not greeted */
    }
    if (alreadyGreeted) return;
    try {
      sessionStorage.setItem(miraKeys.greetedSession(agent.id), 'true');
    } catch {
      /* ignore */
    }
    let hasMet = false;
    try {
      hasMet = localStorage.getItem(miraKeys.hasMet(agent.id)) === 'true';
    } catch {
      /* ignore */
    }
    const kickoff = hasMet ? GREETING_PROMPT : GREETING_FIRST_PROMPT;
    void fireGreeting(convId, kickoff, agent);
  };

  // ── Collapsed state — just the avatar button ─────────────────────────
  if (!open) {
    return (
      <button
        onClick={handleManualOpen}
        aria-label="Open Mira"
        style={{
          position: 'fixed',
          zIndex: 35,
          width: 56,
          height: 56,
          padding: 0,
          background: 'rgba(8,20,12,0.85)',
          border: '1px solid rgba(232,201,106,0.45)',
          borderRadius: '50%',
          cursor: 'pointer',
          boxShadow:
            '0 6px 22px rgba(0,0,0,0.45), 0 0 0 4px rgba(232,201,106,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        }}
        className="mira-float-trigger"
      >
        <MiraAvatar size={42} />
        {hasUnread && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: T.gold,
              border: '2px solid #07120c',
              boxShadow: '0 0 0 2px rgba(232,201,106,0.35)',
            }}
          />
        )}
        {/*
          MOBILE: float sits BOTTOM-RIGHT so it doesn't collide with the
            AgentNav hamburger (which is also top-right). 16px from the bottom
            + a safe-area-inset bump for notched devices.
          DESKTOP (md+): float sits TOP-RIGHT 16px — matches the design language
            of TracyFloat in the principal dashboard. No hamburger conflict
            because desktop renders the full nav inline.
        */}
        <style jsx>{`
          .mira-float-trigger {
            bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
            right: 16px;
            top: auto;
          }
          .mira-float-trigger:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 26px rgba(0, 0, 0, 0.5),
              0 0 0 4px rgba(232, 201, 106, 0.12);
          }
          @media (min-width: 768px) {
            .mira-float-trigger {
              top: 16px;
              right: 16px;
              bottom: auto;
            }
          }
        `}</style>
      </button>
    );
  }

  // ── Expanded state — chat panel ──────────────────────────────────────
  return (
    <div
      role="dialog"
      aria-label="Mira"
      className="mira-float-panel"
      style={{
        position: 'fixed',
        zIndex: 35,
        width: 'min(380px, calc(100vw - 32px))',
        maxHeight: 'calc(100dvh - 32px)',
        background: T.cardBg,
        backdropFilter: 'blur(22px)',
        border: T.cardBorder,
        borderRadius: 18,
        boxShadow: '0 18px 56px rgba(0, 0, 0, 0.55)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: T.sans,
        color: T.textSoft,
      }}
    >
      {/* MOBILE: opens from bottom-right (matches trigger position).
          DESKTOP (md+): opens from top-right. Same responsive rule as trigger. */}
      <style jsx>{`
        .mira-float-panel {
          bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
          right: 16px;
          top: auto;
        }
        @media (min-width: 768px) {
          .mira-float-panel {
            top: 16px;
            right: 16px;
            bottom: auto;
          }
        }
      `}</style>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 14px',
          borderBottom: '1px solid rgba(232,201,106,0.18)',
          background: 'rgba(0,0,0,0.18)',
        }}
      >
        <MiraAvatar size={32} />
        <div
          style={{
            flex: 1,
            fontFamily: T.serif,
            fontSize: 17,
            color: T.textHelloBright,
            letterSpacing: -0.2,
          }}
        >
          Mira
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close Mira"
          style={{
            background: 'transparent',
            border: 'none',
            color: T.textMuted,
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Minus size={18} strokeWidth={1.75} />
        </button>
      </div>

      {/* Conversation thread */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          minHeight: 280,
          maxHeight: 'calc(100vh - 240px)',
        }}
      >
        {visibleTurns.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: T.textSecondary,
              fontSize: 14,
            }}
          >
            <MiraAvatar size={28} />
            <span>Mira here. Ask me anything about your pipeline.</span>
          </div>
        ) : (
          visibleTurns.map((turn, i) => {
            const isLastAssistant = i === lastAssistantIdx;
            return turn.role === 'user' ? (
              <UserBubble key={i} text={turn.text} />
            ) : (
              <AssistantBubble
                key={i}
                turn={turn}
                isLast={isLastAssistant}
                disabled={submitting}
                onAccept={() => {
                  submit('Yes, please.');
                }}
                onDecline={() => {
                  submit('Not now.');
                }}
              />
            );
          })
        )}
      </div>

      {/* Input */}
      <div
        style={{
          padding: '10px 12px 12px 12px',
          borderTop: '1px solid rgba(52,211,153,0.10)',
          background: 'rgba(0,0,0,0.18)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 8,
            background: T.inputBg,
            border: T.inputBorder,
            borderRadius: 12,
            padding: '6px 8px 6px 12px',
          }}
        >
          <textarea
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Mira…"
            rows={1}
            maxLength={1500}
            disabled={submitting}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: T.textSoft,
              fontFamily: T.sans,
              // 16px prevents iOS Safari zoom-in on focus. The float is small
              // so a zoom-in would be especially disruptive.
              fontSize: 16,
              lineHeight: 1.5,
              resize: 'none',
              padding: '6px 0',
              maxHeight: 120,
            }}
          />
          <button
            type="button"
            onClick={() => submit()}
            disabled={!question.trim() || submitting}
            aria-label="Send"
            style={{
              background: question.trim() ? T.gold : 'rgba(232,201,106,0.18)',
              color: question.trim() ? '#07120c' : T.textMuted,
              border: 'none',
              borderRadius: 10,
              width: 34,
              height: 34,
              cursor: question.trim() && !submitting ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.15s ease',
            }}
          >
            <Send size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function UserBubble({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div
        style={{
          maxWidth: '82%',
          padding: '9px 13px',
          background: T.bubbleSoft,
          borderRadius: 12,
          color: T.textSoft,
          fontFamily: T.sans,
          fontSize: 14,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {text}
      </div>
    </div>
  );
}

function AssistantBubble({
  turn,
  isLast,
  disabled,
  onAccept,
  onDecline,
}: {
  turn: ConvTurn;
  isLast: boolean;
  disabled: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { body, action } = splitActionLine(turn.text);
  const showThinkingDots = turn.pending && !turn.text && !turn.error;
  const showOfferButtons =
    isLast && !turn.pending && !turn.error && isQuestionOffer(action);

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <MiraAvatar size={28} />
      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
        {showThinkingDots && (
          <div
            style={{
              color: T.textMuted,
              fontSize: 14,
              fontStyle: 'italic',
              letterSpacing: 1.5,
            }}
          >
            …
          </div>
        )}
        {body && (
          <div
            style={{
              fontFamily: T.sans,
              fontSize: 14,
              lineHeight: 1.6,
              color: T.textSoft,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {body}
          </div>
        )}
        {action && (
          <div
            style={{
              marginTop: body ? 12 : 0,
              fontSize: 14,
              lineHeight: 1.5,
              color: T.goldText,
              fontFamily: T.sans,
            }}
          >
            <span style={{ color: T.goldDimDash, marginRight: 4 }}>—</span>
            {action}
          </div>
        )}
        {showOfferButtons && (
          <div
            style={{
              marginTop: 10,
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={onAccept}
              disabled={disabled}
              style={{
                padding: '7px 14px',
                background: T.gold,
                color: '#07120c',
                border: 'none',
                borderRadius: 9,
                fontFamily: T.sans,
                fontSize: 13.5,
                fontWeight: 600,
                cursor: disabled ? 'default' : 'pointer',
                opacity: disabled ? 0.6 : 1,
              }}
            >
              Yes, please
            </button>
            <button
              onClick={onDecline}
              disabled={disabled}
              style={{
                padding: '7px 14px',
                background: 'transparent',
                color: T.textSecondary,
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: 9,
                fontFamily: T.sans,
                fontSize: 13.5,
                cursor: disabled ? 'default' : 'pointer',
                opacity: disabled ? 0.6 : 1,
              }}
            >
              Not now
            </button>
          </div>
        )}
        {turn.error && (
          <div
            style={{
              marginTop: body ? 10 : 0,
              padding: '8px 12px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.22)',
              borderRadius: 10,
              color: '#f87171',
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {turn.error}
          </div>
        )}
      </div>
    </div>
  );
}
