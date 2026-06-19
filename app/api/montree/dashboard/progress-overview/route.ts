// app/api/montree/dashboard/progress-overview/route.ts
// Returns a summary of each child's curriculum progress over a selectable period.
// Pulls data from confirmed photo evidence in montree_media.
//
// GET ?period=month|semester|year
//   month   = last 30 days
//   semester = last 180 days
//   year    = last 365 days
//
// Returns per-child, per-area work lists with photo counts and P/Pr/MD status.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

const PERIOD_DAYS: Record<string, number> = {
  month: 30,
  semester: 180,
  year: 365,
};

const AREA_ORDER = [
  'practical_life',
  'sensorial',
  'mathematics',
  'language',
  'cultural',
];

type ChildRow = { id: string; name: string; photo_url: string | null };
type AreaRow = { id: string; area_key: string; name: string };
type WorkRow = {
  id: string;
  name: string;
  name_chinese: string | null;
  area_id: string;
};
type MediaRow = {
  child_id: string;
  work_id: string;
  captured_at: string;
};
type GroupLinkRow = { child_id: string; media_id: string };
type GroupMediaRow = {
  id: string;
  work_id: string;
  captured_at: string;
};

export interface WorkProgress {
  workName: string;
  workNameChinese: string | null;
  photoCount: number;
  status: 'P' | 'Pr' | 'MD'; // Presented / Practicing / Mastered
  lastSeen: string; // ISO timestamp
}

export interface AreaProgress {
  areaKey: string;
  areaName: string;
  works: WorkProgress[];
  totalPhotos: number;
}

export interface ChildProgress {
  id: string;
  name: string;
  photo_url: string | null;
  totalPhotos: number;
  areas: AreaProgress[];
}

export interface ProgressOverviewResponse {
  children: ChildProgress[];
  period: string;
  dateFrom: string;
  dateTo: string;
  totalChildren: number;
}

function deriveStatus(photoCount: number): 'P' | 'Pr' | 'MD' {
  if (photoCount >= 4) return 'MD';
  if (photoCount >= 2) return 'Pr';
  return 'P';
}

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { classroomId } = auth;
  if (!classroomId) {
    return NextResponse.json({ error: 'No classroom in session' }, { status: 400 });
  }

  const period = request.nextUrl.searchParams.get('period') || 'semester';
  const days = PERIOD_DAYS[period] ?? PERIOD_DAYS.semester;

  const dateTo = new Date();
  const dateFrom = new Date(dateTo.getTime() - days * 24 * 60 * 60 * 1000);
  const dateFromISO = dateFrom.toISOString();
  const dateToISO = dateTo.toISOString();

  const supabase = getSupabase();

  // 1. All active children in classroom
  const { data: rawChildren } = await supabase
    .from('montree_children')
    .select('id, name, photo_url')
    .eq('classroom_id', classroomId)
    .eq('is_active', true)
    .order('name');

  const children = (rawChildren || []) as ChildRow[];
  if (children.length === 0) {
    return NextResponse.json({
      children: [],
      period,
      dateFrom: dateFromISO,
      dateTo: dateToISO,
      totalChildren: 0,
    });
  }

  const childIds = children.map(c => c.id);

  // 2. All curriculum areas for classroom
  const { data: rawAreas } = await supabase
    .from('montree_classroom_curriculum_areas')
    .select('id, area_key, name')
    .eq('classroom_id', classroomId);

  const areas = (rawAreas || []) as AreaRow[];
  const areaIdToKey = new Map(areas.map(a => [a.id, a.area_key]));
  const areaIdToName = new Map(areas.map(a => [a.id, a.name]));
  const areaKeyToName = new Map(areas.map(a => [a.area_key, a.name]));

  // 3. All curriculum works for classroom
  const { data: rawWorks } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id, name, name_chinese, area_id')
    .eq('classroom_id', classroomId);

  const works = (rawWorks || []) as WorkRow[];
  const workIdToWork = new Map(works.map(w => [w.id, w]));

  // 4. Direct photos in date range (child_id in childIds) — paged in 1000-row
  // batches so a wide date range on a busy class can't silently clip at 1000.
  let directMedia: MediaRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from('montree_media')
      .select('child_id, work_id, captured_at')
      .eq('classroom_id', classroomId)
      .in('child_id', childIds)
      .gte('captured_at', dateFromISO)
      .lte('captured_at', dateToISO)
      .not('work_id', 'is', null)
      .eq('teacher_confirmed', true)
      .or('identification_status.is.null,identification_status.neq.pending_review')
      .range(from, from + 999);
    const batch = (data || []) as MediaRow[];
    directMedia = directMedia.concat(batch);
    if (batch.length < 1000) break;
  }

  // 5. Group photos via junction table — fully unbounded, so page it (this one
  // has no date filter and grows for the life of the classroom).
  let groupLinks: GroupLinkRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from('montree_media_children')
      .select('child_id, media_id')
      .in('child_id', childIds)
      .range(from, from + 999);
    const batch = (data || []) as GroupLinkRow[];
    groupLinks = groupLinks.concat(batch);
    if (batch.length < 1000) break;
  }
  const groupMediaIds = [...new Set(groupLinks.map(l => l.media_id))];

  // Resolve group media by id — chunk the id list in 1000s; an .in() on a PK
  // returns one row per id, so a >1000-id list would otherwise clip at 1000.
  let groupMedia: GroupMediaRow[] = [];
  for (let i = 0; i < groupMediaIds.length; i += 1000) {
    const idChunk = groupMediaIds.slice(i, i + 1000);
    const { data } = await supabase
      .from('montree_media')
      .select('id, work_id, captured_at')
      .in('id', idChunk)
      .gte('captured_at', dateFromISO)
      .lte('captured_at', dateToISO)
      .not('work_id', 'is', null)
      .eq('teacher_confirmed', true)
      .or('identification_status.is.null,identification_status.neq.pending_review');
    groupMedia = groupMedia.concat((data || []) as GroupMediaRow[]);
  }

  // Build group media lookup
  const groupMediaMap = new Map(groupMedia.map(m => [m.id, m]));

  // 6. Aggregate: childId → workId → { photoCount, lastSeen }
  type WorkAgg = { photoCount: number; lastSeen: string };
  const childWorkMap = new Map<string, Map<string, WorkAgg>>();

  const addToMap = (childId: string, workId: string, capturedAt: string) => {
    if (!workIdToWork.has(workId)) return; // unknown work
    if (!childWorkMap.has(childId)) childWorkMap.set(childId, new Map());
    const wm = childWorkMap.get(childId)!;
    const existing = wm.get(workId);
    if (!existing) {
      wm.set(workId, { photoCount: 1, lastSeen: capturedAt });
    } else {
      existing.photoCount += 1;
      if (capturedAt > existing.lastSeen) existing.lastSeen = capturedAt;
    }
  };

  // Direct photos
  for (const m of directMedia) {
    addToMap(m.child_id, m.work_id, m.captured_at);
  }

  // Group photos
  for (const link of groupLinks) {
    const gm = groupMediaMap.get(link.media_id);
    if (!gm) continue;
    addToMap(link.child_id, gm.work_id, gm.captured_at);
  }

  // 7. Build per-child output in canonical area order
  const result: ChildProgress[] = children.map(child => {
    const workAggs = childWorkMap.get(child.id) || new Map<string, WorkAgg>();

    // Group works by area
    const areaWorkMap = new Map<string, WorkProgress[]>();
    for (const [workId, agg] of workAggs.entries()) {
      const work = workIdToWork.get(workId)!;
      const areaKey = areaIdToKey.get(work.area_id) || 'other';
      if (!areaWorkMap.has(areaKey)) areaWorkMap.set(areaKey, []);
      areaWorkMap.get(areaKey)!.push({
        workName: work.name,
        workNameChinese: work.name_chinese,
        photoCount: agg.photoCount,
        status: deriveStatus(agg.photoCount),
        lastSeen: agg.lastSeen,
      });
    }

    // Sort works within each area by most recent first
    for (const [, ws] of areaWorkMap.entries()) {
      ws.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
    }

    // Build area array in canonical order
    const areaOrder = [...AREA_ORDER];
    // Add any non-standard areas at the end
    for (const key of areaWorkMap.keys()) {
      if (!areaOrder.includes(key)) areaOrder.push(key);
    }

    const areaProgressList: AreaProgress[] = areaOrder
      .filter(key => areaWorkMap.has(key))
      .map(key => {
        const ws = areaWorkMap.get(key) || [];
        // Look up area display name: from DB, or fallback to formatted key
        const areaName =
          areaKeyToName.get(key) ||
          key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
        return {
          areaKey: key,
          areaName,
          works: ws,
          totalPhotos: ws.reduce((sum, w) => sum + w.photoCount, 0),
        };
      });

    const totalPhotos = areaProgressList.reduce((sum, a) => sum + a.totalPhotos, 0);

    return {
      id: child.id,
      name: child.name,
      photo_url: child.photo_url,
      totalPhotos,
      areas: areaProgressList,
    };
  });

  return NextResponse.json(
    {
      children: result,
      period,
      dateFrom: dateFromISO,
      dateTo: dateToISO,
      totalChildren: children.length,
    } satisfies ProgressOverviewResponse,
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
