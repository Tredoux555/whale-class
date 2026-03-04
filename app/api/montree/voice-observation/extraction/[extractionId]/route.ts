// app/api/montree/voice-observation/extraction/[extractionId]/route.ts
// Approve, reject, edit individual extractions + batch operations

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ extractionId: string }> }
) {
  try {
    const { extractionId } = await params;
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'action is required' }, { status: 400 });
    }

    // ---- Batch approve high confidence ----
    if (action === 'approve_high_confidence') {
      const { sessionId, minConfidence = 0.9 } = body;
      if (!sessionId) {
        return NextResponse.json({ success: false, error: 'sessionId required' }, { status: 400 });
      }

      // Verify session belongs to school
      const { data: sess } = await supabase
        .from('voice_observation_sessions')
        .select('id, school_id')
        .eq('id', sessionId)
        .single();
      if (!sess || sess.school_id !== auth.schoolId) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }

      const now = new Date().toISOString();
      const { data: updated, error } = await supabase
        .from('voice_observation_extractions')
        .update({ review_status: 'approved', reviewed_at: now })
        .eq('session_id', sessionId)
        .eq('review_status', 'pending')
        .gte('status_confidence', minConfidence)
        .select('id');

      if (error) {
        console.error('[VoiceObs] Batch approve error:', error);
        return NextResponse.json({ success: false, error: 'Batch approve failed' }, { status: 500 });
      }

      // Update session counts
      await updateSessionCounts(supabase, sessionId);

      return NextResponse.json({ success: true, updated: updated?.length || 0 });
    }

    // ---- Batch approve by IDs ----
    if (action === 'batch_approve') {
      const { extractionIds } = body;
      if (!Array.isArray(extractionIds) || extractionIds.length === 0) {
        return NextResponse.json({ success: false, error: 'extractionIds array required' }, { status: 400 });
      }

      // Verify all extractions belong to this school
      const { data: exts } = await supabase
        .from('voice_observation_extractions')
        .select('id, session_id')
        .in('id', extractionIds);

      if (!exts || exts.length === 0) {
        return NextResponse.json({ success: false, error: 'No extractions found' }, { status: 404 });
      }

      const sessionIds = [...new Set(exts.map(e => e.session_id))];
      const { data: sessions } = await supabase
        .from('voice_observation_sessions')
        .select('id, school_id')
        .in('id', sessionIds);

      const allBelongToSchool = (sessions || []).every(s => s.school_id === auth.schoolId);
      if (!allBelongToSchool) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }

      const now = new Date().toISOString();
      const { data: updated, error } = await supabase
        .from('voice_observation_extractions')
        .update({ review_status: 'approved', reviewed_at: now })
        .in('id', extractionIds)
        .select('id');

      if (error) {
        console.error('[VoiceObs] Batch approve error:', error);
        return NextResponse.json({ success: false, error: 'Batch approve failed' }, { status: 500 });
      }

      // Update session counts for all affected sessions
      for (const sid of sessionIds) {
        await updateSessionCounts(supabase, sid);
      }

      return NextResponse.json({ success: true, updated: updated?.length || 0 });
    }

    // ---- Single extraction: approve / reject / edit ----
    if (!['approve', 'reject', 'edit'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'action must be approve, reject, edit, batch_approve, or approve_high_confidence' },
        { status: 400 }
      );
    }

    // Fetch extraction + verify school ownership (cross-pollination check)
    const { data: extraction } = await supabase
      .from('voice_observation_extractions')
      .select('id, session_id')
      .eq('id', extractionId)
      .single();

    if (!extraction) {
      return NextResponse.json({ success: false, error: 'Extraction not found' }, { status: 404 });
    }

    const { data: sess } = await supabase
      .from('voice_observation_sessions')
      .select('id, school_id')
      .eq('id', extraction.session_id)
      .single();

    if (!sess || sess.school_id !== auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const update: Record<string, any> = { reviewed_at: now };

    if (action === 'approve') {
      update.review_status = 'approved';
    } else if (action === 'reject') {
      update.review_status = 'rejected';
    } else if (action === 'edit') {
      update.review_status = 'edited';
      if (body.finalStatus) update.teacher_final_status = body.finalStatus;
      if (body.finalNotes) update.teacher_final_notes = body.finalNotes;
      if (body.childId) update.child_id = body.childId;
      if (body.workKey) update.work_key = body.workKey;
      if (body.workName) update.work_name = body.workName;
      if (body.area) update.area = body.area;
    }

    const { error } = await supabase
      .from('voice_observation_extractions')
      .update(update)
      .eq('id', extractionId);

    if (error) {
      console.error('[VoiceObs] Extraction update error:', error);
      return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 });
    }

    // Update session counts
    await updateSessionCounts(supabase, extraction.session_id);

    return NextResponse.json({ success: true, updated: 1 });
  } catch (error) {
    console.error('[VoiceObs] Extraction PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update extraction' },
      { status: 500 }
    );
  }
}

/** Recount approved/rejected for a session */
async function updateSessionCounts(supabase: any, sessionId: string) {
  const { count: approved } = await supabase
    .from('voice_observation_extractions')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .in('review_status', ['approved', 'edited']);

  const { count: rejected } = await supabase
    .from('voice_observation_extractions')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('review_status', 'rejected');

  await supabase
    .from('voice_observation_sessions')
    .update({ approved_count: approved || 0, rejected_count: rejected || 0 })
    .eq('id', sessionId);
}
