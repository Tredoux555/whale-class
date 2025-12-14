'use client';

import React from 'react';
import { Activity } from '@/types/database';
import { ChevronRight } from 'lucide-react';

interface ActivityTooltipProps {
  area: string;
  activities: Activity[];
  position: { x: number; y: number };
  onActivityClick: (activityId: string) => void;
}

const AREA_NAMES: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  english: 'English',
  cultural: 'Cultural',
};

const getAreaColor = (area: string): string => {
  const colors: Record<string, string> = {
    practical_life: 'border-t-yellow-400 bg-yellow-50',
    sensorial: 'border-t-pink-400 bg-pink-50',
    mathematics: 'border-t-green-400 bg-green-50',
    language: 'border-t-blue-400 bg-blue-50',
    english: 'border-t-purple-400 bg-purple-50',
    cultural: 'border-t-orange-400 bg-orange-50',
  };
  return colors[area] || 'border-t-blue-400 bg-blue-50';
};

const getSkillLevelColor = (skillLevel: number): string => {
  switch (skillLevel) {
    case 0:
      return 'bg-gray-100 text-gray-700';
    case 1:
      return 'bg-blue-100 text-blue-700';
    case 2:
      return 'bg-cyan-100 text-cyan-700';
    case 3:
      return 'bg-teal-100 text-teal-700';
    case 4:
      return 'bg-green-100 text-green-700';
    case 5:
      return 'bg-emerald-100 text-emerald-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export const ActivityTooltip: React.FC<ActivityTooltipProps> = ({
  area,
  activities,
  onActivityClick,
}) => {
  const displayedActivities = activities.slice(0, 5); // Show max 5

  return (
    <div
      className={`absolute z-50 w-80 rounded-lg shadow-xl border-t-4 ${getAreaColor(area)} p-4 animate-in fade-in duration-200`}
      style={{
        top: '-180px',
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    >
      {/* Area Header */}
      <div className="mb-3 pb-3 border-b border-gray-200">
        <h3 className="text-sm font-bold text-gray-900">
          {AREA_NAMES[area]} Activities
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          {activities.length} available
        </p>
      </div>

      {/* Activities List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {displayedActivities.length > 0 ? (
          displayedActivities.map((activity) => (
            <button
              key={activity.id}
              onClick={() => onActivityClick(activity.id)}
              className="w-full text-left p-2 rounded-md hover:bg-white hover:shadow-md transition-all duration-150 group"
            >
              {/* Activity Image (if available) */}
              {activity.image_url && (
                <div className="mb-2 aspect-square rounded overflow-hidden bg-gray-200 h-12 w-full">
                  <img
                    src={activity.image_url}
                    alt={activity.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
              )}

              {/* Activity Name */}
              <h4 className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">
                {activity.name}
              </h4>

              {/* Activity Meta */}
              <div className="flex items-center justify-between mt-1">
                <div className="flex gap-1">
                  {/* Age Range */}
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                    {activity.age_min}-{activity.age_max}y
                  </span>

                  {/* Skill Level */}
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${getSkillLevelColor(activity.skill_level)}`}
                  >
                    L{activity.skill_level}
                  </span>
                </div>

                {/* Click indicator */}
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>

              {/* Duration if available */}
              {activity.duration_minutes && (
                <p className="text-xs text-gray-500 mt-1">
                  ⏱ {activity.duration_minutes} mins
                </p>
              )}
            </button>
          ))
        ) : (
          <p className="text-sm text-gray-500 py-4 text-center">
            No activities available yet
          </p>
        )}
      </div>

      {/* Footer - Show more indicator */}
      {activities.length > 5 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            +{activities.length - 5} more activities
          </p>
        </div>
      )}

      {/* Arrow pointer to parent */}
      <div
        className="absolute w-0 h-0 border-l-8 border-r-8 border-t-8"
        style={{
          bottom: '-8px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: 'white',
        }}
      />
    </div>
  );
};

