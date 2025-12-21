// lib/montree/types.ts
// Core types for Montree system

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
  // Keep existing fields from JSON
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

// Status colors - light fills for visual indication
export const STATUS_COLORS = {
  not_started: {
    fill: '#f1f5f9',      // slate-100 (light gray)
    border: '#cbd5e1',    // slate-300
    text: '#64748b',      // slate-500
    label: 'Not Started',
  },
  in_progress: {
    fill: '#fef3c7',      // amber-100 (light amber)
    border: '#fcd34d',    // amber-300
    text: '#d97706',      // amber-600
    label: 'In Progress',
  },
  completed: {
    fill: '#dcfce7',      // green-100 (light green)
    border: '#86efac',    // green-300
    text: '#16a34a',      // green-600
    label: 'Completed',
  },
} as const;

// Area colors (distinct from status colors)
export const AREA_COLORS = {
  practical_life: {
    primary: '#22c55e',   // green-500
    light: '#bbf7d0',     // green-200
    dark: '#15803d',      // green-700
  },
  sensorial: {
    primary: '#f97316',   // orange-500
    light: '#fed7aa',     // orange-200
    dark: '#c2410c',      // orange-700
  },
  mathematics: {
    primary: '#3b82f6',   // blue-500
    light: '#bfdbfe',     // blue-200
    dark: '#1d4ed8',      // blue-700
  },
  language: {
    primary: '#ec4899',   // pink-500
    light: '#fbcfe8',     // pink-200
    dark: '#be185d',      // pink-700
  },
  cultural: {
    primary: '#8b5cf6',   // violet-500
    light: '#ddd6fe',     // violet-200
    dark: '#6d28d9',      // violet-700
  },
} as const;

