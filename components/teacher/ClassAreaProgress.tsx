'use client';

import React from 'react';

interface AreaProgress {
  id: string;
  name: string;
  color: string;
  icon: string;
  totalWorks: number;
  classCompleted: number;
  avgPercentage: number;
}

interface Props {
  areaProgress: AreaProgress[];
}

export default function ClassAreaProgress({ areaProgress }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress by Area</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {areaProgress.map((area) => (
          <div
            key={area.id}
            className="rounded-lg p-4 border-2 transition-shadow hover:shadow-md"
            style={{ borderColor: area.color }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{area.icon}</span>
              <span className="font-medium text-gray-900 text-sm truncate">
                {area.name}
              </span>
            </div>
            
            {/* Progress ring */}
            <div className="flex items-center justify-center mb-3">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32" cy="32" r="28"
                    stroke="#e5e7eb" strokeWidth="4" fill="none"
                  />
                  <circle
                    cx="32" cy="32" r="28"
                    stroke={area.color} strokeWidth="4" fill="none"
                    strokeDasharray={`${area.avgPercentage * 1.76} 176`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold" style={{ color: area.color }}>
                    {area.avgPercentage}%
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-center text-xs text-gray-500">
              {area.classCompleted} completions
              <br />
              {area.totalWorks} works
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


