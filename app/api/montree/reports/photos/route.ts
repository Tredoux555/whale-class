// /api/montree/reports/photos/route.ts
// PATCH - Update photos selected for a report

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function PATCH(request: NextRequest) {
  try {
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

    // Get the current draft report (or create one)
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // Get child info including classroom
    const { data: child } = await supabase
      .from('montree_children')
      .select('classroom_id, classroom:montree_classrooms!classroom_id(school_id)')
      .eq('id', child_id)
      .single();

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    const classroom = Array.isArray(child.classroom) ? child.classroom[0] : child.classroom;
    const school_id = classroom?.school_id;

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
      .single();

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
          week_end: weekStartStr,
          week_number: weekNumber,
          report_year: reportYear,
          report_type: 'teacher',
          status: 'draft',
          content: {},
        })
        .select('id')
        .single();

      if (reportError || !newReport) {
        console.error('Report insert error:', reportError);
        return NextResponse.json(
          { error: 'Failed to create/get report', details: reportError?.message },
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

    // Insert new report media entries
    if (selected_media_ids.length > 0) {
      const mediaEntries = selected_media_ids.map((media_id, index) => ({
        report_id: report.id,
        media_id,
        display_order: index,
      }));

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

    return NextResponse.json({
      success: true,
      report_id: report.id,
      photos_count: selected_media_ids.length,
    });
  } catch (error) {
    console.error('Photo update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
