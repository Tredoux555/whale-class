// lib/potato/classfilm.ts
// The class-film validation rule, as a pure function.
//
// WHY THIS IS THE ONE PLACE CLIENT-CHOSEN MEDIA IS ALLOWED
// Every other film in this product derives its media list server-side, because
// a client that picks its own media can pick another class's. The class film is
// different: curation IS the feature — the teacher chooses the twenty photos
// that tell the week. So the client sends ids, and this function is the gate
// that makes that safe. It re-derives, from the database, exactly which photos
// the caller is allowed to name, and refuses anything else.
//
// THE BUSINESS RULE IT ENFORCES
// A parent who watches a 60-second class film and never sees their child
// cancels. So a class film cannot be made while any active child is
// unaccounted for. There are exactly two ways for a child to be accounted for:
//   • they appear (via the tag junction) in at least one SELECTED photo, or
//   • the teacher has explicitly excused them.
// There is no third way, so a teacher can never wander off the path.
//
// Pure and dependency-free on purpose — the harness exercises it directly.

/** A class film is at least this many photos. Matches the child-film threshold. */
export const CLASS_FILM_MIN = 8;
/** …and at most this many: ~40 × 3s ≈ two minutes, the worker's ceiling. */
export const CLASS_FILM_MAX = 40;

export interface ClassFilmInput {
  /** photo ids the teacher starred, as sent by the client (may be dirty) */
  mediaIds: string[];
  /** child ids the teacher excused, as sent by the client (may be dirty) */
  excusedChildIds: string[];
  /** every ACTIVE child in the class, from the database */
  activeChildIds: string[];
  /**
   * Every photo belonging to THIS class within THIS week, from the database,
   * mapped to the child ids tagged on it. Membership in this map is what makes
   * a media id legal — it proves both class ownership and the week window in
   * one lookup.
   */
  weekPhotoTags: Map<string, string[]>;
}

export interface ClassFilmCoverage {
  covered: string[];
  excused: string[];
  missing: string[];
}

export interface ClassFilmResult extends ClassFilmCoverage {
  ok: boolean;
  /** machine-readable reasons, for the 400 body */
  errors: ClassFilmError[];
  /** deduped, validated media ids — caller sorts these chronologically */
  mediaIds: string[];
  /** ids the caller sent that are not photos of this class this week */
  foreignMediaIds: string[];
  /** excused ids that are not active children of this class */
  foreignExcusedIds: string[];
}

export type ClassFilmError =
  | { code: 'no_media'; message: string }
  | { code: 'too_few'; message: string; count: number; min: number }
  | { code: 'too_many'; message: string; count: number; max: number }
  | { code: 'foreign_media'; message: string; ids: string[] }
  | { code: 'foreign_excused'; message: string; ids: string[] }
  | { code: 'children_missing'; message: string; ids: string[] };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Keep only well-formed uuids, deduped, order preserved. */
function cleanIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of raw) {
    if (typeof value !== 'string' || !UUID_RE.test(value)) continue;
    const id = value.toLowerCase();
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function validateClassFilm(input: ClassFilmInput): ClassFilmResult {
  const errors: ClassFilmError[] = [];

  const requested = cleanIds(input.mediaIds);
  const excusedRequested = cleanIds(input.excusedChildIds);
  const active = cleanIds(input.activeChildIds);
  const activeSet = new Set(active);

  // ---- 1. every media id must be a photo of THIS class in THIS week -------
  const mediaIds: string[] = [];
  const foreignMediaIds: string[] = [];
  for (const id of requested) {
    if (input.weekPhotoTags.has(id)) mediaIds.push(id);
    else foreignMediaIds.push(id);
  }
  if (foreignMediaIds.length > 0) {
    errors.push({
      code: 'foreign_media',
      message:
        'Some of those photos are not from this class this week. Reload the page and try again.',
      ids: foreignMediaIds,
    });
  }

  // ---- 2. excused children must be active children of this class ----------
  const excused: string[] = [];
  const foreignExcusedIds: string[] = [];
  for (const id of excusedRequested) {
    if (activeSet.has(id)) excused.push(id);
    else foreignExcusedIds.push(id);
  }
  if (foreignExcusedIds.length > 0) {
    errors.push({
      code: 'foreign_excused',
      message: 'One of those children is not in this class.',
      ids: foreignExcusedIds,
    });
  }
  const excusedSet = new Set(excused);

  // ---- 3. size ------------------------------------------------------------
  if (mediaIds.length === 0) {
    errors.push({ code: 'no_media', message: 'Star some photos first.' });
  } else if (mediaIds.length < CLASS_FILM_MIN) {
    errors.push({
      code: 'too_few',
      message: `A class film needs at least ${CLASS_FILM_MIN} photos — you starred ${mediaIds.length}.`,
      count: mediaIds.length,
      min: CLASS_FILM_MIN,
    });
  } else if (mediaIds.length > CLASS_FILM_MAX) {
    errors.push({
      code: 'too_many',
      message: `A class film holds at most ${CLASS_FILM_MAX} photos — you starred ${mediaIds.length}.`,
      count: mediaIds.length,
      max: CLASS_FILM_MAX,
    });
  }

  // ---- 4. coverage: everyone in, or consciously left out -------------------
  // Only VALID media count toward coverage, so a caller cannot cover a child
  // with a photo id this function already rejected.
  const coveredSet = new Set<string>();
  for (const photoId of mediaIds) {
    for (const childId of input.weekPhotoTags.get(photoId) ?? []) {
      const id = childId.toLowerCase();
      if (activeSet.has(id)) coveredSet.add(id);
    }
  }

  const covered: string[] = [];
  const missing: string[] = [];
  const excusedFinal: string[] = [];
  for (const childId of active) {
    if (coveredSet.has(childId)) {
      // A child who is both starred and excused is simply in the film. Being
      // covered always wins — the excuse was only ever a way out of "missing".
      covered.push(childId);
    } else if (excusedSet.has(childId)) {
      excusedFinal.push(childId);
    } else {
      missing.push(childId);
    }
  }

  if (missing.length > 0) {
    errors.push({
      code: 'children_missing',
      message:
        missing.length === 1
          ? '1 child is not in the film yet. Star a photo of them, or excuse them.'
          : `${missing.length} children are not in the film yet. Star a photo of each, or excuse them.`,
      ids: missing,
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    mediaIds,
    covered,
    excused: excusedFinal,
    missing,
    foreignMediaIds,
    foreignExcusedIds,
  };
}

/** ≈3 seconds of film per photo — the number shown beside the picker's counter. */
export function estimateSeconds(photoCount: number): number {
  return photoCount * 3;
}
