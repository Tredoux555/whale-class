// /api/montree/community/works/route.ts
// GET: Public browse (no auth) + POST: Create new work (with contributor info)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminPassword } from '@/lib/verify-super-admin';
import { loadAllCurriculumWorks } from '@/lib/montree/curriculum-loader';

// Build sequence map once at module load (work_key -> sequence number)
let _sequenceMap: Map<string, number> | null = null;
function getSequenceMap(): Map<string, number> {
  if (!_sequenceMap) {
    _sequenceMap = new Map();
    try {
      const works = loadAllCurriculumWorks();
      works.forEach(w => _sequenceMap!.set(w.work_key, w.sequence));
    } catch { /* fallback: no sequence data */ }
  }
  return _sequenceMap;
}

// GET - Public browse with filters, search, pagination
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);

    const area = searchParams.get('area');
    const search = searchParams.get('search');
    const age = searchParams.get('age');
    const sort = searchParams.get('sort') || 'newest';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 500);
    const requestedStatus = searchParams.get('status') || 'approved';
    const standard_work_id = searchParams.get('standard_work_id');
    const offset = (page - 1) * limit;

    // Non-approved statuses require admin auth
    let status = 'approved';
    if (requestedStatus !== 'approved') {
      const adminPw = request.headers.get('x-admin-password') || '';
      if (adminPw && verifySuperAdminPassword(adminPw).valid) {
        status = requestedStatus;
      }
      // If no valid admin password, silently fall back to 'approved'
    }

    let query = supabase
      .from('montree_community_works')
      .select('*', { count: 'exact' })
      .eq('status', status);

    // Filters
    if (area && area !== 'all') {
      query = query.eq('area', area);
    }
    if (age && age !== 'all') {
      // Validate age against allowed values to prevent .or() injection
      const VALID_AGES = ['primary_year1', 'primary_year2', 'primary_year3'];
      if (VALID_AGES.includes(age)) {
        query = query.or(`age_range.eq.${age},age_range.eq.all`);
      }
    }
    if (standard_work_id) {
      query = query.eq('standard_work_id', standard_work_id);
    }
    if (search) {
      // Sanitize search to prevent query manipulation via special chars in .or()
      const safeSearch = search.replace(/[%,()]/g, '').trim().slice(0, 100);
      if (safeSearch) {
        query = query.or(
          `title.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%,detailed_description.ilike.%${safeSearch}%,category.ilike.%${safeSearch}%`
        );
      }
    }

    // Sort
    switch (sort) {
      case 'downloads':
        query = query.order('download_count', { ascending: false });
        break;
      case 'injected':
        query = query.order('inject_count', { ascending: false });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'curriculum':
      default:
        // For curriculum sort, we fetch all matching works and sort in memory
        // using the authoritative sequence from the static JSON curriculum data
        query = query.order('created_at', { ascending: true });
        break;
    }

    // For curriculum sort: fetch ALL matching, sort in memory, then paginate
    // For other sorts: use DB pagination directly
    if (sort === 'curriculum') {
      // Remove range — fetch all matches
      const { data: allData, count, error: fetchAllErr } = await query;
      if (fetchAllErr) {
        console.error('Community works fetch error:', fetchAllErr);
        return NextResponse.json({ error: 'Failed to fetch works' }, { status: 500 });
      }

      const seqMap = getSequenceMap();
      const sorted = (allData || []).sort((a: any, b: any) => {
        const seqA = seqMap.get(a.standard_work_id) ?? 999999;
        const seqB = seqMap.get(b.standard_work_id) ?? 999999;
        if (seqA !== seqB) return seqA - seqB;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      const paginated = sorted.slice(offset, offset + limit);

      // View count increment (fire and forget)
      if (paginated.length > 0) {
        for (const w of paginated) {
          supabase.from('montree_community_works').update({ view_count: (w.view_count || 0) + 1 }).eq('id', w.id).then(() => {});
        }
      }

      return NextResponse.json({
        works: paginated,
        total: count || sorted.length,
        page,
        limit,
        totalPages: Math.ceil((count || sorted.length) / limit),
      });
    }

    // Non-curriculum sorts: use DB pagination
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Community works fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch works' }, { status: 500 });
    }

    // Increment view counts for returned works (fire and forget, one at a time to avoid race conditions)
    if (data && data.length > 0) {
      for (const w of data) {
        supabase
          .from('montree_community_works')
          .update({ view_count: (w.view_count || 0) + 1 })
          .eq('id', w.id)
          .then(() => {});
      }
    }

    return NextResponse.json({
      works: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Community works API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new community work (contributor submits)
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const formData = await request.formData();

    // Extract text fields
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const detailed_description = formData.get('detailed_description') as string;
    const area = formData.get('area') as string;
    const category = formData.get('category') as string;
    const age_range = formData.get('age_range') as string || 'all';
    const materials = JSON.parse(formData.get('materials') as string || '[]');
    const direct_aims = JSON.parse(formData.get('direct_aims') as string || '[]');
    const indirect_aims = JSON.parse(formData.get('indirect_aims') as string || '[]');
    const control_of_error = formData.get('control_of_error') as string;
    const prerequisites = JSON.parse(formData.get('prerequisites') as string || '[]');
    const presentation_steps = JSON.parse(formData.get('presentation_steps') as string || '[]');
    const variations = JSON.parse(formData.get('variations') as string || '[]');
    const extensions = JSON.parse(formData.get('extensions') as string || '[]');
    const contributor_name = formData.get('contributor_name') as string;
    const contributor_email = formData.get('contributor_email') as string;
    const contributor_school = formData.get('contributor_school') as string;
    const contributor_country = formData.get('contributor_country') as string;
    const contributor_teacher_id = formData.get('contributor_teacher_id') as string;
    const standard_work_id = formData.get('standard_work_id') as string;
    const is_variation = formData.get('is_variation') === 'true';

    // Validation
    if (!title || title.length > 200) {
      return NextResponse.json({ error: 'Title required (max 200 chars)' }, { status: 400 });
    }
    if (!description || description.length > 2000) {
      return NextResponse.json({ error: 'Description required (max 2000 chars)' }, { status: 400 });
    }
    if (!area || !['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'].includes(area)) {
      return NextResponse.json({ error: 'Valid area required' }, { status: 400 });
    }
    if (!contributor_name || contributor_name.length > 100) {
      return NextResponse.json({ error: 'Contributor name required (max 100 chars)' }, { status: 400 });
    }
    if (detailed_description && detailed_description.length > 10000) {
      return NextResponse.json({ error: 'Detailed description too long (max 10000 chars)' }, { status: 400 });
    }

    // Create the work record first (status: pending)
    const workRecord = {
      title,
      description,
      detailed_description: detailed_description || null,
      area,
      category: category || null,
      age_range,
      materials,
      direct_aims,
      indirect_aims,
      control_of_error: control_of_error || null,
      prerequisites,
      presentation_steps,
      variations,
      extensions,
      contributor_name,
      contributor_email: contributor_email || null,
      contributor_school: contributor_school || null,
      contributor_country: contributor_country || null,
      contributor_teacher_id: contributor_teacher_id || null,
      standard_work_id: standard_work_id || null,
      is_variation,
      status: 'pending',
      photos: [],
      videos: [],
      pdfs: [],
    };

    const { data: work, error: insertError } = await supabase
      .from('montree_community_works')
      .insert(workRecord)
      .select()
      .single();

    if (insertError) {
      console.error('Community work insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create work' }, { status: 500 });
    }

    // Sanitize file extension helper (alphanumeric only, max 5 chars)
    const sanitizeExt = (name: string, fallback: string) => {
      const raw = name.split('.').pop() || fallback;
      return raw.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5) || fallback;
    };

    // File size limits (bytes)
    const MAX_PHOTO_SIZE = 10 * 1024 * 1024;  // 10MB
    const MAX_VIDEO_SIZE = 50 * 1024 * 1024;   // 50MB
    const MAX_PDF_SIZE = 20 * 1024 * 1024;     // 20MB

    // Upload photos (up to 10)
    const photos: Array<{ storage_path: string; thumbnail_path: string | null; caption: string; sequence: number }> = [];
    for (let i = 0; i < 10; i++) {
      const photo = formData.get(`photo_${i}`) as File | null;
      if (!photo) break;

      if (photo.size > MAX_PHOTO_SIZE) continue; // Skip oversized photos silently

      const ext = sanitizeExt(photo.name, 'jpg');
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const storagePath = `community/${work.id}/photos/${filename}`;

      const buffer = await photo.arrayBuffer();
      const { error: uploadErr } = await supabase.storage
        .from('montree-media')
        .upload(storagePath, buffer, {
          contentType: photo.type || 'image/jpeg',
          upsert: false,
        });

      if (!uploadErr) {
        const caption = formData.get(`photo_${i}_caption`) as string || '';
        photos.push({ storage_path: storagePath, thumbnail_path: null, caption, sequence: i });
      }
    }

    // Upload videos (up to 2)
    const videos: Array<{ storage_path: string; thumbnail_path: string | null; caption: string; duration: number | null }> = [];
    for (let i = 0; i < 2; i++) {
      const video = formData.get(`video_${i}`) as File | null;
      if (!video) break;

      if (video.size > MAX_VIDEO_SIZE) continue; // Skip oversized videos

      const ext = sanitizeExt(video.name, 'mp4');
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const storagePath = `community/${work.id}/videos/${filename}`;

      const buffer = await video.arrayBuffer();
      const { error: uploadErr } = await supabase.storage
        .from('montree-media')
        .upload(storagePath, buffer, {
          contentType: video.type || 'video/mp4',
          upsert: false,
        });

      if (!uploadErr) {
        const caption = formData.get(`video_${i}_caption`) as string || '';
        videos.push({ storage_path: storagePath, thumbnail_path: null, caption, duration: null });
      }
    }

    // Upload PDFs (up to 3)
    const pdfs: Array<{ storage_path: string; filename: string; description: string }> = [];
    for (let i = 0; i < 3; i++) {
      const pdf = formData.get(`pdf_${i}`) as File | null;
      if (!pdf) break;

      if (pdf.size > MAX_PDF_SIZE) continue; // Skip oversized PDFs

      // Sanitize PDF filename (keep alphanumeric, hyphens, underscores, dots)
      const safePdfName = pdf.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
      const filename = `${Date.now()}-${safePdfName}`;
      const storagePath = `community/${work.id}/pdfs/${filename}`;

      const buffer = await pdf.arrayBuffer();
      const { error: uploadErr } = await supabase.storage
        .from('montree-media')
        .upload(storagePath, buffer, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (!uploadErr) {
        const desc = formData.get(`pdf_${i}_description`) as string || pdf.name;
        pdfs.push({ storage_path: storagePath, filename: pdf.name, description: desc });
      }
    }

    // Update work with media paths
    if (photos.length > 0 || videos.length > 0 || pdfs.length > 0) {
      await supabase
        .from('montree_community_works')
        .update({ photos, videos, pdfs })
        .eq('id', work.id);
    }

    return NextResponse.json({
      success: true,
      work: { ...work, photos, videos, pdfs },
      message: 'Work submitted for review! It will appear in the library once approved.',
    });
  } catch (error) {
    console.error('Community work POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
