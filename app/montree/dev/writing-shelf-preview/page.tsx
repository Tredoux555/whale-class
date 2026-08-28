/**
 * Writing Shelf PREVIEW — no login, no appointment, no database.
 *
 * A look-only harness for the digitised Writing Shelf trays (2026-08-28):
 * renders the real live-classroom Stage with the real activity components,
 * but all state is local React state — nothing syncs, nothing is saved.
 * Safe to ship: it exposes only the public curriculum word lists.
 *
 * Route: /montree/dev/writing-shelf-preview
 */

import '@/styles/dark-phonics-live-tokens.css';

import WritingShelfPreviewClient from './preview-client';

export const dynamic = 'force-static';

export default function WritingShelfPreviewPage() {
  return <WritingShelfPreviewClient />;
}
