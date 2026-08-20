// app/play/page.tsx
// Whale Class · Weekly Games — the PUBLIC, parent-facing page on
// teacherpotato.xyz. No login, no session, nothing to install: a parent scans
// a QR code on a phone and lands here.
//
// 🚨 SERVER COMPONENT ON PURPOSE. The lock/unlock decision is made from the
// server's clock, not the phone's, so a child cannot open next week's game by
// changing the device date. Keep this file free of 'use client' and of any
// hook — if you need interactivity, put it in a small child component.
//
// 🚨 TO CHANGE WHAT PARENTS SEE, EDIT lib/games/weekly-schedule.ts — not this
// file. That module carries the HOW TO ADD/POLISH A WEEK instructions.
//
// Styling follows the Whale Class homepage (app/page.tsx): slate-50→blue-50
// page wash under a blue-600→indigo-600 header. Chinese first, English second.

import Link from 'next/link';
import {
  WEEKS,
  isUnlocked,
  unlockDateFor,
  formatUnlockDate,
  currentWeekNumber,
} from '@/lib/games/weekly-schedule';

// A parent may sit on this page across a Monday-midnight boundary, and the
// unlock instant must be evaluated per request rather than baked into a
// statically-rendered HTML file at build time.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Whale Class · Weekly Games 每周亲子游戏',
  description:
    'A new listening game every week — play together at home. 每周一个新的亲子游戏。',
};

export default function PlayPage() {
  const now = new Date();
  const thisWeek = currentWeekNumber(WEEKS, now);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
      {/* Header — same wash as the Whale Class homepage */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
              <span className="text-3xl">🐋</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight leading-snug">
                每周亲子游戏
              </h1>
              <p className="text-sm text-blue-100">Whale Class · Weekly Games</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-blue-50/90 leading-relaxed">
            每周一个新的听力游戏，和孩子一起玩。
            <br />
            <span className="text-blue-100/80">
              A new listening game every week — play together.
            </span>
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-12 space-y-4">
        {WEEKS.map((w) => {
          const unlocked = isUnlocked(w.week, now);
          const opensAt = unlockDateFor(w.week);
          const isCurrent = unlocked && w.week === thisWeek;

          return (
            <section
              key={w.week}
              className={`rounded-2xl border overflow-hidden transition-shadow ${
                isCurrent
                  ? 'bg-white border-blue-300 shadow-lg ring-2 ring-blue-200'
                  : unlocked
                    ? 'bg-white border-gray-200 shadow-sm'
                    : 'bg-white/60 border-gray-200 border-dashed'
              }`}
            >
              {/* Week heading */}
              <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                    第 {w.week} 周 · Week {w.week}
                  </p>
                  <h2
                    className={`text-lg font-bold leading-snug ${
                      unlocked ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {w.zhTitle}
                  </h2>
                  <p
                    className={`text-sm ${unlocked ? 'text-gray-500' : 'text-gray-400'}`}
                  >
                    {w.title}
                  </p>
                </div>

                {isCurrent && (
                  <span className="shrink-0 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                    本周 This week
                  </span>
                )}
                {!unlocked && (
                  <span className="shrink-0 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold whitespace-nowrap">
                    🔒 解锁 Opens{opensAt ? ` ${formatUnlockDate(opensAt)}` : ''}
                  </span>
                )}
              </div>

              {/* Games — tappable only once the week has opened */}
              <div className="px-5 pb-4 space-y-2">
                {unlocked && w.games.length > 0 &&
                  w.games.map((g) => (
                    <Link
                      key={g.href}
                      href={g.href}
                      className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 px-4 py-3 active:scale-[0.99] transition-transform"
                    >
                      <span className="text-3xl shrink-0">{g.emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-gray-900 leading-snug">
                          {g.zhLabel}
                        </span>
                        <span className="block text-sm text-gray-500">{g.label}</span>
                      </span>
                      <span className="text-blue-400 text-xl shrink-0">›</span>
                    </Link>
                  ))}

                {/* Locked: show the shape of the week, but never the link. */}
                {!unlocked &&
                  w.games.map((g) => (
                    <div
                      key={g.href}
                      className="flex items-center gap-3 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3"
                    >
                      <span className="text-3xl shrink-0 grayscale opacity-40">
                        {g.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-gray-400 leading-snug">
                          {g.zhLabel}
                        </span>
                        <span className="block text-sm text-gray-400">{g.label}</span>
                      </span>
                      <span className="text-gray-300 text-lg shrink-0">🔒</span>
                    </div>
                  ))}

                {/* A week with no games yet — the "coming soon" teaser. */}
                {w.games.length === 0 && (
                  <div className="rounded-xl bg-gray-50 border border-dashed border-gray-200 px-4 py-4 text-center">
                    <span className="text-2xl block mb-1">✨</span>
                    <span className="text-sm text-gray-400">敬请期待 Coming soon</span>
                  </div>
                )}

                {w.note && (
                  <p
                    className={`text-xs leading-relaxed pt-1 ${
                      unlocked ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    {w.note}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </main>

      {/* Footer charm — the potato and the whale, and the promise. */}
      <footer className="pb-10 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-3xl mb-2" aria-hidden="true">
            🥔 🐋
          </div>
          <p className="text-sm font-medium text-gray-500">
            每周都有新游戏！
          </p>
          <p className="text-xs text-gray-400">New games every week!</p>
        </div>
      </footer>
    </div>
  );
}
