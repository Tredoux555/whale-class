// lib/story/coach/consolidation.ts
//
// The Coach's nightly "sleep" pass — memory consolidation.
//
// Like a brain overnight: take the day's raw conversation (story_coach_log),
// distill the durable bits into long-term SEMANTIC memory (story_coach_memory)
// plus an episodic diary recap (story_diary_entries), then stamp those turns
// consolidated_at so they leave the running thread. The raw archive itself is
// KEPT FOREVER — consolidation only marks and distills, never deletes.
//
// Trigger: "on wake" (lazy) — the route calls this via next/server `after()` on
// the first message of a new day, so it runs AFTER the reply, off the user's
// critical path. Guarded to once-per-day by isConsolidationDue().
//
// Cheap + best-effort: uses Haiku, swallows its own errors, never blocks chat.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import type Anthropic from '@anthropic-ai/sdk';
import {
  readDiaryField,
  encryptDiaryField,
  encryptDiaryFieldOrNull,
  isDiaryEncryptionConfigured,
} from '@/lib/story/diary-crypto';
import { HAIKU_MODEL } from '@/lib/ai/anthropic';
import { loadCoachMemories, writeCoachMemory, type CoachMemoryType } from './memory';
import { displayNameForSpace } from './profile';

const VALID_TYPES: ReadonlySet<string> = new Set<CoachMemoryType>([
  'value', 'ambition', 'health_goal', 'dropped', 'pattern', 'preference', 'fact',
]);
const MAX_TURNS_PER_RUN = 200;
const TRANSCRIPT_CHAR_CAP = 24000;

/** Local YYYY-MM-DD (matches the diary's plaintext entry_date convention). */
function localYMD(d: Date): string {
  return d.toLocaleDateString('en-CA'); // en-CA renders as YYYY-MM-DD
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export interface ConsolidationDue {
  due: boolean;
  /** The day we'd consolidate through (the most recent fully-elapsed day). */
  throughDate: string | null;
}

/**
 * Is there a prior day with unconsolidated turns? Cheap pre-check so we only run
 * the model once per day. Today's turns are intentionally left running.
 */
export async function isConsolidationDue(
  supabase: SupabaseClient,
  space: string,
): Promise<ConsolidationDue> {
  const { data, error } = await supabase
    .from('story_coach_log')
    .select('id')
    .eq('space', space)
    .is('consolidated_at', null)
    .lt('created_at', startOfToday().toISOString())
    .limit(1);
  if (error) {
    console.warn('[coach/consolidation] due-check error:', error.message);
    return { due: false, throughDate: null };
  }
  if (!data || !data.length) return { due: false, throughDate: null };
  // Through the end of yesterday (everything before today's local midnight).
  return { due: true, throughDate: localYMD(new Date(startOfToday().getTime() - 1)) };
}

export interface ConsolidationResult {
  ok: boolean;
  turns: number;
  memories: number;
  diaryId?: string;
  error?: string;
}

interface ExtractedMemory {
  memory_type: string;
  content: string;
  supersedes_id?: string | null;
}

function parseModelJson(text: string): { memories: ExtractedMemory[]; diary_summary: string; mood: string | null } {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return { memories: [], diary_summary: '', mood: null };
  try {
    const obj = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const memories = Array.isArray(obj.memories) ? (obj.memories as ExtractedMemory[]) : [];
    const diary_summary = typeof obj.diary_summary === 'string' ? obj.diary_summary : '';
    const mood = typeof obj.mood === 'string' && obj.mood.trim() ? obj.mood.trim().slice(0, 40) : null;
    return { memories, diary_summary, mood };
  } catch (e) {
    console.warn('[coach/consolidation] JSON parse failed:', e instanceof Error ? e.message : 'unknown');
    return { memories: [], diary_summary: '', mood: null };
  }
}

function buildConsolidationSystemPrompt(name: string): string {
  return `You are the memory-consolidation process for ${name}'s personal life-coach — the
"sleep" pass that runs once a day. You are given the existing long-term memories and the raw
transcript of recent coaching conversations. Distill, don't transcribe.

Return STRICT JSON only, no prose, in this exact shape:
{
  "memories": [ { "memory_type": "value|ambition|health_goal|dropped|pattern|preference|fact", "content": "one durable fact, first-person-about-${name}, concise", "supersedes_id": null } ],
  "diary_summary": "a 3-6 sentence episodic recap of the period, in a warm reflective register, as their private journal would read",
  "mood": "one short lowercase word, or null"
}

Rules:
- ONLY durable, SEMANTIC facts worth carrying for months: values, ambitions, health goals, things they said they'd drop, recurring emotional/behavioural patterns, stable preferences, stable facts. Skip transient chatter, one-off logistics, and anything already captured verbatim in existing memories.
- If a new insight UPDATES or CONTRADICTS an existing memory, copy that memory's id into "supersedes_id". Otherwise leave it null.
- Be conservative: a few high-quality memories beat many shallow ones. If nothing durable emerged, return "memories": [].
- "diary_summary" should capture how the period actually went for them (themes, wins, worries) — not a list of topics. Never invent events not in the transcript.`;
}

/**
 * Consolidate every unconsolidated turn before today into long-term memory + a
 * diary recap, then stamp them consolidated. Idempotent and self-contained.
 */
export async function consolidateCoachDay(
  supabase: SupabaseClient,
  client: Anthropic,
  space: string,
): Promise<ConsolidationResult> {
  if (!isDiaryEncryptionConfigured()) {
    return { ok: false, turns: 0, memories: 0, error: 'encryption not configured' };
  }

  const cutoffIso = startOfToday().toISOString();
  const { data: rows, error } = await supabase
    .from('story_coach_log')
    .select('id, question_enc, answer_enc, cipher_version, created_at')
    .eq('space', space)
    .is('consolidated_at', null)
    .lt('created_at', cutoffIso)
    .order('created_at', { ascending: true })
    .limit(MAX_TURNS_PER_RUN);

  if (error) return { ok: false, turns: 0, memories: 0, error: error.message };
  if (!rows || !rows.length) return { ok: true, turns: 0, memories: 0 };

  // Build a readable transcript + remember the span's calendar day + row ids.
  const ids: string[] = [];
  const lines: string[] = [];
  let lastDate = localYMD(new Date(startOfToday().getTime() - 1));
  for (const r of rows) {
    ids.push(r.id as string);
    let q = '';
    let a = '';
    try {
      q = readDiaryField(r.question_enc, r.cipher_version) || '';
      a = r.answer_enc ? readDiaryField(r.answer_enc, r.cipher_version) || '' : '';
    } catch {
      continue;
    }
    const day = localYMD(new Date(r.created_at as string));
    lastDate = day;
    if (q.trim()) lines.push(`[${day}] User: ${q.trim()}`);
    if (a.trim()) lines.push(`[${day}] Coach: ${a.trim()}`);
  }
  const transcript = lines.join('\n').slice(-TRANSCRIPT_CHAR_CAP);

  // Give the model the current memory set so it can dedup / supersede.
  const existing = await loadCoachMemories(supabase, space, 80);
  const existingText = existing.length
    ? existing.map((m) => `- (${m.memory_type}) ${m.content}  [id:${m.id}]`).join('\n')
    : '(none yet)';

  let parsed = { memories: [] as ExtractedMemory[], diary_summary: '', mood: null as string | null };
  try {
    const resp = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 1500,
      system: buildConsolidationSystemPrompt(displayNameForSpace(space)),
      messages: [
        {
          role: 'user',
          content: `EXISTING MEMORIES:\n${existingText}\n\nTRANSCRIPT TO CONSOLIDATE:\n${transcript}\n\nReturn the JSON.`,
        },
      ],
    });
    const textBlock = resp.content.find((b) => b.type === 'text');
    const raw = textBlock && 'text' in textBlock ? textBlock.text : '';
    parsed = parseModelJson(raw);
  } catch (e) {
    return { ok: false, turns: rows.length, memories: 0, error: e instanceof Error ? e.message : 'model error' };
  }

  // Write the distilled semantic memories (validated by writeCoachMemory too).
  let written = 0;
  for (const m of parsed.memories.slice(0, 25)) {
    if (!m || typeof m.content !== 'string' || !VALID_TYPES.has(m.memory_type)) continue;
    const res = await writeCoachMemory(supabase, space, {
      memory_type: m.memory_type as CoachMemoryType,
      content: m.content,
      supersedes_id: m.supersedes_id ?? null,
    });
    if (res.ok) written++;
  }

  // Write the episodic diary recap for the span (best-effort).
  let diaryId: string | undefined;
  if (parsed.diary_summary.trim()) {
    const { data: diary, error: diaryErr } = await supabase
      .from('story_diary_entries')
      .insert({
        space,
        entry_date: lastDate,
        mood: parsed.mood,
        title_enc: encryptDiaryFieldOrNull('Daily reflection (auto-consolidated)'),
        body_enc: encryptDiaryField(parsed.diary_summary.slice(0, 100000)),
        cipher_version: 1,
      })
      .select('id')
      .single();
    if (diaryErr) console.warn('[coach/consolidation] diary insert error:', diaryErr.message);
    else diaryId = diary?.id as string | undefined;
  }

  // Stamp the turns consolidated so they leave the running thread (kept forever).
  const { error: markErr } = await supabase
    .from('story_coach_log')
    .update({ consolidated_at: new Date().toISOString() })
    .eq('space', space)
    .in('id', ids);
  if (markErr) {
    // If we couldn't stamp, bail without an audit row so a retry can re-run cleanly.
    return { ok: false, turns: rows.length, memories: written, diaryId, error: markErr.message };
  }

  // Audit row — one "night of sleep".
  const { error: auditErr } = await supabase
    .from('story_coach_consolidation')
    .insert({
      space,
      through_date: lastDate,
      turns_count: rows.length,
      memories_written: written,
      diary_entry_id: diaryId ?? null,
    });
  if (auditErr) console.warn('[coach/consolidation] audit insert skipped:', auditErr.message);

  return { ok: true, turns: rows.length, memories: written, diaryId };
}
