// app/admin/montree/components/ProgressSummary.tsx
'use client';

import React from 'react';
import { ChildOverallProgress, STATUS_COLORS, AREA_COLORS } from '@/lib/montree/types';

interface Props {
  progress: ChildOverallProgress | null;
  childName: string;
}

export default function ProgressSummary({ progress, childName }: Props) {
  if (!progress) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
        <div className="h-32 bg-slate-200 rounded mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-8 bg-slate-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
      <h2 className="text-xl font-bold text-slate-800 mb-4">{childName}</h2>

      {/* Overall Progress Circle */}
      <div className="relative w-32 h-32 mx-auto mb-6">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="64" cy="64" r="56" fill="none" stroke="#e2e8f0" strokeWidth="12" />
          <circle
            cx="64" cy="64" r="56" fill="none" stroke="#22c55e" strokeWidth="12"
            strokeDasharray={`${(progress.percentage / 100) * 352} 352`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold text-slate-800">{progress.percentage}%</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-6 text-center">
        <div className="p-2 rounded-lg" style={{ backgroundColor: STATUS_COLORS.completed.fill }}>
          <div className="text-lg font-bold" style={{ color: STATUS_COLORS.completed.text }}>
            {progress.completed}
          </div>
          <div className="text-xs text-slate-500">Done</div>
        </div>
        <div className="p-2 rounded-lg" style={{ backgroundColor: STATUS_COLORS.in_progress.fill }}>
          <div className="text-lg font-bold" style={{ color: STATUS_COLORS.in_progress.text }}>
            {progress.inProgress}
          </div>
          <div className="text-xs text-slate-500">Active</div>
        </div>
        <div className="p-2 rounded-lg" style={{ backgroundColor: STATUS_COLORS.not_started.fill }}>
          <div className="text-lg font-bold" style={{ color: STATUS_COLORS.not_started.text }}>
            {progress.notStarted}
          </div>
          <div className="text-xs text-slate-500">New</div>
        </div>
      </div>

      {/* Area Progress */}
      <h3 className="text-sm font-bold text-slate-700 mb-3">By Area</h3>
      <div className="space-y-3">
        {progress.areaProgress.map((area) => {
          const areaColor = AREA_COLORS[area.areaId as keyof typeof AREA_COLORS];
          return (
            <div key={area.areaId}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-700">{area.areaName}</span>
                <span className="font-medium" style={{ color: areaColor?.primary }}>
                  {area.percentage}%
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${area.percentage}%`, backgroundColor: areaColor?.primary || '#6366f1' }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Total Works */}
      <div className="mt-6 pt-4 border-t border-slate-100 text-center">
        <div className="text-sm text-slate-500">Total Works</div>
        <div className="text-2xl font-bold text-slate-800">{progress.totalWorks}</div>
      </div>
    </div>
  );
}

