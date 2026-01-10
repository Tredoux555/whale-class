'use client';

import { useState, useCallback, useMemo } from 'react';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface WorkStatusItem {
  workId: string;
  name: string;
  status: 0 | 1 | 2 | 3;
  categoryName: string;
}

export interface AreaProgressData {
  areaId: string;
  areaName: string;
  icon: string;
  color: string;
  totalWorks: number;
  currentWorkIndex: number;
  currentWorkName: string;
  worksStatus: WorkStatusItem[];
}

export interface StudentProgressBarsProps {
  childId: string;
  childName: string;
  progressData: AreaProgressData[];
  onWorkClick?: (workId: string, areaId: string) => void;
}

// ============================================
// CONSTANTS
// ============================================

const STATUS_CONFIG = {
  0: { 
    label: 'Not Started', 
    bgColor: 'bg-gray-200', 
    borderColor: 'border-gray-400',
    fillColor: '#e5e7eb',
    textColor: 'text-gray-500'
  },
  1: { 
    label: 'Presented', 
    bgColor: 'bg-yellow-200', 
    borderColor: 'border-yellow-500',
    fillColor: '#fef3c7',
    textColor: 'text-yellow-700'
  },
  2: { 
    label: 'Practicing', 
    bgColor: 'bg-blue-200', 
    borderColor: 'border-blue-500',
    fillColor: '#dbeafe',
    textColor: 'text-blue-700'
  },
  3: { 
    label: 'Mastered', 
    bgColor: 'bg-green-200', 
    borderColor: 'border-green-500',
    fillColor: '#d1fae5',
    textColor: 'text-green-700'
  },
} as const;

// ============================================
// SUB-COMPONENTS
// ============================================

interface ProgressTickProps {
  work: WorkStatusItem;
  index: number;
  totalWorks: number;
  isCurrent: boolean;
  areaColor: string;
  onClick?: () => void;
}

function ProgressTick({ work, index, totalWorks, isCurrent, areaColor, onClick }: ProgressTickProps) {
  const statusConfig = STATUS_CONFIG[work.status];
  const positionPercent = totalWorks > 1 ? (index / (totalWorks - 1)) * 100 : 50;
  
  return (
    <button
      onClick={onClick}
      className="absolute transform -translate-x-1/2 group"
      style={{ left: `${positionPercent}%` }}
      title={`${work.name} - ${statusConfig.label}`}
      aria-label={`${work.name}: ${statusConfig.label}`}
    >
      <div
        className={`
          w-2 h-4 rounded-sm transition-all duration-200
          ${statusConfig.bgColor}
          ${isCurrent ? 'ring-2 ring-offset-1 scale-125' : 'hover:scale-110'}
        `}
        style={{
          ringColor: isCurrent ? areaColor : undefined,
        }}
      />
      
      {isCurrent && (
        <div 
          className="absolute -bottom-3 left-1/2 transform -translate-x-1/2"
          style={{ color: areaColor }}
        >
          <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
            <polygon points="5,0 10,6 0,6" />
          </svg>
        </div>
      )}
      
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
        <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
          {work.name}
          <div className="text-gray-400 text-[10px]">{work.categoryName}</div>
        </div>
      </div>
    </button>
  );
}

interface CategoryBreakdownProps {
  worksStatus: WorkStatusItem[];
  areaColor: string;
  onWorkClick?: (workId: string) => void;
}

function CategoryBreakdown({ worksStatus, areaColor, onWorkClick }: CategoryBreakdownProps) {
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, WorkStatusItem[]> = {};
    worksStatus.forEach(work => {
      if (!groups[work.categoryName]) {
        groups[work.categoryName] = [];
      }
      groups[work.categoryName].push(work);
    });
    return groups;
  }, [worksStatus]);

  return (
    <div className="mt-3 space-y-3 pl-4 border-l-2" style={{ borderColor: areaColor }}>
      {Object.entries(groupedByCategory).map(([categoryName, works]) => {
        const completed = works.filter(w => w.status === 3).length;
        const inProgress = works.filter(w => w.status > 0 && w.status < 3).length;
        
        return (
          <div key={categoryName} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{categoryName}</span>
              <span className="text-xs text-gray-500">
                {completed}/{works.length} complete
                {inProgress > 0 && ` • ${inProgress} in progress`}
              </span>
            </div>
            
            <div className="flex flex-wrap gap-1">
              {works.map((work) => {
                const config = STATUS_CONFIG[work.status];
                return (
                  <button
                    key={work.workId}
                    onClick={() => onWorkClick?.(work.workId)}
                    className={`
                      text-xs px-2 py-0.5 rounded-full border transition-colors
                      ${config.bgColor} ${config.borderColor} ${config.textColor}
                      hover:opacity-80
                    `}
                    title={`${work.name} - ${config.label}`}
                  >
                    {work.name.length > 20 ? work.name.slice(0, 18) + '…' : work.name}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface AreaProgressBarProps {
  area: AreaProgressData;
  isExpanded: boolean;
  onToggle: () => void;
  onWorkClick?: (workId: string, areaId: string) => void;
}

function AreaProgressBar({ area, isExpanded, onToggle, onWorkClick }: AreaProgressBarProps) {
  const completedWorks = area.worksStatus.filter(w => w.status === 3).length;
  const progressPercent = area.totalWorks > 0 ? (completedWorks / area.totalWorks) * 100 : 0;
  const currentIndex = area.currentWorkIndex;
  
  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl" role="img" aria-label={area.areaName}>
            {area.icon}
          </span>
          <span className="font-medium text-gray-900">{area.areaName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {completedWorks}/{area.totalWorks} works
          </span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      <div className="px-4 pb-3">
        <div className="relative h-6 flex items-center">
          <div className="absolute inset-x-0 h-2 bg-gray-100 rounded-full" />
          
          <div
            className="absolute left-0 h-2 rounded-full transition-all duration-500"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: area.color,
              opacity: 0.7,
            }}
          />
          
          <div className="absolute inset-x-2 h-full">
            {area.worksStatus.map((work, idx) => (
              <ProgressTick
                key={work.workId}
                work={work}
                index={idx}
                totalWorks={area.totalWorks}
                isCurrent={idx === currentIndex}
                areaColor={area.color}
                onClick={() => onWorkClick?.(work.workId, area.areaId)}
              />
            ))}
          </div>
        </div>
        
        {area.currentWorkName && (
          <div className="mt-2 text-center">
            <span 
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ 
                backgroundColor: `${area.color}20`,
                color: area.color,
              }}
            >
              Current: {area.currentWorkName}
            </span>
          </div>
        )}
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4 border-t bg-gray-50">
          <CategoryBreakdown
            worksStatus={area.worksStatus}
            areaColor={area.color}
            onWorkClick={(workId) => onWorkClick?.(workId, area.areaId)}
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// LEGEND COMPONENT
// ============================================

function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
      <span className="font-medium">Legend:</span>
      {Object.entries(STATUS_CONFIG).map(([status, config]) => (
        <div key={status} className="flex items-center gap-1">
          <div className={`w-3 h-3 rounded-sm ${config.bgColor} ${config.borderColor} border`} />
          <span>{config.label}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function StudentProgressBars({
  childId,
  childName,
  progressData,
  onWorkClick,
}: StudentProgressBarsProps) {
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  
  const toggleArea = useCallback((areaId: string) => {
    setExpandedAreas(prev => {
      const next = new Set(prev);
      if (next.has(areaId)) {
        next.delete(areaId);
      } else {
        next.add(areaId);
      }
      return next;
    });
  }, []);
  
  const overallStats = useMemo(() => {
    const totalWorks = progressData.reduce((sum, area) => sum + area.totalWorks, 0);
    const completedWorks = progressData.reduce(
      (sum, area) => sum + area.worksStatus.filter(w => w.status === 3).length,
      0
    );
    const inProgressWorks = progressData.reduce(
      (sum, area) => sum + area.worksStatus.filter(w => w.status > 0 && w.status < 3).length,
      0
    );
    return {
      total: totalWorks,
      completed: completedWorks,
      inProgress: inProgressWorks,
      percentage: totalWorks > 0 ? Math.round((completedWorks / totalWorks) * 100) : 0,
    };
  }, [progressData]);
  
  if (!progressData || progressData.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        No progress data available for {childName}
      </div>
    );
  }
  
  return (
    <div className="space-y-4" data-testid="student-progress-bars" data-child-id={childId}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-lg font-semibold text-gray-900">
          {childName}&apos;s Progress
        </h3>
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-gray-600">{overallStats.completed} mastered</span>
          </div>
          <span className="text-gray-300">•</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-gray-600">{overallStats.inProgress} in progress</span>
          </div>
          <span className="text-gray-300">•</span>
          <span className="font-medium text-gray-900">{overallStats.percentage}%</span>
        </div>
      </div>
      
      <div className="space-y-3">
        {progressData.map((area) => (
          <AreaProgressBar
            key={area.areaId}
            area={area}
            isExpanded={expandedAreas.has(area.areaId)}
            onToggle={() => toggleArea(area.areaId)}
            onWorkClick={onWorkClick}
          />
        ))}
      </div>
      
      <div className="pt-2 border-t">
        <StatusLegend />
      </div>
    </div>
  );
}

// ============================================
// EXPORTS FOR EXTERNAL USE
// ============================================

export { StatusLegend, AreaProgressBar, CategoryBreakdown };
export type { ProgressTickProps, CategoryBreakdownProps, AreaProgressBarProps };
