'use client';

import Link from 'next/link';

// TypeScript Interfaces
interface Game {
  id: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  isNew?: boolean;
  disabled?: boolean; // For broken games
}

interface GameCategory {
  id: string;
  name: string;
  icon: string;
  games: Game[];
}

// Game Data - FIXED: Removed broken Middle Sound game
const SOUND_GAMES: Game[] = [
  {
    id: 'letter-sounds',
    name: 'Letter Sounds',
    description: 'Match letters to their sounds',
    icon: '🔤',
    route: '/games/letter-sounds',
    color: 'cyan',
  },
  {
    id: 'beginning-sounds',
    name: 'Beginning Sounds',
    description: 'I spy something that begins with...',
    icon: '👂',
    route: '/games/sound-games/beginning',
    color: 'blue',
  },
  {
    id: 'ending-sounds',
    name: 'Ending Sounds',
    description: 'I spy something that ends with...',
    icon: '📚',
    route: '/games/sound-games/ending',
    color: 'purple',
  },
  {
    id: 'combined-sounds',
    name: 'Combined I Spy',
    description: 'Find words by beginning AND ending sounds',
    icon: '🔍',
    route: '/games/combined-i-spy',
    color: 'orange',
  },
  {
    id: 'blending',
    name: 'Sound Blending',
    description: 'Blend sounds together to make words',
    icon: '🔗',
    route: '/games/sound-games/blending',
    color: 'teal',
  },
  {
    id: 'segmenting',
    name: 'Sound Segmenting',
    description: 'Break words into their sounds',
    icon: '✂️',
    route: '/games/sound-games/segmenting',
    color: 'pink',
  },
];

const READING_GAMES: Game[] = [
  {
    id: 'letter-match',
    name: 'Letter Match',
    description: 'Match uppercase to lowercase letters',
    icon: '🔡',
    route: '/games/letter-match',
    color: 'green',
  },
  {
    id: 'letter-tracer',
    name: 'Letter Tracer',
    description: 'Practice writing letters',
    icon: '✏️',
    route: '/games/letter-tracer',
    color: 'teal',
  },
  {
    id: 'word-builder',
    name: 'Word Builder',
    description: 'Build words letter by letter',
    icon: '🔤',
    route: '/games/word-builder',
    color: 'indigo',
  },
];

const VOCABULARY_GAMES: Game[] = [
  {
    id: 'vocabulary-builder',
    name: 'Vocabulary Builder',
    description: 'Learn new words with pictures',
    icon: '📚',
    route: '/games/vocabulary-builder',
    color: 'pink',
  },
];

const GRAMMAR_GAMES: Game[] = [
  {
    id: 'grammar-symbols',
    name: 'Grammar Symbols',
    description: 'Learn parts of speech the Montessori way',
    icon: '▲',
    route: '/games/grammar-symbols',
    color: 'red',
  },
  {
    id: 'sentence-builder',
    name: 'Sentence Builder',
    description: 'Build sentences with word cards',
    icon: '📝',
    route: '/games/sentence-builder',
    color: 'amber',
  },
  {
    id: 'sentence-match',
    name: 'Sentence Match',
    description: 'Match sentences to pictures',
    icon: '🖼️',
    route: '/games/sentence-match',
    color: 'emerald',
  },
];

// All categories
const GAME_CATEGORIES: GameCategory[] = [
  { id: 'sound-games', name: 'Sound Games', icon: '👂', games: SOUND_GAMES },
  { id: 'reading-games', name: 'Reading Games', icon: '📖', games: READING_GAMES },
  { id: 'vocabulary-games', name: 'Vocabulary', icon: '📚', games: VOCABULARY_GAMES },
  { id: 'grammar-games', name: 'Grammar', icon: '✏️', games: GRAMMAR_GAMES },
];

// Color mapping
const colorClasses: Record<string, { border: string; bg: string; hover: string }> = {
  blue: { border: 'border-l-blue-500', bg: 'bg-blue-50', hover: 'hover:bg-blue-100' },
  purple: { border: 'border-l-purple-500', bg: 'bg-purple-50', hover: 'hover:bg-purple-100' },
  orange: { border: 'border-l-orange-500', bg: 'bg-orange-50', hover: 'hover:bg-orange-100' },
  green: { border: 'border-l-green-500', bg: 'bg-green-50', hover: 'hover:bg-green-100' },
  teal: { border: 'border-l-teal-500', bg: 'bg-teal-50', hover: 'hover:bg-teal-100' },
  indigo: { border: 'border-l-indigo-500', bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100' },
  pink: { border: 'border-l-pink-500', bg: 'bg-pink-50', hover: 'hover:bg-pink-100' },
  amber: { border: 'border-l-amber-500', bg: 'bg-amber-50', hover: 'hover:bg-amber-100' },
  red: { border: 'border-l-red-500', bg: 'bg-red-50', hover: 'hover:bg-red-100' },
  cyan: { border: 'border-l-cyan-500', bg: 'bg-cyan-50', hover: 'hover:bg-cyan-100' },
  emerald: { border: 'border-l-emerald-500', bg: 'bg-emerald-50', hover: 'hover:bg-emerald-100' },
};

function GameCard({ game }: { game: Game }) {
  const colors = colorClasses[game.color] || colorClasses.blue;
  return (
    <div className={`relative bg-white rounded-2xl shadow-lg border-l-4 ${colors.border} p-4 sm:p-5 cursor-pointer transform transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]`}>
      {game.isNew && (
        <div className="absolute -top-2 -right-2 z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r from-pink-500 to-orange-500 shadow-md">✨ NEW</span>
        </div>
      )}
      <div className="text-5xl sm:text-6xl mb-3 select-none">{game.icon}</div>
      <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-1">{game.name}</h3>
      <p className="text-sm text-gray-600 leading-snug">{game.description}</p>
    </div>
  );
}

function CategorySection({ category }: { category: GameCategory }) {
  return (
    <section className="mb-8 sm:mb-10">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-gray-200">
        <span className="text-2xl">{category.icon}</span>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 uppercase tracking-wide">{category.name}</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
        {category.games.filter(g => !g.disabled).map((game) => (
          <Link key={game.id} href={game.route} className="block"><GameCard game={game} /></Link>
        ))}
      </div>
    </section>
  );
}

export default function GamesHubPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-100">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            <span className="hidden sm:inline">Back</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-2xl sm:text-3xl">🎮</span><span>Games Hub</span>
          </h1>
          <div className="w-16" />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-gray-600 text-base sm:text-lg">Choose a game to start learning! 🌟</p>
        </div>
        {GAME_CATEGORIES.map((category) => (<CategorySection key={category.id} category={category} />))}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">{GAME_CATEGORIES.reduce((acc, cat) => acc + cat.games.filter(g => !g.disabled).length, 0)} games available</p>
        </div>
      </main>
    </div>
  );
}
