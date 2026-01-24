// /montree/demo/zohan/tutorial/page.tsx
// Session 84: Redirect to the real dashboard with demo mode
import { redirect } from 'next/navigation';

export default function ZohanTutorialRedirect() {
  redirect('/montree/dashboard?demo=zohan');
}
