// app/games/[gameId]/page.tsx
// Dynamic game loader with Related Montessori Works panel
// UPDATED: Shows curriculum connections for each game

'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// Import numbered components (have ElevenLabs audio)
import LetterTracer from '@/components/04-LetterTracer';
import LetterSoundMatchingGame from '@/components/07-LetterSoundMatchingGame';
import WordBuildingGame from '@/components/08-WordBuildingGame';
import SentenceMatchingGame from '@/components/09-SentenceMatchingGame';
import SentenceBuilderGame from '@/components/10-SentenceBuilderGame';
import BigToSmallLetterMatchingGame from '@/components/12-BigToSmallLetterMatchingGame';

// Import games/ folder components
import PictureMatchGame from '@/components/games/PictureMatchGame';
import MissingLetterGame from '@/components/games/MissingLetterGame';
import SightFlashGame from '@/components/games/SightFlashGame';
import VocabularyBuilderGame from '@/components/games/VocabularyBuilderGame';

interface RelatedWork {
  id: string;
  name: string;
  slug: string;
  curriculum_area: string;
  sub_area: string;
  age_min: number;
  age_max: number;
  is_gateway: boolean;
  parent_explanation_simple: string;
  relationship_type: string;
}

interface GameData {
  id: string;
  name: string;
  slug: string;
  description: string;
  game_type: string;
  learning_objectives: string[];
}

const GAME_COMPONENTS: Record<string, React.ComponentType<any>> = {
  'letter-trace': LetterTracer,
  'letter-sound': LetterSoundMatchingGame,
  'word-building': WordBuildingGame,
  'sentence-match': SentenceMatchingGame,
  'sentence-build': SentenceBuilderGame,
  'letter-match': BigToSmallLetterMatchingGame,
  'picture-match': PictureMatchGame,
  'missing-letter': MissingLetterGame,
  'sight-flash': SightFlashGame,
  'vocabulary-builder': VocabularyBuilderGame,
};

const AREA_COLORS: Record<string, { bg: string; text: string; gradient: string }> = {
  practical_life: { bg: 'bg-amber-500/20', text: 'text-amber-300', gradient: 'from-amber-500 to-orange-500' },
  sensorial: { bg: 'bg-pink-500/20', text: 'text-pink-300', gradient: 'from-pink-500 to-rose-500' },
  mathematics: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', gradient: 'from-emerald-500 to-green-500' },
  language: { bg: 'bg-blue-500/20', text: 'text-blue-300', gradient: 'from-blue-500 to-cyan-500' },
  cultural: { bg: 'bg-purple-500/20', text: 'text-purple-300', gradient: 'from-purple-500 to-violet-500' },
};

const AREA_ICONS: Record<string, string> = {
  practical_life: '🏠',
  sensorial: '👁️',
  mathematics: '🔢',
  language: '📖',
  cultural: '🌍',
};

export default function GamePage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const [showInfo, setShowInfo] = useState(false);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [relatedWorks, setRelatedWorks] = useState<RelatedWork[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Fetch game metadata and related works
  useEffect(() => {
    async function fetchGameData() {
      try {
        const res = await fetch(`/api/games/${gameId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setGameData(data.game);
            setRelatedWorks(data.related_works || []);
          }
        }
      } catch (err) {
        console.error('Failed to fetch game data:', err);
      }
      setLoadingMeta(false);
    }
    fetchGameData();
  }, [gameId]);

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

  return (
    <div className="relative">
      {/* Game Component - Full Screen */}
      <GameComponent />

      {/* Floating Info Button */}
      {relatedWorks.length > 0 && (
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="fixed bottom-4 right-4 z-50 w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-lg flex items-center justify-center text-white text-2xl hover:scale-110 transition-transform"
          title="View Montessori Curriculum Connection"
        >
          {showInfo ? '✕' : '🧠'}
        </button>
      )}

      {/* Related Works Panel */}
      {showInfo && relatedWorks.length > 0 && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowInfo(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🧠</span>
                <div>
                  <h2 className="text-lg font-bold text-white">Montessori Connection</h2>
                  <p className="text-indigo-200 text-sm">
                    {gameData?.name || gameId} reinforces these curriculum works
                  </p>
                </div>
              </div>
            </div>

            {/* Works List */}
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-3">
              {relatedWorks.map((work) => {
                const colors = AREA_COLORS[work.curriculum_area] || AREA_COLORS.language;
                const icon = AREA_ICONS[work.curriculum_area] || '📚';

                return (
                  <Link
                    key={work.id}
                    href={`/admin/handbook/${work.curriculum_area}`}
                    className="block p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 hover:bg-slate-800 transition-all group"
                  >
                    {/* Area Gradient Bar */}
                    <div className={`h-1 w-16 rounded-full bg-gradient-to-r ${colors.gradient} mb-3`} />

                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                            {work.name}
                          </h3>
                          {work.is_gateway && (
                            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                              🌟 Gateway
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-xs ${colors.bg} ${colors.text} capitalize`}>
                            {work.curriculum_area.replace('_', ' ')}
                          </span>
                          <span className="text-slate-500 text-xs">
                            Ages {work.age_min}-{work.age_max}
                          </span>
                          <span className="text-indigo-400 text-xs capitalize">
                            • {work.relationship_type}
                          </span>
                        </div>

                        {work.parent_explanation_simple && (
                          <p className="text-slate-400 text-sm mt-2 line-clamp-2">
                            {work.parent_explanation_simple}
                          </p>
                        )}
                      </div>

                      <span className="text-slate-600 group-hover:text-indigo-400 transition-colors">
                        →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700">
              <p className="text-slate-500 text-xs text-center">
                💡 Games reinforce classroom Montessori works through digital practice
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
