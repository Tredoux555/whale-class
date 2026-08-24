// lib/potato/staff.ts
// The fixed Potato Snaps staff roster — pure data, no server-only imports
// (no `jose`, no `node:crypto`), so it is safe to import from BOTH the server
// auth module (lib/potato/auth.ts) and client components (the login page,
// the in-app teacher switcher on the capture board). One roster, one place
// to change it.

export const STAFF_NAMES = ['Dana', 'Jenny', 'Vanessa', 'Tredoux'] as const;
export type StaffName = (typeof STAFF_NAMES)[number];

/** Case-insensitive match against the fixed roster, canonicalised to the
 * casing above. Anything else — a typo, an empty string, a stranger's name —
 * returns null rather than guessing. */
export function normalizeStaffName(raw: unknown): StaffName | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();
  const match = STAFF_NAMES.find((name) => name.toLowerCase() === trimmed);
  return match ?? null;
}
