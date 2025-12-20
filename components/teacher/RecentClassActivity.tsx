'use client';

import React from 'react';

interface Activity {
  child_id: string;
  work_id: string;
  status: string;
  completed_at: string | null;
  started_at: string | null;
  studentName: string;
  workName: string;
  areaId: string;
}

interface Props {
  activity: Activity[];
  onViewStudent: (studentId: string) => void;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}

export default function RecentClassActivity({ activity, onViewStudent }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        <span className="text-xs text-gray-500">Last 7 days</span>
      </div>

      {activity.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📊</div>
          <p>No recent activity</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {activity.map((item, index) => (
            <div
              key={`${item.child_id}-${item.work_id}-${index}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => onViewStudent(item.child_id)}
            >
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-white text-sm
                ${item.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}
              `}>
                {item.status === 'completed' ? '✓' : '▶'}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium text-gray-900">{item.studentName}</span>
                  {' '}
                  <span className="text-gray-500">
                    {item.status === 'completed' ? 'completed' : 'started'}
                  </span>
                  {' '}
                  <span className="text-gray-700">{item.workName}</span>
                </p>
              </div>

              <span className="text-xs text-gray-400">
                {formatTime(item.completed_at || item.started_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


