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
import { buildSessionRow, type ObservationSessionInsert } from '@/lib/montree/paper-scan/session-writer';
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
      .select('id, school_id, classroom_id, teacher_id, storage_path, status, sheet_date, created_at')
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
    const warnings: string[] = [];
    const unassignedIds: string[] = [];
    const sessionRows: ObservationSessionInsert[] = [];
    const now = new Date().toISOString();

    // ── Area, without guessing (audit fix, Aug 2026) ──────────────────────
    // This route used to write `area: ext.area || 'practical_life'`, which
    // filed every unreadable area under Practical Life and quietly corrupted
    // every area balance built on it. The sheet's own area wins; a work_key
    // resolves its area from the classroom curriculum; anything still unknown
    // stays unknown — it produces no observation session, and the progress
    // write goes in without an area rather than with a wrong one.
    const areaByWorkKey = await loadAreasForWorkKeys(
      supabase,
      scan.classroom_id,
      approved.filter((e) => !e.area && e.work_key).map((e) => e.work_key as string),
    );
    const areaFor = (ext: PaperScanExtractionRow): string | null =>
      ext.area || (ext.work_key ? areaByWorkKey.get(ext.work_key) || null : null);

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
        const area = areaFor(ext);
        if (!area && workName) {
          warnings.push(`Area unknown for "${workName}" — no observation session was recorded for it.`);
        }

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
              // Never defaulted. null lets write-progress keep whatever area
              // the child's existing row already carries.
              area,
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
              area,
              source: 'paper_scan',
              classroomId: scan.classroom_id,
              schoolId: scan.school_id,
              actor: auth.userId || null,
            });
            progressUpdated++;
            didSomething = true;
          }
        }

        // ── The frequency/time fact row (336) ──────────────────────────
        // One row per approved extraction, keyed on extraction_id so a
        // re-commit of the same sheet can never double-count a child's day.
        // No area = no row: montree_observation_sessions.area is NOT NULL and
        // a guessed area would poison every heatmap built on it.
        const session = buildSessionRow({
          extraction: ext,
          scan: {
            id: scan.id,
            school_id: scan.school_id,
            classroom_id: scan.classroom_id,
            sheet_date: scan.sheet_date ?? null,
            created_at: scan.created_at ?? null,
          },
          area,
          statusMark: finalStatus,
          source: 'paper_scan',
          actorId: auth.userId || null,
        });
        if (session.row) {
          sessionRows.push(session.row);
          didSomething = true;
        }

        // Notes → behavioural observation. Covers both the work-attached note
        // and the child-level general note; a row with a note but no work
        // produces an observation and nothing else.
        const entryNote = (ext.teacher_final_note || ext.note || '').trim();
        const generalNote = (ext.general_note || '').trim();
        const content = [entryNote, generalNote].filter(Boolean).join('\n');

        if (content) {
          // audit-fix (Aug 23 2026): this used to insert `content` /
          // `observation_text` / `teacher_id` / `created_at` (copied from the
          // voice-observation commit). None of those columns exist on
          // montree_behavioral_observations — the table is `behavior_description`
          // (NOT NULL) / `observed_by` / `observed_at` (110_guru_tables.sql,
          // 176). Every note on a scanned sheet therefore failed to insert, and
          // the period report / weekly-wrap notes feed (which read
          // behavior_description + observed_at) never saw a paper-scan note.
          const { error: obsError } = await supabase
            .from('montree_behavioral_observations')
            .insert({
              child_id: ext.child_id,
              classroom_id: scan.classroom_id,
              observed_by: auth.userId || null,
              behavior_description: content.slice(0, 4000),
              activity_during: (ext.work_name || ext.work_name_raw || '') || null,
              observed_at: now,
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

    // ── Write the sessions in one idempotent batch ────────────────────────
    // Idempotency is the whole point: committing the same sheet twice must not
    // double-count a child's day. The DB backstop is the partial unique index
    // on extraction_id (336) — but ON CONFLICT cannot INFER a partial index,
    // so an upsert would error rather than de-duplicate. The pre-read below is
    // what makes the re-commit a no-op; a 23505 from the index is then treated
    // as "already recorded", not as a failure.
    let sessionsCreated = 0;
    if (sessionRows.length > 0) {
      const extractionIds = sessionRows.map((r) => r.extraction_id).filter(Boolean) as string[];

      const { data: existingSessions } = await supabase
        .from('montree_observation_sessions')
        .select('extraction_id')
        .in('extraction_id', extractionIds);

      const alreadyRecorded = new Set(
        ((existingSessions || []) as Array<{ extraction_id: string | null }>)
          .map((r) => r.extraction_id)
          .filter(Boolean) as string[],
      );

      const freshRows = sessionRows.filter((r) => !r.extraction_id || !alreadyRecorded.has(r.extraction_id));

      if (freshRows.length > 0) {
        const { data: insertedSessions, error: sessionError } = await supabase
          .from('montree_observation_sessions')
          .insert(freshRows)
          .select('id');

        if (sessionError) {
          if (sessionError.code === '23505') {
            // The unique index caught a concurrent commit of the same sheet.
            console.warn('[PaperScan] Observation sessions already recorded for this sheet.');
          } else {
            // Migration 336 may not be applied on this deployment yet — that
            // must not fail a commit whose progress writes already landed.
            console.error('[PaperScan] Observation session insert error:', sessionError.message);
            warnings.push('Work sessions could not be recorded for this sheet.');
          }
        } else {
          sessionsCreated = insertedSessions?.length || 0;
        }
      }
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
      sessions_created: sessionsCreated,
      skipped,
      unassignedIds: unassignedIds.length > 0 ? unassignedIds : undefined,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings.slice(0, 20) : undefined,
    });
  } catch (error) {
    console.error('[PaperScan] Commit error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to commit scan' },
      { status: 500 }
    );
  }
}

/**
 * work_key → area_key for this classroom's curriculum. The same hop Work
 * Rhythm does; one query for the whole sheet, empty map on any failure.
 */
async function loadAreasForWorkKeys(
  supabase: ReturnType<typeof getSupabase>,
  classroomId: string,
  workKeys: string[],
): Promise<Map<string, string>> {
  const keys = [...new Set(workKeys.filter(Boolean))];
  const map = new Map<string, string>();
  if (keys.length === 0) return map;

  try {
    const { data, error } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('work_key, area:montree_classroom_curriculum_areas!area_id(area_key)')
      .eq('classroom_id', classroomId)
      .in('work_key', keys);

    if (error) {
      console.warn('[PaperScan] Area lookup failed:', error.message);
      return map;
    }

    for (const row of (data || []) as Array<{ work_key: string | null; area: unknown }>) {
      if (!row.work_key) continue;
      const area = Array.isArray(row.area) ? row.area[0] : row.area;
      const areaKey = (area as { area_key?: string } | null | undefined)?.area_key;
      if (typeof areaKey === 'string' && areaKey) map.set(row.work_key, areaKey);
    }
  } catch (err) {
    console.warn('[PaperScan] Area lookup threw:', err);
  }

  return map;
}
