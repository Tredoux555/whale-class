'use client';

import React, { useState } from 'react';
import { useNextRecommendations } from '@/lib/hooks/useNextRecommendations';

interface Props {
  childId: string;
}

export default function RecommendationsPanel({ childId }: Props) {
  const { works, total, loading, error } = useNextRecommendations(childId, null, 4);
  const [expandedWork, setExpandedWork] = useState<string | null>(null);

  const toggleExpand = (workId: string) => {
    setExpandedWork(expandedWork === workId ? null : workId);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recommended Next</h3>
        {total > 4 && (
          <span className="text-xs text-gray-500">+{total - 4} more available</span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">
          <p>Failed to load recommendations</p>
        </div>
      ) : works.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🎓</div>
          <p>All available works are complete!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {works.map((work: any) => {
            const isExpanded = expandedWork === work.id;
            const hasParentInfo = work.parent_description;
            const area = work.curriculum_areas;

            return (
              <div
                key={work.id}
                className={`rounded-lg border transition-all duration-200 ${
                  isExpanded ? 'shadow-md' : 'hover:shadow-md'
                }`}
                style={{ borderColor: `${area?.color || '#ccc'}40` }}
              >
                <button
                  onClick={() => hasParentInfo && toggleExpand(work.id)}
                  className="w-full p-3 text-left"
                  disabled={!hasParentInfo}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                      style={{ backgroundColor: `${area?.color || '#ccc'}20` }}
                    >
                      {area?.icon || '📚'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">{work.name}</p>
                        {hasParentInfo && (
                          <span className="text-gray-400 text-sm">
                            {isExpanded ? '▲' : '▼'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-1">
                        {work.curriculum_categories?.name || 'General'}
                      </p>
                      
                      {/* Show parent description preview if not expanded */}
                      {!isExpanded && hasParentInfo && (
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {work.parent_description}
                        </p>
                      )}
                      
                      {/* Fallback to regular description */}
                      {!isExpanded && !hasParentInfo && work.description && (
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {work.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: `${area?.color || '#ccc'}15`,
                        color: area?.color || '#666',
                      }}
                    >
                      {work.levels?.length || 0} levels
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                      {work.materials?.length || 0} materials
                    </span>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && hasParentInfo && (
                  <div 
                    className="px-4 pb-4 border-t"
                    style={{ borderColor: `${area?.color || '#ccc'}20`, backgroundColor: `${area?.color || '#ccc'}05` }}
                  >
                    {/* Full Parent Description */}
                    <div className="pt-3">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {work.parent_description}
                      </p>
                    </div>

                    {/* Why It Matters */}
                    {work.why_it_matters && (
                      <div className="mt-3 flex items-start gap-2">
                        <span className="text-lg">💡</span>
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Why It Matters
                          </p>
                          <p className="text-sm text-gray-600">
                            {work.why_it_matters}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Home Connection */}
                    {work.home_connection && (
                      <div className="mt-3 flex items-start gap-2">
                        <span className="text-lg">🏠</span>
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Prepare at Home
                          </p>
                          <p className="text-sm text-gray-600">
                            {work.home_connection}
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
