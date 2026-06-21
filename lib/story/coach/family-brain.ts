// lib/story/coach/family-brain.ts
//
// THE FAMILY BRAIN — a seal-preserving layer above the individual coaches.
//   Individual coaches → Family Brain → pattern interruption → nobody surveilled,
//   everyone held.
//
// 🔒 THE SEAL (the load-bearing invariant — guard it with your life)
// The Family Brain NEVER reads anyone's sealed conversation, diary, or memory.
// It only ever sees:
//   1. ABSTRACTED SIGNALS — a structured {type, intensity, domain} flag with NO
//      free text. A CHILD's signal is accepted ONLY with consent === true; it is
//      never mined silently from the sealed room. emitFamilySignal enforces this.
//   2. The captain's OWN context notes (story_coach_context_notes — parent-
//      authored observations the parent chose to share; not a child's room).
// Its OUTPUTS:
//   • NUDGES — an abstracted tonal reframe about HOW to coach the RECIPIENT.
//     A nudge must NEVER name or describe another family member. We validate this
//     (rejectIfLeaks) before persisting — defence in depth on top of the prompt.
//   • A parent-query OBSERVATION — pattern-level, never attributed, encrypted.
// There is no function in this module that reads story_coach_log /
// story_diary_entries / story_coach_memory. Do not add one.

import type Anthropic from '@anthropic-ai/sdk';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { readDiaryField } from '@/lib/story/diary-crypto';

// ── Vocab (structured, non-sensitive) ─────────────────────────────────────────

export const SIGNAL_TYPES = [
  'overloaded', 'overwhelmed', 'low_mood', 'anxious', 'withdrawn',
  'under_pressure', 'conflict_cycle', 'disconnected', 'sleep_deprived', 'irritable',
] as const;
export type SignalType = typeof SIGNAL_TYPES[number];

export const SIGNAL_DOMAINS = [
  'household_load', 'school', 'sleep', 'mood', 'conflict', 'connection', 'health', 'general',
] as const;
export type SignalDomain = typeof SIGNAL_DOMAINS[number];

const SPACE_RE = /^[a-z0-9_-]{2,30}$/;

function isMissingSchema(err: { code?: string } | null | undefined): boolean {
  return err?.code === '42703' || err?.code === '42P01';
}

// ── Family resolution (from the links graph, no extra tables) ─────────────────

export interface FamilyMember { space: string; role: 'adult' | 'parent' | 'child'; }

interface FamilyShape { family_key: string; members: FamilyMember[]; }

/**
 * Resolve the family a space belongs to from the context-links graph + roles.
 * family_key = the "head" (a space that authors links but is never a target);
 * falls back to the alphabetically-first member, else the space itself.
 * Low volume → we read all links once and compute in JS.
 */
export async function resolveFamily(supabase: SupabaseClient, space: string): Promise<FamilyShape> {
  if (!SPACE_RE.test(space)) return { family_key: space, members: [{ space, role: 'adult' }] };

  const { data: links, error } = await supabase
    .from('story_coach_context_links')
    .select('author_space, target_space');
  if (error) {
    if (!isMissingSchema(error)) console.warn('[family-brain] links read error:', error.message);
    return { family_key: space, members: [{ space, role: 'adult' }] };
  }

  // Build an undirected adjacency + remember directed authorship.
  const adj = new Map<string, Set<string>>();
  const authors = new Set<string>();
  const targets = new Set<string>();
  const add = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a)!.add(b);
  };
  for (const l of links || []) {
    const a = l.author_space as string;
    const t = l.target_space as string;
    authors.add(a); targets.add(t);
    add(a, t); add(t, a);
  }

  // Connected component containing `space`.
  const seen = new Set<string>([space]);
  const stack = [space];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const nb of adj.get(cur) || []) {
      if (!seen.has(nb)) { seen.add(nb); stack.push(nb); }
    }
  }
  const memberSpaces = [...seen];

  // family_key = a member who authors but is never a target (the captain/head).
  const heads = memberSpaces.filter((s) => authors.has(s) && !targets.has(s));
  const familyKey = heads.length ? heads.sort()[0] : memberSpaces.sort()[0] || space;

  // Hydrate roles from story_admin_users.
  const roleBySpace = new Map<string, 'adult' | 'parent' | 'child'>();
  if (memberSpaces.length) {
    const { data: users } = await supabase
      .from('story_admin_users')
      .select('space, role')
      .in('space', memberSpaces);
    for (const u of users || []) {
      const r = (u.role as string) === 'child' ? 'child' : (u.role as string) === 'parent' ? 'parent' : 'adult';
      roleBySpace.set(u.space as string, r);
    }
  }
  const members: FamilyMember[] = memberSpaces.map((s) => ({ space: s, role: roleBySpace.get(s) || 'adult' }));
  return { family_key: familyKey, members };
}

/** family_key for a space (thin wrapper). */
export async function resolveFamilyKey(supabase: SupabaseClient, space: string): Promise<string> {
  return (await resolveFamily(supabase, space)).family_key;
}

// ── Signals (in) ──────────────────────────────────────────────────────────────

export interface EmitSignalInput {
  source_space: string;
  source_role: 'adult' | 'parent' | 'child';
  signal_type: SignalType;
  intensity?: number;       // 1–3
  domain?: SignalDomain | null;
  consented: boolean;       // a child signal MUST be true
}

type EmitResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Emit one abstracted signal. THE SEAL: a child signal is refused unless
 * consented === true (the child's coach asked and the child agreed to a wordless
 * flag). No conversation content is stored — only the structured flag.
 * Keeps one active signal per (source_space, signal_type): a fresh one expires
 * the prior, so signals don't pile up.
 */
export async function emitFamilySignal(supabase: SupabaseClient, input: EmitSignalInput): Promise<EmitResult> {
  if (!SPACE_RE.test(input.source_space)) return { ok: false, error: 'bad source_space' };
  if (!SIGNAL_TYPES.includes(input.signal_type)) return { ok: false, error: 'unknown signal_type' };
  if (input.source_role === 'child' && input.consented !== true) {
    // The seal: never mine a child silently.
    return { ok: false, error: 'a child signal requires the child’s consent' };
  }
  const intensity = Math.max(1, Math.min(3, Math.round(input.intensity ?? 1)));
  const domain = input.domain && SIGNAL_DOMAINS.includes(input.domain) ? input.domain : null;
  const familyKey = await resolveFamilyKey(supabase, input.source_space);

  // Expire any prior active signal of the same kind from this source (dedup).
  await supabase
    .from('story_coach_family_signals')
    .update({ expires_at: new Date().toISOString() })
    .eq('source_space', input.source_space)
    .eq('signal_type', input.signal_type)
    .gt('expires_at', new Date().toISOString())
    .then(({ error }) => { if (error && !isMissingSchema(error)) console.warn('[family-brain] dedup error:', error.message); });

  const { data, error } = await supabase
    .from('story_coach_family_signals')
    .insert({
      family_key: familyKey,
      source_space: input.source_space,
      source_role: input.source_role,
      signal_type: input.signal_type,
      intensity,
      domain,
      consented: input.consented === true,
    })
    .select('id')
    .single();
  if (error || !data) {
    console.warn('[family-brain] emit error:', error?.message);
    return { ok: false, error: error?.message || 'insert failed' };
  }
  return { ok: true, id: data.id as string };
}

interface ActiveSignal {
  source_space: string;
  source_role: string;
  signal_type: string;
  intensity: number;
  domain: string | null;
  created_at: string;
}

/** Active signals for a family (Family-Brain-only consumer). */
async function loadActiveSignals(supabase: SupabaseClient, familyKey: string): Promise<ActiveSignal[]> {
  const { data, error } = await supabase
    .from('story_coach_family_signals')
    .select('source_space, source_role, signal_type, intensity, domain, created_at')
    .eq('family_key', familyKey)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) {
    if (!isMissingSchema(error)) console.warn('[family-brain] signals read error:', error.message);
    return [];
  }
  return (data || []).map((r) => ({
    source_space: r.source_space as string,
    source_role: r.source_role as string,
    signal_type: r.signal_type as string,
    intensity: (r.intensity as number) ?? 1,
    domain: (r.domain as string | null) ?? null,
    created_at: r.created_at as string,
  }));
}

/** Captain-authored context notes across the family (parent-authored; seal-safe). */
async function loadFamilyContextNotes(
  supabase: SupabaseClient,
  memberSpaces: string[],
): Promise<{ target_space: string; observation: string; skill_tag: string | null }[]> {
  if (!memberSpaces.length) return [];
  const { data, error } = await supabase
    .from('story_coach_context_notes')
    .select('target_space, observation_enc, skill_tag, cipher_version')
    .in('target_space', memberSpaces)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) {
    if (!isMissingSchema(error)) console.warn('[family-brain] context notes read error:', error.message);
    return [];
  }
  return (data || []).map((r) => ({
    target_space: r.target_space as string,
    observation: readDiaryField(r.observation_enc, r.cipher_version),
    skill_tag: (r.skill_tag as string | null) || null,
  }));
}

// ── Nudges (out) ──────────────────────────────────────────────────────────────

/**
 * Reject a nudge whose text leaks ANY family member's identifier (space label or
 * its title-cased name). A tonal reframe is about HOW to coach the recipient and
 * never needs to name a person — so any identifier is a leak.
 */
function nudgeLeaks(shiftText: string, memberSpaces: string[]): boolean {
  const hay = shiftText.toLowerCase();
  for (const s of memberSpaces) {
    const label = s.toLowerCase();
    const name = label; // space label == lowercase name in this model
    // word-ish boundary check
    const re = new RegExp(`(^|[^a-z])(${label}|${name})([^a-z]|$)`, 'i');
    if (re.test(hay)) return true;
  }
  return false;
}

interface BrainOutput {
  observation: string;                  // family-level, never attributed
  nudges: { target_space: string; shift_text: string }[];
}

const BRAIN_TOOL: Tool = {
  name: 'family_pattern_read',
  description:
    'Report the family-level pattern you see and the gentle tonal shift each member’s coach should adopt. ' +
    'NEVER attribute anything to a named individual. Nudges describe HOW to coach the RECIPIENT — never mention ' +
    'or describe another family member.',
  input_schema: {
    type: 'object',
    properties: {
      observation: {
        type: 'string',
        description:
          'A short, warm, family-LEVEL read of what is converging right now (2–4 sentences). Patterns only — ' +
          'never "X said" or "Y is doing". This is what a parent sees when they ask "what are you seeing?".',
      },
      nudges: {
        type: 'array',
        description: 'One optional gentle tonal shift per member who would benefit. Omit a member if no shift is needed.',
        items: {
          type: 'object',
          properties: {
            target_space: { type: 'string', description: 'The member whose coach should adopt the shift.' },
            shift_text: {
              type: 'string',
              description:
                'A quiet reframe for HOW to coach this person right now (1 sentence). E.g. "lead with extra ' +
                'warmth and go gentle on adding any new load this week." NEVER name or describe another family member.',
            },
          },
          required: ['target_space', 'shift_text'],
        },
      },
    },
    required: ['observation', 'nudges'],
  },
};

function buildBrainPrompt(
  members: FamilyMember[],
  signals: ActiveSignal[],
  notes: { target_space: string; observation: string; skill_tag: string | null }[],
): string {
  const roster = members.map((m) => `- ${m.space} (${m.role})`).join('\n');
  const sigLines = signals.length
    ? signals.map((s) => `- ${s.source_role} signal: ${s.signal_type}${s.domain ? ` [${s.domain}]` : ''} (intensity ${s.intensity})`).join('\n')
    : '- (no active signals)';
  const noteLines = notes.length
    ? notes.map((n) => `- a parent observed about ${n.target_space}: "${n.observation}"${n.skill_tag ? ` (skill: ${n.skill_tag})` : ''}`).join('\n')
    : '- (no parent observations)';

  return `You are the FAMILY BRAIN for a family using individual private coaches. You sit ABOVE the individual
coaches and gently interrupt converging stress patterns — like a wise family therapist who never breaks anyone's
confidence.

You can see ONLY two things, and you must reason from these alone:
  1. ABSTRACTED SIGNALS — structured flags. You do NOT see what anyone said; only the flag type + intensity.
  2. PARENT OBSERVATIONS — things a parent chose to share about a family member.

🔒 ABSOLUTE RULES
  • NEVER attribute anything to a named person in the observation. Speak at the family LEVEL only ("there's a
    stretched, pressured feeling moving through the home right now"), never "Riddick is withdrawn" or "Mum is…".
  • A nudge is a tonal shift for HOW to coach the RECIPIENT. It must NEVER name or describe another member.
  • Lead the dynamic-change nudges to the ADULTS (parents) — they hold the levers. For a child, only a gentle,
    supportive shift (warmth, steadiness) — NEVER anything that hints they are being managed or watched.
  • Restraint: if the signals don't actually converge into a pattern, say so plainly and return few or no nudges.
    Do not manufacture a crisis. Most days need nothing.

# Family
${roster}

# Active signals
${sigLines}

# Parent observations
${noteLines}

Call family_pattern_read with your family-level observation and any gentle per-member tonal shifts. target_space
MUST be one of the family members above.`;
}

/**
 * Run the Family Brain: detect the converging pattern from signals + parent
 * observations, write fresh abstracted nudges to each relevant member's coach,
 * and return the family-level observation. NEVER reads a sealed conversation.
 */
export async function runFamilyBrain(
  supabase: SupabaseClient,
  anthropic: Anthropic,
  model: string,
  familyKey: string,
): Promise<{ observation: string; nudgeCount: number }> {
  const fam = await resolveFamily(supabase, familyKey);
  // resolveFamily(familyKey) returns the component containing the key itself.
  const members = fam.members.length ? fam.members : [{ space: familyKey, role: 'adult' as const }];
  const memberSpaces = members.map((m) => m.space);

  const [signals, notes] = await Promise.all([
    loadActiveSignals(supabase, familyKey),
    loadFamilyContextNotes(supabase, memberSpaces),
  ]);

  // Nothing to reason about → quiet, no Sonnet spend.
  if (!signals.length && !notes.length) {
    return { observation: 'All quiet — nothing converging in the family right now.', nudgeCount: 0 };
  }

  let out: BrainOutput = { observation: '', nudges: [] };
  try {
    const resp = await anthropic.messages.create(
      {
        model,
        max_tokens: 1024,
        tools: [BRAIN_TOOL],
        tool_choice: { type: 'tool', name: 'family_pattern_read' },
        messages: [{ role: 'user', content: buildBrainPrompt(members, signals, notes) }],
      },
      { timeout: 45_000 },
    );
    const block = resp.content.find((b) => b.type === 'tool_use');
    if (block && block.type === 'tool_use') {
      const inp = block.input as { observation?: string; nudges?: { target_space?: string; shift_text?: string }[] };
      out = {
        observation: (inp.observation || '').trim(),
        nudges: Array.isArray(inp.nudges) ? inp.nudges.map((n) => ({ target_space: (n.target_space || '').trim(), shift_text: (n.shift_text || '').trim() })) : [],
      };
    }
  } catch (e) {
    console.warn('[family-brain] run error:', e instanceof Error ? e.message : 'unknown');
    return { observation: '', nudgeCount: 0 };
  }

  // Validate + persist nudges. Reject any that name a member or target a non-member.
  const memberSet = new Set(memberSpaces);
  let written = 0;
  for (const n of out.nudges) {
    if (!memberSet.has(n.target_space) || !n.shift_text) continue;
    if (nudgeLeaks(n.shift_text, memberSpaces)) {
      console.warn('[family-brain] dropped a nudge that leaked a member identifier');
      continue;
    }
    // Expire prior active nudges for this member, then write the fresh one.
    await supabase
      .from('story_coach_family_nudges')
      .update({ expires_at: new Date().toISOString() })
      .eq('target_space', n.target_space)
      .gt('expires_at', new Date().toISOString())
      .then(({ error }) => { if (error && !isMissingSchema(error)) console.warn('[family-brain] nudge dedup error:', error.message); });
    const { error } = await supabase
      .from('story_coach_family_nudges')
      .insert({ family_key: familyKey, target_space: n.target_space, shift_text: n.shift_text.slice(0, 400), source_pattern: 'family_pattern' });
    if (!error) written++;
    else if (!isMissingSchema(error)) console.warn('[family-brain] nudge insert error:', error.message);
  }
  return { observation: out.observation, nudgeCount: written };
}

/** The freshest active tonal nudge for a space (the coach injects this). */
export async function loadActiveNudgeForSpace(supabase: SupabaseClient, space: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('story_coach_family_nudges')
    .select('shift_text')
    .eq('target_space', space)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (!isMissingSchema(error)) console.warn('[family-brain] nudge read error:', error.message);
    return null;
  }
  return (data?.shift_text as string | undefined)?.trim() || null;
}

/** Render the active nudge as a quiet system-prompt directive for an individual coach. */
export function formatNudgeForPrompt(shiftText: string): string {
  if (!shiftText) return '';
  return [
    '# A gentle shift for this conversation',
    `Without saying so, adopt this tone right now: ${shiftText}`,
    'This is a quiet reframe for how YOU show up — never mention it, never explain it, never reference anyone else.',
  ].join('\n');
}

// ── Parent query ("what are you seeing in our family?") ───────────────────────

/**
 * Parent-only: run the brain and return its family-level observation (pattern
 * only, never attributed). Logs the observation encrypted. The caller MUST have
 * verified the requester is a parent in this family.
 */
export async function familyBrainObservationForParent(
  supabase: SupabaseClient,
  anthropic: Anthropic,
  model: string,
  familyKey: string,
  queriedBySpace: string,
  encryptFn: (s: string) => string,
): Promise<string> {
  const { observation } = await runFamilyBrain(supabase, anthropic, model, familyKey);
  const text = observation || 'All quiet — nothing converging in the family right now.';
  // Archive (encrypted, fire-and-forget). The brain's own output, not anyone's words.
  try {
    void supabase
      .from('story_coach_family_brain_log')
      .insert({ family_key: familyKey, queried_by_space: queriedBySpace, observation_enc: encryptFn(text.slice(0, 4000)), cipher_version: 1 })
      .then(({ error }) => { if (error && !isMissingSchema(error)) console.warn('[family-brain] log error:', error.message); });
  } catch { /* non-fatal */ }
  return text;
}
