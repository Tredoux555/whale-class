// /api/montree/photo-bank/route.ts
// Picture Bank API — Search, browse, and upload pictures for the Montree picture library
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

const BUCKET = 'photo-bank';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

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
        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
          return { success: false, filename: file.name, error: 'Unsupported file type' };
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
