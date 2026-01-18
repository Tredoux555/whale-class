// lib/montree/types/ai.ts
// TypeScript types for Montree AI-powered developmental insights

import type { AreaKey } from './curriculum';

// ============================================
// ANALYZE ENDPOINT TYPES
// ============================================

export interface AnalyzeRequest {
  child_id: string;
}

export interface AreaInsight {
  area: AreaKey;
  area_name: string;
  total_works: number;
  completed: number;
  in_progress: number;
  not_started: number;
  completion_percentage: number;
  insight: string;
}

export interface AnalyzeResponse {
  child: {
    id: string;
    name: string;
    age: number | null;
    classroom_name: string;
  };
  summary: string;
  strengths: string[];
  growth_areas: string[];
  area_insights: AreaInsight[];
  developmental_stage: string;
  generated_at: string;
  /** Metadata about the response generation */
  _meta?: {
    ai_fallback_used?: boolean;
  };
}

// ============================================
// WEEKLY REPORT ENDPOINT TYPES  
// ============================================

export interface WeeklyReportRequest {
  child_id: string;
  week_start?: string; // ISO date, defaults to current week
}

export interface WorkSummary {
  work_name: string;
  area: string;
  status: string;
  current_level: number;
}

export interface AreaWorkSummary {
  area: string;
  area_name: string;
  works_completed: number;
  works_in_progress: number;
  works_presented: number;
}

export interface WeeklyReportResponse {
  child: {
    id: string;
    name: string;
  };
  period: {
    start: string;
    end: string;
  };
  highlights: string[];
  narrative: string;
  next_steps: string[];
  areas_worked: AreaWorkSummary[];
  works_this_week: WorkSummary[];
  generated_at: string;
}

// ============================================
// SUGGEST NEXT ENDPOINT TYPES
// ============================================

export interface SuggestNextRequest {
  child_id: string;
  area?: AreaKey; // Optional filter by area
  limit?: number; // Default 5
}

export interface WorkSuggestion {
  work: {
    id: string;
    name: string;
    name_chinese?: string;
    area: AreaKey;
    area_name: string;
    category: string;
    description?: string;
    materials: string[];
    age_range: string;
  };
  readiness_score: number; // 0-1, how ready the child is
  reason: string;
  developmental_benefit: string;
  prerequisites_met: string[];
  prerequisites_missing: string[];
}

export interface SuggestNextResponse {
  child: {
    id: string;
    name: string;
    age: number | null;
  };
  suggestions: WorkSuggestion[];
  total_available_works: number;
  generated_at: string;
}

// ============================================
// SHARED AI CONTEXT TYPES
// ============================================

export interface ChildContext {
  id: string;
  name: string;
  name_chinese?: string;
  age: number | null;
  date_of_birth?: string;
  classroom_id: string;
  classroom_name: string;
}

export interface AssignmentWithWork {
  id: string;
  child_id: string;
  work_id: string;
  status: 'not_started' | 'presented' | 'practicing' | 'mastered';
  current_level: number;
  assigned_at: string;
  presented_at?: string;
  mastered_at?: string;
  notes?: string;
  work: {
    id: string;
    work_key: string;
    name: string;
    name_chinese?: string;
    description?: string;
    age_range: string;
    materials: string[];
    direct_aims: string[];
    indirect_aims: string[];
    prerequisites: string[];
    category_key?: string;
    category_name?: string;
    area_id: string;
    area_key: string;
    area_name: string;
  };
}

export interface AIPromptContext {
  child: ChildContext;
  assignments: AssignmentWithWork[];
  areaStats: Map<string, {
    total: number;
    completed: number;
    in_progress: number;
    not_started: number;
  }>;
}
