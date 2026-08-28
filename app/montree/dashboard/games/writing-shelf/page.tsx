/**
 * The Writing Shelf — teachers' classroom tool (all 8 trays, local state).
 *
 * Sits in the games grid so any teacher can open it on the big screen or a
 * tablet beside the PHYSICAL shelf and work a tray with the class. Nothing
 * is saved; the live 1-on-1 classroom carries the synced version of the very
 * same tray components.
 *
 * Route: /montree/dashboard/games/writing-shelf
 */

import '@/styles/dark-phonics-live-tokens.css';

import WritingShelfBoard from '@/components/montree/dark-phonics-live/activities/WritingShelfBoard';

export default function WritingShelfGamePage() {
  return <WritingShelfBoard />;
}
