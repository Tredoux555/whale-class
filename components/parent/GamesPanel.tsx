// components/parent/GamesPanel.tsx
// Shows child's game progress and recommended homework games

'use client';

import React from 'react';
import Link from 'next/link';

interface GameProgress {
  game_name: string;
  game_slug: string;
  icon: string;
  plays: number;
  total_xp: number;
  best_score: number;
}

interface Props {
  childId: string;
}

// Mock data - replace with API call
const GAME_PROGRESS: GameProgress[] = [
  { game_name: 'Sound Safari', game_slug: 'sound-safari', icon: '🦁', plays: 8, total_xp: 400, best_score: 95 },
  { game_name: 'Letter Tracer', game_slug: 'letter-tracer', icon: '✏️', plays: 6, total_xp: 300, best_score: 88 },
  { game_name: 'Word Builder', game_slug: 'word-builder-new', icon: '🧱', plays: 4, total_xp: 200, best_score: 82 },
];

const RECOMMENDED_GAMES = [
  { game_name: 'Sound Safari', game_slug: 'sound-safari', icon: '🦁', reason: 'Practicing I-Spy this week' },
  { game_name: 'Quantity Match', game_slug: 'quantity-match', icon: '🔢', reason: 'Reinforce counting skills' },
];

export default function GamesPanel({ childId }: Props) {
  const totalXP = GAME_PROGRESS.reduce((sum, g) => sum + g.total_xp, 0);
  const totalPlays = GAME_PROGRESS.reduce((sum, g) => sum + g.plays, 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">🎮 Learning Games</h2>
            <p className="text-white/80 text-sm">Practice at home!</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{totalXP}</div>
            <div className="text-xs text-white/80">Total XP</div>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-indigo-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-indigo-600">{totalPlays}</div>
            <div className="text-xs text-gray-500">Games Played</div>
          </div>
          <div className="bg-yellow-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">{GAME_PROGRESS.length}</div>
            <div className="text-xs text-gray-500">Games Tried</div>
          </div>
        </div>

        {/* Recent Games */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Activity</h3>
          <div className="space-y-2">
            {GAME_PROGRESS.slice(0, 3).map(game => (
              <Link
                key={game.game_slug}
                href={`/games/${game.game_slug}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl">{game.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-sm">{game.game_name}</div>
                  <div className="text-xs text-gray-500">{game.plays} plays • Best: {game.best_score}%</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-yellow-600">+{game.total_xp}</div>
                  <div className="text-xs text-gray-400">XP</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recommended for Homework */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">📌 Homework Games</h3>
          <div className="space-y-2">
            {RECOMMENDED_GAMES.map(game => (
              <Link
                key={game.game_slug}
                href={`/games/${game.game_slug}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 hover:shadow-md transition-all"
              >
                <span className="text-2xl">{game.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-sm text-green-800">{game.game_name}</div>
                  <div className="text-xs text-green-600">{game.reason}</div>
                </div>
                <span className="text-green-500">→</span>
              </Link>
            ))}
          </div>
        </div>

        {/* View All Button */}
        <Link
          href="/games"
          className="mt-4 block w-full py-3 text-center bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors"
        >
          View All Games 🎮
        </Link>
      </div>
    </div>
  );
}
