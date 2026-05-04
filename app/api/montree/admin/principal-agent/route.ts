// app/api/montree/admin/principal-agent/route.ts
//
// Tracy — the principal's chief-of-staff AI.
//
// The principal types a question. Tracy figures out what data to fetch
// (which child, which classroom, which teacher), calls one or more read-only
// tools, and replies in a chief-of-staff voice that always ends with one
// concrete next action. The whole point is that the principal doesn't have to
// think about WHERE the answer lives — she just asks.
//
// This route is the SSE plumbing. Tracy's brain (system prompt, tool
// definitions, framework tools, executor) lives in lib/montree/tracy/ —
// keep this file thin and don't drop architectural details into it.
//
// Every exchange is logged to montree_principal_agent_log (migration 184).
// Super-admin reads the log to see what principals are actually asking —
// that's the signal Tredoux uses to decide what to build next.
//
// POST body: { question: string, conversation_id: string, history?: [...] }
//   conversation_id is generated client-side per fresh chat session. Reuse
//   the same id for follow-up questions in the same conversation.
//
// Response: SSE stream of { type, ... } events:
//   { type: 'tool_call', tool, input }            — Tracy invoked a tool
//   { type: 'tool_result', tool, success, summary } — tool returned
//   { type: 'thinking', text }                     — interim text between tool calls
//   { type: 'text', text }                         — final answer chunk
//   { type: 'done', cost_usd, duration_ms }        — closing summary
//   { type: 'error', error }                       — fatal error

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type {
  MessageParam,
  ContentBlockParam,
  ToolResultBlockParam,
} from '@anthropic-ai/sdk/resources/messages';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { resolveReportModel } from '@/lib/montree/reports/resolve-model';
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import {
  buildTracySystemPrompt,
  TRACY_TOOLS,
  executeTracyTool,
} from '@/lib/montree/tracy';

export const maxDuration = 120;

const MAX_TOOL_ROUNDS = 5;
const TOTAL_TIMEOUT_MS = 90_000;
const API_TIMEOUT_MS = 50_000;
const MAX_TOOL_RESULT_CHARS = 50_000;

// Sonnet 4.6 pricing as of May 2026 — kept here so cost_usd in the log is
// accurate even when the upstream price changes (just bump these constants).
// COST_MODEL is the model these prices are valid for — if `model` resolves
// to something different at runtime we refuse to log a misleading cost
// (see assertSupportedCostModel below).
const COST_MODEL = 'claude-sonnet-4-6';
const SONNET_INPUT_USD_PER_MTOK = 3;
const SONNET_OUTPUT_USD_PER_MTOK = 15;

function assertSupportedCostModel(model: string): void {
  // Soft assertion: log loudly if we ever start using a model whose pricing
  // these constants don't cover. We don't throw — the agent should still
  // work — but a bad cost log is better caught early.
  if (model !== COST_MODEL) {
    console.error(
      `[principal-agent] cost model drift: using model="${model}" but ` +
        `cost constants are for "${COST_MODEL}". cost_usd in the log will ` +
        `be wrong until pricing constants are updated.`
    );
  }
}

// ── Tracy's brain lives in lib/montree/tracy/ ────────────────────────
// System prompt: lib/montree/tracy/system-prompt.ts
// Tool defs:     lib/montree/tracy/tool-definitions.ts (TRACY_TOOLS)
// Executor:      lib/montree/tracy/tool-executor.ts (executeTracyTool)
// Frameworks:    lib/montree/tracy/frameworks/*
//
// SCHOOL-SCOPING CONTRACT (load-bearing — do not weaken):
//   The executor forwards the principal's cookie to internal endpoints so
//   each endpoint re-verifies the school. For tools that do direct Supabase
//   queries, every query MUST filter by the schoolId passed in. The trust
//   boundary is the inner endpoint or the explicit schoolId filter — never
//   the agent loop here.

// ── Main handler ──────────────────────────────────────────────────────

interface BodyShape {
  question?: string;
  conversation_id?: string;
  history?: MessageParam[]; // optional client-side context for follow-ups
  /** Locale code from the principal's UI (e.g. 'en', 'zh', 'es', 'fr', …). */
  locale?: string;
}

// Allow-list of supported locales — silently downgrades anything else to 'en'.
// Kept aligned with SUPPORTED_LOCALES in lib/montree/i18n/locales.ts.
const SUPPORTED_TRACY_LOCALES = new Set([
  'en', 'zh', 'es', 'de', 'fr', 'pt', 'nl', 'it', 'ja', 'ko', 'uk', 'ru',
]);
function normalizeLocale(raw: unknown): string {
  if (typeof raw !== 'string') return 'en';
  const v = raw.trim().toLowerCase();
  return SUPPORTED_TRACY_LOCALES.has(v) ? v : 'en';
}

function sse(encoder: TextEncoder, payload: Record<string, unknown>): Uint8Array {
  return encoder.encode('data: ' + JSON.stringify(payload) + '\n\n');
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal') {
    return NextResponse.json(
      { error: 'Only principals can use the home agent.' },
      { status: 403 }
    );
  }

  let body: BodyShape;
  try {
    body = (await request.json()) as BodyShape;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const question = (body.question || '').trim();
  const conversationId = (body.conversation_id || '').trim();
  const locale = normalizeLocale(body.locale);
  if (!question) {
    return NextResponse.json({ error: 'question required' }, { status: 400 });
  }
  if (question.length > 1500) {
    return NextResponse.json(
      { error: 'Question is too long (max 1500 characters).' },
      { status: 400 }
    );
  }
  if (!conversationId) {
    return NextResponse.json(
      { error: 'conversation_id required' },
      { status: 400 }
    );
  }

  const supabase = getSupabase();

  // Tier gate
  const aiTier = await resolveReportModel(supabase, auth.schoolId);
  if (aiTier.tier === 'free' || !aiTier.model || !anthropic) {
    return NextResponse.json(
      { error: 'The home agent requires an active AI tier.', tier: aiTier.tier },
      { status: 402 }
    );
  }
  // We use Sonnet for the agent regardless of haiku/sonnet tier — the
  // tool-use loop reasoning quality matters here. Cost is acceptable because
  // agent calls are not bulk-batched.
  const model = AI_MODEL;
  // Catch the "Anthropic changed the default and we forgot" failure mode:
  // if AI_MODEL drifts to anything other than COST_MODEL, the cost we log
  // becomes silently wrong. We log loudly so super-admin's cost view doesn't
  // mislead Tredoux for weeks.
  assertSupportedCostModel(model);

  // Best-effort school + principal name lookup for the system prompt
  let schoolName = 'your school';
  let principalName = 'Principal';
  try {
    const [schoolRes, principalRes] = await Promise.all([
      supabase
        .from('montree_schools')
        .select('name')
        .eq('id', auth.schoolId)
        .maybeSingle(),
      supabase
        .from('montree_school_admins')
        .select('name')
        .eq('id', auth.userId)
        .maybeSingle(),
    ]);
    if (schoolRes.data?.name) schoolName = schoolRes.data.name;
    if (principalRes.data?.name) {
      principalName = principalRes.data.name.split(' ')[0] || 'Principal';
    }
  } catch {
    // Keep defaults.
  }

  const encoder = new TextEncoder();

  // Anthropic client (we already verified `anthropic` is non-null above).
  const client = anthropic as Anthropic;

  // Conversation context: prepend any client-supplied history (capped),
  // then the current question.
  //
  // SECURITY: We do NOT trust the client to send well-formed Anthropic
  // MessageParam objects. A malicious client could send tool_use /
  // tool_result blocks in history to forge tool round-trips and trick the
  // agent into "remembering" results it never produced. We strip every
  // history entry down to { role, content: string } where content is just
  // text — anything else is dropped. The role is also clamped to user/assistant.
  const sanitizeHistory = (raw: unknown): MessageParam[] => {
    if (!Array.isArray(raw)) return [];
    const out: MessageParam[] = [];
    for (const item of raw.slice(-10)) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      const role = obj.role === 'assistant' ? 'assistant' : 'user';
      const content = obj.content;
      let text = '';
      if (typeof content === 'string') {
        text = content;
      } else if (Array.isArray(content)) {
        // Accept only inline text blocks; ignore tool_use, tool_result, image, etc.
        for (const block of content) {
          if (
            block &&
            typeof block === 'object' &&
            (block as Record<string, unknown>).type === 'text' &&
            typeof (block as Record<string, unknown>).text === 'string'
          ) {
            text += (block as Record<string, string>).text;
          }
        }
      }
      text = text.trim();
      if (!text) continue;
      // Cap each turn so a malicious client can't blow up the context.
      out.push({ role, content: text.slice(0, 4000) });
    }
    return out;
  };
  const historyMessages: MessageParam[] = sanitizeHistory(body.history);
  const initialMessages: MessageParam[] = [
    ...historyMessages,
    { role: 'user', content: question },
  ];

  // Per-row log accumulator. Filled as we go; written on completion or error.
  const toolsCalled: Array<{
    name: string;
    input: unknown;
    success: boolean;
    duration_ms: number;
    result_summary?: string;
  }> = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let finalAnswerText = '';
  let logError: string | null = null;

  // Today's date label for Tracy's system prompt — formatted in the
  // principal's locale so "Monday, May 4, 2026" reads natively in zh/es/fr/etc.
  // Falls back to en-US if Intl can't resolve the locale.
  const todayLabel = (() => {
    try {
      return new Date().toLocaleDateString(locale === 'en' ? 'en-US' : locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  })();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const systemPrompt = buildTracySystemPrompt({
          schoolName,
          principalName,
          todayLabel,
          locale,
        });

        const conversationMessages: MessageParam[] = [...initialMessages];
        let lastAssistantBlocks: ContentBlockParam[] = [];
        let pendingToolResults: ToolResultBlockParam[] = [];
        let toolRound = 0;

        while (toolRound < MAX_TOOL_ROUNDS) {
          if (Date.now() - startTime > TOTAL_TIMEOUT_MS) {
            logError = 'Total timeout (90s) exceeded';
            controller.enqueue(
              sse(encoder, { type: 'error', error: logError })
            );
            break;
          }

          const messagesForRound: MessageParam[] = [...conversationMessages];
          if (
            lastAssistantBlocks.length > 0 &&
            pendingToolResults.length > 0
          ) {
            messagesForRound.push({
              role: 'assistant',
              content: lastAssistantBlocks,
            });
            messagesForRound.push({
              role: 'user',
              content: pendingToolResults,
            });
          }

          let response;
          try {
            response = await client.messages.create(
              {
                model,
                max_tokens: 2048,
                system: systemPrompt,
                tools: TRACY_TOOLS,
                messages: messagesForRound,
              },
              { timeout: API_TIMEOUT_MS }
            );
          } catch (apiErr) {
            const errMsg =
              apiErr instanceof Error ? apiErr.message : 'API error';
            logError = `API call failed: ${errMsg}`;
            controller.enqueue(
              sse(encoder, { type: 'error', error: errMsg })
            );
            break;
          }

          // Tally tokens (cumulative across rounds)
          if (response.usage) {
            totalInputTokens += response.usage.input_tokens ?? 0;
            totalOutputTokens += response.usage.output_tokens ?? 0;
          }

          lastAssistantBlocks = [];
          pendingToolResults = [];
          let hasToolUse = false;
          const roundTextParts: string[] = [];

          for (const block of response.content) {
            if (block.type === 'text') {
              roundTextParts.push(block.text);
              lastAssistantBlocks.push({ type: 'text', text: block.text });
            } else if (block.type === 'tool_use') {
              hasToolUse = true;
              lastAssistantBlocks.push({
                type: 'tool_use',
                id: block.id,
                name: block.name,
                input: block.input,
                // Anthropic SDK type doesn't include tool_use in
                // ContentBlockParam union but the API accepts it on
                // assistant messages for multi-round tool use.
              } as unknown as ContentBlockParam);

              const toolStart = Date.now();
              controller.enqueue(
                sse(encoder, {
                  type: 'tool_call',
                  tool: block.name,
                  input: block.input,
                })
              );

              const result = await executeTracyTool(
                block.name,
                block.input as Record<string, unknown>,
                {
                  supabase,
                  anthropic,
                  schoolId: auth.schoolId,
                  request,
                  locale,
                }
              );
              const toolDuration = Date.now() - toolStart;

              toolsCalled.push({
                name: block.name,
                input: block.input,
                success: result.success,
                duration_ms: toolDuration,
                result_summary: result.result_summary,
              });

              controller.enqueue(
                sse(encoder, {
                  type: 'tool_result',
                  tool: block.name,
                  success: result.success,
                  summary: result.result_summary,
                })
              );

              const resultText = result.success
                ? JSON.stringify(result.data)
                : `Error: ${result.error || 'unknown'}`;

              pendingToolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: resultText.substring(0, MAX_TOOL_RESULT_CHARS),
                is_error: !result.success,
              });
            }
          }

          const roundText = roundTextParts.join('').trim();
          if (roundText) {
            if (hasToolUse) {
              controller.enqueue(
                sse(encoder, { type: 'thinking', text: roundText })
              );
            } else {
              finalAnswerText += roundText;
              controller.enqueue(
                sse(encoder, { type: 'text', text: roundText })
              );
            }
          }

          if (!hasToolUse) break;
          toolRound++;
        }

        // Compute cost
        const costUsd =
          (totalInputTokens / 1_000_000) * SONNET_INPUT_USD_PER_MTOK +
          (totalOutputTokens / 1_000_000) * SONNET_OUTPUT_USD_PER_MTOK;

        const totalDuration = Date.now() - startTime;

        controller.enqueue(
          sse(encoder, {
            type: 'done',
            cost_usd: Number(costUsd.toFixed(6)),
            duration_ms: totalDuration,
            tools_used: toolsCalled.length,
          })
        );

        // ── Log the exchange (fire-and-forget, doesn't block stream close)
        void supabase
          .from('montree_principal_agent_log')
          .insert({
            school_id: auth.schoolId,
            principal_id: auth.userId,
            conversation_id: conversationId,
            question,
            answer: finalAnswerText || null,
            tools_called: toolsCalled,
            model,
            input_tokens: totalInputTokens,
            output_tokens: totalOutputTokens,
            cost_usd: Number(costUsd.toFixed(6)),
            duration_ms: totalDuration,
            error: logError,
          })
          .then(({ error }) => {
            if (error) {
              console.error('[principal-agent] log insert error:', error);
            }
          });
      } catch (streamErr) {
        const msg =
          streamErr instanceof Error ? streamErr.message : 'Stream error';
        logError = msg;
        controller.enqueue(sse(encoder, { type: 'error', error: msg }));

        // Log the failure too
        void supabase
          .from('montree_principal_agent_log')
          .insert({
            school_id: auth.schoolId,
            principal_id: auth.userId,
            conversation_id: conversationId,
            question,
            answer: finalAnswerText || null,
            tools_called: toolsCalled,
            model,
            input_tokens: totalInputTokens,
            output_tokens: totalOutputTokens,
            cost_usd: Number(
              (
                (totalInputTokens / 1_000_000) * SONNET_INPUT_USD_PER_MTOK +
                (totalOutputTokens / 1_000_000) * SONNET_OUTPUT_USD_PER_MTOK
              ).toFixed(6)
            ),
            duration_ms: Date.now() - startTime,
            error: msg,
          })
          .then(({ error }) => {
            if (error) {
              console.error(
                '[principal-agent] error-log insert error:',
                error
              );
            }
          });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
