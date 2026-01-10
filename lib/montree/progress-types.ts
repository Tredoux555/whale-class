// ============================================
// STUDENT PROGRESS BARS - TYPE DEFINITIONS
// ============================================
// Path: lib/montree/progress-types.ts
// Used by: StudentProgressBars, Progress Summary API, Principal Page
// ============================================

/**
 * Status values for individual works
 * 0 = Not Started (gray)
 * 1 = Presented (yellow)
 * 2 = Practicing (blue)
 * 3 = Mastered (green)
 */
export type WorkStatus = 0 | 1 | 2 | 3;

/**
 * Individual work item with its current status
 */
export interface WorkStatusItem {
  workId: string;
  name: string;
  status: WorkStatus;
  categoryName: string;
}

/**
 * Progress data for a single curriculum area
 */
export interface AreaProgressData {
  areaId: string;
  areaName: string;
  icon: string;
  color: string;
  totalWorks: number;
  currentWorkIndex: number;
  currentWorkName: string;
  worksStatus: WorkStatusItem[];
}

/**
 * Props for the StudentProgressBars component
 */
export interface StudentProgressBarsProps {
  childId: string;
  childName: string;
  progressData: AreaProgressData[];
  onWorkClick?: (workId: string, areaId: string) => void;
}

/**
 * Overall progress statistics
 */
export interface OverallProgress {
  totalWorks: number;
  completed: number;
  inProgress: number;
  percentage: number;
}

/**
 * Full progress summary response from API
 */
export interface ProgressSummaryResponse {
  childId: string;
  childName: string;
  lastUpdated: string;
  overallProgress: OverallProgress;
  areas: AreaProgressData[];
}

/**
 * Status configuration for visual display
 */
export interface StatusConfig {
  label: string;
  bgColor: string;
  borderColor: string;
  fillColor: string;
  textColor: string;
}

/**
 * Curriculum area reference data
 */
export interface CurriculumArea {
  id: string;
  name: string;
  icon: string;
  color: string;
}

// ============================================
// CONSTANTS
// ============================================

export const CURRICULUM_AREAS: CurriculumArea[] = [
  { id: 'practical_life', name: 'Practical Life', icon: '🧹', color: '#22c55e' },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', color: '#f97316' },
  { id: 'mathematics', name: 'Mathematics', icon: '🔢', color: '#3b82f6' },
  { id: 'language', name: 'Language', icon: '📚', color: '#ec4899' },
  { id: 'cultural', name: 'Cultural', icon: '🌍', color: '#8b5cf6' },
];

export const STATUS_CONFIGS: Record<WorkStatus, StatusConfig> = {
  0: {
    label: 'Not Started',
    bgColor: 'bg-gray-200',
    borderColor: 'border-gray-400',
    fillColor: '#e5e7eb',
    textColor: 'text-gray-500',
  },
  1: {
    label: 'Presented',
    bgColor: 'bg-yellow-200',
    borderColor: 'border-yellow-500',
    fillColor: '#fef3c7',
    textColor: 'text-yellow-700',
  },
  2: {
    label: 'Practicing',
    bgColor: 'bg-blue-200',
    borderColor: 'border-blue-500',
    fillColor: '#dbeafe',
    textColor: 'text-blue-700',
  },
  3: {
    label: 'Mastered',
    bgColor: 'bg-green-200',
    borderColor: 'border-green-500',
    fillColor: '#d1fae5',
    textColor: 'text-green-700',
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getStatusConfig(status: WorkStatus): StatusConfig {
  return STATUS_CONFIGS[status];
}

export function getCurriculumArea(areaId: string): CurriculumArea | undefined {
  return CURRICULUM_AREAS.find(area => area.id === areaId);
}

export function calculateAreaCompletion(worksStatus: WorkStatusItem[]): number {
  if (worksStatus.length === 0) return 0;
  const completed = worksStatus.filter(w => w.status === 3).length;
  return Math.round((completed / worksStatus.length) * 100);
}

export function findCurrentWorkIndex(worksStatus: WorkStatusItem[]): number {
  let currentIndex = -1;
  for (let i = 0; i < worksStatus.length; i++) {
    if (worksStatus[i].status > 0) {
      currentIndex = i;
    }
  }
  return currentIndex >= 0 ? currentIndex : 0;
}
