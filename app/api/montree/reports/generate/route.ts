// app/api/montree/reports/generate/route.ts
// Generate formatted reports from weekly analysis
// POST: Generate teacher, parent, and/or AI analysis reports

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { analyzeWeeklyProgress, WeeklyAnalysisResult } from '@/lib/montree/ai';

// ============================================
// TYPES
// ============================================

interface TeacherReport {
  type: 'teacher';
  child_name: string;
  child_age: number;
  week_range: string;
  summary: string;
  metrics: {
    total_works: number;
    concentration_score: number;
    concentration_assessment: string;
    avg_duration?: number;
    expected_duration: number;
  };
  area_breakdown: {
    area: string;
    percentage: number;
    expected_range: string;
    status: 'healthy' | 'low' | 'high';
  }[];
  sensitive_periods: {
    name: string;
    status: string;
    confidence: number;
    evidence: string[];
  }[];
  flags: {
    type: 'red' | 'yellow';
    issue: string;
    evidence: string;
    recommendation: string;
  }[];
  recommendations: {
    work_name: string;
    area: string;
    score: number;
    reasons: string[];
  }[];
  work_patterns: {
    work: string;
    count: number;
  }[];
}

interface ParentReport {
  type: 'parent';
  child_name: string;
  greeting: string;
  highlights: string[];
  areas_explored: {
    area_name: string;
    emoji: string;
    works: string[];
    description: string;
  }[];
  home_suggestions: string[];
  closing: string;
  photos?: { url: string; caption?: string }[];
}

interface AIAnalysisReport {
  type: 'ai_analysis';
  child_name: string;
  child_age: number;
  profile: {
    concentration: string;
    emotional: string;
    social: string;
  };
  sensitive_periods_analysis: string;
  developmental_trajectory: string;
  concerns: {
    severity: string;
    issue: string;
    evidence: string;
    recommendation: string;
  }[];
  two_week_plan: string[];
  observation_questions: string[];
  parent_communication_points: string[];
}

// ============================================
// AREA HELPERS
// ============================================

const AREA_DISPLAY: Record<string, { name: string; emoji: string; description: string }> = {
  practical_life: {
    name: 'Practical Life',
    emoji: '🧹',
    description: 'Activities for independence and care of self and environment',
  },
  sensorial: {
    name: 'Sensorial',
    emoji: '👁️',
    description: 'Exploring the world through the senses',
  },
  mathematics: {
    name: 'Mathematics',
    emoji: '🔢',
    description: 'Understanding numbers, quantities, and patterns',
  },
  language: {
    name: 'Language',
    emoji: '📚',
    description: 'Letters, sounds, reading, and writing',
  },
  cultural: {
    name: 'Cultural',
    emoji: '🌍',
    description: 'Geography, science, art, and music',
  },
};

// ============================================
// REPORT GENERATORS
// ============================================

function generateTeacherReport(analysis: WeeklyAnalysisResult): TeacherReport {
  const areaBreakdown = Object.entries(analysis.area_distribution).map(([area, pct]) => {
    const expected = analysis.expected_distribution[area];
    let status: 'healthy' | 'low' | 'high' = 'healthy';
    if (expected) {
      if (pct < expected.min) status = 'low';
      else if (pct > expected.max) status = 'high';
    }
    return {
      area: AREA_DISPLAY[area]?.name || area,
      percentage: Math.round(pct * 100),
      expected_range: expected ? `${Math.round(expected.min * 100)}-${Math.round(expected.max * 100)}%` : 'N/A',
      status,
    };
  });

  return {
    type: 'teacher',
    child_name: analysis.child_name,
    child_age: analysis.child_age,
    week_range: `${analysis.week_start} to ${analysis.week_end}`,
    summary: analysis.teacher_summary,
    metrics: {
      total_works: analysis.total_works,
      concentration_score: analysis.concentration_score,
      concentration_assessment: analysis.concentration_assessment,
      avg_duration: analysis.avg_duration_minutes,
      expected_duration: analysis.expected_duration_minutes,
    },
    area_breakdown: areaBreakdown,
    sensitive_periods: analysis.detected_sensitive_periods,
    flags: [...analysis.red_flags, ...analysis.yellow_flags],
    recommendations: analysis.recommended_works,
    work_patterns: analysis.repetition_highlights,
  };
}

function generateParentReport(
  analysis: WeeklyAnalysisResult,
  worksByArea: Record<string, string[]>
): ParentReport {
  const firstName = analysis.child_name.split(' ')[0];
  
  // Generate greeting based on emotional state
  let greeting = `${firstName} had a wonderful week in the classroom!`;
  if (analysis.emotional_state === 'positive') {
    greeting = `${firstName} was full of joy and enthusiasm this week!`;
  }

  // Generate highlights
  const highlights: string[] = [];
  if (analysis.repetition_highlights.length > 0) {
    highlights.push(
      `${firstName} showed deep concentration with ${analysis.repetition_highlights[0].work}, returning to it ${analysis.repetition_highlights[0].count} times!`
    );
  }
  if (analysis.concentration_assessment === 'strong') {
    highlights.push(`${firstName} demonstrated excellent focus during work time.`);
  }
  const activePeriods = analysis.detected_sensitive_periods.filter(p => p.status === 'active');
  if (activePeriods.length > 0) {
    highlights.push(
      `${firstName} is showing special interest in ${activePeriods[0].period_name.toLowerCase()} activities.`
    );
  }

  // Generate areas explored
  const areasExplored = Object.entries(worksByArea)
    .filter(([_, works]) => works.length > 0)
    .map(([area, works]) => ({
      area_name: AREA_DISPLAY[area]?.name || area,
      emoji: AREA_DISPLAY[area]?.emoji || '📌',
      works: works.slice(0, 3),
      description: AREA_DISPLAY[area]?.description || '',
    }));

  // Home suggestions
  const homeSuggestions = [
    'Continue encouraging independence at home - let them help with simple tasks!',
    'Read together daily and point out letters in the environment.',
    'Provide opportunities for sorting, counting, and organizing.',
  ];

  // Closing
  const closing = `We love having ${firstName} in our classroom. See you next week!`;

  return {
    type: 'parent',
    child_name: analysis.child_name,
    greeting,
    highlights,
    areas_explored: areasExplored,
    home_suggestions: homeSuggestions,
    closing,
  };
}

function generateAIAnalysisReport(analysis: WeeklyAnalysisResult): AIAnalysisReport {
  const firstName = analysis.child_name.split(' ')[0];

  // Developmental trajectory
  let trajectory = `${firstName} is developing appropriately for their age (${analysis.child_age} years). `;
  if (analysis.detected_sensitive_periods.length > 0) {
    const active = analysis.detected_sensitive_periods.filter(p => p.status === 'active');
    if (active.length > 0) {
      trajectory += `Currently in ${active.map(p => p.period_name).join(' and ')} sensitive period(s), which should be supported with appropriate materials. `;
    }
  }
  if (analysis.concentration_assessment === 'weak') {
    trajectory += `Concentration development needs support - recommend more practical life work. `;
  }

  // Sensitive periods analysis
  let spAnalysis = '';
  for (const sp of analysis.detected_sensitive_periods.slice(0, 3)) {
    spAnalysis += `${sp.period_name} (${sp.status}, ${sp.confidence}% confidence): ${sp.evidence.join('; ')}. `;
  }

  // Two week plan
  const twoWeekPlan = [
    ...analysis.recommended_works.slice(0, 3).map(r => `Present ${r.work_name} (${r.area})`),
    ...analysis.areas_needing_attention.slice(0, 2).map(a => `Invite to ${a.area} area`),
  ];

  // Observation questions
  const observationQuestions = [
    `How does ${firstName} respond to transitions between activities?`,
    `What time of day shows the strongest concentration?`,
    `Which peers does ${firstName} naturally gravitate toward?`,
  ];

  // Parent communication points
  const parentPoints = [
    `${firstName}'s current interests and how to support them at home`,
    `Developmental milestones appropriate for their age`,
  ];
  if (analysis.red_flags.length > 0) {
    parentPoints.push('Areas where we are providing extra support');
  }

  return {
    type: 'ai_analysis',
    child_name: analysis.child_name,
    child_age: analysis.child_age,
    profile: {
      concentration: analysis.concentration_assessment,
      emotional: analysis.emotional_state,
      social: analysis.social_development,
    },
    sensitive_periods_analysis: spAnalysis || 'Insufficient data for sensitive period analysis.',
    developmental_trajectory: trajectory,
    concerns: [...analysis.red_flags, ...analysis.yellow_flags].map(f => ({
      severity: f.type,
      issue: f.issue,
      evidence: f.evidence,
      recommendation: f.recommendation,
    })),
    two_week_plan: twoWeekPlan,
    observation_questions: observationQuestions,
    parent_communication_points: parentPoints,
  };
}

// ============================================
// POST: Generate reports
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { child_id, week_start, week_end, report_types } = body;

    if (!child_id || !week_start || !week_end) {
      return NextResponse.json(
        { success: false, error: 'child_id, week_start, and week_end are required' },
        { status: 400 }
      );
    }

    const requestedTypes = report_types || ['teacher', 'parent', 'ai_analysis'];

    const supabase = getSupabase();

    // Fetch child
    const { data: child } = await supabase
      .from('montree_children')
      .select('id, name, date_of_birth, classroom_id')
      .eq('id', child_id)
      .single();

    if (!child) {
      return NextResponse.json(
        { success: false, error: 'Child not found' },
        { status: 404 }
      );
    }

    // Fetch progress
    const { data: progress } = await supabase
      .from('montree_child_progress')
      .select('*')
      .eq('child_id', child_id)
      .gte('created_at', week_start)
      .lte('created_at', week_end + 'T23:59:59');

    // Fetch historical
    const fourWeeksAgo = new Date(week_start);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    
    const { data: historical } = await supabase
      .from('montree_child_progress')
      .select('work_name, area, status, created_at')
      .eq('child_id', child_id)
      .gte('created_at', fourWeeksAgo.toISOString())
      .lt('created_at', week_start);

    // Fetch curriculum
    const { data: curriculum } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name, area')
      .eq('classroom_id', child.classroom_id);

    // Run analysis
    const analysis = analyzeWeeklyProgress({
      child: {
        id: child.id,
        name: child.name,
        date_of_birth: child.date_of_birth,
        classroom_id: child.classroom_id,
      },
      weekStart: week_start,
      weekEnd: week_end,
      progress: (progress || []).map(p => ({
        work_name: p.work_name,
        area: p.area,
        status: p.status,
        notes: p.notes,
        date: p.created_at,
        duration_minutes: p.duration_minutes,
        repetition_count: p.repetition_count,
      })),
      historicalProgress: (historical || []).map(p => ({
        work_name: p.work_name,
        area: p.area,
        status: p.status,
        date: p.created_at,
      })),
      availableWorks: (curriculum || []).map(w => ({
        id: w.id,
        name: w.name,
        area: w.area,
      })),
    });

    // Group works by area for parent report
    const worksByArea: Record<string, string[]> = {};
    for (const p of progress || []) {
      if (!worksByArea[p.area]) worksByArea[p.area] = [];
      if (!worksByArea[p.area].includes(p.work_name)) {
        worksByArea[p.area].push(p.work_name);
      }
    }

    // Generate requested reports
    const reports: Record<string, any> = {};

    if (requestedTypes.includes('teacher')) {
      reports.teacher = generateTeacherReport(analysis);
    }
    if (requestedTypes.includes('parent')) {
      reports.parent = generateParentReport(analysis, worksByArea);
    }
    if (requestedTypes.includes('ai_analysis')) {
      reports.ai_analysis = generateAIAnalysisReport(analysis);
    }

    return NextResponse.json({
      success: true,
      reports,
      analysis_summary: {
        child_name: analysis.child_name,
        child_age: analysis.child_age,
        total_works: analysis.total_works,
        concentration_score: analysis.concentration_score,
        flags_count: analysis.red_flags.length + analysis.yellow_flags.length,
      },
    });

  } catch (error) {
    console.error('Reports POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
