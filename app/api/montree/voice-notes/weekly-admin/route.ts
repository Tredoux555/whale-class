// app/api/montree/voice-notes/weekly-admin/route.ts
// POST: Generate weekly admin narratives + plan tables for a classroom
// GET: Fetch existing generated output

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getSupabase } from '@/lib/supabase-client';
import { generateWeeklyAdmin } from '@/lib/montree/voice-notes/weekly-admin';
import { getWeekStart } from '@/lib/montree/voice-notes/extraction';

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const classroomId = body.classroom_id || auth.classroomId;
    const weekStart = body.week_start || getWeekStart();
    const locale = body.locale || 'en';

    if (!classroomId) {
      return NextResponse.json({ error: 'classroom_id required' }, { status: 400 });
    }

    // Validate locale
    if (!['en', 'zh'].includes(locale)) {
      return NextResponse.json({ error: 'locale must be "en" or "zh"' }, { status: 400 });
    }

    // Rate limit: 3 per classroom per day (1440 minutes = 24 hours)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const supabase = getSupabase();
    const { allowed } = await checkRateLimit(supabase, ip, `/api/montree/voice-notes/weekly-admin:${classroomId}`, 3, 1440);
    if (!allowed) {
      return NextResponse.json({ error: 'Generation limit reached (max 3/day per classroom)' }, { status: 429 });
    }

    // Verify classroom belongs to school
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('id, school_id')
      .eq('id', classroomId)
      .eq('school_id', auth.schoolId)
      .single();

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Generate weekly admin
    const result = await generateWeeklyAdmin(classroomId, auth.schoolId, weekStart, locale);

    if (!result) {
      return NextResponse.json({ error: 'Failed to generate weekly admin' }, { status: 500 });
    }

    // Calculate week end
    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 4);
    const weekEnd = weekEndDate.toISOString().split('T')[0];

    // Save to DB
    const { data: saved, error: saveError } = await supabase
      .from('montree_weekly_admin_output')
      .insert({
        classroom_id: classroomId,
        teacher_id: auth.userId,
        school_id: auth.schoolId,
        week_start: weekStart,
        week_end: weekEnd,
        locale,
        narrative_summaries: result.narratives,
        weekly_plan_tables: result.plans,
        narratives_text: result.narratives_text,
        plans_text: result.plans_text,
        children_count: result.children_count,
        total_notes_count: result.total_notes_count,
      })
      .select('id')
      .single();

    if (saveError) {
      console.error('[weekly-admin] Save error:', saveError);
      // Still return the result even if save fails
    }

    return NextResponse.json({
      success: true,
      id: saved?.id || null,
      narratives_text: result.narratives_text,
      plans_text: result.plans_text,
      narratives: result.narratives,
      plans: result.plans,
      children_count: result.children_count,
      total_notes_count: result.total_notes_count,
      week_start: weekStart,
      week_end: weekEnd,
    });
  } catch (err) {
    console.error('[weekly-admin] POST error:', err);
    return NextResponse.json({ error: 'Failed to generate weekly admin' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const classroomId = searchParams.get('classroom_id') || auth.classroomId;
  const weekStart = searchParams.get('week_start') || getWeekStart();

  if (!classroomId) {
    return NextResponse.json({ error: 'classroom_id required' }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('montree_weekly_admin_output')
    .select('*')
    .eq('classroom_id', classroomId)
    .eq('school_id', auth.schoolId)
    .eq('week_start', weekStart)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[weekly-admin] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch weekly admin' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    output: data || null,
    week_start: weekStart,
  });
}
