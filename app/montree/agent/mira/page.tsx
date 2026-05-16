// app/montree/agent/mira/page.tsx
//
// Mira's full-page chat surface for the agent. Mirrors /montree/admin
// (Tracy's full-page chat) — same SSE streaming pattern, same persisted
// conversation state, same action-line rendering with the "→ " marker.

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import MiraAvatar from '@/components/montree/agent/MiraAvatar';
import { miraKeys } from '@/lib/montree/mira/storage-keys';
import { Send, Sparkles } from 'lucide-react';
// Canonical action-line parser — Session 113 V2 audit MED-5.
import { splitActionLine } from '@/lib/montree/ai/split-action-line';

const T = {
  bg: '#0a1a0f',
  glow:
    'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.32), transparent 60%)',
  cardBg: 'rgba(8,20,12,0.55)',
  cardBgStrong: 'rgba(8,20,12,0.75)',
  cardBorder: '1px solid rgba(52,211,153,0.18)',
  goldBorder: '1px solid rgba(232,201,106,0.30)',
  emerald: '#34d399',
  emeraldDim: 'rgba(52,211,153,0.65)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  gold: '#E8C96A',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.62)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  inputBg: 'rgba(0,0,0,0.30)',
};

interface ToolEvent {
  tool: string;
  input: unknown;
  success?: boolean;
  summary?: string;
  status: 'pending' | 'success' | 'failure';
}

interface Turn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  thinking?: string;
  tools?: ToolEvent[];
  cost_usd?: number;
  error?: string;
}

interface Agent {
  id: string;
  name: string | null;
  email: string | null;
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const SUGGESTIONS = [
  'How are my schools doing?',
  'Which codes haven\'t converted?',
  'Draft a cold email to Casa Dei Bambini Milano',
  'Translate my pitch into Mandarin',
];

export default function MiraChatPage() {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [conversationId, setConversationId] = useState<string>('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load agent identity.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/montree/agent/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { agent?: Agent } | null) => {
        if (cancelled) return;
        if (!data?.agent) {
          router.push('/montree/login-select');
          return;
        }
        setAgent(data.agent);
      })
      .catch(() => router.push('/montree/login-select'));
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Restore conversation from localStorage once agent identity is known.
  useEffect(() => {
    if (!agent) return;
    try {
      const existingConvId = localStorage.getItem(miraKeys.agentConvId(agent.id));
      if (existingConvId) {
        setConversationId(existingConvId);
        const stored = localStorage.getItem(miraKeys.agentConv(agent.id, existingConvId));
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as Turn[];
            if (Array.isArray(parsed)) setTurns(parsed);
          } catch {
            /* corrupted — start fresh */
          }
        }
      } else {
        const fresh = uuid();
        setConversationId(fresh);
        localStorage.setItem(miraKeys.agentConvId(agent.id), fresh);
      }
    } catch {
      // localStorage may be unavailable (private mode) — just start fresh.
      setConversationId(uuid());
    }
  }, [agent]);

  // Persist turns whenever they change.
  useEffect(() => {
    if (!agent || !conversationId) return;
    try {
      localStorage.setItem(miraKeys.agentConv(agent.id, conversationId), JSON.stringify(turns));
    } catch {
      /* storage full or disabled */
    }
  }, [turns, agent, conversationId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [turns.length, streaming]);

  function newConversation() {
    if (!agent) return;
    const fresh = uuid();
    setConversationId(fresh);
    setTurns([]);
    setError(null);
    try {
      localStorage.setItem(miraKeys.agentConvId(agent.id), fresh);
    } catch {
      /* ignore */
    }
  }

  async function send(rawText: string) {
    const text = rawText.trim();
    if (!text || streaming || !agent || !conversationId) return;

    const userTurn: Turn = { id: uuid(), role: 'user', text };
    const assistantTurn: Turn = { id: uuid(), role: 'assistant', text: '', tools: [] };
    setTurns((prev) => [...prev, userTurn, assistantTurn]);
    setInput('');
    setStreaming(true);
    setError(null);

    // Build history (previous user/assistant turns, last 10).
    const history = turns
      .slice(-10)
      .map((t) => ({ role: t.role, content: t.text }))
      .filter((t) => t.content);

    try {
      const res = await fetch('/api/montree/agent/mira', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          conversation_id: conversationId,
          history,
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const updateAssistant = (mutate: (t: Turn) => Turn) => {
        setTurns((prev) =>
          prev.map((t) => (t.id === assistantTurn.id ? mutate(t) : t))
        );
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const evt of events) {
          if (!evt.startsWith('data: ')) continue;
          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(evt.slice(6));
          } catch {
            continue;
          }
          const t = payload.type as string;
          if (t === 'tool_call') {
            updateAssistant((turn) => ({
              ...turn,
              tools: [
                ...(turn.tools || []),
                { tool: payload.tool as string, input: payload.input, status: 'pending' },
              ],
            }));
          } else if (t === 'tool_result') {
            updateAssistant((turn) => ({
              ...turn,
              tools: (turn.tools || []).map((te, i, arr) => {
                if (i !== arr.length - 1) return te;
                return {
                  ...te,
                  status: payload.success ? 'success' : 'failure',
                  summary: payload.summary as string | undefined,
                };
              }),
            }));
          } else if (t === 'thinking') {
            updateAssistant((turn) => ({ ...turn, thinking: payload.text as string }));
          } else if (t === 'text') {
            updateAssistant((turn) => ({
              ...turn,
              text: turn.text + (payload.text as string),
            }));
          } else if (t === 'done') {
            updateAssistant((turn) => ({
              ...turn,
              cost_usd: payload.cost_usd as number,
            }));
            // Flip hasMet flag ONLY on successful done (not on error/abort).
            // If the greeting POST fails (network, 503, rate limit), the next
            // session should still fire [GREETING_FIRST] so the agent eventually
            // meets Mira properly. Mirrors Tracy's pattern from Session 96.
            if (pendingFirstMeetingRef.current && agent) {
              pendingFirstMeetingRef.current = false;
              try {
                localStorage.setItem(miraKeys.hasMet(agent.id), '1');
              } catch {
                /* localStorage unavailable — silently fail; next session retries */
              }
            }
          } else if (t === 'error') {
            updateAssistant((turn) => ({
              ...turn,
              error: payload.error as string,
            }));
            setError(payload.error as string);
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Send failed';
      setError(msg);
      setTurns((prev) =>
        prev.map((t) =>
          t.id === assistantTurn.id ? { ...t, error: msg } : t
        )
      );
    } finally {
      setStreaming(false);
    }
  }

  const greetingState = useMemo<'first_meeting' | 'normal' | 'live'>(() => {
    if (turns.length > 0) return 'live';
    try {
      if (agent && localStorage.getItem(miraKeys.hasMet(agent.id))) return 'normal';
    } catch {
      /* ignore */
    }
    return 'first_meeting';
  }, [agent, turns.length]);

  // Auto-fire greeting prompt on first mount of a fresh conversation.
  // hasMet flag is flipped ONLY on a successful `done` SSE event (handled
  // inside send()), not here — if the request fails, the next session should
  // fire [GREETING_FIRST] again so the agent eventually meets Mira properly.
  // Mirrors Tracy's pattern from Session 96.
  const greetedRef = useRef(false);
  const pendingFirstMeetingRef = useRef(false);
  useEffect(() => {
    if (greetedRef.current) return;
    if (!agent || !conversationId) return;
    if (turns.length > 0) return;
    greetedRef.current = true;
    const isFirstMeeting = greetingState === 'first_meeting';
    pendingFirstMeetingRef.current = isFirstMeeting;
    void send(isFirstMeeting ? '[GREETING_FIRST]' : '[GREETING]');
    // Disable lint — we intentionally only fire once per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent, conversationId]);

  // Filter out synthetic greeting prompts from the rendered transcript.
  const visibleTurns = turns.filter(
    (t) => !(t.role === 'user' && (t.text === '[GREETING]' || t.text === '[GREETING_FIRST]'))
  );

  // Layout provides background + AgentNav. We just render our content.
  return (
    <div style={{ color: T.textPrimary, fontFamily: T.sans }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <main style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 80px 16px' }}>
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginBottom: 18,
            }}
          >
            <MiraAvatar size={48} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1
                style={{
                  fontFamily: T.serif,
                  fontSize: 24,
                  fontWeight: 500,
                  margin: 0,
                  letterSpacing: -0.3,
                }}
              >
                Mira
              </h1>
              <p style={{ fontSize: 12, color: T.textMuted, margin: 0 }}>
                Your growth partner — drafts outreach, watches your pipeline.
              </p>
            </div>
            <button
              onClick={newConversation}
              disabled={streaming || turns.length === 0}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                border: T.cardBorder,
                borderRadius: 999,
                color: T.textSecondary,
                fontSize: 12,
                fontWeight: 500,
                cursor: streaming || turns.length === 0 ? 'not-allowed' : 'pointer',
                opacity: streaming || turns.length === 0 ? 0.4 : 1,
              }}
            >
              New conversation
            </button>
          </header>

          {/* Empty state — only if no visible turns AND we haven't fired a greeting yet */}
          {visibleTurns.length === 0 && (
            <div
              style={{
                background: T.cardBg,
                border: T.cardBorder,
                borderRadius: 16,
                padding: 26,
                textAlign: 'center',
              }}
            >
              <p style={{ color: T.textSecondary, fontSize: 14, margin: 0 }}>
                Say hello — Mira&apos;s reading your pipeline now.
              </p>
            </div>
          )}

          {/* Turns */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
            {visibleTurns.map((turn) =>
              turn.role === 'user' ? (
                <UserBubble key={turn.id} text={turn.text} />
              ) : (
                <AssistantBubble key={turn.id} turn={turn} />
              )
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions when fresh */}
          {visibleTurns.length === 0 && (
            <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  disabled={streaming}
                  style={{
                    padding: '8px 14px',
                    background: T.cardBg,
                    border: T.cardBorder,
                    borderRadius: 999,
                    color: T.textSecondary,
                    fontFamily: T.sans,
                    fontSize: 12,
                    cursor: streaming ? 'not-allowed' : 'pointer',
                    opacity: streaming ? 0.5 : 1,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: 12,
                padding: 10,
                background: 'rgba(248,113,113,0.10)',
                border: '1px solid rgba(248,113,113,0.30)',
                borderRadius: 10,
                fontSize: 12,
                color: '#f87171',
              }}
            >
              {error}
            </div>
          )}

          {/* Composer */}
          <div
            style={{
              position: 'sticky',
              bottom: 16,
              marginTop: 22,
              background: T.cardBgStrong,
              border: T.cardBorder,
              borderRadius: 16,
              padding: 12,
              backdropFilter: 'blur(18px)',
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !streaming) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              placeholder={streaming ? 'Mira is thinking…' : 'Ask Mira anything…'}
              rows={2}
              disabled={streaming}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: T.inputBg,
                border: T.cardBorder,
                borderRadius: 10,
                color: T.textPrimary,
                fontFamily: T.sans,
                // 16px prevents iOS Safari zoom-in on focus.
                fontSize: 16,
                outline: 'none',
                resize: 'vertical',
                marginBottom: 8,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => void send(input)}
                disabled={streaming || !input.trim()}
                style={{
                  padding: '8px 16px',
                  background: T.gold,
                  color: '#0a1a0f',
                  border: 'none',
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: streaming || !input.trim() ? 'not-allowed' : 'pointer',
                  opacity: streaming || !input.trim() ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Send size={14} strokeWidth={1.75} />
                Send
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────

function UserBubble({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div
        style={{
          background: 'rgba(52,211,153,0.14)',
          border: '1px solid rgba(52,211,153,0.30)',
          borderRadius: 14,
          padding: '10px 14px',
          maxWidth: '85%',
          fontSize: 14,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
        }}
      >
        {text}
      </div>
    </div>
  );
}

function AssistantBubble({ turn }: { turn: Turn }) {
  // Session 113 V2 audit MED-5 — canonical splitActionLine returns
  // { body, action: string | null }. Local aliases preserved for backward
  // compat with the existing JSX below.
  const { body: mainText, action: actionLine } = splitActionLine(turn.text || '');
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <MiraAvatar size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {turn.tools && turn.tools.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {turn.tools.map((te, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  background:
                    te.status === 'failure'
                      ? 'rgba(248,113,113,0.10)'
                      : te.status === 'success'
                        ? 'rgba(52,211,153,0.10)'
                        : 'rgba(255,255,255,0.06)',
                  border:
                    te.status === 'failure'
                      ? '1px solid rgba(248,113,113,0.30)'
                      : te.status === 'success'
                        ? '1px solid rgba(52,211,153,0.30)'
                        : '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 999,
                  fontSize: 11,
                  color:
                    te.status === 'failure'
                      ? '#f87171'
                      : te.status === 'success'
                        ? '#34d399'
                        : 'rgba(255,255,255,0.62)',
                }}
              >
                <Sparkles size={10} strokeWidth={1.75} />
                {te.tool}
                {te.status === 'pending' && <span style={{ opacity: 0.6 }}>…</span>}
                {te.summary && (
                  <span style={{ opacity: 0.7 }}>· {te.summary.slice(0, 60)}</span>
                )}
              </span>
            ))}
          </div>
        )}
        {turn.thinking && (
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontStyle: 'italic', margin: '4px 0' }}>
            {turn.thinking}
          </p>
        )}
        {mainText && (
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: '4px 0', whiteSpace: 'pre-wrap' }}>
            {mainText}
          </p>
        )}
        {actionLine && (
          <p
            style={{
              marginTop: 12,
              padding: '8px 12px',
              background: 'rgba(232,201,106,0.08)',
              border: '1px solid rgba(232,201,106,0.25)',
              borderRadius: 10,
              fontSize: 14,
              color: '#E8C96A',
              fontWeight: 500,
            }}
          >
            <span style={{ marginRight: 4 }}>→</span>
            {actionLine}
          </p>
        )}
        {turn.error && (
          <p style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>
            {turn.error}
          </p>
        )}
      </div>
    </div>
  );
}

// splitActionLine is imported from the canonical helper at the top of this file.
// Session 113 V2 audit MED-5 — drift across 4 copies eliminated.
