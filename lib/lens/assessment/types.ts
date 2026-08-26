// lib/lens/assessment/types.ts
// Row shapes for the three lens_assessment_* tables (migration 340).
//
// These are the ONLY types this feature declares. Everything that describes the
// instrument itself — bands, milestones, items, scoring, the runner state — is
// imported from lib/montree/evaluation/types.ts, which is pure: it imports
// nothing but its own siblings and the item bank JSON. Duplicating those
// definitions here would be the fastest way to let the Lens copy of the
// instrument drift away from the Montree one.

import type {
  AgeBand, BandOrUnassessed, BandSource, DeliveryMode, Expectation, FormCode,
  ItemType, RawItemResponse, SessionSummary, Track, WindowCode,
} from '@/lib/montree/evaluation/types';

/** `source` on a session row. Lens's twin of Montree's 'montree_ui'. */
export const LENS_ASSESSMENT_SOURCES = ['lens_ui', 'tablet_import', 'paper_entry'] as const;
export type LensAssessmentSource = (typeof LENS_ASSESSMENT_SOURCES)[number];

export type LensAssessmentStatus = 'in_progress' | 'completed' | 'abandoned';

export interface LensAssessmentSessionRow {
  id: string;
  observer_id: string;
  school_id: string;
  classroom_id: string | null;
  child_alias: string;
  child_age_months: number | null;
  school_year: string;
  window_code: WindowCode;
  age_band: AgeBand;
  form_code: FormCode;
  modules: string[];
  delivery_mode: DeliveryMode;
  source: LensAssessmentSource;
  assessment_locale: string;
  bank_version: string;
  bank_checksum: string;
  client_bank_version: string | null;
  client_bank_checksum: string | null;
  status: LensAssessmentStatus;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  map_percent: number | null;
  map_denominator: number | null;
  map_suppressed: boolean;
  milestones_secure: number | null;
  milestones_developing: number | null;
  milestones_emerging: number | null;
  milestones_unassessed: number | null;
  milestones_exceeded: number | null;
  override_count: number;
  efl_map_percent: number | null;
  efl_map_denominator: number | null;
  efl_map_suppressed: boolean;
  summary_json: SessionSummary | Record<string, never>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LensAssessmentItemResponseRow {
  id: string;
  session_id: string;
  observer_id: string;
  school_id: string;
  classroom_id: string | null;
  child_alias: string;
  item_id: string;
  milestone_id: string | null;
  strand_id: string;
  module_id: string;
  age_band: AgeBand;
  form_code: string;
  item_type: ItemType;
  response: RawItemResponse | Record<string, unknown>;
  points_awarded: number;
  points_possible: number;
  is_correct: boolean | null;
  observed_band: 'emerging' | 'developing' | 'secure' | null;
  attempts: number;
  replay_count: number;
  latency_ms: number | null;
  administered: boolean;
  skipped_reason: string | null;
  client_points_awarded: number | null;
  evidence_note: string | null;
  answered_at: string;
  created_at: string;
}

export interface LensAssessmentMilestoneResultRow {
  id: string;
  session_id: string;
  observer_id: string;
  school_id: string;
  classroom_id: string | null;
  child_alias: string;
  school_year: string;
  window_code: WindowCode;
  milestone_id: string;
  strand_id: string;
  domain_id: string;
  track: Track;
  age_band: AgeBand;
  expectation: Expectation;
  band_computed: BandOrUnassessed | null;
  band_final: BandOrUnassessed;
  band_source: BandSource;
  override_reason: string | null;
  override_by_id: string | null;
  coverage: number | null;
  points_earned: number | null;
  points_possible: number | null;
  evidence_note: string | null;
  created_at: string;
  updated_at: string;
}

/** One result row plus the bank wording it stands for — what the results page renders. */
export interface LensAssessmentResultView {
  milestone_id: string;
  domain_id: string;
  domain_name: string;
  strand_id: string;
  strand_name: string;
  statement: string;
  track: Track;
  expectation: Expectation;
  band_final: BandOrUnassessed;
  band_source: BandSource;
  coverage: number | null;
}

/** The bands, in the order a summary reads them. */
export const LENS_BAND_ORDER: BandOrUnassessed[] = ['secure', 'developing', 'emerging', 'unassessed'];

export const LENS_BAND_LABELS: Record<string, string> = {
  secure: 'Secure',
  developing: 'Developing',
  emerging: 'Emerging',
  unassessed: 'Not looked at',
};

export const LENS_DELIVERY_LABELS: Record<DeliveryMode, string> = {
  tablet: 'Digital',
  paper: 'Paper',
  observation_only: 'Observation only',
};
