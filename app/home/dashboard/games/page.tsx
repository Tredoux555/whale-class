'use client';

// /home/dashboard/games/page.tsx
// Games Hub - Educational games for children
// Reuses game components from Montree

import Link from 'next/link';
import { useState } from 'react';

interface Game {
  id: string;
  name: string;
  emoji: string;
  description: string;
  route: string;
  gradient: string;
  isNew?: boolean;
}

interface Category {
  id: string;
  name: string;
  emoji: string;
  games: Game[];
}

const CATEGORIES: Category[] = [
  {
    id: 'phonics',
    name: 'Sound & Phonics',
    emoji: '👂',
    games: [
      { id: 'letter-sounds', name: 'Letter Sounds', emoji: '🔤', description: 'Match letters to their sounds', route: '/home/dashboard/games/letter-sounds', gradient: 'from-cyan-500 to-blue-500' },
      { id: 'beginning-sounds', name: 'Beginning Sounds', emoji: '👂', description: 'I spy something that begins with...', route: '/montree/dashboard/games/sound-games/beginning', gradient: 'from-blue-500 to-indigo-500' },
      { id: 'middle-sounds', name: 'Middle Sounds', emoji: '🎯', description: 'Identify the vowel sound in words', route: '/montree/dashboard/games/sound-games/middle', gradient: 'from-amber-500 to-orange-500', isNew: true },
      { id: 'ending-sounds', name: 'Ending Sounds', emoji: '📚', description: 'I spy something that ends with...', route: '/montree/dashboard/games/sound-games/ending', gradient: 'from-purple-500 to-pink-500' },
      { id: 'combined-i-spy', name: 'Combined I Spy', emoji: '🔍', description: 'Find words by beginning AND ending sounds', route: '/montree/dashboard/games/combined-i-spy', gradient: 'from-orange-500 to-red-500' },
      { id: 'blending', name: 'Sound Blending', emoji: '🔗', description: 'Blend sounds together to make words', route: '/montree/dashboard/games/sound-games/blending', gradient: 'from-teal-500 to-cyan-500' },
      { id: 'segmenting', name: 'Sound Segmenting', emoji: '✂️', description: 'Break words into their sounds', route: '/montree/dashboard/games/sound-games/segmenting', gradient: 'from-pink-500 to-rose-500' },
      { id: 'sound-safari', name: 'Sound Safari', emoji: '🦁', description: 'Hunt for sounds in the wild', route: '/montree/dashboard/games/sound-safari', gradient: 'from-green-500 to-emerald-500' },
    ]
  },
  {
    id: 'reading',
    name: 'Reading & Writing',
    emoji: '📖',
    games: [
      { id: 'letter-match', name: 'Letter Match', emoji: '🔡', description: 'Match uppercase to lowercase letters', route: '/home/dashboard/games/picture-match', gradient: 'from-green-500 to-emerald-500' },
      { id: 'letter-tracer', name: 'Letter Tracer', emoji: '✏️', description: 'Practice writing lowercase letters', route: '/home/dashboard/games/letter-tracer', gradient: 'from-teal-500 to-green-500' },
      { id: 'capital-letter-tracer', name: 'Capital Letters', emoji: '🔠', description: 'Trace uppercase A-Z', route: '/home/dashboard/games/capital-letter-tracer', gradient: 'from-blue-500 to-indigo-500', isNew: true },
      { id: 'word-builder', name: 'Word Builder', emoji: '🧱', description: 'Build words letter by letter', route: '/home/dashboard/games/word-builder', gradient: 'from-indigo-500 to-purple-500' },
      { id: 'vocabulary-builder', name: 'Vocabulary Builder', emoji: '📖', description: 'Learn new words with pictures', route: '/home/dashboard/games/vocabulary-builder', gradient: 'from-pink-500 to-purple-500' },
      { id: 'read-and-reveal', name: 'Read & Reveal', emoji: '🎁', description: 'Read words to reveal pictures', route: '/montree/dashboard/games/read-and-reveal', gradient: 'from-yellow-500 to-orange-500' },
    ]
  },
  {
    id: 'grammar',
    name: 'Grammar & Sentences',
    emoji: '✏️',
    games: [
      { id: 'grammar-symbols', name: 'Grammar Symbols', emoji: '▲', description: 'Learn parts of speech the Montessori way', route: '/home/dashboard/games/grammar-symbols', gradient: 'from-red-500 to-orange-500' },
      { id: 'sentence-builder', name: 'Sentence Builder', emoji: '📝', description: 'Build sentences with word cards', route: '/home/dashboard/games/sentence-builder', gradient: 'from-amber-500 to-yellow-500' },
      { id: 'sentence-match', name: 'Sentence Match', emoji: '🖼️', description: 'Match sentences to pictures', route: '/home/dashboard/games/sentence-match', gradient: 'from-emerald-500 to-teal-500' },
      { id: 'sentence-scramble', name: 'Sentence Scramble', emoji: '🔀', description: 'Unscramble words to make sentences', route: '/montree/dashboard/games/sentence-scramble', gradient: 'from-violet-500 to-purple-500' },
    ]
  },
  {
    id: 'math',
    name: 'Math',
    emoji: '🔢',
    games: [
      { id: 'number-tracer', name: 'Number Tracer', emoji: '✏️', description: 'Practice writing numbers 0-9', route: '/home/dashboard/games/number-tracer', gradient: 'from-purple-500 to-pink-500' },
      { id: 'quantity-match', name: 'Quantity Match', emoji: '🔢', description: 'Cards & Counters - match quantities', route: '/montree/dashboard/games/quantity-match', gradient: 'from-red-500 to-orange-500' },
      { id: 'bead-frame', name: 'Bead Frame', emoji: '🧮', description: 'Place value & operations', route: '/montree/dashboard/games/bead-frame', gradient: 'from-amber-500 to-orange-500' },
      { id: 'hundred-board', name: 'Hundred Board', emoji: '💯', description: 'Place numbers 1-100 on the grid', route: '/montree/dashboard/games/hundred-board', gradient: 'from-blue-500 to-indigo-500', isNew: true },
      { id: 'odd-even', name: 'Odd & Even', emoji: '🔴', description: 'Discover odd/even patterns', route: '/montree/dashboard/games/odd-even', gradient: 'from-orange-500 to-red-500', isNew: true },
    ]
  },
  {
    id: 'sensorial',
    name: 'Sensorial',
    emoji: '👁️',
    games: [
      { id: 'sensorial-sort', name: 'Sensorial Sort', emoji: '👁️', description: 'Color matching, grading & sorting', route: '/montree/dashboard/games/sensorial-sort', gradient: 'from-rose-500 to-pink-500' },
      { id: 'color-match', name: 'Color Matching', emoji: '🎨', description: 'Match pairs of identical colors', route: '/montree/dashboard/games/color-match', gradient: 'from-pink-500 to-purple-500', isNew: true },
      { id: 'color-grade', name: 'Color Grading', emoji: '🌈', description: 'Arrange shades light to dark', route: '/montree/dashboard/games/color-grade', gradient: 'from-violet-500 to-purple-500', isNew: true },
      { id: 'match-attack', name: 'Match Attack', emoji: '⚡', description: 'Fast-paced matching game', route: '/montree/dashboard/games/match-attack', gradient: 'from-yellow-500 to-red-500' },
    ]
  },
];

export default function GamesHub() {
  const [activeTab, setActiveTab] = useState('phonics');
  const activeCategory = CATEGORIES.find(c => c.id === activeTab) || CATEGORIES[0];
  const totalGames = CATEGORIES.reduce((acc, cat) => acc + cat.games.length, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Learning Games</h1>
        <p className="text-gray-500">
          {totalGames} educational games across {CATEGORIES.length} areas
        </p>
      </div>

      {/* Category Tabs */}
      <div className="bg-white rounded-2xl shadow-md p-2 border border-gray-100 overflow-x-auto">
        <div className="flex gap-2 min-w-min">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveTab(category.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                activeTab === category.id
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="text-lg">{category.emoji}</span>
              <span>{category.name}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                activeTab === category.id ? 'bg-white/20' : 'bg-gray-300'
              }`}>
                {category.games.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {activeCategory.games.map((game) => (
          <Link
            key={game.id}
            href={game.route}
            className={`relative bg-gradient-to-br ${game.gradient} rounded-2xl p-6 transition-all hover:scale-[1.05] hover:shadow-xl active:scale-[0.95] shadow-lg text-white group`}
          >
            {game.isNew && (
              <div className="absolute -top-2 -right-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold text-white bg-pink-500 shadow-lg animate-pulse">
                  NEW
                </span>
              </div>
            )}

            {/* Game Icon */}
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-3xl mb-3 group-hover:bg-white/30 transition-colors">
              {game.emoji}
            </div>

            {/* Game Name */}
            <h3 className="font-bold text-sm mb-1">{game.name}</h3>

            {/* Game Description */}
            <p className="text-xs text-white/80 leading-snug">{game.description}</p>

            {/* Arrow indicator */}
            <div className="mt-4 pt-3 border-t border-white/20 flex justify-end">
              <span className="text-xs font-semibold text-white/60 group-hover:text-white transition-colors">Play →</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Footer Info */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
        <p className="text-sm text-emerald-900">
          🎮 <span className="font-semibold">Tip:</span> Games help reinforce curriculum skills in a fun, engaging way. No screen time worries — all games are educational!
        </p>
      </div>
    </div>
  );
}
