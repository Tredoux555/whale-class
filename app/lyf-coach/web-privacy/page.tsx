import { redirect } from 'next/navigation';

// Provisional route — superseded by /lyf-coach/privacy/web.
// (Kept as a redirect because the sandbox can't delete files; safe to remove
//  the app/lyf-coach/web-privacy folder via Desktop Commander when convenient.)
export default function LyfCoachWebPrivacyRedirect() {
  redirect('/lyf-coach/privacy/web');
}
