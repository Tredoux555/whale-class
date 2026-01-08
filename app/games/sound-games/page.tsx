// app/games/sound-games/page.tsx
// Sound Games Hub - MAINTENANCE MODE
'use client';

import React from 'react';
import Link from 'next/link';

// MAINTENANCE MODE - Set to false when audio is fixed
const MAINTENANCE_MODE = true;

export default function SoundGamesHub() {
  if (MAINTENANCE_MODE) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col">
        {/* Header */}
        <header className="p-4">
          <Link
            href="/games"
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <span className="text-2xl">←</span>
            <span className="text-lg">Back to Games</span>
          </Link>
        </header>

        {/* Maintenance Message */}
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="text-8xl mb-6">🔧</div>
            <h1
              className="text-4xl font-bold text-white mb-4"
              style={{ fontFamily: 'Comic Sans MS, cursive' }}
            >
              Upgrading Sound Games
            </h1>
            <p className="text-xl text-white/80 mb-6">
              We're making the sounds even better!
            </p>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <p className="text-white/90 mb-4">
                🎧 Recording crystal-clear audio
              </p>
              <p className="text-white/90 mb-4">
                ✨ Polishing the games
              </p>
              <p className="text-amber-300 font-semibold">
                Check back soon!
              </p>
            </div>
            
            <Link
              href="/games"
              className="mt-8 inline-block bg-white/20 hover:bg-white/30 text-white px-8 py-4 rounded-full font-semibold transition-colors"
            >
              Play Other Games →
            </Link>
          </div>
        </main>

        {/* Decorative */}
        <div className="fixed bottom-4 left-4 text-6xl opacity-20 animate-pulse">
          🔊
        </div>
        <div className="fixed bottom-4 right-4 text-6xl opacity-20 animate-bounce">
          🎵
        </div>
      </div>
    );
  }

  // Original game content would go here when MAINTENANCE_MODE = false
  return null;
}
