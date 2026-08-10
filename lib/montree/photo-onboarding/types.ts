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

// ───────────────────────── DB rows ─────────────────────────

export type RosterImportSourceType = 'photo' | 'pdf' | 'docx' | 'xlsx';
export type RosterImportStatus =
  | 'pending' | 'extracting' | 'review' | 'committed' | 'failed';
export type RosterEntryKind = 'extracted' | 'departed';
export type RosterEntryAction = 'create' | 'update' | 'archive' | 'skip';
export type RosterMatchType = 'exact' | 'alias' | 'fuzzy' | 'none';

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
  counts: { create: number; update: number; archive: number };
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
}

export interface RosterErrorResponse {
  success: false;
  error: string;
}
