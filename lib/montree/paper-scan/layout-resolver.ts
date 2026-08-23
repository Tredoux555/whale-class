// lib/montree/paper-scan/layout-resolver.ts
//
// Which layout profile reads this scan? (plan §3, "Resolution order")
//
//   1. an explicit montree_paper_scans.layout_id (a teacher re-ran the scan
//      against a chosen profile),
//   2. the classroom's ACTIVE learned profile,
//   3. the school-wide ACTIVE profile (classroom_id IS NULL),
//   4. the built-in Montree Standard v1 — but ONLY when something says the page
//      is an MT-STD-1 sheet (a hint from the upload, or the template code the
//      previous read found on the page). We never assume a foreign sheet is
//      ours: a wrong legend is worse than no legend.
//   5. nothing — the generic prompt reads the page on its own terms, unchanged.
//
// montree_sheet_layouts is a hand-applied migration (336). A missing table is
// NOT an error here: the resolver degrades to steps 4/5 and the scan still runs.

import type { UntypedClient } from '@/lib/supabase-client';
import type { SheetLayoutProfile, SheetLayoutRow, SheetLayoutSource } from './layout-types';
import { MONTREE_STANDARD_V1, MONTREE_STANDARD_V1_NAME } from './layouts/montree-standard-v1';
import { SHEET_TEMPLATE_CODE } from './sheet-template';

export interface LayoutResolution {
  profile: SheetLayoutProfile | null;
  /** montree_sheet_layouts.id, or null for the built-in / no profile. */
  layoutId: string | null;
  name: string | null;
  source: SheetLayoutSource | 'none';
}

export const NO_LAYOUT: LayoutResolution = { profile: null, layoutId: null, name: null, source: 'none' };

export const BUILTIN_LAYOUT: LayoutResolution = {
  profile: MONTREE_STANDARD_V1,
  layoutId: null,
  name: MONTREE_STANDARD_V1_NAME,
  source: 'builtin',
};

/**
 * Does this text carry the Montree Standard template code? Pure.
 * Matches the printed line "MT-STD-1|<classroom>|<date>|1/2" and any prose
 * mention of the code, case-insensitively.
 */
export function mentionsTemplateCode(text: string | null | undefined, code: string = SHEET_TEMPLATE_CODE): boolean {
  if (!text || typeof text !== 'string') return false;
  return text.toUpperCase().includes(code.toUpperCase());
}

/**
 * The active row for a classroom: its own profile first, the school-wide
 * profile (classroom_id IS NULL) second. Pure — the DB's partial unique index
 * guarantees at most one active row per classroom, this only picks between
 * the classroom-scoped and the school-wide one.
 */
export function pickActiveLayoutRow(
  rows: SheetLayoutRow[] | null | undefined,
  classroomId: string,
): SheetLayoutRow | null {
  const active = (rows || []).filter((r) => r && r.status === 'active' && r.profile);
  return (
    active.find((r) => r.classroom_id === classroomId)
    ?? active.find((r) => r.classroom_id === null)
    ?? null
  );
}

/** A DB row → the resolution the extract route passes on. Pure. */
export function rowToResolution(row: SheetLayoutRow): LayoutResolution {
  return {
    profile: row.profile,
    layoutId: row.id,
    name: row.name,
    source: row.source === 'edited' ? 'edited' : row.source === 'builtin' ? 'builtin' : 'learned',
  };
}

/**
 * Resolve the profile for one scan. Never throws: every failure degrades to a
 * generic read.
 *
 * @param hintText anything already known about this page that might carry the
 *   printed template code — the sheet_summary / format_description of an
 *   earlier read, or a code supplied by the client.
 */
export async function resolveLayoutProfile(
  supabase: UntypedClient,
  opts: {
    classroomId: string;
    schoolId: string;
    /** montree_paper_scans.layout_id, when the scan already chose one. */
    layoutId?: string | null;
    hintText?: string | null;
  },
): Promise<LayoutResolution> {
  const { classroomId, schoolId } = opts;
  if (!classroomId || !schoolId) return NO_LAYOUT;

  let rows: SheetLayoutRow[] = [];
  try {
    const { data, error } = await supabase
      .from('montree_sheet_layouts')
      .select('*')
      .eq('school_id', schoolId)
      .or(`classroom_id.eq.${classroomId},classroom_id.is.null`);
    if (error) {
      // 42P01 / PGRST205 = the migration isn't applied here yet.
      console.warn('[PaperScan] Layout lookup failed, reading generically:', error.message);
    } else {
      rows = (data || []) as SheetLayoutRow[];
    }
  } catch (err) {
    console.warn('[PaperScan] Layout lookup threw, reading generically:', err);
  }

  // 1. explicit choice on the scan
  if (opts.layoutId) {
    const chosen = rows.find((r) => r.id === opts.layoutId && r.profile);
    if (chosen) return rowToResolution(chosen);
  }

  // 2 + 3. active learned profile (classroom first, then school-wide)
  const active = pickActiveLayoutRow(rows, classroomId);
  if (active) return rowToResolution(active);

  // 4. the built-in standard, only when the page says it is one
  if (mentionsTemplateCode(opts.hintText)) return BUILTIN_LAYOUT;

  // 5. generic
  return NO_LAYOUT;
}
