// components/ChildDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Clock, TrendingUp } from 'lucide-react';
import type { Child, DailyActivityAssignmentWithDetails, CurriculumArea } from '@/types/database';

interface ChildDashboardProps {
  childId: string;
}

const AREA_LABELS: Record<CurriculumArea, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language Arts',
  english: 'English Language',
  cultural: 'Cultural Studies',
};

const AREA_COLORS: Record<CurriculumArea, string> = {
  practical_life: 'bg-blue-100 text-blue-800',
  sensorial: 'bg-purple-100 text-purple-800',
  mathematics: 'bg-green-100 text-green-800',
  language: 'bg-orange-100 text-orange-800',
  english: 'bg-pink-100 text-pink-800',
  cultural: 'bg-yellow-100 text-yellow-800',
};

export default function ChildDashboard({ childId }: ChildDashboardProps) {
  const [child, setChild] = useState<Child | null>(null);
  const [todayActivity, setTodayActivity] = useState<DailyActivityAssignmentWithDetails | null>(null);
  const [progressSummary, setProgressSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [childId]);

  async function loadDashboardData() {
    try {
      setLoading(true);
      setError(null);

      const childRes = await fetch(`/api/whale/children/${childId}`);
      if (!childRes.ok) throw new Error('Failed to load child data');
      const childData = await childRes.json();
      setChild(childData.data);

      const activityRes = await fetch(`/api/whale/daily-activity?childId=${childId}`);
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setTodayActivity(activityData.data);
      }

      const progressRes = await fetch(`/api/whale/progress/summary?childId=${childId}`);
      if (progressRes.ok) {
        const progressData = await progressRes.json();
        setProgressSummary(progressData.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function generateTodayActivity() {
    try {
      const res = await fetch('/api/whale/daily-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId }),
      });

      if (!res.ok) throw new Error('Failed to generate activity');
      const data = await res.json();
      setTodayActivity(data.data);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  async function markActivityComplete(completed: boolean, notes?: string) {
    if (!todayActivity) return;

    try {
      const res = await fetch('/api/whale/daily-activity', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: todayActivity.id, completed, notes }),
      });

      if (!res.ok) throw new Error('Failed to update activity');
      const data = await res.json();
      setTodayActivity(data.data);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  if (!child) return <div>Child not found</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-4">
          {child.photo_url && (
            <img src={child.photo_url} alt={child.name} className="w-20 h-20 rounded-full object-cover" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{child.name}</h1>
            <p className="text-gray-600">Age Group: {child.age_group}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Today&apos;s Activity
        </h2>

        {!todayActivity ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No activity assigned for today</p>
            <button
              onClick={generateTodayActivity}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Generate Today&apos;s Activity
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${AREA_COLORS[todayActivity.activity.area]}`}>
                    {AREA_LABELS[todayActivity.activity.area]}
                  </span>
                  {todayActivity.completed && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      Completed
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{todayActivity.activity.name}</h3>
                <p className="text-gray-600 mt-2">Duration: {todayActivity.activity.duration_minutes} minutes</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Instructions:</h4>
              <p className="text-gray-700 whitespace-pre-line">{todayActivity.activity.instructions}</p>
            </div>

            {todayActivity.activity.materials.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Materials Needed:</h4>
                <ul className="list-disc list-inside text-gray-700">
                  {todayActivity.activity.materials.map((material, idx) => (
                    <li key={idx}>{material}</li>
                  ))}
                </ul>
              </div>
            )}

            {!todayActivity.completed && (
              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={() => markActivityComplete(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark Complete
                </button>
                <button
                  onClick={generateTodayActivity}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Get Different Activity
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Progress Summary
        </h2>

        {progressSummary.length === 0 ? (
          <p className="text-gray-600">No progress recorded yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {progressSummary.map((area: any) => (
              <div key={area.area} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-1 rounded text-sm font-medium ${AREA_COLORS[area.area as CurriculumArea]}`}>
                    {AREA_LABELS[area.area as CurriculumArea]}
                  </span>
                  <span className="text-2xl font-bold text-gray-900">{area.average_status.toFixed(1)}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Skills:</span>
                    <span className="font-medium">{area.total_skills}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Independent:</span>
                    <span className="font-medium text-blue-600">{area.independent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mastered:</span>
                    <span className="font-medium text-green-600">{area.mastery}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                      style={{ width: `${(area.average_status / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
