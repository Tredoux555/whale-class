// app/api/montree/org/invites/[id]/route.ts
//
// DELETE — revoke an invite link that has not been redeemed yet.
//
// A revoke is a hard delete, not a soft flag. The row's only real content is a token hash;
// once the issuer has decided the link should not work, the hash should stop existing so a
// leaked link cannot be resurrected by flipping a column back. A REDEEMED invite is never
// deletable — it is the record of how an organisation or a school came into being.
//
// Ownership is checked the same way the list route scopes: super-admin owns organisation
// invites, an org leader owns the school invites belonging to their own organisation.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import {
  isOrgMigrationPending, orgMigrationPending, verifyOrgRequest,
} from '@/lib/montree/org/verify-org-request';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'Missing invitation id.' }, { status: 400 });

  const orgGate = await verifyOrgRequest(request);
  let organizationId: string | null = null;
  let isSuperAdmin = false;

  if ('ctx' in orgGate) {
    organizationId = orgGate.ctx.organizationId;
  } else {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return orgGate.response;
    isSuperAdmin = true;
  }

  const supabase = getSupabase();
  const { data: invite, error } = await supabase
    .from('montree_org_invites')
    .select('id, invite_type, organization_id, used_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    if (isOrgMigrationPending(error)) return orgMigrationPending(error.message);
    console.error('[montree-org] invite lookup failed:', error);
    return NextResponse.json({ error: 'Could not load the invitation.' }, { status: 500 });
  }
  if (!invite) return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });

  const owned = isSuperAdmin
    ? invite.invite_type === 'organization'
    : invite.organization_id === organizationId;
  if (!owned) {
    // Same 404 as a genuinely missing row — an id that is not yours should not be
    // distinguishable from an id that does not exist.
    return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
  }

  if (invite.used_at) {
    return NextResponse.json(
      {
        error: 'This invitation has already been accepted, so it cannot be withdrawn.',
        code: 'already_used',
      },
      { status: 409 },
    );
  }

  const { error: delErr } = await supabase.from('montree_org_invites').delete().eq('id', id);
  if (delErr) {
    console.error('[montree-org] invite delete failed:', delErr);
    return NextResponse.json({ error: 'Could not withdraw the invitation.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, id });
}
