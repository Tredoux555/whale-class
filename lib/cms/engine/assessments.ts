// lib/cms/engine/assessments.ts
// ============================================================================
// STUB — signatures are real, bodies are not. Phase 4.
// ============================================================================
// Developmental observations recorded by a teacher, rolled up into a picture of
// where a child is. CMS is curriculum-agnostic on purpose: a domain is a string
// key supplied by the school, not a hard-coded Montessori tree.
//
// Every function here is PURE. Persistence belongs to the caller.

import type { ChildId, IsoDate, IsoDateTime } from './types';

export type ObservationLevel = 'introduced' | 'practising' | 'confident' | 'mastered';

export interface Observation {
  id: string;
  childId: ChildId;
  /** School-defined domain key, e.g. `fine_motor`, `language.oral`. */
  domain: string;
  level: ObservationLevel;
  note: string | null;
  observedAt: IsoDateTime;
  observedByName: string;
}

export interface DomainSummary {
  domain: string;
  level: ObservationLevel;
  observationCount: number;
  firstObservedAt: IsoDate;
  lastObservedAt: IsoDate;
  /** Level movement since the window opened: +1 = one level up. */
  trend: number;
}

export interface ChildAssessment {
  childId: ChildId;
  windowStart: IsoDate;
  windowEnd: IsoDate;
  domains: DomainSummary[];
  /** Domains with no observation in the window — the gaps a report must name. */
  unobservedDomains: string[];
}

/**
 * Collapse raw observations into one summary per domain for a date window.
 * Latest observation wins for `level`; `trend` compares it to the first in
 * the window. Domains listed in `expectedDomains` but never observed come back
 * in `unobservedDomains` rather than being silently dropped.
 */
export function summariseObservations(
  _childId: ChildId,
  _observations: Observation[],
  _window: { start: IsoDate; end: IsoDate },
  _expectedDomains: string[]
): ChildAssessment {
  throw new Error('assessments.summariseObservations: not implemented (phase 4)');
}

/**
 * Suggest the domains a teacher should look at next: the ones with the
 * staleest observation, weighted by how far below age-band expectation they sit.
 * Returns domain keys, highest priority first.
 */
export function suggestNextFocus(_assessment: ChildAssessment, _limit: number): string[] {
  throw new Error('assessments.suggestNextFocus: not implemented (phase 4)');
}
