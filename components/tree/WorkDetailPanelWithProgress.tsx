'use client';

import React from 'react';
import { getWork, getPrerequisites } from '@/lib/curriculum';

interface WorkProgress {
  work_id: string;
  status: string;
  current_level: number;
  max_level: number;
  level_completions: Record<number, { completed_at: string }>;
}

interface Props {
  workId: string | null;
  childId: string | null;
  workProgress: WorkProgress | null;
  onClose: () => void;
  onStartWork: (workId: string) => void;
  onCompleteLevel: (workId: string, level: number) => void;
  onCompleteWork: (workId: string) => void;
}

// Age range display labels
const AGE_LABELS: Record<string, string> = {
  'toddler': '0-3 years',
  'primary_year1': '3-4 years',
  'primary_year2': '4-5 years',
  'primary_year3': '5-6 years',
  'lower_elementary': '6-9 years',
  'upper_elementary': '9-12 years',
};

export default function WorkDetailPanelWithProgress({
  workId,
  childId,
  workProgress,
  onClose,
  onStartWork,
  onCompleteLevel,
  onCompleteWork,
}: Props) {
  if (!workId) return null;

  const workContext = getWork(workId);
  if (!workContext) return null;

  const { work, category, area } = workContext;
  const prerequisites = getPrerequisites(workId);

  const status = workProgress?.status || 'not_started';
  const currentLevel = workProgress?.current_level || 0;
  const levelCompletions = workProgress?.level_completions || {};

  // Generate 1688 search URL
  const get1688SearchUrl = () => {
    return `https://s.1688.com/selloffer/offer_search.htm?keywords=${encodeURIComponent(work.chineseName)}`;
  };

  return (
    <div className="work-detail-panel">
      <div className="panel-header" style={{ backgroundColor: area.color }}>
        <div className="panel-header-content">
          <span className="panel-area">{area.icon} {area.name}</span>
          <span className="panel-category">{category.name}</span>
          <button className="panel-close" onClick={onClose}>×</button>
        </div>
        <h2 className="panel-title">{work.name}</h2>
        <span className="panel-chinese">{work.chineseName}</span>
        
        {/* Progress Badge */}
        {childId && (
          <div className="mt-2">
            <span className={`
              inline-block px-3 py-1 rounded-full text-sm font-medium
              ${status === 'completed' ? 'bg-green-500 text-white' :
                status === 'in_progress' ? 'bg-yellow-500 text-white' :
                'bg-white/20 text-white'}
            `}>
              {status === 'completed' ? '✓ Completed' :
               status === 'in_progress' ? `Level ${currentLevel}/${work.levels.length}` :
               'Not Started'}
            </span>
          </div>
        )}
      </div>

      <div className="panel-body">
        {/* Progress Actions */}
        {childId && (
          <div className="panel-section">
            <h3>Progress Actions</h3>
            <div className="flex flex-wrap gap-2">
              {status === 'not_started' && (
                <button
                  onClick={() => onStartWork(workId)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Start This Work
                </button>
              )}
              
              {status === 'in_progress' && currentLevel < work.levels.length && (
                <button
                  onClick={() => onCompleteLevel(workId, currentLevel)}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                >
                  Complete Level {currentLevel}
                </button>
              )}
              
              {status === 'in_progress' && (
                <button
                  onClick={() => onCompleteWork(workId)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Mark All Complete
                </button>
              )}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="panel-section stats-row">
          <div className="stat-item">
            <span className="stat-label">Age Range</span>
            <span className="stat-value">{AGE_LABELS[work.ageRange]}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Levels</span>
            <span className="stat-value">{work.levels.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Materials</span>
            <span className="stat-value">{work.materials.length}</span>
          </div>
        </div>

        {/* Description */}
        <div className="panel-section">
          <h3>Description</h3>
          <p>{work.description}</p>
        </div>

        {/* Materials */}
        <div className="panel-section">
          <h3>Materials Needed</h3>
          <ul className="materials-list">
            {work.materials.map((material, i) => (
              <li key={i}>{material}</li>
            ))}
          </ul>
          <a 
            href={get1688SearchUrl()} 
            target="_blank" 
            rel="noopener noreferrer"
            className="source-link"
            style={{ color: area.color }}
          >
            🔍 Find on 1688.com
          </a>
        </div>

        {/* Levels with Progress */}
        <div className="panel-section">
          <h3>Levels / Progressions</h3>
          <div className="levels-list">
            {work.levels.map((level) => {
              const isCompleted = !!levelCompletions[level.level];
              const isCurrent = level.level === currentLevel;
              
              return (
                <div
                  key={level.level}
                  className={`level-item ${isCompleted ? 'bg-green-50' : isCurrent ? 'bg-yellow-50' : ''}`}
                >
                  <div className="level-header">
                    <span
                      className="level-number"
                      style={{
                        backgroundColor: isCompleted ? '#22c55e' : 
                                        isCurrent ? '#eab308' : area.color,
                      }}
                    >
                      {isCompleted ? '✓' : level.level}
                    </span>
                    <span className="level-name">{level.name}</span>
                    
                    {childId && !isCompleted && status === 'in_progress' && (
                      <button
                        onClick={() => onCompleteLevel(workId, level.level)}
                        className="ml-auto text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                  <p className="level-description">{level.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Prerequisites */}
        {prerequisites.length > 0 && (
          <div className="panel-section">
            <h3>Prerequisites</h3>
            <div className="text-sm text-gray-600">
              {prerequisites.map(p => p.work.name).join(', ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


