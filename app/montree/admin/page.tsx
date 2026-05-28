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
import { useI18n } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';
import TracyAvatar from '@/components/montree/admin/TracyAvatar';
import ThinkingIndicator from '@/components/montree/admin/ThinkingIndicator';
import TracyBody from '@/components/montree/admin/TracyBody';
import ChangelogModal from '@/components/montree/ChangelogModal';
import TrialExpiringBanner from '@/components/montree/admin/TrialExpiringBanner';
import TracyProactiveCard from '@/components/montree/admin/TracyProactiveCard';
import PendingAppointmentsBanner from '@/components/montree/appointments/PendingAppointmentsBanner';
// Canonical action-line parser — Session 113 V2 audit MED-5.
import { splitActionLine } from '@/lib/montree/ai/split-action-line';
import {
  tracyKeys,
  getSchoolIdFromStorage,
  type TracyStorageKeys,
} from '@/lib/montree/tracy/storage-keys';

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
  serif: 'var(--font-lora), Georgia, serif',
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

interface ProgressEvent {
  phase: string; // matches a tracy.progress.<phase> i18n key
  vars?: Record<string, string>;
}

/**
 * Session 135 — meeting_brief SSE payload.
 * Sent by the principal-agent route when prepare_parent_meeting succeeds.
 * Renders as a scannable brief at the top of the assistant turn, with
 * the full 9-section dossier collapsed behind a "Show me the full
 * thinking" disclosure.
 */
interface MeetingBrief {
  brief_markdown: string | null;
  dossier_markdown: string | null;
  child_name: string | null;
  from_cache: boolean;
}

interface ConvTurn {
  role: 'user' | 'assistant';
  text: string;
  tools?: ToolEvent[];
  thinking?: string;
  /** Latest live status from inside Tracy's tools — rendered while pending. */
  progress?: ProgressEvent | null;
  pending?: boolean;
  error?: string;
  /** When set, the assistant turn renders an "Activate Tracy" upgrade card
   *  instead of a plain red error toast. Triggered by 402 responses. */
  requiresUpgrade?: boolean;
  costUsd?: number;
  /** When prepare_parent_meeting succeeds, the structured brief + dossier
   *  render at the top of the assistant turn (Session 135). The brief is
   *  shown by default; the dossier collapses behind a disclosure. */
  meetingBrief?: MeetingBrief;
}

const MAX_PERSISTED_TURNS = 30;

// Conversation storage is school-scoped (lib/montree/tracy/storage-keys.ts).
// readConv / writeConv take the keys object resolved from the school the
// principal is currently logged into so two schools on the same browser
// can never see each other's conversation.

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

function writeConv(keys: TracyStorageKeys, convId: string, turns: ConvTurn[]) {
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
  // RFC 4122 v4-ish — server treats it as a grouping key so we don't need
  // strong cryptographic uniqueness, just collision-resistant enough.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'c-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// splitActionLine is imported from the canonical helper (top of this file).
// Session 113 V2 audit MED-5 — single source of truth across Tracy + Mira surfaces.

// ── Subcomponents ────────────────────────────────────────────────────────
// TracyAvatar lives in components/montree/admin/TracyAvatar.tsx — shared
// between this chat page and the cockpit-wide TracyFloat so the avatar
// version, fallback, and crop shape stay in lock-step across surfaces.

function EmptyState({ firstName }: { firstName: string }) {
  const { t } = useI18n();
  const greeting = firstName
    ? t('tracy.greetingNamed', { name: firstName })
    : t('tracy.greeting');
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
          {greeting}
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
        {t('tracy.helpPrompt')}
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

/**
 * Session 135 — parent-meeting brief + dossier disclosure.
 *
 * Renders as a structured artifact at the top of an assistant turn when
 * Tracy's prepare_parent_meeting tool has emitted a `meeting_brief` SSE
 * event. The brief is shown by default (≤200 words, scannable in 15
 * seconds — the literal cue card the principal reads in the room). The
 * full 9-section dossier collapses behind a "Show me the full thinking"
 * disclosure for the principal who wants to study the meeting the night
 * before.
 *
 * Graceful fallbacks:
 *   - brief missing → render dossier inline (no disclosure, brief was the
 *     primary artifact and there isn't one)
 *   - dossier missing → render brief alone (no disclosure either, nothing
 *     to expand)
 *   - both missing → render nothing (the SSE event shouldn't have fired
 *     in the first place but this is belt-and-braces)
 */
function MeetingBriefCard({ brief }: { brief: MeetingBrief }) {
  const [expanded, setExpanded] = useState(false);
  const hasBrief = !!brief.brief_markdown;
  const hasDossier = !!brief.dossier_markdown;
  if (!hasBrief && !hasDossier) return null;

  // When only dossier is present (no brief), render it inline. Old cached
  // payloads pre-Session-135 land here.
  if (!hasBrief && hasDossier) {
    return (
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(232,201,106,0.20)',
          borderRadius: 14,
          padding: '14px 18px',
          marginBottom: 12,
        }}
      >
        <TracyBody
          text={brief.dossier_markdown!}
          style={{
            fontFamily: T.sans,
            fontSize: 14.5,
            lineHeight: 1.7,
            color: T.textSoft,
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'rgba(232,201,106,0.06)',
        border: '1px solid rgba(232,201,106,0.32)',
        borderRadius: 14,
        padding: '14px 18px',
        marginBottom: 12,
      }}
    >
      {/* Brief — always visible at the top. The cue card. */}
      <TracyBody
        text={brief.brief_markdown!}
        style={{
          fontFamily: T.sans,
          fontSize: 14.5,
          lineHeight: 1.65,
          color: T.textSoft,
        }}
      />

      {/* Disclosure — only render when there's a dossier to expand to. */}
      {hasDossier && (
        <>
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            style={{
              marginTop: 14,
              padding: '6px 12px',
              background: 'rgba(232,201,106,0.10)',
              border: '1px solid rgba(232,201,106,0.30)',
              borderRadius: 999,
              color: '#E8C96A',
              fontFamily: T.sans,
              fontSize: 12.5,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 11 }}>{expanded ? '▴' : '▾'}</span>
            {expanded ? 'Hide the full thinking' : 'Show me the full thinking'}
          </button>
          {expanded && (
            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: '1px solid rgba(232,201,106,0.18)',
              }}
            >
              <TracyBody
                text={brief.dossier_markdown!}
                style={{
                  fontFamily: T.sans,
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: T.textSoft,
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AssistantBubble({ turn }: { turn: ConvTurn }) {
  const { t } = useI18n();
  const { body, action } = splitActionLine(turn.text);
  // Show the rich animated indicator while we're waiting on Tracy AND have
  // no text yet. Once tokens start streaming the indicator gives way to the
  // body. Progress line (parsing → looking up → composing) renders below
  // the avatar pulse + dots so the principal sees what Tracy is actually
  // doing, not just that something is happening.
  const isThinking = turn.pending && !turn.text && !turn.error;
  const progressLine = (() => {
    if (!turn.progress) return null;
    const { phase, vars } = turn.progress;
    // Defensive — only call t() with a key shape that exists; unknown phases
    // fall back to the dots-only treatment in ThinkingIndicator.
    const key = `tracy.progress.${phase}`;
    try {
      // useI18n's t() takes the key + interpolation vars and returns the
      // formatted string. If the key doesn't exist (e.g. a future server
      // emits an unknown phase) it returns the key itself, which we detect.
      const rendered = t(key as Parameters<typeof t>[0], vars);
      if (rendered === key) return null;
      return rendered;
    } catch {
      return null;
    }
  })();

  // Pre-text state — pulsing avatar + animated dots + (optional) progress.
  // The whole row is replaced by the static avatar + body once tokens land.
  if (isThinking) {
    return (
      <ThinkingIndicator
        size={36}
        progressLine={progressLine}
        ariaLabel={t('tracy.thinkingAria')}
      />
    );
  }

  return (
    <div
      style={{ display: 'flex', alignItems: 'flex-start', gap: 14, width: '100%' }}
    >
      <TracyAvatar size={36} />
      <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
        {/* Session 135 — parent-meeting brief renders at the top of the turn.
            Brief is shown by default; dossier collapses behind a disclosure.
            See prepare_parent_meeting tool + meeting_brief SSE event. */}
        {turn.meetingBrief && (
          <MeetingBriefCard brief={turn.meetingBrief} />
        )}
        {/* Body prose (everything except the closing action line). Fenced
            code blocks render as CopyableMessageCard via TracyBody. */}
        {body && (
          <TracyBody
            text={body}
            style={{
              fontFamily: T.sans,
              fontSize: 14.5,
              lineHeight: 1.7,
              color: T.textSoft,
            }}
          />
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

        {/* Upgrade prompt — when school is Free tier, render a friendly card
            with a CTA to activate billing. Replaces the red error toast for
            the 402 case, which is a billing state not a bug. */}
        {turn.error && turn.requiresUpgrade && (
          <div
            style={{
              marginTop: body ? 12 : 0,
              padding: '16px 18px',
              background: 'rgba(232,201,106,0.10)',
              border: '1px solid rgba(232,201,106,0.32)',
              borderRadius: 14,
              color: 'rgba(255,255,255,0.92)',
              fontSize: 13.5,
              lineHeight: 1.55,
            }}
          >
            <p style={{ margin: 0, fontWeight: 600, color: '#E8C96A' }}>
              ✨ {t('tracy.upgrade.title')}
            </p>
            <p style={{ margin: '8px 0 14px', color: 'rgba(255,255,255,0.78)' }}>
              {t('tracy.upgrade.body')}
            </p>
            <a
              href="/montree/admin/billing"
              style={{
                display: 'inline-block',
                padding: '10px 18px',
                background: 'linear-gradient(135deg, #34d399, #10b981)',
                color: '#0a1a0f',
                fontWeight: 600,
                fontSize: 13.5,
                textDecoration: 'none',
                borderRadius: 10,
              }}
            >
              {t('tracy.upgrade.cta')} →
            </a>
          </div>
        )}

        {/* Error path — quiet but visible (non-upgrade errors only) */}
        {turn.error && !turn.requiresUpgrade && (
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
  const { t, locale } = useI18n();

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

  // 🚨 Perf Tier 2.1 (PERF_HEALTH_CHECK.md) — SSE token rAF throttle.
  // Without this, every SSE token from Tracy triggered a setTurns call →
  // O(N) render of the entire conversation per token → CPU spikes during
  // streaming. Now tokens accumulate in pendingTextRef and one rAF flush
  // per frame applies the buffered chunk. ~80% CPU reduction during stream.
  const pendingTextRef = useRef('');
  const rafIdRef = useRef<number | null>(null);

  // 🚨 Perf Tier 2.2 (safe half — PERF_HEALTH_CHECK.md): AbortController
  // for the in-flight SSE stream. Aborted on unmount, on "New conversation"
  // (convId change), and at the start of every submit() so a previous slow
  // stream doesn't interleave tokens into the new conversation.
  //
  // The retry-with-resume part of Tier 2.2 is deferred — it needs real VPN-
  // drop testing. This commit lands the memory-leak fix only.
  const streamControllerRef = useRef<AbortController | null>(null);

  // School-scoped storage keys — built once on mount. If we end up with no
  // schoolId (no logged-in principal), the page redirects to login.
  const keysRef = useRef<TracyStorageKeys | null>(null);

  // ── Initial load ────────────────────────────────────────────────────
  useEffect(() => {
    const principalData = localStorage.getItem('montree_principal');
    if (!principalData) {
      router.replace('/montree/login-select');
      return;
    }

    // Resolve the school's storage namespace. Without a schoolId we can't
    // safely read or write conversation state — bail to login.
    const schoolId = getSchoolIdFromStorage();
    if (!schoolId) {
      router.replace('/montree/login-select');
      return;
    }
    const keys = tracyKeys(schoolId);
    keysRef.current = keys;

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

  // Persist conversation on every change — uses the school-scoped keys
  // resolved at mount.
  useEffect(() => {
    if (convId && keysRef.current) writeConv(keysRef.current, convId, turns);
  }, [convId, turns]);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns]);

  // 🚨 Perf Tier 6.2 (PERF_HEALTH_CHECK.md) — iOS keyboard handling.
  // When the soft keyboard slides in, visualViewport shrinks. Re-scroll to
  // bottom so the latest message + input stay visible above the keyboard.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const handler = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    };
    vv.addEventListener('resize', handler);
    return () => vv.removeEventListener('resize', handler);
  }, []);

  const startNewConversation = useCallback(() => {
    const id = newConvId();
    setConvId(id);
    setTurns([]);
    const keys = keysRef.current;
    if (keys) {
      try {
        localStorage.setItem(keys.conversationId, id);
        if (convId) localStorage.removeItem(keys.conversation(convId));
      } catch {
        // ignore
      }
    }
    inputRef.current?.focus();
  }, [convId]);

  // Flush any buffered token text from pendingTextRef into setTurns. Called
  // by requestAnimationFrame and synchronously by handleEvent before non-text
  // events apply (so token order is preserved relative to tool calls / done).
  const flushTextBuffer = useCallback(() => {
    rafIdRef.current = null;
    const pending = pendingTextRef.current;
    if (!pending) return;
    pendingTextRef.current = '';
    setTurns((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.role !== 'assistant') return prev;
      return [
        ...prev.slice(0, -1),
        { ...last, text: (last.text || '') + pending },
      ];
    });
  }, []);

  const handleEvent = useCallback((evt: Record<string, unknown>) => {
    // Fast path: text events buffer and schedule a single rAF flush. Multiple
    // tokens within one frame collapse into one setTurns call.
    if (evt.type === 'text') {
      pendingTextRef.current += String(evt.text || '');
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(flushTextBuffer);
      }
      return;
    }

    // Non-text event: drain any pending text synchronously so the next
    // setTurns sees it before applying the new event state.
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    const drained = pendingTextRef.current;
    pendingTextRef.current = '';

    setTurns((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.role !== 'assistant') return prev;

      const updated = {
        ...last,
        text: drained ? (last.text || '') + drained : last.text,
      };
      switch (evt.type) {
        case 'tool_call': {
          const tool: ToolEvent = {
            name: String(evt.tool || 'tool'),
            success: null,
          };
          updated.tools = [...(updated.tools || []), tool];
          // Clear any stale progress from a prior tool — fresh tool, fresh slate.
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
          if (phase) {
            updated.progress = { phase, vars };
          }
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
        case 'meeting_brief': {
          // Session 135 — structured brief + dossier from prepare_parent_meeting.
          // The brief renders inline at the top of the turn; the dossier
          // collapses behind a "Show me the full thinking" disclosure.
          const briefMd =
            typeof evt.brief_markdown === 'string' ? evt.brief_markdown : null;
          const dossierMd =
            typeof evt.dossier_markdown === 'string' ? evt.dossier_markdown : null;
          const childName =
            typeof evt.child_name === 'string' ? evt.child_name : null;
          const fromCache = !!evt.from_cache;
          updated.meetingBrief = {
            brief_markdown: briefMd,
            dossier_markdown: dossierMd,
            child_name: childName,
            from_cache: fromCache,
          };
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
          updated.error = String(evt.error || t('tracy.errors.transient'));
          break;
        }
      }

      return [...prev.slice(0, -1), updated];
    });
  }, [t, flushTextBuffer]);

  // Cancel any pending rAF on unmount so we don't run setTurns after teardown.
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  // 🚨 Tier 2.2 (safe half) — abort the SSE stream on unmount + on every
  // convId change. Without this, navigating to /classrooms mid-stream leaves
  // the fetch reading from a dead reader until the server times out — a real
  // memory + connection leak.
  useEffect(() => {
    return () => {
      if (streamControllerRef.current) {
        streamControllerRef.current.abort();
        streamControllerRef.current = null;
      }
    };
  }, [convId]);

  const submit = useCallback(async () => {
    const q = question.trim();
    if (!q || submitting || !convId) return;
    setSubmitting(true);

    // 🚨 Tier 2.2 (safe half) — abort any previous in-flight stream before
    // starting a new one. Prevents stale tokens from a slow previous request
    // bleeding into the new turn's bubble.
    if (streamControllerRef.current) {
      streamControllerRef.current.abort();
    }
    const controller = new AbortController();
    streamControllerRef.current = controller;

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
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          conversation_id: convId,
          history,
          locale,
        }),
      });

      if (res.status === 402) {
        const payload = await res.json().catch(() => ({}));
        const wantsUpgrade = payload?.requires_upgrade === true;
        setTurns((prev) =>
          prev.map((tt, i) =>
            i === prev.length - 1
              ? {
                  ...tt,
                  pending: false,
                  error: payload?.error || t('tracy.errors.tier'),
                  requiresUpgrade: wantsUpgrade,
                }
              : tt
          )
        );
        return;
      }
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setTurns((prev) =>
          prev.map((tt, i) =>
            i === prev.length - 1
              ? {
                  ...tt,
                  pending: false,
                  error: payload?.error || t('tracy.errors.transient'),
                }
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
                  error: t('tracy.errors.noStream'),
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

        let nlIdx;
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
      // 🚨 Tier 2.2 (safe half) — AbortError is intentional (we cancelled).
      // Don't surface it to the user as an error toast.
      if (err instanceof Error && err.name === 'AbortError') {
        // Caller (nav-away or new conversation) wanted this stream gone.
        // Drop the pending turn so the bubble doesn't stay stuck spinning.
        setTurns((prev) =>
          prev.map((tt, i) =>
            i === prev.length - 1 ? { ...tt, pending: false } : tt
          )
        );
        return;
      }
      console.error('[admin agent] stream error', err);
      setTurns((prev) =>
        prev.map((tt, i) =>
          i === prev.length - 1
            ? {
                ...tt,
                pending: false,
                error: t('tracy.errors.connection'),
              }
            : tt
        )
      );
    } finally {
      // Clear the controller if it's still the one we created — protects
      // against a brand-new submit() racing with this finally block.
      if (streamControllerRef.current === controller) {
        streamControllerRef.current = null;
      }
      setSubmitting(false);
    }
  }, [question, submitting, convId, turns, handleEvent, locale, t]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  // Resolve the greeting name. For "Tredoux Willemse" we want "Tredoux".
  // For "Principal Leu" / "Ms Chen" / etc. we want the full name —
  // splitting on space would render "Hi, Principal" which reads cold.
  // Must stay in sync with the same logic in the principal-agent route's
  // system-prompt name resolver.
  const greetingName = (() => {
    const fullName = (principal?.name || '').trim();
    if (!fullName) return '';
    const TITLE_PREFIXES = /^(principal|ms|mrs|mr|dr|prof|professor|teacher|head|director)\.?\s+/i;
    if (TITLE_PREFIXES.test(fullName)) return fullName;
    return fullName.split(' ')[0] || '';
  })();
  // Kept alias for the legacy prop name; underlying value now handles titles.
  const firstName = greetingName;

  return (
    <div style={{ fontFamily: T.sans, color: T.textSoft }}>
      {/* What's new since principal's last visit. Principal-scoped. */}
      <ChangelogModal audience="principal" />
      {/* Trial-expiring warning when subscription is in last 14 days of trial. */}
      <TrialExpiringBanner />
      {/* Tracy's proactive notice for stale classrooms / idle teachers / pending photos. */}
      <TracyProactiveCard />
      {/* ═══ Session 120 — Pending appointment invites banner ═══
          Surfaces appointment invites where the principal is primary host
          with response='pending'. Hides itself when empty. */}
      {principal?.id && (
        <PendingAppointmentsBanner viewer="staff" selfUserId={principal.id} />
      )}
      {/* Compact language switcher — the principal can change Tracy's language
          here and her next response is in that language. Sits above the thread
          aligned right so it doesn't compete with the empty-state greeting. */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 8,
        }}
      >
        <LanguageToggle />
      </div>

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
          <strong style={{ color: T.gold }}>{t('tracy.viewer.title')}</strong>{' '}
          {t('tracy.viewer.body', { school: school?.name || t('tracy.viewer.thisSchool') })}{' '}
          <a
            href="https://montree.xyz/pricing"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: T.gold, textDecoration: 'underline' }}
          >
            {t('tracy.viewer.upgradeLink')}
          </a>
          .
        </div>
      )}

      {/* Conversation thread — empty state OR a list of turns.
          Filter out the synthetic kickoff turns ('[GREETING]' / '[GREETING_FIRST]')
          that the cockpit-wide TracyFloat injects on first session login.
          The server logs them (super-admin sees them) but the principal
          shouldn't see her own kickoff prompt as a chat message. Tracy's
          reply is kept and rendered as the first assistant turn. */}
      {(() => {
        const visibleTurns = turns.filter(
          (turn) =>
            !(
              turn.role === 'user' &&
              (turn.text === '[GREETING]' || turn.text === '[GREETING_FIRST]')
            )
        );
        return (
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
            {visibleTurns.length === 0 ? (
              <EmptyState firstName={firstName} />
            ) : (
              visibleTurns.map((turn, i) =>
                turn.role === 'user' ? (
                  <UserBubble key={i} text={turn.text} />
                ) : (
                  <AssistantBubble key={i} turn={turn} />
                )
              )
            )}
          </div>
        );
      })()}

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
          onFocus={(e) => {
            // Tier 6.2: nudge the input into view after iOS keyboard animates in.
            const target = e.currentTarget;
            setTimeout(() => {
              target.scrollIntoView({ block: 'end', behavior: 'smooth' });
            }, 300);
          }}
          placeholder={t('tracy.placeholder')}
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
            {t('tracy.newConversation')}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !question.trim()}
            aria-label={t('tracy.sendAria')}
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
