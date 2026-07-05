import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { getSupabase } from '@/lib/supabase-client';
import { anthropic, HAIKU_MODEL, AI_MODEL } from '@/lib/ai/anthropic';
import { advanceProgressOnConfirm } from '@/lib/montree/progress/advance-on-confirm';
import { checkRateLimit } from '@/lib/rate-limiter';
import { invalidateClassroomEmbeddings } from '@/lib/montree/classifier';
import { resolveReportModel } from '@/lib/montree/reports/resolve-model';
// import { logApiUsage } from '@/lib/montree/api-usage'; // DEFERRED: metering not yet deployed

export const maxDuration = 120;

// POST /api/montree/guru/corrections — Record a teacher correction for self-learning
// Called when teacher changes work_id in PhotoEditModal (correcting Smart Capture)
// Now also generates a visual description and stores it in visual memory for future prompts
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    // Rate limit corrections — 200 per hour per IP (generous: confirmations are DB-only, no AI cost)
    const supabase = getSupabase();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateResult = await checkRateLimit(supabase, ip, '/api/montree/guru/corrections', 200, 60);
    if (!rateResult.allowed) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await request.json();
    const {
      media_id,
      child_id,
      original_work_name,
      original_work_id,
      original_area,
      original_confidence,
      corrected_work_name,
      corrected_work_id,
      corrected_area,
      correction_type = 'work_mismatch',
      action,
    } = body;

    // HIGH-004 fix: Validate required fields upfront — null child_id skips access check + breaks learning loop
    if (!child_id || typeof child_id !== 'string') {
      return NextResponse.json({ success: false, error: 'child_id is required' }, { status: 400 });
    }
    if (!media_id || typeof media_id !== 'string') {
      return NextResponse.json({ success: false, error: 'media_id is required' }, { status: 400 });
    }

    if (!original_work_id && !original_work_name) {
      return NextResponse.json({ success: false, error: 'Missing original identification' }, { status: 400 });
    }

    // Security: verify child belongs to school
    if (auth.schoolId) {
      const access = await verifyChildBelongsToSchool(child_id, auth.schoolId);
      if (!access.allowed) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }
    }

    // supabase already initialized above (rate limiter)
    const classroomId = auth.classroomId;

    if (!classroomId) {
      return NextResponse.json({ success: false, error: 'No classroom found' }, { status: 400 });
    }

    // CONFIRM path: teacher says "yes, the identification was correct"
    // Only updates accuracy EMA as correct — does NOT record a correction entry
    // Also updates visual memory usage stats (confirmed = the description helped)
    if (action === 'confirm') {
      if (!original_work_name) {
        console.warn('[Corrections] Confirm action missing original_work_name — EMA not updated');
      }
      if (original_work_name) {
        // Run EMA update and visual memory stats in parallel
        // LOW-003: Log errors from both RPCs instead of silently swallowing
        const [emaResult, memoryResult] = await Promise.allSettled([
          supabase.rpc('update_work_accuracy', {
            p_classroom_id: classroomId,
            p_work_name: original_work_name,
            p_work_id: null,
            p_area: original_area || null,
            p_was_correct: true,
          }),
          // Increment times_correct on visual memory (if entry exists) — atomic via RPC
          supabase.rpc('increment_visual_memory_correct', {
            p_classroom_id: classroomId,
            p_work_name: original_work_name,
          }),
        ]);
        if (emaResult.status === 'rejected') {
          console.error('[Corrections] update_work_accuracy RPC failed on confirm (non-fatal):', emaResult.reason);
        }
        if (memoryResult.status === 'rejected') {
          console.error('[Corrections] increment_visual_memory_correct RPC failed on confirm (non-fatal):', memoryResult.reason);
        }
      }
      // Replace stale cache with teacher-confirmed confidence so photos stay GREEN on refresh
      // Without this, the audit page reads null confidence → classifies as amber
      // IMPORTANT: Sequential delete-then-insert (not parallel) to prevent duplicate rows
      if (media_id && child_id) {
        // Delete old entries first (both formats) — await each to ensure completion
        const { error: delErr1 } = await supabase
          .from('montree_guru_interactions')
          .delete()
          .eq('question', `photo:${media_id}:${child_id}`);
        if (delErr1) console.error('[Corrections] Delete exact-key error (non-fatal):', delErr1.message);

        const { error: delErr2 } = await supabase
          .from('montree_guru_interactions')
          .delete()
          .like('question', `photo:${media_id}:${child_id}:%`);
        if (delErr2) console.error('[Corrections] Delete like-key error (non-fatal):', delErr2.message);

        // Insert fresh confidence row
        const { error: insErr } = await supabase
          .from('montree_guru_interactions')
          .insert({
            child_id,
            classroom_id: classroomId,
            question_type: 'photo_insight',
            question: `photo:${media_id}:${child_id}`,
            response_insight: `Teacher confirmed: "${original_work_name}"`,
            model_used: 'teacher',
            context_snapshot: {
              sonnet_confidence: 1.0,
              scenario: 'teacher_confirmed',
              identified_work_name: original_work_name || null,
              identified_area: original_area || null,
              classification_method: 'teacher_confirmed',
            },
          });
        if (insErr) console.error('[Corrections] Confirm confidence insert error (non-fatal):', insErr);
        else console.log(`[Corrections] Confidence row inserted for confirmed photo:${media_id}:${child_id}`);
      }
      // Set teacher_confirmed flag directly on the media row — this is the definitive signal
      // that the photo has been audited. The audit page excludes teacher_confirmed photos.
      if (media_id) {
        const { error: confirmErr } = await supabase
          .from('montree_media')
          .update({ teacher_confirmed: true })
          .eq('id', media_id);
        if (confirmErr) console.error('[Corrections] Set teacher_confirmed error (non-fatal):', confirmErr.message);
      }

      console.log(`[Corrections] Confirmed correct: "${original_work_name}" (classroom ${classroomId})`);

      // Record a real-time progress observation — confirmed photos register immediately
      // so the Guru knows what this child worked on today without waiting for Weekly Wrap
      upsertProgressObservation({
        supabase, childId: child_id, classroomId,
        workName: original_work_name || null,
        area: original_area || null,
      }).catch(err => console.error('[Corrections] Progress upsert (confirm) failed (non-fatal):', err));

      return NextResponse.json({ success: true, confirmed: true });
    }

    // ========================================================
    // CORRECTION PATH: Teacher says "this is wrong, it's actually X"
    // ========================================================

    // 1. Look up the original photo URL from cached interaction (needed for visual description)
    // Cache keys are now locale-agnostic (photo:media_id:child_id)
    let photoUrl: string | null = null;
    if (media_id) {
      try {
        // Single query — cache keys are locale-agnostic since Fix 5
        const { data: cachedInteraction } = await supabase
          .from('montree_guru_interactions')
          .select('context_snapshot')
          .eq('question', `photo:${media_id}:${child_id}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cachedInteraction?.context_snapshot) {
          const snapshot = cachedInteraction.context_snapshot as Record<string, unknown>;
          photoUrl = typeof snapshot.photo_url === 'string' ? snapshot.photo_url : null;
        }

        // Fallback: try old locale-suffixed format (photo:media:child:en or photo:media:child:zh)
        if (!photoUrl) {
          const { data: oldFormatInteraction } = await supabase
            .from('montree_guru_interactions')
            .select('context_snapshot')
            .like('question', `photo:${media_id}:${child_id}:%`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (oldFormatInteraction?.context_snapshot) {
            const snapshot = oldFormatInteraction.context_snapshot as Record<string, unknown>;
            photoUrl = typeof snapshot.photo_url === 'string' ? snapshot.photo_url : null;
          }
        }

        // Fallback: try to get photo URL directly from media table if cache missed
        // Security: filter by child_id to prevent cross-school photo URL extraction
        if (!photoUrl) {
          const { data: media } = await supabase
            .from('montree_media')
            .select('file_url')
            .eq('id', media_id)
            .eq('child_id', child_id)
            .maybeSingle();
          if (media?.file_url) {
            photoUrl = media.file_url;
          }
        }
      } catch {
        // Non-fatal — continue without photo URL
      }
    }

    // HIGH-001 fix: Warn if photo URL not resolved — visual memory will be skipped
    if (!photoUrl) {
      console.error(`[Corrections] Could not resolve photo URL for media_id=${media_id}. Visual learning will be skipped.`);
    }

    // 2. Record the correction (now with photo_url)
    // IDEMPOTENCY: Check for existing correction with same media_id + corrected_work_name
    // Prevents duplicate records on teacher retries (which poison EMA accuracy)
    if (media_id && corrected_work_name) {
      const { data: existingCorrection } = await supabase
        .from('montree_guru_corrections')
        .select('id')
        .eq('media_id', media_id)
        .eq('corrected_work_name', corrected_work_name)
        .limit(1)
        .maybeSingle();

      if (existingCorrection) {
        console.log(`[Corrections] Duplicate correction for media ${media_id} → "${corrected_work_name}" — returning existing`);
        return NextResponse.json({ success: true, correction_id: existingCorrection.id, deduplicated: true });
      }
    }

    const { data: correction, error: corrError } = await supabase
      .from('montree_guru_corrections')
      .insert({
        classroom_id: classroomId,
        media_id: media_id || null,
        child_id: child_id || null,
        original_work_name,
        original_work_id: original_work_id || null,
        original_area: original_area || null,
        original_confidence: typeof original_confidence === 'number' ? original_confidence : null,
        corrected_work_name: corrected_work_name || null,
        corrected_work_id: corrected_work_id || null,
        corrected_area: corrected_area || null,
        correction_type,
        teacher_id: auth.userId || null,
        photo_url: photoUrl,
      })
      .select('id')
      .maybeSingle();

    if (corrError) {
      console.error('[Corrections] Insert error:', corrError);
      return NextResponse.json({ success: false, error: 'Failed to record correction' }, { status: 500 });
    }

    // 2b. Update montree_media.work_id so reports/gallery show the corrected work
    if (media_id && (corrected_work_id || corrected_work_name)) {
      let resolvedWorkId = corrected_work_id || null;

      // If no work_id provided, look it up from classroom curriculum by name
      if (!resolvedWorkId && corrected_work_name?.trim() && classroomId) {
        // Escape SQL wildcards in the work name to prevent unintended matches
        const safeName = corrected_work_name.trim().replace(/[%_\\]/g, '\\$&');
        const { data: workRow } = await supabase
          .from('montree_classroom_curriculum_works')
          .select('id')
          .eq('classroom_id', classroomId)
          .ilike('name', safeName)
          .limit(1)
          .maybeSingle();
        if (workRow?.id) {
          resolvedWorkId = workRow.id;
        }
      }

      if (resolvedWorkId) {
        // Filter by both id AND child_id to prevent cross-child media updates
        const { error: mediaUpdateErr } = await supabase
          .from('montree_media')
          .update({ work_id: resolvedWorkId })
          .eq('id', media_id)
          .eq('child_id', child_id);

        if (mediaUpdateErr) {
          console.error('[Corrections] Failed to update media work_id (non-fatal):', mediaUpdateErr);
        } else {
          console.log(`[Corrections] Updated media ${media_id} work_id → ${resolvedWorkId}`);
        }
      } else {
        console.warn(`[Corrections] Could not resolve work_id for "${corrected_work_name}" — media.work_id not updated`);
      }
    }

    // 3. Update accuracy EMA — mark the original as incorrect
    // 4. If corrected to a different work, mark the corrected work as correct
    // 5. Generate visual description + store in visual memory
    // 6. Feed into brain learning system
    // Run steps 3-6 in parallel (all independent, all non-fatal)

    const parallelTasks: Promise<void>[] = [];

    // Step 3: EMA for original (incorrect)
    if (original_work_name) {
      parallelTasks.push(
        supabase.rpc('update_work_accuracy', {
          p_classroom_id: classroomId,
          p_work_name: original_work_name,
          p_work_id: null,
          p_area: original_area || null,
          p_was_correct: false,
        }).then(() => {}).catch((err: unknown) => {
          console.error('[Corrections] Accuracy EMA error for original (non-fatal):', err);
        })
      );
    }

    // Step 4: EMA for corrected (correct)
    if (corrected_work_name && corrected_work_name !== original_work_name) {
      parallelTasks.push(
        supabase.rpc('update_work_accuracy', {
          p_classroom_id: classroomId,
          p_work_name: corrected_work_name,
          p_work_id: null,
          p_area: corrected_area || null,
          p_was_correct: true,
        }).then(() => {}).catch((err: unknown) => {
          console.error('[Corrections] Accuracy EMA error for corrected (non-fatal):', err);
        })
      );
    }

    // Step 5: Enrich visual memory for the corrected work + log negative on the original.
    // This is the KEY self-learning loop ("the moat"). Two paths:
    //   (a) corrected work — APPEND a rich visual fingerprint (preferring cached Sonnet draft)
    //   (b) original work — APPEND a negative example ("looks like X but is Y") so Pass 2
    //       distinguishes them next time via the DISTINGUISH FROM block.
    //
    // TIER GATE: Sonnet enrichment is the moat-builder — only run for paid tiers.
    // Free schools still save the correction itself (work assignment, photo update),
    // they just don't accrue moat data. Their Pass 2 will keep using whatever's already
    // there. This is the right behaviour: moat compounds for paying customers.
    const aiTier = await resolveReportModel(supabase, auth.schoolId);
    if (corrected_work_name && photoUrl && anthropic && aiTier.tier !== 'free') {
      parallelTasks.push(
        enrichVisualMemoryFromCorrection({
          supabase,
          classroomId,
          mediaId: media_id || null,
          correctedWorkName: corrected_work_name,
          correctedWorkId: corrected_work_id || null,
          correctedArea: corrected_area || null,
          originalWorkName: original_work_name || null,
          originalWorkId: original_work_id || null,
          originalArea: original_area || null,
          photoUrl,
          // 🚨 The "welder" tier gate. On Premium (sonnet) a correction is
          // authored by Sonnet — a high-quality local fingerprint that makes
          // the fix stick hard. On Core (haiku) it's authored by Haiku — cheap,
          // Sonnet-free, still records the fingerprint + negative example, just
          // at Haiku quality. Paying schools get the welder; Core stays lean.
          tier: aiTier.tier,
        }).catch((err) => {
          console.error('[Corrections] Visual memory enrichment failed (non-fatal):', err);
        })
      );
    } else if (aiTier.tier === 'free' && corrected_work_name) {
      // Session 113 audit quick-win: bumped from console.log to console.warn so
      // this surfaces in Railway log-level filters. Free-tier schools save the
      // correction (photo update, work assignment, teacher_confirmed flip) but
      // do NOT accrue visual memory moat data — that's intentional architecture
      // (moat compounds for paying customers per Session 57 rule #29).
      console.warn(`[Corrections] Skipping Sonnet enrichment for free-tier school=${auth.schoolId} — correction saved but no visual memory write fired.`);
    }

    // Step 6: Feed into brain learning system
    parallelTasks.push(
      feedBrainLearning({
        supabase,
        originalWorkName: original_work_name,
        correctedWorkName: corrected_work_name,
        originalArea: original_area,
        correctedArea: corrected_area,
      }).catch(() => {
        // Non-fatal — brain learning is best-effort
      })
    );

    // Step 7: Replace stale photo-insight cache with teacher-confirmed confidence
    // Delete old entries first, then insert a fresh row with confidence 1.0
    // This ensures corrected photos show as GREEN on the audit page after refresh
    if (media_id && child_id) {
      // Delete old cache entries (both new and old locale-suffixed format)
      parallelTasks.push(
        supabase
          .from('montree_guru_interactions')
          .delete()
          .eq('question', `photo:${media_id}:${child_id}`)
          .then(({ error: delErr }) => {
            if (delErr) {
              console.error('[Corrections] Cache invalidation error (non-fatal):', delErr);
            }
          })
          .catch((err: unknown) => {
            console.error('[Corrections] Cache invalidation failed (non-fatal):', err);
          })
      );
      parallelTasks.push(
        supabase
          .from('montree_guru_interactions')
          .delete()
          .like('question', `photo:${media_id}:${child_id}:%`)
          .then(({ error: delErr }) => {
            if (delErr) {
              console.error('[Corrections] Old-format cache invalidation error (non-fatal):', delErr);
            }
          })
          .catch((err: unknown) => {
            console.error('[Corrections] Old-format cache invalidation failed (non-fatal):', err);
          })
      );
      // Wait for deletes to complete before inserting the replacement row
      await Promise.allSettled(parallelTasks);
      parallelTasks.length = 0; // Reset — deletes are done

      // Insert fresh confidence row so audit page classifies this photo as GREEN
      const effectiveWorkName = corrected_work_name || original_work_name;
      const effectiveArea = corrected_area || original_area;
      const { error: confInsErr } = await supabase
        .from('montree_guru_interactions')
        .insert({
          child_id,
          classroom_id: classroomId,
          question_type: 'photo_insight',
          question: `photo:${media_id}:${child_id}`,
          response_insight: `Teacher corrected: "${original_work_name}" → "${corrected_work_name}"`,
          model_used: 'teacher',
          context_snapshot: {
            sonnet_confidence: 1.0,
            scenario: 'teacher_corrected',
            identified_work_name: effectiveWorkName || null,
            identified_area: effectiveArea || null,
            classification_method: 'teacher_corrected',
            original_work_name: original_work_name || null,
            corrected_work_name: corrected_work_name || null,
          },
        });
      if (confInsErr) console.error('[Corrections] Confidence row insert error (non-fatal):', confInsErr);
      else console.log(`[Corrections] Confidence row inserted for corrected photo:${media_id}:${child_id}`);
    }

    // Wait for all parallel tasks (none are fatal)
    await Promise.allSettled(parallelTasks);

    // Mark photo as teacher_confirmed — the teacher has audited this photo via
    // any correction/attach path (including the Tier 1/2/3 Accept router), so
    // it should not reappear in the Photo Review queue on refresh.
    // Fixes ghost-queue bug: previously only the CONFIRM branch set this flag,
    // so Tier 1 silent-attach photos kept returning to the queue.
    if (media_id) {
      const { error: tcErr } = await supabase
        .from('montree_media')
        .update({ teacher_confirmed: true })
        .eq('id', media_id);
      if (tcErr) console.error('[Corrections] Set teacher_confirmed (correction branch) error (non-fatal):', tcErr.message);
    }

    console.log(`[Corrections] Recorded: "${original_work_name}" → "${corrected_work_name}" (classroom ${classroomId})${photoUrl ? ' [visual memory generated]' : ''}${media_id ? ' [cache invalidated]' : ''}`);

    // Record a real-time progress observation using the CORRECTED work name
    upsertProgressObservation({
      supabase, childId: child_id, classroomId,
      workName: corrected_work_name || original_work_name || null,
      area: corrected_area || original_area || null,
    }).catch(err => console.error('[Corrections] Progress upsert (correction) failed (non-fatal):', err));

    return NextResponse.json({
      success: true,
      correction_id: correction?.id || null,
      visual_learning: !!photoUrl,
      cache_invalidated: !!(media_id && child_id),
      ...(photoUrl ? {} : { warning: 'Correction saved but visual learning could not be applied (photo not found)' }),
    });
  } catch (error) {
    console.error('[Corrections] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}

// ========================================================
// Real-Time Progress Observation
// Called every time a photo is confirmed or corrected so the Guru
// and Weekly Wrap see current-day work without waiting for reports.
//
// Rules:
//   - No row exists → insert status='presented' (minimum claim: "I saw this child do this")
//   - Row exists with status='presented' → refresh updated_at so it stays current
//   - Row exists with status='practicing' or 'mastered' → leave completely alone (never downgrade)
//
// (Comment fix Session 113 — the code uses 'presented' per migration 081's
// enum. The earlier comment said 'presenting' which never matched reality.
// Mastery is teacher-decision-only per Session 66 architectural rule —
// photo count never implies mastered.)
// ========================================================

async function upsertProgressObservation({
  supabase,
  childId,
  classroomId,
  workName,
  area,
}: {
  supabase: ReturnType<typeof getSupabase>;
  childId: string;
  classroomId: string;
  workName: string | null;
  area: string | null;
}) {
  // Delegates to the SINGLE shared advance function so a confirmed photo advances
  // the shelf status identically for every work (see advance-on-confirm.ts).
  await advanceProgressOnConfirm({ supabase, childId, workName, area });
}

// ========================================================
// Visual Memory Enrichment (Self-Learning Loop)
// ========================================================

// Strategy:
//   1. Try to use the cached Sonnet draft visual_description from the media row.
//      It's richer than re-running Haiku AND it's free (already paid for).
//   2. Fall back to a fresh Haiku visual call if no draft is cached.
//   3. APPEND the new fingerprint to existing visual_description (multi-fingerprint
//      accumulation across many corrections), capped at ~2500 chars total.
//   4. Log a NEGATIVE example on the original (wrong) work — appended to its
//      negative_descriptions[] array. Pass 2 already renders these as
//      "DISTINGUISH FROM" blocks so future calls avoid the same confusion.

// MOAT-POISONING GATE (Apr 30, 2026 audit fix).
// Sonnet sometimes generates plausible-but-wrong reasoning when asked WHY two
// works were confused. If we persist that reasoning into negative_descriptions[],
// it sits in the moat forever and biases future identifications. This function
// rejects negatives that don't reference at least one concrete material noun
// OR one of the corrected work's declared key_materials. The positive fingerprint
// on the corrected work is the more important learning signal — losing the
// occasional negative example is much cheaper than letting hallucinated
// distinguishing logic corrupt the corpus.
// 🚨 Session 113 V2 Photo AI quality audit Q-14 — MATERIAL_NOUNS is now
// REAL MATERIALS / OBJECT NOUNS ONLY. The previous list included colors,
// sizes, and textures ('red', 'blue', 'small', 'thick') which let Sonnet
// hallucinations like "small red object" pass the coherence gate and
// poison negative_descriptions[]. Color/size/texture descriptors moved
// to DESCRIPTOR_QUALIFIERS — they're allowed as supporting evidence
// (they make a real-noun negative MORE specific) but never as the SOLE
// signal that distinguishes a coherent negative from a hallucination.
const MATERIAL_NOUNS = [
  // Materials of construction
  'wooden', 'wood', 'metal', 'plastic', 'fabric', 'cloth', 'paper', 'cardboard',
  'sandpaper', 'glass', 'ceramic', 'rubber', 'felt', 'leather', 'cork', 'bamboo',
  // Common Montessori components — physical objects, not adjectives
  'beads', 'cylinders', 'tablets', 'cards', 'frames', 'tray', 'mat', 'bowl',
  'pitcher', 'pegs', 'sticks', 'rods', 'cubes', 'prisms', 'spheres', 'circles',
  'squares', 'triangles', 'rectangles', 'letters', 'numbers', 'numerals',
  'sandpaper letter', 'sandpaper number', 'sandpaper letters',
  // Session 113 F-9 expansion — high-value Montessori-specific nouns
  'knobs', 'knobbed', 'spindles', 'spindle box', 'chips', 'counters',
  'puzzle', 'globe', 'map', 'binomial', 'trinomial', 'hierarchical',
  'fraction', 'fractions', 'geometric', 'inset', 'insets', 'pouring',
  'transferring', 'tongs', 'tweezers', 'sponge', 'sponges', 'brush', 'brushes',
  'jug', 'spoon', 'scissors', 'lock', 'locks', 'bell', 'bells',
  'cylinder block', 'pink tower', 'brown stair', 'red rods', 'movable alphabet',
];

// Descriptor qualifiers — color/texture/size words that DO appear in
// real-world distinguishing negatives, but can ALSO appear in pure
// hallucinations. Kept separate so they enrich a real-material-noun
// negative without ever standalone-validating a hallucination.
const DESCRIPTOR_QUALIFIERS = new Set([
  'red', 'blue', 'yellow', 'pink', 'green', 'orange', 'purple', 'black',
  'white', 'gray', 'rough', 'smooth', 'rigid', 'soft', 'hard', 'thick',
  'thin', 'large', 'small',
]);
// Reference DESCRIPTOR_QUALIFIERS so the symbol isn't dropped by tree-shaking
// before a future audit consumes it. Read-only — not used by the gate today
// but documents the architectural decision.
void DESCRIPTOR_QUALIFIERS;

/**
 * 🚨 F-9 (Session 113 photo pipeline audit): softer coherence gate.
 * 🚨 Q-14 (Session 113 V2 photo AI quality audit): MATERIAL_NOUNS now
 *    REAL nouns only — color/size/texture descriptors that previously
 *    standalone-validated a negative ("small red object") are removed
 *    from the noun list. They live in DESCRIPTOR_QUALIFIERS as a
 *    reference but never as the sole pass condition.
 *
 * Gate accepts a negative whenever EITHER condition is satisfied:
 *   (1) a concrete material noun appears (from corrected work's
 *       key_materials OR the curated MATERIAL_NOUNS list), OR
 *   (2) the text is long enough (>= 120 chars) that Sonnet had room to
 *       BE specific, even without an exact noun match in our list.
 *
 * Floor still rejects pure noise (< 25 chars).
 */
function isCoherentNegative(negative: string, knownMaterials: string[]): boolean {
  const text = negative.toLowerCase();
  // Pure-noise floor — must be more than 25 chars
  if (text.length < 25) return false;

  // (1) Direct hit on a known key_material from the corrected work
  for (const m of knownMaterials) {
    const ml = m.toLowerCase().trim();
    if (ml.length >= 3 && text.includes(ml)) return true;
  }
  // (2) Direct hit on any standard Montessori material noun
  for (const noun of MATERIAL_NOUNS) {
    if (text.includes(noun)) return true;
  }
  // (3) Length-only fallback — long, specific-sounding negatives without
  // an exact material-word match. Set the bar high so true ramblings
  // still get filtered. 120 chars ≈ 1-2 sentences of specific reasoning.
  if (text.length >= 120) return true;
  return false;
}

async function enrichVisualMemoryFromCorrection({
  supabase,
  classroomId,
  mediaId,
  correctedWorkName,
  correctedWorkId,
  correctedArea,
  originalWorkName,
  originalWorkId,
  originalArea,
  photoUrl,
  tier,
}: {
  supabase: ReturnType<typeof getSupabase>;
  classroomId: string;
  mediaId: string | null;
  correctedWorkName: string;
  correctedWorkId: string | null;
  correctedArea: string | null;
  originalWorkName: string | null;
  originalWorkId: string | null;
  originalArea: string | null;
  photoUrl: string;
  tier: 'haiku' | 'sonnet';
}) {
  if (!photoUrl.startsWith('http://') && !photoUrl.startsWith('https://')) {
    console.warn('[VisualMemory] Invalid photoUrl, skipping enrichment:', photoUrl);
    return;
  }

  // 1. Try to read the cached Sonnet draft visual description + key_materials (rich, free)
  let visualDescription: string | null = null;
  let draftKeyMaterials: string[] = [];
  let descriptionSource: 'sonnet_draft' | 'haiku_fresh' | 'sonnet_correction' = 'sonnet_draft';
  if (mediaId) {
    try {
      const { data: mediaRow } = await supabase
        .from('montree_media')
        .select('sonnet_draft')
        .eq('id', mediaId)
        .maybeSingle();
      const draft = mediaRow?.sonnet_draft as Record<string, unknown> | null;
      if (draft && typeof draft.visual_description === 'string' && draft.visual_description.trim().length >= 20) {
        visualDescription = draft.visual_description.trim();
      }
      // Also extract key_materials from the Sonnet draft — these carry the materials
      // signal into Pass 2 Haiku prompts via montree_visual_memory.key_materials
      if (draft && Array.isArray(draft.key_materials)) {
        draftKeyMaterials = (draft.key_materials as string[])
          .filter((m: unknown) => typeof m === 'string' && (m as string).trim().length > 0)
          .map((m: string) => m.trim())
          .slice(0, 20);
      }
    } catch (err) {
      console.warn('[VisualMemory] Failed to read sonnet_draft (non-fatal):', err);
    }
  }

  // 2. Correction analysis — rich visual description + mistake reasoning.
  //    When a teacher corrects a guess, the model looks at the ACTUAL photo and produces:
  //    (a) A detailed visual fingerprint of the CORRECT work
  //    (b) Key materials visible in the photo
  //    (c) A specific negative example explaining WHY the AI confused it with the wrong work
  //    This is the crown jewel of the self-learning loop: every Fix makes Haiku smarter.
  //    🚨 The author model is TIER-GATED: Sonnet welds the fix on Premium (a
  //    laser-sharp fingerprint that makes it stick), Haiku authors it on Core
  //    (cheaper, Sonnet-free — still records the fingerprint + negative, at Haiku
  //    quality). Both run at temperature 0 so the stored fingerprint is stable.
  const authorModel = tier === 'sonnet' ? AI_MODEL : HAIKU_MODEL;
  const hasCachedDescription = !!visualDescription;
  const isRealCorrection = originalWorkName && originalWorkName.trim() &&
    originalWorkName.toLowerCase() !== correctedWorkName.toLowerCase();
  // Bidirectional confusable pair: captured from Sonnet analysis, written after fingerprint upsert
  let reverseNegative = '';

  if (anthropic && (!hasCachedDescription || isRealCorrection)) {
    const apiAbortController = new AbortController();
    const apiTimeout = setTimeout(() => apiAbortController.abort(), 45000);
    try {
      const message = await anthropic.messages.create({
        model: authorModel,
        temperature: 0, // stable fingerprint — same photo → same description
        max_tokens: 1024,
        system: `You are a Montessori classroom AI that learns from teacher corrections. A teacher just corrected the AI's identification of a Montessori work in a photo. Your job is to analyze the photo carefully and produce structured data that will help the AI get it right next time.

Focus on PHYSICAL MATERIALS visible in the photo — not the child. Be extremely specific about what distinguishes this work from similar ones: exact materials, colors, shapes, arrangement, textures, what's on the table, what's NOT on the table.`,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: photoUrl } },
            { type: 'text', text: `The AI guessed this was "${originalWorkName || 'unknown'}" but the teacher corrected it to "${correctedWorkName}" (area: ${correctedArea || 'unknown'}).

Analyze the photo and call the correction_analysis tool.` },
          ],
        }],
        tools: [{
          name: 'correction_analysis',
          description: 'Record structured correction analysis for visual memory',
          input_schema: {
            type: 'object' as const,
            required: ['visual_description', 'key_materials', 'mistake_reason', 'distinguishing_features'],
            properties: {
              visual_description: {
                type: 'string',
                description: 'Detailed description of what the CORRECT work looks like in this photo. 2-4 sentences. Focus on materials, arrangement, colors, textures. This will be stored as a visual fingerprint to recognize this work in future photos.',
              },
              key_materials: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of specific materials/objects visible (e.g. "red metal inset frame", "blue crayon", "pink sandpaper letter card"). 3-8 items.',
              },
              mistake_reason: {
                type: 'string',
                description: 'Why the AI confused this with the wrong work. Be specific about what visual features are shared vs different. 1-2 sentences. This becomes a negative example on the WRONG work.',
              },
              distinguishing_features: {
                type: 'string',
                description: 'What specifically distinguishes this work from the one the AI guessed. Focus on what to look for AND what should be absent. 1-2 sentences.',
              },
            },
          },
        }],
        tool_choice: { type: 'tool', name: 'correction_analysis' },
      }, { signal: apiAbortController.signal });

      // Extract tool_use result
      for (const block of message.content) {
        if (block.type === 'tool_use' && block.name === 'correction_analysis') {
          const result = block.input as {
            visual_description?: string;
            key_materials?: string[];
            mistake_reason?: string;
            distinguishing_features?: string;
          };
          // Use Sonnet's visual description (richer than cached draft)
          if (result.visual_description && result.visual_description.length >= 20) {
            visualDescription = result.visual_description.trim().slice(0, 800);
            descriptionSource = 'sonnet_correction';
          }
          // Merge key_materials from Sonnet analysis with draft materials
          if (Array.isArray(result.key_materials) && result.key_materials.length > 0) {
            const seen = new Set(draftKeyMaterials.map(m => m.toLowerCase().trim()));
            for (const m of result.key_materials) {
              if (typeof m === 'string' && m.trim() && !seen.has(m.toLowerCase().trim())) {
                draftKeyMaterials.push(m.trim());
                seen.add(m.toLowerCase().trim());
              }
            }
            draftKeyMaterials = draftKeyMaterials.slice(0, 20);
          }
          // Store the mistake reason + distinguishing features for the negative example
          const mistakeReason = result.mistake_reason?.trim() || '';
          const distinguishing = result.distinguishing_features?.trim() || '';
          // Build a rich negative example for the WRONG work
          if (isRealCorrection && (mistakeReason || distinguishing)) {
            const negParts: string[] = [];
            if (mistakeReason) negParts.push(mistakeReason);
            if (distinguishing) negParts.push(`To distinguish: ${distinguishing}`);
            const richNegative = `NOT "${correctedWorkName}" — ${negParts.join(' ')}`.slice(0, 400);

            // AUDIT FIX (Apr 30, 2026): MOAT-POISONING GATE.
            // Sonnet can hallucinate the reason for confusion. If it writes
            // a generic, materials-free reasoning into the negative_descriptions
            // array, that bad reasoning sits in the visual memory forever and
            // biases future identifications.
            //
            // Coherence check before persisting: the negative text MUST reference
            // at least one concrete material noun OR one of the corrected work's
            // declared key_materials. Otherwise we skip the negative example
            // (the positive fingerprint on the corrected work is the more
            // important signal anyway).
            const coherent = isCoherentNegative(richNegative, draftKeyMaterials);

            if (coherent && originalWorkName) {
              await appendNegativeExample({
                supabase,
                classroomId,
                workName: originalWorkName,
                workKey: originalWorkId,
                area: originalArea,
                negative: richNegative,
              });
              console.log(`[VisualMemory] (media=${mediaId}) Sonnet correction analysis: negative on "${originalWorkName}" — ${mistakeReason.slice(0, 80)}`);
            } else if (!coherent) {
              console.warn(`[VisualMemory] (media=${mediaId}) SKIPPED moat-poisoning negative on "${originalWorkName || '?'}" — Sonnet reasoning lacked concrete material references. raw="${richNegative.slice(0, 120)}"`);
            }
            // Bidirectional: also record a reverse negative on the CORRECT work so Haiku
            // knows that THIS work can be confused with the original guess. Same gate.
            if (distinguishing && coherent) {
              reverseNegative = `May look similar to "${originalWorkName || 'unknown'}". ${distinguishing}`.slice(0, 400);
            }
          }
          break;
        }
      }
    } catch (err) {
      if (apiAbortController.signal.aborted) {
        console.error(`[VisualMemory] (media=${mediaId}) Sonnet correction analysis timed out`);
      } else {
        console.error(`[VisualMemory] (media=${mediaId}) Sonnet correction analysis failed (non-fatal):`, err);
      }
      // Fall through — we may still have a cached visualDescription from step 1
    } finally {
      clearTimeout(apiTimeout);
    }
  }

  if (!visualDescription || visualDescription.length < 10) {
    console.warn(`[VisualMemory] (media=${mediaId}) No usable description for "${correctedWorkName}"`);
    return;
  }
  visualDescription = visualDescription.slice(0, 800);

  // 3. APPEND positive fingerprint + key_materials to corrected work's visual memory
  await appendVisualFingerprint({
    supabase,
    classroomId,
    workName: correctedWorkName,
    workKey: correctedWorkId,
    area: correctedArea,
    isCustom: correctedWorkId ? String(correctedWorkId).startsWith('custom_') : false,
    fingerprint: visualDescription,
    photoUrl,
    mediaId,
    keyMaterials: draftKeyMaterials,
  });

  // 3b. BIDIRECTIONAL confusable pair — write reverse negative on the CORRECT work
  //     so Haiku also knows that correctedWorkName can be mistaken for originalWorkName.
  if (isRealCorrection && reverseNegative && originalWorkName) {
    await appendNegativeExample({
      supabase,
      classroomId,
      workName: correctedWorkName,
      workKey: correctedWorkId,
      area: correctedArea,
      negative: reverseNegative,
    });
    console.log(`[VisualMemory] Bidirectional negative on "${correctedWorkName}" (may look like "${originalWorkName}")`);
  }

  // 4. APPEND fallback negative example if Sonnet analysis didn't already handle it
  //    (Sonnet analysis writes a richer negative in step 2 above; this is the safety net)
  if (isRealCorrection) {
    // Check if Sonnet already wrote a negative (descriptionSource would be 'sonnet_correction')
    const sonnetWroteNegative = descriptionSource === ('sonnet_correction');
    if (!sonnetWroteNegative && originalWorkName) {
      const negativeText = `Looks similar to "${correctedWorkName}" — features: ${visualDescription.slice(0, 180)}`;
      await appendNegativeExample({
        supabase,
        classroomId,
        workName: originalWorkName,
        workKey: originalWorkId,
        area: originalArea,
        negative: negativeText,
      });
    }
  }

  console.log(`[VisualMemory] (media=${mediaId}) Enriched "${correctedWorkName}" via ${descriptionSource}${isRealCorrection ? ` + negative on "${originalWorkName}"` : ''}`);
  invalidateClassroomEmbeddings(classroomId);
}

// Append a visual fingerprint to a work's visual_description column.
// Multiple fingerprints accumulate over time, separated by " || ", capped at ~2500 chars.
// Older fingerprints are evicted FIFO when cap is hit.
async function appendVisualFingerprint({
  supabase,
  classroomId,
  workName,
  workKey,
  area,
  isCustom,
  fingerprint,
  photoUrl,
  mediaId,
  keyMaterials,
}: {
  supabase: ReturnType<typeof getSupabase>;
  classroomId: string;
  workName: string;
  workKey: string | null;
  area: string | null;
  isCustom: boolean;
  fingerprint: string;
  photoUrl: string;
  mediaId: string | null;
  keyMaterials?: string[];
}) {
  const SEP = ' || ';
  const CAP = 2500;

  const { data: existing } = await supabase
    .from('montree_visual_memory')
    .select('visual_description, description_confidence, key_materials')
    .eq('classroom_id', classroomId)
    .eq('work_name', workName)
    .maybeSingle();

  let merged = fingerprint;
  if (existing?.visual_description) {
    const existingDesc = String(existing.visual_description);
    // Skip if this exact fingerprint is already present (idempotent)
    if (existingDesc.includes(fingerprint.slice(0, 80))) {
      console.log(`[VisualMemory] Fingerprint already present for "${workName}" — skipping append`);
      return;
    }
    merged = `${existingDesc}${SEP}${fingerprint}`;
    // Evict oldest fingerprints if over cap
    while (merged.length > CAP && merged.includes(SEP)) {
      const idx = merged.indexOf(SEP);
      merged = merged.slice(idx + SEP.length);
    }
    if (merged.length > CAP) merged = merged.slice(-CAP);
  }

  // Merge key_materials: combine existing + new, deduplicate, cap at 20
  let mergedMaterials: string[] | undefined = undefined;
  if (keyMaterials && keyMaterials.length > 0) {
    const existingMaterials: string[] = Array.isArray(existing?.key_materials)
      ? (existing!.key_materials as string[]).filter((m: unknown) => typeof m === 'string')
      : [];
    const seen = new Set(existingMaterials.map((m: string) => m.toLowerCase().trim()));
    mergedMaterials = [...existingMaterials];
    for (const m of keyMaterials) {
      if (!seen.has(m.toLowerCase().trim())) {
        mergedMaterials.push(m);
        seen.add(m.toLowerCase().trim());
      }
    }
    mergedMaterials = mergedMaterials.slice(0, 20);
  }

  const upsertPayload: Record<string, unknown> = {
    classroom_id: classroomId,
    work_name: workName,
    work_key: workKey,
    area,
    is_custom: isCustom,
    visual_description: merged,
    source: 'correction',
    source_media_id: mediaId,
    photo_url: photoUrl,
    description_confidence: 0.95,
    updated_at: new Date().toISOString(),
  };
  if (mergedMaterials && mergedMaterials.length > 0) {
    upsertPayload.key_materials = mergedMaterials;
  }

  const { error } = await supabase
    .from('montree_visual_memory')
    .upsert(upsertPayload, { onConflict: 'classroom_id,work_name' });

  if (error) console.error('[VisualMemory] Append fingerprint upsert failed:', error);
}

// Append a negative example to a work's negative_descriptions[] array.
// Idempotent: skips if a near-duplicate is already present.
async function appendNegativeExample({
  supabase,
  classroomId,
  workName,
  workKey,
  area,
  negative,
}: {
  supabase: ReturnType<typeof getSupabase>;
  classroomId: string;
  workName: string;
  workKey: string | null;
  area: string | null;
  negative: string;
}) {
  // 🚨 Session 113 V2 photo AI quality audit Q-9 — raised from 8 → 50.
  // The previous FIFO cap evicted old durable negatives when new ones
  // arrived. But old negatives represent ACCUMULATED LEARNING; newer
  // ones are more likely to be one-off oddities (unusual photo angle,
  // transient material similarity). Evicting the old ones was throwing
  // away durable signal in favor of recent noise — the moat eroded in
  // a way that surfaced as "previously-fixed confusions slowly drift
  // back" (mis-diagnosed as Haiku regression).
  //
  // 50 entries × ~400 chars each ≈ 20 KB per work row — trivial storage.
  // Deduplication by 60-char prefix already prevents copy-spam, so the
  // 50 entries are 50 DISTINCT durable signals.
  const MAX_NEGATIVES = 50;

  const { data: existing } = await supabase
    .from('montree_visual_memory')
    .select('negative_descriptions, description_confidence, visual_description')
    .eq('classroom_id', classroomId)
    .eq('work_name', workName)
    .maybeSingle();

  const currentNegatives: string[] = Array.isArray(existing?.negative_descriptions)
    ? (existing!.negative_descriptions as string[])
    : [];

  // Idempotency: skip if first 60 chars match an existing entry
  const head = negative.slice(0, 60).toLowerCase();
  if (currentNegatives.some(n => typeof n === 'string' && n.slice(0, 60).toLowerCase() === head)) {
    console.log(`[VisualMemory] Negative already present for "${workName}" — skipping`);
    return;
  }

  // FIFO cap — only triggers above 50 distinct negatives per work.
  const nextNegatives = [...currentNegatives, negative].slice(-MAX_NEGATIVES);

  if (!existing) {
    // No positive fingerprint yet for this work — skip the negative.
    // Creating a stub row would inject "LOOKS LIKE: (no fingerprint)" garbage into Pass 2.
    // Negatives only accumulate on works with at least one positive correction first.
    console.log(`[VisualMemory] Skipping negative on "${workName}" — no positive fingerprint yet`);
    return;
  }

  // Suppress unused warnings — workKey/area only used in stub branch which is now removed
  void workKey;
  void area;

  const { error } = await supabase
    .from('montree_visual_memory')
    .update({
      negative_descriptions: nextNegatives,
      updated_at: new Date().toISOString(),
    })
    .eq('classroom_id', classroomId)
    .eq('work_name', workName);
  if (error) {
    console.error('[VisualMemory] Negative update failed (column may be missing):', error.message);
  }
}

// ========================================================
// Visual Memory Generation (legacy — kept for first_capture path)
// ========================================================

// Generate a visual description of the material from the photo using Haiku (cheap + fast)
// and store it in montree_visual_memory for future Smart Capture prompt injection
async function generateAndStoreVisualMemory({
  supabase,
  classroomId,
  workName,
  workKey,
  area,
  photoUrl,
  mediaId,
  isCustom,
  source,
  schoolId,
  teacherId,
}: {
  supabase: ReturnType<typeof getSupabase>;
  classroomId: string;
  workName: string;
  workKey: string | null;
  area: string | null;
  photoUrl: string;
  mediaId: string | null;
  isCustom: boolean;
  source: 'correction' | 'first_capture' | 'teacher_manual';
  schoolId: string;
  teacherId: string;
}) {
  if (!anthropic) return;

  // LOW-001: Validate photoUrl before sending to Haiku
  if (!photoUrl.startsWith('http://') && !photoUrl.startsWith('https://')) {
    console.warn('[VisualMemory] Invalid photoUrl, skipping visual memory generation:', photoUrl);
    return;
  }

  // Generate visual description using Haiku with vision
  // Haiku is perfect here: we don't need deep reasoning, just "describe what you see"
  // CRITICAL-001 fix: AbortController + 45s timeout prevents hanging if Haiku API stalls
  const apiAbortController = new AbortController();
  const apiTimeout = setTimeout(() => apiAbortController.abort(), 45000);
  const haikuStartMs = Date.now();

  let message;
  try {
    message = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 150,
      system: `You are a Montessori classroom material describer. Given a photo of a child working with Montessori materials, describe ONLY the physical materials/objects visible — NOT the child, NOT the activity, NOT the room. Focus on: shape, color, size, material (wood/metal/fabric/plastic), arrangement, and any distinctive visual features. Keep it to 1-2 sentences, max 120 words. This description will be used to help identify the same materials in future photos.`,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'url', url: photoUrl },
          },
          {
            type: 'text',
            text: `This is the Montessori work "${workName}" (area: ${area || 'unknown'}). Describe the physical materials visible so they can be recognized in future photos.`,
          },
        ],
      }],
    }, { signal: apiAbortController.signal });
  } catch (err) {
    // Check if OUR AbortController fired (the 45s timeout) — most reliable signal
    if (apiAbortController.signal.aborted) {
      console.error(`[VisualMemory] (media=${mediaId}) Haiku vision call timed out after 45s (${Date.now() - haikuStartMs}ms) — skipping visual memory generation`);
      return; // Non-fatal: correction still saved, only visual learning skipped
    }
    throw err;
  } finally {
    clearTimeout(apiTimeout);
  }

  // LOW-004: Log Haiku latency for monitoring degradation
  console.log(`[VisualMemory] Correction Haiku latency: ${Date.now() - haikuStartMs}ms for "${workName}"`);

  // logApiUsage deferred — metering system not yet deployed

  // Extract text response
  let visualDescription = '';
  for (const block of message.content) {
    if (block.type === 'text') {
      visualDescription = block.text.trim();
      break;
    }
  }

  if (!visualDescription || visualDescription.length < 10) {
    console.warn(`[VisualMemory] (media=${mediaId}) Haiku returned empty/short description for "${workName}"`);
    return;
  }

  // Cap at 500 chars to keep prompt injection reasonable
  visualDescription = visualDescription.slice(0, 500);

  // Upsert into visual memory — only if new confidence >= existing confidence
  // Prevents lower-quality first_capture (0.7) from overwriting higher-quality correction (0.9)
  const newConfidence = source === 'correction' ? 0.9 : 0.7;

  // Check existing confidence before overwriting
  const { data: existingMemory } = await supabase
    .from('montree_visual_memory')
    .select('description_confidence')
    .eq('classroom_id', classroomId)
    .eq('work_name', workName)
    .maybeSingle();

  if (existingMemory && typeof existingMemory.description_confidence === 'number' && existingMemory.description_confidence > newConfidence) {
    console.log(`[VisualMemory] Skipping upsert: existing confidence ${existingMemory.description_confidence} > new ${newConfidence} for "${workName}"`);
    return;
  }

  const { error: upsertError } = await supabase
    .from('montree_visual_memory')
    .upsert({
      classroom_id: classroomId,
      work_name: workName,
      work_key: workKey,
      area: area,
      is_custom: isCustom,
      visual_description: visualDescription,
      source,
      source_media_id: mediaId,
      photo_url: photoUrl,
      description_confidence: newConfidence,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'classroom_id,work_name' });

  if (upsertError) {
    console.error('[VisualMemory] Upsert error:', upsertError);
  } else {
    console.log(`[VisualMemory] Stored description for "${workName}" in classroom ${classroomId} (source: ${source})`);
    // Invalidate per-classroom CLIP embeddings so they re-build with new description
    invalidateClassroomEmbeddings(classroomId);
  }

  // Also update the correction record with the visual description
  if (mediaId) {
    await supabase
      .from('montree_guru_corrections')
      .update({ visual_description: visualDescription })
      .eq('media_id', mediaId)
      .eq('classroom_id', classroomId)
      .order('created_at', { ascending: false })
      .limit(1)
      .catch((err: unknown) => { console.error('[VisualMemory] Correction record update error (non-fatal):', err); });
  }
}

// ========================================================
// Brain Learning with Retry Queue (CRITICAL-003 fix)
// In-memory queue catches transient Supabase failures
// Survives within a single container lifetime (not across deploys)
// ========================================================

interface RetryItem {
  payload: Record<string, unknown>;
  attempts: number;
  lastAttempt: number;
}

const LEARNING_RETRY_QUEUE: RetryItem[] = [];
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 30000; // 30s between retries

async function feedBrainLearning({
  supabase,
  originalWorkName,
  correctedWorkName,
  originalArea,
  correctedArea,
}: {
  supabase: ReturnType<typeof getSupabase>;
  originalWorkName: string;
  correctedWorkName: string;
  originalArea: string;
  correctedArea: string;
}) {
  // Guard: skip if names are empty/undefined — produces nonsensical learning text
  if (!originalWorkName?.trim()) {
    console.warn('[Corrections] Brain learning skipped: empty original work name');
    return;
  }

  const newLearning = {
    text: `Smart Capture misidentified "${originalWorkName}" as the work in a photo — teacher corrected it to "${correctedWorkName || 'untagged'}". These works may look visually similar. Original area: ${originalArea || 'unknown'}, corrected area: ${correctedArea || 'unknown'}.`,
    category: 'vision_learnings',
    areas: [originalArea, correctedArea].filter(Boolean),
    learning_type: 'failure',
    timestamp: new Date().toISOString(),
  };

  // Function signature: append_guru_learning(learning_json TEXT, max_learnings INT DEFAULT 200)
  // See migrations/133_guru_tiers.sql. The function JSONB-parses learning_json internally.
  const payload = {
    learning_json: JSON.stringify(newLearning),
    max_learnings: 200,
  };

  try {
    const { error: brainError } = await supabase.rpc('append_guru_learning', payload);
    if (brainError) throw brainError;

    // Success — also process any queued retries opportunistically
    processRetryQueue(supabase);
  } catch (err) {
    console.error('[Corrections] Brain learning failed, queuing for retry:', err);
    const retryItem: RetryItem = { payload, attempts: 1, lastAttempt: Date.now() };
    LEARNING_RETRY_QUEUE.push(retryItem);

    // Also try manual fallback for this immediate failure
    try {
      const { data: brain } = await supabase
        .from('montree_guru_brain')
        .select('raw_learnings')
        .eq('id', 'global')
        .maybeSingle();

      const rawLearnings = (brain && Array.isArray(brain.raw_learnings))
        ? [...brain.raw_learnings, newLearning]
        : [newLearning];

      if (brain) {
        const { error: updateErr } = await supabase
          .from('montree_guru_brain')
          .update({ raw_learnings: rawLearnings, updated_at: new Date().toISOString() })
          .eq('id', 'global');
        if (!updateErr) {
          // Fallback succeeded — remove THIS specific item from retry queue
          const idx = LEARNING_RETRY_QUEUE.indexOf(retryItem);
          if (idx >= 0) LEARNING_RETRY_QUEUE.splice(idx, 1);
          return;
        }
      } else {
        const { error: insertErr } = await supabase
          .from('montree_guru_brain')
          .insert({ id: 'global', raw_learnings: rawLearnings });
        if (!insertErr) {
          const idx = LEARNING_RETRY_QUEUE.indexOf(retryItem);
          if (idx >= 0) LEARNING_RETRY_QUEUE.splice(idx, 1);
          return;
        }
      }
    } catch {
      // Both RPC and fallback failed — item is in retry queue
      console.error('[Corrections] Brain learning fallback also failed — will retry later');
    }
  }
}

// NOTE: Module-level array may be accessed concurrently by multiple requests during
// await points. Low probability under normal load (<10 corrections/sec). Acceptable
// trade-off vs adding a mutex for a best-effort retry queue.
async function processRetryQueue(supabase: ReturnType<typeof getSupabase>) {
  if (LEARNING_RETRY_QUEUE.length === 0) return;

  const now = Date.now();
  // Process items that are ready for retry (respect delay)
  for (let i = LEARNING_RETRY_QUEUE.length - 1; i >= 0; i--) {
    const item = LEARNING_RETRY_QUEUE[i];

    // Evict items that exceeded max attempts
    if (item.attempts >= MAX_RETRY_ATTEMPTS) {
      console.error('[Corrections] Brain learning permanently failed after 3 attempts:', JSON.stringify(item.payload));
      LEARNING_RETRY_QUEUE.splice(i, 1);
      continue;
    }

    // Skip items not yet ready for retry
    if (now - item.lastAttempt < RETRY_DELAY_MS) continue;

    try {
      const { error } = await supabase.rpc('append_guru_learning', item.payload);
      if (!error) {
        LEARNING_RETRY_QUEUE.splice(i, 1); // Success — remove
      } else {
        item.attempts++;
        item.lastAttempt = now;
      }
    } catch {
      item.attempts++;
      item.lastAttempt = now;
    }
  }
}
