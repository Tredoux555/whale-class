// lib/montree/features/types.ts
// Feature flag type definitions

export type FeatureKey =
  | 'voice_observations'
  | 'raz_reading_tracker'
  | 'weekly_plan_upload'
  | 'daily_reports'
  | 'parent_portal'
  | 'games'
  | 'weekly_admin_docs'
  | 'teacher_notes'
  | 'multi_teacher_mgmt'
  | 'class_events'
  | 'bulk_student_import'
  | 'multi_child_tagging'
  | 'smart_capture'
  | 'classroom_setup_ai'
  | 'photo_audit'
  | 'guru_advisor'
  | 'parent_reports'
  | 'batch_reports'
  | 'phonics_tools'
  | 'curriculum_browser'
  | 'community_library'
  | 'picture_bank'
  | 'english_corner'
  | 'educational_games'
  | 'tts_voice'
  | 'photo_crop'
  // Dashboard sections (gated for minimalist default)
  | 'daily_brief'
  | 'intelligence_panels'
  | 'teacher_tools'
  | 'shelf_autopilot'
  | 'paperwork_tracker';

export interface MontreeFeature {
  feature_key: FeatureKey;
  name: string;
  description: string;
  icon: string;
  category: string;
  is_premium: boolean;
  default_enabled: boolean;
  enabled: boolean;
  school_enabled: boolean | null;
  classroom_enabled: boolean | null;
}

export interface FeaturesState {
  features: MontreeFeature[];
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
}
