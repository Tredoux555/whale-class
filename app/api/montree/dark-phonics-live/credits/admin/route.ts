/**
 * GET /api/montree/dark-phonics-live/credits/admin
 *
 * Staff-only roster of every child in the school with their current class-credit
 * balance and the parent to attribute a grant to. Feeds the teacher's credits
 * admin panel (the screen where a WeChat payment turns into credits).
 *
 * Gated on the `dark_phonics_live` feature flag (404 when off).
 *
 * 200 → { children: Array<{childId, childName, parentName, balance}> }
 *       sorted by childName.
 *
 * JOIN PATH (Supabase JS can't express arbitrary joins, so this is 3 narrow
 * queries stitched in TS — fine at solo-teacher scale, a few hundred rows):
 *   montree_children    (school_id = staff school)  → child ids + names
 *   montree_parent_children + montree_parents       → parent name per child
 *   montree_class_credit_balances (the view from    → balance per child
 *     migration 334 section 4; children with no
 *     ledger rows are absent from it → balance 0)
 *
 * SCOPING (fixed post-audit): `montree_children.school_id` is NOT NULL
 * (added in migration 126, enforced NOT NULL in 143), so it is the direct,
 * complete scope — no need to go via `montree_classrooms`. The original draft
 * scoped through classroom_id, which would silently drop any child whose
 * classroom_id is NULL from the roster even though they belong to this
 * school. `montree_children` has no `is_active` column, so there is nothing
 * to filter there.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';

export const dynamic = 'force-dynamic';

const FEATURE_KEY = 'dark_phonics_live';
const BALANCES_VIEW = 'montree_class_credit_balances';

interface AdminChild {
  childId: string;
  childName: string;
  parentName: string;
  balance: number;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();

    // --- 1. staff auth --------------------------------------------------------
    const staffResult = await verifySchoolRequest(request);
    if (staffResult instanceof NextResponse) return staffResult;
    const staff = staffResult;

    // --- 2. feature gate (404 when off) ---------------------------------------
    const enabled = await isFeatureEnabled(supabase, staff.schoolId, FEATURE_KEY);
    if (!enabled) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // --- 3. children directly scoped to this school -----------------------------
    // montree_children.school_id is NOT NULL (migrations 126 + 143), so this is
    // the complete roster — including children with no classroom_id, who the
    // old classroom-join scoping would have missed entirely.
    const { data: childRows, error: childError } = await supabase
      .from('montree_children')
      .select('id, name')
      .eq('school_id', staff.schoolId);

    if (childError) {
      console.error('[credits/admin:GET] child read failed', childError);
      return NextResponse.json({ error: 'admin_read_failed' }, { status: 500 });
    }

    const children = (childRows ?? []) as Array<{ id: string; name: string | null }>;
    if (children.length === 0) {
      return NextResponse.json({ children: [] });
    }
    const childIds = children.map((c) => c.id);

    // --- 5. parent name per child (LEFT JOIN, stitched) -------------------------
    const { data: linkRows } = await supabase
      .from('montree_parent_children')
      .select('child_id, parent_id')
      .in('child_id', childIds);

    const links = (linkRows ?? []) as Array<{ child_id: string; parent_id: string }>;
    const parentIds = Array.from(new Set(links.map((l) => l.parent_id)));

    const parentNameById = new Map<string, string>();
    if (parentIds.length > 0) {
      const { data: parentRows } = await supabase
        .from('montree_parents')
        .select('id, name, email')
        .in('id', parentIds);

      for (const p of (parentRows ?? []) as Array<{
        id: string;
        name: string | null;
        email: string | null;
      }>) {
        // Same fallback resolveAppointmentsParent uses: name, else email.
        parentNameById.set(p.id, p.name || p.email || '');
      }
    }

    // First link wins when a child has several linked adults — the panel needs
    // one label, and grants are attributed the same way in the grant route.
    const parentNameByChild = new Map<string, string>();
    for (const link of links) {
      if (parentNameByChild.has(link.child_id)) continue;
      parentNameByChild.set(link.child_id, parentNameById.get(link.parent_id) ?? '');
    }

    // --- 6. balances from the derived view --------------------------------------
    // A child with no ledger rows simply has no row in the view — that is a
    // balance of 0, not a missing record.
    const { data: balanceRows, error: balanceError } = await supabase
      .from(BALANCES_VIEW)
      .select('child_id, balance')
      .in('child_id', childIds);

    if (balanceError) {
      console.error('[credits/admin:GET] balance view read failed', balanceError);
      return NextResponse.json({ error: 'admin_read_failed' }, { status: 500 });
    }

    const balanceByChild = new Map<string, number>();
    for (const row of (balanceRows ?? []) as Array<{ child_id: string; balance: number | null }>) {
      balanceByChild.set(row.child_id, row.balance ?? 0);
    }

    const result: AdminChild[] = children
      .map((child) => ({
        childId: child.id,
        childName: child.name ?? '',
        parentName: parentNameByChild.get(child.id) ?? '',
        balance: balanceByChild.get(child.id) ?? 0,
      }))
      .sort((a, b) => a.childName.localeCompare(b.childName));

    return NextResponse.json({ children: result });
  } catch (err) {
    console.error('[dark-phonics-live/credits/admin:GET] unexpected error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
