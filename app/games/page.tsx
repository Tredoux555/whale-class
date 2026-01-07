// app/games/page.tsx
// Main games hub page - All English reading games

'use client';

import React from 'react';
import Link from 'next/link';

const GAMES = [
  // Sound Games (ElevenLabs audio) - links to dedicated page
  {
    id: 'sound-games',
    name: 'Sound Games',
    description: 'Train your ears - purely auditory!',
    icon: '👂',
    color: '#f59e0b',
    minAge: 2,
  },
  // Letter recognition games
  {
    id: 'letter-sound',
    name: 'Letter Sounds',
    description: 'Hear a sound, find the letter!',
    icon: '🔊',
    color: '#ef4444',
    minAge: 2,
  },
  {
    id: 'letter-trace',
    name: 'Letter Trace',
    description: 'Practice writing letters!',
    icon: '✏️',
    color: '#f97316',
    minAge: 2,
  },
  {
    id: 'letter-match',
    name: 'Big to Small',
    description: 'Match uppercase to lowercase!',
    icon: '🔠',
    color: '#06b6d4',
    minAge: 3,
  },
  // Word building games
  {
    id: 'word-building',
    name: 'Word Building',
    description: 'Build words letter by letter!',
    icon: '🔤',
    color: '#eab308',
    minAge: 3,
  },
  {
    id: 'picture-match',
    name: 'Picture Match',
    description: 'Match pictures to words!',
    icon: '🖼️',
    color: '#22c55e',
    minAge: 3,
  },
  {
    id: 'missing-letter',
    name: 'Missing Letter',
    description: 'Find the missing letter!',
    icon: '❓',
    color: '#3b82f6',
    minAge: 4,
  },
  // Fluency games
  {
    id: 'sight-flash',
    name: 'Sight Flash',
    description: 'Remember sight words quickly!',
    icon: '⚡',
    color: '#8b5cf6',
    minAge: 4,
  },
  {
    id: 'sentence-match',
    name: 'Sentence Match',
    description: 'Match sentences to pictures!',
    icon: '🎯',
    color: '#ec4899',
    minAge: 4,
  },
  {
    id: 'sentence-build',
    name: 'Sentence Build',
    description: 'Put words in order!',
    icon: '📝',
    color: '#a855f7',
    minAge: 5,
  },
];

export default function GamesPage() {
  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 p-4"
      style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white drop-shadow-lg mb-2">
            🎮 English Games
          </h1>
          <p className="text-white/90 text-lg">
            Learn English while having fun!
          </p>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GAMES.map((game) => (
            <Link
              key={game.id}
              href={`/games/${game.id}`}
              className="block p-6 bg-white rounded-2xl shadow-xl hover:scale-[1.02] hover:shadow-2xl transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ backgroundColor: game.color + '20' }}
                >
                  {game.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800">{game.name}</h3>
                  <p className="text-gray-500 text-sm">{game.description}</p>
                  <p className="text-xs mt-1" style={{ color: game.color }}>
                    Ages {game.minAge}+
                  </p>
                </div>
                <div className="text-3xl text-gray-300">→</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-block px-8 py-3 bg-white/20 text-white rounded-xl font-bold hover:bg-white/30 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
