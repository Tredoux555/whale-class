// app/api/montree/guru/photo-insight/route.ts
// Smart Capture — Sonnet vision analyzes a child's photo
// Returns structured data: work name, area, mastery status, brief observation
// Auto-updates: media tagging (work_id) + progress (teacher can override)
// "Self-driving car" model: Guru auto-manages, teacher can override anytime via shelf

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getPublicUrl } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { anthropic, AI_ENABLED, AI_MODEL } from '@/lib/ai/anthropic';
import { loadAllCurriculumWorks, type CurriculumWork } from '@/lib/montree/curriculum-loader';
import { matchToCurriculumV2 } from '@/lib/montree/work-matching';

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
    },
    required: ['work_name', 'area', 'mastery_evidence', 'confidence', 'observation'],
  },
};

// Old matchToCurriculum removed — now using matchToCurriculumV2 from work-matching.ts
// (area-constrained, alias-aware, materials-boosted, top-3 candidates)

// Status rank for upgrade-only protection
const STATUS_RANK: Record<string, number> = {
  'not_started': 0, 'presented': 1, 'practicing': 2, 'mastered': 3,
};

// Adaptive auto-update threshold based on per-work accuracy history
// High EMA (>0.8) → lower threshold (0.6), Low EMA (<0.5) → higher threshold (0.85)
function getAutoUpdateThreshold(ema: number | undefined): number {
  if (ema === undefined) return 0.7; // default for new works
  if (ema >= 0.8) return 0.6;  // historically accurate → trust more
  if (ema >= 0.5) return 0.7;  // average → standard threshold
  return 0.85;                  // historically inaccurate → require high confidence
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

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

    const supabase = getSupabase();

    // Check for cached insight (use maybeSingle to handle 0 or 2+ rows gracefully)
    const { data: cached } = await supabase
      .from('montree_guru_interactions')
      .select('response_insight, context_snapshot')
      .eq('child_id', child_id)
      .eq('question_type', 'photo_insight')
      .eq('question', `photo:${media_id}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached?.response_insight) {
      // Return cached structured response (including work ingestion scenario data + V2 candidates)
      const snapshot = (cached.context_snapshot as Record<string, unknown>) || {};
      return NextResponse.json({
        success: true,
        insight: cached.response_insight,
        work_name: snapshot.identified_work_name || null,
        area: snapshot.identified_area || null,
        mastery_evidence: snapshot.mastery_evidence || null,
        auto_updated: snapshot.auto_updated || false,
        confidence: snapshot.sonnet_confidence || null,
        match_score: snapshot.curriculum_match_score ?? null,
        candidates: Array.isArray(snapshot.candidates) ? snapshot.candidates : [],
        scenario: snapshot.scenario || 'D',
        in_classroom: snapshot.in_classroom || false,
        in_child_shelf: snapshot.in_child_shelf || false,
        classroom_work_id: snapshot.classroom_work_id || null,
      });
    }

    if (!AI_ENABLED || !anthropic) {
      return NextResponse.json({ success: false, error: 'AI features are not enabled' }, { status: 503 });
    }

    // Fetch the photo storage path
    const { data: media } = await supabase
      .from('montree_media')
      .select('storage_path, media_type, child_id')
      .eq('id', media_id)
      .maybeSingle();

    if (!media?.storage_path) {
      return NextResponse.json({ success: false, error: 'Photo not found' }, { status: 404 });
    }

    // Verify media belongs to this child (cross-pollination protection)
    if (media.child_id && media.child_id !== child_id) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
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
    const childAge = child?.age || 4;

    // Build works context for Sonnet
    const worksContext = currentWorks && currentWorks.length > 0
      ? `Current works on shelf:\n${currentWorks.map(w => `- ${w.work_name} (${w.area}, ${w.status})`).join('\n')}`
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

    // Build curriculum context for Sonnet (top-level work names by area)
    const curriculumHint = curriculum.length > 0
      ? `\nStandard Montessori curriculum works include:\n${
          ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural']
            .map(area => {
              const areaWorks = curriculum
                .filter(w => w.area_key === area)
                .slice(0, 15)
                .map(w => w.name);
              return `${area}: ${areaWorks.join(', ')}`;
            }).join('\n')
        }`
      : '';

    // ========================================================
    // SELF-LEARNING CONTEXT: corrections, focus works, duplicates
    // ========================================================

    // 1. Fetch corrections for this classroom (used for BOTH prompt context AND V2 matching)
    let correctionsContext = '';
    const correctionsMap = new Map<string, string>(); // lowercase original → corrected (for matchToCurriculumV2)
    if (classroomId) {
      try {
        const { data: corrections } = await supabase
          .from('montree_guru_corrections')
          .select('original_work_name, corrected_work_name')
          .eq('classroom_id', classroomId)
          .order('created_at', { ascending: false })
          .limit(50);
        if (corrections && corrections.length > 0) {
          const promptEntries: string[] = [];
          for (const c of corrections) {
            if (c.original_work_name && c.corrected_work_name) {
              // For V2 matching (lowercase key)
              correctionsMap.set(c.original_work_name.toLowerCase().trim(), c.corrected_work_name);
              // For prompt context (show last 10 unique)
              if (promptEntries.length < 10) {
                promptEntries.push(`- You said "${c.original_work_name}" but teacher corrected to "${c.corrected_work_name}"`);
              }
            }
          }
          if (promptEntries.length > 0) {
            correctionsContext = `\n\nTEACHER CORRECTIONS (learn from these — you got these wrong before):\n${promptEntries.join('\n')}`;
          }
        }
      } catch {
        // Non-fatal — continue without corrections
      }
    }

    // 2. Fetch child's current focus works (narrows candidate works significantly)
    let focusWorksContext = '';
    if (child_id) {
      try {
        const { data: focusWorks } = await supabase
          .from('montree_child_focus_works')
          .select('work_name, area, status')
          .eq('child_id', child_id)
          .limit(10);
        if (focusWorks && focusWorks.length > 0) {
          focusWorksContext = `\n\nPRIORITY WORKS — CHECK THESE FIRST (child's current shelf):
${focusWorks.map((w, i) => `${i + 1}. ${w.work_name} (${w.area}, status: ${w.status})`).join('\n')}
RULE: If the photo matches ANY of these shelf works, ALWAYS prefer it over a general curriculum guess. These are the works physically on this child's shelf right now.`;
        }
      } catch {
        // Non-fatal
      }
    }

    // 3. Check for duplicate photos (same child, last 5 min — use same work for consistency)
    let duplicateContext = '';
    try {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentPhotos } = await supabase
        .from('montree_guru_interactions')
        .select('context_snapshot')
        .eq('child_id', child_id)
        .eq('question_type', 'photo_insight')
        .gte('created_at', fiveMinAgo)
        .neq('question', `photo:${media_id}`)
        .order('created_at', { ascending: false })
        .limit(1);
      if (recentPhotos && recentPhotos.length > 0) {
        const snapshot = recentPhotos[0].context_snapshot as Record<string, unknown>;
        if (snapshot?.identified_work_name) {
          duplicateContext = `\n\nRECENT PHOTO (same child, last 5 minutes): Previously identified as "${snapshot.identified_work_name}" (${snapshot.identified_area}). If this photo shows the same activity, use the same work name for consistency.`;
        }
      }
    } catch {
      // Non-fatal
    }

    // 4. Check per-work accuracy — disable auto-update for unreliable works
    const accuracyData: Map<string, { ema: number; enabled: boolean }> = new Map();
    if (classroomId) {
      try {
        const { data: accuracy } = await supabase
          .from('montree_work_accuracy')
          .select('work_name, accuracy_ema, auto_update_enabled')
          .eq('classroom_id', classroomId);
        if (accuracy) {
          for (const a of accuracy) {
            accuracyData.set(a.work_name, {
              ema: typeof a.accuracy_ema === 'number' ? a.accuracy_ema : 0.5,
              enabled: a.auto_update_enabled !== false,
            });
          }
        }
      } catch {
        // Non-fatal
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

IMPORTANT:
- Identify the SPECIFIC Montessori work name (e.g., "Color Box 2", "Pink Tower", "Sandpaper Letters")
- Match to standard curriculum names when possible — use the EXACT name from the curriculum list below
- Assess mastery based on visual evidence: correct completion = mastered, active work with some errors = practicing
- Keep the observation to ONE warm, specific sentence about technique or concentration
- If you cannot identify the work, describe what you see and set confidence low

EXAMPLES (for calibration):
- Photo of child stacking graduated pink cubes → work_name: "Pink Tower", area: "sensorial", confidence: 0.95
- Photo of child tracing letters on textured cards → work_name: "Sandpaper Letters", area: "language", confidence: 0.9
- Photo of child transferring beans with a spoon → work_name: "Spooning", area: "practical_life", confidence: 0.85
${curriculumHint}${focusWorksContext}${correctionsContext}${duplicateContext}`;

    // Call Sonnet with vision + tool_use (45s timeout — fire-and-forget on client, but don't hang server)
    const apiPromise = anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 500,
      system: systemPrompt,
      tools: [PHOTO_ANALYSIS_TOOL],
      tool_choice: { type: 'tool', name: 'tag_photo' },
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'url', url: photoUrl },
          },
          {
            type: 'text',
            text: `Child: ${childName}, age ${childAge}\n${worksContext}\n\nAnalyze this photo and tag it with the Montessori work, area, and mastery level.`,
          },
        ],
      }],
    });

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('Analysis took too long')), 45000);
    });

    const message = await Promise.race([apiPromise, timeoutPromise]).finally(() => {
      clearTimeout(timeoutHandle);
    });

    // Extract tool use result
    const toolBlock = message.content.find(b => b.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      // Fallback: try to get text response
      const textContent = message.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('');
      return NextResponse.json({
        success: true,
        insight: (textContent || 'Unable to analyze photo').slice(0, 200),
        work_name: null,
        area: null,
        mastery_evidence: null,
        auto_updated: false,
        confidence: null,
        match_score: null,
        candidates: [],
        scenario: 'A' as const,
        in_classroom: false,
        in_child_shelf: false,
        classroom_work_id: null,
      });
    }

    // Validate tool input fields
    const rawInput = toolBlock.input as Record<string, unknown>;
    const input = {
      work_name: typeof rawInput.work_name === 'string' ? rawInput.work_name : '',
      area: typeof rawInput.area === 'string' ? rawInput.area : 'unknown',
      mastery_evidence: typeof rawInput.mastery_evidence === 'string' ? rawInput.mastery_evidence : 'unclear',
      confidence: typeof rawInput.confidence === 'number' ? Math.max(0, Math.min(1, rawInput.confidence)) : 0,
      observation: typeof rawInput.observation === 'string' ? rawInput.observation : '',
    };

    // Match to curriculum using V2 (area-constrained, alias-aware, materials-boosted)
    // correctionsMap already built from step 1 above (shared with prompt context)
    const matchResult = matchToCurriculumV2(
      input.work_name,
      input.area !== 'unknown' ? input.area : null,
      curriculum,
      correctionsMap,
      input.observation,
    );

    const finalWorkName = matchResult.bestMatch?.name || input.work_name;
    const finalArea = matchResult.bestMatch?.area_key
      || (input.area !== 'unknown' ? input.area : null);
    const finalWorkKey = matchResult.bestMatch?.work_key || null;
    const matchScore = matchResult.bestScore;

    // ========================================================
    // 3 LOOKUPS: Is this work in classroom? On child's shelf? What's the DB work_id?
    // ========================================================
    let inClassroom = false;
    let inChildShelf = false;
    let classroomWorkId: string | null = null;

    if (classroomId && finalWorkName) {
      try {
        // Lookup 1: Is this work in the classroom curriculum?
        const { data: classroomWork } = await supabase
          .from('montree_classroom_curriculum_works')
          .select('id')
          .eq('classroom_id', classroomId)
          .eq('name', finalWorkName)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (classroomWork?.id) {
          inClassroom = true;
          classroomWorkId = classroomWork.id;
        }

        // Lookup 2: Is this work on the child's shelf (focus works)?
        if (child_id) {
          const { data: shelfWork } = await supabase
            .from('montree_child_focus_works')
            .select('id')
            .eq('child_id', child_id)
            .eq('work_name', finalWorkName)
            .limit(1)
            .maybeSingle();

          if (shelfWork?.id) {
            inChildShelf = true;
          }
        }
      } catch {
        // Non-fatal — lookups are for UI hints, not critical
      }
    }

    // Determine if we should auto-update progress
    const validStatuses = ['mastered', 'practicing', 'presented'];
    const masteryEvidence = validStatuses.includes(input.mastery_evidence)
      ? input.mastery_evidence
      : null;

    const workAccuracy = accuracyData.get(finalWorkName);
    const accuracyGatePass = workAccuracy ? workAccuracy.enabled : true;
    const autoUpdateThreshold = getAutoUpdateThreshold(workAccuracy?.ema);

    const shouldAutoUpdate = (
      matchScore >= autoUpdateThreshold &&
      input.confidence >= autoUpdateThreshold &&
      masteryEvidence !== null &&
      accuracyGatePass
    );

    let autoUpdated = false;

    // Update media record work_id for gallery tagging
    // montree_media has work_id column (not work_name/area) — gallery computes names from curriculum lookup
    // Tag media with work_id (reuse classroomWorkId from earlier lookup — no extra DB query)
    if (classroomWorkId) {
      try {
        const { error: mediaUpdateError } = await supabase
          .from('montree_media')
          .update({
            work_id: classroomWorkId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', media_id);

        if (mediaUpdateError) {
          console.error('[PhotoInsight] Failed to update media work_id:', mediaUpdateError);
        }
      } catch (err) {
        console.error('[PhotoInsight] Media tagging exception:', err);
      }
    }

    // Auto-update progress if confidence is high
    // "Self-driving car" — Guru auto-manages, teacher can override anytime via shelf
    // Key rule: ONLY upgrade status, NEVER downgrade (teacher manual override always wins)
    if (shouldAutoUpdate && finalWorkName && finalArea) {
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

    // SELF-LEARNING: Track this identification as "assumed correct" in accuracy table
    // Only track when we actually auto-updated progress (full confidence + gate pass)
    // If teacher later corrects it, the correction handler will mark it incorrect
    if (shouldAutoUpdate && autoUpdated && finalWorkName && finalArea && classroomId) {
      try {
        const { error: rpcError } = await supabase.rpc('update_work_accuracy', {
          p_classroom_id: classroomId,
          p_work_name: finalWorkName,
          p_work_id: null,
          p_area: finalArea,
          p_was_correct: true, // Assumed correct — corrections will adjust
        });
        if (rpcError) {
          console.error('[PhotoInsight] update_work_accuracy RPC error:', rpcError.message);
        }
      } catch (err) {
        console.error('[PhotoInsight] update_work_accuracy exception:', err);
      }
    }

    // Determine scenario for client UI:
    // A: Unknown work (low confidence) → "Teach Guru This Work"
    // B: Standard/custom work NOT in classroom → "Add to Classroom"
    // C: In classroom but NOT on shelf → "Add to Shelf"
    // D: Happy path (in classroom + on shelf or auto-updated)
    let scenario: 'A' | 'B' | 'C' | 'D' = 'D';
    if (matchScore < 0.5) {
      scenario = 'A'; // Unknown work
    } else if (!inClassroom) {
      scenario = 'B'; // Known work, not in this classroom
    } else if (!inChildShelf && !autoUpdated) {
      scenario = 'C'; // In classroom, not on shelf
    }
    // else scenario = 'D' (happy path)

    // Build clean insight text (1 sentence observation, not verbose)
    const insightText = input.observation || 'Photo analyzed';

    // Cache in guru interactions with full structured data
    const { error: cacheError } = await supabase
      .from('montree_guru_interactions')
      .insert({
        child_id,
        classroom_id: classroomId,
        question: `photo:${media_id}`,
        question_type: 'photo_insight',
        response_insight: insightText,
        model_used: AI_MODEL,
        context_snapshot: {
          child_name: childName,
          media_id,
          photo_url: photoUrl,
          identified_work_name: finalWorkName,
          identified_area: finalArea,
          identified_work_key: finalWorkKey,
          mastery_evidence: masteryEvidence,
          sonnet_confidence: input.confidence,
          curriculum_match_score: matchScore,
          auto_updated: autoUpdated,
          scenario,
          in_classroom: inClassroom,
          in_child_shelf: inChildShelf,
          classroom_work_id: classroomWorkId,
          candidates: matchResult.candidates.map(c => ({ name: c.work.name, area: c.work.area_key, score: c.score })),
          locale,
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
      accuracy_gate_blocked: !accuracyGatePass,
      work_accuracy_ema: workAccuracy?.ema ?? null,
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
    });

  } catch (error) {
    console.error('[PhotoInsight] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze photo' },
      { status: 500 }
    );
  }
}
