// lib/montree/org/claim-invite.ts
//
// The atomic gate on invite redemption.
//
// ── The race this exists to close ────────────────────────────────────────────────────────
// The obvious ordering — SELECT the invite, see used_at IS NULL, create the organisation,
// then stamp used_at — does NOT make a link single-use. Two people opening the same
// forwarded link at the same moment both pass the SELECT, both create a tenant, and only
// one of the two stamps land; the loser's UPDATE quietly affects zero rows and its
// organisation exists anyway. That is the realistic case for this product, because these
// links travel through group chats: one link, several recipients.
//
// So the token is CLAIMED FIRST, and the claim is the gate. A single UPDATE ... WHERE
// used_at IS NULL AND expires_at > NOW() is atomic at the row level in Postgres: of two
// concurrent claims, exactly one updates a row and the other updates none. Nothing is
// created until a caller holds the claim.
//
// ── Why a claim/release pair rather than a transaction ───────────────────────────────────
// These routes talk to Postgres through supabase-js (PostgREST), which has no transaction
// across separate requests — each .insert()/.update() is its own statement. So the claim is
// compensated rather than rolled back: if tenant creation fails after the claim, the caller
// calls releaseInvite() and the link goes back to being usable. That is strictly better than
// burning a link on a server error, and the window in which a released link is briefly
// unavailable is milliseconds.

import type { OrgInviteType } from './invite-tokens';
import { hashInviteToken, inviteStatus, inviteStatusMessage } from './invite-tokens';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Supabase = any;

export interface ClaimedInvite {
  id: string;
  inviteType: OrgInviteType;
  organizationId: string | null;
  prefillName: string | null;
}

export type ClaimResult =
  | { ok: true; invite: ClaimedInvite }
  | { ok: false; status: number; error: string; code: string; migrationPending?: boolean };

/**
 * Claim an invite for redemption, atomically.
 *
 * On success the invite is already marked used — the caller now owns it and MUST either
 * finish creating the tenant or call releaseInvite().
 *
 * The failure branches are deliberately specific, because each one is a different sentence
 * to show a human:
 *   410 used / expired  → "already used" / "expired, ask for a fresh link"
 *   404 not_found       → withdrawn or mistyped
 *   409 wrong_type      → an organisation link opened on the school page, or vice versa
 *   409 claim_lost      → somebody else redeemed it in the last few milliseconds
 */
export async function claimInvite(
  supabase: Supabase,
  token: string,
  expectedType: OrgInviteType,
  usedByEmail: string,
): Promise<ClaimResult> {
  const tokenHash = hashInviteToken(token);

  // Read first — ONLY to produce a precise message. This read decides nothing; the claim
  // below is what actually gates redemption.
  const { data: invite, error: readErr } = await supabase
    .from('montree_org_invites')
    .select('id, invite_type, organization_id, prefill_name, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (readErr) {
    const code = (readErr as { code?: string }).code;
    if (code === '42P01' || code === '42703' || code === 'PGRST205' || code === 'PGRST204') {
      return {
        ok: false, status: 503, code: 'migration_pending', migrationPending: true,
        error: 'The organization tables are not installed on this database yet.',
      };
    }
    console.error('[montree-org] invite read before claim failed:', readErr);
    return { ok: false, status: 500, code: 'read_failed', error: 'Could not check this invitation.' };
  }

  const status = inviteStatus(invite ?? null);
  if (status !== 'valid' || !invite) {
    return {
      ok: false,
      status: status === 'not_found' ? 404 : 410,
      code: status,
      error: inviteStatusMessage(status),
    };
  }
  if (invite.invite_type !== expectedType) {
    return {
      ok: false,
      status: 409,
      code: 'wrong_type',
      error: expectedType === 'organization'
        ? 'This invitation is for registering a school, not an organization.'
        : 'This invitation is for registering an organization, not a school.',
    };
  }

  // ── The gate. Exactly one concurrent caller comes out of this with a row. ──
  const { data: claimed, error: claimErr } = await supabase
    .from('montree_org_invites')
    .update({ used_at: new Date().toISOString(), used_by_email: usedByEmail })
    .eq('token_hash', tokenHash)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('id, invite_type, organization_id, prefill_name');

  if (claimErr) {
    console.error('[montree-org] invite claim failed:', claimErr);
    return { ok: false, status: 500, code: 'claim_failed', error: 'Could not accept this invitation.' };
  }

  const rows = (claimed ?? []) as Array<{
    id: string; invite_type: OrgInviteType; organization_id: string | null; prefill_name: string | null;
  }>;

  if (rows.length !== 1) {
    // Zero rows: somebody else claimed it between the read and the update, or it expired in
    // that window. Never more than one — the WHERE clause cannot match twice.
    return {
      ok: false,
      status: 409,
      code: 'used',
      error: inviteStatusMessage('used'),
    };
  }

  const row = rows[0];
  return {
    ok: true,
    invite: {
      id: row.id,
      inviteType: row.invite_type,
      organizationId: row.organization_id,
      prefillName: row.prefill_name,
    },
  };
}

/**
 * Hand a claimed invite back because the thing it was claimed for could not be created.
 *
 * Best effort and never throws: the caller is already on an error path and returning a 500
 * to the human matters more than the token's state. A link that stays burned after a server
 * error is recoverable (the issuer mints another); a request that dies inside its own
 * cleanup is not.
 */
export async function releaseInvite(supabase: Supabase, inviteId: string): Promise<void> {
  try {
    await supabase
      .from('montree_org_invites')
      .update({ used_at: null, used_by_email: null })
      .eq('id', inviteId);
  } catch (error) {
    console.error('[montree-org] invite release failed (link stays burned):', error);
  }
}
