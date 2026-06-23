// Retired duplicate chat-bot page. The canonical public coach now lives in the
// tabbed Sanctuary shell at /montree/lyf-coach/coach. Redirect there.
import { redirect } from 'next/navigation';

export default function RetiredLyfCoachCoachPage() {
  redirect('/montree/lyf-coach/coach');
}
