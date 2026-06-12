// lib/montree/parent-profile/loader.ts
//
// Helpers for loading a parent's profile + the parent linked to a child.
// Used by prepare_parent_meeting to enrich the dossier with structured
// archetype + cultural + trigger data when a profile exists.
//
// SCHOOL-SCOPING:
//   Every helper takes schoolId and filters every Supabase query by it.
//
// MIGRATION-AWARE:
//   loadParentProfile() returns null + degraded:true if the schema is
//   missing (migration 238 not yet run). Callers must accept null
//   gracefully — the dossier still ships, just without rich parent data.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';

export interface ParentProfileLoaded {
  parent_id: string;
  parent_name: string;
  parent_email: string | null;
  archetypes: string[];
  cultural_register: Record<string, string>;
  preferred_language: string;
  known_triggers: string[];
  effective_moves: string[];
  relationship_temperature: string;
  family_context: string;
  priorities_for_child: string[];
  history_notes: string;
  meeting_count: number;
  last_meeting_date: string | null;
  source: string;
  evaluated_by_role: string;
  updated_at: string;
}

interface ParentRow {
  id: string;
  name: string | null;
  email: string | null;
}

interface ProfileRow {
  archetypes: string[] | null;
  cultural_register: Record<string, string> | null;
  preferred_language: string | null;
  known_triggers: string[] | null;
  effective_moves: string[] | null;
  relationship_temperature: string | null;
  family_context: string | null;
  priorities_for_child: string[] | null;
  history_notes: string | null;
  meeting_count: number | null;
  last_meeting_date: string | null;
  source: string | null;
  evaluated_by_role: string | null;
  updated_at: string | null;
}

function isMigrationMissing(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  return e.code === '42P01' || (e.message ?? '').includes('does not exist');
}

/**
 * Resolve which parent profile to load for a child + meeting purpose.
 *
 * Strategy:
 *   1. Pull all parents linked to the child via montree_parent_children
 *      filtered to the school.
 *   2. If meeting_purpose names one of them (case-insensitive substring),
 *      prefer that parent.
 *   3. Otherwise return the first linked parent (ordered by created_at).
 *
 * Returns null if no parents are linked. Never throws.
 */
export async function resolveParentForChild(
  supabase: SupabaseClient,
  childId: string,
  schoolId: string,
  meetingPurpose: string
): Promise<ParentRow | null> {
  try {
    // 1. Fetch junction rows.
    const { data: junctionRows, error: jErr } = await supabase
      .from('montree_parent_children')
      .select('parent_id')
      .eq('child_id', childId);
    if (jErr || !junctionRows || junctionRows.length === 0) return null;

    const parentIds = (junctionRows as Array<{ parent_id: string }>).map(
      (j) => j.parent_id
    );

    // 2. Fetch parent rows + school-scope.
    const { data: parentRows, error: pErr } = await supabase
      .from('montree_parents')
      .select('id, name, email, created_at')
      .in('id', parentIds)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: true });
    if (pErr || !parentRows || parentRows.length === 0) return null;

    const parents = parentRows as Array<ParentRow & { created_at: string }>;

    // 3. Prefer one named in the meeting purpose (case-insensitive).
    const lowerPurpose = meetingPurpose.toLowerCase();
    const named = parents.find((p) => {
      if (!p.name) return false;
      const firstName = p.name.split(/\s+/)[0]?.toLowerCase();
      if (firstName && firstName.length >= 3 && lowerPurpose.includes(firstName)) {
        return true;
      }
      const fullName = p.name.toLowerCase();
      return fullName.length >= 3 && lowerPurpose.includes(fullName);
    });

    if (named) {
      return { id: named.id, name: named.name, email: named.email };
    }

    // 4. Default: first linked parent.
    const first = parents[0];
    return { id: first.id, name: first.name, email: first.email };
  } catch (err) {
    console.warn(
      '[parent-profile/loader] resolveParentForChild failed:',
      err instanceof Error ? err.message : 'unknown'
    );
    return null;
  }
}

/**
 * Load the parent's full structured profile if migration 238 is run.
 * Returns null if no profile exists yet OR the migration isn't run.
 *
 * NEVER THROWS. Migration-missing degrades gracefully.
 */
export async function loadParentProfile(
  supabase: SupabaseClient,
  parentId: string,
  schoolId: string
): Promise<ParentProfileLoaded | null> {
  try {
    // Verify parent + school first.
    const { data: parent, error: pErr } = await supabase
      .from('montree_parents')
      .select('id, name, email')
      .eq('id', parentId)
      .eq('school_id', schoolId)
      .maybeSingle();
    if (pErr || !parent) return null;

    const { data: row, error: profileErr } = await supabase
      .from('montree_parent_profiles')
      .select(
        'archetypes, cultural_register, preferred_language, known_triggers, effective_moves, relationship_temperature, family_context, priorities_for_child, history_notes, meeting_count, last_meeting_date, source, evaluated_by_role, updated_at'
      )
      .eq('parent_id', parentId)
      .eq('school_id', schoolId)
      .maybeSingle();

    if (profileErr) {
      if (isMigrationMissing(profileErr)) return null;
      console.warn(
        '[parent-profile/loader] loadParentProfile DB error:',
        profileErr.message
      );
      return null;
    }
    if (!row) return null;

    const r = row as ProfileRow;
    return {
      parent_id: parent.id,
      parent_name: parent.name ?? '',
      parent_email: parent.email ?? null,
      archetypes: r.archetypes ?? [],
      cultural_register: r.cultural_register ?? {},
      preferred_language: r.preferred_language ?? '',
      known_triggers: r.known_triggers ?? [],
      effective_moves: r.effective_moves ?? [],
      relationship_temperature: r.relationship_temperature ?? 'neutral',
      family_context: r.family_context ?? '',
      priorities_for_child: r.priorities_for_child ?? [],
      history_notes: r.history_notes ?? '',
      meeting_count: r.meeting_count ?? 0,
      last_meeting_date: r.last_meeting_date ?? null,
      source: r.source ?? 'principal_typed',
      evaluated_by_role: r.evaluated_by_role ?? 'principal',
      updated_at: r.updated_at ?? '',
    };
  } catch (err) {
    if (isMigrationMissing(err)) return null;
    console.warn(
      '[parent-profile/loader] loadParentProfile threw:',
      err instanceof Error ? err.message : 'unknown'
    );
    return null;
  }
}

/**
 * Render a loaded profile as a markdown block to inject into the
 * prepare_parent_meeting structuredContext. Compact, prompt-optimised.
 *
 * Returns empty string when profile is null (caller can safely concat).
 */
export function renderParentProfileForPrompt(
  profile: ParentProfileLoaded | null
): string {
  if (!profile) return '';

  const lines: string[] = ['# PARENT PROFILE (rich — use this to personalise the dossier)'];
  lines.push(`Name: ${profile.parent_name || '(unnamed)'}`);
  if (profile.parent_email) lines.push(`Email: ${profile.parent_email}`);
  lines.push(
    `Archetypes: ${profile.archetypes.length > 0 ? profile.archetypes.join(', ') : '(none identified)'}`
  );
  const culturalKeys = Object.keys(profile.cultural_register || {});
  if (culturalKeys.length > 0) {
    lines.push(
      'Cultural register: ' +
        culturalKeys
          .map((k) => `${k}=${profile.cultural_register[k]}`)
          .join(', ')
    );
  } else {
    lines.push('Cultural register: (not yet mapped)');
  }
  if (profile.preferred_language) {
    lines.push(`Preferred emotional language: ${profile.preferred_language}`);
  }
  lines.push(
    `Known triggers (AVOID): ${profile.known_triggers.length > 0 ? profile.known_triggers.join('; ') : '(none recorded)'}`
  );
  lines.push(
    `Effective moves (USE): ${profile.effective_moves.length > 0 ? profile.effective_moves.join('; ') : '(none recorded)'}`
  );
  lines.push(`Relationship temperature: ${profile.relationship_temperature}`);
  if (profile.family_context) {
    lines.push(`Family context: ${profile.family_context}`);
  }
  if (profile.priorities_for_child.length > 0) {
    lines.push(
      `Parent's priorities for this child: ${profile.priorities_for_child.join('; ')}`
    );
  }
  if (profile.history_notes) {
    lines.push(`History notes: ${profile.history_notes}`);
  }
  lines.push(
    `Past meeting count: ${profile.meeting_count}${profile.last_meeting_date ? ` (last on ${profile.last_meeting_date.slice(0, 10)})` : ''}`
  );
  lines.push(`Source: ${profile.source} (${profile.evaluated_by_role})`);

  return lines.join('\n');
}
