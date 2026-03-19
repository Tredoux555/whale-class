// /api/montree/albums/route.ts
// Album query API — fetch photos for a child within a date range
// Used by the album export page to preview and generate albums
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';

// POST - Query photos for album generation
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const body = await request.json();
    const {
      child_id,
      date_from,
      date_to,
      include_curriculum = true,
      include_events = true,
      event_id,
    } = body;

    if (!child_id || !date_from || !date_to) {
      return NextResponse.json(
        { error: 'child_id, date_from, and date_to are required' },
        { status: 400 }
      );
    }

    // Verify child belongs to school
    const access = await verifyChildBelongsToSchool(child_id, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build query: direct photos + group photos via junction table
    const [
      { data: directMedia, error: directError },
      { data: groupLinks, error: linkError },
      { data: events, error: eventsError },
    ] = await Promise.all([
      supabase
        .from('montree_media')
        .select('id, storage_path, thumbnail_path, media_type, caption, captured_at, work_id, event_id, auto_crop')
        .eq('child_id', child_id)
        .gte('captured_at', date_from)
        .lte('captured_at', date_to + 'T23:59:59.999Z')
        .order('captured_at', { ascending: true }),
      supabase
        .from('montree_media_children')
        .select('media_id')
        .eq('child_id', child_id),
      supabase
        .from('montree_events')
        .select('id, name, event_date, event_type')
        .eq('school_id', auth.schoolId),
    ]);

    if (directError || linkError || eventsError) {
      console.error('Album query error:', directError?.message || linkError?.message || eventsError?.message);
      return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
    }

    // Fetch group photos that are in date range
    const groupMediaIds = (groupLinks || []).map((l: { media_id: string }) => l.media_id);
    let groupMedia: Record<string, unknown>[] = [];
    if (groupMediaIds.length > 0) {
      const { data } = await supabase
        .from('montree_media')
        .select('id, storage_path, thumbnail_path, media_type, caption, captured_at, work_id, event_id, auto_crop')
        .in('id', groupMediaIds)
        .gte('captured_at', date_from)
        .lte('captured_at', date_to + 'T23:59:59.999Z')
        .order('captured_at', { ascending: true });
      groupMedia = data || [];
    }

    // Combine and deduplicate
    const mediaMap = new Map<string, Record<string, unknown>>();
    for (const item of [...(directMedia || []), ...groupMedia]) {
      if (!mediaMap.has(item.id)) {
        mediaMap.set(item.id, item);
      }
    }

    let allMedia = Array.from(mediaMap.values());

    // Apply filters
    if (!include_curriculum && !include_events) {
      allMedia = []; // Nothing selected
    } else if (!include_curriculum) {
      // Events only
      allMedia = allMedia.filter(m => m.event_id != null);
    } else if (!include_events) {
      // Curriculum only (no event)
      allMedia = allMedia.filter(m => m.event_id == null);
    }

    // Optional: filter to specific event (validate it belongs to this school)
    if (event_id) {
      const validEvent = (events || []).find((e: { id: string }) => e.id === event_id);
      if (!validEvent) {
        return NextResponse.json({ error: 'Event not found in this school' }, { status: 403 });
      }
      allMedia = allMedia.filter(m => m.event_id === event_id);
    }

    // Sort by captured_at ascending (chronological for album)
    allMedia.sort((a, b) =>
      ((a.captured_at as string) || '').localeCompare((b.captured_at as string) || '')
    );

    // Build event lookup map
    const eventMap = new Map<string, { name: string; event_date: string; event_type: string }>();
    for (const e of events || []) {
      eventMap.set(e.id, { name: e.name, event_date: e.event_date, event_type: e.event_type });
    }

    // Group photos by date and event
    const grouped: {
      date: string;
      event_name: string | null;
      event_id: string | null;
      photos: Record<string, unknown>[];
    }[] = [];

    const groupKey = (m: Record<string, unknown>) => {
      const date = (m.captured_at as string)?.slice(0, 10) || 'unknown';
      const eid = m.event_id as string | null;
      return `${date}::${eid || 'curriculum'}`;
    };

    const groupMap = new Map<string, typeof grouped[0]>();
    for (const m of allMedia) {
      const key = groupKey(m);
      if (!groupMap.has(key)) {
        const eid = m.event_id as string | null;
        const eventInfo = eid ? eventMap.get(eid) : null;
        groupMap.set(key, {
          date: (m.captured_at as string)?.slice(0, 10) || 'unknown',
          event_name: eventInfo?.name || null,
          event_id: eid,
          photos: [],
        });
      }
      groupMap.get(key)!.photos.push(m);
    }

    // Sort groups by date
    const sortedGroups = Array.from(groupMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // Get signed URLs for thumbnails
    const allPaths = allMedia
      .map(m => (m.thumbnail_path || m.storage_path) as string)
      .filter(Boolean);

    let urlMap: Record<string, string> = {};
    if (allPaths.length > 0) {
      const { data: signedData } = await supabase.storage
        .from('montree-media')
        .createSignedUrls(allPaths, 3600);
      if (signedData) {
        for (const item of signedData) {
          if (item.signedUrl) {
            urlMap[item.path || ''] = item.signedUrl;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      total_photos: allMedia.length,
      groups: sortedGroups,
      urls: urlMap,
      events: events || [],
    });
  } catch (error) {
    console.error('Album query error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
