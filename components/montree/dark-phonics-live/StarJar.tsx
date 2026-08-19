'use client';

/**
 * StarJar — the reward widget in the right rail.
 *
 * Filled stars are lime; the most recently earned star glow-pulses (see
 * `.dpl-star-pop` in styles/dark-phonics-live-tokens.css).
 *
 * Visual source of truth: mockups/draft-a-midnight-studio.html (.panel.jarpanel).
 */

export interface StarJarProps {
  starsEarned: number;
  /** Stars available in a single class. */
  starsTotal?: number;
  /** Caption meta, top-right of the panel. */
  periodLabel?: string;
  /**
   * Teacher-only: award the next star. Rendering is identical either way — the
   * jar just becomes a button when this is provided.
   *
   * TODO: wire to a `POST /api/montree/appointments/[id]/stars` (or the
   * whiteboard realtime channel) so the parent's jar updates live. Until then
   * this is a local-optimistic stub and the count comes from the server.
   */
  onAwardStar?: () => void;
}

function StarIcon({ filled, pulsing }: { filled: boolean; pulsing: boolean }) {
  return (
    <svg
      className={['h-[26px] w-[26px]', pulsing ? 'dpl-star-pop' : ''].join(' ')}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3.4l2.6 5.3 5.9.85-4.25 4.15 1 5.85L12 16.75 6.75 19.5l1-5.85L3.5 9.55l5.9-.85z" />
    </svg>
  );
}

export default function StarJar({ starsEarned, starsTotal = 5, periodLabel = 'today', onAwardStar }: StarJarProps) {
  const earned = Math.max(0, Math.min(starsEarned, starsTotal));
  const remaining = starsTotal - earned;
  const canAward = Boolean(onAwardStar) && remaining > 0;

  const jar = (
    <>
      <div className="mt-[11px] flex flex-col items-center">
        <span className="mb-[-1px] h-[10px] w-[46%] rounded-t-[6px] rounded-b-[3px] bg-[var(--dpl-jar-lid)]" />
        <div className="flex w-full items-end justify-center gap-[7px] rounded-t-[6px] rounded-b-[var(--dpl-r-md)] border border-t-0 border-[var(--dpl-jar-line)] bg-[var(--dpl-jar-bg)] px-[10px] pb-[11px] pt-3">
          {Array.from({ length: starsTotal }, (_, i) => {
            const filled = i < earned;
            // Only the newest star pulses.
            const pulsing = filled && i === earned - 1;
            return (
              <span
                key={i}
                className={['flex', filled ? 'text-[var(--dpl-accent2)]' : 'text-[var(--dpl-jar-empty)]'].join(' ')}
              >
                <StarIcon filled={filled} pulsing={pulsing} />
              </span>
            );
          })}
        </div>
      </div>
      <div className="mt-[9px] text-center text-[12px] font-semibold text-[var(--dpl-ink)]">
        {earned} ★ earned{' '}
        <b className="font-medium text-[var(--dpl-ink3)]">
          · {remaining > 0 ? `${remaining} to go` : 'jar full!'}
        </b>
      </div>
    </>
  );

  return (
    <section
      className="rounded-[var(--dpl-r-lg)] border border-[var(--dpl-line)] bg-[var(--dpl-chrome2)] px-[14px] pb-[14px] pt-3"
      style={{ boxShadow: 'var(--dpl-shadow)' }}
    >
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--dpl-ink2)]">
        <span>Star Jar</span>
        <span className="font-medium tracking-[0.1em] text-[var(--dpl-ink3)]">{periodLabel}</span>
      </div>

      {canAward ? (
        <button
          type="button"
          onClick={onAwardStar}
          aria-label={`Award a star. ${earned} of ${starsTotal} earned.`}
          className="block w-full text-left"
        >
          {jar}
        </button>
      ) : (
        <div role="img" aria-label={`${earned} of ${starsTotal} stars earned`}>
          {jar}
        </div>
      )}
    </section>
  );
}
