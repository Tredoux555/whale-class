// /montree/become-an-agent
//
// 🚨 Session 98 — temporary redirect to /montree/for-teachers while the page
// content is reframed from "teachers using Montree to teach" to "agents
// referring schools to Montree for revenue share." User design directive,
// May 10. The full content rewrite (recruitment-focused, agent revenue share
// programme, Stripe Connect onboarding flow) is captured as task #20 in
// the session 98 task list and will land in a focused follow-up commit.
//
// In the meantime, the new label "Become an agent" appears in the landing
// page nav (en.ts: landing.nav.forTeachers) and points here. We redirect
// to the existing for-teachers page so the link doesn't 404.

import { redirect } from 'next/navigation';

export default function BecomeAnAgentPage() {
  redirect('/montree/for-teachers');
}
