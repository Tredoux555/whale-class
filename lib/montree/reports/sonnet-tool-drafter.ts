// lib/montree/reports/sonnet-tool-drafter.ts
//
// Shared "Sonnet drafts text, forced tool, temperature 0" helper for the
// period-report docx text generators (monthly all-areas summary, weekly
// summary + Chinese lines — PLAN_ALL_AREAS_REPORTS_AUG22.md §8). House rule
// per extractor.ts:13-15 — every durable generation call is deterministic
// and forced through a tool so the output is always structured, never
// freeform prose we have to re-parse.
//
// PURE input/output contract: this module makes the network call but does
// zero DB access and makes zero formatting decisions beyond what the
// caller's tool schema demands — the prompt text and schema live with the
// caller (monthly-all-areas-drafter.ts / weekly-summary-drafter.ts), this
// just wraps the call + one retry + tool-result extraction.
//
// Never throws — callers MUST supply a deterministic fallback for when this
// returns null (AI disabled, transient failure, malformed tool call).

import { anthropic, AI_MODEL, AI_ENABLED } from '@/lib/ai/anthropic';

export interface SonnetToolSpec {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

const DEFAULT_MAX_TOKENS = 4000;

/**
 * How many children go into one forced-tool drafting call.
 *
 * audit-fix (Aug 23 2026): the drafters used to send the whole classroom in a
 * single 4000-token call. A real classroom is 19-22 children; at ~150-250
 * tokens of drafted text per child the response hits max_tokens and the tool
 * call comes back truncated — the SDK then yields no usable `tool_use` input
 * at all (stop_reason `max_tokens`), so the WHOLE classroom silently fell back
 * to deterministic text. Seven children per call keeps every response far
 * inside the budget, and a chunk that still fails only costs those children
 * their AI draft.
 */
export const DRAFT_CHUNK_SIZE = 7;

/** Split `items` into consecutive batches of at most `size` (order preserved). */
export function chunkForDrafting<T>(items: T[], size: number = DRAFT_CHUNK_SIZE): T[][] {
  const step = Math.max(1, Math.floor(size));
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += step) out.push(items.slice(i, i + step));
  return out;
}
const RETRY_DELAY_MS = 1200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * One forced-tool Sonnet call (`AI_MODEL`, `temperature: 0`). Returns the
 * tool's `input` object, or `null` when AI is disabled, both attempts fail,
 * or the model never returns a usable `tool_use` block.
 */
export async function callSonnetTool<T = unknown>(opts: {
  tool: SonnetToolSpec;
  userText: string;
  maxTokens?: number;
}): Promise<T | null> {
  if (!AI_ENABLED || !anthropic) return null;

  let lastStopReason: string | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const text =
      attempt === 1
        ? opts.userText
        : `${opts.userText}\n\nYOUR PREVIOUS ATTEMPT DID NOT RETURN A USABLE ${opts.tool.name} TOOL CALL. Return the tool call this time.`;
    try {
      const msg = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: 0, // house rule (extractor.ts:13-15) — deterministic drafting
        tools: [opts.tool as unknown as never],
        tool_choice: { type: 'tool', name: opts.tool.name },
        messages: [{ role: 'user', content: text }],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- forced-tool schemas use JSON-Schema shapes the SDK's narrow Tool type doesn't model
      } as any);

      const content = (msg as { content?: Array<{ type: string; input?: unknown }> }).content || [];
      const block = content.find((b) => b.type === 'tool_use') as { type: 'tool_use'; input?: unknown } | undefined;
      if (block && block.input) return block.input as T;

      lastStopReason = (msg as { stop_reason?: string | null }).stop_reason ?? null;
    } catch (err) {
      console.error(`[sonnet-tool-drafter] ${opts.tool.name} call failed:`, err instanceof Error ? err.message : err);
    }
    if (attempt === 1) await sleep(RETRY_DELAY_MS);
  }

  console.error(`[sonnet-tool-drafter] ${opts.tool.name}: no usable tool call after retry (stop_reason: ${lastStopReason})`);
  return null;
}
