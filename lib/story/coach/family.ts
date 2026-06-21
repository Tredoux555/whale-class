// lib/story/coach/family.ts
//
// The Lyf Coach FAMILY model — the one-way "captain → loved-one's-coach" context
// channel. A family captain (a parent) can feed context into a CHILD's coach or
// a PARTNER's (adult spouse) coach.
//
// 🔒 THE SEAL (read this before changing anything here)
// This module is the ONLY bridge from a captain into a loved one's coach, and it
// is a WRITE-ONLY context channel. It touches exactly two tables:
//   • story_coach_context_links    — who may write context to whom (+ link_kind)
//   • story_coach_context_notes    — the captain-authored notes themselves
// It NEVER reads (and has no function that reads) anyone's SEALED conversation
// tables — story_coach_log, story_diary_entries, story_coach_memory,
// story_plan_*. The captain's read path is limited to the notes THEY authored.
// There is no architectural route from the captain to a single word a child OR a
// partner said to their coach. This holds for the adult partner exactly as hard
// as for the child. Do not add a helper here that reads a loved one's diary,
// memory, or coach log on the captain's behalf.
// See docs/handoffs/LYF_COACH_FAMILY_THREAT_MODEL.md.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import {
  encryptDiaryField,
  readDiaryField,
  isDiaryEncryptionConfigured,
} from '@/lib/story/diary-crypto';

export type FamilyRole = 'adult' | 'parent' | 'child';
export type LinkKind = 'to_child' | 'to_partner';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SPACE_RE = /^[a-z0-9_-]{2,30}$/;
const MAX_OBSERVATION = 2000;
const MAX_SKILL_TAG = 60;

/** PostgREST "column / relation does not exist" — migration 266 not run yet. */
function isMissingSchema(err: { code?: string } | null | undefined): boolean {
  return err?.code === '42703' || err?.code === '42P01';
}

// ── Roles ────────────────────────────────────────────────────────────────────

/**
 * The family role for a space. Tolerant: if migration 266 hasn't run (role
 * column absent) or the row is missing, returns 'adult' — the safe default that
 * keeps every existing sanctuary on the normal adult coach.
 */
export async function getFamilyRole(supabase: SupabaseClient, space: string): Promise<FamilyRole> {
  const { data, error } = await supabase
    .from('story_admin_users')
    .select('role')
    .eq('space', space)
    .limit(1)
    .maybeSingle();
  if (error) {
    if (!isMissingSchema(error)) console.warn('[coach/family] role lookup error:', error.message);
    return 'adult';
  }
  const role = (data?.role as string | undefined) || 'adult';
  return role === 'parent' || role === 'child' ? role : 'adult';
}

// ── Family targets (the captain's Family panel) ───────────────────────────────

export interface FamilyTarget {
  space: string;
  display_name: string;
  kind: LinkKind;          // 'to_child' | 'to_partner'
  last_login: string | null;
  note_count: number;      // ACTIVE notes THIS captain has written for them
}

function titleCase(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Everyone a captain may feed context to (their Family panel), with the link
 * kind + how many active notes the captain has fed each one. Empty array if not
 * a captain / no links / migration not run.
 */
export async function listFamilyTargets(
  supabase: SupabaseClient,
  authorSpace: string,
): Promise<FamilyTarget[]> {
  const { data: links, error: linkErr } = await supabase
    .from('story_coach_context_links')
    .select('target_space, link_kind')
    .eq('author_space', authorSpace);
  if (linkErr) {
    if (!isMissingSchema(linkErr)) console.warn('[coach/family] links error:', linkErr.message);
    return [];
  }
  const kindBySpace = new Map<string, LinkKind>();
  for (const l of links || []) {
    const k = (l.link_kind as string) === 'to_partner' ? 'to_partner' : 'to_child';
    kindBySpace.set(l.target_space as string, k);
  }
  const targetSpaces = [...kindBySpace.keys()];
  if (!targetSpaces.length) return [];

  const { data: users } = await supabase
    .from('story_admin_users')
    .select('space, last_login')
    .in('space', targetSpaces);
  const lastLoginBySpace = new Map<string, string | null>();
  for (const u of users || []) lastLoginBySpace.set(u.space as string, (u.last_login as string | null) ?? null);

  const { data: notes } = await supabase
    .from('story_coach_context_notes')
    .select('target_space')
    .eq('author_space', authorSpace)
    .is('archived_at', null)
    .in('target_space', targetSpaces);
  const countBySpace = new Map<string, number>();
  for (const n of notes || []) {
    const t = n.target_space as string;
    countBySpace.set(t, (countBySpace.get(t) || 0) + 1);
  }

  return targetSpaces.map((space) => ({
    space,
    display_name: titleCase(space),
    kind: kindBySpace.get(space) || 'to_child',
    last_login: lastLoginBySpace.get(space) ?? null,
    note_count: countBySpace.get(space) || 0,
  }));
}

/** The link kind for a (captain → target) pair, or null if no link exists. */
export async function getLinkKind(
  supabase: SupabaseClient,
  authorSpace: string,
  targetSpace: string,
): Promise<LinkKind | null> {
  if (!authorSpace || !targetSpace || authorSpace === targetSpace) return null;
  const { data, error } = await supabase
    .from('story_coach_context_links')
    .select('link_kind')
    .eq('author_space', authorSpace)
    .eq('target_space', targetSpace)
    .limit(1)
    .maybeSingle();
  if (error) {
    if (!isMissingSchema(error)) console.warn('[coach/family] linkKind error:', error.message);
    return null;
  }
  if (!data) return null;
  return (data.link_kind as string) === 'to_partner' ? 'to_partner' : 'to_child';
}

/** True iff the captain is linked to the target (allowed to write context). */
export async function canWriteContext(
  supabase: SupabaseClient,
  authorSpace: string,
  targetSpace: string,
): Promise<boolean> {
  return (await getLinkKind(supabase, authorSpace, targetSpace)) !== null;
}

// ── Context notes — captain-authored, write-only into the loved one's coach ───

export interface ContextNote {
  id: string;
  observation: string;
  skill_tag: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

type WriteResult = { ok: true; id: string } | { ok: false; error: string };

/** Add a context note. Caller MUST have passed canWriteContext. */
export async function addContextNote(
  supabase: SupabaseClient,
  input: { author_space: string; target_space: string; observation: string; skill_tag?: string | null },
): Promise<WriteResult> {
  const observation = (input.observation || '').trim();
  if (!observation) return { ok: false, error: 'observation cannot be empty' };
  if (observation.length > MAX_OBSERVATION) return { ok: false, error: `observation exceeds ${MAX_OBSERVATION} chars` };
  const skillTag = (input.skill_tag || '').trim().slice(0, MAX_SKILL_TAG) || null;
  if (!isDiaryEncryptionConfigured()) return { ok: false, error: 'encryption not configured (STORY_DIARY_KEY)' };

  const { data, error } = await supabase
    .from('story_coach_context_notes')
    .insert({
      author_space: input.author_space,
      target_space: input.target_space,
      observation_enc: encryptDiaryField(observation),
      skill_tag: skillTag,
      cipher_version: 1,
    })
    .select('id')
    .single();
  if (error || !data) {
    console.warn('[coach/family] add note error:', error?.message);
    return { ok: false, error: error?.message || 'insert failed' };
  }
  return { ok: true, id: data.id as string };
}

/** A captain's OWN notes for a given person (decrypted). Defaults to active only. */
export async function listContextNotesForAuthor(
  supabase: SupabaseClient,
  authorSpace: string,
  targetSpace: string,
  opts: { includeArchived?: boolean } = {},
): Promise<ContextNote[]> {
  let q = supabase
    .from('story_coach_context_notes')
    .select('id, observation_enc, skill_tag, cipher_version, archived_at, created_at, updated_at')
    .eq('author_space', authorSpace)
    .eq('target_space', targetSpace)
    .order('created_at', { ascending: false })
    .limit(200);
  if (!opts.includeArchived) q = q.is('archived_at', null);
  const { data, error } = await q;
  if (error) {
    if (!isMissingSchema(error)) console.warn('[coach/family] list notes error:', error.message);
    return [];
  }
  return (data || []).map((r) => ({
    id: r.id as string,
    observation: readDiaryField(r.observation_enc, r.cipher_version),
    skill_tag: (r.skill_tag as string | null) || null,
    archived: !!r.archived_at,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }));
}

/** Edit a context note — only the author can, only their own row. */
export async function editContextNote(
  supabase: SupabaseClient,
  input: { id: string; author_space: string; observation?: string; skill_tag?: string | null },
): Promise<WriteResult> {
  if (!UUID_RE.test(input.id)) return { ok: false, error: 'id must be a UUID' };
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof input.observation === 'string') {
    const obs = input.observation.trim();
    if (!obs) return { ok: false, error: 'observation cannot be empty' };
    if (obs.length > MAX_OBSERVATION) return { ok: false, error: `observation exceeds ${MAX_OBSERVATION} chars` };
    if (!isDiaryEncryptionConfigured()) return { ok: false, error: 'encryption not configured' };
    patch.observation_enc = encryptDiaryField(obs);
    patch.cipher_version = 1;
  }
  if ('skill_tag' in input) patch.skill_tag = (input.skill_tag || '').trim().slice(0, MAX_SKILL_TAG) || null;

  const { data, error } = await supabase
    .from('story_coach_context_notes')
    .update(patch)
    .eq('id', input.id)
    .eq('author_space', input.author_space) // SEAL: only your own note
    .select('id')
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'note not found' };
  return { ok: true, id: data.id as string };
}

/** Archive (soft-delete) or restore a note — only the author can. */
export async function setContextNoteArchived(
  supabase: SupabaseClient,
  input: { id: string; author_space: string; archived: boolean },
): Promise<WriteResult> {
  if (!UUID_RE.test(input.id)) return { ok: false, error: 'id must be a UUID' };
  const { data, error } = await supabase
    .from('story_coach_context_notes')
    .update({ archived_at: input.archived ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .eq('id', input.id)
    .eq('author_space', input.author_space) // SEAL: only your own note
    .select('id')
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'note not found' };
  return { ok: true, id: data.id as string };
}

// ── Incoming context for the TARGET's coach (server-side, target-coach only) ──

export interface IncomingContextNote {
  observation: string;
  skill_tag: string | null;
  created_at: string;
}

/**
 * ACTIVE context notes targeting a space, decrypted, newest first, capped. Read
 * ONLY by that space's own coach (the route calls this when the caller's space
 * IS the target). Notes from ALL linked captains are unioned. We DELIBERATELY do
 * not surface which captain wrote each note — so the target is never put in the
 * middle of the adults (plan principle 5).
 */
export async function loadIncomingContextForCoach(
  supabase: SupabaseClient,
  targetSpace: string,
  limit = 25,
): Promise<IncomingContextNote[]> {
  const cap = Math.max(1, Math.min(limit, 60));
  const { data, error } = await supabase
    .from('story_coach_context_notes')
    .select('observation_enc, skill_tag, cipher_version, created_at')
    .eq('target_space', targetSpace)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(cap);
  if (error) {
    if (!isMissingSchema(error)) console.warn('[coach/family] incoming context error:', error.message);
    return [];
  }
  return (data || []).map((r) => ({
    observation: readDiaryField(r.observation_enc, r.cipher_version),
    skill_tag: (r.skill_tag as string | null) || null,
    created_at: r.created_at as string,
  }));
}

/**
 * Render incoming context as a system-prompt section for a CHILD's coach —
 * quiet background. The behavioural rules (never quote verbatim, never reflect
 * to a parent, never name a parent or take sides) live in the child system
 * prompt; this just lays out the notes.
 */
export function formatChildContextForPrompt(notes: IncomingContextNote[], childName: string): string {
  if (!notes.length) return '';
  const lines = notes.map((n) => `- ${n.observation}${n.skill_tag ? `  (a skill to gently build: ${n.skill_tag})` : ''}`);
  return [
    `# Quiet background — what the grown-ups who love ${childName} have noticed`,
    '',
    `The trusted adults in ${childName}'s life shared these real-world observations to help you`,
    `support ${childName}. Treat them as soft background ONLY. Use them to shape how you help —`,
    `to gently build the skills below — but NEVER read them back, NEVER say "your mum/dad told me",`,
    `and NEVER make ${childName} feel watched or that this room reports to anyone. ${childName}'s`,
    `words here stay sealed; this is the one thing a grown-up can hand IN, never read OUT.`,
    '',
    lines.join('\n'),
  ].join('\n');
}

/**
 * Render incoming context as a system-prompt section for a PARTNER's (adult)
 * coach — TRANSPARENT, not covert. An autonomous adult's coach must never be a
 * secret instrument of their spouse. So the coach may acknowledge openly that a
 * loved one shared something, holds the partner's full autonomy, supports HER,
 * and NEVER weaponises a note as criticism or "correction", never takes the
 * sender's side. Especially important where the partner carries an abuse
 * history: a coach that nagged her with a husband's list would betray its whole
 * purpose. The hard rules live in the partner system-prompt block; this lays out
 * the notes.
 */
export function formatPartnerContextForPrompt(notes: IncomingContextNote[], partnerName: string): string {
  if (!notes.length) return '';
  const lines = notes.map((n) => `- ${n.observation}${n.skill_tag ? `  (something they hoped you might gently support: ${n.skill_tag})` : ''}`);
  return [
    `# From someone who loves ${partnerName} — shared openly, to help you support her`,
    '',
    `A person who loves ${partnerName} shared these real-world observations with you, hoping you`,
    `can help. You may be OPEN that a loved one shared something — ${partnerName} is an adult and`,
    `this is not a secret channel. But hold these as gentle, optional context in service of HER:`,
    `• You work for ${partnerName}, never for the person who sent these. Never take their side,`,
    `  never relay a complaint, never pressure her, never present a note as a verdict on her.`,
    `• Her autonomy is absolute. Surface a note only if it genuinely helps her with something`,
    `  SHE wants; frame it as care, never as criticism or "you need to fix this".`,
    `• You can NEVER read what ${partnerName} tells you back to the person who sent these. Her`,
    `  conversation with you is sealed — this is hand-IN only, never read-OUT.`,
    '',
    lines.join('\n'),
  ].join('\n');
}

/** Validate a space label the way the members API does (defence in API layer). */
export function isValidSpace(s: unknown): s is string {
  return typeof s === 'string' && SPACE_RE.test(s);
}
