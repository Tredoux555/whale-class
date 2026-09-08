// /api/montree/reports/available-photos/route.ts
// GET - Get all available photos for a child to select for report

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';
import { one } from '@/lib/supabase-embed';

/**
 * One photo row, as selected by the two queries below. `parent_visible` and
 * `tags` come only from the direct query — the group-photo embed does not select
 * them — so both are optional.
 */
interface AvailablePhotoRow {
  id: string;
  storage_path: string | null;
  thumbnail_path: string | null;
  work_id: string | null;
  caption: string | null;
  captured_at: string | null;
  parent_visible?: boolean | null;
  tags?: string[] | null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');

    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    // SECURITY: Verify child belongs to the authenticated user's school
    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get child info including classroom_id
    const { data: child } = await supabase
      .from('montree_children')
      .select('id, classroom_id')
      .eq('id', childId)
      .maybeSingle();

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Get ALL photos for this child from montree_media table
    const { data: rawMediaPhotos } = await supabase
      .from('montree_media')
      .select<string, AvailablePhotoRow>('id, storage_path, thumbnail_path, work_id, caption, captured_at, parent_visible, tags')
      .eq('child_id', childId)
      .eq('media_type', 'photo')
      .is('archived_at', null)
      // Exclude pending_review photos — not yet teacher-approved, so they
      // shouldn't be selectable for parent reports.
      .or('identification_status.is.null,identification_status.neq.pending_review')
      .order('captured_at', { ascending: false });
    // Filter out reference photos in JS (PostgREST .or() has issues with JSONB array syntax)
    const mediaPhotos: AvailablePhotoRow[] = (rawMediaPhotos || []).filter((m) => {
      if (!m.tags) return true;
      if (Array.isArray(m.tags) && m.tags.includes('reference_photo')) return false;
      return true;
    });

    // Also check junction table for group photos where child is included
    const { data: groupPhotos } = await supabase
      .from('montree_media_children')
      .select<string, { media: AvailablePhotoRow | AvailablePhotoRow[] | null }>(`
        media:montree_media (
          id, storage_path, thumbnail_path, work_id, caption, captured_at
        )
      `)
      .eq('child_id', childId);

    // Combine both photo sources. The group-photo embed is an object at runtime
    // but typed as possibly-an-array, so it goes through one().
    const allMediaPhotos: AvailablePhotoRow[] = [
      ...(mediaPhotos || []),
      ...(groupPhotos || []).flatMap((gp) => {
        const media = one(gp.media);
        return media ? [media] : [];
      }),
    ];

    // Deduplicate by media id
    const photoMap = new Map<string, AvailablePhotoRow>();
    for (const p of allMediaPhotos) {
      if (!photoMap.has(p.id)) {
        photoMap.set(p.id, p);
      }
    }

    // Get curriculum works to map work_id to work_name
    const { data: curriculumWorksForPhotos } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name')
      .eq('classroom_id', child.classroom_id);

    const workIdToName = new Map<string, string>();
    for (const w of curriculumWorksForPhotos || []) {
      workIdToName.set(w.id, w.name);
    }

    // Transform media photos to have work_name and proper URL
    const allPhotos = Array.from(photoMap.values()).map((p) => ({
      id: p.id,  // Actual media ID
      url: p.storage_path ? getProxyUrl(p.storage_path) : null,
      work_name: p.work_id ? workIdToName.get(p.work_id) ?? null : null,
      caption: p.caption,
      created_at: p.captured_at,
      parent_visible: p.parent_visible !== false, // Default true for backward compat
    }));

    const response = NextResponse.json({
      success: true,
      photos: allPhotos,
    });
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
    return response;
  } catch (error) {
    console.error('Available photos error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
