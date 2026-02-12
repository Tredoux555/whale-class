// lib/montree/types.ts
// Core types for Montree system
// Session 112: Added dashboard types

export type WorkStatus = 'not_started' | 'in_progress' | 'completed';

export interface WorkLevel {
  level: number;
  name: string;
  description: string;
}

export interface Work {
  id: string;
  name: string;
  chineseName?: string;
  description: string;
  ageRange: string;
  materials: string[];
  levels: WorkLevel[];
  prerequisites?: string[];
  directAims?: string[];
  indirectAims?: string[];
  controlOfError?: string;
  videoSearchTerms?: string[];
}

export interface Category {
  id: string;
  name: string;
  works: Work[];
}

export interface CurriculumArea {
  id: string;
  name: string;
  icon: string;
  color: string;
  categories: Category[];
}

export interface ChildProgress {
  id: string;
  childId: string;
  workId: string;
  status: WorkStatus;
  currentLevel: number;
  startedAt: string | null;
  completedAt: string | null;
  notes: string;
  updatedAt: string;
}

export interface Child {
  id: string;
  name: string;
  dateOfBirth?: string;
  parentId?: string;
  photo_url?: string;
  createdAt: string;
}

export interface AreaProgress {
  areaId: string;
  areaName: string;
  totalWorks: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  percentage: number;
}

export interface ChildOverallProgress {
  childId: string;
  childName: string;
  totalWorks: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  percentage: number;
  areaProgress: AreaProgress[];
}

// ============================================
// Dashboard Types (Session 112)
// ============================================

// Child as returned by API with progress summary
export interface DashboardChild {
  id: string;
  name: string;
  photo_url?: string;
  age?: number;
  progress?: {
    presented: number;
    practicing: number;
    mastered: number;
  };
}

// Progress bar data for each area
export interface AreaProgressBar {
  area: string;
  areaName: string;
  icon: string;
  color: string;
  totalWorks: number;
  currentPosition: number;
  currentWorkName: string | null;
  percentComplete: number;
}

// ============================================
// Area Configuration
// ============================================

export const AREA_CONFIG: Record<string, {
  name: string;
  icon: string;
  color: string;
  gradient: string;
  bg: string;
  text: string;
  border: string;
  prefix: string;
}> = {
  practical_life: { name: 'Practical Life', icon: 'P', color: '#ec4899', gradient: 'from-pink-500 to-rose-500', bg: 'bg-pink-50', text: 'text-pink-700', border: '#FBCFE8', prefix: 'P' },
  sensorial: { name: 'Sensorial', icon: 'S', color: '#8b5cf6', gradient: 'from-violet-500 to-purple-500', bg: 'bg-violet-50', text: 'text-violet-700', border: '#DDD6FE', prefix: 'S' },
  mathematics: { name: 'Math', icon: 'M', color: '#3b82f6', gradient: 'from-blue-500 to-indigo-500', bg: 'bg-blue-50', text: 'text-blue-700', border: '#BFDBFE', prefix: 'M' },
  language: { name: 'Language', icon: 'L', color: '#22c55e', gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-50', text: 'text-green-700', border: '#A7F3D0', prefix: 'L' },
  cultural: { name: 'Cultural', icon: 'C', color: '#f97316', gradient: 'from-orange-500 to-amber-500', bg: 'bg-orange-50', text: 'text-orange-700', border: '#FDE68A', prefix: 'C' },
};

export const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'] as const;

// ============================================
// Status Colors
// ============================================

export const STATUS_COLORS = {
  not_started: {
    fill: '#f1f5f9',
    border: '#cbd5e1',
    text: '#64748b',
    label: 'Not Started',
  },
  in_progress: {
    fill: '#fef3c7',
    border: '#fcd34d',
    text: '#d97706',
    label: 'In Progress',
  },
  completed: {
    fill: '#dcfce7',
    border: '#86efac',
    text: '#16a34a',
    label: 'Completed',
  },
} as const;

export const AREA_COLORS = {
  practical_life: {
    primary: '#22c55e',
    light: '#bbf7d0',
    dark: '#15803d',
  },
  sensorial: {
    primary: '#f97316',
    light: '#fed7aa',
    dark: '#c2410c',
  },
  mathematics: {
    primary: '#3b82f6',
    light: '#bfdbfe',
    dark: '#1d4ed8',
  },
  language: {
    primary: '#ec4899',
    light: '#fbcfe8',
    dark: '#be185d',
  },
  cultural: {
    primary: '#8b5cf6',
    light: '#ddd6fe',
    dark: '#6d28d9',
  },
} as const;
