// /api/montree/progress/update/route.ts
// Update work progress status for a child in Montree
// FIXED: Uses UPSERT to prevent duplicate records

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { advanceShelfAfterMastery } from '@/lib/montree/progress/advance-shelf-after-mastery';
import { writeProgress } from '@/lib/montree/progress/write-progress';

// Escape special SQL wildcard characters for safe ILIKE usage
function escapeIlike(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

// Normalize status to standard string format
function normalizeStatus(status: unknown): string {
  if (typeof status === 'number') {
    const map: Record<number, string> = {
      0: 'not_started',
      1: 'presented',
      2: 'practicing',
      3: 'mastered'
    };
    return map[status] || 'not_started';
  }
  if (status === 'completed') return 'mastered';
  const valid = ['not_started', 'presented', 'practicing', 'mastered'];
  return valid.includes(status) ? status : 'not_started';
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await request.json();
    const { child_id, work_key, work_name, status, area, notes, is_focus, is_extra, remove_extra, no_downgrade } = body;

    if (!child_id || (!work_key && !work_name)) {
      return NextResponse.json({ error: 'child_id and work_key/work_name required' }, { status: 400 });
    }

    // SECURITY: Verify child belongs to this user's school
    const access = await verifyChildBelongsToSchool(child_id, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // EARLY RETURN: Remove extra — just delete from extras table, don't touch progress
    if (remove_extra) {
      const workNameToRemove = work_name || work_key;
      try {
        await supabase
          .from('montree_child_extras')
          .delete()
          .eq('child_id', child_id)
          .eq('work_name', workNameToRemove);
      } catch (err) {
        console.error('[progress/update] Remove extra error:', err);
      }
      return NextResponse.json({ success: true });
    }

    // Verify child exists and get classroom_id for curriculum sync
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('id, classroom_id')
      .eq('id', child_id)
      .maybeSingle();

    if (childError || !child) {
      console.error('[progress/update] Child not found:', child_id);
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    const classroomId = child.classroom_id;

    // Normalize status
    const statusStr = normalizeStatus(status);
    const workNameToSave = work_name || work_key;
    const now = new Date().toISOString();

    // NOTE: is_focus column does NOT exist on montree_child_progress in
    // production. Writing it caused 500s on every progress update. The
    // dashboard's fetchAssignments sort gracefully falls back to status
    // priority when is_focus is undefined, so the focus shelf still works
    // correctly without it. The legacy mirror to montree_child_focus_works
    // (further down) still happens — that's the source of truth for legacy
    // consumers. If we ever want true is_focus persistence on the progress
    // table, ship a migration first then re-enable.

    // ── THE WRITE — lib/montree/progress/write-progress.ts owns it ───────────
    // The upsert, the never-downgrade guard, the first-mastery date and the
    // 42P10 fallback that used to live inline here are all the primitive's job
    // now (stamps + the montree_progress_events journal come along for free).
    //
    // ⚠️ RANK-GATE POLARITY — preserved EXACTLY as it has always behaved here:
    // the gate is OPTIONAL and CALLER-SUPPLIED. It engages only when the caller
    // passes no_downgrade AND the requested status isn't 'not_started' (the old
    // guard's own `statusStr !== 'not_started'` condition — a not_started write
    // from this route has always been unconditional). Everything else — the
    // teacher's P/P/M picker, every UI tap — writes whatever it says, including
    // downwards, because a teacher correcting the record is the one actor
    // allowed to move a child back down the ladder.
    // FUTURE TIGHTENING DECISION (WP2): flip this to gated-by-default and give
    // the explicit picker its own correction flag, so unflagged automated
    // callers can't silently downgrade. Not done here: this route is called
    // from a dozen UI paths and changing the default is a product decision,
    // not a refactor.
    const rankGated = !!no_downgrade && statusStr !== 'not_started';

    const result = await writeProgress(supabase, {
      childId: child_id,
      workName: workNameToSave,
      // work_key is NOT forwarded: this route's `work_key` field is historically
      // whatever the caller had to hand — a curriculum row UUID from photo-audit,
      // a bare work name when work_name is absent. The primitive resolves the real
      // catalog slug from the name instead.
      area: area || null,
      status: statusStr,
      source: 'teacher_update',
      classroomId,
      notes: notes !== undefined ? notes : undefined,
      allowDowngrade: !rankGated,
    }, { actor: auth.userId || null });

    if (result.outcome === 'skipped_rank' || result.outcome === 'skipped_noop') {
      return NextResponse.json({ success: true, skipped: true, existing_status: result.previousStatus });
    }

    if (result.outcome === 'failed') {
      console.error('[progress/update] Write failed:', result.error);
      return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
    }

    const data = result.row ?? null;
    const isFirstMastery = result.firstMastery;

    // (Focus demote block removed — was writing is_focus=false to a column
    // that doesn't exist on montree_child_progress, which would have errored.
    // The legacy montree_child_focus_works UPSERT below already enforces
    // single-focus-per-area via its own onConflict('child_id,area') key.)

    // ── BOOKKEEPING — fire and forget, response returns NOW ──────────────────
    // The progress UPSERT above is the source of truth. Everything below is
    // side-effect bookkeeping that the user does not need to wait for. Running
    // these sequentially before the response was costing 400-1500ms of
    // perceived latency on every "add a work" tap. The UI is already
    // optimistic — it doesn't depend on these completing.
    //
    // - Curriculum auto-sync: ensures custom work names get a curriculum row
    //   so they appear in pickers later. Already commented "non-fatal."
    // - Extras upsert: only fires when is_extra=true.
    // - Focus mirror to legacy montree_child_focus_works: derived from this
    //   anyway by progress GET routes; the mirror is just for legacy consumers.

    // Real-time shelf loop: when a work is NEWLY mastered, drop the next
    // curriculum work for that area onto the shelf as 'not_started' — instead of
    // waiting for the weekly replan. Fire-and-forget; the response is already out.
    if (isFirstMastery && classroomId && area) {
      void advanceShelfAfterMastery({
        supabase,
        childId: child_id,
        classroomId,
        area: area || null,
        masteredWorkName: workNameToSave,
      }).catch((err) =>
        console.error('[progress/update] mastery shelf-advance failed (non-fatal):', err),
      );
    }

    if (classroomId && workNameToSave && area) {
      // Curriculum auto-sync (1-4 queries depending on whether work exists).
      void (async () => {
        try {
          const { data: existingWork } = await supabase
            .from('montree_classroom_curriculum_works')
            .select('id')
            .eq('classroom_id', classroomId)
            .ilike('name', escapeIlike(workNameToSave))
            .maybeSingle();

          if (!existingWork) {
            const { data: areaData } = await supabase
              .from('montree_classroom_curriculum_areas')
              .select('id')
              .eq('classroom_id', classroomId)
              .eq('area_key', area)
              .maybeSingle();

            if (areaData) {
              const { data: maxSeq } = await supabase
                .from('montree_classroom_curriculum_works')
                .select('sequence')
                .eq('area_id', areaData.id)
                .order('sequence', { ascending: false })
                .limit(1)
                .maybeSingle();

              const nextSeq = (maxSeq?.sequence || 0) + 1;
              const workKey = `custom_${area}_${Date.now()}`;
              await supabase
                .from('montree_classroom_curriculum_works')
                .insert({
                  classroom_id: classroomId,
                  area_id: areaData.id,
                  work_key: workKey,
                  name: workNameToSave,
                  sequence: nextSeq,
                  is_custom: true,
                  is_active: true,
                });
            }
          }
        } catch (syncErr) {
          console.error('[progress/update] Curriculum sync error (non-fatal):', syncErr);
        }
      })();
    }

    if (is_extra && area) {
      void (async () => {
        try {
          await supabase
            .from('montree_child_extras')
            .upsert({
              child_id,
              work_name: workNameToSave,
              area: area,
            }, {
              onConflict: 'child_id,work_name',
              ignoreDuplicates: true,
            });
        } catch (extraErr) {
          console.error('[progress/update] Extras insert error (non-fatal):', extraErr);
        }
      })();
    }

    if (is_focus && area) {
      void (async () => {
        try {
          const { error: focusError } = await supabase
            .from('montree_child_focus_works')
            .upsert({
              child_id,
              classroom_id: child.classroom_id,
              area: area,
              work_name: workNameToSave,
              set_at: now,
              set_by: 'teacher',
              updated_at: now,
            }, {
              onConflict: 'child_id,area',
            });
          if (focusError) {
            console.error('[progress/update] Focus works update failed:', focusError);
          }
          // Cleanup: remove from extras if this work was previously an extra.
          await supabase
            .from('montree_child_extras')
            .delete()
            .eq('child_id', child_id)
            .eq('work_name', workNameToSave);
        } catch (focusErr) {
          console.error('[progress/update] Focus works error:', focusErr);
        }
      })();
    }

    return NextResponse.json({ success: true, status: statusStr, data });

  } catch (error) {
    console.error('[progress/update] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
