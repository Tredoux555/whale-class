// lib/montree/tracy/memory.ts
//
// Tracy's persistent relational memory.
//
// Until migration 195, Tracy had ONLY episodic memory (last 10 turns of the
// active conversation). Across conversations / devices / "New conversation"
// clicks, she remembered nothing — the principal had to re-explain her
// preferences, voice, concerns every time. This module implements semantic
// memory that persists across sessions and devices.
//
// PUBLIC API:
//   - loadActiveMemories(supabase, principalId, limit) — top-N most recent
//     active memories for the system-prompt header
//   - formatMemoriesForPrompt(memories) — render as a system-prompt section
//   - writeMemory(supabase, schoolId, principalId, input) — atomic write,
//     uses the supersede_and_insert_memory Postgres function when supersedes_id
//     is provided
//   - recallMemories(supabase, principalId, filters, limit) — filtered read
//     for the recall_memory tool
//   - bumpMemoryReference(supabase, memoryIds) — fire-and-forget
//     reference-count update when memories are recalled
//
// 🚨 ARCHITECTURAL RULES (mirror migration 195's contract):
//   - Memories are SEMANTIC, not episodic.
//   - Scoped per principal_id — never per school. Multi-principal schools have
//     separate memories per principal.
//   - The superseded_by chain handles updates atomically via the Postgres
//     function. NEVER do a multi-statement client-side update for supersede.
//   - reference_count + last_referenced_at are pruning signals — don't surface
//     to the user.
//   - Memory injection is on every turn (capped at 30 in the system prompt).
//     The recall_memory tool is for DEEPER recall.
//   - Tracy decides what's memorable. Not every turn writes a memory.

import type { SupabaseClient } from '@supabase/supabase-js';

export type PrincipalMemoryType =
  | 'preference'
  | 'concern'
  | 'voice_sample'
  | 'parent_priority'
  | 'teacher_note'
  | 'context'
  | 'fact';

const MEMORY_TYPES: ReadonlyArray<PrincipalMemoryType> = [
  'preference',
  'concern',
  'voice_sample',
  'parent_priority',
  'teacher_note',
  'context',
  'fact',
] as const;

const MEMORY_TYPE_SET: ReadonlySet<string> = new Set<string>(MEMORY_TYPES);
const MAX_CONTENT_LENGTH = 1000;
/** Default ceiling for the system-prompt memory header. */
const DEFAULT_LOAD_LIMIT = 30;
/** Hard cap on recall_memory result count, even if caller asks for more. */
const RECALL_HARD_CAP = 50;

export interface PrincipalMemory {
  id: string;
  memory_type: PrincipalMemoryType;
  content: string;
  source: string | null;
  confidence: number;
  related_child_id: string | null;
  related_teacher_id: string | null;
  related_parent_id: string | null;
  created_at: string;
  reference_count: number;
}

export interface WriteMemoryInput {
  memory_type: PrincipalMemoryType;
  content: string;
  source?: string;
  related_child_id?: string | null;
  related_teacher_id?: string | null;
  related_parent_id?: string | null;
  /** UUID of a prior memory this one updates. Routed through the atomic
   *  supersede_and_insert_memory Postgres function. */
  supersedes_id?: string | null;
}

export interface RecallFilters {
  memory_type?: PrincipalMemoryType;
  related_child_id?: string;
  related_teacher_id?: string;
  related_parent_id?: string;
  /** Simple ILIKE on content — caller's responsibility to keep short. */
  query?: string;
}

type WriteResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

// ── Validation helpers ──────────────────────────────────────────────────

function validateInput(input: WriteMemoryInput): string | null {
  if (!input || typeof input !== 'object') return 'input is required';
  if (!MEMORY_TYPE_SET.has(input.memory_type)) {
    return `memory_type must be one of: ${MEMORY_TYPES.join(', ')}`;
  }
  if (typeof input.content !== 'string') return 'content must be a string';
  const trimmed = input.content.trim();
  if (!trimmed) return 'content cannot be empty';
  if (trimmed.length > MAX_CONTENT_LENGTH) {
    return `content exceeds ${MAX_CONTENT_LENGTH} chars`;
  }
  return null;
}

// Loose UUID shape check — Postgres will reject malformed UUIDs anyway, but
// catching them here gives a cleaner error than a wall of pg error noise.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function looksLikeUuid(s: string | null | undefined): boolean {
  if (!s || typeof s !== 'string') return false;
  return UUID_RE.test(s);
}

// Escape ILIKE wildcard chars so user-supplied query fragments don't run as
// patterns. (Pattern metachars in PostgreSQL ILIKE: %, _, \)
function escapeIlike(s: string): string {
  return s.replace(/[%_\\]/g, '\\$&');
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Load the most recent active (non-superseded) memories for a principal.
 * Used by the principal-agent route to build the system-prompt header.
 *
 * Returns up to `limit` rows ordered by created_at DESC.
 */
export async function loadActiveMemories(
  supabase: SupabaseClient,
  principalId: string,
  limit: number = DEFAULT_LOAD_LIMIT
): Promise<PrincipalMemory[]> {
  if (!principalId) return [];
  const cap = Math.max(1, Math.min(limit, 100));

  const { data, error } = await supabase
    .from('montree_principal_memory')
    .select(
      'id, memory_type, content, source, confidence, related_child_id, related_teacher_id, related_parent_id, created_at, reference_count'
    )
    .eq('principal_id', principalId)
    .is('superseded_at', null)
    .order('created_at', { ascending: false })
    .limit(cap);

  if (error) {
    // Don't crash the agent if the table doesn't exist yet (pre-migration)
    // or the read fails. Tracy degrades to no-memory mode silently.
    console.warn('[tracy/memory] loadActiveMemories error:', error.message);
    return [];
  }
  return (data || []) as PrincipalMemory[];
}

/**
 * Render memories as a system-prompt section. Empty string when no memories.
 *
 * Grouped by memory_type so Tracy can scan it visually. We deliberately
 * include each memory's id so Tracy can pass it back as supersedes_id when
 * she decides a memory is outdated.
 */
export function formatMemoriesForPrompt(memories: PrincipalMemory[]): string {
  if (!memories || memories.length === 0) return '';

  // Group by type — preferred order surfaces what's most useful at the top
  // of the system prompt.
  const ORDER: PrincipalMemoryType[] = [
    'preference',
    'concern',
    'voice_sample',
    'parent_priority',
    'teacher_note',
    'context',
    'fact',
  ];
  const byType = new Map<PrincipalMemoryType, PrincipalMemory[]>();
  for (const m of memories) {
    const list = byType.get(m.memory_type) || [];
    list.push(m);
    byType.set(m.memory_type, list);
  }

  const HEADERS: Record<PrincipalMemoryType, string> = {
    preference: 'PREFERENCES',
    concern: 'CONCERNS',
    voice_sample: 'VOICE SAMPLES (how the principal writes — match this voice when drafting)',
    parent_priority: 'PARENT PRIORITIES',
    teacher_note: 'TEACHER NOTES',
    context: 'CONTEXT',
    fact: 'FACTS',
  };

  const sections: string[] = [];
  for (const type of ORDER) {
    const list = byType.get(type);
    if (!list || list.length === 0) continue;
    const lines = list.map((m) => `- ${m.content}  [id: ${m.id}]`);
    sections.push(`${HEADERS[type]}:\n${lines.join('\n')}`);
  }

  if (sections.length === 0) return '';

  return [
    '# What you remember about this principal',
    '',
    "Based on prior conversations, you've learned the following. Use these to inform your responses without explicitly citing them unless asked.",
    '',
    sections.join('\n\n'),
    '',
    'If a memory becomes outdated or contradicted, call remember_this with supersedes_id=<old memory id> to update it. If you learn something new and significant, call remember_this to save it. The principal benefits from you remembering across conversations. Do NOT cite memory ids back to the principal — they are for your tool calls only.',
  ].join('\n');
}

/**
 * Write a new memory. When supersedes_id is provided, the write goes through
 * the supersede_and_insert_memory Postgres function so the old row is marked
 * superseded and the new row inserted in a single atomic step.
 */
export async function writeMemory(
  supabase: SupabaseClient,
  schoolId: string,
  principalId: string,
  input: WriteMemoryInput
): Promise<WriteResult> {
  const validationError = validateInput(input);
  if (validationError) return { ok: false, error: validationError };
  if (!schoolId || !looksLikeUuid(schoolId)) {
    return { ok: false, error: 'invalid schoolId' };
  }
  if (!principalId || !looksLikeUuid(principalId)) {
    return { ok: false, error: 'invalid principalId' };
  }

  const content = input.content.trim().slice(0, MAX_CONTENT_LENGTH);
  const source = typeof input.source === 'string' ? input.source.slice(0, 200) : null;

  // Validate optional UUID fields so a bad fragment doesn't reach Postgres.
  if (input.supersedes_id != null && !looksLikeUuid(input.supersedes_id)) {
    return { ok: false, error: 'supersedes_id must be a UUID' };
  }
  if (
    input.related_child_id != null &&
    input.related_child_id !== '' &&
    !looksLikeUuid(input.related_child_id)
  ) {
    return { ok: false, error: 'related_child_id must be a UUID' };
  }
  if (
    input.related_teacher_id != null &&
    input.related_teacher_id !== '' &&
    !looksLikeUuid(input.related_teacher_id)
  ) {
    return { ok: false, error: 'related_teacher_id must be a UUID' };
  }
  if (
    input.related_parent_id != null &&
    input.related_parent_id !== '' &&
    !looksLikeUuid(input.related_parent_id)
  ) {
    return { ok: false, error: 'related_parent_id must be a UUID' };
  }

  const relatedChild = input.related_child_id || null;
  const relatedTeacher = input.related_teacher_id || null;
  const relatedParent = input.related_parent_id || null;
  const supersedesId = input.supersedes_id || null;

  // Atomic path — uses the Postgres function from migration 195.
  if (supersedesId) {
    const { data, error } = await supabase.rpc('supersede_and_insert_memory', {
      p_school_id: schoolId,
      p_principal_id: principalId,
      p_memory_type: input.memory_type,
      p_content: content,
      p_source: source,
      p_supersedes_id: supersedesId,
      p_related_child_id: relatedChild,
      p_related_teacher_id: relatedTeacher,
      p_related_parent_id: relatedParent,
    });
    if (error) {
      console.warn('[tracy/memory] supersede rpc error:', error.message);
      return { ok: false, error: error.message };
    }
    // Postgres function returns UUID directly.
    const newId = typeof data === 'string' ? data : (data as { id?: string })?.id;
    if (!newId) {
      return { ok: false, error: 'supersede rpc returned no id' };
    }
    return { ok: true, id: newId };
  }

  // Plain insert path.
  const { data, error } = await supabase
    .from('montree_principal_memory')
    .insert({
      school_id: schoolId,
      principal_id: principalId,
      memory_type: input.memory_type,
      content,
      source,
      related_child_id: relatedChild,
      related_teacher_id: relatedTeacher,
      related_parent_id: relatedParent,
    })
    .select('id')
    .single();

  if (error) {
    console.warn('[tracy/memory] insert error:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, id: (data as { id: string }).id };
}

/**
 * Filtered memory recall for the recall_memory tool. Returns up to `limit`
 * rows (capped at RECALL_HARD_CAP) ordered by created_at DESC.
 *
 * SECURITY: every query is scoped by principal_id. The query string is
 * ILIKE-escaped to prevent pattern metachars from leaking through.
 */
export async function recallMemories(
  supabase: SupabaseClient,
  principalId: string,
  filters: RecallFilters,
  limit = 20
): Promise<PrincipalMemory[]> {
  if (!principalId) return [];

  const cap = Math.max(1, Math.min(limit, RECALL_HARD_CAP));

  let q = supabase
    .from('montree_principal_memory')
    .select(
      'id, memory_type, content, source, confidence, related_child_id, related_teacher_id, related_parent_id, created_at, reference_count'
    )
    .eq('principal_id', principalId)
    .is('superseded_at', null)
    .order('created_at', { ascending: false })
    .limit(cap);

  if (filters.memory_type && MEMORY_TYPE_SET.has(filters.memory_type)) {
    q = q.eq('memory_type', filters.memory_type);
  }
  if (filters.related_child_id && looksLikeUuid(filters.related_child_id)) {
    q = q.eq('related_child_id', filters.related_child_id);
  }
  if (filters.related_teacher_id && looksLikeUuid(filters.related_teacher_id)) {
    q = q.eq('related_teacher_id', filters.related_teacher_id);
  }
  if (filters.related_parent_id && looksLikeUuid(filters.related_parent_id)) {
    q = q.eq('related_parent_id', filters.related_parent_id);
  }
  if (filters.query && typeof filters.query === 'string') {
    const safe = escapeIlike(filters.query.trim().slice(0, 200));
    if (safe) q = q.ilike('content', `%${safe}%`);
  }

  const { data, error } = await q;
  if (error) {
    console.warn('[tracy/memory] recallMemories error:', error.message);
    return [];
  }
  return (data || []) as PrincipalMemory[];
}

/**
 * Bump reference_count + last_referenced_at on a list of memory ids.
 * Fire-and-forget — caller doesn't wait. Used by the recall_memory dispatch
 * so frequently-referenced memories surface to the top of pruning analysis
 * later.
 */
export async function bumpMemoryReference(
  supabase: SupabaseClient,
  memoryIds: string[]
): Promise<void> {
  if (!Array.isArray(memoryIds) || memoryIds.length === 0) return;
  const ids = memoryIds.filter(looksLikeUuid).slice(0, 50);
  if (ids.length === 0) return;

  // We can't atomically increment via the Supabase JS client without an RPC,
  // and adding another RPC for a non-critical pruning signal isn't worth it.
  // A best-effort read-then-write is acceptable here — exact reference counts
  // don't matter, only relative.
  try {
    const { data: rows } = await supabase
      .from('montree_principal_memory')
      .select('id, reference_count')
      .in('id', ids);
    if (!rows || rows.length === 0) return;
    const now = new Date().toISOString();
    await Promise.all(
      rows.map((r) =>
        supabase
          .from('montree_principal_memory')
          .update({
            reference_count: (r.reference_count ?? 0) + 1,
            last_referenced_at: now,
          })
          .eq('id', r.id)
      )
    );
  } catch (err) {
    console.warn('[tracy/memory] bumpMemoryReference failed:', err);
  }
}
