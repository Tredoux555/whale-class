// app/api/montree/photo-identification/process/route.ts
//
// Background photo identification route — the new "take and tag" pipeline.
//
// Called by:
//   1. The capture page, fire-and-forget after a photo is uploaded
//      (via fetch with `keepalive: true` so it survives navigation)
//   2. The Photo Audit page on load — sweeps any `pending` photos older than
//      5 minutes that the fire-and-forget call may have dropped
//   3. (Future) A cron-triggered sweep
//
// Routing logic for each photo:
//
//   1. Run two-pass Haiku identification (lib/montree/photo-identification/two-pass)
//
//   2. If Pass 2 succeeded AND confidence ≥ 0.75 AND hasVisualMemoryForMatch
//      AND we can resolve the work to a row in montree_classroom_curriculum_works
//      → write `work_id`, `identification_status='haiku_matched'`, confidence
//      → fire `increment_visual_memory_used` RPC for the matched memory
//
//   3. Otherwise → check the per-classroom daily Sonnet cap, then run the
//      Sonnet rich draft generator and store the result in `sonnet_draft` JSONB
//      → status = 'sonnet_drafted'
//
//   4. If Sonnet cap hit → leave status as 'pending', set attempted_at
//      (will be picked up tomorrow)
//
//   5. On any unhandled error → status = 'failed' so the audit UI can surface it
//
// This route writes ONLY to montree_media. It does NOT update progress, P/P/M,
// or visual memory contents — those happen in Photo Audit when the teacher
// confirms or actions a draft.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getPublicUrl } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { loadAllCurriculumWorks } from '@/lib/montree/curriculum-loader';
import {
  runTwoPassIdentification,
} from '@/lib/montree/photo-identification/two-pass';
import {
  generateSonnetDraft,
} from '@/lib/montree/photo-identification/sonnet-draft';
import {
  loadIdentificationContext,
} from '@/lib/montree/photo-identification/context-loader';

// ----- Constants -----

const HAIKU_TRUST_CONFIDENCE = 0.75;
const SONNET_DAILY_CAP_PER_CLASSROOM = parseInt(
  process.env.SONNET_DAILY_CAP_PER_CLASSROOM || '100',
  10,
);

// Photo bucket — confirmed against app/api/montree/media/upload/route.ts (line 155)
const MEDIA_BUCKET = 'montree-media';

// ----- Helpers -----

function todayStartIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Look up a classroom curriculum work row by name (case-insensitive).
 * Returns the row id (UUID) if found, null otherwise.
 */
async function resolveClassroomWorkId(
  supabase: ReturnType<typeof getSupabase>,
  classroomId: string,
  workName: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id, name')
    .eq('classroom_id', classroomId)
    .ilike('name', workName.replace(/[%_\\]/g, '\\$&'))
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data.id;
}

/**
 * Compute age in years from birthdate string. Returns 0 on parse failure.
 */
function ageFromBirthdate(birthdate: string | null | undefined): number {
  if (!birthdate) return 0;
  const t = Date.parse(birthdate);
  if (isNaN(t)) return 0;
  const ms = Date.now() - t;
  return Math.max(0, Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000)));
}

// ----- Route handler -----

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  let body: { media_id?: string; locale?: 'en' | 'zh'; force?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const mediaId = body.media_id;
  const locale: 'en' | 'zh' = body.locale === 'zh' ? 'zh' : 'en';
  if (!mediaId || typeof mediaId !== 'string') {
    return NextResponse.json({ error: 'media_id is required' }, { status: 400 });
  }

  const supabase = getSupabase();

  // ----- Load media row + verify access -----
  const { data: media, error: mediaErr } = await supabase
    .from('montree_media')
    .select('id, school_id, classroom_id, child_id, storage_path, identification_status, identification_attempted_at')
    .eq('id', mediaId)
    .maybeSingle();

  if (mediaErr || !media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }
  if (media.school_id !== auth.schoolId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Idempotency: skip if already processed (unless force=true, used to re-run
  // the latest pipeline against the existing audit queue)
  if (
    !body.force &&
    (media.identification_status === 'haiku_matched' ||
      media.identification_status === 'sonnet_drafted' ||
      media.identification_status === 'confirmed' ||
      media.identification_status === 'skipped')
  ) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: `already in status ${media.identification_status}`,
      status: media.identification_status,
    });
  }
  // When forced, clear stale draft so the new pipeline writes a fresh one
  if (body.force) {
    await supabase
      .from('montree_media')
      .update({ identification_status: null, sonnet_draft: null })
      .eq('id', mediaId);
  }

  // Load child for context (name + age)
  let childName = 'the child';
  let childAge: number | string = 0;
  if (media.child_id) {
    const { data: child } = await supabase
      .from('montree_children')
      .select('name, birthdate')
      .eq('id', media.child_id)
      .maybeSingle();
    if (child) {
      childName = child.name || childName;
      childAge = ageFromBirthdate(child.birthdate);
    }
  }

  // Build photo URL (Anthropic needs a publicly fetchable URL)
  const photoUrl = getPublicUrl(MEDIA_BUCKET, media.storage_path);

  // Mark attempted_at NOW so concurrent calls don't double-process
  const attemptedAtIso = new Date().toISOString();
  await supabase
    .from('montree_media')
    .update({ identification_attempted_at: attemptedAtIso })
    .eq('id', mediaId);

  // ----- Load curriculum + identification context (corrections + visual memory) -----
  const curriculum = loadAllCurriculumWorks();
  const context = await loadIdentificationContext(supabase, { classroomId: media.classroom_id });

  // ----- Step 1: Two-pass Haiku identification -----
  const twoPassResult = await runTwoPassIdentification({
    photoUrl,
    childName,
    childAge,
    classroomId: media.classroom_id,
    curriculum,
    locale,
    context,
  });

  console.log(`[PhotoIdentification] media=${mediaId} pass1="${twoPassResult.visualDescription.slice(0, 80)}" pass2.success=${twoPassResult.success} confidence=${twoPassResult.identification?.confidence ?? 'n/a'} hasVM=${twoPassResult.hasVisualMemoryForMatch}`);

  // ----- Routing decision -----

  // Trust Haiku ONLY if:
  //   1. Pass 2 succeeded
  //   2. Confidence ≥ 0.75
  //   3. The matched work has classroom visual memory
  //   4. The matched work resolves to a row in montree_classroom_curriculum_works
  const ident = twoPassResult.identification;
  const haikuTrusted =
    twoPassResult.success &&
    ident !== null &&
    ident.confidence >= HAIKU_TRUST_CONFIDENCE &&
    twoPassResult.hasVisualMemoryForMatch;

  // Phase 1 telemetry (Apr 8) — log every Gate A decision so we can tune
  // HAIKU_TRUST_CONFIDENCE and the visual memory filter from real data
  // instead of guessing. Grep Railway logs for '[PhotoIdentification] GateA'.
  console.log('[PhotoIdentification] GateA ' + JSON.stringify({
    mediaId,
    haikuSuccess: twoPassResult.success,
    haikuConf: ident?.confidence ?? null,
    haikuWork: ident?.workName ?? null,
    hasVM: twoPassResult.hasVisualMemoryForMatch,
    vmSetSize: context.visualMemoryWorkNames.size,
    vmInjected: context.visualMemoryInjectedCount,
    threshold: HAIKU_TRUST_CONFIDENCE,
    outcome: haikuTrusted ? 'trusted' : 'sonnet_fallback',
  }));

  if (haikuTrusted && ident && media.classroom_id) {
    const workId = await resolveClassroomWorkId(supabase, media.classroom_id, ident.workName);
    if (workId) {
      const { error: updateErr } = await supabase
        .from('montree_media')
        .update({
          work_id: workId,
          identification_status: 'haiku_matched',
          identification_confidence: ident.confidence,
        })
        .eq('id', mediaId);

      if (updateErr) {
        console.error('[PhotoIdentification] Failed to write haiku_matched:', updateErr);
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
      }

      // Fire-and-forget: bump visual memory usage counter for the matched work
      supabase
        .rpc('increment_visual_memory_used', {
          p_classroom_id: media.classroom_id,
          p_work_names: [ident.workName],
        })
        .then(({ error }) => {
          if (error) console.error('[PhotoIdentification] increment_visual_memory_used failed (non-fatal):', error);
        });

      return NextResponse.json({
        success: true,
        outcome: 'haiku_matched',
        media_id: mediaId,
        work_id: workId,
        work_name: ident.workName,
        confidence: ident.confidence,
        visual_description: twoPassResult.visualDescription,
      });
    }
    // If we couldn't resolve the classroom work row, fall through to Sonnet draft
    console.log(`[PhotoIdentification] Haiku trusted but work "${ident.workName}" not in classroom curriculum — falling through to Sonnet`);
  }

  // ----- Step 2: Sonnet draft fallback -----

  // Daily cap check
  if (media.classroom_id) {
    const { count: draftedToday } = await supabase
      .from('montree_media')
      .select('id', { count: 'exact', head: true })
      .eq('classroom_id', media.classroom_id)
      .eq('identification_status', 'sonnet_drafted')
      .gte('identification_attempted_at', todayStartIso());

    if ((draftedToday || 0) >= SONNET_DAILY_CAP_PER_CLASSROOM) {
      console.log(`[PhotoIdentification] Sonnet daily cap hit for classroom ${media.classroom_id} (${draftedToday}/${SONNET_DAILY_CAP_PER_CLASSROOM})`);
      // Leave status as 'pending' so tomorrow's sweep picks it back up
      return NextResponse.json({
        success: true,
        outcome: 'sonnet_cap_reached',
        media_id: mediaId,
        cap: SONNET_DAILY_CAP_PER_CLASSROOM,
        used: draftedToday,
      });
    }
  }

  const sonnetResult = await generateSonnetDraft({
    photoUrl,
    childName,
    childAge,
    curriculum,
    pass1Description: twoPassResult.visualDescription,
    haikuGuess: ident ? { workName: ident.workName, confidence: ident.confidence } : null,
    context,
    locale,
  });

  if (!sonnetResult.success || !sonnetResult.draft) {
    console.error('[PhotoIdentification] Sonnet draft failed:', sonnetResult.errors);
    await supabase
      .from('montree_media')
      .update({ identification_status: 'failed' })
      .eq('id', mediaId);
    return NextResponse.json({
      success: false,
      outcome: 'failed',
      media_id: mediaId,
      errors: sonnetResult.errors,
    }, { status: 500 });
  }

  const { error: draftWriteErr } = await supabase
    .from('montree_media')
    .update({
      identification_status: 'sonnet_drafted',
      identification_confidence: sonnetResult.draft.confidence,
      sonnet_draft: sonnetResult.draft,
    })
    .eq('id', mediaId);

  if (draftWriteErr) {
    console.error('[PhotoIdentification] Failed to write sonnet_draft:', draftWriteErr);
    return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    outcome: 'sonnet_drafted',
    media_id: mediaId,
    draft: sonnetResult.draft,
  });
}
