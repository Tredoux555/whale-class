// /api/montree/reports/preview/route.ts
// GET - Generate full report preview with parent descriptions and photos

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { loadAllCurriculumWorks, getChineseNameForWork } from '@/lib/montree/curriculum-loader';
import { getChineseDescriptionsMap } from '@/lib/curriculum/comprehensive-guides/parent-descriptions-zh';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';

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

const AREA_DESCRIPTIONS_ZH: Record<string, { description: string; why_it_matters: string }> = {
  'practical_life': {
    description: '您的孩子正在通过教室里的实际生活活动发展独立性和协调能力。',
    why_it_matters: '日常生活练习培养自信心、专注力和为未来所有学习做好准备的精细动作技能。'
  },
  'sensorial': {
    description: '您的孩子正在通过精心设计的感官教具来完善感官能力，学习观察和分类周围的世界。',
    why_it_matters: '感官训练培养支撑阅读、数学和科学观察的感知能力。'
  },
  'mathematics': {
    description: '您的孩子正在通过动手操作的教具探索数学概念，让抽象的想法变得具体而有意义。',
    why_it_matters: '具体的数学教具建立深刻、持久的理解，远远超越死记硬背。'
  },
  'language': {
    description: '您的孩子正在通过培养词汇、阅读和写作基础的活动来提升语言能力。',
    why_it_matters: '扎实的语言能力为各个领域的学习打开大门，并支持自信的自我表达。'
  },
  'cultural': {
    description: '您的孩子正在通过文化学习——地理、科学、历史、艺术和音乐——探索世界，培养好奇心和全球意识。',
    why_it_matters: '文化活动培养对世界的好奇心，帮助孩子理解自己在其中的位置。'
  },
};

// Safe description matching - only matches when confident
// Uses DB descriptions first, then area-based generic as fallback
function findBestDescription(
  workName: string,
  descriptions: Map<string, { description: string; why_it_matters: string; originalName: string }>,
  area?: string,
  locale?: string
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
    const areaDescs = locale === 'zh' ? AREA_DESCRIPTIONS_ZH : AREA_DESCRIPTIONS;
    const areaDesc = areaDescs[area];
    if (areaDesc) return areaDesc;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const locale = searchParams.get('locale') || 'en';

    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    // Security: verify child belongs to this school
    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get child info including classroom_id
    const { data: child } = await supabase
      .from('montree_children')
      .select('id, name, photo_url, classroom_id')
      .eq('id', childId)
      .maybeSingle();

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // ============================================================
    // STEP 1: Get curriculum works + visual memory descriptions (parallel)
    // ============================================================
    const [{ data: curriculumWorks }, { data: visualMemories }] = await Promise.all([
      supabase
        .from('montree_classroom_curriculum_works')
        .select('id, name, area, parent_description, why_it_matters, parent_description_zh, why_it_matters_zh, name_zh')
        .eq('classroom_id', child.classroom_id),
      supabase
        .from('montree_visual_memory')
        .select('work_name, parent_description, why_it_matters')
        .eq('classroom_id', child.classroom_id)
        .not('parent_description', 'is', null),
    ]);

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

    // Override with Chinese descriptions when locale is zh
    if (locale === 'zh') {
      const zhDescriptions = getChineseDescriptionsMap();
      for (const [name, zh] of zhDescriptions) {
        staticDescriptions.set(name, {
          description: zh.parent_description,
          why_it_matters: zh.why_it_matters,
        });
      }
    }

    // Override with per-classroom visual memory descriptions (Sonnet-generated from reference photos)
    // These are more specific than generic static descriptions, so they take priority
    // But teacher-edited DB descriptions (in curriculum_works table) still win via the || chain below
    if (visualMemories) {
      for (const vm of visualMemories) {
        if (vm.work_name && vm.parent_description) {
          staticDescriptions.set(vm.work_name.toLowerCase().trim(), {
            description: vm.parent_description,
            why_it_matters: vm.why_it_matters || '',
          });
        }
      }
    }

    for (const work of curriculumWorks || []) {
      // Try DB description first, then fall back to static curriculum
      // When locale is zh, prefer DB Chinese columns (from custom work translation or manual entry)
      const staticDesc = staticDescriptions.get(work.name.toLowerCase().trim());
      const description = (locale === 'zh' && work.parent_description_zh)
        ? work.parent_description_zh
        : (work.parent_description || staticDesc?.description || '');
      const whyItMatters = (locale === 'zh' && work.why_it_matters_zh)
        ? work.why_it_matters_zh
        : (work.why_it_matters || staticDesc?.why_it_matters || '');

      workIdToInfo.set(work.id, {
        name: work.name,
        area: work.area || 'practical_life',
        description,
        why_it_matters: whyItMatters,
      });
      workNameToId.set(work.name.toLowerCase().trim(), work.id);

      // Add to description map if we have ANY description (DB or static)
      if (description) {
        dbDescriptions.set(work.name.toLowerCase().trim(), {
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
    // Fetch direct photos AND group photos in parallel (independent queries)
    const [{ data: mediaPhotos }, { data: groupPhotos }] = await Promise.all([
      supabase
        .from('montree_media')
        .select('id, storage_path, thumbnail_path, work_id, caption, captured_at')
        .eq('child_id', childId)
        .eq('media_type', 'photo')
        .limit(1000),
      supabase
        .from('montree_media_children')
        .select(`
          media:montree_media (
            id, storage_path, thumbnail_path, work_id, caption, captured_at
          )
        `)
        .eq('child_id', childId)
        .limit(1000),
    ]);

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
    const allPhotos = allMediaPhotos.map((p: Record<string, unknown>) => {
      // Get work info from curriculum using work_id (the reliable connection)
      const workInfo = p.work_id ? workIdToInfo.get(p.work_id) : null;
      return {
        id: p.id,
        work_id: p.work_id,
        url: p.storage_path ? getProxyUrl(p.storage_path) : null,
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
      .maybeSingle();

    const selectedPhotoIdSet = new Set<string>();
    if (draftReport) {
      const { data: reportMedia } = await supabase
        .from('montree_report_media')
        .select('media_id, display_order')
        .eq('report_id', draftReport.id)
        .order('display_order', { ascending: true });

      if (reportMedia && reportMedia.length > 0) {
        for (const rm of reportMedia) selectedPhotoIdSet.add(rm.media_id);
      }
    }

    // Mark selected photos (Set.has is O(1) vs Array.includes O(N))
    for (const photo of allPhotos) {
      photo.is_selected = selectedPhotoIdSet.has(photo.id);
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
      .maybeSingle();

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
    // STEP 5: BUILD UNIFIED REPORT - Include ALL works, match photos where possible
    // ============================================================
    // Timeline approach: every progress entry appears, photos matched where available

    // Build maps of photos by work_id and by work_name for matching
    const photosByWorkId = new Map<string, typeof allPhotos[0][]>();
    const photosByWorkName = new Map<string, typeof allPhotos[0][]>();
    for (const photo of allPhotos) {
      if (photo.work_id) {
        const existing = photosByWorkId.get(photo.work_id) || [];
        existing.push(photo);
        photosByWorkId.set(photo.work_id, existing);
      }
      if (photo.work_name) {
        const nameLower = photo.work_name.toLowerCase().trim();
        const existing = photosByWorkName.get(nameLower) || [];
        existing.push(photo);
        photosByWorkName.set(nameLower, existing);
      }
    }

    // Get photos for matching (selected if any, otherwise all)
    const photosForMatching = selectedPhotoIdSet.size > 0
      ? allPhotos.filter(p => p.is_selected)
      : allPhotos;

    // Build map of selected/available photos by work_id (best match per work)
    const selectedPhotosByWorkId = new Map<string, typeof allPhotos[0]>();
    for (const photo of photosForMatching) {
      if (photo.work_id && !selectedPhotosByWorkId.has(photo.work_id)) {
        selectedPhotosByWorkId.set(photo.work_id, photo);
      }
    }

    // Track which photos have been claimed by a work (to avoid double-use)
    const claimedPhotoIds = new Set<string>();

    // Track which works we've added (by work_id or name)
    const addedWorkIds = new Set<string>();
    const addedWorkNames = new Set<string>();
    const reportItems: Array<{
      work_id: string | null;
      work_name: string;
      chineseName?: string | null;
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

    // Helper: find best matching photo for a work (multi-strategy)
    function findPhotoForWork(workId: string | undefined, workNameLower: string): typeof allPhotos[0] | null {
      // Strategy 1: Direct work_id match (most reliable)
      if (workId) {
        const photo = selectedPhotosByWorkId.get(workId);
        if (photo && !claimedPhotoIds.has(photo.id)) return photo;
        // Also check ALL photos by work_id (not just selected)
        const allForWork = photosByWorkId.get(workId);
        if (allForWork) {
          const unclaimed = allForWork.find(p => !claimedPhotoIds.has(p.id));
          if (unclaimed) return unclaimed;
        }
      }

      // Strategy 2: Exact name match on photo work_name
      const byName = photosByWorkName.get(workNameLower);
      if (byName) {
        const unclaimed = byName.find(p => !claimedPhotoIds.has(p.id));
        if (unclaimed) return unclaimed;
      }

      // Strategy 3: Fuzzy name match (contains)
      const fuzzyMatch = photosForMatching.find(ph => {
        if (claimedPhotoIds.has(ph.id)) return false;
        if (!ph.work_name) return false;
        const photoNameLower = ph.work_name.toLowerCase().trim();
        return photoNameLower.includes(workNameLower) || workNameLower.includes(photoNameLower);
      });
      if (fuzzyMatch) return fuzzyMatch;

      // Strategy 4: Caption match (photo caption may contain work name)
      const captionMatch = photosForMatching.find(ph => {
        if (claimedPhotoIds.has(ph.id)) return false;
        if (!ph.caption) return false;
        return ph.caption.toLowerCase().includes(workNameLower);
      });
      if (captionMatch) return captionMatch;

      return null;
    }

    // First: Add works from progress that have matching photos (photo-centric reports)
    for (const p of progress || []) {
      const workNameLower = (p.work_name || '').toLowerCase().trim();
      const workId = workNameToId.get(workNameLower);
      const workInfo = workId ? workIdToInfo.get(workId) : null;

      // Find best matching photo — skip if no photo (reports are photo-centric)
      const photo = findPhotoForWork(workId, workNameLower);
      if (!photo) continue; // No photo = not in report
      claimedPhotoIds.add(photo.id);

      // Get description - pass the area from progress data for safe fallback
      const progressArea = p.area || workInfo?.area || 'practical_life';
      const desc = findBestDescription(p.work_name || '', dbDescriptions, progressArea, locale);

      reportItems.push({
        work_id: workId || null,
        work_name: p.work_name,
        chineseName: p.work_name ? getChineseNameForWork(p.work_name) : null,
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
    // These are photo-documented works not yet in progress tracking
    for (const photo of photosForMatching) {
      if (!photo.work_id) continue;
      if (claimedPhotoIds.has(photo.id)) continue; // Already matched above
      if (addedWorkIds.has(photo.work_id)) continue; // Already added from progress

      const workInfo = workIdToInfo.get(photo.work_id);
      if (!workInfo) continue; // Unknown work

      // Don't add if work name already added
      if (addedWorkNames.has(workInfo.name.toLowerCase())) continue;

      claimedPhotoIds.add(photo.id);

      reportItems.push({
        work_id: photo.work_id,
        work_name: workInfo.name,
        chineseName: workInfo.name ? getChineseNameForWork(workInfo.name) : null,
        area: workInfo.area || 'practical_life',
        status: 'documented',
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

    // Build photo date lookup for O(1) access during sort
    const photoDateMap = new Map<string, string>();
    for (const p of allPhotos) {
      if (p.id && p.created_at) {
        photoDateMap.set(p.id, p.created_at);
      }
    }

    // Sort: items WITH photos first (most recent photo first), then items without photos
    reportItems.sort((a, b) => {
      // Items with photos come before items without
      if (a.photo_url && !b.photo_url) return -1;
      if (!a.photo_url && b.photo_url) return 1;
      // Within each group, sort by date (most recent first)
      const aDate = a.photo_id ? (photoDateMap.get(a.photo_id) || '') : '';
      const bDate = b.photo_id ? (photoDateMap.get(b.photo_id) || '') : '';
      return bDate.localeCompare(aDate);
    });

    // Partition photos in a single pass (O(N) instead of 3× O(N))
    // selectedPhotos + availablePhotos = exhaustive partition (mutually exclusive)
    // unassignedPhotos = unclaimed photos with valid URLs (independent set, may overlap with either)
    const selectedPhotos: typeof allPhotos = [];
    const availablePhotos: typeof allPhotos = [];
    const unassignedPhotos: typeof allPhotos = [];
    for (const p of allPhotos) {
      if (p.is_selected) selectedPhotos.push(p);
      else availablePhotos.push(p);
      // Only include unassigned photos that have some meaningful content (work name or caption)
      if (p.url && !claimedPhotoIds.has(p.id) && (p.work_name || p.caption)) unassignedPhotos.push(p);
    }

    // Count stats in a single pass (O(N) instead of 8× O(N))
    let statWithPhotos = 0, statWithDesc = 0, statMastered = 0, statPracticing = 0;
    let statPresented = 0, statDocumented = 0, statFromProgress = 0, statFromPhotos = 0;
    for (const r of reportItems) {
      if (r.photo_url) statWithPhotos++;
      if (r.has_description) statWithDesc++;
      if (r.status === 'mastered') statMastered++;
      else if (r.status === 'practicing') statPracticing++;
      else if (r.status === 'presented') statPresented++;
      else if (r.status === 'documented') statDocumented++;
      if (r.source === 'progress') statFromProgress++;
      else if (r.source === 'photo') statFromPhotos++;
    }
    const stats = {
      total: reportItems.length,
      with_photos: statWithPhotos,
      with_descriptions: statWithDesc,
      mastered: statMastered,
      practicing: statPracticing,
      presented: statPresented,
      documented: statDocumented,
      selected_photos: selectedPhotos.length,
      available_photos: availablePhotos.length,
      unassigned_photos: unassignedPhotos.length,
      has_selections: selectedPhotoIdSet.size > 0,
      from_progress: statFromProgress,
      from_photos: statFromPhotos,
    };

    const response = NextResponse.json({
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
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
    return response;

  } catch (error) {
    console.error('Report preview error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
