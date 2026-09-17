// app/api/montree/progress/recent-works/route.ts
//
// GET /api/montree/progress/recent-works?childId=<uuid>
//
// The "Suggested" row behind components/montree/media/WorkQuickPick.tsx — the
// capture-time work picker that replaced AI photo recognition on 2026-09-17.
//
// Two lists, both tiny and both read-only:
//
//   recent    — the last 3 works this child has a TRACKER EVENT for
//               (montree_progress_events, the append-only journal from
//               migration 314 — the same journal every derived surface reads).
//   classroom — the classroom's 5 most-tagged works in the last 14 days
//               (montree_media.work_id, i.e. what teachers actually tag).
//
// Both are resolved to live curriculum rows so each suggestion carries the
// work_id the upload needs. Anything that no longer exists in the classroom's
// curriculum is simply dropped — a suggestion you cannot tag with is worse
// than no suggestion.
//
// SCOPE: teacher auth via verifySchoolRequest, then the child is proved to
// belong to the caller's school (verifyChildBelongsToSchool) exactly like
// /api/montree/progress/bars does. The classroom list is read from the
// caller's own classroom, never a client-supplied one.
//
// PAYLOAD: at most 8 rows of {id, name, area_key}. This is on the capture
// critical path on an iPhone — it must never become another 34 MB curriculum
// download (see the 🚨 note in /api/montree/curriculum).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';

export const dynamic = 'force-dynamic';

const RECENT_FOR_CHILD = 3;
const TOP_FOR_CLASSROOM = 5;
const CLASSROOM_WINDOW_DAYS = 14;

export interface RecentWorkSuggestion {
  id: string;
  name: string;
  area_key: string | null;
  /** 'child' = this child's own recent tracker events; 'classroom' = popular here. */
  reason: 'child' | 'classroom';
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const childId = request.nextUrl.searchParams.get('childId');
    const supabase = getSupabase();

    let classroomId: string | null = auth.classroomId || null;

    // ── The child's own recent works ────────────────────────────────────────
    const childNames: string[] = [];
    if (childId) {
      const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
      if (!access.allowed) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }

      const { data: child } = await supabase
        .from('montree_children')
        .select('classroom_id')
        .eq('id', childId)
        .maybeSingle();
      if (child?.classroom_id) classroomId = child.classroom_id as string;

      // Journal-first (RULE 8: everything a human reads is derived from the
      // journal). Over-fetch a little and de-duplicate by name in JS — a child
      // working the same work three days running should not fill the row.
      const { data: events } = await supabase
        .from('montree_progress_events')
        .select('work_name, created_at')
        .eq('child_id', childId)
        .order('created_at', { ascending: false })
        .limit(40);

      for (const e of events || []) {
        const name = (e.work_name || '').trim();
        if (!name) continue;
        if (childNames.some((n) => n.toLowerCase() === name.toLowerCase())) continue;
        childNames.push(name);
        if (childNames.length >= RECENT_FOR_CHILD) break;
      }
    }

    // ── What this classroom has been tagging ────────────────────────────────
    const classroomWorkIds: string[] = [];
    if (classroomId) {
      const since = new Date(Date.now() - CLASSROOM_WINDOW_DAYS * 86400_000).toISOString();
      const { data: tagged } = await supabase
        .from('montree_media')
        .select('work_id')
        .eq('school_id', auth.schoolId)
        .eq('classroom_id', classroomId)
        .not('work_id', 'is', null)
        .gte('captured_at', since)
        .order('captured_at', { ascending: false })
        .limit(300);

      const counts = new Map<string, number>();
      for (const row of tagged || []) {
        const id = row.work_id as string | null;
        if (!id) continue;
        counts.set(id, (counts.get(id) || 0) + 1);
      }
      for (const [id] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
        classroomWorkIds.push(id);
        if (classroomWorkIds.length >= TOP_FOR_CLASSROOM) break;
      }
    }

    if (!classroomId) {
      return NextResponse.json({ success: true, suggestions: [] });
    }

    // ── Resolve both lists against the LIVE classroom curriculum ────────────
    const { data: works } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name, area:montree_classroom_curriculum_areas!area_id ( area_key )')
      .eq('classroom_id', classroomId)
      .eq('is_active', true);

    const byId = new Map<string, { name: string; area_key: string | null }>();
    const byName = new Map<string, { id: string; name: string; area_key: string | null }>();
    for (const w of works || []) {
      const areaRel = (w as Record<string, unknown>).area as
        | { area_key?: string }
        | { area_key?: string }[]
        | null;
      const areaKey = Array.isArray(areaRel) ? areaRel[0]?.area_key ?? null : areaRel?.area_key ?? null;
      const name = (w.name as string) || '';
      byId.set(w.id as string, { name, area_key: areaKey });
      const key = name.trim().toLowerCase();
      if (key && !byName.has(key)) byName.set(key, { id: w.id as string, name, area_key: areaKey });
    }

    const suggestions: RecentWorkSuggestion[] = [];
    const seen = new Set<string>();

    for (const name of childNames) {
      const hit = byName.get(name.trim().toLowerCase());
      if (!hit || seen.has(hit.id)) continue;
      seen.add(hit.id);
      suggestions.push({ id: hit.id, name: hit.name, area_key: hit.area_key, reason: 'child' });
    }
    for (const id of classroomWorkIds) {
      const hit = byId.get(id);
      if (!hit || seen.has(id)) continue;
      seen.add(id);
      suggestions.push({ id, name: hit.name, area_key: hit.area_key, reason: 'classroom' });
    }

    const res = NextResponse.json({ success: true, suggestions });
    // Same posture as the picker projection: a teacher's last tag must show up
    // on the very next capture, so this may not be served from a stale cache.
    res.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
    return res;
  } catch (err) {
    console.error('[recent-works] failed:', err);
    return NextResponse.json({ success: false, error: 'Failed to load suggestions' }, { status: 500 });
  }
}
