// app/games/[gameId]/page.tsx
// Dynamic game loader

'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import LetterSoundGame from '@/components/games/LetterSoundGame';
import LetterTraceGame from '@/components/games/LetterTraceGame';
import WordBuildingGame from '@/components/games/WordBuildingGame';
import PictureMatchGame from '@/components/games/PictureMatchGame';
import MissingLetterGame from '@/components/games/MissingLetterGame';
import SightFlashGame from '@/components/games/SightFlashGame';
import SentenceBuildGame from '@/components/games/SentenceBuildGame';

const GAME_COMPONENTS: Record<string, React.ComponentType<any>> = {
  'letter-sound': LetterSoundGame,
  'letter-trace': LetterTraceGame,
  'word-building': WordBuildingGame,
  'picture-match': PictureMatchGame,
  'missing-letter': MissingLetterGame,
  'sight-flash': SightFlashGame,
  'sentence-build': SentenceBuildGame,
};

export default function GamePage() {
  const params = useParams();
  const gameId = params.gameId as string;
  
  const GameComponent = GAME_COMPONENTS[gameId];
  
  if (!GameComponent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Game not found</h1>
          <a href="/games" className="text-blue-500 hover:underline">
            ← Back to Games
          </a>
        </div>
      </div>
    );
  }
  
  return <GameComponent />;
}
