// lib/montree/guru/work-sequencer.ts
//
// SHELF PROPOSALS — presentation layer over the ONE guidance engine.
//
// 🚨 This file NO LONGER CHOOSES WORKS. Until 2026-09-06 it ran its own
// candidate scorer (a legacy 3-factor pass and a V3 8-factor pass with
// cross-area bridges, note analysis and age fit). Two engines meant two
// answers: the weekly replan advanced a child down the curriculum sequence
// while the Guru proposed whatever scored highest, and a teacher could be
// told two different "next works" for the same child on the same morning.
//
// The choice now comes from lib/montree/tracking/guidance.ts — sequence +
// status, deterministic, explainable (docs/tracking/TRACKING_CONSTITUTION.md
// rule 7). This file only:
//   1. assembles a Ledger from the caller's progress rows + the static
//      curriculum catalogue,
//   2. asks guidance.nextWorks() for the next work in every area, and
//   3. RANKS and EXPLAINS the answers for the Guru / Shelf Autopilot UI.
//
// The exported shapes (ShelfProposal, SequencerResult, V3ScoringData,
// ChildProgress, FocusWork, AREA_LABELS) are unchanged so the three callers —
// app/api/montree/shelf-autopilot/route.ts, lib/montree/guru/tool-executor.ts
// (get_prioritized_recommendations) and lib/montree/companion/next-step.ts —
// keep working untouched. `v3Data` is still accepted; its scoring inputs are
// deliberately ignored (they are exactly what could contradict the engine),
// while `observations`/age remain available to the callers' own copy.

import { loadWorksForArea, type CurriculumWork as CatalogWork } from '@/lib/montree/curriculum-loader';
import { AREA_LABELS_EN as _CENTRAL_EN } from '@/lib/montree/i18n/area-labels';
import type { ScoringTier } from './skill-graph';
import {
  areaLabel,
  nextWorks,
  normaliseArea,
  type AreaGuidance,
} from '@/lib/montree/tracking/guidance';
import { normaliseName } from '@/lib/montree/tracking/resolve';
import type { Child, CurriculumWork, Ledger, ProgressEvent, Status, WorkGroup } from '@/lib/montree/tracking/types';

// ---- Types (unchanged public surface) ----

export interface ShelfProposal {
  area: string;
  current_work: string | null;
  current_work_status: string | null;
  proposed_work: string;
  proposed_work_key: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  score: number;
  prerequisites_met: string[];
  category: string;
  // Additive fields kept for the Guru/Companion renderers.
  v3_score?: number;
  tier?: ScoringTier;
  reasons?: string[];
  bridge_from_area?: string;
  /** Which engine rule produced this proposal. */
  engine_reason?: AreaGuidance['reason'];
}

export interface SequencerResult {
  child_id: string;
  child_name: string;
  proposals: ShelfProposal[];
  areas_stable: string[];
  summary: string;
  /** Always false now: the 8-factor scorer is gone, the engine decides. */
  v3_active?: boolean;
  /** Extra offerings beyond the one-per-area shelf (today: Writing Shelf trays). */
  bridge_proposals?: ShelfProposal[];
}

/**
 * Legacy scoring inputs. Accepted for source compatibility; NOT used to pick
 * a work — the engine picks. `lastObservationByArea` is still honoured as a
 * date hint when a progress row carries no `updated_at`.
 */
export interface V3ScoringData {
  childAgeYears?: number;
  observations?: string[];
  strugglingWorkKeys?: string[];
  lastObservationByArea?: Record<string, string>;
}

export interface ChildProgress {
  work_name: string;
  work_key?: string;
  area: string;
  status: string; // mastered | practicing | presented | not_started
  /** Optional: when this row was last observed. Feeds the re-present rule. */
  updated_at?: string | null;
}

export interface FocusWork {
  area: string;
  work_name: string;
  work_id?: string;
  status?: string;
}

// ---- Constants ----

const AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

// Re-export for backward compat — canonical source is @/lib/montree/i18n/area-labels
export const AREA_LABELS: Record<string, string> = _CENTRAL_EN;

const VALID_STATUS = new Set<string>(['not_started', 'presented', 'practicing', 'mastered']);

/** A status the ladder does not know ('struggling') is still real activity. */
function toStatus(raw: string): Status | null {
  if (VALID_STATUS.has(raw)) return raw as Status;
  if (raw === 'struggling' || raw === 'in_progress') return 'practicing';
  return null;
}

function groupOf(workKey: string): WorkGroup {
  if (workKey.startsWith('dp:')) return 'dark-phonics';
  if (workKey.startsWith('ws:')) return 'writing-shelf';
  return 'other';
}

/** reason → how loudly the UI should say it. Deterministic, never a scorer. */
const REASON_SCORE: Record<AreaGuidance['reason'], number> = {
  're-present': 85,
  'gap-below': 75,
  'present-next': 60,
  'continue-practising': 0,
  'area-complete': 0,
};

const REASON_TIER: Record<AreaGuidance['reason'], ScoringTier> = {
  're-present': 'urgent',
  'gap-below': 'urgent',
  'present-next': 'recommended',
  'continue-practising': 'available',
  'area-complete': 'deferred',
};

// ---- Ledger assembly ----

interface Catalogued {
  works: CurriculumWork[];
  byKey: Map<string, CatalogWork>;
}

/** The static curriculum catalogue as the engine's works, one area at a time. */
export function catalogueWorks(): Catalogued {
  const works: CurriculumWork[] = [];
  const byKey = new Map<string, CatalogWork>();
  for (const area of AREAS) {
    for (const w of loadWorksForArea(area)) {
      if (byKey.has(w.work_key)) continue;
      byKey.set(w.work_key, w);
      works.push({
        work_key: w.work_key,
        name: w.name,
        area,
        sequence: w.sequence,
        group: groupOf(w.work_key),
      });
    }
  }
  return { works, byKey };
}

/**
 * progress rows (+ the catalogue) → a Ledger. One synthesised event per row:
 * the cache is all this caller has, and the engine only needs status + a date.
 * A row that resolves to no catalogue work is kept ONLY while it is in
 * progress, parked at the end of its area so it can be "continued" but can
 * never re-order the sequence.
 */
export function ledgerFromProgress(
  child: Child,
  progress: readonly ChildProgress[],
  catalogue: Catalogued,
  asOf: string,
  lastObservationByArea?: Record<string, string>
): Ledger {
  const byKey = new Map(catalogue.works.map((w) => [w.work_key, w]));
  const byName = new Map<string, CurriculumWork | null>();
  for (const w of catalogue.works) {
    const n = `${normaliseArea(w.area)}::${normaliseName(w.name)}`;
    byName.set(n, byName.has(n) ? null : w); // a duplicate name is ambiguous → drop
  }

  const works = [...catalogue.works];
  const events: ProgressEvent[] = [];
  const seen = new Set<string>();
  let extra = 0;

  for (const row of progress) {
    const status = toStatus(String(row.status ?? ''));
    if (!status || status === 'not_started') continue;
    const area = normaliseArea(row.area);
    const at = row.updated_at || lastObservationByArea?.[row.area] || asOf;

    let work: CurriculumWork | null | undefined =
      (row.work_key ? byKey.get(row.work_key) : undefined) ??
      byName.get(`${area}::${normaliseName(row.work_name ?? '')}`);

    if (!work) {
      // Off-catalogue work. Only meaningful while the child is on it.
      if (status === 'mastered') continue;
      work = {
        work_key: row.work_key || `custom:${area}:${normaliseName(row.work_name ?? '')}`,
        name: row.work_name,
        area,
        sequence: 990000 + extra++,
        group: 'other',
      };
      if (!byKey.has(work.work_key)) {
        byKey.set(work.work_key, work);
        works.push(work);
      }
    }

    if (seen.has(work.work_key)) continue;
    seen.add(work.work_key);
    events.push({
      child_id: child.id,
      classroom_id: null,
      work_key: work.work_key,
      work_name: work.name,
      area: work.area,
      old_status: null,
      new_status: status,
      source: 'import',
      actor: 'cache:montree_child_progress',
      created_at: at,
      reason: null,
      evidence_id: null,
    });
  }

  events.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.work_key!.localeCompare(b.work_key!));
  return { events, works, children: [child], classWeekLetter: '', weekStarts: [] };
}

// ---- Core ----

/**
 * Generate shelf proposals for a single child. Pure — no DB calls, no AI.
 * The work is chosen by lib/montree/tracking/guidance.ts; everything below
 * is presentation.
 */
export function generateShelfProposals(
  childId: string,
  childName: string,
  progress: ChildProgress[],
  focusWorks: FocusWork[],
  v3Data?: V3ScoringData,
): SequencerResult {
  const asOf = new Date().toISOString();
  const catalogue = catalogueWorks();
  const child: Child = { id: childId, name: childName, pronoun: 'they' };
  const ledger = ledgerFromProgress(child, progress, catalogue, asOf, v3Data?.lastObservationByArea);

  const focusMap = new Map<string, FocusWork>();
  for (const fw of focusWorks) focusMap.set(normaliseArea(fw.area), fw);

  const guidance = nextWorks(ledger, childId, { asOf, areas: AREAS });

  const proposals: ShelfProposal[] = [];
  const extras: ShelfProposal[] = [];
  const areasStable: string[] = [];

  for (const g of guidance) {
    if (g.track === 'main' && (g.reason === 'continue-practising' || g.reason === 'area-complete' || !g.next)) {
      areasStable.push(g.area);
      continue;
    }
    if (!g.next) continue;
    const proposal = toProposal(g, focusMap, catalogue);
    if (g.track === 'main') proposals.push(proposal);
    else extras.push(proposal);
  }

  // Deterministic ranking: loudest engine reason first, then curriculum order.
  const rank = (a: ShelfProposal, b: ShelfProposal) =>
    b.score - a.score || a.area.localeCompare(b.area) || a.proposed_work_key.localeCompare(b.proposed_work_key);
  proposals.sort(rank);
  extras.sort(rank);

  let summary: string;
  if (proposals.length === 0 && extras.length === 0) {
    summary = `${childName}'s shelf looks good — no changes needed`;
  } else {
    const areaNames = proposals.map((p) => AREA_LABELS[p.area] || p.area).join(', ');
    summary = `${proposals.length} shelf move${proposals.length === 1 ? '' : 's'} suggested${areaNames ? `: ${areaNames}` : ''}`;
    if (extras.length > 0) {
      summary += ` + ${extras.length} Writing Shelf tray${extras.length === 1 ? '' : 's'}`;
    }
  }

  return {
    child_id: childId,
    child_name: childName,
    proposals,
    areas_stable: areasStable,
    summary,
    v3_active: false,
    bridge_proposals: extras.length > 0 ? extras : undefined,
  };
}

function toProposal(
  g: AreaGuidance,
  focusMap: Map<string, FocusWork>,
  catalogue: Catalogued
): ShelfProposal {
  const next = g.next!;
  const focus = focusMap.get(g.area);
  const catalogWork = catalogue.byKey.get(next.work_key);
  const score = REASON_SCORE[g.reason];
  const reasons = [g.because, ...g.gaps.map((gap) => gap.because)];

  return {
    area: g.area,
    current_work: g.current?.name ?? focus?.work_name ?? null,
    current_work_status: g.current?.status ?? (focus ? 'assigned' : null),
    proposed_work: next.name,
    proposed_work_key: next.work_key,
    reason: g.because,
    confidence: score >= 75 ? 'high' : score >= 60 ? 'medium' : 'low',
    score,
    prerequisites_met: [],
    category: catalogWork?.category_name || '',
    v3_score: score,
    tier: REASON_TIER[g.reason],
    reasons,
    engine_reason: g.reason,
  };
}

/** Kept for callers that want the engine's own label for an area. */
export { areaLabel };
