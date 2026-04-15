// app/api/montree/dashboard/focus-list/route.ts
// Master "who is most neglected" focus list.
// Computes a weighted neglect score per active child in the classroom:
//   days_since_last_photo ×3
//   days_since_last_progress_update ×2
//   paperwork_weeks_behind ×2
//   +5 flat if the child has zero Language photos this week
//   stale_work_count ×1 (approximated as 1 if no photo in 14 days, else 0 — cheap)
//
// Returns children sorted by score descending (most neglected first).

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

type ChildRow = {
  id: string;
  name: string;
  photo_url: string | null;
  paperwork_current_week: number | null;
};
type AreaRow = { id: string };
type WorkRow = { id: string };
type MediaRow = { child_id: string | null; captured_at: string; work_id: string | null };
type ProgressRow = { child_id: string; updated_at: string };
type GroupLinkRow = { child_id: string; media_id: string };
type GroupMediaRow = { id: string; captured_at: string; work_id: string | null };

const W_PHOTO = 3;
const W_PROGRESS = 2;
const W_PAPERWORK = 2;
const W_NO_LANGUAGE = 5;
const W_STALE = 1;

const MAX_WEEK = 37;

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { classroomId } = auth;
  if (!classroomId) {
    return NextResponse.json({ error: 'No classroom in session' }, { status: 400 });
  }

  const supabase = getSupabase();

  // 1. Active children + paperwork week
  const { data: rawChildren } = await supabase
    .from('montree_children')
    .select('id, name, photo_url, paperwork_current_week')
    .eq('classroom_id', classroomId)
    .eq('is_active', true)
    .order('name');

  const children = (rawChildren || []) as ChildRow[];
  if (children.length === 0) {
    return NextResponse.json({ children: [], targetWeek: 0, weekStart: '', weekEnd: '' });
  }

  const childIds = children.map(c => c.id);

  // 2. Paperwork target week (classroom override or auto-calc)
  let targetWeek: number;
  const { data: classroom } = await supabase
    .from('montree_classrooms')
    .select('paperwork_target_week')
    .eq('id', classroomId)
    .maybeSingle();

  if (classroom?.paperwork_target_week && classroom.paperwork_target_week >= 1 && classroom.paperwork_target_week <= MAX_WEEK) {
    targetWeek = classroom.paperwork_target_week;
  } else {
    const schoolYearStart = new Date(2025, 7, 18); // Aug 18, 2025
    const now = new Date();
    const msPerWeek = 7 * 86400000;
    targetWeek = Math.min(MAX_WEEK, Math.max(1, Math.floor((now.getTime() - schoolYearStart.getTime()) / msPerWeek) + 1));
  }

  // 3. Week boundaries (Mon–Sun)
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  const weekStartISO = weekStart.toISOString();
  const weekEndISO = weekEnd.toISOString();

  // 4. Language area + works
  const { data: rawLangArea } = await supabase
    .from('montree_classroom_curriculum_areas')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('area_key', 'language')
    .maybeSingle();
  const langArea = rawLangArea as AreaRow | null;

  let langWorkIds = new Set<string>();
  if (langArea) {
    const { data: rawLangWorks } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id')
      .eq('classroom_id', classroomId)
      .eq('area_id', langArea.id);
    langWorkIds = new Set(((rawLangWorks || []) as WorkRow[]).map(w => w.id));
  }

  // 5. ALL media for these children (direct child_id) — pulls captured_at + work_id.
  //    Ordered desc so we can grab latest per child by scanning once.
  const { data: rawDirectMedia } = await supabase
    .from('montree_media')
    .select('child_id, captured_at, work_id')
    .eq('classroom_id', classroomId)
    .in('child_id', childIds)
    .or('identification_status.is.null,identification_status.neq.pending_review')
    .order('captured_at', { ascending: false });
  const directMedia = (rawDirectMedia || []) as MediaRow[];

  // 6. Group photo links for these children
  const { data: rawLinks } = await supabase
    .from('montree_media_children')
    .select('child_id, media_id')
    .in('child_id', childIds);
  const links = (rawLinks || []) as GroupLinkRow[];
  const groupMediaIds = [...new Set(links.map(l => l.media_id))];

  let groupMedia: GroupMediaRow[] = [];
  if (groupMediaIds.length > 0) {
    const { data: rawGroupMedia } = await supabase
      .from('montree_media')
      .select('id, captured_at, work_id')
      .in('id', groupMediaIds)
      .or('identification_status.is.null,identification_status.neq.pending_review');
    groupMedia = (rawGroupMedia || []) as GroupMediaRow[];
  }
  const groupMediaMap = new Map(groupMedia.map(m => [m.id, m]));

  // 7. Latest progress update per child
  const { data: rawProgress } = await supabase
    .from('montree_child_work_progress')
    .select('child_id, updated_at')
    .in('child_id', childIds)
    .order('updated_at', { ascending: false });
  const progress = (rawProgress || []) as ProgressRow[];

  // 8. Aggregate per child
  const lastPhotoAt = new Map<string, Date>();
  const lastProgressAt = new Map<string, Date>();
  const langPhotosThisWeek = new Map<string, number>();

  const recordPhoto = (childId: string, capturedAt: string, workId: string | null) => {
    const d = new Date(capturedAt);
    const prev = lastPhotoAt.get(childId);
    if (!prev || d > prev) lastPhotoAt.set(childId, d);

    if (workId && langWorkIds.has(workId) && capturedAt >= weekStartISO && capturedAt <= weekEndISO) {
      langPhotosThisWeek.set(childId, (langPhotosThisWeek.get(childId) || 0) + 1);
    }
  };

  for (const m of directMedia) {
    if (!m.child_id) continue;
    recordPhoto(m.child_id, m.captured_at, m.work_id);
  }
  for (const link of links) {
    const gm = groupMediaMap.get(link.media_id);
    if (!gm) continue;
    recordPhoto(link.child_id, gm.captured_at, gm.work_id);
  }

  for (const p of progress) {
    if (!lastProgressAt.has(p.child_id)) {
      lastProgressAt.set(p.child_id, new Date(p.updated_at));
    }
  }

  // 9. Compute per-child score
  const today = new Date();
  const enriched = children.map(c => {
    const lp = lastPhotoAt.get(c.id) || null;
    const lpg = lastProgressAt.get(c.id) || null;
    const daysSincePhoto = lp ? daysBetween(lp, today) : 365;
    const daysSinceProgress = lpg ? daysBetween(lpg, today) : 365;

    const currentPaperworkWeek = c.paperwork_current_week ?? 1;
    const weeksBehind = Math.max(0, targetWeek - currentPaperworkWeek);

    const langThisWeek = langPhotosThisWeek.get(c.id) || 0;
    const noLanguage = langThisWeek === 0;
    const staleWork = daysSincePhoto >= 14 ? 1 : 0;

    const score =
      (daysSincePhoto * W_PHOTO) +
      (daysSinceProgress * W_PROGRESS) +
      (weeksBehind * W_PAPERWORK) +
      (noLanguage ? W_NO_LANGUAGE : 0) +
      (staleWork * W_STALE);

    return {
      id: c.id,
      name: c.name,
      photo_url: c.photo_url,
      days_since_photo: Math.min(daysSincePhoto, 365),
      days_since_progress: Math.min(daysSinceProgress, 365),
      last_photo_at: lp ? lp.toISOString() : null,
      last_progress_at: lpg ? lpg.toISOString() : null,
      paperwork_current_week: currentPaperworkWeek,
      paperwork_weeks_behind: weeksBehind,
      language_photos_this_week: langThisWeek,
      no_language_this_week: noLanguage,
      stale_work: Boolean(staleWork),
      score,
    };
  });

  enriched.sort((a, b) => b.score - a.score);

  return NextResponse.json({
    children: enriched,
    targetWeek,
    weekStart: weekStartISO,
    weekEnd: weekEndISO,
    total: enriched.length,
  }, {
    headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' },
  });
}
