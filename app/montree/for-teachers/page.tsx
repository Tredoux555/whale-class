// /montree/for-teachers
//
// Phase 3 of agent system fix plan — retired in favour of /become-an-agent
// which is the proper recruitment landing page with application form.
//
// Previously this page held the recruitment content (TEACHER REVENUE SHARE),
// but all CTAs pointed at /montree/try (the school signup flow) which was
// wrong — prospective agents were dumped into the teacher trial picker
// instead of being offered an application path.
//
// Sessions 71 + 98 had this rebuild as a queued task that never landed
// (Session 98 stubbed /become-an-agent as redirect → here; now reversed).
//
// Kept the file (not deleted) so existing inbound links and bookmarks
// don't 404. Long-term this can be removed once we've confirmed no traffic
// hits it.

import { redirect } from 'next/navigation';

export default function ForTeachersPage() {
  redirect('/montree/become-an-agent');
}
