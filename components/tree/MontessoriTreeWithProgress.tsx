// components/tree/MontessoriTreeWithProgress.tsx
// Enhanced tree component that shows child progress

'use client';

import React, { useCallback, useState, useMemo, useEffect } from 'react';
import ReactFlow, {
  Controls, Background, useNodesState, useEdgesState, Node,
  NodeMouseHandler, BackgroundVariant, MiniMap, Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { areas, getCurriculumStats } from '@/lib/curriculum';
import { buildTreeNodes } from '@/lib/curriculum/tree-utils';
import { useChildProgress } from '@/lib/hooks/useChildProgress';

import AreaNode from './nodes/AreaNode';
import CategoryNode from './nodes/CategoryNode';
import WorkNode from './nodes/WorkNode';
import WorkDetailPanelWithProgress from './WorkDetailPanelWithProgress';
import ChildSelector from './ChildSelector';
import './tree-styles.css';

// Memoize nodeTypes to fix React Flow warning
const nodeTypes = {
  areaNode: AreaNode,
  categoryNode: CategoryNode,
  workNode: WorkNode,
};

// Mini map node colors with progress
const nodeColor = (node: Node) => {
  if (node.type === 'areaNode') return node.data.area.color;
  if (node.type === 'categoryNode') return node.data.areaColor;
  if (node.type === 'workNode') {
    const status = node.data.progressStatus;
    if (status === 'completed') return '#22c55e';
    if (status === 'in_progress') return '#eab308';
    return node.data.areaColor;
  }
  return '#999';
};

interface Props {
  initialChildId?: string;
}

export default function MontessoriTreeWithProgress({ initialChildId }: Props) {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(initialChildId || null);
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [showPrerequisites, setShowPrerequisites] = useState(false);

  // Fetch child progress
  const { 
    progress, 
    loading: progressLoading,
    startWork,
    completeLevel,
    completeWork,
  } = useChildProgress(selectedChildId);

  // Build completion map for coloring nodes
  const completionMap = useMemo(() => {
    const map = new Map<string, 'completed' | 'in_progress' | 'not_started'>();
    
    if (progress?.completedWorks) {
      progress.completedWorks.forEach(w => {
        map.set(w.work_id, w.status as any);
      });
    }
    
    return map;
  }, [progress]);

  // Build tree with progress info
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const result = buildTreeNodes({
      expandedAreas,
      expandedCategories,
      selectedWorkId,
      showPrerequisites,
    });

    // Enhance work nodes with progress status
    result.nodes = result.nodes.map(node => {
      if (node.type === 'workNode') {
        const status = completionMap.get(node.data.work.id) || 'not_started';
        return {
          ...node,
          data: {
            ...node.data,
            progressStatus: status,
          },
        };
      }
      return node;
    });

    return result;
  }, [expandedAreas, expandedCategories, selectedWorkId, showPrerequisites, completionMap]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Handlers
  const toggleArea = useCallback((areaId: string) => {
    setExpandedAreas(prev => {
      const next = new Set(prev);
      if (next.has(areaId)) {
        next.delete(areaId);
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

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }, []);

  const selectWork = useCallback((workId: string) => {
    setSelectedWorkId(prev => prev === workId ? null : workId);
  }, []);

  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    if (node.type === 'areaNode') toggleArea(node.data.area.id);
    else if (node.type === 'categoryNode') toggleCategory(node.data.category.id);
    else if (node.type === 'workNode') selectWork(node.data.work.id);
  }, [toggleArea, toggleCategory, selectWork]);

  const closePanel = useCallback(() => setSelectedWorkId(null), []);
  const expandAll = useCallback(() => setExpandedAreas(new Set(areas.map(a => a.id))), []);
  const collapseAll = useCallback(() => {
    setExpandedAreas(new Set());
    setExpandedCategories(new Set());
    setSelectedWorkId(null);
  }, []);

  const stats = useMemo(() => getCurriculumStats(), []);

  // Get current work progress for detail panel
  const currentWorkProgress = useMemo(() => {
    if (!selectedWorkId || !progress) return null;
    return progress.completedWorks.find(w => w.work_id === selectedWorkId);
  }, [selectedWorkId, progress]);

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
      >
        <Controls position="bottom-left" />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e0e0e0" />
        <MiniMap position="bottom-right" zoomable pannable nodeColor={nodeColor} />

        {/* Top Left - Child Selector & Stats */}
        <Panel position="top-left" className="control-panel">
          <div className="mb-3">
            <ChildSelector
              selectedChildId={selectedChildId}
              onSelect={setSelectedChildId}
            />
          </div>

          {selectedChildId && progress && (
            <div className="panel-stats mb-3 p-2 bg-blue-50 rounded">
              <div className="text-sm font-medium text-blue-900">
                {progress.child.name}'s Progress
              </div>
              <div className="text-xs text-blue-700">
                {progress.stats.totalCompleted}/{progress.stats.totalWorks} completed
                ({progress.stats.overallPercentage}%)
              </div>
            </div>
          )}

          <div className="panel-stats">
            <span className="stat">{stats.totalAreas} Areas</span>
            <span className="stat">{stats.totalCategories} Categories</span>
            <span className="stat">{stats.totalWorks} Works</span>
          </div>
          
          <div className="panel-controls">
            <button onClick={expandAll} className="control-btn">Expand All</button>
            <button onClick={collapseAll} className="control-btn">Collapse</button>
            <label className="control-checkbox">
              <input
                type="checkbox"
                checked={showPrerequisites}
                onChange={(e) => setShowPrerequisites(e.target.checked)}
              />
              Prerequisites
            </label>
          </div>
        </Panel>

        {/* Progress Legend */}
        {selectedChildId && (
          <Panel position="top-right" className="legend-panel">
            <h4>Progress Status</h4>
            <div className="legend-items">
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#22c55e' }} />
                <span>Completed</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#eab308' }} />
                <span>In Progress</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#e5e7eb' }} />
                <span>Not Started</span>
              </div>
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Enhanced Work Detail Panel with Progress Actions */}
      <WorkDetailPanelWithProgress
        workId={selectedWorkId}
        childId={selectedChildId}
        workProgress={currentWorkProgress || null}
        onClose={closePanel}
        onStartWork={startWork}
        onCompleteLevel={completeLevel}
        onCompleteWork={completeWork}
      />
    </div>
  );
}


