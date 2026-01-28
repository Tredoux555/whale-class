// /api/montree/reports/[id]/route.ts
// GET single report by ID

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabase();
    const reportId = params.id;

    if (!reportId) {
      return NextResponse.json({ error: 'Report ID required' }, { status: 400 });
    }

    const { data: report, error } = await supabase
      .from('montree_weekly_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (error || !report) {
      console.error('Report fetch error:', error);
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
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabase();
    const reportId = params.id;
    const body = await request.json();
    const { status, approved_by, sent_to } = body;

    const updates: any = { updated_at: new Date().toISOString() };
    
    if (status) {
      updates.status = status;
      if (status === 'approved') {
        updates.approved_at = new Date().toISOString();
        updates.approved_by = approved_by || 'teacher';
      }
      if (status === 'sent') {
        updates.sent_at = new Date().toISOString();
        updates.sent_to = sent_to || [];
      }
    }

    const { data: report, error } = await supabase
      .from('montree_weekly_reports')
      .update(updates)
      .eq('id', reportId)
      .select()
      .single();

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
