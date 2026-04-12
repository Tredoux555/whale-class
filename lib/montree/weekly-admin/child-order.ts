// lib/montree/weekly-admin/child-order.ts
// Custom child ordering for Weekly Admin Docs (weekly plan + summary).
// Matches the physical classroom seating/table arrangement used by the teacher.
// To restore alphabetical order, just remove the sortChildrenByCustomOrder calls.

const WHALE_CLASS_ORDER: string[] = [
  'Rachel',
  'YueZe',
  'Lucky',
  'Austin',
  'MingXi',
  'Joey',
  'Eric',
  'Jimmy',
  'Kevin',
  'Amy',
  'MaoMao',
  'Henry',
  'Segina',
  'Hayden',
  'Leo',
  'Kayla',
  'Stella',
  'Ryan',
  'Molly',
];

/**
 * Sort children by the custom Whale Class order.
 * Children not in the list are appended at the end alphabetically.
 */
export function sortChildrenByCustomOrder<T extends { name: string }>(children: T[]): T[] {
  const orderMap = new Map(WHALE_CLASS_ORDER.map((name, i) => [name.toLowerCase(), i]));

  return [...children].sort((a, b) => {
    const aIdx = orderMap.get(a.name.toLowerCase()) ?? 999;
    const bIdx = orderMap.get(b.name.toLowerCase()) ?? 999;
    if (aIdx !== bIdx) return aIdx - bIdx;
    // Both unknown — fall back to alphabetical
    return a.name.localeCompare(b.name);
  });
}
