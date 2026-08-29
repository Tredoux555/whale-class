/**
 * Lesson 1 PREVIEW — no login, no appointment, no database.
 *
 * A look-and-touch harness for the Book Works activity (the first online Dark
 * Phonics lesson): the real component, the real content module, the real
 * artwork — but all state is local React state, so nothing syncs and nothing
 * is saved. Flip the Teacher / Student switch to drive either side.
 *
 * Safe to ship: it exposes only public curriculum content and public art.
 * Route: /montree/dev/lesson1-preview  (covered by middleware's '/montree'
 * public entry — the same way /montree/dev/writing-shelf-preview is).
 */

import '@/styles/dark-phonics-live-tokens.css';

import Lesson1PreviewClient from './preview-client';

export const dynamic = 'force-static';

export default function Lesson1PreviewPage() {
  return <Lesson1PreviewClient />;
}
