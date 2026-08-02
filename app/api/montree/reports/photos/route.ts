// /api/montree/reports/photos/route.ts
// PATCH - Update photos selected for a report

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSchoolTimezone, currentWeekStartInTz } from '@/lib/montree/school-time';

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { child_id, selected_media_ids } = body;

    if (!child_id || !Array.isArray(selected_media_ids)) {
      return NextResponse.json(
        { error: 'child_id and selected_media_ids array required' },
        { status: 400 }
      );
    }

    // Get the current draft report (or create one).
    // School-local MONDAY convention (matches reports/send, reports/preview and
    // the weekly-wrap system) — via the server-side timezone authority.
    const tz = await getSchoolTimezone(auth.schoolId);
    const weekStartStr = currentWeekStartInTz(tz);
    // A UTC-midnight Date of that Monday, used only to derive week_number /
    // report_year via the unchanged formula below, and week_end (start + 6).
    const weekStart = new Date(`${weekStartStr}T00:00:00Z`);
    const weekEndDate = new Date(weekStart);
    weekEndDate.setUTCDate(weekStart.getUTCDate() + 6);
    const weekEndStr = weekEndDate.toISOString().split('T')[0];

    // Get child info including classroom
    const { data: child } = await supabase
      .from('montree_children')
      .select('classroom_id, classroom:montree_classrooms!classroom_id(school_id)')
      .eq('id', child_id)
      .maybeSingle();

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    const classroom = Array.isArray(child.classroom) ? child.classroom[0] : child.classroom;
    const school_id = classroom?.school_id;

    // SECURITY: child_id arrives from the request body. verifySchoolRequest only
    // proves the caller holds a valid token for SOME school — without comparing
    // the resolved school here, a teacher at School A could rewrite School B's
    // parent-facing weekly report photo set (the delete + insert below are
    // scoped only by report_id).
    if (!school_id || school_id !== auth.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Calculate week_number and report_year
    const reportYear = weekStart.getFullYear();
    const startOfYear = new Date(reportYear, 0, 1);
    const daysSinceStart = Math.floor((weekStart.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);

    // First try to find existing report for this week
    const { data: existingReport } = await supabase
      .from('montree_weekly_reports')
      .select('id')
      .eq('child_id', child_id)
      .eq('week_start', weekStartStr)
      .maybeSingle();

    let report = existingReport;

    // If no existing report, create one
    if (!report) {
      const { data: newReport, error: reportError } = await supabase
        .from('montree_weekly_reports')
        .insert({
          child_id,
          classroom_id: child.classroom_id,
          school_id,
          week_start: weekStartStr,
          week_end: weekEndStr,
          week_number: weekNumber,
          report_year: reportYear,
          report_type: 'teacher',
          status: 'draft',
          content: {},
        })
        .select('id')
        .maybeSingle();

      if (reportError || !newReport) {
        console.error('Report insert error:', reportError);
        return NextResponse.json(
          { error: 'Failed to create/get report' },
          { status: 500 }
        );
      }
      report = newReport;
    }

    // Delete existing report media for this report
    await supabase
      .from('montree_report_media')
      .delete()
      .eq('report_id', report.id);

    // Insert new report media entries.
    // SECURITY: selected_media_ids arrives straight from the client, so each id
    // must be proven to belong to this school AND this child before it is
    // attached to a parent-facing report. Group photos legitimately carry
    // child_id = null on montree_media and link through montree_media_children,
    // so both ownership routes are accepted; anything matching neither is
    // dropped (this is also what keeps another child's photo out of the report).
    let attachedCount = 0;
    if (selected_media_ids.length > 0) {
      const [ownedRes, junctionRes] = await Promise.all([
        supabase
          .from('montree_media')
          .select('id, child_id')
          .in('id', selected_media_ids)
          .eq('school_id', school_id),
        supabase
          .from('montree_media_children')
          .select('media_id')
          .in('media_id', selected_media_ids)
          .eq('child_id', child_id),
      ]);

      // A transient failure on either lookup must NOT be read as "the teacher
      // owns none of these photos" — that would silently attach zero photos to
      // a parent report while returning success.
      if (ownedRes.error || junctionRes.error) {
        console.error(
          '[ReportPhotos] Media ownership lookup failed:',
          ownedRes.error || junctionRes.error
        );
        return NextResponse.json(
          { error: 'Failed to verify photo ownership' },
          { status: 500 }
        );
      }

      const junctionIds = new Set(
        (junctionRes.data || []).map((r: { media_id: string }) => r.media_id)
      );
      const ownedIds = new Set(
        (ownedRes.data || [])
          .filter(
            (m: { id: string; child_id: string | null }) =>
              m.child_id === child_id || junctionIds.has(m.id)
          )
          .map((m: { id: string }) => m.id)
      );

      const rejected = selected_media_ids.filter((id: string) => !ownedIds.has(id));
      if (rejected.length > 0) {
        console.warn(
          `[ReportPhotos] Rejected ${rejected.length} media id(s) not owned by child ${child_id}`
        );
      }

      const mediaEntries = selected_media_ids
        .filter((media_id: string) => ownedIds.has(media_id))
        .map((media_id: string, index: number) => ({
          report_id: report.id,
          media_id,
          display_order: index,
        }));

      attachedCount = mediaEntries.length;

      if (mediaEntries.length > 0) {
        const { error: insertError } = await supabase
          .from('montree_report_media')
          .insert(mediaEntries);

        if (insertError) {
          console.error('Media insert error:', insertError);
          return NextResponse.json(
            { error: 'Failed to update photos' },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      report_id: report.id,
      photos_count: attachedCount,
    });
  } catch (error) {
    console.error('Photo update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
