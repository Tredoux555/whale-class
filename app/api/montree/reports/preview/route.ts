// /api/montree/reports/preview/route.ts
// GET - Generate full report preview with parent descriptions and photos

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load all parent descriptions from JSON files
function loadParentDescriptions(): Map<string, { description: string; why_it_matters: string }> {
  const descriptions = new Map();

  const areas = ['practical-life', 'sensorial', 'math', 'language', 'cultural'];

  for (const area of areas) {
    try {
      const filePath = join(process.cwd(), `lib/curriculum/comprehensive-guides/parent-${area}.json`);
      const data = JSON.parse(readFileSync(filePath, 'utf-8'));

      for (const item of data) {
        if (item.name && item.parent_description) {
          descriptions.set(item.name.toLowerCase(), {
            description: item.parent_description,
            why_it_matters: item.why_it_matters || '',
          });
        }
      }
    } catch (err) {
      console.log(`Could not load parent-${area}.json:`, err);
    }
  }

  return descriptions;
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

    // Get child info
    const { data: child } = await supabase
      .from('montree_children')
      .select('id, name, photo_url')
      .eq('id', childId)
      .single();

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
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

    // Get ALL photos for this child (to match with works)
    const { data: allPhotos } = await supabase
      .from('montree_child_photos')
      .select('id, url, work_name, caption, created_at')
      .eq('child_id', childId);

    // Load parent descriptions
    const parentDescriptions = loadParentDescriptions();

    // Build report items with matched photos and descriptions
    const reportItems = (progress || []).map(p => {
      const workNameLower = p.work_name?.toLowerCase() || '';

      // Find photo for this work
      const photo = allPhotos?.find(
        ph => ph.work_name?.toLowerCase() === workNameLower
      );

      // Find parent description
      const desc = parentDescriptions.get(workNameLower);

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
    };

    return NextResponse.json({
      success: true,
      child_name: child.name,
      child_photo: child.photo_url,
      last_report_date: lastReportDate,
      items: reportItems,
      stats,
    });

  } catch (error) {
    console.error('Report preview error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
