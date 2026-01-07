// app/games/[gameId]/page.tsx
// Dynamic game loader - Updated to use ElevenLabs-enabled components

'use client';

import React from 'react';
import { useParams } from 'next/navigation';

// Import numbered components (have ElevenLabs audio)
import LetterTracer from '@/components/04-LetterTracer';
import LetterSoundMatchingGame from '@/components/07-LetterSoundMatchingGame';
import WordBuildingGame from '@/components/08-WordBuildingGame';
import SentenceMatchingGame from '@/components/09-SentenceMatchingGame';
import SentenceBuilderGame from '@/components/10-SentenceBuilderGame';
import BigToSmallLetterMatchingGame from '@/components/12-BigToSmallLetterMatchingGame';

// Import games/ folder components for ones that don't have numbered versions
import PictureMatchGame from '@/components/games/PictureMatchGame';
import MissingLetterGame from '@/components/games/MissingLetterGame';
import SightFlashGame from '@/components/games/SightFlashGame';

const GAME_COMPONENTS: Record<string, React.ComponentType<any>> = {
  // Numbered components with ElevenLabs
  'letter-trace': LetterTracer,
  'letter-sound': LetterSoundMatchingGame,
  'word-building': WordBuildingGame,
  'sentence-match': SentenceMatchingGame,
  'sentence-build': SentenceBuilderGame,
  'letter-match': BigToSmallLetterMatchingGame,
  
  // Games folder components
  'picture-match': PictureMatchGame,
  'missing-letter': MissingLetterGame,
  'sight-flash': SightFlashGame,
};

export default function GamePage() {
  const params = useParams();
  const gameId = params.gameId as string;
  
  const GameComponent = GAME_COMPONENTS[gameId];
  
  if (!GameComponent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <div className="text-6xl mb-4">🎮</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Game not found</h1>
          <p className="text-gray-600 mb-6">"{gameId}" doesn't exist yet</p>
          <a 
            href="/games" 
            className="inline-block px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors"
          >
            ← Back to Games
          </a>
        </div>
      </div>
    );
  }
  
  return <GameComponent />;
}
