// lib/potato/db.ts
// Shared data access for Potato Snaps. Every table here is `tp_*`; this module
// never touches a montree_* table.

import { getSupabase, type UntypedClient } from '@/lib/supabase-client';
import { weekRange } from '@/lib/potato/week';

export const POTATO_BUCKET = 'potato-snaps';

/**
 * How many photos a child needs before the board offers to make a film.
 * This is the BAR's target and the encouragement — not a hard rule any more.
 */
export const MONTAGE_THRESHOLD = 8;

/**
 * v1.3: the real floor for a child film, enforced server-side.
 *
 * The mini-picker lets a teacher drop weak shots, and a good six-photo film
 * beats a padded nine-photo one. Below four there is no film to speak of, so
 * that is where the wall is. Between 4 and 7 the UI nudges and lets her
 * through — advice, not a wall.
 */
export const CHILD_FILM_MIN = 4;

/** A class film is at least 8 and at most 40 photos. See lib/potato/classfilm.ts. */
export const CLASS_FILM_BUCKET_PREFIX = 'branding';

export interface PotatoClass {
  id: string;
  name: string;
  login_code: string;
  tz: string;
  is_active: boolean;
  /** v1.1 — null when migration 319 has not run yet */
  school_name?: string | null;
  school_logo_path?: string | null;
  emblem_path?: string | null;
}

export interface PotatoChild {
  id: string;
  class_id: string;
  name: string;
  photo_path: string | null;
  sort_order: number | null;
  is_active: boolean;
}

export interface PotatoPhoto {
  id: string;
  storage_path: string;
  captured_at: string;
  /**
   * v1.6 — 'photo' | 'video'. Absent before migration 338, which every reader
   * must treat as 'photo': that is exactly what every row in the table was.
   */
  media_type?: string;
  /** v1.6 — client-reported length of a video, in seconds. Null for a photo. */
  duration_seconds?: number | null;
}

/** What a row that carries no media_type actually is. */
export type PotatoMediaKind = 'photo' | 'video';

export function mediaKindOf(photo: PotatoPhoto): PotatoMediaKind {
  return photo.media_type === 'video' ? 'video' : 'photo';
}

export function potatoDb(): UntypedClient {
  return getSupabase();
}

// --------------------------------------------------------- schema readiness --

/**
 * Postgres codes for "that table doesn't exist" / "that column doesn't exist".
 * Before migration 318 is run, every Potato route degrades to a clean 503
 * instead of a 500 stack trace.
 */
export function isSetupPending(error: unknown): boolean {
  const code = (error as { code?: string } | null | undefined)?.code;
  return code === '42P01' || code === '42703';
}

export function errorCode(error: unknown): string | undefined {
  return (error as { code?: string } | null | undefined)?.code;
}

/** "That column doesn't exist" — the pre-migration signal for a v1.1 FIELD. */
export function isMissingColumn(error: unknown): boolean {
  return errorCode(error) === '42703';
}

// ------------------------------------------------- v1.1 feature detection --

/**
 * 🚨 THE RULE THIS SOLVES
 * v1.1 code ships to production BEFORE migration 319 is pasted into Supabase.
 * In that window the tables exist but the new columns do not, so a plain
 * `.select('kind')` returns 42703 and — in v1.0's error handling — a 503 for
 * the whole board. A teacher would open the app to a dead screen through no
 * fault of her own.
 *
 * So the board and the parent feed FEATURE-DETECT and quietly fall back to
 * exactly v1.0 behaviour: no class-film card, no branding, child films only.
 * Only the genuinely new surfaces (the picker, the branding uploads) return
 * setup_pending, because for them there is nothing honest to degrade to.
 *
 * The probe is two cheap `limit(0)` selects, cached per process. `true` is
 * cached forever — a column cannot un-exist. `false` is re-checked every 30s,
 * so the app lights up on its own within half a minute of the migration
 * running, with no redeploy.
 */
interface Capabilities {
  /** tp_montage_jobs.kind / .excused_child_ids exist */
  jobs: boolean;
  /** tp_classes.school_name / .school_logo_path / .emblem_path exist */
  classes: boolean;
  /**
   * v1.3 — tp_montage_jobs.sent_at exists, so make-then-send is enforceable.
   *
   * 🚨 THE DEGRADE HERE IS THE INTERESTING ONE. Without this column there is
   * nowhere to record that a teacher approved a film, so the publish gate
   * cannot be enforced — and a gate that cannot be enforced must not be
   * PRETENDED. Falling back to "every done film is visible" is exactly v1.2's
   * behaviour: no film disappears from a parent's feed during the deploy
   * window, and no film is silently held back either. The moment 321 lands,
   * the gate switches on for everything rendered from then.
   */
  send: boolean;
  /**
   * v1.4 — tp_photos.uploaded_by exists (migration 333). Gates whether the
   * upload route stamps who took the photo. Without it, uploads work exactly
   * as they did in v1.3 — no name attached — rather than 503ing the whole
   * upload for a column that has nothing to do with whether the photo saves.
   */
  attribution: boolean;
  /**
   * v1.0.1 "Scenes" — tp_scenes exists and tp_photos.scene_id exists
   * (migration 335). Probed on tp_photos.scene_id alone, because the column
   * and the table land in the SAME migration: if the column is missing the
   * table is missing too, and probing the table directly would raise 42P01
   * (a hard error) instead of the soft 42703 this whole mechanism runs on.
   *
   * The degrade is the same shape as `attribution`: an upload that names a
   * scene before 335 is pasted still SAVES THE PHOTO, unlabelled, and says so
   * by returning `sceneId: null`. Losing a label is a shrug; losing the shot a
   * teacher just took is not. The genuinely new surfaces (the /scenes routes,
   * and a PATCH whose whole purpose is to move a photo between scenes) return
   * setup_pending instead, because for them there is nothing honest to
   * degrade to.
   */
  scenes: boolean;
  /**
   * v1.6 "Video" — tp_photos.media_type / .duration_seconds / .file_size_bytes
   * exist (migration 338).
   *
   * 🚨 THE DEGRADE HERE HAS TWO HALVES AND BOTH MATTER.
   * On the WRITE side the upload route refuses a video outright when this is
   * false, rather than storing the object and losing the fact that it is a
   * video: a row that says 'photo' because the column was missing would be fed
   * to the stills renderer, and a .mov in a montage's media_ids is a broken
   * film for a family. A photo upload is completely unaffected and still
   * saves, exactly as in v1.5.
   * On the READ side loadWeekPhotos simply cannot filter, which is correct —
   * before 338 there is nothing in the table that is not a photo.
   */
  media: boolean;
}

const NEGATIVE_TTL_MS = 30_000;
let capsCache: { value: Capabilities; at: number } | null = null;

async function probeColumn(
  supabase: UntypedClient,
  table: string,
  columns: string,
): Promise<boolean> {
  const { error } = await supabase.from(table).select(columns).limit(0);
  if (!error) return true;
  if (isMissingColumn(error)) return false;
  // 42P01 (no such table) and anything else is a real problem — let the
  // caller's setup_pending / 500 handling deal with it.
  throw error;
}

export async function potatoCapabilities(supabase: UntypedClient): Promise<Capabilities> {
  const now = Date.now();
  if (capsCache) {
    const fresh =
      capsCache.value.jobs &&
      capsCache.value.classes &&
      capsCache.value.send &&
      capsCache.value.attribution &&
      capsCache.value.scenes &&
      capsCache.value.media;
    if (fresh || now - capsCache.at < NEGATIVE_TTL_MS) return capsCache.value;
  }
  const [jobs, classes, send, attribution, scenes, media] = await Promise.all([
    probeColumn(supabase, 'tp_montage_jobs', 'kind, excused_child_ids'),
    probeColumn(supabase, 'tp_classes', 'school_name, school_logo_path, emblem_path'),
    probeColumn(supabase, 'tp_montage_jobs', 'sent_at'),
    probeColumn(supabase, 'tp_photos', 'uploaded_by'),
    probeColumn(supabase, 'tp_photos', 'scene_id'),
    probeColumn(supabase, 'tp_photos', 'media_type, duration_seconds, file_size_bytes'),
  ]);
  const value: Capabilities = { jobs, classes, send, attribution, scenes, media };
  capsCache = { value, at: now };
  return value;
}

/** Test seam + a way to force a re-probe right after a migration. */
export function resetPotatoCapabilities(): void {
  capsCache = null;
}

// ------------------------------------------------------------------ lookups --

const CLASS_COLUMNS_V10 = 'id, name, login_code, tz, is_active';
const CLASS_COLUMNS_V11 = `${CLASS_COLUMNS_V10}, school_name, school_logo_path, emblem_path`;

/**
 * Load the class. Branding columns come along only when migration 319 has run;
 * before that the class simply has no branding and every caller renders the
 * v1.0 mascot lockup.
 */
export async function loadClass(
  supabase: UntypedClient,
  classId: string,
): Promise<PotatoClass | null> {
  const caps = await potatoCapabilities(supabase);
  const { data, error } = await supabase
    .from('tp_classes')
    .select(caps.classes ? CLASS_COLUMNS_V11 : CLASS_COLUMNS_V10)
    .eq('id', classId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.is_active === false) return null;
  return data as PotatoClass;
}

/** The branding block every surface renders from. Safe pre-migration. */
export interface PotatoBranding {
  schoolName: string | null;
  schoolLogoUrl: string | null;
  emblemUrl: string | null;
  /** initials shown when there is no logo — never a potato, that is our brand */
  initials: string;
}

export function brandingOf(klass: PotatoClass): PotatoBranding {
  const schoolName = klass.school_name?.trim() || null;
  return {
    schoolName,
    schoolLogoUrl: proxyUrl(klass.school_logo_path),
    emblemUrl: proxyUrl(klass.emblem_path),
    initials: initialsFor(schoolName || klass.name),
  };
}

/** "Willowbank Primary" → "WP"; "Sunflower Class" → "SC"; one word → 1 letter. */
export function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

/**
 * Class-ownership gate. Existence is never ownership: every mutation that names
 * a child must prove that child sits in the caller's own class.
 */
export async function loadOwnedChild(
  supabase: UntypedClient,
  classId: string,
  childId: string,
): Promise<PotatoChild | null> {
  const { data, error } = await supabase
    .from('tp_children')
    .select('id, class_id, name, photo_path, sort_order, is_active')
    .eq('id', childId)
    .eq('class_id', classId)
    .maybeSingle();
  if (error) throw error;
  return (data as PotatoChild) ?? null;
}

export async function listChildren(
  supabase: UntypedClient,
  classId: string,
  includeInactive = false,
): Promise<PotatoChild[]> {
  let query = supabase
    .from('tp_children')
    .select('id, class_id, name, photo_path, sort_order, is_active')
    .eq('class_id', classId);
  if (!includeInactive) query = query.eq('is_active', true);
  const { data, error } = await query
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PotatoChild[];
}

// ----------------------------------------------------------- the week query --

export interface WeekPhotos {
  weekStart: string;
  startIso: string;
  endIso: string;
  /** every photo in the class this week, oldest first */
  photos: PotatoPhoto[];
  /** child id → that child's photos, oldest first */
  byChild: Map<string, PotatoPhoto[]>;
  /**
   * photo id → the child ids tagged on it. v1.1: this is also the legality
   * table for the class-film picker — a media id the client sends is allowed
   * precisely when it is a key here, which proves class ownership and the week
   * window in one lookup.
   */
  tagsByPhoto: Map<string, string[]>;
}

const PAGE = 500;

/**
 * What kind of media a caller wants back.
 *
 * 🚨 THE DEFAULT IS 'photos', AND THAT IS THE WHOLE SAFETY PROPERTY OF v1.6.
 * Video rows live in tp_photos on purpose (see migration 338), which means
 * every caller that already existed would silently start receiving videos the
 * moment the first one is uploaded. Three of those callers feed the Remotion
 * stills renderer in potato-worker/ — the board's readiness bar, the child
 * film and the class film — and a .mov in a job's media_ids is a broken film
 * for a family, not a cosmetic bug. So the filter is opt-OUT, not opt-in:
 * doing nothing keeps you photos-only, and only the per-child review screen
 * (which is where a teacher goes to look at what she saved) asks for 'all'.
 */
export type WeekMediaFilter = 'photos' | 'all';

/**
 * THE ONE QUERY SHAPE.
 *
 * The board's per-child counts and a montage's media_ids are computed from this
 * single function, so what a teacher sees on the bar is exactly what goes into
 * the film — the WYSIWYG rule. A photo tagged with three children counts once
 * for each of them.
 *
 * Two paginated round trips (photos, then the tag junction) rather than an
 * embedded join: `.in()` on a big id list is the documented truncation trap in
 * this codebase, so the junction read is chunked and the photo read is paged.
 */
export async function loadWeekPhotos(
  supabase: UntypedClient,
  classId: string,
  weekStart: string,
  tz: string,
  include: WeekMediaFilter = 'photos',
): Promise<WeekPhotos> {
  const range = weekRange(weekStart, tz);

  // Pre-migration there is no column to select or filter on, and no video to
  // exclude either — every row in the table IS a photo, so both branches are
  // the same answer.
  const caps = await potatoCapabilities(supabase);
  // Typed as `string`, not the literal union: supabase-js parses a LITERAL
  // select list at compile time, and a union of two lists is exactly what
  // produces the ParserError noise this file warns about elsewhere.
  const columns: string = caps.media
    ? 'id, storage_path, captured_at, media_type, duration_seconds'
    : 'id, storage_path, captured_at';
  const photosOnly = caps.media && include === 'photos';

  const photos: PotatoPhoto[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = supabase
      .from('tp_photos')
      .select(columns)
      .eq('class_id', classId)
      .gte('captured_at', range.startIso)
      .lt('captured_at', range.endIso);
    if (photosOnly) query = query.eq('media_type', 'photo');
    const { data, error } = await query
      .order('captured_at', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    // Through `unknown`: the select list is now built at runtime, so
    // supabase-js infers nothing useful from it (see the note on `columns`
    // above) and a direct cast is rejected. The shape is guaranteed by the
    // literal strings this select can be, both of which are PotatoPhoto.
    const page = (data ?? []) as unknown as PotatoPhoto[];
    photos.push(...page);
    if (page.length < PAGE) break;
  }

  const byChild = new Map<string, PotatoPhoto[]>();
  // Every photo is a key, even an untagged one — the picker must still be able
  // to show it, and its absence from the tag lists is what makes it not count
  // toward anybody's coverage.
  const tagsByPhoto = new Map<string, string[]>(photos.map((p) => [p.id, []]));
  if (photos.length > 0) {
    const byId = new Map(photos.map((p) => [p.id, p]));
    const ids = photos.map((p) => p.id);
    for (let i = 0; i < ids.length; i += PAGE) {
      const chunk = ids.slice(i, i + PAGE);
      const { data, error } = await supabase
        .from('tp_photo_children')
        .select('photo_id, child_id')
        .in('photo_id', chunk);
      if (error) throw error;
      for (const row of (data ?? []) as { photo_id: string; child_id: string }[]) {
        const photo = byId.get(row.photo_id);
        if (!photo) continue;
        const bucket = byChild.get(row.child_id);
        if (bucket) bucket.push(photo);
        else byChild.set(row.child_id, [photo]);
        tagsByPhoto.get(row.photo_id)?.push(row.child_id);
      }
    }
    // `photos` is already oldest-first, but the junction pages arrive in
    // arbitrary order, so each child's list is re-sorted explicitly. The
    // montage depends on this order — it is the order of the film.
    for (const list of byChild.values()) {
      list.sort((a, b) => a.captured_at.localeCompare(b.captured_at));
    }
  }

  return { weekStart, startIso: range.startIso, endIso: range.endIso, photos, byChild, tagsByPhoto };
}

// -------------------------------------------------- one child, every week --

export interface ChildPhotoSet {
  /** NEWEST FIRST — see the note in loadChildPhotos on why this differs */
  photos: PotatoPhoto[];
  /** photo id → the child ids tagged on it, same shape loadWeekPhotos returns */
  tagsByPhoto: Map<string, string[]>;
  /** true when the cap bit and older shots are not in this list */
  truncated: boolean;
}

/** Junction rows we will walk before giving up. ~8 photos/week × 3 school years. */
const CHILD_SCAN_CAP = 3000;

/**
 * Everything ever taken of ONE child, ignoring the week window.
 *
 * 🚨 THIS IS A SEPARATE FUNCTION AND NOT A FLAG ON loadWeekPhotos, ON PURPOSE.
 * loadWeekPhotos is THE ONE QUERY SHAPE behind the readiness bars and every
 * montage's media_ids — the WYSIWYG rule — and a film is always a week of a
 * child's life. Teaching it to answer "and also all of history" would put a
 * mode switch inside the query the renderer depends on. This one is a READ for
 * a human looking at a screen: nothing downstream of it makes a film.
 *
 * 🚨 NEWEST FIRST, unlike the week query. The week list is the order of the
 * FILM, so it is chronological. This list is a scroll-back through a child's
 * time in the room, and the thing she wants is the thing that just happened.
 *
 * Tenancy: the caller has already proved this child belongs to this class
 * (loadOwnedChild), and every photo read here is `.eq('class_id', classId)` on
 * top of that — existence is not ownership.
 */
export async function loadChildPhotos(
  supabase: UntypedClient,
  classId: string,
  childId: string,
  include: WeekMediaFilter = 'photos',
  limit = 500,
): Promise<ChildPhotoSet> {
  const caps = await potatoCapabilities(supabase);
  // Same runtime-built select list as loadWeekPhotos, same reason (see there).
  const columns: string = caps.media
    ? 'id, storage_path, captured_at, media_type, duration_seconds'
    : 'id, storage_path, captured_at';
  const photosOnly = caps.media && include === 'photos';

  // 1 — which photos is this child tagged in? Paged, because `.in()` on a big
  //     id list is the documented truncation trap in this codebase.
  const photoIds: string[] = [];
  let truncated = false;
  for (let from = 0; from < CHILD_SCAN_CAP; from += PAGE) {
    const { data, error } = await supabase
      .from('tp_photo_children')
      .select('photo_id')
      .eq('child_id', childId)
      // Explicit order or the pages are not a stable partition of the set —
      // Postgres may hand back the same row twice and skip another.
      .order('photo_id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const page = (data ?? []) as { photo_id: string }[];
    for (const row of page) photoIds.push(row.photo_id);
    if (page.length < PAGE) break;
    if (from + PAGE >= CHILD_SCAN_CAP) truncated = true;
  }

  if (photoIds.length === 0) {
    return { photos: [], tagsByPhoto: new Map(), truncated: false };
  }

  // 2 — the rows themselves, chunked, and class-scoped every time.
  const photos: PotatoPhoto[] = [];
  for (let i = 0; i < photoIds.length; i += PAGE) {
    const chunk = photoIds.slice(i, i + PAGE);
    let query = supabase
      .from('tp_photos')
      .select(columns)
      .eq('class_id', classId)
      .in('id', chunk);
    if (photosOnly) query = query.eq('media_type', 'photo');
    const { data, error } = await query;
    if (error) throw error;
    photos.push(...((data ?? []) as unknown as PotatoPhoto[]));
  }

  photos.sort((a, b) => b.captured_at.localeCompare(a.captured_at));
  if (photos.length > limit) {
    truncated = true;
    photos.length = limit;
  }

  // 3 — who else is in each of them, so the lightbox can show and fix tags
  //     without a second round trip. Only for the photos we are returning.
  const tagsByPhoto = new Map<string, string[]>(photos.map((p) => [p.id, []]));
  const keptIds = photos.map((p) => p.id);
  for (let i = 0; i < keptIds.length; i += PAGE) {
    const chunk = keptIds.slice(i, i + PAGE);
    const { data, error } = await supabase
      .from('tp_photo_children')
      .select('photo_id, child_id')
      .in('photo_id', chunk);
    if (error) throw error;
    for (const row of (data ?? []) as { photo_id: string; child_id: string }[]) {
      tagsByPhoto.get(row.photo_id)?.push(row.child_id);
    }
  }

  return { photos, tagsByPhoto, truncated };
}

// ------------------------------------------------------------------ scenes --

/**
 * A scene is a per-class activity label ("Outdoor time"). See migration 335 for
 * why children are attached to scenes THROUGH photos rather than through an
 * attendance table.
 *
 * 🚨 Every function below assumes potatoCapabilities().scenes is true. Callers
 * check that first and either degrade (uploads: save the photo unlabelled) or
 * return setup_pending (the /scenes routes) — none of them let a pre-migration
 * 42703 reach a teacher as a 500.
 */
export interface PotatoScene {
  id: string;
  class_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

const SCENE_COLUMNS = 'id, class_id, name, is_active, created_at';

/** The name shown on a chip, after trimming. Empty means "the teacher typed nothing". */
export const SCENE_NAME_MAX = 60;

export function cleanSceneName(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim() : '';
}

/**
 * Oldest first, deliberately: the capture chip row must not reshuffle under a
 * teacher's thumb every time she adds a scene. New scenes append to the end.
 */
export async function listScenes(
  supabase: UntypedClient,
  classId: string,
  includeInactive = false,
): Promise<PotatoScene[]> {
  let query = supabase.from('tp_scenes').select(SCENE_COLUMNS).eq('class_id', classId);
  if (!includeInactive) query = query.eq('is_active', true);
  const { data, error } = await query.order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PotatoScene[];
}

/**
 * Class-ownership gate, same rule as loadOwnedChild: existence is never
 * ownership. The class id comes from the session, never from the request.
 */
export async function loadOwnedScene(
  supabase: UntypedClient,
  classId: string,
  sceneId: string,
): Promise<PotatoScene | null> {
  const { data, error } = await supabase
    .from('tp_scenes')
    .select(SCENE_COLUMNS)
    .eq('id', sceneId)
    .eq('class_id', classId)
    .maybeSingle();
  if (error) throw error;
  return (data as PotatoScene) ?? null;
}

/**
 * Is this name already taken by a LIVE scene in this class? Case-insensitive,
 * because "Outdoor time" and "outdoor time" are the same scene to a human.
 * `exceptId` lets a rename keep its own name.
 *
 * This is the friendly check; uq_tp_scenes_class_name_active is the real one,
 * and both ends map to the same 409 (see the routes' 23505 handling).
 */
export async function findActiveSceneByName(
  supabase: UntypedClient,
  classId: string,
  name: string,
  exceptId?: string,
): Promise<PotatoScene | null> {
  const { data, error } = await supabase
    .from('tp_scenes')
    .select(SCENE_COLUMNS)
    .eq('class_id', classId)
    .eq('is_active', true)
    // ilike with the name escaped would be the alternative; eq on a folded
    // column is not available without a generated column, so the comparison is
    // done here, on a list that is a handful of rows per class.
    .limit(200);
  if (error) throw error;
  const folded = name.trim().toLowerCase();
  const hit = ((data ?? []) as PotatoScene[]).find(
    (scene) => scene.name.trim().toLowerCase() === folded && scene.id !== exceptId,
  );
  return hit ?? null;
}

/**
 * scene id → how many photos in this class carry it.
 *
 * One cheap `head: true` count per scene rather than one big scan of
 * tp_photos: a class has a handful of scenes and, by the end of a year,
 * thousands of photos. Counting in Postgres keeps the payload at zero rows and
 * sidesteps the `.in()` truncation trap this file warns about elsewhere.
 */
export async function scenePhotoCounts(
  supabase: UntypedClient,
  classId: string,
  sceneIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>(sceneIds.map((id) => [id, 0]));
  if (sceneIds.length === 0) return counts;
  await Promise.all(
    sceneIds.map(async (sceneId) => {
      const { count, error } = await supabase
        .from('tp_photos')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', classId)
        .eq('scene_id', sceneId);
      if (error) throw error;
      counts.set(sceneId, count ?? 0);
    }),
  );
  return counts;
}

/**
 * photo id → its scene id (or null). Chunked like every other `.in()` in this
 * file — a silently truncated list here would blank out a photo's label rather
 * than fail, which is the worst kind of bug.
 */
export async function scenesForPhotos(
  supabase: UntypedClient,
  classId: string,
  photoIds: string[],
): Promise<Map<string, string | null>> {
  const byPhoto = new Map<string, string | null>(photoIds.map((id) => [id, null]));
  for (let i = 0; i < photoIds.length; i += PAGE) {
    const chunk = photoIds.slice(i, i + PAGE);
    const { data, error } = await supabase
      .from('tp_photos')
      .select('id, scene_id')
      .eq('class_id', classId)
      .in('id', chunk);
    if (error) throw error;
    for (const row of (data ?? []) as { id: string; scene_id: string | null }[]) {
      byPhoto.set(row.id, row.scene_id ?? null);
    }
  }
  return byPhoto;
}

// ------------------------------------------------------------------- proxy --

/** Build the app-relative URL that streams a private storage object. */
export function proxyUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  const encoded = storagePath.split('/').map(encodeURIComponent).join('/');
  return `/api/potato/media/proxy/${encoded}`;
}
