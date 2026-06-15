// lib/story/coach/memory.ts
//
// The Coach's persistent memory — semantic facts about Tredoux that should
// carry across conversations: his values, ambitions, health goals, things he
// said he'd drop, recurring emotional patterns, preferences. Mirrors
// lib/montree/tracy/memory.ts but simpler: ONE user (the Story admin), so no
// principal_id scoping, and content is encrypted at rest.
//
// 🚨 SEMANTIC, not episodic. "Tredoux values deep family time" → save.
// "Tredoux asked about his plan today" → don't (that's just conversation).

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import {
  encryptDiaryField,
  readDiaryField,
  isDiaryEncryptionConfigured,
} from '@/lib/story/diary-crypto';

export type CoachMemoryType =
  | 'value'
  | 'ambition'
  | 'health_goal'
  | 'dropped'
  | 'pattern'
  | 'preference'
  | 'fact';

const TYPES: ReadonlySet<string> = new Set<CoachMemoryType>([
  'value', 'ambition', 'health_goal', 'dropped', 'pattern', 'preference', 'fact',
]);
const MAX_CONTENT = 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CoachMemory {
  id: string;
  memory_type: CoachMemoryType;
  content: string;
  created_at: string;
}

const TYPE_HEADER: Record<CoachMemoryType, string> = {
  value: 'VALUES',
  ambition: 'AMBITIONS',
  health_goal: 'HEALTH GOALS',
  dropped: "THINGS HE SAID HE'D DROP (hold him to these)",
  pattern: 'RECURRING PATTERNS (watch for these)',
  preference: 'PREFERENCES',
  fact: 'FACTS',
};
const ORDER: CoachMemoryType[] = ['value', 'ambition', 'health_goal', 'dropped', 'pattern', 'preference', 'fact'];

/** Load active (non-superseded) memories, newest first, decrypted. */
export async function loadCoachMemories(
  supabase: SupabaseClient,
  space: string,
  limit = 40,
): Promise<CoachMemory[]> {
  const cap = Math.max(1, Math.min(limit, 200));
  const { data, error } = await supabase
    .from('story_coach_memory')
    .select('id, memory_type, content_enc, cipher_version, created_at')
    .eq('space', space)
    .is('superseded_at', null)
    .order('created_at', { ascending: false })
    .limit(cap);
  if (error) {
    console.warn('[coach/memory] load error:', error.message);
    return [];
  }
  return (data || []).map((r) => ({
    id: r.id as string,
    memory_type: r.memory_type as CoachMemoryType,
    content: readDiaryField(r.content_enc, r.cipher_version),
    created_at: r.created_at as string,
  }));
}

/** Render memories as a system-prompt section. Empty string when none. */
export function formatCoachMemoriesForPrompt(memories: CoachMemory[]): string {
  if (!memories.length) return '';
  const byType = new Map<CoachMemoryType, CoachMemory[]>();
  for (const m of memories) {
    const list = byType.get(m.memory_type) || [];
    list.push(m);
    byType.set(m.memory_type, list);
  }
  const sections: string[] = [];
  for (const type of ORDER) {
    const list = byType.get(type);
    if (!list?.length) continue;
    sections.push(`${TYPE_HEADER[type]}:\n${list.map((m) => `- ${m.content}  [id: ${m.id}]`).join('\n')}`);
  }
  if (!sections.length) return '';
  return [
    '# What you remember about Tredoux',
    '',
    "From prior conversations and his diary, you've learned the following. Use them to inform every reply without citing the ids back to him.",
    '',
    sections.join('\n\n'),
    '',
    'When you learn something durable and significant, call `remember`. If something changes or is contradicted, call `remember` with supersedes_id set to the old memory id.',
  ].join('\n');
}

type WriteResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Write a memory. When supersedes_id is set, insert the new row then mark the
 * old one superseded (two-step; best-effort — a single user, low contention).
 */
export async function writeCoachMemory(
  supabase: SupabaseClient,
  space: string,
  input: { memory_type: CoachMemoryType; content: string; supersedes_id?: string | null },
): Promise<WriteResult> {
  if (!TYPES.has(input.memory_type)) {
    return { ok: false, error: `memory_type must be one of: ${[...TYPES].join(', ')}` };
  }
  const content = (input.content || '').trim();
  if (!content) return { ok: false, error: 'content cannot be empty' };
  if (content.length > MAX_CONTENT) return { ok: false, error: `content exceeds ${MAX_CONTENT} chars` };
  if (input.supersedes_id != null && !UUID_RE.test(input.supersedes_id)) {
    return { ok: false, error: 'supersedes_id must be a UUID' };
  }
  if (!isDiaryEncryptionConfigured()) {
    return { ok: false, error: 'encryption not configured (STORY_DIARY_KEY)' };
  }

  const { data, error } = await supabase
    .from('story_coach_memory')
    .insert({
      space,
      memory_type: input.memory_type,
      content_enc: encryptDiaryField(content),
      cipher_version: 1,
    })
    .select('id')
    .single();
  if (error || !data) {
    console.warn('[coach/memory] insert error:', error?.message);
    return { ok: false, error: error?.message || 'insert failed' };
  }
  const newId = data.id as string;

  if (input.supersedes_id) {
    const { error: supErr } = await supabase
      .from('story_coach_memory')
      .update({ superseded_at: new Date().toISOString(), superseded_by: newId })
      .eq('id', input.supersedes_id)
      .eq('space', space)
      .is('superseded_at', null);
    if (supErr) {
      // Non-fatal: the new memory exists; the old one just stays active.
      console.warn('[coach/memory] supersede update error:', supErr.message);
    }
  }
  return { ok: true, id: newId };
}

/**
 * Recall memories filtered by type and/or a free-text query. Because content
 * is encrypted at rest, the text query is applied AFTER decrypt in JS (fine for
 * a single-user store). Returns up to `limit`.
 */
export async function recallCoachMemories(
  supabase: SupabaseClient,
  space: string,
  filters: { memory_type?: CoachMemoryType; query?: string },
  limit = 25,
): Promise<CoachMemory[]> {
  const all = await loadCoachMemories(supabase, space, 200);
  let rows = all;
  if (filters.memory_type && TYPES.has(filters.memory_type)) {
    rows = rows.filter((m) => m.memory_type === filters.memory_type);
  }
  if (filters.query && filters.query.trim()) {
    const q = filters.query.trim().toLowerCase();
    rows = rows.filter((m) => m.content.toLowerCase().includes(q));
  }
  return rows.slice(0, Math.max(1, Math.min(limit, 100)));
}
