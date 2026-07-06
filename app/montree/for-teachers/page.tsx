// /montree/for-teachers
//
// The public ambassador/agent recruitment programme was retired in Jul 2026
// (launch-pricing restructure). This page previously held recruitment content,
// then briefly redirected to /become-an-agent — both are now off the public
// web, so this redirects straight to the homepage. Kept the file (not deleted)
// so existing inbound links and bookmarks don't 404.

import { redirect } from 'next/navigation';

export default function ForTeachersPage() {
  redirect('/montree');
}
