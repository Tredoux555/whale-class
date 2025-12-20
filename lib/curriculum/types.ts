// src/lib/curriculum/types.ts
// Complete type definitions for Montessori curriculum

export type AgeRange = 
  | 'toddler'           // 0-3 years
  | 'primary_year1'     // 3-4 years
  | 'primary_year2'     // 4-5 years
  | 'primary_year3'     // 5-6 years
  | 'lower_elementary'  // 6-9 years
  | 'upper_elementary'; // 9-12 years

export interface Level {
  level: number;
  name: string;
  description: string;
  videoSearchTerms: string[];
}

export interface Work {
  id: string;
  name: string;
  description: string;
  ageRange: AgeRange;
  prerequisites: string[];  // Array of work IDs
  sequence: number;
  materials: string[];
  directAims: string[];
  indirectAims: string[];
  controlOfError: string;
  chineseName: string;      // For 1688 sourcing
  imageUrl?: string;        // Optional - for work photos
  levels: Level[];
}

export interface Category {
  id: string;
  name: string;
  description: string;
  sequence: number;
  works: Work[];
}

export interface Area {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  sequence: number;
  categories: Category[];
}

// Tree visualization types
export interface TreeNode {
  id: string;
  type: 'area' | 'category' | 'work';
  data: Area | Category | Work;
  parentId: string | null;
  children: string[];
  expanded: boolean;
}

export interface TreeState {
  nodes: Map<string, TreeNode>;
  selectedWorkId: string | null;
  expandedNodes: Set<string>;
}

// React Flow node types
export interface AreaNodeData {
  area: Area;
  expanded: boolean;
  onToggle: () => void;
}

export interface CategoryNodeData {
  category: Category;
  areaColor: string;
  expanded: boolean;
  onToggle: () => void;
}

export interface WorkNodeData {
  work: Work;
  areaColor: string;
  onClick: () => void;
  isSelected: boolean;
}

// Curriculum statistics
export interface CurriculumStats {
  totalAreas: number;
  totalCategories: number;
  totalWorks: number;
  totalLevels: number;
  worksByArea: Record<string, number>;
  worksByAgeRange: Record<AgeRange, number>;
}

// Helper type for work lookup
export interface WorkWithContext {
  work: Work;
  category: Category;
  area: Area;
}

