// /montree/dashboard/games/page.tsx
// Montree Games Hub - All curriculum games with category tabs
// SEPARATE from Whale /games - this is the Montree SaaS version
'use client';

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
      { id: 'letter-sounds', name: 'Letter Sounds', emoji: '🔤', description: 'Match letters to their sounds', route: '/montree/dashboard/games/letter-sounds', gradient: 'from-cyan-500 to-blue-500' },
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
      { id: 'letter-match', name: 'Letter Match', emoji: '🔡', description: 'Match uppercase to lowercase letters', route: '/montree/dashboard/games/letter-match', gradient: 'from-green-500 to-emerald-500' },
      { id: 'letter-tracer', name: 'Letter Tracer', emoji: '✏️', description: 'Practice writing lowercase letters', route: '/montree/dashboard/games/letter-tracer', gradient: 'from-teal-500 to-green-500' },
      { id: 'capital-letter-tracer', name: 'Capital Letters', emoji: '🔠', description: 'Trace uppercase A-Z', route: '/montree/dashboard/games/capital-letter-tracer', gradient: 'from-blue-500 to-indigo-500', isNew: true },
      { id: 'word-builder', name: 'Word Builder', emoji: '🧱', description: 'Build words letter by letter', route: '/montree/dashboard/games/word-builder', gradient: 'from-indigo-500 to-purple-500' },
      { id: 'vocabulary-builder', name: 'Vocabulary Builder', emoji: '📖', description: 'Learn new words with pictures', route: '/montree/dashboard/games/vocabulary-builder', gradient: 'from-pink-500 to-purple-500' },
      { id: 'read-and-reveal', name: 'Read & Reveal', emoji: '🎁', description: 'Read words to reveal pictures', route: '/montree/dashboard/games/read-and-reveal', gradient: 'from-yellow-500 to-orange-500' },
    ]
  },
  {
    id: 'grammar',
    name: 'Grammar & Sentences',
    emoji: '✏️',
    games: [
      { id: 'grammar-symbols', name: 'Grammar Symbols', emoji: '▲', description: 'Learn parts of speech the Montessori way', route: '/montree/dashboard/games/grammar-symbols', gradient: 'from-red-500 to-orange-500' },
      { id: 'sentence-builder', name: 'Sentence Builder', emoji: '📝', description: 'Build sentences with word cards', route: '/montree/dashboard/games/sentence-builder', gradient: 'from-amber-500 to-yellow-500' },
      { id: 'sentence-match', name: 'Sentence Match', emoji: '🖼️', description: 'Match sentences to pictures', route: '/montree/dashboard/games/sentence-match', gradient: 'from-emerald-500 to-teal-500' },
      { id: 'sentence-scramble', name: 'Sentence Scramble', emoji: '🔀', description: 'Unscramble words to make sentences', route: '/montree/dashboard/games/sentence-scramble', gradient: 'from-violet-500 to-purple-500' },
    ]
  },
  {
    id: 'math',
    name: 'Math',
    emoji: '🔢',
    games: [
      { id: 'number-tracer', name: 'Number Tracer', emoji: '✏️', description: 'Practice writing numbers 0-9', route: '/montree/dashboard/games/number-tracer', gradient: 'from-purple-500 to-pink-500' },
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

export default function MontreeGamesHub() {
  const [activeTab, setActiveTab] = useState('phonics');
  const activeCategory = CATEGORIES.find(c => c.id === activeTab) || CATEGORIES[0];
  const totalGames = CATEGORIES.reduce((acc, cat) => acc + cat.games.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 py-4 px-4 flex items-center gap-3 sticky top-0 z-20">
        <Link 
          href="/montree/admin" 
          className="w-10 h-10 bg-slate-700 hover:bg-slate-600 rounded-xl flex items-center justify-center transition-colors"
        >
          <span className="text-lg text-white">←</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎮</span>
          <div>
            <h1 className="text-xl font-bold text-white">Curriculum Games</h1>
            <p className="text-slate-400 text-xs">{totalGames} games across {CATEGORIES.length} areas</p>
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      <div className="sticky top-[72px] z-10 bg-slate-800/90 backdrop-blur-sm border-b border-slate-700">
        <div className="flex overflow-x-auto gap-1 p-2 scrollbar-hide">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveTab(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                activeTab === category.id
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <span>{category.emoji}</span>
              <span>{category.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === category.id ? 'bg-white/20' : 'bg-slate-600'
              }`}>
                {category.games.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Games Grid */}
      <main className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
          {activeCategory.games.map((game) => (
            <Link
              key={game.id}
              href={game.route}
              className={`relative bg-gradient-to-br ${game.gradient} rounded-2xl p-4 transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] shadow-lg`}
            >
              {game.isNew && (
                <div className="absolute -top-1 -right-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold text-white bg-pink-500 shadow-lg animate-pulse">
                    NEW
                  </span>
                </div>
              )}
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl mb-3">
                {game.emoji}
              </div>
              <div className="text-white font-bold text-sm">{game.name}</div>
              <div className="text-white/70 text-xs mt-1 line-clamp-2">{game.description}</div>
            </Link>
          ))}
        </div>

        {/* Category Description */}
        <div className="max-w-4xl mx-auto mt-6 p-4 bg-slate-800 rounded-xl border border-slate-700">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{activeCategory.emoji}</span>
            <div>
              <h3 className="text-white font-bold">{activeCategory.name}</h3>
              <p className="text-slate-400 text-sm mt-1">
                {activeCategory.id === 'phonics' && 'Build phonemic awareness - the foundation of reading. Children learn to hear and manipulate sounds in words.'}
                {activeCategory.id === 'reading' && 'Progress from letter recognition to word building and reading fluency.'}
                {activeCategory.id === 'grammar' && 'Montessori grammar symbols make abstract concepts concrete and visual.'}
                {activeCategory.id === 'math' && 'Hands-on math from concrete to abstract - numbers, quantities, and operations.'}
                {activeCategory.id === 'sensorial' && 'Refine the senses through matching, grading, and sorting activities.'}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
