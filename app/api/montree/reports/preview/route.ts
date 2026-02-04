// /api/montree/reports/preview/route.ts
// GET - Generate full report preview with parent descriptions and photos

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Fallback descriptions for common Montessori works when database has none
const FALLBACK_DESCRIPTIONS: Record<string, { description: string; why_it_matters: string }> = {
  'hand washing': {
    description: 'Your child is learning the important routine of hand washing - using soap, scrubbing thoroughly, rinsing, and drying. This essential life skill promotes health and independence.',
    why_it_matters: 'Hand washing teaches children to take care of their health independently. The step-by-step process develops sequencing skills and builds confidence in self-care.'
  },
  'lacing': {
    description: 'Your child is practicing lacing on a wooden frame. This challenging work develops fine motor skills and hand-eye coordination essential for writing.',
    why_it_matters: 'Lacing develops the pincer grip and bilateral coordination needed for writing, while building patience and concentration.'
  },
  'pouring': {
    description: 'Your child is learning to pour with control and precision. This practical life activity develops hand-eye coordination and prepares for serving independently.',
    why_it_matters: 'Pouring activities build concentration, independence, and the motor control needed for daily tasks.'
  },
  'button': {
    description: 'Your child is practicing buttoning skills on a wooden frame. This precise work develops fine motor control needed for dressing independently.',
    why_it_matters: 'Buttoning develops finger dexterity and builds the independence needed for self-care.'
  },
  'zipper': {
    description: 'Your child is practicing zipping on a wooden frame. This common fastener requires coordination of both hands working together.',
    why_it_matters: 'Zipper work develops bilateral coordination and prepares children for independence with jackets and bags.'
  },
  'sandpaper': {
    description: 'Your child is tracing sandpaper letters, learning letter shapes through touch. This multi-sensory approach connects the feel of letters with their sounds.',
    why_it_matters: 'Sandpaper letters engage muscle memory for letter formation, making writing more natural when children begin with pencils.'
  },
  'counting': {
    description: 'Your child is working on counting activities, building number sense through hands-on materials that make quantities concrete and real.',
    why_it_matters: 'Concrete counting builds the foundation for all mathematical understanding, making abstract numbers meaningful.'
  },
  'puzzle': {
    description: 'Your child is working with puzzles that teach vocabulary and develop fine motor skills through hands-on exploration.',
    why_it_matters: 'Puzzle work develops visual discrimination, concentration, and teaches scientific or geographic vocabulary.'
  },
  'practical life': {
    description: 'Your child is engaged in practical life activities that build independence, concentration, and fine motor skills through real-world tasks.',
    why_it_matters: 'Practical life activities develop self-confidence and the coordination needed for academic work.'
  },
  'sensorial': {
    description: 'Your child is exploring sensorial materials that refine the senses and develop careful observation skills.',
    why_it_matters: 'Sensorial work builds the perceptual skills that underlie reading, math, and scientific observation.'
  },
  'math': {
    description: 'Your child is working with math materials that make abstract concepts concrete through hands-on manipulation.',
    why_it_matters: 'Concrete math materials build deep understanding that lasts a lifetime.'
  },
  'language': {
    description: 'Your child is developing language skills through activities that build vocabulary, reading, and writing foundations.',
    why_it_matters: 'Strong language skills open doors to learning in every subject area.'
  },
};

// Fuzzy match work name to find best description
// Handles cases like "Dressing Frame Shoes" matching "Lacing Frame" or generic dressing frames
function findBestDescription(
  workName: string,
  descriptions: Map<string, { description: string; why_it_matters: string; originalName: string }>
): { description: string; why_it_matters: string } | null {
  const workNameLower = workName.toLowerCase();

  // 1. Try exact match first
  if (descriptions.has(workNameLower)) {
    return descriptions.get(workNameLower)!;
  }

  // Convert to array for iteration
  const entries = Array.from(descriptions.entries());

  // 2. Try contains match (work name contains guide name or vice versa)
  for (const [guideName, desc] of entries) {
    if (workNameLower.includes(guideName) || guideName.includes(workNameLower)) {
      return desc;
    }
  }

  // 3. Keyword matching - extract key words and find best overlap
  const workWords = workNameLower.split(/[\s\-_]+/).filter(w => w.length > 2);

  // Skip common words
  const skipWords = ['the', 'and', 'for', 'with', 'frame', 'box', 'set', 'work', 'board', 'cards'];
  const meaningfulWorkWords = workWords.filter(w => !skipWords.includes(w));

  let bestMatch: { desc: { description: string; why_it_matters: string }; score: number } | null = null;

  for (const [guideName, desc] of entries) {
    const guideWords = guideName.split(/[\s\-_]+/).filter(w => w.length > 2);

    // Count overlapping words
    let score = 0;
    for (const word of meaningfulWorkWords) {
      for (const guideWord of guideWords) {
        if (guideWord.includes(word) || word.includes(guideWord)) {
          score += 1;
        }
      }
    }

    // Special keyword matching for Montessori materials
    const keywordMatches: Record<string, string[]> = {
      'dressing': ['frame', 'velcro', 'snaps', 'buttons', 'zipper', 'buckles', 'lacing', 'bow'],
      'geometry': ['geometric', 'cabinet', 'solids', 'triangles'],
      'number': ['numbers', 'rods', 'beads', 'spindle', 'cards'],
      'color': ['colours', 'tablets', 'box'],
      'sound': ['bells', 'cylinders', 'boxes'],
      'touch': ['tablets', 'boards', 'fabrics'],
    };

    for (const [keyword, relatedWords] of Object.entries(keywordMatches)) {
      if (workNameLower.includes(keyword)) {
        for (const related of relatedWords) {
          if (guideName.includes(related)) {
            score += 0.5;
          }
        }
      }
    }

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { desc, score };
    }
  }

  if (bestMatch) {
    return bestMatch.desc;
  }

  // 4. Try fallback descriptions based on keywords in work name
  for (const [keyword, fallbackDesc] of Object.entries(FALLBACK_DESCRIPTIONS)) {
    if (workNameLower.includes(keyword)) {
      return fallbackDesc;
    }
  }

  // 5. Try to determine area and provide generic description
  const areaKeywords: Record<string, string> = {
    'frame': 'practical life',
    'pour': 'practical life',
    'wash': 'practical life',
    'polish': 'practical life',
    'fold': 'practical life',
    'cut': 'practical life',
    'tablet': 'sensorial',
    'cylinder': 'sensorial',
    'tower': 'sensorial',
    'bead': 'math',
    'number': 'math',
    'spindle': 'math',
    'rod': 'math',
    'letter': 'language',
    'alphabet': 'language',
    'phonetic': 'language',
    'puzzle': 'puzzle',
  };

  for (const [keyword, area] of Object.entries(areaKeywords)) {
    if (workNameLower.includes(keyword)) {
      return FALLBACK_DESCRIPTIONS[area] || null;
    }
  }

  return null;
}

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

    for (const work of curriculumWorks || []) {
      workIdToInfo.set(work.id, {
        name: work.name,
        area: work.area || 'practical_life',
        description: work.parent_description || '',
        why_it_matters: work.why_it_matters || '',
      });
      workNameToId.set(work.name.toLowerCase(), work.id);
      if (work.parent_description) {
        dbDescriptions.set(work.name.toLowerCase(), {
          description: work.parent_description,
          why_it_matters: work.why_it_matters || '',
          originalName: work.name,
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

      // Get description
      let desc = findBestDescription(p.work_name || '', dbDescriptions);
      if (!desc && dbDescriptions.has(workNameLower)) {
        desc = dbDescriptions.get(workNameLower)!;
      }

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
