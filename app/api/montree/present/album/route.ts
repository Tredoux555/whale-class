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

    // Pull direct + group photos in parallel.
    const [
      { data: directPhotos, error: directError },
      { data: groupLinks, error: linkError },
    ] = await Promise.all([
      supabase
        .from('montree_media')
        .select('id, storage_path, captured_at, created_at, parent_visible, media_type, teacher_confirmed')
        .eq('child_id', childId)
        .eq('media_type', 'photo')
        .eq('teacher_confirmed', true)
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
        .select('id, storage_path, captured_at, created_at, parent_visible, media_type, teacher_confirmed')
        .in('id', groupMediaIds)
        .eq('media_type', 'photo')
        .eq('teacher_confirmed', true);
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
