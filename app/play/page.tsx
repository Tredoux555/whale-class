// app/play/page.tsx
// Whale Class · Phonics at Home — the PUBLIC, parent-facing index on
// teacherpotato.xyz. No login, no session, nothing to install: a parent scans
// a QR code on a phone and lands here.
//
// REBUILT 2026-08-20. This page used to list five sound games with Chinese
// copy. It now serves the DARK PHONICS curriculum: one week per lesson, 49 of
// them, each linking to /play/week/<n> — the at-home page for that lesson.
// ENGLISH ONLY, on purpose (Tredoux, Aug 20 2026).
//
// 🚨 SERVER COMPONENT ON PURPOSE. The lock/unlock decision is made from the
// SERVER's clock, not the phone's, so a child cannot open next week's lesson
// by changing the device date. Keep this file free of 'use client' and of any
// hook — interactivity belongs in app/play/_components/.
//
// 🚨 NOTHING TO EDIT HERE WHEN THE CURRICULUM CHANGES. Weeks are derived from
// lib/montree/dark-phonics/lessons.ts via lib/games/weekly-schedule.ts.
//
// WHY NOT 49 CARDS: this page is opened on a phone, often on mobile data. It
// renders the current week loud, a handful of already-opened weeks and the
// next few locked ones as cards, and compresses everything else into one line.

import Link from 'next/link';
import {
  WEEKS,
  TOTAL_WEEKS,
  allWeekInfo,
  currentWeekNumber,
  formatUnlockDate,
  type WeekInfo,
} from '@/lib/games/weekly-schedule';

// A parent may sit on this page across a Wednesday-midnight boundary, and the
// unlock instant must be evaluated per request rather than baked into a
// statically-rendered HTML file at build time.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Whale Class · Phonics at Home',
  description:
    'One new sound every week — the song, the words and the books your child already knows from class.',
};

/** How many already-opened weeks get a full card before the list compresses. */
const RICH_PAST_WEEKS = 6;
/** How many not-yet-open weeks are shown as dated locked cards. */
const LOCKED_PREVIEW_WEEKS = 5;

/** The round badge that carries the week's sound. Long teaching labels
 *  ('minimal pairs', 'th (voiceless)') get smaller type so they still fit. */
function SoundBadge({ sound, tone }: { sound: string; tone: 'loud' | 'soft' | 'locked' }) {
  const size =
    sound.length <= 2 ? 'text-3xl' : sound.length <= 5 ? 'text-lg' : 'text-[10px] leading-tight';
  const skin =
    tone === 'loud'
      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md'
      : tone === 'soft'
        ? 'bg-blue-50 text-blue-700 border border-blue-100'
        : 'bg-slate-100 text-slate-400 border border-slate-200';
  return (
    <span
      className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center text-center px-1 font-black ${size} ${skin}`}
      aria-hidden="true"
    >
      {sound}
    </span>
  );
}

/** A week that has opened and is NOT the current one — tappable, quieter. */
function OpenWeekCard({ w }: { w: WeekInfo }) {
  return (
    <Link
      href={`/play/week/${w.week}`}
      className="flex items-center gap-3 rounded-2xl bg-white border border-slate-200 shadow-sm px-4 py-3 active:scale-[0.99] transition-transform"
    >
      <SoundBadge sound={w.sound} tone="soft" />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-blue-500">
          Week {w.week}
        </span>
        <span className="block font-bold text-slate-900 leading-snug">{w.title}</span>
        <span className="block text-sm text-slate-500 truncate">{w.catchphrase}</span>
      </span>
      <span className="text-blue-300 text-xl shrink-0">›</span>
    </Link>
  );
}

/** A week that has NOT opened. Deliberately carries no lesson content — not
 *  the title, not the sound, not the catchphrase — only its date. The week
 *  page gates the same way; the two surfaces must agree. */
function LockedWeekCard({ w }: { w: WeekInfo }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/60 border border-dashed border-slate-200 px-4 py-3">
      <span
        className="w-12 h-12 shrink-0 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl"
        aria-hidden="true"
      >
        🔒
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-slate-500 leading-snug">Week {w.week}</span>
        <span className="block text-sm text-slate-400">
          {w.unlockDate ? `Opens ${formatUnlockDate(w.unlockDate)}` : 'Opens soon'}
        </span>
      </span>
    </div>
  );
}

export default function PlayPage() {
  const now = new Date();
  const weeks = allWeekInfo(now);
  const currentNumber = currentWeekNumber(WEEKS, now);

  const current = weeks.find((w) => w.week === currentNumber) ?? weeks[0];
  const opened = weeks.filter((w) => w.unlocked && w.week !== current?.week);
  // Newest first — the week a parent finished last is the one they may want again.
  const openedNewestFirst = [...opened].sort((a, b) => b.week - a.week);
  const richPast = openedNewestFirst.slice(0, RICH_PAST_WEEKS);
  const compactPast = openedNewestFirst.slice(RICH_PAST_WEEKS);

  const locked = weeks.filter((w) => !w.unlocked);
  const lockedPreview = locked.slice(0, LOCKED_PREVIEW_WEEKS);
  const lockedRemaining = locked.length - lockedPreview.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
      {/* Header — the same wash as the Whale Class homepage */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
              <span className="text-3xl">🐋</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight leading-snug">Phonics at Home</h1>
              <p className="text-sm text-blue-100">Whale Class · Dark Phonics</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-blue-50/90 leading-relaxed">
            One new sound every week — the song your child sings in class, the words they are
            learning, and the books they can already read to you. Ten minutes is plenty.
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-12 space-y-8">
        {/* ── THIS WEEK — the loudest thing on the page ───────────────────── */}
        {current && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-2">
              This week
            </h2>
            <div className="rounded-3xl bg-white border-2 border-blue-300 shadow-lg ring-4 ring-blue-100 overflow-hidden">
              <div className="px-5 pt-5 pb-4 flex items-start gap-4">
                <SoundBadge sound={current.sound} tone="loud" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-500">
                    Week {current.week} of {TOTAL_WEEKS}
                  </p>
                  <h3 className="text-2xl font-black text-slate-900 leading-tight">
                    {current.title}
                  </h3>
                  <p className="text-base text-slate-600 mt-1">{current.catchphrase}</p>
                </div>
              </div>
              <div className="px-5 pb-5">
                <Link
                  href={`/play/week/${current.week}`}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-5 py-4 text-lg shadow-md active:scale-[0.99] transition-transform"
                >
                  Play this week <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── ALREADY OPEN — play them again, any time ─────────────────────── */}
        {richPast.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-2">
              Play again
            </h2>
            <div className="space-y-3">
              {richPast.map((w) => (
                <OpenWeekCard key={w.week} w={w} />
              ))}
            </div>

            {/* Everything older, compressed to one tappable line each. */}
            {compactPast.length > 0 && (
              <div className="mt-3 rounded-2xl bg-white/70 border border-slate-200 px-4 py-3">
                <p className="text-xs font-semibold text-slate-500 mb-2">
                  Earlier weeks ({compactPast.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {compactPast.map((w) => (
                    <Link
                      key={w.week}
                      href={`/play/week/${w.week}`}
                      className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-sm font-semibold text-blue-700"
                    >
                      {w.week}. {w.sound}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── STILL TO COME ─────────────────────────────────────────────────── */}
        {lockedPreview.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
              Coming up
            </h2>
            <div className="space-y-2">
              {lockedPreview.map((w) => (
                <LockedWeekCard key={w.week} w={w} />
              ))}
            </div>
            {lockedRemaining > 0 && (
              <p className="mt-3 text-sm text-slate-400 text-center">
                …and {lockedRemaining} more weeks — one new sound every week, all the way to week{' '}
                {TOTAL_WEEKS}.
              </p>
            )}
          </section>
        )}
      </main>

      {/* Footer charm — the potato and the whale, and the promise. */}
      <footer className="pb-10 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-3xl mb-2" aria-hidden="true">
            🥔 🐋
          </div>
          <p className="text-sm font-medium text-slate-500">A new sound every week.</p>
          <p className="text-xs text-slate-400">
            Whale Class · Dark Phonics · {TOTAL_WEEKS} weeks
          </p>
        </div>
      </footer>
    </div>
  );
}
