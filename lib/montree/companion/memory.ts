// lib/montree/companion/memory.ts
//
// Ivy's per-family memory — the durable, semantic things she learns about the
// child AND the parent, carried across every conversation. Mirrors the Coach's
// memory (lib/story/coach/memory.ts) but scoped per child and stored in
// montree_children.settings.companion.memories (JSONB) — no migration to start.
//
// 🚨 SEMANTIC, not episodic. "Mia is fascinated by tiny objects" → save.
// "The parent asked about pouring today" → don't (that's just conversation).

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';

export type CompanionMemoryType =
  // about the child
  | 'interest'
  | 'temperament'
  | 'milestone'
  | 'struggle'
  // about the parent
  | 'parent_preference'
  | 'parent_value'
  | 'parent_dropped'
  | 'parent_pattern'
  // about the family
  | 'routine'
  | 'fact';

const TYPES: ReadonlySet<string> = new Set<CompanionMemoryType>([
  'interest', 'temperament', 'milestone', 'struggle',
  'parent_preference', 'parent_value', 'parent_dropped', 'parent_pattern',
  'routine', 'fact',
]);

const MAX_CONTENT = 1000;
const MAX_MEMORIES = 120; // FIFO cap on the JSONB array
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CompanionMemory {
  id: string;
  memory_type: CompanionMemoryType;
  content: string;
  created_at: string;
}

const TYPE_HEADER: Record<CompanionMemoryType, string> = {
  interest: 'WHAT THE CHILD LOVES',
  temperament: 'THE CHILD\'S TEMPERAMENT',
  milestone: 'MILESTONES & WINS',
  struggle: 'WHERE THE CHILD NEEDS SUPPORT',
  parent_preference: 'THE PARENT\'S PREFERENCES',
  parent_value: 'WHAT MATTERS TO THE PARENT',
  parent_dropped: "THINGS THE PARENT SAID THEY'D LET GO OF (hold them gently to these)",
  parent_pattern: 'PATTERNS IN THE PARENT (watch for these — overwhelm, worry)',
  routine: 'FAMILY ROUTINES',
  fact: 'FACTS',
};

const ORDER: CompanionMemoryType[] = [
  'interest', 'temperament', 'milestone', 'struggle',
  'parent_value', 'parent_preference', 'parent_dropped', 'parent_pattern',
  'routine', 'fact',
];

function readMemories(settings: Record<string, unknown>): CompanionMemory[] {
  const companion = (settings.companion as Record<string, unknown>) || {};
  const raw = companion.memories;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
    .map((m) => ({
      id: String(m.id || ''),
      memory_type: m.memory_type as CompanionMemoryType,
      content: String(m.content || ''),
      created_at: String(m.created_at || ''),
    }))
    .filter((m) => m.id && TYPES.has(m.memory_type) && m.content);
}

/** Load active companion memories for a child, newest first. */
export async function loadCompanionMemories(
  supabase: SupabaseClient,
  childId: string,
  limit = 60,
): Promise<CompanionMemory[]> {
  const { data, error } = await supabase
    .from('montree_children')
    .select('settings')
    .eq('id', childId)
    .maybeSingle();
  if (error || !data) return [];
  const memories = readMemories((data.settings as Record<string, unknown>) || {});
  // Stored append-order (oldest→newest); present newest first, capped.
  return memories.slice(-Math.max(1, Math.min(limit, MAX_MEMORIES))).reverse();
}

/** Render memories as a system-prompt section. Empty string when none. */
export function formatCompanionMemoriesForPrompt(
  memories: CompanionMemory[],
  opts: { childName: string; parentName?: string },
): string {
  if (!memories.length) return '';
  const byType = new Map<CompanionMemoryType, CompanionMemory[]>();
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
  const who = opts.parentName ? `${opts.parentName} and ${opts.childName}` : opts.childName;
  return [
    `# What you remember about ${who}`,
    '',
    "From your conversations so far, you've learned the following. Let them inform every reply — never cite the ids back.",
    '',
    sections.join('\n\n'),
    '',
    'When you learn something durable and meaningful (about the child or the parent), call `remember`. If something changes, call `remember` with supersedes_id set to the old id.',
  ].join('\n');
}

type WriteResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Write a companion memory into montree_children.settings.companion.memories.
 * Read-merge-write (the tool loop runs tools sequentially, so contention is low).
 * When supersedes_id is set, the old memory is removed before the new one is added.
 */
export async function writeCompanionMemory(
  supabase: SupabaseClient,
  childId: string,
  input: { memory_type: CompanionMemoryType; content: string; supersedes_id?: string | null },
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

  const { data, error } = await supabase
    .from('montree_children')
    .select('settings')
    .eq('id', childId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: 'child not found' };

  const settings = ((data.settings as Record<string, unknown>) || {});
  const companion = ((settings.companion as Record<string, unknown>) || {});
  let memories = readMemories(settings);

  if (input.supersedes_id) {
    memories = memories.filter((m) => m.id !== input.supersedes_id);
  }

  const id = (globalThis.crypto?.randomUUID?.() as string) || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  memories.push({
    id,
    memory_type: input.memory_type,
    content,
    created_at: new Date().toISOString(),
  });
  // FIFO cap — keep the newest MAX_MEMORIES.
  if (memories.length > MAX_MEMORIES) memories = memories.slice(-MAX_MEMORIES);

  const merged = { ...settings, companion: { ...companion, memories } };
  const { error: upErr } = await supabase
    .from('montree_children')
    .update({ settings: merged })
    .eq('id', childId);
  if (upErr) {
    console.warn('[companion/memory] write error:', upErr.message);
    return { ok: false, error: upErr.message };
  }
  return { ok: true, id };
}

/** Recall memories filtered by type and/or free-text query (post-load, in JS). */
export async function recallCompanionMemories(
  supabase: SupabaseClient,
  childId: string,
  filters: { memory_type?: CompanionMemoryType; query?: string },
  limit = 25,
): Promise<CompanionMemory[]> {
  const all = await loadCompanionMemories(supabase, childId, MAX_MEMORIES);
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

export { TYPES as COMPANION_MEMORY_TYPES };
