// /lib/montree/photos.ts
// Centralized photo retrieval for Montree
// Photos are stored in montree_media (NOT montree_child_photos which is legacy)

import { SupabaseClient } from '@supabase/supabase-js';

export interface ChildPhoto {
  id: string;
  url: string | null;
  thumbnail_url: string | null;
  work_name: string | null;
  work_id: string | null;
  caption: string | null;
  created_at: string | null;
}

/**
 * Get all photos for a child from montree_media table
 * Includes both direct photos and group photos the child is in
 */
export async function getChildPhotos(
  supabase: SupabaseClient,
  childId: string,
  classroomId?: string
): Promise<ChildPhoto[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Get direct photos for this child
  const { data: directPhotos } = await supabase
    .from('montree_media')
    .select('id, storage_path, thumbnail_path, work_id, caption, captured_at')
    .eq('child_id', childId)
    .eq('media_type', 'photo');

  // Get group photos that include this child
  const { data: groupPhotos } = await supabase
    .from('montree_media_children')
    .select(`
      media:montree_media (
        id, storage_path, thumbnail_path, work_id, caption, captured_at
      )
    `)
    .eq('child_id', childId);

  // Combine both sources
  const allMedia = [
    ...(directPhotos || []),
    ...(groupPhotos || []).map((gp: any) => gp.media).filter(Boolean)
  ];

  // Get work_id to work_name mapping if we have classroom_id
  const workIdToName = new Map<string, string>();
  if (classroomId) {
    const { data: works } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name')
      .eq('classroom_id', classroomId);

    for (const w of works || []) {
      workIdToName.set(w.id, w.name);
    }
  }

  // Transform to standard photo format
  return allMedia.map((p: any) => ({
    id: p.id,
    url: p.storage_path
      ? `${supabaseUrl}/storage/v1/object/public/montree-media/${p.storage_path}`
      : null,
    thumbnail_url: p.thumbnail_path
      ? `${supabaseUrl}/storage/v1/object/public/montree-media/${p.thumbnail_path}`
      : null,
    work_name: p.work_id ? workIdToName.get(p.work_id) || null : null,
    work_id: p.work_id || null,
    caption: p.caption || null,
    created_at: p.captured_at || null,
  }));
}

/**
 * Match photos to works by work_name (case-insensitive)
 */
export function matchPhotoToWork(
  photos: ChildPhoto[],
  workName: string
): ChildPhoto | null {
  const workNameLower = workName.toLowerCase();
  return photos.find(p => p.work_name?.toLowerCase() === workNameLower) || null;
}
