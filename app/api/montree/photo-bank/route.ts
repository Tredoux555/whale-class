// /api/montree/photo-bank/route.ts
// Picture Bank API — Search, browse, and upload pictures for the Montree picture library
//
// 🚨 JPEG-ONLY: Uploads are restricted to image/jpeg with .jpg / .jpeg extensions.
// PNG, HEIC, WebP, GIF, AVIF, etc. fail to render reliably across the Cloudflare
// proxy + tools pipeline, so we reject them at upload time. Validation lives in
// the shared helper at lib/montree/media/jpeg-validation.ts — do not duplicate.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { validateJpegPhoto } from '@/lib/montree/media/jpeg-validation';

const BUCKET = 'photo-bank';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * GET /api/montree/photo-bank
 * Search and browse photos
 * Query params: q (search), kind ('pictures' | 'coloring'), page, limit
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);

    const q = searchParams.get('q')?.trim() || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = (page - 1) * limit;
    // sort: 'label' (default, alpha) | 'recent' (newest upload first)
    const sort = searchParams.get('sort') === 'recent' ? 'recent' : 'label';

    // 🚨 UI simplification (Jul 2026): the picker used to show a dynamic
    // category bar (Animals, Food, Objects, Body Parts, Nature, Places,
    // Actions, Colors, Clothing, Transport, …) sourced from
    // montree_photo_categories. In practice it just scattered near-identical
    // photos across ten tabs nobody used — the one distinction that actually
    // mattered was real photograph vs. printable coloring-page line art.
    // Replaced with exactly two tabs driven by `kind`:
    //   kind=pictures (default) — every photo whose label does NOT contain
    //     "coloring" (every coloring-page upload is labeled "<word> coloring",
    //     e.g. "apple coloring", "bell coloring").
    //   kind=coloring — only the coloring-page uploads.
    // montree_photo_categories / the per-row `category` column are left
    // alone — untouched data, just no longer queried or surfaced here.
    const kind = searchParams.get('kind') === 'coloring' ? 'coloring' : 'pictures';

    // 🚨 Perf Tier 3.3 (PERF_HEALTH_CHECK.md) — explicit column list.
    // PhotoBankPicker (the only consumer of this endpoint) reads exactly these
    // 8 fields. Previously `select('*')` shipped the full row (file_size,
    // mime_type, uploaded_by, is_public, is_approved, created_at, attribution,
    // …) on every search. Narrowing keeps the API surface compatible — the
    // client never read the extra columns — and trims payload ~60% per row.
    const SELECT_COLUMNS =
      'id, filename, label, tags, category, public_url, storage_path, thumbnail_path';

    // 🚨 Relevance bug fix (Jul 2026): `label.ilike.%term%` matches the term
    // ANYWHERE in the label, so searching "ring" also matches "coloring",
    // "spring", "string", "earring", "boring", etc. With the default
    // alphabetical sort, those false-positive matches can alphabetically
    // precede — or simply outnumber — the real "ring" entries and bury them
    // past the page-1 limit, making a picture that genuinely exists in the
    // bank look "missing" to the user. When a search term is present we now
    // rank exact match > prefix match > whole-word match > plain substring
    // match, and only fall back to pure alphabetical order for the browse
    // (no-query) case, where this problem can't occur.
    const RELEVANCE_FETCH_CAP = 500; // bound the in-memory rank/sort pass

    let photos: Record<string, unknown>[] | null = null;
    let count: number | null = null;

    if (q) {
      // 🚨 SQL injection / pattern-injection guard: escape Postgres ILIKE
      // metacharacters (% _ \). Without this, a search for "50%" would match
      // everything starting with "50", and a malicious "_" wildcard could
      // poison the index lookup.
      const escaped = q.replace(/[%_\\]/g, '\\$&');
      // Curly braces are reserved in PostgREST .or() syntax for array literal
      // values — strip them from the tag lookup so they can't break out of
      // the filter expression.
      const tagSafe = q.toLowerCase().replace(/[{}()*,\\]/g, '');

      let rankQuery = supabase
        .from('montree_photo_bank')
        .select(SELECT_COLUMNS, { count: 'exact' })
        .eq('is_public', true)
        .eq('is_approved', true)
        .or(`label.ilike.%${escaped}%,tags.cs.{${tagSafe}}`);

      rankQuery =
        kind === 'coloring'
          ? rankQuery.ilike('label', '%coloring%')
          : rankQuery.not('label', 'ilike', '%coloring%');

      rankQuery = rankQuery.order('label', { ascending: true }).limit(RELEVANCE_FETCH_CAP);

      const rankRes = await rankQuery;

      if (rankRes.error) {
        console.error('Photo bank query error:', rankRes.error);
        return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
      }

      const qLower = q.toLowerCase();
      const escapedForRegex = qLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const wordBoundary = new RegExp(`\\b${escapedForRegex}\\b`);
      const relevance = (label: string) => {
        const l = (label || '').toLowerCase();
        if (l === qLower) return 0;
        if (l.startsWith(qLower)) return 1;
        if (wordBoundary.test(l)) return 2;
        return 3; // incidental substring match, e.g. "ring" inside "coloring"
      };

      const ranked = [...(rankRes.data || [])].sort((a, b) => {
        const ra = relevance(String(a.label));
        const rb = relevance(String(b.label));
        if (ra !== rb) return ra - rb;
        return String(a.label).localeCompare(String(b.label));
      });

      // sort=recent still honored for a query search, applied within the
      // relevance tiers rather than overriding them — a search should never
      // surface an incidental "coloring" hit above the actual "ring" match.
      if (sort === 'recent') {
        ranked.sort((a, b) => {
          const ra = relevance(String(a.label));
          const rb = relevance(String(b.label));
          if (ra !== rb) return ra - rb;
          return String(b.created_at || '').localeCompare(String(a.created_at || ''));
        });
      }

      count = rankRes.count ?? ranked.length;
      photos = ranked.slice(offset, offset + limit);
    } else {
      let query = supabase
        .from('montree_photo_bank')
        .select(SELECT_COLUMNS, { count: 'exact' })
        .eq('is_public', true)
        .eq('is_approved', true);

      query =
        kind === 'coloring'
          ? query.ilike('label', '%coloring%')
          : query.not('label', 'ilike', '%coloring%');

      if (sort === 'recent') {
        query = query.order('created_at', { ascending: false, nullsFirst: false });
      } else {
        query = query.order('label', { ascending: true });
      }

      query = query.range(offset, offset + limit - 1);

      const photosRes = await query;

      if (photosRes.error) {
        console.error('Photo bank query error:', photosRes.error);
        return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
      }

      photos = photosRes.data;
      count = photosRes.count;
    }

    return NextResponse.json({
      photos: photos || [],
      kind,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' }
    });
  } catch (err) {
    console.error('Photo bank GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/montree/photo-bank
 * Upload one or more photos.
 * Body: multipart/form-data with 'files' field
 *
 * 🚨 PUBLIC ENDPOINT — no login required.
 * The library page (/montree/library/photo-bank) is a shared community
 * resource. Anyone can browse, anyone can contribute. Per Session 117
 * user feedback: 'anyone should be able to drop anything in here'.
 *
 * Spam controls (defense-in-depth):
 *   1. IP rate-limit: 5 uploads / 15 minutes (checkRateLimit).
 *   2. JPEG-only (validateJpegPhoto — rejects PNG/HEIC/WebP/GIF/AVIF).
 *   3. 10 MB per-file cap.
 *   4. Filename sanitization on the storage path.
 *   5. is_public + is_approved default true (matches existing behaviour);
 *      a future moderation pass can flip is_approved to false on
 *      anonymous uploads if abuse becomes a concern.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();

    // IP rate-limit. Same posture as the demo-request public form.
    // Anonymous uploads are inherent to a public picture bank — rate
    // limit by IP gives us the spam guard without a login gate.
    const { checkRateLimit } = await import('@/lib/rate-limiter');
    const { getClientIP } = await import('@/lib/montree/audit-logger');
    const ip = getClientIP(request.headers);
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase,
      ip,
      '/api/montree/photo-bank',
      5,
      15
    );
    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Too many uploads. Please try again in a few minutes.',
        },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const uploadedBy = (formData.get('uploaded_by') as string) || 'public';

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Fetch categories ONCE upfront (not per file)
    let categoryList: Array<{ name: string; keywords: string[] | null }> = [];
    try {
      const { data: cats } = await supabase
        .from('montree_photo_categories')
        .select('name, keywords');
      categoryList = cats || [];
    } catch { /* use empty list */ }

    // Process all files in parallel (each file is independent)
    const results = await Promise.all(
      files.map(async (file, idx): Promise<{ success: boolean; filename: string; error?: string; photo?: Record<string, unknown> }> => {
        // Validate file is JPEG (mime + extension). Same helper used by /api/montree/media/upload.
        const jpegError = validateJpegPhoto({ name: file.name, type: file.type });
        if (jpegError) {
          return { success: false, filename: file.name, error: jpegError };
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          return { success: false, filename: file.name, error: 'File too large (max 10MB)' };
        }

        // Clean label from filename
        const label = file.name
          .replace(/\.[^/.]+$/, '')     // remove extension
          .replace(/[-_]/g, ' ')         // replace dashes/underscores with spaces
          .replace(/\s+/g, ' ')          // normalize spaces
          .trim();

        // Auto-categorize using pre-fetched categories
        const category = categorizeFast(categoryList, label.toLowerCase());

        // Generate tags from label
        const tags = generateTags(label);

        // Upload to Supabase storage
        const timestamp = Date.now() + idx; // unique per file
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `photos/${timestamp}_${sanitizedName}`;

        try {
          const buffer = Buffer.from(await file.arrayBuffer());

          const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, buffer, {
              contentType: file.type,
              upsert: false,
            });

          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            return { success: false, filename: file.name, error: 'Upload failed' };
          }

          // Get public URL
          const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
          const publicUrl = urlData.publicUrl;

          // Insert into database
          const { data: photo, error: dbError } = await supabase
            .from('montree_photo_bank')
            .insert({
              filename: file.name,
              label: label.toLowerCase(),
              tags,
              category,
              storage_path: storagePath,
              public_url: publicUrl,
              file_size: file.size,
              mime_type: file.type,
              uploaded_by: uploadedBy,
              is_public: true,
              is_approved: true,
            })
            .select()
            .single();

          if (dbError) {
            console.error('DB insert error:', dbError);
            return { success: false, filename: file.name, error: 'Database error' };
          }

          return { success: true, filename: file.name, photo };
        } catch (err) {
          console.error('File processing error:', err);
          return { success: false, filename: file.name, error: 'Processing error' };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    return NextResponse.json({
      message: `${successCount}/${files.length} photos uploaded successfully`,
      results,
    });
  } catch (err) {
    console.error('Photo bank POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/montree/photo-bank
 *
 * Two modes:
 *   1. Single delete: `?id=<uuid>` (legacy, preserved for back-compat)
 *   2. Bulk delete:   POST-style body `{ ids: [<uuid>, …] }` (max 100 per call)
 *
 * Both flows: look up storage_path + thumbnail_path, remove from storage,
 * then delete the DB row(s). Per-row failures don't compound — bulk mode
 * returns a summary `{ deleted, failed, results }` so the caller can show
 * partial success.
 *
 * Auth: any authenticated school user (the picture bank is shared across
 * schools, so we don't enforce per-school ownership — matches the POST gate).
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BULK_DELETE = 100;

export async function DELETE(request: NextRequest) {
  try {
    const { verifySchoolRequest } = await import('@/lib/montree/verify-request');
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const singleId = searchParams.get('id')?.trim() || '';

    // Bulk mode: accept JSON body with { ids: [...] }
    let bulkIds: string[] = [];
    if (!singleId) {
      try {
        const body = await request.json();
        if (Array.isArray(body?.ids)) {
          bulkIds = body.ids.filter((x: unknown): x is string => typeof x === 'string').map((x: string) => x.trim()).filter(Boolean);
        }
      } catch {
        // No JSON body — fall through to single mode handling (which will 400 on missing id)
      }
    }

    if (bulkIds.length > 0) {
      // Bulk delete path
      if (bulkIds.length > MAX_BULK_DELETE) {
        return NextResponse.json({ error: `Max ${MAX_BULK_DELETE} ids per bulk delete` }, { status: 400 });
      }
      // Validate every id is a UUID before the DB hit.
      const invalid = bulkIds.find((id) => !UUID_RE.test(id));
      if (invalid) {
        return NextResponse.json({ error: 'One or more ids are not valid UUIDs' }, { status: 400 });
      }

      // Look up all rows in one query so we can collect storage paths.
      const { data: rows, error: fetchError } = await supabase
        .from('montree_photo_bank')
        .select('id, storage_path, thumbnail_path')
        .in('id', bulkIds);

      if (fetchError) {
        console.error('Photo bank bulk fetch error:', fetchError);
        return NextResponse.json({ error: 'Failed to look up photos' }, { status: 500 });
      }

      const foundIds = new Set((rows || []).map((r) => r.id));
      const notFound = bulkIds.filter((id) => !foundIds.has(id));

      // Collect every storage path in one shot. Each row contributes up to 2
      // paths (the photo + its thumbnail).
      const storagePaths: string[] = [];
      (rows || []).forEach((r) => {
        if (r.storage_path) storagePaths.push(r.storage_path);
        if (r.thumbnail_path) storagePaths.push(r.thumbnail_path);
      });

      // Best-effort storage cleanup. We don't fail the request if storage
      // removal hiccups — the DB row deletion is what matters for the user.
      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage.from(BUCKET).remove(storagePaths);
        if (storageError) {
          console.warn('[photo-bank] bulk storage cleanup warning:', storageError);
        }
      }

      // One bulk DB delete via .in().
      const { error: deleteError, count } = await supabase
        .from('montree_photo_bank')
        .delete({ count: 'exact' })
        .in('id', bulkIds);

      if (deleteError) {
        console.error('Photo bank bulk DB delete error:', deleteError);
        return NextResponse.json({ error: 'Failed to delete photos' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        deleted: count ?? foundIds.size,
        failed: 0,
        not_found: notFound,
      });
    }

    // Single delete path (legacy).
    if (!UUID_RE.test(singleId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    // Look up the row to get its storage_path before we delete the DB row
    const { data: row, error: fetchError } = await supabase
      .from('montree_photo_bank')
      .select('id, storage_path, thumbnail_path')
      .eq('id', singleId)
      .maybeSingle();

    if (fetchError) {
      console.error('Photo bank fetch error before delete:', fetchError);
      return NextResponse.json({ error: 'Failed to look up photo' }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Best-effort storage cleanup. We collect any paths and remove them.
    const paths = [row.storage_path, row.thumbnail_path].filter((p): p is string => Boolean(p));
    if (paths.length > 0) {
      const { error: storageError } = await supabase.storage.from(BUCKET).remove(paths);
      if (storageError) {
        // Don't block the DB delete on a missing storage object — just log.
        console.warn('Photo bank storage cleanup warning for', singleId, storageError);
      }
    }

    // Delete the DB row
    const { error: deleteError } = await supabase
      .from('montree_photo_bank')
      .delete()
      .eq('id', singleId);

    if (deleteError) {
      console.error('Photo bank DB delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: singleId });
  } catch (err) {
    console.error('Photo bank DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Categorize a photo synchronously using pre-fetched category keywords
 */
function categorizeFast(categories: Array<{ name: string; keywords: string[] | null }>, labelLower: string): string {
  for (const cat of categories) {
    if (cat.keywords && Array.isArray(cat.keywords)) {
      for (const keyword of cat.keywords) {
        if (labelLower.includes(keyword)) {
          return cat.name;
        }
      }
    }
  }
  return 'general';
}

/**
 * Generate search tags from a label
 * e.g. "Big Red Cat" → ["big", "red", "cat", "big red cat"]
 */
function generateTags(label: string): string[] {
  const words = label.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  const tags = [...new Set([...words, label.toLowerCase()])];
  return tags;
}
