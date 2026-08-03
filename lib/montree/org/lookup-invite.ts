// lib/montree/org/lookup-invite.ts
//
// Server-side invite lookup for the two JOIN LANDING PAGES.
//
// Both /montree/org/join/[token] and /montree/school/join/[token] resolve the token on the
// SERVER before anything paints. Two reasons, both about the person holding the link:
//
//   1. They see the right thing immediately. A dead link says "this has expired, ask for a
//      fresh one" as the first paint — not a form that spins, then collapses into an error
//      after they have already typed their school's name into it.
//   2. The token never has to make a round trip from the browser. The page URL contains it
//      once; the client component receives a name and a status, never the secret again.
//
// Returns a plain, serialisable object so it can cross the server→client boundary as props.

import { getSupabase } from '@/lib/supabase-client';
import {
  hashInviteToken, inviteStatus, inviteStatusMessage,
  type InviteStatus, type OrgInviteType,
} from './invite-tokens';

export interface InviteLanding {
  valid: boolean;
  status: InviteStatus | 'unavailable';
  message: string | null;
  inviteType: OrgInviteType | null;
  /** The name whoever issued the link typed in, if any. A greeting, never authoritative. */
  prefillName: string | null;
  /** For a school invite: the organisation doing the inviting. */
  organizationName: string | null;
  expiresAt: string | null;
}

const unavailable = (message: string): InviteLanding => ({
  valid: false,
  status: 'unavailable',
  message,
  inviteType: null,
  prefillName: null,
  organizationName: null,
  expiresAt: null,
});

/**
 * Look up an invite by its plaintext token and classify it.
 *
 * `expectedType` guards against someone pasting an organisation link into the school
 * landing page (or vice versa) — the wrong page would otherwise render a friendly form
 * that could never succeed.
 */
export async function lookupInviteForLanding(
  token: string,
  expectedType: OrgInviteType,
): Promise<InviteLanding> {
  if (!token || typeof token !== 'string') {
    return { ...unavailable(inviteStatusMessage('not_found')), status: 'not_found' };
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    // Supabase env not configured (build step / preview). Never crash the page.
    return unavailable('We cannot check this invitation right now. Please try again in a moment.');
  }

  const { data: invite, error } = await supabase
    .from('montree_org_invites')
    .select('id, invite_type, organization_id, prefill_name, expires_at, used_at')
    .eq('token_hash', hashInviteToken(token))
    .maybeSingle();

  if (error) {
    console.error('[montree-org] landing lookup failed:', error);
    return unavailable('We cannot check this invitation right now. Please try again in a moment.');
  }

  const status = inviteStatus(invite ?? null);
  if (status !== 'valid' || !invite) {
    return {
      valid: false,
      status,
      message: inviteStatusMessage(status),
      inviteType: null,
      prefillName: null,
      organizationName: null,
      expiresAt: null,
    };
  }

  if (invite.invite_type !== expectedType) {
    return {
      valid: false,
      status: 'not_found',
      message:
        expectedType === 'school'
          ? 'This link is an invitation to create an organization, not a school. Open it at montree.xyz/montree/org/join instead.'
          : 'This link is an invitation to register a school, not an organization. Open it at montree.xyz/montree/school/join instead.',
      inviteType: invite.invite_type as OrgInviteType,
      prefillName: null,
      organizationName: null,
      expiresAt: null,
    };
  }

  let organizationName: string | null = null;
  if (invite.invite_type === 'school' && invite.organization_id) {
    const { data: org } = await supabase
      .from('montree_organizations')
      .select('name')
      .eq('id', invite.organization_id)
      .maybeSingle();
    organizationName = (org as { name?: string } | null)?.name ?? null;
  }

  return {
    valid: true,
    status: 'valid',
    message: null,
    inviteType: invite.invite_type as OrgInviteType,
    prefillName: invite.prefill_name ?? null,
    organizationName,
    expiresAt: invite.expires_at ?? null,
  };
}
