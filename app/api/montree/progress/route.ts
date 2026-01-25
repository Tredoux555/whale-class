// app/api/montree/progress/route.ts
// GET works with progress for a child, POST to update progress

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// GET /api/montree/progress?child_id=xxx&area=practical_life
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const area = searchParams.get('area');

    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Fetch curriculum works for the area
    let worksQuery = supabase
      .from('curriculum_roadmap')
      .select('id, name, area, category_id, subcategory, sequence_order')
      .order('sequence_order', { ascending: true });

    if (area) {
      worksQuery = worksQuery.eq('area', area);
    }

    const { data: curriculumWorks, error: worksError } = await worksQuery;

    if (worksError) {
      console.error('Works fetch error:', worksError);
      return NextResponse.json({ error: worksError.message }, { status: 500 });
    }

    // Fetch child's progress
    const { data: childProgress } = await supabase
      .from('child_work_progress')
      .select('work_id, status, presented_date, practicing_date, mastered_date')
      .eq('child_id', childId);

    // Map progress by work_id
    const progressMap = new Map();
    (childProgress || []).forEach(p => {
      progressMap.set(p.work_id, p);
    });

    // Get categories for grouping
    const { data: categories } = await supabase
      .from('curriculum_categories')
      .select('id, name');

    const categoryMap = new Map();
    (categories || []).forEach(c => {
      categoryMap.set(c.id, c.name);
    });

    // Combine works with progress
    const works = (curriculumWorks || []).map(work => {
      const progress = progressMap.get(work.id);
      return {
        id: work.id,
        name: work.name,
        area: work.area,
        category: categoryMap.get(work.category_id) || 'Other',
        subcategory: work.subcategory,
        status: progress?.status || 0,
        presented_date: progress?.presented_date,
        practicing_date: progress?.practicing_date,
        mastered_date: progress?.mastered_date,
      };
    });

    return NextResponse.json({ works });

  } catch (error) {
    console.error('Progress API error:', error);
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
  }
}

// POST /api/montree/progress - Update work status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { child_id, work_id, status } = body;

    if (!child_id || !work_id || status === undefined) {
      return NextResponse.json({ error: 'child_id, work_id, and status required' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Prepare date fields based on status
    const now = new Date().toISOString();
    const updates: Record<string, any> = { status };

    if (status === 1) updates.presented_date = now;
    if (status === 2) updates.practicing_date = now;
    if (status === 3) updates.mastered_date = now;

    // Upsert progress record
    const { data, error } = await supabase
      .from('child_work_progress')
      .upsert({
        child_id,
        work_id,
        ...updates,
        updated_at: now,
      }, {
        onConflict: 'child_id,work_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Progress update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, progress: data });

  } catch (error) {
    console.error('Progress POST error:', error);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}
