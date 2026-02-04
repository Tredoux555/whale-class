// /api/montree/reports/preview/route.ts
// GET - Generate full report preview with parent descriptions and photos

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

  return bestMatch?.desc || null;
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

    // Get descriptions from classroom curriculum as fallback
    const { data: curriculumWorks } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('name, parent_description, why_it_matters')
      .eq('classroom_id', child.classroom_id);

    // Build DB descriptions map for fuzzy matching
    const dbDescriptions = new Map<string, { description: string; why_it_matters: string; originalName: string }>();
    for (const work of curriculumWorks || []) {
      if (work.name && work.parent_description) {
        dbDescriptions.set(work.name.toLowerCase(), {
          description: work.parent_description,
          why_it_matters: work.why_it_matters || '',
          originalName: work.name,
        });
      }
    }

    // Get last report date
    const { data: lastReport } = await supabase
      .from('montree_weekly_reports')
      .select('generated_at')
      .eq('child_id', childId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    const lastReportDate = lastReport?.generated_at || null;

    // Check if user wants to see all progress or just unreported
    const showAll = searchParams.get('show_all') === 'true';

    // Calculate this week's date range for fallback
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // Get progress based on mode
    let progressQuery = supabase
      .from('montree_child_progress')
      .select('work_name, area, status, updated_at, presented_at')
      .eq('child_id', childId)
      .neq('status', 'not_started');

    if (showAll) {
      // Show all progress from this week (for "Show This Week's Progress" button)
      progressQuery = progressQuery.or(`updated_at.gte.${weekStartStr},presented_at.gte.${weekStartStr}`);
    } else if (lastReportDate) {
      // Try to get progress updated since last report
      progressQuery = progressQuery.or(`updated_at.gt.${lastReportDate},presented_at.gt.${lastReportDate}`);
    }
    // If no lastReportDate and not showAll, get all progress (first report ever)

    let { data: progress } = await progressQuery;

    // If no unreported progress found (and not in showAll mode), fall back to this week's progress
    if ((!progress || progress.length === 0) && !showAll && lastReportDate) {
      const { data: weekProgress } = await supabase
        .from('montree_child_progress')
        .select('work_name, area, status, updated_at, presented_at')
        .eq('child_id', childId)
        .neq('status', 'not_started')
        .or(`updated_at.gte.${weekStartStr},presented_at.gte.${weekStartStr}`);

      progress = weekProgress;
    }

    // Look for existing draft/sent report with selected photos (uses weekStartStr from above)
    const { data: draftReport } = await supabase
      .from('montree_weekly_reports')
      .select('id')
      .eq('child_id', childId)
      .eq('week_start', weekStartStr)
      .single();

    let selectedPhotoIds: string[] = [];

    if (draftReport) {
      // Get explicitly selected photos from junction table
      const { data: reportMedia } = await supabase
        .from('montree_report_media')
        .select('media_id, display_order')
        .eq('report_id', draftReport.id)
        .order('display_order', { ascending: true });

      if (reportMedia && reportMedia.length > 0) {
        selectedPhotoIds = reportMedia.map(rm => rm.media_id);
      }
    }

    // Get ALL photos for this child (both individual and group)
    const { data: mediaPhotos } = await supabase
      .from('montree_media')
      .select('id, storage_path, thumbnail_path, work_id, caption, captured_at')
      .eq('child_id', childId)
      .eq('media_type', 'photo');

    // Also check junction table for group photos where child is included
    const { data: groupPhotos } = await supabase
      .from('montree_media_children')
      .select(`
        media:montree_media (
          id, storage_path, thumbnail_path, work_id, caption, captured_at
        )
      `)
      .eq('child_id', childId);

    // Combine both photo sources and deduplicate
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

    // Get curriculum works to map work_id to work_name
    const { data: curriculumWorksForPhotos } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name')
      .eq('classroom_id', child.classroom_id);

    const workIdToName = new Map<string, string>();
    for (const w of curriculumWorksForPhotos || []) {
      workIdToName.set(w.id, w.name);
    }

    // Transform media photos to have work_name, proper URL, and selection status
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const allPhotos = allMediaPhotos.map((p: any) => ({
      id: p.id,
      url: p.storage_path ? `${supabaseUrl}/storage/v1/object/public/montree-media/${p.storage_path}` : null,
      // work_name can come from work_id lookup OR from caption (which stores work name when captured from Week view)
      work_name: p.work_id ? workIdToName.get(p.work_id) : p.caption,
      caption: p.caption,
      created_at: p.captured_at,
      is_selected: selectedPhotoIds.includes(p.id), // Track if teacher selected this photo
    }));

    // Separate selected photos (for preview) from available photos
    const selectedPhotos = allPhotos.filter(p => p.is_selected);
    const availablePhotos = allPhotos.filter(p => !p.is_selected);

    // Build report items with matched photos and descriptions
    // Use SELECTED photos for preview (or all if no selections yet for backwards compat)
    const photosForMatching = selectedPhotoIds.length > 0 ? selectedPhotos : allPhotos;

    const reportItems = (progress || []).map(p => {
      const workNameLower = p.work_name?.toLowerCase() || '';

      // Find photo for this work (only from selected photos if selections exist)
      const photo = photosForMatching?.find(
        ph => ph.work_name?.toLowerCase() === workNameLower
      );

      // Find parent description from database using fuzzy matching
      let desc = findBestDescription(p.work_name || '', dbDescriptions);

      // Direct lookup fallback
      if (!desc && dbDescriptions.has(workNameLower)) {
        desc = dbDescriptions.get(workNameLower)!;
      }

      return {
        work_name: p.work_name,
        area: p.area,
        status: p.status === 'completed' ? 'mastered' : p.status,
        photo_url: photo?.url || null,
        photo_caption: photo?.caption || null,
        parent_description: desc?.description || null,
        why_it_matters: desc?.why_it_matters || null,
        has_description: !!desc,
      };
    });

    // Count stats
    const stats = {
      total: reportItems.length,
      with_photos: reportItems.filter(r => r.photo_url).length,
      with_descriptions: reportItems.filter(r => r.has_description).length,
      mastered: reportItems.filter(r => r.status === 'mastered').length,
      practicing: reportItems.filter(r => r.status === 'practicing').length,
      presented: reportItems.filter(r => r.status === 'presented').length,
      selected_photos: selectedPhotos.length,
      available_photos: availablePhotos.length,
      has_selections: selectedPhotoIds.length > 0,
    };

    return NextResponse.json({
      success: true,
      child_name: child.name,
      child_photo: child.photo_url,
      last_report_date: lastReportDate,
      items: reportItems,
      // Include all photos for the photo selection modal
      selected_photos: selectedPhotos,
      available_photos: availablePhotos,
      all_photos: allPhotos, // For backwards compatibility
      stats,
    });

  } catch (error) {
    console.error('Report preview error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
