// app/games/page.tsx
// Main game hub - publicly accessible

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { GAMES, PHASE_INFO, getGamesForPhase } from '@/lib/games/game-config';
import { GamePhase } from '@/lib/games/types';

export default function GamesHub() {
  const [selectedPhase, setSelectedPhase] = useState<GamePhase>('letters');
  
  const phases = Object.entries(PHASE_INFO).sort((a, b) => a[1].order - b[1].order);
  const availableGames = getGamesForPhase(selectedPhase);

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500"
      style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
    >
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-white/80 hover:text-white text-2xl">
                ←
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white drop-shadow-lg">
                  🎮 Learning Games
                </h1>
                <p className="text-white/80 text-sm">Fun English practice!</p>
              </div>
            </div>
            <div className="text-5xl animate-bounce">
              🌟
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Phase Selector */}
        <div className="mb-8">
          <h2 className="text-white text-xl font-bold mb-4 drop-shadow">
            Choose Your Level:
          </h2>
          <div className="flex flex-wrap gap-3">
            {phases.map(([phase, info]) => (
              <button
                key={phase}
                onClick={() => setSelectedPhase(phase as GamePhase)}
                className={`px-5 py-3 rounded-2xl font-bold text-lg transition-all transform hover:scale-105 ${
                  selectedPhase === phase
                    ? 'bg-white text-gray-800 shadow-xl scale-105'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <span className="mr-2">{info.icon}</span>
                {info.name}
              </button>
            ))}
          </div>
        </div>

        {/* Current Phase Info */}
        <div className="bg-white/20 backdrop-blur rounded-3xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="text-6xl">
              {PHASE_INFO[selectedPhase].icon}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">
                {PHASE_INFO[selectedPhase].name}
              </h3>
              <p className="text-white/80">
                {getPhaseDescription(selectedPhase)}
              </p>
            </div>
          </div>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {availableGames.map((game) => (
            <Link
              key={game.id}
              href={`/games/${game.id}?phase=${selectedPhase}`}
              className="group"
            >
              <div 
                className="bg-white rounded-3xl p-6 shadow-xl transition-all transform hover:scale-105 hover:shadow-2xl"
                style={{ borderBottom: `6px solid ${game.color}` }}
              >
                <div 
                  className="text-6xl mb-4 transition-transform group-hover:scale-110"
                  style={{ filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.2))' }}
                >
                  {game.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {game.name}
                </h3>
                <p className="text-gray-500 text-sm">
                  {game.description}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span 
                    className="px-3 py-1 rounded-full text-white text-xs font-bold"
                    style={{ backgroundColor: game.color }}
                  >
                    Age {game.minAge}+
                  </span>
                  <span className="text-2xl group-hover:translate-x-2 transition-transform">
                    →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {availableGames.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎮</div>
            <p className="text-white text-xl">
              No games available for this level yet!
            </p>
            <p className="text-white/70">
              Try another level or check back soon.
            </p>
          </div>
        )}

        {/* Fun decorations */}
        <div className="fixed bottom-4 left-4 text-6xl opacity-20 animate-pulse">
          ⭐
        </div>
        <div className="fixed bottom-4 right-4 text-6xl opacity-20 animate-bounce">
          🎈
        </div>
      </main>
    </div>
  );
}

function getPhaseDescription(phase: GamePhase): string {
  const descriptions: Record<GamePhase, string> = {
    'letters': 'Learn letter sounds and shapes - the building blocks of reading!',
    'pink-series': 'Practice 3-letter words like cat, dog, and sun!',
    'blue-series': 'Words with blends like stop, flag, and tree!',
    'green-series': 'Long vowels and special sounds like rain and moon!',
    'sight-words': 'Common words you need to know by sight!',
    'sentences': 'Put it all together and read sentences!',
  };
  return descriptions[phase];
}
