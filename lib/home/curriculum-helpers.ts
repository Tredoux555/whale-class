// lib/home/curriculum-helpers.ts
// Updated: Sources from home_master_curriculum DB table instead of JSON file
// Shared by register API (seeding) and progress/curriculum APIs (enrichment)

import type { SupabaseClient } from '@supabase/supabase-js';

// --- Types ---

export interface WorkMeta {
  description: string;
  home_tip: string;
  buy_or_make: string;
  estimated_cost: string;
  home_age_start: string;
  home_priority: string;
  home_sequence: number;
  direct_aims: string[];
  indirect_aims: string[];
  materials: string[];
  control_of_error: string;
  video_search_term: string;
}

export interface AreaMeta {
  name: string;
  icon: string;
  color: string;
}

interface MasterWork {
  id: string;
  work_name: string;
  area_key: string;
  area_name: string;
  area_icon: string;
  area_color: string;
  description: string;
  age_range: string;
  sequence: number;
  home_sequence: number;
  home_priority: string;
  home_tip: string;
  buy_or_make: string;
  estimated_cost: string;
  home_age_start: string;
  materials: unknown;
  direct_aims: unknown;
  indirect_aims: unknown;
  control_of_error: string;
  prerequisites: unknown;
  levels: unknown;
  is_active: boolean;
}

// --- In-memory caches (populated once per cold start via ensureCaches) ---

let masterCache: MasterWork[] | null = null;
let areaCacheMap: Map<string, AreaMeta> | null = null;
let workMetaCacheMap: Map<string, WorkMeta> | null = null;

// Fetch master curriculum from DB (cached after first call)
async function getMasterCurriculum(supabase: SupabaseClient): Promise<MasterWork[]> {
  if (masterCache) return masterCache;

  const { data, error } = await supabase
    .from('home_master_curriculum')
    .select('*')
    .eq('is_active', true)
    .order('area_key')
    .order('home_sequence');

  if (error) {
    console.error('Failed to fetch master curriculum:', error.message);
    throw error;
  }

  masterCache = (data as MasterWork[]) || [];
  return masterCache;
}

// Build lookup caches from master data
function buildCaches(masterWorks: MasterWork[]) {
  if (!areaCacheMap) {
    areaCacheMap = new Map();
    for (const w of masterWorks) {
      if (!areaCacheMap.has(w.area_key)) {
        areaCacheMap.set(w.area_key, {
          name: w.area_name,
          icon: w.area_icon || '',
          color: w.area_color || '',
        });
      }
    }
  }

  if (!workMetaCacheMap) {
    workMetaCacheMap = new Map();
    for (const w of masterWorks) {
      // Extract first video search term from levels JSONB
      const videoTerms = Array.isArray(w.levels)
        ? (w.levels as { videoSearchTerms?: string[] }[]).flatMap((l) => l.videoSearchTerms || [])
        : [];

      workMetaCacheMap.set(w.work_name, {
        description: w.description || '',
        home_tip: w.home_tip || '',
        buy_or_make: w.buy_or_make || '',
        estimated_cost: w.estimated_cost || '',
        home_age_start: w.home_age_start || '',
        home_priority: w.home_priority || 'recommended',
        home_sequence: w.home_sequence,
        direct_aims: Array.isArray(w.direct_aims) ? w.direct_aims as string[] : [],
        indirect_aims: Array.isArray(w.indirect_aims) ? w.indirect_aims as string[] : [],
        materials: Array.isArray(w.materials) ? w.materials as string[] : [],
        control_of_error: w.control_of_error || '',
        video_search_term: videoTerms[0] || '',
      });
    }
  }
}

// --- Public API ---

// Initialize caches from DB. Call once per request before using sync lookups.
export async function ensureCaches(supabase: SupabaseClient): Promise<void> {
  const master = await getMasterCurriculum(supabase);
  buildCaches(master);
}

// Get metadata for a specific work by name (sync — call ensureCaches first)
export function getWorkMeta(workName: string): WorkMeta | null {
  if (!workMetaCacheMap) return null;
  return workMetaCacheMap.get(workName) || null;
}

// Get area metadata (name, icon, color) (sync — call ensureCaches first)
export function getAreaMeta(areaKey: string): AreaMeta | null {
  if (!areaCacheMap) return null;
  return areaCacheMap.get(areaKey) || null;
}

// Get all area keys in display order (sync — call ensureCaches first)
export function getAreaKeys(): string[] {
  if (!areaCacheMap) return [];
  return Array.from(areaCacheMap.keys());
}

// Seed curriculum for a new family from home_master_curriculum table
// home_curriculum table columns: id, family_id, work_name, area, category, sequence, is_active
// All rich metadata (description, home_tip, etc.) lives in home_master_curriculum
// and is enriched at read time via getWorkMeta()
export async function seedHomeCurriculum(
  supabase: SupabaseClient,
  familyId: string
): Promise<number> {
  const master = await getMasterCurriculum(supabase);

  const rows = master.map((w) => ({
    family_id: familyId,
    work_name: w.work_name,
    area: w.area_key,
    category: w.area_name,
    sequence: w.home_sequence,
  }));

  const { error } = await supabase.from('home_curriculum').insert(rows);
  if (error) {
    console.error('Failed to seed home curriculum:', error.message, error.code, error.details);
    throw new Error(`Seed insert failed: ${error.message} (${error.code})`);
  }

  return rows.length;
}
