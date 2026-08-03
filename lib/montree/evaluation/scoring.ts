/**
 * Montree Milestones — scoring.
 *
 * Pure functions. No I/O, no Supabase, no Date.now() in any code path that decides a band.
 * The server ALWAYS re-scores from the bank; a client-reported point total is stored for
 * audit and never trusted (ARCHITECTURE.md §6). Every rule below is from §2:
 *
 *   coverage  = administered evidence items / declared evidence items (for this form)
 *   coverage < 0.5                → "unassessed"  (excluded from every denominator)
 *   ratio     = points earned / points possible over the administered evidence
 *   ratio ≥ 0.80                  → "secure"
 *   0.40 ≤ ratio < 0.80           → "developing"
 *   ratio < 0.40                  → "emerging"
 *
 * MAP% = round_to_5( 100 × met / expected_assessed ), suppressed below n = 12, always
 * printed with its n. EFL MAP is computed and reported separately and is never merged
 * into the core figure.
 *
 * Nothing here ranks a child against another child. There are no percentiles, no norms
 * and no peer comparison anywhere in this file, by design.
 */
import { getBankIndex } from './bank';
import type {
  AgeBand, Band, BandOrUnassessed, BankIndex, BankItem, BankScoringConfig, DomainSummary,
  Expectation, FormCode, GrowthDelta, GrowthDirection, GrowthInputResult, GrowthSummary, MapResult, Milestone,
  MilestoneResult, RawItemResponse, ScoredItemResponse, SessionSummary, StrandSummary,
  TeacherOverride, Track, WindowCode,
} from './types';

/* ────────────────────────────────────────────────────────────────── constants */

export const BAND_RANK: Record<BandOrUnassessed, number> = {
  unassessed: -1,
  emerging: 0,
  developing: 1,
  secure: 2,
};

const BAND_BY_RANK: Band[] = ['emerging', 'developing', 'secure'];

/**
 * EFL MAP% is only published at A5.
 *
 * The n < 12 rule already forces this today (the bank carries 6 expected EFL milestones at
 * A3 and 8 at A4), but stating it explicitly means a future bank edit that adds EFL
 * milestones cannot silently start publishing an English percentage for a three-year-old,
 * whose English exposure is far too short and too variable for a percentage to mean anything.
 */
export const EFL_MAP_ELIGIBLE_BANDS: readonly AgeBand[] = ['A5'];

const EMPTY_COUNTS = (): Record<BandOrUnassessed, number> =>
  ({ emerging: 0, developing: 0, secure: 0, unassessed: 0 });

/* ────────────────────────────────────────────────────────────────── utilities */

export function roundToNearest(value: number, step: number): number {
  if (!Number.isFinite(value)) return 0;
  if (!step || step <= 1) return Math.round(value);
  return Math.round(value / step) * step;
}

/** ratio → band. The thresholds are conventional, not empirically calibrated. */
export function bandFromRatio(ratio: number, thresholds: { secure: number; developing: number }): Band {
  if (ratio >= thresholds.secure) return 'secure';
  if (ratio >= thresholds.developing) return 'developing';
  return 'emerging';
}

/** Best-fit chip for a set of bands: the mean rank, snapped back to a band. */
export function bestFitBand(counts: Record<BandOrUnassessed, number>): Band | null {
  const n = counts.emerging + counts.developing + counts.secure;
  if (n === 0) return null;
  const mean = (counts.developing * 1 + counts.secure * 2) / n;
  if (mean >= 1.5) return 'secure';
  if (mean >= 0.5) return 'developing';
  return 'emerging';
}

const sameSet = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
};

const sameSequence = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((x, i) => x === b[i]);

/* ───────────────────────────────────────────────────── item-level re-scoring */

/**
 * Re-score one response against the bank item. This is the only place points are decided.
 *
 * Practice items (`form: 'P'`) and Focus-module items that evidence no milestone are scored
 * for telemetry but contribute 0 possible points, so they can never move a band.
 */
export function scoreItemResponse(item: BankItem, raw: RawItemResponse): ScoredItemResponse {
  const administered = raw.administered !== false;
  const scored = item.scored !== false && item.type !== 'observation_checklist';
  const maxPoints = scored ? (item.scoring.maxPoints ?? 1) : 0;

  let pointsAwarded = 0;
  let isCorrect: boolean | null = null;
  let band: Band | undefined;

  if (!administered) {
    // Skipped by a stop rule or by the teacher ending early. Partial sessions are valid data.
    return {
      itemId: item.id,
      strandId: item.strandId,
      moduleId: item.moduleId,
      ageBand: item.ageBand,
      formCode: item.form,
      itemType: item.type,
      pointsAwarded: 0,
      pointsPossible: 0,
      isCorrect: null,
      administered: false,
      clientDisagreement: null,
      raw,
    };
  }

  switch (item.type) {
    case 'observation_checklist': {
      band = raw.band;
      break;
    }
    case 'teacher_scored_oral': {
      const scale = item.scoring.rubric?.scale ?? [0, 1, 2];
      const lo = Math.min(...scale);
      const hi = Math.max(...scale);
      const submitted = typeof raw.rubricScore === 'number' ? raw.rubricScore : null;
      if (submitted !== null) {
        pointsAwarded = Math.max(lo, Math.min(hi, Math.round(submitted)));
        isCorrect = pointsAwarded >= hi;
      } else {
        // No rubric level chosen — treated as not administered evidence, never as a zero.
        return {
          itemId: item.id,
          strandId: item.strandId,
          moduleId: item.moduleId,
          ageBand: item.ageBand,
          formCode: item.form,
          itemType: item.type,
          pointsAwarded: 0,
          pointsPossible: 0,
          isCorrect: null,
          administered: false,
          clientDisagreement: null,
          raw: { ...raw, administered: false, skippedReason: raw.skippedReason ?? 'no_rubric_level_recorded' },
        };
      }
      break;
    }
    case 'listen_do': {
      const key = item.scoring.correctSequence ?? item.scoring.correctOptionIds ?? [];
      const given = raw.sequence ?? raw.optionIds ?? [];
      isCorrect = item.scoring.correctSequence
        ? sameSequence(key, given)          // full credit only in the given order
        : sameSet(key, given);
      pointsAwarded = isCorrect ? maxPoints : 0;
      break;
    }
    case 'tap_choice':
    default: {
      const key = item.scoring.correctOptionIds ?? [];
      const given = raw.optionIds ?? (raw.sequence ?? []);
      isCorrect = key.length > 0 && sameSet(key, given);
      pointsAwarded = isCorrect ? maxPoints : 0;
      break;
    }
  }

  const clientPoints = typeof raw.clientPointsAwarded === 'number' ? raw.clientPointsAwarded : null;
  const disagreement =
    clientPoints !== null && clientPoints !== pointsAwarded
      ? { clientPointsAwarded: clientPoints, serverPointsAwarded: pointsAwarded }
      : null;

  return {
    itemId: item.id,
    strandId: item.strandId,
    moduleId: item.moduleId,
    ageBand: item.ageBand,
    formCode: item.form,
    itemType: item.type,
    pointsAwarded,
    pointsPossible: maxPoints,
    isCorrect,
    administered: true,
    band,
    clientDisagreement: disagreement,
    raw,
  };
}

export interface ScoreResponsesOutput {
  scored: ScoredItemResponse[];
  /** Item ids in the payload that do not exist in the bank — reported, never silently dropped. */
  unknownItemIds: string[];
  disagreements: ScoredItemResponse[];
}

export function scoreItemResponses(
  responses: RawItemResponse[],
  index: BankIndex = getBankIndex(),
): ScoreResponsesOutput {
  const scored: ScoredItemResponse[] = [];
  const unknownItemIds: string[] = [];
  for (const raw of responses) {
    const item = index.itemById.get(raw.itemId);
    if (!item) { unknownItemIds.push(raw.itemId); continue; }
    scored.push(scoreItemResponse(item, raw));
  }
  return { scored, unknownItemIds, disagreements: scored.filter((s) => s.clientDisagreement) };
}

/* ─────────────────────────────────────────────────── milestone-level banding */

export interface MilestoneScoringInput {
  ageBand: AgeBand;
  formCode: FormCode;
  scored: ScoredItemResponse[];
  /** milestoneId → teacher-chosen band, for observation milestones. */
  observations?: Array<{ milestoneId: string; band: Band; note?: string | null; evidenceMediaId?: string | null }>;
  overrides?: TeacherOverride[];
  index?: BankIndex;
  config?: BankScoringConfig;
}

export interface MilestoneScoringOutput {
  results: MilestoneResult[];
  warnings: string[];
}

/** Evidence items declared for this milestone ON THIS FORM (the honest denominator). */
export function declaredEvidenceForForm(milestone: Milestone, formCode: FormCode): string[] {
  const byForm = milestone.evidence.byForm?.[formCode];
  if (byForm && byForm.length) return byForm;
  return milestone.evidence.itemIds ?? [];
}

/**
 * Turn re-scored item responses + teacher observations into one band per milestone.
 *
 * Candidate milestones = every milestone at the child's own age band (this includes the
 * `extension` milestones, which live at the child's band with evidence in the band above)
 * PLUS any other milestone that actually received evidence in this sitting. Nothing that
 * was administered is dropped from the record.
 */
export function computeMilestoneResults(input: MilestoneScoringInput): MilestoneScoringOutput {
  const index = input.index ?? getBankIndex();
  const config = input.config ?? index.bank.scoring;
  const warnings: string[] = [];

  const byItemId = new Map<string, ScoredItemResponse>();
  for (const s of input.scored) byItemId.set(s.itemId, s);

  const observationByMilestone = new Map<string, { band: Band; note?: string | null; evidenceMediaId?: string | null }>();
  for (const o of input.observations ?? []) {
    if (!index.milestoneById.has(o.milestoneId)) {
      warnings.push(`observation for unknown milestone ${o.milestoneId} — ignored`);
      continue;
    }
    observationByMilestone.set(o.milestoneId, o);
  }
  // Observation items may also arrive through the ordinary item channel.
  for (const s of input.scored) {
    if (s.itemType !== 'observation_checklist' || !s.band || !s.administered) continue;
    const item = index.itemById.get(s.itemId);
    const milestoneId = item?.milestoneId;
    if (!milestoneId) continue;
    if (!observationByMilestone.has(milestoneId)) {
      observationByMilestone.set(milestoneId, {
        band: s.band,
        note: s.raw.note ?? null,
        evidenceMediaId: s.raw.evidenceMediaId ?? null,
      });
    }
  }

  const candidates = new Map<string, Milestone>();
  for (const m of index.bank.milestones) {
    if (m.ageBand === input.ageBand) candidates.set(m.id, m);
  }
  for (const m of index.bank.milestones) {
    if (candidates.has(m.id)) continue;
    if (observationByMilestone.has(m.id)) { candidates.set(m.id, m); continue; }
    const declared = declaredEvidenceForForm(m, input.formCode);
    if (declared.some((id) => byItemId.get(id)?.administered)) candidates.set(m.id, m);
  }

  const overrideByMilestone = new Map<string, TeacherOverride>();
  for (const o of input.overrides ?? []) {
    if (!o.reason || !o.reason.trim()) {
      warnings.push(`override for ${o.milestoneId} rejected — a reason is required`);
      continue;
    }
    if (!index.milestoneById.has(o.milestoneId)) {
      warnings.push(`override for unknown milestone ${o.milestoneId} — ignored`);
      continue;
    }
    overrideByMilestone.set(o.milestoneId, o);
  }

  const minCoverageDefault = config.minCoverage;
  const results: MilestoneResult[] = [];

  for (const milestone of candidates.values()) {
    const track = index.trackByDomainId.get(milestone.domainId) ?? 'core';
    const isObservation = Boolean(milestone.evidence.observationItemId) || Boolean(milestone.bandDescriptors);
    const observed = observationByMilestone.get(milestone.id);

    let bandComputed: BandOrUnassessed = 'unassessed';
    let bandSource: MilestoneResult['bandSource'] = isObservation ? 'observation' : 'direct';
    let coverage: number | null = null;
    let pointsEarned: number | null = null;
    let pointsPossible: number | null = null;
    let evidenceItemIds: string[] = [];
    let evidenceNote: string | null = null;
    let evidenceMediaId: string | null = null;

    if (milestone.evidence.observationItemId) {
      // 1:1 with a checklist item — the teacher chooses the band directly, best-fit.
      if (observed) {
        bandComputed = observed.band;
        coverage = 1;
        evidenceNote = observed.note ?? null;
        evidenceMediaId = observed.evidenceMediaId ?? null;
        evidenceItemIds = [milestone.evidence.observationItemId];
      } else {
        coverage = 0;
      }
      bandSource = 'observation';
    } else {
      const declared = declaredEvidenceForForm(milestone, input.formCode);
      const administered = declared
        .map((id) => byItemId.get(id))
        .filter((s): s is ScoredItemResponse => Boolean(s && s.administered && s.pointsPossible > 0));
      evidenceItemIds = administered.map((s) => s.itemId);
      coverage = declared.length ? administered.length / declared.length : 0;

      const minCoverage = milestone.evidence.minCoverage ?? minCoverageDefault;
      if (declared.length === 0) {
        warnings.push(`milestone ${milestone.id} declares no evidence for form ${input.formCode}`);
      }
      if (coverage >= minCoverage && administered.length > 0) {
        pointsEarned = administered.reduce((t, s) => t + s.pointsAwarded, 0);
        pointsPossible = administered.reduce((t, s) => t + s.pointsPossible, 0);
        const ratio = pointsPossible > 0 ? pointsEarned / pointsPossible : 0;
        bandComputed = bandFromRatio(ratio, config.milestoneThresholds);
      } else {
        bandComputed = 'unassessed';
      }

      // A teacher band on a direct milestone is legitimate evidence, not noise.
      if (observed) {
        if (bandComputed === 'unassessed') {
          bandComputed = observed.band;
          bandSource = 'observation';
          coverage = coverage ?? 0;
          evidenceNote = observed.note ?? null;
          evidenceMediaId = observed.evidenceMediaId ?? null;
        } else {
          warnings.push(
            `milestone ${milestone.id} has both direct evidence and a teacher band — direct kept; ` +
            'use an override with a reason to replace it',
          );
        }
      }
    }

    let bandFinal: BandOrUnassessed = bandComputed;
    let overrideReason: string | null = null;
    const override = overrideByMilestone.get(milestone.id);
    if (override) {
      bandFinal = override.band;
      bandSource = 'teacher_override';
      overrideReason = override.reason.trim();
    }

    results.push({
      milestoneId: milestone.id,
      strandId: milestone.strandId,
      domainId: milestone.domainId,
      track,
      ageBand: milestone.ageBand,
      expectation: milestone.expectation,
      bandComputed,
      bandFinal,
      bandSource,
      overrideReason,
      coverage: coverage === null ? null : Math.round(coverage * 1000) / 1000,
      pointsEarned,
      pointsPossible,
      evidenceNote,
      evidenceMediaId,
      evidenceItemIds,
    });
  }

  results.sort((a, b) => a.milestoneId.localeCompare(b.milestoneId));
  return { results, warnings };
}

/** Pure re-application of overrides to an existing result set (e.g. after a teacher edit). */
export function applyOverride(results: MilestoneResult[], overrides: TeacherOverride[]): MilestoneResult[] {
  const byMilestone = new Map(overrides.filter((o) => o.reason?.trim()).map((o) => [o.milestoneId, o]));
  return results.map((r) => {
    const o = byMilestone.get(r.milestoneId);
    if (!o) return r;
    return { ...r, bandFinal: o.band, bandSource: 'teacher_override', overrideReason: o.reason.trim() };
  });
}

/* ────────────────────────────────────────────── the Milestone Attainment Profile */

export interface MapOptions {
  track: Track;
  ageBand: AgeBand;
  config?: BankScoringConfig;
}

/**
 * MAP% — "securely met X% of the milestones typically expected at this age".
 *
 * Only `expected` milestones AT THE CHILD'S OWN BAND that were actually assessed enter the
 * denominator. `exceeded` counts secure `extension` milestones (band above) and is reported
 * beside the figure, never folded into it. Suppressed below n = 12; the unassessed count is
 * always returned so nothing is silently dropped.
 */
export function computeMAP(
  results: MilestoneResult[],
  options: MapOptions,
  bankIndex: BankIndex = getBankIndex(),
): MapResult {
  const config = options.config ?? bankIndex.bank.scoring;
  const inTrack = results.filter((r) => r.track === options.track);

  const counts = EMPTY_COUNTS();
  for (const r of inTrack) counts[r.bandFinal] += 1;

  const atBandExpected = inTrack.filter(
    (r) => r.expectation === 'expected' && r.ageBand === options.ageBand,
  );
  const assessed = atBandExpected.filter((r) => r.bandFinal !== 'unassessed');
  const met = assessed.filter((r) => r.bandFinal === 'secure').length;
  // `exceeded` counts ONLY extension milestones declared at the child's own band — those are
  // the ones whose evidence sits in the band above. An extension milestone belonging to a
  // younger band (e.g. reading CVC words, an extension at A3) is ordinary at-band work for a
  // four-year-old, and counting it would inflate "exceeded" with things the child did not exceed.
  const exceeded = inTrack.filter(
    (r) => r.expectation === 'extension' && r.ageBand === options.ageBand && r.bandFinal === 'secure',
  ).length;
  const unassessed = atBandExpected.length - assessed.length;
  const denominator = assessed.length;

  let suppressed = false;
  let suppressionReason: string | null = null;

  if (options.track === 'efl' && !EFL_MAP_ELIGIBLE_BANDS.includes(options.ageBand)) {
    suppressed = true;
    suppressionReason =
      `English attainment is not expressed as a percentage at ${options.ageBand}: too few expected ` +
      'milestones, and English exposure at this age is too short and too varied for a percentage to carry meaning. ' +
      'The milestone list is reported in full instead.';
  } else if (denominator === 0) {
    suppressed = true;
    suppressionReason = 'No milestones at this age band were assessed in this check-in.';
  } else if (denominator < config.mapSuppressionMinN) {
    suppressed = true;
    suppressionReason =
      `Fewer than ${config.mapSuppressionMinN} milestones were assessed (n = ${denominator}), ` +
      'so a percentage would be misleading. The milestone list is reported in full instead.';
  }

  return {
    track: options.track,
    mapPercent: suppressed ? null : roundToNearest((100 * met) / denominator, config.mapRounding),
    denominator,
    met,
    exceeded,
    unassessed,
    suppressed,
    suppressionReason,
    counts,
  };
}

/* ──────────────────────────────────────────────────── domain / strand roll-ups */

export function computeDomainSummaries(
  results: MilestoneResult[],
  bankIndex: BankIndex = getBankIndex(),
): DomainSummary[] {
  const config = bankIndex.bank.scoring;
  const byDomain = new Map<string, MilestoneResult[]>();
  for (const r of results) {
    const list = byDomain.get(r.domainId);
    if (list) list.push(r); else byDomain.set(r.domainId, [r]);
  }

  const out: DomainSummary[] = [];
  for (const domain of bankIndex.bank.domains) {
    const rows = byDomain.get(domain.id);
    if (!rows || rows.length === 0) continue;
    const counts = EMPTY_COUNTS();
    for (const r of rows) counts[r.bandFinal] += 1;
    const n = counts.emerging + counts.developing + counts.secure;
    const suppressed = n < config.domainBandMinN;
    out.push({
      domainId: domain.id,
      track: domain.track,
      n,
      counts,
      band: suppressed ? null : bestFitBand(counts),
      suppressed,
    });
  }
  return out;
}

export function computeStrandSummaries(
  results: MilestoneResult[],
  bankIndex: BankIndex = getBankIndex(),
): StrandSummary[] {
  const byStrand = new Map<string, MilestoneResult[]>();
  for (const r of results) {
    const list = byStrand.get(r.strandId);
    if (list) list.push(r); else byStrand.set(r.strandId, [r]);
  }
  const out: StrandSummary[] = [];
  for (const strand of bankIndex.bank.strands) {
    const rows = byStrand.get(strand.id);
    if (!rows || rows.length === 0) continue;
    const counts = EMPTY_COUNTS();
    for (const r of rows) counts[r.bandFinal] += 1;
    const n = counts.emerging + counts.developing + counts.secure;
    out.push({
      strandId: strand.id,
      domainId: strand.domainId,
      n,
      counts,
      band: bestFitBand(counts),
      englishMedium: strand.englishMedium === true,
    });
  }
  return out;
}

/* ───────────────────────────────────────────────────────── within-child growth */

/**
 * Within-child growth — the primary evidence in the Growth Story.
 *
 * Direction rules, stated plainly because a parent will read the totals:
 *   moved_up  — the band went up
 *   steady    — the band is unchanged and is developing or secure
 *   watching  — the band went down, OR it is unchanged at emerging (i.e. not yet moving)
 *   new / no_longer_assessed — assessed in only one of the two windows; reported, never hidden
 */
export function computeGrowth(
  previous: GrowthInputResult[],
  current: GrowthInputResult[],
  meta: { fromWindow?: WindowCode | null; toWindow?: WindowCode | null } = {},
): GrowthSummary {
  const prevByMilestone = new Map(previous.map((r) => [r.milestoneId, r]));
  const currByMilestone = new Map(current.map((r) => [r.milestoneId, r]));
  const ids = new Set<string>([...prevByMilestone.keys(), ...currByMilestone.keys()]);

  const deltas: GrowthDelta[] = [];
  let movedUp = 0, steady = 0, watching = 0, newlyAssessed = 0, noLongerAssessed = 0, comparable = 0;

  for (const id of [...ids].sort()) {
    const before = prevByMilestone.get(id);
    const after = currByMilestone.get(id);
    const from = before ? before.bandFinal : null;
    const to = after ? after.bandFinal : null;
    const domainId = after?.domainId ?? before?.domainId ?? '';
    const track: Track = after?.track ?? before?.track ?? 'core';

    const beforeAssessed = Boolean(from && from !== 'unassessed');
    const afterAssessed = Boolean(to && to !== 'unassessed');

    let direction: GrowthDirection;
    if (beforeAssessed && afterAssessed) {
      comparable += 1;
      const d = BAND_RANK[to as BandOrUnassessed] - BAND_RANK[from as BandOrUnassessed];
      if (d > 0) { direction = 'moved_up'; movedUp += 1; }
      else if (d < 0) { direction = 'watching'; watching += 1; }
      else if (to === 'emerging') { direction = 'watching'; watching += 1; }
      else { direction = 'steady'; steady += 1; }
    } else if (afterAssessed) {
      direction = 'new'; newlyAssessed += 1;
    } else if (beforeAssessed) {
      direction = 'no_longer_assessed'; noLongerAssessed += 1;
    } else {
      continue; // unassessed in both windows — there is nothing to say
    }

    deltas.push({ milestoneId: id, domainId, track, from, to, direction });
  }

  return {
    fromWindow: meta.fromWindow ?? null,
    toWindow: meta.toWindow ?? null,
    comparable,
    movedUp,
    steady,
    watching,
    newlyAssessed,
    noLongerAssessed,
    deltas,
  };
}

/* ──────────────────────────────────────────────────────────── session summary */

export interface SummariseInput {
  ageBand: AgeBand;
  formCode: FormCode;
  modules: string[];
  scored: ScoredItemResponse[];
  results: MilestoneResult[];
  growth?: GrowthSummary | null;
  index?: BankIndex;
}

/** The object written to `montree_evaluation_sessions.summary_json`. */
export function summariseSession(input: SummariseInput): SessionSummary {
  const index = input.index ?? getBankIndex();
  const core = computeMAP(input.results, { track: 'core', ageBand: input.ageBand }, index);
  const efl = computeMAP(input.results, { track: 'efl', ageBand: input.ageBand }, index);

  const counts = EMPTY_COUNTS();
  for (const r of input.results) counts[r.bandFinal] += 1;

  return {
    bankVersion: index.bank.bankVersion,
    bankChecksum: index.bank.bankChecksum,
    ageBand: input.ageBand,
    formCode: input.formCode,
    modules: input.modules,
    itemsAdministered: input.scored.filter((s) => s.administered).length,
    itemsSkipped: input.scored.filter((s) => !s.administered).length,
    core,
    efl,
    domains: computeDomainSummaries(input.results, index),
    strands: computeStrandSummaries(input.results, index),
    counts,
    overrideCount: input.results.filter((r) => r.bandSource === 'teacher_override').length,
    growth: input.growth ?? null,
  };
}

/**
 * Score a whole sitting end to end. The single entry point used by
 * `/complete` and `/import` so the two can never diverge.
 */
export function scoreSession(params: {
  ageBand: AgeBand;
  formCode: FormCode;
  modules: string[];
  responses: RawItemResponse[];
  observations?: Array<{ milestoneId: string; band: Band; note?: string | null; evidenceMediaId?: string | null }>;
  overrides?: TeacherOverride[];
  previousResults?: GrowthInputResult[];
  previousWindow?: WindowCode | null;
  currentWindow?: WindowCode | null;
  index?: BankIndex;
}): {
  scored: ScoredItemResponse[];
  results: MilestoneResult[];
  summary: SessionSummary;
  warnings: string[];
  unknownItemIds: string[];
} {
  const index = params.index ?? getBankIndex();
  const { scored, unknownItemIds } = scoreItemResponses(params.responses, index);
  const { results, warnings } = computeMilestoneResults({
    ageBand: params.ageBand,
    formCode: params.formCode,
    scored,
    observations: params.observations,
    overrides: params.overrides,
    index,
  });

  const growth = params.previousResults?.length
    ? computeGrowth(
        params.previousResults,
        results.map((r) => ({ milestoneId: r.milestoneId, domainId: r.domainId, track: r.track, bandFinal: r.bandFinal })),
        { fromWindow: params.previousWindow ?? null, toWindow: params.currentWindow ?? null },
      )
    : null;

  const summary = summariseSession({
    ageBand: params.ageBand,
    formCode: params.formCode,
    modules: params.modules,
    scored,
    results,
    growth,
    index,
  });

  if (unknownItemIds.length) {
    warnings.push(`${unknownItemIds.length} response(s) referenced item ids absent from bank ${index.bank.bankVersion}`);
  }

  return { scored, results, summary, warnings, unknownItemIds };
}

/* ─────────────────────────────────────────────────────────── cohort aggregation */

export interface CohortRow {
  childId: string;
  mapPercent: number | null;
  denominator: number;
  suppressed: boolean;
}

/**
 * Cohort attainment. Individual suppressed sessions are excluded from the mean and counted
 * in the transparency block — a suppressed child is never quietly treated as a zero.
 */
export function aggregateCohortMap(
  rows: CohortRow[],
  minChildren: number,
): { mean: number | null; median: number | null; denominatorMean: number | null; n: number; suppressed: boolean; reason: string | null } {
  const usable = rows.filter((r) => !r.suppressed && typeof r.mapPercent === 'number');
  const n = usable.length;
  if (n === 0) {
    return { mean: null, median: null, denominatorMean: null, n: 0, suppressed: true, reason: 'No check-ins in this cohort carried a reportable figure.' };
  }
  if (n < minChildren) {
    return {
      mean: null, median: null, denominatorMean: null, n, suppressed: true,
      reason: `Only ${n} children in scope (minimum ${minChildren}). A cohort figure this small identifies individuals and is not reported.`,
    };
  }
  const values = usable.map((r) => r.mapPercent as number).sort((a, b) => a - b);
  const mean = values.reduce((t, v) => t + v, 0) / n;
  const median = n % 2 ? values[(n - 1) / 2] : (values[n / 2 - 1] + values[n / 2]) / 2;
  const denominatorMean = usable.reduce((t, r) => t + r.denominator, 0) / n;
  return {
    mean: Math.round(mean * 10) / 10,
    median: Math.round(median * 10) / 10,
    denominatorMean: Math.round(denominatorMean * 10) / 10,
    n,
    suppressed: false,
    reason: null,
  };
}

export const BANDS: readonly Band[] = BAND_BY_RANK;
export type { Expectation, GrowthInputResult };
