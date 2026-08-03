// /montree/org/join/[token] — the organisation invite landing page.
//
// This is the FIRST link in the Phase 6 onboarding chain and the first thing an invited
// organisation leader ever sees of Montree. Tredoux minted this link personally and sent it
// over WhatsApp/WeChat/email; the person opening it has no account, no session and, quite
// possibly, no idea what Montree is.
//
// So: the token is resolved on the SERVER before the first paint (see lookupInviteForLanding
// — a dead link never renders a form), and what paints is a warm greeting that names their
// organisation if whoever invited them typed it in. Three fields, then straight into the
// dashboard already signed in. No email confirmation step, no "check your inbox" — email
// delivery is not reliable on this deployment and an onboarding flow must never depend on it.

import { lookupInviteForLanding } from '@/lib/montree/org/lookup-invite';
import OrgJoinWizard from './OrgJoinWizard';

export const dynamic = 'force-dynamic';

export default async function OrgJoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const landing = await lookupInviteForLanding(decodeURIComponent(token || ''), 'organization');

  return <OrgJoinWizard token={token} landing={landing} />;
}
