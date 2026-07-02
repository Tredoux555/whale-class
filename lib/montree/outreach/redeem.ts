// lib/montree/outreach/redeem.ts
// Marks an outreach code as redeemed after a school registers.
//
// Called fire-and-forget from the registration success path — a redeem
// failure must NEVER block or fail a registration (handoff hard rule).
// Idempotent: safe to call twice for the same code; the first registration
// wins (registered_at / registered_school_id are never overwritten).
//
// Direct Supabase call via the service-role client — no internal HTTP hop.

import type { SupabaseClient } from '@supabase/supabase-js';

const CODE_SHAPE = /^[A-Za-z0-9-]{4,32}$/;

export async function redeemOutreachCode(
  supabase: SupabaseClient,
  rawCode: string | null | undefined,
  schoolId: string
): Promise<void> {
  try {
    const code = (rawCode || '').trim().toUpperCase();
    if (!code || !CODE_SHAPE.test(code) || !schoolId) return;

    // Read-first so we never clobber an earlier redemption (idempotency).
    const { data: row, error: readError } = await supabase
      .from('montree_outreach_schools')
      .select('id, status, registered_school_id')
      .eq('outreach_code', code)
      .maybeSingle();

    if (readError) {
      // Migration 279 not run yet, or transient — log and move on.
      console.error('[outreach-redeem] lookup failed:', readError.message);
      return;
    }
    if (!row) return; // unknown code — nothing to record
    if (row.status === 'registered' && row.registered_school_id) return; // already redeemed

    const { error: updateError } = await supabase
      .from('montree_outreach_schools')
      .update({
        status: 'registered',
        registered_at: new Date().toISOString(),
        registered_school_id: schoolId,
      })
      .eq('id', row.id)
      // Belt-and-braces against a concurrent redeem between our read and
      // write: only flip rows that aren't already linked to a school.
      .is('registered_school_id', null);

    if (updateError) {
      console.error('[outreach-redeem] update failed:', updateError.message);
      return;
    }

    console.log(`[outreach-redeem] ${code} → registered (school ${schoolId})`);
  } catch (err) {
    // Never throw — the caller is a registration success path.
    console.error('[outreach-redeem] threw:', err);
  }
}
