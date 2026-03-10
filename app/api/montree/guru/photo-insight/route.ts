// app/api/montree/guru/photo-insight/route.ts
// Smart Capture — Sonnet vision analyzes a child's photo
// Returns structured data: work name, area, mastery status, brief observation
// Auto-updates: media tagging (work_id) + progress (teacher can override)
// "Self-driving car" model: Guru auto-manages, teacher can override anytime via shelf

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { anthropic, AI_ENABLED, AI_MODEL } from '@/lib/ai/anthropic';
import { loadAllCurriculumWorks, type CurriculumWork } from '@/lib/montree/curriculum-loader';
import { fuzzyScore } from '@/lib/montree/work-matching';

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

// Match Sonnet's identified work to curriculum
function matchToCurriculum(
  identifiedName: string,
  curriculum: CurriculumWork[]
): { work: CurriculumWork | null; confidence: number } {
  if (!identifiedName) return { work: null, confidence: 0 };

  let bestWork: CurriculumWork | null = null;
  let bestScore = 0;

  for (const w of curriculum) {
    const score = fuzzyScore(identifiedName, w.name);
    if (score > bestScore) {
      bestScore = score;
      bestWork = w;
    }
    // Also try Chinese name
    if (w.chineseName) {
      const cnScore = fuzzyScore(identifiedName, w.chineseName);
      if (cnScore > bestScore) {
        bestScore = cnScore;
        bestWork = w;
      }
    }
  }

  return { work: bestWork, confidence: bestScore };
}

// Status rank for upgrade-only protection
const STATUS_RANK: Record<string, number> = {
  'not_started': 0, 'presented': 1, 'practicing': 2, 'mastered': 3,
};

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
      // Return cached structured response
      const snapshot = (cached.context_snapshot as Record<string, unknown>) || {};
      return NextResponse.json({
        success: true,
        insight: cached.response_insight,
        work_name: snapshot.identified_work_name || null,
        area: snapshot.identified_area || null,
        mastery_evidence: snapshot.mastery_evidence || null,
        auto_updated: snapshot.auto_updated || false,
        confidence: snapshot.sonnet_confidence || null,
      });
    }

    if (!AI_ENABLED || !anthropic) {
      return NextResponse.json({ success: false, error: 'AI features are not enabled' }, { status: 503 });
    }

    // Fetch the photo URL
    const { data: media } = await supabase
      .from('montree_media')
      .select('file_url, media_type, child_id')
      .eq('id', media_id)
      .maybeSingle();

    if (!media?.file_url) {
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

    // Validate URL is proper HTTP(S)
    const photoUrl = media.file_url;
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

    // Load curriculum for matching
    let curriculum: CurriculumWork[] = [];
    try {
      curriculum = loadAllCurriculumWorks();
    } catch (err) {
      console.error('[PhotoInsight] Failed to load curriculum:', err);
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

    // Locale-aware system prompt
    const langInstruction = locale === 'zh'
      ? 'Write the observation in Simplified Chinese.'
      : 'Write the observation in English.';

    const systemPrompt = `You are a Montessori classroom expert analyzing a photo of a child working. Use the tag_photo tool to identify and tag the work.

${langInstruction}

IMPORTANT:
- Identify the SPECIFIC Montessori work name (e.g., "Color Box 2", "Pink Tower", "Sandpaper Letters")
- Match to standard curriculum names when possible
- Assess mastery based on visual evidence: correct completion = mastered, active work with some errors = practicing
- Keep the observation to ONE warm, specific sentence about technique or concentration
- If you cannot identify the work, describe what you see and set confidence low
${curriculumHint}`;

    // Call Sonnet with vision + tool_use
    const message = await anthropic.messages.create({
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

    // Match to curriculum for canonical work name + area
    const curriculumMatch = matchToCurriculum(input.work_name, curriculum);
    const finalWorkName = curriculumMatch.confidence >= 0.5 && curriculumMatch.work
      ? curriculumMatch.work.name
      : input.work_name;
    const finalArea = curriculumMatch.confidence >= 0.5 && curriculumMatch.work
      ? curriculumMatch.work.area_key
      : (input.area !== 'unknown' ? input.area : null);
    const finalWorkKey = curriculumMatch.confidence >= 0.5 && curriculumMatch.work
      ? curriculumMatch.work.work_key
      : null;

    // Determine if we should auto-update progress
    const validStatuses = ['mastered', 'practicing', 'presented'];
    const masteryEvidence = validStatuses.includes(input.mastery_evidence)
      ? input.mastery_evidence
      : null;

    // Auto-update threshold: high confidence work match + clear mastery evidence
    const shouldAutoUpdate = (
      curriculumMatch.confidence >= 0.7 &&
      input.confidence >= 0.7 &&
      masteryEvidence !== null
    );

    let autoUpdated = false;

    // Update media record work_id for gallery tagging
    // montree_media has work_id column (not work_name/area) — gallery computes names from curriculum lookup
    if (finalWorkName && classroomId) {
      try {
        // Look up the classroom curriculum work ID by name to get the UUID
        const { data: currWork } = await supabase
          .from('montree_classroom_curriculum_works')
          .select('id')
          .eq('classroom_id', classroomId)
          .eq('name', finalWorkName)
          .limit(1)
          .maybeSingle();

        if (currWork?.id) {
          const { error: mediaUpdateError } = await supabase
            .from('montree_media')
            .update({
              work_id: currWork.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', media_id);

          if (mediaUpdateError) {
            console.error('[PhotoInsight] Failed to update media work_id:', mediaUpdateError);
          }
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
          curriculum_match_confidence: curriculumMatch.confidence,
          auto_updated: autoUpdated,
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
      confidence: Math.min(input.confidence, curriculumMatch.confidence >= 0.5 ? curriculumMatch.confidence : input.confidence),
    });

  } catch (error) {
    console.error('[PhotoInsight] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze photo' },
      { status: 500 }
    );
  }
}
