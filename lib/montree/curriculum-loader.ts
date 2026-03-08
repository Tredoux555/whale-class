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
  chineseName?: string;  // Chinese translation of work name (from stem JSON)
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
    const areaData = area.data as unknown as { categories?: Array<{ sequence?: number; name: string; works?: Array<{ id: string; name: string; chineseName?: string; description?: string; ageRange?: string; materials?: string[]; directAims?: string[]; indirectAims?: string[]; controlOfError?: string; prerequisites?: string[]; sequence?: number }> }> };
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
          chineseName: work.chineseName || undefined,
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

/**
 * Build a lookup map: lowercase work_name → chineseName
 * Used by API routes to enrich DB results with Chinese translations.
 * Cached at module level (static JSON, never changes at runtime).
 */
let _chineseNameMap: Map<string, string> | null = null;

export function getChineseNameMap(): Map<string, string> {
  if (_chineseNameMap) return _chineseNameMap;

  _chineseNameMap = new Map();
  const works = loadAllCurriculumWorks();
  for (const w of works) {
    if (w.chineseName) {
      _chineseNameMap.set(w.name.toLowerCase().trim(), w.chineseName);
    }
  }
  return _chineseNameMap;
}

/**
 * Get Chinese name for a work, using exact match first then fuzzy matching.
 * Convenience wrapper for routes that look up individual work names.
 */
export function getChineseNameForWork(workName: string): string | null {
  const map = getChineseNameMap();
  const key = workName.toLowerCase().trim();
  // Exact match
  const exact = map.get(key);
  if (exact) return exact;
  // Fuzzy match
  return fuzzyMatchChineseName(workName, map) || null;
}

/**
 * Fuzzy match a work name against the Chinese name map.
 * Handles cases like "Geometry Cabinet and Cards" matching "Geometric Cabinet",
 * or "Puzzle of the Bird" matching "Parts of a Bird".
 *
 * Strategy: normalize both names by removing common suffixes/filler words,
 * then try substring matching (shorter name contained in longer name).
 */
function fuzzyMatchChineseName(workName: string, map: Map<string, string>): string | undefined {
  const input = workName.toLowerCase().trim();

  // 1. Exact match (already tried by caller, but included for completeness)
  const exact = map.get(input);
  if (exact) return exact;

  // 2. Strip common suffixes/additions and try again
  // e.g., "Geometry Cabinet and Cards" → try "Geometry Cabinet"
  const strippedInput = input
    .replace(/\s+and\s+.+$/, '')      // Remove " and ..." suffix
    .replace(/\s+with\s+.+$/, '')     // Remove " with ..." suffix
    .replace(/\s*\(.*\)$/, '')        // Remove parenthetical
    .trim();
  if (strippedInput !== input) {
    const match = map.get(strippedInput);
    if (match) return match;
  }

  // 3. Substring matching: check if DB name contains a curriculum name or vice versa
  // This handles "Puzzle of the Bird" matching "Parts of a Bird" via shared keywords
  const inputWords = new Set(input.split(/\s+/).filter(w => w.length > 2 && !['the', 'and', 'for', 'with', 'of', 'a', 'an'].includes(w)));

  let bestMatch: string | undefined;
  let bestScore = 0;

  for (const [key, cn] of map.entries()) {
    const keyWords = new Set(key.split(/\s+/).filter(w => w.length > 2 && !['the', 'and', 'for', 'with', 'of', 'a', 'an'].includes(w)));

    // Count shared meaningful words
    let shared = 0;
    for (const w of inputWords) {
      if (keyWords.has(w)) shared++;
      // Also check partial word matches (e.g., "geometric" vs "geometry")
      else {
        for (const kw of keyWords) {
          if ((w.length >= 4 && kw.startsWith(w.slice(0, 4))) || (kw.length >= 4 && w.startsWith(kw.slice(0, 4)))) {
            shared += 0.8;
            break;
          }
        }
      }
    }

    // Require at least 1 meaningful shared word and >50% overlap with shorter set
    const minLen = Math.min(inputWords.size, keyWords.size);
    if (shared >= 1 && minLen > 0 && shared / minLen > 0.5 && shared > bestScore) {
      bestScore = shared;
      bestMatch = cn;
    }
  }

  return bestMatch;
}

/**
 * Enrich an array of work objects with chineseName from curriculum data.
 * Works on any object that has a `work_name` string property.
 * Uses fuzzy matching to handle name variations between DB and static JSON.
 */
export function enrichWithChineseNames<T extends { work_name?: string }>(
  items: T[]
): (T & { chineseName?: string })[] {
  const map = getChineseNameMap();
  return items.map(item => {
    if (!item.work_name) return item;
    // Try exact match first
    const exact = map.get(item.work_name.toLowerCase().trim());
    if (exact) return { ...item, chineseName: exact };
    // Fall back to fuzzy matching
    const fuzzy = fuzzyMatchChineseName(item.work_name, map);
    return fuzzy ? { ...item, chineseName: fuzzy } : item;
  });
}

/**
 * Cached works list for findCurriculumWorkByName (avoids re-loading on every call).
 */
let _allWorksCache: CurriculumWork[] | null = null;

/**
 * Find a curriculum work by fuzzy name matching.
 * Returns the best-matching CurriculumWork or undefined.
 * Used by the guide API to fall back to static JSON data.
 */
export function findCurriculumWorkByName(workName: string): CurriculumWork | undefined {
  if (!_allWorksCache) _allWorksCache = loadAllCurriculumWorks();
  const works = _allWorksCache;
  const input = workName.toLowerCase().trim();

  // 1. Exact name match
  const exact = works.find(w => w.name.toLowerCase().trim() === input);
  if (exact) return exact;

  // 2. Stripped suffix match
  const stripped = input
    .replace(/\s+and\s+.+$/, '')
    .replace(/\s+with\s+.+$/, '')
    .replace(/\s*\(.*\)$/, '')
    .trim();
  if (stripped !== input) {
    const match = works.find(w => w.name.toLowerCase().trim() === stripped);
    if (match) return match;
  }

  // 3. Keyword overlap matching (same algorithm as fuzzy Chinese name matching)
  const inputWords = new Set(input.split(/\s+/).filter(w => w.length > 2 && !['the', 'and', 'for', 'with', 'of', 'a', 'an'].includes(w)));
  let bestWork: CurriculumWork | undefined;
  let bestScore = 0;

  for (const work of works) {
    const key = work.name.toLowerCase().trim();
    const keyWords = new Set(key.split(/\s+/).filter(w => w.length > 2 && !['the', 'and', 'for', 'with', 'of', 'a', 'an'].includes(w)));

    let shared = 0;
    for (const w of inputWords) {
      if (keyWords.has(w)) shared++;
      else {
        for (const kw of keyWords) {
          if ((w.length >= 4 && kw.startsWith(w.slice(0, 4))) || (kw.length >= 4 && w.startsWith(kw.slice(0, 4)))) {
            shared += 0.8;
            break;
          }
        }
      }
    }

    const minLen = Math.min(inputWords.size, keyWords.size);
    if (shared >= 1 && minLen > 0 && shared / minLen > 0.5 && shared > bestScore) {
      bestScore = shared;
      bestWork = work;
    }
  }

  return bestWork;
}
