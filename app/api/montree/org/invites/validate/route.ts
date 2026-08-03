// app/api/montree/org/invites/validate/route.ts
//
// POST — "does this link still work, and what is it for?"
//
// Public and unauthenticated on purpose: it is the first thing an invited organisation
// leader or principal touches, before they have any account at all. It reveals only what
// the landing page needs to greet them warmly — the kind of invite, the name whoever sent
// it typed in, and (for a school invite) the inviting organisation's name.
//
// The token arrives in the POST BODY, never the query string, so it does not end up in
// server access logs or a browser's history the way `?token=` would.
//
// Rate-limited hard: this is the only endpoint in the product that takes a bearer secret
// from an anonymous caller, so it is also the only one worth brute-forcing.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/montree/audit-logger';
import {
  hashInviteToken, inviteStatus, inviteStatusMessage,
} from '@/lib/montree/org/invite-tokens';
import { isOrgMigrationPending, orgMigrationPending } from '@/lib/montree/org/verify-org-request';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  const ip = getClientIP(request.headers);

  // 30 lookups per IP per 15 minutes. Generous for a human reloading a page, useless for
  // anyone walking a 256-bit keyspace.
  const { allowed, retryAfterSeconds } = await checkRateLimit(
    supabase, ip, '/api/montree/org/invites/validate', 30, 15,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
    );
  }

  let token: unknown;
  try {
    ({ token } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }
  if (typeof token !== 'string' || !token.trim()) {
    return NextResponse.json({ error: 'Missing invitation token.' }, { status: 400 });
  }

  const { data: invite, error } = await supabase
    .from('montree_org_invites')
    .select('id, invite_type, organization_id, prefill_name, expires_at, used_at')
    .eq('token_hash', hashInviteToken(token))
    .maybeSingle();

  if (error) {
    if (isOrgMigrationPending(error)) return orgMigrationPending(error.message);
    console.error('[montree-org] invite validate failed:', error);
    return NextResponse.json({ error: 'Could not check this invitation.' }, { status: 500 });
  }

  const status = inviteStatus(invite ?? null);
  if (status !== 'valid' || !invite) {
    // 200, not 4xx: "this link has expired" is a normal thing for a page to render, and a
    // red error status would make the browser console look like something broke.
    return NextResponse.json(
      { valid: false, status, message: inviteStatusMessage(status) },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  // For a school invite, name the organisation doing the inviting — a principal should
  // never have to guess who is asking them to sign up.
  let organizationName: string | null = null;
  if (invite.invite_type === 'school' && invite.organization_id) {
    const { data: org } = await supabase
      .from('montree_organizations')
      .select('name')
      .eq('id', invite.organization_id)
      .maybeSingle();
    organizationName = (org as { name?: string } | null)?.name ?? null;
  }

  return NextResponse.json(
    {
      valid: true,
      status,
      inviteType: invite.invite_type,
      prefillName: invite.prefill_name,
      organizationName,
      expiresAt: invite.expires_at,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
