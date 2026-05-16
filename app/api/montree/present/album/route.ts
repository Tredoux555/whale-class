// /api/montree/present/album/route.ts
// SESSION 113 V2 — Parent-night presentation feed.
//
// Returns the minimal data needed to slideshow a single child's confirmed
// photos: ordered list of storage_paths only (no captions, no dates, no
// work names). The presentation page renders them full-bleed via the
// Cloudflare-proxied media URL.
//
// Pulls BOTH direct photos (montree_media.child_id) and group photos
// (montree_media_children junction) so children captured in group shots
// still appear in their album.
//
// Filters applied:
//   - teacher_confirmed = true        (only photos the teacher has signed off)
//   - media_type = 'photo'            (no videos in the slideshow)
//   - parent_visible != false         (respect any hide-from-parents flag)
//   - 🚨 work area = 'language'       (Session 113 V2 user directive — this
//                                      parent night is the Language showcase,
//                                      only show Language-area works)
//   - deduped by media.id
//
// Auth: standard verifySchoolRequest + verifyChildBelongsToSchool.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const supabase = getSupabase();

    // 🚨 Language-area filter (Session 113 V2). The presentation slideshow
    // is the LANGUAGE showcase — every other curriculum area is filtered out.
    //
    // Two-table schema: montree_classroom_curriculum_works.area_id points to
    // montree_classroom_curriculum_areas.id, which has area_key. So we look
    // up the language area_id first, then fetch work IDs in that area, then
    // constrain the photo query to media.work_id IN (those work ids).
    //
    // Mirrors the canonical pattern from loadLanguageProgress() in
    // app/api/montree/reports/language-semester/generate/route.ts.
    //
    // Photos with work_id IS NULL (uncategorized / Saved-as-Other / failed
    // identification) are excluded by design — we don't want unidentified
    // photos surfacing during a parent meeting.
    const { data: langArea, error: areaErr } = await supabase
      .from('montree_classroom_curriculum_areas')
      .select('id')
      .eq('classroom_id', access.classroomId)
      .eq('area_key', 'language')
      .maybeSingle();

    if (areaErr) {
      console.error('[present/album] language area lookup error:', areaErr.message);
      return NextResponse.json({ error: 'Failed to load album' }, { status: 500 });
    }

    if (!langArea) {
      // Classroom has no Language area seeded — return empty.
      const empty = NextResponse.json({ photos: [] });
      empty.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=120');
      return empty;
    }

    const { data: languageWorks, error: workErr } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id')
      .eq('classroom_id', access.classroomId)
      .eq('area_id', (langArea as { id: string }).id);

    if (workErr) {
      console.error('[present/album] language work lookup error:', workErr.message);
      return NextResponse.json({ error: 'Failed to load album' }, { status: 500 });
    }

    const languageWorkIds = (languageWorks || []).map(
      (w: { id: string }) => w.id
    );

    if (languageWorkIds.length === 0) {
      const empty = NextResponse.json({ photos: [] });
      empty.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=120');
      return empty;
    }

    // Pull direct + group photos in parallel, constrained to language work IDs.
    const [
      { data: directPhotos, error: directError },
      { data: groupLinks, error: linkError },
    ] = await Promise.all([
      supabase
        .from('montree_media')
        .select('id, storage_path, captured_at, created_at, parent_visible, media_type, teacher_confirmed, work_id')
        .eq('child_id', childId)
        .eq('media_type', 'photo')
        .eq('teacher_confirmed', true)
        .in('work_id', languageWorkIds)
        .order('captured_at', { ascending: true })
        .limit(500),
      supabase
        .from('montree_media_children')
        .select('media_id')
        .eq('child_id', childId)
        .limit(500),
    ]);

    if (directError || linkError) {
      console.error('[present/album] fetch error:', directError?.message || linkError?.message);
      return NextResponse.json({ error: 'Failed to load album' }, { status: 500 });
    }

    const groupMediaIds = (groupLinks || []).map((row: { media_id: string }) => row.media_id);

    let groupPhotos: Array<Record<string, unknown>> = [];
    if (groupMediaIds.length > 0) {
      const { data, error: groupError } = await supabase
        .from('montree_media')
        .select('id, storage_path, captured_at, created_at, parent_visible, media_type, teacher_confirmed, work_id')
        .in('id', groupMediaIds)
        .eq('media_type', 'photo')
        .eq('teacher_confirmed', true)
        .in('work_id', languageWorkIds);
      if (groupError) {
        console.error('[present/album] group fetch error:', groupError.message);
      } else {
        groupPhotos = data || [];
      }
    }

    // Combine, drop parent_visible === false, dedupe by id.
    const seen = new Set<string>();
    const combined: Array<{ id: string; storage_path: string; captured_at: string | null }> = [];
    for (const p of [...(directPhotos || []), ...groupPhotos]) {
      const id = (p as { id: string }).id;
      if (seen.has(id)) continue;
      const parentVisible = (p as { parent_visible: boolean | null }).parent_visible;
      if (parentVisible === false) continue;
      const storagePath = (p as { storage_path: string }).storage_path;
      if (!storagePath) continue;
      seen.add(id);
      combined.push({
        id,
        storage_path: storagePath,
        captured_at:
          (p as { captured_at: string | null }).captured_at ||
          (p as { created_at: string | null }).created_at ||
          null,
      });
    }

    // Sort oldest → newest. Tells a chronological story without surfacing dates.
    combined.sort((a, b) => {
      const da = a.captured_at || '';
      const db = b.captured_at || '';
      return da.localeCompare(db);
    });

    // Strip captured_at from the response — the client never needs it and
    // we don't want timestamps leaking into the DOM during presentation.
    const photos = combined.map((p) => ({
      id: p.id,
      storage_path: p.storage_path,
    }));

    const response = NextResponse.json({ photos });
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=120');
    return response;
  } catch (err) {
    console.error('[present/album] unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
