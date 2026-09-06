// lib/supabase-embed.ts
//
// One helper, for one recurring shape problem.
//
// PostgREST returns a TO-ONE relationship as a plain object:
//
//   .select('id, area:montree_classroom_curriculum_areas!area_id ( area_key )')
//   // → { id: '…', area: { area_key: 'language' } }
//
// but supabase-js types that embed as *possibly an array*. It cannot always tell
// one-from-many out of the foreign key alone, so it keeps both open. The result
// is code that reads `row.area?.area_key` and type-checks as `undefined`,
// or (worse) code that casts the array away and then reads a field that is not
// there at runtime.
//
// `one()` is the honest read: it accepts whichever shape arrives and gives back
// the single row, or null. It is what the codebase was already doing inline with
// `Array.isArray(x) ? x[0] : x` in a dozen places.

/**
 * Normalise a Supabase to-one embed to the single row (or null).
 *
 * @example
 *   const area = one(work.area);
 *   const key = area?.area_key ?? 'practical_life';
 */
export function one<T>(embed: T | T[] | null | undefined): T | null {
  if (embed == null) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}
