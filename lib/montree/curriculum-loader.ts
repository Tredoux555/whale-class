// /lib/montree/curriculum-loader.ts
// AUTHORITATIVE curriculum loader from static JSON files
// Merges structure (stem/*.json) with guide content (comprehensive-guides/*.json)
// DO NOT use Brain database sequences - they are unreliable

import practicalLife from './stem/practical-life.json';
import sensorial from './stem/sensorial.json';
import math from './stem/math.json';
import language from './stem/language.json';
import cultural from './stem/cultural.json';

// Guide data imports
import practicalLifeGuides from '../curriculum/comprehensive-guides/practical-life-guides.json';
import sensorialGuides from '../curriculum/comprehensive-guides/sensorial-guides.json';
import mathGuides from '../curriculum/comprehensive-guides/math-guides.json';
import languageGuides from '../curriculum/comprehensive-guides/language-guides.json';
import culturalGuides from '../curriculum/comprehensive-guides/cultural-guides.json';

// Area definitions with correct order
const AREAS = [
  { key: 'practical_life', data: practicalLife, guides: practicalLifeGuides, sequence: 1 },
  { key: 'sensorial', data: sensorial, guides: sensorialGuides, sequence: 2 },
  { key: 'mathematics', data: math, guides: mathGuides, sequence: 3 },
  { key: 'language', data: language, guides: languageGuides, sequence: 4 },
  { key: 'cultural', data: cultural, guides: culturalGuides, sequence: 5 },
];

export interface CurriculumWork {
  area_key: string;
  work_key: string;
  name: string;
  description?: string;
  age_range?: string;
  sequence: number;  // Global sequence across all areas
  category_name?: string;
  materials?: string[];
  direct_aims?: string[];
  indirect_aims?: string[];
  control_of_error?: string;
  prerequisites?: string[];
  // Guide fields (from comprehensive-guides)
  quick_guide?: string;
  presentation_steps?: Array<Record<string, unknown>>;
  points_of_interest?: string[];
  variations?: string[];
  extensions?: string[];
  vocabulary?: string[];
  common_challenges?: string[];
  parent_description?: string;
  why_it_matters?: string;
}

export interface CurriculumArea {
  area_key: string;
  name: string;
  icon: string;
  color: string;
  sequence: number;
}

/**
 * Build a lookup map from guide data by work name (case-insensitive)
 */
function buildGuideMap(guidesData: Record<string, unknown>): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  const works = ((guidesData?.works as Array<Record<string, unknown>>) || (guidesData as Array<Record<string, unknown>>)) || [];

  for (const work of works) {
    if (work?.name) {
      // Store by lowercase name for case-insensitive matching
      map.set(work.name.toLowerCase().trim(), work);
    }
  }

  return map;
}

/**
 * Load all curriculum areas with proper metadata
 */
export function loadCurriculumAreas(): CurriculumArea[] {
  return AREAS.map(area => ({
    area_key: area.key,
    name: area.data.name,
    icon: area.data.icon,
    color: area.data.color,
    sequence: area.sequence,
  }));
}

/**
 * Load all curriculum works with CORRECT sequencing AND guide data
 *
 * Sequence formula: (area_seq * 10000) + (category_seq * 100) + work_seq
 *
 * This ensures:
 * - Practical Life works (1xxxx) come before Sensorial (2xxxx)
 * - Within Math: Numbers 1-10 (30100s) come before Memorization (30500s)
 * - Addition Strip Board (Math cat 5, work 3) = 30503
 * - Number Rods (Math cat 1, work 1) = 30101
 *
 * So Number Rods (30101) correctly comes BEFORE Addition Strip Board (30503)
 */
export function loadAllCurriculumWorks(): CurriculumWork[] {
  const works: CurriculumWork[] = [];

  for (const area of AREAS) {
    const areaData = area.data as unknown as { categories?: Array<{ sequence?: number; name: string; works?: Array<{ id: string; name: string; description?: string; ageRange?: string; materials?: string[]; directAims?: string[]; indirectAims?: string[]; controlOfError?: string; prerequisites?: string[]; sequence?: number }> }> };
    const areaSeq = area.sequence;

    // Build guide lookup for this area
    const guideMap = buildGuideMap(area.guides);

    if (!areaData.categories) continue;

    for (const category of areaData.categories) {
      const catSeq = category.sequence || 1;

      if (!category.works) continue;

      for (const work of category.works) {
        const workSeq = work.sequence || 1;

        // Global sequence: area * 10000 + category * 100 + work
        const globalSequence = (areaSeq * 10000) + (catSeq * 100) + workSeq;

        // Look up guide data by work name
        const guide = guideMap.get(work.name.toLowerCase().trim()) || {};

        works.push({
          area_key: area.key,
          work_key: work.id,
          name: work.name,
          description: work.description || null,
          age_range: work.ageRange || guide.age_range || '3-6',
          sequence: globalSequence,
          category_name: category.name,
          // Merge materials - prefer guide data if available
          materials: guide.materials_needed || guide.materials || work.materials || [],
          direct_aims: guide.direct_aims || work.directAims || [],
          indirect_aims: guide.indirect_aims || work.indirectAims || [],
          control_of_error: guide.control_of_error || work.controlOfError || null,
          prerequisites: work.prerequisites || [],
          // Guide-specific fields
          quick_guide: guide.quick_guide || null,
          presentation_steps: guide.presentation_steps || [],
          points_of_interest: guide.points_of_interest || [],
          variations: guide.variations || [],
          extensions: guide.extensions || [],
          vocabulary: guide.vocabulary || [],
          common_challenges: guide.common_challenges || [],
          parent_description: guide.parent_description || null,
          why_it_matters: guide.why_it_matters || null,
        });
      }
    }
  }

  // Sort by global sequence to verify order
  works.sort((a, b) => a.sequence - b.sequence);

  return works;
}

/**
 * Load works for a specific area only
 */
export function loadWorksForArea(areaKey: string): CurriculumWork[] {
  const allWorks = loadAllCurriculumWorks();
  return allWorks.filter(w => w.area_key === areaKey);
}

/**
 * Get total work count for verification
 */
export function getCurriculumStats(): {
  totalWorks: number;
  byArea: Record<string, number>;
  withGuides: number;
} {
  const works = loadAllCurriculumWorks();
  const byArea: Record<string, number> = {};
  let withGuides = 0;

  for (const work of works) {
    byArea[work.area_key] = (byArea[work.area_key] || 0) + 1;
    if (work.quick_guide) {
      withGuides++;
    }
  }

  return {
    totalWorks: works.length,
    byArea,
    withGuides,
  };
}

/**
 * Debug: Print curriculum stats including guide coverage
 */
export function debugCurriculumStats(): void {
  const stats = getCurriculumStats();
}

// Debug: Print first 10 math works to verify sequence
export function debugMathSequence(): void {
  const mathWorks = loadWorksForArea('mathematics');
}
