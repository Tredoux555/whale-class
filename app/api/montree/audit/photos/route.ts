import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase, getPublicUrl } from '@/lib/supabase-client';

// GET /api/montree/audit/photos — Fetch photos with confidence data for audit view
export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const url = new URL(request.url);

    // Step 1: Determine effectiveClassroomId (SECURITY-CRITICAL)
    let effectiveClassroomId: string | null;
    if (auth.role === 'teacher' || auth.role === 'homeschool_parent') {
      effectiveClassroomId = auth.classroomId ?? null;
      if (!effectiveClassroomId) {
        return NextResponse.json({ error: 'No classroom assigned' }, { status: 403 });
      }
    } else {
      const reqClassroom = url.searchParams.get('classroom_id');
      if (reqClassroom) {
        const { data: cl } = await supabase
          .from('montree_classrooms').select('id')
          .eq('id', reqClassroom).eq('school_id', auth.schoolId).maybeSingle();
        if (!cl) return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
        effectiveClassroomId = reqClassroom;
      } else {
        effectiveClassroomId = null; // All classrooms in school
      }
    }

    // Step 2: Parse query params
    const zone = url.searchParams.get('zone') || 'all';
    const dateFrom = url.searchParams.get('date_from') || new Date(Date.now() - 7 * 86400000).toISOString();
    const dateTo = url.searchParams.get('date_to') || new Date().toISOString();
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 1), 200);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);

    // Step 3: Query media — exclude teacher_confirmed photos (they're done, never show again)
    let mediaQuery = supabase
      .from('montree_media')
      .select('id, child_id, work_id, storage_path, thumbnail_path, captured_at, created_at, caption, auto_crop, classroom_id, tags', { count: 'exact' })
      .eq('school_id', auth.schoolId)
      .eq('media_type', 'photo')
      .neq('teacher_confirmed', true)
      .gte('captured_at', dateFrom)
      .lte('captured_at', dateTo)
      .order('captured_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (effectiveClassroomId) {
      mediaQuery = mediaQuery.eq('classroom_id', effectiveClassroomId);
    }
    if (zone === 'haiku_test') {
      // Haiku Test: return ALL photos (no work_id filtering)
    } else if (zone === 'untagged') {
      mediaQuery = mediaQuery.is('work_id', null);
    } else if (zone !== 'all') {
      mediaQuery = mediaQuery.not('work_id', 'is', null);
    }

    const { data: rawMediaRows, count: totalCount, error: mediaErr } = await mediaQuery;
    if (mediaErr) {
      console.error('[Photo Audit] Media query error:', mediaErr);
      return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
    }
    // Filter out reference photos in JS (PostgREST .or() has issues with JSONB array syntax)
    const mediaRows = (rawMediaRows || []).filter((m: any) => {
      if (!m.tags) return true;
      if (Array.isArray(m.tags) && m.tags.includes('reference_photo')) return false;
      return true;
    });
    if (mediaRows.length === 0) {
      return NextResponse.json({
        success: true, photos: [], total: 0,
        counts: { green: 0, amber: 0, red: 0, untagged: 0 },
        limit, offset,
      });
    }

    // Step 4: Parallel enrichment (children + works + confidence + multi-child links)
    const childIds = [...new Set(mediaRows.map(m => m.child_id).filter(Boolean))];
    const workIds = [...new Set(mediaRows.map(m => m.work_id).filter(Boolean))];
    const mediaIds = mediaRows.map(m => m.id);

    const [childResult, workResult, confidenceResult, multiChildResult, progressResult] = await Promise.allSettled([
      childIds.length > 0
        ? supabase.from('montree_children').select('id, name').in('id', childIds)
        : Promise.resolve({ data: [] }),
      workIds.length > 0
        ? supabase.from('montree_classroom_curriculum_works')
            .select('work_id:id, name, area:montree_classroom_curriculum_areas!area_id(area_key)')
            .in('id', workIds)
        : Promise.resolve({ data: [] }),
      fetchConfidenceData(supabase, mediaRows),
      // Fetch multi-child links from junction table
      mediaIds.length > 0
        ? supabase.from('montree_media_children').select('media_id, child_id').in('media_id', mediaIds)
        : Promise.resolve({ data: [] }),
      // Fetch existing work progress statuses for P/P/M seeding
      childIds.length > 0
        ? supabase.from('montree_child_progress').select('child_id, work_name, status').in('child_id', childIds)
        : Promise.resolve({ data: [] }),
    ]);

    // Step 5: Build lookup maps
    const childMap = new Map<string, string>();
    if (childResult.status === 'fulfilled') {
      for (const c of (childResult.value as any).data || []) childMap.set(c.id, c.name);
    }
    // Build multi-child map: media_id → Set of child_ids (from junction table)
    const multiChildMap = new Map<string, Set<string>>();
    if (multiChildResult.status === 'fulfilled') {
      for (const mc of (multiChildResult.value as any).data || []) {
        if (!multiChildMap.has(mc.media_id)) {
          multiChildMap.set(mc.media_id, new Set());
        }
        multiChildMap.get(mc.media_id)!.add(mc.child_id);
      }
    }
    // Fetch names for any junction-table children not in the initial childMap
    const missingChildIds: string[] = [];
    for (const childSet of multiChildMap.values()) {
      for (const cid of childSet) {
        if (!childMap.has(cid) && !missingChildIds.includes(cid)) {
          missingChildIds.push(cid);
        }
      }
    }
    if (missingChildIds.length > 0) {
      const { data: extraChildren, error: extraErr } = await supabase
        .from('montree_children').select('id, name').in('id', missingChildIds);
      if (extraErr) console.error('[Photo Audit] Extra children fetch error:', extraErr);
      if (extraChildren) {
        for (const c of extraChildren) childMap.set(c.id, c.name);
      }
    }
    const workMap = new Map<string, { name: string; area: string }>();
    if (workResult.status === 'fulfilled') {
      for (const w of (workResult.value as any).data || []) workMap.set(w.work_id, { name: w.name, area: w.area?.area_key || 'unknown' });
    }
    // Build progress status map for P/P/M seeding (child_id:work_name → status)
    const progressMap = new Map<string, string>();
    if (progressResult.status === 'fulfilled') {
      for (const p of (progressResult.value as any).data || []) {
        if (p.child_id && p.work_name && p.status) {
          progressMap.set(`${p.child_id}:${p.work_name.toLowerCase()}`, p.status);
        }
      }
    }

    const confidenceMap = new Map<string, { confidence: number | null; scenario: string | null }>();
    if (confidenceResult.status === 'fulfilled') {
      for (const r of (confidenceResult.value as any) || []) {
        const parts = r.question.split(':');
        const mediaId = parts[1];
        if (!mediaId) {
          console.warn('[Photo Audit] Malformed cache question format:', r.question);
          continue;
        }
        // Results are ordered by asked_at DESC, so the first (newest) row wins.
        // Teacher-confirmed rows (confidence 1.0) always come first if they exist.
        if (confidenceMap.has(mediaId)) continue;
        const snapshot = r.context_snapshot || {};
        confidenceMap.set(mediaId, {
          confidence: snapshot.sonnet_confidence ?? snapshot.haiku_confidence ?? null,
          scenario: snapshot.scenario || null,
        });
      }
    }

    // Step 6: Zone classification + response assembly
    function classifyZone(workId: string | null, conf: number | null): string {
      if (!workId) return 'untagged';
      if (conf === null || conf === undefined) return 'amber';
      if (conf >= 0.85) return 'green';
      if (conf >= 0.50) return 'amber';
      return 'red';
    }

    const counts = { green: 0, amber: 0, red: 0, untagged: 0 };
    const photos = mediaRows.map(m => {
      const conf = confidenceMap.get(m.id);
      const work = m.work_id ? workMap.get(m.work_id) : null;
      const photoZone = classifyZone(m.work_id, conf?.confidence ?? null);
      counts[photoZone as keyof typeof counts]++;

      // Merge direct child_id with junction table children for complete list
      const junctionChildren = multiChildMap.get(m.id);
      const allChildIds: string[] = [];
      const allChildNames: string[] = [];
      // Always include the direct child_id first
      if (m.child_id) {
        allChildIds.push(m.child_id);
        allChildNames.push(childMap.get(m.child_id) || 'Unknown');
      }
      // Add any additional children from junction table
      if (junctionChildren) {
        for (const cid of junctionChildren) {
          if (!allChildIds.includes(cid)) {
            allChildIds.push(cid);
            allChildNames.push(childMap.get(cid) || 'Unknown');
          }
        }
      }
      // Also fetch child names for junction-only children not yet in childMap
      // (childIds set was built from direct child_id only — junction children might be missing)
      // This is handled by ensuring we add junction child_ids to the children query above

      return {
        id: m.id,
        child_id: m.child_id,
        child_name: childMap.get(m.child_id) || 'Unknown',
        child_ids: allChildIds,
        child_names: allChildNames,
        classroom_id: m.classroom_id,
        work_id: m.work_id,
        work_name: work?.name || null,
        area: work?.area || null,
        confidence: conf?.confidence ?? null,
        scenario: conf?.scenario ?? null,
        zone: photoZone,
        thumbnail_path: m.thumbnail_path || m.storage_path,
        url: (m.thumbnail_path || m.storage_path)
          ? getPublicUrl('montree-media', m.thumbnail_path || m.storage_path)
          : null,
        auto_crop: m.auto_crop,
        captured_at: m.captured_at || m.created_at,
        caption: m.caption || null,
        status: (m.child_id && work?.name ? progressMap.get(`${m.child_id}:${work.name.toLowerCase()}`) : null) || null,
      };
    });

    // Client-side zone filter for green/amber/red (untagged already filtered server-side)
    const filtered = zone === 'all' || zone === 'untagged' || zone === 'haiku_test'
      ? photos
      : photos.filter(p => p.zone === zone);

    return NextResponse.json({
      success: true, photos: filtered, total: totalCount || 0, counts, limit, offset,
    }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('[Photo Audit] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper: Fetch confidence data with two-format cache key approach
async function fetchConfidenceData(supabase: any, mediaRows: any[]) {
  const mediaWithChild = mediaRows.filter(m => m.child_id);
  const newKeys = mediaWithChild.map(m => `photo:${m.id}:${m.child_id}`);

  if (newKeys.length === 0) return [];

  // Query 1: New format (exact match via .in(), chunked to avoid URL length limits)
  // ORDER BY asked_at DESC so newest (e.g. teacher-confirmed) rows come first
  let newFormat: any[] = [];
  const IN_CHUNK_SIZE = 30; // ~70 chars per key × 30 = ~2.1KB per chunk (safe under 8KB limit)
  for (let i = 0; i < newKeys.length; i += IN_CHUNK_SIZE) {
    const chunk = newKeys.slice(i, i + IN_CHUNK_SIZE);
    const { data, error } = await supabase
      .from('montree_guru_interactions')
      .select('question, context_snapshot, asked_at')
      .in('question', chunk)
      .order('asked_at', { ascending: false });
    if (error) console.error('[Photo Audit] Confidence new format query error:', error);
    if (data) newFormat.push(...data);
  }

  // Find media IDs NOT in new format results
  const foundMediaIds = new Set(
    (newFormat || []).map((r: any) => r.question.split(':')[1])
  );
  const missingMedia = mediaWithChild.filter(m => !foundMediaIds.has(m.id));

  // Query 2: Old locale-suffixed format (.like() fallback)
  // Process in sequential chunks of 5 to avoid connection pool exhaustion
  let oldFormat: any[] = [];
  if (missingMedia.length > 0) {
    if (missingMedia.length > 50) {
      console.warn(`[Photo Audit] ${missingMedia.length} items need .like() fallback — capping at 50 to prevent timeout`);
      missingMedia.length = 50; // Truncate — remaining photos just won't have confidence data
    }
    const CHUNK_SIZE = 5; // Keep small — each .like() does a full-table scan
    for (let i = 0; i < missingMedia.length; i += CHUNK_SIZE) {
      const chunk = missingMedia.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.allSettled(
        chunk.map(m =>
          supabase
            .from('montree_guru_interactions')
            .select('question, context_snapshot')
            .like('question', `photo:${m.id}:${m.child_id}:%`)
            .limit(1)
            .maybeSingle()
        )
      );
      for (const r of chunkResults) {
        if (r.status === 'fulfilled' && (r as any).value?.data) {
          oldFormat.push((r as any).value.data);
        } else if (r.status === 'rejected') {
          console.error('[Photo Audit] Confidence fallback query failed:', (r as any).reason);
        }
      }
    }
  }

  return [...(newFormat || []), ...oldFormat];
}
