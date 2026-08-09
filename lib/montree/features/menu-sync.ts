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
 * ⚠️ THIS MAP IS THE ONLY BRIDGE FROM A FEATURE FLAG TO A TEACHER MENU ROW.
 * DashboardHeader renders the "More" menu straight out of the teacher's saved
 * settings.menu and never consults isEnabled() for those rows, so a feature key
 * that is absent here is INERT as far as the menu is concerned — flipping it in
 * the super-admin switchboard or the self-serve Feature Switchboard changes
 * nothing a teacher can see. That is precisely how "I enabled 74/74 features and
 * the menu still shows five items" happens. If you add a feature that should
 * surface a menu row, add the pair HERE — adding an `isEnabled(...) && <MenuRow>`
 * to DashboardHeader does nothing for the ~all teachers who have a saved config.
 *
 * GROUND TRUTH: every pair below is either (a) taken from DashboardHeader's
 * legacy flag-gated branch — a literal
 * `isEnabled('<key>') && <MenuRow … router.push('<route>') />` block — matched
 * against the MENU_REGISTRY entry with the identical route, or (b) a feature key
 * that genuinely EXISTS in montree_feature_definitions (verified against the
 * migrations) and unambiguously owns the registry entry named in its comment.
 * The route that proves each pair is in the comment. Nothing here is invented:
 * every key on the left is either a registered definition or one of the legacy
 * menu_* keys kept for backwards compatibility (see below).
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
 *    Note the near-misses that were considered and REJECTED: 'parent_messaging'
 *    (migration 193) gates the PARENT-side surface at /montree/parent/messages —
 *    lib/montree/parent-messaging/access.ts already enforces it — and
 *    'school_calendar' (migration 220) gates the PARENT dashboard calendar
 *    (app/api/montree/parent/calendar). Mapping either would let a parent-facing
 *    toggle silently delete a teacher's menu row. 'parent_portal' likewise is a
 *    parent-visibility flag, not the teacher's Parents (parent-codes) page.
 *  • manage_students / focus_list / photo_albums / class_progress /
 *    language_semester / earnings — the registry has these rows, but NO feature
 *    key in montree_feature_definitions owns them (the legacy menu_* keys that
 *    used to appear to were never registered — see the note below). They stay
 *    permanently visible/hidden per the teacher's saved config until a real
 *    definition row is added by a migration.
 */
export const FEATURE_MENU_MAP: Partial<Record<FeatureKey, MenuItemId>> = {
  paper_scan: 'paper_scan',                  // /montree/dashboard/paper-scan (identity pair; menu id added with the feature, Jul 30 2026)
  work_rhythm: 'work_rhythm',                // /montree/dashboard/work-rhythm (identity pair; menu id added with the feature)

  // ── REAL, REGISTERED definition keys that own a menu row ───────────────────
  // Added in the menu-freshness sweep. Each key below has a row in
  // montree_feature_definitions (migration cited) AND is otherwise UNREFERENCED
  // in application code — i.e. the switchboard showed the school a switch that
  // did literally nothing. Wiring them here is what makes "enable everything"
  // actually widen the teacher's menu.
  guru_advisor: 'guru',                      // /montree/dashboard/guru — "Guru AI Advisor" (migration 149)
  teacher_notes: 'notes',                    // /montree/dashboard/notes — "Teacher Notes" (migration 149)
  photo_audit: 'photo_audit',                // /montree/dashboard/photo-audit — "Photo Audit" (migration 149)
  curriculum_browser: 'curriculum',          // /montree/dashboard/curriculum — "Curriculum Browser" (migration 149)
  community_library: 'library',              // /montree/library — "Community Library" (migration 149)
  classroom_setup_ai: 'classroom_setup',     // /montree/dashboard/classroom-builder — "Classroom Setup AI" (migration 149)
  child_evaluation: 'milestones',            // /montree/dashboard/milestones — "Montree Milestones" (migration 314)

  // ── LEGACY menu_* keys (kept, but inert) ───────────────────────────────────
  // These have NO row in montree_feature_definitions, so GET /api/montree/features
  // (which maps over the definitions table) never returns them and nothing can
  // ever toggle them. Retained only so a hand-inserted definition row would keep
  // working; the pairs above are the live ones.
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
 * enable  → item set visible:true AND MOVED TO THE FRONT, so the school actually
 *           sees what they just turned on.
 * disable → item set visible:false, left exactly where it is (never removed — the
 *           teacher's order is preserved for when it comes back)
 *
 * 🚨 The move-to-front on enable is deliberate and was verified as a real gap, not a
 * cosmetic one. The original code prepended ONLY when the id was ABSENT from the config —
 * but `sanitizeMenuConfig` back-fills every registry id into every config it touches, so in
 * practice the id is almost always already present, hidden, somewhere down the list. The
 * old branch then flipped it visible IN PLACE, and a school that had just switched a
 * feature on found its new row buried among twenty others. A hidden→visible transition is
 * exactly "what they just turned on", so it is treated the same as a brand-new item.
 * An item that is ALREADY visible is not moved — that would reshuffle a menu a teacher
 * deliberately ordered, for a toggle that changed nothing.
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
      // Absent, or present-but-hidden → front of the list, visible. Already visible → the
      // no-op guard below catches it and nothing is written at all.
      nextItems = [
        { id: menuItemId, visible: true },
        ...items.filter((it) => it.id !== menuItemId),
      ];
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
