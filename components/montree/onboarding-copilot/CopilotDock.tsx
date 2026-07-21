// components/montree/onboarding-copilot/CopilotDock.tsx
// The Onboarding Copilot ("The Guide") — a floating pill that expands into a
// guide card. Speaks as Astra (principal) / Guru (teacher). Coded steps are
// ground truth; the AI (Haiku) only answers free-form questions inside the
// current step's context. Derives completion from real DB state via the
// /state route, so established schools complete instantly and the dock retires
// itself. Mounted in the dashboard + admin layouts (dynamic, ssr:false).
//
// Landmines honoured (contract §7):
//   - Never un-completes a step client-side within a mount (high-watermark ref).
//   - Every failure path degrades to "render nothing" — never breaks a page.
//   - Keyframes via ONE top-level <style dangerouslySetInnerHTML> (Turbopack).
//   - Admin surface has no FeaturesProvider — the /state route is the sole gate.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles, X, ArrowUp, ArrowRight, Check } from 'lucide-react';
import { useI18n, type TranslationKey } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';
import {
  deriveJourney,
  type CopilotState,
  type DerivedJourney,
  type JourneyId,
} from '@/lib/montree/onboarding-copilot/journeys';
import AnchorPulse from './AnchorPulse';

// ── Canonical dark-forest tokens (copied verbatim from GuruChatThread) ──────
const T = {
  bg: '#0a1a0f',
  cardBg: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(52,211,153,0.15)',
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

// Routes where the copilot must NOT appear — the two teacher focus modes.
const EXCLUDED_ROUTES = new Set([
  '/montree/dashboard/capture',
  '/montree/dashboard/voice-onboarding',
]);

interface StateResponse {
  enabled: boolean;
  journey?: JourneyId;
  state?: CopilotState;
  progress_step_keys?: string[];
  dismissed?: boolean;
  completed_celebrated?: boolean;
}

type Overlay =
  | { kind: 'celebrate'; stepId: string; text: string }
  | { kind: 'complete'; text: string }
  | null;

interface AskTurn {
  role: 'user' | 'assistant';
  text: string;
}

// Apply the high-watermark: any step id ever derived done stays done (contract
// §7.3 — a transient empty API response must not regress the journey). Recompute
// current / doneCount / completed from the watermarked steps.
function applyWatermark(d: DerivedJourney, wm: Set<string>): DerivedJourney {
  const steps = d.steps.map((s) => (wm.has(s.id) ? { ...s, done: true } : s));
  const firstIdx = steps.findIndex((s) => !s.done && !s.skipped);
  const withCurrent = steps.map((s, i) => ({ ...s, current: i === firstIdx }));
  const currentStep =
    firstIdx >= 0 ? { ...withCurrent[firstIdx], index: firstIdx } : null;
  const doneCount = withCurrent.filter((s) => s.done || s.skipped).length;
  return {
    journey: d.journey,
    steps: withCurrent,
    currentStep,
    completed: firstIdx < 0,
    totalVisible: d.totalVisible,
    doneCount,
  };
}

// Parse **bold** markers into styled spans. The i18n values keep the ** markers
// (contract §4); we render them here.
function renderBold(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ fontWeight: 600, color: T.emerald }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function CopilotDock({
  surface,
}: {
  surface: 'teacher' | 'principal';
}) {
  const { t, locale } = useI18n();
  const pathname = usePathname() || '';
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<StateResponse | null>(null);
  const [derived, setDerived] = useState<DerivedJourney | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [hidden, setHidden] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // Anchor geometry (contract §2 — dock lives TOP-LEFT so it hands over from
  // the funnel narrator). Measured from the surface's own header so the pill
  // never overlaps the dashboard header / admin sidebar. Purely positional —
  // no behavioural change.
  const [dockTop, setDockTop] = useState(76);
  const [isWide, setIsWide] = useState(false);

  // Ask box
  const [askThread, setAskThread] = useState<AskTurn[]>([]);
  const [askInput, setAskInput] = useState('');
  const [asking, setAsking] = useState(false);
  const askScrollRef = useRef<HTMLDivElement>(null);

  // 2026-07-21: explicit "I did it — what's next?" affordance. The dock already
  // auto-detects completion; this just lets the user ask for a re-check now.
  const [checking, setChecking] = useState(false);
  const [notYet, setNotYet] = useState(false);

  // Refs that async fetch closures read (kept fresh across renders).
  const doneWatermarkRef = useRef<Set<string>>(new Set());
  const prevCurrentStepIdRef = useRef<string | null>(null);
  const overlayRef = useRef(false);
  const fetchingRef = useRef(false);
  const queuedRef = useRef(false);
  const processRef = useRef<(json: StateResponse | null) => void>(() => {});
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Track viewport for desktop panel vs mobile bottom-sheet.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 640px)');
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Measure the top offset so the dock sits just below the surface's header
  // (teacher: [data-dashboard-header]; admin: sticky mobile bar <960, no bar
  // on desktop). Re-measured on resize / orientation. Guru-viewport pattern.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const measure = () => {
      const wide = window.innerWidth >= 960;
      setIsWide(wide);
      if (surface === 'teacher') {
        const h =
          document.querySelector('[data-dashboard-header]')?.getBoundingClientRect().height || 56;
        setDockTop(Math.round(h) + 12);
      } else if (wide) {
        // Desktop admin has no top bar; sit near the top of the content area.
        setDockTop(24);
      } else {
        const h =
          document.querySelector('.admin-mobile-bar')?.getBoundingClientRect().height || 56;
        setDockTop(Math.round(h) + 12);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [surface, mounted]);

  // Left offset: clear of the fixed 240px admin sidebar on desktop admin.
  const dockLeft =
    surface === 'principal' ? (isWide ? 256 : 12) : isMobile ? 12 : 16;

  const journey: JourneyId =
    data?.journey ?? (surface === 'principal' ? 'principal' : 'teacher');
  const personaName = journey === 'principal' ? 'Astra' : 'Guru';

  // Forward-declared refetch (assigned once doFetch is defined) so postProgress
  // can trigger a refresh after a write lands.
  const refetchRef = useRef<() => void>(() => {});

  // ── Post a progress row, then refetch (celebration / skip / dismiss / done) ─
  const postProgress = useCallback((jrny: JourneyId, stepKey: string) => {
    montreeApi('/api/montree/onboarding-copilot/progress', {
      method: 'POST',
      body: JSON.stringify({ journey: jrny, step_key: stepKey }),
    })
      .catch((err) => console.error('[Copilot] progress POST failed:', err))
      .finally(() => {
        // Refetch after the write lands so derived state reflects it.
        void refetchRef.current?.();
      });
  }, []);

  // ── Celebration (a live done-flip) ──────────────────────────────────────────
  const triggerCelebration = useCallback(
    (stepId: string, celebrateKey: string, jrny: JourneyId, teacherName?: string) => {
      const params: Record<string, string> = {};
      if (celebrateKey === 'copilot.p3.celebrate') {
        // Contract §4 P3: "{name} is in" substitutes the first logged-in
        // teacher's real name when known, else the "Your teacher" fallback.
        params.name = teacherName || tRef.current('copilot.p3.someone' as TranslationKey);
      }
      const text = tRef.current(celebrateKey as TranslationKey, params);
      overlayRef.current = true;
      setOverlay({ kind: 'celebrate', stepId, text });
      setExpanded(true);
      window.setTimeout(() => {
        overlayRef.current = false;
        setOverlay(null);
        postProgress(jrny, `celebrated:${stepId}`);
      }, 1800);
    },
    [postProgress]
  );

  // ── Completion moment (journey done, not yet celebrated on the server) ──────
  const triggerCompletion = useCallback(
    (jrny: JourneyId) => {
      const text = tRef.current(
        (jrny === 'principal'
          ? 'copilot.principal.complete'
          : 'copilot.teacher.complete') as TranslationKey
      );
      overlayRef.current = true;
      setOverlay({ kind: 'complete', text });
      setExpanded(true);
      window.setTimeout(() => {
        postProgress(jrny, '__completed__');
        setHidden(true); // Unmount for this mount; the server flag keeps it gone.
      }, 3000);
    },
    [postProgress]
  );

  // ── Process a /state response (flip detection + watermark) ──────────────────
  processRef.current = (json: StateResponse | null) => {
    if (!json || !json.enabled) {
      setData({ enabled: false });
      return;
    }
    if (json.dismissed) {
      setData(json);
      // Already dismissed BEFORE this mount (a returning session, not a live
      // dismiss-in-progress) — stop the focus/visibility/poll listeners now
      // rather than fetching /state forever on every tab focus for the rest
      // of the page's life. Live dismiss-in-progress sets `hidden` itself via
      // handleDismiss; this covers the "already dismissed" case on load.
      setHidden(true);
      return;
    }
    const jrny = json.journey as JourneyId;
    if (!jrny || !json.state) {
      setData({ enabled: false });
      return;
    }
    const raw = deriveJourney(jrny, json.state, json.progress_step_keys || []);
    // Already fully completed + celebrated in a PRIOR session (the common
    // case for an established school on every returning page load) — same
    // reasoning as the dismissed branch above: stop polling for the rest of
    // this page's life instead of fetching /state on every focus forever.
    if (raw.completed && json.completed_celebrated) {
      setData(json);
      setDerived(applyWatermark(raw, doneWatermarkRef.current));
      setHidden(true);
      return;
    }
    const wm = doneWatermarkRef.current;
    const prevCurrentId = prevCurrentStepIdRef.current;

    // Detect a live flip of the previously-current step (only celebrate then).
    let celebrateStep: { id: string; key: string } | null = null;
    if (prevCurrentId && !overlayRef.current) {
      const s = raw.steps.find((st) => st.id === prevCurrentId);
      if (
        s &&
        s.done &&
        !wm.has(prevCurrentId) &&
        !(json.progress_step_keys || []).includes(`celebrated:${prevCurrentId}`)
      ) {
        celebrateStep = { id: s.id, key: s.celebrateKey };
      }
    }

    // Grow the watermark with every currently-done step.
    for (const s of raw.steps) if (s.done) wm.add(s.id);
    const eff = applyWatermark(raw, wm);

    setData(json);
    setDerived(eff);
    prevCurrentStepIdRef.current = eff.currentStep?.id ?? null;

    if (celebrateStep) {
      const teacherName = json.state?.logged_in_teacher_names?.[0];
      triggerCelebration(celebrateStep.id, celebrateStep.key, jrny, teacherName);
    } else if (eff.completed && !json.completed_celebrated && !overlayRef.current) {
      triggerCompletion(jrny);
    }
  };

  // ── Single-flight fetch (with one queued refetch) ───────────────────────────
  const doFetch = useCallback(async () => {
    if (fetchingRef.current) {
      queuedRef.current = true;
      return;
    }
    fetchingRef.current = true;
    try {
      const res = await montreeApi('/api/montree/onboarding-copilot/state');
      if (!res.ok) return; // Keep prior data — never regress on a transient error.
      const json = (await res.json()) as StateResponse;
      processRef.current(json);
    } catch (err) {
      console.error('[Copilot] state fetch failed:', err);
      // Keep prior data — render nothing only on an authoritative enabled:false.
    } finally {
      fetchingRef.current = false;
      if (queuedRef.current) {
        queuedRef.current = false;
        void doFetch();
      }
    }
  }, []);
  refetchRef.current = doFetch;

  // Initial fetch + refetch on route change.
  useEffect(() => {
    if (!mounted || hidden) return;
    void doFetch();
  }, [mounted, hidden, pathname, doFetch]);

  // Refetch on tab focus / visibility. Stops once `hidden` (dismissed or
  // journey fully celebrated) — the dock persists at the layout level for the
  // whole session (it never literally unmounts on navigation), so without
  // this guard these listeners would poll the state route forever after
  // completion. `hidden` only ever flips true→stays true within a mount.
  useEffect(() => {
    if (!mounted || hidden) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') void doFetch();
    };
    const onFocus = () => void doFetch();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [mounted, hidden, doFetch]);

  // Poll every 20s while expanded AND the tab is visible. Same `hidden` guard.
  useEffect(() => {
    if (!mounted || hidden || !expanded) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void doFetch();
    }, 20000);
    return () => window.clearInterval(id);
  }, [mounted, hidden, expanded, doFetch]);

  // Reset the ask thread whenever the current step changes.
  const currentStepId = derived?.currentStep?.id ?? null;
  useEffect(() => {
    setAskThread([]);
    setAskInput('');
    setNotYet(false); // the step moved on — clear any "not yet" line.
  }, [currentStepId]);

  // ── "I did it — what's next?" — manual re-check via the single-flight fetch ──
  const handleDidIt = useCallback(async () => {
    if (checking) return;
    // prevCurrentStepIdRef is updated synchronously inside processRef.current,
    // so it reflects the post-refetch step id the instant doFetch resolves.
    const before = prevCurrentStepIdRef.current;
    setNotYet(false);
    setChecking(true);
    try {
      await refetchRef.current?.();
    } catch (err) {
      console.error('[Copilot] did-it refetch failed:', err);
    } finally {
      setChecking(false);
    }
    // Step unchanged → still incomplete. If it advanced, the celebrate/flip
    // logic already took over and this line stays hidden.
    if (before && prevCurrentStepIdRef.current === before) {
      setNotYet(true);
    }
  }, [checking]);

  // Keep the ask thread scrolled to the newest turn.
  useEffect(() => {
    if (askScrollRef.current) {
      askScrollRef.current.scrollTop = askScrollRef.current.scrollHeight;
    }
  }, [askThread, asking]);

  const handleAsk = useCallback(async () => {
    const q = askInput.trim();
    if (!q || asking) return;
    setAskThread((prev) => [...prev, { role: 'user', text: q }]);
    setAskInput('');
    setAsking(true);
    try {
      const res = await montreeApi('/api/montree/onboarding-copilot/ask', {
        method: 'POST',
        body: JSON.stringify({ question: q, journey, locale }),
      });
      if (!res.ok) throw new Error(`ask ${res.status}`);
      const j = await res.json();
      const answer =
        typeof j?.answer === 'string' && j.answer.trim()
          ? j.answer.trim()
          : t('copilot.card.askError');
      setAskThread((prev) => [...prev, { role: 'assistant', text: answer }]);
    } catch {
      // 429 budget, network, anything → coded fallback line, never a raw error.
      setAskThread((prev) => [
        ...prev,
        { role: 'assistant', text: t('copilot.card.askError') },
      ]);
    } finally {
      setAsking(false);
    }
  }, [askInput, asking, journey, locale, t]);

  const handleSkip = useCallback(
    (stepId: string) => {
      postProgress(journey, `skip:${stepId}`);
    },
    [journey, postProgress]
  );

  const handleDismiss = useCallback(() => {
    if (typeof window !== 'undefined' && !window.confirm(t('copilot.card.dismissConfirm'))) {
      return;
    }
    setHidden(true);
    postProgress(journey, '__dismissed__');
  }, [journey, postProgress, t]);

  // ── Drag-to-move (2026-07-21) ───────────────────────────────────────────────
  // Teachers demo / live-teach with the Guru card open and it sits on top of the
  // page; until now the only escape was close/dismiss. Now the expanded card AND
  // the collapsed pill can be dragged out of the way. Design:
  //   • Position is a PURELY VISUAL transform — an {x,y} px `offset` applied as
  //     translate3d on the dock's OUTERMOST fixed container. Transform beats
  //     re-anchoring: no layout thrash, and it composes with whatever left/top
  //     anchoring the funnel-handover logic already computed (dockLeft/dockTop,
  //     the mobile bottom-sheet, the admin-sidebar clearance) — we never touch
  //     that. Default {0,0} == today's exact position. Zero interaction with the
  //     step engine / watermark / overlays; drag state is not persisted server-
  //     side and every path degrades to "no movement" (contract §7 spirit).
  //   • Pointer Events + setPointerCapture → ONE code path for mouse AND touch
  //     (teachers live on iPads/phones). The drag HANDLE is the expanded card's
  //     header row only (Guru avatar + title + dots + ✕) and the whole collapsed
  //     pill — never the scrolling body or the ask-input. touchAction:'none' is
  //     scoped to the handle so the body still scrolls natively.
  //   • A >4px move threshold "arms" the drag; below it a press is a plain tap/
  //     click, so the ✕ close, the pill's expand, and the header double-tap all
  //     keep working with no stopPropagation gymnastics.
  //   • Clamp keeps ≥48px of the header on-screen on every edge, re-run on
  //     resize / rotation so a stale offset (e.g. saved on a larger monitor)
  //     snaps back into view instead of stranding the card off-screen.
  //   • Persisted to localStorage on drag END (never mid-move); read lazily on
  //     mount behind a typeof-window guard and re-clamped after paint.
  //   • Reset: double-click (mouse) or double-tap <300ms (touch) on the handle
  //     → offset {0,0} + clears the key.
  const DOCK_OFFSET_KEY = 'montree_copilot_dock_offset';
  const MIN_VISIBLE = 48; // px of the header that must stay on-screen per edge
  const DRAG_THRESHOLD = 4; // px of travel before a press becomes a drag

  const dockRef = useRef<HTMLElement | null>(null); // outermost fixed container
  const handleRef = useRef<HTMLElement | null>(null); // the header row (expanded)
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    baseLeft: number; // anchored left WITHOUT this drag's offset
    baseTop: number;
    width: number;
    headerH: number;
    startOffX: number;
    startOffY: number;
    armed: boolean;
  } | null>(null);
  const lastTapRef = useRef(0); // for touch double-tap detection

  // Clamp an offset so ≥MIN_VISIBLE px of the header stays inside the viewport
  // on every edge. `baseLeft/baseTop` are the anchored position with the offset
  // removed, so the bounds are stable regardless of the current offset.
  const clampOffset = useCallback(
    (
      offX: number,
      offY: number,
      baseLeft: number,
      baseTop: number,
      width: number,
      headerH: number
    ) => {
      if (typeof window === 'undefined') return { x: offX, y: offY };
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const minX = MIN_VISIBLE - width - baseLeft; // dragged left: keep right edge
      const maxX = vw - MIN_VISIBLE - baseLeft; // dragged right: keep left edge
      const minY = MIN_VISIBLE - headerH - baseTop; // dragged up: keep header
      const maxY = vh - MIN_VISIBLE - baseTop; // dragged down: keep header
      return {
        x: Math.min(Math.max(offX, minX), maxX),
        y: Math.min(Math.max(offY, minY), maxY),
      };
    },
    []
  );

  // Re-clamp the CURRENT offset against the live container rect (resize / restore).
  const reclamp = useCallback(() => {
    if (typeof window === 'undefined') return;
    const el = dockRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const headerH = handleRef.current
      ? handleRef.current.getBoundingClientRect().height
      : rect.height; // collapsed pill: the whole pill is the "header"
    setOffset((cur) => {
      const baseLeft = rect.left - cur.x;
      const baseTop = rect.top - cur.y;
      const c = clampOffset(cur.x, cur.y, baseLeft, baseTop, rect.width, headerH);
      return c.x === cur.x && c.y === cur.y ? cur : c;
    });
  }, [clampOffset]);

  const resetOffset = useCallback(() => {
    setOffset({ x: 0, y: 0 });
    setDragging(false);
    dragRef.current = null;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(DOCK_OFFSET_KEY);
      } catch {
        /* localStorage unavailable (private mode / quota) — ignore */
      }
    }
  }, []);

  const onDockPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button != null && e.button !== 0) return; // primary pointer only
      const el = dockRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const headerH = handleRef.current
        ? handleRef.current.getBoundingClientRect().height
        : rect.height;
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        baseLeft: rect.left - offset.x,
        baseTop: rect.top - offset.y,
        width: rect.width,
        headerH,
        startOffX: offset.x,
        startOffY: offset.y,
        armed: false,
      };
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* pointer may already be gone — capture is best-effort */
      }
    },
    [offset.x, offset.y]
  );

  const onDockPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d || d.pointerId !== e.pointerId) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (!d.armed) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return; // still a tap
        d.armed = true;
        setDragging(true); // disables the container transition (tracks 1:1)
      }
      setOffset(
        clampOffset(
          d.startOffX + dx,
          d.startOffY + dy,
          d.baseLeft,
          d.baseTop,
          d.width,
          d.headerH
        )
      );
    },
    [clampOffset]
  );

  const onDockPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d || d.pointerId !== e.pointerId) return;
      dragRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (d.armed) {
        setDragging(false); // re-enable the transition
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(DOCK_OFFSET_KEY, JSON.stringify(offset));
          } catch {
            /* ignore */
          }
        }
      } else {
        // No travel → a tap. Two taps <300ms apart == double-tap reset (touch).
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          lastTapRef.current = 0;
          resetOffset();
        } else {
          lastTapRef.current = now;
        }
      }
    },
    [offset, resetOffset]
  );

  // Restore a persisted offset on mount (client-only; SSR always renders {0,0}).
  // The reclamp effect below snaps a stale offset back into view after paint.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(DOCK_OFFSET_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        setOffset({ x: parsed.x, y: parsed.y });
      }
    } catch {
      /* corrupt / unavailable → keep {0,0} */
    }
  }, []);

  // Re-clamp on window resize / rotation so the dock can't be stranded.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('resize', reclamp);
    return () => window.removeEventListener('resize', reclamp);
  }, [reclamp]);

  // Re-clamp after a restore or a layout-mode change (mobile ↔ desktop, expand,
  // anchor move), on the next frame so the container has painted at its anchor.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = window.requestAnimationFrame(reclamp);
    return () => window.cancelAnimationFrame(id);
  }, [reclamp, offset.x, offset.y, expanded, isMobile, dockTop, dockLeft]);

  // ── Render gate ─────────────────────────────────────────────────────────────
  const excluded = EXCLUDED_ROUTES.has(pathname);
  const currentStep = derived?.currentStep ?? null;
  // 2026-07-21: fallback pulse. On the step's own route we pulse step.anchor as
  // before. OFF the route, if the step declares a fallbackAnchor (e.g.
  // 'more-menu' — the ⋯ menu is the path to most teacher routes) we pulse THAT
  // instead, so "Open ≡ More → Parents" lights the three-dot menu wherever the
  // teacher is. With no fallbackAnchor we keep pulsing step.anchor (e.g. the
  // camera, which lives in the header on every page) — no principal change.
  const pulseAnchor = currentStep
    ? pathname === currentStep.route
      ? currentStep.anchor
      : currentStep.fallbackAnchor ?? currentStep.anchor
    : undefined;
  const showPulse =
    !!pulseAnchor && !overlay && !excluded && mounted && !hidden;

  if (!mounted || hidden || excluded) return null;
  if (!data || !data.enabled || data.dismissed || data.completed_celebrated) return null;
  if (!derived) return null;
  // Completed with no overlay and nothing to celebrate → nothing to show.
  if (!currentStep && !overlay) return null;

  const panelPositioning: React.CSSProperties = isMobile
    ? {
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        maxHeight: '82dvh',
        borderRadius: '18px 18px 0 0',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }
    : {
        left: dockLeft,
        top: dockTop,
        width: 'min(380px, calc(100vw - 32px))',
        maxHeight: `calc(100dvh - ${dockTop + 24}px)`,
        borderRadius: 18,
      };

  return (
    <>
      {showPulse && pulseAnchor && <AnchorPulse anchor={pulseAnchor} />}

      {/* ── Collapsed pill ── */}
      {!expanded && currentStep && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          onDoubleClick={resetOffset}
          onPointerDown={onDockPointerDown}
          onPointerMove={onDockPointerMove}
          onPointerUp={onDockPointerUp}
          onPointerCancel={onDockPointerUp}
          ref={(el) => {
            dockRef.current = el;
          }}
          className="copilot-root"
          title="Drag to move · double-tap to reset"
          aria-label={t('copilot.pill.next', { title: t(currentStep.titleKey as TranslationKey) })}
          style={{
            position: 'fixed',
            left: dockLeft,
            top: dockTop,
            zIndex: 9000,
            // 2026-07-21: drag transform on the pill's fixed container.
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
            transition: dragging ? 'none' : undefined,
            touchAction: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            maxWidth: 'calc(100vw - 32px)',
            padding: '9px 14px 9px 10px',
            background: 'rgba(8,20,12,0.90)',
            border: `1px solid ${T.cardBorder}`,
            borderRadius: 999,
            backdropFilter: T.blur,
            WebkitBackdropFilter: T.blur,
            boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
            cursor: dragging ? 'grabbing' : 'grab',
            fontFamily: T.sans,
            color: T.textPrimary,
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              flexShrink: 0,
              background: T.emeraldStrong,
              border: '1px solid rgba(52,211,153,0.40)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: T.emerald,
            }}
          >
            <Sparkles size={15} strokeWidth={1.75} />
          </span>
          <span style={{ minWidth: 0, textAlign: 'left', lineHeight: 1.2 }}>
            <span
              style={{
                display: 'block',
                fontSize: 12.5,
                fontWeight: 500,
                color: T.textPrimary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 'calc(100vw - 120px)',
              }}
            >
              {t('copilot.pill.next', { title: t(currentStep.titleKey as TranslationKey) })}
            </span>
            <span style={{ display: 'block', fontSize: 11, color: T.emerald, marginTop: 1 }}>
              {t('copilot.pill.of', { done: derived.doneCount, total: derived.totalVisible })}
            </span>
          </span>
        </button>
      )}

      {/* ── Expanded card ── */}
      {expanded && (
        <div
          role="dialog"
          aria-label={personaName}
          className="copilot-root"
          ref={(el) => {
            dockRef.current = el;
          }}
          style={{
            position: 'fixed',
            zIndex: 9000,
            // 2026-07-21: drag transform on the card's outermost fixed container.
            // No touchAction here — the body must keep scrolling; only the header
            // handle sets touchAction:'none'. Transition off while dragging so the
            // card tracks the finger 1:1.
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
            transition: dragging ? 'none' : undefined,
            background: 'rgba(8,20,12,0.96)',
            border: `1px solid ${T.cardBorder}`,
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: T.sans,
            color: T.textPrimary,
            ...panelPositioning,
          }}
        >
          {/* Header — avatar + persona name + progress dots + collapse.
              2026-07-21: this row is the ONLY drag handle for the expanded card.
              The >4px threshold in the pointer handlers keeps the ✕ (and any
              future clickable) working as a normal tap. */}
          <div
            ref={(el) => {
              handleRef.current = el;
            }}
            onPointerDown={onDockPointerDown}
            onPointerMove={onDockPointerMove}
            onPointerUp={onDockPointerUp}
            onPointerCancel={onDockPointerUp}
            onDoubleClick={resetOffset}
            title="Drag to move · double-tap to reset"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderBottom: `1px solid ${T.cardBorder}`,
              background: 'rgba(0,0,0,0.18)',
              touchAction: 'none',
              userSelect: 'none',
              cursor: dragging ? 'grabbing' : 'grab',
            }}
          >
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                flexShrink: 0,
                background: T.emeraldStrong,
                border: '1px solid rgba(52,211,153,0.40)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: T.emerald,
              }}
            >
              <Sparkles size={15} strokeWidth={1.75} />
            </span>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                fontFamily: T.serif,
                fontSize: 16,
                letterSpacing: -0.2,
                color: T.textPrimary,
              }}
            >
              {personaName}
            </div>
            {/* Progress dots */}
            <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginRight: 4 }}>
              {derived.steps.map((s) => (
                <span
                  key={s.id}
                  aria-hidden
                  style={{
                    width: s.current ? 8 : 6,
                    height: s.current ? 8 : 6,
                    borderRadius: '50%',
                    background: s.done || s.skipped ? T.emerald : 'rgba(255,255,255,0.20)',
                    border: s.current ? '2px solid rgba(52,211,153,0.6)' : 'none',
                    boxSizing: 'content-box',
                    transition: 'all 150ms ease',
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label={t('common.cancel')}
              style={{
                background: 'transparent',
                border: 'none',
                color: T.textMuted,
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <X size={17} strokeWidth={1.75} />
            </button>
          </div>

          {/* Body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px 16px',
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
            }}
          >
            {overlay ? (
              // ── Celebration / completion moment ──
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  padding: '18px 6px 10px',
                }}
              >
                <span
                  className="copilot-sweep"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: T.emeraldStrong,
                    border: '1px solid rgba(52,211,153,0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: T.emerald,
                    marginBottom: 14,
                  }}
                >
                  <Check size={26} strokeWidth={2} />
                </span>
                <p
                  style={{
                    margin: 0,
                    fontFamily: T.serif,
                    fontSize: 15.5,
                    lineHeight: 1.5,
                    color: T.textPrimary,
                  }}
                >
                  {overlay.text}
                </p>
              </div>
            ) : currentStep ? (
              <>
                {/* Step title */}
                <h3
                  style={{
                    margin: '0 0 8px 0',
                    fontFamily: T.serif,
                    fontSize: 18,
                    fontWeight: 500,
                    lineHeight: 1.3,
                    letterSpacing: -0.2,
                    color: T.textPrimary,
                  }}
                >
                  {t(currentStep.titleKey as TranslationKey)}
                </h3>

                {/* Why */}
                <p
                  style={{
                    margin: '0 0 14px 0',
                    fontSize: 13.5,
                    lineHeight: 1.6,
                    color: T.textSecondary,
                  }}
                >
                  {t(currentStep.whyKey as TranslationKey)}
                </p>

                {/* Do this */}
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    color: T.emerald,
                    marginBottom: 8,
                  }}
                >
                  {t('copilot.card.doThis')}
                </div>
                <ol
                  style={{
                    margin: '0 0 14px 0',
                    padding: 0,
                    listStyle: 'none',
                    counterReset: 'copilot-step',
                  }}
                >
                  {currentStep.instructionKeys.map((k, i) => (
                    <li
                      key={i}
                      style={{
                        display: 'flex',
                        gap: 10,
                        marginBottom: 9,
                        fontSize: 13.5,
                        lineHeight: 1.55,
                        color: T.textPrimary,
                      }}
                    >
                      <span
                        style={{
                          flexShrink: 0,
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: T.emeraldSoft,
                          border: '1px solid rgba(52,211,153,0.25)',
                          color: T.emerald,
                          fontSize: 11.5,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: 1,
                        }}
                      >
                        {i + 1}
                      </span>
                      <span>{renderBold(t(k as TranslationKey))}</span>
                    </li>
                  ))}
                </ol>

                {/* Waiting line (P3) / generic waiting chip for waitState steps */}
                {currentStep.waitState &&
                  (() => {
                    const prefix = currentStep.titleKey.replace(/\.title$/, '');
                    const waitKey = `${prefix}.waiting`;
                    const names =
                      data.state?.pending_teacher_names &&
                      data.state.pending_teacher_names.length > 0
                        ? data.state.pending_teacher_names.join(', ')
                        : t('copilot.p3.someone');
                    const waitText = t(waitKey as TranslationKey, { names });
                    const hasWaitCopy = waitText !== waitKey;
                    return (
                      <div
                        className="copilot-waiting"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 12px',
                          background: T.emeraldSoft,
                          border: `1px solid ${T.cardBorder}`,
                          borderRadius: 12,
                          fontSize: 12.5,
                          lineHeight: 1.5,
                          color: T.textSecondary,
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: T.emerald,
                            flexShrink: 0,
                            animation: 'copilot-dot-pulse 1.4s ease-in-out infinite',
                          }}
                        />
                        <span>{hasWaitCopy ? waitText : t('copilot.card.waiting')}</span>
                      </div>
                    );
                  })()}

                {/* Take me there — hidden on step.route or for waitState steps */}
                {!currentStep.waitState && pathname !== currentStep.route && (
                  <button
                    type="button"
                    onClick={() => router.push(currentStep.route)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 4,
                      padding: '9px 16px',
                      background: 'linear-gradient(180deg, #34d399, #10b981)',
                      border: '1px solid rgba(52,211,153,0.55)',
                      borderRadius: 12,
                      color: '#06281a',
                      fontFamily: T.sans,
                      fontSize: 13.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: 'none',
                    }}
                  >
                    {t('copilot.card.takeMeThere')}
                    <ArrowRight size={15} strokeWidth={2} />
                  </button>
                )}

                {/* 2026-07-21: "I did it" — a quiet manual re-check. The dock
                    auto-detects completion, but this reassures the user and
                    reuses the single-flight doFetch. If the step completes, the
                    celebrate/flip logic takes over and this whole block unmounts. */}
                <div style={{ marginTop: 12 }}>
                  <div
                    style={{
                      fontSize: 11.5,
                      lineHeight: 1.5,
                      color: T.textMuted,
                      fontFamily: T.sans,
                      marginBottom: 5,
                    }}
                  >
                    {t('copilot.dock.tellMeDone')}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDidIt()}
                    disabled={checking}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: checking ? T.textMuted : T.emerald,
                      fontSize: 12.5,
                      textDecoration: 'underline',
                      cursor: checking ? 'default' : 'pointer',
                      padding: 0,
                      fontFamily: T.sans,
                    }}
                  >
                    {checking ? t('copilot.dock.checking') : t('copilot.dock.didIt')}
                  </button>
                  {notYet && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        lineHeight: 1.5,
                        color: T.textMuted,
                        fontFamily: T.sans,
                      }}
                    >
                      {t('copilot.dock.notYet')}
                    </div>
                  )}
                </div>

                {/* Skip (optional steps) */}
                {currentStep.optional && (
                  <div style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={() => handleSkip(currentStep.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: T.textMuted,
                        fontSize: 12.5,
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        padding: 0,
                        fontFamily: T.sans,
                      }}
                    >
                      {t('copilot.skipStep')}
                    </button>
                  </div>
                )}

                {/* Ask box */}
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 14,
                    borderTop: `1px solid ${T.cardBorder}`,
                  }}
                >
                  {(askThread.length > 0 || asking) && (
                    <div
                      ref={askScrollRef}
                      style={{
                        maxHeight: 150,
                        overflowY: 'auto',
                        marginBottom: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      {askThread.map((turn, i) => (
                        <div
                          key={i}
                          style={{
                            alignSelf: turn.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '88%',
                            padding: '8px 11px',
                            borderRadius:
                              turn.role === 'user'
                                ? '12px 12px 4px 12px'
                                : '12px 12px 12px 4px',
                            background:
                              turn.role === 'user'
                                ? 'rgba(255,255,255,0.06)'
                                : T.emeraldSoft,
                            border:
                              turn.role === 'user'
                                ? '1px solid rgba(255,255,255,0.10)'
                                : `1px solid ${T.cardBorder}`,
                            fontSize: 13,
                            lineHeight: 1.5,
                            color: T.textPrimary,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {turn.text}
                        </div>
                      ))}
                      {asking && (
                        <div
                          style={{
                            alignSelf: 'flex-start',
                            display: 'flex',
                            gap: 5,
                            padding: '10px 12px',
                            borderRadius: '12px 12px 12px 4px',
                            background: T.emeraldSoft,
                            border: `1px solid ${T.cardBorder}`,
                          }}
                        >
                          {[0, 1, 2].map((i) => (
                            <span
                              key={i}
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: T.emerald,
                                animation: 'copilot-dot-pulse 1.4s ease-in-out infinite',
                                animationDelay: `${i * 150}ms`,
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: 8,
                      padding: '6px 6px 6px 12px',
                      background: T.cardBg,
                      border: `1px solid ${T.cardBorder}`,
                      borderRadius: 14,
                    }}
                  >
                    <input
                      value={askInput}
                      onChange={(e) => setAskInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void handleAsk();
                        }
                      }}
                      placeholder={t(
                        (journey === 'principal'
                          ? 'copilot.card.askPlaceholder.principal'
                          : 'copilot.card.askPlaceholder.teacher') as TranslationKey
                      )}
                      maxLength={500}
                      disabled={asking}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        color: T.textPrimary,
                        fontFamily: T.sans,
                        fontSize: 13.5,
                        padding: '6px 0',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => void handleAsk()}
                      disabled={!askInput.trim() || asking}
                      aria-label="Send"
                      style={{
                        flexShrink: 0,
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background:
                          !askInput.trim() || asking
                            ? 'rgba(52,211,153,0.20)'
                            : 'linear-gradient(180deg, #34d399, #10b981)',
                        border: 'none',
                        color: !askInput.trim() || asking ? 'rgba(52,211,153,0.5)' : '#06281a',
                        cursor: !askInput.trim() || asking ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <ArrowUp size={16} strokeWidth={2.25} />
                    </button>
                  </div>
                </div>

                {/* Dismiss */}
                <div style={{ marginTop: 14, textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: T.textMuted,
                      fontSize: 11.5,
                      cursor: 'pointer',
                      padding: 0,
                      fontFamily: T.sans,
                    }}
                  >
                    {t('copilot.card.dismiss')}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes copilot-dot-pulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 1; } }
@keyframes copilot-sweep-in {
  0% { transform: scale(0.6); opacity: 0; }
  60% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.copilot-sweep { animation: copilot-sweep-in 0.5s ease-out both; }
.copilot-root ::placeholder { color: rgba(255,255,255,0.30); }
@media print { .copilot-root { display: none !important; } }
`,
        }}
      />
    </>
  );
}
