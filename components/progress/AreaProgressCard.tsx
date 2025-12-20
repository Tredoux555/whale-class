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
  area: AreaProgress;
  isSelected: boolean;
  onClick: () => void;
}

export default function AreaProgressCard({ area, isSelected, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`
        rounded-lg p-4 cursor-pointer transition-all
        ${isSelected 
          ? 'ring-2 ring-offset-2 shadow-lg' 
          : 'hover:shadow-md'
        }
      `}
      style={{
        backgroundColor: `${area.area_color}10`,
        borderColor: area.area_color,
        borderWidth: '1px',
        ...(isSelected && { ringColor: area.area_color }),
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{area.area_icon}</span>
        <div>
          <h3 className="font-semibold text-gray-900">{area.area_name}</h3>
          <p className="text-xs text-gray-500">
            {area.completed_works}/{area.total_works} works
          </p>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${area.completion_percentage}%`,
            backgroundColor: area.area_color,
          }}
        />
      </div>
      
      <div className="flex justify-between mt-2 text-xs">
        <span className="text-gray-500">
          {area.in_progress_works > 0 && `${area.in_progress_works} in progress`}
        </span>
        <span style={{ color: area.area_color }} className="font-medium">
          {area.completion_percentage}%
        </span>
      </div>
    </div>
  );
}


