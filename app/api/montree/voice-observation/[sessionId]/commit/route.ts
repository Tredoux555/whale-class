// app/api/montree/voice-observation/[sessionId]/commit/route.ts
// Commit approved observations → montree_child_progress, then DELETE all audio + transcripts

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { deleteSessionAudioAndTranscripts } from '@/lib/montree/voice';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();

    // Verify session ownership and status
    const { data: session } = await supabase
      .from('voice_observation_sessions')
      .select('id, teacher_id, school_id, classroom_id, status')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }
    if (session.teacher_id !== auth.userId || session.school_id !== auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }
    if (session.status !== 'ready_for_review') {
      return NextResponse.json(
        { success: false, error: 'Session must be in ready_for_review status to commit' },
        { status: 400 }
      );
    }

    // Fetch approved/edited extractions
    const { data: approved } = await supabase
      .from('voice_observation_extractions')
      .select('*')
      .eq('session_id', sessionId)
      .in('review_status', ['approved', 'edited']);

    const { count: rejectedCount } = await supabase
      .from('voice_observation_extractions')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('review_status', 'rejected');

    const approvedExtractions = approved || [];

    // Validate: all approved extractions must have a child_id
    const unassigned = approvedExtractions.filter(e => !e.child_id);
    if (unassigned.length > 0) {
      return NextResponse.json({
        success: false,
        error: `${unassigned.length} approved observation(s) have no student assigned. Please assign all students before committing.`,
        unassignedIds: unassigned.map(e => e.id),
      }, { status: 400 });
    }

    // Commit each approved extraction to montree_child_progress
    let committedCount = 0;
    const errors: string[] = [];

    for (const ext of approvedExtractions) {
      const finalStatus = ext.teacher_final_status || ext.proposed_status;
      const workName = ext.work_name;
      const area = ext.area;

      try {
        // Upsert progress record
        if (workName && finalStatus) {
          const { error: progressError } = await supabase
            .from('montree_child_progress')
            .upsert({
              child_id: ext.child_id,
              classroom_id: session.classroom_id,
              work_name: workName,
              work_key: ext.work_key || null,
              area: area || 'practical_life',
              status: finalStatus,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'child_id,work_name',
            });

          if (progressError) {
            console.error('[VoiceObs] Progress upsert error:', progressError);
            errors.push(`Progress update failed for extraction ${ext.id}`);
            continue;
          }
        }

        // Insert behavioral observation if notes present
        const notes = ext.teacher_final_notes || ext.behavioral_notes;
        if (notes && ext.event_type === 'behavioral') {
          await supabase
            .from('montree_behavioral_observations')
            .insert({
              child_id: ext.child_id,
              classroom_id: session.classroom_id,
              teacher_id: auth.userId,
              content: notes,
              observation_text: ext.observation_text,
              source: 'voice_observation',
              created_at: new Date().toISOString(),
            });
        }

        committedCount++;
      } catch (err) {
        console.error('[VoiceObs] Commit extraction error:', err);
        errors.push(`Failed to commit extraction ${ext.id}`);
      }
    }

    // If no extractions committed successfully, return error
    if (committedCount === 0 && approvedExtractions.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Failed to commit any extractions',
        details: errors,
      }, { status: 500 });
    }

    // ========================================
    // PERMANENT DELETION — Privacy requirement
    // ========================================
    await deleteSessionAudioAndTranscripts(sessionId);

    // Update session to committed
    const now = new Date().toISOString();
    await supabase
      .from('voice_observation_sessions')
      .update({
        status: 'committed',
        committed_at: now,
        transcript_deleted_at: now,
        approved_count: committedCount,
        rejected_count: rejectedCount || 0,
      })
      .eq('id', sessionId);

    return NextResponse.json({
      success: true,
      committedCount,
      rejectedCount: rejectedCount || 0,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[VoiceObs] Commit error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to commit observations' },
      { status: 500 }
    );
  }
}
