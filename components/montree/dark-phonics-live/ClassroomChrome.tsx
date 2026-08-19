'use client';

/**
 * ClassroomChrome — the near-black outer shell of the Dark Phonics live classroom.
 *
 * Renders: ambient glows, top bar (brand lockup w/ animated equalizer mark,
 * lesson badge, 49-segment progress strip, timer, End Class button) and a
 * two-column content grid slot for <Stage /> + <VideoRail />, with an optional
 * footer slot for <Toolbar />.
 *
 * Visual source of truth: mockups/draft-a-midnight-studio.html (.classroom/.topbar).
 * All colour/spacing comes from styles/dark-phonics-live-tokens.css.
 */

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

export type ClassroomRole = 'teacher' | 'parent';

export interface ClassroomChromeProps {
  /** Dark Phonics lesson number, 1..49. */
  lessonNumber: number;
  /** The focus sound, e.g. `s` — rendered as: the ‘s’ sound. */
  sound: string;
  /** Seconds elapsed since class start; the component ticks locally from here. */
  elapsedSeconds: number;
  /** Total lessons in the programme. 49 for Dark Phonics. */
  totalLessons?: number;
  /**
   * Teacher chrome shows a live End Class button; parent chrome shows a muted
   * "Leave" affordance instead (parents must not be able to end the session).
   */
  role?: ClassroomRole;
  /** Fired when the teacher confirms End Class. Omit on the parent surface. */
  onEndClass?: () => void;
  /** Set false to freeze the ticking timer (e.g. class not started yet). */
  isLive?: boolean;
  /** Stage + rail. Expected: <Stage /> then <VideoRail />. */
  children: ReactNode;
  /** Bottom pill slot — <Toolbar />. Optional so the parent page can omit it. */
  footer?: ReactNode;
}

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(safe / 60);
  const ss = safe % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/** Brand lockup mark: 5 animated equalizer bars. Animation lives in the tokens CSS. */
function EqualizerMark({ small = false }: { small?: boolean }) {
  const bars = [
    { h: 9, lime: false },
    { h: 17, lime: true },
    { h: 22, lime: false },
    { h: 13, lime: true },
    { h: 19, lime: false },
  ];
  return (
    <span
      className={[
        'flex flex-none items-end justify-center rounded-[var(--dpl-r-sm)]',
        'border border-[var(--dpl-mark-line)] bg-[var(--dpl-mark-bg)]',
        small ? 'h-[26px] w-[26px] gap-[2px] rounded-[8px] px-1 py-[5px]' : 'h-[42px] w-[42px] gap-[3px] px-2 py-[9px]',
      ].join(' ')}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 26 22"
        preserveAspectRatio="none"
        className={['h-full w-full overflow-visible', small ? 'dpl-eq-slow' : ''].join(' ')}
      >
        {bars.map((bar, i) => (
          <rect
            key={i}
            className="dpl-eq-bar"
            x={i * 5.2}
            y={22 - bar.h}
            width={small ? 2.5 : 4}
            height={bar.h}
            rx={small ? 1.2 : 2}
            fill={bar.lime ? 'var(--dpl-accent2)' : 'var(--dpl-accent)'}
          />
        ))}
      </svg>
    </span>
  );
}

/** 49-segment lesson progress strip. Done / now / upcoming, exactly as the mockup. */
function ProgressStrip({ lessonNumber, totalLessons }: { lessonNumber: number; totalLessons: number }) {
  const segments = Array.from({ length: totalLessons }, (_, i) => i + 1);
  return (
    <div className="flex items-center gap-[10px]">
      <span className="text-[9.5px] tabular-nums tracking-[0.1em] text-[var(--dpl-ink3)]">01</span>
      <span className="flex items-center gap-[2.5px]" role="img" aria-label={`Lesson ${lessonNumber} of ${totalLessons}`}>
        {segments.map((n) => {
          if (n === lessonNumber) {
            return (
              <i
                key={n}
                className="block h-[9px] w-[16px] rounded-[3px] bg-[var(--dpl-accent2)]"
                style={{ boxShadow: 'var(--dpl-seg-now-glow)' }}
              />
            );
          }
          return (
            <i
              key={n}
              className={[
                'block h-[7px] w-[6px] rounded-[2px]',
                n < lessonNumber ? 'bg-[var(--dpl-seg-on)]' : 'bg-[var(--dpl-seg-off)]',
              ].join(' ')}
            />
          );
        })}
      </span>
      <span className="text-[9.5px] tabular-nums tracking-[0.1em] text-[var(--dpl-ink3)]">{totalLessons}</span>
      <span
        className="ml-1 text-[12px] font-bold tabular-nums text-[var(--dpl-ink)]"
        style={{ fontFamily: 'var(--dpl-font-display)' }}
      >
        {lessonNumber}
        <b className="font-medium text-[var(--dpl-ink3)]">/{totalLessons}</b>
      </span>
    </div>
  );
}

export default function ClassroomChrome({
  lessonNumber,
  sound,
  elapsedSeconds,
  totalLessons = 49,
  role = 'teacher',
  onEndClass,
  isLive = true,
  children,
  footer,
}: ClassroomChromeProps) {
  // Local tick so the clock moves without a data round-trip.
  // TODO: seed `elapsedSeconds` from the appointment's real `started_at`
  // (montree_appointments) on the server so a refresh mid-class stays accurate,
  // and reconcile drift on window focus.
  const [seconds, setSeconds] = useState(elapsedSeconds);

  useEffect(() => setSeconds(elapsedSeconds), [elapsedSeconds]);

  useEffect(() => {
    if (!isLive) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [isLive]);

  return (
    <div
      className="relative flex min-h-screen flex-col gap-[var(--dpl-s4)] overflow-hidden bg-[var(--dpl-chrome)] px-[var(--dpl-s5)] py-[var(--dpl-s4)] text-[var(--dpl-ink)]"
      style={{ fontFamily: 'var(--dpl-font-body)' }}
    >
      {/* ambient glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[140px] -top-[160px] h-[420px] w-[620px] rounded-full blur-[90px]"
        style={{ background: 'var(--dpl-glow-1)', opacity: 'var(--dpl-glow-op)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[180px] -right-[120px] h-[420px] w-[560px] rounded-full blur-[90px]"
        style={{ background: 'var(--dpl-glow-2)', opacity: 'var(--dpl-glow-op)' }}
      />

      {/* ---------------- top bar ---------------- */}
      <header
        className="relative z-[2] grid grid-cols-[1fr_auto_1fr] items-center gap-[var(--dpl-s4)] rounded-[var(--dpl-r-lg)] border border-[var(--dpl-line)] bg-[var(--dpl-chrome2)] p-[var(--dpl-s3)]"
        style={{ boxShadow: 'var(--dpl-shadow)' }}
      >
        <div className="flex items-center gap-3 pl-[6px]">
          <EqualizerMark />
          <span className="flex flex-col gap-[2px]">
            <span
              className="text-[16px] font-bold text-[var(--dpl-ink)]"
              style={{ fontFamily: 'var(--dpl-font-display)', letterSpacing: 'var(--dpl-brand-ls)' }}
            >
              DARK PHONICS
            </span>
            <span className="flex items-center gap-[5px] text-[11px] tracking-[0.05em] text-[var(--dpl-ink2)]">
              <svg
                className="h-[13px] w-[13px] text-[var(--dpl-accent2)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3.2c3.4 1.8 5.2 4.4 5.2 7.4A5.2 5.2 0 0 1 12 15.8a5.2 5.2 0 0 1-5.2-5.2c0-3 1.8-5.6 5.2-7.4z" />
                <path d="M12 21v-8.6" />
                <path d="M12 15.4l2.8-2.6" />
                <path d="M12 17.6l-2.6-2.4" />
              </svg>
              <span>× montree</span>
            </span>
          </span>
        </div>

        <div className="flex min-w-[520px] flex-col items-center gap-[9px]">
          <div className="flex items-center gap-[9px] rounded-full border border-[var(--dpl-badge-line)] bg-[var(--dpl-badge-bg)] py-[7px] pl-2 pr-4">
            {isLive && (
              <span className="flex items-center gap-[5px] rounded-full bg-[var(--dpl-live-bg)] py-[3px] pl-[7px] pr-[9px] text-[9.5px] font-bold tracking-[0.14em] text-[var(--dpl-live-ink)]">
                <i className="block h-[6px] w-[6px] rounded-full bg-current" />
                LIVE
              </span>
            )}
            <span className="text-[14px] font-bold tracking-[0.02em]" style={{ fontFamily: 'var(--dpl-font-display)' }}>
              Lesson {lessonNumber}
            </span>
            <span className="text-[var(--dpl-ink3)]">·</span>
            <span className="text-[14px] font-medium text-[var(--dpl-ink2)]">the &lsquo;{sound}&rsquo; sound</span>
          </div>
          <ProgressStrip lessonNumber={lessonNumber} totalLessons={totalLessons} />
        </div>

        <div className="flex items-center justify-end gap-[10px] pr-[2px]">
          <div className="flex items-center gap-2 rounded-[var(--dpl-r-sm)] border border-[var(--dpl-line)] bg-[var(--dpl-timer-bg)] px-[14px] py-2 text-[var(--dpl-ink)]">
            <svg
              className="h-4 w-4 text-[var(--dpl-accent2)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="8.4" />
              <path d="M12 7.4V12l3 1.9" />
            </svg>
            <span
              className="text-[15px] font-bold tabular-nums tracking-[0.02em]"
              style={{ fontFamily: 'var(--dpl-font-display)' }}
            >
              {formatClock(seconds)}
            </span>
          </div>

          {role === 'teacher' ? (
            <button
              type="button"
              // TODO: wire to POST /api/montree/appointments/[id]/recap (ends the
              // session + generates the parent recap card), then route away.
              // Wrap in a confirm dialog before shipping — this is destructive.
              onClick={onEndClass}
              disabled={!onEndClass}
              className="rounded-[var(--dpl-r-sm)] border border-[var(--dpl-danger-line)] px-[18px] py-[10px] text-[11px] font-bold tracking-[0.12em] text-[var(--dpl-danger-ink)] disabled:opacity-70"
              style={{ background: 'var(--dpl-danger-grad)', boxShadow: 'var(--dpl-btn-shadow)', fontFamily: 'var(--dpl-font-display)' }}
            >
              END CLASS
            </button>
          ) : (
            <span className="rounded-[var(--dpl-r-sm)] border border-[var(--dpl-line)] bg-[var(--dpl-timer-bg)] px-[18px] py-[10px] text-[11px] font-bold tracking-[0.12em] text-[var(--dpl-ink2)]">
              IN CLASS
            </span>
          )}
        </div>
      </header>

      {/* ---------------- stage + rail ---------------- */}
      <div className="relative z-[2] grid min-h-0 flex-1 grid-cols-[minmax(0,72fr)_minmax(0,28fr)] gap-[var(--dpl-s4)]">
        {children}
      </div>

      {/* ---------------- toolbar slot ---------------- */}
      {footer ? <div className="relative z-[2] flex justify-center">{footer}</div> : null}
    </div>
  );
}

export { EqualizerMark };
