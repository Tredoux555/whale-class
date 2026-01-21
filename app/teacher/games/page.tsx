// app/teacher/games/page.tsx
// Teacher Game Stats Dashboard
// Shows class-wide game progress, per-child activity, XP leaderboard

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface GameStats {
  game_id: string;
  game_name: string;
  game_slug: string;
  icon: string;
  total_plays: number;
  unique_players: number;
  avg_score: number;
  total_xp: number;
}

interface StudentGameProgress {
  student_id: string;
  student_name: string;
  avatar: string;
  total_games_played: number;
  total_xp: number;
  favorite_game: string;
  last_played: string;
}

// Game data with icons
const GAME_STATS: GameStats[] = [
  { game_id: '1', game_name: 'Sound Safari', game_slug: 'sound-safari', icon: '🦁', total_plays: 47, unique_players: 12, avg_score: 85, total_xp: 2350 },
  { game_id: '2', game_name: 'Letter Tracer', game_slug: 'letter-tracer', icon: '✏️', total_plays: 38, unique_players: 11, avg_score: 78, total_xp: 1900 },
  { game_id: '3', game_name: 'Word Builder', game_slug: 'word-builder-new', icon: '🧱', total_plays: 32, unique_players: 10, avg_score: 72, total_xp: 1600 },
  { game_id: '4', game_name: 'Quantity Match', game_slug: 'quantity-match', icon: '🔢', total_plays: 28, unique_players: 9, avg_score: 88, total_xp: 1400 },
  { game_id: '5', game_name: 'Number Tracer', game_slug: 'number-tracer', icon: '🔢', total_plays: 25, unique_players: 8, avg_score: 82, total_xp: 1250 },
  { game_id: '6', game_name: 'Match Attack', game_slug: 'match-attack-new', icon: '⚡', total_plays: 22, unique_players: 8, avg_score: 76, total_xp: 1100 },
  { game_id: '7', game_name: 'Read & Reveal', game_slug: 'read-and-reveal', icon: '📖', total_plays: 18, unique_players: 7, avg_score: 80, total_xp: 900 },
  { game_id: '8', game_name: 'Bead Frame', game_slug: 'bead-frame', icon: '🧮', total_plays: 15, unique_players: 6, avg_score: 70, total_xp: 750 },
  { game_id: '9', game_name: 'Sensorial Sort', game_slug: 'sensorial-sort', icon: '👁️', total_plays: 12, unique_players: 5, avg_score: 90, total_xp: 600 },
  { game_id: '10', game_name: 'Sentence Scramble', game_slug: 'sentence-scramble', icon: '📝', total_plays: 10, unique_players: 4, avg_score: 68, total_xp: 500 },
];

const STUDENT_PROGRESS: StudentGameProgress[] = [
  { student_id: '1', student_name: 'Emma', avatar: '👧', total_games_played: 24, total_xp: 1200, favorite_game: 'Sound Safari', last_played: '2026-01-21' },
  { student_id: '2', student_name: 'Liam', avatar: '👦', total_games_played: 22, total_xp: 1100, favorite_game: 'Quantity Match', last_played: '2026-01-21' },
  { student_id: '3', student_name: 'Sophia', avatar: '👧', total_games_played: 20, total_xp: 1000, favorite_game: 'Letter Tracer', last_played: '2026-01-20' },
  { student_id: '4', student_name: 'Noah', avatar: '👦', total_games_played: 18, total_xp: 900, favorite_game: 'Word Builder', last_played: '2026-01-21' },
  { student_id: '5', student_name: 'Olivia', avatar: '👧', total_games_played: 16, total_xp: 800, favorite_game: 'Sound Safari', last_played: '2026-01-20' },
  { student_id: '6', student_name: 'William', avatar: '👦', total_games_played: 14, total_xp: 700, favorite_game: 'Bead Frame', last_played: '2026-01-19' },
  { student_id: '7', student_name: 'Ava', avatar: '👧', total_games_played: 12, total_xp: 600, favorite_game: 'Sensorial Sort', last_played: '2026-01-21' },
  { student_id: '8', student_name: 'James', avatar: '👦', total_games_played: 10, total_xp: 500, favorite_game: 'Number Tracer', last_played: '2026-01-18' },
];

export default function TeacherGamesPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'leaderboard'>('overview');

  // Calculate totals
  const totalPlays = GAME_STATS.reduce((sum, g) => sum + g.total_plays, 0);
  const totalXP = GAME_STATS.reduce((sum, g) => sum + g.total_xp, 0);
  const avgScore = Math.round(GAME_STATS.reduce((sum, g) => sum + g.avg_score, 0) / GAME_STATS.length);

  // Sort for leaderboard
  const leaderboard = [...STUDENT_PROGRESS].sort((a, b) => b.total_xp - a.total_xp);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/teacher" className="text-gray-500 hover:text-gray-700">
                ← Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-800">🎮 Game Stats</h1>
            </div>
            <Link 
              href="/games"
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
            >
              Play Games →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="text-3xl font-bold text-indigo-600">{totalPlays}</div>
            <div className="text-sm text-gray-500">Games Played</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="text-3xl font-bold text-yellow-500">{totalXP.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Total XP</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="text-3xl font-bold text-green-500">{avgScore}%</div>
            <div className="text-sm text-gray-500">Avg Score</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="text-3xl font-bold text-purple-500">{STUDENT_PROGRESS.length}</div>
            <div className="text-sm text-gray-500">Active Players</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          {[
            { id: 'overview', label: '📊 Games', icon: '📊' },
            { id: 'students', label: '👤 Students', icon: '👤' },
            { id: 'leaderboard', label: '🏆 Leaderboard', icon: '🏆' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-3 font-medium transition-colors border-b-2 -mb-[2px]
                ${activeTab === tab.id 
                  ? 'border-indigo-500 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {GAME_STATS.map(game => (
              <div key={game.game_id} className="bg-white rounded-xl p-5 shadow-sm border hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{game.icon}</span>
                  <div>
                    <h3 className="font-bold text-gray-800">{game.game_name}</h3>
                    <p className="text-sm text-gray-500">{game.unique_players} players</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="font-bold text-indigo-600">{game.total_plays}</div>
                    <div className="text-xs text-gray-500">Plays</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="font-bold text-green-600">{game.avg_score}%</div>
                    <div className="text-xs text-gray-500">Avg</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="font-bold text-yellow-600">{game.total_xp}</div>
                    <div className="text-xs text-gray-500">XP</div>
                  </div>
                </div>
                <Link 
                  href={`/games/${game.game_slug}`}
                  className="mt-4 block text-center text-sm text-indigo-500 hover:text-indigo-700"
                >
                  View Game →
                </Link>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'students' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-600">Student</th>
                  <th className="text-center p-4 font-medium text-gray-600">Games</th>
                  <th className="text-center p-4 font-medium text-gray-600">XP</th>
                  <th className="text-left p-4 font-medium text-gray-600">Favorite</th>
                  <th className="text-left p-4 font-medium text-gray-600">Last Played</th>
                </tr>
              </thead>
              <tbody>
                {STUDENT_PROGRESS.map(student => (
                  <tr key={student.student_id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{student.avatar}</span>
                        <span className="font-medium">{student.student_name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center font-medium text-indigo-600">{student.total_games_played}</td>
                    <td className="p-4 text-center font-medium text-yellow-600">{student.total_xp}</td>
                    <td className="p-4 text-gray-600">{student.favorite_game}</td>
                    <td className="p-4 text-gray-500 text-sm">{student.last_played}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="max-w-2xl mx-auto">
            {/* Top 3 Podium */}
            <div className="flex justify-center items-end gap-4 mb-8">
              {/* 2nd Place */}
              <div className="text-center">
                <div className="text-4xl mb-2">{leaderboard[1]?.avatar}</div>
                <div className="bg-gray-200 rounded-t-lg px-8 py-6">
                  <div className="text-2xl font-bold text-gray-400">🥈</div>
                  <div className="font-bold">{leaderboard[1]?.student_name}</div>
                  <div className="text-yellow-600 font-bold">{leaderboard[1]?.total_xp} XP</div>
                </div>
              </div>
              {/* 1st Place */}
              <div className="text-center">
                <div className="text-5xl mb-2">{leaderboard[0]?.avatar}</div>
                <div className="bg-yellow-100 rounded-t-lg px-10 py-8">
                  <div className="text-3xl font-bold text-yellow-500">🥇</div>
                  <div className="font-bold text-lg">{leaderboard[0]?.student_name}</div>
                  <div className="text-yellow-600 font-bold text-xl">{leaderboard[0]?.total_xp} XP</div>
                </div>
              </div>
              {/* 3rd Place */}
              <div className="text-center">
                <div className="text-4xl mb-2">{leaderboard[2]?.avatar}</div>
                <div className="bg-orange-100 rounded-t-lg px-8 py-4">
                  <div className="text-2xl font-bold text-orange-400">🥉</div>
                  <div className="font-bold">{leaderboard[2]?.student_name}</div>
                  <div className="text-yellow-600 font-bold">{leaderboard[2]?.total_xp} XP</div>
                </div>
              </div>
            </div>

            {/* Rest of Leaderboard */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              {leaderboard.slice(3).map((student, index) => (
                <div key={student.student_id} className="flex items-center p-4 border-b last:border-0 hover:bg-gray-50">
                  <div className="w-8 text-center font-bold text-gray-400">{index + 4}</div>
                  <span className="text-2xl mx-3">{student.avatar}</span>
                  <div className="flex-1 font-medium">{student.student_name}</div>
                  <div className="font-bold text-yellow-600">{student.total_xp} XP</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Games for This Week */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📌 Recommended for This Week</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl p-5 text-white">
              <div className="text-3xl mb-2">🦁</div>
              <h3 className="font-bold text-lg">Sound Safari</h3>
              <p className="text-white/80 text-sm">Reinforces I-Spy Sound Games</p>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-5 text-white">
              <div className="text-3xl mb-2">✏️</div>
              <h3 className="font-bold text-lg">Letter Tracer</h3>
              <p className="text-white/80 text-sm">Practice Sandpaper Letters</p>
            </div>
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl p-5 text-white">
              <div className="text-3xl mb-2">🧱</div>
              <h3 className="font-bold text-lg">Word Builder</h3>
              <p className="text-white/80 text-sm">Extends Moveable Alphabet</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
