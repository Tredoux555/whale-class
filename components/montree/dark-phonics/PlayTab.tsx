'use client';

/**
 * PlayTab — the Play panel's whole body, and the ONLY module in the hub that
 * imports the shelf's design tokens.
 *
 * 🚨 WHY THIS FILE EXISTS AT ALL. `styles/dark-phonics-live-tokens.css` declares
 * ~120 `--dpl-*` custom properties on `:root` plus a handful of `.dpl-*` and
 * `[data-shelf-root]` rules. Its own header says "do NOT add it to the global
 * root layout; the skin should stay scoped". The hub has three tabs and only
 * one of them is the shelf, so the import lives here, in a module the hub loads
 * with next/dynamic — the stylesheet is a separate chunk that is fetched when
 * the Play panel first renders and never for a visitor who only ever opens
 * Classroom or Community. The hub's own skin is `--dp-*` and reads none of the
 * shelf's tokens, so the two palettes cannot bleed into each other.
 *
 * Everything else here is a thin wrapper: ParentLedLessons is the same
 * component /parents mounts, with the hub's optional callbacks attached.
 */

import '@/styles/dark-phonics-live-tokens.css';

import ParentLedLessons from '@/components/montree/dark-phonics-live/ParentLedLessons';

export interface PlayTabProps {
  openLesson: number | null;
  onOpenChange: (n: number | null) => void;
  freeLessons?: readonly number[];
  lockedLessons?: readonly number[];
  onLessonOpen?: (n: number) => void;
  onLessonDone?: (n: number) => void;
  onStageDone?: (n: number, stageKey: string, index: number) => void;
  onLockedLesson?: (n: number) => void;
  freeLabel?: string;
  lockedLabel?: string;
  /** Forwarded to the picker's own "leave" link. Only the /parents mount sets
   *  it; on the hub the header's wordmark is the way out. */
  backHref?: string;
  backLabel?: string;
}

export default function PlayTab(props: PlayTabProps) {
  return (
    <div className="dp-play" data-dp-play>
      <ParentLedLessons
        openLesson={props.openLesson}
        onOpenChange={props.onOpenChange}
        freeLessons={props.freeLessons}
        lockedLessons={props.lockedLessons}
        onLessonOpen={props.onLessonOpen}
        onLessonDone={props.onLessonDone}
        onStageDone={props.onStageDone}
        onLockedLesson={props.onLockedLesson}
        freeLabel={props.freeLabel}
        lockedLabel={props.lockedLabel}
        backHref={props.backHref}
        backLabel={props.backLabel}
      />
    </div>
  );
}
