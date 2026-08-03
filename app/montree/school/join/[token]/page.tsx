// /montree/school/join/[token] — the school invite landing page.
//
// The third link in the Phase 6 chain. An organisation leader sent this to one of their
// principals; the principal opening it may never have heard of Montree, and needs to know
// immediately WHO is asking (the organisation's name is the first thing on the page).
//
// The token is resolved on the SERVER before first paint, exactly as the organisation
// landing page does it, so a withdrawn or expired link never renders a form.
//
// On success the principal lands in the EXISTING principal flow (/montree/principal/setup →
// classrooms → teachers → children) with a live session. Nothing below this point in the
// chain is new: teachers still get 6-character login codes from their principal, and
// children are still added by staff.

import { lookupInviteForLanding } from '@/lib/montree/org/lookup-invite';
import SchoolJoinWizard from './SchoolJoinWizard';

export const dynamic = 'force-dynamic';

export default async function SchoolJoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const landing = await lookupInviteForLanding(decodeURIComponent(token || ''), 'school');

  return <SchoolJoinWizard token={token} landing={landing} />;
}
