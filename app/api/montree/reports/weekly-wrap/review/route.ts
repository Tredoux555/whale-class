// /api/montree/reports/weekly-wrap/review/route.ts
// GET: Load all reports for a given week for the review page
// Query params: classroom_id, week_number, report_year

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const url = new URL(request.url);
    const classroom_id = url.searchParams.get('classroom_id');
    const week_number = parseInt(url.searchParams.get('week_number') || '0');
    const report_year = parseInt(url.searchParams.get('report_year') || '0');

    if (!classroom_id || !week_number || !report_year) {
      return NextResponse.json(
        { error: 'classroom_id, week_number, and report_year are required' },
        { status: 400 }
      );
    }

    // Verify classroom belongs to this school (cross-pollination guard)
    const { data: classroomCheck } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('id', classroom_id)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (!classroomCheck) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Get all reports for this week (both teacher and parent)
    const { data: reportsRaw } = await supabase
      .from('montree_weekly_reports')
      .select('id, child_id, report_type, status, content')
      .eq('classroom_id', classroom_id)
      .eq('week_number', week_number)
      .eq('report_year', report_year)
      .in('report_type', ['teacher', 'parent']);

    const reports = (reportsRaw || []) as Array<{
      id: string; child_id: string; report_type: string;
      status: string; content: Record<string, unknown>;
    }>;

    // Get children info
    const childIds = [...new Set(reports.map(r => r.child_id))];
    if (childIds.length === 0) {
      return NextResponse.json({ reports: [] });
    }

    const { data: childrenRaw } = await supabase
      .from('montree_children')
      .select('id, name')
      .in('id', childIds);

    const children = (childrenRaw || []) as Array<{ id: string; name: string }>;
    const childMap = new Map(children.map(c => [c.id, c.name]));

    // Group by child
    const byChild = new Map<string, {
      teacher_report: Record<string, unknown> | null;
      parent_content: Record<string, unknown> | null;
      parent_report_id: string | null;
    }>();

    for (const r of reports) {
      if (!byChild.has(r.child_id)) {
        byChild.set(r.child_id, { teacher_report: null, parent_content: null, parent_report_id: null });
      }
      const entry = byChild.get(r.child_id)!;
      if (r.report_type === 'teacher') {
        entry.teacher_report = r.content;
      }
      if (r.report_type === 'parent') {
        entry.parent_content = r.content;
        entry.parent_report_id = r.id;
      }
    }

    // Build results
    const results = Array.from(byChild.entries()).map(([childId, data]) => {
      const parentNarrative = (data.parent_content?.narrative as { summary?: string })?.summary || null;
      const photoCount = ((data.parent_content?.photos as unknown[]) || []).length;
      const teacherFlags = (data.teacher_report?.flags as Array<{ level: string }>) || [];
      const flagsCount = teacherFlags.length;

      return {
        child_id: childId,
        child_name: childMap.get(childId) || 'Unknown',
        teacher_report: data.teacher_report,
        parent_narrative: parentNarrative,
        photo_count: photoCount,
        flags_count: flagsCount,
        report_id: data.parent_report_id,
      };
    });

    return NextResponse.json({ reports: results });
  } catch (error) {
    console.error('Weekly wrap review error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
