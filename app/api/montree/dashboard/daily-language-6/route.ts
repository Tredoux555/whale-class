// app/api/montree/dashboard/daily-language-6/route.ts
// Returns 6 children who most need a Language area observation today.
// Custom feature for Whale Class — but works for any classroom.
// Prioritizes: never-seen-in-language first, then oldest observation first.
// Excludes children already photographed in Language today.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

// Supabase row types (explicit to avoid `never` inference)
type ChildRow = { id: string; name: string; photo_url: string | null };
type AreaRow = { id: string };
type WorkRow = { id: string };
type MediaRow = { child_id: string; captured_at: string; work_id: string };
type GroupLinkRow = { child_id: string; media_id: string };
type GroupMediaRow = { id: string; captured_at: string; work_id: string };

interface ChildStatus {
  id: string;
  name: string;
  photo_url: string | null;
  last_language_date: Date | null;
  seen_today: boolean;
}

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { classroomId } = auth;
  if (!classroomId) {
    return NextResponse.json({ error: 'No classroom in session' }, { status: 400 });
  }

  const supabase = getSupabase();

  // 1. Get all children in classroom
  const { data: rawChildren, error: childErr } = await supabase
    .from('montree_children')
    .select('id, name, photo_url')
    .eq('classroom_id', classroomId)
    .eq('is_active', true)
    .order('name');

  const children = (rawChildren || []) as ChildRow[];
  if (childErr || children.length === 0) {
    return NextResponse.json({ recommendations: [], total_children: 0, seen_today: 0 });
  }

  // 2. Get the language area_id for this classroom
  const { data: rawLangArea } = await supabase
    .from('montree_classroom_curriculum_areas')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('area_key', 'language')
    .maybeSingle();

  const langArea = rawLangArea as AreaRow | null;
  if (!langArea) {
    return NextResponse.json({ error: 'Language area not found for classroom' }, { status: 404 });
  }

  // 3. Get all language work IDs for this classroom
  const { data: rawLangWorks } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('area_id', langArea.id);

  const langWorkIds = new Set(((rawLangWorks || []) as WorkRow[]).map(w => w.id));
  if (langWorkIds.size === 0) {
    return NextResponse.json({ recommendations: [], total_children: children.length, seen_today: 0 });
  }

  // 4. Query all media for these children with a work_id
  const childIds = children.map(c => c.id);

  const { data: rawMedia } = await supabase
    .from('montree_media')
    .select('child_id, captured_at, work_id')
    .in('child_id', childIds)
    .eq('classroom_id', classroomId)
    .not('work_id', 'is', null)
    .order('captured_at', { ascending: false });

  const mediaRows = (rawMedia || []) as MediaRow[];

  // Also check montree_media_children for group photos
  const { data: rawGroupLinks } = await supabase
    .from('montree_media_children')
    .select('child_id, media_id')
    .in('child_id', childIds);

  const groupLinks = (rawGroupLinks || []) as GroupLinkRow[];
  const groupMediaIds = [...new Set(groupLinks.map(l => l.media_id))];
  const groupMediaMap = new Map<string, { captured_at: string; work_id: string }>();

  if (groupMediaIds.length > 0) {
    const { data: rawGroupMedia } = await supabase
      .from('montree_media')
      .select('id, captured_at, work_id')
      .in('id', groupMediaIds)
      .eq('classroom_id', classroomId)
      .not('work_id', 'is', null);

    for (const m of ((rawGroupMedia || []) as GroupMediaRow[])) {
      groupMediaMap.set(m.id, { captured_at: m.captured_at, work_id: m.work_id });
    }
  }

  // Build per-child: last language observation date + seen-today flag
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  const childStatusMap = new Map<string, ChildStatus>();
  for (const child of children) {
    childStatusMap.set(child.id, {
      id: child.id,
      name: child.name,
      photo_url: child.photo_url,
      last_language_date: null,
      seen_today: false,
    });
  }

  // Helper: process a media observation for a child
  const recordObservation = (childId: string, workId: string, capturedAt: string) => {
    if (!langWorkIds.has(workId)) return;
    const status = childStatusMap.get(childId);
    if (!status) return;

    const capturedDate = new Date(capturedAt);
    if (capturedAt.slice(0, 10) === todayStr) {
      status.seen_today = true;
    }
    if (!status.last_language_date || capturedDate > status.last_language_date) {
      status.last_language_date = capturedDate;
    }
  };

  // Direct photos
  for (const row of mediaRows) {
    if (row.child_id && row.work_id) {
      recordObservation(row.child_id, row.work_id, row.captured_at);
    }
  }

  // Group photo links
  for (const link of groupLinks) {
    const media = groupMediaMap.get(link.media_id);
    if (media?.work_id) {
      recordObservation(link.child_id, media.work_id, media.captured_at);
    }
  }

  // 5. Filter out seen-today, sort oldest first (never-seen at the top)
  const allStatuses = Array.from(childStatusMap.values());
  const seenTodayCount = allStatuses.filter(s => s.seen_today).length;

  const candidates = allStatuses
    .filter(s => !s.seen_today)
    .sort((a, b) => {
      if (!a.last_language_date && !b.last_language_date) return 0;
      if (!a.last_language_date) return -1;
      if (!b.last_language_date) return 1;
      return a.last_language_date.getTime() - b.last_language_date.getTime();
    });

  const recommendations = candidates.slice(0, 6).map(c => {
    const daysSince = c.last_language_date
      ? Math.floor((Date.now() - c.last_language_date.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return {
      id: c.id,
      name: c.name,
      photo_url: c.photo_url,
      days_since_last_seen: daysSince,
      last_seen_date: c.last_language_date?.toISOString() || null,
      status: daysSince === null ? 'never_observed' : daysSince > 7 ? 'stale' : 'recent',
    };
  });

  return NextResponse.json({
    recommendations,
    total_children: children.length,
    seen_today: seenTodayCount,
  });
}
