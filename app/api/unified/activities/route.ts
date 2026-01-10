// /app/api/unified/activities/route.ts
// UNIFIED API: Curriculum Activities with Progress
// Single source of truth - reads from curriculum_roadmap + child_work_progress

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface Activity {
  id: string;
  name: string;
  area: string;
  area_label: string;
  area_icon: string;
  sequence_order: number;
  status: number;
  status_label: string;
  presented_date: string | null;
  practicing_date: string | null;
  mastered_date: string | null;
  updated_at: string | null;
  updated_by: string | null;
  notes: string | null;
}

// Area mappings
const areaIcons: Record<string, string> = {
  practical_life: '🧹',
  sensorial: '👁️',
  mathematics: '🔢',
  language: '📚',
  cultural: '🌍'
};

const areaLabels: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  cultural: 'Cultural'
};

const statusLabels: Record<number, string> = {
  0: 'Not Started',
  1: 'Presented',
  2: 'Practicing',
  3: 'Mastered'
};

// GET: Get curriculum activities with child's progress
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('child_id');
  const area = searchParams.get('area'); // Optional filter
  const statusFilter = searchParams.get('status'); // Optional: 0,1,2,3

  if (!childId) {
    return NextResponse.json({ error: 'child_id required' }, { status: 400 });
  }

  try {
    // Get all curriculum works
    let curriculumQuery = supabase
      .from('curriculum_roadmap')
      .select('id, name, area, sequence_order')
      .order('sequence_order');

    if (area) {
      curriculumQuery = curriculumQuery.eq('area', area);
    }

    const { data: curriculum, error: curriculumError } = await curriculumQuery;
    if (curriculumError) throw curriculumError;

    // Get child's progress
    const { data: progress, error: progressError } = await supabase
      .from('child_work_progress')
      .select('work_id, status, presented_date, practicing_date, mastered_date, updated_at, updated_by, notes')
      .eq('child_id', childId);

    if (progressError) throw progressError;

    // Create progress lookup
    const progressMap = Object.fromEntries(
      (progress || []).map(p => [p.work_id, p])
    );

    // Build activities list
    let activities: Activity[] = (curriculum || []).map(work => {
      const prog = progressMap[work.id];
      return {
        id: work.id,
        name: work.name,
        area: work.area,
        area_label: areaLabels[work.area] || work.area,
        area_icon: areaIcons[work.area] || '📌',
        sequence_order: work.sequence_order,
        status: prog?.status ?? 0,
        status_label: statusLabels[prog?.status ?? 0],
        presented_date: prog?.presented_date || null,
        practicing_date: prog?.practicing_date || null,
        mastered_date: prog?.mastered_date || null,
        updated_at: prog?.updated_at || null,
        updated_by: prog?.updated_by || null,
        notes: prog?.notes || null
      };
    });

    // Apply status filter if provided
    if (statusFilter !== null && statusFilter !== undefined) {
      const statuses = statusFilter.split(',').map(s => parseInt(s.trim()));
      activities = activities.filter(a => statuses.includes(a.status));
    }

    // Group by area
    const byArea: Record<string, Activity[]> = {};
    activities.forEach(a => {
      if (!byArea[a.area]) byArea[a.area] = [];
      byArea[a.area].push(a);
    });

    // Create summary stats
    const summary = {
      total: activities.length,
      not_started: activities.filter(a => a.status === 0).length,
      presented: activities.filter(a => a.status === 1).length,
      practicing: activities.filter(a => a.status === 2).length,
      mastered: activities.filter(a => a.status === 3).length,
      by_area: Object.entries(byArea).map(([areaKey, items]) => ({
        area: areaKey,
        area_label: areaLabels[areaKey] || areaKey,
        area_icon: areaIcons[areaKey] || '📌',
        total: items.length,
        not_started: items.filter(i => i.status === 0).length,
        presented: items.filter(i => i.status === 1).length,
        practicing: items.filter(i => i.status === 2).length,
        mastered: items.filter(i => i.status === 3).length
      }))
    };

    return NextResponse.json({
      child_id: childId,
      activities,
      by_area: byArea,
      summary,
      generated_at: new Date().toISOString()
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error getting activities:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Update activity progress (for parent tracking at home)
export async function POST(request: NextRequest) {
  const supabase = getSupabase();

  try {
    const body = await request.json();
    const { child_id, work_id, status, notes } = body;

    if (!child_id || !work_id || status === undefined) {
      return NextResponse.json(
        { error: 'child_id, work_id, and status required' },
        { status: 400 }
      );
    }

    // Build update object
    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      child_id,
      work_id,
      status,
      updated_at: now,
      updated_by: 'parent' // Mark as parent update
    };

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Set date fields based on status
    if (status === 1) updateData.presented_date = now;
    if (status === 2) updateData.practicing_date = now;
    if (status === 3) updateData.mastered_date = now;

    // Upsert the progress record
    const { data: progress, error } = await supabase
      .from('child_work_progress')
      .upsert(updateData, {
        onConflict: 'child_id,work_id'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      progress,
      updated: true,
      status_label: statusLabels[status]
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating activity:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
