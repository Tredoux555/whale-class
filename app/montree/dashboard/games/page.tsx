// /montree/dashboard/games/page.tsx
// English Games - Links to existing games
'use client';

import Link from 'next/link';

interface Game {
  id: string;
  name: string;
  emoji: string;
  description: string;
  href: string;
  color: string;
}

const GAMES: Game[] = [
  {
    id: 'word-builder',
    name: 'Word Builder',
    emoji: '🔤',
    description: 'Build CVC words letter by letter',
    href: '/games/word-builder',
    color: 'teal',
  },
  {
    id: 'sound-games',
    name: 'Sound Games',
    emoji: '🎵',
    description: 'Beginning, ending, middle sounds',
    href: '/games/sound-games',
    color: 'amber',
  },
  {
    id: 'letter-sounds',
    name: 'Letter Sounds',
    emoji: '🅰️',
    description: 'Match letters to their sounds',
    href: '/games/letter-sounds',
    color: 'pink',
  },
  {
    id: 'letter-match',
    name: 'Letter Match',
    emoji: '🎯',
    description: 'Match uppercase to lowercase',
    href: '/games/letter-match',
    color: 'violet',
  },
  {
    id: 'letter-tracer',
    name: 'Letter Tracer',
    emoji: '✏️',
    description: 'Practice letter formation',
    href: '/games/letter-tracer',
    color: 'blue',
  },
  {
    id: 'capital-tracer',
    name: 'Capital Tracer',
    emoji: '🔠',
    description: 'Trace uppercase letters',
    href: '/games/capital-letter-tracer',
    color: 'green',
  },
  {
    id: 'number-tracer',
    name: 'Number Tracer',
    emoji: '🔢',
    description: 'Practice writing numbers',
    href: '/games/number-tracer',
    color: 'orange',
  },
  {
    id: 'vocabulary',
    name: 'Vocabulary',
    emoji: '📖',
    description: 'Build vocabulary with pictures',
    href: '/games/vocabulary-builder',
    color: 'cyan',
  },
  {
    id: 'sentence-builder',
    name: 'Sentence Builder',
    emoji: '📝',
    description: 'Build simple sentences',
    href: '/games/sentence-builder',
    color: 'rose',
  },
  {
    id: 'i-spy',
    name: 'I Spy',
    emoji: '👁️',
    description: 'Find objects by sound',
    href: '/games/combined-i-spy',
    color: 'emerald',
  },
  {
    id: 'grammar',
    name: 'Grammar Symbols',
    emoji: '🔺',
    description: 'Learn Montessori grammar symbols',
    href: '/games/grammar-symbols',
    color: 'purple',
  },
];

export default function GamesPage() {
  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">English Games</h1>
        <p className="text-slate-500 text-sm">{GAMES.length} games available</p>
      </div>

      {/* Games Grid */}
      <div className="space-y-2">
        {GAMES.map((game) => (
          <Link
            key={game.id}
            href={game.href}
            className="flex items-center gap-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-teal-500/50 rounded-xl p-4 transition-all group"
          >
            <div className="w-12 h-12 bg-slate-700/50 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              {game.emoji}
            </div>
            <div className="flex-1">
              <div className="text-white font-medium">{game.name}</div>
              <div className="text-slate-500 text-sm">{game.description}</div>
            </div>
            <span className="text-slate-600 group-hover:text-teal-400 group-hover:translate-x-1 transition-all">→</span>
          </Link>
        ))}
      </div>

      {/* Note */}
      <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">💡</span>
          <div>
            <div className="text-white font-medium text-sm">Tip</div>
            <div className="text-slate-500 text-xs">Games adapt to each child's level</div>
          </div>
        </div>
      </div>
    </div>
  );
}
