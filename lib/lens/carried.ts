// lib/lens/carried.ts
// The handoff between "I ticked these follow-ups when I started the visit" and
// "seed them into the report when I finalise it".
//
// 🚨 WHY sessionStorage AND NOT THE DATABASE.
// Carrying an item forward is a statement about a report that does not exist
// yet. Writing lens_action_items rows at visit-start time would put follow-ups
// on a report she may never write, and would double every one of them if she
// started the visit twice — and un-carrying would then need a delete path with
// its own race. Holding the intention on the device until the report is
// finalised keeps the database free of items nobody has agreed to, and the cost
// of losing it (a closed tab, a private window) is that she re-ticks a handful
// of boxes rather than that the record is wrong.
//
// Pure — no imports, no I/O beyond the key. The read/write happens at the call
// sites so that a page which cannot use sessionStorage simply skips it.

export interface CarriedItem {
  /** The lens_action_items id it came from. */
  id: string;
  text: string;
  owner: string | null;
  due_date: string | null;
  classroom_id: string | null;
}

export function carriedStorageKey(visitId: string): string {
  return `lens:carried:${visitId}`;
}

/** Read the carried list for a visit. Never throws — a bad blob reads as none. */
export function readCarried(visitId: string): CarriedItem[] {
  if (typeof sessionStorage === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(carriedStorageKey(visitId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CarriedItem =>
        !!item && typeof item === 'object' && typeof item.id === 'string' && typeof item.text === 'string',
    );
  } catch {
    return [];
  }
}

/** Clear it once the report has been finalised and the rows are real. */
export function clearCarried(visitId: string): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(carriedStorageKey(visitId));
  } catch {
    /* private mode — nothing to clear */
  }
}
