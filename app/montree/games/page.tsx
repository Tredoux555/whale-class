// /montree/games/page.tsx
// MONTREE GAMES HUB - All curriculum games organized by category
// Separated from Whale - standalone Montree system

'use client';

import { useState } from 'react';
import Link from 'next/link';

type Category = 'all' | 'phonics' | 'reading' | 'math' | 'sensorial' | 'grammar';

interface Game {
  id: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  gradient: string;
  category: Category;
  isNew?: boolean;
}

const GAMES: Game[] = [
  // PHONICS/SOUND GAMES
  { id: 'letter-sounds', name: 'Letter Sounds', description: 'Match letters to their sounds', icon: '🔤', route: '/montree/games/letter-sounds', gradient: 'from-cyan-500 to-blue-500', category: 'phonics' },
  { id: 'beginning-sounds', name: 'Beginning Sounds', description: 'I spy something that begins with...', icon: '👂', route: '/montree/games/sound-games/beginning', gradient: 'from-blue-500 to-indigo-500', category: 'phonics' },
  { id: 'middle-sounds', name: 'Middle Sounds', description: 'Identify the vowel sound in words', icon: '🎯', route: '/montree/games/sound-games/middle', gradient: 'from-amber-500 to-orange-500', category: 'phonics', isNew: true },
  { id: 'ending-sounds', name: 'Ending Sounds', description: 'I spy something that ends with...', icon: '📚', route: '/montree/games/sound-games/ending', gradient: 'from-purple-500 to-pink-500', category: 'phonics' },
  { id: 'combined-i-spy', name: 'Combined I Spy', description: 'Find words by beginning AND ending sounds', icon: '🔍', route: '/montree/games/combined-i-spy', gradient: 'from-orange-500 to-red-500', category: 'phonics' },
  { id: 'sound-blending', name: 'Sound Blending', description: 'Blend sounds together to make words', icon: '🔗', route: '/montree/games/sound-games/blending', gradient: 'from-teal-500 to-cyan-500', category: 'phonics' },
  { id: 'sound-segmenting', name: 'Sound Segmenting', description: 'Break words into their sounds', icon: '✂️', route: '/montree/games/sound-games/segmenting', gradient: 'from-pink-500 to-rose-500', category: 'phonics' },
  { id: 'sound-safari', name: 'Sound Safari', description: 'Hunt for sounds in the wild', icon: '🦁', route: '/montree/games/sound-safari', gradient: 'from-green-500 to-emerald-500', category: 'phonics' },

  // READING/WRITING GAMES
  { id: 'letter-match', name: 'Letter Match', description: 'Match uppercase to lowercase letters', icon: '🔡', route: '/montree/games/letter-match', gradient: 'from-green-500 to-emerald-500', category: 'reading' },
  { id: 'letter-tracer', name: 'Letter Tracer', description: 'Practice writing lowercase letters', icon: '✏️', route: '/montree/games/letter-tracer', gradient: 'from-teal-500 to-green-500', category: 'reading' },
  { id: 'capital-letter-tracer', name: 'Capital Letters', description: 'Trace uppercase A-Z', icon: '🔠', route: '/montree/games/capital-letter-tracer', gradient: 'from-blue-500 to-indigo-500', category: 'reading', isNew: true },
  { id: 'word-builder', name: 'Word Builder', description: 'Build CVC words letter by letter', icon: '🧱', route: '/montree/games/word-builder', gradient: 'from-indigo-500 to-purple-500', category: 'reading' },
  { id: 'vocabulary-builder', name: 'Vocabulary Builder', description: 'Learn new words with pictures', icon: '📖', route: '/montree/games/vocabulary-builder', gradient: 'from-pink-500 to-purple-500', category: 'reading' },
  { id: 'read-and-reveal', name: 'Read & Reveal', description: 'Read words and reveal pictures', icon: '🎁', route: '/montree/games/read-and-reveal', gradient: 'from-yellow-500 to-amber-500', category: 'reading' },

  // MATH GAMES
  { id: 'number-tracer', name: 'Number Tracer', description: 'Practice writing numbers 0-9', icon: '✏️', route: '/montree/games/number-tracer', gradient: 'from-purple-500 to-pink-500', category: 'math' },
  { id: 'quantity-match', name: 'Quantity Match', description: 'Cards & Counters - match quantities', icon: '🔢', route: '/montree/games/quantity-match', gradient: 'from-red-500 to-orange-500', category: 'math' },
  { id: 'bead-frame', name: 'Bead Frame', description: 'Small Bead Frame - place value', icon: '🧮', route: '/montree/games/bead-frame', gradient: 'from-amber-500 to-orange-500', category: 'math' },
  { id: 'hundred-board', name: 'Hundred Board', description: 'Place numbers 1-100 on the grid', icon: '💯', route: '/montree/games/hundred-board', gradient: 'from-blue-500 to-indigo-500', category: 'math', isNew: true },
  { id: 'odd-even', name: 'Odd & Even', description: 'Discover odd/even patterns', icon: '🔴', route: '/montree/games/odd-even', gradient: 'from-orange-500 to-red-500', category: 'math', isNew: true },

  // SENSORIAL GAMES
  { id: 'sensorial-sort', name: 'Sensorial Sort', description: 'Color matching, grading & sorting', icon: '👁️', route: '/montree/games/sensorial-sort', gradient: 'from-rose-500 to-pink-500', category: 'sensorial' },
  { id: 'color-match', name: 'Color Matching', description: 'Match pairs of identical colors', icon: '🎨', route: '/montree/games/color-match', gradient: 'from-pink-500 to-purple-500', category: 'sensorial', isNew: true },
  { id: 'color-grade', name: 'Color Grading', description: 'Arrange shades light to dark', icon: '🌈', route: '/montree/games/color-grade', gradient: 'from-violet-500 to-purple-500', category: 'sensorial', isNew: true },

  // GRAMMAR GAMES
  { id: 'grammar-symbols', name: 'Grammar Symbols', description: 'Learn parts of speech the Montessori way', icon: '▲', route: '/montree/games/grammar-symbols', gradient: 'from-red-500 to-orange-500', category: 'grammar' },
  { id: 'sentence-builder', name: 'Sentence Builder', description: 'Build sentences with word cards', icon: '📝', route: '/montree/games/sentence-builder', gradient: 'from-amber-500 to-yellow-500', category: 'grammar' },
  { id: 'sentence-match', name: 'Sentence Match', description: 'Match sentences to pictures', icon: '🖼️', route: '/montree/games/sentence-match', gradient: 'from-emerald-500 to-teal-500', category: 'grammar' },
  { id: 'sentence-scramble', name: 'Sentence Scramble', description: 'Unscramble words to make sentences', icon: '🔀', route: '/montree/games/sentence-scramble', gradient: 'from-cyan-500 to-blue-500', category: 'grammar' },
];

const CATEGORIES = [
  { id: 'all' as Category, name: 'All Games', icon: '🎮', color: 'from-gray-600 to-gray-700' },
  { id: 'phonics' as Category, name: 'Phonics', icon: '👂', color: 'from-blue-500 to-indigo-500' },
  { id: 'reading' as Category, name: 'Reading', icon: '📖', color: 'from-green-500 to-emerald-500' },
  { id: 'math' as Category, name: 'Math', icon: '🔢', color: 'from-amber-500 to-orange-500' },
  { id: 'sensorial' as Category, name: 'Sensorial', icon: '👁️', color: 'from-pink-500 to-rose-500' },
  { id: 'grammar' as Category, name: 'Grammar', icon: '✏️', color: 'from-purple-500 to-violet-500' },
];

export default function MontreeGamesHub() {
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  
  const filteredGames = activeCategory === 'all' 
    ? GAMES 
    : GAMES.filter(g => g.category === activeCategory);

  const getCategoryCount = (cat: Category) => 
    cat === 'all' ? GAMES.length : GAMES.filter(g => g.category === cat).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link 
            href="/montree/admin" 
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <span className="text-xl">←</span>
            <span className="font-medium">Back to Admin</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-xl">🎮</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Curriculum Games</h1>
              <p className="text-xs text-slate-400">{GAMES.length} games available</p>
            </div>
          </div>
          <div className="w-24" />
        </div>
      </header>

      {/* Category Tabs */}
      <div className="bg-slate-800/30 border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${
                  activeCategory === cat.id
                    ? `bg-gradient-to-r ${cat.color} text-white shadow-lg`
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeCategory === cat.id ? 'bg-white/20' : 'bg-slate-600'
                }`}>
                  {getCategoryCount(cat.id)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Games Grid */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredGames.map((game) => (
            <Link
              key={game.id}
              href={game.route}
              className="group relative bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl overflow-hidden hover:border-slate-500 transition-all hover:scale-[1.02] hover:shadow-xl"
            >
              {game.isNew && (
                <div className="absolute top-2 right-2 z-10">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r from-pink-500 to-orange-500 shadow-lg">
                    ✨ NEW
                  </span>
                </div>
              )}
              
              {/* Gradient Header */}
              <div className={`h-24 bg-gradient-to-br ${game.gradient} relative overflow-hidden`}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-5xl group-hover:scale-125 group-hover:rotate-12 transition-transform duration-300">
                    {game.icon}
                  </span>
                </div>
                <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full" />
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full" />
              </div>
              
              {/* Content */}
              <div className="p-4">
                <h3 className="text-white font-bold mb-1 group-hover:text-emerald-400 transition-colors">
                  {game.name}
                </h3>
                <p className="text-slate-400 text-sm line-clamp-2">{game.description}</p>
              </div>
              
              {/* Play Button */}
              <div className="px-4 pb-4">
                <div className={`flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all bg-slate-700/50 text-slate-300 group-hover:bg-gradient-to-r group-hover:${game.gradient} group-hover:text-white`}>
                  <span>▶</span>
                  <span>Play</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {filteredGames.length === 0 && (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">🎮</span>
            <h3 className="text-xl font-bold text-white mb-2">No games in this category yet</h3>
            <p className="text-slate-400">Check back soon!</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">
            🌳 Montree • Curriculum-aligned Montessori games
          </p>
        </div>
      </footer>
    </div>
  );
}
