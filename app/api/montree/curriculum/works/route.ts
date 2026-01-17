// /api/montree/curriculum/works/route.ts
// Fetches curriculum works from database (classroom-specific)
// Falls back to master JSON if no classroom curriculum exists

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CURRICULUM } from '@/lib/montree/curriculum-data';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroomId');
    const area = searchParams.get('area');

    if (!area) {
      return NextResponse.json({ error: 'area parameter is required' }, { status: 400 });
    }

    // Normalize area name
    const normalizedArea = area.toLowerCase().replace(/[_\s-]/g, '');

    // Try to fetch from database if classroomId provided
    if (classroomId) {
      const { data: areaData } = await supabase
        .from('classroom_curriculum_areas')
        .select('id, area_key, name')
        .eq('classroom_id', classroomId)
        .ilike('area_key', `%${normalizedArea}%`)
        .single();

      if (areaData) {
        // Fetch works for this area from database
        const { data: works, error: worksError } = await supabase
          .from('classroom_curriculum_works')
          .select('id, work_key, name, name_chinese, description, age_range, materials, video_search_terms, sequence')
          .eq('area_id', areaData.id)
          .eq('is_active', true)
          .order('sequence');

        if (!worksError && works) {
          return NextResponse.json({
            success: true,
            source: 'database',
            classroomId,
            area: areaData.area_key,
            areaName: areaData.name,
            totalWorks: works.length,
            works: works.map(w => ({
              id: w.work_key,
              name: w.name,
              name_chinese: w.name_chinese,
              area: areaData.area_key,
              sequence: w.sequence,
            })),
          });
        }
      }
    }

    // Fallback to master JSON curriculum
    const curriculumArea = CURRICULUM.find(a => {
      const areaId = a.id.toLowerCase().replace(/[_\s-]/g, '');
      const areaName = a.name.toLowerCase().replace(/[_\s-]/g, '');
      return areaId.includes(normalizedArea) || normalizedArea.includes(areaId) ||
             areaName.includes(normalizedArea) || normalizedArea.includes(areaName);
    });

    if (!curriculumArea) {
      return NextResponse.json({
        success: false,
        error: `Area "${area}" not found`,
        works: [],
      });
    }

    // Flatten all works from categories
    const works: Array<{
      id: string;
      name: string;
      name_chinese?: string;
      area: string;
      sequence: number;
    }> = [];

    let sequenceCounter = 0;
    curriculumArea.categories.forEach(category => {
      category.works.forEach(work => {
        works.push({
          id: work.id,
          name: work.name,
          name_chinese: work.chineseName,
          area: curriculumArea.id,
          sequence: sequenceCounter++,
        });
      });
    });

    return NextResponse.json({
      success: true,
      source: 'master_json',
      area: curriculumArea.id,
      areaName: curriculumArea.name,
      totalWorks: works.length,
      works,
    });

  } catch (error) {
    console.error('Error fetching curriculum works:', error);
    return NextResponse.json({ error: 'Failed to fetch curriculum' }, { status: 500 });
  }
}
