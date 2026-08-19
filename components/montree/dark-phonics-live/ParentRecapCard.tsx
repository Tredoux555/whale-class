/**
 * ParentRecapCard — the shareable post-class card.
 *
 * Used in two places:
 *   1. live, right after the teacher hits End Class (in-app confirmation), and
 *   2. by the recap surface `app/montree/parent/recap/[appointmentId]/page.tsx`,
 *      fed by the parallel backend slice's `GET /api/montree/appointments/[id]/recap`.
 *
 * Deliberately a pure, server-renderable component (no hooks, no handlers) so
 * the same tree can later be rasterised into a static share image for WeChat.
 *
 * Visual source of truth: mockups/draft-a-midnight-studio.html (.card).
 */

export interface ParentRecapCardProps {
  childName: string;
  /** Class date. ISO string or Date; formatted as "Tue · 18 Aug 2026". */
  date: string | Date;
  lessonNumber: number;
  sound: string;
  wordsRead: string[];
  teacherNote: string;
  starsEarned: number;
  totalLessons?: number;
  /** Which word to highlight as the breakthrough of the class. */
  heroWordIndex?: number;
  starsTotal?: number;
  /** All-time star count across every class, for the "· N total" line. */
  starsAllTime?: number;
  teacherName?: string;
  teacherLocation?: string;
  classLengthMinutes?: number;
  /** Real trial-class QR once generated; falls back to a placeholder matrix. */
  qrImageUrl?: string;
  ctaUrl?: string;
}

function formatCardDate(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return '';
  // TODO: the school's timezone (Beijing) should drive this, not the render
  // environment's. Pass a pre-formatted string from the server if the recap API
  // already knows the school timezone.
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'short' });
  const rest = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${weekday} · ${rest}`;
}

function StarIcon({ filled, className = 'h-[17px] w-[17px]' }: { filled: boolean; className?: string }) {
  return (
    <svg
      className={className}
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

/** Small brand mark; CSS-only animation so this stays a server component. */
function SmallMark() {
  const bars = [
    { h: 9, lime: false },
    { h: 17, lime: true },
    { h: 22, lime: false },
    { h: 13, lime: true },
    { h: 19, lime: false },
  ];
  return (
    <span
      className="flex h-[26px] w-[26px] flex-none items-end justify-center gap-[2px] rounded-[8px] border border-[var(--dpl-mark-line)] bg-[var(--dpl-mark-bg)] px-1 py-[5px]"
      aria-hidden="true"
    >
      <svg viewBox="0 0 26 22" preserveAspectRatio="none" className="dpl-eq-slow h-full w-full overflow-visible">
        {bars.map((b, i) => (
          <rect
            key={i}
            className="dpl-eq-bar"
            x={i * 5.2}
            y={22 - b.h}
            width={2.5}
            height={b.h}
            rx={1.2}
            fill={b.lime ? 'var(--dpl-accent2)' : 'var(--dpl-accent)'}
          />
        ))}
      </svg>
    </span>
  );
}

/**
 * QR PLACEHOLDER. Deterministic pseudo-matrix with the three real finder
 * patterns so the card reads correctly at a glance.
 *
 * TODO: replace with the real WeChat/landing QR — either pass `qrImageUrl`
 * (rendered server-side into the recap payload) or generate from
 * `montree.xyz/dark-phonics?ref=<referral code>` using the existing
 * `lib/montree/referral/code-gen.ts` pattern. This SVG is NOT scannable.
 */
function QrPlaceholder() {
  const size = 25;
  const cells: Array<[number, number]> = [];
  const inFinder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x > size - 8 && y < 7) || (x < 7 && y > size - 8);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (inFinder(x, y)) continue;
      // cheap deterministic hash → stable across server/client renders
      if (((x * 7 + y * 13 + ((x * y) % 5)) % 3) === 0) cells.push([x, y]);
    }
  }

  const finder = (ox: number, oy: number) => (
    <g key={`f-${ox}-${oy}`}>
      <rect x={ox} y={oy} width={7} height={1} />
      <rect x={ox} y={oy + 6} width={7} height={1} />
      <rect x={ox} y={oy} width={1} height={7} />
      <rect x={ox + 6} y={oy} width={1} height={7} />
      <rect x={ox + 2} y={oy + 2} width={3} height={3} />
    </g>
  );

  return (
    <svg className="block h-full w-full" viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" aria-hidden="true">
      <g fill="currentColor">
        {finder(0, 0)}
        {finder(size - 7, 0)}
        {finder(0, size - 7)}
        {cells.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />
        ))}
      </g>
    </svg>
  );
}

const CONFETTI = [
  { size: 13, style: { left: 14, top: 60, transform: 'rotate(-16deg)' } },
  { size: 9, style: { right: 24, top: 44, transform: 'rotate(12deg)' } },
  { size: 16, style: { right: 12, top: 150, transform: 'rotate(-8deg)', opacity: 0.75 } },
  { size: 8, style: { left: 34, top: 216, transform: 'rotate(20deg)' } },
  { size: 11, style: { right: 44, bottom: 96, transform: 'rotate(-22deg)' } },
  { size: 9, style: { left: 18, bottom: 132, transform: 'rotate(6deg)' } },
  { size: 12, style: { right: 20, bottom: 26, transform: 'rotate(14deg)', opacity: 0.6 } },
];

export default function ParentRecapCard({
  childName,
  date,
  lessonNumber,
  sound,
  wordsRead,
  teacherNote,
  starsEarned,
  totalLessons = 49,
  heroWordIndex,
  starsTotal = 5,
  starsAllTime,
  teacherName = 'Teacher Tredoux',
  teacherLocation = 'Beijing',
  classLengthMinutes = 25,
  qrImageUrl,
  ctaUrl = 'montree.xyz/dark-phonics',
}: ParentRecapCardProps) {
  const flagLeftPct = (Math.max(0, Math.min(lessonNumber, totalLessons)) / totalLessons) * 100;

  return (
    <article
      className="relative flex flex-col gap-[13px] overflow-hidden rounded-[var(--dpl-r-lg)] border border-[var(--dpl-card-line)] bg-[var(--dpl-card-bg)] px-4 pb-[14px] pt-4 text-[var(--dpl-card-ink)]"
      style={{ boxShadow: 'var(--dpl-card-shadow)', fontFamily: 'var(--dpl-font-body)' }}
    >
      {/* confetti */}
      {CONFETTI.map((c, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="pointer-events-none absolute text-[var(--dpl-confetti)]"
          style={{ width: c.size, height: c.size, opacity: 'var(--dpl-confetti-op)', ...c.style }}
        >
          <StarIcon filled className="block h-full w-full" />
        </span>
      ))}

      {/* header */}
      <header className="flex items-center justify-between">
        <div
          className="flex items-center gap-2 whitespace-nowrap text-[9.5px] font-bold tracking-[0.1em]"
          style={{ fontFamily: 'var(--dpl-font-display)' }}
        >
          <SmallMark />
          <span>
            DARK PHONICS <b className="font-medium tracking-[0.08em] text-[var(--dpl-card-ink3)]">× montree</b>
          </span>
        </div>
        <span className="ml-[10px] whitespace-nowrap text-[10px] tracking-[0.04em] text-[var(--dpl-card-ink3)]">
          {formatCardDate(date)}
        </span>
      </header>

      {/* hero: child + mastered badge */}
      <div className="flex flex-col gap-[10px] rounded-[var(--dpl-r-md)] border border-[var(--dpl-card-hero-line)] bg-[var(--dpl-card-hero-bg)] px-[13px] py-3">
        <div className="flex items-center gap-[10px]">
          <span
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[var(--dpl-kid-bg)] text-[17px] font-bold text-[var(--dpl-kid-ink)]"
            style={{ fontFamily: 'var(--dpl-font-display)' }}
          >
            {childName.trim().charAt(0).toUpperCase()}
          </span>
          <span className="flex flex-col gap-px">
            <b className="text-[19px] font-bold leading-[1.1]" style={{ fontFamily: 'var(--dpl-font-display)' }}>
              {childName}
            </b>
            <span className="whitespace-nowrap text-[10px] text-[var(--dpl-card-ink3)]">
              1-on-1 live · {classLengthMinutes} min
            </span>
          </span>
        </div>
        <div className="flex flex-none items-center justify-center gap-[6px] rounded-full bg-[var(--dpl-accent2)] px-3 py-2 text-[11.5px] font-semibold tracking-[0.02em] text-[var(--dpl-ok-ink)]">
          <svg
            className="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4.5 12.6l4.8 4.8 10-11" />
          </svg>
          <span>
            Lesson {lessonNumber} · <b style={{ fontFamily: 'var(--dpl-font-display)' }}>{sound}</b> mastered
          </span>
        </div>
      </div>

      {/* words read */}
      <div className="flex flex-col gap-2">
        <div className="flex text-[9.5px] font-bold uppercase tracking-[0.16em] text-[var(--dpl-card-ink3)]">
          Words read today
        </div>
        <div className="flex gap-[6px]">
          {wordsRead.map((word, i) => {
            const hero = i === heroWordIndex;
            return (
              <span
                key={`${word}-${i}`}
                className={[
                  'flex-1 rounded-[var(--dpl-r-sm)] border px-1 py-[9px] text-center text-[16px] font-bold',
                  hero
                    ? 'border-[var(--dpl-word-on-line)] bg-[var(--dpl-word-on-bg)] text-[var(--dpl-word-on-ink)]'
                    : 'border-[var(--dpl-word-line)] bg-[var(--dpl-word-bg)] text-[var(--dpl-card-ink)]',
                ].join(' ')}
                style={{ fontFamily: 'var(--dpl-font-display)' }}
              >
                {word}
              </span>
            );
          })}
        </div>
      </div>

      {/* teacher note */}
      <div className="relative rounded-[var(--dpl-r-md)] border-l-[3px] border-l-[var(--dpl-accent2)] bg-[var(--dpl-note-bg)] py-3 pl-[15px] pr-[14px]">
        <span
          className="absolute right-3 top-[2px] text-[38px] leading-none text-[var(--dpl-note-mark)]"
          style={{ fontFamily: 'var(--dpl-font-display)' }}
          aria-hidden="true"
        >
          &ldquo;
        </span>
        <p className="pr-4 text-[13.5px] font-medium leading-[1.5]">{teacherNote}</p>
        <span className="mt-[6px] block text-[10px] tracking-[0.08em] text-[var(--dpl-card-ink3)]">
          {teacherName} · {teacherLocation}
        </span>
      </div>

      {/* progress ladder */}
      <div className="flex flex-col gap-2">
        <div className="flex text-[9.5px] font-bold uppercase tracking-[0.16em] text-[var(--dpl-card-ink3)]">
          Progress
          <span className="ml-auto text-[10.5px] font-medium normal-case tracking-[0.06em]">
            {lessonNumber} of {totalLessons} lessons
          </span>
        </div>
        <div className="relative pt-4">
          <span
            className="absolute top-0 h-[17px] w-[14px] -translate-x-1 text-[var(--dpl-accent2)]"
            style={{ left: `${flagLeftPct}%` }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 20 24" fill="none" className="h-full w-full">
              <path d="M4 23V2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M5.4 3.2l11 3.4-11 4.4z" fill="currentColor" />
            </svg>
          </span>
          <span className="flex h-4 items-end gap-[1.5px]">
            {Array.from({ length: totalLessons }, (_, i) => (
              <i
                key={i}
                className={[
                  'block flex-1 rounded-[2px]',
                  i < lessonNumber ? 'h-4 bg-[var(--dpl-rung-on)]' : 'h-[7px] bg-[var(--dpl-rung-off)]',
                ].join(' ')}
              />
            ))}
          </span>
        </div>
        <div className="mt-[5px] flex justify-between text-[9.5px] tracking-[0.04em] text-[var(--dpl-card-ink3)]">
          <span>Lesson 1</span>
          <span>Lesson {totalLessons}</span>
        </div>
      </div>

      {/* stars */}
      <div className="flex items-center gap-[9px] rounded-[var(--dpl-r-md)] border border-[var(--dpl-stars-line)] bg-[var(--dpl-stars-bg)] px-3 py-[10px]">
        <span className="flex gap-[2px] text-[var(--dpl-jar-empty)]">
          {Array.from({ length: starsTotal }, (_, i) => (
            <span key={i} className={i < starsEarned ? 'text-[var(--dpl-accent2)]' : undefined}>
              <StarIcon filled={i < starsEarned} />
            </span>
          ))}
        </span>
        <span className="text-[11px] leading-[1.3] text-[var(--dpl-card-ink2)]">
          <b className="font-bold text-[var(--dpl-card-ink)]" style={{ fontFamily: 'var(--dpl-font-display)' }}>
            {starsEarned} star{starsEarned === 1 ? '' : 's'}
          </b>{' '}
          earned today
          {typeof starsAllTime === 'number' ? ` · ${starsAllTime} total` : ''}
        </span>
      </div>

      {/* QR footer */}
      <footer className="flex items-center gap-3 border-t border-dashed border-[var(--dpl-card-line)] pt-3">
        <div className="h-[62px] w-[62px] flex-none rounded-lg border border-[var(--dpl-word-line)] bg-[var(--dpl-qr-bg)] p-[5px] text-[var(--dpl-qr-ink)]">
          {qrImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- server-generated QR
            <img src={qrImageUrl} alt="Scan for a free trial class" className="block h-full w-full" />
          ) : (
            <QrPlaceholder />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-[3px]">
          <span className="text-[13px] font-semibold tracking-[0.04em] text-[var(--dpl-card-ink)]">
            扫码领取免费体验课
          </span>
          <span className="text-[10.5px] text-[var(--dpl-card-ink3)]">
            Free trial class · {totalLessons}-lesson phonics program
          </span>
          <span
            className="text-[10px] font-bold tracking-[0.1em] text-[var(--dpl-accent-text)]"
            style={{ fontFamily: 'var(--dpl-font-display)' }}
          >
            {ctaUrl}
          </span>
        </div>
      </footer>
    </article>
  );
}
