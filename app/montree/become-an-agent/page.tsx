// /montree/become-an-agent
//
// The public ambassador/agent recruitment programme was retired in Jul 2026
// (launch-pricing restructure — no more public agent recruitment). This page
// used to hold the recruitment landing + application form; it now redirects to
// the homepage. The internal agent infrastructure (dashboards, payouts,
// referral codes) stays dormant on disk — it is just no longer surfaced on the
// public web. Kept the route so old inbound links + bookmarks don't 404.

import { redirect } from 'next/navigation';

export default function BecomeAnAgentGone() {
  redirect('/montree');
}
