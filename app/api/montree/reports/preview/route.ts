// /api/montree/reports/preview/route.ts
// GET - Generate full report preview with parent descriptions and photos

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { loadAllCurriculumWorks } from '@/lib/montree/curriculum-loader';

// Area-based generic descriptions - used as LAST RESORT when no DB description found
// Keyed by area_key from the progress data (always correct - no guessing needed)
const AREA_DESCRIPTIONS: Record<string, { description: string; why_it_matters: string }> = {
  'practical_life': {
    description: 'Your child is developing independence and coordination through hands-on practical life activities in the classroom.',
    why_it_matters: 'Practical life activities build self-confidence, concentration, and the fine motor skills that prepare children for all future learning.'
  },
  'sensorial': {
    description: 'Your child is refining their senses through carefully designed sensorial materials, learning to observe and classify the world around them.',
    why_it_matters: 'Sensorial work builds the perceptual skills that underlie reading, mathematics, and scientific observation.'
  },
  'mathematics': {
    description: 'Your child is exploring mathematical concepts through hands-on materials that make abstract ideas concrete and meaningful.',
    why_it_matters: 'Concrete math materials build deep, lasting understanding that goes far beyond memorisation.'
  },
  'language': {
    description: 'Your child is building language skills through activities that develop vocabulary, reading, and writing foundations.',
    why_it_matters: 'Strong language skills open doors to learning in every area and support confident self-expression.'
  },
  'cultural': {
    description: 'Your child is exploring the world through cultural studies - geography, science, history, art, and music - building curiosity and global awareness.',
    why_it_matters: 'Cultural activities nurture curiosity about the world and help children understand their place in it.'
  },
};

// Safe description matching - only matches when confident
// Uses DB descriptions first, then area-based generic as fallback
function findBestDescription(
  workName: string,
  descriptions: Map<string, { description: string; why_it_matters: string; originalName: string }>,
  area?: string
): { description: string; why_it_matters: string } | null {
  const workNameLower = workName.toLowerCase().trim();

  // 1. Try exact match from DB descriptions
  if (descriptions.has(workNameLower)) {
    return descriptions.get(workNameLower)!;
  }

  // Convert to array for iteration
  const entries = Array.from(descriptions.entries());

  // 2. Try contains match - but ONLY when one name fully contains the other
  //    AND the contained name is at least 10 chars (avoids short keyword false matches)
  for (const [guideName, desc] of entries) {
    if (guideName.length >= 10 && workNameLower.includes(guideName)) {
      return desc;
    }
    if (workNameLower.length >= 10 && guideName.includes(workNameLower)) {
      return desc;
    }
  }

  // 3. Normalized matching - strip common prefixes/suffixes and try again
  const normalize = (s: string) => s
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/\s*-\s*/g, ' ')
    .replace(/\s+(work|activity|exercise|lesson|frame)$/i, '')
    .trim();

  const normalizedWork = normalize(workNameLower);
  for (const [guideName, desc] of entries) {
    const normalizedGuide = normalize(guideName);
    if (normalizedWork === normalizedGuide) {
      return desc;
    }
  }

  // 4. Multi-word keyword match - require at least 2 meaningful words to match
  //    This prevents single-keyword false matches like "sandpaper" matching wrong works
  const skipWords = new Set(['the', 'a', 'an', 'and', 'or', 'for', 'with', 'of', 'in', 'on', 'to']);
  const workWords = workNameLower.split(/[\s\-_]+/).filter(w => w.length > 2 && !skipWords.has(w));

  if (workWords.length >= 2) {
    let bestMatch: { desc: { description: string; why_it_matters: string }; score: number } | null = null;

    for (const [guideName, desc] of entries) {
      const guideWords = guideName.split(/[\s\-_]+/).filter(w => w.length > 2 && !skipWords.has(w));
      let matchCount = 0;
      for (const word of workWords) {
        if (guideWords.some(gw => gw === word || (gw.length > 4 && word.length > 4 && (gw.includes(word) || word.includes(gw))))) {
          matchCount++;
        }
      }
      // Require at least 2 word matches to accept
      if (matchCount >= 2 && (!bestMatch || matchCount > bestMatch.score)) {
        bestMatch = { desc, score: matchCount };
      }
    }

    if (bestMatch) {
      return bestMatch.desc;
    }
  }

  // 5. Area-based generic fallback - uses the KNOWN area from progress data
  //    This is always correct because the area comes from the actual data, not guessing
  if (area) {
    const areaDesc = AREA_DESCRIPTIONS[area];
    if (areaDesc) return areaDesc;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');

    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    // Get child info including classroom_id
    const { data: child } = await supabase
      .from('montree_children')
      .select('id, name, photo_url, classroom_id')
      .eq('id', childId)
      .single();

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // ============================================================
    // STEP 1: Get curriculum works (the source of truth for work info)
    // ============================================================
    const { data: curriculumWorks } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name, area, parent_description, why_it_matters')
      .eq('classroom_id', child.classroom_id);

    // Build lookup maps from curriculum
    const workIdToInfo = new Map<string, { name: string; area: string; description: string; why_it_matters: string }>();
    const workNameToId = new Map<string, string>();
    const dbDescriptions = new Map<string, { description: string; why_it_matters: string; originalName: string }>();

    // Load authoritative descriptions from static curriculum (guaranteed 100% coverage)
    const staticCurriculum = loadAllCurriculumWorks();
    const staticDescriptions = new Map<string, { description: string; why_it_matters: string }>();
    for (const work of staticCurriculum) {
      if (work.parent_description) {
        staticDescriptions.set(work.name.toLowerCase().trim(), {
          description: work.parent_description,
          why_it_matters: work.why_it_matters || '',
        });
      }
    }

    for (const work of curriculumWorks || []) {
      // Try DB description first, then fall back to static curriculum
      const staticDesc = staticDescriptions.get(work.name.toLowerCase().trim());
      const description = work.parent_description || staticDesc?.description || '';
      const whyItMatters = work.why_it_matters || staticDesc?.why_it_matters || '';

      workIdToInfo.set(work.id, {
        name: work.name,
        area: work.area || 'practical_life',
        description,
        why_it_matters: whyItMatters,
      });
      workNameToId.set(work.name.toLowerCase(), work.id);

      // Add to description map if we have ANY description (DB or static)
      if (description) {
        dbDescriptions.set(work.name.toLowerCase(), {
          description,
          why_it_matters: whyItMatters,
          originalName: work.name,
        });
      }
    }

    // Also add static descriptions for works NOT in this classroom's DB
    // (covers edge cases where progress references a work not yet seeded)
    for (const [name, desc] of staticDescriptions) {
      if (!dbDescriptions.has(name)) {
        dbDescriptions.set(name, {
          description: desc.description,
          why_it_matters: desc.why_it_matters,
          originalName: name,
        });
      }
    }

    // ============================================================
    // STEP 2: Get ALL photos for this child
    // ============================================================
    const { data: mediaPhotos } = await supabase
      .from('montree_media')
      .select('id, storage_path, thumbnail_path, work_id, caption, captured_at')
      .eq('child_id', childId)
      .eq('media_type', 'photo');

    // Also check junction table for group photos
    const { data: groupPhotos } = await supabase
      .from('montree_media_children')
      .select(`
        media:montree_media (
          id, storage_path, thumbnail_path, work_id, caption, captured_at
        )
      `)
      .eq('child_id', childId);

    // Combine and deduplicate photos
    const photoMap = new Map();
    for (const p of mediaPhotos || []) {
      photoMap.set(p.id, p);
    }
    for (const gp of groupPhotos || []) {
      if (gp.media) {
        photoMap.set(gp.media.id, gp.media);
      }
    }
    const allMediaPhotos = Array.from(photoMap.values());

    // Transform photos with work info from curriculum (using work_id directly)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const allPhotos = allMediaPhotos.map((p: any) => {
      // Get work info from curriculum using work_id (the reliable connection)
      const workInfo = p.work_id ? workIdToInfo.get(p.work_id) : null;
      return {
        id: p.id,
        work_id: p.work_id,
        url: p.storage_path ? `${supabaseUrl}/storage/v1/object/public/montree-media/${p.storage_path}` : null,
        work_name: workInfo?.name || p.caption || null,
        area: workInfo?.area || null,
        caption: p.caption,
        created_at: p.captured_at,
        is_selected: false, // Will be updated below
      };
    });

    // ============================================================
    // STEP 3: Get selected photos for this week's report
    // ============================================================
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const { data: draftReport } = await supabase
      .from('montree_weekly_reports')
      .select('id')
      .eq('child_id', childId)
      .eq('week_start', weekStartStr)
      .single();

    let selectedPhotoIds: string[] = [];
    if (draftReport) {
      const { data: reportMedia } = await supabase
        .from('montree_report_media')
        .select('media_id, display_order')
        .eq('report_id', draftReport.id)
        .order('display_order', { ascending: true });

      if (reportMedia && reportMedia.length > 0) {
        selectedPhotoIds = reportMedia.map(rm => rm.media_id);
      }
    }

    // Mark selected photos
    for (const photo of allPhotos) {
      photo.is_selected = selectedPhotoIds.includes(photo.id);
    }

    // ============================================================
    // STEP 4: Get progress data
    // ============================================================
    const { data: lastReport } = await supabase
      .from('montree_weekly_reports')
      .select('generated_at')
      .eq('child_id', childId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    const lastReportDate = lastReport?.generated_at || null;
    const showAll = searchParams.get('show_all') === 'true';

    let progressQuery = supabase
      .from('montree_child_progress')
      .select('work_name, area, status, updated_at, presented_at')
      .eq('child_id', childId)
      .neq('status', 'not_started');

    if (showAll) {
      progressQuery = progressQuery.or(`updated_at.gte.${weekStartStr},presented_at.gte.${weekStartStr}`);
    } else if (lastReportDate) {
      progressQuery = progressQuery.or(`updated_at.gt.${lastReportDate},presented_at.gt.${lastReportDate}`);
    }

    let { data: progress } = await progressQuery;

    // Fallback to this week's progress if empty
    if ((!progress || progress.length === 0) && !showAll && lastReportDate) {
      const { data: weekProgress } = await supabase
        .from('montree_child_progress')
        .select('work_name, area, status, updated_at, presented_at')
        .eq('child_id', childId)
        .neq('status', 'not_started')
        .or(`updated_at.gte.${weekStartStr},presented_at.gte.${weekStartStr}`);
      progress = weekProgress;
    }

    // ============================================================
    // STEP 5: BUILD UNIFIED REPORT - Photo-first approach
    // ============================================================
    // Key insight: Start from PHOTOS (they have work_id) and UNION with progress

    // Build a map of work_id -> photos
    const photosByWorkId = new Map<string, typeof allPhotos[0][]>();
    for (const photo of allPhotos) {
      if (photo.work_id) {
        const existing = photosByWorkId.get(photo.work_id) || [];
        existing.push(photo);
        photosByWorkId.set(photo.work_id, existing);
      }
    }

    // Get photos for matching (selected if any, otherwise all)
    const photosForMatching = selectedPhotoIds.length > 0
      ? allPhotos.filter(p => p.is_selected)
      : allPhotos;

    // Build map of selected/available photos by work_id
    const selectedPhotosByWorkId = new Map<string, typeof allPhotos[0]>();
    for (const photo of photosForMatching) {
      if (photo.work_id && !selectedPhotosByWorkId.has(photo.work_id)) {
        selectedPhotosByWorkId.set(photo.work_id, photo);
      }
    }

    // Track which works we've added (by work_id or name)
    const addedWorkIds = new Set<string>();
    const addedWorkNames = new Set<string>();
    const reportItems: Array<{
      work_id: string | null;
      work_name: string;
      area: string;
      status: string;
      photo_url: string | null;
      photo_id: string | null;
      photo_caption: string | null;
      parent_description: string | null;
      why_it_matters: string | null;
      has_description: boolean;
      source: 'progress' | 'photo';
    }> = [];

    // First: Add works from progress
    for (const p of progress || []) {
      const workNameLower = (p.work_name || '').toLowerCase();
      const workId = workNameToId.get(workNameLower);
      const workInfo = workId ? workIdToInfo.get(workId) : null;

      // Find matching photo by work_id (direct match - most reliable)
      let photo = workId ? selectedPhotosByWorkId.get(workId) : null;

      // Fallback: fuzzy name match for photos without work_id
      if (!photo) {
        photo = photosForMatching.find(ph => {
          if (!ph.work_name) return false;
          const photoNameLower = ph.work_name.toLowerCase();
          return photoNameLower === workNameLower ||
                 photoNameLower.includes(workNameLower) ||
                 workNameLower.includes(photoNameLower);
        });
      }

      // Get description - pass the area from progress data for safe fallback
      const progressArea = p.area || workInfo?.area || 'practical_life';
      let desc = findBestDescription(p.work_name || '', dbDescriptions, progressArea);

      reportItems.push({
        work_id: workId || null,
        work_name: p.work_name,
        area: p.area || workInfo?.area || 'practical_life',
        status: p.status === 'completed' ? 'mastered' : p.status,
        photo_url: photo?.url || null,
        photo_id: photo?.id || null,
        photo_caption: photo?.caption || null,
        parent_description: desc?.description || workInfo?.description || null,
        why_it_matters: desc?.why_it_matters || workInfo?.why_it_matters || null,
        has_description: !!(desc || workInfo?.description),
        source: 'progress',
      });

      if (workId) addedWorkIds.add(workId);
      addedWorkNames.add(workNameLower);
    }

    // Second: Add works that have PHOTOS but no progress entry
    // This is the key improvement - photos drive report content too!
    for (const photo of photosForMatching) {
      if (!photo.work_id) continue;
      if (addedWorkIds.has(photo.work_id)) continue; // Already added from progress

      const workInfo = workIdToInfo.get(photo.work_id);
      if (!workInfo) continue; // Unknown work

      // Don't add if work name already added (handles case where progress uses different name)
      if (addedWorkNames.has(workInfo.name.toLowerCase())) continue;

      reportItems.push({
        work_id: photo.work_id,
        work_name: workInfo.name,
        area: workInfo.area || 'practical_life',
        status: 'documented', // Special status: photo exists but no formal progress
        photo_url: photo.url,
        photo_id: photo.id,
        photo_caption: photo.caption,
        parent_description: workInfo.description || null,
        why_it_matters: workInfo.why_it_matters || null,
        has_description: !!workInfo.description,
        source: 'photo',
      });

      addedWorkIds.add(photo.work_id);
      addedWorkNames.add(workInfo.name.toLowerCase());
    }

    // Separate photos by selection status
    const selectedPhotos = allPhotos.filter(p => p.is_selected);
    const availablePhotos = allPhotos.filter(p => !p.is_selected);

    // Identify unassigned photos (photos not matched to any report item)
    const matchedPhotoIds = new Set(reportItems.filter(r => r.photo_id).map(r => r.photo_id));
    const unassignedPhotos = allPhotos.filter(p => p.url && !matchedPhotoIds.has(p.id));

    // Count stats
    const stats = {
      total: reportItems.length,
      with_photos: reportItems.filter(r => r.photo_url).length,
      with_descriptions: reportItems.filter(r => r.has_description).length,
      mastered: reportItems.filter(r => r.status === 'mastered').length,
      practicing: reportItems.filter(r => r.status === 'practicing').length,
      presented: reportItems.filter(r => r.status === 'presented').length,
      documented: reportItems.filter(r => r.status === 'documented').length,
      selected_photos: selectedPhotos.length,
      available_photos: availablePhotos.length,
      has_selections: selectedPhotoIds.length > 0,
      from_progress: reportItems.filter(r => r.source === 'progress').length,
      from_photos: reportItems.filter(r => r.source === 'photo').length,
    };

    return NextResponse.json({
      success: true,
      child_name: child.name,
      child_photo: child.photo_url,
      last_report_date: lastReportDate,
      items: reportItems,
      selected_photos: selectedPhotos,
      available_photos: availablePhotos,
      unassigned_photos: unassignedPhotos,
      all_photos: allPhotos,
      stats,
    });

  } catch (error) {
    console.error('Report preview error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
