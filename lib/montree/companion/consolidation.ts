// lib/montree/companion/consolidation.ts
//
// Ivy's nightly "sleep" pass — per-child memory consolidation. Mirrors the
// Coach's consolidation (lib/story/coach/consolidation.ts): take the day's raw
// turns (montree_companion_log), distill the durable bits into long-term
// companion memory (montree_children.settings.companion.memories), then stamp
// the turns consolidated so they leave the running thread.
//
// Differences from the Coach: Montree home data is PLAINTEXT (no diary-crypto),
// there's no diary recap, and it's scoped per child (not per space). Cheap,
// best-effort, Haiku, swallows its own errors, never blocks chat.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import type Anthropic from '@anthropic-ai/sdk';
import { HAIKU_MODEL } from '@/lib/ai/anthropic';
import {
  loadCompanionMemories,
  writeCompanionMemory,
  COMPANION_MEMORY_TYPES,
  type CompanionMemoryType,
} from './memory';

const MISSING_TABLE = '42P01';
const MAX_TURNS_PER_RUN = 200;
const TRANSCRIPT_CHAR_CAP = 22000;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export interface ConsolidationDue {
  due: boolean;
}

/** Is there a prior day with unconsolidated turns for this child? Cheap pre-check. */
export async function isCompanionConsolidationDue(
  supabase: SupabaseClient,
  childId: string,
): Promise<ConsolidationDue> {
  try {
    const { data, error } = await supabase
      .from('montree_companion_log')
      .select('id')
      .eq('child_id', childId)
      .is('consolidated_at', null)
      .lt('created_at', startOfToday().toISOString())
      .limit(1);
    if (error) {
      if (error.code !== MISSING_TABLE) console.warn('[companion/consolidation] due-check:', error.message);
      return { due: false };
    }
    return { due: !!(data && data.length) };
  } catch {
    return { due: false };
  }
}

interface ExtractedMemory {
  memory_type: string;
  content: string;
  supersedes_id?: string | null;
}

function parseModelJson(text: string): { memories: ExtractedMemory[] } {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return { memories: [] };
  try {
    const obj = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    return { memories: Array.isArray(obj.memories) ? (obj.memories as ExtractedMemory[]) : [] };
  } catch {
    return { memories: [] };
  }
}

function buildSystemPrompt(childName: string, parentName?: string): string {
  const who = parentName ? `${parentName} (the parent) and ${childName} (the child)` : `${childName} and their parent`;
  return `You are the memory-consolidation pass for Ivy, a family's Montessori companion. Once a day you read
the recent conversations between Ivy and ${who} and distill the DURABLE bits into long-term memory.

Return STRICT JSON only, no prose:
{ "memories": [ { "memory_type": "interest|temperament|milestone|struggle|parent_preference|parent_value|parent_dropped|parent_pattern|routine|fact", "content": "one durable fact, concise", "supersedes_id": null } ] }

Rules:
- ONLY durable, SEMANTIC facts worth carrying for months: what the child loves (interest), their
  temperament, milestones/wins, where they need support (struggle); the parent's preferences, values,
  things they said they'd let go of (parent_dropped), worry/overwhelm patterns (parent_pattern); family
  routines; stable facts. Skip transient chatter, one-off logistics, and anything already in existing memories.
- If a new insight UPDATES or CONTRADICTS an existing memory, copy that memory's id into "supersedes_id".
- Be conservative: a few high-quality memories beat many shallow ones. If nothing durable emerged, return [].`;
}

export interface ConsolidationResult {
  ok: boolean;
  turns: number;
  memories: number;
  error?: string;
}

/**
 * Consolidate every unconsolidated turn before today for this child into
 * long-term companion memory, then stamp them consolidated. Idempotent.
 */
export async function consolidateCompanionDay(
  supabase: SupabaseClient,
  client: Anthropic,
  childId: string,
  ctx: { childName: string; parentName?: string },
): Promise<ConsolidationResult> {
  const cutoffIso = startOfToday().toISOString();

  let rows: Array<{ id: string; question: string | null; answer: string | null; created_at: string }> = [];
  try {
    const { data, error } = await supabase
      .from('montree_companion_log')
      .select('id, question, answer, created_at')
      .eq('child_id', childId)
      .is('consolidated_at', null)
      .lt('created_at', cutoffIso)
      .order('created_at', { ascending: true })
      .limit(MAX_TURNS_PER_RUN);
    if (error) {
      if (error.code === MISSING_TABLE) return { ok: false, turns: 0, memories: 0, error: 'log table missing' };
      return { ok: false, turns: 0, memories: 0, error: error.message };
    }
    rows = (data || []) as typeof rows;
  } catch (e) {
    return { ok: false, turns: 0, memories: 0, error: e instanceof Error ? e.message : 'query failed' };
  }
  if (!rows.length) return { ok: true, turns: 0, memories: 0 };

  const ids: string[] = [];
  const lines: string[] = [];
  for (const r of rows) {
    ids.push(r.id);
    const day = (() => { try { return new Date(r.created_at).toLocaleDateString('en-CA'); } catch { return ''; } })();
    if (r.question?.trim()) lines.push(`[${day}] Parent: ${r.question.trim()}`);
    if (r.answer?.trim()) lines.push(`[${day}] Ivy: ${r.answer.trim()}`);
  }
  const transcript = lines.join('\n').slice(-TRANSCRIPT_CHAR_CAP);

  const existing = await loadCompanionMemories(supabase, childId, 80).catch(() => []);
  const existingText = existing.length
    ? existing.map((m) => `- (${m.memory_type}) ${m.content}  [id:${m.id}]`).join('\n')
    : '(none yet)';

  let parsed = { memories: [] as ExtractedMemory[] };
  try {
    const resp = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 1500,
      system: buildSystemPrompt(ctx.childName, ctx.parentName),
      messages: [{ role: 'user', content: `EXISTING MEMORIES:\n${existingText}\n\nTRANSCRIPT TO CONSOLIDATE:\n${transcript}\n\nReturn the JSON.` }],
    });
    const textBlock = resp.content.find((b) => b.type === 'text');
    parsed = parseModelJson(textBlock && 'text' in textBlock ? textBlock.text : '');
  } catch (e) {
    return { ok: false, turns: rows.length, memories: 0, error: e instanceof Error ? e.message : 'model error' };
  }

  let written = 0;
  for (const m of parsed.memories.slice(0, 25)) {
    if (!m || typeof m.content !== 'string' || !COMPANION_MEMORY_TYPES.has(m.memory_type)) continue;
    const res = await writeCompanionMemory(supabase, childId, {
      memory_type: m.memory_type as CompanionMemoryType,
      content: m.content,
      supersedes_id: m.supersedes_id ?? null,
    });
    if (res.ok) written++;
  }

  // Stamp the turns consolidated so they leave the running thread (kept forever).
  const { error: markErr } = await supabase
    .from('montree_companion_log')
    .update({ consolidated_at: new Date().toISOString() })
    .in('id', ids);
  if (markErr) return { ok: false, turns: rows.length, memories: written, error: markErr.message };

  return { ok: true, turns: rows.length, memories: written };
}
