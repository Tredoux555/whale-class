'use client';

import React, { useState } from 'react';
import { useParentChildren } from '@/lib/hooks/useParentChildren';
import { useParentDashboard } from '@/lib/hooks/useParentDashboard';
import ChildSwitcher from './ChildSwitcher';
import ProgressOverview from './ProgressOverview';
import AreaProgressGrid from './AreaProgressGrid';
import RecentActivityList from './RecentActivityList';
import InProgressWorks from './InProgressWorks';
import RecommendationsPanel from './RecommendationsPanel';
import MilestonesPanel from './MilestonesPanel';
import WeeklyReportCard from './WeeklyReportCard';
import GamesPanel from './GamesPanel';

export default function ParentDashboard() {
  const { children, loading: childrenLoading } = useParentChildren();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  
  // Auto-select first child
  React.useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  const { data, loading, error, refetch } = useParentDashboard(selectedChildId);

  if (childrenLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}>
        <div className="text-center">
          <div className="text-6xl mb-4">👶</div>
          <h2 className="text-xl font-semibold text-slate-700">No Children Found</h2>
          <p className="text-slate-500 mt-2">Add a child to start tracking their progress.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}>
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Parent Dashboard</h1>
              <p className="text-sm text-slate-500">Track your child's Montessori journey</p>
            </div>
            <ChildSwitcher
              children={children}
              selectedId={selectedChildId}
              onSelect={setSelectedChildId}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-600">{error}</p>
            <button onClick={refetch} className="mt-2 text-red-500 underline">
              Try again
            </button>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Top Row - Overview & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ProgressOverview
                  child={data.child}
                  stats={data.stats}
                  areaProgress={data.areaProgress}
                />
              </div>
              <div>
                <MilestonesPanel milestones={data.milestones} />
              </div>
            </div>

            {/* Area Progress Grid */}
            <AreaProgressGrid areaProgress={data.areaProgress} />

            {/* Middle Row - Activity & In Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentActivityList completions={data.recentCompletions} />
              <InProgressWorks works={data.inProgressWorks} />
            </div>

            {/* Bottom Row - Recommendations & Report */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecommendationsPanel childId={selectedChildId!} />
              <WeeklyReportCard childId={selectedChildId!} />
            </div>

            {/* Games Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GamesPanel childId={selectedChildId!} />
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}


