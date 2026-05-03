// app/api/montree/admin/principal-agent/route.ts
//
// "Ask anything about your school" — the principal's home-page agent.
//
// The principal types a question. The agent figures out what data to fetch
// (which child, which classroom, which teacher), calls one or more read-only
// tools, and replies in a warm, professional voice. The whole point is that
// the principal doesn't have to think about WHERE the answer lives — she just
// asks. Same way she'd ask a thoughtful chief-of-staff.
//
// Every exchange is logged to montree_principal_agent_log (migration 184).
// Super-admin can read the log to see what principals are actually asking
// — that's the signal Tredoux uses to decide what to build next.
//
// POST body: { question: string, conversation_id: string }
//   conversation_id is generated client-side per fresh chat session. Reuse
//   the same id for follow-up questions in the same conversation.
//
// Response: SSE stream of { type, ... } events:
//   { type: 'tool_call', tool, input }            — agent invoked a tool
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
  Tool,
} from '@anthropic-ai/sdk/resources/messages';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { resolveReportModel } from '@/lib/montree/reports/resolve-model';
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';

export const maxDuration = 120;

const MAX_TOOL_ROUNDS = 5;
const TOTAL_TIMEOUT_MS = 90_000;
const API_TIMEOUT_MS = 50_000;
const MAX_TOOL_RESULT_CHARS = 50_000;

// Sonnet 4.6 pricing as of May 2026 — kept here so cost_usd in the log is
// accurate even when the upstream price changes (just bump these constants).
const SONNET_INPUT_USD_PER_MTOK = 3;
const SONNET_OUTPUT_USD_PER_MTOK = 15;

// ── Tool definitions ────────────────────────────────────────────────────
// Read-only. Scoped to the principal's school via auth + every tool re-checks
// school_id. Designed to be MINIMAL on purpose — start with the questions
// principals actually ask, expand from log evidence.

const PRINCIPAL_AGENT_TOOLS: Tool[] = [
  {
    name: 'find_children_by_name',
    description:
      "Search the principal's school for children whose name matches a query. Use this when the principal mentions a child by name (full or partial). Returns up to 10 matches with id, name, classroom, and age.",
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            "The name (or partial name) to search for. Case-insensitive substring match against the child's name.",
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_child_briefing',
    description:
      'Get a 30-second AI-synthesised briefing on one child — who they are right now, what they\'re working on, recent observations, what to watch for. Use when the principal wants a general "how is X doing" answer. Requires the exact child_id (use find_children_by_name first if you only have a name).',
    input_schema: {
      type: 'object',
      properties: {
        child_id: { type: 'string' },
      },
      required: ['child_id'],
    },
  },
  {
    name: 'answer_about_child',
    description:
      "Get a focused answer to a SPECIFIC question about ONE child, drawing on every observation in the system. Use when the principal is relaying a parent's question (e.g., 'Has she been calmer this week?', 'Did she finish the moveable alphabet?') or asking a pointed question about a single child. Returns a short, factually-grounded answer in the principal's voice. Requires child_id.",
    input_schema: {
      type: 'object',
      properties: {
        child_id: { type: 'string' },
        question: {
          type: 'string',
          description:
            "The specific question being asked about the child, in plain English. If you're rephrasing a parent's question, keep the parent's phrasing.",
        },
      },
      required: ['child_id', 'question'],
    },
  },
  {
    name: 'list_classrooms_with_summary',
    description:
      "List every classroom in the principal's school with: classroom name, child count, lead teacher name, and how many of those children have been observed this week. Use this when the principal asks broad school-level questions like 'how is the school doing this week', 'which classrooms are quiet', 'who's been observing'.",
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_teachers_with_summary',
    description:
      "List every active teacher in the school with: name, classroom, last login date, and a 7-day activity count (photos confirmed). Use when the principal asks about teachers — who's active, who hasn't logged in, who's been observing the most.",
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
];

// ── Tool executor ──────────────────────────────────────────────────────

interface ToolExecResult {
  success: boolean;
  data?: unknown;
  error?: string;
  result_summary?: string;
}

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  schoolId: string,
  request: NextRequest
): Promise<ToolExecResult> {
  const supabase = getSupabase();
  const cookieHeader = request.headers.get('cookie') || '';
  const origin = request.nextUrl.origin;

  // Helper to call our own internal API endpoints with the principal's cookie
  // (so verifySchoolRequest + verifyChildBelongsToSchool inside those routes
  // see the same identity).
  const internalGet = async (path: string) => {
    const res = await fetch(`${origin}${path}`, {
      headers: { cookie: cookieHeader },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, status: res.status, body };
    }
    const data = await res.json();
    return { ok: true, status: res.status, data };
  };
  const internalPost = async (path: string, body: unknown) => {
    const res = await fetch(`${origin}${path}`, {
      method: 'POST',
      headers: {
        cookie: cookieHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, status: res.status, body: text };
    }
    const data = await res.json();
    return { ok: true, status: res.status, data };
  };

  try {
    switch (name) {
      case 'find_children_by_name': {
        const query = String(input.query || '').trim();
        if (!query) {
          return { success: false, error: 'query is required' };
        }
        const result = await internalGet(
          `/api/montree/admin/students/search?q=${encodeURIComponent(query)}`
        );
        if (!result.ok) {
          return {
            success: false,
            error: `students/search returned ${result.status}`,
          };
        }
        const data = result.data as { students?: unknown[] } | undefined;
        const students = Array.isArray(data?.students)
          ? data!.students!.slice(0, 10)
          : [];
        return {
          success: true,
          data: { matches: students },
          result_summary: `${students.length} match(es)`,
        };
      }

      case 'get_child_briefing': {
        const childId = String(input.child_id || '').trim();
        if (!childId) {
          return { success: false, error: 'child_id is required' };
        }
        const result = await internalGet(
          `/api/montree/admin/child-briefing/${encodeURIComponent(childId)}`
        );
        if (!result.ok) {
          return {
            success: false,
            error: `child-briefing returned ${result.status}`,
          };
        }
        const data = result.data as
          | { child?: { name?: string }; briefing?: string }
          | undefined;
        return {
          success: true,
          data: result.data,
          result_summary: `briefing for ${data?.child?.name || childId}`,
        };
      }

      case 'answer_about_child': {
        const childId = String(input.child_id || '').trim();
        const question = String(input.question || '').trim();
        if (!childId || !question) {
          return { success: false, error: 'child_id and question are required' };
        }
        const result = await internalPost(
          '/api/montree/admin/parent-question',
          { child_id: childId, question }
        );
        if (!result.ok) {
          return {
            success: false,
            error: `parent-question returned ${result.status}`,
          };
        }
        const data = result.data as { answer?: string; child_name?: string } | undefined;
        return {
          success: true,
          data: result.data,
          result_summary: `answered for ${data?.child_name || childId}`,
        };
      }

      case 'list_classrooms_with_summary': {
        // Inline (no internal API for this exact shape yet)
        const { data: classrooms, error: cErr } = await supabase
          .from('montree_classrooms')
          .select('id, name')
          .eq('school_id', schoolId)
          .eq('is_active', true);
        if (cErr) return { success: false, error: cErr.message };
        if (!classrooms || classrooms.length === 0) {
          return {
            success: true,
            data: { classrooms: [] },
            result_summary: '0 classrooms',
          };
        }

        const classroomIds = classrooms.map((c) => c.id);
        const sevenDaysAgo = new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000
        ).toISOString();

        // Children per classroom
        const { data: children } = await supabase
          .from('montree_children')
          .select('id, classroom_id')
          .in('classroom_id', classroomIds)
          .eq('is_active', true);
        const childrenByClassroom = new Map<string, string[]>();
        for (const c of children || []) {
          const list = childrenByClassroom.get(c.classroom_id) || [];
          list.push(c.id);
          childrenByClassroom.set(c.classroom_id, list);
        }

        // Lead teacher per classroom (first active teacher per classroom)
        const { data: teachers } = await supabase
          .from('montree_teachers')
          .select('classroom_id, name, created_at')
          .in('classroom_id', classroomIds)
          .eq('is_active', true)
          .order('created_at', { ascending: true });
        const leadByClassroom = new Map<string, string>();
        for (const t of teachers || []) {
          if (!leadByClassroom.has(t.classroom_id)) {
            leadByClassroom.set(t.classroom_id, t.name);
          }
        }

        // Distinct children with a teacher-confirmed photo in last 7 days
        const allChildIds = (children || []).map((c) => c.id);
        const observedSet = new Set<string>();
        if (allChildIds.length) {
          const { data: photos } = await supabase
            .from('montree_media')
            .select('child_id')
            .in('child_id', allChildIds)
            .eq('teacher_confirmed', true)
            .gte('captured_at', sevenDaysAgo);
          for (const p of photos || []) observedSet.add(p.child_id);
        }

        const summary = classrooms.map((c) => {
          const ids = childrenByClassroom.get(c.id) || [];
          const observed = ids.filter((id) => observedSet.has(id)).length;
          return {
            id: c.id,
            name: c.name,
            child_count: ids.length,
            lead_teacher: leadByClassroom.get(c.id) || null,
            children_observed_this_week: observed,
          };
        });

        return {
          success: true,
          data: { classrooms: summary },
          result_summary: `${summary.length} classroom(s)`,
        };
      }

      case 'list_teachers_with_summary': {
        const sevenDaysAgo = new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000
        ).toISOString();

        // All active teachers in the school
        const { data: teachers, error: tErr } = await supabase
          .from('montree_teachers')
          .select('id, name, classroom_id, last_login_at')
          .eq('school_id', schoolId)
          .eq('is_active', true);
        if (tErr) return { success: false, error: tErr.message };
        if (!teachers || teachers.length === 0) {
          return {
            success: true,
            data: { teachers: [] },
            result_summary: '0 teachers',
          };
        }

        // Map teacher → classroom name
        const classroomIds = Array.from(
          new Set(teachers.map((t) => t.classroom_id).filter(Boolean))
        );
        const classroomNameById = new Map<string, string>();
        if (classroomIds.length) {
          const { data: classrooms } = await supabase
            .from('montree_classrooms')
            .select('id, name')
            .in('id', classroomIds);
          for (const c of classrooms || []) classroomNameById.set(c.id, c.name);
        }

        // 7-day photo confirmation count per teacher (best-effort — confirms
        // are tied to media.confirmed_by if that column exists; fall back to
        // 0 silently if not).
        const photoCountByTeacher = new Map<string, number>();
        try {
          const { data: photos } = await supabase
            .from('montree_media')
            .select('confirmed_by')
            .eq('school_id', schoolId)
            .eq('teacher_confirmed', true)
            .gte('captured_at', sevenDaysAgo);
          for (const p of photos || []) {
            const tid = (p as { confirmed_by?: string }).confirmed_by;
            if (tid) {
              photoCountByTeacher.set(
                tid,
                (photoCountByTeacher.get(tid) || 0) + 1
              );
            }
          }
        } catch {
          // Non-fatal — column may not exist on older deployments.
        }

        const summary = teachers.map((t) => ({
          id: t.id,
          name: t.name,
          classroom: t.classroom_id
            ? classroomNameById.get(t.classroom_id) || null
            : null,
          last_login_at: t.last_login_at,
          photos_confirmed_7d: photoCountByTeacher.get(t.id) || 0,
        }));

        return {
          success: true,
          data: { teachers: summary },
          result_summary: `${summary.length} teacher(s)`,
        };
      }

      default:
        return { success: false, error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Tool execution failed',
    };
  }
}

// ── System prompt ──────────────────────────────────────────────────────

function buildSystemPrompt(schoolName: string, principalName: string): string {
  return `You are the principal's personal assistant for ${schoolName}. Your name is Guru. The person you are talking to is ${principalName}, the principal.

Your role: ${principalName} types questions. You go and find the answer using the tools available, then reply in a warm, professional, conversational voice. The principal should never have to think about WHERE the answer lives — she just asks, you handle it.

How to think:
- Most questions will be about a SPECIFIC child whose name appears in the question. When you see a name, your first move is almost always find_children_by_name to get the child_id, then either get_child_briefing (for general "how is she doing") OR answer_about_child (for a specific question).
- For school-wide questions ("how is this week going", "which classrooms are quiet", "who's been observing"), use list_classrooms_with_summary or list_teachers_with_summary.
- You can chain tools — e.g. find_children_by_name → get_child_briefing → if she asks a specific follow-up, answer_about_child.
- Don't call tools you don't need. If the principal says "thanks" or "ok", just respond conversationally without tool calls.

Voice:
- Warm, specific, professional. Like a knowledgeable chief-of-staff briefing the principal.
- Refer to children by their first name. Refer to ${principalName} as "you".
- No bullet points unless the principal asks for a list. Plain prose.
- Length: match the question. A one-sentence question deserves a one-sentence answer.

Honesty rules — non-negotiable:
- Use ONLY information returned by the tools. Never invent observations, dates, names, classroom counts.
- If a tool returns no matches (e.g. no child found by that name), tell the principal honestly: "I couldn't find a child named X in your school — did you mean someone else, or should I check a different spelling?"
- If a tool errors, tell the principal what failed and offer to try again.
- For ${principalName}'s viewer mode (when ${schoolName} is teacher-led and she doesn't own it), never invent classrooms or teachers she doesn't actually have access to. Stay strictly within the data the tools return.

When you're done answering, do NOT add a "Let me know if you'd like more!" sign-off. Just answer the question and stop. The principal will ask if she needs more.

Output: Plain conversational prose. Markdown is fine for a quoted parent letter or a short list when explicitly helpful, but default to flowing sentences.`;
}

// ── Main handler ──────────────────────────────────────────────────────

interface BodyShape {
  question?: string;
  conversation_id?: string;
  history?: MessageParam[]; // optional client-side context for follow-ups
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
  const historyMessages: MessageParam[] = Array.isArray(body.history)
    ? body.history.slice(-10) // cap at last 10 turns to control prompt size
    : [];
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

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const systemPrompt = buildSystemPrompt(schoolName, principalName);

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
                tools: PRINCIPAL_AGENT_TOOLS,
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

              const result = await executeTool(
                block.name,
                block.input as Record<string, unknown>,
                auth.schoolId,
                request
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
