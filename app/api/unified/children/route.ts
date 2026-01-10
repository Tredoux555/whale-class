// /app/api/unified/children/route.ts
// UNIFIED API: Children with progress from teacher database
// This is THE key integration - reading teacher progress for parents

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface ProgressSummary {
  total_works: number;
  mastered: number;
  practicing: number;
  presented: number;
  not_started: number;
  overall_percent: number;
  by_area: Record<string, {
    total: number;
    mastered: number;
    practicing: number;
    presented: number;
  }>;
}

// GET: Get children for a family with their progress
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const familyId = searchParams.get('family_id');
  const childId = searchParams.get('child_id');
  const includeProgress = searchParams.get('include_progress') !== 'false';
  const unlinked = searchParams.get('unlinked') === 'true';

  try {
    // Build query for children from the UNIFIED children table
    let query = supabase
      .from('children')
      .select('id, name, date_of_birth, color, active_status, family_id, journal_entries')
      .eq('active_status', true)
      .order('name');

    // Filter options
    if (unlinked) {
      // Get children without a family_id (for linking)
      query = query.is('family_id', null);
    } else if (familyId) {
      query = query.eq('family_id', familyId);
    }
    
    if (childId) {
      query = query.eq('id', childId);
    }

    const { data: children, error } = await query;
    if (error) throw error;

    if (!includeProgress) {
      return NextResponse.json({ 
        children: (children || []).map(c => ({
          ...c,
          birth_date: c.date_of_birth // Compatibility mapping
        }))
      });
    }

    // Get total curriculum count from UNIFIED curriculum_roadmap
    const { count: totalWorks } = await supabase
      .from('curriculum_roadmap')
      .select('*', { count: 'exact', head: true });

    // Get curriculum grouped by area
    const { data: curriculum } = await supabase
      .from('curriculum_roadmap')
      .select('id, area');

    const curriculumByArea: Record<string, string[]> = {};
    (curriculum || []).forEach(c => {
      if (!curriculumByArea[c.area]) curriculumByArea[c.area] = [];
      curriculumByArea[c.area].push(c.id);
    });

    const areas = Object.keys(curriculumByArea);

    // Get all progress records for these children from UNIFIED child_work_progress
    const childIds = (children || []).map(c => c.id);
    
    let allProgress: { child_id: string; work_id: string; status: number; updated_at: string; updated_by: string }[] = [];
    if (childIds.length > 0) {
      const { data } = await supabase
        .from('child_work_progress')
        .select('child_id, work_id, status, updated_at, updated_by')
        .in('child_id', childIds);
      allProgress = data || [];
    }

    // Create lookup map: work_id -> area
    const workToArea: Record<string, string> = {};
    (curriculum || []).forEach(c => {
      workToArea[c.id] = c.area;
    });

    // Calculate progress for each child
    const childrenWithProgress = (children || []).map((child) => {
      const childProgress = allProgress.filter(p => p.child_id === child.id);
      
      const mastered = childProgress.filter(p => p.status === 3).length;
      const practicing = childProgress.filter(p => p.status === 2).length;
      const presented = childProgress.filter(p => p.status === 1).length;
      const notStarted = (totalWorks || 0) - mastered - practicing - presented;

      // Calculate by area
      const byArea: ProgressSummary['by_area'] = {};
      areas.forEach(area => {
        const areaWorkIds = curriculumByArea[area] || [];
        const areaProgress = childProgress.filter(p => workToArea[p.work_id] === area);
        
        byArea[area] = {
          total: areaWorkIds.length,
          mastered: areaProgress.filter(p => p.status === 3).length,
          practicing: areaProgress.filter(p => p.status === 2).length,
          presented: areaProgress.filter(p => p.status === 1).length
        };
      });

      const progressSummary: ProgressSummary = {
        total_works: totalWorks || 0,
        mastered,
        practicing,
        presented,
        not_started: notStarted,
        overall_percent: totalWorks ? Math.round((mastered / totalWorks) * 100) : 0,
        by_area: byArea
      };

      return {
        id: child.id,
        name: child.name,
        birth_date: child.date_of_birth,
        date_of_birth: child.date_of_birth,
        color: child.color || '#4F46E5',
        family_id: child.family_id,
        journal_entries: child.journal_entries || [],
        progress_summary: progressSummary
      };
    });

    return NextResponse.json({ children: childrenWithProgress });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching children:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Link a child to a family (for admin/setup)
export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  
  try {
    const body = await request.json();
    const { child_id, family_id, color } = body;

    if (!child_id || !family_id) {
      return NextResponse.json({ error: 'child_id and family_id required' }, { status: 400 });
    }

    // Update the child's family_id in the unified children table
    const updates: Record<string, unknown> = { family_id };
    if (color) updates.color = color;

    const { data: child, error } = await supabase
      .from('children')
      .update(updates)
      .eq('id', child_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ child, linked: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error linking child to family:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT: Update child details (color, journal entries)
export async function PUT(request: NextRequest) {
  const supabase = getSupabase();
  
  try {
    const body = await request.json();
    const { id, color, journal_entries } = body;

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (color !== undefined) updates.color = color;
    if (journal_entries !== undefined) updates.journal_entries = journal_entries;

    const { data: child, error } = await supabase
      .from('children')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ child });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating child:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
