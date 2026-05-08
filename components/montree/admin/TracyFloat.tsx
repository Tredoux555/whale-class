// components/montree/admin/TracyFloat.tsx
//
// Tracy as a floating chief-of-staff that lives in the principal cockpit
// shell. Visible on every /montree/admin/* page EXCEPT /montree/admin
// itself (the dedicated chat page IS Tracy there — the float would just
// duplicate the surface).
//
// BEHAVIOUR (load-bearing):
//   - First mount of the browser session → fire a hidden "[GREETING]" user
//     message, stream Tracy's situational greeting back, auto-open the
//     panel. The greeting is stored in conversation history so follow-up
//     turns ("yes draft them") have context.
//   - Subsequent mounts (page navigation in the same session) → respect
//     persisted open/closed state from localStorage. Do NOT re-greet.
//   - Conversation state is SHARED with /montree/admin (same convId, same
//     localStorage keys) so navigating between surfaces preserves the thread.
//   - Question-form action lines ending in "?" surface inline Yes/No
//     buttons; "Yes, please" auto-sends and Tracy executes the tool.
//
// Hidden-greeting rendering trick: the user turn with text exactly equal
// to '[GREETING]' is filtered out at render time on both the float and
// the chat page. The server logs it normally — super-admin can see it.
//
// PRIVACY (Session — May 8 2026):
//   All Tracy localStorage keys are scoped by school_id (see
//   lib/montree/tracy/storage-keys.ts). Logging into different schools on
//   the same browser never bleeds conversation between them. Old unscoped
//   keys are now orphaned; browser eviction handles cleanup.
//
// FREE-TIER GRACEFUL DEGRADATION:
//   When the principal-agent route 402s (school has no AI tier yet), the
//   float does NOT show a red error — it replaces the assistant turn with
//   a static welcome introducing Tracy and pointing to tredoux555@gmail.com
//   for activation. hasMet stays false on the failed kickoff so the next
//   session re-attempts the introduction once AI is enabled.
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Send, Minus } from 'lucide-react';
import TracyAvatar from './TracyAvatar';
import { useI18n } from '@/lib/montree/i18n';
import {
  tracyKeys,
  getSchoolIdFromStorage,
  TRACY_FLOAT_OPEN_KEY,
  type TracyStorageKeys,
} from '@/lib/montree/tracy/storage-keys';

// Dark forest tokens — match the cockpit palette
const T = {
  emerald: '#34d399',
  gold: '#E8C96A',
  goldText: '#f0d68a',
  goldDimDash: 'rgba(232,201,106,0.55)',
  cardBg: 'rgba(8,20,12,0.94)',
  cardBorder: '1px solid rgba(52,211,153,0.22)',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: '1px solid rgba(52,211,153,0.25)',
  textSoft: '#eaf1e6',
  textHelloBright: '#f5f8ef',
  textSecondary: 'rgba(234,241,230,0.55)',
  textMuted: 'rgba(255,255,255,0.40)',
  bubbleSoft: 'rgba(234,241,230,0.06)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface ToolEvent {
  name: string;
  success: boolean | null;
  summary?: string;
}
interface ProgressEvent {
  phase: string;
  vars?: Record<string, string>;
}
interface ConvTurn {
  role: 'user' | 'assistant';
  text: string;
  tools?: ToolEvent[];
  thinking?: string;
  progress?: ProgressEvent | null;
  pending?: boolean;
  error?: string;
  costUsd?: number;
}

const MAX_PERSISTED_TURNS = 30;

const GREETING_PROMPT = '[GREETING]';
const GREETING_FIRST_PROMPT = '[GREETING_FIRST]';

// The synthetic kickoff prompts are filtered from render on every chat surface
// — the principal sees Tracy's reply, never her own kickoff prompt.
function isHiddenKickoff(text: string): boolean {
  return text === GREETING_PROMPT || text === GREETING_FIRST_PROMPT;
}

function isKickoff(text: string): boolean {
  return isHiddenKickoff(text);
}

// Static welcome shown when the principal-agent route 402s (school has no
// active AI tier yet). Replaces the assistant turn — no red error UI. The
// principal still gets the introduction; AI features light up once Tredoux
// flips the school to a paid tier.
const FREE_TIER_STATIC_WELCOME = `Hi, I'm Tracy. I'll be your assistant once your school's AI features are switched on — Montessori expert in your pocket, drafting messages for your teachers, helping you handle parent questions, all the school operations work.

Right now AI isn't active for this school. Drop me a line at tredoux555@gmail.com and I'll get you set up.

→ Looking forward to working with you.`;

// ── Helpers ──────────────────────────────────────────────────────────────

function readConv(keys: TracyStorageKeys, convId: string): ConvTurn[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(keys.conversation(convId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_PERSISTED_TURNS) : [];
  } catch {
    return [];
  }
}

function writeConv(
  keys: TracyStorageKeys,
  convId: string,
  turns: ConvTurn[]
) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      keys.conversation(convId),
      JSON.stringify(turns.slice(-MAX_PERSISTED_TURNS))
    );
  } catch {
    // localStorage may be full / disabled — ignore
  }
}

function newConvId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'c-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Same parser as /montree/admin/page.tsx — kept inline so the float doesn't
// reach into a sibling page's internals. If the parser ever changes, update
// both sites or extract to lib/montree/tracy/action-line.ts.
function splitActionLine(text: string): {
  body: string;
  action: string | null;
} {
  if (!text || !text.trim()) return { body: text, action: null };
  const ARROW_RE = /^\s*(?:→|->)\s+/;
  const paragraphs = text.split(/\n\s*\n/);
  const lastPara = paragraphs[paragraphs.length - 1]?.trim() ?? '';
  if (ARROW_RE.test(lastPara)) {
    const action = lastPara.replace(ARROW_RE, '').trim();
    const body = paragraphs.slice(0, -1).join('\n\n').trim();
    return { body, action };
  }
  const lines = text.split(/\n/);
  if (lines.length >= 2) {
    const lastLine = lines[lines.length - 1].trim();
    if (ARROW_RE.test(lastLine)) {
      const action = lastLine.replace(ARROW_RE, '').trim();
      const body = lines.slice(0, -1).join('\n').trim();
      return { body, action };
    }
  }
  if (/^I['’]d\s/i.test(lastPara)) {
    const body = paragraphs.slice(0, -1).join('\n\n').trim();
    return { body, action: lastPara };
  }
  return { body: text, action: null };
}

// Detect question-form offers Tracy can execute on (e.g. "Want me to draft…?").
// These get inline Yes/No buttons. Plain declarative actions ("Send Susan a
// thank-you note") do NOT — those are for the principal to act on, not Tracy.
function isQuestionOffer(action: string | null): boolean {
  if (!action) return false;
  const trimmed = action.trim();
  if (!trimmed.endsWith('?')) return false;
  // English + a couple of other-locale offer phrasings. Conservative — false
  // negatives just hide a button (still usable via free-text), false
  // positives would surface buttons Tracy can't actually execute on.
  return /(want me to|would you like me to|shall i|should i|可以让我|让我|要不要我|¿quieres que)/i.test(
    trimmed
  );
}

// ── Component ────────────────────────────────────────────────────────────

export default function TracyFloat() {
  const pathname = usePathname() || '';
  const { t, locale } = useI18n();

  // State
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

  // School-scoped storage keys — built once on mount from localStorage's
  // montree_school. If we end up with no schoolId (no logged-in principal),
  // we never fire a greeting and the panel stays inert until next mount.
  const keysRef = useRef<TracyStorageKeys | null>(null);

  // ── Initial mount: read state, fire greeting if first session login ─
  useEffect(() => {
    if (initialisedRef.current) return;
    initialisedRef.current = true;
    setMounted(true);

    // Auth gate — if no principal, layout handles redirect.
    const principalData =
      typeof window !== 'undefined'
        ? localStorage.getItem('montree_principal')
        : null;
    if (!principalData) return;

    // Resolve schoolId. Without it we cannot scope keys, and we'd risk
    // bleeding conversations between schools — refuse to proceed.
    const schoolId = getSchoolIdFromStorage();
    if (!schoolId) return;
    const keys = tracyKeys(schoolId);
    keysRef.current = keys;

    // Resolve convId — scoped to this school
    let id = '';
    try {
      id = localStorage.getItem(keys.conversationId) || '';
    } catch {
      id = '';
    }
    if (!id) {
      id = newConvId();
      try {
        localStorage.setItem(keys.conversationId, id);
      } catch {
        // ignore
      }
    }
    setConvId(id);
    setTurns(readConv(keys, id));

    // Persisted open/closed state (defaults to closed). UI-only key — not
    // school-scoped because panel position is a personal preference, not data.
    let persistedOpen = false;
    try {
      persistedOpen = localStorage.getItem(TRACY_FLOAT_OPEN_KEY) === 'true';
    } catch {
      // ignore
    }
    setOpen(persistedOpen);

    // Once-per-session greeting trigger — also school-scoped so logging out
    // of school A and into school B in the same tab still triggers Tracy's
    // greeting on B.
    let alreadyGreeted = false;
    try {
      alreadyGreeted = sessionStorage.getItem(keys.greetedSession) === 'true';
    } catch {
      // sessionStorage disabled — treat as not greeted (will fire once per
      // page load, graceful for incognito or locked-down browsers).
    }
    if (!alreadyGreeted) {
      try {
        sessionStorage.setItem(keys.greetedSession, 'true');
      } catch {
        // ignore
      }
      // Open the panel so the greeting is visible immediately.
      setOpen(true);
      try {
        localStorage.setItem(TRACY_FLOAT_OPEN_KEY, 'true');
      } catch {
        // ignore
      }

      // First-meeting check — fire [GREETING_FIRST] (full introduction) if
      // Tracy has never properly introduced herself to this principal on this
      // school. Otherwise fire the short [GREETING].
      //
      // CRITICAL: we do NOT preemptively flip hasMet to true here. We only
      // flip it when a successful response arrives (sendMessage marks it on
      // the 'done' SSE event). This way Free-tier schools — where the route
      // 402s — keep firing [GREETING_FIRST] every session until AI is enabled
      // and the real introduction lands.
      let hasMet = false;
      try {
        hasMet = localStorage.getItem(keys.hasMet) === 'true';
      } catch {
        // treat as not met if storage disabled
      }
      const kickoff = hasMet ? GREETING_PROMPT : GREETING_FIRST_PROMPT;
      // Fire the greeting in the background — don't block render.
      void fireGreeting(id, kickoff);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist conversation on every change — uses the school-scoped keys
  // resolved at mount.
  useEffect(() => {
    if (convId && keysRef.current) writeConv(keysRef.current, convId, turns);
  }, [convId, turns]);

  // Persist open/closed state
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(TRACY_FLOAT_OPEN_KEY, open ? 'true' : 'false');
    } catch {
      // ignore
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

  // ── Streaming submit (shared by free-text + greeting + action buttons) ─
  const handleEvent = useCallback(
    (evt: Record<string, unknown>) => {
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
            updated.progress = null;
            break;
          }
          case 'tool_progress': {
            const phase = typeof evt.phase === 'string' ? evt.phase : '';
            const rawVars = (evt as Record<string, unknown>).vars;
            const vars =
              rawVars && typeof rawVars === 'object'
                ? (rawVars as Record<string, string>)
                : undefined;
            if (phase) updated.progress = { phase, vars };
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
            updated.progress = null;
            updated.costUsd =
              typeof evt.cost_usd === 'number' ? evt.cost_usd : undefined;
            break;
          }
          case 'error': {
            updated.pending = false;
            updated.progress = null;
            updated.error = String(
              evt.error || t('tracy.errors.transient') || 'Something went wrong.'
            );
            break;
          }
        }
        return [...prev.slice(0, -1), updated];
      });
    },
    [t]
  );

  const sendMessage = useCallback(
    async (
      questionText: string,
      currentConvId: string,
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

      // Build short history for the server (last 6 turns)
      const history: { role: 'user' | 'assistant'; content: string }[] = [];
      const turnsForHistory = addUserTurn
        ? [...turns, userTurn].slice(-7)
        : [...turns].slice(-6);
      for (const turn of turnsForHistory) {
        if (turn.text) history.push({ role: turn.role, content: turn.text });
      }
      // Drop the just-added question if present — server adds it itself
      if (
        addUserTurn &&
        history.length > 0 &&
        history[history.length - 1].content === questionText
      ) {
        history.pop();
      }

      // Track whether the response succeeded — used to flip hasMet=true on a
      // GREETING_FIRST that actually landed (so Tracy doesn't keep
      // re-introducing herself once she's done it once).
      let succeeded = false;
      const kickoff = isKickoff(questionText);

      try {
        const res = await fetch('/api/montree/admin/principal-agent', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: questionText,
            conversation_id: currentConvId,
            history,
            locale,
          }),
        });

        if (res.status === 402) {
          // FREE-TIER GRACEFUL DEGRADATION:
          // The school doesn't have an active AI tier yet. Don't surface a
          // red error — Tracy still introduces herself with a static welcome
          // and points the principal to tredoux555@gmail.com for activation.
          // hasMet stays false, so once AI is enabled, the next session
          // fires GREETING_FIRST again and the real Tracy meets her.
          if (kickoff) {
            setTurns((prev) =>
              prev.map((tt, i) =>
                i === prev.length - 1
                  ? {
                      ...tt,
                      pending: false,
                      text: FREE_TIER_STATIC_WELCOME,
                    }
                  : tt
              )
            );
            if (!open) setHasUnread(true);
          } else {
            // User typed a question against a Free-tier school. Show a
            // friendly tier-message error so they know what to do.
            setTurns((prev) =>
              prev.map((tt, i) =>
                i === prev.length - 1
                  ? {
                      ...tt,
                      pending: false,
                      error:
                        "AI features aren't active for this school yet. Email tredoux555@gmail.com to switch them on.",
                    }
                  : tt
              )
            );
          }
          return;
        }

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          const msg =
            payload?.error ||
            t('tracy.errors.transient') ||
            'Something went wrong.';
          setTurns((prev) =>
            prev.map((tt, i) =>
              i === prev.length - 1
                ? { ...tt, pending: false, error: msg }
                : tt
            )
          );
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setTurns((prev) =>
            prev.map((tt, i) =>
              i === prev.length - 1
                ? {
                    ...tt,
                    pending: false,
                    error: t('tracy.errors.noStream') || 'No stream.',
                  }
                : tt
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
              // If the panel is closed and Tracy started speaking, mark unread.
              if (
                !open &&
                (evt.type === 'text' || evt.type === 'done' || evt.type === 'error')
              ) {
                setHasUnread(true);
              }
            } catch {
              // ignore malformed event
            }
            nlIdx = buffer.indexOf('\n\n');
          }
        }

        // Mark hasMet=true once the GREETING_FIRST kickoff has landed
        // successfully. Means Tracy has properly introduced herself once on
        // this school — subsequent sessions skip the introduction.
        if (
          succeeded &&
          questionText === GREETING_FIRST_PROMPT &&
          keysRef.current
        ) {
          try {
            localStorage.setItem(keysRef.current.hasMet, 'true');
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.error('[TracyFloat] stream error', err);
        setTurns((prev) =>
          prev.map((tt, i) =>
            i === prev.length - 1
              ? {
                  ...tt,
                  pending: false,
                  error:
                    t('tracy.errors.connection') || 'Could not reach Tracy.',
                }
              : tt
          )
        );
      }
    },
    [turns, locale, t, handleEvent, open]
  );

  const fireGreeting = useCallback(
    async (currentConvId: string, kickoff: string) => {
      // Add a hidden user turn (the kickoff prompt — filtered at render time
      // below) so the server has the prompt + the conversation log captures
      // the kickoff. Future follow-ups read this in their history slice so
      // Tracy has the situational context.
      setSubmitting(true);
      try {
        await sendMessage(kickoff, currentConvId, true);
      } finally {
        setSubmitting(false);
      }
    },
    [sendMessage]
  );

  const submit = useCallback(
    async (textOverride?: string) => {
      const q = (textOverride ?? question).trim();
      if (!q || submitting || !convId) return;
      setQuestion('');
      setSubmitting(true);
      try {
        await sendMessage(q, convId, true);
      } finally {
        setSubmitting(false);
      }
    },
    [question, submitting, convId, sendMessage]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  // Hide on the dedicated chat page — must come AFTER all hooks.
  if (pathname === '/montree/admin') return null;
  if (!mounted) return null;

  // Filter out hidden kickoff turns ("[GREETING]" / "[GREETING_FIRST]") at render time
  const visibleTurns = turns.filter(
    (turn) => !(turn.role === 'user' && isHiddenKickoff(turn.text))
  );
  const lastAssistantIdx = (() => {
    for (let i = visibleTurns.length - 1; i >= 0; i--) {
      if (visibleTurns[i].role === 'assistant') return i;
    }
    return -1;
  })();

  // ── Collapsed state — just the avatar button ─────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open Tracy"
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
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
        className="tracy-float-trigger"
      >
        <TracyAvatar size={42} />
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
        <style jsx>{`
          .tracy-float-trigger:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 26px rgba(0, 0, 0, 0.5),
              0 0 0 4px rgba(232, 201, 106, 0.12);
          }
        `}</style>
      </button>
    );
  }

  // ── Expanded state — chat panel ──────────────────────────────────────
  return (
    <div
      role="dialog"
      aria-label="Tracy"
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 35,
        width: 'min(380px, calc(100vw - 32px))',
        maxHeight: 'calc(100vh - 32px)',
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
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 14px',
          borderBottom: '1px solid rgba(52,211,153,0.12)',
          background: 'rgba(0,0,0,0.18)',
        }}
      >
        <TracyAvatar size={32} />
        <div
          style={{
            flex: 1,
            fontFamily: T.serif,
            fontSize: 17,
            color: T.textHelloBright,
            letterSpacing: -0.2,
          }}
        >
          Tracy
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close Tracy"
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
            <TracyAvatar size={28} />
            <span>Tracy here. Ask me anything about your school.</span>
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
            placeholder="Ask Tracy…"
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
              fontSize: 14,
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
              background: question.trim() ? T.emerald : 'rgba(52,211,153,0.18)',
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
  const showThinkingDots =
    turn.pending && !turn.text && !turn.error && !turn.progress;
  const showOfferButtons =
    isLast &&
    !turn.pending &&
    !turn.error &&
    isQuestionOffer(action);

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <TracyAvatar size={28} />
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
                background: T.emerald,
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
