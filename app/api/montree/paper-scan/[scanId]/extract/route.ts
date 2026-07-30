// app/api/montree/paper-scan/[scanId]/extract/route.ts
//
// Read the photographed sheet with Claude vision, match every child to the
// classroom roster and every work to the classroom curriculum, and write one
// extraction row per child x entry for the teacher's review screen.
//
// ⚠ LOAD-BEARING: `maxDuration = 120` below. Railway kills a route at its
// default (~15s) timeout, and the vision call alone takes 30-60s on a dense
// sheet. Without it the scan sits at 'extracting' forever with no error and no
// retry — the exact failure mode that took Apr 22-28 2026 to diagnose on the
// photo-identification pipeline. Do not lower it, do not remove it.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { loadAllCurriculumWorks } from '@/lib/montree/curriculum-loader';
import { matchStudentName, loadAliases } from '@/lib/montree/voice/student-matcher';
import { extractSheet } from '@/lib/montree/paper-scan/extractor';
import { matchWorkName, normalizeWorkName } from '@/lib/montree/paper-scan/work-matcher';
import {
  PAPER_SCAN_BUCKET,
  PAPER_SCAN_FEATURE_KEY,
  type PaperScanExtractionInsert,
  type PaperScanWorkEntry,
  type SheetEntry,
  type SheetExtraction,
} from '@/lib/montree/paper-scan/types';

// Railway route timeout — the LLM takes 30-60s. See the load-bearing note at
// the top of this file before changing.
export const maxDuration = 120;

const ERROR_MESSAGE_MAX = 500;
const SHEET_SUMMARY_MAX = 4000;

/**
 * Supabase's embedded-select typing returns the joined area as either an
 * object or a single-element array depending on the relationship metadata.
 * Normalise both.
 */
function areaKeyOf(area: unknown): string | null {
  if (!area) return null;
  const row = Array.isArray(area) ? area[0] : area;
  const key = (row as { area_key?: string } | undefined)?.area_key;
  return typeof key === 'string' ? key : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ scanId: string }> }
) {
  const { scanId } = await params;

  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabase();

  if (!(await isFeatureEnabled(supabase, auth.schoolId, PAPER_SCAN_FEATURE_KEY))) {
    return NextResponse.json({ success: false, error: 'feature_disabled' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const locale = typeof (body as { locale?: string })?.locale === 'string'
    ? (body as { locale?: string }).locale
    : undefined;

  const { data: scan } = await supabase
    .from('montree_paper_scans')
    .select('id, school_id, classroom_id, teacher_id, storage_path, sheet_date, status')
    .eq('id', scanId)
    .maybeSingle();

  if (!scan) {
    return NextResponse.json({ success: false, error: 'Scan not found' }, { status: 404 });
  }
  if (scan.school_id !== auth.schoolId) {
    return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
  }
  // 'failed' is allowed so a transient vision error is one tap from a retry.
  if (!['pending', 'failed'].includes(scan.status)) {
    return NextResponse.json(
      { success: false, error: `Scan is already ${scan.status}` },
      { status: 400 }
    );
  }
  if (!scan.storage_path) {
    return NextResponse.json(
      { success: false, error: 'Scan has no stored photo' },
      { status: 400 }
    );
  }

  await supabase
    .from('montree_paper_scans')
    .update({ status: 'extracting', error_message: null })
    .eq('id', scanId);

  // Everything below is wrapped: an unhandled throw here would leave the scan
  // stuck at 'extracting' with the teacher staring at a spinner forever.
  try {
    // ----- Image + classroom context (parallel — independent reads) -----
    const [downloadRes, childrenRes, aliases, classroomWorksRes] = await Promise.all([
      supabase.storage.from(PAPER_SCAN_BUCKET).download(scan.storage_path),
      supabase
        .from('montree_children')
        .select('id, name')
        .eq('classroom_id', scan.classroom_id),
      loadAliases(scan.classroom_id),
      supabase
        .from('montree_classroom_curriculum_works')
        .select('name, work_key, area:montree_classroom_curriculum_areas!area_id(area_key)')
        .eq('classroom_id', scan.classroom_id),
    ]);

    if (downloadRes.error || !downloadRes.data) {
      throw new Error(`Could not download sheet photo: ${downloadRes.error?.message || 'not found'}`);
    }

    const imageBase64 = Buffer.from(await downloadRes.data.arrayBuffer()).toString('base64');
    const children = (childrenRes.data || []) as Array<{ id: string; name: string }>;

    // Works list = this classroom's own curriculum rows, extended with the
    // static curriculum for anything the classroom hasn't customised. Used
    // BOTH as the prompt's reading aid and as the matching corpus, so the
    // model and the matcher always see the same vocabulary.
    const works: PaperScanWorkEntry[] = [];
    const seenWorkNames = new Set<string>();
    for (const cw of (classroomWorksRes.data || []) as Array<{
      name: string; work_key: string | null; area: unknown;
    }>) {
      const norm = normalizeWorkName(cw.name);
      if (!norm || seenWorkNames.has(norm)) continue;
      seenWorkNames.add(norm);
      works.push({ name: cw.name, work_key: cw.work_key || null, area_key: areaKeyOf(cw.area) });
    }
    for (const w of loadAllCurriculumWorks()) {
      const norm = normalizeWorkName(w.name);
      if (!norm || seenWorkNames.has(norm)) continue;
      seenWorkNames.add(norm);
      works.push({ name: w.name, work_key: w.work_key || null, area_key: w.area_key || null });
    }

    // ----- The vision call -----
    const { result, model, usage, stopReason } = await extractSheet({
      imageBase64,
      mediaType: 'image/jpeg',
      roster: children.map((c) => ({ id: c.id, name: c.name })),
      works,
      locale,
    });
    console.log(
      `[PaperScan] ${scanId} extracted: ${result.children?.length || 0} children, ` +
      `stop=${stopReason}, in=${usage?.input_tokens ?? '?'} out=${usage?.output_tokens ?? '?'}`
    );

    // ----- Extraction rows -----
    const rows = buildExtractionRows(result, {
      scanId,
      schoolId: scan.school_id,
      classroomId: scan.classroom_id,
      children,
      aliases,
      works,
    });

    // A retry (status 'failed') must not double up the review queue.
    await supabase.from('montree_paper_scan_extractions').delete().eq('scan_id', scanId);

    if (rows.length > 0) {
      const { error: insertError } = await supabase
        .from('montree_paper_scan_extractions')
        .insert(rows);
      if (insertError) {
        throw new Error(`Could not save extractions: ${insertError.message}`);
      }
    }

    const entriesFound = rows.filter((r) => r.work_name_raw || r.work_name).length;

    // Notes not tied to a child have no row of their own — they ride along on
    // the summary the teacher reads above the review list, so nothing written
    // on the page is silently dropped.
    let sheetSummary = result.sheet_summary || null;
    if (Array.isArray(result.unattributed_notes) && result.unattributed_notes.length > 0) {
      const extra = result.unattributed_notes.filter(Boolean).join(' • ');
      if (extra) sheetSummary = `${sheetSummary || ''}\n\nUnattributed notes: ${extra}`.trim();
    }
    if (sheetSummary && sheetSummary.length > SHEET_SUMMARY_MAX) {
      sheetSummary = sheetSummary.slice(0, SHEET_SUMMARY_MAX);
    }

    // Only adopt the sheet's own date when none was supplied at upload AND the
    // model read a plain ISO date — "Tues 12th" must never reach a date column.
    const sheetDateUpdate =
      !scan.sheet_date && typeof result.sheet_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(result.sheet_date.trim())
        ? { sheet_date: result.sheet_date.trim() }
        : {};

    const { error: scanUpdateError } = await supabase
      .from('montree_paper_scans')
      .update({
        status: 'review',
        error_message: null,
        extraction_model: model,
        overall_confidence: result.overall_confidence || null,
        sheet_summary: sheetSummary,
        format_description: result.format_description || null,
        children_found: result.children?.length || 0,
        entries_found: entriesFound,
        extracted_at: new Date().toISOString(),
        ...sheetDateUpdate,
      })
      .eq('id', scanId);

    if (scanUpdateError) {
      throw new Error(`Could not update scan: ${scanUpdateError.message}`);
    }

    return NextResponse.json({
      success: true,
      scan_id: scanId,
      status: 'review',
      children_found: result.children?.length || 0,
      entries_found: entriesFound,
      overall_confidence: result.overall_confidence || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Extraction failed';
    console.error(`[PaperScan] Extract failed for ${scanId}:`, error);

    await supabase
      .from('montree_paper_scans')
      .update({ status: 'failed', error_message: message.slice(0, ERROR_MESSAGE_MAX) })
      .eq('id', scanId);

    return NextResponse.json(
      { success: false, error: 'Extraction failed', status: 'failed' },
      { status: 500 }
    );
  }
}

/**
 * Turn the model's reading of the page into insertable rows.
 *
 * One row per child x entry. A child with no entries still gets a row (so an
 * unreadable or roster-missing name is visible in review rather than silently
 * dropped), and a child's general_note rides on their FIRST row only — putting
 * it on every row would create one duplicate behavioural observation per entry
 * at commit time.
 *
 * Roster matching is school-scoped by construction: `children` comes from this
 * scan's own classroom, so a matched child_id can only ever be a child of this
 * school. This mirrors voice-observation's analyzer, which likewise attaches
 * child_ids from the classroom query without a further access check — the
 * check exists for CLIENT-supplied ids, which arrive on the extraction PATCH
 * route and are verified there.
 */
function buildExtractionRows(
  result: SheetExtraction,
  ctx: {
    scanId: string;
    schoolId: string;
    classroomId: string;
    children: Array<{ id: string; name: string }>;
    aliases: Array<{ child_id: string; alias: string }>;
    works: PaperScanWorkEntry[];
  }
): PaperScanExtractionInsert[] {
  const rows: PaperScanExtractionInsert[] = [];

  for (const child of result.children || []) {
    const nameMatch = matchStudentName(child.child_name_raw || '', ctx.children, ctx.aliases);
    const base = {
      scan_id: ctx.scanId,
      school_id: ctx.schoolId,
      classroom_id: ctx.classroomId,
      child_name_raw: child.child_name_raw || null,
      name_legibility: child.name_legibility || null,
      child_id: nameMatch.childId,
      match_confidence: nameMatch.childId ? Math.round(nameMatch.confidence * 100) / 100 : 0,
      review_status: 'pending' as const,
      teacher_final_status: null,
      teacher_final_note: null,
    };

    const entries: SheetEntry[] = Array.isArray(child.entries) ? child.entries : [];

    if (entries.length === 0) {
      rows.push({
        ...base,
        work_name_raw: null,
        work_key: null,
        work_name: null,
        work_match_confidence: null,
        area: null,
        proposed_status: null,
        status_confidence: null,
        time_minutes: null,
        note: null,
        general_note: child.general_note || null,
      });
      continue;
    }

    entries.forEach((entry, index) => {
      const workMatch = matchWorkName(entry.work_name_raw, ctx.works, entry.area);
      rows.push({
        ...base,
        work_name_raw: entry.work_name_raw || null,
        work_key: workMatch.work_key,
        // Fall back to the raw reading so the review card always shows what
        // was written, even when nothing in the curriculum matched.
        work_name: workMatch.work_name || entry.work_name_raw || null,
        work_match_confidence: entry.work_name_raw ? workMatch.confidence : null,
        // The sheet's own area wins; the matched work's canonical area fills
        // the blank when the teacher didn't write one.
        area: entry.area || workMatch.area_key || null,
        proposed_status: entry.status || null,
        status_confidence: entry.field_confidence || null,
        time_minutes: typeof entry.time_minutes === 'number' ? entry.time_minutes : null,
        note: entry.note || null,
        general_note: index === 0 ? (child.general_note || null) : null,
      });
    });
  }

  return rows;
}
