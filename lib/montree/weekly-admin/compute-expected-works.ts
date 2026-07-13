// lib/montree/weekly-admin/compute-expected-works.ts
// Shared helper that computes, per child, the set of work names that should
// appear in the Weekly Summary for a given week. Mirrors the auto-fill route's
// source precedence (Weekly Wrap first, photos fallback) and filters out
// pending_review photos the same way, so the "expected set" aligns exactly
// with what Auto-fill would produce.
//
// Used by the notes GET route to compute `stale_children` — the set of
// children whose saved notes are missing works we'd now expect to see, which
// drives the stale-notes banner (see CLAUDE.md Session 29/30).

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';

const CANONICAL_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural', 'english'] as const;

/** Trim, lowercase, collapse whitespace. Used as the canonical key for
 *  comparing work names across sources. */
export function normalizeWorkName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Split a saved note's text into a flat Set of normalized work names.
 *  Recognizes both the area-grouped format ("Practical Life: X, Y") and
 *  the legacy flat format ("did X, Y, Z this week"). Chinese labels
 *  (日常生活, 感官, 数学, 语言, 文化, 其他) are recognized too — though the
 *  notes GET route will parse english_text, so this is defensive. */
export function parseWorksFromNote(text: string): Set<string> {
  const result = new Set<string>();
  if (!text) return result;

  const AREA_LABELS: Record<string, string> = {
    'practical life': '',
    'sensorial': '',
    'mathematics': '',
    'language': '',
    'cultural': '',
    'other': '',
    '日常生活': '',
    '感官': '',
    '数学': '',
    '语言': '',
    '文化': '',
    '其他': '',
  };

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  let isGrouped = false;
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    const colonIdxZh = line.indexOf('：');
    const idx = colonIdx > 0 && colonIdx < 20 ? colonIdx
      : colonIdxZh > 0 && colonIdxZh < 20 ? colonIdxZh
      : -1;
    if (idx > 0) {
      const label = line.slice(0, idx).trim().toLowerCase();
      if (label in AREA_LABELS) { isGrouped = true; break; }
    }
  }

  const splitWorks = (s: string): string[] =>
    s.split(/[,、]\s*|\s+and\s+/i)
      .map((t) => t.trim())
      .filter(Boolean);

  if (isGrouped) {
    for (const line of lines) {
      if (line.toLowerCase().startsWith('next week')) continue;
      if (line.startsWith('下周')) continue;
      const colonIdx = line.indexOf(':');
      const colonIdxZh = line.indexOf('：');
      const idx = colonIdx > 0 && colonIdx < 20 ? colonIdx
        : colonIdxZh > 0 && colonIdxZh < 20 ? colonIdxZh
        : -1;
      if (idx <= 0) continue;
      const label = line.slice(0, idx).trim().toLowerCase();
      if (!(label in AREA_LABELS)) continue;
      const worksStr = line.slice(idx + 1).trim();
      for (const w of splitWorks(worksStr)) {
        result.add(normalizeWorkName(w));
      }
    }
    return result;
  }

  // Flat paragraph format: "did X, Y, and Z this week. Next week: ..."
  const body = text
    .replace(/^did\s+/i, '')
    .replace(/\s+this\s+week\.?\s*(Next\s+week:.*)?\s*$/i, '');
  for (const w of splitWorks(body)) {
    result.add(normalizeWorkName(w));
  }
  return result;
}

/** For each child in the classroom, compute the Set of normalized work names
 *  we'd expect to see in the Weekly Summary for `weekStart`. Returns empty
 *  Sets for children with no data — callers should treat an empty expected
 *  set as "nothing to compare against, no staleness signal."
 *
 *  Source precedence mirrors auto-fill:
 *    1. Weekly Wrap reports (parent preferred, teacher fallback)
 *    2. Confirmed photos in the week (if no wrap data)
 *
 *  The `identification_status != 'pending_review'` filter is applied the
 *  same way as auto-fill, so only teacher-approved photos trigger staleness. */
export async function computeExpectedWorksByChild(
  supabase: SupabaseClient,
  classroomId: string,
  weekStart: string
): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>();

  // Week boundaries (inclusive start, exclusive end)
  const parsed = new Date(`${weekStart}T00:00:00Z`);
  const weekEnd = new Date(parsed.getTime() + 7 * 24 * 60 * 60 * 1000);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  // Load children
  const { data: childrenRaw } = await supabase
    .from('montree_children')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('is_active', true);
  const children = (childrenRaw || []) as Array<{ id: string }>;
  const childIds = children.map((c) => c.id);
  if (childIds.length === 0) return result;
  const childIdSet = new Set(childIds);

  // Seed result with empty sets for every child — callers distinguish
  // "no data" (empty set) from "expecting X, saved has Y" (non-empty set).
  for (const id of childIds) result.set(id, new Set());

  // Load curriculum area map (UUIDs → canonical keys) so we can validate
  // wrap areas. Not strictly required for the flat set result, but keeping
  // it consistent with auto-fill in case future signals filter by area.
  const { data: areasRaw } = await supabase
    .from('montree_classroom_curriculum_areas')
    .select('id, area_key')
    .eq('classroom_id', classroomId);
  const areaIdToKey = new Map<string, string>();
  for (const a of (areasRaw || []) as Array<{ id: string; area_key: string }>) {
    areaIdToKey.set(a.id, a.area_key);
  }
  const resolveArea = (raw: string): string => {
    if (!raw) return '';
    if ((CANONICAL_AREAS as readonly string[]).includes(raw)) return raw;
    if (areaIdToKey.has(raw)) return areaIdToKey.get(raw)!;
    return raw;
  };

  // ── Source 1: Weekly Wrap reports ────────────────────────────
  const { data: reportsRaw } = await supabase
    .from('montree_weekly_reports')
    .select('child_id, report_type, content')
    .eq('classroom_id', classroomId)
    .in('report_type', ['parent', 'teacher'])
    .eq('week_start', weekStart)
    .in('child_id', childIds);

  interface ReportWork { name: string; area: string }
  interface AreaAnalysis { area: string; works?: string[] }
  const reports = (reportsRaw || []) as Array<{
    child_id: string;
    report_type: string;
    content: { works?: ReportWork[]; area_analyses?: AreaAnalysis[] };
  }>;

  // Extract the work-name list from a single report. Parent reports carry
  // `content.works`; teacher reports carry `content.area_analyses[].works`.
  const extractWorkNames = (
    content: { works?: ReportWork[]; area_analyses?: AreaAnalysis[] }
  ): string[] => {
    const names: string[] = [];
    if (content?.works && content.works.length > 0) {
      for (const w of content.works) {
        if (w?.name) names.push(w.name);
      }
      return names;
    }
    if (content?.area_analyses) {
      for (const aa of content.area_analyses) {
        if (aa.works && Array.isArray(aa.works)) {
          for (const wn of aa.works) {
            if (wn) names.push(wn);
          }
        }
      }
    }
    return names;
  };

  // Prefer parent reports: if a child has a parent report, use it exclusively;
  // otherwise fall back to teacher. Matches auto-fill's "parent overwrites
  // teacher" precedence (auto-fill overwrites at area-level, but for a flat
  // expected-set this is equivalent when the parent report has the full list).
  const parentByChild = new Map<string, string[]>();
  const teacherByChild = new Map<string, string[]>();
  for (const r of reports) {
    const names = extractWorkNames(r.content);
    if (names.length === 0) continue;
    const bucket = r.report_type === 'parent' ? parentByChild : teacherByChild;
    const existing = bucket.get(r.child_id) || [];
    bucket.set(r.child_id, existing.concat(names));
  }

  for (const childId of childIds) {
    const names = parentByChild.get(childId) || teacherByChild.get(childId) || [];
    if (names.length === 0) continue;
    const set = new Set<string>();
    for (const n of names) set.add(normalizeWorkName(n));
    if (set.size > 0) result.set(childId, set);
  }

  // ── Source 2: Photos (for children with no wrap data) ────────
  const childrenNeedingPhotoFallback = childIds.filter(
    (id) => (result.get(id)?.size || 0) === 0
  );
  if (childrenNeedingPhotoFallback.length === 0) return result;

  const { data: mediaRaw } = await supabase
    .from('montree_media')
    .select('id, child_id, work_id, captured_at')
    .eq('classroom_id', classroomId)
    .eq('media_type', 'photo')
    .not('work_id', 'is', null)
    // Match auto-fill: exclude pending_review, include NULL and everything else.
    .or('identification_status.is.null,identification_status.neq.pending_review')
    .gte('captured_at', weekStart)
    .lt('captured_at', weekEndStr);

  const media = (mediaRaw || []) as Array<{
    id: string;
    child_id: string | null;
    work_id: string;
    captured_at: string;
  }>;
  if (media.length === 0) return result;

  // Group photo → children junction
  const mediaIds = media.map((m) => m.id);
  const { data: linksRaw } = await supabase
    .from('montree_media_children')
    .select('media_id, child_id')
    .in('media_id', mediaIds);
  const links = (linksRaw || []) as Array<{ media_id: string; child_id: string }>;

  const mediaChildMap = new Map<string, Set<string>>();
  for (const photo of media) {
    const s = mediaChildMap.get(photo.id) || new Set<string>();
    if (photo.child_id && childIdSet.has(photo.child_id)) s.add(photo.child_id);
    mediaChildMap.set(photo.id, s);
  }
  for (const link of links) {
    if (!mediaChildMap.has(link.media_id)) mediaChildMap.set(link.media_id, new Set());
    if (childIdSet.has(link.child_id)) {
      mediaChildMap.get(link.media_id)!.add(link.child_id);
    }
  }

  // Resolve work_id → name
  const workIds = [...new Set(media.map((m) => m.work_id).filter(Boolean))];
  const workIdToName = new Map<string, string>();
  if (workIds.length > 0) {
    const { data: worksRaw } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name')
      .in('id', workIds);
    for (const w of (worksRaw || []) as Array<{ id: string; name: string }>) {
      workIdToName.set(w.id, w.name);
    }
  }

  const fallbackChildSet = new Set(childrenNeedingPhotoFallback);
  for (const photo of media) {
    const workName = workIdToName.get(photo.work_id);
    if (!workName) continue;
    const childrenForPhoto = mediaChildMap.get(photo.id);
    if (!childrenForPhoto) continue;
    for (const cid of childrenForPhoto) {
      if (!fallbackChildSet.has(cid)) continue;
      const set = result.get(cid) || new Set<string>();
      set.add(normalizeWorkName(workName));
      result.set(cid, set);
    }
  }

  // Area resolver retained for API parity even if unused in flat-set output
  void resolveArea;

  return result;
}
