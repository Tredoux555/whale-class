// lib/montree/paper-scan/types.ts
// Shared types for Paper Scan — DB row shapes, the vision extraction payload,
// and the API request/response payloads the review UI talks to.
//
// Paper Scan is voice-observation with an image instead of audio, so these
// mirror voice_observation_sessions / voice_observation_extractions closely.

import type { FeatureKey } from '@/lib/montree/features/types';

// 🚨 'paper_scan' is not yet a member of the FeatureKey union in
// lib/montree/features/types.ts (migration 308 adds the definition row).
// Add it to that union when shipping; this cast keeps the routes compiling in
// the meantime without touching a shared file the frontend also edits.
export const PAPER_SCAN_FEATURE_KEY = 'paper_scan' as FeatureKey;

/** Storage bucket — same bucket media/upload writes to. */
export const PAPER_SCAN_BUCKET = 'montree-media';

// ───────────────────────── DB rows ─────────────────────────

export type PaperScanStatus = 'pending' | 'extracting' | 'review' | 'committed' | 'failed';
export type PaperScanReviewStatus = 'pending' | 'approved' | 'rejected' | 'edited';
export type PaperScanArea = 'practical_life' | 'sensorial' | 'mathematics' | 'language' | 'cultural';
export type PaperScanProposedStatus = 'presented' | 'practicing' | 'mastered';
export type PaperScanFieldConfidence = 'high' | 'medium' | 'low';
export type PaperScanNameLegibility = 'clear' | 'partial' | 'guess';
// Migration 336 — frequency / rough time / concentration are the unit of record
// now; exact minutes stay optional and are only written when the teacher wrote
// a number on the page.
export type PaperScanTimeBucket = 'short' | 'medium' | 'long';
export type PaperScanConcentration = 'wd' | 'wc' | 'dc';
/** How well the page matched the layout profile that was injected (if any). */
export type SheetLayoutMatch = 'matches' | 'partial' | 'mismatch' | 'no_profile';

export interface PaperScanRow {
  id: string;
  school_id: string;
  classroom_id: string;
  teacher_id: string;
  /** NULL after commit — the raw sheet photo is deleted, not retained. */
  storage_path: string | null;
  sheet_date: string | null;
  status: PaperScanStatus;
  error_message: string | null;
  extraction_model: string | null;
  overall_confidence: string | null;
  sheet_summary: string | null;
  format_description: string | null;
  /** montree_sheet_layouts.id of the profile used to read this scan (336). */
  layout_id: string | null;
  children_found: number;
  entries_found: number;
  created_at: string;
  extracted_at: string | null;
  committed_at: string | null;
}

export interface PaperScanExtractionRow {
  id: string;
  scan_id: string;
  school_id: string;
  classroom_id: string;
  child_name_raw: string | null;
  name_legibility: string | null;
  child_id: string | null;
  match_confidence: number | null;
  work_name_raw: string | null;
  work_key: string | null;
  work_name: string | null;
  work_match_confidence: number | null;
  area: string | null;
  proposed_status: string | null;
  status_confidence: string | null;
  /** Exact minutes — only when the sheet carries a written number/clock range. */
  time_minutes: number | null;
  /** Tally strokes for this work on this sheet. NULL = the sheet has no tally. */
  frequency: number | null;
  time_bucket: PaperScanTimeBucket | null;
  concentration: PaperScanConcentration | null;
  note: string | null;
  general_note: string | null;
  review_status: PaperScanReviewStatus;
  teacher_final_status: string | null;
  teacher_final_note: string | null;
  created_at: string;
}

/** Insert shape (id/created_at are DB defaults). */
export type PaperScanExtractionInsert = Omit<PaperScanExtractionRow, 'id' | 'created_at'>;

// ─────────────────── vision extraction payload ───────────────────
// Shape of the forced `record_sheet_extraction` tool call. Ported from the
// smoke-tested harness (scripts/.../extract-sheet.mjs v0.1.1).

export interface SheetEntry {
  work_name_raw: string | null;
  area: PaperScanArea | null;
  status: PaperScanProposedStatus | null;
  /** Tally strokes / repeated ticks for this work. null when the sheet has none. */
  frequency: number | null;
  /** Bubble or written range: <15 / 15-30 / 30+. null when not marked. */
  time_bucket: PaperScanTimeBucket | null;
  /** AMI concentration code: wd / WC / DC. Never a status. */
  concentration: PaperScanConcentration | null;
  /** Exact minutes only — a written number or a clock range. */
  time_minutes: number | null;
  note: string | null;
  field_confidence: PaperScanFieldConfidence;
}

export interface SheetChild {
  child_name_raw: string;
  name_legibility: PaperScanNameLegibility;
  entries: SheetEntry[];
  general_note: string | null;
}

export interface SheetIllegibleRegion {
  location: string;
  best_guess: string | null;
}

export interface SheetExtraction {
  sheet_summary: string;
  format_description: string;
  sheet_date: string | null;
  class_or_group_name: string | null;
  teacher_name: string | null;
  children: SheetChild[];
  unattributed_notes: string[];
  illegible_regions: SheetIllegibleRegion[];
  overall_confidence: PaperScanFieldConfidence;
  /** Printed/QR template code read off the page, e.g. 'MT-STD-1'. */
  detected_template_code?: string | null;
  /** How the page compared to the injected layout profile. */
  layout_match?: SheetLayoutMatch;
}

/** Roster/works entries fed to the extractor as reading aids. */
export interface PaperScanRosterEntry {
  id: string;
  name: string;
  first_name?: string;
}

export interface PaperScanWorkEntry {
  name: string;
  work_key: string | null;
  area_key: string | null;
}

export interface ExtractSheetResult {
  result: SheetExtraction;
  model: string;
  usage: { input_tokens?: number; output_tokens?: number } | null;
  stopReason: string | null;
}

// ───────────────────────── API payloads ─────────────────────────

/** POST /api/montree/paper-scan/upload */
export interface PaperScanUploadResponse {
  success: true;
  scan_id: string;
  storage_path: string;
}

/** POST /api/montree/paper-scan/[scanId]/extract */
export interface PaperScanExtractResponse {
  success: true;
  scan_id: string;
  status: PaperScanStatus;
  children_found: number;
  entries_found: number;
  overall_confidence: string | null;
}

/** GET /api/montree/paper-scan?classroom_id= */
export interface PaperScanListResponse {
  success: true;
  scans: PaperScanRow[];
}

/** GET /api/montree/paper-scan/[scanId] — the polling endpoint. */
export interface PaperScanDetailResponse {
  success: true;
  scan: PaperScanRow;
  extractions: PaperScanExtractionRow[];
  /** child_id → display name, for rows that matched a child. */
  children: Record<string, { id: string; name: string }>;
}

/** PATCH /api/montree/paper-scan/extraction/[extractionId] */
export interface PaperScanExtractionPatchBody {
  action: 'approve' | 'reject' | 'edit' | 'approve_all';
  /** Required for action 'approve_all'. */
  scan_id?: string;
  // Edit fields (snake_case per the build contract; camelCase aliases are
  // accepted too so a voice-observation-shaped client still works).
  child_id?: string | null;
  work_name?: string | null;
  work_key?: string | null;
  area?: string | null;
  teacher_final_status?: string | null;
  time_minutes?: number | null;
  frequency?: number | null;
  time_bucket?: string | null;
  concentration?: string | null;
  teacher_final_note?: string | null;
}

/** POST /api/montree/paper-scan/[scanId]/commit */
export interface PaperScanCommitResponse {
  success: true;
  progress_updated: number;
  progress_failed?: number;
  observations_created: number;
  /** montree_observation_sessions rows written (336) — idempotent per extraction. */
  sessions_created: number;
  skipped: number;
  /** Non-fatal problems worth showing the teacher (e.g. a row with no area). */
  warnings?: string[];
}

export interface PaperScanErrorResponse {
  success: false;
  error: string;
}
