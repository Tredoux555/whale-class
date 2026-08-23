// app/api/montree/paper-scan/extraction/[extractionId]/route.ts
// Approve / reject / edit a single extraction row, plus batch approve for a
// whole scan. Mirrors voice-observation/extraction/[extractionId].
//
// For the batch action the [extractionId] segment is ignored (the scan id in
// the body identifies the target set) — same shape voice uses for its batch
// actions, so the client can POST to any extraction URL.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';

const VALID_FINAL_STATUSES = ['presented', 'practicing', 'mastered'];
// Migration 336 — the review screen edits these three alongside the old fields.
const VALID_TIME_BUCKETS = ['short', 'medium', 'long'];
const VALID_CONCENTRATIONS = ['wd', 'wc', 'dc'];
const NOTE_MAX = 2000;
const FREQUENCY_MAX = 99;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ extractionId: string }> }
) {
  try {
    const { extractionId } = await params;
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const body = await request.json().catch(() => ({}));
    const { action } = body as { action?: string };

    if (!action) {
      return NextResponse.json({ success: false, error: 'action is required' }, { status: 400 });
    }

    // ---- Batch: approve every still-pending, child-matched row of a scan ----
    if (action === 'approve_all') {
      const scanId = (body.scan_id || body.scanId) as string | undefined;
      if (!scanId) {
        return NextResponse.json({ success: false, error: 'scan_id required' }, { status: 400 });
      }

      const { data: scan } = await supabase
        .from('montree_paper_scans')
        .select('id, school_id')
        .eq('id', scanId)
        .maybeSingle();

      if (!scan || scan.school_id !== auth.schoolId) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }

      // Rows with no matched child are deliberately left pending — approving
      // them would commit nothing and hide the fact that they need a child.
      const { data: updated, error } = await supabase
        .from('montree_paper_scan_extractions')
        .update({ review_status: 'approved' })
        .eq('scan_id', scanId)
        .eq('review_status', 'pending')
        .not('child_id', 'is', null)
        .select('id');

      if (error) {
        console.error('[PaperScan] Batch approve error:', error.message);
        return NextResponse.json({ success: false, error: 'Batch approve failed' }, { status: 500 });
      }

      return NextResponse.json({ success: true, updated: updated?.length || 0 });
    }

    // ---- Single row: approve / reject / edit ----
    if (!['approve', 'reject', 'edit'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'action must be approve, reject, edit, or approve_all' },
        { status: 400 }
      );
    }

    const { data: extraction } = await supabase
      .from('montree_paper_scan_extractions')
      .select('id, scan_id, school_id')
      .eq('id', extractionId)
      .maybeSingle();

    if (!extraction) {
      return NextResponse.json({ success: false, error: 'Extraction not found' }, { status: 404 });
    }
    if (extraction.school_id !== auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const update: Record<string, unknown> = {};

    if (action === 'approve') {
      update.review_status = 'approved';
    } else if (action === 'reject') {
      update.review_status = 'rejected';
    } else {
      update.review_status = 'edited';

      // Accept snake_case (this feature's contract) and the camelCase aliases
      // voice-observation's client uses, so either shape works.
      const childId = (body.child_id ?? body.childId) as string | null | undefined;
      const workName = (body.work_name ?? body.workName) as string | null | undefined;
      const workKey = (body.work_key ?? body.workKey) as string | null | undefined;
      const area = (body.area) as string | null | undefined;
      const finalStatus = (body.teacher_final_status ?? body.finalStatus) as string | null | undefined;
      const timeMinutes = (body.time_minutes ?? body.timeMinutes) as number | null | undefined;
      const frequency = (body.frequency ?? body.tally) as number | null | undefined;
      const timeBucket = (body.time_bucket ?? body.timeBucket) as string | null | undefined;
      const concentration = (body.concentration) as string | null | undefined;
      const finalNote = (body.teacher_final_note ?? body.finalNote ?? body.teacher_final_notes) as string | null | undefined;

      if (childId !== undefined) {
        if (childId === null) {
          update.child_id = null;
          update.match_confidence = null;
        } else {
          // 🚨 Client-supplied child_id — must be verified against the school.
          const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
          if (!access.allowed) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
          }
          update.child_id = childId;
          // The teacher chose this child by hand — that is certainty, not a
          // fuzzy score.
          update.match_confidence = 1;
        }
      }

      if (workName !== undefined) update.work_name = workName || null;
      if (workKey !== undefined) update.work_key = workKey || null;
      if (area !== undefined) update.area = area || null;

      if (finalStatus !== undefined) {
        if (finalStatus !== null && !VALID_FINAL_STATUSES.includes(finalStatus)) {
          return NextResponse.json(
            { success: false, error: `teacher_final_status must be one of: ${VALID_FINAL_STATUSES.join(', ')}` },
            { status: 400 }
          );
        }
        update.teacher_final_status = finalStatus || null;
      }

      if (timeMinutes !== undefined) {
        if (timeMinutes !== null && (typeof timeMinutes !== 'number' || !Number.isFinite(timeMinutes) || timeMinutes < 0)) {
          return NextResponse.json(
            { success: false, error: 'time_minutes must be a non-negative number' },
            { status: 400 }
          );
        }
        update.time_minutes = timeMinutes === null ? null : Math.round(timeMinutes);
      }

      if (frequency !== undefined) {
        if (frequency !== null && (typeof frequency !== 'number' || !Number.isFinite(frequency) || frequency < 0)) {
          return NextResponse.json(
            { success: false, error: 'frequency must be a non-negative number' },
            { status: 400 }
          );
        }
        // 0 means "the teacher cleared the tally" — store it as null (unmarked),
        // which is what an empty tally box means on the sheet.
        const rounded = frequency === null ? null : Math.min(Math.round(frequency), FREQUENCY_MAX);
        update.frequency = rounded && rounded > 0 ? rounded : null;
      }

      if (timeBucket !== undefined) {
        if (timeBucket !== null && !VALID_TIME_BUCKETS.includes(timeBucket)) {
          return NextResponse.json(
            { success: false, error: `time_bucket must be one of: ${VALID_TIME_BUCKETS.join(', ')}` },
            { status: 400 }
          );
        }
        update.time_bucket = timeBucket || null;
      }

      if (concentration !== undefined) {
        const lower = typeof concentration === 'string' ? concentration.toLowerCase() : concentration;
        if (lower !== null && (typeof lower !== 'string' || !VALID_CONCENTRATIONS.includes(lower))) {
          return NextResponse.json(
            { success: false, error: `concentration must be one of: ${VALID_CONCENTRATIONS.join(', ')}` },
            { status: 400 }
          );
        }
        update.concentration = lower || null;
      }

      if (finalNote !== undefined) {
        update.teacher_final_note = finalNote ? String(finalNote).slice(0, NOTE_MAX) : null;
      }
    }

    const { error } = await supabase
      .from('montree_paper_scan_extractions')
      .update(update)
      .eq('id', extractionId);

    if (error) {
      console.error('[PaperScan] Extraction update error:', error.message);
      return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: 1 });
  } catch (error) {
    console.error('[PaperScan] Extraction PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update extraction' },
      { status: 500 }
    );
  }
}
