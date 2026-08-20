// lib/games/weekly-schedule.ts
//
// ═══════════════════════════════════════════════════════════════════════════
// HOW TO ADD / POLISH A WEEK
// ═══════════════════════════════════════════════════════════════════════════
//
// This is THE ONE FILE you edit each week. The public parent page at /play
// reads it and nothing else — no CMS, no database, no deploy-time config.
//
// TO ADD A WEEK
//   1. Copy the last entry of WEEKS below.
//   2. Bump `week` by 1. The unlock date is computed for you (see UNLOCK
//      MATHS): every week after the anchor opens exactly 7 days later.
//   3. Fill in `title` (English) and `zhTitle` (Chinese — shown FIRST on the
//      page; parents read the Chinese, the English is the smaller echo).
//   4. Point each game's `href` at a real route. Open it yourself on a phone
//      before you ship — these links go to parents, not to teachers.
//   5. Drop the `note` field, or write one sentence of parent-facing coaching
//      ("Play in the car — no screens needed"). Keep it short.
//
// TO POLISH A WEEK
//   Change the title/labels/emoji freely at any time. Editing an ALREADY
//   UNLOCKED week changes what parents see immediately, so re-read your copy.
//
// UNLOCK MATHS (the only rule)
//   • Weeks 1 and 2 are open from launch — parents arriving cold have
//     something to play on day one.
//   • Week 3 opens at ANCHOR_UNLOCK_UTC (2026-08-27 00:00 Asia/Shanghai).
//   • Week N > 3 opens at ANCHOR + (N - 3) × 7 days.
//   So you never set a date by hand — you only ever append a week.
//
// TO SHIFT THE WHOLE SCHEDULE (a holiday, a late start)
//   Change ANCHOR_UNLOCK_UTC and every later week slides with it. Note it is
//   a UTC instant: Asia/Shanghai is UTC+8 year-round (no daylight saving), so
//   midnight Shanghai = 16:00 UTC the previous day.
// ═══════════════════════════════════════════════════════════════════════════

/** One tappable game link inside a week. */
export interface WeeklyGame {
  /** English label — the smaller, secondary line. */
  label: string;
  /** Chinese label — shown first, this is what parents actually scan. */
  zhLabel: string;
  /** Route on this host, e.g. '/games/sound-games/beginning'. */
  href: string;
  emoji: string;
}

/** One week of the parent-facing rotation. */
export interface WeeklyWeek {
  /** 1-based. Must be unique and ascending through WEEKS. */
  week: number;
  title: string;
  zhTitle: string;
  games: WeeklyGame[];
  /** Optional one-line coaching note shown under the games. */
  note?: string;
}

// ── Unlock anchor ──────────────────────────────────────────────────────────
/** The week whose unlock instant is pinned by ANCHOR_UNLOCK_UTC. */
export const ANCHOR_WEEK = 3;

/**
 * 2026-08-27 00:00 in Asia/Shanghai, written as the UTC instant it equals.
 * Shanghai is UTC+8 with no daylight saving, so midnight there is 16:00 UTC
 * on the previous day — that is why this reads 08-26T16:00Z, not 08-27.
 */
export const ANCHOR_UNLOCK_UTC = '2026-08-26T16:00:00.000Z';

/** Weeks before the anchor are open from launch. */
export const ALWAYS_OPEN_BEFORE_WEEK = ANCHOR_WEEK;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** The IANA zone every parent-facing date on /play is formatted in. */
export const SCHEDULE_TZ = 'Asia/Shanghai';

/**
 * The instant a week opens, or `null` for the launch weeks (1 and 2), which
 * have no unlock date because they were never locked.
 */
export function unlockDateFor(week: number): Date | null {
  if (week < ALWAYS_OPEN_BEFORE_WEEK) return null;
  const anchor = new Date(ANCHOR_UNLOCK_UTC).getTime();
  return new Date(anchor + (week - ANCHOR_WEEK) * WEEK_MS);
}

/** Has this week opened yet? Pass `now` explicitly so callers stay testable. */
export function isUnlocked(week: number, now: Date = new Date()): boolean {
  const opensAt = unlockDateFor(week);
  if (!opensAt) return true;
  return now.getTime() >= opensAt.getTime();
}

/**
 * "Aug 27" — the unlock day as a parent in Shanghai experiences it. Always
 * formatted in SCHEDULE_TZ, never in the server's zone, so a container
 * running on UTC does not show yesterday's date.
 */
export function formatUnlockDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: SCHEDULE_TZ,
  }).format(date);
}

/**
 * The newest week that has opened — the one to highlight as "this week".
 * Falls back to week 1 before anything has unlocked.
 */
export function currentWeekNumber(weeks: WeeklyWeek[], now: Date = new Date()): number {
  const open = weeks.filter((w) => isUnlocked(w.week, now));
  if (open.length === 0) return weeks[0]?.week ?? 1;
  return open.reduce((max, w) => (w.week > max ? w.week : max), open[0].week);
}

// ── The rotation ───────────────────────────────────────────────────────────
// Weeks 1-5 walk the five sound games in pedagogical order: hear the FIRST
// sound, then the LAST, then the (hardest) MIDDLE vowel, then push sounds
// together (blending), then pull a word apart (segmenting). That order is the
// point — do not reshuffle it without a reason.
export const WEEKS: WeeklyWeek[] = [
  {
    week: 1,
    title: 'First Sounds',
    zhTitle: '第一个音',
    games: [
      {
        label: 'I Spy Beginning',
        zhLabel: '我猜开头音',
        href: '/games/sound-games/beginning',
        emoji: '👂',
      },
    ],
    note: '在家玩：说一个字，让孩子猜第一个音。 Play anywhere — no screen needed.',
  },
  {
    week: 2,
    title: 'Last Sounds',
    zhTitle: '最后一个音',
    games: [
      {
        label: 'I Spy Ending',
        zhLabel: '我猜结尾音',
        href: '/games/sound-games/ending',
        emoji: '🔚',
      },
    ],
    note: '结尾音比开头音难一点，慢慢来。 Slower is better here.',
  },
  {
    week: 3,
    title: 'The Middle Sound',
    zhTitle: '中间的音',
    games: [
      {
        label: 'Middle Sound Match',
        zhLabel: '找中间音',
        href: '/games/sound-games/middle',
        emoji: '🎯',
      },
    ],
    note: '中间的元音最难听出来 — 拉长它：c-aaa-t。 Stretch the vowel.',
  },
  {
    week: 4,
    title: 'Putting Sounds Together',
    zhTitle: '把音连起来',
    games: [
      {
        label: 'Sound Blending',
        zhLabel: '拼音游戏',
        href: '/games/sound-games/blending',
        emoji: '🔗',
      },
    ],
    note: '/c/ /a/ /t/ → cat! 这就是阅读的开始。 This is reading, beginning.',
  },
  {
    week: 5,
    title: 'Breaking Words Apart',
    zhTitle: '把词拆开',
    games: [
      {
        label: 'Sound Segmenting',
        zhLabel: '拆音游戏',
        href: '/games/sound-games/segmenting',
        emoji: '✂️',
      },
    ],
    note: 'cat → /c/ /a/ /t/。拆词是写字的开始。 Segmenting is where writing starts.',
  },
  // ── TEMPLATE / "coming soon" week ────────────────────────────────────────
  // A week with an empty `games` array renders as a teaser card even once its
  // date passes, so the page never dead-ends. Copy this block, bump `week`,
  // and fill in `games` when the real thing is ready.
  {
    week: 6,
    title: 'Coming Soon',
    zhTitle: '敬请期待',
    games: [],
    note: '新游戏正在准备中。 A new game is on the way!',
  },
];

export default WEEKS;
