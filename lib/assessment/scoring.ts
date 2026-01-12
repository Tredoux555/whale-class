// lib/assessment/scoring.ts
// Assessment scoring logic and level calculation

export type AssessmentLevel = 'proficient' | 'developing' | 'emerging';

export interface LevelConfig {
  level: AssessmentLevel;
  minPercentage: number;
  color: string;
  bgColor: string;
  label: string;
  emoji: string;
}

// Level thresholds and styling
export const LEVELS: Record<AssessmentLevel, LevelConfig> = {
  proficient: {
    level: 'proficient',
    minPercentage: 80,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Proficient',
    emoji: '🟢'
  },
  developing: {
    level: 'developing',
    minPercentage: 50,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: 'Developing',
    emoji: '🟡'
  },
  emerging: {
    level: 'emerging',
    minPercentage: 0,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Emerging',
    emoji: '🔴'
  }
};

// Calculate level from percentage
export function calculateLevel(percentage: number): AssessmentLevel {
  if (percentage >= 80) return 'proficient';
  if (percentage >= 50) return 'developing';
  return 'emerging';
}

// Get level config from percentage
export function getLevelConfig(percentage: number): LevelConfig {
  return LEVELS[calculateLevel(percentage)];
}

// Calculate percentage from counts
export function calculatePercentage(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 10000) / 100;
}

// Format percentage for display
export function formatPercentage(percentage: number): string {
  return `${Math.round(percentage)}%`;
}

// Get celebration message based on performance
export function getCelebrationMessage(percentage: number): { 
  emoji: string; 
  message: string;
  subMessage: string;
} {
  if (percentage >= 90) {
    return { emoji: '🌟', message: 'Amazing job!', subMessage: 'You are a superstar!' };
  }
  if (percentage >= 80) {
    return { emoji: '⭐', message: 'Great work!', subMessage: 'You did so well!' };
  }
  if (percentage >= 70) {
    return { emoji: '🎉', message: 'Good job!', subMessage: 'Keep up the great work!' };
  }
  if (percentage >= 50) {
    return { emoji: '👍', message: 'Nice try!', subMessage: 'You are learning so much!' };
  }
  return { emoji: '💪', message: 'Good effort!', subMessage: 'Practice makes perfect!' };
}
