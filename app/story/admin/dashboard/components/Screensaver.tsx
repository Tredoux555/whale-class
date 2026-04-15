'use client';

/**
 * Screensaver — secret decoy overlay for the Story Admin dashboard.
 *
 * When the admin tab loses visibility (user switches apps), we arm a flag.
 * When the tab becomes visible again, we slide this fake Montree classroom
 * dashboard over the top of the real admin UI. Tapping the MaoMao card
 * dismisses the overlay and reveals the real dashboard again.
 *
 * To anyone shoulder-surfing, it looks like a benign Montessori roster.
 */

import { useEffect, useState } from 'react';

const STUDENTS = [
  'Amy', 'Austin', 'Eric', 'Hayden', 'Henry',
  'Jimmy', 'Joey', 'Kayla', 'Kevin', 'Leo',
  'Lucky', 'MaoMao', 'MingXi', 'Molly', 'Rachel',
  'Ryan', 'Segina', 'Stella', 'Yo-yo', 'YueZe',
];

const UNLOCK_NAME = 'MaoMao';

interface Props {
  onUnlock: () => void;
}

export function Screensaver({ onUnlock }: Props) {
  // Brief fade-in on mount so the transition feels intentional, not jarring.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto"
      style={{
        background: 'linear-gradient(to bottom, #d1fae5, #ffffff)',
        opacity: entered ? 1 : 0,
        transition: 'opacity 200ms ease-out',
      }}
    >
      {/* Fake Montree header */}
      <div
        className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3"
        style={{
          background: 'linear-gradient(to right, #10b981, #14b8a6)',
          paddingTop: 'max(12px, env(safe-area-inset-top, 12px))',
        }}
      >
        <span className="text-2xl">🌳</span>
        <span className="text-white font-semibold text-lg truncate flex-1">Whale Cla…</span>
        <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1 text-white text-sm font-medium">
          <span>Tredoux</span>
          <span className="text-xs">▾</span>
        </div>
        <button
          className="w-9 h-9 rounded-full bg-slate-800/80 flex items-center justify-center text-base"
          aria-label="camera"
          onClick={(e) => e.preventDefault()}
        >
          <span>中文</span>
        </button>
        <button
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg"
          aria-label="capture"
          onClick={(e) => e.preventDefault()}
        >
          📸
        </button>
        <button
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg"
          aria-label="messages"
          onClick={(e) => e.preventDefault()}
        >
          ✉️
        </button>
        <button
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-xl"
          aria-label="menu"
          onClick={(e) => e.preventDefault()}
        >
          ⋯
        </button>
      </div>

      {/* Student grid */}
      <div className="grid grid-cols-5 gap-3 p-3">
        {STUDENTS.map((name) => {
          const initial = name.charAt(0).toUpperCase();
          const isUnlock = name === UNLOCK_NAME;
          return (
            <button
              key={name}
              onClick={() => {
                if (isUnlock) onUnlock();
              }}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center py-6 px-2 active:scale-95 transition-transform"
              // No visual indicator that MaoMao is special — the whole point
              // is that only Tredoux knows. Every card feels identical.
              style={{ minHeight: 130 }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-semibold mb-2"
                style={{
                  background: 'linear-gradient(135deg, #14b8a6, #10b981)',
                }}
              >
                {initial}
              </div>
              <div className="text-slate-800 text-sm font-medium text-center">{name}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
