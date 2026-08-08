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
    const fresh = capsCache.value.jobs && capsCache.value.classes && capsCache.value.send;
    if (fresh || now - capsCache.at < NEGATIVE_TTL_MS) return capsCache.value;
  }
  const [jobs, classes, send] = await Promise.all([
    probeColumn(supabase, 'tp_montage_jobs', 'kind, excused_child_ids'),
    probeColumn(supabase, 'tp_classes', 'school_name, school_logo_path, emblem_path'),
    probeColumn(supabase, 'tp_montage_jobs', 'sent_at'),
  ]);
  const value: Capabilities = { jobs, classes, send };
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
): Promise<WeekPhotos> {
  const range = weekRange(weekStart, tz);

  const photos: PotatoPhoto[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('tp_photos')
      .select('id, storage_path, captured_at')
      .eq('class_id', classId)
      .gte('captured_at', range.startIso)
      .lt('captured_at', range.endIso)
      .order('captured_at', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const page = (data ?? []) as PotatoPhoto[];
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

// ------------------------------------------------------------------- proxy --

/** Build the app-relative URL that streams a private storage object. */
export function proxyUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  const encoded = storagePath.split('/').map(encodeURIComponent).join('/');
  return `/api/potato/media/proxy/${encoded}`;
}
