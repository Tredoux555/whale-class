// app/api/montree/org/invites/route.ts
//
// Mint and list invite links for the ORGANIZATION tier (migration 315).
//
//   POST — create one link.
//          { inviteType: 'organization' }  → super-admin only (Tredoux invites an org).
//          { inviteType: 'school' }        → org leader only (invites a school into THEIR org).
//          Returns the plaintext token and the full share link ONCE. It is never
//          retrievable again — the database holds only sha256(token).
//
//   GET  — list the caller's own links with a live status (open / used / expired).
//          Super-admin sees organisation invites; an org leader sees their own school
//          invites. Neither ever sees the other's, and no token is ever returned.
//
// Delivery is copy-and-share by design: Resend is unreliable on this deployment (see the
// note in app/api/montree/invite-principal/route.ts), so the link + an inline QR code IS
// the delivery mechanism. Nothing here sends email.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import {
  INVITE_TTL_DAYS, inviteLinkFor, inviteStatus, issueInvite, type OrgInviteType,
} from '@/lib/montree/org/invite-tokens';
import {
  isOrgMigrationPending, orgMigrationPending, requireIssuer, verifyOrgRequest,
} from '@/lib/montree/org/verify-org-request';

export const dynamic = 'force-dynamic';

const MAX_NAME = 120;
const MAX_NOTE = 500;

function isInviteType(value: unknown): value is OrgInviteType {
  return value === 'organization' || value === 'school';
}

export async function POST(request: NextRequest) {
  let body: { inviteType?: unknown; prefillName?: unknown; note?: unknown; ttlDays?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const inviteType = body.inviteType;
  if (!isInviteType(inviteType)) {
    return NextResponse.json(
      { error: "inviteType must be 'organization' or 'school'." },
      { status: 400 },
    );
  }

  const gate = await requireIssuer(request, inviteType);
  if ('response' in gate) return gate.response;

  const prefillName =
    typeof body.prefillName === 'string' && body.prefillName.trim()
      ? body.prefillName.trim().slice(0, MAX_NAME)
      : null;
  const note =
    typeof body.note === 'string' && body.note.trim()
      ? body.note.trim().slice(0, MAX_NOTE)
      : null;

  // ttlDays is capped rather than rejected — an issuer who asks for a year gets 90 days and
  // a working link, not an error they have to decode.
  const requestedTtl = Number(body.ttlDays);
  const ttlDays =
    Number.isFinite(requestedTtl) && requestedTtl > 0
      ? Math.min(Math.floor(requestedTtl), 90)
      : INVITE_TTL_DAYS;

  const { token, tokenHash, expiresAt } = issueInvite(ttlDays);

  const supabase = getSupabase();
  const { data: row, error } = await supabase
    .from('montree_org_invites')
    .insert({
      token_hash: tokenHash,
      invite_type: inviteType,
      organization_id: gate.organizationId,
      prefill_name: prefillName,
      issued_by: gate.issuer,
      note,
      expires_at: expiresAt.toISOString(),
    })
    .select('id, invite_type, organization_id, prefill_name, note, expires_at, used_at, created_at')
    .single();

  if (error) {
    if (isOrgMigrationPending(error)) return orgMigrationPending(error.message);
    console.error('[montree-org] invite insert failed:', error);
    return NextResponse.json({ error: 'Could not create the invitation.' }, { status: 500 });
  }

  return NextResponse.json(
    {
      success: true,
      invite: {
        id: row.id,
        inviteType: row.invite_type,
        organizationId: row.organization_id,
        prefillName: row.prefill_name,
        note: row.note,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        status: 'open',
      },
      // Shown once. Not stored, not recoverable, not emailed.
      token,
      link: inviteLinkFor(inviteType, token),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

interface InviteRow {
  id: string;
  invite_type: OrgInviteType;
  organization_id: string | null;
  prefill_name: string | null;
  note: string | null;
  expires_at: string;
  used_at: string | null;
  used_by_email: string | null;
  created_at: string;
}

export async function GET(request: NextRequest) {
  // Which slice of the table the caller owns. An org leader is checked first because an
  // org-admin cookie is the common case; super-admin falls through to the platform slice.
  const orgGate = await verifyOrgRequest(request);
  let filter: { column: 'organization_id'; value: string } | { column: 'invite_type'; value: 'organization' };

  if ('ctx' in orgGate) {
    filter = { column: 'organization_id', value: orgGate.ctx.organizationId };
  } else {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return orgGate.response;
    filter = { column: 'invite_type', value: 'organization' };
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('montree_org_invites')
    .select('id, invite_type, organization_id, prefill_name, note, expires_at, used_at, used_by_email, created_at')
    .eq(filter.column, filter.value)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    if (isOrgMigrationPending(error)) return orgMigrationPending(error.message);
    console.error('[montree-org] invite list failed:', error);
    return NextResponse.json({ error: 'Could not load the invitations.' }, { status: 500 });
  }

  const rows = (data ?? []) as InviteRow[];
  const invites = rows.map((r) => ({
    id: r.id,
    inviteType: r.invite_type,
    organizationId: r.organization_id,
    prefillName: r.prefill_name,
    note: r.note,
    expiresAt: r.expires_at,
    usedAt: r.used_at,
    usedByEmail: r.used_by_email,
    createdAt: r.created_at,
    // 'valid' means the link still works; the UI calls that "open" so nobody has to
    // wonder whether an "invalid" invite was a mistake.
    status: inviteStatus({ expires_at: r.expires_at, used_at: r.used_at }),
  }));

  return NextResponse.json(
    {
      available: true,
      invites,
      counts: {
        total: invites.length,
        open: invites.filter((i) => i.status === 'valid').length,
        used: invites.filter((i) => i.status === 'used').length,
        expired: invites.filter((i) => i.status === 'expired').length,
      },
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
