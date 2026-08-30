// /interactive — kept alive purely as a redirect.
//
// This route used to serve the English Journey player (JourneyPlayer) behind
// the homepage's "Interactive" tab. Per Tredoux the homepage tab is now
// "Parents" and serves the parent-led Dark Phonics lesson, so this path
// forwards to /parents rather than 404ing links already in the wild (QR codes,
// WeChat shares, printed material).
//
// The JourneyPlayer itself is NOT gone — teachers still reach it at
// /montree/dashboard/journey, which is untouched.
import { redirect } from 'next/navigation';

export default function InteractivePage() {
  redirect('/parents');
}
