// lib/montree/photo-onboarding/types.ts
// Shared types for Photo Onboarding — DB row shapes, the extraction payload,
// and the API request/response payloads the review UI talks to.
//
// Photo Onboarding is Paper Scan's shape applied to a class list: upload →
// extract → reconcile against the live roster → teacher reviews a full diff →
// commit. Nothing touches montree_children until the commit route runs.

import type { FeatureKey } from '@/lib/montree/features/types';

/** Migration 325 adds the definition row (default ON). */
export const PHOTO_ONBOARDING_FEATURE_KEY: FeatureKey = 'photo_onboarding';

/** Storage bucket — same bucket media/upload and paper-scan write to. */
export const ROSTER_IMPORT_BUCKET = 'montree-media';

/** Storage path prefix inside the bucket. */
export const ROSTER_IMPORT_PATH_PREFIX = 'roster_imports';

/** montree_children.notes has a 5000-char cap enforced across the routes. */
export const CHILD_NOTES_MAX = 5000;

/** Separator used when APPENDING imported notes to a child's existing notes. */
export const NOTES_APPEND_SEPARATOR = '\n\n---\n';

/** Upload cap. A phone photo of a class list is well under this. */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/**
 * Fuzzy-match floor for treating an extracted name as the SAME child.
 * Mirrors student-matcher.ts's own internal 0.85 threshold — it never returns
 * a fuzzy result below that, so this is a belt-and-braces restatement.
 */
export const MATCH_CONFIDENCE_FLOOR = 0.85;

/**
 * Floor for treating an extracted name as MAYBE the same child — good enough
 * to ASK the teacher, never good enough to act on. See reconcile.ts for the
 * full outcome table.
 *
 * 🚨 THIS NUMBER WAS MEASURED, NOT GUESSED, and it is higher than it looks
 * like it should be. Jaro-Winkler is extremely generous on the short strings
 * given names actually are, and we take the best score over the WHOLE roster,
 * so the noise compounds. Scoring 40 unrelated given names against a 25-child
 * roster, the share that would be flagged as a possible match is:
 *
 *     floor 0.60 → 95%     floor 0.75 → 33%     floor 0.80 → 10%
 *     floor 0.70 → 60%     floor 0.78 → 23%     floor 0.82 → 10%
 *
 * A floor of 0.60 asks "is this actually Segina?" about nearly every genuinely
 * new child in the class, and because the review screen blocks Apply until
 * every possible match is answered, that turns a 25-child list into 24 forced
 * taps of "No". The band stops being information and becomes a toll gate.
 *
 * Real damage sits well above 0.80 anyway — a name that survived a misreading
 * or a re-spelling keeps its skeleton: 陈子涵/陈紫涵 0.80, 王小美/王小丽 0.82,
 * Jaxon/Jackson 0.83, Mohammed/Muhammad 0.85, Anneliese/Annalise 0.89,
 * Sejina/Segina 0.91 — while the closest unrelated pair in the sample
 * (Chloe/Charlotte) reached only 0.799. 0.80 is the gap between those two
 * populations, which makes [0.80, 0.85) a narrow, high-precision "please
 * check" band sitting directly under the auto-match floor.
 *
 * The dual-script case this feature was written for does NOT depend on this
 * number: "Amy 王小美" is caught by a near-exact score on a SEGMENT, which
 * reconcile.ts routes into the same band whatever the floor is set to.
 */
export const POSSIBLE_MATCH_FLOOR = 0.8;

// ───────────────────────── DB rows ─────────────────────────

export type RosterImportSourceType = 'photo' | 'pdf' | 'docx' | 'xlsx';
export type RosterImportStatus =
  | 'pending' | 'extracting' | 'review' | 'committed' | 'failed';
export type RosterEntryKind = 'extracted' | 'departed';
export type RosterEntryAction = 'create' | 'update' | 'archive' | 'skip';
/**
 * 'possible' is ours, not student-matcher's: a match we found but will not act
 * on until the teacher says so. It rides on the same TEXT column — migration
 * 325 declares match_type with no CHECK constraint, so no migration is needed
 * to introduce it.
 */
export type RosterMatchType = 'exact' | 'alias' | 'fuzzy' | 'possible' | 'none';

export interface RosterImportRow {
  id: string;
  school_id: string;
  classroom_id: string;
  created_by: string | null;
  source_type: RosterImportSourceType;
  storage_path: string | null;
  status: RosterImportStatus;
  error: string | null;
  committed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RosterImportEntryRow {
  id: string;
  import_id: string;
  kind: RosterEntryKind;
  name_raw: string | null;
  /**
   * The same child's name in the OTHER script, when the list carried both
   * ("Amy 王小美"). Added by migration 328 — entries written before it read
   * back as undefined, so every consumer must treat it as optional.
   */
  alternate_name?: string | null;
  date_of_birth: string | null;
  age: number | null;
  gender: string | null;
  notes: string | null;
  matched_child_id: string | null;
  match_confidence: number | null;
  match_type: string | null;
  suggested_action: RosterEntryAction;
  created_at: string;
}

/** Insert shape (id/created_at are DB defaults). */
export type RosterImportEntryInsert = Omit<RosterImportEntryRow, 'id' | 'created_at'>;

// ─────────────────── extraction payload ───────────────────
// Shape of the forced `class_list_extraction` tool call.

export interface ExtractedStudent {
  /** The name exactly as written on the list. Required — never null. */
  name: string;
  /**
   * The same child written in a second script, split out of a dual-script
   * entry ("Amy 王小美" → name "Amy", alternate_name "王小美"). Null when the
   * list gives one script only. Never invented — see CLASS_LIST_PROMPT.
   *
   * This is what lets reconcile match a bilingual list against a roster that
   * only ever stored one of the two names.
   */
  alternate_name?: string | null;
  /** ISO yyyy-mm-dd, or null when the written date is ambiguous/partial. */
  date_of_birth: string | null;
  age: number | null;
  gender: 'boy' | 'girl' | null;
  /** Parent-interview notes, secondary names, raw unparseable dates. */
  notes: string | null;
}

export interface ClassListExtraction {
  students: ExtractedStudent[];
  /** What the document is + how legible it was. Diagnostic only. */
  document_summary: string;
}

export interface ExtractClassListResult {
  result: ClassListExtraction;
  model: string;
  usage: { input_tokens?: number; output_tokens?: number } | null;
  stopReason: string | null;
}

// ─────────────────── reconciliation ───────────────────

/** An active child on the classroom's current roster. */
export interface RosterChild {
  id: string;
  name: string;
}

export interface ReconcileResult {
  entries: Array<Omit<RosterImportEntryInsert, 'import_id'>>;
  /**
   * `possible` is a SUBSET of `create` — a possible match is proposed as a
   * create until the teacher confirms it, so it is counted in both. Summing
   * create + update + archive still gives the total actionable rows.
   */
  counts: { create: number; update: number; archive: number; possible: number };
}

// ───────────────────────── API payloads ─────────────────────────

/** POST /api/montree/photo-onboarding/upload */
export interface RosterUploadResponse {
  success: true;
  import_id: string;
  source_type: RosterImportSourceType;
}

/** POST /api/montree/photo-onboarding/[importId]/extract */
export interface RosterExtractResponse {
  success: true;
  import_id: string;
  status: RosterImportStatus;
  create_count: number;
  update_count: number;
  archive_count: number;
}

/** GET /api/montree/photo-onboarding/[importId] — the polling endpoint. */
export interface RosterImportDetailResponse {
  success: true;
  import: RosterImportRow;
  entries: RosterImportEntryRow[];
  /** matched_child_id → current roster name, so the UI can show the diff. */
  children: Record<string, { id: string; name: string }>;
}

/** One reviewed row the teacher is applying. */
export interface RosterCommitEntryInput {
  id: string;
  action: RosterEntryAction;
  name?: string | null;
  date_of_birth?: string | null;
  age?: number | null;
  gender?: string | null;
  notes?: string | null;
  /**
   * A spelling of this child the teacher has just CONFIRMED (by answering
   * "same child" to a possible match) that the roster does not hold — the
   * other-script name, or the name as this year's list wrote it. Saved as a
   * classroom alias so next year's list matches without asking again.
   * Optional; older clients simply never send it.
   */
  save_alias?: string | null;
}

/** POST /api/montree/photo-onboarding/[importId]/commit */
export interface RosterCommitResponse {
  success: true;
  created: number;
  updated: number;
  archived: number;
  skipped: number;
  /** Rows that were meant to apply but errored. Surfaced, never swallowed. */
  failed: number;
  /** Name aliases learned from confirmed possible-matches. Never blocks a commit. */
  aliases_saved: number;
}

export interface RosterErrorResponse {
  success: false;
  error: string;
}
