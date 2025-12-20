'use client';

import React, { useState } from 'react';
import { useChildProgress } from '@/lib/hooks/useChildProgress';
import AreaProgressCard from './AreaProgressCard';
import RecentCompletions from './RecentCompletions';
import NextWorksPanel from './NextWorksPanel';

interface Props {
  childId: string;
}

export default function ChildProgressDashboard({ childId }: Props) {
  const { progress, loading, error, refetch } = useChildProgress(childId);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error: {error}</p>
        <button onClick={refetch} className="mt-2 text-sm text-red-500 underline">
          Try again
        </button>
      </div>
    );
  }

  if (!progress) {
    return <div className="text-gray-500">No progress data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {progress.child.name}'s Progress
          </h1>
          <p className="text-gray-500">
            {progress.stats.totalCompleted} of {progress.stats.totalWorks} works completed
          </p>
        </div>
        
        {/* Overall Progress Circle */}
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 transform -rotate-90">
            <circle
              cx="48" cy="48" r="40"
              stroke="#e5e7eb" strokeWidth="8" fill="none"
            />
            <circle
              cx="48" cy="48" r="40"
              stroke="#3b82f6" strokeWidth="8" fill="none"
              strokeDasharray={`${progress.stats.overallPercentage * 2.51} 251`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold">{progress.stats.overallPercentage}%</span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-600">
            {progress.stats.totalCompleted}
          </div>
          <div className="text-sm text-green-700">Completed</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-yellow-600">
            {progress.stats.totalInProgress}
          </div>
          <div className="text-sm text-yellow-700">In Progress</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-gray-600">
            {progress.stats.totalWorks - progress.stats.totalCompleted - progress.stats.totalInProgress}
          </div>
          <div className="text-sm text-gray-700">Remaining</div>
        </div>
      </div>

      {/* Area Progress Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Progress by Area</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {progress.areaProgress.map((area) => (
            <AreaProgressCard
              key={area.area_id}
              area={area}
              isSelected={selectedArea === area.area_id}
              onClick={() => setSelectedArea(
                selectedArea === area.area_id ? null : area.area_id
              )}
            />
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Completions */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
          <RecentCompletions completions={progress.completedWorks.slice(0, 5)} />
        </div>

        {/* Next Works */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Recommended Next</h2>
          <NextWorksPanel childId={childId} areaId={selectedArea} />
        </div>
      </div>
    </div>
  );
}


