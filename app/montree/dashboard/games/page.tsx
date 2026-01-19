// /montree/dashboard/games/page.tsx
// English Games - Links to existing games
// Polished Session 64 - Consistent with Montree theme
'use client';

import Link from 'next/link';

interface Game {
  id: string;
  name: string;
  emoji: string;
  description: string;
  href: string;
  gradient: string;
}

const GAMES: Game[] = [
  {
    id: 'word-builder',
    name: 'Word Builder',
    emoji: '🔤',
    description: 'Build CVC words letter by letter',
    href: '/games/word-builder',
    gradient: 'from-teal-500 to-cyan-600',
  },
  {
    id: 'sound-games',
    name: 'Sound Games',
    emoji: '🎵',
    description: 'Beginning, ending, middle sounds',
    href: '/games/sound-games',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    id: 'letter-sounds',
    name: 'Letter Sounds',
    emoji: '🅰️',
    description: 'Match letters to their sounds',
    href: '/games/letter-sounds',
    gradient: 'from-pink-500 to-rose-600',
  },
  {
    id: 'letter-match',
    name: 'Letter Match',
    emoji: '🎯',
    description: 'Match uppercase to lowercase',
    href: '/games/letter-match',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    id: 'letter-tracer',
    name: 'Letter Tracer',
    emoji: '✏️',
    description: 'Practice letter formation',
    href: '/games/letter-tracer',
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'capital-tracer',
    name: 'Capital Tracer',
    emoji: '🔠',
    description: 'Trace uppercase letters',
    href: '/games/capital-letter-tracer',
    gradient: 'from-green-500 to-emerald-600',
  },
  {
    id: 'number-tracer',
    name: 'Number Tracer',
    emoji: '🔢',
    description: 'Practice writing numbers',
    href: '/games/number-tracer',
    gradient: 'from-orange-500 to-red-600',
  },
  {
    id: 'vocabulary',
    name: 'Vocabulary',
    emoji: '📖',
    description: 'Build vocabulary with pictures',
    href: '/games/vocabulary-builder',
    gradient: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'sentence-builder',
    name: 'Sentence Builder',
    emoji: '📝',
    description: 'Build simple sentences',
    href: '/games/sentence-builder',
    gradient: 'from-rose-500 to-pink-600',
  },
  {
    id: 'i-spy',
    name: 'I Spy',
    emoji: '👁️',
    description: 'Find objects by sound',
    href: '/games/combined-i-spy',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'grammar',
    name: 'Grammar Symbols',
    emoji: '🔺',
    description: 'Learn Montessori grammar symbols',
    href: '/games/grammar-symbols',
    gradient: 'from-purple-500 to-violet-600',
  },
];

export default function GamesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 py-4 px-4 flex items-center gap-3 sticky top-0 z-10">
        <Link 
          href="/montree/dashboard/tools" 
          className="w-10 h-10 bg-emerald-100 hover:bg-emerald-200 rounded-xl flex items-center justify-center transition-colors"
        >
          <span className="text-lg">←</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎮</span>
          <div>
            <h1 className="text-xl font-bold text-gray-800">English Games</h1>
            <p className="text-gray-500 text-xs">{GAMES.length} games available</p>
          </div>
        </div>
      </header>

      {/* Games Grid */}
      <main className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
          {GAMES.map((game) => (
            <Link
              key={game.id}
              href={game.href}
              className={`bg-gradient-to-br ${game.gradient} rounded-2xl p-4 transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] shadow-md`}
            >
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl mb-3">
                {game.emoji}
              </div>
              <div className="text-white font-bold text-sm">{game.name}</div>
              <div className="text-white/70 text-xs mt-1 line-clamp-2">{game.description}</div>
            </Link>
          ))}
        </div>

        {/* Tip */}
        <div className="max-w-2xl mx-auto mt-6 p-4 bg-emerald-100 rounded-xl border border-emerald-200">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div className="text-sm text-emerald-800">
              <strong>Tip:</strong> Games automatically adapt to each child's reading level. Start with Letter Sounds for beginners!
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
