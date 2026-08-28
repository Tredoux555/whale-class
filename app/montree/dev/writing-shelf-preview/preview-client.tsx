'use client';

/**
 * Dev preview — renders the same WritingShelfBoard the dashboard tool uses.
 * Kept as a no-auth peek at the shelf; see the board component for the rules.
 */

import WritingShelfBoard from '@/components/montree/dark-phonics-live/activities/WritingShelfBoard';

export default function WritingShelfPreviewClient() {
  return <WritingShelfBoard subtitle="preview · no login · nothing saved" />;
}
