// app/api/montree/photo-onboarding/[importId]/extract/route.ts
//
// Read the uploaded class list with Claude, reconcile the extracted students
// against the classroom's CURRENT active roster, and write one entry row per
// proposed change for the teacher's review screen.
//
// ⚠ LOAD-BEARING: `maxDuration = 120` below. Railway kills a route at its
// default (~15s) timeout, and the model call alone takes 20-60s on a dense
// list. Without it the import sits at 'extracting' forever with no error and
// no retry — the exact failure mode Paper Scan documents at the same spot.
// Do not lower it, do not remove it.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { loadAliases } from '@/lib/montree/voice/student-matcher';
import { extractClassList, type ExtractorInput } from '@/lib/montree/photo-onboarding/extractor';
import { docxToText, prepareImage, xlsxToText } from '@/lib/montree/photo-onboarding/document-text';
import { EmptyExtractionError, reconcileRoster } from '@/lib/montree/photo-onboarding/reconcile';
import {
  PHOTO_ONBOARDING_FEATURE_KEY,
  ROSTER_IMPORT_BUCKET,
  type RosterChild,
  type RosterImportSourceType,
} from '@/lib/montree/photo-onboarding/types';

// See the load-bearing note at the top of this file before changing.
export const maxDuration = 120;

const ERROR_MESSAGE_MAX = 500;

async function buildExtractorInput(
  sourceType: RosterImportSourceType,
  buffer: Buffer
): Promise<ExtractorInput> {
  switch (sourceType) {
    case 'photo': {
      const { base64, mediaType } = await prepareImage(buffer);
      return { kind: 'image', base64, mediaType };
    }
    case 'pdf':
      // Sent as a document block so a SCANNED list (no text layer) still reads.
      return { kind: 'pdf', base64: buffer.toString('base64') };
    case 'docx':
      return { kind: 'text', text: await docxToText(buffer) };
    case 'xlsx':
      return { kind: 'text', text: await xlsxToText(buffer) };
    default:
      throw new Error(`Unsupported source type: ${sourceType}`);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  const { importId } = await params;

  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabase();

  if (!(await isFeatureEnabled(supabase, auth.schoolId, PHOTO_ONBOARDING_FEATURE_KEY))) {
    return NextResponse.json({ success: false, error: 'feature_disabled' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const locale = typeof (body as { locale?: string })?.locale === 'string'
    ? (body as { locale?: string }).locale
    : undefined;

  const { data: row } = await supabase
    .from('montree_roster_imports')
    .select('id, school_id, classroom_id, source_type, storage_path, status')
    .eq('id', importId)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ success: false, error: 'Import not found' }, { status: 404 });
  }
  if (row.school_id !== auth.schoolId) {
    return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
  }

  // Idempotency: a double-tap or a client retry must never re-run the model or
  // duplicate the review queue.
  if (row.status === 'review' || row.status === 'committed') {
    const { count } = await supabase
      .from('montree_roster_import_entries')
      .select('id', { count: 'exact', head: true })
      .eq('import_id', importId);
    return NextResponse.json({
      success: true,
      import_id: importId,
      status: row.status,
      already: true,
      entry_count: count ?? 0,
    });
  }
  if (row.status === 'extracting') {
    return NextResponse.json(
      { success: false, error: 'Extraction already in progress' },
      { status: 409 }
    );
  }
  if (!row.storage_path) {
    return NextResponse.json({ success: false, error: 'Import has no stored file' }, { status: 400 });
  }

  await supabase
    .from('montree_roster_imports')
    .update({ status: 'extracting', error: null })
    .eq('id', importId);

  // Everything below is wrapped: an unhandled throw here would leave the
  // import stuck at 'extracting' with the teacher staring at a spinner.
  try {
    // ----- File + roster (parallel — independent reads) -----
    const [downloadRes, childrenRes, aliases] = await Promise.all([
      supabase.storage.from(ROSTER_IMPORT_BUCKET).download(row.storage_path),
      supabase
        .from('montree_children')
        .select('id, name')
        .eq('classroom_id', row.classroom_id)
        // The roster we reconcile against is the ACTIVE roster. A child
        // archived by a previous import must not be proposed for archive
        // again, and must not block a re-enrolment from being a clean create.
        .neq('is_active', false),
      loadAliases(row.classroom_id),
    ]);

    if (downloadRes.error || !downloadRes.data) {
      throw new Error(`Could not download the uploaded file: ${downloadRes.error?.message || 'not found'}`);
    }

    const buffer = Buffer.from(await downloadRes.data.arrayBuffer());
    const roster = (childrenRes.data || []) as RosterChild[];

    const input = await buildExtractorInput(row.source_type as RosterImportSourceType, buffer);

    // ----- The model call -----
    const { result, model, usage, stopReason } = await extractClassList({ input, locale });
    console.log(
      `[PhotoOnboarding] ${importId} extracted: ${result.students?.length || 0} students, `
      + `model=${model}, stop=${stopReason}, in=${usage?.input_tokens ?? '?'} out=${usage?.output_tokens ?? '?'}`
    );

    // ----- Reconcile against the live roster -----
    // Throws EmptyExtractionError when nothing was read — see reconcile.ts.
    const { entries, counts } = reconcileRoster(result.students || [], roster, aliases);

    // A retry must not double up the review queue.
    await supabase.from('montree_roster_import_entries').delete().eq('import_id', importId);

    if (entries.length > 0) {
      const { error: insertError } = await supabase
        .from('montree_roster_import_entries')
        .insert(entries.map((e) => ({ ...e, import_id: importId })));
      if (insertError) {
        throw new Error(`Could not save the proposed changes: ${insertError.message}`);
      }
    }

    const { error: updateError } = await supabase
      .from('montree_roster_imports')
      .update({ status: 'review', error: null })
      .eq('id', importId);

    if (updateError) {
      throw new Error(`Could not update the import: ${updateError.message}`);
    }

    return NextResponse.json({
      success: true,
      import_id: importId,
      status: 'review',
      create_count: counts.create,
      update_count: counts.update,
      archive_count: counts.archive,
    });
  } catch (error) {
    const isEmpty = error instanceof EmptyExtractionError;
    const message = error instanceof Error ? error.message : 'Extraction failed';
    console.error(`[PhotoOnboarding] Extract failed for ${importId}:`, error);

    await supabase
      .from('montree_roster_imports')
      .update({ status: 'failed', error: message.slice(0, ERROR_MESSAGE_MAX) })
      .eq('id', importId);

    return NextResponse.json(
      {
        success: false,
        // The empty-document case is the teacher's problem to fix (blurry
        // photo, wrong file), so it gets a specific, actionable message.
        error: isEmpty ? 'no_students_found' : 'Extraction failed',
        status: 'failed',
      },
      { status: isEmpty ? 422 : 500 }
    );
  }
}
