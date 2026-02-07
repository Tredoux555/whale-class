// lib/montree/curriculum-data.ts
// Loads and converts existing JSON curriculum data to Montree format

import { CurriculumArea, Category, Work } from './types';

// Import existing JSON data
import practicalLifeData from '@/lib/curriculum/data/practical-life.json';
import sensorialData from '@/lib/curriculum/data/sensorial.json';
import mathData from '@/lib/curriculum/data/math.json';
import languageData from '@/lib/curriculum/data/language.json';
import culturalData from '@/lib/curriculum/data/cultural.json';

// Convert JSON work to our Work interface
interface JsonWork {
  id: string;
  name: string;
  chineseName?: string;
  chinese_name?: string;
  description?: string;
  ageRange?: string;
  age_range?: string;
  materials?: unknown[];
  levels?: Array<{ level?: number; name?: string; description?: string; videoSearchTerms?: string[] }>;
  prerequisites?: unknown[];
  directAims?: unknown;
  direct_aims?: unknown;
  indirectAims?: unknown;
  indirect_aims?: unknown;
  controlOfError?: unknown;
  control_of_error?: unknown;
  videoSearchTerms?: string[];
  video_search_terms?: string[];
}

function convertWork(jsonWork: JsonWork): Work {
  // Extract all videoSearchTerms from levels and combine with work-level terms
  const levelVideoTerms: string[] = [];
  const levels = jsonWork.levels || [
    { level: 1, name: 'Introduction', description: 'First presentation' },
    { level: 2, name: 'Practice', description: 'Independent practice' },
    { level: 3, name: 'Mastery', description: 'Full mastery' },
  ];
  
  levels.forEach((level) => {
    if (level.videoSearchTerms && Array.isArray(level.videoSearchTerms)) {
      levelVideoTerms.push(...level.videoSearchTerms);
    }
  });
  
  const workVideoTerms = jsonWork.videoSearchTerms || jsonWork.video_search_terms || [];
  const allVideoTerms = Array.from(new Set([...levelVideoTerms, ...(Array.isArray(workVideoTerms) ? workVideoTerms : [])]));
  
  return {
    id: jsonWork.id,
    name: jsonWork.name,
    chineseName: jsonWork.chineseName || jsonWork.chinese_name,
    description: jsonWork.description || '',
    ageRange: jsonWork.ageRange || jsonWork.age_range || '3-6',
    materials: jsonWork.materials || [],
    levels: levels,
    prerequisites: jsonWork.prerequisites || [],
    directAims: jsonWork.directAims || jsonWork.direct_aims,
    indirectAims: jsonWork.indirectAims || jsonWork.indirect_aims,
    controlOfError: jsonWork.controlOfError || jsonWork.control_of_error,
    videoSearchTerms: allVideoTerms.length > 0 ? allVideoTerms : undefined,
  };
}

// Convert JSON category to our Category interface
interface JsonCategory {
  id: string;
  name: string;
  works?: JsonWork[];
  activities?: JsonWork[];
}

function convertCategory(jsonCategory: JsonCategory): Category {
  return {
    id: jsonCategory.id,
    name: jsonCategory.name,
    works: (jsonCategory.works || jsonCategory.activities || []).map(convertWork),
  };
}

// Convert JSON area to our CurriculumArea interface
interface JsonArea {
  name?: string;
  categories?: JsonCategory[];
  works?: JsonWork[];
}

function convertArea(jsonArea: JsonArea | JsonWork[], areaId: string, icon: string, color: string): CurriculumArea {
  // Handle both array of categories and direct works array
  let categories: Category[] = [];

  if (!Array.isArray(jsonArea) && jsonArea.categories) {
    categories = jsonArea.categories.map(convertCategory);
  } else if (!Array.isArray(jsonArea) && jsonArea.works) {
    // If works are directly on the area, create a single "All" category
    categories = [{
      id: `${areaId}_all`,
      name: 'All Activities',
      works: jsonArea.works.map(convertWork),
    }];
  } else if (Array.isArray(jsonArea)) {
    // If the data is just an array of works
    categories = [{
      id: `${areaId}_all`,
      name: 'All Activities',
      works: jsonArea.map(convertWork),
    }];
  }

  const areaName = !Array.isArray(jsonArea) && jsonArea.name ? jsonArea.name : areaId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

  return {
    id: areaId,
    name: areaName,
    icon,
    color,
    categories,
  };
}

// Build the curriculum from existing JSON files
export const CURRICULUM: CurriculumArea[] = [
  convertArea(practicalLifeData, 'practical_life', 'P', '#22c55e'),
  convertArea(sensorialData, 'sensorial', 'S', '#f97316'),
  convertArea(mathData, 'mathematics', 'M', '#3b82f6'),
  convertArea(languageData, 'language', 'L', '#ec4899'),
  convertArea(culturalData, 'cultural', 'C', '#8b5cf6'),
];

// Helper to get all works flat
export function getAllWorks(): Work[] {
  return CURRICULUM.flatMap(area => 
    area.categories.flatMap(cat => cat.works)
  );
}

// Helper to find work by ID
export function getWorkById(workId: string): Work | null {
  for (const area of CURRICULUM) {
    for (const category of area.categories) {
      const work = category.works.find(w => w.id === workId);
      if (work) return work;
    }
  }
  return null;
}

// Helper to get area by ID
export function getAreaById(areaId: string): CurriculumArea | null {
  return CURRICULUM.find(a => a.id === areaId) || null;
}

// Helper to get category by ID
export function getCategoryById(areaId: string, categoryId: string): Category | null {
  const area = getAreaById(areaId);
  if (!area) return null;
  return area.categories.find(c => c.id === categoryId) || null;
}

// Get total work count
export function getTotalWorkCount(): number {
  return getAllWorks().length;
}

// Find which area and category a work belongs to
export function findWorkLocation(workId: string): { areaId: string; categoryId: string } | null {
  for (const area of CURRICULUM) {
    for (const category of area.categories) {
      if (category.works.some(w => w.id === workId)) {
        return { areaId: area.id, categoryId: category.id };
      }
    }
  }
  return null;
}

