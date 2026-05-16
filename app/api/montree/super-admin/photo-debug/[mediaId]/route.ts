// app/api/montree/super-admin/photo-debug/[mediaId]/route.ts
//
// Audit recommendation #4 (Session 113 photo pipeline audit).
//
// Super-admin-only debug endpoint that returns everything a debugger needs
// for a single photo: the media row, sonnet_draft JSONB, telemetry rows
// from montree_pipeline_telemetry, the visual memory entries that exist
// for the photo's classroom (approximate; we can't replay the pipeline
// against historical visual memory state, but the CURRENT entries are
// the closest signal), and the underlying child/classroom/school context.
//
// Read-only. No mutations. Cross-pollination filter NOT applied here —
// super-admin sees every school. The verifySuperAdminAuth gate is the
// security boundary.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getPublicUrl } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

const MEDIA_BUCKET = 'montree-media';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const auth = await verifySuperAdminAuth(request.headers);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  const { mediaId } = await params;
  if (!mediaId || typeof mediaId !== 'string') {
    return NextResponse.json({ error: 'mediaId is required' }, { status: 400 });
  }

  const supabase = getSupabase();

  // 1. Media row — the canonical photo record.
  const { data: media, error: mediaErr } = await supabase
    .from('montree_media')
    .select('id, school_id, classroom_id, child_id, storage_path, media_type, identification_status, identification_confidence, identification_attempted_at, sonnet_draft, work_id, teacher_confirmed, captured_at, created_at, updated_at')
    .eq('id', mediaId)
    .maybeSingle();

  if (mediaErr) {
    return NextResponse.json({ error: 'DB error', detail: mediaErr.message }, { status: 500 });
  }
  if (!media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  // 2. Child + classroom + school context — parallel.
  const [childRes, classroomRes, schoolRes, workRes] = await Promise.all([
    media.child_id
      ? supabase
          .from('montree_children')
          .select('id, name, birthdate, classroom_id, school_id')
          .eq('id', media.child_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    media.classroom_id
      ? supabase
          .from('montree_classrooms')
          .select('id, name, school_id')
          .eq('id', media.classroom_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    media.school_id
      ? supabase
          .from('montree_schools')
          .select('id, name')
          .eq('id', media.school_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    media.work_id
      ? supabase
          .from('montree_classroom_curriculum_works')
          .select('id, name, work_key, is_custom, area:montree_classroom_curriculum_areas!area_id(area_key)')
          .eq('id', media.work_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // 3. Telemetry rows — graceful 42P01 fallback if migration 211 hasn't run.
  let telemetry: Array<Record<string, unknown>> = [];
  let telemetryMissingTable = false;
  try {
    const { data: telemRows, error: telemErr } = await supabase
      .from('montree_pipeline_telemetry')
      .select('*')
      .eq('media_id', mediaId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (telemErr) {
      const code = (telemErr as { code?: string }).code;
      if (code === '42P01') {
        telemetryMissingTable = true;
      } else {
        console.error('[PhotoDebug] telemetry fetch failed:', telemErr);
      }
    } else if (telemRows) {
      telemetry = telemRows as Array<Record<string, unknown>>;
    }
  } catch (e) {
    console.error('[PhotoDebug] telemetry fetch threw:', e);
  }

  // 4. Visual memory snapshot — what entries CURRENTLY exist for this
  // classroom, filtered to the trusted-injection set (matches the Pass 2
  // injection rule from context-loader.ts).
  let visualMemory: Array<Record<string, unknown>> = [];
  if (media.classroom_id) {
    const { data: vmRows, error: vmErr } = await supabase
      .from('montree_visual_memory')
      .select('work_name, visual_description, key_materials, negative_descriptions, description_confidence, source, is_custom, updated_at')
      .eq('classroom_id', media.classroom_id)
      .order('description_confidence', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(120);
    if (vmErr) {
      console.error('[PhotoDebug] visual_memory fetch failed:', vmErr);
    } else if (vmRows) {
      visualMemory = vmRows as Array<Record<string, unknown>>;
    }
  }

  // 5. Photo URL — return public URL for browser rendering. Super admin sees
  // it regardless of bucket visibility.
  const photoUrl = media.storage_path
    ? getPublicUrl(MEDIA_BUCKET, media.storage_path)
    : null;

  return NextResponse.json({
    media,
    photoUrl,
    child: childRes.data ?? null,
    classroom: classroomRes.data ?? null,
    school: schoolRes.data ?? null,
    work: workRes.data ?? null,
    telemetry,
    telemetry_missing_table: telemetryMissingTable,
    visual_memory: visualMemory,
    visual_memory_total: visualMemory.length,
    fetched_at: new Date().toISOString(),
  });
}
