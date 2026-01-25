// app/admin/game-stats/page.tsx
// Principal/Admin Game Analytics Dashboard
// School-wide stats, class comparisons, trends, engagement metrics

'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface ClassStats {
  class_id: string;
  class_name: string;
  teacher_name: string;
  student_count: number;
  total_plays: number;
  total_xp: number;
  avg_score: number;
  engagement_rate: number; // % of students who played this week
}

interface GamePopularity {
  game_name: string;
  game_slug: string;
  icon: string;
  plays: number;
  percentage: number;
}

interface WeeklyTrend {
  week: string;
  plays: number;
  xp: number;
  active_students: number;
}

// Mock data
const CLASS_STATS: ClassStats[] = [
  { class_id: '1', class_name: 'Whale Class', teacher_name: 'Tredoux', student_count: 12, total_plays: 247, total_xp: 12350, avg_score: 82, engagement_rate: 92 },
  { class_id: '2', class_name: 'Dolphin Class', teacher_name: 'Sarah', student_count: 10, total_plays: 185, total_xp: 9250, avg_score: 78, engagement_rate: 80 },
  { class_id: '3', class_name: 'Starfish Class', teacher_name: 'Mike', student_count: 8, total_plays: 120, total_xp: 6000, avg_score: 75, engagement_rate: 75 },
];

const GAME_POPULARITY: GamePopularity[] = [
  { game_name: 'Sound Safari', game_slug: 'sound-safari', icon: '🦁', plays: 147, percentage: 27 },
  { game_name: 'Letter Tracer', game_slug: 'letter-tracer', icon: '✏️', plays: 98, percentage: 18 },
  { game_name: 'Quantity Match', game_slug: 'quantity-match', icon: '🔢', plays: 85, percentage: 15 },
  { game_name: 'Word Builder', game_slug: 'word-builder-new', icon: '🧱', plays: 72, percentage: 13 },
  { game_name: 'Number Tracer', game_slug: 'number-tracer', icon: '🔢', plays: 55, percentage: 10 },
  { game_name: 'Others', game_slug: '', icon: '🎮', plays: 95, percentage: 17 },
];

const WEEKLY_TRENDS: WeeklyTrend[] = [
  { week: 'Week 1', plays: 120, xp: 6000, active_students: 18 },
  { week: 'Week 2', plays: 185, xp: 9250, active_students: 22 },
  { week: 'Week 3', plays: 247, xp: 12350, active_students: 28 },
  { week: 'Week 4', plays: 310, xp: 15500, active_students: 30 },
];

export default function AdminGameStatsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('month');

  // Calculate totals
  const totalPlays = CLASS_STATS.reduce((sum, c) => sum + c.total_plays, 0);
  const totalXP = CLASS_STATS.reduce((sum, c) => sum + c.total_xp, 0);
  const totalStudents = CLASS_STATS.reduce((sum, c) => sum + c.student_count, 0);
  const avgEngagement = Math.round(CLASS_STATS.reduce((sum, c) => sum + c.engagement_rate, 0) / CLASS_STATS.length);

  // Find max for trend chart scaling
  const maxPlays = Math.max(...WEEKLY_TRENDS.map(t => t.plays));

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-gray-400 hover:text-white">
                ← Admin
              </Link>
              <h1 className="text-2xl font-bold">📊 Game Analytics</h1>
            </div>
            <div className="flex gap-2">
              {['week', 'month', 'all'].map(period => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period as typeof selectedPeriod)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors
                    ${selectedPeriod === period 
                      ? 'bg-indigo-500 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                  {period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'All Time'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div className="text-4xl font-bold text-indigo-400">{totalPlays}</div>
            <div className="text-gray-400 text-sm">Total Games Played</div>
            <div className="text-green-400 text-xs mt-1">↑ 34% vs last month</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div className="text-4xl font-bold text-yellow-400">{totalXP.toLocaleString()}</div>
            <div className="text-gray-400 text-sm">Total XP Earned</div>
            <div className="text-green-400 text-xs mt-1">↑ 28% vs last month</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div className="text-4xl font-bold text-green-400">{avgEngagement}%</div>
            <div className="text-gray-400 text-sm">Engagement Rate</div>
            <div className="text-green-400 text-xs mt-1">↑ 12% vs last month</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div className="text-4xl font-bold text-purple-400">{totalStudents}</div>
            <div className="text-gray-400 text-sm">Active Students</div>
            <div className="text-gray-500 text-xs mt-1">Across {CLASS_STATS.length} classes</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Weekly Trend Chart */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-lg font-bold mb-4">📈 Weekly Activity Trend</h2>
            <div className="flex items-end gap-4 h-48">
              {WEEKLY_TRENDS.map((week, index) => (
                <div key={week.week} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-lg transition-all hover:from-indigo-500 hover:to-indigo-300"
                    style={{ height: `${(week.plays / maxPlays) * 100}%` }}
                  />
                  <div className="text-xs text-gray-400 mt-2">{week.week}</div>
                  <div className="text-xs text-indigo-400 font-bold">{week.plays}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Game Popularity */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-lg font-bold mb-4">🎮 Most Played Games</h2>
            <div className="space-y-3">
              {GAME_POPULARITY.map(game => (
                <div key={game.game_name} className="flex items-center gap-3">
                  <span className="text-2xl w-8">{game.icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{game.game_name}</span>
                      <span className="text-gray-400">{game.plays} plays</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                        style={{ width: `${game.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Class Comparison Table */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-bold">🏫 Class Comparison</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="text-left p-4 text-gray-400 font-medium">Class</th>
                <th className="text-left p-4 text-gray-400 font-medium">Teacher</th>
                <th className="text-center p-4 text-gray-400 font-medium">Students</th>
                <th className="text-center p-4 text-gray-400 font-medium">Games</th>
                <th className="text-center p-4 text-gray-400 font-medium">XP</th>
                <th className="text-center p-4 text-gray-400 font-medium">Avg Score</th>
                <th className="text-center p-4 text-gray-400 font-medium">Engagement</th>
              </tr>
            </thead>
            <tbody>
              {CLASS_STATS.map((cls, index) => (
                <tr key={cls.class_id} className="border-t border-gray-700 hover:bg-gray-700/30">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {index === 0 && <span className="text-yellow-400">🏆</span>}
                      <span className="font-medium">{cls.class_name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-400">{cls.teacher_name}</td>
                  <td className="p-4 text-center">{cls.student_count}</td>
                  <td className="p-4 text-center font-medium text-indigo-400">{cls.total_plays}</td>
                  <td className="p-4 text-center font-medium text-yellow-400">{cls.total_xp.toLocaleString()}</td>
                  <td className="p-4 text-center">
                    <span className={`font-medium ${cls.avg_score >= 80 ? 'text-green-400' : cls.avg_score >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {cls.avg_score}%
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${cls.engagement_rate >= 80 ? 'bg-green-500' : cls.engagement_rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${cls.engagement_rate}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-400">{cls.engagement_rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link 
            href="/teacher/games"
            className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-indigo-500 transition-colors group"
          >
            <div className="text-2xl mb-2">👩‍🏫</div>
            <h3 className="font-bold group-hover:text-indigo-400">Teacher View</h3>
            <p className="text-sm text-gray-400">See class-level game stats</p>
          </Link>
          <Link 
            href="/games"
            className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-green-500 transition-colors group"
          >
            <div className="text-2xl mb-2">🎮</div>
            <h3 className="font-bold group-hover:text-green-400">Games Hub</h3>
            <p className="text-sm text-gray-400">View all available games</p>
          </Link>
          <Link 
            href="/admin/users"
            className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-purple-500 transition-colors group"
          >
            <div className="text-2xl mb-2">👥</div>
            <h3 className="font-bold group-hover:text-purple-400">Manage Users</h3>
            <p className="text-sm text-gray-400">Add teachers and students</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
