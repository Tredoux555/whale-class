// lib/story/coach/build-state.ts
//
// The Coach's SESSION HANDOFF — a recoverable build state so the next session
// resumes without re-explaining context. Distinct from semantic memory, the
// diary, and the raw turn log (see migration 273 for the why).
//
// One ACTIVE state per project (supersede-on-save; older states kept, never
// deleted). The TOOL hands us structured fields; we render a single canonical
// handoff document from them and store that — so what gets saved is exactly what
// gets read back, with no reformatting drift. Encrypted at rest via diary-crypto.
//
// Mirrors the type/error posture of memory.ts: writes fail loudly (returned),
// reads degrade quietly (null/[]), nothing here ever throws to the caller.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import {
  encryptDiaryField,
  encryptDiaryFieldOrNull,
  readDiaryField,
  isDiaryEncryptionConfigured,
} from '@/lib/story/diary-crypto';

export type StepStatus = 'done' | 'in_progress' | 'not_started';

export interface BuildListItem {
  text: string;
  status: StepStatus;
}

export interface BuildStateInput {
  /** Feature/project this build belongs to (the supersede key + label). */
  project: string;
  /** The ordered build list — every item, in order. */
  build_list: BuildListItem[];
  /** Exactly where we stopped, e.g. "Step 3: wiring the route — in progress". */
  current_step: string;
  /** What was tested and passed (optional). */
  confirmed?: string[];
  /** The single exact next action to take. */
  next_action: string;
  /** Blockers, open questions, pending decisions (optional). */
  blockers?: string[];
}

// Bounds — generous (this is a handoff doc, not a 1000-char memory) but capped so
// a runaway model can't write an unbounded row.
const MAX_PROJECT = 120;
const MAX_ITEMS = 60;
const MAX_FIELD = 600; // per free-text field / list item
const MAX_LIST = 40; // confirmed[] / blockers[] entry count

const VALID_STATUS: ReadonlySet<string> = new Set<StepStatus>(['done', 'in_progress', 'not_started']);
const STATUS_MARK: Record<StepStatus, string> = {
  done: '✅ done',
  in_progress: '🔶 in progress',
  not_started: '⬜ not started',
};

function clamp(s: unknown, n = MAX_FIELD): string {
  return (typeof s === 'string' ? s : '').trim().slice(0, n);
}

function coerceStatus(s: unknown): StepStatus {
  return typeof s === 'string' && VALID_STATUS.has(s) ? (s as StepStatus) : 'not_started';
}

/** A "Wed 24 Jun 2026, 19:40" timestamp in the caller's timezone. */
function formatSavedLabel(tz?: string): string {
  const now = new Date();
  try {
    const date = new Intl.DateTimeFormat('en-GB', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
      ...(tz ? { timeZone: tz } : {}),
    }).format(now);
    const time = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit', minute: '2-digit', hour12: false, hourCycle: 'h23',
      ...(tz ? { timeZone: tz } : {}),
    }).format(now);
    return `${date}, ${time}${tz ? '' : ' (server time)'}`;
  } catch {
    return now.toISOString();
  }
}

/** Normalise raw input to bounded, clean fields. Single source of truth used by
 *  both the rendered doc and the stored JSON, so the two never disagree. */
function normalise(input: BuildStateInput) {
  return {
    project: clamp(input.project, MAX_PROJECT),
    build_list: (Array.isArray(input.build_list) ? input.build_list : [])
      .slice(0, MAX_ITEMS)
      .map((it) => ({ text: clamp(it?.text), status: coerceStatus(it?.status) }))
      .filter((it) => it.text),
    current_step: clamp(input.current_step),
    confirmed: (Array.isArray(input.confirmed) ? input.confirmed : [])
      .slice(0, MAX_LIST).map((c) => clamp(c)).filter(Boolean),
    next_action: clamp(input.next_action),
    blockers: (Array.isArray(input.blockers) ? input.blockers : [])
      .slice(0, MAX_LIST).map((b) => clamp(b)).filter(Boolean),
  };
}

/**
 * Render the canonical handoff document from normalised fields. Deterministic —
 * the exact text we store and later read back.
 */
export function renderBuildStateDoc(n: ReturnType<typeof normalise>, savedLabel: string): string {
  const list = n.build_list.map((it, i) => `${i + 1}. ${it.text} — ${STATUS_MARK[it.status]}`);
  return [
    `# BUILD STATE — ${n.project || 'Untitled build'}`,
    `Saved: ${savedLabel}`,
    '',
    '## Build list',
    list.length ? list.join('\n') : '_(no items captured)_',
    '',
    '## Current step',
    n.current_step || '_(not specified)_',
    '',
    '## Confirmed working (tested & passed)',
    n.confirmed.length ? n.confirmed.map((c) => `- ${c}`).join('\n') : '- None yet',
    '',
    '## Next action',
    n.next_action || '_(not specified)_',
    '',
    '## Blockers / open questions / pending decisions',
    n.blockers.length ? n.blockers.map((b) => `- ${b}`).join('\n') : '- None',
  ].join('\n');
}

type WriteResult = { ok: true; id: string; doc: string } | { ok: false; error: string };

/**
 * Save a build state. Renders + encrypts the handoff, inserts it, then supersedes
 * the prior ACTIVE state for the SAME project (case-insensitive). Other projects'
 * states are untouched.
 */
export async function writeBuildState(
  supabase: SupabaseClient,
  space: string,
  input: BuildStateInput,
  tz?: string,
): Promise<WriteResult> {
  if (!isDiaryEncryptionConfigured()) {
    return { ok: false, error: 'encryption not configured (STORY_DIARY_KEY)' };
  }
  const n = normalise(input);
  if (!n.project) return { ok: false, error: 'project is required' };
  if (!n.next_action) return { ok: false, error: 'next_action is required' };

  const savedLabel = formatSavedLabel(tz);
  const doc = renderBuildStateDoc(n, savedLabel);
  const stateJson = JSON.stringify({ ...n, saved_label: savedLabel });

  // Find the active row for this project (small set — match in JS, no ilike).
  const projectKey = n.project.toLowerCase();
  const { data: activeRows } = await supabase
    .from('story_coach_build_state')
    .select('id, project')
    .eq('space', space)
    .is('superseded_at', null);
  const prior = (activeRows || []).find((r) => (r.project as string || '').toLowerCase() === projectKey);

  const { data, error } = await supabase
    .from('story_coach_build_state')
    .insert({
      space,
      project: n.project,
      doc_enc: encryptDiaryField(doc),
      state_enc: encryptDiaryFieldOrNull(stateJson),
      cipher_version: 1,
    })
    .select('id')
    .single();
  if (error || !data) {
    console.warn('[coach/build-state] insert error:', error?.message);
    return { ok: false, error: error?.message || 'insert failed' };
  }
  const newId = data.id as string;

  if (prior?.id) {
    const { error: supErr } = await supabase
      .from('story_coach_build_state')
      .update({ superseded_at: new Date().toISOString(), superseded_by: newId })
      .eq('id', prior.id)
      .eq('space', space)
      .is('superseded_at', null);
    if (supErr) {
      // Non-fatal: the new state exists; the old one just stays active too.
      console.warn('[coach/build-state] supersede error:', supErr.message);
    }
  }
  return { ok: true, id: newId, doc };
}

export interface CurrentBuildState {
  id: string;
  project: string;
  doc: string;
  created_at: string;
}

/**
 * Load the current (active) build state. With no project, returns the most
 * recently saved one. With a project, returns that project's active state if
 * present, else the most recent. Returns null when there is none.
 */
export async function loadCurrentBuildState(
  supabase: SupabaseClient,
  space: string,
  project?: string,
): Promise<CurrentBuildState | null> {
  const { data, error } = await supabase
    .from('story_coach_build_state')
    .select('id, project, doc_enc, cipher_version, created_at')
    .eq('space', space)
    .is('superseded_at', null)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error || !data?.length) {
    if (error) console.warn('[coach/build-state] load error:', error.message);
    return null;
  }
  let row = data[0];
  if (project && project.trim()) {
    const key = project.trim().toLowerCase();
    row = data.find((r) => (r.project as string || '').toLowerCase() === key) || data[0];
  }
  let doc = '';
  try {
    doc = readDiaryField(row.doc_enc, row.cipher_version) || '';
  } catch {
    return null; // can't decrypt → behave as if none rather than break the turn
  }
  if (!doc.trim()) return null;
  return { id: row.id as string, project: row.project as string, doc, created_at: row.created_at as string };
}

/** Names of all active build states (newest-first), for "other builds exist" hints. */
export async function listActiveBuildProjects(supabase: SupabaseClient, space: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('story_coach_build_state')
    .select('project, created_at')
    .eq('space', space)
    .is('superseded_at', null)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error || !data) return [];
  return data.map((r) => r.project as string).filter(Boolean);
}

/**
 * The session-start "Where we left off" section. Carries the instruction to open
 * by reading the handoff back and asking for confirmation before continuing.
 */
export function formatBuildStateForPrompt(current: CurrentBuildState, otherProjects: string[]): string {
  const others = otherProjects.filter((p) => p.toLowerCase() !== current.project.toLowerCase());
  const extra = others.length
    ? `\n\n(There are also saved build states for: ${others.join(', ')}. Mention these exist only if relevant.)`
    : '';
  return [
    '# Where we left off (saved build state)',
    '',
    'This is the start of a session and there is a SAVED BUILD STATE from last time. Open by reading it back ' +
      'to them in this exact structure, then ask them to confirm it still looks right before continuing. Do ' +
      'NOT invent progress that is not written below.',
    '',
    current.doc.trim(),
    extra,
  ].join('\n');
}
