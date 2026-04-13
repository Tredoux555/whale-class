// app/api/montree/children/[childId]/guru/route.ts
// Child Guru — lightweight AI chat embedded on each child's page.
// Uses Haiku for fast, cheap interactions. Streams responses via SSE.
// Can execute tools: set shelf works, update progress, save observations, search curriculum.
// Reuses existing Guru infrastructure (context-builder, tool-executor, tool-definitions).

import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { anthropic, HAIKU_MODEL } from '@/lib/ai/anthropic';
import { buildChildContext, formatContextForPrompt } from '@/lib/montree/guru/context-builder';
import { executeTool, ToolResult } from '@/lib/montree/guru/tool-executor';
import { GURU_TOOLS } from '@/lib/montree/guru/tool-definitions';
import { checkRateLimit } from '@/lib/rate-limiter';

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
const CHILD_GURU_TOOLS = GURU_TOOLS.filter(t => CHILD_GURU_TOOL_NAMES.includes(t.name));

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

function buildSystemPrompt(childContext: string, childName: string): string {
  return `You are the teacher's quick assistant for ${childName}. You live on the child's page — the teacher is looking at this child right now.

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

RULES:
- Never say "I'm an AI" or "As an AI." You're part of the app.
- If the teacher says something like "she did pouring today" — that's an observation. Save it AND update progress if a specific work is mentioned.
- If the teacher says "fill the shelf" or "put X on her shelf" — use set_focus_work.
- If the teacher asks "what should I do next?" — use get_prioritized_recommendations, then answer in plain language.
- If the teacher says "what has she been doing?" — use get_child_recent_activity.
- For notes like "Amy chose to do pouring work" — save_observation with the note text, and if a curriculum work matches, also call update_progress.
- Always use the area enum: practical_life, sensorial, mathematics, language, cultural.
- Keep responses SHORT. The teacher is standing in a classroom with 20 children.`;
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
        const { message, history } = body as {
          message: string;
          history?: Array<{ role: 'user' | 'assistant'; content: string }>;
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
        const systemPrompt = buildSystemPrompt(contextText, childContext.name);

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
                result = await executeTool(
                  block.name,
                  block.input as Record<string, unknown>,
                  childId
                );
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
            response: allActions.length > 0
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
