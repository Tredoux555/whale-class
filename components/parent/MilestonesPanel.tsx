'use client';

import React from 'react';

interface Milestone {
  type: string;
  title: string;
  date?: string;
  area?: string;
}

interface Props {
  milestones: Milestone[];
}

const milestoneIcons: Record<string, string> = {
  area_complete: '🏆',
  area_halfway: '⭐',
  first_work: '🎉',
  ten_works: '🌟',
  fifty_works: '💫',
  hundred_works: '👑',
};

const milestoneColors: Record<string, string> = {
  area_complete: 'bg-yellow-100 text-yellow-800',
  area_halfway: 'bg-blue-100 text-blue-800',
  first_work: 'bg-green-100 text-green-800',
  ten_works: 'bg-purple-100 text-purple-800',
  fifty_works: 'bg-pink-100 text-pink-800',
  hundred_works: 'bg-amber-100 text-amber-800',
};

export default function MilestonesPanel({ milestones }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 h-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Milestones</h3>

      {milestones.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <div className="text-4xl mb-2">🌈</div>
          <p className="text-sm">Complete works to earn milestones!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.map((milestone, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 p-3 rounded-lg ${milestoneColors[milestone.type] || 'bg-gray-100'}`}
            >
              <span className="text-2xl">
                {milestoneIcons[milestone.type] || '✨'}
              </span>
              <div>
                <p className="font-medium text-sm">{milestone.title}</p>
                {milestone.area && (
                  <p className="text-xs opacity-75">{milestone.area}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming milestones hint */}
      <div className="mt-4 pt-4 border-t">
        <p className="text-xs text-gray-500 text-center">
          Keep going! More milestones await 🚀
        </p>
      </div>
    </div>
  );
}


