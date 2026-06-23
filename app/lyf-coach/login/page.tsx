// Retired duplicate login page. The canonical public login now lives at
// /montree/lyf-coach/login. Redirect there.
import { redirect } from 'next/navigation';

export default function RetiredLyfCoachLoginPage() {
  redirect('/montree/lyf-coach/login');
}
