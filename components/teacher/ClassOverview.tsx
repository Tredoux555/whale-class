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
  totalStudents: number;
  areaProgress: AreaProgress[];
}

export default function ClassOverview({ totalStudents, areaProgress }: Props) {
  const totalWorks = areaProgress.reduce((sum, a) => sum + a.totalWorks, 0);
  const totalCompleted = areaProgress.reduce((sum, a) => sum + a.classCompleted, 0);
  const totalPossible = totalWorks * totalStudents;
  const overallPercentage = totalPossible > 0 
    ? Math.round((totalCompleted / totalPossible) * 100) 
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-slate-100">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Class Overview</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-indigo-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-indigo-600">{totalStudents}</div>
          <div className="text-xs text-indigo-700">Students</div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{totalCompleted}</div>
          <div className="text-xs text-green-700">Total Completions</div>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{totalWorks}</div>
          <div className="text-xs text-blue-700">Works Available</div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-purple-600">{overallPercentage}%</div>
          <div className="text-xs text-purple-700">Class Average</div>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Overall Class Progress</span>
          <span>{overallPercentage}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${overallPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}


