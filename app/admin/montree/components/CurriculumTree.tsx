// app/admin/montree/components/CurriculumTree.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ChildOverallProgress, ChildProgress, STATUS_COLORS, AREA_COLORS } from '@/lib/montree/types';
import { CURRICULUM } from '@/lib/montree/curriculum-data';
import AreaCard from './AreaCard';
import WorkDetailModal from './WorkDetailModal';

interface Props {
  childId: string;
  progress: ChildOverallProgress | null;
  onProgressUpdate: () => void;
}

export default function CurriculumTree({ childId, progress, onProgressUpdate }: Props) {
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedWork, setSelectedWork] = useState<string | null>(null);
  const [childProgress, setChildProgress] = useState<ChildProgress[]>([]);

  useEffect(() => {
    const fetchDetailedProgress = async () => {
      try {
        const res = await fetch(`/api/montree/progress/${childId}`);
        const data = await res.json();
        setChildProgress(data);
      } catch (error) {
        console.error('Failed to fetch detailed progress:', error);
      }
    };

    if (childId) fetchDetailedProgress();
  }, [childId, progress]);

  const progressMap = new Map(childProgress.map(p => [p.workId, p]));

  const getWorkStatus = (workId: string) => {
    const workProgress = progressMap.get(workId);
    return workProgress?.status || 'not_started';
  };

  const getAreaStatusFill = (areaId: string) => {
    const areaProgress = progress?.areaProgress.find(a => a.areaId === areaId);
    if (!areaProgress) return STATUS_COLORS.not_started.fill;
    
    if (areaProgress.completed === areaProgress.totalWorks) return STATUS_COLORS.completed.fill;
    if (areaProgress.inProgress > 0 || areaProgress.completed > 0) return STATUS_COLORS.in_progress.fill;
    return STATUS_COLORS.not_started.fill;
  };

  const handleWorkUpdate = () => {
    onProgressUpdate();
    setSelectedWork(null);
  };

  const renderBreadcrumb = () => {
    const area = CURRICULUM.find(a => a.id === selectedArea);
    const category = area?.categories.find(c => c.id === selectedCategory);

    return (
      <div className="flex items-center gap-2 text-sm mb-4">
        <button onClick={() => { setSelectedArea(null); setSelectedCategory(null); }}
          className="text-indigo-600 hover:underline">
          All Areas
        </button>
        {selectedArea && (
          <>
            <span className="text-slate-400">→</span>
            <button onClick={() => setSelectedCategory(null)} className="text-indigo-600 hover:underline">
              {area?.name}
            </button>
          </>
        )}
        {selectedCategory && (
          <>
            <span className="text-slate-400">→</span>
            <span className="text-slate-700 font-medium">{category?.name}</span>
          </>
        )}
      </div>
    );
  };

  // Main view - Area cards
  if (!selectedArea) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Curriculum Areas</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {CURRICULUM.map((area) => {
            const areaProgress = progress?.areaProgress.find(a => a.areaId === area.id);
            return (
              <AreaCard
                key={area.id}
                area={area}
                progress={areaProgress}
                statusFill={getAreaStatusFill(area.id)}
                onClick={() => setSelectedArea(area.id)}
              />
            );
          })}
        </div>
      </div>
    );
  }

  const area = CURRICULUM.find(a => a.id === selectedArea);
  if (!area) return null;

  // Category view
  if (!selectedCategory) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        {renderBreadcrumb()}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">{area.icon}</span>
          <h2 className="text-xl font-bold text-slate-800">{area.name}</h2>
          <span className="text-slate-500">
            {progress?.areaProgress.find(a => a.areaId === area.id)?.percentage || 0}% complete
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {area.categories.map((category) => {
            let completed = 0, inProgress = 0;
            category.works.forEach(work => {
              const status = getWorkStatus(work.id);
              if (status === 'completed') completed++;
              else if (status === 'in_progress') inProgress++;
            });
            const total = category.works.length;
            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
            
            let fillColor = STATUS_COLORS.not_started.fill;
            let borderColor = STATUS_COLORS.not_started.border;
            if (completed === total) {
              fillColor = STATUS_COLORS.completed.fill;
              borderColor = STATUS_COLORS.completed.border;
            } else if (inProgress > 0 || completed > 0) {
              fillColor = STATUS_COLORS.in_progress.fill;
              borderColor = STATUS_COLORS.in_progress.border;
            }

            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className="p-4 rounded-xl text-left transition-all hover:shadow-md border-2"
                style={{ backgroundColor: fillColor, borderColor }}
              >
                <h3 className="font-bold text-slate-800 mb-1">{category.name}</h3>
                <p className="text-sm text-slate-600">{category.works.length} works</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-white/50 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${percentage}%` }} />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{percentage}%</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Works view
  const category = area.categories.find(c => c.id === selectedCategory);
  if (!category) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      {renderBreadcrumb()}
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-bold text-slate-800">{category.name}</h2>
        <span className="text-slate-500">{category.works.length} works</span>
      </div>

      <div className="space-y-2">
        {category.works.map((work) => {
          const status = getWorkStatus(work.id);
          const statusColor = STATUS_COLORS[status];
          const workProgress = progressMap.get(work.id);
          
          return (
            <button
              key={work.id}
              onClick={() => setSelectedWork(work.id)}
              className="w-full p-4 rounded-xl text-left transition-all hover:shadow-md flex items-center gap-4 border-2"
              style={{ backgroundColor: statusColor.fill, borderColor: statusColor.border }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: statusColor.border }}>
                {status === 'completed' && <span className="text-white">✓</span>}
                {status === 'in_progress' && <span className="text-white">▶</span>}
                {status === 'not_started' && <span className="text-slate-400">○</span>}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800">{work.name}</h3>
                {work.chineseName && <p className="text-sm text-slate-500">{work.chineseName}</p>}
                <p className="text-sm text-slate-600 truncate">{work.description}</p>
              </div>
              
              {work.levels.length > 1 && (
                <div className="text-right flex-shrink-0">
                  <div className="text-sm text-slate-500">Level</div>
                  <div className="font-bold" style={{ color: statusColor.text }}>
                    {workProgress?.currentLevel || 0}/{work.levels.length}
                  </div>
                </div>
              )}
              
              <div className="text-sm text-slate-500 flex-shrink-0">{work.ageRange} yrs</div>
            </button>
          );
        })}
      </div>

      {selectedWork && (
        <WorkDetailModal
          childId={childId}
          areaId={selectedArea}
          categoryId={selectedCategory}
          workId={selectedWork}
          currentProgress={progressMap.get(selectedWork)}
          onClose={() => setSelectedWork(null)}
          onUpdate={handleWorkUpdate}
        />
      )}
    </div>
  );
}

