import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const supabase = getSupabase();
  const { childId } = await params;

  // Fetch from BOTH media tables for complete portfolio
  
  // 1. child_work_media (has work_name directly)
  const { data: legacyMedia, error: legacyError } = await supabase
    .from('child_work_media')
    .select('id, media_type, media_url, work_name, work_id, taken_at, notes, category')
    .eq('child_id', childId)
    .order('taken_at', { ascending: false })
    .limit(100);

  if (legacyError) {
    console.error('Fetch child_work_media error:', legacyError);
  }

  // 2. montree_media (needs join with curriculum for work_name)
  const { data: montreeMedia, error: montreeError } = await supabase
    .from('montree_media')
    .select(`
      id,
      media_type,
      storage_path,
      work_id,
      caption,
      captured_at,
      tags
    `)
    .eq('child_id', childId)
    .order('captured_at', { ascending: false })
    .limit(100);

  if (montreeError) {
    console.error('Fetch montree_media error:', montreeError);
  }

  // Get work names for montree_media items that have work_id
  const workIds = (montreeMedia || [])
    .filter(m => m.work_id)
    .map(m => m.work_id);
  
  let workNames: Record<string, string> = {};
  if (workIds.length > 0) {
    const { data: works } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name')
      .in('id', workIds);
    
    if (works) {
      workNames = works.reduce((acc, w) => {
        acc[w.id] = w.name;
        return acc;
      }, {} as Record<string, string>);
    }
  }

  // Get public URLs for montree_media storage paths
  const montreeWithUrls = (montreeMedia || []).map(m => {
    const { data: urlData } = supabase.storage
      .from('whale-media')
      .getPublicUrl(m.storage_path);
    
    return {
      id: m.id,
      media_type: m.media_type,
      media_url: urlData.publicUrl,
      work_name: m.work_id ? (workNames[m.work_id] || m.caption || 'Work') : (m.caption || 'Observation'),
      work_id: m.work_id,
      taken_at: m.captured_at,
      notes: null,
      category: 'work',
      source: 'montree' // Track source for debugging
    };
  });

  // Combine and deduplicate (in case same photo is in both tables)
  const legacyWithSource = (legacyMedia || []).map(m => ({ ...m, source: 'legacy' }));
  
  // Merge both arrays
  const allMedia = [...legacyWithSource, ...montreeWithUrls];
  
  // Sort by date (most recent first)
  allMedia.sort((a, b) => {
    const dateA = new Date(a.taken_at || 0).getTime();
    const dateB = new Date(b.taken_at || 0).getTime();
    return dateB - dateA;
  });

  // Limit to 100 total
  const media = allMedia.slice(0, 100);

  return NextResponse.json({
    media,
    counts: {
      total: media.length,
      photos: media.filter(m => m.media_type === 'photo').length,
      videos: media.filter(m => m.media_type === 'video').length,
      legacy: legacyWithSource.length,
      montree: montreeWithUrls.length
    }
  });
}
