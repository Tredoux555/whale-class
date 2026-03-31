// app/api/montree/admin/guru/chat/route.ts
// Principal Admin Guru API route — school-scoped AI copilot with SSE streaming
// Uses verifySchoolRequest() for auth (httpOnly cookie), role must be 'principal'
// Multi-round tool execution loop, no destructive operations

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type {
  MessageParam,
  ContentBlockParam,
  ToolResultBlockParam,
} from '@anthropic-ai/sdk/resources/messages';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { buildPrincipalGuruPrompt } from '@/lib/montree/admin/guru-prompt';
import {
  PRINCIPAL_GURU_TOOLS,
  ALLOWED_PRINCIPAL_TABLES,
  DESTRUCTIVE_PRINCIPAL_TOOLS,
} from '@/lib/montree/admin/guru-tools';
import { executePrincipalTool } from '@/lib/montree/admin/guru-executor';
import { getSupabase } from '@/lib/supabase-client';

const client = new Anthropic();
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOOL_ROUNDS = 4;
const TOTAL_TIMEOUT_MS = 90_000;
const API_TIMEOUT_MS = 45_000;

// Build allowed tables Set once at module level
const allowedTablesSet = new Set(ALLOWED_PRINCIPAL_TABLES);

/** Helper to emit an SSE event */
function sseEvent(
  encoder: TextEncoder,
  data: Record<string, unknown>
): Uint8Array {
  return encoder.encode('data: ' + JSON.stringify(data) + '\n\n');
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // Auth — principal must have valid JWT with role='principal'
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== 'principal') {
    return NextResponse.json(
      { error: 'Only principals can access the Admin Guru' },
      { status: 403 }
    );
  }

  const schoolId = auth.schoolId;

  let body: { messages?: MessageParam[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { messages } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: 'messages array required' },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();
  const supabase = getSupabase();

  // Look up school name for the system prompt
  let schoolName = 'Unknown School';
  try {
    const { data: schoolRow } = await supabase
      .from('montree_schools')
      .select('name')
      .eq('id', schoolId)
      .maybeSingle();
    if (schoolRow?.name) {
      schoolName = schoolRow.name;
    }
  } catch (err) {
    console.error('[Principal Guru] School name lookup error:', err);
  }

  const customReadable = new ReadableStream({
    async start(controller) {
      try {
        const systemPrompt = buildPrincipalGuruPrompt(schoolName, schoolId);

        // Conversation maintained client-side — full history sent each request
        const conversationMessages: MessageParam[] = messages!;

        // Track assistant content blocks for multi-round tool use
        let lastAssistantBlocks: ContentBlockParam[] = [];
        let pendingToolResults: ToolResultBlockParam[] = [];
        let fullAssistantText = '';
        let toolRound = 0;
        let lastRoundHadToolUse = false;

        while (toolRound < MAX_TOOL_ROUNDS) {
          // Check total timeout
          if (Date.now() - startTime > TOTAL_TIMEOUT_MS) {
            controller.enqueue(
              sseEvent(encoder, {
                type: 'error',
                error: 'Request timeout — exceeded 90 second limit',
              })
            );
            break;
          }

          try {
            // Build messages for this round
            const currentMessages: MessageParam[] = [
              ...conversationMessages,
            ];

            // If we have tool results from a previous round, append them
            if (
              lastAssistantBlocks.length > 0 &&
              pendingToolResults.length > 0
            ) {
              currentMessages.push({
                role: 'assistant',
                content: lastAssistantBlocks,
              });
              currentMessages.push({
                role: 'user',
                content: pendingToolResults,
              });
            }

            const response = await client.messages.create(
              {
                model: MODEL,
                max_tokens: 4096,
                system: systemPrompt,
                tools: PRINCIPAL_GURU_TOOLS,
                messages: currentMessages,
              },
              { timeout: API_TIMEOUT_MS }
            );

            // Process response blocks — buffer text per round
            lastAssistantBlocks = [];
            pendingToolResults = [];
            let hasToolUse = false;
            const roundTextParts: string[] = [];

            for (const block of response.content) {
              if (block.type === 'text') {
                roundTextParts.push(block.text);
                lastAssistantBlocks.push({
                  type: 'text',
                  text: block.text,
                });
              } else if (block.type === 'tool_use') {
                hasToolUse = true;

                // Add tool_use to assistant blocks (needed for next round)
                // `as any` required: ContentBlockParam type doesn't include tool_use variant,
                // but Anthropic API expects it in assistant messages for multi-round tool use
                lastAssistantBlocks.push({
                  type: 'tool_use',
                  id: block.id,
                  name: block.name,
                  input: block.input,
                } as any);

                // Emit tool call event to client
                controller.enqueue(
                  sseEvent(encoder, {
                    type: 'tool_call',
                    tool: block.name,
                    input: block.input,
                  })
                );

                // No destructive tools for principals — execute directly
                const result = await executePrincipalTool(
                  block.name,
                  block.input as Record<string, unknown>,
                  supabase,
                  allowedTablesSet,
                  schoolId
                );

                let resultText: string;
                try {
                  resultText = result.error
                    ? `Error: ${result.error}`
                    : JSON.stringify(result.data, null, 2);
                } catch {
                  resultText = result.error
                    ? `Error: ${result.error}`
                    : String(result.data);
                }

                // Emit result to client
                controller.enqueue(
                  sseEvent(encoder, {
                    type: 'tool_result',
                    tool: block.name,
                    success: result.success,
                    result: result.success ? result.data : result.error,
                  })
                );

                // Queue tool result for next round
                pendingToolResults.push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: resultText.substring(0, 50000), // Cap at 50K chars
                });
              }
            }

            // Emit buffered text — as 'thinking' if this round had tool use, as 'text' if final
            const roundText = roundTextParts.join('');
            if (roundText) {
              fullAssistantText += roundText;
              if (hasToolUse) {
                // Intermediate round — emit as thinking (visible but de-emphasized on client)
                controller.enqueue(
                  sseEvent(encoder, { type: 'thinking', text: roundText })
                );
              } else {
                // Final round — no tool use, this is the real answer
                controller.enqueue(
                  sseEvent(encoder, { type: 'text', text: roundText })
                );
              }
            }

            lastRoundHadToolUse = hasToolUse;

            // If no tool use, model is done responding
            if (!hasToolUse) {
              break;
            }

            toolRound++;
          } catch (apiError) {
            const errorMsg =
              apiError instanceof Error
                ? apiError.message
                : 'Unknown API error';
            console.error('[Principal Guru] API error:', errorMsg);
            controller.enqueue(
              sseEvent(encoder, {
                type: 'error',
                error: `API error: ${errorMsg}`,
              })
            );
            break;
          }
        }

        // Forced synthesis: if the last round had tool use (hit MAX_TOOL_ROUNDS or timeout),
        // the model never got to write a final answer. Make one more call WITHOUT tools
        // to force it to summarize everything it found.
        if (
          lastRoundHadToolUse &&
          Date.now() - startTime < TOTAL_TIMEOUT_MS - 5000 // Leave 5s buffer
        ) {
          try {
            const synthesisMessages: MessageParam[] = [
              ...conversationMessages,
            ];
            // Append the last assistant blocks + tool results so model has full context
            if (
              lastAssistantBlocks.length > 0 &&
              pendingToolResults.length > 0
            ) {
              synthesisMessages.push({
                role: 'assistant',
                content: lastAssistantBlocks,
              });
              synthesisMessages.push({
                role: 'user',
                content: pendingToolResults,
              });
            }

            const synthesisResponse = await client.messages.create(
              {
                model: MODEL,
                max_tokens: 4096,
                system: systemPrompt,
                // No tools — forces a text-only answer
                messages: synthesisMessages,
              },
              {
                timeout: Math.min(
                  API_TIMEOUT_MS,
                  Math.max(5000, TOTAL_TIMEOUT_MS - (Date.now() - startTime) - 1000)
                ),
              }
            );

            for (const block of synthesisResponse.content) {
              if (block.type === 'text' && block.text) {
                fullAssistantText += block.text;
                controller.enqueue(
                  sseEvent(encoder, { type: 'text', text: block.text })
                );
              }
            }
          } catch (synthError) {
            console.error(
              '[Principal Guru] Forced synthesis error:',
              synthError instanceof Error ? synthError.message : synthError
            );
            // Non-fatal — we still have whatever text accumulated during tool rounds
          }
        }

        // Done
        controller.enqueue(sseEvent(encoder, { type: 'done' }));
        controller.close();
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        console.error('[Principal Guru] Stream error:', errorMsg);
        controller.enqueue(
          sseEvent(encoder, { type: 'error', error: errorMsg })
        );
        controller.close();
      }
    },
  });

  return new Response(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
