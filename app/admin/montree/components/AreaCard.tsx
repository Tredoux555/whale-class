// app/admin/montree/components/AreaCard.tsx
'use client';

import React from 'react';
import { CurriculumArea, AreaProgress, AREA_COLORS } from '@/lib/montree/types';

interface Props {
  area: CurriculumArea;
  progress?: AreaProgress;
  statusFill: string;
  onClick: () => void;
}

export default function AreaCard({ area, progress, statusFill, onClick }: Props) {
  const areaColor = AREA_COLORS[area.id as keyof typeof AREA_COLORS];
  const percentage = progress?.percentage || 0;
  const totalWorks = progress?.totalWorks || 0;
  const completed = progress?.completed || 0;

  return (
    <button
      onClick={onClick}
      className="relative p-6 rounded-2xl text-left transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] overflow-hidden group"
      style={{ backgroundColor: statusFill, border: `3px solid ${areaColor?.primary || '#6366f1'}` }}
    >
      <div className="absolute bottom-0 left-0 right-0 transition-all duration-500 opacity-30"
        style={{ height: `${percentage}%`, backgroundColor: areaColor?.primary || '#6366f1' }} />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-4xl">{area.icon}</span>
          <span className="text-2xl font-bold" style={{ color: areaColor?.primary }}>{percentage}%</span>
        </div>
        
        <h3 className="text-lg font-bold mb-1" style={{ color: areaColor?.dark }}>{area.name}</h3>
        <p className="text-sm text-slate-600">{area.categories.length} categories • {totalWorks} works</p>
        
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">✓ {completed}</span>
          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full">▶ {progress?.inProgress || 0}</span>
        </div>
      </div>
      
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: areaColor?.primary }}>→</div>
    </button>
  );
}

