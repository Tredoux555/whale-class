'use client';

import React, { useState } from 'react';

interface WorkCompletion {
  work_id: string;
  current_level: number;
  max_level: number;
  started_at: string | null;
  curriculum_roadmap: {
    name: string;
    levels: any[];
    parent_description: string | null;
    why_it_matters: string | null;
    home_connection: string | null;
    curriculum_areas: { name: string; color: string; icon: string };
    curriculum_categories: { name: string };
  };
}

interface Props {
  works: WorkCompletion[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString();
}

export default function InProgressWorks({ works }: Props) {
  const [expandedWork, setExpandedWork] = useState<string | null>(null);

  const toggleExpand = (workId: string) => {
    setExpandedWork(expandedWork === workId ? null : workId);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">In Progress</h3>
        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
          {works.length} active
        </span>
      </div>

      {works.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📚</div>
          <p>No works in progress</p>
          <p className="text-sm">Start a new work from the recommendations!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {works.map((work) => {
            const progressPercent = Math.round((work.current_level / work.max_level) * 100);
            const area = work.curriculum_roadmap.curriculum_areas;
            const isExpanded = expandedWork === work.work_id;
            const hasParentInfo = work.curriculum_roadmap.parent_description;

            return (
              <div
                key={work.work_id}
                className={`rounded-lg border transition-all duration-200 ${
                  isExpanded ? 'shadow-md' : 'hover:shadow-sm'
                }`}
                style={{ borderColor: `${area.color}40` }}
              >
                {/* Main card - always visible */}
                <button
                  onClick={() => hasParentInfo && toggleExpand(work.work_id)}
                  className="w-full p-3 text-left"
                  disabled={!hasParentInfo}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                      style={{ backgroundColor: `${area.color}20` }}
                    >
                      {area.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">
                          {work.curriculum_roadmap.name}
                        </p>
                        {hasParentInfo && (
                          <span className="text-gray-400 text-sm">
                            {isExpanded ? '▲' : '▼'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        {work.curriculum_roadmap.curriculum_categories.name}
                      </p>

                      {/* Progress bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${progressPercent}%`,
                              backgroundColor: area.color,
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium" style={{ color: area.color }}>
                          {work.current_level}/{work.max_level}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-gray-400 text-right">
                    Started {formatDate(work.started_at)}
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
                        {work.curriculum_roadmap.parent_description}
                      </p>
                    </div>

                    {/* Why It Matters */}
                    {work.curriculum_roadmap.why_it_matters && (
                      <div className="mt-3 flex items-start gap-2">
                        <span className="text-lg">💡</span>
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Why It Matters
                          </p>
                          <p className="text-sm text-gray-600">
                            {work.curriculum_roadmap.why_it_matters}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Home Connection */}
                    {work.curriculum_roadmap.home_connection && (
                      <div className="mt-3 flex items-start gap-2">
                        <span className="text-lg">🏠</span>
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Try at Home
                          </p>
                          <p className="text-sm text-gray-600">
                            {work.curriculum_roadmap.home_connection}
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
