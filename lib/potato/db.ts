// lib/potato/db.ts
// Shared data access for Potato Snaps. Every table here is `tp_*`; this module
// never touches a montree_* table.

import { getSupabase, type UntypedClient } from '@/lib/supabase-client';
import { weekRange } from '@/lib/potato/week';

export const POTATO_BUCKET = 'potato-snaps';

/** How many photos a child needs before a montage can be made. */
export const MONTAGE_THRESHOLD = 8;

export interface PotatoClass {
  id: string;
  name: string;
  login_code: string;
  tz: string;
  is_active: boolean;
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

// ------------------------------------------------------------------ lookups --

export async function loadClass(
  supabase: UntypedClient,
  classId: string,
): Promise<PotatoClass | null> {
  const { data, error } = await supabase
    .from('tp_classes')
    .select('id, name, login_code, tz, is_active')
    .eq('id', classId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.is_active === false) return null;
  return data as PotatoClass;
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
      }
    }
    // `photos` is already oldest-first, but the junction pages arrive in
    // arbitrary order, so each child's list is re-sorted explicitly. The
    // montage depends on this order — it is the order of the film.
    for (const list of byChild.values()) {
      list.sort((a, b) => a.captured_at.localeCompare(b.captured_at));
    }
  }

  return { weekStart, startIso: range.startIso, endIso: range.endIso, photos, byChild };
}

// ------------------------------------------------------------------- proxy --

/** Build the app-relative URL that streams a private storage object. */
export function proxyUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  const encoded = storagePath.split('/').map(encodeURIComponent).join('/');
  return `/api/potato/media/proxy/${encoded}`;
}
