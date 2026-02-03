// /api/montree/reports/available-photos/route.ts
// GET - Get all available photos for a child to select for report

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');

    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    // Get child info including classroom_id
    const { data: child } = await supabase
      .from('montree_children')
      .select('id, classroom_id')
      .eq('id', childId)
      .single();

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Get ALL photos for this child from montree_media table
    const { data: mediaPhotos } = await supabase
      .from('montree_media')
      .select('id, storage_path, thumbnail_path, work_id, caption, captured_at')
      .eq('child_id', childId)
      .eq('media_type', 'photo')
      .order('captured_at', { ascending: false });

    // Also check junction table for group photos where child is included
    const { data: groupPhotos } = await supabase
      .from('montree_media_children')
      .select(`
        media:montree_media (
          id, storage_path, thumbnail_path, work_id, caption, captured_at
        )
      `)
      .eq('child_id', childId);

    // Combine both photo sources
    const allMediaPhotos = [
      ...(mediaPhotos || []),
      ...(groupPhotos || []).map((gp: any) => gp.media).filter(Boolean)
    ];

    // Deduplicate by media id
    const photoMap = new Map();
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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const allPhotos = Array.from(photoMap.values()).map((p: any) => ({
      id: p.id,  // Actual media ID
      url: p.storage_path ? `${supabaseUrl}/storage/v1/object/public/montree-media/${p.storage_path}` : null,
      work_name: p.work_id ? workIdToName.get(p.work_id) : null,
      caption: p.caption,
      created_at: p.captured_at,
    }));

    return NextResponse.json({
      success: true,
      photos: allPhotos,
    });
  } catch (error) {
    console.error('Available photos error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
