// lib/lens/assessment/session-facts.ts
// Montree Lens — the per-session facts that are TRUE OF THE SITTING rather than
// of the child, plus the copy that has to be shown alongside them.
//
// Everything here exists because of one difference between Lens and Montree: in
// Montree the adult running the check-in is the child's own teacher, who has
// watched them for months. In Lens the adult is a visiting supervisor or
// consultant who may have met the child forty minutes ago. That difference is
// not cosmetic — it changes what the evidence can support:
//
//   • CO-RATING (co_rated). The observation module (M-OBS) asks an adult to rate
//     what they have "already seen". A stranger has seen nothing. EYFS and DEC
//     both put assessment over time in familiar settings at the centre of the
//     method, so M-OBS is only scheduled when the observer says, at setup, that
//     she is rating alongside an adult who knows the child. Otherwise those
//     milestones are simply not looked at this time, exactly as they are for a
//     teacher who chose not to run the module.
//
//   • SNAPSHOT FRAMING. One sitting with an unfamiliar adult is a snapshot. The
//     band profile stands — those milestones were seen — but the single overall
//     figure is not reported at all for a sitting that was not co-rated, because
//     a number invites exactly the longitudinal reading the sitting cannot bear.
//
//   • THE ALIAS IS NOT AN IDENTITY. See the notes on the alias helpers in
//     session-service.ts. Two children called Leo are two children.
//
// 🚨 THESE FACTS LIVE IN summary_json. There is no migration for them: the
// sessions table already carries a JSONB summary column, and finalizeSession
// merges them back over the scorer's own summary on every re-score (see
// mergeSessionFacts). If that merge is ever dropped, a completed check-in
// silently becomes "not co-rated" and starts hiding a figure it was allowed to
// show — so the merge is tested by its absence, loudly, rather than quietly.

import type { AgeBand, FormCode, SessionSummary } from '@/lib/montree/evaluation/types';

/* ─────────────────────────────────────────────────────────────────── facts */

/** The Lens-only keys stored beside the scorer's summary in `summary_json`. */
export interface LensSessionFacts {
  /** True when an adult who knows the child sat alongside for the ratings. */
  co_rated?: boolean;
  /** Free text: who that adult was, in the observer's own words. Never an id. */
  co_rater?: string | null;
}

/** What `lens_assessment_sessions.summary_json` may actually hold. */
export type LensSessionSummaryJson =
  | (SessionSummary & LensSessionFacts)
  | LensSessionFacts
  | Record<string, never>;

export interface ResolvedSessionFacts {
  coRated: boolean;
  coRater: string | null;
}

/**
 * Read the facts out of a summary_json blob.
 *
 * ABSENT MEANS NOT CO-RATED. Every session written before this field existed
 * reads as a snapshot, which is the conservative direction: an old row loses a
 * figure it should probably never have shown, rather than gaining a claim about
 * a co-rater who was never there.
 */
export function readSessionFacts(summaryJson: unknown): ResolvedSessionFacts {
  if (!summaryJson || typeof summaryJson !== 'object') return { coRated: false, coRater: null };
  const raw = summaryJson as LensSessionFacts;
  const coRater = typeof raw.co_rater === 'string' && raw.co_rater.trim() ? raw.co_rater.trim() : null;
  return { coRated: raw.co_rated === true, coRater };
}

/** The facts alone, in storage shape — what the create route inserts. */
export function buildSessionFacts(coRated: boolean, coRater: string | null): LensSessionFacts {
  return { co_rated: coRated, co_rater: coRated ? coRater : null };
}

/**
 * Carry the stored facts across a re-score.
 *
 * finalizeSession replaces summary_json wholesale with the scorer's own summary.
 * That summary knows nothing about co-rating, so without this the fact recorded
 * at setup would be destroyed the first time a check-in was finished.
 */
export function mergeSessionFacts(
  summary: SessionSummary,
  existing: unknown,
): SessionSummary & LensSessionFacts {
  const facts = readSessionFacts(existing);
  return { ...summary, co_rated: facts.coRated, co_rater: facts.coRater };
}

/* ────────────────────────────────────────────────── the observation module */

export const OBSERVATION_MODULE_ID = 'M-OBS';

/**
 * The module list a session may actually run.
 *
 * Applied on the SERVER at creation so the whole feature inherits it for free:
 * the bank projection is built from `modules`, the runner's step list is built
 * from the projection, the paper grid is built from the projection, and the
 * scorer is handed the same list. There is no second place to remember.
 */
export function allowedModules(requested: string[], coRated: boolean): string[] {
  if (coRated) return requested;
  return requested.filter((m) => m !== OBSERVATION_MODULE_ID);
}

/* ──────────────────────────────────────────────────────────────────── copy */
//
// Every string below was run through findForbiddenTerms() from
// lib/montree/evaluation/forbidden-terms.ts. None of them may reintroduce the
// testing register — no "score", no "test", no "marks", no "wrong".

export const CO_RATED_QUESTION = 'Is someone who knows this child sitting with you?';

export const CO_RATED_CHECKBOX =
  'I am rating together with an adult who knows this child well (their own teacher)';

export const CO_RATED_HELP =
  'The observation section asks what has already been seen over weeks in the room. If you have just ' +
  'met this child, you have not seen it. Leave this unticked and that section is left out — the rest ' +
  'of the check-in runs exactly the same.';

export const CO_RATER_LABEL = 'Who is rating with you? (optional)';

export const CO_RATER_PLACEHOLDER = 'e.g. Ms Nadia, the room’s lead teacher';

export const SNAPSHOT_BADGE = 'Single-session snapshot';

export const SNAPSHOT_HEADLINE = 'Single-session snapshot — not a full milestone profile';

export const SNAPSHOT_BODY =
  'One sitting, with an adult this child had not worked with before. The bands below are real — they ' +
  'are what was seen today — but a single visit cannot stand in for a picture built over a term by the ' +
  'people in the room. Read it as a conversation starter with their teacher, never as a verdict.';

export const CO_RATED_BODY =
  'Rated alongside an adult who knows this child, so the observation section could be included.';

export const MAP_WITHHELD_TITLE = 'Overall figure — not reported';

export const MAP_WITHHELD_BODY =
  'A single percentage from one snapshot sitting would read like a settled picture of a child, and it ' +
  'is not one. The band profile above is the honest form of what was seen today.';

/* ───────────────────────────────────────────── comparing two sittings ever */

export interface ComparableSession {
  age_band: AgeBand | string;
  form_code: FormCode | string;
}

/**
 * Reasons two sittings are not like-for-like.
 *
 * 🚨 FORMS ARE NOT EQUATED. Form A and Form B cover the same milestones with
 * different items, and no equating study has been run on them. A difference
 * between an A sitting and a B sitting is partly a difference between the forms.
 * A band change across a band boundary is likewise not a change in the child:
 * the expectations themselves moved.
 */
export function comparabilityFlags(a: ComparableSession, b: ComparableSession): string[] {
  const flags: string[] = [];
  if (a.age_band !== b.age_band) {
    flags.push(`Band changed (${a.age_band} → ${b.age_band}) — not a like-for-like comparison`);
  }
  if (a.form_code !== b.form_code) {
    flags.push(`Different forms (${a.form_code} and ${b.form_code}) — not directly comparable`);
  }
  return flags;
}

/* ────────────────────────────────────────────────── the alias-match warning */

export const POSSIBLE_MATCH_TITLE = 'Possible earlier check-ins with the same name — unconfirmed';

export const POSSIBLE_MATCH_BODY =
  'Lens keeps no roster, so these are simply earlier check-ins you filed under the same name at the ' +
  'same school. They may be a different child. Nothing is compared until you confirm they are the ' +
  'same person.';

export const POSSIBLE_MATCH_CONFIRM = 'Yes — same child, show them side by side';
