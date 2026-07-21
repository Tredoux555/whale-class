// lib/montree/onboarding-copilot/journeys.ts
//
// Onboarding Copilot ("The Guide") — shared, PURE journey engine.
//
// 🚨 This module MUST run in the browser AND in node. Keep it pure:
//   - no I/O, no Date, no imports beyond types.
//   - copy lives in i18n (the *Key fields are i18n keys, never English strings).
//
// Imported by:
//   - the client dock (components/montree/onboarding-copilot/CopilotDock.tsx)
//   - the server ask + progress routes
// so both derive journey state identically from the same CopilotState.
//
// Contract: docs/handoffs/PLAN_ONBOARDING_COPILOT_JUL16.md §2 + §4 (PINNED).

export type JourneyId = 'principal' | 'teacher';

export interface CopilotState {           // returned by GET /state as `state`
  classrooms: number;
  classrooms_without_teacher: number;
  teachers: number;
  teachers_logged_in: number;             // last_login_at IS NOT NULL
  students: number;
  profiles_onboarded: number;             // montree_child_mental_profiles count for scope
  photos: number;                         // montree_media rows in scope
  photos_confirmed: number;               // teacher_confirmed = true
  parent_codes: number;                   // parent invites generated in scope
  reports_sent: number;                   // sent parent reports in scope
  tell_guru_enabled: boolean;             // feature flag tell_guru_onboarding
  pending_teacher_names: string[];        // teachers with last_login_at NULL (max 5)
  logged_in_teacher_names: string[];       // teachers with last_login_at NOT NULL (max 5) —
                                           // powers the P3 celebrate line's {name} substitution
                                           // (first logged-in teacher name, else "Your teacher").
}

export interface CopilotStep {
  id: string;
  route: string;                          // where the action happens ("Take me there")
  titleKey: string;                       // i18n key
  whyKey: string;
  instructionKeys: string[];              // ordered numbered instructions (each an i18n key)
  anchor?: string;                        // data-copilot value to pulse on step.route
  fallbackAnchor?: string;                // data-copilot value to pulse when the teacher is NOT on
                                          // step.route (e.g. 'more-menu' — the ⋯ menu is the path to
                                          // most step routes)
  waitState?: boolean;                    // true = user is waiting on someone else
  optional?: boolean;                     // skippable
  celebrateKey: string;                   // the line shown when this step flips done
  doneWhen: (s: CopilotState) => boolean;
}

export interface DerivedJourney {
  journey: JourneyId;
  steps: Array<CopilotStep & { done: boolean; skipped: boolean; current: boolean }>;
  currentStep: (CopilotStep & { index: number }) | null;  // null = all done
  completed: boolean;
  totalVisible: number;                   // steps after hiding (e.g. T2 hidden when tell_guru off)
  doneCount: number;
}

// ── PRINCIPAL journey (`copilot_principal`) — 6 steps ─────────────────────
const PRINCIPAL_STEPS: CopilotStep[] = [
  {
    id: 'classroom',
    route: '/montree/admin/classrooms',
    anchor: 'nav-classrooms',
    titleKey: 'copilot.p1.title',
    whyKey: 'copilot.p1.why',
    instructionKeys: ['copilot.p1.instruction1', 'copilot.p1.instruction2'],
    celebrateKey: 'copilot.p1.celebrate',
    doneWhen: (s) => s.classrooms >= 1,
  },
  {
    id: 'teacher',
    route: '/montree/admin/classrooms',
    anchor: 'nav-classrooms',
    titleKey: 'copilot.p2.title',
    whyKey: 'copilot.p2.why',
    instructionKeys: ['copilot.p2.instruction1', 'copilot.p2.instruction2', 'copilot.p2.instruction3'],
    celebrateKey: 'copilot.p2.celebrate',
    doneWhen: (s) => s.teachers >= 1 && s.classrooms_without_teacher === 0,
  },
  {
    id: 'handover',
    route: '/montree/admin/classrooms',
    anchor: 'teaching-team',
    waitState: true,
    titleKey: 'copilot.p3.title',
    whyKey: 'copilot.p3.why',
    instructionKeys: ['copilot.p3.instruction1', 'copilot.p3.instruction2', 'copilot.p3.instruction3'],
    celebrateKey: 'copilot.p3.celebrate',
    doneWhen: (s) => s.teachers_logged_in >= 1,
  },
  {
    id: 'students',
    route: '/montree/admin/classrooms',
    waitState: true,
    titleKey: 'copilot.p4.title',
    whyKey: 'copilot.p4.why',
    instructionKeys: ['copilot.p4.instruction1', 'copilot.p4.instruction2'],
    celebrateKey: 'copilot.p4.celebrate',
    doneWhen: (s) => s.students >= 1,
  },
  {
    id: 'first_photo',
    route: '/montree/admin/classrooms',
    waitState: true,
    titleKey: 'copilot.p5.title',
    whyKey: 'copilot.p5.why',
    instructionKeys: ['copilot.p5.instruction1', 'copilot.p5.instruction2'],
    celebrateKey: 'copilot.p5.celebrate',
    doneWhen: (s) => s.photos >= 1,
  },
  {
    id: 'first_report',
    route: '/montree/admin',
    waitState: true,
    titleKey: 'copilot.p6.title',
    whyKey: 'copilot.p6.why',
    instructionKeys: ['copilot.p6.instruction1', 'copilot.p6.instruction2'],
    celebrateKey: 'copilot.p6.celebrate',
    doneWhen: (s) => s.reports_sent >= 1,
  },
];

// ── TEACHER journey (`copilot_teacher`) — 6 steps ─────────────────────────
// `voice_intro` is hidden entirely (not rendered, not counted) when
// tell_guru_enabled === false — see deriveJourney().
const TEACHER_STEPS: CopilotStep[] = [
  {
    id: 'students',
    route: '/montree/dashboard/students',
    anchor: 'add-students',
    fallbackAnchor: 'more-menu',
    titleKey: 'copilot.t1.title',
    whyKey: 'copilot.t1.why',
    instructionKeys: ['copilot.t1.instruction1', 'copilot.t1.instruction2', 'copilot.t1.instruction3'],
    celebrateKey: 'copilot.t1.celebrate',
    doneWhen: (s) => s.students >= 1,
  },
  {
    id: 'voice_intro',
    route: '/montree/dashboard/voice-onboarding',
    optional: true,
    titleKey: 'copilot.t2.title',
    whyKey: 'copilot.t2.why',
    instructionKeys: ['copilot.t2.instruction1', 'copilot.t2.instruction2', 'copilot.t2.instruction3'],
    celebrateKey: 'copilot.t2.celebrate',
    doneWhen: (s) => s.profiles_onboarded >= 1,
  },
  {
    id: 'first_photo',
    route: '/montree/dashboard',
    anchor: 'camera',
    titleKey: 'copilot.t3.title',
    whyKey: 'copilot.t3.why',
    instructionKeys: ['copilot.t3.instruction1', 'copilot.t3.instruction2', 'copilot.t3.instruction3'],
    celebrateKey: 'copilot.t3.celebrate',
    doneWhen: (s) => s.photos >= 1,
  },
  {
    id: 'confirm',
    route: '/montree/dashboard/photo-audit',
    anchor: 'confirm-tab',
    fallbackAnchor: 'more-menu',
    titleKey: 'copilot.t4.title',
    whyKey: 'copilot.t4.why',
    instructionKeys: ['copilot.t4.instruction1', 'copilot.t4.instruction2', 'copilot.t4.instruction3'],
    celebrateKey: 'copilot.t4.celebrate',
    doneWhen: (s) => s.photos_confirmed >= 1,
  },
  {
    id: 'parents',
    route: '/montree/dashboard/parent-codes',
    anchor: 'parent-codes',
    fallbackAnchor: 'more-menu',
    titleKey: 'copilot.t5.title',
    whyKey: 'copilot.t5.why',
    instructionKeys: ['copilot.t5.instruction1', 'copilot.t5.instruction2', 'copilot.t5.instruction3'],
    celebrateKey: 'copilot.t5.celebrate',
    doneWhen: (s) => s.parent_codes >= 1,
  },
  {
    id: 'report',
    route: '/montree/dashboard/parent-codes',
    anchor: 'reports-pill',
    fallbackAnchor: 'more-menu',
    titleKey: 'copilot.t6.title',
    whyKey: 'copilot.t6.why',
    instructionKeys: ['copilot.t6.instruction1', 'copilot.t6.instruction2', 'copilot.t6.instruction3'],
    celebrateKey: 'copilot.t6.celebrate',
    doneWhen: (s) => s.reports_sent >= 1,
  },
];

/** Return the raw (undecorated) step list for a journey. Pure. */
export function getJourney(journey: JourneyId): CopilotStep[] {
  return journey === 'principal' ? PRINCIPAL_STEPS : TEACHER_STEPS;
}

/**
 * Derive the live journey view from real DB-derived state + the user's
 * progress rows. Pure — no I/O, no Date.
 *
 * Rules (contract §2):
 *   - a step is `skipped` if progressStepKeys contains `skip:<id>`.
 *   - skipped counts as done for progression.
 *   - teacher `voice_intro` is HIDDEN (not rendered, not counted) when
 *     tell_guru_enabled === false.
 *   - `current` = first step neither done nor skipped.
 *   - `completed` = no unresolved steps remain.
 */
export function deriveJourney(
  journey: JourneyId,
  state: CopilotState,
  progressStepKeys: string[]
): DerivedJourney {
  const skipSet = new Set(
    progressStepKeys
      .filter((k) => k.startsWith('skip:'))
      .map((k) => k.slice('skip:'.length))
  );

  const visible = getJourney(journey).filter((step) => {
    if (journey === 'teacher' && step.id === 'voice_intro' && !state.tell_guru_enabled) {
      return false;
    }
    return true;
  });

  const steps = visible.map((step) => ({
    ...step,
    done: step.doneWhen(state),
    skipped: skipSet.has(step.id),
    current: false,
  }));

  const currentIdx = steps.findIndex((s) => !s.done && !s.skipped);
  if (currentIdx >= 0) {
    steps[currentIdx].current = true;
  }

  const doneCount = steps.filter((s) => s.done || s.skipped).length;
  const completed = currentIdx === -1;
  const currentStep =
    currentIdx >= 0 ? { ...visible[currentIdx], index: currentIdx } : null;

  return {
    journey,
    steps,
    currentStep,
    completed,
    totalVisible: visible.length,
    doneCount,
  };
}
