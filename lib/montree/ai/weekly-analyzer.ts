// lib/montree/ai/weekly-analyzer.ts
// Main orchestrator for weekly child analysis
// Combines note parsing, sensitive period detection, and recommendations

import { parseNotes, getOverallSentiment } from './note-parser';
import { 
  detectSensitivePeriods, 
  calculateAge, 
  getExpectedPeriods,
  WorkPattern,
  DetectedPeriod 
} from './sensitive-periods';
import { 
  generateRecommendations, 
  calculateAreaStats,
  getAreasNeedingAttention,
  calculateAreaDistribution,
  EXPECTED_BALANCE,
  ScoredRecommendation,
  AreaStats
} from './recommendation-engine';

// ============================================
// TYPES
// ============================================

export interface WeeklyAnalysisInput {
  child: {
    id: string;
    name: string;
    date_of_birth: string;
    enrollment_date?: string;
    classroom_id?: string;
  };
  weekStart: string; // ISO date
  weekEnd: string;
  progress: {
    work_name: string;
    area: string;
    status: string;
    notes?: string;
    date?: string;
    duration_minutes?: number;
    repetition_count?: number;
  }[];
  historicalProgress?: {
    work_name: string;
    area: string;
    status: string;
    date?: string;
  }[];
  availableWorks?: {
    id: string;
    name: string;
    area: string;
    sequence_order?: number;
    age_min?: number;
    age_max?: number;
  }[];
}

export interface Flag {
  type: 'red' | 'yellow';
  category: 'concentration' | 'balance' | 'regression' | 'social' | 'emotional' | 'avoidance';
  issue: string;
  evidence: string;
  recommendation: string;
}

export interface WeeklyAnalysisResult {
  // Child info
  child_id: string;
  child_name: string;
  child_age: number;
  week_start: string;
  week_end: string;

  // Work metrics
  total_works: number;
  area_distribution: Record<string, number>;
  expected_distribution: Record<string, { min: number; max: number }>;

  // Concentration analysis
  concentration_score: number; // 0-100
  avg_duration_minutes?: number;
  expected_duration_minutes: number;
  concentration_assessment: 'strong' | 'moderate' | 'weak' | 'unknown';

  // Patterns
  work_patterns: WorkPattern[];
  repetition_highlights: { work: string; count: number }[];
  
  // Sensitive periods
  detected_sensitive_periods: {
    period_id: string;
    period_name: string;
    status: string;
    confidence: number;
    evidence: string[];
  }[];

  // Flags
  red_flags: Flag[];
  yellow_flags: Flag[];

  // Recommendations
  recommended_works: {
    work_name: string;
    area: string;
    score: number;
    reasons: string[];
  }[];
  areas_needing_attention: {
    area: string;
    reason: string;
    urgency: string;
  }[];

  // Sentiment analysis
  emotional_state: 'positive' | 'mixed' | 'negative' | 'unknown';
  social_development: 'thriving' | 'developing' | 'struggling' | 'unknown';

  // Generated narratives (can be enhanced with AI later)
  teacher_summary: string;
  parent_summary: string;
  psychological_profile: string;

  // Meta
  generated_at: string;
  confidence_level: 'high' | 'medium' | 'low';
}

// ============================================
// ATTENTION NORMS BY AGE
// ============================================

const ATTENTION_NORMS: Record<number, { routine: number; engaging: number }> = {
  2: { routine: 5, engaging: 10 },
  3: { routine: 7.5, engaging: 15 },
  4: { routine: 10, engaging: 20 },
  5: { routine: 13.5, engaging: 25 },
  6: { routine: 16.5, engaging: 30 },
};

function getExpectedDuration(age: number): number {
  const roundedAge = Math.min(6, Math.max(2, Math.round(age)));
  return ATTENTION_NORMS[roundedAge]?.engaging || 15;
}

// ============================================
// MAIN ANALYZER
// ============================================

export function analyzeWeeklyProgress(input: WeeklyAnalysisInput): WeeklyAnalysisResult {
  const { child, weekStart, weekEnd, progress, historicalProgress, availableWorks } = input;
  
  // Calculate age
  const childAge = calculateAge(child.date_of_birth);
  const ageBracket = childAge < 3 ? '2-3' : childAge < 4 ? '3-4' : childAge < 5 ? '4-5' : '5-6';

  // Extract notes for parsing
  const notes = progress.map(p => p.notes).filter(Boolean) as string[];
  const noteAnalysis = parseNotes(notes);
  const sentiment = getOverallSentiment(noteAnalysis.summary);

  // Calculate work patterns
  const workCounts: Record<string, WorkPattern> = {};
  for (const p of progress) {
    const key = p.work_name.toLowerCase();
    if (!workCounts[key]) {
      workCounts[key] = {
        work_name: p.work_name,
        area: p.area,
        count: 0,
        total_duration: 0,
        avg_repetitions: 0,
      };
    }
    workCounts[key].count++;
    if (p.duration_minutes) {
      workCounts[key].total_duration! += p.duration_minutes;
    }
    if (p.repetition_count) {
      workCounts[key].avg_repetitions = 
        (workCounts[key].avg_repetitions! * (workCounts[key].count - 1) + p.repetition_count) / 
        workCounts[key].count;
    }
  }
  const workPatterns = Object.values(workCounts);

  // Detect sensitive periods
  const detectedPeriods = detectSensitivePeriods(child.date_of_birth, workPatterns, notes);

  // Calculate area stats
  const areaStats = calculateAreaStats(
    progress.map(p => ({
      work_name: p.work_name,
      area: p.area,
      status: p.status as any,
      last_worked: p.date,
    }))
  );

  // Generate recommendations
  const allProgress = [
    ...progress.map(p => ({ ...p, status: p.status as any })),
    ...(historicalProgress || []).map(p => ({ ...p, status: p.status as any })),
  ];
  
  const recommendations = availableWorks ? generateRecommendations({
    childAge,
    recentProgress: progress.map(p => ({ ...p, status: p.status as any })),
    allProgress,
    availableWorks,
    activeSensitivePeriods: detectedPeriods,
    areaStats,
  }) : [];

  // Get areas needing attention
  const areasNeedingAttention = getAreasNeedingAttention(childAge, areaStats);

  // Calculate concentration score
  const expectedDuration = getExpectedDuration(childAge);
  let concentrationScore = 50; // Default middle score
  
  if (noteAnalysis.summary.avg_duration) {
    const durationRatio = noteAnalysis.summary.avg_duration / expectedDuration;
    concentrationScore = Math.min(100, Math.round(durationRatio * 70));
  }
  
  // Adjust based on note signals
  concentrationScore += noteAnalysis.summary.concentration_positive * 5;
  concentrationScore -= noteAnalysis.summary.concentration_negative * 10;
  concentrationScore = Math.max(0, Math.min(100, concentrationScore));

  // Detect flags
  const { redFlags, yellowFlags } = detectFlags(
    childAge,
    progress,
    noteAnalysis,
    areaStats,
    sentiment,
    workPatterns
  );

  // Calculate distributions
  const areaDistribution = calculateAreaDistribution(
    progress.map(p => ({ ...p, status: p.status as any }))
  );
  const expectedDistribution = EXPECTED_BALANCE[ageBracket];

  // Repetition highlights (works repeated 3+ times)
  const repetitionHighlights = workPatterns
    .filter(p => p.count >= 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(p => ({ work: p.work_name, count: p.count }));

  // Determine confidence level
  let confidenceLevel: 'high' | 'medium' | 'low' = 'low';
  if (progress.length >= 10 && notes.length >= 3) {
    confidenceLevel = 'high';
  } else if (progress.length >= 5 || notes.length >= 2) {
    confidenceLevel = 'medium';
  }

  // Generate narratives
  const narratives = generateNarratives(
    child.name,
    childAge,
    progress.length,
    areaDistribution,
    detectedPeriods,
    sentiment,
    redFlags,
    yellowFlags,
    recommendations,
    repetitionHighlights
  );

  return {
    child_id: child.id,
    child_name: child.name,
    child_age: Math.round(childAge * 10) / 10,
    week_start: weekStart,
    week_end: weekEnd,

    total_works: progress.length,
    area_distribution: areaDistribution,
    expected_distribution: expectedDistribution,

    concentration_score: concentrationScore,
    avg_duration_minutes: noteAnalysis.summary.avg_duration,
    expected_duration_minutes: expectedDuration,
    concentration_assessment: sentiment.concentration,

    work_patterns: workPatterns,
    repetition_highlights: repetitionHighlights,

    detected_sensitive_periods: detectedPeriods.slice(0, 5).map(d => ({
      period_id: d.period.id,
      period_name: d.period.name,
      status: d.status,
      confidence: d.confidence,
      evidence: [
        ...d.evidence.work_matches.map(w => `Chose: ${w}`),
        ...d.evidence.note_matches.map(k => `Note mentioned: "${k}"`),
        d.evidence.repetition_signal ? 'High repetition observed' : '',
      ].filter(Boolean),
    })),

    red_flags: redFlags,
    yellow_flags: yellowFlags,

    recommended_works: recommendations.map(r => ({
      work_name: r.work.name,
      area: r.work.area,
      score: r.score,
      reasons: r.reasons,
    })),
    areas_needing_attention: areasNeedingAttention,

    emotional_state: sentiment.emotional,
    social_development: sentiment.social,

    teacher_summary: narratives.teacher,
    parent_summary: narratives.parent,
    psychological_profile: narratives.psychological,

    generated_at: new Date().toISOString(),
    confidence_level: confidenceLevel,
  };
}

// ============================================
// FLAG DETECTION
// ============================================

function detectFlags(
  age: number,
  progress: WeeklyAnalysisInput['progress'],
  noteAnalysis: ReturnType<typeof parseNotes>,
  areaStats: AreaStats[],
  sentiment: ReturnType<typeof getOverallSentiment>,
  workPatterns: WorkPattern[]
): { redFlags: Flag[]; yellowFlags: Flag[] } {
  const redFlags: Flag[] = [];
  const yellowFlags: Flag[] = [];

  // 1. Check concentration issues
  if (noteAnalysis.summary.concentration_negative >= 3) {
    redFlags.push({
      type: 'red',
      category: 'concentration',
      issue: 'Persistent concentration difficulties',
      evidence: `${noteAnalysis.summary.concentration_negative} notes mentioned concentration issues`,
      recommendation: 'Consider environmental factors, check if works are at appropriate level, ensure basic needs are met',
    });
  } else if (noteAnalysis.summary.concentration_negative >= 2) {
    yellowFlags.push({
      type: 'yellow',
      category: 'concentration',
      issue: 'Some concentration difficulties noted',
      evidence: `${noteAnalysis.summary.concentration_negative} notes mentioned concentration issues`,
      recommendation: 'Monitor closely, try practical life activities to build focus',
    });
  }

  // 2. Check area avoidance
  for (const stat of areaStats) {
    if (stat.days_since_work > 21) {
      redFlags.push({
        type: 'red',
        category: 'avoidance',
        issue: `${stat.area.replace('_', ' ')} completely avoided`,
        evidence: `No work in ${stat.days_since_work} days`,
        recommendation: 'Investigate cause - fear, lack of interest, or missing prerequisites?',
      });
    } else if (stat.days_since_work > 14) {
      yellowFlags.push({
        type: 'yellow',
        category: 'avoidance',
        issue: `${stat.area.replace('_', ' ')} neglected`,
        evidence: `No work in ${stat.days_since_work} days`,
        recommendation: 'Gently invite to area, prepare enticing new work',
      });
    }
  }

  // 3. Check emotional concerns
  if (noteAnalysis.summary.emotion_negative >= 3) {
    redFlags.push({
      type: 'red',
      category: 'emotional',
      issue: 'Frequent emotional distress',
      evidence: `${noteAnalysis.summary.emotion_negative} notes mentioned negative emotions`,
      recommendation: 'Schedule parent conference, observe triggers, provide emotional support',
    });
  } else if (noteAnalysis.summary.emotion_negative >= 2) {
    yellowFlags.push({
      type: 'yellow',
      category: 'emotional',
      issue: 'Some emotional challenges',
      evidence: `${noteAnalysis.summary.emotion_negative} notes mentioned negative emotions`,
      recommendation: 'Observe patterns, offer grace and courtesy activities',
    });
  }

  // 4. Check social concerns
  if (noteAnalysis.summary.social_negative >= 2) {
    yellowFlags.push({
      type: 'yellow',
      category: 'social',
      issue: 'Social interaction challenges',
      evidence: `${noteAnalysis.summary.social_negative} notes mentioned social difficulties`,
      recommendation: 'Model appropriate interactions, consider collaborative works',
    });
  }

  // 5. Check for regression (if concerns mentioned)
  if (noteAnalysis.summary.concerns >= 2) {
    yellowFlags.push({
      type: 'yellow',
      category: 'regression',
      issue: 'Potential regression or skill loss noted',
      evidence: `${noteAnalysis.summary.concerns} concerning observations recorded`,
      recommendation: 'Review recent changes, check prerequisites, consider re-presenting',
    });
  }

  // 6. Check work balance
  const totalWorks = progress.length;
  if (totalWorks > 0) {
    const ageBracket = age < 3 ? '2-3' : age < 4 ? '3-4' : age < 5 ? '4-5' : '5-6';
    const expected = EXPECTED_BALANCE[ageBracket];
    
    for (const stat of areaStats) {
      const exp = expected[stat.area];
      if (exp && stat.percentage_of_total < exp.min * 0.5) {
        yellowFlags.push({
          type: 'yellow',
          category: 'balance',
          issue: `${stat.area.replace('_', ' ')} significantly under-represented`,
          evidence: `${Math.round(stat.percentage_of_total * 100)}% vs expected ${Math.round(exp.min * 100)}%+`,
          recommendation: 'Increase invitations to this area, check for barriers',
        });
      }
    }
  }

  return { redFlags, yellowFlags };
}

// ============================================
// NARRATIVE GENERATION
// ============================================

function generateNarratives(
  childName: string,
  age: number,
  totalWorks: number,
  distribution: Record<string, number>,
  periods: DetectedPeriod[],
  sentiment: ReturnType<typeof getOverallSentiment>,
  redFlags: Flag[],
  yellowFlags: Flag[],
  recommendations: ScoredRecommendation[],
  repetitionHighlights: { work: string; count: number }[]
): { teacher: string; parent: string; psychological: string } {
  
  const firstName = childName.split(' ')[0];
  const activePeriods = periods.filter(p => p.status === 'active').map(p => p.period.name);
  const topArea = Object.entries(distribution).sort((a, b) => b[1] - a[1])[0]?.[0];

  // Teacher summary
  let teacher = `${firstName} (${age.toFixed(1)} years) engaged with ${totalWorks} works this week. `;
  
  if (topArea) {
    teacher += `Primary focus was ${topArea.replace('_', ' ')} (${Math.round((distribution[topArea] || 0) * 100)}%). `;
  }
  
  if (activePeriods.length > 0) {
    teacher += `Active sensitive periods: ${activePeriods.join(', ')}. `;
  }
  
  if (repetitionHighlights.length > 0) {
    teacher += `Notable repetition: ${repetitionHighlights.map(r => `${r.work} (${r.count}x)`).join(', ')}. `;
  }
  
  if (redFlags.length > 0) {
    teacher += `⚠️ ${redFlags.length} area(s) need attention. `;
  }
  
  if (recommendations.length > 0) {
    teacher += `Recommended next: ${recommendations.slice(0, 3).map(r => r.work.name).join(', ')}.`;
  }

  // Parent summary (warm, accessible)
  let parent = `${firstName} had a wonderful week exploring the classroom! `;
  
  if (topArea) {
    const areaNames: Record<string, string> = {
      practical_life: 'care of self and environment',
      sensorial: 'exploring with their senses',
      mathematics: 'numbers and quantities',
      language: 'letters and words',
      cultural: 'learning about the world',
    };
    parent += `They especially enjoyed ${areaNames[topArea] || topArea}. `;
  }
  
  if (repetitionHighlights.length > 0) {
    parent += `${firstName} loved returning to ${repetitionHighlights[0].work} again and again - this deep repetition builds concentration! `;
  }
  
  if (sentiment.emotional === 'positive') {
    parent += `${firstName} showed joy and enthusiasm in their work. `;
  }
  
  parent += `Keep encouraging ${firstName}'s curiosity at home!`;

  // Psychological profile (clinical, for teacher's eyes)
  let psychological = `Developmental Profile: ${firstName}, ${age.toFixed(1)} years\n\n`;
  
  psychological += `CONCENTRATION: ${sentiment.concentration.toUpperCase()}\n`;
  psychological += `EMOTIONAL STATE: ${sentiment.emotional.toUpperCase()}\n`;
  psychological += `SOCIAL DEVELOPMENT: ${sentiment.social.toUpperCase()}\n\n`;
  
  if (activePeriods.length > 0) {
    psychological += `ACTIVE SENSITIVE PERIODS:\n`;
    for (const p of periods.filter(p => p.status === 'active').slice(0, 3)) {
      psychological += `- ${p.period.name} (${p.confidence}% confidence): ${p.period.behavioral_signs[0]}\n`;
    }
    psychological += '\n';
  }
  
  if (redFlags.length > 0 || yellowFlags.length > 0) {
    psychological += `AREAS OF CONCERN:\n`;
    for (const f of [...redFlags, ...yellowFlags].slice(0, 5)) {
      psychological += `- [${f.type.toUpperCase()}] ${f.issue}: ${f.evidence}\n`;
    }
    psychological += '\n';
  }
  
  psychological += `RECOMMENDATIONS:\n`;
  for (const r of recommendations.slice(0, 3)) {
    psychological += `- ${r.work.name} (${r.work.area}): ${r.reasons[0]}\n`;
  }

  return { teacher, parent, psychological };
}

// ============================================
// EXPORT HELPER TYPES
// ============================================

export type { WorkPattern, DetectedPeriod, AreaStats, ScoredRecommendation };
