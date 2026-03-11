import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { getSupabase } from '@/lib/supabase-client';

// POST /api/montree/guru/corrections — Record a teacher correction for self-learning
// Called when teacher changes work_id in PhotoEditModal (correcting Smart Capture)
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const {
      media_id,
      child_id,
      original_work_name,
      original_work_id,
      original_area,
      original_confidence,
      corrected_work_name,
      corrected_work_id,
      corrected_area,
      correction_type = 'work_mismatch',
      action,
    } = body;

    if (!original_work_id && !original_work_name) {
      return NextResponse.json({ error: 'Missing original identification' }, { status: 400 });
    }

    // Security: verify child belongs to school
    if (child_id && auth.schoolId) {
      const access = await verifyChildBelongsToSchool(child_id, auth.schoolId);
      if (!access.allowed) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const supabase = getSupabase();
    const classroomId = auth.classroomId;

    if (!classroomId) {
      return NextResponse.json({ error: 'No classroom found' }, { status: 400 });
    }

    // CONFIRM path: teacher says "yes, the identification was correct"
    // Only updates accuracy EMA as correct — does NOT record a correction entry
    if (action === 'confirm') {
      if (original_work_name) {
        try {
          await supabase.rpc('update_work_accuracy', {
            p_classroom_id: classroomId,
            p_work_name: original_work_name,
            p_work_id: null,
            p_area: original_area || null,
            p_was_correct: true,
          });
        } catch {
          // Non-fatal — accuracy tracking is best-effort
        }
      }
      console.log(`[Corrections] Confirmed correct: "${original_work_name}" (classroom ${classroomId})`);
      return NextResponse.json({ success: true, confirmed: true });
    }

    // 1. Record the correction
    const { data: correction, error: corrError } = await supabase
      .from('montree_guru_corrections')
      .insert({
        classroom_id: classroomId,
        media_id: media_id || null,
        child_id: child_id || null,
        original_work_name,
        original_work_id: original_work_id || null,
        original_area: original_area || null,
        original_confidence: typeof original_confidence === 'number' ? original_confidence : null,
        corrected_work_name: corrected_work_name || null,
        corrected_work_id: corrected_work_id || null,
        corrected_area: corrected_area || null,
        correction_type,
        teacher_id: auth.userId || null,
      })
      .select('id')
      .maybeSingle();

    if (corrError) {
      console.error('[Corrections] Insert error:', corrError);
      return NextResponse.json({ error: 'Failed to record correction' }, { status: 500 });
    }

    // 2. Update accuracy EMA — mark the original as incorrect
    if (original_work_name) {
      try {
        await supabase.rpc('update_work_accuracy', {
          p_classroom_id: classroomId,
          p_work_name: original_work_name,
          p_work_id: null,
          p_area: original_area || null,
          p_was_correct: false,
        });
      } catch {
        // Non-fatal — accuracy tracking is best-effort
      }
    }

    // 3. If corrected to a different work, mark the corrected work as correct
    if (corrected_work_name && corrected_work_name !== original_work_name) {
      try {
        await supabase.rpc('update_work_accuracy', {
          p_classroom_id: classroomId,
          p_work_name: corrected_work_name,
          p_work_id: null,
          p_area: corrected_area || null,
          p_was_correct: true,
        });
      } catch {
        // Non-fatal
      }
    }

    // 4. Feed into brain learning system — vision_learnings category
    // This teaches the brain what works LOOK like so future identifications improve
    try {
      const learningText = `Smart Capture misidentified "${original_work_name}" as the work in a photo — teacher corrected it to "${corrected_work_name || 'untagged'}". These works may look visually similar. Original area: ${original_area || 'unknown'}, corrected area: ${corrected_area || 'unknown'}.`;

      // Fetch existing brain, create if doesn't exist
      const { data: brain } = await supabase
        .from('montree_guru_brain')
        .select('raw_learnings')
        .eq('id', 'global')
        .maybeSingle();

      const rawLearnings = (brain && Array.isArray(brain.raw_learnings))
        ? brain.raw_learnings
        : [];

      rawLearnings.push({
        text: learningText,
        category: 'vision_learnings',
        areas: [original_area, corrected_area].filter(Boolean),
        learning_type: 'failure',
        timestamp: new Date().toISOString(),
      });

      if (brain) {
        // Update existing
        await supabase
          .from('montree_guru_brain')
          .update({ raw_learnings: rawLearnings, updated_at: new Date().toISOString() })
          .eq('id', 'global');
      } else {
        // Bootstrap — create global brain row
        await supabase
          .from('montree_guru_brain')
          .insert({ id: 'global', raw_learnings: rawLearnings });
      }
    } catch {
      // Non-fatal — brain learning is best-effort
    }

    console.log(`[Corrections] Recorded: "${original_work_name}" → "${corrected_work_name}" (classroom ${classroomId})`);

    return NextResponse.json({
      success: true,
      correction_id: correction?.id || null,
    });
  } catch (error) {
    console.error('[Corrections] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
