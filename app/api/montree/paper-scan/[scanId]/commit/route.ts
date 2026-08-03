// app/api/montree/paper-scan/[scanId]/commit/route.ts
//
// Commit the approved rows of a scan → montree_child_progress +
// montree_behavioral_observations, then DELETE the raw sheet photo.
//
// PRIVACY RULING: the photograph of the sheet is NOT retained after commit.
// Same shape as voice-observation, which deletes all audio + transcripts at
// commit time. The structured, teacher-approved result is the record; the
// image was only ever the transport.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { advanceProgressOnConfirm } from '@/lib/montree/progress/advance-on-confirm';
import { writeProgress } from '@/lib/montree/progress/write-progress';
import { PAPER_SCAN_BUCKET, type PaperScanExtractionRow } from '@/lib/montree/paper-scan/types';

// The progress ladder (not_started < presented < practicing < mastered) is enforced
// by lib/montree/progress/write-progress.ts — the single sanctioned writer. The local
// STATUS_RANK table this route used to carry lives there now.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ scanId: string }> }
) {
  try {
    const { scanId } = await params;
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();

    const { data: scan } = await supabase
      .from('montree_paper_scans')
      .select('id, school_id, classroom_id, teacher_id, storage_path, status')
      .eq('id', scanId)
      .maybeSingle();

    if (!scan) {
      return NextResponse.json({ success: false, error: 'Scan not found' }, { status: 404 });
    }
    // Ownership check copied from voice-observation's commit: the teacher who
    // took the photo is the one who signs off on what it says.
    if (scan.teacher_id !== auth.userId || scan.school_id !== auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }
    if (scan.status !== 'review') {
      return NextResponse.json(
        { success: false, error: 'Scan must be in review status to commit' },
        { status: 400 }
      );
    }

    const { data: approvedRows } = await supabase
      .from('montree_paper_scan_extractions')
      .select('*')
      .eq('scan_id', scanId)
      .in('review_status', ['approved', 'edited']);

    const approved = (approvedRows || []) as PaperScanExtractionRow[];

    let progressUpdated = 0;
    let progressFailed = 0;
    let observationsCreated = 0;
    let skipped = 0;
    const errors: string[] = [];
    const unassignedIds: string[] = [];
    const now = new Date().toISOString();

    for (const ext of approved) {
      // No child means nothing to file it against. Unlike voice (which 400s
      // the whole commit), we skip and report the ids — a single unassigned
      // row shouldn't block the other nineteen from landing.
      if (!ext.child_id) {
        skipped++;
        unassignedIds.push(ext.id);
        continue;
      }

      let didSomething = false;

      try {
        const workName = (ext.work_name || ext.work_name_raw || '').trim();
        const finalStatus = ext.teacher_final_status || ext.proposed_status || null;

        if (workName) {
          if (finalStatus) {
            // Never-downgrade is the primitive's default: a sheet that says
            // "presented" must not undo a mastered work.
            // EXCEPTION: an explicit teacher_final_status is a teacher decision
            // (the review screen's status picker) and always wins — same principle
            // as the P/P/M picker elsewhere in the app. That, and only that, sets
            // allowDowngrade.
            const result = await writeProgress(supabase, {
              childId: ext.child_id,
              workName,
              workKey: ext.work_key || null,
              area: ext.area || 'practical_life',
              status: finalStatus,
              source: 'paper_scan',
              classroomId: scan.classroom_id,
              schoolId: scan.school_id,
              allowDowngrade: !!ext.teacher_final_status,
            }, { actor: auth.userId || null });

            if (result.outcome === 'failed') {
              // audit-fix (Aug 2026): the scan is marked 'committed' below and the
              // sheet photo is deleted regardless, so a swallowed upsert failure is
              // unrecoverable data loss. Count it and surface it in the response.
              console.error('[PaperScan] Progress write error:', result.error);
              progressFailed++;
              errors.push(`Progress update failed for extraction ${ext.id}`);
            } else if (result.outcome === 'written') {
              progressUpdated++;
              didSomething = true;
            } else {
              // Already at or above this rung — the record stands.
              didSomething = true;
            }
          } else {
            // The sheet names a work but carries no status mark. That is still
            // evidence the child did the work, so it goes up the ladder one
            // rung via the house's single source of truth for exactly this.
            await advanceProgressOnConfirm({
              supabase,
              childId: ext.child_id,
              workName,
              area: ext.area,
              source: 'paper_scan',
              classroomId: scan.classroom_id,
              schoolId: scan.school_id,
              actor: auth.userId || null,
            });
            progressUpdated++;
            didSomething = true;
          }
        }

        // Notes → behavioural observation. Covers both the work-attached note
        // and the child-level general note; a row with a note but no work
        // produces an observation and nothing else.
        const entryNote = (ext.teacher_final_note || ext.note || '').trim();
        const generalNote = (ext.general_note || '').trim();
        const content = [entryNote, generalNote].filter(Boolean).join('\n');

        if (content) {
          const { error: obsError } = await supabase
            .from('montree_behavioral_observations')
            .insert({
              child_id: ext.child_id,
              classroom_id: scan.classroom_id,
              teacher_id: auth.userId,
              content,
              observation_text: content,
              source: 'paper_scan',
              created_at: now,
            });

          if (obsError) {
            console.error('[PaperScan] Observation insert error:', obsError.message);
            errors.push(`Observation failed for extraction ${ext.id}`);
          } else {
            observationsCreated++;
            didSomething = true;
          }
        }
      } catch (err) {
        console.error('[PaperScan] Commit extraction error:', err);
        errors.push(`Failed to commit extraction ${ext.id}`);
      }

      if (!didSomething) skipped++;
    }

    // ========================================
    // PERMANENT DELETION — Privacy requirement
    // ========================================
    let photoDeleted = !scan.storage_path;
    if (scan.storage_path) {
      const { error: removeError } = await supabase.storage
        .from(PAPER_SCAN_BUCKET)
        .remove([scan.storage_path]);
      if (removeError) {
        // Non-fatal for the commit, but keep storage_path so a cleanup sweep can
        // find and retry the delete — nulling it here would orphan the photo forever.
        console.error('[PaperScan] Sheet photo delete failed (path retained for retry):', removeError.message);
      } else {
        photoDeleted = true;
      }
    }

    await supabase
      .from('montree_paper_scans')
      .update({
        status: 'committed',
        ...(photoDeleted ? { storage_path: null } : {}),
        committed_at: now,
      })
      .eq('id', scanId);

    return NextResponse.json({
      success: true,
      progress_updated: progressUpdated,
      progress_failed: progressFailed,
      observations_created: observationsCreated,
      skipped,
      unassignedIds: unassignedIds.length > 0 ? unassignedIds : undefined,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[PaperScan] Commit error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to commit scan' },
      { status: 500 }
    );
  }
}
