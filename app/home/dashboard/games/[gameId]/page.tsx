'use client';

// /home/dashboard/games/[gameId]/page.tsx
// Dynamic game route wrapper
// Maps game IDs to game components from the shared games library

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';

// Import all game components
import LetterSoundMatchingGame from '@/components/games/07-LetterSoundMatchingGame';
import WordBuildingGame from '@/components/games/WordBuildingGame';
import SentenceMatchingGame from '@/components/games/09-SentenceMatchingGame';
import LetterTraceGame from '@/components/games/LetterTraceGame';
import CapitalLetterTraceGame from '@/components/games/CapitalLetterTraceGame';
import NumberTraceGame from '@/components/games/NumberTraceGame';
import VocabularyBuilderGame from '@/components/games/VocabularyBuilderGame';
import GrammarSymbolsGame from '@/components/games/GrammarSymbolsGame';
import SentenceBuildGame from '@/components/games/SentenceBuildGame';
import PictureMatchGame from '@/components/games/PictureMatchGame';
import LetterSoundGame from '@/components/games/LetterSoundGame';

// Game manifest - maps route IDs to components and metadata
interface GameManifest {
  [key: string]: {
    name: string;
    component: React.ComponentType<any>;
    category: string;
    emoji: string;
  };
}

const GAMES: GameManifest = {
  'letter-sounds': {
    name: 'Letter Sounds',
    component: LetterSoundMatchingGame,
    category: 'phonics',
    emoji: '🔤',
  },
  'word-builder': {
    name: 'Word Builder',
    component: WordBuildingGame,
    category: 'reading',
    emoji: '🧱',
  },
  'sentence-match': {
    name: 'Sentence Match',
    component: SentenceMatchingGame,
    category: 'grammar',
    emoji: '🖼️',
  },
  'letter-tracer': {
    name: 'Letter Tracer',
    component: LetterTraceGame,
    category: 'reading',
    emoji: '✏️',
  },
  'capital-letter-tracer': {
    name: 'Capital Letters',
    component: CapitalLetterTraceGame,
    category: 'reading',
    emoji: '🔠',
  },
  'number-tracer': {
    name: 'Number Tracer',
    component: NumberTraceGame,
    category: 'math',
    emoji: '✏️',
  },
  'vocabulary-builder': {
    name: 'Vocabulary Builder',
    component: VocabularyBuilderGame,
    category: 'reading',
    emoji: '📖',
  },
  'grammar-symbols': {
    name: 'Grammar Symbols',
    component: GrammarSymbolsGame,
    category: 'grammar',
    emoji: '▲',
  },
  'sentence-builder': {
    name: 'Sentence Builder',
    component: SentenceBuildGame,
    category: 'grammar',
    emoji: '📝',
  },
  'picture-match': {
    name: 'Picture Match',
    component: PictureMatchGame,
    category: 'sensorial',
    emoji: '🎨',
  },
  'sound-game': {
    name: 'Sound Game',
    component: LetterSoundGame,
    category: 'phonics',
    emoji: '👂',
  },
};

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    // Validate game ID
    if (gameId && GAMES[gameId]) {
      setIsValid(true);
    } else {
      setIsValid(false);
    }
  }, [gameId]);

  if (!gameId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <div className="text-5xl mb-4">🎮</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Game Not Found</h1>
          <p className="text-gray-600 mb-6">Invalid game ID</p>
          <Link
            href="/home/dashboard/games"
            className="inline-block bg-emerald-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-600 transition-colors"
          >
            Back to Games
          </Link>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Game Not Found</h1>
          <p className="text-gray-600 mb-2">We couldn't find the game "{gameId}"</p>
          <p className="text-sm text-gray-500 mb-6">Please select a game from the available options.</p>
          <Link
            href="/home/dashboard/games"
            className="inline-block bg-emerald-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-600 transition-colors"
          >
            Back to Games
          </Link>
        </div>
      </div>
    );
  }

  const game = GAMES[gameId];
  const GameComponent = game.component;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Home Header */}
      <div className="sticky top-0 z-50 bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.push('/home/dashboard/games')}
          className="flex items-center gap-2 text-white hover:text-emerald-400 transition-colors"
        >
          <span className="text-xl">←</span>
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="text-center">
          <p className="text-white font-semibold text-sm">{game.emoji} {game.name}</p>
          <p className="text-slate-400 text-xs">Montree Home</p>
        </div>
        <div className="w-12"></div>
      </div>

      {/* Game Container */}
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center p-4">
        <div className="w-full max-w-6xl">
          <GameComponent
            onBack={() => router.push('/home/dashboard/games')}
            onComplete={() => {
              // Optional: could track completion in home_progress or similar
              // For now, just show success and let user return
            }}
          />
        </div>
      </div>
    </div>
  );
}
