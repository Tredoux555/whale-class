/**
 * POST /api/montree/dark-phonics-live/credits/grant
 *
 * Staff-only. The teacher grants class credits to a child after an
 * off-platform payment (WeChat/Alipay QR) — this is the ONLY way credits
 * enter the system; nothing here charges anyone.
 *
 * Writes one positive `manual_grant` ledger row via grantCredits(), then
 * re-reads the derived balance (the ledger is the source of truth — there is
 * no stored counter, see migration 334's BALANCE MODEL note).
 *
 * Gated on the `dark_phonics_live` feature flag (404 when off).
 *
 * Body: { childId: string, credits: number (1..500), note?: string }
 * 201 → { balance }
 */

import { NextResponse, type NextRequest } from 'next/server';

import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { getCreditBalance, grantCredits } from '@/lib/montree/credits/ledger';

export const dynamic = 'force-dynamic';

const FEATURE_KEY = 'dark_phonics_live';
/** Sanity ceiling on a single grant — a typo'd 5000 should bounce, not book. */
const MAX_CREDITS_PER_GRANT = 500;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface GrantBody {
  childId?: unknown;
  credits?: unknown;
  note?: unknown;
}

export async function POST(request: NextRequest) {
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

    // --- 3. body validation ----------------------------------------------------
    let body: GrantBody;
    try {
      body = (await request.json()) as GrantBody;
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }

    const childId = typeof body.childId === 'string' ? body.childId.trim() : '';
    if (!childId || !UUID_RE.test(childId)) {
      return NextResponse.json(
        { error: 'invalid_body', message: 'childId must be a uuid' },
        { status: 400 }
      );
    }

    const credits = body.credits;
    if (
      typeof credits !== 'number' ||
      !Number.isInteger(credits) ||
      credits <= 0 ||
      credits > MAX_CREDITS_PER_GRANT
    ) {
      return NextResponse.json(
        {
          error: 'invalid_body',
          message: `credits must be an integer 1..${MAX_CREDITS_PER_GRANT}`,
        },
        { status: 400 }
      );
    }

    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 2000) : undefined;

    // --- 4. child must exist and sit in this staff member's school --------------
    // FIXED post-audit: montree_children.school_id is NOT NULL (migrations 126 +
    // 143), so it is checked directly. The original draft scoped through
    // classroom_id → montree_classrooms.school_id and SKIPPED the check entirely
    // when classroom_id was NULL — a staff member from ANY school could grant
    // credits to (and read the balance of, via the response) a child with no
    // classroom. school_id is always present, so the check can never be bypassed.
    const { data: child } = await supabase
      .from('montree_children')
      .select('id, name, school_id')
      .eq('id', childId)
      .maybeSingle();

    if (!child) {
      return NextResponse.json({ error: 'child_not_found' }, { status: 404 });
    }

    const childSchoolId = (child as { school_id: string | null }).school_id;
    if (childSchoolId !== staff.schoolId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    // --- 5. paying adult -------------------------------------------------------
    // The ledger requires a parent_id on every row (denormalised on purpose —
    // grants are attributed to the adult who paid). montree_children has NO
    // parent_id column, so the link comes from the junction table. A child
    // with several linked parents: the first link wins, which is fine because
    // balances are keyed on child_id, not parent_id — parent_id here is
    // attribution, not the unit of account.
    const { data: links } = await supabase
      .from('montree_parent_children')
      .select('parent_id')
      .eq('child_id', childId)
      .limit(1);

    const parentId = ((links ?? []) as Array<{ parent_id: string }>)[0]?.parent_id;
    if (!parentId) {
      return NextResponse.json(
        {
          error: 'no_parent_linked',
          message: 'This child has no linked parent, so a grant cannot be attributed.',
        },
        { status: 409 }
      );
    }

    // --- 6. write the grant, then re-read the derived balance -------------------
    await grantCredits(supabase, {
      childId,
      parentId,
      credits,
      createdBy: staff.userId,
      note,
    });

    const balance = await getCreditBalance(supabase, childId);

    return NextResponse.json({ balance }, { status: 201 });
  } catch (err) {
    console.error('[dark-phonics-live/credits/grant:POST] unexpected error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
