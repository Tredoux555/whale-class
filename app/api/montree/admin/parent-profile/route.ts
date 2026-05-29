// app/api/montree/admin/parent-profile/route.ts
//
// Ultimate Astra Phase A — parent profile CRUD.
//
// GET    ?parent_id=X   → returns the profile (school-scoped via auth)
// POST                  → upsert from voice intake. Body: { parent_id, transcript, locale? }
//                         Calls parseVoiceIntake, persists the draft, returns it.
// PATCH  ?id=X          → edit a profile (body: any subset of fields)
// DELETE ?id=X          → soft-delete (clear all fields, leave row for audit)
//
// SCHOOL-SCOPING CONTRACT (load-bearing):
//   Every read + write filters by auth.schoolId. The parent_id MUST belong
//   to a parent row whose school_id matches the principal's school. We
//   verify this BEFORE every operation — never trust client-supplied ids.
//
// MIGRATION-AWARE:
//   If migration 238 hasn't been run yet, queries return Postgres 42P01
//   ("relation does not exist"). We catch + degrade to `{ migration_pending:
//   true }` so the UI can render a friendly fallback.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { anthropic } from '@/lib/ai/anthropic';
import {
  parseVoiceIntake,
  PARENT_ARCHETYPES,
  CULTURAL_DIMENSIONS,
  RELATIONSHIP_TEMPERATURES,
  type ParentProfileDraft,
} from '@/lib/montree/parent-profile/voice-intake';

export const maxDuration = 90;

// ── helpers ────────────────────────────────────────────────────────────

interface ParentRow {
  id: string;
  school_id: string;
  name: string;
  email: string | null;
}

async function loadParentInSchool(
  supabase: ReturnType<typeof getSupabase>,
  parentId: string,
  schoolId: string
): Promise<(ParentRow & { recording_consent_on_file?: boolean }) | null> {
  // Try wide select including consent flag (Phase E migration 243).
  // Gracefully fall back to narrow select if column doesn't exist yet.
  let row: (ParentRow & { recording_consent_on_file?: boolean }) | null = null;
  try {
    const { data, error } = await supabase
      .from('montree_parents')
      .select('id, school_id, name, email, recording_consent_on_file')
      .eq('id', parentId)
      .eq('school_id', schoolId)
      .maybeSingle();
    if (!error) {
      row = (data as (ParentRow & { recording_consent_on_file?: boolean }) | null) ?? null;
    } else if (error.code === '42703' || (error.message ?? '').includes('does not exist')) {
      // Column doesn't exist yet — fall through to narrow select.
    } else {
      console.warn('[parent-profile] loadParent wide select error:', error.message);
    }
  } catch (err) {
    const e = err as { code?: string };
    if (e.code !== '42703') {
      console.warn('[parent-profile] loadParent wide select threw:', err);
    }
  }
  if (row !== null) return row;
  // Narrow fallback.
  const { data } = await supabase
    .from('montree_parents')
    .select('id, school_id, name, email')
    .eq('id', parentId)
    .eq('school_id', schoolId)
    .maybeSingle();
  return (data as ParentRow | null) ?? null;
}

function isMigrationMissing(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  return e.code === '42P01' || (e.message ?? '').includes('does not exist');
}

// Defensive: cap every string field. The migration's CHECKs handle enums;
// these guards handle length.
function sanitizePatch(raw: unknown): Partial<ParentProfileDraft> {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;
  const out: Partial<ParentProfileDraft> = {};

  const validArchetypes = new Set<string>(PARENT_ARCHETYPES);
  if (Array.isArray(r.archetypes)) {
    out.archetypes = (r.archetypes as unknown[])
      .map((a) => String(a).trim())
      .filter((a) => validArchetypes.has(a))
      .slice(0, 2) as ParentProfileDraft['archetypes'];
  }

  if (r.cultural_register && typeof r.cultural_register === 'object') {
    const cr = r.cultural_register as Record<string, unknown>;
    const cleaned: Record<string, string> = {};
    for (const dim of CULTURAL_DIMENSIONS) {
      const v = cr[dim];
      if (typeof v === 'string' && v.trim().length > 0) {
        cleaned[dim] = v.trim().slice(0, 100);
      }
    }
    out.cultural_register = cleaned as ParentProfileDraft['cultural_register'];
  }

  if (typeof r.preferred_language === 'string') {
    out.preferred_language = r.preferred_language
      .trim()
      .toLowerCase()
      .slice(0, 5);
  }

  const arrField = (val: unknown, cap = 7, itemMax = 240): string[] | null =>
    Array.isArray(val)
      ? (val as unknown[])
          .map((s) => String(s).trim().slice(0, itemMax))
          .filter((s) => s.length > 0)
          .slice(0, cap)
      : null;

  const trig = arrField(r.known_triggers);
  if (trig !== null) out.known_triggers = trig;

  const moves = arrField(r.effective_moves);
  if (moves !== null) out.effective_moves = moves;

  const prio = arrField(r.priorities_for_child, 6);
  if (prio !== null) out.priorities_for_child = prio;

  const validTemps = new Set<string>(RELATIONSHIP_TEMPERATURES);
  if (typeof r.relationship_temperature === 'string' && validTemps.has(r.relationship_temperature)) {
    out.relationship_temperature =
      r.relationship_temperature as ParentProfileDraft['relationship_temperature'];
  }

  if (typeof r.family_context === 'string') {
    out.family_context = r.family_context.trim().slice(0, 600);
  }
  if (typeof r.history_notes === 'string') {
    out.history_notes = r.history_notes.trim().slice(0, 1500);
  }

  return out;
}

// ── GET ────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal') {
    return NextResponse.json(
      { error: 'Only principals can read parent profiles in v1.' },
      { status: 403 }
    );
  }

  const supabase = getSupabase();
  const url = new URL(request.url);
  const parentId = url.searchParams.get('parent_id') || '';
  if (!parentId) {
    return NextResponse.json({ error: 'parent_id is required' }, { status: 400 });
  }

  const parent = await loadParentInSchool(supabase, parentId, auth.schoolId);
  if (!parent) {
    return NextResponse.json({ error: 'parent not found in this school' }, { status: 404 });
  }

  try {
    const { data, error } = await supabase
      .from('montree_parent_profiles')
      .select('*')
      .eq('parent_id', parentId)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (error) {
      if (isMigrationMissing(error)) {
        return NextResponse.json(
          { migration_pending: true, parent, profile: null },
          { status: 200, headers: { 'Cache-Control': 'private, no-store' } }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { parent, profile: data ?? null },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    if (isMigrationMissing(err)) {
      return NextResponse.json({ migration_pending: true, parent, profile: null });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 }
    );
  }
}

// ── POST ───────────────────────────────────────────────────────────────
// Body: { parent_id, transcript, locale? } → runs voice intake + upserts.

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  // Both principals and teachers can onboard parents per Phase A locked
  // decision #2. Principal evaluations win on the visible profile.
  if (auth.role !== 'principal' && auth.role !== 'teacher') {
    return NextResponse.json(
      { error: 'Only principals or teachers can onboard parents.' },
      { status: 403 }
    );
  }

  let body: { parent_id?: string; transcript?: string; locale?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const parentId = String(body.parent_id || '').trim();
  const transcript = String(body.transcript || '').trim();
  const locale = String(body.locale || 'en').trim().toLowerCase();
  if (!parentId) {
    return NextResponse.json({ error: 'parent_id is required' }, { status: 400 });
  }
  if (transcript.length < 30) {
    return NextResponse.json(
      { error: 'transcript too short (need ≥30 chars)' },
      { status: 400 }
    );
  }

  const supabase = getSupabase();
  const parent = await loadParentInSchool(supabase, parentId, auth.schoolId);
  if (!parent) {
    return NextResponse.json({ error: 'parent not found in this school' }, { status: 404 });
  }

  const intake = await parseVoiceIntake({
    transcript,
    parentName: parent.name || 'this parent',
    locale,
    anthropic,
  });

  const upsertPayload = {
    parent_id: parentId,
    school_id: auth.schoolId,
    archetypes: intake.draft.archetypes,
    cultural_register: intake.draft.cultural_register,
    preferred_language: intake.draft.preferred_language,
    known_triggers: intake.draft.known_triggers,
    effective_moves: intake.draft.effective_moves,
    relationship_temperature: intake.draft.relationship_temperature,
    family_context: intake.draft.family_context,
    priorities_for_child: intake.draft.priorities_for_child,
    history_notes: intake.draft.history_notes,
    source: 'onboarded_voice' as const,
    evaluated_by_role: auth.role === 'teacher' ? ('teacher' as const) : ('principal' as const),
    evaluated_by_id: auth.userId,
    last_evaluated_at: new Date().toISOString(),
  };

  try {
    // Phase A locked decision #2: principal's evaluation wins on the visible
    // profile. UPSERT-on-conflict updates the row in place. If a teacher
    // posts after a principal has already written, we still overwrite
    // (the principal's last_evaluated_at means hers was older), but the
    // evaluated_by_role flips to teacher. A future iteration could preserve
    // both perspectives; v1 keeps the schema simple.
    const { data, error } = await supabase
      .from('montree_parent_profiles')
      .upsert(upsertPayload as never, { onConflict: 'parent_id,school_id' })
      .select('*')
      .single();

    if (error) {
      if (isMigrationMissing(error)) {
        return NextResponse.json(
          {
            migration_pending: true,
            draft: intake.draft,
            cost_usd: intake.costUsd,
            generation_ms: intake.generationMs,
            degraded: intake.degraded,
          },
          { status: 200 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      parent,
      profile: data,
      draft: intake.draft,
      cost_usd: intake.costUsd,
      generation_ms: intake.generationMs,
      degraded: intake.degraded,
    });
  } catch (err) {
    if (isMigrationMissing(err)) {
      return NextResponse.json({
        migration_pending: true,
        draft: intake.draft,
        cost_usd: intake.costUsd,
        generation_ms: intake.generationMs,
        degraded: intake.degraded,
      });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 }
    );
  }
}

// ── PATCH ──────────────────────────────────────────────────────────────
// ?id=<profile_id> with body containing any subset of editable fields.

export async function PATCH(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal') {
    return NextResponse.json(
      { error: 'Only principals can edit parent profiles directly.' },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const profileId = url.searchParams.get('id') || '';
  if (!profileId) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const patch = sanitizePatch(body);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: 'no editable fields in patch' },
      { status: 400 }
    );
  }

  const supabase = getSupabase();

  // Belt-and-braces school check: load the existing profile, refuse if it
  // doesn't belong to this school.
  const { data: existing, error: lookupErr } = await supabase
    .from('montree_parent_profiles')
    .select('id, school_id')
    .eq('id', profileId)
    .maybeSingle();

  if (lookupErr) {
    if (isMigrationMissing(lookupErr)) {
      return NextResponse.json({ migration_pending: true }, { status: 200 });
    }
    return NextResponse.json({ error: lookupErr.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'profile not found' }, { status: 404 });
  }
  if (existing.school_id !== auth.schoolId) {
    return NextResponse.json({ error: 'profile not in this school' }, { status: 403 });
  }

  // Update + stamp evaluator.
  const updatePayload = {
    ...patch,
    source: 'principal_typed' as const,
    evaluated_by_role: 'principal' as const,
    evaluated_by_id: auth.userId,
    last_evaluated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('montree_parent_profiles')
    .update(updatePayload as never)
    .eq('id', profileId)
    .eq('school_id', auth.schoolId)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}

// ── DELETE ─────────────────────────────────────────────────────────────
// Soft-delete: zero out the editable fields, keep the row for audit.

export async function DELETE(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal') {
    return NextResponse.json(
      { error: 'Only principals can clear parent profiles.' },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const profileId = url.searchParams.get('id') || '';
  if (!profileId) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: existing, error: lookupErr } = await supabase
    .from('montree_parent_profiles')
    .select('id, school_id')
    .eq('id', profileId)
    .maybeSingle();

  if (lookupErr) {
    if (isMigrationMissing(lookupErr)) {
      return NextResponse.json({ migration_pending: true }, { status: 200 });
    }
    return NextResponse.json({ error: lookupErr.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'profile not found' }, { status: 404 });
  }
  if (existing.school_id !== auth.schoolId) {
    return NextResponse.json({ error: 'profile not in this school' }, { status: 403 });
  }

  const cleared = {
    archetypes: [],
    cultural_register: {},
    preferred_language: '',
    known_triggers: [],
    effective_moves: [],
    relationship_temperature: 'neutral' as const,
    family_context: '',
    priorities_for_child: [],
    history_notes: '',
    source: 'principal_typed' as const,
    evaluated_by_role: 'principal' as const,
    evaluated_by_id: auth.userId,
    last_evaluated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('montree_parent_profiles')
    .update(cleared as never)
    .eq('id', profileId)
    .eq('school_id', auth.schoolId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ cleared: true });
}
