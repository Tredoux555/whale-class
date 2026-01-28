// /montree/dashboard/[childId]/progress/page.tsx
// Session 112: Progress bars showing position in each curriculum area
// Layout handles auth + header + tabs
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AREA_CONFIG, AREA_ORDER } from '@/lib/montree/types';

interface AreaProgress {
  area: string;
  areaName: string;
  icon: string;
  color: string;
  totalWorks: number;
  currentPosition: number;
  currentWorkName: string | null;
  percentComplete: number;
}

export default function ProgressPage() {
  const params = useParams();
  const childId = params.childId as string;
  
  const [progress, setProgress] = useState<AreaProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!childId) return;
    
    fetch(`/api/montree/progress/bars?child_id=${childId}`)
      .then(r => r.json())
      .then(data => {
        setProgress(data.areas || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [childId]);

  // Calculate overall
  const totalWorks = progress.reduce((sum, a) => sum + a.totalWorks, 0);
  const totalCompleted = progress.reduce((sum, a) => sum + a.currentPosition, 0);
  const overallPercent = totalWorks > 0 ? Math.round((totalCompleted / totalWorks) * 100) : 0;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center">
        <div className="animate-bounce text-3xl mb-2">📊</div>
        <p className="text-gray-500">Loading progress...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Overall Progress</h2>
          <div className="text-3xl font-bold text-emerald-600">{overallPercent}%</div>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
        <p className="text-sm text-gray-500 mt-2">{totalCompleted} of {totalWorks} works completed</p>
      </div>

      {/* Area Progress Bars */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-6">Progress by Area</h2>
        
        <div className="space-y-5">
          {progress.map((area) => (
            <div key={area.area}>
              {/* Area Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{area.icon}</span>
                  <span className="font-semibold text-gray-800">{area.areaName}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: area.color }}>
                  {area.currentPosition}/{area.totalWorks}
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="h-6 bg-gray-100 rounded-full overflow-hidden relative">
                <div 
                  className="h-full rounded-full transition-all duration-700"
                  style={{ 
                    width: `${area.percentComplete}%`,
                    backgroundColor: area.color,
                  }}
                />
              </div>
              
              {/* Current Work Label */}
              {area.currentWorkName && area.currentPosition < area.totalWorks && (
                <p className="text-xs text-gray-500 mt-1.5">
                  📍 Currently: <span className="font-medium text-gray-700">{area.currentWorkName}</span>
                </p>
              )}
              {!area.currentWorkName && area.currentPosition === 0 && (
                <p className="text-xs text-gray-400 mt-1.5">Not started</p>
              )}
              {area.currentPosition === area.totalWorks && area.totalWorks > 0 && (
                <p className="text-xs text-emerald-600 font-medium mt-1.5">✓ Complete!</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="text-center text-sm text-gray-500">
        <p>Progress shows current position in each area's curriculum sequence</p>
      </div>
    </div>
  );
}
