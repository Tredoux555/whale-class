'use client';

import React from 'react';

interface WorkCompletion {
  work_id: string;
  status: string;
  current_level: number;
  max_level: number;
  completed_at: string | null;
  curriculum_roadmap: {
    name: string;
    curriculum_areas: { name: string; color: string; icon: string };
    curriculum_categories: { name: string };
  };
}

interface Props {
  completions: WorkCompletion[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

  return date.toLocaleDateString();
}

export default function RecentActivityList({ completions }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Completions</h3>
        <span className="text-xs text-gray-500">Last 30 days</span>
      </div>

      {completions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🌱</div>
          <p>No completions yet this month</p>
          <p className="text-sm">Start a new work to see progress here!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {completions.map((completion) => (
            <div
              key={completion.work_id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                style={{ backgroundColor: `${completion.curriculum_roadmap.curriculum_areas.color}20` }}
              >
                {completion.curriculum_roadmap.curriculum_areas.icon}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {completion.curriculum_roadmap.name}
                </p>
                <p className="text-xs text-gray-500">
                  {completion.curriculum_roadmap.curriculum_categories.name}
                </p>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-1 text-green-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-medium">Complete</span>
                </div>
                <span className="text-xs text-gray-400">
                  {formatDate(completion.completed_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


