// app/api/montree/admin/principal-agent/route.ts
//
// Astra — the principal's chief-of-staff AI.
//
// The principal types a question. Astra figures out what data to fetch
// (which child, which classroom, which teacher), calls one or more read-only
// tools, and replies in a chief-of-staff voice that always ends with one
// concrete next action. The whole point is that the principal doesn't have to
// think about WHERE the answer lives — she just asks.
//
// This route is the SSE plumbing. Astra's brain (system prompt, tool
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
//   { type: 'tool_call', tool, input }            — Astra invoked a tool
//   { type: 'tool_progress', tool, phase, vars }   — live status from inside a tool
//   { type: 'meeting_brief_init', child_id, meeting_purpose }
//     — (Session 136) fires the instant prepare_parent_meeting starts,
//       BEFORE the cache check + Sonnet call. UI shows "Preparing the
//       dossier…" immediately. Diagnostic signal: if init fires but no
//       chunks follow, we know the tool started but stalled; if init
//       never fires, the tool never started.
//   { type: 'meeting_brief_chunk', section, delta } — streaming dossier tokens
//   { type: 'meeting_brief', brief_markdown, dossier_markdown, child_name, from_cache }
//     — final structured brief + dossier; fires AFTER chunks (or on cache hit)
//   { type: 'tool_result', tool, success, summary } — tool returned
//   { type: 'thinking', text }                     — interim text between tool calls
//   { type: 'text', text }                         — final answer chunk
//   { type: 'done', cost_usd, duration_ms }        — closing summary
//   { type: 'error', error }                       — fatal error

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type {
  Message,
  MessageParam,
  ContentBlockParam,
  ToolResultBlockParam,
} from '@anthropic-ai/sdk/resources/messages';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { resolveReportModel } from '@/lib/montree/reports/resolve-model';
import { anthropic, AI_MODEL, OPUS_MODEL, HAIKU_MODEL } from '@/lib/ai/anthropic';
import {
  buildTracySystemPrompt,
  TRACY_TOOLS,
  executeTracyTool,
} from '@/lib/montree/tracy';
import {
  loadActiveMemories,
  formatMemoriesForPrompt,
} from '@/lib/montree/tracy/memory';
// Session 136 — psychological knowledge base. Resolved once per request
// (cached process-wide after first hit) and threaded into Astra's system
// prompt so every chat turn benefits from the framework depth, not just
// parent-meeting dossiers.
import { getTracyKnowledgeSummary } from '@/lib/montree/tracy/knowledge/loader';
import { getAILanguageInstruction } from '@/lib/montree/i18n/locale-config';

// 🚨 Session 135: Astra moved from Opus 4.6 → Sonnet 4.6. Opus was a
// "wow factor" choice (Session 96) that didn't pay off in real principal
// use — too slow (60-180s) and too expensive ($0.20+ per interaction)
// for what's mostly synthesis. Sonnet matches the quality on these tasks
// and lands in 20-40s. The model swap let us drop the watchdog from 240s
// → 120s. To revert: import OPUS_MODEL instead of AI_MODEL at the model
// constant below and restore the 240s/300s budgets.
export const maxDuration = 180;

const MAX_TOOL_ROUNDS = 5;
// Watchdog ceiling on the full tool-use loop. Must be lower than
// `maxDuration` so we surface a clean error to the client instead of
// the platform killing the response mid-stream. Sonnet 4.6 + 3-4 tool
// calls on a real child = realistically 20-60s; 120s gives slack.
const TOTAL_TIMEOUT_MS = 120_000;
// Per-Anthropic-call timeout. One Sonnet turn rarely exceeds 30s even
// with tool use; 60s is generous but bounded.
const API_TIMEOUT_MS = 60_000;
const MAX_TOOL_RESULT_CHARS = 50_000;

// Sonnet 4.6 pricing — kept here so cost_usd in the log is accurate.
// Session 135 swap from Opus → Sonnet ($15/$75 → $3/$15 per MTok = 5× cheaper).
// COST_MODEL is the model these prices are valid for — if `model` resolves to
// anything else at runtime, assertSupportedCostModel logs loudly (see below).
const COST_MODEL = 'claude-sonnet-4-6';
const SONNET_INPUT_USD_PER_MTOK = 3;
const SONNET_OUTPUT_USD_PER_MTOK = 15;

// 🚨 Session 113 V2 Astra + Mira audit quick win: cost-model drift now logs
// to montree_server_errors in addition to console. Without the DB write, a
// silently-wrong cost_usd in audit logs is invisible until end-of-month
// reconciliation. Module-scoped guard prevents log spam from a hot route.
let _tracyDriftLogged = false;
function assertSupportedCostModel(model: string): void {
  // Soft assertion: log loudly if we ever start using a model whose pricing
  // these constants don't cover. We don't throw — the agent should still
  // work — but a bad cost log is better caught early.
  if (model !== COST_MODEL) {
    console.warn(
      `[principal-agent] cost model drift: using model="${model}" but ` +
        `cost constants are for "${COST_MODEL}". cost_usd in the log will ` +
        `be wrong until pricing constants are updated. Logging to montree_server_errors.`
    );
    if (!_tracyDriftLogged) {
      _tracyDriftLogged = true;
      import('@/lib/montree/server-errors').then(({ logServerError }) => {
        logServerError({
          origin: 'principal-agent/route',
          message: `Cost-model drift: model="${model}" vs COST_MODEL="${COST_MODEL}"`,
          severity: 'warn',
          context: { model, cost_model: COST_MODEL },
        });
      }).catch(err => {
        console.error('[principal-agent] failed to load server-errors logger (non-fatal):', err);
      });
    }
  }
}

// ── Astra's brain lives in lib/montree/tracy/ ────────────────────────
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
  // Principal role gate. Defensive: if the JWT role is NOT 'principal' but
  // the userId actually belongs to an active row in montree_school_admins
  // for the current school, treat them as a principal anyway. This handles
  // a known JWT-mis-stamping case: someone who is BOTH a teacher row and a
  // school_admins row gets a teacher JWT from the unified login (which
  // tries tryTeacherLogin before tryPrincipalLogin) — even though they
  // are, in fact, a principal in the DB. Without this fallback, Astra
  // hard-403s and looks broken to the actual owner of the school.
  // Cross-table UUID collisions between montree_teachers and
  // montree_school_admins are not a concern here because both columns are
  // populated by gen_random_uuid() with separate generations; a forged
  // teacher userId cannot collide with a school_admin id.
  if (auth.role !== 'principal') {
    const supabaseForCheck = getSupabase();
    const { data: schoolAdmin } = await supabaseForCheck
      .from('montree_school_admins')
      .select('id, role, is_active')
      .eq('id', auth.userId)
      .eq('school_id', auth.schoolId)
      .eq('is_active', true)
      .maybeSingle();
    if (!schoolAdmin || schoolAdmin.role !== 'principal') {
      console.warn(
        `[principal-agent] 403: JWT role="${auth.role}", userId=${auth.userId} ` +
        `not an active principal in school_admins for school=${auth.schoolId}`,
      );
      return NextResponse.json(
        { error: 'Only principals can use the home agent.' },
        { status: 403 }
      );
    }
    // JWT was mis-stamped but the user IS a principal — log loudly so we
    // can surface and fix the upstream login flow.
    console.warn(
      `[principal-agent] JWT role mismatch detected: cookie says "${auth.role}" but ` +
      `userId=${auth.userId} is an active principal in school=${auth.schoolId}. ` +
      `Allowing through. The unified login route should be patched to try ` +
      `principal BEFORE teacher to prevent re-occurrence.`,
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
      {
        error: 'The home agent requires an active AI tier.',
        tier: aiTier.tier,
        requires_upgrade: true,
        upgrade_url: '/montree/admin/billing',
        feature: 'tracy',
      },
      { status: 402 }
    );
  }
  // Session 135: Astra on Sonnet 4.6 (was Opus). 5× cheaper, 3× faster, same
  // synthesis quality for the principal's chief-of-staff workload. Reverting
  // to Opus is a single-line change — swap AI_MODEL → OPUS_MODEL here AND
  // update COST_MODEL + the pricing constants above. OPUS_MODEL is still
  // imported so the swap is one identifier away.
  //
  // 🚨 Launch pricing (Jul 6 2026 — plan amendment A5). Astra's model now
  // follows the school's plan: Premium/trial (sonnet) → Sonnet; Starter
  // (haiku) → Haiku. Free is already 402'd above.
  const model = aiTier.tier === 'sonnet' ? AI_MODEL : HAIKU_MODEL;
  // Cost constants (below) are Sonnet-priced. On the Sonnet path, assert the
  // model matches COST_MODEL so a silent Anthropic default-change is caught.
  // On the Haiku path, DON'T assert (it would falsely warn every Starter turn);
  // instead compute cost with Haiku rates via costRates below.
  if (model === COST_MODEL) {
    assertSupportedCostModel(model);
  }
  void OPUS_MODEL; // intentionally kept imported as the documented reversion path

  // Per-token rates for the chosen model (used for the cost_usd log).
  // Sonnet $3/$15 per MTok; Haiku $0.80/$4.00 per MTok.
  const costRates =
    model === HAIKU_MODEL
      ? { input: 0.8, output: 4 }
      : { input: SONNET_INPUT_USD_PER_MTOK, output: SONNET_OUTPUT_USD_PER_MTOK };

  // 🚨 SESSION 136 HANG FIX (May 29, 2026)
  // Every pre-flight await BEFORE the ReadableStream is created blocks the
  // response headers from going out. The browser sees the POST as pending
  // with NO SSE events arriving — Astra looks frozen even though she's just
  // waiting on Supabase. Wrap every pre-flight DB lookup in a timeout race
  // so a stuck Supabase connection can't hang Astra forever. Defaults are
  // used if any timeout fires — Astra degrades gracefully to no-memory /
  // no-knowledge mode, still works, the principal sees an answer.
  function withTimeout<T>(p: Promise<T>, ms: number, fallback: T, label: string): Promise<T> {
    // 🚨 AUDIT FIX (May 29, 2026)
    // The race resolves with `fallback` after `ms`, but the underlying
    // promise `p` keeps running in the background. If `p` later rejects,
    // the rejection becomes an unhandled-promise-rejection warning (and
    // in stricter Node modes, a process exit). Attach a swallow-only
    // .catch() to keep the background promise tame: any late settlement
    // is logged but never propagated.
    const tamed = p.catch((err) => {
      console.warn(
        `[principal-agent] late rejection on ${label} after timeout (suppressed):`,
        err instanceof Error ? err.message : 'unknown'
      );
      return fallback;
    });
    return Promise.race([
      tamed,
      new Promise<T>((resolve) =>
        setTimeout(() => {
          console.warn(`[principal-agent] pre-flight timeout (${label}, ${ms}ms) — using fallback`);
          resolve(fallback);
        }, ms)
      ),
    ]);
  }

  // Resolve the school context Astra needs for her system prompt:
  // school name, principal name, persistent memories, knowledge summary.
  //
  // 🚨 SESSION 137 — this used to run BEFORE the ReadableStream was created,
  // which blocked the Response headers from going out: the browser saw a
  // pending POST with zero bytes for up to 13s and Astra looked frozen. It
  // is now invoked INSIDE the stream's start() (after the keepalive flush),
  // so the connection is alive and the glow is showing while these run.
  //
  // Timeouts are tight (2.5s names, 3s memory/knowledge) and ALL THREE run
  // fully in parallel — total ceiling ~3s. The real fail-fast is now the
  // hard fetch timeout in lib/supabase-client.ts; these are belt-and-braces.
  // Any miss degrades gracefully to a sensible fallback and Astra still
  // answers — the answer just lacks that school's name / memory / framework
  // depth for that one turn.
  async function resolveContext(): Promise<{
    schoolName: string;
    principalName: string;
    memorySection: string;
    knowledgeSummary: string;
  }> {
    const namesPromise = Promise.all([
      supabase.from('montree_schools').select('name').eq('id', auth.schoolId).maybeSingle(),
      supabase.from('montree_school_admins').select('name').eq('id', auth.userId).maybeSingle(),
    ]);
    const memoriesPromise = loadActiveMemories(supabase, auth.userId, 30);
    const knowledgePromise = getTracyKnowledgeSummary().catch((e) => {
      console.warn(
        '[principal-agent] knowledge summary load failed (non-fatal):',
        e instanceof Error ? e.message : 'unknown error'
      );
      return '';
    });

    const [names, principalMemories, knowledgeSummary] = await Promise.all([
      withTimeout(
        namesPromise,
        2_500,
        [{ data: null, error: null }, { data: null, error: null }] as Awaited<typeof namesPromise>,
        'school+principal name lookup'
      ),
      withTimeout(memoriesPromise, 3_000, [], 'loadActiveMemories'),
      withTimeout(knowledgePromise, 3_000, '', 'getTracyKnowledgeSummary'),
    ]);

    const [schoolRes, principalRes] = names;
    let schoolName = 'your school';
    let principalName = 'Principal';
    if (schoolRes.data?.name) schoolName = schoolRes.data.name;
    if (principalRes.data?.name) {
      // For a regular first+last name ("Tredoux Willemse") use the first
      // name — Astra greets warmly with "Hi, Tredoux". For a title-prefixed
      // name ("Principal Leu", "Ms Chen") splitting on space gives just the
      // title — "Hi, Principal" reads cold — so use the full name.
      const fullName = principalRes.data.name.trim();
      const TITLE_PREFIXES = /^(principal|ms|mrs|mr|dr|prof|professor|teacher|head|director)\.?\s+/i;
      principalName = TITLE_PREFIXES.test(fullName)
        ? fullName
        : (fullName.split(' ')[0] || 'Principal');
    }

    return {
      schoolName,
      principalName,
      memorySection: formatMemoriesForPrompt(principalMemories),
      knowledgeSummary,
    };
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

  // Today's date label for Astra's system prompt — formatted in the
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
        // 🚨 SESSION 136 HANG FIX — flush an immediate keepalive comment so
        // the response BODY starts streaming the moment the client connects.
        // Without this, the browser sees the headers come in but no body
        // bytes until the first Sonnet call returns (15-30s). The avatar
        // pulses forever and the user thinks Astra is broken. Sending an
        // SSE comment (`:` prefix) keeps the connection alive and tells
        // every proxy "data is flowing" without rendering anything on the
        // client. Some load balancers (Cloudflare, Railway's edge) also
        // benefit from the early flush — without it they can buffer the
        // entire response.
        controller.enqueue(encoder.encode(':keepalive\n\n'));

        // 🚨 SESSION 137 — resolve school context HERE, inside the stream,
        // not before it. The Response headers + keepalive have already gone
        // out, so the client shows the glow while these lookups run. An
        // explicit `thinking` event makes the indicator appear instantly
        // even on clients that wait for a first parsed event before glowing.
        controller.enqueue(sse(encoder, { type: 'thinking', text: '' }));

        const { schoolName, principalName, memorySection, knowledgeSummary } =
          await resolveContext();

        const systemPrompt = buildTracySystemPrompt({
          schoolName,
          principalName,
          todayLabel,
          locale,
          memorySection,
          knowledgeSummary,
        });

        // Minimal, tool-free fallback prompt. Used ONLY as a last resort when
        // the full prompt produces an empty Sonnet response (see the retry
        // ladder below). No tools, no worked example, no knowledge bundle —
        // just enough for Astra to answer in plain text. A prompt this small
        // effectively never returns empty, which is the whole point: it
        // guarantees the principal gets a real answer instead of a blank
        // bubble or a "please try again" message.
        const minimalSystemPrompt =
          `You are Astra, ${principalName}'s chief-of-staff at ${schoolName}. ` +
          `Today is ${todayLabel}.${getAILanguageInstruction(locale)}\n\n` +
          `Answer the principal's question directly and concisely in a warm, ` +
          `practical voice. If you'd need school data you don't have in front ` +
          `of you, say briefly what you'd check, then give your best guidance ` +
          `anyway. End with one concrete next step.`;

        const conversationMessages: MessageParam[] = [...initialMessages];
        let lastAssistantBlocks: ContentBlockParam[] = [];
        let pendingToolResults: ToolResultBlockParam[] = [];
        let toolRound = 0;
        // One-shot guard: we recover from an empty Sonnet response at most once
        // per request (see the empty-response recovery block below).
        let emptyRecoveryDone = false;

        while (toolRound < MAX_TOOL_ROUNDS) {
          if (Date.now() - startTime > TOTAL_TIMEOUT_MS) {
            logError = `Total timeout (${Math.round(TOTAL_TIMEOUT_MS / 1000)}s) exceeded`;
            controller.enqueue(
              sse(encoder, { type: 'error', error: logError })
            );
            break;
          }

          // 🚨 SESSION 137 ROOT-CAUSE FIX — send the FULL accumulated
          // conversation each round, not a one-shot slice.
          //
          // The OLD code built a `messagesForRound` containing only the SINGLE
          // most-recent assistant+tool exchange on top of the original
          // question. Across multi-round tool use the transcript NEVER GREW:
          // every round Sonnet saw "question + one tool call + one result" and
          // never learned it had ALREADY called tools. So it called a tool
          // every single round, exhausted MAX_TOOL_ROUNDS, and fell out of the
          // loop with no final text → the blank bubble that haunted Astra for
          // 7 sessions. (Production logs: stop_reason=tool_use every round,
          // input_tokens frozen at 16736 = transcript not accumulating.)
          //
          // We now append each round's assistant turn + tool results into
          // `conversationMessages` at the END of the round (see below), so each
          // round carries the whole history and Sonnet converges to an answer.
          let response;
          try {
            response = await client.messages.create(
              {
                model,
                // 🚨 Bumped from 2048 → 4096 (May 29, 2026). With 25 tools +
                // 13K-token psychological knowledge bundle + memory + new
                // ACT-vs-DRAFT prompt block, the input context grew enough
                // that Sonnet was hitting max_tokens mid-response and the
                // tool-use loop would stall on a partial tool_use block.
                // 4096 matches PREPARE_MEETING_MAX_TOKENS — same ceiling
                // the dossier tool uses internally.
                max_tokens: 4096,
                // 🚨 Prompt caching (Session 137 health check): the system
                // prompt + tools are byte-identical across every round of this
                // request (and across the agent's rapid follow-ups within the
                // 5-min cache TTL). Marking the system block caches the
                // tools-then-system prefix (~16K tokens) so rounds 2-N — and
                // the recovery/forced-summary calls — read from cache instead
                // of re-billing the full prefix. ~90% input-token cut + faster.
                system: [{ type: 'text' as const, text: systemPrompt, cache_control: { type: 'ephemeral' as const } }],
                tools: TRACY_TOOLS,
                messages: conversationMessages,
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

          // 🚨 May 29, 2026 — diagnostic. Astra was returning empty bubbles
          // on Whale Class in Chinese. Without this log we had no idea
          // whether Sonnet was responding at all and what stop_reason it
          // hit. The empty-response detection below depends on knowing
          // exactly what blocks came back.
          console.log(
            `[principal-agent] sonnet_round=${toolRound} stop_reason=${response.stop_reason ?? '?'} ` +
            `blocks=${response.content.length} ` +
            `types=${response.content.map((b) => b.type).join(',')} ` +
            `input_tokens=${response.usage?.input_tokens ?? 0} ` +
            `output_tokens=${response.usage?.output_tokens ?? 0}`
          );

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

              // Session 136 — diagnostic init event for prepare_parent_meeting.
              // Fires the INSTANT the tool starts (before any cache check,
              // before any Sonnet call). UI can render "Preparing the
              // dossier…" immediately instead of staring at a silent
              // tool chip spinner for 3-5s while the cache key resolves +
              // the first Sonnet token lands. This is the canonical
              // diagnostic signal — if init fires but no meeting_brief or
              // meeting_brief_chunk follows, we know the tool started but
              // stalled. If init never fires, the tool never started.
              if (block.name === 'prepare_parent_meeting') {
                const inputObj = (block.input ?? {}) as Record<string, unknown>;
                controller.enqueue(
                  sse(encoder, {
                    type: 'meeting_brief_init',
                    child_id: typeof inputObj.childId === 'string' ? inputObj.childId : null,
                    meeting_purpose:
                      typeof inputObj.meetingPurpose === 'string'
                        ? inputObj.meetingPurpose.slice(0, 240)
                        : null,
                  })
                );
              }

              const result = await executeTracyTool(
                block.name,
                block.input as Record<string, unknown>,
                {
                  supabase,
                  anthropic,
                  schoolId: auth.schoolId,
                  principalId: auth.userId,
                  request,
                  locale,
                  // Forward progress phases out as SSE so the client can render
                  // Guru-style live status under each tool chip. Tools emit
                  // structured { phase, vars } events; the client formats them
                  // via tracy.progress.<phase> i18n keys with vars interpolated.
                  onProgress: (evt) => {
                    controller.enqueue(
                      sse(encoder, {
                        type: 'tool_progress',
                        tool: evt.tool,
                        phase: evt.phase,
                        vars: evt.vars || {},
                      })
                    );
                  },
                  // Session 135 — stream parent-meeting dossier tokens
                  // directly to the client as they land. Each chunk
                  // carries { section, delta }. The UI appends each
                  // delta to turn.meetingBrief.brief_markdown (or
                  // .dossier_markdown) progressively. First brief token
                  // appears at ~3-5s instead of waiting ~25s for the
                  // full block. The final meeting_brief event still
                  // fires at tool completion for state-coherence + cache
                  // metadata.
                  onMeetingStream: (chunk) => {
                    controller.enqueue(
                      sse(encoder, {
                        type: 'meeting_brief_chunk',
                        section: chunk.section,
                        delta: chunk.delta,
                      })
                    );
                  },
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

              // Session 135 — when prepare_parent_meeting succeeds, emit a
              // dedicated `meeting_brief` event with the BRIEF + DOSSIER
              // markdown. The UI renders the brief as the primary artifact
              // and tucks the dossier behind a "Show me the full thinking"
              // disclosure. This bypasses Astra's text stream for the
              // payload itself — Astra's job becomes just the one-line
              // introduction. Without this event the UI would have to
              // parse out the markdown from Astra's prose; this is cleaner.
              if (
                block.name === 'prepare_parent_meeting' &&
                result.success &&
                result.data &&
                typeof result.data === 'object'
              ) {
                const d = result.data as {
                  brief_markdown?: string | null;
                  dossier_markdown?: string | null;
                  child_name?: string;
                  from_cache?: boolean;
                };
                if (d.brief_markdown || d.dossier_markdown) {
                  controller.enqueue(
                    sse(encoder, {
                      type: 'meeting_brief',
                      brief_markdown: d.brief_markdown ?? null,
                      dossier_markdown: d.dossier_markdown ?? null,
                      child_name: d.child_name ?? null,
                      from_cache: d.from_cache ?? false,
                    })
                  );
                }
              }

              // Session 153 — when get_child_photos succeeds, emit a dedicated
              // `child_photos` event carrying the structured photo array (each
              // with its curriculum area). The UI renders a filterable,
              // full-screen swipeable album from this — Astra's prose stays a
              // short narrative and does NOT paste image markdown (avoids
              // duplicate rendering).
              if (
                block.name === 'get_child_photos' &&
                result.success &&
                result.data &&
                typeof result.data === 'object'
              ) {
                const d = result.data as { photos?: unknown[] };
                if (Array.isArray(d.photos) && d.photos.length) {
                  controller.enqueue(
                    sse(encoder, { type: 'child_photos', photos: d.photos })
                  );
                }
              }

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

          // 🚨 SESSION 137 — accumulate THIS round into the running transcript
          // so the next round (and the forced summary below) sees the full
          // history. Assistant turn first, then the tool results as the
          // following user turn — the order the Anthropic API requires for
          // multi-round tool use. This is the other half of the root-cause fix
          // noted above: without it the conversation never grows and Sonnet
          // never converges.
          if (lastAssistantBlocks.length > 0) {
            conversationMessages.push({
              role: 'assistant',
              content: lastAssistantBlocks,
            });
          }
          if (pendingToolResults.length > 0) {
            conversationMessages.push({
              role: 'user',
              content: pendingToolResults,
            });
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

          // 🚨 May 29, 2026 — empty-response detection.
          // When all three pre-flight Supabase calls time out on a slow
          // connection, the system prompt gets the 'your school' /
          // 'Principal' / no-memory / no-knowledge fallbacks. Sonnet
          // sometimes responds with stop_reason='end_turn' and zero
          // blocks — no tool_use, no text. The loop then breaks
          // silently, the `done` event fires, and the client renders an
          // empty assistant bubble with no glow and no error message.
          // The user thinks Astra is broken.
          //
          // When this happens, emit a user-visible error instead of
          // silently closing. The principal sees "I had trouble loading
          // your school context — please try again." rather than a
          // blank avatar.
          if (!hasToolUse && !roundText) {
            // 🚨 SESSION 137 — empty-response RECOVERY (replaces the old
            // "please try again" dead-end that defined the bug for 7 sessions).
            //
            // A round with no text AND no tool_use is the failure that produced
            // the empty bubble. Instead of surfacing an error, recover
            // automatically: re-ask Sonnet ONCE with a minimal, tool-free
            // prompt and just the principal's question. Stripped of the 25-tool
            // schema and the worked example, with a real question in front of
            // it, Sonnet effectively always returns text — so the principal
            // gets a real (if tool-free) answer instead of nothing. We only
            // attempt this once per request.
            if (!emptyRecoveryDone) {
              emptyRecoveryDone = true;
              console.warn(
                `[principal-agent] empty response on round ${toolRound} ` +
                `(stop_reason=${response.stop_reason ?? '?'}). Recovering with a ` +
                `minimal tool-free prompt.`
              );
              let recovery: Message | null = null;
              try {
                recovery = await client.messages.create(
                  {
                    model,
                    max_tokens: 1024,
                    system: minimalSystemPrompt,
                    messages: [{ role: 'user', content: question }],
                  },
                  { timeout: API_TIMEOUT_MS }
                );
              } catch (recErr) {
                console.error(
                  '[principal-agent] recovery call failed:',
                  recErr instanceof Error ? recErr.message : 'unknown'
                );
              }
              if (recovery?.usage) {
                totalInputTokens += recovery.usage.input_tokens ?? 0;
                totalOutputTokens += recovery.usage.output_tokens ?? 0;
              }
              const recoveryText = (recovery?.content ?? [])
                .map((b) => (b.type === 'text' ? b.text : ''))
                .join('')
                .trim();
              if (recoveryText) {
                finalAnswerText += recoveryText;
                controller.enqueue(sse(encoder, { type: 'text', text: recoveryText }));
                break; // recovered — done
              }
              // Recovery itself came back empty (extremely rare). Fall through
              // to the honest error below.
            }
            logError = `Sonnet returned empty response after recovery (stop_reason=${response.stop_reason ?? 'unknown'}, blocks=${response.content.length})`;
            console.error(
              `[principal-agent] EMPTY RESPONSE (unrecovered) — toolRound=${toolRound} ` +
              `stop_reason=${response.stop_reason ?? 'unknown'}.`
            );
            controller.enqueue(
              sse(encoder, {
                type: 'error',
                error:
                  "I couldn't put an answer together just now — please ask again.",
              })
            );
            break;
          }

          if (!hasToolUse) break;
          toolRound++;
        }

        // 🚨 SESSION 137 — round-cap safety net. If the tool-use loop ran out
        // of rounds while Astra was still calling tools (hasToolUse every
        // round), she never produced a final answer and finalAnswerText is
        // empty. Rather than close with a blank bubble, make ONE final call
        // over the full accumulated transcript with tool_choice:'none' so
        // Sonnet MUST summarize what it gathered into plain text. Guarded on
        // !finalAnswerText (only when there's genuinely no answer yet) and
        // !logError (don't override an error already surfaced to the client).
        if (!finalAnswerText && !logError) {
          console.warn(
            '[principal-agent] tool loop exhausted with no final text — ' +
            'forcing a tool-free summary turn (tool_choice:none).'
          );
          try {
            const forced = await client.messages.create(
              {
                model,
                max_tokens: 1024,
                // 🚨 Prompt caching (Session 137 health check): the system
                // prompt + tools are byte-identical across every round of this
                // request (and across the agent's rapid follow-ups within the
                // 5-min cache TTL). Marking the system block caches the
                // tools-then-system prefix (~16K tokens) so rounds 2-N — and
                // the recovery/forced-summary calls — read from cache instead
                // of re-billing the full prefix. ~90% input-token cut + faster.
                system: [{ type: 'text' as const, text: systemPrompt, cache_control: { type: 'ephemeral' as const } }],
                tools: TRACY_TOOLS,
                tool_choice: { type: 'none' },
                messages: conversationMessages,
              },
              { timeout: API_TIMEOUT_MS }
            );
            if (forced.usage) {
              totalInputTokens += forced.usage.input_tokens ?? 0;
              totalOutputTokens += forced.usage.output_tokens ?? 0;
            }
            const forcedText = forced.content
              .map((b) => (b.type === 'text' ? b.text : ''))
              .join('')
              .trim();
            if (forcedText) {
              finalAnswerText += forcedText;
              controller.enqueue(sse(encoder, { type: 'text', text: forcedText }));
            } else {
              logError = 'Forced summary returned empty';
              controller.enqueue(
                sse(encoder, {
                  type: 'error',
                  error: "I couldn't put an answer together just now — please ask again.",
                })
              );
            }
          } catch (forceErr) {
            logError = forceErr instanceof Error ? forceErr.message : 'forced summary failed';
            console.error('[principal-agent] forced summary failed:', logError);
            controller.enqueue(
              sse(encoder, {
                type: 'error',
                error: "I couldn't put an answer together just now — please ask again.",
              })
            );
          }
        }

        // Compute cost (per-model rates — see costRates above).
        const costUsd =
          (totalInputTokens / 1_000_000) * costRates.input +
          (totalOutputTokens / 1_000_000) * costRates.output;

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
                (totalInputTokens / 1_000_000) * costRates.input +
                (totalOutputTokens / 1_000_000) * costRates.output
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
