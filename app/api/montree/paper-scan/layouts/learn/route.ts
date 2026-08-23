// app/api/montree/paper-scan/layouts/learn/route.ts
//
// LAYER 1 (plan §3): "Teach Montree your sheet". The teacher uploads 1-3
// photos of their own observation sheet; Sonnet describes its LAYOUT (never
// its content) into a SheetLayoutProfile, which is stored as a DRAFT the
// teacher then reviews and activates.
//
// ⚠ LOAD-BEARING: `maxDuration = 120`. The vision call on three photos takes
// 30-60s; Railway's default (~15s) would kill the request mid-learn, exactly
// as it would on the extract route.
//
// PRIVACY: unlike scan photos (deleted at commit), the teaching photos are
// KEPT in storage as montree_sheet_layouts.sample_paths — a profile that
// cannot be checked against the paper it came from is not reviewable. The
// tool schema carries no place for a child's name, and the prompt forbids
// transcribing content, so the profile itself holds no child data.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { validateJpegPhoto } from '@/lib/montree/media/jpeg-validation';
import { learnSheetLayout, layoutRowToSummary } from '@/lib/montree/paper-scan/layout-learner';
import { PAPER_SCAN_BUCKET, PAPER_SCAN_FEATURE_KEY } from '@/lib/montree/paper-scan/types';
import type { SheetLayoutRow } from '@/lib/montree/paper-scan/layout-types';

// See the load-bearing note above before changing.
export const maxDuration = 120;

const MAX_PHOTOS = 3;
const NAME_MAX = 120;
const NOTES_MAX = 1000;

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabase();
  if (!(await isFeatureEnabled(supabase, auth.schoolId, PAPER_SCAN_FEATURE_KEY))) {
    return NextResponse.json({ success: false, error: 'feature_disabled' }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ success: false, error: 'Expected a multipart upload' }, { status: 400 });
  }

  const photos = formData.getAll('photos').filter((p): p is File => p instanceof File);
  const classroomId = (formData.get('classroom_id') as string) || auth.classroomId || '';
  const name = ((formData.get('name') as string) || '').trim().slice(0, NAME_MAX);
  const notes = ((formData.get('notes') as string) || '').trim().slice(0, NOTES_MAX);
  const locale = ((formData.get('locale') as string) || '').trim().slice(0, 12);

  if (photos.length === 0) {
    return NextResponse.json({ success: false, error: 'At least one photo is required' }, { status: 400 });
  }
  if (photos.length > MAX_PHOTOS) {
    return NextResponse.json({ success: false, error: `At most ${MAX_PHOTOS} photos` }, { status: 400 });
  }
  if (!classroomId) {
    return NextResponse.json({ success: false, error: 'classroom_id required' }, { status: 400 });
  }

  for (const photo of photos) {
    const photoErr = validateJpegPhoto({ name: photo.name, type: photo.type });
    if (photoErr) return NextResponse.json({ success: false, error: photoErr }, { status: 400 });
  }

  const { data: classroom } = await supabase
    .from('montree_classrooms')
    .select('id')
    .eq('id', classroomId)
    .eq('school_id', auth.schoolId)
    .maybeSingle();
  if (!classroom) {
    return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
  }

  // Id first: the storage paths hang off it, so the photos and the row are
  // addressable by the same key (same shape as the upload route).
  const layoutId = crypto.randomUUID();
  const samplePaths: string[] = [];

  try {
    const images: Array<{ base64: string; mediaType: 'image/jpeg' }> = [];

    for (let i = 0; i < photos.length; i++) {
      const buffer = await photos[i].arrayBuffer();
      images.push({ base64: Buffer.from(buffer).toString('base64'), mediaType: 'image/jpeg' });

      const path = `paper_scan_layouts/${auth.schoolId}/${layoutId}/${i + 1}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from(PAPER_SCAN_BUCKET)
        .upload(path, buffer, { contentType: 'image/jpeg', upsert: false });
      if (uploadError) {
        // Not fatal: the profile is the deliverable, the sample is evidence.
        console.error('[PaperScan] Layout sample upload failed:', uploadError.message);
      } else {
        samplePaths.push(path);
      }
    }

    const { profile, model, usage, stopReason } = await learnSheetLayout({
      images,
      sheetName: name || null,
      notes: notes || null,
      locale: locale || null,
    });
    console.log(
      `[PaperScan] Learned layout ${layoutId} from ${images.length} photo(s): `
      + `${profile.structure.columns.length} columns, stop=${stopReason}, `
      + `in=${usage?.input_tokens ?? '?'} out=${usage?.output_tokens ?? '?'}`
    );

    const { data: inserted, error: insertError } = await supabase
      .from('montree_sheet_layouts')
      .insert({
        id: layoutId,
        school_id: auth.schoolId,
        classroom_id: classroomId,
        name: name || profile.sheet_name,
        source: 'learned',
        status: 'draft',
        version: 1,
        template_code: profile.machine_marks?.template_code || null,
        profile,
        sample_paths: samplePaths,
        model,
        created_by: auth.userId || null,
      })
      .select('*')
      .maybeSingle();

    if (insertError || !inserted) {
      console.error('[PaperScan] Layout insert error:', insertError?.message, insertError?.code);
      // Don't leave orphaned teaching photos behind a failed insert.
      if (samplePaths.length > 0) {
        await supabase.storage.from(PAPER_SCAN_BUCKET).remove(samplePaths);
      }
      return NextResponse.json({ success: false, error: 'Could not save the sheet layout' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      layout: layoutRowToSummary(inserted as SheetLayoutRow),
      model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Learning failed';
    console.error('[PaperScan] Layout learn error:', error);
    if (samplePaths.length > 0) {
      await supabase.storage.from(PAPER_SCAN_BUCKET).remove(samplePaths).catch(() => {});
    }
    return NextResponse.json(
      { success: false, error: 'Could not read that sheet', detail: message.slice(0, 300) },
      { status: 500 }
    );
  }
}
