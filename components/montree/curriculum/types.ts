export interface Work {
  id: string;
  work_key: string;
  name: string;
  name_chinese?: string;
  description?: string;
  area_id: string;
  age_range?: string;
  is_active: boolean;
  direct_aims?: string[];
  indirect_aims?: string[];
  readiness_indicators?: string[];
  materials_needed?: string[];
  parent_explanation?: string;
  why_it_matters?: string;
  difficulty_level?: string;
  is_gateway?: boolean;
  sub_area?: string;
  primary_skills?: string[];
  teacher_notes?: string;
  quick_guide?: string;
  video_search_term?: string;
  sequence?: number;
}

export interface MergedWork extends Work {
  status?: string;
  isImported?: boolean;
}

export interface AreaConfig {
  name: string;
  icon: string;
  color: string;
}

export interface QuickGuideData {
  quick_guide?: string;
  materials?: string[];
  video_search_term?: string;
  error?: boolean;
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
