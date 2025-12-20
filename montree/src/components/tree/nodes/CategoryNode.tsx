// src/components/tree/nodes/CategoryNode.tsx
// Custom node for curriculum categories

'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { Category } from '@/lib/curriculum/types';

interface CategoryNodeData {
  category: Category;
  areaColor: string;
  expanded: boolean;
  onToggle?: () => void;
}

function CategoryNode({ data, selected }: NodeProps<CategoryNodeData>) {
  const { category, areaColor, expanded, onToggle } = data;
  
  return (
    <div
      className={`category-node ${expanded ? 'expanded' : ''} ${selected ? 'selected' : ''}`}
      style={{
        borderColor: areaColor,
        backgroundColor: expanded ? areaColor : '#fff',
        color: expanded ? '#fff' : '#333',
      }}
      onClick={onToggle}
    >
      {/* Handle for incoming edges (from works below) */}
      <Handle
        type="source"
        position={Position.Top}
        style={{ background: areaColor }}
      />
      
      <div className="category-node-content">
        <div className="category-info">
          <h4 className="category-name">{category.name}</h4>
          <span 
            className="category-stats"
            style={{ color: expanded ? 'rgba(255,255,255,0.8)' : '#666' }}
          >
            {category.works.length} works
          </span>
        </div>
        <span 
          className="expand-indicator"
          style={{ color: expanded ? '#fff' : areaColor }}
        >
          {expanded ? '−' : '+'}
        </span>
      </div>
      
      {/* Handle for outgoing edge (to area above) */}
      <Handle
        type="target"
        position={Position.Bottom}
        style={{ background: areaColor }}
      />
    </div>
  );
}

export default memo(CategoryNode);

