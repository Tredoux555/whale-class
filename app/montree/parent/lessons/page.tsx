/**
 * /montree/parent/lessons — the parent-led Dark Phonics lesson.
 *
 * The same ten Book Works lessons the live classroom teaches, rebuilt for ONE
 * shared tablet: parent and child sitting side by side, no teacher on a call.
 * The child's surfaces are live (dragging, tracing) and the grown-up holds the
 * controls, on the same screen.
 *
 * DELIBERATELY LOCAL. There is no appointment, no live-state row, no PATCH and
 * no migration behind this page — the whole lesson is React state in this tab.
 * Nothing is written to a server, so nothing needs to be cleaned up, and the
 * live classroom's sync contract is untouched by anything here.
 *
 * SILENT. The digital voice is pinned off in this mode (BookWorks role="solo")
 * and there is no switch to turn it on: the parent reading beside the child is
 * the voice. Parent guidance is English only, matching the rest of the portal's
 * Dark Phonics surfaces.
 *
 * NOT PUBLIC. Gated exactly like every other parent page — see the client for
 * the cookie check. Middleware is untouched.
 */

import '@/styles/dark-phonics-live-tokens.css';

import ParentLessonsClient from './lessons-client';

export const dynamic = 'force-dynamic';

export default function ParentLessonsPage() {
  return <ParentLessonsClient />;
}
