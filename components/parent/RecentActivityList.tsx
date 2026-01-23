'use client';

import React, { useState } from 'react';

interface WorkCompletion {
  work_id: string;
  status: string;
  current_level: number;
  max_level: number;
  completed_at: string | null;
  curriculum_roadmap: {
    name: string;
    parent_description: string | null;
    why_it_matters: string | null;
    home_connection: string | null;
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
  const [expandedWork, setExpandedWork] = useState<string | null>(null);

  const toggleExpand = (workId: string) => {
    setExpandedWork(expandedWork === workId ? null : workId);
  };

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
          {completions.map((completion) => {
            const area = completion.curriculum_roadmap.curriculum_areas;
            const isExpanded = expandedWork === completion.work_id;
            const hasParentInfo = completion.curriculum_roadmap.parent_description;

            return (
              <div
                key={completion.work_id}
                className={`rounded-lg border transition-all duration-200 ${
                  isExpanded ? 'shadow-md' : ''
                }`}
                style={{ borderColor: `${area.color}30` }}
              >
                <button
                  onClick={() => hasParentInfo && toggleExpand(completion.work_id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                  disabled={!hasParentInfo}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: `${area.color}20` }}
                  >
                    {area.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">
                        {completion.curriculum_roadmap.name}
                      </p>
                      {hasParentInfo && (
                        <span className="text-gray-400 text-sm">
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {completion.curriculum_roadmap.curriculum_categories.name}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
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
                </button>

                {/* Expanded details */}
                {isExpanded && hasParentInfo && (
                  <div 
                    className="px-4 pb-4 border-t"
                    style={{ borderColor: `${area.color}20`, backgroundColor: `${area.color}05` }}
                  >
                    {/* Parent Description */}
                    <div className="pt-3">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {completion.curriculum_roadmap.parent_description}
                      </p>
                    </div>

                    {/* Why It Matters */}
                    {completion.curriculum_roadmap.why_it_matters && (
                      <div className="mt-3 flex items-start gap-2">
                        <span className="text-lg">🎯</span>
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Why It Mattered
                          </p>
                          <p className="text-sm text-gray-600">
                            {completion.curriculum_roadmap.why_it_matters}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Home Connection */}
                    {completion.curriculum_roadmap.home_connection && (
                      <div className="mt-3 flex items-start gap-2">
                        <span className="text-lg">🏠</span>
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Continue at Home
                          </p>
                          <p className="text-sm text-gray-600">
                            {completion.curriculum_roadmap.home_connection}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
