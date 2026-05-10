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
 * Query params: q (search), category, page, limit
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);

    const q = searchParams.get('q')?.trim() || '';
    const category = searchParams.get('category') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('montree_photo_bank')
      .select('*', { count: 'exact' })
      .eq('is_public', true)
      .eq('is_approved', true)
      .order('label', { ascending: true });

    // Full-text search on label, tags, category
    if (q) {
      // Use ilike for simple substring matching (more intuitive for users)
      // Also search tags array
      query = query.or(`label.ilike.%${q}%,tags.cs.{${q.toLowerCase()}}`);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: photos, count, error } = await query;

    if (error) {
      console.error('Photo bank query error:', error);
      return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
    }

    // Also fetch categories for the filter UI
    const { data: categories } = await supabase
      .from('montree_photo_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    return NextResponse.json({
      photos: photos || [],
      categories: categories || [],
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
 * Upload one or more photos
 * Body: multipart/form-data with 'files' field
 */
export async function POST(request: NextRequest) {
  try {
    // Auth: teacher-level (any authenticated school user can upload)
    // Was super-admin-only but photo-bank is used by teachers from library page
    // verifySchoolRequest checks httpOnly cookie — sufficient for upload protection
    const { verifySchoolRequest } = await import('@/lib/montree/verify-request');
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
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
 * DELETE /api/montree/photo-bank?id=<uuid>
 * Remove a picture from the bank (storage + DB row).
 * Auth: any authenticated school user (the picture bank is shared across schools,
 * so we don't enforce per-school ownership — matches the POST gate).
 */
export async function DELETE(request: NextRequest) {
  try {
    const { verifySchoolRequest } = await import('@/lib/montree/verify-request');
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id')?.trim() || '';

    // Reject anything that isn't a UUID before hitting the DB
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Look up the row to get its storage_path before we delete the DB row
    const { data: row, error: fetchError } = await supabase
      .from('montree_photo_bank')
      .select('id, storage_path, thumbnail_path')
      .eq('id', id)
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
        console.warn('Photo bank storage cleanup warning for', id, storageError);
      }
    }

    // Delete the DB row
    const { error: deleteError } = await supabase
      .from('montree_photo_bank')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Photo bank DB delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id });
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
