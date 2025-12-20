// src/components/tree/MontessoriTree.tsx
// Main tree visualization component using React Flow

'use client';

import React, { useCallback, useState, useMemo, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  NodeMouseHandler,
  BackgroundVariant,
  MiniMap,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { areas, getCurriculumStats } from '@/lib/curriculum';
import { buildTreeNodes, calculateTreeBounds } from '@/lib/curriculum/tree-utils';

import AreaNode from './nodes/AreaNode';
import CategoryNode from './nodes/CategoryNode';
import WorkNode from './nodes/WorkNode';
import WorkDetailPanel from './WorkDetailPanel';

import './tree-styles.css';

// Register custom node types (must be outside component to avoid re-creation)
const nodeTypes = {
  areaNode: AreaNode,
  categoryNode: CategoryNode,
  workNode: WorkNode,
};

// Mini map node colors
const nodeColor = (node: Node) => {
  if (node.type === 'areaNode') return node.data.area.color;
  if (node.type === 'categoryNode') return node.data.areaColor;
  if (node.type === 'workNode') return node.data.areaColor;
  return '#999';
};

export default function MontessoriTree() {
  // State for expanded nodes
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [showPrerequisites, setShowPrerequisites] = useState(false);
  
  // Build tree based on current state
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    try {
      return buildTreeNodes({
        expandedAreas,
        expandedCategories,
        selectedWorkId,
        showPrerequisites,
      });
    } catch (error) {
      console.error('Error building tree nodes:', error);
      return { nodes: [], edges: [] };
    }
  }, [expandedAreas, expandedCategories, selectedWorkId, showPrerequisites]);
  
  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // Update nodes when tree structure changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);
  
  // Handle area toggle
  const toggleArea = useCallback((areaId: string) => {
    setExpandedAreas(prev => {
      const next = new Set(prev);
      if (next.has(areaId)) {
        next.delete(areaId);
        // Also collapse all categories in this area
        const area = areas.find(a => a.id === areaId);
        if (area) {
          area.categories.forEach(cat => {
            setExpandedCategories(catPrev => {
              const catNext = new Set(catPrev);
              catNext.delete(cat.id);
              return catNext;
            });
          });
        }
      } else {
        next.add(areaId);
      }
      return next;
    });
  }, []);
  
  // Handle category toggle
  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);
  
  // Handle work selection
  const selectWork = useCallback((workId: string) => {
    setSelectedWorkId(prev => prev === workId ? null : workId);
  }, []);
  
  // Handle node clicks
  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    if (node.type === 'areaNode') {
      toggleArea(node.data.area.id);
    } else if (node.type === 'categoryNode') {
      toggleCategory(node.data.category.id);
    } else if (node.type === 'workNode') {
      selectWork(node.data.work.id);
    }
  }, [toggleArea, toggleCategory, selectWork]);
  
  // Close detail panel
  const closePanel = useCallback(() => {
    setSelectedWorkId(null);
  }, []);
  
  // Navigate to different work from panel
  const navigateToWork = useCallback((workId: string) => {
    setSelectedWorkId(workId);
    // TODO: Could also expand the tree to show this work
  }, []);
  
  // Expand all areas
  const expandAll = useCallback(() => {
    setExpandedAreas(new Set(areas.map(a => a.id)));
  }, []);
  
  // Collapse all
  const collapseAll = useCallback(() => {
    setExpandedAreas(new Set());
    setExpandedCategories(new Set());
    setSelectedWorkId(null);
  }, []);
  
  // Get curriculum stats
  const stats = useMemo(() => getCurriculumStats(), []);
  
  return (
    <div className="montessori-tree-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        {/* Controls */}
        <Controls position="bottom-left" />
        
        {/* Background */}
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1}
          color="#e0e0e0"
        />
        
        {/* Mini Map */}
        <MiniMap 
          nodeColor={nodeColor}
          position="bottom-right"
          zoomable
          pannable
        />
        
        {/* Top Panel - Stats and Controls */}
        <Panel position="top-left" className="control-panel">
          <div className="panel-stats">
            <span className="stat">{stats.totalAreas} Areas</span>
            <span className="stat">{stats.totalCategories} Categories</span>
            <span className="stat">{stats.totalWorks} Works</span>
            <span className="stat">{stats.totalLevels} Levels</span>
          </div>
          <div className="panel-controls">
            <button onClick={expandAll} className="control-btn">
              Expand All Areas
            </button>
            <button onClick={collapseAll} className="control-btn">
              Collapse All
            </button>
            <label className="control-checkbox">
              <input
                type="checkbox"
                checked={showPrerequisites}
                onChange={(e) => setShowPrerequisites(e.target.checked)}
              />
              Show Prerequisites
            </label>
          </div>
        </Panel>
        
        {/* Legend */}
        <Panel position="top-right" className="legend-panel">
          <h4>Curriculum Areas</h4>
          <div className="legend-items">
            {areas.map(area => (
              <div key={area.id} className="legend-item">
                <span 
                  className="legend-color" 
                  style={{ backgroundColor: area.color }}
                />
                <span className="legend-icon">{area.icon}</span>
                <span className="legend-name">{area.name}</span>
              </div>
            ))}
          </div>
          <div className="legend-edge-types">
            <div className="legend-edge">
              <span className="edge-line solid"></span>
              <span>Parent-Child</span>
            </div>
            <div className="legend-edge">
              <span className="edge-line dashed"></span>
              <span>Prerequisite</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
      
      {/* Work Detail Panel */}
      <WorkDetailPanel
        workId={selectedWorkId}
        onClose={closePanel}
        onWorkClick={navigateToWork}
      />
    </div>
  );
}

