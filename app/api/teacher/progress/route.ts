import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('childId');
  const area = searchParams.get('area');

  if (!childId) {
    return NextResponse.json({ error: 'childId required' }, { status: 400 });
  }

  // Fetch curriculum works for the area
  // Using correct column names: id, name, area, category_id, sequence_order
  let worksQuery = supabase
    .from('curriculum_roadmap')
    .select('id, name, area, category_id, sequence_order')
    .order('sequence_order', { ascending: true });

  if (area) {
    worksQuery = worksQuery.eq('area', area);
  }

  const { data: curriculumWorks, error: worksError } = await worksQuery;

  if (worksError) {
    console.error('Error fetching curriculum works:', worksError);
    return NextResponse.json({ error: worksError.message }, { status: 500 });
  }

  // Fetch child's progress for these works
  const { data: childProgress, error: progressError } = await supabase
    .from('child_work_progress')
    .select('work_id, status, presented_date, practicing_date, mastered_date')
    .eq('child_id', childId);

  if (progressError) {
    console.error('Error fetching child progress:', progressError);
    // Continue without progress data
  }

  // Create a map of work_id -> progress
  const progressMap = new Map();
  (childProgress || []).forEach(p => {
    progressMap.set(p.work_id, p);
  });

  // Combine works with progress
  const works = (curriculumWorks || []).map(work => {
    const progress = progressMap.get(work.id);
    return {
      id: work.id,
      name: work.name,
      area: work.area,
      category: work.category_id || 'General',
      subcategory: null,
      sequence_order: work.sequence_order,
      status: progress?.status || 0,
      presented_date: progress?.presented_date || null,
      practicing_date: progress?.practicing_date || null,
      mastered_date: progress?.mastered_date || null,
    };
  });

  return NextResponse.json({ works });
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  const body = await request.json();
  const { childId, workId, status } = body;

  if (!childId || !workId) {
    return NextResponse.json({ error: 'childId and workId required' }, { status: 400 });
  }

  // Determine which date field to update based on status
  const dateFields: Record<string, string | null> = {};
  const now = new Date().toISOString();
  
  if (status === 1) dateFields.presented_date = now;
  if (status === 2) dateFields.practicing_date = now;
  if (status === 3) dateFields.mastered_date = now;

  const { data, error } = await supabase
    .from('child_work_progress')
    .upsert({
      child_id: childId,
      work_id: workId,
      status: status || 0,
      updated_at: now,
      ...dateFields
    }, { onConflict: 'child_id,work_id' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ progress: data });
}
