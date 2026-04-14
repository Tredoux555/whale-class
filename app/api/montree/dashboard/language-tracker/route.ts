// app/api/montree/dashboard/language-tracker/route.ts
// Returns all children with their Language area work activity for the current week.
// Groups into "visited" (has language photos this week) and "not yet" (no language photos).
// For each child who visited, lists the specific works they did.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

type ChildRow = { id: string; name: string; photo_url: string | null };
type AreaRow = { id: string };
type WorkRow = { id: string; name: string; name_chinese: string | null };
type MediaRow = {
  id: string;
  child_id: string;
  work_id: string;
  captured_at: string;
  storage_path: string | null;
  cropped_storage_path: string | null;
};
type GroupLinkRow = { child_id: string; media_id: string };
type GroupMediaRow = {
  id: string;
  work_id: string;
  captured_at: string;
  storage_path: string | null;
  cropped_storage_path: string | null;
};

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { classroomId } = auth;
  if (!classroomId) {
    return NextResponse.json({ error: 'No classroom in session' }, { status: 400 });
  }

  const supabase = getSupabase();

  // 1. Get all active children
  const { data: rawChildren } = await supabase
    .from('montree_children')
    .select('id, name, photo_url')
    .eq('classroom_id', classroomId)
    .eq('is_active', true)
    .order('name');

  const children = (rawChildren || []) as ChildRow[];
  if (children.length === 0) {
    return NextResponse.json({ visited: [], notYet: [], weekStart: '', weekEnd: '' });
  }

  // 2. Get language area ID
  const { data: rawLangArea } = await supabase
    .from('montree_classroom_curriculum_areas')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('area_key', 'language')
    .maybeSingle();

  const langArea = rawLangArea as AreaRow | null;
  if (!langArea) {
    return NextResponse.json({ error: 'Language area not found' }, { status: 404 });
  }

  // 3. Get all language work IDs + names for this classroom
  const { data: rawLangWorks } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id, name, name_chinese')
    .eq('classroom_id', classroomId)
    .eq('area_id', langArea.id);

  const langWorks = (rawLangWorks || []) as WorkRow[];
  const langWorkIds = new Set(langWorks.map(w => w.id));
  const workNameMap = new Map(langWorks.map(w => [w.id, { name: w.name, name_chinese: w.name_chinese }]));

  // 4. Calculate current week boundaries (Mon-Sun)
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const weekStartISO = weekStart.toISOString();
  const weekEndISO = weekEnd.toISOString();

  // 5. Get all media this week with a language work_id (direct child photos)
  const childIds = children.map(c => c.id);
  const { data: rawMedia } = await supabase
    .from('montree_media')
    .select('id, child_id, work_id, captured_at, storage_path, cropped_storage_path')
    .eq('classroom_id', classroomId)
    .in('child_id', childIds)
    .gte('captured_at', weekStartISO)
    .lte('captured_at', weekEndISO)
    .not('work_id', 'is', null)
    // Only count teacher-approved activity.
    .or('identification_status.is.null,identification_status.neq.pending_review');

  const allMedia = (rawMedia || []) as MediaRow[];

  // 6. Also get group photos (multi-child) via junction table
  const { data: rawGroupLinks } = await supabase
    .from('montree_media_children')
    .select('child_id, media_id')
    .in('child_id', childIds);

  const groupLinks = (rawGroupLinks || []) as GroupLinkRow[];
  const groupMediaIds = [...new Set(groupLinks.map(l => l.media_id))];

  let groupMedia: GroupMediaRow[] = [];
  if (groupMediaIds.length > 0) {
    const { data: rawGroupMedia } = await supabase
      .from('montree_media')
      .select('id, work_id, captured_at, storage_path, cropped_storage_path')
      .in('id', groupMediaIds)
      .gte('captured_at', weekStartISO)
      .lte('captured_at', weekEndISO)
      .not('work_id', 'is', null)
      .or('identification_status.is.null,identification_status.neq.pending_review');

    groupMedia = (rawGroupMedia || []) as GroupMediaRow[];
  }

  // Build a map: mediaId → GroupMediaRow for quick lookup
  const groupMediaMap = new Map(groupMedia.map(m => [m.id, m]));

  // 7. Build per-child language work lists
  const childWorksMap = new Map<string, Array<{
    workId: string;
    workName: string;
    workNameChinese: string | null;
    capturedAt: string;
    photoUrl: string | null;
  }>>();

  // Process direct photos
  for (const m of allMedia) {
    if (!langWorkIds.has(m.work_id)) continue;
    const workInfo = workNameMap.get(m.work_id);
    if (!workInfo) continue;

    if (!childWorksMap.has(m.child_id)) childWorksMap.set(m.child_id, []);
    childWorksMap.get(m.child_id)!.push({
      workId: m.work_id,
      workName: workInfo.name,
      workNameChinese: workInfo.name_chinese,
      capturedAt: m.captured_at,
      photoUrl: m.cropped_storage_path || m.storage_path,
    });
  }

  // Process group photos
  for (const link of groupLinks) {
    const gm = groupMediaMap.get(link.media_id);
    if (!gm || !langWorkIds.has(gm.work_id)) continue;
    const workInfo = workNameMap.get(gm.work_id);
    if (!workInfo) continue;

    if (!childWorksMap.has(link.child_id)) childWorksMap.set(link.child_id, []);
    // Avoid duplicates (same child+work+time)
    const existing = childWorksMap.get(link.child_id)!;
    const isDupe = existing.some(e => e.workId === gm.work_id && e.capturedAt === gm.captured_at);
    if (!isDupe) {
      existing.push({
        workId: gm.work_id,
        workName: workInfo.name,
        workNameChinese: workInfo.name_chinese,
        capturedAt: gm.captured_at,
        photoUrl: gm.cropped_storage_path || gm.storage_path,
      });
    }
  }

  // 8. Split into visited / not yet
  const visited: Array<{
    id: string;
    name: string;
    photo_url: string | null;
    works: Array<{ workName: string; workNameChinese: string | null; capturedAt: string; photoUrl: string | null }>;
  }> = [];
  const notYet: Array<{ id: string; name: string; photo_url: string | null }> = [];

  for (const child of children) {
    const works = childWorksMap.get(child.id);
    if (works && works.length > 0) {
      // Sort by captured time, most recent first
      works.sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
      // Deduplicate by work name (keep most recent)
      const seen = new Set<string>();
      const uniqueWorks = works.filter(w => {
        if (seen.has(w.workId)) return false;
        seen.add(w.workId);
        return true;
      });
      visited.push({
        id: child.id,
        name: child.name,
        photo_url: child.photo_url,
        works: uniqueWorks.map(w => ({
          workName: w.workName,
          workNameChinese: w.workNameChinese,
          capturedAt: w.capturedAt,
          photoUrl: w.photoUrl,
        })),
      });
    } else {
      notYet.push({ id: child.id, name: child.name, photo_url: child.photo_url });
    }
  }

  return NextResponse.json({
    visited,
    notYet,
    weekStart: weekStartISO,
    weekEnd: weekEndISO,
    totalChildren: children.length,
    visitedCount: visited.length,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
