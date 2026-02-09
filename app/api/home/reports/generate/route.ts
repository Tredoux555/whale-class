// /api/home/reports/generate/route.ts
// Generate formatted reports from weekly analysis
// Creates parent-friendly summaries of progress

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

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
}

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
  math: {
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

function generateParentReport(
  childName: string,
  worksByArea: Record<string, string[]>,
  stats: { presented: number; practicing: number; mastered: number }
): ParentReport {
  const firstName = childName.split(' ')[0];

  // Generate greeting
  let greeting = `${firstName} had a wonderful week at home!`;
  if (stats.mastered > 0) {
    greeting = `${firstName} is making fantastic progress with their learning!`;
  }

  // Generate highlights
  const highlights: string[] = [];
  if (stats.mastered > 0) {
    highlights.push(`${firstName} has mastered ${stats.mastered} work(s)!`);
  }
  if (stats.practicing > 0) {
    highlights.push(`${firstName} is actively practicing and refining ${stats.practicing} skill(s).`);
  }
  if (stats.presented > 0) {
    highlights.push(`${firstName} is exploring ${stats.presented} new work(s) with enthusiasm.`);
  }

  // Generate areas explored
  const areasExplored = Object.entries(worksByArea)
    .filter(([_, works]) => works.length > 0)
    .map(([area, works]) => ({
      area_name: AREA_DISPLAY[area]?.name || area,
      emoji: AREA_DISPLAY[area]?.emoji || '📌',
      works: works.slice(0, 5),
      description: AREA_DISPLAY[area]?.description || '',
    }));

  // Home suggestions
  const homeSuggestions = [
    'Continue encouraging independence at home - let them help with simple tasks!',
    'Read together daily and point out letters in the environment.',
    'Provide opportunities for sorting, counting, and organizing.',
    'Give plenty of time for focused, uninterrupted play and exploration.',
    'Celebrate their efforts and discoveries, not just finished products.',
  ];

  // Closing
  const closing = `We love having ${firstName} learning with us. Keep up the wonderful support at home!`;

  return {
    type: 'parent',
    child_name: childName,
    greeting,
    highlights,
    areas_explored: areasExplored,
    home_suggestions: homeSuggestions,
    closing,
  };
}

function errorResponse(error: string, debug?: Record<string, unknown>, status = 500) {
  return NextResponse.json({ success: false, error, ...(debug ? { debug } : {}) }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { child_id, family_id, week_start, week_end, report_types } = body;

    if (!child_id || !family_id || !week_start) {
      return errorResponse('child_id, family_id, and week_start required', undefined, 400);
    }

    const requestedTypes = report_types || ['parent'];

    const supabase = getSupabase();

    // Fetch child
    const { data: child } = await supabase
      .from('home_children')
      .select('id, name')
      .eq('id', child_id)
      .eq('family_id', family_id)
      .single();

    if (!child) {
      return errorResponse('Child not found', undefined, 404);
    }

    // Fetch progress for this week
    const weekStartTime = `${week_start}T00:00:00`;
    const weekEndTime = week_end ? `${week_end}T23:59:59` : new Date().toISOString();

    const { data: progress } = await supabase
      .from('home_progress')
      .select('*')
      .eq('child_id', child_id)
      .gte('created_at', weekStartTime)
      .lte('created_at', weekEndTime);

    // Group works by area for parent report
    const worksByArea: Record<string, string[]> = {};
    const stats = { presented: 0, practicing: 0, mastered: 0 };

    for (const p of progress || []) {
      const area = p.area || 'other';
      if (!worksByArea[area]) worksByArea[area] = [];
      if (!worksByArea[area].includes(p.work_name)) {
        worksByArea[area].push(p.work_name);
      }

      // Count by status
      if (p.status === 1 || p.status === 'presented') stats.presented++;
      else if (p.status === 2 || p.status === 'practicing') stats.practicing++;
      else if (p.status === 3 || p.status === 'mastered' || p.status === 'completed') stats.mastered++;
    }

    // Generate requested reports
    const reports: Record<string, any> = {};

    if (requestedTypes.includes('parent')) {
      reports.parent = generateParentReport(child.name, worksByArea, stats);
    }

    return NextResponse.json({
      success: true,
      reports,
      analysis_summary: {
        child_name: child.name,
        total_works: progress?.length || 0,
        stats,
      },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Reports generate error:', message);
    return errorResponse('Internal server error', { message });
  }
}
