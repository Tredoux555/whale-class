// /api/montree/reports/weekly-wrap/montage
//
// Teacher-facing montage controls for a single weekly report.
//   POST { report_id }        → (re)queue a montage render (explicit regenerate;
//                               this DOES reset an existing non-rendering job).
//   GET  ?report_id=<id>      → { status, montage_path } for the teacher UI.
//
// Auth mirrors weekly-wrap/send: verifySchoolRequest, then a school-ownership
// check on the report. 42P01-safe: if migration 301 hasn't run, POST returns a
// clean 503 and GET degrades to nulls.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

async function loadOwnedReport(
  supabase: ReturnType<typeof getSupabase>,
  reportId: string,
  schoolId: string
): Promise<
  | { ok: true; report: { id: string; child_id: string; school_id: string; classroom_id: string | null } }
  | { ok: false; response: NextResponse }
> {
  const { data: report } = await supabase
    .from('montree_weekly_reports')
    .select('id, child_id, school_id, classroom_id')
    .eq('id', reportId)
    .maybeSingle();

  if (!report) {
    return { ok: false, response: NextResponse.json({ error: 'Report not found' }, { status: 404 }) };
  }
  if (report.school_id !== schoolId) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true, report: report as { id: string; child_id: string; school_id: string; classroom_id: string | null } };
}

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  let body: { report_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const reportId = body?.report_id;
  if (typeof reportId !== 'string' || !reportId) {
    return NextResponse.json({ error: 'report_id is required' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    const owned = await loadOwnedReport(supabase, reportId, auth.schoolId);
    if (!owned.ok) return owned.response;
    const { report } = owned;

    // Existing job? If it's currently rendering, don't disturb it.
    const { data: existing, error: existErr } = await supabase
      .from('montree_montage_jobs')
      .select('status')
      .eq('report_id', reportId)
      .maybeSingle();

    if (existErr) {
      if (existErr.code === '42P01') {
        return NextResponse.json({ error: 'montage system not migrated' }, { status: 503 });
      }
      console.error('[weekly-wrap/montage] job lookup failed:', existErr.message);
      return NextResponse.json({ error: 'Failed to check montage job' }, { status: 500 });
    }
    if ((existing as { status?: string } | null)?.status === 'rendering') {
      return NextResponse.json({ error: 'already rendering' }, { status: 409 });
    }

    // Explicit regenerate — reset the job to a fresh queued state.
    const { error: upsertErr } = await supabase
      .from('montree_montage_jobs')
      .upsert(
        {
          report_id: reportId,
          child_id: report.child_id,
          school_id: report.school_id,
          classroom_id: report.classroom_id ?? null,
          status: 'queued',
          attempts: 0,
          error: null,
          next_attempt_at: null,
          output_path: null,
          finished_at: null,
        },
        { onConflict: 'report_id' }
      );

    if (upsertErr) {
      if (upsertErr.code === '42P01') {
        return NextResponse.json({ error: 'montage system not migrated' }, { status: 503 });
      }
      console.error('[weekly-wrap/montage] job upsert failed:', upsertErr.message);
      return NextResponse.json({ error: 'Failed to queue montage' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: 'queued' });
  } catch (error) {
    console.error('[weekly-wrap/montage] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get('report_id');
  if (!reportId) {
    return NextResponse.json({ error: 'report_id is required' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    const owned = await loadOwnedReport(supabase, reportId, auth.schoolId);
    if (!owned.ok) return owned.response;

    // Job status (42P01 pre-migration → degrade to null).
    let status: string | null = null;
    const { data: job, error: jobErr } = await supabase
      .from('montree_montage_jobs')
      .select('status')
      .eq('report_id', reportId)
      .maybeSingle();
    if (jobErr && jobErr.code !== '42P01') {
      console.error('[weekly-wrap/montage] GET job lookup failed:', jobErr.message);
    }
    status = (job as { status?: string } | null)?.status ?? null;

    // Rendered-file pointer (42703 pre-migration → degrade to null).
    let montagePath: string | null = null;
    try {
      const { data: rep } = await supabase
        .from('montree_weekly_reports')
        .select('montage_path')
        .eq('id', reportId)
        .maybeSingle();
      montagePath = (rep as { montage_path?: string | null } | null)?.montage_path ?? null;
    } catch {
      // column missing pre-migration — leave null
    }

    return NextResponse.json({ status, montage_path: montagePath });
  } catch (error) {
    console.error('[weekly-wrap/montage] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
