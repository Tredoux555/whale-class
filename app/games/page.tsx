'use client';

import Link from 'next/link';
import { Gamepad2, Volume2, BookOpen, PenTool, Layers, FileText } from 'lucide-react';

const games = [
  {
    id: 'letter-sounds',
    name: 'Letter Sound Matching',
    description: 'Match letters to their sounds',
    icon: Volume2,
    color: 'from-blue-500 to-cyan-500',
    href: '/games/letter-sounds',
  },
  {
    id: 'word-builder',
    name: 'Word Builder',
    description: 'Build words from letters',
    icon: BookOpen,
    color: 'from-green-500 to-emerald-500',
    href: '/games/word-builder',
  },
  {
    id: 'sentence-match',
    name: 'Sentence Matching',
    description: 'Match sentences to pictures',
    icon: Layers,
    color: 'from-purple-500 to-pink-500',
    href: '/games/sentence-match',
  },
  {
    id: 'sentence-builder',
    name: 'Sentence Builder',
    description: 'Build sentences from words',
    icon: FileText,
    color: 'from-orange-500 to-red-500',
    href: '/games/sentence-builder',
  },
  {
    id: 'letter-match',
    name: 'Big to Small Letters',
    description: 'Match uppercase and lowercase letters',
    icon: Layers,
    color: 'from-indigo-500 to-blue-500',
    href: '/games/letter-match',
  },
  {
    id: 'letter-tracer',
    name: 'Letter Tracer',
    description: 'Trace letters to practice writing',
    icon: PenTool,
    color: 'from-yellow-500 to-orange-500',
    href: '/games/letter-tracer',
  },
];

export default function GamesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gamepad2 size={32} />
              <div>
                <h1 className="text-3xl font-bold">Learning Games</h1>
                <p className="text-sm opacity-90">Fun educational games for kids</p>
              </div>
            </div>
            <Link
              href="/"
              className="text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Games Grid */}
      <main className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => {
            const Icon = game.icon;
            return (
              <Link
                key={game.id}
                href={game.href}
                className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 overflow-hidden"
              >
                <div className={`h-32 bg-gradient-to-br ${game.color} flex items-center justify-center`}>
                  <Icon size={48} className="text-white" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-indigo-600 transition-colors">
                    {game.name}
                  </h3>
                  <p className="text-gray-600 text-sm">{game.description}</p>
                  <div className="mt-4 flex items-center text-indigo-600 font-semibold text-sm">
                    Play Game →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-white rounded-2xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">🎮 All Games Are Free!</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            These educational games help children learn letters, words, and sentences in a fun and interactive way. 
            No login required - just click and play!
          </p>
        </div>
      </main>
    </div>
  );
}

