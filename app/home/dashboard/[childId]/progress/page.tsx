'use client';

// /home/dashboard/[childId]/progress/page.tsx — Session 155
// Progress bars per area + overall percentage

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface AreaProgress {
  area: string;
  areaName: string;
  icon: string;
  color: string;
  totalWorks: number;
  started: number;
  mastered: number;
  percentComplete: number;
}

export default function ChildProgressPage() {
  const params = useParams();
  const childId = params.childId as string;

  const [areas, setAreas] = useState<AreaProgress[]>([]);
  const [overall, setOverall] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!childId) return;

    fetch(`/api/home/progress/summary?child_id=${childId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch');
        return r.json();
      })
      .then((data) => {
        setAreas(data.areas || []);
        setOverall(data.overall || 0);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [childId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center">
        <div className="animate-bounce text-3xl mb-2">📊</div>
        <p className="text-gray-500">Loading progress...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center">
        <div className="text-3xl mb-2">⚠️</div>
        <p className="text-gray-600 font-medium mb-1">Failed to load progress</p>
        <p className="text-gray-400 text-sm">Please check your connection and try again.</p>
      </div>
    );
  }

  const totalWorks = areas.reduce((sum, a) => sum + a.totalWorks, 0);
  const totalMastered = areas.reduce((sum, a) => sum + a.mastered, 0);
  const totalStarted = areas.reduce((sum, a) => sum + a.started, 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Overall Progress */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Overall Progress</h2>
          <div className="text-3xl font-bold text-emerald-600">{overall}%</div>
        </div>

        {/* Progress bar */}
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"
            style={{ width: `${overall}%` }}
          />
        </div>

        <div className="flex justify-between text-sm text-gray-500">
          <span>{totalStarted} of {totalWorks} started</span>
          <span>{totalMastered} mastered</span>
        </div>
      </div>

      {/* Per-Area Progress */}
      {areas.map((area) => (
        <div key={area.area} className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{area.icon}</span>
              <span className="font-bold text-gray-800">{area.areaName}</span>
            </div>
            <span className="text-lg font-bold" style={{ color: area.color }}>
              {area.percentComplete}%
            </span>
          </div>

          {/* Bar */}
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${area.percentComplete}%`,
                backgroundColor: area.color,
              }}
            />
          </div>

          <div className="flex justify-between text-xs text-gray-400">
            <span>{area.started} of {area.totalWorks} started</span>
            <span>{area.mastered} mastered</span>
          </div>
        </div>
      ))}
    </div>
  );
}
