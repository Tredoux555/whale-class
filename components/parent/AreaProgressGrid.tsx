'use client';

import React from 'react';

interface AreaProgress {
  area_id: string;
  area_name: string;
  area_color: string;
  area_icon: string;
  total_works: number;
  completed_works: number;
  in_progress_works: number;
  completion_percentage: number;
}

interface Props {
  areaProgress: AreaProgress[];
}

export default function AreaProgressGrid({ areaProgress }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress by Area</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {areaProgress.map((area) => (
          <div
            key={area.area_id}
            className="rounded-lg p-4 border transition-shadow hover:shadow-md"
            style={{ borderColor: area.area_color }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{area.area_icon}</span>
              <span className="font-medium text-gray-900 text-sm truncate">
                {area.area_name}
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${area.completion_percentage}%`,
                  backgroundColor: area.area_color,
                }}
              />
            </div>
            
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">
                {area.completed_works}/{area.total_works}
              </span>
              <span style={{ color: area.area_color }} className="font-medium">
                {area.completion_percentage}%
              </span>
            </div>
            
            {area.in_progress_works > 0 && (
              <div className="mt-2 text-xs text-yellow-600">
                {area.in_progress_works} in progress
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


