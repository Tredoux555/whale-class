'use client';

import React, { useEffect, useState } from 'react';
import { Activity, ChildProgress, ActivityLog } from '@/types/database';
import {
  BookOpen,
  Wrench,
  Target,
  Clock,
  Users,
  CheckCircle,
  Loader,
  ArrowLeft,
} from 'lucide-react';
import { ActivityVideoSection } from './ActivityVideoSection';

interface ActivityDetailViewProps {
  activityId: string;
  childId?: string;
  onBack?: () => void;
}

interface ActivityWithDetails extends Activity {
  video_url?: string;
}

export const ActivityDetailView: React.FC<ActivityDetailViewProps> = ({
  activityId,
  childId,
  onBack,
}) => {
  const [activity, setActivity] = useState<ActivityWithDetails | null>(null);
  const [childProgress, setChildProgress] = useState<ChildProgress | null>(null);
  const [childHistory, setChildHistory] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'materials' | 'prerequisites' | 'history'
  >('overview');

  useEffect(() => {
    fetchActivityDetails();
  }, [activityId, childId]);

  const fetchActivityDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch activity details
      const actRes = await fetch(`/api/whale/activities?search=${activityId}`);
      const actData = await actRes.json();
      const foundActivity = actData.data?.find(
        (a: Activity) => a.id === activityId
      );
      setActivity(foundActivity || null);

      if (!foundActivity) {
        setError('Activity not found');
        return;
      }

      // Fetch child progress if childId provided
      if (childId) {
        try {
          const progRes = await fetch(`/api/whale/progress?childId=${childId}`);
          const progData = await progRes.json();
          const progress = progData.data?.find(
            (p: ChildProgress) => p.skill_id === activityId
          );
          setChildProgress(progress || null);
        } catch {
          // Progress is optional
        }

        // Fetch activity history
        try {
          const histRes = await fetch(
            `/api/whale/activity-history?childId=${childId}&limit=50`
          );
          const histData = await histRes.json();
          const history = histData.data?.filter(
            (h: ActivityLog) => h.activity_id === activityId
          );
          setChildHistory(history || []);
        } catch {
          // History is optional
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading activity details...</p>
        </div>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700 font-medium mb-4">
          {error || 'Activity not found'}
        </p>
        {onBack && (
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header with back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}

      {/* Activity Hero Section */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-6 mb-6 border border-blue-200">
        {/* Activity Image */}
        {activity.image_url && (
          <div className="mb-6 aspect-video rounded-lg overflow-hidden bg-gray-200">
            <img
              src={activity.image_url}
              alt={activity.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Title and Meta */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {activity.name}
            </h1>
            <p className="text-gray-600">{activity.area}</p>
          </div>
          {childProgress && (
            <div className="bg-white rounded-lg px-4 py-3 border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Progress Status</p>
              <p className="font-bold text-green-600">
                {getStatusLabel(childProgress.status_level)}
              </p>
            </div>
          )}
        </div>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-600">Age Range</p>
            <p className="font-bold text-blue-600">
              {activity.age_min}-{activity.age_max}y
            </p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-600">Skill Level</p>
            <p className="font-bold text-blue-600">Level {activity.skill_level}</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-600">Duration</p>
            <p className="font-bold text-blue-600">
              {activity.duration_minutes ? `${activity.duration_minutes} min` : '-'}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-600">Area</p>
            <p className="font-bold text-blue-600">{activity.area}</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-1 overflow-x-auto">
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'materials', label: 'Materials' },
              { id: 'prerequisites', label: 'Prerequisites' },
              childId && { id: 'history', label: 'History' },
            ].filter(Boolean) as Array<{ id: string; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Video Section */}
            <ActivityVideoSection
              activityId={activityId}
              videoUrl={activity.video_url}
            />

            {/* Instructions */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Instructions
              </h3>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {activity.instructions}
                </p>
              </div>
            </div>

            {/* Learning Goals */}
            {activity.learning_goals && activity.learning_goals.length > 0 && (
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  Learning Goals
                </h3>
                <ul className="space-y-2">
                  {activity.learning_goals.map((goal, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Materials Tab */}
        {activeTab === 'materials' && (
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            {activity.materials && activity.materials.length > 0 ? (
              <>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-blue-600" />
                  Materials Needed
                </h3>
                <ul className="space-y-2">
                  {activity.materials.map((material, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-3 p-2 bg-gray-50 rounded"
                    >
                      <div className="w-2 h-2 bg-blue-600 rounded-full" />
                      <span className="text-gray-700">{material}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-gray-600">No specific materials listed</p>
            )}
          </div>
        )}

        {/* Prerequisites Tab */}
        {activeTab === 'prerequisites' && (
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            {activity.prerequisites && activity.prerequisites.length > 0 ? (
              <>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Prerequisites
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Child should have completed these before starting this activity:
                </p>
                <ul className="space-y-2">
                  {activity.prerequisites.map((prereq, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-3 p-2 bg-gray-50 rounded"
                    >
                      <div className="w-2 h-2 bg-orange-600 rounded-full" />
                      <span className="text-gray-700">{prereq}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-gray-600">No prerequisites required</p>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && childId && (
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            {childHistory && childHistory.length > 0 ? (
              <>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Activity History
                </h3>
                <div className="space-y-3">
                  {childHistory.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {new Date(log.activity_date).toLocaleDateString()}
                        </p>
                        {log.notes && (
                          <p className="text-sm text-gray-600 mt-1">{log.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {log.engagement_level && (
                          <p className="text-sm font-medium text-gray-700">
                            Engagement: {log.engagement_level}/5
                          </p>
                        )}
                        {log.duration_minutes && (
                          <p className="text-xs text-gray-500 mt-1">
                            {log.duration_minutes} minutes
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-gray-600">No history recorded yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function
function getStatusLabel(statusLevel: number): string {
  const labels: Record<number, string> = {
    0: 'Not Introduced',
    1: 'Observed',
    2: 'Guided Practice',
    3: 'Independent',
    4: 'Mastery',
    5: 'Transcended',
  };
  return labels[statusLevel] || 'Unknown';
}

