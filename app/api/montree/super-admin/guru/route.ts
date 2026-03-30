// app/api/montree/super-admin/guru/route.ts
// Super-Admin Guru API route — agentic AI copilot with full platform access
// Streaming SSE response with tool execution loop, confirmation flow, and audit logging

import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, ContentBlockParam, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { buildSuperAdminPrompt } from '@/lib/montree/super-admin/guru-prompt';
import { SUPER_ADMIN_GURU_TOOLS, ALLOWED_TABLES, DESTRUCTIVE_TOOLS } from '@/lib/montree/super-admin/guru-tools';
import { executeTool, ToolResult } from '@/lib/montree/super-admin/guru-executor';
import { getSupabase } from '@/lib/supabase-client';

const client = new Anthropic();
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOOL_ROUNDS = 4;
const TOTAL_TIMEOUT_MS = 90_000;
const API_TIMEOUT_MS = 45_000;
const CONFIRMATION_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Build allowed tables Set once at module level
const allowedTablesSet = new Set(ALLOWED_TABLES);

// Module-level confirmation tracking (in-memory, per-instance)
const pendingConfirmations = new Map<
  string,
  { toolName: string; input: Record<string, unknown>; reason: string; expiresAt: number }
>();

// Cleanup expired confirmations periodically
function cleanupExpiredConfirmations() {
  const now = Date.now();
  for (const [id, conf] of pendingConfirmations) {
    if (conf.expiresAt < now) pendingConfirmations.delete(id);
  }
}

/** Helper to emit an SSE event */
function sseEvent(encoder: TextEncoder, data: Record<string, unknown>): Uint8Array {
  return encoder.encode('data: ' + JSON.stringify(data) + '\n\n');
}

export async function POST(req: Request) {
  const startTime = Date.now();

  // Auth — verifySuperAdminAuth takes Headers, returns { valid, error? }
  const auth = await verifySuperAdminAuth(req.headers);
  if (!auth.valid) {
    return new Response(JSON.stringify({ error: auth.error || 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { messages?: MessageParam[]; confirmation_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages, confirmation_id } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages array required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Handle confirmation flow for destructive operations
  cleanupExpiredConfirmations();
  if (confirmation_id) {
    const pending = pendingConfirmations.get(confirmation_id);
    if (!pending || pending.expiresAt < Date.now()) {
      pendingConfirmations.delete(confirmation_id as string);
      return new Response(JSON.stringify({ error: 'Confirmation expired or not found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // Confirmation accepted — delete to prevent double-execution
    pendingConfirmations.delete(confirmation_id as string);
  }

  const encoder = new TextEncoder();
  const supabase = getSupabase();
  const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';

  const customReadable = new ReadableStream({
    async start(controller) {
      try {
        const systemPrompt = buildSuperAdminPrompt();

        // Conversation is maintained client-side (React state).
        // The client sends the full message history each request.
        // No server-side conversation persistence needed (session-scoped).
        const conversationMessages: MessageParam[] = messages!;

        // Track assistant content blocks for multi-round tool use
        let lastAssistantBlocks: ContentBlockParam[] = [];
        let pendingToolResults: ToolResultBlockParam[] = [];
        let fullAssistantText = '';
        let toolRound = 0;

        while (toolRound < MAX_TOOL_ROUNDS) {
          // Check total timeout
          if (Date.now() - startTime > TOTAL_TIMEOUT_MS) {
            controller.enqueue(sseEvent(encoder, {
              type: 'error',
              error: 'Request timeout — exceeded 90 second limit',
            }));
            break;
          }

          try {
            // Build messages for this round
            const currentMessages: MessageParam[] = [...conversationMessages];

            // If we have tool results from a previous round, append them
            if (lastAssistantBlocks.length > 0 && pendingToolResults.length > 0) {
              currentMessages.push({
                role: 'assistant',
                content: lastAssistantBlocks,
              });
              currentMessages.push({
                role: 'user',
                content: pendingToolResults as any,
              });
            }

            const response = await client.messages.create(
              {
                model: MODEL,
                max_tokens: 4096,
                system: systemPrompt,
                tools: SUPER_ADMIN_GURU_TOOLS,
                messages: currentMessages,
              },
              { timeout: API_TIMEOUT_MS }
            );

            // Process response blocks
            lastAssistantBlocks = [];
            pendingToolResults = [];
            let hasToolUse = false;
            const toolsUsedThisRound: string[] = [];

            for (const block of response.content) {
              if (block.type === 'text') {
                fullAssistantText += block.text;
                lastAssistantBlocks.push({ type: 'text', text: block.text });
                controller.enqueue(sseEvent(encoder, {
                  type: 'text',
                  text: block.text,
                }));
              } else if (block.type === 'tool_use') {
                hasToolUse = true;
                toolsUsedThisRound.push(block.name);

                // Add tool_use to assistant blocks (needed for next round)
                lastAssistantBlocks.push({
                  type: 'tool_use',
                  id: block.id,
                  name: block.name,
                  input: block.input,
                } as any);

                // Emit tool call event to client
                controller.enqueue(sseEvent(encoder, {
                  type: 'tool_call',
                  tool: block.name,
                  input: block.input,
                }));

                // Check if this is a destructive tool requiring confirmation
                if (DESTRUCTIVE_TOOLS.has(block.name) && !confirmation_id) {
                  // Generate confirmation ID and halt execution
                  const confId = crypto.randomUUID();
                  const description = `⚠️ Destructive operation: ${block.name} with input ${JSON.stringify(block.input)}`;

                  pendingConfirmations.set(confId, {
                    toolName: block.name,
                    input: block.input as Record<string, unknown>,
                    reason: description,
                    expiresAt: Date.now() + CONFIRMATION_TTL_MS,
                  });

                  controller.enqueue(sseEvent(encoder, {
                    type: 'confirmation_required',
                    confirmation_id: confId,
                    description,
                    tool: block.name,
                    input: block.input,
                  }));

                  // Return a tool result telling Claude it needs confirmation
                  pendingToolResults.push({
                    type: 'tool_result',
                    tool_use_id: block.id,
                    content: `Operation requires user confirmation. Confirmation ID: ${confId}. Please inform the user and wait for them to confirm.`,
                  });
                  continue;
                }

                // Execute the tool
                const result: ToolResult = await executeTool(
                  block.name,
                  block.input as Record<string, unknown>,
                  supabase,
                  allowedTablesSet
                );

                const resultText = result.error
                  ? `Error: ${result.error}`
                  : JSON.stringify(result.data, null, 2);

                // Emit result to client
                controller.enqueue(sseEvent(encoder, {
                  type: 'tool_result',
                  tool: block.name,
                  success: result.success,
                  result: result.success ? result.data : result.error,
                }));

                // Queue tool result for next round
                pendingToolResults.push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: resultText.substring(0, 50000), // Cap at 50K chars
                });
              }
            }

            // Audit log this round (fire-and-forget)
            if (toolsUsedThisRound.length > 0) {
              supabase.from('montree_super_admin_audit').insert({
                action: 'guru_tool_call',
                resource_type: 'guru_interaction',
                resource_details: {
                  tools_used: toolsUsedThisRound,
                  round: toolRound,
                  assistant_text_preview: fullAssistantText.substring(0, 300),
                },
                ip_address: ipAddress,
                requires_review: toolsUsedThisRound.some(t => DESTRUCTIVE_TOOLS.has(t)),
              }).then(() => {}).catch((err: unknown) => {
                console.error('[Super-Admin Guru] Audit log error:', err);
              });
            }

            // If no tool use, model is done responding
            if (!hasToolUse) {
              break;
            }

            toolRound++;
          } catch (apiError) {
            const errorMsg = apiError instanceof Error ? apiError.message : 'Unknown API error';
            console.error('[Super-Admin Guru] API error:', errorMsg);
            controller.enqueue(sseEvent(encoder, {
              type: 'error',
              error: `API error: ${errorMsg}`,
            }));
            break;
          }
        }

        // Done
        controller.enqueue(sseEvent(encoder, { type: 'done' }));
        controller.close();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Super-Admin Guru] Stream error:', errorMsg);
        controller.enqueue(sseEvent(encoder, { type: 'error', error: errorMsg }));
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
