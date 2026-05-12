// app/api/montree/photo-identification/process/route.ts
//
// ╔══════════════════════════════════════════════════════════════════════╗
// ║  ⚠ LOAD-BEARING — DO NOT CHANGE WITHOUT READING ALL OF THIS ⚠      ║
// ║                                                                      ║
// ║  Two constants below (`maxDuration = 120` and HAIKU_TRUST_CONFIDENCE) ║
// ║  are the only thing standing between a working photo pipeline and    ║
// ║  every photo silently stuck at 'pending' forever.                    ║
// ║                                                                      ║
// ║  • maxDuration = 120  →  Railway kills any route taking longer than  ║
// ║    its `maxDuration` seconds. Default is ~15s. Two-pass Haiku needs  ║
// ║    30-45s + buffer. If this is set lower (or removed by a refactor   ║
// ║    that doesn't realise it's load-bearing), every photo will fail to ║
// ║    identify and stay in pending. There is NO retry. There is NO      ║
// ║    alert. Teacher will see "Pending" forever and not know why.       ║
// ║    This bug took Apr 22-28 2026 to diagnose. Do not move it.         ║
// ║                                                                      ║
// ║  • HAIKU_TRUST_CONFIDENCE = 0.85  →  Below this, photos fall to      ║
// ║    haiku_drafted (teacher review) instead of auto-tagging. Raised    ║
// ║    from 0.75 in Apr 9 incident where Sandpaper Letters was auto-     ║
// ║    tagged as Metal Insets. Tune ONLY from Railway [GateA] logs.      ║
// ╚══════════════════════════════════════════════════════════════════════╝
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
//   2. If Pass 2 succeeded AND confidence ≥ 0.85 AND hasVisualMemoryForMatch
//      AND we can resolve the work to a row in montree_classroom_curriculum_works
//      → write `work_id`, `identification_status='haiku_matched'`, confidence
//      → fire `increment_visual_memory_used` RPC for the matched memory
//
//   3. Otherwise (Gate A failed) → write the Haiku Pass 2 result to `haiku_drafted`
//      status. Teacher can optionally call the sonnet-review endpoint to enrich
//      the draft with Sonnet analysis via "Ask Sonnet" button in Photo Audit.
//
//   4. On any unhandled error → status = 'failed' so the audit UI can surface it
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
  loadIdentificationContext,
} from '@/lib/montree/photo-identification/context-loader';
import {
  generateSonnetDraft,
} from '@/lib/montree/photo-identification/sonnet-draft';
import type { Locale } from '@/lib/montree/i18n/locales';
import { isValidLocale } from '@/lib/montree/i18n/locales';

// Photos below this confidence get Sonnet enrichment automatically
// (fire-and-forget after haiku_drafted is written). At 0.70 Haiku is
// genuinely uncertain — waiting for teacher to click "Ask Sonnet" is
// unnecessary friction. Above 0.70 but below Gate A (0.85), the teacher
// can judge from the haiku_drafted card without Sonnet help.
const AUTO_SONNET_CONFIDENCE_THRESHOLD = 0.70;

// Railway serverless timeout — Haiku two-pass needs 30-45s minimum
// (Pass 1: 15s + Pass 2: 15s + Pass 2b: 15s). Without this, Railway
// kills the route at its default ~10-15s timeout, leaving photos stuck
// at 'pending' forever. This was the root cause of ALL photos failing
// identification from Apr 22 onward.
export const maxDuration = 120;

// ----- Constants -----

// Raised 0.75 → 0.85 on Apr 9 2026 after Sandpaper Letters was auto-tagged as
// Metal Insets in Whale Class audit. At 0.75 Gate A fires on visually similar
// language/sensorial works (tray + single focal object). 0.85 is the safer
// floor — everything below falls through to haiku_drafted status and renders as
// an auditable Haiku DRAFT card with "Ask Sonnet" button. Watch Railway
// [PhotoIdentification] GateA logs and tune from real trusted/fallback distribution.
const HAIKU_TRUST_CONFIDENCE = 0.85;

// Photo bucket — confirmed against app/api/montree/media/upload/route.ts (line 155)
const MEDIA_BUCKET = 'montree-media';

// ----- Helpers -----

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

  let body: { media_id?: string; locale?: string; force?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const mediaId = body.media_id;
  const locale: Locale = isValidLocale(body.locale) ? body.locale : 'en';
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
      media.identification_status === 'haiku_drafted' ||
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

  // Build photo URL (Anthropic needs a publicly fetchable URL)
  const photoUrl = getPublicUrl(MEDIA_BUCKET, media.storage_path);

  // 🚨 Perf Tier 3.2 (PERF_HEALTH_CHECK.md) — pre-Pass-1 parallelize.
  // Previously these ran sequentially:
  //   1. child fetch (200ms)
  //   2. attempted_at write (50-100ms)
  //   3. inside try: classroom works fetch (100-200ms)
  //   4. inside try: loadIdentificationContext (100-150ms)
  // Total: 450-650ms before the first Pass-1 Haiku call.
  //
  // Now all four fire in parallel via Promise.all. They're independent (each
  // hits a different table / file) so concurrency is safe. ~200-450ms saved
  // per photo. Photos are taken constantly so this compounds fast.
  const attemptedAtIso = new Date().toISOString();
  const [childRes, _attemptedRes, classroomWorksRes, identificationContext] = await Promise.all([
    // (1) Load child for context (name + age). Skip when no child_id.
    media.child_id
      ? supabase
          .from('montree_children')
          .select('name, birthdate')
          .eq('id', media.child_id)
          .maybeSingle()
      : Promise.resolve({ data: null as { name: string | null; birthdate: string | null } | null }),
    // (2) Mark attempted_at NOW so concurrent calls don't double-process.
    // The await-ignored `_attemptedRes` ensures Supabase actually fires the
    // update before we proceed, but the result body is irrelevant.
    supabase
      .from('montree_media')
      .update({ identification_attempted_at: attemptedAtIso })
      .eq('id', mediaId),
    // (3) Load custom classroom works so matchToCurriculumV2 finds them by
    // exact name. Without this, custom works like "Popsicle Letter Sorting"
    // fall through to weak word matches against the static curriculum.
    media.classroom_id
      ? supabase
          .from('montree_classroom_curriculum_works')
          .select('name, work_key, area:montree_classroom_curriculum_areas!area_id(area_key)')
          .eq('classroom_id', media.classroom_id)
          .eq('is_custom', true)
      : Promise.resolve({ data: [] as Array<{ name: string; work_key: string; area: { area_key: string } | null }> }),
    // (4) Visual memory + recent corrections context. This is the priciest
    // setup step (multiple queries inside loadIdentificationContext) — biggest
    // beneficiary of parallelization.
    loadIdentificationContext(supabase, { classroomId: media.classroom_id }),
  ]);
  void _attemptedRes; // Result intentionally unused — fire-and-resolve write.

  let childName = 'the child';
  let childAge: number | string = 0;
  if (childRes.data) {
    childName = childRes.data.name || childName;
    childAge = ageFromBirthdate(childRes.data.birthdate);
  }

  // ----- Load curriculum + run identification (wrapped in try-catch) -----
  // Without this try-catch, any unhandled throw (timeout, API error, etc.)
  // leaves the photo stuck at 'pending' forever because the 'failed' status
  // write at the bottom only runs on controlled failures, not crashes.
  try {
    // Start with the static curriculum (329 works across 5 areas) + extend
    // with custom classroom works fetched in the Promise.all above.
    const curriculum = [...loadAllCurriculumWorks()];
    const classroomWorks = classroomWorksRes.data;
    if (classroomWorks && classroomWorks.length > 0) {
      const existingKeys = new Set(curriculum.map(w => w.work_key));
      for (const cw of classroomWorks) {
        if (!existingKeys.has(cw.work_key)) {
          curriculum.push({
            area_key: (cw.area as { area_key: string } | null)?.area_key || 'unknown',
            work_key: cw.work_key,
            name: cw.name,
            aliases: [],
            sequence: 999999,
            category_name: 'Custom',
            age_range: '3-6',
          });
        }
      }
      console.log(`[PhotoIdentification] Loaded ${classroomWorks.length} custom classroom works into curriculum (total: ${curriculum.length})`);
    }

    const context = identificationContext;

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

    console.log(`[PhotoIdentification] media=${mediaId} pass1="${twoPassResult.visualDescription.slice(0, 80)}" pass2.success=${twoPassResult.success} confidence=${twoPassResult.identification?.confidence ?? 'n/a'} hasVM=${twoPassResult.hasVisualMemoryForMatch} pass2b.fired=${twoPassResult.pass2bFired} pass2b.improved=${twoPassResult.pass2bImproved}`);

    // ----- Routing decision -----

    // Trust Haiku ONLY if:
    //   1. Pass 2 succeeded
    //   2. Confidence ≥ 0.85
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
      pass2bFired: twoPassResult.pass2bFired,
      pass2bImproved: twoPassResult.pass2bImproved,
      vmSetSize: context.visualMemoryWorkNames.size,
      vmInjected: context.visualMemoryInjectedCount,
      threshold: HAIKU_TRUST_CONFIDENCE,
      outcome: haikuTrusted ? 'trusted' : 'sonnet_fallback',
    }));

    if (haikuTrusted && ident && media.classroom_id) {
      const workId = await resolveClassroomWorkId(supabase, media.classroom_id, ident.workName);
      if (workId) {
        // AUDIT FIX (Apr 30, 2026): persist Haiku's raw work name + the matchScore
        // alongside the auto-match outcome. Without this we lose visibility into
        // every case where the fuzzy matcher distorted Haiku's output.
        // Stored in sonnet_draft.haiku_telemetry (a JSONB sub-field) so we don't
        // need a schema migration to add columns. Grep '[PhotoIdentification]
        // raw_vs_matched' in Railway logs for divergence cases.
        const matchedDifferently = ident.haikuWorkName.toLowerCase() !== ident.workName.toLowerCase();
        if (matchedDifferently) {
          console.log('[PhotoIdentification] raw_vs_matched ' + JSON.stringify({
            mediaId,
            haikuRaw: ident.haikuWorkName,
            matched: ident.workName,
            matchScore: ident.matchScore,
            confidence: ident.confidence,
            outcome: 'auto_matched',
          }));
        }
        const { error: updateErr } = await supabase
          .from('montree_media')
          .update({
            work_id: workId,
            identification_status: 'haiku_matched',
            identification_confidence: ident.confidence,
            // Persist telemetry into sonnet_draft so the audit UI / future tuning
            // can show what Haiku actually said vs what we matched it to.
            sonnet_draft: {
              _source: 'haiku_pass2_matched',
              visual_description: twoPassResult.visualDescription,
              proposed_name: ident.workName,
              haiku_work_name: ident.haikuWorkName,
              match_score: ident.matchScore,
              confidence: ident.confidence,
              area: ident.area,
              auto_matched: true,
              // Top 3 candidates for quick-tap chips in the audit UI.
              top_candidates: ident.topCandidates,
            },
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
      // If we couldn't resolve the classroom work row, fall through to Haiku draft
      console.log(`[PhotoIdentification] Haiku trusted but work "${ident.workName}" not in classroom curriculum — falling through to haiku_drafted`);
    }

    // ----- Step 2: Store Haiku draft for teacher review -----
    // Gate A failed — store the Haiku Pass 2 result as a draft.
    // For very uncertain results (confidence < AUTO_SONNET_CONFIDENCE_THRESHOLD),
    // fire Sonnet enrichment automatically in the background rather than waiting
    // for the teacher to click "Ask Sonnet".

    if (twoPassResult.success && ident) {
      // Store the Haiku Pass 2 result as haiku_drafted.
      // Also persist the Pass 1 visual description in sonnet_draft JSONB
      // (as a partial draft) so the Sonnet endpoint can read it back.
      const haikuDraftData: Record<string, unknown> = {
        identification_status: 'haiku_drafted',
        identification_confidence: ident.confidence,
        sonnet_draft: {
          _source: 'haiku_pass2',
          visual_description: twoPassResult.visualDescription,
          proposed_name: ident.workName,
          haiku_work_name: ident.haikuWorkName,
          confidence: ident.confidence,
          area: ident.area,
          // Top 3 candidates for quick-tap chips in the audit UI.
          top_candidates: ident.topCandidates,
        },
      };
      const { error: haikuDraftErr } = await supabase
        .from('montree_media')
        .update(haikuDraftData)
        .eq('id', mediaId);

      if (haikuDraftErr) {
        console.error('[PhotoIdentification] Failed to write haiku_drafted:', haikuDraftErr);
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
      }

      // Auto-Sonnet: if confidence is very low, enrich immediately in the background.
      // This saves the teacher from having to click "Ask Sonnet" for genuinely uncertain photos.
      if (ident.confidence < AUTO_SONNET_CONFIDENCE_THRESHOLD) {
        const sonnetContext = twoPassResult.context;
        generateSonnetDraft({
          photoUrl,
          childName,
          childAge,
          curriculum,
          pass1Description: twoPassResult.visualDescription,
          haikuGuess: { workName: ident.workName, confidence: ident.confidence },
          context: sonnetContext,
          locale,
        }).then(async (sonnetResult) => {
          if (sonnetResult.success && sonnetResult.draft) {
            const { error: sonnetWriteErr } = await supabase
              .from('montree_media')
              .update({
                sonnet_draft: sonnetResult.draft,
                identification_status: 'sonnet_drafted',
              })
              .eq('id', mediaId);
            if (sonnetWriteErr) {
              console.error('[PhotoIdentification] Auto-Sonnet write failed (non-fatal):', sonnetWriteErr);
            } else {
              console.log(`[PhotoIdentification] Auto-Sonnet complete for media=${mediaId}: "${sonnetResult.draft.proposed_name}" conf=${sonnetResult.draft.confidence}`);
            }
          } else {
            console.error('[PhotoIdentification] Auto-Sonnet generation failed (non-fatal):', sonnetResult.errors);
          }
        }).catch(err => {
          console.error('[PhotoIdentification] Auto-Sonnet threw (non-fatal):', err);
        });
      }

      return NextResponse.json({
        success: true,
        outcome: 'haiku_drafted',
        media_id: mediaId,
        work_name: ident.workName,
        confidence: ident.confidence,
        visual_description: twoPassResult.visualDescription,
        auto_sonnet_queued: ident.confidence < AUTO_SONNET_CONFIDENCE_THRESHOLD,
      });
    }

    // If Pass 2 failed entirely, mark as failed
    const { error: failedWriteErr } = await supabase
      .from('montree_media')
      .update({ identification_status: 'failed' })
      .eq('id', mediaId);

    if (failedWriteErr) {
      console.error('[PhotoIdentification] Failed to write failed status:', failedWriteErr);
    }

    return NextResponse.json({
      success: false,
      outcome: 'identification_failed',
      media_id: mediaId,
      errors: ['Pass 2 identification failed'],
    }, { status: 500 });

  } catch (pipelineError) {
    // Safety net: if ANYTHING throws (API timeout, network error, malformed
    // response, etc.), write 'failed' status so the photo doesn't stay stuck
    // at 'pending' forever. The sweep route will NOT retry 'failed' photos —
    // they surface in Photo Audit for manual handling.
    console.error(`[PhotoIdentification] Pipeline crashed for media=${mediaId}:`, pipelineError);

    try {
      await supabase
        .from('montree_media')
        .update({ identification_status: 'failed' })
        .eq('id', mediaId);
    } catch (writeErr) {
      console.error('[PhotoIdentification] Failed to write crash-failed status:', writeErr);
    }

    return NextResponse.json({
      success: false,
      outcome: 'pipeline_crashed',
      media_id: mediaId,
      errors: [pipelineError instanceof Error ? pipelineError.message : 'Unknown pipeline error'],
    }, { status: 500 });
  }
}
