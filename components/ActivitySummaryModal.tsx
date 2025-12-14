'use client';

import React, { useEffect, useState } from 'react';
import { Activity, ChildProgress } from '@/types/database';
import { X, ChevronRight } from 'lucide-react';

interface ActivitySummaryModalProps {
  activityId: string;
  childId: string;
  isOpen: boolean;
  onClose: () => void;
  onViewDetails: () => void;
  onAssign?: () => void;
}

export const ActivitySummaryModal: React.FC<ActivitySummaryModalProps> = ({
  activityId,
  childId,
  isOpen,
  onClose,
  onViewDetails,
  onAssign,
}) => {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [progress, setProgress] = useState<ChildProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch activity
        const activityRes = await fetch(`/api/whale/activities?search=${activityId}`);
        const activityData = await activityRes.json();
        const foundActivity = activityData.data?.find(
          (a: Activity) => a.id === activityId
        );
        setActivity(foundActivity || null);

        // Fetch progress (if needed - shows completion status)
        try {
          const progressRes = await fetch(
            `/api/whale/progress?childId=${childId}`
          );
          const progressData = await progressRes.json();
          if (progressData.data) {
            const activityProgress = progressData.data.find(
              (p: ChildProgress) => p.id === activityId
            );
            setProgress(activityProgress || null);
          }
        } catch {
          // Progress fetch is optional
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load activity');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, activityId, childId]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-96 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Activity Overview</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin">
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full" />
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            ) : activity ? (
              <>
                {/* Activity Image */}
                {activity.image_url && (
                  <div className="mb-4 aspect-video rounded-lg overflow-hidden bg-gray-200">
                    <img
                      src={activity.image_url}
                      alt={activity.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Activity Name */}
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {activity.name}
                </h3>

                {/* Quick Info */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-600">Age Range</p>
                    <p className="text-sm font-bold text-blue-600">
                      {activity.age_min}-{activity.age_max}y
                    </p>
                  </div>
                  <div className="bg-cyan-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-600">Difficulty</p>
                    <p className="text-sm font-bold text-cyan-600">
                      Level {activity.skill_level}
                    </p>
                  </div>
                  <div className="bg-teal-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-600">Duration</p>
                    <p className="text-sm font-bold text-teal-600">
                      {activity.duration_minutes || '-'} min
                    </p>
                  </div>
                </div>

                {/* Progress Status */}
                {progress && (
                  <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Progress Status</p>
                    <p className="text-sm font-semibold text-green-700">
                      {getStatusLabel(progress.status_level)}
                    </p>
                  </div>
                )}

                {/* Quick Instructions */}
                {activity.instructions && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      Quick Instructions
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">
                      {activity.instructions.substring(0, 200)}
                      {activity.instructions.length > 200 ? '...' : ''}
                    </p>
                  </div>
                )}

                {/* Learning Goals Preview */}
                {activity.learning_goals && activity.learning_goals.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      Learning Goals
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {activity.learning_goals.slice(0, 2).map((goal, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          <span>{goal}</span>
                        </li>
                      ))}
                      {activity.learning_goals.length > 2 && (
                        <li className="text-blue-600 font-medium">
                          +{activity.learning_goals.length - 2} more goals
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Activity not found</p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {activity && (
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={onViewDetails}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                See Full Details
                <ChevronRight className="w-4 h-4" />
              </button>
              {onAssign && (
                <button
                  onClick={onAssign}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Assign
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Helper function to convert status level to human-readable label
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


