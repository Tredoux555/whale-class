// app/api/montree/onboarding/voice/scan-custom/route.ts
// Detects Montessori works mentioned by the teacher that are NOT in the classroom's
// standard curriculum. Used by the voice onboarding orchestrator to surface the
// agent-style "I noticed you mentioned X — should I add it?" prompt.
//
// Uses Haiku with tool_use for structured output. Cheap and fast — <$0.001/call.
//
// Fuzzy/semantic matching is the model's job: "the brown stair thing" should still
// match Brown Stair if it's in the curriculum. Only truly novel works should be
// returned in `unmatched`.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { anthropic, HAIKU_MODEL } from '@/lib/ai/anthropic';

export const maxDuration = 60;

const VALID_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'] as const;

const SCAN_TOOL = {
  name: 'identify_unmatched_works' as const,
  description:
    "Identify Montessori works the teacher mentioned in their description that are NOT in the standard classroom curriculum provided. Apply fuzzy/semantic matching liberally — \"the brown stair thing\" still matches Brown Stair, \"those pouring activities\" still matches a pouring work. Only return works that genuinely cannot be matched to the curriculum.",
  input_schema: {
    type: 'object' as const,
    properties: {
      unmatched_works: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            work_name: {
              type: 'string' as const,
              description:
                'The work name as best you can capture it. If the teacher said something vague like "rainbow stacking blocks", use that. Title-case it.',
            },
            area: {
              type: 'string' as const,
              enum: ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'],
              description:
                'Best guess at which Montessori area this work belongs to.',
            },
            teacher_phrase: {
              type: 'string' as const,
              description:
                'The exact phrase from the transcript where the teacher mentioned this work. Verbatim, max 80 characters.',
            },
            confidence: {
              type: 'number' as const,
              description:
                "0.0 to 1.0. How confident you are this is genuinely a work the teacher means to track (vs an idle mention or noise from transcription).",
            },
          },
          required: ['work_name', 'area', 'teacher_phrase', 'confidence'],
        },
        description:
          "Works that are mentioned in the transcript but NOT in the classroom's curriculum. Empty array if everything mentioned matches the curriculum.",
      },
    },
    required: ['unmatched_works'],
  },
};

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    if (!anthropic) {
      // Soft fallback — no AI = no detection, but don't break the flow
      return NextResponse.json({ success: true, unmatched: [] });
    }

    const body = await request.json();
    const { transcript, classroom_id } = body as {
      transcript?: string;
      classroom_id?: string;
    };

    const cid = classroom_id || auth.classroomId;
    const text = (transcript || '').trim();

    if (!cid) {
      return NextResponse.json({ success: true, unmatched: [] });
    }
    if (!text || text.length < 20) {
      // Too short to bother scanning
      return NextResponse.json({ success: true, unmatched: [] });
    }

    const supabase = getSupabase();

    // Fetch curriculum work names per area for context
    const { data: areas } = await supabase
      .from('montree_classroom_curriculum_areas')
      .select('id, area_key')
      .eq('classroom_id', cid);

    const typedAreas = (areas ?? []) as Array<{ id: string; area_key: string }>;
    const worksByArea: Record<string, string[]> = {};

    for (const area of typedAreas) {
      const { data: works } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('name')
        .eq('classroom_id', cid)
        .eq('area_id', area.id);

      const names = ((works ?? []) as Array<{ name: string }>).map(w => w.name);
      if (names.length > 0) {
        worksByArea[area.area_key] = names;
      }
    }

    if (Object.keys(worksByArea).length === 0) {
      // No curriculum loaded — can't compare, skip detection
      return NextResponse.json({ success: true, unmatched: [] });
    }

    const curriculumBlock = Object.entries(worksByArea)
      .map(([area, names]) => `${area}:\n  ${names.join(', ')}`)
      .join('\n\n');

    const prompt = `A teacher just described a child in their Montessori classroom by voice. The transcript may include works the child is currently focused on, plus general descriptions of strengths/weaknesses/interests.

CLASSROOM CURRICULUM (the only works in the standard curriculum):
${curriculumBlock}

TEACHER'S TRANSCRIPT:
"${text}"

TASK: Identify any specific Montessori works the teacher mentioned that are NOT in the curriculum above. Apply fuzzy and semantic matching generously — if the teacher's phrasing could plausibly match a work in the curriculum, treat it as matched and do NOT include it in unmatched. Only return works that are genuinely novel (e.g. "rainbow stacking blocks" when the curriculum has no rainbow stacking blocks; "homemade phonics game" when no such game exists in the curriculum).

If everything the teacher mentioned can be matched, return an empty array. False positives are worse than false negatives — when in doubt, treat as matched.`;

    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 1000,
      temperature: 0,
      tools: [SCAN_TOOL],
      tool_choice: { type: 'tool', name: 'identify_unmatched_works' },
      messages: [{ role: 'user', content: prompt }],
    });

    const toolBlock = response.content.find(b => b.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      console.error('[VoiceOnboarding/scan-custom] No tool_use in response');
      return NextResponse.json({ success: true, unmatched: [] });
    }

    const result = toolBlock.input as {
      unmatched_works?: Array<{
        work_name: string;
        area: string;
        teacher_phrase: string;
        confidence: number;
      }>;
    };

    const raw = result.unmatched_works ?? [];

    // Filter: confidence ≥ 0.6, valid area, name 3-60 chars
    const unmatched = raw
      .filter(w => w.confidence >= 0.6)
      .filter(w => VALID_AREAS.includes(w.area as typeof VALID_AREAS[number]))
      .filter(w => w.work_name && w.work_name.length >= 3 && w.work_name.length <= 60)
      .map(w => ({
        work_name: w.work_name,
        area: w.area,
        teacher_phrase: w.teacher_phrase,
        confidence: w.confidence,
      }));

    return NextResponse.json({ success: true, unmatched });
  } catch (err) {
    console.error('[VoiceOnboarding/scan-custom] Error:', err);
    // Soft fail — don't break the onboarding flow if scan errors
    return NextResponse.json({ success: true, unmatched: [] });
  }
}
