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

    // Get child classroom_id
    const { data: child } = await supabase
      .from('montree_children')
      .select('classroom_id')
      .eq('id', child_id)
      .single();

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Upsert draft report if it doesn't exist
    const { data: report, error: reportError } = await supabase
      .from('montree_weekly_reports')
      .upsert(
        {
          child_id,
          classroom_id: child.classroom_id,
          week_start: weekStartStr,
          week_end: weekStartStr,
          report_type: 'teacher',
          status: 'draft',
          content: {},
        },
        {
          onConflict: 'child_id,week_start,report_type',
          ignoreDuplicates: false,
        }
      )
      .select('id')
      .single();

    if (reportError || !report) {
      console.error('Report upsert error:', reportError);
      return NextResponse.json(
        { error: 'Failed to create/get report' },
        { status: 500 }
      );
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
