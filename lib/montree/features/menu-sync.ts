// lib/montree/features/menu-sync.ts
// Feature flag ⇄ teacher menu sync — SINGLE SOURCE OF TRUTH for which feature
// keys own a menu item, and the only place that rewrites teachers' saved menus.
//
// Why this exists: a teacher's saved menu config (settings.menu on
// montree_teachers) is the source of truth for ITEM ORDER + VISIBILITY when it
// is present — DashboardHeader renders straight from it and NEVER consults the
// feature flags for those rows. So for a school whose teachers have saved
// configs, flipping e.g. menu_library in the Feature Switchboard used to change
// nothing at all. This module closes that gap: when the super admin (or a
// self-serve school) toggles a feature that owns a menu item, we push the same
// visibility into every teacher's saved menu.
//
// Teachers with NO saved config are deliberately skipped — they render through
// DashboardHeader's legacy flag-gated branch, which already follows the flag.

import type { FeatureKey } from './types';
import { MENU_CONFIG_VERSION, type MenuItemId } from '../menu/config';

/**
 * FeatureKey → MenuItemId.
 *
 * GROUND TRUTH: every pair below is taken from DashboardHeader's legacy
 * flag-gated branch — a literal `isEnabled('<key>') && <MenuRow … router.push('<route>') />`
 * block — matched against the MENU_REGISTRY entry with the identical route.
 * The route that proves each pair is in the comment. Nothing here is inferred
 * from a name.
 *
 * Deliberately ABSENT:
 *  • menu_classroom_overview — the Classroom Overview row was promoted to the
 *    top of the menu (Session 119) and is no longer flag-gated, so there is no
 *    legacy block to prove the pair. Toggling it must not move a menu item.
 *  • language_presentation — its legacy row routes to
 *    /montree/dashboard/${childId}/language-presentation (child-scoped, dynamic);
 *    no MENU_REGISTRY entry has that route.
 *  • parent_manager / parent_messages / calendar / meeting_notes — those rows
 *    are ungated (or commented out) in the header; no feature key owns them.
 */
export const FEATURE_MENU_MAP: Partial<Record<FeatureKey, MenuItemId>> = {
  paper_scan: 'paper_scan',                  // /montree/dashboard/paper-scan (identity pair; menu id added with the feature, Jul 30 2026)
  work_rhythm: 'work_rhythm',                // /montree/dashboard/work-rhythm (identity pair; menu id added with the feature)
  menu_notes: 'notes',                       // /montree/dashboard/notes
  menu_curriculum: 'curriculum',             // /montree/dashboard/curriculum
  menu_guru: 'guru',                         // /montree/dashboard/guru
  menu_photo_audit: 'photo_audit',           // /montree/dashboard/photo-audit
  menu_manage_students: 'manage_students',   // /montree/dashboard/students
  menu_focus_list: 'focus_list',             // /montree/dashboard/focus
  weekly_admin_docs: 'weekly_plan',          // /montree/dashboard/weekly-admin-docs
  menu_photo_albums: 'photo_albums',         // /montree/dashboard/albums
  menu_library: 'library',                   // /montree/library
  menu_class_progress: 'class_progress',     // /montree/dashboard/progress-overview
  menu_language_semester: 'language_semester', // /montree/dashboard/language-semester
  menu_earnings: 'earnings',                 // /montree/dashboard/earnings
  raz_reading_tracker: 'raz',                // /montree/dashboard/raz
  english_corner: 'english_corner',          // /montree/dashboard/language-tracker
  paperwork_tracker: 'paperwork',            // /montree/dashboard/paperwork
  menu_classroom_setup: 'classroom_setup',   // /montree/dashboard/classroom-builder
};

/** Feature keys that own a menu item — handy for the switchboard UI. */
export const MENU_SYNCED_FEATURE_KEYS: string[] = Object.keys(FEATURE_MENU_MAP);

export interface MenuSyncResult {
  /** false = this feature owns no menu item; nothing was touched. */
  mapped: boolean;
  teachersUpdated: number;
  /** Teachers with no usable settings.menu.items array (legacy flag-driven menu). */
  teachersSkipped: number;
  errors: string[];
}

interface TeacherRow {
  id: string;
  settings: Record<string, unknown> | null;
}

interface StoredMenuItem {
  id: string;
  visible: boolean;
}

/**
 * Push a feature toggle into every teacher's saved menu for one school.
 *
 * enable  → item set visible:true (PREPENDED if the config predates the item,
 *           so the school actually sees what they just turned on)
 * disable → item set visible:false (never removed — order is preserved for
 *           when it comes back)
 *
 * Read-merge-write on settings, mirroring app/api/montree/teacher/menu PATCH:
 * spread the existing settings object and replace only `.menu`.
 *
 * Best-effort by design: a per-teacher failure is collected, not thrown — the
 * flag itself has already been saved and must not be rolled back by a menu
 * hiccup.
 */
export async function syncTeacherMenusForSchool(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shared helper takes the untyped service-role client
  supabase: any,
  schoolId: string,
  featureKey: string,
  enabled: boolean
): Promise<MenuSyncResult> {
  const result: MenuSyncResult = { mapped: false, teachersUpdated: 0, teachersSkipped: 0, errors: [] };

  const menuItemId = FEATURE_MENU_MAP[featureKey as FeatureKey];
  if (!menuItemId) return result; // unmapped feature → no-op
  result.mapped = true;

  let teachers: TeacherRow[] = [];
  try {
    const { data, error } = await supabase
      .from('montree_teachers')
      .select('id, settings')
      .eq('school_id', schoolId);

    if (error) {
      // 42703 = settings column missing (migration 268 not run) → nothing to sync.
      result.errors.push(`fetch teachers: ${error.message}`);
      return result;
    }
    teachers = (data || []) as TeacherRow[];
  } catch (err) {
    result.errors.push(`fetch teachers: ${err instanceof Error ? err.message : 'unknown error'}`);
    return result;
  }

  // Sequential — these batches are small (a school's teachers) and serialising
  // keeps us far away from Supabase connection pressure on Railway.
  for (const teacher of teachers) {
    const settings =
      teacher.settings && typeof teacher.settings === 'object'
        ? { ...(teacher.settings as Record<string, unknown>) }
        : null;

    const menu = settings?.menu as { v?: number; items?: unknown } | undefined;
    const rawItems = menu?.items;
    if (!settings || !menu || !Array.isArray(rawItems)) {
      // No saved config → legacy flag-gated menu, which already follows the flag.
      result.teachersSkipped += 1;
      continue;
    }

    const items: StoredMenuItem[] = rawItems
      .filter((it): it is Record<string, unknown> => !!it && typeof it === 'object')
      .map((it) => ({ id: String((it as { id?: unknown }).id ?? ''), visible: (it as { visible?: unknown }).visible !== false }))
      .filter((it) => it.id.length > 0);

    const existing = items.find((it) => it.id === menuItemId);
    let nextItems: StoredMenuItem[];

    if (enabled) {
      nextItems = existing
        ? items.map((it) => (it.id === menuItemId ? { ...it, visible: true } : it))
        : [{ id: menuItemId, visible: true }, ...items];
    } else {
      if (!existing) {
        // Already absent → already invisible. Nothing to write.
        continue;
      }
      nextItems = items.map((it) => (it.id === menuItemId ? { ...it, visible: false } : it));
    }

    // No-op guard: don't burn a write when the visibility already matches.
    if (existing && existing.visible === enabled) continue;

    settings.menu = { v: typeof menu.v === 'number' ? menu.v : MENU_CONFIG_VERSION, items: nextItems };

    try {
      const { error } = await supabase
        .from('montree_teachers')
        .update({ settings })
        .eq('id', teacher.id);

      if (error) {
        result.errors.push(`teacher ${teacher.id}: ${error.message}`);
      } else {
        result.teachersUpdated += 1;
      }
    } catch (err) {
      result.errors.push(`teacher ${teacher.id}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  return result;
}
