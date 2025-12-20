'use client';

import React from 'react';

interface Props {
  child: {
    name: string;
    age: number | null;
  };
  stats: {
    totalCompleted: number;
    totalInProgress: number;
    weeklyCompletions: number;
    currentStreak: number;
    totalWatchTimeMinutes: number;
    completedVideos: number;
  };
  areaProgress: {
    completed_works: number;
    total_works: number;
  }[];
}

export default function ProgressOverview({ child, stats, areaProgress }: Props) {
  const totalWorks = areaProgress.reduce((sum, a) => sum + a.total_works, 0);
  const overallPercentage = totalWorks > 0 
    ? Math.round((stats.totalCompleted / totalWorks) * 100) 
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{child.name}'s Journey</h2>
          <p className="text-gray-500">
            {stats.totalCompleted} of {totalWorks} works completed
          </p>
        </div>
        
        {/* Circular Progress */}
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle
              cx="40" cy="40" r="34"
              stroke="#e5e7eb" strokeWidth="6" fill="none"
            />
            <circle
              cx="40" cy="40" r="34"
              stroke="#3b82f6" strokeWidth="6" fill="none"
              strokeDasharray={`${overallPercentage * 2.14} 214`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-900">{overallPercentage}%</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.totalCompleted}</div>
          <div className="text-xs text-green-700">Completed</div>
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.totalInProgress}</div>
          <div className="text-xs text-yellow-700">In Progress</div>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.weeklyCompletions}</div>
          <div className="text-xs text-blue-700">This Week</div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {stats.currentStreak > 0 ? `${stats.currentStreak}🔥` : '0'}
          </div>
          <div className="text-xs text-purple-700">Day Streak</div>
        </div>
      </div>

      {/* Video Stats */}
      <div className="mt-4 pt-4 border-t flex items-center justify-center gap-8 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <span>🎬</span>
          <span>{stats.completedVideos} videos watched</span>
        </div>
        <div className="flex items-center gap-2">
          <span>⏱️</span>
          <span>{stats.totalWatchTimeMinutes} min watch time</span>
        </div>
      </div>
    </div>
  );
}


