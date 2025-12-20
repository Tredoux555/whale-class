// src/lib/curriculum/tree-utils.ts
// Utilities for building React Flow tree from curriculum data

import dagre from 'dagre';
import { Node, Edge, Position } from 'reactflow';
import type { Area, Category, Work } from './types';
import { areas, buildPrerequisiteMap } from './index';

// Node dimensions
const NODE_WIDTH = {
  area: 200,
  category: 180,
  work: 160,
};

const NODE_HEIGHT = {
  area: 80,
  category: 60,
  work: 50,
};

// Spacing
const HORIZONTAL_SPACING = 50;
const VERTICAL_SPACING = 80;

// Colors for each area (matching the JSON data)
export const AREA_COLORS: Record<string, string> = {
  'practical_life': '#4CAF50',
  'sensorial': '#FF9800',
  'math': '#2196F3',
  'language': '#E91E63',
  'cultural': '#9C27B0',
};

export interface TreeBuildOptions {
  expandedAreas: Set<string>;
  expandedCategories: Set<string>;
  selectedWorkId: string | null;
  showPrerequisites: boolean;
}

// Build nodes and edges for React Flow
export function buildTreeNodes(options: TreeBuildOptions): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const prerequisiteMap = buildPrerequisiteMap();
  
  // Create Dagre graph for layout
  const g = new dagre.graphlib.Graph();
  g.setGraph({ 
    rankdir: 'BT', // Bottom to Top (tree grows upward)
    nodesep: HORIZONTAL_SPACING,
    ranksep: VERTICAL_SPACING,
    marginx: 50,
    marginy: 50,
  });
  g.setDefaultEdgeLabel(() => ({}));
  
  // Add area nodes (root level)
  areas.forEach((area, areaIndex) => {
    const areaNodeId = `area-${area.id}`;
    
    g.setNode(areaNodeId, { 
      width: NODE_WIDTH.area, 
      height: NODE_HEIGHT.area 
    });
    
    nodes.push({
      id: areaNodeId,
      type: 'areaNode',
      position: { x: 0, y: 0 }, // Will be set by Dagre
      data: {
        area,
        expanded: options.expandedAreas.has(area.id),
      },
    });
    
    // If area is expanded, add category nodes
    if (options.expandedAreas.has(area.id)) {
      area.categories.forEach((category, catIndex) => {
        const categoryNodeId = `category-${category.id}`;
        
        g.setNode(categoryNodeId, { 
          width: NODE_WIDTH.category, 
          height: NODE_HEIGHT.category 
        });
        
        // Edge from area to category
        g.setEdge(areaNodeId, categoryNodeId);
        
        nodes.push({
          id: categoryNodeId,
          type: 'categoryNode',
          position: { x: 0, y: 0 },
          data: {
            category,
            areaColor: area.color,
            expanded: options.expandedCategories.has(category.id),
          },
        });
        
        edges.push({
          id: `edge-${areaNodeId}-${categoryNodeId}`,
          source: areaNodeId,
          target: categoryNodeId,
          type: 'smoothstep',
          style: { stroke: area.color, strokeWidth: 2 },
          animated: false,
        });
        
        // If category is expanded, add work nodes
        if (options.expandedCategories.has(category.id)) {
          const sortedWorks = [...category.works].sort((a, b) => a.sequence - b.sequence);
          
          sortedWorks.forEach((work, workIndex) => {
            const workNodeId = `work-${work.id}`;
            
            g.setNode(workNodeId, { 
              width: NODE_WIDTH.work, 
              height: NODE_HEIGHT.work 
            });
            
            // Edge from category to work
            g.setEdge(categoryNodeId, workNodeId);
            
            nodes.push({
              id: workNodeId,
              type: 'workNode',
              position: { x: 0, y: 0 },
              data: {
                work,
                areaColor: area.color,
                isSelected: options.selectedWorkId === work.id,
              },
            });
            
            edges.push({
              id: `edge-${categoryNodeId}-${workNodeId}`,
              source: categoryNodeId,
              target: workNodeId,
              type: 'smoothstep',
              style: { stroke: area.color, strokeWidth: 1.5, opacity: 0.6 },
              animated: false,
            });
            
            // Add prerequisite edges if enabled
            if (options.showPrerequisites && work.prerequisites.length > 0) {
              work.prerequisites.forEach(prereqId => {
                const prereqNodeId = `work-${prereqId}`;
                // Only add edge if prerequisite node exists in current view
                if (nodes.some(n => n.id === prereqNodeId)) {
                  edges.push({
                    id: `prereq-${prereqId}-${work.id}`,
                    source: prereqNodeId,
                    target: workNodeId,
                    type: 'smoothstep',
                    style: { 
                      stroke: '#FF5722', 
                      strokeWidth: 2,
                      strokeDasharray: '5,5',
                    },
                    animated: true,
                    label: 'prerequisite',
                    labelStyle: { fontSize: 10, fill: '#FF5722' },
                  });
                }
              });
            }
          });
        }
      });
    }
  });
  
  // Run Dagre layout
  dagre.layout(g);
  
  // Apply Dagre positions to nodes
  nodes.forEach(node => {
    const nodeWithPosition = g.node(node.id);
    if (nodeWithPosition && nodeWithPosition.width && nodeWithPosition.height) {
      node.position = {
        x: nodeWithPosition.x - nodeWithPosition.width / 2,
        y: -nodeWithPosition.y - nodeWithPosition.height / 2, // Negative Y to grow upward
      };
      node.sourcePosition = Position.Top;
      node.targetPosition = Position.Bottom;
    }
  });
  
  return { nodes, edges };
}

// Build a simplified tree for initial view (just areas)
export function buildInitialTree(): { nodes: Node[]; edges: Edge[] } {
  return buildTreeNodes({
    expandedAreas: new Set(),
    expandedCategories: new Set(),
    selectedWorkId: null,
    showPrerequisites: false,
  });
}

// Get all prerequisite work IDs for visualization highlighting
export function getAllPrerequisiteIds(workId: string): string[] {
  const prereqs: string[] = [];
  const visited = new Set<string>();
  
  function collectPrereqs(id: string) {
    const work = areas
      .flatMap(a => a.categories)
      .flatMap(c => c.works)
      .find(w => w.id === id);
    
    if (work && !visited.has(id)) {
      visited.add(id);
      work.prerequisites.forEach(prereqId => {
        prereqs.push(prereqId);
        collectPrereqs(prereqId);
      });
    }
  }
  
  collectPrereqs(workId);
  return prereqs;
}

// Calculate tree bounds for centering
export function calculateTreeBounds(nodes: Node[]): { 
  minX: number; 
  maxX: number; 
  minY: number; 
  maxY: number;
  centerX: number;
  centerY: number;
} {
  if (nodes.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, centerX: 0, centerY: 0 };
  }
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  nodes.forEach(node => {
    minX = Math.min(minX, node.position.x);
    maxX = Math.max(maxX, node.position.x + (NODE_WIDTH.area));
    minY = Math.min(minY, node.position.y);
    maxY = Math.max(maxY, node.position.y + (NODE_HEIGHT.area));
  });
  
  return {
    minX,
    maxX,
    minY,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

