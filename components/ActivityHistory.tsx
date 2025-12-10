// components/ActivityHistory.tsx
'use client';

import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, Clock, Filter } from 'lucide-react';
import type { CurriculumArea } from '@/types/database';

interface ActivityHistoryProps {
  childId: string;
}

interface ActivityAssignment {
  id: string;
  assigned_date: string;
  completed: boolean;
  completed_at: string | null;
  completion_notes: string | null;
  activity: {
    id: string;
    name: string;
    area: CurriculumArea;
    duration_minutes: number;
    instructions: string;
    materials: string[];
  };
}

const AREA_LABELS: Record<CurriculumArea, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language Arts',
  english: 'English',
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

export default function ActivityHistory({ childId }: ActivityHistoryProps) {
  const [history, setHistory] = useState<ActivityAssignment[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [childId, selectedArea]);

  async function loadHistory() {
    try {
      setLoading(true);
      const areaParam = selectedArea !== 'all' ? `&area=${selectedArea}` : '';
      const res = await fetch(`/api/whale/activity-history?childId=${childId}${areaParam}`);
      if (!res.ok) throw new Error('Failed to load history');
      
      const data = await res.json();
      setHistory(data.data.history);
      setSummary(data.data.summary);
    } catch (err: any) {
      console.error('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const areas = summary?.byArea ? Object.keys(summary.byArea) : [];

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4 shadow-md">
            <div className="text-3xl font-bold">{summary.total}</div>
            <div className="text-sm opacity-90">Total Activities</div>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-4 shadow-md">
            <div className="text-3xl font-bold">{summary.completed}</div>
            <div className="text-sm opacity-90">Completed</div>
          </div>
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-4 shadow-md">
            <div className="text-3xl font-bold">{summary.completionRate.toFixed(0)}%</div>
            <div className="text-sm opacity-90">Completion Rate</div>
          </div>
        </div>
      )}

      {/* Area Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-5 h-5 text-gray-600 flex-shrink-0" />
        <button
          onClick={() => setSelectedArea('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            selectedArea === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Areas ({summary?.total || 0})
        </button>
        {areas.map(area => (
          <button
            key={area}
            onClick={() => setSelectedArea(area)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedArea === area
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {AREA_LABELS[area as CurriculumArea]} ({summary.byArea[area].total})
          </button>
        ))}
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Activity History
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {history.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No activities found for this filter
            </div>
          ) : (
            history.map((assignment) => {
              const isExpanded = expandedActivity === assignment.id;
              const date = new Date(assignment.assigned_date);
              const formattedDate = date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              return (
                <div key={assignment.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <button
                    onClick={() => setExpandedActivity(isExpanded ? null : assignment.id)}
                    className="w-full flex items-start justify-between gap-4 text-left"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          AREA_COLORS[assignment.activity.area]
                        }`}>
                          {AREA_LABELS[assignment.activity.area]}
                        </span>
                        {assignment.completed ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Completed
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Assigned
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-gray-900">{assignment.activity.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {formattedDate}
                        {assignment.completed && assignment.completed_at && (
                          <span className="ml-2">
                            • Completed: {new Date(assignment.completed_at).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 pl-4 border-l-2 border-blue-500 space-y-3">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-1">Duration</h5>
                        <p className="text-gray-700">{assignment.activity.duration_minutes} minutes</p>
                      </div>
                      
                      {assignment.activity.materials.length > 0 && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-1">Materials Used</h5>
                          <ul className="list-disc list-inside text-gray-700 text-sm">
                            {assignment.activity.materials.map((material, idx) => (
                              <li key={idx}>{material}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {assignment.completion_notes && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-1">Notes</h5>
                          <p className="text-gray-700 text-sm bg-yellow-50 p-2 rounded">
                            {assignment.completion_notes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
