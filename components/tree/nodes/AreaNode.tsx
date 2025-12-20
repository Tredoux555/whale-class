// src/components/tree/nodes/AreaNode.tsx
// Custom node for curriculum areas (root level)

'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { Area } from '@/lib/curriculum/types';

interface AreaNodeData {
  area: Area;
  expanded: boolean;
  onToggle?: () => void;
}

function AreaNode({ data, selected }: NodeProps<AreaNodeData>) {
  const { area, expanded, onToggle } = data;
  
  // Count total works in this area
  const totalWorks = area.categories.reduce(
    (sum, cat) => sum + cat.works.length, 
    0
  );
  
  return (
    <div
      className={`area-node ${expanded ? 'expanded' : ''} ${selected ? 'selected' : ''}`}
      style={{
        backgroundColor: area.color,
        borderColor: expanded ? '#fff' : area.color,
      }}
      onClick={onToggle}
    >
      {/* Handle for incoming edges (from children - tree grows up) */}
      <Handle
        type="source"
        position={Position.Top}
        style={{ background: area.color, border: '2px solid #fff' }}
      />
      
      <div className="area-node-content">
        <span className="area-icon">{area.icon}</span>
        <div className="area-info">
          <h3 className="area-name">{area.name}</h3>
          <span className="area-stats">
            {area.categories.length} categories • {totalWorks} works
          </span>
        </div>
        <span className="expand-indicator">
          {expanded ? '−' : '+'}
        </span>
      </div>
      
      {/* Handle for outgoing edges (to parent - but we're root, so hidden) */}
      <Handle
        type="target"
        position={Position.Bottom}
        style={{ opacity: 0 }}
      />
    </div>
  );
}

export default memo(AreaNode);

