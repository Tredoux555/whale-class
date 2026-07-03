// lib/montree/menu/config.ts
// PURE DATA for the customizable teacher dashboard menu. No React / no icon
// imports here so it's safe to import from server routes (signup seed, the
// teacher-menu API) without pulling lucide into the server bundle.
//
// The customizable menu lives in DashboardHeader's "More" menu. A teacher's
// saved config (settings.menu on montree_teachers) is the source of truth for
// ITEM ORDER + VISIBILITY when present. When absent, DashboardHeader falls back
// to its legacy flag-gated render — so existing schools are untouched.

export const MENU_ITEM_IDS = [
  'guru',
  'curriculum',
  'manage_students',
  'parent_manager',
  'parent_messages',
  'photo_audit',
  'classroom_overview',
  'calendar',
  'meeting_notes',
  'notes',
  // 'games' REMOVED entirely (Jul 3 2026, Tredoux: "makes the app look
  // amateur — off the table completely"). Routes stay on disk
  // (hide-don't-delete); sanitizeMenuConfig silently drops the id from any
  // previously-saved teacher config.
  'english_corner',
  'focus_list',
  'weekly_plan',
  'photo_albums',
  'library',
  'class_progress',
  'language_semester',
  'earnings',
  'raz',
  'paperwork',
  'classroom_setup',
] as const;

export type MenuItemId = (typeof MENU_ITEM_IDS)[number];

export const MENU_CONFIG_VERSION = 1;

export interface MenuConfigItem {
  id: MenuItemId;
  visible: boolean;
}

export interface MenuConfig {
  v: number;
  items: MenuConfigItem[]; // array order = display order
}

function isMenuItemId(x: unknown): x is MenuItemId {
  return typeof x === 'string' && (MENU_ITEM_IDS as readonly string[]).includes(x);
}

// The seeded default for NEW signups (Tredoux, Jul 3 2026 — "simplicity is king"):
// Guru → Student Manager (manage_students) → Parent Manager → Notes → Wrap Up
// (photo_audit) visible — THAT'S IT. Everything else hidden (English Corner,
// Calendar, Meeting Notes, Messages, Curriculum, Classroom Overview + all extras).
// Menu Management is hidden, so this order is the fixed teacher experience.
// Guru leads (the everyday entry point); Wrap Up sits last but stays visible so
// the photo review/confirm loop is always reachable (it's the ONLY path to it).
const CORE_VISIBLE: MenuItemId[] = [
  'guru',
  'manage_students',
  'parent_manager',
  'notes',
  'photo_audit',
];

export const MINIMAL_DEFAULT_MENU: MenuConfig = {
  v: MENU_CONFIG_VERSION,
  items: [
    ...CORE_VISIBLE.map((id) => ({ id, visible: true })),
    ...MENU_ITEM_IDS.filter((id) => !CORE_VISIBLE.includes(id)).map((id) => ({ id, visible: false })),
  ],
};

// Validate + normalise an arbitrary stored/posted config. Unknown ids are
// dropped, duplicates removed, and any registry items missing from the input
// are appended (hidden) so the config always covers the full universe. Returns
// null if the input isn't a usable config (→ caller treats as "no config").
export function sanitizeMenuConfig(input: unknown): MenuConfig | null {
  if (!input || typeof input !== 'object') return null;
  const rawItems = (input as { items?: unknown }).items;
  if (!Array.isArray(rawItems)) return null;

  const seen = new Set<MenuItemId>();
  const items: MenuConfigItem[] = [];
  for (const it of rawItems) {
    if (!it || typeof it !== 'object') continue;
    const id = (it as { id?: unknown }).id;
    if (!isMenuItemId(id) || seen.has(id)) continue;
    seen.add(id);
    items.push({ id, visible: (it as { visible?: unknown }).visible !== false });
  }
  if (items.length === 0) return null;

  // Append any registry items the input didn't mention, hidden, in registry order.
  for (const id of MENU_ITEM_IDS) {
    if (!seen.has(id)) items.push({ id, visible: false });
  }
  return { v: MENU_CONFIG_VERSION, items };
}
