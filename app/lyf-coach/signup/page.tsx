// Retired duplicate signup page. The canonical public funnel now lives at
// /lyf-coach (landing + free-trial signup). Redirect there.
import { redirect } from 'next/navigation';

export default function RetiredLyfCoachSignupPage() {
  redirect('/lyf-coach');
}
