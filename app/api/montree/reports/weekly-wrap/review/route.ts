// /api/montree/reports/weekly-wrap/review/route.ts
// GET: Load all reports for a given week for the review page
// Query params: classroom_id, week_start

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
    const week_start = url.searchParams.get('week_start');

    if (!classroom_id || !week_start) {
      return NextResponse.json(
        { error: 'classroom_id and week_start are required' },
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
      .eq('week_start', week_start)
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
      teacher_report_id: string | null;
      teacher_status: string | null;
      parent_content: Record<string, unknown> | null;
      parent_report_id: string | null;
      parent_status: string | null;
    }>();

    for (const r of reports) {
      if (!byChild.has(r.child_id)) {
        byChild.set(r.child_id, {
          teacher_report: null, teacher_report_id: null, teacher_status: null,
          parent_content: null, parent_report_id: null, parent_status: null,
        });
      }
      const entry = byChild.get(r.child_id)!;
      if (r.report_type === 'teacher') {
        entry.teacher_report = r.content;
        entry.teacher_report_id = r.id;
        entry.teacher_status = r.status;
      }
      if (r.report_type === 'parent') {
        entry.parent_content = r.content;
        entry.parent_report_id = r.id;
        entry.parent_status = r.status;
      }
    }

    // Build results with full data for both tabs
    const results = Array.from(byChild.entries()).map(([childId, data]) => {
      const parentNarrative = (data.parent_content?.narrative as { summary?: string })?.summary || null;
      const parentPhotos = (data.parent_content?.photos as Array<{
        id: string; url: string; work_name?: string; caption?: string; captured_at?: string;
      }>) || [];
      const parentWorks = (data.parent_content?.works as Array<{
        name: string; area: string; status: string;
        parent_description?: string; why_it_matters?: string;
        photo_url?: string; photo_caption?: string;
      }>) || [];
      const photoCount = parentPhotos.length;

      const teacherFlags = (data.teacher_report?.flags as Array<{ level: string; issue: string; recommendation: string }>) || [];
      const flagsCount = teacherFlags.length;
      const keyInsight = (data.teacher_report?.key_insight as string) || null;
      const recommendations = (data.teacher_report?.recommendations as Array<{
        area: string; area_label: string; work: string; reasoning: string;
      }>) || [];
      const areaAnalyses = (data.teacher_report?.area_analyses as Array<{
        area: string; area_label: string; works_count: number; narrative: string;
      }>) || [];

      return {
        child_id: childId,
        child_name: childMap.get(childId) || 'Unknown',
        // Teacher data
        teacher_report: data.teacher_report,
        teacher_report_id: data.teacher_report_id,
        teacher_status: data.teacher_status,
        key_insight: keyInsight,
        recommendations,
        area_analyses: areaAnalyses,
        flags: teacherFlags,
        flags_count: flagsCount,
        // Parent data
        parent_narrative: parentNarrative,
        parent_photos: parentPhotos,
        parent_works: parentWorks,
        photo_count: photoCount,
        report_id: data.parent_report_id,
        parent_status: data.parent_status,
      };
    });

    return NextResponse.json({ reports: results });
  } catch (error) {
    console.error('Weekly wrap review error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
