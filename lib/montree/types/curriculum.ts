// lib/montree/types/curriculum.ts
// TypeScript types for Montree foundation architecture
// Matches database schema from 050_montree_foundation.sql

// ============================================
// SCHOOL TYPES
// ============================================

export interface MontreeSchool {
  id: string;
  name: string;
  slug: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled';
  plan_type: 'school' | 'district';
  trial_ends_at?: string;
  owner_email: string;
  owner_name?: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface MontreeClassroom {
  id: string;
  school_id: string;
  name: string;
  teacher_id?: string;
  age_group: string;
  settings: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// CURRICULUM AREA TYPES (shared structure)
// ============================================

export interface CurriculumAreaBase {
  id: string;
  area_key: string;
  name: string;
  name_chinese?: string;
  icon?: string;
  color?: string;
  description?: string;
  sequence: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SchoolCurriculumArea extends CurriculumAreaBase {
  school_id: string;
}

export interface ClassroomCurriculumArea extends CurriculumAreaBase {
  classroom_id: string;
}

// ============================================
// CURRICULUM WORK TYPES (shared structure)
// ============================================

export interface WorkLevel {
  level: number;
  name: string;
  description: string;
  videoSearchTerms?: string[];
}

export interface CurriculumWorkBase {
  id: string;
  area_id: string;
  work_key: string;
  name: string;
  name_chinese?: string;
  description?: string;
  age_range: string;
  materials: string[];
  direct_aims: string[];
  indirect_aims: string[];
  control_of_error?: string;
  prerequisites: string[];
  video_search_terms: string[];
  levels: WorkLevel[];
  category_key?: string;
  category_name?: string;
  sequence: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SchoolCurriculumWork extends CurriculumWorkBase {
  school_id: string;
  school_notes?: string;
}

export interface ClassroomCurriculumWork extends CurriculumWorkBase {
  classroom_id: string;
  teacher_notes?: string;
}

// ============================================
// CHILD TYPES
// ============================================

export interface MontreeChild {
  id: string;
  classroom_id?: string;
  name: string;
  name_chinese?: string;
  age?: number;
  date_of_birth?: string;
  photo_url?: string;
  notes?: string;
  settings: Record<string, any>;
  created_at: string;
}

// ============================================
// ASSIGNMENT TYPES
// ============================================

export type AssignmentStatus = 'not_started' | 'presented' | 'practicing' | 'mastered';

export interface ChildAssignment {
  id: string;
  child_id: string;
  work_id: string;
  status: AssignmentStatus;
  current_level: number;
  assigned_at: string;
  presented_at?: string;
  mastered_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface SchoolWithClassrooms extends MontreeSchool {
  classrooms: MontreeClassroom[];
}

export interface ClassroomWithCurriculum extends MontreeClassroom {
  areas: (ClassroomCurriculumArea & { works: ClassroomCurriculumWork[] })[];
}

export interface ChildWithAssignments extends MontreeChild {
  assignments: (ChildAssignment & { work: ClassroomCurriculumWork })[];
}

// ============================================
// STEM TYPES (Master curriculum JSON structure)
// ============================================

export interface StemWork {
  id: string;
  name: string;
  chineseName?: string;
  description: string;
  ageRange: string;
  materials: string[];
  directAims: string[];
  indirectAims: string[];
  controlOfError?: string;
  prerequisites: string[];
  videoSearchTerms?: string[];
  levels: WorkLevel[];
  sequence: number;
}

export interface StemCategory {
  id: string;
  name: string;
  description?: string;
  sequence: number;
  works: StemWork[];
}

export interface StemArea {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  sequence: number;
  categories: StemCategory[];
}

// ============================================
// CONSTANTS
// ============================================

export const AREA_KEYS = ['practical_life', 'sensorial', 'math', 'language', 'cultural'] as const;
export type AreaKey = typeof AREA_KEYS[number];

export const ASSIGNMENT_STATUSES: AssignmentStatus[] = ['not_started', 'presented', 'practicing', 'mastered'];

export const STATUS_COLORS = {
  not_started: { bg: '#f1f5f9', border: '#cbd5e1', text: '#64748b' },
  presented: { bg: '#fef3c7', border: '#fcd34d', text: '#d97706' },
  practicing: { bg: '#dbeafe', border: '#93c5fd', text: '#2563eb' },
  mastered: { bg: '#dcfce7', border: '#86efac', text: '#16a34a' },
} as const;

export const AREA_COLORS = {
  practical_life: { primary: '#22c55e', light: '#bbf7d0', icon: '🌱' },
  sensorial: { primary: '#f97316', light: '#fed7aa', icon: '👁️' },
  math: { primary: '#3b82f6', light: '#bfdbfe', icon: '🔢' },
  language: { primary: '#ec4899', light: '#fbcfe8', icon: '📚' },
  cultural: { primary: '#8b5cf6', light: '#ddd6fe', icon: '🌍' },
} as const;
