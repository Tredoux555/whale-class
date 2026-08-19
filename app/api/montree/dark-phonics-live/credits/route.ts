/**
 * GET /api/montree/dark-phonics-live/credits?childId=...
 *
 * Parent-facing class-credit balance + recent history for ONE of their own
 * children. Feeds the "classes remaining" chip and the credits panel on the
 * parent Online Classes page.
 *
 * Auth: parent only (staff read balances through `.../credits/admin`).
 * Ownership: childId must be in the resolver's `childIds` — that list comes
 * straight from `montree_parent_children`, the real junction table.
 *
 * Gated on the `dark_phonics_live` feature flag (404 when off).
 *
 * 200 → { balance: number, ledger: Array<{delta, reason, note, createdAt}> }
 *       (ledger = the 50 most recent events, newest first)
 */

import { NextResponse, type NextRequest } from 'next/server';

import { getSupabase } from '@/lib/supabase-client';
import { resolveAppointmentsParent } from '@/lib/montree/appointments/parent-access';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { getCreditBalance, listLedgerForChild } from '@/lib/montree/credits/ledger';

export const dynamic = 'force-dynamic';

const FEATURE_KEY = 'dark_phonics_live';
const LEDGER_LIMIT = 50;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();

    // --- 1. parent auth ------------------------------------------------------
    const parentResult = await resolveAppointmentsParent(supabase);
    if (parentResult instanceof NextResponse) return parentResult;
    const parent = parentResult;

    // --- 2. feature gate (404 when off) --------------------------------------
    const enabled = await isFeatureEnabled(supabase, parent.schoolId, FEATURE_KEY);
    if (!enabled) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // --- 3. child ownership ---------------------------------------------------
    const childId = request.nextUrl.searchParams.get('childId')?.trim() ?? '';
    if (!childId || !UUID_RE.test(childId)) {
      return NextResponse.json(
        { error: 'invalid_query', message: 'childId must be a uuid' },
        { status: 400 }
      );
    }
    if (!parent.childIds.includes(childId)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    // --- 4. balance + history --------------------------------------------------
    // Both helpers throw (never return an error tuple) — the outer catch turns
    // that into a 500, same as the booking sibling.
    const [balance, rows] = await Promise.all([
      getCreditBalance(supabase, childId),
      listLedgerForChild(supabase, childId, LEDGER_LIMIT),
    ]);

    return NextResponse.json({
      balance,
      ledger: rows.map((row) => ({
        delta: row.delta,
        reason: row.reason,
        note: row.note,
        createdAt: row.created_at,
      })),
    });
  } catch (err) {
    console.error('[dark-phonics-live/credits:GET] unexpected error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
