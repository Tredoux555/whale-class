// lib/montree/ai/recommendation-engine.ts
// Score and recommend next works based on multiple factors
// Scoring: Interest (40) + Sensitive Period (35) + Sequence (25) + Gap (25)

import { DetectedPeriod, SENSITIVE_PERIODS } from './sensitive-periods';

// ============================================
// TYPES
// ============================================

export interface CurriculumWork {
  id: string;
  name: string;
  area: string;
  sub_area?: string;
  prerequisites?: string[];
  sequence_order?: number;
  difficulty_level?: 'introductory' | 'developing' | 'advanced' | 'mastery';
  age_min?: number;
  age_max?: number;
}

export interface ChildProgress {
  work_name: string;
  area: string;
  status: 'not_started' | 'presented' | 'practicing' | 'mastered';
  last_worked?: string; // ISO date
}

export interface AreaStats {
  area: string;
  work_count: number;
  last_worked?: string;
  days_since_work: number;
  percentage_of_total: number;
}

export interface ScoredRecommendation {
  work: CurriculumWork;
  score: number;
  reasons: string[];
  breakdown: {
    interest: number;
    sensitive_period: number;
    sequence: number;
    gap_filling: number;
  };
}

// ============================================
// EXPECTED AREA BALANCE BY AGE
// ============================================

export const EXPECTED_BALANCE: Record<string, Record<string, { min: number; max: number }>> = {
  '2-3': {
    practical_life: { min: 0.40, max: 0.60 },
    sensorial: { min: 0.20, max: 0.35 },
    language: { min: 0.05, max: 0.20 },
    mathematics: { min: 0, max: 0.10 },
    cultural: { min: 0, max: 0.10 },
  },
  '3-4': {
    practical_life: { min: 0.30, max: 0.45 },
    sensorial: { min: 0.20, max: 0.35 },
    language: { min: 0.15, max: 0.25 },
    mathematics: { min: 0.05, max: 0.15 },
    cultural: { min: 0.05, max: 0.10 },
  },
  '4-5': {
    practical_life: { min: 0.15, max: 0.25 },
    sensorial: { min: 0.15, max: 0.20 },
    language: { min: 0.20, max: 0.30 },
    mathematics: { min: 0.15, max: 0.25 },
    cultural: { min: 0.10, max: 0.20 },
  },
  '5-6': {
    practical_life: { min: 0.05, max: 0.20 },
    sensorial: { min: 0.05, max: 0.15 },
    language: { min: 0.25, max: 0.35 },
    mathematics: { min: 0.25, max: 0.35 },
    cultural: { min: 0.15, max: 0.25 },
  },
};

/**
 * Get age bracket for balance lookup
 */
function getAgeBracket(age: number): string {
  if (age < 3) return '2-3';
  if (age < 4) return '3-4';
  if (age < 5) return '4-5';
  return '5-6';
}

// ============================================
// CURRICULUM SEQUENCES
// ============================================

// Key progressions in Montessori curriculum
const SEQUENCES: Record<string, string[]> = {
  // Practical Life: Basic to complex
  practical_life: [
    'carrying', 'walking on the line', 'pouring dry', 'pouring wet',
    'spooning', 'tonging', 'tweezing', 'cutting', 'folding',
    'dressing frames', 'polishing', 'food preparation'
  ],
  
  // Sensorial: Dimension progression
  sensorial_dimension: [
    'cylinder blocks', 'pink tower', 'brown stair', 'red rods',
    'knobless cylinders', 'constructive triangles', 'geometric cabinet'
  ],
  
  // Sensorial: Color
  sensorial_color: [
    'color box 1', 'color box 2', 'color box 3', 'color grading'
  ],
  
  // Language: Writing path
  language_writing: [
    'sound games', 'i spy', 'sandpaper letters', 'metal insets',
    'movable alphabet', 'chalkboard', 'paper writing'
  ],
  
  // Language: Reading path
  language_reading: [
    'sandpaper letters', 'object boxes', 'pink series',
    'blue series', 'green series', 'sentences', 'books'
  ],
  
  // Math progression
  mathematics: [
    'number rods', 'sandpaper numbers', 'spindle box', 'cards and counters',
    'golden beads introduction', 'golden beads operations',
    'teen board', 'ten board', 'stamp game', 'bead frame'
  ],
};

/**
 * Check if a work is next in any sequence
 */
function isNextInSequence(
  work: CurriculumWork,
  masteredWorks: string[]
): { isNext: boolean; sequenceName?: string } {
  const workLower = work.name.toLowerCase();
  
  for (const [seqName, sequence] of Object.entries(SEQUENCES)) {
    for (let i = 0; i < sequence.length; i++) {
      const seqItem = sequence[i].toLowerCase();
      
      // Check if this work matches current sequence position
      if (workLower.includes(seqItem) || seqItem.includes(workLower)) {
        // Check if all prerequisites are mastered
        const prereqs = sequence.slice(0, i);
        const prereqsMastered = prereqs.every(prereq => 
          masteredWorks.some(m => m.toLowerCase().includes(prereq))
        );
        
        // Check if this work isn't already mastered
        const alreadyMastered = masteredWorks.some(m => 
          m.toLowerCase().includes(seqItem)
        );
        
        if (prereqsMastered && !alreadyMastered) {
          return { isNext: true, sequenceName: seqName };
        }
      }
    }
  }
  
  return { isNext: false };
}

// ============================================
// RECOMMENDATION ENGINE
// ============================================

export interface RecommendationInput {
  childAge: number;
  recentProgress: ChildProgress[];
  allProgress: ChildProgress[];
  availableWorks: CurriculumWork[];
  activeSensitivePeriods: DetectedPeriod[];
  areaStats: AreaStats[];
}

/**
 * Score all available works and return top recommendations
 */
export function generateRecommendations(
  input: RecommendationInput,
  maxResults = 5
): ScoredRecommendation[] {
  const {
    childAge,
    recentProgress,
    allProgress,
    availableWorks,
    activeSensitivePeriods,
    areaStats,
  } = input;

  // Get mastered works for sequence checking
  const masteredWorks = allProgress
    .filter(p => p.status === 'mastered')
    .map(p => p.work_name);

  // Get recent areas for interest tracking
  const recentAreas = new Set(recentProgress.map(p => p.area));
  const recentWorkNames = new Set(recentProgress.map(p => p.work_name.toLowerCase()));

  // Get expected balance for age
  const ageBracket = getAgeBracket(childAge);
  const expectedBalance = EXPECTED_BALANCE[ageBracket];

  // Score each available work
  const scored: ScoredRecommendation[] = [];

  for (const work of availableWorks) {
    // Skip if already in recent progress
    if (recentWorkNames.has(work.name.toLowerCase())) {
      continue;
    }

    // Skip if age inappropriate
    if (work.age_min && childAge < work.age_min - 0.5) continue;
    if (work.age_max && childAge > work.age_max + 0.5) continue;

    let score = 0;
    const reasons: string[] = [];
    const breakdown = {
      interest: 0,
      sensitive_period: 0,
      sequence: 0,
      gap_filling: 0,
    };

    // ========================================
    // 1. INTEREST ALIGNMENT (up to 40 points)
    // ========================================
    if (recentAreas.has(work.area)) {
      breakdown.interest = 40;
      reasons.push('Aligns with current interests');
    } else if (recentAreas.size === 0) {
      // No recent data, give partial points
      breakdown.interest = 20;
    }

    // ========================================
    // 2. SENSITIVE PERIOD MATCH (up to 35 points)
    // ========================================
    for (const detected of activeSensitivePeriods) {
      if (detected.status !== 'active' && detected.status !== 'emerging') continue;
      
      const period = detected.period;
      const workLower = work.name.toLowerCase();
      
      // Check if work matches period indicators
      const matches = period.work_indicators.some(ind => 
        workLower.includes(ind) || ind.includes(workLower)
      );
      
      if (matches) {
        const periodScore = detected.status === 'active' ? 35 : 25;
        if (periodScore > breakdown.sensitive_period) {
          breakdown.sensitive_period = periodScore;
          reasons.push(`Matches ${detected.status} ${period.name} sensitive period`);
        }
      }
    }

    // ========================================
    // 3. CURRICULUM SEQUENCE (up to 25 points)
    // ========================================
    const sequenceCheck = isNextInSequence(work, masteredWorks);
    if (sequenceCheck.isNext) {
      breakdown.sequence = 25;
      reasons.push('Next logical step in curriculum');
    }

    // ========================================
    // 4. GAP FILLING (up to 25 points)
    // ========================================
    const areaInfo = areaStats.find(a => a.area === work.area);
    if (areaInfo) {
      const expected = expectedBalance[work.area];
      
      // Check if area is below expected minimum
      if (expected && areaInfo.percentage_of_total < expected.min) {
        breakdown.gap_filling += 15;
        reasons.push(`${work.area} below expected balance`);
      }
      
      // Additional points if area hasn't been worked on recently
      if (areaInfo.days_since_work > 14) {
        breakdown.gap_filling += 10;
        reasons.push(`${work.area} not worked in ${areaInfo.days_since_work} days`);
      } else if (areaInfo.days_since_work > 7) {
        breakdown.gap_filling += 5;
      }
    }

    // ========================================
    // TOTAL SCORE
    // ========================================
    score = breakdown.interest + breakdown.sensitive_period + 
            breakdown.sequence + breakdown.gap_filling;

    if (score > 0) {
      scored.push({
        work,
        score,
        reasons,
        breakdown,
      });
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Return top results
  return scored.slice(0, maxResults);
}

/**
 * Get areas that need attention based on balance
 */
export function getAreasNeedingAttention(
  childAge: number,
  areaStats: AreaStats[]
): { area: string; reason: string; urgency: 'low' | 'medium' | 'high' }[] {
  const ageBracket = getAgeBracket(childAge);
  const expected = EXPECTED_BALANCE[ageBracket];
  const needs: { area: string; reason: string; urgency: 'low' | 'medium' | 'high' }[] = [];

  for (const stat of areaStats) {
    const exp = expected[stat.area];
    if (!exp) continue;

    // Check if below minimum
    if (stat.percentage_of_total < exp.min) {
      const deficit = exp.min - stat.percentage_of_total;
      const urgency = deficit > 0.15 ? 'high' : deficit > 0.08 ? 'medium' : 'low';
      needs.push({
        area: stat.area,
        reason: `Only ${Math.round(stat.percentage_of_total * 100)}% of work (expected ${Math.round(exp.min * 100)}-${Math.round(exp.max * 100)}%)`,
        urgency,
      });
    }

    // Check if not worked recently
    if (stat.days_since_work > 21) {
      needs.push({
        area: stat.area,
        reason: `No work in ${stat.days_since_work} days`,
        urgency: 'high',
      });
    } else if (stat.days_since_work > 14) {
      needs.push({
        area: stat.area,
        reason: `No work in ${stat.days_since_work} days`,
        urgency: 'medium',
      });
    }
  }

  // Sort by urgency
  const urgencyOrder = { high: 0, medium: 1, low: 2 };
  needs.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  return needs;
}

/**
 * Calculate area distribution from progress records
 */
export function calculateAreaDistribution(
  progress: ChildProgress[]
): Record<string, number> {
  if (progress.length === 0) return {};

  const counts: Record<string, number> = {};
  for (const p of progress) {
    counts[p.area] = (counts[p.area] || 0) + 1;
  }

  const total = progress.length;
  const distribution: Record<string, number> = {};
  for (const [area, count] of Object.entries(counts)) {
    distribution[area] = count / total;
  }

  return distribution;
}

/**
 * Calculate area stats from progress records
 */
export function calculateAreaStats(
  progress: ChildProgress[],
  allAreas = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural']
): AreaStats[] {
  const now = new Date();
  const distribution = calculateAreaDistribution(progress);
  
  return allAreas.map(area => {
    const areaProgress = progress.filter(p => p.area === area);
    const lastWorked = areaProgress
      .map(p => p.last_worked)
      .filter(Boolean)
      .sort()
      .reverse()[0];
    
    let daysSince = 999;
    if (lastWorked) {
      const lastDate = new Date(lastWorked);
      daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      area,
      work_count: areaProgress.length,
      last_worked: lastWorked,
      days_since_work: daysSince,
      percentage_of_total: distribution[area] || 0,
    };
  });
}
