// app/games/[gameId]/page.tsx
// Dynamic game loader page

'use client';

import React, { Suspense, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getGameById, PHASE_INFO } from '@/lib/games/game-config';
import { GamePhase, GameType } from '@/lib/games/types';
import LevelSelector from '@/components/games/LevelSelector';

// Game components (lazy loaded)
import dynamic from 'next/dynamic';

const LetterSoundGame = dynamic(() => import('@/components/games/LetterSoundGame'), {
  loading: () => <GameLoading />,
});

const LetterTraceGame = dynamic(() => import('@/components/games/LetterTraceGame'), {
  loading: () => <GameLoading />,
});

const WordBuildingGame = dynamic(() => import('@/components/games/WordBuildingGame'), {
  loading: () => <GameLoading />,
});

const PictureMatchGame = dynamic(() => import('@/components/games/PictureMatchGame'), {
  loading: () => <GameLoading />,
});

const MissingLetterGame = dynamic(() => import('@/components/games/MissingLetterGame'), {
  loading: () => <GameLoading />,
});

const SightFlashGame = dynamic(() => import('@/components/games/SightFlashGame'), {
  loading: () => <GameLoading />,
});

const SentenceBuildGame = dynamic(() => import('@/components/games/SentenceBuildGame'), {
  loading: () => <GameLoading />,
});

function GameLoading() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="text-6xl animate-bounce mb-4">🎮</div>
        <p className="text-white text-xl">Loading game...</p>
      </div>
    </div>
  );
}

export default function GamePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const gameId = params.gameId as GameType;
  const phase = (searchParams.get('phase') || 'letters') as GamePhase;
  const initialLevel = searchParams.get('level') || 'short-a';
  const [currentLevel, setCurrentLevel] = useState(initialLevel);
  
  const game = getGameById(gameId);
  
  if (!game) {
    return (
      <div 
        className="min-h-screen bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center"
        style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
      >
        <div className="text-center text-white">
          <div className="text-8xl mb-4">😕</div>
          <h1 className="text-3xl font-bold mb-4">Game Not Found</h1>
          <Link 
            href="/games"
            className="px-6 py-3 bg-white text-red-500 rounded-full font-bold hover:scale-105 transition-transform inline-block"
          >
            ← Back to Games
          </Link>
        </div>
      </div>
    );
  }

  const renderGame = () => {
    switch (gameId) {
      case 'letter-sound':
        return <LetterSoundGame phase={phase} />;
      case 'letter-trace':
        return <LetterTraceGame phase={phase} />;
      case 'word-building':
        return <WordBuildingGame phase={phase} level={currentLevel} />;
      case 'picture-match':
        return <PictureMatchGame phase={phase} level={currentLevel} />;
      case 'missing-letter':
        return <MissingLetterGame phase={phase} level={currentLevel} />;
      case 'sight-flash':
        return <SightFlashGame level={currentLevel} />;
      case 'sentence-build':
        return <SentenceBuildGame level={currentLevel} />;
      default:
        return <GameLoading />;
    }
  };

  return (
    <div 
      className="min-h-screen"
      style={{ 
        fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
        background: `linear-gradient(135deg, ${game.color}dd, ${game.color}99)`,
      }}
    >
      {/* Header */}
      <header className="bg-black/10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link 
              href="/games"
              className="flex items-center gap-2 text-white hover:scale-105 transition-transform"
            >
              <span className="text-2xl">←</span>
              <span className="font-bold">Back</span>
            </Link>
            
            <div className="flex items-center gap-3">
              <span className="text-3xl">{game.icon}</span>
              <div>
                <h1 className="text-xl font-bold text-white">{game.name}</h1>
                <p className="text-white/70 text-sm">
                  {PHASE_INFO[phase]?.name || phase}
                </p>
              </div>
            </div>

            <div className="text-3xl">
              {PHASE_INFO[phase]?.icon || '🎮'}
            </div>
          </div>
        </div>
      </header>

      {/* Level Selector */}
      <div className="max-w-6xl mx-auto px-4 py-3">
        <LevelSelector 
          phase={phase}
          currentLevel={currentLevel}
          onLevelChange={setCurrentLevel}
        />
      </div>

      {/* Game Area */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Suspense fallback={<GameLoading />}>
          {renderGame()}
        </Suspense>
      </main>
    </div>
  );
}

