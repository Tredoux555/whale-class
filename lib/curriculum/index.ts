// src/lib/curriculum/index.ts
// Curriculum data loader and helper functions

import type { Area, Category, Work, CurriculumStats, WorkWithContext, AgeRange } from './types';

// Import curriculum data
import practicalLifeData from './data/practical-life.json';
import sensorialData from './data/sensorial.json';
import mathData from './data/math.json';
import languageData from './data/language.json';
import culturalData from './data/cultural.json';

// Export all areas
export const areas: Area[] = [
  practicalLifeData as Area,
  sensorialData as Area,
  mathData as Area,
  languageData as Area,
  culturalData as Area,
].sort((a, b) => a.sequence - b.sequence);

// Get area by ID
export function getArea(areaId: string): Area | undefined {
  return areas.find(a => a.id === areaId);
}

// Get category by ID
export function getCategory(categoryId: string): Category | undefined {
  for (const area of areas) {
    const category = area.categories.find(c => c.id === categoryId);
    if (category) return category;
  }
  return undefined;
}

// Get work by ID with full context
export function getWork(workId: string): WorkWithContext | undefined {
  for (const area of areas) {
    for (const category of area.categories) {
      const work = category.works.find(w => w.id === workId);
      if (work) {
        return { work, category, area };
      }
    }
  }
  return undefined;
}

// Get all works as flat array
export function getAllWorks(): Work[] {
  const works: Work[] = [];
  for (const area of areas) {
    for (const category of area.categories) {
      works.push(...category.works);
    }
  }
  return works;
}

// Get works by area
export function getWorksByArea(areaId: string): Work[] {
  const area = getArea(areaId);
  if (!area) return [];
  
  const works: Work[] = [];
  for (const category of area.categories) {
    works.push(...category.works);
  }
  return works;
}

// Get prerequisite works for a given work
export function getPrerequisites(workId: string): WorkWithContext[] {
  const workContext = getWork(workId);
  if (!workContext) return [];
  
  return workContext.work.prerequisites
    .map(prereqId => getWork(prereqId))
    .filter((w): w is WorkWithContext => w !== undefined);
}

// Get works that depend on a given work
export function getDependentWorks(workId: string): WorkWithContext[] {
  const allWorks = getAllWorks();
  const dependents: WorkWithContext[] = [];
  
  for (const work of allWorks) {
    if (work.prerequisites.includes(workId)) {
      const context = getWork(work.id);
      if (context) dependents.push(context);
    }
  }
  
  return dependents;
}

// Get works by age range
export function getWorksByAgeRange(ageRange: AgeRange): WorkWithContext[] {
  const results: WorkWithContext[] = [];
  
  for (const area of areas) {
    for (const category of area.categories) {
      for (const work of category.works) {
        if (work.ageRange === ageRange) {
          results.push({ work, category, area });
        }
      }
    }
  }
  
  return results;
}

// Search works by name or description
export function searchWorks(query: string): WorkWithContext[] {
  const lowerQuery = query.toLowerCase();
  const results: WorkWithContext[] = [];
  
  for (const area of areas) {
    for (const category of area.categories) {
      for (const work of category.works) {
        if (
          work.name.toLowerCase().includes(lowerQuery) ||
          work.description.toLowerCase().includes(lowerQuery) ||
          work.chineseName.includes(query)
        ) {
          results.push({ work, category, area });
        }
      }
    }
  }
  
  return results;
}

// Get curriculum statistics
export function getCurriculumStats(): CurriculumStats {
  const stats: CurriculumStats = {
    totalAreas: areas.length,
    totalCategories: 0,
    totalWorks: 0,
    totalLevels: 0,
    worksByArea: {},
    worksByAgeRange: {
      toddler: 0,
      primary_year1: 0,
      primary_year2: 0,
      primary_year3: 0,
      lower_elementary: 0,
      upper_elementary: 0,
    },
  };
  
  for (const area of areas) {
    stats.totalCategories += area.categories.length;
    stats.worksByArea[area.id] = 0;
    
    for (const category of area.categories) {
      stats.totalWorks += category.works.length;
      stats.worksByArea[area.id] += category.works.length;
      
      for (const work of category.works) {
        stats.totalLevels += work.levels.length;
        stats.worksByAgeRange[work.ageRange]++;
      }
    }
  }
  
  return stats;
}

// Build prerequisite map for visualization
export function buildPrerequisiteMap(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const allWorks = getAllWorks();
  
  for (const work of allWorks) {
    if (work.prerequisites.length > 0) {
      map.set(work.id, work.prerequisites);
    }
  }
  
  return map;
}

// Get work sequence within its category
export function getWorkSequence(workId: string): { current: number; total: number } | undefined {
  const context = getWork(workId);
  if (!context) return undefined;
  
  const sortedWorks = [...context.category.works].sort((a, b) => a.sequence - b.sequence);
  const index = sortedWorks.findIndex(w => w.id === workId);
  
  return {
    current: index + 1,
    total: sortedWorks.length,
  };
}

// Export types
export type { Area, Category, Work, Level, CurriculumStats, WorkWithContext, AgeRange } from './types';
