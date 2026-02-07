// lib/home/curriculum-helpers.ts
// Session 155: Curriculum seeding + work metadata lookup
// Shared by register API (seeding) and progress/curriculum APIs (enrichment)

import homeCurriculumData from '@/lib/curriculum/data/home-curriculum.json';
import type { SupabaseClient } from '@supabase/supabase-js';

// Types for the JSON structure
interface WorkJson {
  id: string;
  name: string;
  description: string;
  home_sequence: number;
  home_priority: string;
  home_tip: string;
  buy_or_make: string;
  estimated_cost: string;
  home_age_start: string;
  [key: string]: unknown;
}

interface AreaJson {
  name: string;
  icon: string;
  color: string;
  works: WorkJson[];
}

interface CurriculumJson {
  meta: { name: string; version: string; total_works: number };
  areas: Record<string, AreaJson>;
}

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

// Cast imported JSON
const curriculum = homeCurriculumData as unknown as CurriculumJson;

// Lazy singleton for work metadata lookups
let workMetaMap: Map<string, WorkMeta> | null = null;

function buildWorkMetaMap(): Map<string, WorkMeta> {
  const map = new Map<string, WorkMeta>();
  for (const [, areaData] of Object.entries(curriculum.areas)) {
    for (const work of areaData.works) {
      map.set(work.name, {
        description: work.description,
        home_tip: work.home_tip,
        buy_or_make: work.buy_or_make,
        estimated_cost: work.estimated_cost,
        home_age_start: work.home_age_start,
        home_priority: work.home_priority,
        home_sequence: work.home_sequence,
      });
    }
  }
  return map;
}

// Get metadata for a specific work by name
export function getWorkMeta(workName: string): WorkMeta | null {
  if (!workMetaMap) {
    workMetaMap = buildWorkMetaMap();
  }
  return workMetaMap.get(workName) || null;
}

// Get area metadata (name, icon, color)
export function getAreaMeta(areaKey: string): AreaMeta | null {
  const area = curriculum.areas[areaKey];
  if (!area) return null;
  return { name: area.name, icon: area.icon, color: area.color };
}

// Get all area keys in display order
export function getAreaKeys(): string[] {
  return Object.keys(curriculum.areas);
}

// Seed curriculum for a new family (called during registration)
export async function seedHomeCurriculum(
  supabase: SupabaseClient,
  familyId: string
): Promise<number> {
  const rows: {
    family_id: string;
    work_name: string;
    area: string;
    category: string;
    sequence: number;
  }[] = [];

  for (const [areaKey, areaData] of Object.entries(curriculum.areas)) {
    for (const work of areaData.works) {
      rows.push({
        family_id: familyId,
        work_name: work.name,
        area: areaKey,
        category: areaData.name,
        sequence: work.home_sequence,
      });
    }
  }

  const { error } = await supabase.from('home_curriculum').insert(rows);
  if (error) {
    console.error('Failed to seed home curriculum:', error.message);
    throw error;
  }

  return rows.length;
}
