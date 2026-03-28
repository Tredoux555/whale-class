// GET  /api/montree/intelligence/evidence?child_id=X  — Evidence summary per child
// PATCH /api/montree/intelligence/evidence            — Confirm mastery with evidence
//
// Data sources:
//   montree_child_progress — evidence_photo_count, evidence_photo_days, last_observation_at,
//                           mastery_confirmed_at, mastery_confirmed_by (added by migration 155)
//   montree_behavioral_observations — latest observation timestamp per child+work
import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

export async function GET(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabase();
  const childId = req.nextUrl.searchParams.get('child_id');

  if (!childId || typeof childId !== 'string') {
    return NextResponse.json({ error: 'child_id is required' }, { status: 400 });
  }

  try {
    // Verify child belongs to this school
    const { data: child, error: childErr } = await supabase
      .from('montree_children')
      .select('id')
      .eq('id', childId)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (childErr || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Fetch progress with evidence columns for all active works
    const { data: progress, error: progressErr } = await supabase
      .from('montree_child_progress')
      .select('work_name, area, status, evidence_photo_count, evidence_photo_days, last_observation_at, mastery_confirmed_at, mastery_confirmed_by, updated_at')
      .eq('child_id', childId)
      .in('status', ['presented', 'practicing', 'mastered'])
      .order('updated_at', { ascending: false });

    if (progressErr) {
      console.error('[Evidence] Progress query error:', progressErr);
      return NextResponse.json({ error: 'Failed to load evidence' }, { status: 500 });
    }

    // Build evidence summary per work
    const works = (progress || []).map((p: {
      work_name: string;
      area: string;
      status: string;
      evidence_photo_count: number;
      evidence_photo_days: number;
      last_observation_at: string | null;
      mastery_confirmed_at: string | null;
      mastery_confirmed_by: string | null;
      updated_at: string;
    }) => ({
      work_name: p.work_name,
      area: p.area,
      status: p.status,
      evidence_photo_count: p.evidence_photo_count || 0,
      evidence_photo_days: p.evidence_photo_days || 0,
      last_observation_at: p.last_observation_at,
      mastery_confirmed_at: p.mastery_confirmed_at,
      mastery_confirmed_by: p.mastery_confirmed_by,
      updated_at: p.updated_at,
      // Evidence thresholds: 3+ photos across 3+ days = strong evidence
      evidence_strength: getEvidenceStrength(p.evidence_photo_count || 0, p.evidence_photo_days || 0),
    }));

    return NextResponse.json({
      child_id: childId,
      works,
      total: works.length,
    }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('[Evidence] GET unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getEvidenceStrength(photoCount: number, photoDays: number): 'none' | 'weak' | 'moderate' | 'strong' {
  if (photoCount === 0) return 'none';
  if (photoCount >= 3 && photoDays >= 3) return 'strong';
  if (photoCount >= 2 || photoDays >= 2) return 'moderate';
  return 'weak';
}

export async function PATCH(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabase();

  try {
    const body = await req.json();
    const { child_id, action } = body;
    const work_name = typeof body.work_name === 'string' ? body.work_name.trim() : '';

    if (!child_id || typeof child_id !== 'string') {
      return NextResponse.json({ error: 'child_id is required' }, { status: 400 });
    }
    if (!work_name || typeof work_name !== 'string') {
      return NextResponse.json({ error: 'work_name is required' }, { status: 400 });
    }
    if (!action || typeof action !== 'string' || !['confirm_mastery', 'revoke_mastery'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use: confirm_mastery, revoke_mastery' }, { status: 400 });
    }

    // Verify child belongs to this school
    const { data: child, error: childErr } = await supabase
      .from('montree_children')
      .select('id')
      .eq('id', child_id)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (childErr || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Verify progress row exists before updating
    const { data: existing, error: existErr } = await supabase
      .from('montree_child_progress')
      .select('status')
      .eq('child_id', child_id)
      .eq('work_name', work_name)
      .maybeSingle();

    if (existErr) {
      console.error('[Evidence] Progress lookup error:', existErr);
      return NextResponse.json({ error: 'Failed to look up progress' }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: 'No progress record found for this work' }, { status: 404 });
    }

    if (action === 'confirm_mastery') {
      // Teacher confirms mastery — records who and when
      const { error: updateErr } = await supabase
        .from('montree_child_progress')
        .update({
          status: 'mastered',
          mastery_confirmed_at: new Date().toISOString(),
          mastery_confirmed_by: auth.userId,
        })
        .eq('child_id', child_id)
        .eq('work_name', work_name);

      if (updateErr) {
        console.error('[Evidence] Confirm mastery error:', updateErr);
        return NextResponse.json({ error: 'Failed to confirm mastery' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'confirm_mastery' });

    } else {
      // revoke_mastery — Teacher revokes mastery confirmation — reverts to practicing
      const { error: updateErr } = await supabase
        .from('montree_child_progress')
        .update({
          status: 'practicing',
          mastery_confirmed_at: null,
          mastery_confirmed_by: null,
        })
        .eq('child_id', child_id)
        .eq('work_name', work_name);

      if (updateErr) {
        console.error('[Evidence] Revoke mastery error:', updateErr);
        return NextResponse.json({ error: 'Failed to revoke mastery' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'revoke_mastery' });
    }
  } catch (err) {
    console.error('[Evidence] PATCH unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
