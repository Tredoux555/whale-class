// Retired duplicate signup page. The canonical public funnel now lives at
// /montree/lyf-coach (landing + free-trial signup). Redirect there.
import { redirect } from 'next/navigation';

export default function RetiredLyfCoachSignupPage() {
  redirect('/montree/lyf-coach');
}
