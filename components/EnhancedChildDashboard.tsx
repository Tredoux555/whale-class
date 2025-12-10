// components/EnhancedChildDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Clock, TrendingUp, Calendar, User } from 'lucide-react';
import type { Child, DailyActivityAssignmentWithDetails, CurriculumArea } from '@/types/database';
import ActivityHistory from './ActivityHistory';
import ProgressVisualization from './ProgressVisualization';

interface EnhancedChildDashboardProps {
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

type TabType = 'today' | 'progress' | 'history';

export default function EnhancedChildDashboard({ childId }: EnhancedChildDashboardProps) {
  const [child, setChild] = useState<Child | null>(null);
  const [todayActivity, setTodayActivity] = useState<DailyActivityAssignmentWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('today');

  useEffect(() => {
    if (childId) {
      console.log('EnhancedChildDashboard: useEffect triggered, childId:', childId);
      loadChildData();
    } else {
      console.error('EnhancedChildDashboard: No childId provided');
      setError('No child ID provided');
      setLoading(false);
    }
  }, [childId]);

  const loadChildData = async () => {
    try {
      console.log('loadChildData: Starting, childId:', childId);
      setLoading(true);
      setError(null);

      console.log('loadChildData: Fetching child data...');
      const childRes = await fetch(`/api/whale/children/${childId}`);
      console.log('loadChildData: Child response status:', childRes.status);
      
      if (!childRes.ok) {
        const errorData = await childRes.json().catch(() => ({ error: 'Failed to load child data' }));
        throw new Error(errorData.error || `Failed to load child data: ${childRes.status}`);
      }
      
      const childData = await childRes.json();
      console.log('loadChildData: Child data response:', childData);
      console.log('loadChildData: Child data.data:', childData.data);
      
      if (!childData.data) {
        console.error('loadChildData: No child data in response:', childData);
        throw new Error('Child data not found in response');
      }
      
      console.log('loadChildData: Setting child state:', childData.data);
      setChild(childData.data);
      console.log('loadChildData: Child state set, fetching activity...');

      const activityRes = await fetch(`/api/whale/daily-activity?childId=${childId}`);
      console.log('loadChildData: Activity response status:', activityRes.status);
      
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        console.log('loadChildData: Activity data response:', activityData);
        setTodayActivity(activityData.data);
      }
      
      console.log('loadChildData: Completed successfully');
    } catch (err: any) {
      console.error('loadChildData: Error occurred:', err);
      setError(err.message || 'Failed to load child data');
    } finally {
      console.log('loadChildData: Setting loading to false');
      setLoading(false);
    }
  };

  async function generateTodayActivity() {
    try {
      const res = await fetch('/api/whale/daily-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to generate activity' }));
        throw new Error(errorData.error || 'Failed to generate activity');
      }
      const data = await res.json();
      setTodayActivity(data.data);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate activity';
      alert(`Error: ${errorMessage}\n\nIf you see "No activities found", you need to add activities to the database first.`);
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
      
      if (completed) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
          const nextRes = await fetch('/api/whale/daily-activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ childId }),
          });

          if (nextRes.ok) {
            const nextData = await nextRes.json();
            setTodayActivity(nextData.data);
          } else {
            const errorData = await nextRes.json().catch(() => ({ error: 'No more activities' }));
            setTodayActivity(data.data);
            if (errorData.code === 'NO_ACTIVITIES') {
              alert('Activity completed! No more activities available for today.');
            }
          }
        } catch (nextErr: any) {
          setTodayActivity(data.data);
        }
      } else {
        setTodayActivity(data.data);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Loading child data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold mb-2">Error Loading Child Data</h3>
        <p className="text-red-700">{error}</p>
        <button
          onClick={loadChildData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-800 font-semibold">Child not found</p>
        <p className="text-yellow-700 mt-2">Child ID: {childId}</p>
        <button
          onClick={loadChildData}
          className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Child Info Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-4">
          {child.photo_url ? (
            <img src={child.photo_url} alt={child.name} className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
              {child.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{child.name}</h1>
            <p className="text-gray-600">Age Group: {child.age_group}</p>
            <p className="text-sm text-gray-500">
              Enrolled: {new Date(child.enrollment_date).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <div className="flex gap-4 px-6">
            <button
              onClick={() => setActiveTab('today')}
              className={`py-4 px-4 font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'today'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock className="w-5 h-5" />
              Today's Activity
            </button>
            <button
              onClick={() => setActiveTab('progress')}
              className={`py-4 px-4 font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'progress'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              Progress
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-4 font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar className="w-5 h-5" />
              History
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Today's Activity Tab */}
          {activeTab === 'today' && (
            <div>
              {!todayActivity ? (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No activity assigned for today</p>
                  <button
                    onClick={generateTodayActivity}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    Generate Today's Activity
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
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            Completed
                          </span>
                        )}
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">{todayActivity.activity.name}</h3>
                      <p className="text-gray-600 mt-2 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Duration: {todayActivity.activity.duration_minutes} minutes
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">📝 Instructions:</h4>
                    <pre className="whitespace-pre-wrap font-sans text-gray-700">{todayActivity.activity.instructions}</pre>
                  </div>

                  {todayActivity.activity.materials.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">🎨 Materials Needed:</h4>
                      <ul className="list-disc list-inside text-gray-700 space-y-1">
                        {todayActivity.activity.materials.map((material, idx) => (
                          <li key={idx}>{material}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {todayActivity.activity.learning_goals && todayActivity.activity.learning_goals.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">🎯 Learning Goals:</h4>
                      <ul className="list-disc list-inside text-gray-700 space-y-1">
                        {todayActivity.activity.learning_goals.map((goal, idx) => (
                          <li key={idx}>{goal}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t">
                    {!todayActivity.completed ? (
                      <>
                        <button
                          onClick={() => markActivityComplete(true)}
                          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Mark Complete
                        </button>
                        <button
                          onClick={generateTodayActivity}
                          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold"
                        >
                          Get Different Activity
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={generateTodayActivity}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                      >
                        <Clock className="w-5 h-5" />
                        Next Activity
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Progress Tab */}
          {activeTab === 'progress' && (
            <ProgressVisualization childId={childId} />
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <ActivityHistory childId={childId} />
          )}
        </div>
      </div>
    </div>
  );
}
