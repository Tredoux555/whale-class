'use client';

/**
 * ShelfStrip — the shelf itself, along the top.
 *
 * A Montessori shelf is read left to right and nothing on it is locked: a child
 * takes the work they are ready for. So every stage is tappable at all times,
 * done or not — the strip SHOWS where they have been, it does not gate where
 * they may go.
 */

import type { ShelfStage } from './stages';

export default function ShelfStrip({
  stages,
  current,
  visited,
  onPick,
}: {
  stages: readonly ShelfStage[];
  current: number;
  visited: readonly boolean[];
  onPick: (index: number) => void;
}) {
  return (
    <nav
      aria-label="Shelf"
      className="flex gap-[6px] overflow-x-auto pb-[2px]"
      style={{ scrollbarWidth: 'none' }}
    >
      {stages.map((stage, i) => {
        const isNow = i === current;
        const done = visited[i] && !isNow;
        return (
          <button
            key={stage.key}
            type="button"
            onClick={() => onPick(i)}
            aria-current={isNow ? 'step' : undefined}
            className="flex min-h-[56px] flex-none touch-manipulation items-center gap-[8px] rounded-[var(--dpl-r-sm)] border px-[12px] py-[9px] text-left transition-colors"
            style={{
              borderColor: isNow ? 'var(--dpl-accent2)' : 'var(--dpl-line)',
              background: isNow ? 'var(--dpl-live-bg)' : 'var(--dpl-timer-bg)',
              color: isNow ? 'var(--dpl-live-ink)' : 'var(--dpl-ink2)',
            }}
          >
            <span
              className="flex h-[24px] w-[24px] flex-none items-center justify-center rounded-full border text-[11px] font-bold"
              style={{
                borderColor: isNow
                  ? 'var(--dpl-accent2)'
                  : done
                    ? 'var(--dpl-ok)'
                    : 'var(--dpl-line)',
                color: done && !isNow ? 'var(--dpl-ok)' : 'inherit',
              }}
            >
              {done ? '✓' : i + 1}
            </span>
            <span
              className="whitespace-nowrap text-[12px] font-semibold"
              style={{ fontFamily: 'var(--dpl-font-display)' }}
            >
              {stage.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
