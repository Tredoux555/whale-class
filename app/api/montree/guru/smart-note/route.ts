// app/api/montree/guru/smart-note/route.ts
// Smart Note — Haiku parses teacher notes and fires guru tools automatically
// POST with { child_id, area, note_text }
// Returns { actions: [{ tool, message, success }] }

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { anthropic, AI_ENABLED, HAIKU_MODEL } from '@/lib/ai/anthropic';
import { executeTool } from '@/lib/montree/guru/tool-executor';
import { GURU_TOOLS } from '@/lib/montree/guru/tool-definitions';
import { loadWorksForArea } from '@/lib/montree/curriculum-loader';
import { checkRateLimit } from '@/lib/rate-limiter';

// Only expose 2 tools to Haiku — keep it fast and focused
const SMART_NOTE_TOOL_NAMES = ['update_progress', 'save_observation'];
const SMART_NOTE_TOOLS = GURU_TOOLS.filter(t => SMART_NOTE_TOOL_NAMES.includes(t.name));

const VALID_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

function buildSmartNotePrompt(
  area: string,
  currentWorks: { work_name: string; status: string; area: string }[],
  areaWorkNames: string[]
): string {
  const currentWorksStr = currentWorks.length > 0
    ? currentWorks.map(w => `- ${w.work_name} (${w.status}, ${w.area})`).join('\n')
    : '(No works currently assigned)';

  // Cap work names list to prevent token explosion
  const workNamesList = areaWorkNames.slice(0, 50).join(', ');

  return `You are a fast parser for a Montessori teacher's observation note. Your job is to detect any actionable work updates and fire the appropriate tools. Be precise and conservative.

RULES:
- If the note mentions a Montessori work being done/practiced/shown, call update_progress with the EXACT work name from the curriculum list below.
- If the note mentions a work being MASTERED or completed, call update_progress with status "mastered".
- If the note mentions a work being PRESENTED or introduced, call update_progress with status "presented".
- If the note mentions a work being PRACTICED or worked on, call update_progress with status "practicing".
- If the note describes behavior, emotions, struggles, or social dynamics WITHOUT referencing a specific curriculum work, call save_observation.
- If the note mentions MULTIPLE works, make multiple tool calls in one response.
- If the note is just a plain comment with no clear action ("had a good day"), do NOT force any tool calls — just acknowledge it.
- ONLY use work names from the curriculum list below. Do NOT invent work names.
- When matching fuzzy references ("the pink thing", "binomial"), pick the closest match from the curriculum list.

CHILD'S CURRENT WORKS:
${currentWorksStr}

CURRICULUM WORKS IN ${area.replace('_', ' ').toUpperCase()} (use exact names):
${workNamesList}

CURRICULUM WORKS IN OTHER AREAS (if the note references a work outside ${area}):
Use the area enum: practical_life, sensorial, mathematics, language, cultural`;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { child_id, area, note_text } = body;

    if (!child_id || !note_text) {
      return NextResponse.json(
        { success: false, error: 'child_id and note_text are required' },
        { status: 400 }
      );
    }

    if (note_text.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Note too long (max 2000 characters)' },
        { status: 400 }
      );
    }

    // Rate limit: 30/min per teacher
    const supabase = getSupabase();
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateCheck = await checkRateLimit(supabase, ip, 'smart-note', 30, 1);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limited', retryAfter: rateCheck.retryAfterSeconds },
        { status: 429 }
      );
    }

    // Security check
    const access = await verifyChildBelongsToSchool(child_id, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    if (!AI_ENABLED) {
      return NextResponse.json({ success: true, actions: [] });
    }

    // Get child's current works for context
    const { data: progressData } = await supabase
      .from('montree_child_progress')
      .select('work_name, status, area')
      .eq('child_id', child_id);

    const currentWorks = (progressData || []).map(w => ({
      work_name: w.work_name,
      status: w.status,
      area: w.area,
    }));

    // Get curriculum work names for the area (helps Haiku match fuzzy references)
    const normalizedArea = area === 'math' ? 'mathematics' : (area || 'practical_life');
    const areaWorks = VALID_AREAS.includes(normalizedArea)
      ? loadWorksForArea(normalizedArea)
      : [];
    const areaWorkNames = areaWorks.map(w => w.name);

    // Build prompt and call Haiku (with 10s timeout — this is a fast background call)
    const systemPrompt = buildSmartNotePrompt(normalizedArea, currentWorks, areaWorkNames);

    const haikuPromise = anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 512,
      system: systemPrompt,
      tools: SMART_NOTE_TOOLS,
      tool_choice: { type: 'auto' },
      messages: [{ role: 'user', content: note_text }],
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Smart note timeout')), 10_000)
    );

    const response = await Promise.race([haikuPromise, timeoutPromise]);

    // Execute any tool calls
    const actions: { tool: string; message: string; success: boolean }[] = [];

    const toolUseBlocks = response.content.filter(
      (b): b is Extract<typeof b, { type: 'tool_use' }> => b.type === 'tool_use'
    );

    for (const toolCall of toolUseBlocks) {
      try {
        const result = await executeTool(
          toolCall.name,
          toolCall.input as Record<string, unknown>,
          child_id
        );
        actions.push({
          tool: toolCall.name,
          message: result.message || '',
          success: result.success,
        });
      } catch (err) {
        console.error(`[Smart Note] Tool ${toolCall.name} failed:`, err);
        actions.push({
          tool: toolCall.name,
          message: 'Tool execution failed',
          success: false,
        });
      }
    }

    return NextResponse.json({ success: true, actions });
  } catch (err) {
    console.error('[Smart Note] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal error', actions: [] },
      { status: 500 }
    );
  }
}
