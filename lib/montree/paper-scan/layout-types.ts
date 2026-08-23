// lib/montree/paper-scan/layout-types.ts
//
// SheetLayoutProfile — the machine-readable description of an observation
// sheet's layout (Layer 1 of the two-layer sheet reading in
// docs/handoffs/PLAN_ALL_AREAS_REPORTS_AUG22.md §3). One profile is learned per
// classroom from 1-3 photos, or shipped built-in (layouts/montree-standard-v1.ts),
// and is injected verbatim into the Layer 2 extraction prompt so Sonnet knows
// where every field lives and what every mark means before it reads the page.
//
// Stored as JSONB in montree_sheet_layouts.profile (migration 336). Shape is
// the plan's schema, verbatim — bump schema_version if it ever changes.

export interface SheetLayoutProfile {
  schema_version: 1;
  sheet_name: string;                 // what the teacher calls it
  orientation: 'portrait' | 'landscape';
  language: string[];                 // e.g. ['en','zh']
  unit: 'class_per_day' | 'child_per_week' | 'child_per_day' | 'other';
  header: { fields: Array<{ label: string; meaning: 'date' | 'class' | 'teacher' | 'week' | 'other'; position: string }> };
  structure: {
    kind: 'grid' | 'per_child_block' | 'journal' | 'checklist';
    child_locator: string;            // how to find a child: "name pre-printed in left column of each row"
    columns: Array<{ header_verbatim: string; meaning: 'work' | 'area' | 'status' | 'time' | 'tally' | 'concentration' | 'note' | 'other'; area_key?: string }>;
    rows_per_child: number | 'variable';
    work_locator: string;             // "pre-printed work names in 3 slots per area; blank 4th slot is handwritten"
  };
  legend: {
    status_marks: Array<{ mark: string; status: 'presented' | 'practicing' | 'mastered' }>;  // "▷ one side" etc.
    time_marks: Array<{ mark: string; time_bucket?: 'short' | 'medium' | 'long'; minutes?: number }>;
    tally_convention: string | null;  // "each vertical stroke = one session; 5th stroke crosses"
    concentration_codes: Array<{ code: string; value: 'wd' | 'wc' | 'dc' }>;
    area_abbreviations: Record<string, string>;  // "PL" -> practical_life
    other_symbols: Array<{ mark: string; meaning: string }>;
  };
  machine_marks?: { fiducials: boolean; qr: boolean; template_code?: string };
  reading_instructions: string;       // 5-15 imperative sentences Sonnet wrote for its future self
  pitfalls: string[];                 // "handwritten Chinese notes in the Notes column are NOT work names"
}

// ─────────────────── montree_sheet_layouts (migration 336) ───────────────────

export type SheetLayoutStatus = 'draft' | 'active' | 'retired';
export type SheetLayoutSource = 'builtin' | 'learned' | 'edited';

/** One row of montree_sheet_layouts. `profile` is the JSONB above. */
export interface SheetLayoutRow {
  id: string;
  school_id: string;
  /** NULL = school-wide default. */
  classroom_id: string | null;
  name: string;
  source: SheetLayoutSource;
  status: SheetLayoutStatus;
  version: number;
  /** Printed/QR code, e.g. 'MT-STD-1'. NULL for a foreign sheet. */
  template_code: string | null;
  profile: SheetLayoutProfile;
  /** Storage paths of the 1-3 teaching photos — kept, unlike scan photos. */
  sample_paths: string[];
  model: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * What the UI needs to show a profile without loading the whole JSONB tree.
 * The built-in Montree Standard has no DB row, so it rides with id === null.
 */
export interface SheetLayoutSummary {
  id: string | null;
  name: string;
  source: SheetLayoutSource;
  status: SheetLayoutStatus;
  version: number;
  template_code: string | null;
  created_at: string | null;
  /** Short human-readable digest of the profile (see summariseLayoutProfile). */
  summary: {
    orientation: string;
    unit: string;
    structure_kind: string;
    columns: number;
    status_marks: Array<{ mark: string; status: string }>;
    time_marks: Array<{ mark: string; time_bucket?: string; minutes?: number }>;
    concentration_codes: Array<{ code: string; value: string }>;
    tally_convention: string | null;
    reading_instructions: string;
    pitfalls: string[];
  };
}

/** GET /api/montree/paper-scan/layouts?classroom_id= */
export interface SheetLayoutListResponse {
  success: true;
  layouts: SheetLayoutSummary[];
  /** The profile that would be used for the next scan of this classroom. */
  active: SheetLayoutSummary | null;
}

/** POST /api/montree/paper-scan/layouts/learn (multipart: photos + fields) */
export interface SheetLayoutLearnResponse {
  success: true;
  layout: SheetLayoutSummary;
  model: string;
}

/** PATCH /api/montree/paper-scan/layouts/[id] */
export interface SheetLayoutPatchBody {
  action: 'activate' | 'retire' | 'edit';
  name?: string;
  profile?: SheetLayoutProfile;
}
