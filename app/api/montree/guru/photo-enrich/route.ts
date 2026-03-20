// app/api/montree/guru/photo-enrich/route.ts
// SLIM Haiku enrichment for photos where work is ALREADY IDENTIFIED (e.g., by CLIP)
// Since work is known, we skip the expensive vision+matching pipeline
// (~800 tokens vs ~4000 in photo-insight — 5x cheaper, 3-5x faster)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getPublicUrl } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { anthropic, AI_ENABLED, HAIKU_MODEL } from '@/lib/ai/anthropic';
import { loadAllCurriculumWorks, type CurriculumWork } from '@/lib/montree/curriculum-loader';
import { checkRateLimit } from '@/lib/rate-limiter';

// Simplified tool schema — work is already known, just assess mastery
const PHOTO_ENRICH_TOOL = {
  name: 'assess_mastery' as const,
  description: 'Assess the child\'s mastery level based on visual evidence in the photo of the known work.',
  input_schema: {
    type: 'object' as const,
    properties: {
      mastery_evidence: {
        type: 'string',
        enum: ['mastered', 'practicing', 'presented', 'unclear'],
        description: 'Evidence of mastery level based on visible technique and independence.',
      },
      confidence: {
        type: 'number',
        description: 'Confidence in mastery assessment (0.0 to 1.0). 0.9+ = very clear, 0.5-0.8 = moderate, <0.5 = uncertain.',
      },
      observation: {
        type: 'string',
        description: 'Warm 1-sentence observation about technique, concentration, or progress.',
      },
      suggested_crop: {
        type: 'object',
        description: 'Optional crop suggestion (normalized 0.0-1.0 coordinates). Omit if not needed.',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
          width: { type: 'number' },
          height: { type: 'number' },
        },
        required: ['x', 'y', 'width', 'height'],
      },
    },
    required: ['mastery_evidence', 'confidence', 'observation'],
  },
};

const VALID_MASTERY = ['mastered', 'practicing', 'presented', 'unclear'];
const STATUS_RANK: Record<string, number> = {
  'not_started': 0,
  'presented': 1,
  'practicing': 2,
  'mastered': 3,
};
const AUTO_UPDATE_THRESHOLD = 0.95;

interface EnrichRequest {
  media_id: string;
  child_id: string;
  work_key: string;
  work_name: string;
  area_key: string;
  clip_confidence: number;
  locale?: string;
}

function validateToolOutput(rawInput: Record<string, unknown>) {
  let suggested_crop: { x: number; y: number; width: number; height: number } | null = null;

  if (rawInput.suggested_crop && typeof rawInput.suggested_crop === 'object') {
    const crop = rawInput.suggested_crop as Record<string, unknown>;
    const x = typeof crop.x === 'number' ? Math.max(0, Math.min(1, crop.x)) : null;
    const y = typeof crop.y === 'number' ? Math.max(0, Math.min(1, crop.y)) : null;
    const w = typeof crop.width === 'number' ? Math.max(0.1, Math.min(1, crop.width)) : null;
    const h = typeof crop.height === 'number' ? Math.max(0.1, Math.min(1, crop.height)) : null;

    if (x !== null && y !== null && w !== null && h !== null) {
      suggested_crop = {
        x: Math.min(x, 1 - w),
        y: Math.min(y, 1 - h),
        width: w,
        height: h,
      };
    }
  }

  return {
    mastery_evidence:
      typeof rawInput.mastery_evidence === 'string' && VALID_MASTERY.includes(rawInput.mastery_evidence)
        ? rawInput.mastery_evidence
        : 'unclear',
    confidence: typeof rawInput.confidence === 'number' ? Math.max(0, Math.min(1, rawInput.confidence)) : 0,
    observation: typeof rawInput.observation === 'string' ? rawInput.observation.trim().slice(0, 500) : '',
    suggested_crop,
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const ip = request.headers.get('x-forwarded-for') || 'unknown';

    let rateLimitAllowed = true;
    try {
      const result = await checkRateLimit(supabase, ip, '/api/montree/guru/photo-enrich', 120, 60);
      rateLimitAllowed = result.allowed;
    } catch {
      // Fallback: allow on DB error (fail open)
      rateLimitAllowed = true;
    }

    if (!rateLimitAllowed) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = (await request.json()) as EnrichRequest;
    const { media_id, child_id, work_key, work_name, area_key } = body;
    const clip_confidence = Math.max(0, Math.min(1, Number(body.clip_confidence) || 0));
    const locale = ['en', 'zh'].includes(body.locale) ? body.locale : 'en';

    if (!media_id || !child_id || !work_key || !work_name || !area_key) {
      return NextResponse.json(
        { success: false, error: 'media_id, child_id, work_key, work_name, area_key required' },
        { status: 400 }
      );
    }

    const access = await verifyChildBelongsToSchool(child_id, auth.schoolId);
    if (!access.allowed || !access.classroomId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    if (!AI_ENABLED || !anthropic) {
      return NextResponse.json({ success: false, error: 'AI features are not enabled' }, { status: 503 });
    }

    // Fetch photo URL
    const { data: media } = await supabase
      .from('montree_media')
      .select('storage_path, media_type, child_id')
      .eq('id', media_id)
      .maybeSingle();

    if (!media?.storage_path) {
      return NextResponse.json({ success: false, error: 'Photo not found' }, { status: 404 });
    }

    if (media.child_id && media.child_id !== child_id) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Fetch child context (name, age only — no curriculum scanning)
    const { data: childData } = await supabase
      .from('montree_children')
      .select('name, age')
      .eq('id', child_id)
      .maybeSingle();

    if (!childData) {
      return NextResponse.json({ success: false, error: 'Child not found' }, { status: 404 });
    }

    // Get materials from curriculum
    const allWorks = loadAllCurriculumWorks();
    const workRecord = allWorks.find(
      w => w.work_key === work_key && w.area_key === area_key
    );
    const materials = workRecord?.materials || [];

    // Build photo URL
    const photoUrl = getPublicUrl('montree-media', media.storage_path);
    if (!photoUrl.startsWith('http')) {
      return NextResponse.json({ success: false, error: 'Photo URL not accessible' }, { status: 400 });
    }

    // Call Haiku with SLIM prompt (~800 tokens instead of ~4000)
    const childName = childData.name || 'the child';
    const ageYears = childData.age ? Math.floor(childData.age / 12) : 3;

    const systemPrompt = `You are observing ${childName} (age ${ageYears}) working with ${work_name} in the ${area_key.replace(/_/g, ' ')} area.

Materials used: ${materials.slice(0, 3).join(', ') || 'standard Montessori materials'}.

Assess their mastery level based on visible evidence:
- "mastered": completed correctly, independently, with precision
- "practicing": actively working, trying different approaches, some errors
- "presented": appears to be first exposure to the work
- "unclear": cannot determine from the photo

Write ONE warm observation (encourage, note technique, or progress).
Suggest a crop if it would nicely frame the child and material together.`;

    const abortController = new AbortController();
    const timeoutHandle = setTimeout(() => abortController.abort(), 15_000);

    try {
      const response = await anthropic.messages.create(
        {
          model: HAIKU_MODEL,
          max_tokens: 256,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'url',
                    url: photoUrl,
                  },
                },
                {
                  type: 'text',
                  text: 'Assess this child\'s mastery using the tool.',
                },
              ],
            },
          ],
          tools: [PHOTO_ENRICH_TOOL],
          tool_choice: { type: 'tool', name: 'assess_mastery' },
        },
        { signal: abortController.signal }
      );

      clearTimeout(timeoutHandle);

      // Extract tool use result
      const toolBlock = response.content.find(block => block.type === 'tool_use');
      if (!toolBlock || toolBlock.type !== 'tool_use') {
        return NextResponse.json({ success: false, error: 'No mastery assessment produced' }, { status: 500 });
      }

      const validated = validateToolOutput(toolBlock.input as Record<string, unknown>);
      const confidence_final = validated.confidence;
      const mastery_evidence = validated.mastery_evidence;

      // Determine scenario: work already identified, check if in classroom curriculum
      const { data: classroomWork } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('id, name')
        .eq('classroom_id', access.classroomId)
        .eq('name', work_name)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      const in_classroom = !!classroomWork?.id;
      const classroom_work_id = classroomWork?.id || null;

      // Check if on child's focus shelf
      const { data: shelfWork } = await supabase
        .from('montree_child_focus_works')
        .select('id')
        .eq('child_id', child_id)
        .eq('work_name', work_name)
        .limit(1)
        .maybeSingle();

      const in_child_shelf = !!shelfWork?.id;

      // Scenario logic: work is already known (not A)
      let scenario: 'A' | 'B' | 'C' | 'D';
      if (!in_classroom) {
        scenario = 'B'; // Not in classroom curriculum
      } else if (!in_child_shelf) {
        scenario = 'C'; // Not on child's shelf
      } else {
        scenario = 'D'; // All good
      }

      // Auto-update: GREEN zone only (≥0.95 confidence AND ≥0.95 CLIP confidence AND in_classroom)
      let auto_updated = false;
      let needs_confirmation = false;

      if (confidence_final >= AUTO_UPDATE_THRESHOLD && clip_confidence >= AUTO_UPDATE_THRESHOLD && in_classroom) {
        // GREEN zone: auto-update progress (upgrade-only protection)
        const { data: currentProgress } = await supabase
          .from('montree_child_progress')
          .select('status')
          .eq('child_id', child_id)
          .eq('work_name', work_name)
          .maybeSingle();

        const currentStatus = currentProgress?.status || 'not_started';
        const currentRank = STATUS_RANK[currentStatus] || 0;
        const newRank = STATUS_RANK[mastery_evidence] || currentRank;

        if (newRank > currentRank) {
          await supabase
            .from('montree_child_progress')
            .upsert(
              {
                child_id,
                work_name,
                status: mastery_evidence,
                area: area_key,
              },
              { onConflict: 'child_id,work_name' }
            );
          auto_updated = true;
        }
      } else if (confidence_final >= 0.5 && clip_confidence >= 0.5 && in_classroom) {
        needs_confirmation = true; // AMBER zone
      }

      // Tag media with work_id
      if (classroom_work_id) {
        await supabase.from('montree_media').update({ work_id: classroom_work_id }).eq('id', media_id);
      }

      // Save interaction (for analytics + caching)
      const context_snapshot = {
        classification_method: 'clip_enriched',
        clip_confidence,
        haiku_confidence: confidence_final,
        identified_work_name: work_name,
        identified_area: area_key,
        mastery_evidence,
        scenario,
        in_classroom,
        in_child_shelf,
        classroom_work_id,
        needs_confirmation,
      };

      await supabase.from('montree_guru_interactions').insert({
        child_id,
        question_type: 'photo_enrich',
        question: `photo-enrich:${media_id}:${locale}`,
        response_insight: validated.observation,
        mode: 'enrich',
        context_snapshot,
        model_used: HAIKU_MODEL,
      });

      return NextResponse.json({
        success: true,
        insight: validated.observation,
        work_name,
        area: area_key,
        mastery_evidence,
        auto_updated,
        needs_confirmation,
        confidence_final,
        clip_confidence,
        scenario,
        in_classroom,
        in_child_shelf,
        classroom_work_id,
        suggested_crop: validated.suggested_crop,
      });
    } finally {
      clearTimeout(timeoutHandle);
      abortController.abort();
    }
  } catch (error) {
    console.error('[PhotoEnrich] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
