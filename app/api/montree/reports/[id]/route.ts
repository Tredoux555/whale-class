// /api/montree/reports/[id]/route.ts
// GET single report by ID

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const { id } = await params;
    const reportId = id;

    if (!reportId) {
      return NextResponse.json({ error: 'Report ID required' }, { status: 400 });
    }

    // 🚨 audit-fix (Sep 2026, finding 6): scope to the caller's school.
    // Without this any authenticated teacher could read any school's report
    // (child name, work narrative, teacher commentary) given only its id.
    // montree_weekly_reports.school_id is NOT NULL (migration 050:85).
    const { data: report, error } = await supabase
      .from('montree_weekly_reports')
      .select('*')
      .eq('id', reportId)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (error || !report) {
      if (error) console.error('Report fetch error:', error);
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, report });

  } catch (error) {
    console.error('Report GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update report status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const { id } = await params;
    const reportId = id;
    const body = await request.json();
    const { status, approved_by, sent_to } = body;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    
    if (status) {
      updates.status = status;
      if (status === 'approved') {
        updates.approved_at = new Date().toISOString();
        updates.approved_by = approved_by || 'teacher';
      }
      if (status === 'sent') {
        updates.sent_at = new Date().toISOString();
        updates.sent_to = sent_to || [];
        // Mark as published so parents can see it
        updates.is_published = true;
        updates.published_at = new Date().toISOString();
      }
    }

    // 🚨 audit-fix (Sep 2026, finding 6): same scoping on the write path —
    // PATCH status:'sent' publishes a report to parents, so an unscoped update
    // let a teacher force-publish another school's draft.
    const { data: report, error } = await supabase
      .from('montree_weekly_reports')
      .update(updates)
      .eq('id', reportId)
      .eq('school_id', auth.schoolId)
      .select()
      .maybeSingle();

    if (!error && !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (error) {
      console.error('Report update error:', error);
      return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
    }

    return NextResponse.json({ success: true, report });

  } catch (error) {
    console.error('Report PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
