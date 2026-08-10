// app/api/montree/parent/intake/route.ts
//
// The parent's own end of Child Onboarding.
//
//   GET  → the intake(s) for the child/children this parent is authorized for.
//   POST → save a draft, or submit.
//
// 🚨 Ownership, not existence. The child id ALWAYS comes from the parent's
// authorized set (resolveAuthorizedParent), never from the body alone — a
// body-supplied childId that isn't in authorizedChildIds is a 403.
//
// 🚨 A committed intake can be re-opened by a new parent submission (families
// move house, a new allergy appears) — the row goes back to 'submitted'. It
// NEVER auto-applies: a teacher must commit again.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveAuthorizedParent } from '@/lib/montree/verify-parent-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { normalizeIntake, validateIntake, type IntakeForm } from '@/lib/onboarding-core';
import {
  CHILD_ONBOARDING_FEATURE_KEY,
  scrubForeignIntakePaths,
  type ChildIntakeRow,
} from '@/lib/montree/child-onboarding/types';

/** The form is large and carries several sections; give the write room. */
export const maxDuration = 60;

interface ChildLocator {
  id: string;
  name: string;
  school_id: string;
  classroom_id: string;
}

/** Fetch the children this parent may touch, with the school/classroom the
 *  intake row needs. Returns [] when the ids resolve to nothing. */
async function loadAuthorizedChildren(
  supabase: ReturnType<typeof getSupabase>,
  childIds: string[]
): Promise<ChildLocator[]> {
  if (childIds.length === 0) return [];
  const { data, error } = await supabase
    .from('montree_children')
    .select('id, name, school_id, classroom_id')
    .in('id', childIds);
  if (error) {
    console.error('[child-onboarding/parent] child lookup failed:', error.message);
    return [];
  }
  return (data || []) as ChildLocator[];
}

export async function GET() {
  try {
    const supabase = getSupabase();

    const session = await resolveAuthorizedParent(supabase);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const children = await loadAuthorizedChildren(supabase, session.authorizedChildIds);
    if (children.length === 0) {
      return NextResponse.json({ success: true, children: [], intakes: [] });
    }

    // The feature is per-school; a parent's children all sit in one school in
    // practice, but gate on every school we touch to be safe.
    const schoolIds = Array.from(new Set(children.map((c) => c.school_id)));
    const enabledFlags = await Promise.all(
      schoolIds.map((id) => isFeatureEnabled(supabase, id, CHILD_ONBOARDING_FEATURE_KEY))
    );
    const enabledSchools = new Set(schoolIds.filter((_, i) => enabledFlags[i]));
    const visible = children.filter((c) => enabledSchools.has(c.school_id));

    if (visible.length === 0) {
      return NextResponse.json({ success: false, error: 'feature_disabled' }, { status: 403 });
    }

    const { data: rows, error } = await supabase
      .from('montree_child_intake')
      .select('id, child_id, school_id, classroom_id, status, data, submitted_at, committed_at, updated_at')
      .in('child_id', visible.map((c) => c.id));

    if (error) {
      console.error('[child-onboarding/parent] intake fetch failed:', error.message, error.code);
      return NextResponse.json(
        { success: false, error: 'Could not load your form', detail: error.message },
        { status: 500 }
      );
    }

    const intakes = (rows || []).map((r) => {
      const row = r as Partial<ChildIntakeRow>;
      return {
        id: row.id,
        child_id: row.child_id,
        status: row.status,
        submitted_at: row.submitted_at ?? null,
        committed_at: row.committed_at ?? null,
        updated_at: row.updated_at ?? null,
        data: normalizeIntake(row.data),
      };
    });

    return NextResponse.json({
      success: true,
      children: visible.map((c) => ({ id: c.id, name: c.name })),
      intakes,
    });
  } catch (error) {
    console.error('[child-onboarding/parent] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();

    const session = await resolveAuthorizedParent(supabase);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
    }

    const { childId, form, status } = body as {
      childId?: string;
      form?: unknown;
      status?: string;
    };

    const targetChildId = childId || session.childId;
    // 🚨 Ownership check. Existence is not ownership.
    if (!targetChildId || !session.authorizedChildIds.includes(targetChildId)) {
      console.error('[SECURITY] child-onboarding: parent tried to write an unauthorized child', {
        targetChildId,
        parentId: session.parentId,
        inviteId: session.inviteId,
      });
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (status !== 'draft' && status !== 'submitted') {
      return NextResponse.json(
        { success: false, error: "status must be 'draft' or 'submitted'" },
        { status: 400 }
      );
    }

    const [child] = await loadAuthorizedChildren(supabase, [targetChildId]);
    if (!child) {
      return NextResponse.json({ success: false, error: 'Child not found' }, { status: 404 });
    }

    if (!(await isFeatureEnabled(supabase, child.school_id, CHILD_ONBOARDING_FEATURE_KEY))) {
      return NextResponse.json({ success: false, error: 'feature_disabled' }, { status: 403 });
    }

    // Normalize first (an old client's shape still renders), then strip any
    // document path that does not sit under this child's own intake prefix —
    // existence of a path is not ownership of it.
    const normalized: IntakeForm = scrubForeignIntakePaths(
      normalizeIntake(form),
      child.school_id,
      targetChildId
    );

    // A submission must be complete. A draft may be anything at all — that is
    // the entire point of a draft.
    if (status === 'submitted') {
      const result = validateIntake(normalized);
      if (!result.ok) {
        return NextResponse.json(
          { success: false, error: 'validation_failed', errors: result.errors },
          { status: 400 }
        );
      }
    }

    const now = new Date().toISOString();

    // Existing row decides insert-vs-update. UNIQUE(child_id) means an upsert
    // on that column is safe, but reading first lets us keep committed_at /
    // committed_by intact and only move the status forward.
    const { data: existing } = await supabase
      .from('montree_child_intake')
      .select('id, status')
      .eq('child_id', targetChildId)
      .maybeSingle();

    const patch: Record<string, unknown> = {
      school_id: child.school_id,
      classroom_id: child.classroom_id,
      child_id: targetChildId,
      data: normalized,
      status,
    };
    if (status === 'submitted') patch.submitted_at = now;

    if (existing) {
      const { error: updateError } = await supabase
        .from('montree_child_intake')
        .update(patch)
        .eq('id', (existing as { id: string }).id);
      if (updateError) {
        console.error('[child-onboarding/parent] update failed:', updateError.message, updateError.code);
        return NextResponse.json(
          { success: false, error: 'Could not save your form', detail: updateError.message },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        id: (existing as { id: string }).id,
        status,
        // Honest about what a re-submission over a committed intake means.
        reopened: (existing as { status: string }).status === 'committed' && status === 'submitted',
      });
    }

    const { data: inserted, error: insertError } = await supabase
      .from('montree_child_intake')
      .insert(patch)
      .select('id')
      .maybeSingle();

    if (insertError || !inserted) {
      console.error('[child-onboarding/parent] insert failed:', insertError?.message, insertError?.code);
      return NextResponse.json(
        { success: false, error: 'Could not save your form', detail: insertError?.message ?? 'insert returned no row' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: (inserted as { id: string }).id, status, reopened: false });
  } catch (error) {
    console.error('[child-onboarding/parent] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
