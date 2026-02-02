import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/montree/supabase';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load parent descriptions from curriculum JSON files
function loadParentDescriptions(): Map<string, { description: string; why_it_matters: string }> {
  const descriptions = new Map();
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
      const works = data.works || data;
      for (const item of works) {
        if (item.name && item.parent_description) {
          descriptions.set(item.name.toLowerCase(), {
            description: item.parent_description,
            why_it_matters: item.why_it_matters || '',
          });
        }
      }
    } catch (err) {
      // File not found, skip
    }
  }
  return descriptions;
}

// Fuzzy match work name to find best description
function findBestDescription(
  workName: string,
  descriptions: Map<string, { description: string; why_it_matters: string }>
): { description: string; why_it_matters: string } | null {
  const workNameLower = workName.toLowerCase();

  // Exact match
  if (descriptions.has(workNameLower)) {
    return descriptions.get(workNameLower)!;
  }

  // Contains match
  for (const [guideName, desc] of descriptions.entries()) {
    if (workNameLower.includes(guideName) || guideName.includes(workNameLower)) {
      return desc;
    }
  }

  // Keyword matching
  const workWords = workNameLower.split(/[\s\-_]+/).filter(w => w.length > 2);
  const skipWords = ['the', 'and', 'for', 'with', 'frame', 'box', 'set', 'work', 'board', 'cards'];
  const meaningfulWords = workWords.filter(w => !skipWords.includes(w));

  let bestMatch: { desc: { description: string; why_it_matters: string }; score: number } | null = null;

  for (const [guideName, desc] of descriptions.entries()) {
    const guideWords = guideName.split(/[\s\-_]+/).filter(w => w.length > 2);
    let score = 0;
    for (const word of meaningfulWords) {
      for (const guideWord of guideWords) {
        if (guideWord.includes(word) || word.includes(guideWord)) {
          score += 1;
        }
      }
    }
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { desc, score };
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

    // Get report
    const { data: report, error: reportError } = await supabase
      .from('montree_weekly_reports')
      .select(`
        id, week_number, report_year, parent_summary,
        highlights, areas_of_growth, recommendations,
        created_at, child_id, classroom_id
      `)
      .eq('id', reportId)
      .single();

    if (reportError) throw reportError;
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Get child info with classroom_id
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('name, nickname, classroom_id')
      .eq('id', report.child_id)
      .single();

    if (childError) throw childError;

    const classroomId = report.classroom_id || child?.classroom_id;

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

    // Get photos for this child
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const { data: mediaPhotos } = await supabase
      .from('montree_media')
      .select('id, storage_path, work_id, caption, captured_at')
      .eq('child_id', report.child_id)
      .eq('media_type', 'photo')
      .gte('captured_at', startOfWeek.toISOString())
      .lt('captured_at', endOfWeek.toISOString());

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

    // Build photo map
    const photosByWorkName = new Map<string, { url: string; caption: string | null }>();
    for (const p of mediaPhotos || []) {
      const workName = p.work_id ? workIdToName.get(p.work_id) : p.caption;
      if (workName && p.storage_path) {
        photosByWorkName.set(workName.toLowerCase(), {
          url: `${supabaseUrl}/storage/v1/object/public/montree-media/${p.storage_path}`,
          caption: p.caption,
        });
      }
    }

    // Load descriptions from JSON files
    const jsonDescriptions = loadParentDescriptions();

    // Build enriched works list
    const worksCompleted = (progress || []).map(p => {
      const workNameLower = (p.work_name || '').toLowerCase();

      // Find photo
      const photo = photosByWorkName.get(workNameLower);

      // Find description (try JSON first, then DB)
      let desc = findBestDescription(p.work_name || '', jsonDescriptions);
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

    return NextResponse.json({
      report: {
        ...report,
        child,
        works_completed: worksCompleted
      }
    });
  } catch (error: any) {
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
