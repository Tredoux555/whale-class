// app/api/montree/paper-scan/route.ts
// Recent scans for the page's history list + the entry point for polling.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

const SCAN_LIST_LIMIT = 20;

const SCAN_COLUMNS =
  'id, school_id, classroom_id, teacher_id, storage_path, sheet_date, status, error_message, ' +
  'extraction_model, overall_confidence, sheet_summary, format_description, children_found, ' +
  'entries_found, created_at, extracted_at, committed_at';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const classroomId = new URL(request.url).searchParams.get('classroom_id');

    // Always school-scoped; classroom_id narrows it further when supplied.
    let query = supabase
      .from('montree_paper_scans')
      .select(SCAN_COLUMNS)
      .eq('school_id', auth.schoolId)
      .order('created_at', { ascending: false })
      .limit(SCAN_LIST_LIMIT);

    if (classroomId) query = query.eq('classroom_id', classroomId);

    const { data: scans, error } = await query;

    if (error) {
      console.error('[PaperScan] List error:', error.message);
      return NextResponse.json({ success: false, error: 'Failed to load scans' }, { status: 500 });
    }

    return NextResponse.json({ success: true, scans: scans || [] });
  } catch (error) {
    console.error('[PaperScan] List error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load scans' }, { status: 500 });
  }
}
