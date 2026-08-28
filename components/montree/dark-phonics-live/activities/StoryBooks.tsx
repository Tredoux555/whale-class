'use client';

/**
 * Tray 6 — Story Books, digitised.
 *
 * Four wordless pictures, scrambled; the child puts them in an order that
 * tells a story, then writes ONE LINE under each in his own paper fold-book —
 * spelled the way it sounds, never corrected ("he et the ham" stays). The
 * screen only handles the picture ordering; the writing stays on paper, and
 * NOTHING here is checked — the only control of error is whether the story
 * makes sense read back.
 *
 * Art ladder per frame: bucket image (shelf/sequences/<set>/<n>.png via the
 * media proxy) → the emoji scene card. Real illustrations dropped into the
 * bucket take over without a code change.
 *
 * Synced cursor: `wordIndex` = which sequence set, `order` = source-frame
 * index per placed position.
 */

import { useState } from 'react';

import { mediaProxyUrl } from '@/lib/montree/dark-phonics/live-lesson';
import type { LiveActivityState, WritingShelfActivity } from '@/lib/montree/dark-phonics/live-activities';
import type { SequenceFrame } from '@/lib/montree/dark-phonics/writing-shelf-language';

export default function StoryBooks({
  activity,
  state,
  role,
  onPatch,
}: {
  activity: WritingShelfActivity;
  state: LiveActivityState;
  role: 'teacher' | 'parent';
  onPatch?: (patch: Partial<LiveActivityState>) => void;
}) {
  const sets = activity.sequences ?? [];
  if (sets.length === 0) return null;
  const isTeacher = role === 'teacher';
  const setIndex = Math.min(state.wordIndex, sets.length - 1);
  const set = sets[setIndex];
  const order = (state.order ?? []).filter((i) => i < set.frames.length);
  const placed = new Set(order);
  const done = order.length === set.frames.length;

  const place = (frameIndex: number) => {
    if (!isTeacher || !onPatch || placed.has(frameIndex)) return;
    onPatch({ order: [...order, frameIndex] });
  };

  const takeBack = (pos: number) => {
    if (!isTeacher || !onPatch) return;
    onPatch({ order: order.filter((_, i) => i !== pos) });
  };

  return (
    <div className="flex w-full flex-col items-center gap-[22px]">
      {/* scrambled pile — a fixed scramble per set so both surfaces agree */}
      <div className="flex flex-wrap items-center justify-center gap-[12px]">
        {scrambleOrder(set.frames.length, set.slug).map((frameIndex) =>
          placed.has(frameIndex) ? (
            <span
              key={frameIndex}
              className="h-[110px] w-[110px] rounded-[var(--dpl-r-md)] border-2 border-dashed border-[var(--dpl-slide-line)] opacity-30"
            />
          ) : (
            <button
              key={frameIndex}
              type="button"
              disabled={!isTeacher}
              onClick={() => place(frameIndex)}
              className="hover:-translate-y-[2px]"
            >
              <FrameCard frame={set.frames[frameIndex]} size={110} showHint={isTeacher} />
            </button>
          )
        )}
      </div>

      <span className="text-[13px] text-[var(--dpl-slide-ink3)]">⬇ put them in story order ⬇</span>

      {/* the story line, numbered 1–4 */}
      <div className="flex flex-wrap items-center justify-center gap-[12px]">
        {Array.from({ length: set.frames.length }, (_, pos) => {
          const frameIndex = order[pos];
          return (
            <div key={pos} className="flex flex-col items-center gap-[6px]">
              <span
                className="text-[13px] font-bold text-[var(--dpl-slide-accent)]"
                style={{ fontFamily: 'var(--dpl-font-display)' }}
              >
                {pos + 1}
              </span>
              {frameIndex !== undefined ? (
                <button type="button" disabled={!isTeacher} onClick={() => takeBack(pos)}>
                  <FrameCard frame={set.frames[frameIndex]} size={128} showHint={isTeacher} />
                </button>
              ) : (
                <span className="flex h-[128px] w-[128px] items-center justify-center rounded-[var(--dpl-r-md)] border-2 border-dashed border-[var(--dpl-slide-line)] bg-[var(--dpl-trace-bg)] text-[20px] text-[var(--dpl-slide-ink3)]">
                  ?
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="max-w-[460px] text-center text-[13.5px] text-[var(--dpl-slide-ink3)]">
        {done
          ? '📖 Now one line under each picture, in your book. Spell it the way it sounds — I want your story, not perfect letters.'
          : 'Which picture comes first? Tell me the story as you go.'}
      </p>
    </div>
  );
}

/** Fixed, deterministic scramble per set (seeded by the slug). */
function scrambleOrder(n: number, seedText: string): number[] {
  let seed = 0;
  for (let i = 0; i < seedText.length; i++) seed = (seed * 31 + seedText.charCodeAt(i)) >>> 0;
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const j = seed % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // A scramble that lands in story order teaches nothing — rotate it once.
  if (arr.every((v, i) => v === i)) arr.push(arr.shift() as number);
  return arr;
}

function FrameCard({ frame, size, showHint }: { frame: SequenceFrame; size: number; showHint: boolean }) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <span
      className="flex flex-col items-center justify-center gap-[2px] rounded-[var(--dpl-r-md)] border-2 border-[var(--dpl-chip-line)] bg-[var(--dpl-chip-bg)]"
      style={{ height: size, width: size }}
      title={showHint ? frame.hint : undefined}
    >
      {!imgFailed ? (
        // eslint-disable-next-line @next/next/no-img-element -- media-proxy asset with emoji fallback
        <img
          src={mediaProxyUrl(frame.imagePath)}
          alt=""
          onError={() => setImgFailed(true)}
          className="h-full w-full rounded-[var(--dpl-r-md)] object-cover"
        />
      ) : (
        <span style={{ fontSize: size * 0.42, lineHeight: 1.1 }}>{frame.emoji}</span>
      )}
    </span>
  );
}
