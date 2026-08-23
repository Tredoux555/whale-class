// lib/montree/paper-scan/sheet-works.ts
//
// Pure helpers for the Standard Sheet printer: fold montree_child_progress
// rows into "which works do we pre-print for this child in each area". Kept
// out of the route file so they can be unit-tested (tests/paper-scan-sheet.test.ts)
// and so the Next.js route module only exports HTTP handlers.

import type { PaperScanArea } from './types';
import type { SheetWork } from './sheet-template';

/**
 * montree_child_progress.area is free text written by several features over
 * the years ('math', 'Practical Life', 'practical_life', …). Fold it onto the
 * five canonical keys; null when unrecognisable (the work_key hop below then
 * gets a second chance).
 */
export function normaliseSheetArea(raw: string | null | undefined): PaperScanArea | null {
  if (!raw) return null;
  const k = raw.toLowerCase().replace(/[\s-]+/g, '_');
  if (k === 'practical_life' || k === 'practical' || k === 'pl' || k === 'daily_life') return 'practical_life';
  if (k === 'sensorial' || k === 'sensory') return 'sensorial';
  if (k === 'mathematics' || k === 'math' || k === 'maths') return 'mathematics';
  if (k === 'language' || k === 'english' || k === 'literacy') return 'language';
  if (k === 'cultural' || k === 'culture' || k === 'science' || k === 'geography') return 'cultural';
  return null;
}

export function areaKeyOf(area: unknown): string | null {
  if (!area) return null;
  const row = Array.isArray(area) ? area[0] : area;
  const key = (row as { area_key?: string } | undefined)?.area_key;
  return typeof key === 'string' ? key : null;
}

export interface SheetProgressRow {
  child_id: string;
  work_name: string;
  work_key: string | null;
  area: string | null;
  status: string;
  updated_at: string | null;
}

/**
 * Pick the works to pre-print for one child: `practicing` first (most recently
 * touched first), then `presented`, per area. Pure — unit-tested.
 */
export function selectSheetWorks(
  rows: SheetProgressRow[],
  areaByWorkKey: Map<string, PaperScanArea>,
  perArea: number,
): Partial<Record<PaperScanArea, SheetWork[]>> {
  const out: Partial<Record<PaperScanArea, SheetWork[]>> = {};
  const sorted = [...rows].sort((a, b) => {
    const rank = (s: string) => (s === 'practicing' ? 0 : 1);
    if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
    return (b.updated_at ?? '').localeCompare(a.updated_at ?? '');
  });
  for (const r of sorted) {
    const status = r.status === 'practicing' || r.status === 'presented' ? r.status : null;
    if (!status) continue;
    const area = normaliseSheetArea(r.area) ?? (r.work_key ? areaByWorkKey.get(r.work_key) ?? null : null);
    if (!area) continue;
    const list = (out[area] ??= []);
    if (list.length >= perArea) continue;
    if (list.some((w) => w.work_name === r.work_name)) continue;
    list.push({ work_name: r.work_name, work_key: r.work_key, status });
  }
  return out;
}

