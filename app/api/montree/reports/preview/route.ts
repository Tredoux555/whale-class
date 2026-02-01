// /api/montree/reports/preview/route.ts
// GET - Generate full report preview with parent descriptions and photos

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load all parent descriptions from the MAIN guides JSON files (which have ALL works)
function loadParentDescriptions(): Map<string, { description: string; why_it_matters: string; originalName: string }> {
  const descriptions = new Map();

  // Use the main guides files which have ALL works with parent descriptions
  const files = [
    'practical-life-guides.json',
    'sensorial-guides.json',
    'math-guides.json',
    'language-guides.json',
    'cultural-guides.json'
  ];

  for (const file of files) {
    try {
      const filePath = join(process.cwd(), `lib/curriculum/comprehensive-guides/${file}`);
      const data = JSON.parse(readFileSync(filePath, 'utf-8'));

      // JSON structure: { area: "...", works: [...] }
      const works = data.works || data;
      for (const item of works) {
        if (item.name && item.parent_description) {
          descriptions.set(item.name.toLowerCase(), {
            description: item.parent_description,
            why_it_matters: item.why_it_matters || '',
            originalName: item.name,
          });
        }
      }
    } catch (err) {
      console.log(`Could not load ${file}:`, err);
    }
  }

  console.log(`Loaded ${descriptions.size} parent descriptions from guides files`);
  return descriptions;
}

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

    // Build DB descriptions map as fallback
    const dbDescriptions = new Map<string, { description: string; why_it_matters: string }>();
    for (const work of curriculumWorks || []) {
      if (work.name && work.parent_description) {
        dbDescriptions.set(work.name.toLowerCase(), {
          description: work.parent_description,
          why_it_matters: work.why_it_matters || '',
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

    // Get progress since last report
    let progressQuery = supabase
      .from('montree_child_progress')
      .select('work_name, area, status, updated_at')
      .eq('child_id', childId)
      .neq('status', 'not_started');

    if (lastReportDate) {
      progressQuery = progressQuery.gt('updated_at', lastReportDate);
    }

    const { data: progress } = await progressQuery;

    // Get ALL photos for this child from montree_media table
    // Note: Photos are stored in montree_media (not montree_child_photos which is legacy)
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

    // Combine both photo sources
    const allMediaPhotos = [
      ...(mediaPhotos || []),
      ...(groupPhotos || []).map((gp: any) => gp.media).filter(Boolean)
    ];

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
    const allPhotos = allMediaPhotos.map((p: any) => ({
      id: p.id,
      url: p.storage_path ? `${supabaseUrl}/storage/v1/object/public/montree-media/${p.storage_path}` : null,
      // work_name can come from work_id lookup OR from caption (which stores work name when captured from Week view)
      work_name: p.work_id ? workIdToName.get(p.work_id) : p.caption,
      caption: p.caption,
      created_at: p.captured_at,
    }));

    // Load parent descriptions
    const parentDescriptions = loadParentDescriptions();

    // Build report items with matched photos and descriptions
    const reportItems = (progress || []).map(p => {
      const workNameLower = p.work_name?.toLowerCase() || '';

      // Find photo for this work
      const photo = allPhotos?.find(
        ph => ph.work_name?.toLowerCase() === workNameLower
      );

      // Find parent description using fuzzy matching from JSON files
      let desc = findBestDescription(p.work_name || '', parentDescriptions);

      // Fallback to database descriptions if JSON fuzzy match fails
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

    // Get unassigned photos (photos without work_id) to show in report
    const unassignedPhotos = allPhotos
      .filter(p => !p.work_name)
      .map(p => ({
        id: p.id,
        url: p.url,
        caption: p.caption,
        created_at: p.created_at,
      }));

    // Count stats
    const stats = {
      total: reportItems.length,
      with_photos: reportItems.filter(r => r.photo_url).length,
      with_descriptions: reportItems.filter(r => r.has_description).length,
      mastered: reportItems.filter(r => r.status === 'mastered').length,
      practicing: reportItems.filter(r => r.status === 'practicing').length,
      presented: reportItems.filter(r => r.status === 'presented').length,
      unassigned_photos: unassignedPhotos.length,
    };

    return NextResponse.json({
      success: true,
      child_name: child.name,
      child_photo: child.photo_url,
      last_report_date: lastReportDate,
      items: reportItems,
      unassigned_photos: unassignedPhotos,
      stats,
    });

  } catch (error) {
    console.error('Report preview error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
