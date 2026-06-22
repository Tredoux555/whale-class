// app/api/story/coach/route.ts
//
// The Coach — Tredoux's life-coach + chief-of-staff. Story-admin only.
// SSE Sonnet tool-use loop, modeled on app/api/montree/admin/principal-agent
// (keepalive, full-transcript accumulation, empty-response recovery, forced
// summary, per-call + total timeouts). Single user → no tier gate, no scoping.
//
// SSE events: :keepalive · {type:'thinking'} · {type:'tool_call',tool} ·
//   {type:'tool_result',tool,success} · {type:'text',text} · {type:'done'} ·
//   {type:'error',error}

import { NextRequest, after } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, ContentBlockParam, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages';
import { getSupabase, verifyAdminToken, getAdminSpace } from '@/lib/story-db';
import { selectAdminUserForAuth } from '@/lib/sanctuary-e2e/server-auth';
import { anthropic, AI_MODEL, HAIKU_MODEL } from '@/lib/ai/anthropic';
import {
  getEntitlement,
  getMonthlySonnetCount,
  incrementSonnetCount,
  sonnetCapFor,
  currentPeriodMonth,
  COACH_SONNET_WARN_MARGIN,
  COACH_SONNET_OVERSHOOT,
} from '@/lib/story/coach/entitlement';
import { readDiaryField, encryptDiaryField, encryptDiaryFieldOrNull, isDiaryEncryptionConfigured } from '@/lib/story/diary-crypto';
import {
  buildCoachSystemPrompt,
  buildChildCoachSystemPrompt,
  COACH_TOOLS,
  CHILD_COACH_TOOLS,
  executeCoachTool,
  loadCoachMemories,
  formatCoachMemoriesForPrompt,
  getCoachWisdomSummary,
  getCoachProfile,
  displayNameForSpace,
  computeLoad,
  formatLoadSnapshot,
  loadRecentThread,
  isConsolidationDue,
  consolidateCoachDay,
  getFamilyRole,
  loadIncomingContextForCoach,
  formatChildContextForPrompt,
  formatPartnerContextForPrompt,
  loadActiveNudgeForSpace,
  formatNudgeForPrompt,
  resolveFamilyKey,
  runFamilyBrain,
} from '@/lib/story/coach';

export const maxDuration = 180;
export const dynamic = 'force-dynamic';

const MAX_TOOL_ROUNDS = 6;
const TOTAL_TIMEOUT_MS = 120_000;
const API_TIMEOUT_MS = 60_000;
const MAX_TOOL_RESULT_CHARS = 50_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sse(encoder: TextEncoder, payload: Record<string, unknown>): Uint8Array {
  return encoder.encode('data: ' + JSON.stringify(payload) + '\n\n');
}

interface BodyShape {
  question?: string;
  history?: MessageParam[];
  reflect_entry_id?: string;
  conversation_id?: string;
  /** The client's IANA timezone + local ISO datetime, so "today/now" is theirs. */
  client_tz?: string;
  client_now?: string;
  /** An optional attached image the coach should read (vision). base64, no prefix. */
  image?: { media_type?: string; data?: string };
  /**
   * The model depth pinned for THIS conversation, echoed back by the client on
   * every turn after the first (neutral token — never a model name). Absent on
   * turn 1, where the server decides fresh.
   */
  pinned_mode?: 'full' | 'quiet';
}

const IANA_TZ_RE = /^[A-Za-z][A-Za-z0-9_+-]*(?:\/[A-Za-z0-9_+-]+)*$/;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_IMAGE_B64 = 7_000_000; // ~5 MB decoded — the client downscales before sending

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  const admin = await verifyAdminToken(request.headers.get('authorization'));
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  // The caller's sanctuary space — sourced ONLY from the verified token, never
  // the client. Every read/write below is scoped to it so one space can never
  // see another's data.
  const space = await getAdminSpace(request.headers.get('authorization'));
  if (!space) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  if (!anthropic) {
    return new Response(JSON.stringify({ error: 'AI is not configured.' }), { status: 503 });
  }

  let body: BodyShape;
  try {
    body = (await request.json()) as BodyShape;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  let question = (body.question || '').trim();
  const reflectId = typeof body.reflect_entry_id === 'string' && UUID_RE.test(body.reflect_entry_id)
    ? body.reflect_entry_id
    : null;

  // Optional attached image the coach should READ (vision). Validated here;
  // never persisted server-side (transient like the voice audio). Works for
  // adult + child coaches alike — Sonnet reads the text/contents natively.
  let image: { media_type: string; data: string } | null = null;
  if (body.image && typeof body.image.data === 'string' && typeof body.image.media_type === 'string') {
    const mt = body.image.media_type;
    const data = body.image.data;
    if (ALLOWED_IMAGE_TYPES.has(mt) && data.length > 0 && data.length <= MAX_IMAGE_B64) {
      image = { media_type: mt, data };
    } else if (data.length > MAX_IMAGE_B64) {
      return new Response(JSON.stringify({ error: 'That image is too large — try a smaller photo.' }), { status: 400 });
    }
  }

  if (!question && !reflectId && !image) {
    return new Response(JSON.stringify({ error: 'question required' }), { status: 400 });
  }
  // Generous — this is his journal/coach; he writes long brain-dumps.
  if (question.length > 16000) {
    return new Response(JSON.stringify({ error: 'That message is very long — break it into two and send again.' }), { status: 400 });
  }

  const supabase = getSupabase();

  // Is this an e2e (native, device-encrypted) space? Sourced from the DB by the
  // verified username, NOT from the client — getting this wrong would persist a
  // plaintext coach turn server-readable. For e2e spaces the Coach still answers
  // (the explicit per-message cloud opt-in: the device assembles + sends the
  // plaintext context for THIS turn) but persists NOTHING readable server-side.
  // Degrades to non-e2e before migration 265 (column absent → false).
  const isE2e = (await selectAdminUserForAuth(supabase, admin))?.e2e === true;

  // ── Prompt economy: Sonnet ('full') vs Haiku ('quiet'), PINNED per conversation ──
  // (MONETISATION SPEC v1.0). Access is NEVER gated here — this only selects model
  // DEPTH (rule #318). The depth is decided on the FIRST turn and pinned for the
  // rest: the client echoes `pinned_mode` back each turn so the sitting never
  // changes voice mid-thread; a new conversation re-decides fresh. The owner
  // (comped) is always Sonnet, never metered. Over the monthly Sonnet cap → silent
  // Haiku. An overshoot ceiling hard-drops even a pinned-Sonnet thread past
  // cap+OVERSHOOT so one never-closed conversation can't farm unlimited Sonnet.
  const pinnedMode: 'full' | 'quiet' | null =
    body.pinned_mode === 'full' || body.pinned_mode === 'quiet' ? body.pinned_mode : null;
  const entitlement = await getEntitlement(supabase, space);
  const periodMonth = currentPeriodMonth();
  const sonnetCap = sonnetCapFor(entitlement);
  const priorSonnet = entitlement.isComped ? 0 : await getMonthlySonnetCount(supabase, space, periodMonth);

  let coachMode: 'full' | 'quiet';
  if (entitlement.isComped) {
    coachMode = 'full';
  } else if (pinnedMode === 'quiet') {
    coachMode = 'quiet';
  } else if (pinnedMode === 'full') {
    coachMode = priorSonnet >= sonnetCap + COACH_SONNET_OVERSHOOT ? 'quiet' : 'full';
  } else {
    coachMode = priorSonnet < sonnetCap ? 'full' : 'quiet';
  }
  const coachModel = coachMode === 'full' ? AI_MODEL : HAIKU_MODEL;
  // This turn consumes a Sonnet credit only when we actually run Sonnet for a
  // non-comped space. The "approaching" warning fires in the WARN_MARGIN window
  // just before the cap (≈180 free / ≈480 paid).
  const willMeter = coachMode === 'full' && !entitlement.isComped;
  const projectedSonnet = willMeter ? priorSonnet + 1 : priorSonnet;
  const meterApproaching =
    willMeter && projectedSonnet >= sonnetCap - COACH_SONNET_WARN_MARGIN && projectedSonnet < sonnetCap;

  // Sanitize client history → text-only { role, content } (same posture as
  // principal-agent: never trust client-supplied tool_use/tool_result blocks).
  const sanitizeHistory = (raw: unknown): MessageParam[] => {
    if (!Array.isArray(raw)) return [];
    const out: MessageParam[] = [];
    for (const item of raw.slice(-12)) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      const role = obj.role === 'assistant' ? 'assistant' : 'user';
      let text = '';
      if (typeof obj.content === 'string') text = obj.content;
      text = text.trim();
      if (!text) continue;
      out.push({ role, content: text.slice(0, 16000) });
    }
    return out;
  };
  // Working memory: resume the running thread from the server-side archive
  // (recent, not-yet-consolidated turns) so the Coach knows exactly where Tredoux
  // left off — even after a reload or on another device. The client-supplied
  // history is only a fallback for the very first turn (nothing logged yet).
  const clientHistory = sanitizeHistory(body.history);
  // e2e spaces have NO server-readable thread (turns are never logged server-side
  // for them) — use the device-supplied history only.
  const serverThread = isE2e
    ? []
    : await loadRecentThread(supabase, space, { maxTurns: 12, withinHours: 72 });
  const history = serverThread.length ? serverThread : clientHistory;

  // Reflect-on-entry: fetch the entry server-side and build a grounded prompt.
  if (reflectId) {
    const { data } = await supabase
      .from('story_diary_entries')
      .select('entry_date, mood, title_enc, body_enc, cipher_version')
      .eq('id', reflectId)
      .eq('space', space)
      .maybeSingle();
    if (data) {
      const title = readDiaryField(data.title_enc, data.cipher_version);
      const text = readDiaryField(data.body_enc, data.cipher_version);
      const head = `Please reflect on my diary entry from ${data.entry_date}${data.mood ? ` (mood: ${data.mood})` : ''}:\n\n` +
        `${title ? title + '\n\n' : ''}${text}\n\n` +
        `What patterns or themes do you notice? Reflect like a thoughtful friend who knows me.`;
      question = question ? `${question}\n\n${head}` : head;
    }
  }

  // Day/time, anchored to the CALLER's timezone (sent by the client), not the
  // server's. Without this the prompt label (server-local) and the tool date
  // defaults (UTC) could disagree by hours or a whole day. clientTz also flows
  // into the tool deps so add_event / add_diary_entry default to the caller's day.
  const clientTz = typeof body.client_tz === 'string' && IANA_TZ_RE.test(body.client_tz) ? body.client_tz : undefined;
  const nowInstant = (() => {
    if (typeof body.client_now === 'string') {
      const d = new Date(body.client_now);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return new Date();
  })();
  const todayLabel = (() => {
    try {
      const datePart = new Intl.DateTimeFormat('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        ...(clientTz ? { timeZone: clientTz } : {}),
      }).format(nowInstant);
      let hour = 12;
      try {
        hour = Number(new Intl.DateTimeFormat('en-US', {
          hour: '2-digit', hour12: false, hourCycle: 'h23',
          ...(clientTz ? { timeZone: clientTz } : {}),
        }).format(nowInstant));
      } catch { /* keep default */ }
      const part = hour < 5 ? 'late at night' : hour < 12 ? 'in the morning' : hour < 17 ? 'in the afternoon' : hour < 21 ? 'in the evening' : 'at night';
      return `${datePart}, ${part}${clientTz ? '' : ' (server time)'}`;
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  })();

  const encoder = new TextEncoder();
  const client = anthropic as Anthropic;

  // "On wake" consolidation: after this reply is sent (next/server `after()` keeps
  // the invocation alive), if a prior day still has unconsolidated turns, fold it
  // into long-term memory + a diary recap. Runs at most once/day (the due-check
  // returns false once yesterday is stamped), off the user's critical path.
  after(async () => {
    // e2e spaces persist NOTHING readable server-side — no consolidation into
    // server-key coach memory / diary recaps. The device owns its encrypted log.
    if (isE2e) return;
    try {
      const due = await isConsolidationDue(supabase, space);
      if (!due.due) return;
      const res = await consolidateCoachDay(supabase, client, space);
      if (res.ok && (res.turns > 0 || res.memories > 0)) {
        console.info(`[coach] consolidated ${res.turns} turns → ${res.memories} memories`);
      } else if (!res.ok) {
        console.warn('[coach] consolidation failed:', res.error);
      }
    } catch (e) {
      console.warn('[coach] consolidation skipped:', e instanceof Error ? e.message : 'unknown');
    }
  });

  // After-the-reply: if a family signal was emitted this turn, refresh the Family
  // Brain (re-detect the family pattern + write fresh tonal nudges). This reads
  // ONLY structured signals + parent-authored context notes — never any sealed
  // conversation — so it is safe to run for e2e spaces too.
  after(async () => {
    try {
      if (!toolsUsed.includes('emit_family_signal')) return;
      const familyKey = await resolveFamilyKey(supabase, space);
      const res = await runFamilyBrain(supabase, client, AI_MODEL, familyKey);
      if (res.nudgeCount) console.info(`[coach] family brain refreshed → ${res.nudgeCount} nudge(s)`);
    } catch (e) {
      console.warn('[coach] family brain skipped:', e instanceof Error ? e.message : 'unknown');
    }
  });

  // The current turn's content. With an image attached, it becomes a
  // text+image block array so the coach can READ the image; otherwise plain text.
  // History stays text-only (sanitized) — the image rides only on this turn.
  const turnContent: MessageParam['content'] = image
    ? [
        { type: 'text', text: question || 'Please read this image and tell me what it says.' },
        { type: 'image', source: { type: 'base64', media_type: image.media_type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: image.data } },
      ]
    : question;
  const initialMessages: MessageParam[] = [...history, { role: 'user', content: turnContent }];

  const conversationId = typeof body.conversation_id === 'string' ? body.conversation_id.slice(0, 64) : null;
  const toolsUsed: string[] = [];
  let totalInput = 0;
  let totalOutput = 0;
  let finalText = '';

  // Meter the Sonnet turn AFTER the reply lands (off the response path). Only a
  // non-comped 'full' turn that actually produced a reply is counted — undercount
  // favours the user and the product never hard-stops, so this is safe.
  after(async () => {
    if (!willMeter || !finalText.trim()) return;
    try {
      await incrementSonnetCount(supabase, space, periodMonth);
    } catch (e) {
      console.warn('[coach] sonnet meter increment skipped:', e instanceof Error ? e.message : 'unknown');
    }
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(':keepalive\n\n'));
        controller.enqueue(sse(encoder, { type: 'thinking', text: '' }));

        // Is this a CHILD's coach? Drives the persona, toolset, and how incoming
        // family context is framed. Tolerant (missing migration → 'adult').
        const familyRole = await getFamilyRole(supabase, space).catch(() => 'adult' as const);
        const isChild = familyRole === 'child';
        const coachName = displayNameForSpace(space);

        // Resolve context. For a child we skip the adult productivity wisdom + load.
        const [memories, profileSection, incomingNotes, nudgeText, wisdomSummary, load] = await Promise.all([
          loadCoachMemories(supabase, space, 40).catch(() => []),
          getCoachProfile(space).catch(() => ''),
          loadIncomingContextForCoach(supabase, space).catch(() => []),
          loadActiveNudgeForSpace(supabase, space).catch(() => null),
          isChild ? Promise.resolve('') : getCoachWisdomSummary().catch(() => ''),
          isChild ? Promise.resolve(null) : computeLoad(supabase, space).catch(() => null),
        ]);

        // Captain context shared INTO this coach: quiet background for a child;
        // transparent loved-one context for an adult. WRITE-ONLY (no read path back).
        const parentContextSection = incomingNotes.length
          ? (isChild ? formatChildContextForPrompt(incomingNotes, coachName) : formatPartnerContextForPrompt(incomingNotes, coachName))
          : '';
        // A quiet Family-Brain tonal shift for this conversation (never an alert).
        const nudgeSection = nudgeText ? formatNudgeForPrompt(nudgeText) : '';

        const tools = isChild ? CHILD_COACH_TOOLS : COACH_TOOLS;
        const systemPrompt = isChild
          ? buildChildCoachSystemPrompt({
              displayName: coachName,
              todayLabel,
              memorySection: formatCoachMemoriesForPrompt(memories, coachName),
              profileSection,
              parentContextSection,
              nudgeSection,
              isFirstSession: memories.length === 0,
            })
          : buildCoachSystemPrompt({
              displayName: coachName,
              todayLabel,
              memorySection: formatCoachMemoriesForPrompt(memories, coachName),
              wisdomSummary,
              profileSection,
              isFirstSession: memories.length === 0,
              loadSnapshot: load ? formatLoadSnapshot(load) : 'No load data available right now.',
              parentContextSection,
              nudgeSection,
            });
        const minimalSystemPrompt = isChild
          ? `You are ${coachName}'s warm, kind coach — a friend in their corner. Today is ${todayLabel}. Answer ` +
            `simply and warmly, help them feel heard, and end with one small, kind next step.`
          : `You are ${coachName}'s warm, direct life-coach. Today is ${todayLabel}. Answer their message ` +
            `thoughtfully and concisely, protect them from overcommitment and burnout, and end with one ` +
            `clear next step.`;

        const conversation: MessageParam[] = [...initialMessages];
        let toolRound = 0;
        let emptyRecoveryDone = false;
        let logError: string | null = null;

        while (toolRound < MAX_TOOL_ROUNDS) {
          if (Date.now() - startTime > TOTAL_TIMEOUT_MS) {
            controller.enqueue(sse(encoder, { type: 'error', error: 'This took too long — please ask again.' }));
            break;
          }

          let response;
          try {
            response = await client.messages.create(
              {
                model: coachModel,
                max_tokens: 4096,
                system: [{ type: 'text' as const, text: systemPrompt, cache_control: { type: 'ephemeral' as const } }],
                tools,
                messages: conversation,
              },
              { timeout: API_TIMEOUT_MS },
            );
          } catch (apiErr) {
            const msg = apiErr instanceof Error ? apiErr.message : 'API error';
            controller.enqueue(sse(encoder, { type: 'error', error: msg }));
            break;
          }

          if (response.usage) {
            totalInput += response.usage.input_tokens ?? 0;
            totalOutput += response.usage.output_tokens ?? 0;
          }

          const lastAssistantBlocks: ContentBlockParam[] = [];
          const pendingToolResults: ToolResultBlockParam[] = [];
          let hasToolUse = false;
          const roundTextParts: string[] = [];

          for (const block of response.content) {
            if (block.type === 'text') {
              roundTextParts.push(block.text);
              lastAssistantBlocks.push({ type: 'text', text: block.text });
            } else if (block.type === 'tool_use') {
              hasToolUse = true;
              lastAssistantBlocks.push({
                type: 'tool_use', id: block.id, name: block.name, input: block.input,
              } as unknown as ContentBlockParam);

              toolsUsed.push(block.name);
              controller.enqueue(sse(encoder, { type: 'tool_call', tool: block.name }));
              const result = await executeCoachTool(block.name, block.input as Record<string, unknown>, { supabase, space, role: familyRole, tz: clientTz });
              controller.enqueue(sse(encoder, { type: 'tool_result', tool: block.name, success: result.success }));

              const resultText = result.success ? JSON.stringify(result.data) : `Error: ${result.error || 'unknown'}`;
              pendingToolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: resultText.substring(0, MAX_TOOL_RESULT_CHARS),
                is_error: !result.success,
              });
            }
          }

          if (lastAssistantBlocks.length) conversation.push({ role: 'assistant', content: lastAssistantBlocks });
          if (pendingToolResults.length) conversation.push({ role: 'user', content: pendingToolResults });

          const roundText = roundTextParts.join('').trim();
          if (roundText) {
            if (hasToolUse) {
              controller.enqueue(sse(encoder, { type: 'thinking', text: roundText }));
            } else {
              finalText += roundText;
              controller.enqueue(sse(encoder, { type: 'text', text: roundText }));
            }
          }

          // Empty-response recovery (one shot): re-ask with a minimal prompt.
          if (!hasToolUse && !roundText) {
            if (!emptyRecoveryDone) {
              emptyRecoveryDone = true;
              try {
                const recovery = await client.messages.create(
                  { model: coachModel, max_tokens: 1024, system: minimalSystemPrompt, messages: [{ role: 'user', content: turnContent }] },
                  { timeout: API_TIMEOUT_MS },
                );
                if (recovery.usage) { totalInput += recovery.usage.input_tokens ?? 0; totalOutput += recovery.usage.output_tokens ?? 0; }
                const recText = recovery.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
                if (recText) {
                  finalText += recText;
                  controller.enqueue(sse(encoder, { type: 'text', text: recText }));
                  break;
                }
              } catch (e) {
                console.error('[coach] recovery failed:', e instanceof Error ? e.message : 'unknown');
              }
            }
            logError = 'empty response';
            controller.enqueue(sse(encoder, { type: 'error', error: "I couldn't put a reply together just now — try again." }));
            break;
          }

          if (!hasToolUse) break;
          toolRound++;
        }

        // Round-cap safety net — force a tool-free summary if no final text yet.
        if (!finalText && !logError) {
          try {
            const forced = await client.messages.create(
              {
                model: coachModel,
                max_tokens: 1024,
                system: [{ type: 'text' as const, text: systemPrompt, cache_control: { type: 'ephemeral' as const } }],
                tools,
                tool_choice: { type: 'none' },
                messages: conversation,
              },
              { timeout: API_TIMEOUT_MS },
            );
            if (forced.usage) { totalInput += forced.usage.input_tokens ?? 0; totalOutput += forced.usage.output_tokens ?? 0; }
            const forcedText = forced.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
            if (forcedText) {
              finalText += forcedText;
              controller.enqueue(sse(encoder, { type: 'text', text: forcedText }));
            } else {
              controller.enqueue(sse(encoder, { type: 'error', error: "I couldn't put a reply together just now — try again." }));
            }
          } catch (e) {
            console.error('[coach] forced summary failed:', e instanceof Error ? e.message : 'unknown');
            controller.enqueue(sse(encoder, { type: 'error', error: "I couldn't put a reply together just now — try again." }));
          }
        }

        // Prompt-economy meter — NEUTRAL tokens only (mode 'full'|'quiet', never a
        // model name; rule #323). The client pins `mode` for this conversation and
        // echoes it back next turn; `approaching` triggers the one-time warning.
        controller.enqueue(sse(encoder, { type: 'meter', mode: coachMode, approaching: meterApproaching }));

        controller.enqueue(sse(encoder, { type: 'done', duration_ms: Date.now() - startTime, in: totalInput, out: totalOutput }));

        // Archive the exchange (encrypted, fire-and-forget) — the durable record.
        // Degrades silently if migration 259 isn't run or encryption is unavailable.
        // SKIPPED for e2e spaces: the server must persist NOTHING readable; the
        // device keeps its own encrypted coach log.
        if (!isE2e && isDiaryEncryptionConfigured()) {
          void supabase
            .from('story_coach_log')
            .insert({
              space,
              conversation_id: conversationId,
              question_enc: encryptDiaryField(question.slice(0, 8000)),
              answer_enc: encryptDiaryFieldOrNull(finalText.slice(0, 12000)),
              tools_used: toolsUsed,
              cipher_version: 1,
            })
            .then(({ error }) => { if (error) console.warn('[coach] log insert skipped:', error.message); });
        }
      } catch (streamErr) {
        const msg = streamErr instanceof Error ? streamErr.message : 'Stream error';
        controller.enqueue(sse(encoder, { type: 'error', error: msg }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' },
  });
}
