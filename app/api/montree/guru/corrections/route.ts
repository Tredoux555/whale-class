import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { getSupabase } from '@/lib/supabase-client';
import { anthropic, HAIKU_MODEL } from '@/lib/ai/anthropic';
import { checkRateLimit } from '@/lib/rate-limiter';

// POST /api/montree/guru/corrections — Record a teacher correction for self-learning
// Called when teacher changes work_id in PhotoEditModal (correcting Smart Capture)
// Now also generates a visual description and stores it in visual memory for future prompts
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    // MEDIUM-003: Rate limit corrections — 30 per minute per IP
    const supabase = getSupabase();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateResult = await checkRateLimit(supabase, ip, '/api/montree/guru/corrections', 30, 60);
    if (!rateResult.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
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
      return NextResponse.json({ error: 'child_id is required' }, { status: 400 });
    }
    if (!media_id || typeof media_id !== 'string') {
      return NextResponse.json({ error: 'media_id is required' }, { status: 400 });
    }

    if (!original_work_id && !original_work_name) {
      return NextResponse.json({ error: 'Missing original identification' }, { status: 400 });
    }

    // Security: verify child belongs to school
    if (auth.schoolId) {
      const access = await verifyChildBelongsToSchool(child_id, auth.schoolId);
      if (!access.allowed) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // supabase already initialized above (rate limiter)
    const classroomId = auth.classroomId;

    if (!classroomId) {
      return NextResponse.json({ error: 'No classroom found' }, { status: 400 });
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
      console.log(`[Corrections] Confirmed correct: "${original_work_name}" (classroom ${classroomId})`);
      return NextResponse.json({ success: true, confirmed: true });
    }

    // ========================================================
    // CORRECTION PATH: Teacher says "this is wrong, it's actually X"
    // ========================================================

    // 1. Look up the original photo URL from cached interaction (needed for visual description)
    // Parallelize queries 1 and 2 (en + zh locales) to avoid sequential latency
    let photoUrl: string | null = null;
    if (media_id) {
      try {
        // Parallel queries for both en and zh locales
        const [enResult, zhResult] = await Promise.allSettled([
          supabase
            .from('montree_guru_interactions')
            .select('context_snapshot')
            .eq('question', `photo:${media_id}:en`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('montree_guru_interactions')
            .select('context_snapshot')
            .eq('question', `photo:${media_id}:zh`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        // Extract photo URL from whichever locale succeeded
        if (enResult.status === 'fulfilled' && enResult.value.data?.context_snapshot) {
          const snapshot = enResult.value.data.context_snapshot as Record<string, unknown>;
          photoUrl = typeof snapshot.photo_url === 'string' ? snapshot.photo_url : null;
        }

        if (!photoUrl && zhResult.status === 'fulfilled' && zhResult.value.data?.context_snapshot) {
          const snapshot = zhResult.value.data.context_snapshot as Record<string, unknown>;
          photoUrl = typeof snapshot.photo_url === 'string' ? snapshot.photo_url : null;
        }

        // Fallback: try to get photo URL directly from media table if both locales failed
        if (!photoUrl) {
          const { data: media } = await supabase
            .from('montree_media')
            .select('file_url')
            .eq('id', media_id)
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
      return NextResponse.json({ error: 'Failed to record correction' }, { status: 500 });
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

    // Step 5: Generate visual description from the photo and store in visual memory
    // Uses Haiku (cheap + fast) to describe what the material looks like
    // This is the KEY self-learning step — future Smart Capture calls will see this description
    if (corrected_work_name && photoUrl && anthropic) {
      parallelTasks.push(
        generateAndStoreVisualMemory({
          supabase,
          classroomId,
          workName: corrected_work_name,
          workKey: corrected_work_id || null,
          area: corrected_area || null,
          photoUrl,
          mediaId: media_id || null,
          isCustom: corrected_work_id ? String(corrected_work_id).startsWith('custom_') : false,
          source: 'correction',
        }).catch((err) => {
          console.error('[Corrections] Visual memory generation failed (non-fatal):', err);
        })
      );
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

    // Wait for all parallel tasks (none are fatal)
    await Promise.allSettled(parallelTasks);

    console.log(`[Corrections] Recorded: "${original_work_name}" → "${corrected_work_name}" (classroom ${classroomId})${photoUrl ? ' [visual memory generated]' : ''}`);

    return NextResponse.json({
      success: true,
      correction_id: correction?.id || null,
      visual_learning: !!photoUrl,
      ...(photoUrl ? {} : { warning: 'Correction saved but visual learning could not be applied (photo not found)' }),
    });
  } catch (error) {
    console.error('[Corrections] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ========================================================
// Visual Memory Generation
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
      console.error(`[VisualMemory] Haiku vision call timed out after 45s (${Date.now() - haikuStartMs}ms) — skipping visual memory generation`);
      return; // Non-fatal: correction still saved, only visual learning skipped
    }
    throw err;
  } finally {
    clearTimeout(apiTimeout);
  }

  // LOW-004: Log Haiku latency for monitoring degradation
  console.log(`[VisualMemory] Correction Haiku latency: ${Date.now() - haikuStartMs}ms for "${workName}"`);

  // Extract text response
  let visualDescription = '';
  for (const block of message.content) {
    if (block.type === 'text') {
      visualDescription = block.text.trim();
      break;
    }
  }

  if (!visualDescription || visualDescription.length < 10) {
    console.warn(`[VisualMemory] Haiku returned empty/short description for "${workName}"`);
    return;
  }

  // Cap at 500 chars to keep prompt injection reasonable
  visualDescription = visualDescription.slice(0, 500);

  // Upsert into visual memory — if a description already exists for this work+classroom,
  // update it (newer corrections have better photos/context)
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
      description_confidence: source === 'correction' ? 0.9 : 0.7, // corrections are higher quality
      updated_at: new Date().toISOString(),
    }, { onConflict: 'classroom_id,work_name' });

  if (upsertError) {
    console.error('[VisualMemory] Upsert error:', upsertError);
  } else {
    console.log(`[VisualMemory] Stored description for "${workName}" in classroom ${classroomId} (source: ${source})`);
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
      .catch(() => {}); // Non-fatal
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

  const payload = { p_learning: newLearning };

  try {
    const { error: brainError } = await supabase.rpc('append_brain_learning', payload);
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
      const { error } = await supabase.rpc('append_brain_learning', item.payload);
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
