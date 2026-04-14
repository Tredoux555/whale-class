// /api/montree/photo-identification/batch
// Batch-process endpoint for the review-before-process workflow.
// Teacher approves a set of pending_review photos → this iterates each one and
// fires the existing /photo-identification/process route with force:true so the
// pending_review gate is bypassed and Haiku/Sonnet runs normally.
//
// Concurrency is capped (3 in flight) to avoid hammering Anthropic and the DB
// connection pool. Each photo is independent — failures are reported per-id and
// don't abort the batch.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { POST as processPost } from '@/app/api/montree/photo-identification/process/route';

export const maxDuration = 300;

const MAX_BATCH = 50;
const CONCURRENCY = 3;

interface BatchResult {
  media_id: string;
  ok: boolean;
  status?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    if (!auth.schoolId) {
      return NextResponse.json({ error: 'No school' }, { status: 403 });
    }

    const supabase = getSupabase();

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rate = await checkRateLimit(supabase, ip, '/api/montree/photo-identification/batch', 60, 60);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const mediaIds: unknown = body.media_ids;
    const locale: string = body.locale === 'zh' ? 'zh' : 'en';

    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      return NextResponse.json({ error: 'media_ids array required' }, { status: 400 });
    }
    if (mediaIds.length > MAX_BATCH) {
      return NextResponse.json({ error: `max ${MAX_BATCH} per batch` }, { status: 400 });
    }
    if (!mediaIds.every((id): id is string => typeof id === 'string' && id.length > 0)) {
      return NextResponse.json({ error: 'media_ids must be non-empty strings' }, { status: 400 });
    }

    // Verify every requested media row belongs to the authenticated school
    // AND is currently in pending_review status. This endpoint is strictly
    // for the review-before-process workflow — it must not force-rerun
    // already-confirmed photos (would re-spend Haiku/Sonnet $).
    const { data: ownedRows, error: ownErr } = await supabase
      .from('montree_media')
      .select('id, classroom_id, identification_status')
      .in('id', mediaIds)
      .eq('school_id', auth.schoolId);

    if (ownErr) {
      console.error('[BatchProcess] ownership check failed:', ownErr.message);
      return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
    }

    // Strict: only pending_review rows are eligible
    const eligible = (ownedRows || []).filter((r: any) => r.identification_status === 'pending_review');
    const eligibleIds = new Set(eligible.map((r: any) => r.id));
    const validIds = mediaIds.filter(id => eligibleIds.has(id));
    const skipped = mediaIds.filter(id => !eligibleIds.has(id));

    if (validIds.length === 0) {
      return NextResponse.json({
        success: true, processed: 0, succeeded: 0, failed: 0,
        results: [], skipped_ineligible: skipped.length,
      });
    }

    // For teachers, also verify the photos are in their classroom.
    // (classroom_id NULL on a media row is treated as out-of-classroom.)
    if (auth.role === 'teacher' && auth.classroomId) {
      const wrongClassroom = eligible.filter(
        (r: any) => !r.classroom_id || r.classroom_id !== auth.classroomId
      );
      if (wrongClassroom.length > 0) {
        return NextResponse.json({ error: 'Some photos not in your classroom' }, { status: 403 });
      }
    }

    // In-process invocation of the process route (Railway SSL loopback issue —
    // see Session 10 photo-audit/resolve + Session 22 game-plan refresh).
    // Build a synthetic NextRequest per photo that forwards the auth cookies.
    const cookie = request.headers.get('cookie') || '';
    const xff = request.headers.get('x-forwarded-for') || '';
    const ua = request.headers.get('user-agent') || '';
    const origin = request.nextUrl.origin;

    const results: BatchResult[] = [];

    // Run with bounded concurrency
    let cursor = 0;
    async function worker() {
      while (cursor < validIds.length) {
        const idx = cursor++;
        const mediaId = validIds[idx];
        try {
          const url = new URL('/api/montree/photo-identification/process', origin);
          const synthetic = new NextRequest(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              cookie,
              'x-forwarded-for': xff,
              'user-agent': ua,
            },
            body: JSON.stringify({ media_id: mediaId, force: true, locale }),
          });
          const res = await processPost(synthetic as any);
          const json: any = await res.json().catch(() => ({}));
          if (!res.ok) {
            results.push({ media_id: mediaId, ok: false, error: json?.error || `HTTP ${res.status}` });
          } else {
            results.push({ media_id: mediaId, ok: true, status: json?.status || json?.outcome || 'processed' });
          }
        } catch (err: any) {
          results.push({ media_id: mediaId, ok: false, error: err?.message || 'in-process call failed' });
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, validIds.length) }, () => worker()));

    const succeeded = results.filter(r => r.ok).length;
    const failed = results.length - succeeded;

    return NextResponse.json({
      success: true,
      processed: results.length,
      succeeded,
      failed,
      results,
      skipped_ineligible: skipped.length,
    });
  } catch (err: any) {
    console.error('[BatchProcess] error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/montree/photo-identification/batch
// Deletes a set of pending_review photos (teacher rejected them as duds).
// Removes both the storage object and the DB row.
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    if (!auth.schoolId) {
      return NextResponse.json({ error: 'No school' }, { status: 403 });
    }

    const supabase = getSupabase();

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rate = await checkRateLimit(supabase, ip, '/api/montree/photo-identification/batch', 60, 60);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const mediaIds: unknown = body.media_ids;

    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      return NextResponse.json({ error: 'media_ids array required' }, { status: 400 });
    }
    if (mediaIds.length > MAX_BATCH) {
      return NextResponse.json({ error: `max ${MAX_BATCH} per batch` }, { status: 400 });
    }
    if (!mediaIds.every((id): id is string => typeof id === 'string' && id.length > 0)) {
      return NextResponse.json({ error: 'media_ids must be non-empty strings' }, { status: 400 });
    }

    // Pull ownership + storage paths in one query. Restrict to pending_review
    // — this endpoint exists to cull duds before AI fires. Teachers use the
    // normal per-photo delete flow for already-processed photos.
    const { data: rows, error: lookupErr } = await supabase
      .from('montree_media')
      .select('id, storage_path, thumbnail_path, cropped_storage_path, classroom_id, identification_status')
      .in('id', mediaIds)
      .eq('school_id', auth.schoolId)
      .eq('identification_status', 'pending_review');

    if (lookupErr) {
      console.error('[BatchDelete] lookup failed:', lookupErr.message);
      return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
    }

    const owned = rows || [];
    if (auth.role === 'teacher' && auth.classroomId) {
      const wrong = owned.filter((r: any) => !r.classroom_id || r.classroom_id !== auth.classroomId);
      if (wrong.length > 0) {
        return NextResponse.json({ error: 'Some photos not in your classroom' }, { status: 403 });
      }
    }

    const ownedIds = owned.map((r: any) => r.id);
    if (ownedIds.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    // Collect storage paths to remove (best-effort — failures don't block DB delete)
    const storagePaths: string[] = [];
    for (const r of owned as any[]) {
      if (r.storage_path) storagePaths.push(r.storage_path);
      if (r.thumbnail_path && r.thumbnail_path !== r.storage_path) storagePaths.push(r.thumbnail_path);
      if (r.cropped_storage_path) storagePaths.push(r.cropped_storage_path);
    }

    if (storagePaths.length > 0) {
      const { error: storageErr } = await supabase.storage.from('montree-media').remove(storagePaths);
      if (storageErr) {
        console.error('[BatchDelete] storage cleanup error (non-fatal):', storageErr.message);
      }
    }

    // Delete junction table rows first (FK)
    await supabase.from('montree_media_children').delete().in('media_id', ownedIds);

    const { error: delErr } = await supabase
      .from('montree_media').delete().in('id', ownedIds);

    if (delErr) {
      console.error('[BatchDelete] DB delete failed:', delErr.message);
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: ownedIds.length });
  } catch (err: any) {
    console.error('[BatchDelete] error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
