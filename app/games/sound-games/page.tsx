// app/games/sound-games/page.tsx
// Sound Games Hub - Purely Auditory Games for Phonemic Awareness
// NO LETTERS SHOWN - trains the ear only

'use client';

import React from 'react';
import Link from 'next/link';

interface GameCard {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  href: string;
  description: string;
  order: number;
}

const SOUND_GAMES: GameCard[] = [
  {
    id: 'beginning-sounds',
    title: 'I Spy Beginning',
    subtitle: 'What starts with /m/?',
    icon: '👂',
    color: 'from-amber-400 to-orange-500',
    href: '/games/sound-games/beginning',
    description: 'Listen for the first sound in words',
    order: 1,
  },
  {
    id: 'ending-sounds',
    title: 'I Spy Ending',
    subtitle: 'What ends with /t/?',
    icon: '🔚',
    color: 'from-emerald-400 to-teal-500',
    href: '/games/sound-games/ending',
    description: 'Listen for the last sound in words',
    order: 2,
  },
  {
    id: 'middle-sounds',
    title: 'Middle Sound Match',
    subtitle: 'c-AAA-t has /a/ inside!',
    icon: '🎯',
    color: 'from-violet-400 to-purple-500',
    href: '/games/sound-games/middle',
    description: 'Find the vowel sound in the middle',
    order: 3,
  },
  {
    id: 'blending',
    title: 'Sound Blending',
    subtitle: '/c/ /a/ /t/ → cat!',
    icon: '🔗',
    color: 'from-blue-400 to-indigo-500',
    href: '/games/sound-games/blending',
    description: 'Put sounds together to make words',
    order: 4,
  },
  {
    id: 'segmenting',
    title: 'Sound Segmenting',
    subtitle: 'cat → /c/ /a/ /t/',
    icon: '✂️',
    color: 'from-pink-400 to-rose-500',
    href: '/games/sound-games/segmenting',
    description: 'Break words into their sounds',
    order: 5,
  },
];

export default function SoundGamesHub() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <Link
          href="/games"
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <span className="text-2xl">←</span>
          <span className="text-lg">Back to Games</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pb-12">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="text-8xl mb-4 animate-bounce">👂</div>
          <h1
            className="text-4xl md:text-5xl font-bold text-white mb-4"
            
          >
            Sound Games
          </h1>
          <p className="text-xl text-white/80 max-w-lg mx-auto mb-4">
            Train your ears to hear the sounds in words!
            <br />
            <span className="text-amber-300 font-semibold">
              Listen carefully - no letters here!
            </span>
          </p>
          <div className="inline-flex gap-3">
            <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold text-white">5</div>
              <div className="text-xs text-white/70">Games</div>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold text-white">3</div>
              <div className="text-xs text-white/70">Phases</div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-8 border border-white/20">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎧</span>
            <div>
              <p className="text-white font-semibold">
                Purely Auditory Training
              </p>
              <p className="text-white/70 text-sm">
                These games train the ear to hear individual sounds - the
                foundation of reading!
              </p>
            </div>
          </div>
        </div>

        {/* Game Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SOUND_GAMES.sort((a, b) => a.order - b.order).map((game, index) => (
            <Link
              key={game.id}
              href={game.href}
              className="group relative"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div
                className={`
                  bg-gradient-to-br ${game.color}
                  rounded-3xl p-6 shadow-xl
                  transform transition-all duration-300
                  hover:scale-105 hover:shadow-2xl
                  border-4 border-white/30
                `}
              >
                {/* Order Badge */}
                <div className="absolute -top-3 -left-3 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <span
                    className="text-xl font-bold text-gray-800"
                    
                  >
                    {game.order}
                  </span>
                </div>

                {/* Game Icon */}
                <div className="text-6xl mb-4 transform group-hover:scale-110 transition-transform">
                  {game.icon}
                </div>

                {/* Game Title */}
                <h2
                  className="text-2xl font-bold text-white mb-1"
                  
                >
                  {game.title}
                </h2>

                {/* Subtitle */}
                <p
                  className="text-white/90 text-lg italic mb-3"
                  
                >
                  "{game.subtitle}"
                </p>

                {/* Description */}
                <p className="text-white/80 text-sm">{game.description}</p>

                {/* Play Button */}
                <div className="mt-4 flex items-center gap-2 text-white">
                  <span className="text-2xl">▶️</span>
                  <span className="font-semibold">Play Now</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Teaching Order Info */}
        <div className="mt-12 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <h3
            className="text-2xl font-bold text-white mb-4"
            
          >
            📚 Teaching Order
          </h3>
          <div className="space-y-3 text-white/90">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center font-bold">
                1
              </span>
              <span>
                <strong>Beginning Sounds</strong> - Master this first (2-4
                weeks)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center font-bold">
                2
              </span>
              <span>
                <strong>Ending Sounds</strong> - After beginning sounds are
                solid
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 bg-violet-500 rounded-full flex items-center justify-center font-bold">
                3
              </span>
              <span>
                <strong>Middle Sounds</strong> - Vowels are hardest to isolate
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center font-bold">
                4
              </span>
              <span>
                <strong>Blending</strong> - Put sounds together
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center font-bold">
                5
              </span>
              <span>
                <strong>Segmenting</strong> - Break words apart
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Decorative Elements */}
      <div className="fixed bottom-4 left-4 text-6xl opacity-20 animate-pulse">
        🔊
      </div>
      <div className="fixed bottom-4 right-4 text-6xl opacity-20 animate-bounce">
        🎵
      </div>
    </div>
  );
}
