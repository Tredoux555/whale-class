// src/components/tree/WorkDetailPanel.tsx
// Slide-out panel showing work details when a work node is clicked

'use client';

import React from 'react';
import type { Work, Category, Area } from '@/lib/curriculum/types';
import { getWork, getPrerequisites, getDependentWorks } from '@/lib/curriculum';

interface WorkDetailPanelProps {
  workId: string | null;
  onClose: () => void;
  onWorkClick: (workId: string) => void;
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

export default function WorkDetailPanel({ workId, onClose, onWorkClick }: WorkDetailPanelProps) {
  if (!workId) return null;
  
  const workContext = getWork(workId);
  if (!workContext) return null;
  
  const { work, category, area } = workContext;
  const prerequisites = getPrerequisites(workId);
  const dependents = getDependentWorks(workId);
  
  // Generate YouTube search URL
  const getYouTubeSearchUrl = (searchTerms: string[]) => {
    const query = searchTerms[0] || work.name;
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  };
  
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
      </div>
      
      <div className="panel-body">
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
        
        {/* Aims */}
        <div className="panel-section aims-section">
          <div className="aims-column">
            <h3>Direct Aims</h3>
            <ul>
              {work.directAims.map((aim, i) => (
                <li key={i}>{aim}</li>
              ))}
            </ul>
          </div>
          <div className="aims-column">
            <h3>Indirect Aims</h3>
            <ul>
              {work.indirectAims.map((aim, i) => (
                <li key={i}>{aim}</li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Control of Error */}
        <div className="panel-section">
          <h3>Control of Error</h3>
          <p>{work.controlOfError}</p>
        </div>
        
        {/* Levels */}
        <div className="panel-section">
          <h3>Levels / Progressions</h3>
          <div className="levels-list">
            {work.levels.map((level) => (
              <div key={level.level} className="level-item">
                <div className="level-header">
                  <span 
                    className="level-number"
                    style={{ backgroundColor: area.color }}
                  >
                    {level.level}
                  </span>
                  <span className="level-name">{level.name}</span>
                </div>
                <p className="level-description">{level.description}</p>
                {level.videoSearchTerms.length > 0 && (
                  <a
                    href={getYouTubeSearchUrl(level.videoSearchTerms)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="video-link"
                  >
                    ▶️ Watch Videos
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Prerequisites */}
        {prerequisites.length > 0 && (
          <div className="panel-section">
            <h3>Prerequisites</h3>
            <div className="related-works">
              {prerequisites.map(({ work: prereq, area: prereqArea }) => (
                <button
                  key={prereq.id}
                  className="related-work-btn"
                  style={{ borderColor: prereqArea.color }}
                  onClick={() => onWorkClick(prereq.id)}
                >
                  <span className="related-icon">{prereqArea.icon}</span>
                  <span className="related-name">{prereq.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Dependent Works */}
        {dependents.length > 0 && (
          <div className="panel-section">
            <h3>Leads To</h3>
            <div className="related-works">
              {dependents.map(({ work: dep, area: depArea }) => (
                <button
                  key={dep.id}
                  className="related-work-btn"
                  style={{ borderColor: depArea.color }}
                  onClick={() => onWorkClick(dep.id)}
                >
                  <span className="related-icon">{depArea.icon}</span>
                  <span className="related-name">{dep.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Image placeholder */}
        {work.imageUrl ? (
          <div className="panel-section">
            <h3>Photo</h3>
            <img 
              src={work.imageUrl} 
              alt={work.name}
              className="work-image"
            />
          </div>
        ) : (
          <div className="panel-section image-placeholder">
            <div className="placeholder-box">
              <span>📷</span>
              <p>No image yet</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

