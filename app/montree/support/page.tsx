// app/montree/support/page.tsx
// Alias — the real support page lives at /support (montree.xyz/support is
// the URL given to App Store review). Keep both paths working.
import { redirect } from 'next/navigation';

export default function MontreeSupportRedirect() {
  redirect('/support');
}
