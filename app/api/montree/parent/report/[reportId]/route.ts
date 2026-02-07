import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { cookies } from 'next/headers';
import { readFileSync } from 'fs';
import { join } from 'path';

// Helper function to extract authenticated session data from cookie
async function getAuthenticatedSession(): Promise<{ childId: string; inviteId?: string } | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('montree_parent_session');

    if (!sessionCookie?.value) {
      return null;
    }

    const session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    if (!session.child_id) {
      return null;
    }

    return {
      childId: session.child_id,
      inviteId: session.invite_id,
    };
  } catch {
    return null;
  }
}

// Load parent descriptions from curriculum JSON files with area info
function loadParentDescriptions(): Map<string, { description: string; why_it_matters: string; area: string }> {
  const descriptions = new Map();
  const files = [
    { file: 'practical-life-guides.json', area: 'practical_life' },
    { file: 'sensorial-guides.json', area: 'sensorial' },
    { file: 'math-guides.json', area: 'math' },
    { file: 'language-guides.json', area: 'language' },
    { file: 'cultural-guides.json', area: 'cultural' }
  ];

  for (const { file, area } of files) {
    try {
      const filePath = join(process.cwd(), `lib/curriculum/comprehensive-guides/${file}`);
      const data = JSON.parse(readFileSync(filePath, 'utf-8'));
      const works = data.works || data;
      for (const item of works) {
        if (item.name && item.parent_description) {
          descriptions.set(item.name.toLowerCase(), {
            description: item.parent_description,
            why_it_matters: item.why_it_matters || '',
            area: area,
          });
        }
      }
    } catch (err) {
      // File not found, skip
    }
  }
  return descriptions;
}

// Normalize area names for comparison
function normalizeArea(area: string): string {
  const normalized = area.toLowerCase().replace(/[_\s-]/g, '');
  // Map common variations
  if (normalized === 'practicallife' || normalized === 'practical') return 'practical_life';
  if (normalized === 'mathematics') return 'math';
  if (normalized === 'cultural' || normalized === 'culturalstudies') return 'cultural';
  return area.toLowerCase();
}

// Check if work_key indicates a custom work
function isCustomWork(workKey: string | undefined): boolean {
  return workKey?.startsWith('custom_') ?? false;
}

// Find best description with area matching (prevents cross-area mismatches)
function findBestDescription(
  workName: string,
  workArea: string,
  descriptions: Map<string, { description: string; why_it_matters: string; area: string }>,
  workKey?: string
): { description: string; why_it_matters: string } | null {
  // Custom works should NOT get auto-matched descriptions
  if (isCustomWork(workKey)) {
    return null;
  }

  const workNameLower = workName.toLowerCase();
  const normalizedWorkArea = normalizeArea(workArea);

  // Exact match (must also match area)
  if (descriptions.has(workNameLower)) {
    const desc = descriptions.get(workNameLower)!;
    if (normalizeArea(desc.area) === normalizedWorkArea) {
      return { description: desc.description, why_it_matters: desc.why_it_matters };
    }
  }

  // Contains match (must also match area)
  for (const [guideName, desc] of descriptions.entries()) {
    if (normalizeArea(desc.area) !== normalizedWorkArea) continue;
    if (workNameLower.includes(guideName) || guideName.includes(workNameLower)) {
      return { description: desc.description, why_it_matters: desc.why_it_matters };
    }
  }

  // Keyword matching with WHOLE-WORD matching and area constraint
  const workWords = workNameLower.split(/[\s\-_]+/).filter(w => w.length > 3);
  const skipWords = ['the', 'and', 'for', 'with', 'frame', 'box', 'set', 'work', 'board', 'cards', 'tab', 'mac'];
  const meaningfulWords = workWords.filter(w => !skipWords.includes(w));

  let bestMatch: { desc: { description: string; why_it_matters: string }; score: number } | null = null;

  for (const [guideName, desc] of descriptions.entries()) {
    // AREA CONSTRAINT: Only match within the same curriculum area
    if (normalizeArea(desc.area) !== normalizedWorkArea) continue;

    const guideWords = guideName.split(/[\s\-_]+/).filter(w => w.length > 3);
    let score = 0;

    for (const word of meaningfulWords) {
      for (const guideWord of guideWords) {
        // WHOLE-WORD MATCHING: Exact word match gets highest score
        if (word === guideWord) {
          score += 3;
        }
        // Partial match only for longer words (6+ chars) to avoid Tab/Table issue
        else if (word.length >= 6 && guideWord.length >= 6 &&
                 (guideWord.startsWith(word) || word.startsWith(guideWord))) {
          score += 1;
        }
      }
    }

    // Require minimum score of 3 (at least one exact word match)
    if (score >= 3 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { desc: { description: desc.description, why_it_matters: desc.why_it_matters }, score };
    }
  }

  return bestMatch?.desc || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params;

  if (!reportId) {
    return NextResponse.json({ error: 'Report ID required' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    // SECURITY: Authenticate parent via session cookie
    const session = await getAuthenticatedSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get report (include content field which has saved works/photos)
    const { data: report, error: reportError } = await supabase
      .from('montree_weekly_reports')
      .select(`
        id, week_number, report_year, week_start, week_end, parent_summary,
        highlights, areas_of_growth, recommendations,
        created_at, child_id, classroom_id, content
      `)
      .eq('id', reportId)
      .single();

    if (reportError) throw reportError;
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // SECURITY: Verify the report belongs to the authenticated child
    if (report.child_id !== session.childId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get child info with classroom_id
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('name, nickname, classroom_id')
      .eq('id', report.child_id)
      .single();

    if (childError) throw childError;

    const classroomId = report.classroom_id || child?.classroom_id;

    // CHECK IF REPORT HAS SAVED CONTENT (new system - contains works with descriptions)
    const savedContent = report.content as { works?: Array<{ name: string; area: string; status: string; parent_description?: string; why_it_matters?: string; photo_url?: string }>; photos?: any[] } | null;

    if (savedContent?.works && savedContent.works.length > 0) {
      // USE SAVED CONTENT - This is the preferred path for new reports
      // The content was saved at send time with all descriptions and photos
      const worksCompleted = savedContent.works.map(w => ({
        work_name: w.name,
        area: w.area || 'unknown',
        status: w.status,
        completed_at: report.created_at,
        photo_url: w.photo_url || null,
        photo_caption: null,
        parent_description: w.parent_description || null,
        why_it_matters: w.why_it_matters || null,
      }));

      // Include all photos from saved content OR fetch from that week
      let allPhotos = savedContent.photos || [];

      // If no saved photos array, fetch all photos for that week
      if (allPhotos.length === 0) {
        const startOfWeek = getWeekStart(report.report_year, report.week_number);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 7);

        const { data: weekPhotos } = await supabase
          .from('montree_media')
          .select('id, storage_path, work_id, caption, captured_at')
          .eq('child_id', report.child_id)
          .eq('media_type', 'photo')
          .gte('captured_at', startOfWeek.toISOString())
          .lt('captured_at', endOfWeek.toISOString());

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        allPhotos = (weekPhotos || []).map(p => ({
          id: p.id,
          url: `${supabaseUrl}/storage/v1/object/public/montree-media/${p.storage_path}`,
          caption: p.caption,
          work_name: null,
          captured_at: p.captured_at,
        }));
      }

      return NextResponse.json({
        report: {
          ...report,
          child,
          works_completed: worksCompleted,
          all_photos: allPhotos,
        }
      });
    }

    // FALLBACK: Regenerate from progress (for backwards compatibility with old reports)
    // Get works completed that week
    const startOfWeek = getWeekStart(report.report_year, report.week_number);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const { data: progress } = await supabase
      .from('montree_child_progress')
      .select('work_name, area, status, updated_at')
      .eq('child_id', report.child_id)
      .gte('updated_at', startOfWeek.toISOString())
      .lt('updated_at', endOfWeek.toISOString());

    // Get photos for this report - FIRST check junction table for selected photos
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let mediaPhotos: Array<{ id: string; storage_path: string; work_id: string | null; caption: string | null; captured_at: string }> = [];

    // Query the junction table for photos explicitly linked to this report
    const { data: reportMedia } = await supabase
      .from('montree_report_media')
      .select('media_id, display_order')
      .eq('report_id', reportId)
      .order('display_order', { ascending: true });

    if (reportMedia && reportMedia.length > 0) {
      // Get the actual media records for selected photos
      const mediaIds = reportMedia.map(rm => rm.media_id);
      const { data: selectedPhotos } = await supabase
        .from('montree_media')
        .select('id, storage_path, work_id, caption, captured_at')
        .in('id', mediaIds);

      if (selectedPhotos && selectedPhotos.length > 0) {
        // Sort by display_order from junction table
        const mediaOrderMap = new Map(reportMedia.map(rm => [rm.media_id, rm.display_order]));
        mediaPhotos = selectedPhotos.sort((a, b) =>
          (mediaOrderMap.get(a.id) || 0) - (mediaOrderMap.get(b.id) || 0)
        );
      }
    }

    // Fallback: if no photos in junction table, query by date range (backwards compatibility)
    if (mediaPhotos.length === 0) {
      const { data: fallbackPhotos } = await supabase
        .from('montree_media')
        .select('id, storage_path, work_id, caption, captured_at')
        .eq('child_id', report.child_id)
        .eq('media_type', 'photo')
        .gte('captured_at', startOfWeek.toISOString())
        .lt('captured_at', endOfWeek.toISOString());

      mediaPhotos = fallbackPhotos || [];
    }

    // Get curriculum works to map work_id to work_name
    const { data: curriculumWorks } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name, parent_description, why_it_matters')
      .eq('classroom_id', classroomId);

    const workIdToName = new Map<string, string>();
    const dbDescriptions = new Map<string, { description: string; why_it_matters: string }>();

    for (const w of curriculumWorks || []) {
      workIdToName.set(w.id, w.name);
      if (w.parent_description) {
        dbDescriptions.set(w.name.toLowerCase(), {
          description: w.parent_description,
          why_it_matters: w.why_it_matters || '',
        });
      }
    }

    // Build photo map AND track which photos are used
    const photosByWorkName = new Map<string, { url: string; caption: string | null }>();
    const usedPhotoIds = new Set<string>();

    for (const p of mediaPhotos || []) {
      const workName = p.work_id ? workIdToName.get(p.work_id) : p.caption;
      if (workName && p.storage_path) {
        photosByWorkName.set(workName.toLowerCase(), {
          url: `${supabaseUrl}/storage/v1/object/public/montree-media/${p.storage_path}`,
          caption: p.caption,
        });
        usedPhotoIds.add(p.id);
      }
    }

    // Load descriptions from JSON files
    const jsonDescriptions = loadParentDescriptions();

    // Build enriched works list
    const worksCompleted = (progress || []).map(p => {
      const workNameLower = (p.work_name || '').toLowerCase();

      // Find photo
      const photo = photosByWorkName.get(workNameLower);

      // Find description (try JSON first with area matching, then DB)
      // Pass the area to prevent cross-area mismatches (e.g. "Tab" matching "Table")
      let desc = findBestDescription(p.work_name || '', p.area || 'unknown', jsonDescriptions);
      if (!desc && dbDescriptions.has(workNameLower)) {
        desc = dbDescriptions.get(workNameLower)!;
      }

      return {
        work_name: p.work_name,
        area: p.area || 'unknown',
        status: p.status === 'completed' ? 'mastered' : p.status,
        completed_at: p.updated_at,
        photo_url: photo?.url || null,
        photo_caption: photo?.caption || null,
        parent_description: desc?.description || null,
        why_it_matters: desc?.why_it_matters || null,
      };
    });

    // Collect ALL photos for the week (including ones not matched to works)
    const allPhotos = (mediaPhotos || []).map(p => ({
      id: p.id,
      url: `${supabaseUrl}/storage/v1/object/public/montree-media/${p.storage_path}`,
      caption: p.caption,
      work_name: p.work_id ? workIdToName.get(p.work_id) : null,
      captured_at: p.captured_at,
    }));

    return NextResponse.json({
      report: {
        ...report,
        child,
        works_completed: worksCompleted,
        all_photos: allPhotos, // Include ALL photos from the week
      }
    });
  } catch (error: unknown) {
    console.error('Get report error:', error);
    return NextResponse.json({ error: 'Failed to load report' }, { status: 500 });
  }
}

function getWeekStart(year: number, week: number): Date {
  const jan1 = new Date(year, 0, 1);
  const daysOffset = (week - 1) * 7;
  const weekStart = new Date(jan1);
  weekStart.setDate(jan1.getDate() + daysOffset - jan1.getDay() + 1);
  return weekStart;
}
