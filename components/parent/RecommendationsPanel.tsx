'use client';

import React from 'react';
import { useNextRecommendations } from '@/lib/hooks/useNextRecommendations';

interface Props {
  childId: string;
}

export default function RecommendationsPanel({ childId }: Props) {
  const { works, total, loading, error } = useNextRecommendations(childId, null, 4);

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
          {works.map((work) => (
            <div
              key={work.id}
              className="p-3 rounded-lg border hover:shadow-md transition-all cursor-pointer"
              style={{ borderColor: `${work.curriculum_areas.color}40` }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: `${work.curriculum_areas.color}20` }}
                >
                  {work.curriculum_areas.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{work.name}</p>
                  <p className="text-xs text-gray-500 mb-1">
                    {work.curriculum_categories.name}
                  </p>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {work.description}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: `${work.curriculum_areas.color}15`,
                    color: work.curriculum_areas.color,
                  }}
                >
                  {work.levels.length} levels
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                  {work.materials.length} materials
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


