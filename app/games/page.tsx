'use client';

import Link from 'next/link';
import { useState } from 'react';

interface Game {
  id: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  gradient: string;
  isNew?: boolean;
  disabled?: boolean;
}

interface GameCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  games: Game[];
}

// Enhanced Game Data with gradients
const SOUND_GAMES: Game[] = [
  { id: 'letter-sounds', name: 'Letter Sounds', description: 'Match letters to their sounds', icon: '🔤', route: '/games/letter-sounds', color: 'cyan', gradient: 'from-cyan-500 to-blue-500' },
  { id: 'beginning-sounds', name: 'Beginning Sounds', description: 'I spy something that begins with...', icon: '👂', route: '/games/sound-games/beginning', color: 'blue', gradient: 'from-blue-500 to-indigo-500' },
  { id: 'middle-sounds', name: 'Middle Sounds', description: 'Identify the vowel sound in words', icon: '🎯', route: '/games/sound-games/middle', color: 'amber', gradient: 'from-amber-500 to-orange-500', isNew: true },
  { id: 'ending-sounds', name: 'Ending Sounds', description: 'I spy something that ends with...', icon: '📚', route: '/games/sound-games/ending', color: 'purple', gradient: 'from-purple-500 to-pink-500' },
  { id: 'combined-sounds', name: 'Combined I Spy', description: 'Find words by beginning AND ending sounds', icon: '🔍', route: '/games/combined-i-spy', color: 'orange', gradient: 'from-orange-500 to-red-500' },
  { id: 'blending', name: 'Sound Blending', description: 'Blend sounds together to make words', icon: '🔗', route: '/games/sound-games/blending', color: 'teal', gradient: 'from-teal-500 to-cyan-500' },
  { id: 'segmenting', name: 'Sound Segmenting', description: 'Break words into their sounds', icon: '✂️', route: '/games/sound-games/segmenting', color: 'pink', gradient: 'from-pink-500 to-rose-500' },
];

const READING_GAMES: Game[] = [
  { id: 'letter-match', name: 'Letter Match', description: 'Match uppercase to lowercase letters', icon: '🔡', route: '/games/letter-match', color: 'green', gradient: 'from-green-500 to-emerald-500' },
  { id: 'letter-tracer', name: 'Letter Tracer', description: 'Practice writing letters', icon: '✏️', route: '/games/letter-tracer', color: 'teal', gradient: 'from-teal-500 to-green-500' },
  { id: 'word-builder', name: 'Word Builder', description: 'Build words letter by letter', icon: '🧱', route: '/games/word-builder', color: 'indigo', gradient: 'from-indigo-500 to-purple-500' },
];

const VOCABULARY_GAMES: Game[] = [
  { id: 'vocabulary-builder', name: 'Vocabulary Builder', description: 'Learn new words with pictures', icon: '📖', route: '/games/vocabulary-builder', color: 'pink', gradient: 'from-pink-500 to-purple-500' },
];

const GRAMMAR_GAMES: Game[] = [
  { id: 'grammar-symbols', name: 'Grammar Symbols', description: 'Learn parts of speech the Montessori way', icon: '▲', route: '/games/grammar-symbols', color: 'red', gradient: 'from-red-500 to-orange-500' },
  { id: 'sentence-builder', name: 'Sentence Builder', description: 'Build sentences with word cards', icon: '📝', route: '/games/sentence-builder', color: 'amber', gradient: 'from-amber-500 to-yellow-500' },
  { id: 'sentence-match', name: 'Sentence Match', description: 'Match sentences to pictures', icon: '🖼️', route: '/games/sentence-match', color: 'emerald', gradient: 'from-emerald-500 to-teal-500' },
];

const GAME_CATEGORIES: GameCategory[] = [
  { id: 'sound-games', name: 'Sound Games', icon: '👂', description: 'Learn phonics and letter sounds', games: SOUND_GAMES },
  { id: 'reading-games', name: 'Reading Games', icon: '📖', description: 'Build reading skills', games: READING_GAMES },
  { id: 'vocabulary-games', name: 'Vocabulary', icon: '📚', description: 'Expand your word knowledge', games: VOCABULARY_GAMES },
  { id: 'grammar-games', name: 'Grammar', icon: '✏️', description: 'Master parts of speech', games: GRAMMAR_GAMES },
];

function GameCard({ game }: { game: Game }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <Link 
      href={game.route}
      className="block group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100`}>
        {game.isNew && (
          <div className="absolute -top-1 -right-1 z-10">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r from-pink-500 to-orange-500 shadow-lg animate-pulse">
              ✨ NEW
            </span>
          </div>
        )}
        
        {/* Gradient Header */}
        <div className={`h-24 bg-gradient-to-br ${game.gradient} relative overflow-hidden`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-6xl transition-transform duration-300 ${isHovered ? 'scale-125 rotate-12' : ''}`}>
              {game.icon}
            </span>
          </div>
          {/* Decorative circles */}
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full" />
          <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full" />
        </div>
        
        {/* Content */}
        <div className="p-4">
          <h3 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">
            {game.name}
          </h3>
          <p className="text-sm text-gray-500 line-clamp-2">{game.description}</p>
        </div>
        
        {/* Play indicator */}
        <div className="px-4 pb-4">
          <div className={`flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all ${
            isHovered 
              ? `bg-gradient-to-r ${game.gradient} text-white` 
              : 'bg-gray-100 text-gray-600'
          }`}>
            <span>▶</span>
            <span>Play</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function CategorySection({ category, index }: { category: GameCategory; index: number }) {
  return (
    <section 
      className="mb-10"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-blue-200">
          {category.icon}
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">{category.name}</h2>
          <p className="text-sm text-gray-500">{category.description}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {category.games.filter(g => !g.disabled).map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </section>
  );
}

export default function GamesHubPage() {
  const totalGames = GAME_CATEGORIES.reduce((acc, cat) => acc + cat.games.filter(g => !g.disabled).length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back to Home</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
              <span className="text-xl">🎮</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Games Hub</h1>
              <p className="text-xs text-gray-500">{totalGames} games to play</p>
            </div>
          </div>
          <div className="w-24" />
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-sm font-medium mb-4 backdrop-blur-sm">
            <span>🌟</span>
            <span>{totalGames} Learning Games Available</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Learn Through Play
          </h2>
          <p className="text-lg text-blue-100 max-w-xl mx-auto">
            Fun phonics, reading, and grammar games designed for young learners
          </p>
          
          {/* Quick Stats */}
          <div className="flex justify-center gap-8 mt-8">
            {GAME_CATEGORIES.map((cat) => (
              <div key={cat.id} className="text-center">
                <div className="text-3xl mb-1">{cat.icon}</div>
                <div className="text-2xl font-bold">{cat.games.filter(g => !g.disabled).length}</div>
                <div className="text-xs text-blue-200">{cat.name}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Wave Decoration */}
        <svg className="w-full h-12 text-white" viewBox="0 0 1440 48" fill="none" preserveAspectRatio="none">
          <path d="M0 48h1440V0c-211.04 31.46-428.96 47.19-652.8 47.19C563.36 47.19 339.52 31.46 0 0v48z" fill="currentColor" fillOpacity="0.1"/>
          <path d="M0 48h1440V12c-211.04 23.6-428.96 35.4-652.8 35.4-223.84 0-447.68-11.8-787.2-35.4v36z" fill="white"/>
        </svg>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {GAME_CATEGORIES.map((category, index) => (
          <CategorySection key={category.id} category={category} index={index} />
        ))}
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl">🐋</span>
            <span className="font-bold text-gray-700">Whale Class Games</span>
          </div>
          <p className="text-sm text-gray-500">
            Making learning fun, one game at a time! 🌟
          </p>
        </div>
      </footer>
    </div>
  );
}
