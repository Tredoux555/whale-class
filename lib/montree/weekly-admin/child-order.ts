// lib/montree/weekly-admin/child-order.ts
// Custom child ordering for Weekly Admin Docs (Weekly Summary, Monthly Summary,
// Weekly Plan, .docx export). Whale Class follows the school's shared document
// order. To restore alphabetical order, remove the sortChildrenByCustomOrder calls.

export const WHALE_CLASSROOM_ID = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69';

/** Whale Class — the order of the school's shared summary document (2026-09-16). */
export const WHALE_DOC_ORDER: readonly string[] = [
  'Jonah', 'Lifty', 'Winnie', 'Mario', 'Segina', 'Raye', 'Linda', 'Roman', 'Hayden', 'Eric',
  'Stella', 'Raya', 'Kayla', 'Kai', 'Joey', 'Henry', 'Brilla', 'Dylan', 'Frank',
];

/** Fixed document orders, keyed by classroom id. */
const DOC_ORDER_BY_CLASSROOM: Readonly<Record<string, readonly string[]>> = {
  [WHALE_CLASSROOM_ID]: WHALE_DOC_ORDER,
};

function firstNameKey(name: string): string {
  return (name || '').trim().split(/\s+/)[0]?.toLowerCase() ?? '';
}

/**
 * Sort children by their classroom's fixed document order (matched
 * case-insensitively on first name). Children not in the list go after it,
 * alphabetically. A classroom with no fixed order sorts alphabetically.
 * When `classroomId` is omitted the Whale Class order is used (legacy callers).
 */
export function sortChildrenByCustomOrder<T extends { name: string }>(
  children: readonly T[],
  classroomId?: string | null,
): T[] {
  const order = classroomId ? DOC_ORDER_BY_CLASSROOM[classroomId] ?? [] : WHALE_DOC_ORDER;
  const orderMap = new Map(order.map((name, i) => [name.toLowerCase(), i]));

  return [...children].sort((a, b) => {
    const aIdx = orderMap.get(firstNameKey(a.name)) ?? Number.MAX_SAFE_INTEGER;
    const bIdx = orderMap.get(firstNameKey(b.name)) ?? Number.MAX_SAFE_INTEGER;
    if (aIdx !== bIdx) return aIdx - bIdx;
    return (a.name || '').localeCompare(b.name || '');
  });
}
