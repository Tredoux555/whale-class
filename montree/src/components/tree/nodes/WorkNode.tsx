// src/components/tree/nodes/WorkNode.tsx
// Custom node for individual works (leaf level)

'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { Work } from '@/lib/curriculum/types';

interface WorkNodeData {
  work: Work;
  areaColor: string;
  isSelected: boolean;
  onClick?: () => void;
}

// Age range display labels
const AGE_LABELS: Record<string, string> = {
  'toddler': '0-3',
  'primary_year1': '3-4',
  'primary_year2': '4-5',
  'primary_year3': '5-6',
  'lower_elementary': '6-9',
  'upper_elementary': '9-12',
};

function WorkNode({ data, selected }: NodeProps<WorkNodeData>) {
  const { work, areaColor, isSelected, onClick } = data;
  
  const hasPrerequisites = work.prerequisites.length > 0;
  const levelCount = work.levels.length;
  
  return (
    <div
      className={`work-node ${isSelected ? 'selected' : ''} ${hasPrerequisites ? 'has-prereqs' : ''}`}
      style={{
        borderColor: isSelected ? '#FF5722' : areaColor,
        backgroundColor: isSelected ? `${areaColor}15` : '#fff',
        boxShadow: isSelected ? `0 0 0 2px ${areaColor}40` : 'none',
      }}
      onClick={onClick}
    >
      {/* Handle for incoming edges (from dependent works) */}
      <Handle
        type="source"
        position={Position.Top}
        style={{ background: areaColor, width: 8, height: 8 }}
      />
      
      <div className="work-node-content">
        <h5 className="work-name">{work.name}</h5>
        <div className="work-meta">
          <span 
            className="work-age"
            style={{ backgroundColor: `${areaColor}20`, color: areaColor }}
          >
            {AGE_LABELS[work.ageRange] || work.ageRange}
          </span>
          {levelCount > 1 && (
            <span className="work-levels">
              {levelCount} levels
            </span>
          )}
          {hasPrerequisites && (
            <span className="work-prereqs" title="Has prerequisites">
              🔗
            </span>
          )}
        </div>
      </div>
      
      {/* Handle for outgoing edge (to category above) */}
      <Handle
        type="target"
        position={Position.Bottom}
        style={{ background: areaColor, width: 8, height: 8 }}
      />
    </div>
  );
}

export default memo(WorkNode);

