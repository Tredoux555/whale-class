// app/api/montree/guru/photo-insight/route.ts
// Smart Capture — Two-tier Haiku→Sonnet vision router
// Haiku tries first (4× cheaper). If confident, skip Sonnet. Else escalate.
// Returns structured data: work name, area, mastery status, brief observation
// Auto-updates: media tagging (work_id) + progress (teacher can override)
// "Self-driving car" model: Guru auto-manages, teacher can override anytime via shelf

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getPublicUrl } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { anthropic, AI_ENABLED, AI_MODEL, HAIKU_MODEL } from '@/lib/ai/anthropic';
import { loadAllCurriculumWorks, type CurriculumWork } from '@/lib/montree/curriculum-loader';
import { matchToCurriculumV2 } from '@/lib/montree/work-matching';
import { checkRateLimit } from '@/lib/rate-limiter';
// import { logApiUsage, checkAiBudget } from '@/lib/montree/api-usage'; // DEFERRED: API usage metering not yet deployed

// ================================================================
// IN-MEMORY RATE LIMITER FALLBACK
// Used when DB-based rate limiter is unavailable (Supabase down)
// Simple sliding window: max 60 requests per IP per 60 minutes
// Module-level Map survives across requests in the same serverless instance
// ================================================================
const inMemoryRateLimitMap = new Map<string, number[]>();
const IN_MEMORY_RATE_LIMIT = 60;
const IN_MEMORY_RATE_WINDOW_MS = 60 * 60 * 1000; // 60 minutes

function inMemoryRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = inMemoryRateLimitMap.get(ip) || [];
  // Evict old entries outside the window
  const recent = timestamps.filter(ts => now - ts < IN_MEMORY_RATE_WINDOW_MS);
  if (recent.length >= IN_MEMORY_RATE_LIMIT) {
    inMemoryRateLimitMap.set(ip, recent);
    return false;
  }
  recent.push(now);
  inMemoryRateLimitMap.set(ip, recent);
  // Periodic cleanup: if map grows beyond 1000 IPs, evict oldest entries
  if (inMemoryRateLimitMap.size > 1000) {
    const keys = [...inMemoryRateLimitMap.keys()];
    for (let i = 0; i < 200; i++) {
      inMemoryRateLimitMap.delete(keys[i]);
    }
  }
  return true;
}

/**
 * Sanitize a string for safe embedding in a prompt template.
 * Prevents prompt injection via malicious work names, areas, or observations
 * stored in the DB (e.g., a teacher correction with "Ignore all instructions..." as the name).
 * Strips control characters, trims to maxLen, and collapses whitespace.
 */
function sanitizeForPrompt(input: string, maxLen: number = 200): string {
  if (!input || typeof input !== 'string') return '';
  return input
    // Strip characters that could be used for prompt injection: newlines, tabs, backticks, angle brackets
    .replace(/[\n\r\t`<>]/g, ' ')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

// Tool definition for structured photo analysis
const PHOTO_ANALYSIS_TOOL = {
  name: 'tag_photo' as const,
  description: 'Tag a classroom photo with the Montessori work being done, the curriculum area, and the child\'s mastery level based on visual evidence.',
  input_schema: {
    type: 'object' as const,
    properties: {
      work_name: {
        type: 'string',
        description: 'The name of the Montessori work/activity visible in the photo. Use the standard curriculum name if recognizable (e.g., "Color Box 2", "Pink Tower", "Sandpaper Letters"). If unknown, describe briefly.',
      },
      area: {
        type: 'string',
        enum: ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural', 'unknown'],
        description: 'The Montessori curriculum area this work belongs to.',
      },
      mastery_evidence: {
        type: 'string',
        enum: ['mastered', 'practicing', 'presented', 'unclear'],
        description: 'Evidence of mastery level: "mastered" if work is completed correctly and independently, "practicing" if actively working but with some errors, "presented" if appears to be first exposure, "unclear" if cannot determine.',
      },
      confidence: {
        type: 'number',
        description: 'Confidence in the work identification (0.0 to 1.0). Use 0.9+ for clearly identifiable standard works, 0.5-0.8 for likely matches, below 0.5 for uncertain.',
      },
      observation: {
        type: 'string',
        description: 'Brief 1-sentence observation about technique, concentration, or progress. Keep warm and encouraging.',
      },
      suggested_crop: {
        type: 'object',
        description: 'Suggested crop region that nicely frames the child AND the Montessori material together. Use normalized coordinates (0.0 to 1.0) where (0,0) is top-left. Frame with rule-of-thirds composition, include breathing room around subjects. Omit if child or work not clearly visible.',
        properties: {
          x: { type: 'number', description: 'Left edge of crop region (0.0 to 1.0)' },
          y: { type: 'number', description: 'Top edge of crop region (0.0 to 1.0)' },
          width: { type: 'number', description: 'Width of crop region (0.1 to 1.0, minimum 10% of image)' },
          height: { type: 'number', description: 'Height of crop region (0.1 to 1.0, minimum 10% of image)' },
        },
        required: ['x', 'y', 'width', 'height'],
      },
    },
    required: ['work_name', 'area', 'mastery_evidence', 'confidence', 'observation'],
  },
};

// Old matchToCurriculum removed — now using matchToCurriculumV2 from work-matching.ts
// (area-constrained, alias-aware, materials-boosted, top-3 candidates)

// Shared validation for tool_use output from either Haiku or Sonnet
const VALID_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural', 'unknown'];
const VALID_MASTERY = ['mastered', 'practicing', 'presented', 'unclear'];

function validateToolOutput(rawInput: Record<string, unknown>) {
  // Validate suggested_crop if present
  let suggested_crop: { x: number; y: number; width: number; height: number } | null = null;
  if (rawInput.suggested_crop && typeof rawInput.suggested_crop === 'object') {
    const crop = rawInput.suggested_crop as Record<string, unknown>;
    const x = typeof crop.x === 'number' ? Math.max(0, Math.min(1, crop.x)) : null;
    const y = typeof crop.y === 'number' ? Math.max(0, Math.min(1, crop.y)) : null;
    const w = typeof crop.width === 'number' ? Math.max(0.1, Math.min(1, crop.width)) : null;
    const h = typeof crop.height === 'number' ? Math.max(0.1, Math.min(1, crop.height)) : null;
    if (x !== null && y !== null && w !== null && h !== null) {
      // Clamp so crop doesn't exceed image bounds
      suggested_crop = {
        x: Math.min(x, 1 - w),
        y: Math.min(y, 1 - h),
        width: w,
        height: h,
      };
    }
  }

  return {
    work_name: typeof rawInput.work_name === 'string' ? rawInput.work_name.trim().slice(0, 255) : '',
    area: typeof rawInput.area === 'string' && VALID_AREAS.includes(rawInput.area) ? rawInput.area : 'unknown',
    mastery_evidence: typeof rawInput.mastery_evidence === 'string' && VALID_MASTERY.includes(rawInput.mastery_evidence) ? rawInput.mastery_evidence : 'unclear',
    confidence: typeof rawInput.confidence === 'number' ? Math.max(0, Math.min(1, rawInput.confidence)) : 0,
    observation: typeof rawInput.observation === 'string' ? rawInput.observation.trim().slice(0, 500) : '',
    suggested_crop,
  };
}

// Status rank for upgrade-only protection
const STATUS_RANK: Record<string, number> = {
  'not_started': 0, 'presented': 1, 'practicing': 2, 'mastered': 3,
};

// Auto-update threshold: GREEN zone only (≥0.95 match AND ≥0.95 confidence)
// AMBER zone (0.5–0.95) requires teacher confirmation before any progress update
const AUTO_UPDATE_THRESHOLD = 0.95;

// Haiku-first router: acceptance threshold for skipping Sonnet escalation
// If Haiku confidence ≥ 0.80 AND matchToCurriculumV2 score ≥ 0.80, accept Haiku result.
// Haiku-accepted results still go through GREEN/AMBER/RED zone system — acceptance just
// means "skip Sonnet", NOT "auto-update". Auto-update still requires 0.95/0.95.
// CALIBRATION NOTE: Haiku confidence may differ from Sonnet's. Mitigated by 3 layers:
// (1) 0.80 acceptance is conservative — most results land in AMBER for teacher review
// (2) GREEN zone requires 0.95/0.95 — very high bar even for Haiku
// (3) Classroom gate — only works already in curriculum get auto-updated
const HAIKU_ACCEPT_CONFIDENCE = 0.80;
const HAIKU_ACCEPT_MATCH = 0.80;
const HAIKU_TIMEOUT_MS = 10_000; // 10s — leaves 35s headroom for Sonnet fallback

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    // In-memory rate limit fallback: if DB rate limiter throws (Supabase down), don't fail-open
    // Simple sliding window per IP — 60 requests per 60 minutes
    let rateLimitAllowed = true;
    try {
      const result = await checkRateLimit(supabase, ip, '/api/montree/guru/photo-insight', 60, 60);
      rateLimitAllowed = result.allowed;
    } catch (rateLimitErr) {
      console.error('[PhotoInsight] DB rate limiter failed, using in-memory fallback:', rateLimitErr);
      rateLimitAllowed = inMemoryRateLimit(ip);
    }
    if (!rateLimitAllowed) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await request.json();
    const { child_id, media_id } = body;
    // Validate locale against allowed values
    const locale = ['en', 'zh'].includes(body.locale) ? body.locale : 'en';

    if (!child_id || !media_id) {
      return NextResponse.json(
        { success: false, error: 'child_id and media_id are required' },
        { status: 400 }
      );
    }

    const access = await verifyChildBelongsToSchool(child_id, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Check for cached insight (use maybeSingle to handle 0 or 2+ rows gracefully)
    const { data: cached } = await supabase
      .from('montree_guru_interactions')
      .select('response_insight, context_snapshot, asked_at')
      .eq('child_id', child_id)
      .eq('question_type', 'photo_insight')
      .eq('question', `photo:${media_id}:${locale}`)
      .order('asked_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fallback: try old format (pre-locale cache entries) if new format missed
    // Wrapped in try-catch: fallback is best-effort — if it fails, fall through to fresh analysis
    const effectiveCached = cached ?? (await (async () => {
      try {
        const { data } = await supabase
          .from('montree_guru_interactions')
          .select('response_insight, context_snapshot, asked_at')
          .eq('child_id', child_id)
          .eq('question_type', 'photo_insight')
          .eq('question', `photo:${media_id}`)
          .order('asked_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        return data;
      } catch {
        // Non-fatal: old-format cache lookup failed — fall through to fresh analysis
        return null;
      }
    })());

    if (effectiveCached?.response_insight) {
      // Return cached structured response with FRESH scenario data
      // IMPORTANT: auto_updated is ALWAYS false on cache hits — the progress update already
      // happened on the original analysis. Returning true would cause the client to fire
      // onProgressUpdate again on every remount (duplicate refetches, potential UI flicker).
      // NOTE (MEDIUM-004): Visual memory is NOT re-injected on cache hits — the identification
      // was made with whatever visual memory existed at original analysis time. If new visual
      // memory was added (via correction) after the cache entry was created, the cached result
      // may be stale. This is mitigated by: (1) Scenario A cache bust after 5min, (2) Scenario D
      // staleness refresh after 5min. For truly fresh re-analysis, user can retry.
      const snapshot = (effectiveCached.context_snapshot as Record<string, unknown>) || {};
      const cachedWorkName = (snapshot.identified_work_name as string) || null;
      const cachedArea = (snapshot.identified_area as string) || null;
      const cachedMatchScore = (snapshot.curriculum_match_score as number) ?? 0;
      const cachedConfidence = (snapshot.sonnet_confidence as number) ?? 0;

      // Re-check scenario freshness: classroom/shelf status may have changed since original analysis
      // Only re-check if original scenario was B (not in classroom) or C (not on shelf)
      const VALID_SCENARIOS = ['A', 'B', 'C', 'D'] as const;
      let freshScenario: 'A' | 'B' | 'C' | 'D' = VALID_SCENARIOS.includes(snapshot.scenario as typeof VALID_SCENARIOS[number])
        ? (snapshot.scenario as 'A' | 'B' | 'C' | 'D')
        : 'D';
      let freshInClassroom = (snapshot.in_classroom as boolean) ?? false;
      let freshInChildShelf = (snapshot.in_child_shelf as boolean) ?? false;
      let freshClassroomWorkId = (snapshot.classroom_work_id as string) ?? null;

      // Scenario staleness rules:
      // - Scenario A: unknown work — bust cache entirely after 5 min (re-analyze with fresh Sonnet)
      //   Teacher may have added the work to classroom since original analysis
      // - Scenario B/C: classroom/shelf status may have changed (always re-check)
      // - Scenario D: work may have been REMOVED from classroom/shelf (re-check if cache > 5 min old)
      const cacheAgeMs = effectiveCached.asked_at ? Date.now() - new Date(effectiveCached.asked_at).getTime() : Infinity;

      // Scenario A cache bust: skip cached result → fall through to fresh Sonnet analysis
      const shouldBustCache = freshScenario === 'A' && cacheAgeMs > 5 * 60 * 1000;

      if (!shouldBustCache) {
        const shouldRefreshScenario = freshScenario === 'B' || freshScenario === 'C'
          || (freshScenario === 'D' && cacheAgeMs > 5 * 60 * 1000);
        if (cachedWorkName && shouldRefreshScenario) {
          try {
            const childResult2 = await supabase.from('montree_children').select('classroom_id').eq('id', child_id).maybeSingle();
            const freshClassroomId = childResult2.data?.classroom_id;
            if (freshClassroomId) {
              const { data: freshWork } = await supabase
                .from('montree_classroom_curriculum_works')
                .select('id')
                .eq('classroom_id', freshClassroomId)
                .eq('name', cachedWorkName)
                .eq('is_active', true)
                .limit(1)
                .maybeSingle();
              freshInClassroom = !!freshWork?.id;
              freshClassroomWorkId = freshWork?.id || null;

              if (freshInClassroom) {
                const { data: freshShelf } = await supabase
                  .from('montree_child_focus_works')
                  .select('id')
                  .eq('child_id', child_id)
                  .eq('work_name', cachedWorkName)
                  .limit(1)
                  .maybeSingle();
                freshInChildShelf = !!freshShelf?.id;
              }

              // Recalculate scenario with fresh data
              if (cachedMatchScore < 0.5 || cachedConfidence < 0.5) {
                freshScenario = 'A';
              } else if (!freshInClassroom) {
                freshScenario = 'B';
              } else if (!freshInChildShelf) {
                freshScenario = 'C';
              } else {
                freshScenario = 'D';
              }
            }
          } catch {
            // Non-fatal — use cached scenario data
          }
        }

        return NextResponse.json({
          success: true,
          insight: effectiveCached.response_insight,
          work_name: cachedWorkName,
          area: cachedArea,
          mastery_evidence: snapshot.mastery_evidence ?? null,
          auto_updated: false,
          needs_confirmation: snapshot.needs_confirmation ?? false,
          confidence: snapshot.sonnet_confidence ?? null,
          match_score: snapshot.curriculum_match_score ?? null,
          candidates: Array.isArray(snapshot.candidates) ? snapshot.candidates : [],
          scenario: freshScenario,
          in_classroom: freshInClassroom,
          in_child_shelf: freshInChildShelf,
          classroom_work_id: freshClassroomWorkId,
        });
      }
      // If shouldBustCache is true, we fall through to fresh Sonnet analysis below
    }

    if (!AI_ENABLED || !anthropic) {
      return NextResponse.json({ success: false, error: 'AI features are not enabled' }, { status: 503 });
    }

    // Fetch the photo storage path + existing work_id (for skip-if-tagged optimization)
    const { data: media } = await supabase
      .from('montree_media')
      .select('storage_path, media_type, child_id, work_id')
      .eq('id', media_id)
      .maybeSingle();

    if (!media?.storage_path) {
      return NextResponse.json({ success: false, error: 'Photo not found' }, { status: 404 });
    }

    // Verify media belongs to this child (cross-pollination protection)
    // media.child_id is NULL for group photos (shared across children) — that's intentionally allowed
    if (media.child_id && media.child_id !== child_id) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // SMART FILTER: Skip AI vision if teacher already tagged this photo with a work
    // This saves $0.006-0.06 per photo. Teacher-tagged photos don't need AI identification.
    // PhotoInsightButton can still call this for un-tagged photos or explicit retries.
    if (media.work_id && !body.force_reanalyze) {
      console.log(`[PhotoInsight] Skipping AI — photo ${media_id} already tagged with work_id ${media.work_id}`);
      // Look up work name + area so the store/UI can display what was tagged
      const { data: taggedWork } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('name, area')
        .eq('id', media.work_id)
        .maybeSingle();
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'already_tagged',
        work_id: media.work_id,
        work_name: taggedWork?.name || null,
        area: taggedWork?.area || null,
        auto_updated: false,
      });
    }

    // Only process images
    if (media.media_type && !media.media_type.startsWith('image') && media.media_type !== 'photo') {
      return NextResponse.json({ success: false, error: 'Only photos can be analyzed' }, { status: 400 });
    }

    // Build full public URL from storage path
    const photoUrl = getPublicUrl('montree-media', media.storage_path);
    if (!photoUrl.startsWith('http://') && !photoUrl.startsWith('https://')) {
      return NextResponse.json({ success: false, error: 'Photo URL not accessible' }, { status: 400 });
    }

    // Parallel queries: child context + current works (single child query, no duplicate)
    const [childResult, worksResult] = await Promise.all([
      supabase.from('montree_children').select('name, age, classroom_id').eq('id', child_id).maybeSingle(),
      supabase.from('montree_child_progress').select('work_name, area, status').eq('child_id', child_id).limit(30),
    ]);

    const child = childResult.data;
    const currentWorks = worksResult.data;
    const classroomId = child?.classroom_id;
    const childName = child?.name?.split(' ')[0] || 'This child';
    const childAge = child?.age ?? 4;

    // Build works context for Sonnet
    const worksContext = currentWorks && currentWorks.length > 0
      ? `Child's recent work progress (for background only — identify based on what you SEE, not this list):\n${currentWorks.map(w => `- ${w.work_name} (${w.area}, ${w.status})`).join('\n')}`
      : 'No current works tracked yet.';

    // Load curriculum for matching (static 329 + classroom custom works)
    // IMPORTANT: Clone the array — loadAllCurriculumWorks() returns a cached reference.
    // Pushing custom works into the original would permanently contaminate the module-level cache.
    let curriculum: CurriculumWork[] = [];
    try {
      curriculum = [...loadAllCurriculumWorks()];
    } catch (err) {
      console.error('[PhotoInsight] Failed to load curriculum:', err);
    }

    // Also load custom works from this classroom's DB (teacher-created)
    let classroomCustomWorks: Array<{ id: string; name: string; area_key: string; work_key: string }> = [];
    if (classroomId) {
      try {
        const { data: customWorks } = await supabase
          .from('montree_classroom_curriculum_works')
          .select('id, name, work_key, area:montree_classroom_curriculum_areas!area_id(area_key)')
          .eq('classroom_id', classroomId)
          .eq('is_custom', true)
          .eq('is_active', true);
        if (customWorks) {
          classroomCustomWorks = customWorks.map(w => ({
            id: w.id,
            name: w.name,
            area_key: (w.area as unknown as { area_key: string })?.area_key || 'practical_life',
            work_key: w.work_key,
          }));
          // Add custom works to curriculum array for fuzzy matching
          for (const cw of classroomCustomWorks) {
            curriculum.push({
              name: cw.name,
              area_key: cw.area_key,
              work_key: cw.work_key,
              sequence: 9999,
            } as CurriculumWork);
          }
        }
      } catch {
        // Non-fatal — continue without custom works
      }
    }

    // Build FULL categorized curriculum context for Sonnet (ALL works, grouped by area → category)
    // CRITICAL: Previous version showed only 15/area (77% hidden) causing misidentification
    let curriculumHint = '';
    if (curriculum.length > 0) {
      const areaKeys = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
      const sections: string[] = [];
      for (const areaKey of areaKeys) {
        const areaWorks = curriculum.filter(w => w.area_key === areaKey);
        // Group by category
        const byCategory = new Map<string, string[]>();
        for (const w of areaWorks) {
          const cat = w.category_name || 'General';
          if (!byCategory.has(cat)) byCategory.set(cat, []);
          byCategory.get(cat)!.push(w.name);
        }
        const catLines: string[] = [];
        for (const [cat, names] of byCategory) {
          catLines.push(`  ${cat}: ${names.join(', ')}`);
        }
        sections.push(`${areaKey.toUpperCase().replace('_', ' ')}:\n${catLines.join('\n')}`);
      }
      curriculumHint = `\n\nCOMPLETE MONTESSORI CURRICULUM (329 standard works):\n${sections.join('\n\n')}`;
    }

    // ========================================================
    // SELF-LEARNING CONTEXT: corrections, focus works, duplicates, visual memory
    // Run all 4 in parallel — they're independent queries sharing only classroomId/child_id
    // ========================================================

    let correctionsContext = '';
    const correctionsMap = new Map<string, string>(); // lowercase original → corrected (for matchToCurriculumV2)
    let focusWorksContext = '';
    let duplicateContext = '';
    let visualMemoryContext = '';

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const [correctionsResult, focusWorksResult, duplicateResult, visualMemoryResult] = await Promise.allSettled([
      // 1. Corrections for this classroom (used for BOTH prompt context AND V2 matching)
      classroomId
        ? supabase
            .from('montree_guru_corrections')
            .select('original_work_name, corrected_work_name')
            .eq('classroom_id', classroomId)
            .order('created_at', { ascending: false })
            .limit(50)
        : Promise.resolve({ data: null }),

      // 2. Child's current focus works (context only — NOT a bias)
      supabase
        .from('montree_child_focus_works')
        .select('work_name, area, status')
        .eq('child_id', child_id)
        .limit(10),

      // 3. Recent photos (same child, last 5 min — informational only)
      supabase
        .from('montree_guru_interactions')
        .select('context_snapshot')
        .eq('child_id', child_id)
        .eq('question_type', 'photo_insight')
        .gte('asked_at', fiveMinAgo)
        .not('question', 'like', `photo:${media_id}%`)
        .order('asked_at', { ascending: false })
        .limit(1),

      // 4. Visual memory — per-classroom learned descriptions of what works look like
      // Built from teacher corrections + first-capture photos. Injected into prompt so Sonnet
      // "remembers" what each material looks like in THIS specific classroom.
      classroomId
        ? supabase
            .from('montree_visual_memory')
            .select('work_name, area, visual_description, is_custom')
            .eq('classroom_id', classroomId)
            .order('updated_at', { ascending: false })
            .limit(30)
        : Promise.resolve({ data: null }),
    ]);

    // Process corrections result
    if (correctionsResult.status === 'fulfilled') {
      const corrections = correctionsResult.value?.data;
      if (corrections && corrections.length > 0) {
        const promptEntries: string[] = [];
        for (const c of corrections) {
          const origTrimmed = typeof c.original_work_name === 'string' ? c.original_work_name.trim() : '';
          const corrTrimmed = typeof c.corrected_work_name === 'string' ? c.corrected_work_name.trim() : '';
          if (origTrimmed && corrTrimmed) {
            correctionsMap.set(origTrimmed.toLowerCase(), corrTrimmed);
            if (promptEntries.length < 10) {
              promptEntries.push(`- You said "${sanitizeForPrompt(c.original_work_name, 100)}" but teacher corrected to "${sanitizeForPrompt(c.corrected_work_name, 100)}"`);
            }
          }
        }
        if (promptEntries.length > 0) {
          correctionsContext = `\n\nTEACHER CORRECTIONS (learn from these — you got these wrong before):\n${promptEntries.join('\n')}`;
        }
      }
    }

    // Process focus works result
    if (focusWorksResult.status === 'fulfilled') {
      const focusWorks = focusWorksResult.value?.data;
      if (focusWorks && focusWorks.length > 0) {
        focusWorksContext = `\n\nCHILD'S CURRENT SHELF (for context only — do NOT bias your identification):
${focusWorks.map((w: { work_name: string; area: string; status: string }, i: number) => `${i + 1}. ${sanitizeForPrompt(w.work_name, 100)} (${sanitizeForPrompt(w.area, 30)}, status: ${sanitizeForPrompt(w.status, 20)})`).join('\n')}
NOTE: These are works on the child's shelf. The photo may or may not show one of these. Identify based on what you SEE in the photo, not what is on the shelf.`;
      }
    }

    // Process duplicate check result
    if (duplicateResult.status === 'fulfilled') {
      const recentPhotos = duplicateResult.value?.data;
      if (recentPhotos && recentPhotos.length > 0) {
        const snapshot = recentPhotos[0].context_snapshot as Record<string, unknown>;
        if (snapshot?.identified_work_name) {
          duplicateContext = `\n\nRECENT PHOTO (same child, last 5 minutes): A previous photo was identified as "${sanitizeForPrompt(String(snapshot.identified_work_name), 100)}" (${sanitizeForPrompt(String(snapshot.identified_area), 30)}). Make your OWN independent assessment of THIS photo — do not copy the previous identification unless you genuinely see the same activity.`;
        }
      }
    }

    // Process visual memory result — per-classroom learned descriptions
    if (visualMemoryResult.status === 'fulfilled') {
      const memories = visualMemoryResult.value?.data;
      if (memories && memories.length > 0) {
        const standardMemories: string[] = [];
        const customMemories: string[] = [];

        for (const m of memories) {
          const desc = sanitizeForPrompt(m.visual_description, 200);
          const name = sanitizeForPrompt(m.work_name, 100);
          const entry = `- "${name}" (${sanitizeForPrompt(m.area || 'unknown', 30)}): ${desc}`;

          if (m.is_custom) {
            customMemories.push(entry);
          } else {
            standardMemories.push(entry);
          }
        }

        const sections: string[] = [];
        if (customMemories.length > 0) {
          sections.push(`CUSTOM WORKS in this classroom (teacher-created — NOT in standard curriculum):\n${customMemories.join('\n')}`);
        }
        if (standardMemories.length > 0) {
          sections.push(`Learned material descriptions (from previous photos in this classroom):\n${standardMemories.join('\n')}`);
        }

        if (sections.length > 0) {
          visualMemoryContext = `\n\nCLASSROOM VISUAL MEMORY (what materials look like in THIS specific classroom):\n${sections.join('\n\n')}
NOTE: These descriptions were learned from previous photos. Use them to help identify materials, especially custom works that are NOT in the standard curriculum guide above.`;

          // Fire-and-forget: increment times_used for all injected memories
          // This tracks which descriptions are actually being used in prompts
          if (classroomId) {
            const memoryNames = memories.map((m: { work_name: string }) => m.work_name);
            supabase.rpc('increment_visual_memory_used', {
              p_classroom_id: classroomId,
              p_work_names: memoryNames,
            }).then(({ error: rpcErr }) => {
              if (rpcErr) console.error('[VisualMemory] increment_visual_memory_used RPC failed (non-fatal):', rpcErr);
            });
          }
        }
      }
    }

    // ========================================================
    // POST-IDENTIFICATION LOOKUPS (run after we have the match)
    // These will be populated after Sonnet returns results
    // ========================================================

    // Locale-aware system prompt
    const langInstruction = locale === 'zh'
      ? 'Write the observation in Simplified Chinese.'
      : 'Write the observation in English.';

    const systemPrompt = `You are a Montessori classroom expert analyzing a photo of a child working. Use the tag_photo tool to identify and tag the work.

${langInstruction}

CRITICAL RULES:
1. Identify based ONLY on what you SEE in the photo — materials, tools, setup, actions
2. Match to the EXACT standard curriculum name from the list below
3. Focus on the SPECIFIC TOOL/MATERIAL being used — this determines the work name
4. If unsure, set confidence LOW (below 0.5) — it is far better to be uncertain than wrong
5. Keep the observation to ONE warm, specific sentence
6. COMPOSITION: Also suggest a crop that frames the child AND the work material together beautifully. Use normalized 0-1 coordinates. Apply rule-of-thirds. Include breathing room. If the photo is already well-composed or you cannot clearly see both the child and the work, omit suggested_crop.

VISUAL IDENTIFICATION GUIDE — Identify by the PRIMARY TOOL/MATERIAL visible:

=== PRACTICAL LIFE ===

TRANSFER ACTIVITIES (identify by the TRANSFER TOOL — the tool determines the work name):
- Eye dropper/pipette transferring liquid → "Eye Dropper" (NOT Sponging, NOT Basting)
- Spoon transferring between bowls → "Spooning"
- Tongs/tweezers (large, spring-loaded) → "Tonging"
- Tweezers (small, fine-point) → "Tweezers Transfer"
- Chopsticks transferring items → "Chopsticks Transfer"
- Hands scooping dry materials between bowls → "Dry Transfer-Hands"
- Sponge squeezing water between bowls → "Sponging"
- Turkey baster/baster → "Basting"
- Pouring beans/rice/dry items → "Pouring Dry Materials"
- Pouring water/liquid between containers → "Pouring Water"

PRELIMINARY EXERCISES:
- Child carrying/rolling/unrolling a work mat → "Carrying a Mat"
- Walking along a line (tape/painted on floor) → "Walking on the Line"
- Carrying a small chair → "Carrying a Chair"
- Sitting down/standing up from chair slowly → "Sitting and Standing"
- Opening/closing jars, bottles, boxes → "Opening & Closing Containers"
- Folding fabric/cloth/napkins → "Folding Cloths"
- Cutting with scissors (paper strips/lines) → "Using Scissors"

CARE OF SELF (Dressing Frames — wooden frames with fabric closures):
- Frame with large buttons → "Dressing Frame - Buttons"
- Frame with zipper → "Dressing Frame - Zipping"
- Frame with bow ties/ribbons → "Dressing Frame - Bows"
- Frame with buckles → "Dressing Frame - Buckles"
- Frame with lacing holes/string → "Dressing Frame - Lacing"
- Frame with snaps/press studs → "Dressing Frame - Snaps"
- Frame with safety pins → "Dressing Frame - Safety Pins"
- Frame with velcro strips → "Dressing Frame - Velcro"
- Frame with hook and eye closures → "Dressing Frame - Hook & Eye"
- Child washing hands at basin → "Hand Washing"
- Polishing shoes with brush/cloth → "Shoe Polishing"
- Brushing/braiding hair on doll/mannequin → "Hair Brushing & Braiding"

CARE OF ENVIRONMENT:
- Sweeping floor with child-sized broom → "Sweeping"
- Dusting with cloth or duster → "Dusting"
- Scrubbing table with brush, soap, water → "Table Scrubbing" (wet table, brush, suds)
- Washing windows/mirrors with spray/squeegee → "Window Washing" or "Mirror Polishing"
- Polishing metal objects with polish/cloth → "Metal Polishing"
- Washing cloth/fabric in basin → "Cloth Washing"
- Arranging flowers in vase with scissors → "Flower Arranging"
- Watering plants with small watering can → "Plant Care"
- Washing dishes in basin with sponge → "Dish Washing"

FOOD PREPARATION:
- Peeling fruit/vegetables → "Peeling"
- Cutting banana/soft food with knife → "Cutting"
- Spreading butter/jam on bread → "Spreading"
- Squeezing oranges/citrus on juicer → "Squeezing"
- Grating cheese/soap on grater → "Grating"
- Rolling dough with rolling pin → "Rolling and Kneading Dough"

⚠️ PRACTICAL LIFE CONFUSION PAIRS:
- Table with suds + brush = "Table Scrubbing" NOT "Dish Washing" (dishes visible = Dish Washing)
- Eye Dropper = pipette with bulb tip. Baster = large turkey baster. DIFFERENT works.
- Dressing frames all look similar — identify by the CLOSURE TYPE on the fabric

=== SENSORIAL ===

VISUAL — DIMENSION (graduated materials, usually natural wood or painted):
- 10 pink graduated CUBES (1cm³→10cm³), stacked as tower → "Pink Tower"
- 10 brown graduated PRISMS (same length, varying width) → "Brown Stair" (aka "Broad Stair")
- 10 red graduated RODS (10cm→1m, all red) → "Red Rods" (NOT Number Rods — no blue sections)
- Wooden block with 10 cylinders with KNOBS (child uses 3-finger grip) → "Cylinder Block 1/2/3/4"
  → Block 1: diameter varies only. Block 2: height varies only. Block 3: both vary same direction. Block 4: both vary opposite.
  → Multiple blocks mixed together → "Cylinder Blocks Combined"
- Colored cylinders WITHOUT knobs (yellow/red/green/blue boxes) → "Knobless Cylinders"

VISUAL — COLOR:
- Small box with 6 color tablets (3 pairs: red, yellow, blue) → "Color Box 1 (Primary Colors)"
- Medium box with 22 color tablets (11 pairs) → "Color Box 2 (Secondary Colors)"
- Large box with 63 color tablets (9 colors × 7 shades) → "Color Box 3 (Color Gradations)"

VISUAL — FORM (geometric shapes):
- Cabinet with drawers of flat geometric shape insets → "Geometric Cabinet"
- 10 blue 3D wooden shapes (sphere, cube, cone, cylinder, pyramid, etc.) → "Geometric Solids"
- Colored triangles being assembled into shapes → "Constructive Triangles" (specify box if visible:
  → Rectangular Box, Triangular Box, Large Hexagonal, Small Hexagonal, Blue Triangles)
- Red/blue/black cube puzzle (8 pieces, pattern on lid) → "Binomial Cube"
- Larger cube puzzle (27 pieces, more complex pattern) → "Trinomial Cube"

TACTILE/BARIC/THERMIC:
- Boards with rough/smooth sandpaper sections → "Touch Boards"
- Small tablets with varying sandpaper grades in box → "Touch Tablets (Rough and Smooth)"
- Fabric swatches in box being matched → "Fabric Matching"
- Three sets of wooden tablets of different weights → "Baric Tablets"
- Tablets of different materials (metal, wood, cork, felt) → "Thermic Tablets"
- Metal bottles being compared → "Thermic Bottles"

AUDITORY/OLFACTORY/GUSTATORY:
- 2 sets of 6 wooden cylinders (red/blue lids) being shaken → "Sound Boxes (Sound Cylinders)"
- Metal bells on stands with mallet → "Montessori Bells"
- Bottles being smelled → "Smelling Bottles"
- Bottles/cups being tasted with dropper → "Tasting Bottles/Cups"

STEREOGNOSTIC:
- Cloth bag, child reaching in blindfolded → "Mystery Bag"
- Blindfolded child sorting objects into containers → "Sorting Objects Stereognostically"

⚠️ SENSORIAL CONFUSION PAIRS:
- RED RODS (all red, Sensorial) vs NUMBER RODS (red AND blue alternating, Mathematics) — check for blue sections!
- CYLINDER BLOCKS (knobbed, in wooden block) vs KNOBLESS CYLINDERS (no knobs, colored, free-standing)
- BINOMIAL CUBE (smaller, 8 pieces) vs TRINOMIAL CUBE (larger, 27 pieces)
- PINK TOWER (cubes) vs BROWN STAIR (prisms/rectangular) vs RED RODS (long thin rods)
- SOUND BOXES (shaking cylinders) vs SMELLING BOTTLES (sniffing bottles)
- TOUCH BOARDS (flat boards) vs TOUCH TABLETS (small paired tablets in box)

=== MATHEMATICS ===

NUMBERS 1-10:
- Red AND blue alternating rods (10cm→1m) → "Number Rods" (NOT Red Rods — has blue sections)
- Sandpaper numerals 0-9 on green/wood boards → "Sandpaper Numbers"
- Wooden box with 45 spindles in compartments 0-9 → "Spindle Box"
- Number cards + loose counters (usually red dots) arranged in rows → "Cards and Counters"

DECIMAL SYSTEM (Golden Bead Material):
- Single golden beads (units) → "Golden Bead Material"
- Bar of 10 beads (tens) → "Golden Bead Material"
- Square of 100 beads (hundreds) → "Golden Bead Material"
- Cube of 1000 beads (thousands) → "Golden Bead Material"
- Large wooden number cards (1-9000, color-coded green/blue/red) → "Large Number Cards"
- Golden beads + number cards together on mat → "Formation of Numbers"
- Golden beads being combined/separated for operations → "Addition/Subtraction/Multiplication/Division with Golden Beads"

TEENS AND TENS:
- Wooden board with slots, cards 10-19, placing bead bars → "Seguin Board A (Teens)"
- Wooden board with slots, cards 10-90, placing bead bars → "Seguin Board B (Tens)"
- Short colored bead stair (1-9 beads, each color) → "Short Bead Stair"
- Wooden board with numbers 1-100 + number tiles → "Hundred Board"

LINEAR COUNTING (BEAD CHAINS):
- Short bead chains (squares: 1²→10²) → "Short Bead Chains (Squared)"
- Long bead chains (cubes: 1³→10³, very long) → "Long Bead Chains (Cubed)"
- Bead chain with arrow labels (skip counting) → "Bead Chain" (specify short/long if visible)

MEMORIZATION — OPERATION BOARDS:
- Red/blue strip board with number strips for addition → "Addition Strip Board"
- Strip board with number strips for subtraction → "Subtraction Strip Board"
- Board with bead/disc moved along grid (100 holes) → "Multiplication Board"
- Board with skittles + beads for division → "Division Board"
- Small boards with finger charts → "Addition/Subtraction/Multiplication/Division Finger Charts"

PASSAGE TO ABSTRACTION:
- Small tiles with numbers + colored dots → "Stamp Game"
- Paper with dots in color-coded columns → "Dot Game"
- Small wooden frame with 4 rows of sliding beads → "Small Bead Frame"
- Large wooden frame with 7 rows of sliding beads → "Large Bead Frame"

FRACTIONS:
- Red metal circle cut into fraction pieces (½, ⅓, ¼, etc.) in green frame → "Fraction Circles"
- Colored skittles (fraction visualization) → "Fraction Skittles"

⚠️ MATHEMATICS CONFUSION PAIRS:
- NUMBER RODS (red+blue, Math) vs RED RODS (all red, Sensorial)
- GOLDEN BEADS (gold colored) vs SHORT BEAD STAIR (colored 1-9)
- STAMP GAME (small tiles) vs LARGE NUMBER CARDS (big wooden cards)
- SMALL BEAD FRAME (4 wires) vs LARGE BEAD FRAME (7 wires)
- ADDITION STRIP BOARD vs SUBTRACTION STRIP BOARD (same board, different strips — check operation context)
- HUNDRED BOARD (1-100 grid) vs MULTIPLICATION BOARD (bead on grid)

=== LANGUAGE ===

ORAL LANGUAGE:
- Picture cards sorted by category (animals, vehicles, food) → "Classified Cards (Nomenclature Cards)"
- Miniature objects matched to picture cards → "Object to Picture Matching"
- Small objects in basket + child pointing/naming sounds → "Sound Games (I Spy)"
- Rhyming picture card pairs → "Rhyming Activities"

WRITING PREPARATION:
- Pink metal geometric frames + colored pencils + traced designs → "Metal Insets"
- Rough textured letters on pink/blue boards (child tracing with fingers) → "Sandpaper Letters"
- Tray of colored sand, child writing with finger → "Sand Tray Writing"
- Child writing on chalkboard/whiteboard → "Chalkboard Writing"
- Box of loose letters (blue consonants, red vowels) spelling words → "Moveable Alphabet"
- Child writing on lined paper → "Handwriting on Paper"

READING:
- PINK miniature objects + CVC word labels → "Pink Object Box"
- Pink picture cards + 3-letter word cards → "Pink Series (CVC Words)"
- BLUE miniature objects + blend word labels → "Blue Object Box"
- Blue picture cards + blend word cards → "Blue Series (Blends)"
- Sandpaper letter combinations (sh, ch, th, ai, ee) → "Phonogram Introduction"
- GREEN miniature objects + phonogram word labels → "Green Object Box"
- Green picture/word cards with phonograms → "Green Series (Phonograms)"
- High-frequency word cards (the, said, was) → "Puzzle Words (Sight Words)"
- Child reading card and performing action → "Command Cards (Action Reading)"

GRAMMAR (identify by GRAMMAR SYMBOL if visible):
- Black triangle symbol + objects/labels → "Introduction to the Noun"
- Small light blue triangle → "Introduction to the Article"
- Medium dark blue triangle + describing game → "Introduction to the Adjective"
- Large red circle symbol + action cards → "Introduction to the Verb"
- Small orange circle → "Introduction to the Adverb"
- Colored boxes with sentence cards → "Grammar Boxes" (specify number if visible)
- Sentence analysis charts with arrows → "Sentence Analysis"

⚠️ LANGUAGE CONFUSION PAIRS:
- PINK Object Box (CVC objects) vs BLUE Object Box (blends) vs GREEN Object Box (phonograms) — identify by COLOR of labels/box
- SANDPAPER LETTERS (individual letters) vs PHONOGRAM INTRODUCTION (letter pairs like sh, ch, th)
- MOVEABLE ALPHABET (loose letters building words) vs SANDPAPER LETTERS (tracing on boards)
- CLASSIFIED CARDS (vocabulary, oral) vs PINK/BLUE/GREEN SERIES (reading, phonetic progression)
- METAL INSETS (geometric frames for pencil control) vs GEOMETRIC CABINET (Sensorial shape matching)

=== CULTURAL ===

GEOGRAPHY:
- Globe with rough (land) and smooth (water) surfaces → "Globe - Land and Water" (Sandpaper Globe)
- Globe with colored continents → "Globe - Continents"
- Large wooden puzzle map showing continents → "Puzzle Map - World"
- Puzzle map of a single continent with countries → "Puzzle Maps - Individual Continents"
- Miniature flags on stands → "Flags of the World"
- Trays with clay/water showing island/lake/peninsula/gulf → "Land and Water Forms"
- Solar system model or planet cards → "Solar System"

HISTORY AND TIME:
- Calendar activities, day/month cards → "Calendar Work"
- Walking around sun candle with globe → "Birthday Celebration"
- Learning clock / toy clock → "Clock Work"
- Long scroll showing eras of life → "Timeline of Life"

BOTANY (wooden inset puzzles — similar to Geometric Cabinet but showing plant parts):
- Wooden puzzle of whole plant (root, stem, leaf, flower) → "Parts of a Plant"
- Wooden puzzle of flower anatomy → "Parts of a Flower"
- Wooden puzzle of leaf with labeled parts → "Parts of a Leaf"
- Wooden puzzle of root system → "Parts of a Root"
- Wooden puzzle of seed cross-section → "Parts of a Seed"
- Life cycle cards/materials for plants → "Plant Life Cycle"
- Sorting cards living vs non-living → "Living vs Non-Living"

ZOOLOGY (wooden inset puzzles of animals):
- Wooden puzzle of fish anatomy → "Parts of a Fish"
- Wooden puzzle of frog anatomy → "Parts of a Frog"
- Wooden puzzle of turtle anatomy → "Parts of a Turtle"
- Wooden puzzle of bird anatomy → "Parts of a Bird"
- Wooden puzzle of horse anatomy → "Parts of a Horse"
- Animal sorting cards by vertebrate class → "Five Classes of Vertebrates"
- Animal figurines matched to continent mats → "Animals of the Continents"
- Life cycle cards (butterfly, frog, chicken) → "Animal Life Cycles"

SCIENCE:
- Basin of water + objects testing buoyancy → "Sink and Float"
- Magnet + various objects testing attraction → "Magnetic/Non-Magnetic"
- Ice/water experiments → "States of Matter"
- Mixing paint colors → "Color Mixing"

ART & MUSIC:
- Easel/paper + paints/brushes → "Painting"
- Drawing with pencils/crayons → "Drawing"
- Cutting/gluing paper collage → "Collage"
- Clay/playdough + tools → "Clay and Playdough"
- Rhythm instruments (shakers, drums, sticks) → "Rhythm Instruments"

⚠️ CULTURAL CONFUSION PAIRS:
- SANDPAPER GLOBE (rough/smooth, no colors) vs COLORED GLOBE (painted continents)
- PUZZLE MAP WORLD (all continents) vs INDIVIDUAL CONTINENT MAP (one continent with countries)
- BOTANY PUZZLES (plant parts) vs ZOOLOGY PUZZLES (animal parts) — look at the SUBJECT of the puzzle
- LAND AND WATER FORMS (clay trays with water) vs "Sink and Float" (objects in water basin)

CONFIDENCE CALIBRATION (CRITICAL — your confidence score has real consequences):
- 0.95+ : ONLY use when the material is unmistakable and you are CERTAIN of the exact work name
  → The system will AUTOMATICALLY update the child's progress record (no teacher review)
  → False positives at this level corrupt educational records — be conservative
- 0.7-0.94 : Likely match but some ambiguity (partially visible materials, angle obscures key features)
  → Teacher will be asked to confirm before any update happens
- 0.5-0.69 : Best guess based on limited visual evidence — requires teacher confirmation
- Below 0.5 : Cannot reliably identify — describe what you see, no matching attempted
IMPORTANT: When in doubt, round DOWN your confidence. It is always better to ask the teacher
to confirm (0.7-0.94) than to auto-update incorrectly (0.95+).
${curriculumHint}${visualMemoryContext}${focusWorksContext}${correctionsContext}${duplicateContext}`;

    // ================================================================
    // TWO-PASS DESCRIBE-THEN-MATCH ARCHITECTURE
    //
    // Research shows vision accuracy degrades with long system prompts.
    // Splitting into two passes gives each model ONE job:
    //
    // PASS 1 — DESCRIBE (Haiku + image, minimal prompt):
    //   "What materials/tools do you see? What is the child doing?"
    //   Returns pure visual description grounded in what it actually sees.
    //   NO curriculum context → no chance of hallucinating a work name.
    //
    // PASS 2 — MATCH (Haiku + text-only, full context):
    //   Takes the visual description and matches it to the curriculum
    //   using the visual ID guide, corrections, and visual memory.
    //   100% attention on matching → much higher accuracy.
    //
    // Cost: ~$0.006/photo (2× Haiku) vs ~$0.06 (Sonnet). 10× cheaper.
    // Latency: ~4-8s vs ~10-45s. 3-5× faster.
    // Accuracy: Higher — each pass does ONE thing well.
    // ================================================================

    let input: ReturnType<typeof validateToolOutput> | null = null;
    let matchResult: ReturnType<typeof matchToCurriculumV2> | null = null;
    let finalWorkName: string = '';
    let finalArea: string | null = null;
    let finalWorkKey: string | null = null;
    let matchScore: number = 0;
    let modelUsed: string = HAIKU_MODEL;
    const haikuAttempted = true;
    let haikuAccepted = false;

    // === PASS 1: DESCRIBE — Haiku looks at the photo with a minimal prompt ===
    // No curriculum, no visual ID guide, no corrections — just "describe what you see"
    const describeAbort = new AbortController();
    let describeTimeout: ReturnType<typeof setTimeout> | undefined;
    let visualDescription = '';

    try {
      const describePromise = anthropic.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 300,
        system: `You are observing a Montessori classroom photo. Describe ONLY what you physically see.

Focus on:
1. MATERIALS: What objects/tools are on the table or mat? (shape, color, size, material — wood/metal/fabric/plastic/paper)
2. HANDS: What is the child doing with their hands? (threading, tracing, stacking, sorting, pouring, writing, etc.)
3. SETUP: How are materials arranged? (in a frame, on a tray, in a box, on a mat, etc.)
4. KEY DETAILS: Any closures (buttons, zippers, bows, laces, snaps)? Any colors/patterns? Any numbers/letters?

Be specific and factual. Do NOT guess the name of the activity. Do NOT say "Montessori work" or name any work.
Just describe the physical scene in 2-4 sentences.`,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: photoUrl } },
            { type: 'text', text: 'Describe the materials and what the child is doing.' },
          ],
        }],
      }, { signal: describeAbort.signal });

      describeTimeout = setTimeout(() => {
        describeAbort.abort();
      }, 15000); // 15s timeout for description

      const describeMsg = await describePromise;
      clearTimeout(describeTimeout);

      for (const block of describeMsg.content) {
        if (block.type === 'text') {
          visualDescription = block.text.trim();
          break;
        }
      }
      console.log(`[PhotoInsight] Pass 1 DESCRIBE: "${visualDescription.slice(0, 120)}..."`);
      // logApiUsage deferred — metering system not yet deployed
    } catch (describeErr: unknown) {
      clearTimeout(describeTimeout);
      const isTimeout = describeErr instanceof Error && (describeErr.message?.includes('timeout') || describeErr.name === 'AbortError');
      console.error(`[PhotoInsight] Pass 1 ${isTimeout ? 'TIMED OUT' : 'FAILED'}:`, describeErr);
      // Fall through — Pass 2 will use empty description, which means lower confidence
    }

    if (!visualDescription) {
      visualDescription = 'Unable to describe photo contents.';
    }

    // === PASS 2: MATCH — Haiku matches the description to the curriculum (text-only, no image) ===
    // Full visual ID guide + corrections + visual memory — but NO image to distract attention
    const matchAbort = new AbortController();
    let matchTimeout: ReturnType<typeof setTimeout> | undefined;

    try {
      const matchPromise = anthropic.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 500,
        system: `You are a Montessori curriculum expert. A classroom photo was described by an observer. Match the description to the correct Montessori work name using the tag_photo tool.

${langInstruction}

CRITICAL RULES:
1. Match based on the MATERIALS DESCRIBED — the specific tool/material determines the work name
2. Use the EXACT standard curriculum name from the visual identification guide below
3. If the description doesn't clearly match any work, set confidence LOW (below 0.5)
4. Keep the observation to ONE warm, specific sentence about the child's engagement
5. COMPOSITION: Suggest a crop if the description mentions a child and materials together. Use normalized 0-1 coordinates.

${systemPrompt.slice(systemPrompt.indexOf('VISUAL IDENTIFICATION GUIDE'))}`,
        tools: [PHOTO_ANALYSIS_TOOL],
        tool_choice: { type: 'tool', name: 'tag_photo' },
        messages: [{
          role: 'user',
          content: `PHOTO DESCRIPTION (from classroom observer):
"${visualDescription}"

Child: ${childName}, age ${childAge}

Match this description to the correct Montessori work. Use the visual identification guide in your instructions.

${worksContext}`,
        }],
      }, { signal: matchAbort.signal });

      matchTimeout = setTimeout(() => {
        matchAbort.abort();
      }, 15000); // 15s timeout for matching

      const matchMsg = await matchPromise;
      clearTimeout(matchTimeout);

      const toolBlock = matchMsg.content.find(b => b.type === 'tool_use');
      if (toolBlock && toolBlock.type === 'tool_use') {
        input = validateToolOutput(toolBlock.input as Record<string, unknown>);
        matchResult = matchToCurriculumV2(
          input.work_name,
          input.area !== 'unknown' ? input.area : null,
          curriculum,
          correctionsMap,
          input.observation,
        );

        finalWorkName = matchResult.bestMatch?.name || input.work_name;
        finalArea = matchResult.bestMatch?.area_key || (input.area !== 'unknown' ? input.area : null);
        finalWorkKey = matchResult.bestMatch?.work_key || null;
        matchScore = matchResult.bestScore;
        modelUsed = HAIKU_MODEL;
        haikuAccepted = true;
        console.log(`[PhotoInsight] Pass 2 MATCH: "${finalWorkName}" (confidence: ${input.confidence.toFixed(2)}, match: ${matchScore.toFixed(2)})`);
        // logApiUsage deferred — metering system not yet deployed
      } else {
        console.log('[PhotoInsight] Pass 2 returned no tool_use');
      }
    } catch (matchErr: unknown) {
      clearTimeout(matchTimeout);
      console.error('[PhotoInsight] Pass 2 MATCH failed:', matchErr);
    }

    // === FALLBACK: If two-pass failed, try single-pass Sonnet (old approach) ===
    if (!input || !matchResult) {
      console.log('[PhotoInsight] Two-pass failed — falling back to single-pass Sonnet');
      const apiAbortController = new AbortController();
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

      try {
        const apiPromise = anthropic.messages.create({
          model: AI_MODEL,
          max_tokens: 500,
          system: systemPrompt,
          tools: [PHOTO_ANALYSIS_TOOL],
          tool_choice: { type: 'tool', name: 'tag_photo' },
          messages: [{ role: 'user', content: [
            { type: 'image' as const, source: { type: 'url' as const, url: photoUrl } },
            { type: 'text' as const, text: `Child: ${childName}, age ${childAge}\n\nAnalyze this photo and tag it with the Montessori work, area, and mastery level.\n\n${worksContext}` },
          ] }],
        }, { signal: apiAbortController.signal });

        timeoutHandle = setTimeout(() => {
          apiAbortController.abort();
        }, 45000);

        const message = await apiPromise;
        clearTimeout(timeoutHandle);

        const toolBlock = message.content.find(b => b.type === 'tool_use');
        if (toolBlock && toolBlock.type === 'tool_use') {
          input = validateToolOutput(toolBlock.input as Record<string, unknown>);
          matchResult = matchToCurriculumV2(
            input.work_name,
            input.area !== 'unknown' ? input.area : null,
            curriculum,
            correctionsMap,
            input.observation,
          );
          finalWorkName = matchResult.bestMatch?.name || input.work_name;
          finalArea = matchResult.bestMatch?.area_key || (input.area !== 'unknown' ? input.area : null);
          finalWorkKey = matchResult.bestMatch?.work_key || null;
          matchScore = matchResult.bestScore;
          modelUsed = AI_MODEL;
          haikuAccepted = false;
          console.log(`[PhotoInsight] Sonnet fallback: "${finalWorkName}" (confidence: ${input.confidence.toFixed(2)}, match: ${matchScore.toFixed(2)})`);
          // logApiUsage deferred — metering system not yet deployed
        }
      } catch (sonnetErr) {
        clearTimeout(timeoutHandle);
        console.error('[PhotoInsight] Sonnet fallback failed:', sonnetErr);
      }
    }

    // Defensive guard: if all passes failed, bail
    if (!input || !matchResult) {
      console.error('[PhotoInsight] All passes failed to produce a result');
      return NextResponse.json({ success: false, error: 'Failed to analyze photo' }, { status: 500 });
    }

    // ========================================================
    // 3 LOOKUPS: Is this work in classroom? On child's shelf? What's the DB work_id?
    // ========================================================
    let inClassroom = false;
    let inChildShelf = false;
    let classroomWorkId: string | null = null;

    if (classroomId && finalWorkName) {
      // Run both lookups in parallel — they're independent queries
      const [classroomLookup, shelfLookup] = await Promise.allSettled([
        // Lookup 1: Is this work in the classroom curriculum?
        supabase
          .from('montree_classroom_curriculum_works')
          .select('id')
          .eq('classroom_id', classroomId)
          .eq('name', finalWorkName)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle(),
        // Lookup 2: Is this work on the child's shelf (focus works)?
        child_id
          ? supabase
              .from('montree_child_focus_works')
              .select('id')
              .eq('child_id', child_id)
              .eq('work_name', finalWorkName)
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (classroomLookup.status === 'fulfilled' && classroomLookup.value?.data?.id) {
        inClassroom = true;
        classroomWorkId = classroomLookup.value.data.id;
      }
      if (shelfLookup.status === 'fulfilled' && shelfLookup.value?.data?.id) {
        inChildShelf = true;
      }
    }

    // Determine if we should auto-update progress
    const validStatuses = ['mastered', 'practicing', 'presented'];
    const masteryEvidence = validStatuses.includes(input.mastery_evidence)
      ? input.mastery_evidence
      : null;

    // GREEN zone auto-update: BOTH match score AND Sonnet confidence must be ≥ 0.95
    // AMBER zone (0.5–0.95): tagged but requires teacher confirmation before progress update
    // RED zone (<0.5): scenario A (unknown work)
    const shouldAutoUpdate = (
      matchScore >= AUTO_UPDATE_THRESHOLD &&
      input.confidence >= AUTO_UPDATE_THRESHOLD &&
      masteryEvidence !== null
    );

    // Whether this result needs teacher confirmation (AMBER zone)
    const needsConfirmation = !shouldAutoUpdate && matchScore >= 0.5 && input.confidence >= 0.5;

    let autoUpdated = false;

    // Update media record work_id for gallery tagging
    // montree_media has work_id column (not work_name/area) — gallery computes names from curriculum lookup
    // Tag media with work_id (reuse classroomWorkId from earlier lookup — no extra DB query)
    // Build media update payload — always save auto_crop if present, work_id if matched
    const mediaUpdatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (classroomWorkId) {
      mediaUpdatePayload.work_id = classroomWorkId;
    }
    if (input.suggested_crop) {
      mediaUpdatePayload.auto_crop = input.suggested_crop;
    }

    if (Object.keys(mediaUpdatePayload).length > 1) { // more than just updated_at
      try {
        const { error: mediaUpdateError } = await supabase
          .from('montree_media')
          .update(mediaUpdatePayload)
          .eq('id', media_id);

        if (mediaUpdateError) {
          console.error('[PhotoInsight] Failed to update media:', mediaUpdateError);
        }
      } catch (err) {
        console.error('[PhotoInsight] Media update exception:', err);
      }
    }

    // Auto-update progress if confidence is high AND work is in classroom
    // "Self-driving car" — Guru auto-manages, teacher can override anytime via shelf
    // Key rule: ONLY upgrade status, NEVER downgrade (teacher manual override always wins)
    // Gate on inClassroom: if teacher hasn't added this work to the classroom, don't auto-update
    // progress — the Scenario B CTA lets them opt in first (prevents rogue progress entries)
    if (shouldAutoUpdate && inClassroom && finalWorkName && finalArea) {
      try {
        // Check current status — only upgrade, never downgrade
        const { data: existingProgress } = await supabase
          .from('montree_child_progress')
          .select('status, mastered_at, notes')
          .eq('child_id', child_id)
          .eq('work_name', finalWorkName)
          .maybeSingle();

        const currentRank = STATUS_RANK[existingProgress?.status || 'not_started'] || 0;
        const newRank = STATUS_RANK[masteryEvidence!] || 0;

        // Only upgrade status, never downgrade (teacher override protection)
        if (newRank > currentRank) {
          const updateRecord: Record<string, unknown> = {
            child_id,
            work_name: finalWorkName,
            area: finalArea,
            status: masteryEvidence,
            updated_at: new Date().toISOString(),
            notes: `[Guru Smart Capture] ${input.observation}`,
          };

          // Set mastered_at only on first mastery
          if (masteryEvidence === 'mastered' && !existingProgress?.mastered_at) {
            updateRecord.mastered_at = new Date().toISOString();
          }

          const { error: progressError } = await supabase
            .from('montree_child_progress')
            .upsert(updateRecord, { onConflict: 'child_id,work_name' });

          if (progressError) {
            console.error('[PhotoInsight] Failed to update progress:', progressError);
          } else {
            autoUpdated = true;
            console.log(`[PhotoInsight] Auto-updated ${finalWorkName} → ${masteryEvidence} for child ${child_id}`);
          }
        }
      } catch (err) {
        console.error('[PhotoInsight] Progress update exception:', err);
      }
    }

    // GREEN zone: Auto-add to child's shelf if work is in classroom but NOT on shelf
    // This completes the "self-driving car" model: photo → identify → update progress → add to shelf
    // Only fires when confidence is GREEN (≥0.95) to avoid polluting the shelf with misidentifications
    if (shouldAutoUpdate && inClassroom && !inChildShelf && finalWorkName && finalArea && classroomWorkId) {
      try {
        const { error: shelfError } = await supabase
          .from('montree_child_focus_works')
          .upsert({
            child_id,
            work_name: finalWorkName,
            area: finalArea,
            work_id: classroomWorkId,
            status: masteryEvidence || 'presented',
            source: 'smart_capture',
          }, { onConflict: 'child_id,work_name' });

        if (shelfError) {
          console.error('[PhotoInsight] Auto-add to shelf failed:', shelfError);
        } else {
          inChildShelf = true; // Update for scenario calculation below
          console.log(`[PhotoInsight] Auto-added ${finalWorkName} to shelf for child ${child_id}`);
        }
      } catch (err) {
        console.error('[PhotoInsight] Auto-add to shelf exception:', err);
      }
    }

    // SELF-LEARNING: Do NOT mark as "assumed correct" on auto-update
    // Accuracy EMA is ONLY updated when teacher explicitly confirms (via confirm button)
    // or corrects (via correction flow). This prevents poisoning the accuracy data.

    // VISUAL MEMORY: First-capture learning for custom works
    // If this is a custom work (work_key starts with 'custom_') and we have a confident match
    // but NO visual memory entry yet, generate one from this photo.
    // This way, future photos of the same custom work get the visual description injected.
    // Fire-and-forget: don't await, don't block the response.
    if (
      finalWorkKey && finalWorkKey.startsWith('custom_') &&
      matchScore >= 0.9 && input.confidence >= 0.9 &&
      classroomId && photoUrl && anthropic
    ) {
      // Check if visual memory already exists for this work (cheap query)
      supabase
        .from('montree_visual_memory')
        .select('id')
        .eq('classroom_id', classroomId)
        .eq('work_name', finalWorkName)
        .maybeSingle()
        .then(({ data: existingMemory }) => {
          if (!existingMemory) {
            // No visual memory yet — generate from this photo using Haiku
            // LOW-001: Validate photoUrl before sending to Haiku
            if (!photoUrl.startsWith('http://') && !photoUrl.startsWith('https://')) {
              console.warn('[VisualMemory] Invalid photoUrl for first-capture, skipping:', photoUrl);
              return;
            }
            // Add timeout to first-capture Haiku call (same pattern as corrections)
            const fcAbort = new AbortController();
            const fcTimeout = setTimeout(() => fcAbort.abort(), 45000);
            const startMs = Date.now();
            return anthropic!.messages.create({
              model: HAIKU_MODEL,
              max_tokens: 150,
              system: `You are a Montessori classroom material describer. Given a photo of a child working with Montessori materials, describe ONLY the physical materials/objects visible — NOT the child, NOT the activity, NOT the room. Focus on: shape, color, size, material (wood/metal/fabric/plastic), arrangement, and any distinctive visual features. Keep it to 1-2 sentences, max 120 words.`,
              messages: [{
                role: 'user',
                content: [
                  { type: 'image', source: { type: 'url', url: photoUrl } },
                  { type: 'text', text: `This is the Montessori work "${finalWorkName}" (area: ${finalArea || 'unknown'}). Describe the physical materials visible.` },
                ],
              }],
            }, { signal: fcAbort.signal }).then((msg) => {
              // LOW-004: Log Haiku latency for monitoring
              console.log(`[VisualMemory] First-capture Haiku latency: ${Date.now() - startMs}ms`);
              let desc = '';
              for (const block of msg.content) {
                if (block.type === 'text') { desc = block.text.trim().slice(0, 500); break; }
              }
              if (desc.length >= 10) {
                return supabase
                  .from('montree_visual_memory')
                  .upsert({
                    classroom_id: classroomId,
                    work_name: finalWorkName,
                    work_key: finalWorkKey,
                    area: finalArea,
                    is_custom: true,
                    visual_description: desc,
                    source: 'first_capture',
                    source_media_id: media_id,
                    photo_url: photoUrl,
                    description_confidence: 0.7,
                    updated_at: new Date().toISOString(),
                  }, { onConflict: 'classroom_id,work_name' })
                  .then(({ error }) => {
                    if (error) console.error('[VisualMemory] First-capture upsert error:', error);
                    else console.log(`[VisualMemory] First-capture stored for custom work "${finalWorkName}"`);
                  });
              }
            }).catch((err) => {
              if (fcAbort.signal.aborted) {
                console.error('[VisualMemory] First-capture Haiku timed out after 45s — skipping');
                return;
              }
              throw err; // Re-throw non-timeout errors to outer catch
            }).finally(() => {
              clearTimeout(fcTimeout);
            });
          }
        })
        .catch((err) => {
          console.error('[VisualMemory] First-capture check error (non-fatal):', err);
        });
    }

    // Determine scenario for client UI:
    // A: Unknown work (low confidence OR low match) → "Teach Guru This Work"
    // B: Standard/custom work NOT in classroom → "Add to Classroom"
    // C: In classroom but NOT on shelf → "Add to Shelf"
    // D: Happy path (in classroom + on shelf or auto-updated)
    // CONFIDENCE FLOOR: if Sonnet confidence < 0.5, always scenario A regardless of match
    // Scenario determination based on ACTUAL state after all auto-updates
    // Don't use autoUpdated as a proxy — check actual shelf/classroom state
    // If auto-add-to-shelf failed, inChildShelf is still false → scenario C (user can add manually)
    let scenario: 'A' | 'B' | 'C' | 'D' = 'D';
    if (matchScore < 0.5 || input.confidence < 0.5) {
      scenario = 'A'; // Unknown or too uncertain
    } else if (!inClassroom) {
      scenario = 'B'; // Known work, not in this classroom
    } else if (!inChildShelf) {
      scenario = 'C'; // In classroom, not on shelf (regardless of whether auto-update succeeded)
    }
    // else scenario = 'D' (happy path — in classroom AND on shelf)

    // Build clean insight text (1 sentence observation, not verbose)
    const insightText = input.observation || 'Photo analyzed';

    // Cache in guru interactions with full structured data
    const { error: cacheError } = await supabase
      .from('montree_guru_interactions')
      .insert({
        child_id,
        classroom_id: classroomId,
        question: `photo:${media_id}:${locale}`,
        question_type: 'photo_insight',
        response_insight: insightText,
        model_used: modelUsed,
        context_snapshot: {
          child_name: childName,
          media_id,
          photo_url: photoUrl,
          identified_work_name: finalWorkName,
          identified_area: finalArea,
          identified_work_key: finalWorkKey,
          mastery_evidence: masteryEvidence,
          sonnet_confidence: input.confidence, // Field name kept for backward compat — actually model_confidence
          curriculum_match_score: matchScore,
          auto_updated: autoUpdated,
          needs_confirmation: needsConfirmation,
          scenario,
          in_classroom: inClassroom,
          in_child_shelf: inChildShelf,
          classroom_work_id: classroomWorkId,
          candidates: matchResult.candidates.map(c => ({ name: c.work.name, area: c.work.area_key, score: c.score })),
          locale,
          model_used: modelUsed,
          haiku_attempted: haikuAttempted,
          haiku_accepted: haikuAccepted,
          visual_description: visualDescription.slice(0, 500),
          two_pass: true,
          suggested_crop: input.suggested_crop ?? null,
        },
      });

    if (cacheError) {
      console.error('[PhotoInsight] Failed to cache interaction:', cacheError);
    }

    return NextResponse.json({
      success: true,
      insight: insightText,
      work_name: finalWorkName,
      area: finalArea,
      mastery_evidence: masteryEvidence,
      auto_updated: autoUpdated,
      needs_confirmation: needsConfirmation,
      confidence: input.confidence,
      match_score: matchScore,
      // Top candidates for "Did you mean?" UI
      candidates: matchResult.candidates.slice(0, 3).map(c => ({
        name: c.work.name,
        area: c.work.area_key,
        score: Math.round(c.score * 100) / 100,
      })),
      // Work ingestion scenario hints
      scenario,
      in_classroom: inClassroom,
      in_child_shelf: inChildShelf,
      classroom_work_id: classroomWorkId,
      suggested_crop: input.suggested_crop ?? null,
    });

  } catch (error) {
    console.error('[PhotoInsight] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze photo' },
      { status: 500 }
    );
  }
}
