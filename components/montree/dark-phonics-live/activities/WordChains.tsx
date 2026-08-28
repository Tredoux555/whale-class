'use client';

/**
 * Tray 3 — Word Chains, digitised.
 *
 * One word becomes the next by changing exactly one sound. The teacher reveals
 * the chain link by link (`step` = links visible); the changed grapheme in the
 * newest link is highlighted so the child sees WHAT moved, then reads the new
 * word. Older links stack up as breadcrumbs of the chain walked so far.
 */

import { chainDiffIndex, type ActivityWord, type LiveActivityState } from '@/lib/montree/dark-phonics/live-activities';

export default function WordChains({
  chain,
  state,
  role,
}: {
  chain: ActivityWord[];
  state: LiveActivityState;
  role: 'teacher' | 'parent';
}) {
  const visible = Math.max(1, Math.min(state.step + 1, chain.length));
  const shown = chain.slice(0, visible);
  const current = shown[shown.length - 1];
  const prev = shown.length > 1 ? shown[shown.length - 2] : undefined;
  const diffIndex = current ? chainDiffIndex(prev, current) : -1;

  return (
    <div className="flex flex-col items-center gap-[24px]">
      {/* breadcrumbs of the chain so far */}
      {shown.length > 1 ? (
        <div className="flex flex-wrap items-center justify-center gap-[8px]">
          {shown.slice(0, -1).map((w, i) => (
            <span key={`${w.word}-${i}`} className="flex items-center gap-[8px]">
              <span
                className="rounded-[var(--dpl-r-sm)] border border-[var(--dpl-slide-line)] bg-[var(--dpl-step-bg)] px-[14px] py-[6px] text-[20px] font-semibold text-[var(--dpl-slide-ink2)]"
                style={{ fontFamily: 'var(--dpl-font-display)' }}
              >
                {w.word}
              </span>
              <span className="text-[16px] text-[var(--dpl-slide-ink3)]">→</span>
            </span>
          ))}
        </div>
      ) : null}

      {/* the newest link, changed sound highlighted */}
      {current ? (
        <div className="flex items-center gap-[10px]">
          {current.graphemes.map((g, i) => (
            <span
              key={i}
              className={[
                'flex h-[110px] min-w-[96px] items-center justify-center rounded-[var(--dpl-r-md)] border-2 px-4',
                i === diffIndex
                  ? 'border-[var(--dpl-chip-on-line)] bg-[var(--dpl-chip-on-bg)] text-[var(--dpl-chip-on-ink)]'
                  : 'border-[var(--dpl-chip-line)] bg-[var(--dpl-chip-bg)] text-[var(--dpl-slide-ink)]',
              ].join(' ')}
              style={{
                fontFamily: 'var(--dpl-font-display)',
                fontSize: 46,
                fontWeight: 700,
                boxShadow: i === diffIndex ? 'var(--dpl-chip-on-shadow)' : undefined,
              }}
            >
              {g}
            </span>
          ))}
        </div>
      ) : null}

      <p className="text-[14px] text-[var(--dpl-slide-ink3)]">
        {visible >= chain.length
          ? `Chain complete — ${chain.length} words! Read the whole chain back.`
          : diffIndex >= 0
            ? 'One sound changed. Which one? Read the new word!'
            : role === 'teacher'
              ? 'Read it together, then pull the next link.'
              : 'Read it together!'}
      </p>
    </div>
  );
}
