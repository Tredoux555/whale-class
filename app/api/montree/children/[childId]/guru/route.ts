// app/api/montree/children/[childId]/guru/route.ts
// Child Guru — lightweight AI chat embedded on each child's page.
// Uses Haiku for fast, cheap interactions. Streams responses via SSE.
// Can execute tools: set shelf works, update progress, save observations, search curriculum.
// Reuses existing Guru infrastructure (context-builder, tool-executor, tool-definitions).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { anthropic, HAIKU_MODEL } from '@/lib/ai/anthropic';
import { buildChildContext, formatContextForPrompt } from '@/lib/montree/guru/context-builder';
import { executeTool, ToolResult } from '@/lib/montree/guru/tool-executor';
import { GURU_TOOLS } from '@/lib/montree/guru/tool-definitions';
import { updateChildSettings } from '@/lib/montree/guru/settings-helper';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getAreaLabel, AREA_KEYS } from '@/lib/montree/i18n/area-labels';

export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ childId: string }>;
}

// Curated tool subset for Child Guru — 8 tools for fast, focused interactions
const CHILD_GURU_TOOL_NAMES = [
  'set_focus_work',       // Set/change shelf work for an area
  'clear_focus_work',     // Remove work from shelf area
  'update_progress',      // Change work status (presented → practicing → mastered)
  'save_observation',     // Record behavioral/learning observation
  'browse_curriculum',    // List works in an area
  'search_curriculum',    // Search works by keyword
  'get_prioritized_recommendations', // What should this child do next?
  'get_child_recent_activity',       // What has this child done recently?
];
const CHILD_GURU_TOOLS = [
  ...GURU_TOOLS.filter(t => CHILD_GURU_TOOL_NAMES.includes(t.name)),
  // Custom tool: refresh game plan (not in shared GURU_TOOLS)
  {
    name: 'refresh_game_plan',
    description: 'Refresh or update the game plan for this child. Call this when the teacher asks to update, change, or regenerate the game plan.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [] as string[],
    },
  },
];

// Strip markdown formatting — keep it feeling like a human chat
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold** → bold
    .replace(/\*(.+?)\*/g, '$1')        // *italic* → italic
    .replace(/__(.+?)__/g, '$1')        // __bold__ → bold
    .replace(/_(.+?)_/g, '$1')          // _italic_ → italic
    .replace(/^#+\s+/gm, '')            // ### headers → plain
    .replace(/^[-*]\s+/gm, '')          // - bullets → plain
    .replace(/^\d+\.\s+/gm, '')         // 1. numbered → plain
    .replace(/`(.+?)`/g, '$1');         // `code` → code
}

// In-process game plan refresh — avoids Railway internal fetch SSL errors
async function refreshGamePlanInProcess(
  supabase: ReturnType<typeof getSupabase>,
  childId: string,
  locale?: string,
): Promise<ToolResult> {
  try {
    if (!anthropic) return { success: false, message: 'AI not configured' };

    const isZh = locale === 'zh';

    // Fetch child + existing game plan + profile + progress
    const [childResult, profileResult, progressResult, notesResult] = await Promise.all([
      supabase.from('montree_children').select('name, date_of_birth, settings').eq('id', childId).maybeSingle(),
      supabase.from('montree_child_mental_profiles').select('*').eq('child_id', childId).maybeSingle(),
      supabase.from('montree_child_progress').select('work_name, area, status').eq('child_id', childId),
      supabase.from('montree_teacher_notes').select('content, created_at').eq('child_id', childId).order('created_at', { ascending: false }).limit(5),
    ]);

    const child = childResult.data as { name: string; date_of_birth: string | null; settings: Record<string, unknown> } | null;
    if (!child) return { success: false, message: 'Child not found' };

    const existingPlan = child.settings?.game_plan as Record<string, unknown> | undefined;
    const profile = profileResult.data as {
      family_notes?: string | null;
      special_considerations?: string | null;
    } | null;
    const progress = (progressResult.data || []) as Array<{ work_name: string; area: string; status: string }>;
    const notes = (notesResult.data || []) as Array<{ content: string; created_at: string }>;

    // Build progress summary
    const progressByArea: Record<string, { mastered: string[]; practicing: string[]; presented: string[] }> = {};
    for (const p of progress) {
      if (!progressByArea[p.area]) progressByArea[p.area] = { mastered: [], practicing: [], presented: [] };
      const bucket = p.status === 'mastered' ? 'mastered' : p.status === 'practicing' ? 'practicing' : 'presented';
      progressByArea[p.area][bucket].push(p.work_name);
    }

    const progressSummary = Object.entries(progressByArea)
      .map(([area, data]) => {
        const parts = [];
        if (data.mastered.length) parts.push(`mastered: ${data.mastered.join(', ')}`);
        if (data.practicing.length) parts.push(`practicing: ${data.practicing.join(', ')}`);
        if (data.presented.length) parts.push(`presented: ${data.presented.join(', ')}`);
        return `${area}: ${parts.join(' | ')}`;
      })
      .join('\n');

    const recentNotes = notes
      .map(n => `[${new Date(n.created_at).toLocaleDateString()}] ${n.content}`)
      .join('\n');

    const previousNudge = existingPlan?.nudge || existingPlan?.headline || '';
    const previousWorks = existingPlan?.works || [];

    // ── Load curriculum constraint list (mirrors game-plan/refresh/route.ts) ──
    const { data: accessData } = await supabase
      .from('montree_children')
      .select('classroom_id')
      .eq('id', childId)
      .maybeSingle();
    const classroomId = (accessData as { classroom_id?: string } | null)?.classroom_id;

    let availableWorksList = '';
    if (classroomId) {
      const [areasRes, worksRes] = await Promise.all([
        supabase
          .from('montree_classroom_curriculum_areas')
          .select('id, area_key')
          .eq('classroom_id', classroomId),
        supabase
          .from('montree_classroom_curriculum_works')
          .select('name, name_chinese, area_id')
          .eq('classroom_id', classroomId),
      ]);

      const promptAreaIdToKey: Record<string, string> = {};
      for (const a of (areasRes.data || []) as Array<{ id: string; area_key: string }>) {
        promptAreaIdToKey[a.id] = a.area_key;
      }
      const worksByArea: Record<string, string[]> = {};
      for (const w of (worksRes.data || []) as Array<{ name: string; name_chinese: string | null; area_id: string }>) {
        const areaKey = promptAreaIdToKey[w.area_id];
        if (!areaKey) continue;
        if (!worksByArea[areaKey]) worksByArea[areaKey] = [];
        worksByArea[areaKey].push(isZh && w.name_chinese ? w.name_chinese : w.name);
      }
      availableWorksList = Object.entries(worksByArea)
        .map(([area, works]) => `[${getAreaLabel(area, isZh ? 'zh' : 'en')}] ${works.join(isZh ? '、' : ', ')}`)
        .join('\n');
    }

    const GAME_PLAN_TOOL = {
      name: 'create_game_plan' as const,
      description: 'Create a brief, warm game plan nudge for a tired teacher.',
      input_schema: {
        type: 'object' as const,
        properties: {
          nudge: { type: 'string' as const, description: 'One warm sentence. Max 25 words.' },
          works: { type: 'array' as const, items: { type: 'string' as const }, description: '3-5 specific works.' },
          direction: { type: 'string' as const, description: 'Area progression in arrow format, using locale-appropriate area names.' },
        },
        required: ['nudge', 'works', 'direction'] as string[],
      },
    };

    const prompt = `Update a child's game plan based on their progress. Keep it brief — one sentence a tired teacher reads in 2 seconds.
${isZh ? `\nIMPORTANT: Respond ENTIRELY in Chinese (中文).
- Write the nudge in Chinese.
- Write the direction using Chinese area names: 日常, 感官, 数学, 语言, 文化.
- Use the EXACT Chinese work names from the AVAILABLE WORKS list below.
- Direction example: "日常 → 感官 → 语言"\n` : ''}
CHILD: ${child.name}
PREVIOUS NUDGE: "${previousNudge}"
PREVIOUS WORKS: ${JSON.stringify(previousWorks)}

${progressSummary ? `PROGRESS:\n${progressSummary}` : 'No progress data yet.'}
${recentNotes ? `RECENT NOTES:\n${recentNotes}` : ''}
${profile?.family_notes ? `FAMILY: ${profile.family_notes}` : ''}
${availableWorksList ? `\nAVAILABLE WORKS IN THIS CLASSROOM — pick from this list using EXACT names:\n${availableWorksList}\n` : ''}
What should the teacher focus on NEXT? Acknowledge progress if any. Pick 3-5 new works that build on what's been done.${isZh ? ' Direction arrow must use Chinese area names (日常, 感官, 数学, 语言, 文化).' : ''}`;

    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 500,
      tools: [GAME_PLAN_TOOL],
      tool_choice: { type: 'tool', name: 'create_game_plan' },
      messages: [{ role: 'user', content: prompt }],
    });

    const toolBlock = response.content.find(b => b.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      return { success: false, message: 'AI generation failed' };
    }

    const plan = toolBlock.input as Record<string, unknown>;
    const updatedPlan = {
      ...plan,
      generated_at: existingPlan?.generated_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      child_name: child.name,
      source: 'refresh',
    };

    await updateChildSettings(childId, { game_plan: updatedPlan });
    console.log(`[ChildGuru] Game plan refreshed in-process for ${child.name}`);

    return { success: true, message: 'Game plan updated' };
  } catch (err) {
    console.error('[ChildGuru] In-process game plan refresh error:', err);
    return { success: false, message: 'Failed to refresh game plan' };
  }
}

interface RecentPhotoHint {
  media_id: string;
  seconds_ago: number;
  work_name?: string | null;
  area?: string | null;
}

function buildSystemPrompt(
  childContext: string,
  childName: string,
  locale?: string,
  recentPhoto?: RecentPhotoHint | null
): string {
  const isZh = locale === 'zh';
  const photoBlock = recentPhoto
    ? `\nRECENT PHOTO CONTEXT:
- The teacher captured a photo of ${childName} ${recentPhoto.seconds_ago}s ago.
- media_id: ${recentPhoto.media_id}
${recentPhoto.work_name ? `- AI-drafted work: ${recentPhoto.work_name}${recentPhoto.area ? ` (${recentPhoto.area})` : ''}\n` : ''}- If the teacher is narrating what they just saw ("she was concentrating," "he nailed it today," "frustrated on the pouring work"), this is an observation ABOUT that photo. Call save_observation and include source_media_id: "${recentPhoto.media_id}" so the note links to the photo in the gallery.
- If the teacher's command is unrelated to the photo (e.g. "update the game plan"), DO NOT pass source_media_id.
`
    : '';
  return `You are the teacher's quick assistant for ${childName}. You live on the child's page — the teacher is looking at this child right now.
${isZh ? '\nLANGUAGE: Reply in Chinese (中文). Use Montessori work names in Chinese where possible. Keep the same warm, brief tone.\n' : ''}
PERSONALITY:
- Brief. Warm. Practical. Like a colleague who whispers the answer.
- Responses: 1-3 sentences max unless the teacher asks for detail.
- NEVER use markdown formatting — no **bold**, no *italics*, no bullet points, no headers. Write plain conversational text only. You're chatting, not writing a document.
- When recommending works, use EXACT curriculum names.
- When the teacher describes something the child did, save it as an observation automatically.
- When the teacher asks to change the shelf or update progress, do it immediately with tools.
- When you make a tool call, confirm what you did in one short sentence.

WHAT YOU KNOW ABOUT ${childName.toUpperCase()}:
${childContext}
${photoBlock}
RULES:
- Never say "I'm an AI" or "As an AI." You're part of the app.
- If the teacher says something like "she did pouring today" — that's an observation. Save it AND update progress if a specific work is mentioned.
- If the teacher says "fill the shelf" or "put X on her shelf" — use set_focus_work.
- If the teacher asks "what should I do next?" — use get_prioritized_recommendations, then answer in plain language.
- If the teacher says "what has she been doing?" — use get_child_recent_activity.
- If the teacher asks to "update the game plan" or "refresh the plan" or "new game plan" — use refresh_game_plan.
- For notes like "Amy chose to do pouring work" — save_observation with the note text, and if a curriculum work matches, also call update_progress.
- Always use the area enum: practical_life, sensorial, mathematics, language, cultural.${isZh ? '\n- When mentioning area names to the teacher, use Chinese: 日常, 感官, 数学, 语言, 文化.' : ''}
- Keep responses SHORT. The teacher is standing in a classroom with 20 children.`;
}

// Look up the most recent photo/video captured for this child in the last 90 seconds.
// Used to let the teacher link voice observations to the photo they just took.
// Also checks montree_media_children for group photos where this child was tagged.
async function loadRecentPhotoHint(
  supabase: ReturnType<typeof getSupabase>,
  childId: string,
  locale?: string,
): Promise<RecentPhotoHint | null> {
  const isZh = locale === 'zh';
  const windowSeconds = 90;
  const cutoffIso = new Date(Date.now() - windowSeconds * 1000).toISOString();
  try {
    // Direct single-child photos
    const { data: direct } = await supabase
      .from('montree_media')
      .select('id, captured_at, work_id')
      .eq('child_id', childId)
      .gte('captured_at', cutoffIso)
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Group photos via junction table
    const { data: groupJoin } = await supabase
      .from('montree_media_children')
      .select('media_id, montree_media(id, captured_at, work_id)')
      .eq('child_id', childId)
      .limit(5);

    let best: { id: string; captured_at: string; work_id: string | null } | null = direct
      ? { id: direct.id, captured_at: direct.captured_at, work_id: direct.work_id ?? null }
      : null;

    if (Array.isArray(groupJoin)) {
      for (const row of groupJoin as Array<{ media_id: string; montree_media?: { id: string; captured_at: string; work_id: string | null } | null }>) {
        const m = row.montree_media;
        if (!m?.captured_at) continue;
        if (new Date(m.captured_at).getTime() < Date.now() - windowSeconds * 1000) continue;
        if (!best || new Date(m.captured_at).getTime() > new Date(best.captured_at).getTime()) {
          best = { id: m.id, captured_at: m.captured_at, work_id: m.work_id ?? null };
        }
      }
    }

    if (!best) return null;

    const secondsAgo = Math.max(1, Math.round((Date.now() - new Date(best.captured_at).getTime()) / 1000));
    let workName: string | null = null;
    let areaKey: string | null = null;
    if (best.work_id) {
      const { data: work } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('name, name_chinese, area_id')
        .eq('id', best.work_id)
        .maybeSingle() as { data: { name: string; name_chinese: string | null; area_id: string | null } | null };
      if (work?.name) workName = (isZh && work.name_chinese) ? work.name_chinese : work.name;
      if (work?.area_id) {
        const { data: area } = await supabase
          .from('montree_classroom_curriculum_areas')
          .select('area_key')
          .eq('id', work.area_id)
          .maybeSingle();
        if (area?.area_key) areaKey = area.area_key;
      }
    }

    return { media_id: best.id, seconds_ago: secondsAgo, work_name: workName, area: areaKey };
  } catch (err) {
    console.warn('[ChildGuru] loadRecentPhotoHint failed (non-fatal):', err);
    return null;
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const encoder = new TextEncoder();

  // SSE helper
  function sseEvent(type: string, data: unknown): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify({ type, ...((typeof data === 'object' && data !== null) ? data : { content: data }) })}\n\n`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // --- Auth ---
        const auth = await verifySchoolRequest(request);
        if (auth instanceof Response) {
          controller.enqueue(sseEvent('error', { message: 'Authentication failed' }));
          controller.close();
          return;
        }

        const { childId } = await context.params;
        const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
        if (!access.allowed) {
          controller.enqueue(sseEvent('error', { message: 'Access denied' }));
          controller.close();
          return;
        }

        // --- Rate limit ---
        const supabase = getSupabase();
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateCheck = await checkRateLimit(supabase, ip, 'child-guru', 60, 1);
        if (!rateCheck.allowed) {
          controller.enqueue(sseEvent('error', { message: 'Rate limited. Try again shortly.' }));
          controller.close();
          return;
        }

        // --- Parse body ---
        const body = await request.json();
        const { message, history, locale } = body as {
          message: string;
          history?: Array<{ role: 'user' | 'assistant'; content: string }>;
          locale?: string;
        };

        if (!message?.trim()) {
          controller.enqueue(sseEvent('error', { message: 'No message provided' }));
          controller.close();
          return;
        }

        if (!anthropic) {
          controller.enqueue(sseEvent('error', { message: 'AI not configured' }));
          controller.close();
          return;
        }

        // --- Build context ---
        controller.enqueue(sseEvent('status', { phase: 'thinking' }));

        const childContext = await buildChildContext(supabase, childId);
        if (!childContext) {
          controller.enqueue(sseEvent('error', { message: 'Could not load child data' }));
          controller.close();
          return;
        }

        const contextText = formatContextForPrompt(childContext);
        const recentPhoto = await loadRecentPhotoHint(supabase, childId, locale);
        const systemPrompt = buildSystemPrompt(contextText, childContext.name, locale, recentPhoto);

        // --- Build messages (last 10 turns max to keep tokens low) ---
        const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
        if (history?.length) {
          const recentHistory = history.slice(-10);
          for (const msg of recentHistory) {
            if (msg.role === 'user' || msg.role === 'assistant') {
              messages.push({ role: msg.role, content: msg.content });
            }
          }
        }
        messages.push({ role: 'user', content: message });

        // --- Call Haiku with tools (up to 3 rounds for multi-tool chains) ---
        let currentMessages = [...messages];
        let round = 0;
        const MAX_ROUNDS = 3;
        const allActions: Array<{ tool: string; result: ToolResult }> = [];
        let responseText = ''; // Accumulate AI text across rounds for logging

        while (round < MAX_ROUNDS) {
          round++;

          const response = await anthropic.messages.create({
            model: HAIKU_MODEL,
            max_tokens: 1024,
            system: systemPrompt,
            tools: CHILD_GURU_TOOLS,
            tool_choice: { type: 'auto' },
            messages: currentMessages,
          });

          // Process content blocks
          let hasToolUse = false;
          const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = [];
          let textContent = '';

          for (const block of response.content) {
            if (block.type === 'text') {
              textContent += block.text;
            } else if (block.type === 'tool_use') {
              hasToolUse = true;

              // Execute the tool
              let result: ToolResult;
              try {
                // Custom handler for refresh_game_plan — in-process (no internal fetch)
                if (block.name === 'refresh_game_plan') {
                  result = await refreshGamePlanInProcess(supabase, childId, locale);
                } else {
                  result = await executeTool(
                    block.name,
                    block.input as Record<string, unknown>,
                    childId
                  );
                }
              } catch (err) {
                console.error(`[ChildGuru] Tool ${block.name} error:`, err);
                result = { success: false, message: `Tool ${block.name} failed` };
              }

              allActions.push({ tool: block.name, result });

              // Stream the action to the client
              controller.enqueue(sseEvent('action', {
                tool: block.name,
                success: result.success,
                message: result.message,
              }));

              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(result),
              });
            }
          }

          // If there was text, strip markdown and stream it out
          if (textContent) {
            const cleaned = stripMarkdown(textContent);
            responseText += cleaned;
            controller.enqueue(sseEvent('text', { content: cleaned }));
          }

          // If there were tool calls, feed results back and continue the loop
          if (hasToolUse && toolResults.length > 0) {
            // Build the assistant message with all content blocks for the next round
            currentMessages = [
              ...currentMessages,
              { role: 'assistant' as const, content: response.content as unknown as string },
              { role: 'user' as const, content: toolResults as unknown as string },
            ];
            continue;
          }

          // No more tool calls — we're done
          break;
        }

        // --- Save interaction to DB (fire and forget) ---
        try {
          await supabase.from('montree_guru_interactions').insert({
            child_id: childId,
            school_id: auth.schoolId,
            classroom_id: childContext.classroom_id,
            question: message,
            question_type: 'child_guru',
            response_insight: allActions.length > 0
              ? `[Actions: ${allActions.map(a => `${a.tool}(${a.result.success ? '✓' : '✗'})`).join(', ')}] ${responseText.slice(0, 500)}`
              : responseText.slice(0, 500) || 'chat response',
            model_used: HAIKU_MODEL,
            asked_at: new Date().toISOString(),
          });
        } catch (err) {
          console.error('[ChildGuru] Failed to save interaction:', err);
        }

        // --- Done ---
        controller.enqueue(sseEvent('done', { actions: allActions.map(a => ({ tool: a.tool, success: a.result.success, message: a.result.message })) }));
        controller.close();
      } catch (err) {
        console.error('[ChildGuru] Stream error:', err);
        try {
          controller.enqueue(sseEvent('error', { message: 'Something went wrong' }));
          controller.close();
        } catch {
          // Stream already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// --- GET: Load chat history for this child ---
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof Response) return auth;

    const { childId } = await context.params;
    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('montree_guru_interactions')
      .select('question, response_insight, asked_at')
      .eq('child_id', childId)
      .eq('question_type', 'child_guru')
      .order('asked_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('[ChildGuru] Failed to load history:', error);
      return NextResponse.json({ messages: [] });
    }

    // Convert DB rows to chat message pairs
    const messages = (data || []).flatMap((row, i) => [
      { id: `h-user-${i}`, role: 'user', content: row.question, timestamp: row.asked_at },
      { id: `h-asst-${i}`, role: 'assistant', content: row.response_insight || '', timestamp: row.asked_at },
    ]);

    return NextResponse.json({ messages }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[ChildGuru] GET error:', err);
    return NextResponse.json({ messages: [] });
  }
}
