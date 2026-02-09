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
      workMetaCacheMap.set(w.work_name, {
        description: w.description || '',
        home_tip: w.home_tip || '',
        buy_or_make: w.buy_or_make || '',
        estimated_cost: w.estimated_cost || '',
        home_age_start: w.home_age_start || '',
        home_priority: w.home_priority || 'recommended',
        home_sequence: w.home_sequence,
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
    category_key: w.area_key,
    category_name: w.area_name,
    sequence: w.home_sequence,
    description: w.description || '',
    age_range: w.age_range || '3-6',
    materials: w.materials || [],
    direct_aims: w.direct_aims || [],
    indirect_aims: w.indirect_aims || [],
    control_of_error: w.control_of_error || '',
    prerequisites: w.prerequisites || [],
    video_search_terms: Array.isArray(w.levels)
      ? (w.levels as { videoSearchTerms?: string[] }[]).flatMap((l) => l.videoSearchTerms || [])
      : [],
    levels: w.levels || [],
    is_custom: false,
    presentation_notes: w.home_tip || '',
    home_connection: '',
  }));

  const { error } = await supabase.from('home_curriculum').insert(rows);
  if (error) {
    console.error('Failed to seed home curriculum:', error.message);
    throw error;
  }

  return rows.length;
}
