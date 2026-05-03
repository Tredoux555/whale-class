export interface Work {
  id: string;
  work_key: string;
  name: string;
  name_chinese?: string;
  description?: string;
  area_id: string;
  age_range?: string;
  is_active: boolean;
  // Array fields: only English columns exist on the DB. Translated arrays
  // (materials, direct_aims, indirect_aims, presentation_steps) live INSIDE
  // the `guide_content_<locale>` JSONB column. Read them via
  // getLocalizedGuideField() — there is no `materials_zh` / `direct_aims_zh`
  // / etc. column.
  direct_aims?: string[];
  indirect_aims?: string[];
  materials?: string[];
  prerequisites?: string[];
  // String fields with real per-locale columns (populated by migration 182
  // via apply_global_translations). Read via getLocalizedField().
  control_of_error?: string;
  control_of_error_zh?: string;
  parent_description?: string;
  parent_description_zh?: string;
  why_it_matters?: string;
  why_it_matters_zh?: string;
  teacher_notes?: string;
  // quick_guide is English-only as a flat column. Translations live in
  // `guide_content_<locale>` JSONB — read via getLocalizedGuideField().
  quick_guide?: string;
  presentation_steps?: any[];
  sequence?: number;
  photo_url?: string;
  is_custom?: boolean;
  // JSONB cache columns for translated guide content (one per non-English
  // locale). Shape: { quick_guide, materials, direct_aims, presentation_steps,
  // control_of_error, why_it_matters, parent_description } — keys are
  // suffix-free. Don't read these directly; use getLocalizedGuideField().
  guide_content_zh?: Record<string, unknown>;
  guide_content_es?: Record<string, unknown>;
  guide_content_de?: Record<string, unknown>;
  guide_content_fr?: Record<string, unknown>;
  guide_content_pt?: Record<string, unknown>;
  guide_content_nl?: Record<string, unknown>;
  guide_content_it?: Record<string, unknown>;
  guide_content_ja?: Record<string, unknown>;
  guide_content_ko?: Record<string, unknown>;
  guide_content_uk?: Record<string, unknown>;
  guide_content_ru?: Record<string, unknown>;
  // Legacy/static-only fields (not in DB)
  readiness_indicators?: string[];
  materials_needed?: string[];
  parent_explanation?: string;
  difficulty_level?: string;
  is_gateway?: boolean;
  sub_area?: string;
  primary_skills?: string[];
  video_search_term?: string;
}

export interface MergedWork extends Work {
  status?: string;
  isImported?: boolean;
  dbSequence?: number; // Real DB sequence (preserved through merge)
}

export interface AreaConfig {
  name: string;
  icon: string;
  color: string;
}

/**
 * Shape of the response from `/api/montree/works/guide`.
 *
 * The API merges the matching `guide_content_<locale>` JSONB into these flat
 * fields server-side, so for any supported locale, `quick_guide`, `materials`,
 * `presentation_steps`, etc. already contain locale-correct content. There are
 * NO `quick_guide_zh` / `materials_zh` etc. fields on the response — historical
 * type declarations for those were phantoms (no API ever returned them, no DB
 * column ever populated them) and were removed.
 */
export interface QuickGuideData {
  quick_guide?: string;
  materials?: string[];
  video_search_term?: string;
  error?: boolean;
  presentation_steps?: Array<{step: number; title: string; description: string; tip: string}>;
  direct_aims?: string[];
  indirect_aims?: string[];
  parent_description?: string;
  control_of_error?: string;
  why_it_matters?: string;
}

export interface EditFormData {
  name: string;
  name_chinese: string;
  description: string;
  why_it_matters: string;
  age_range: string;
  direct_aims: string;
  indirect_aims: string;
  materials: string;
  teacher_notes: string;
}

export const AREA_ICONS: Record<string, string> = {
  practical_life: '🧹',
  sensorial: '👁️',
  mathematics: '🔢',
  language: '📚',
  cultural: '🌍'
};

export const AREA_COLORS: Record<string, string> = {
  practical_life: 'from-green-400 to-emerald-500',
  sensorial: 'from-orange-400 to-amber-500',
  mathematics: 'from-blue-400 to-indigo-500',
  language: 'from-pink-400 to-rose-500',
  cultural: 'from-purple-400 to-violet-500'
};
