// app/api/whale/curriculum/next-works/[childId]/route.ts
// Get recommended next works based on completed prerequisites

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const supabase = await createClient();
  const { childId } = await params;
  const { searchParams } = new URL(request.url);
  const areaId = searchParams.get('area');
  const limit = parseInt(searchParams.get('limit') || '10');

  try {
    // Get child's age for age-appropriate filtering
    const { data: child } = await supabase
      .from('children')
      .select('date_of_birth')
      .eq('id', childId)
      .single();

    const ageInYears = child?.date_of_birth
      ? Math.floor((Date.now() - new Date(child.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : 3;

    // Map age to age_range
    let ageRanges: string[] = [];
    if (ageInYears < 3) ageRanges = ['toddler'];
    else if (ageInYears < 4) ageRanges = ['toddler', 'primary_year1'];
    else if (ageInYears < 5) ageRanges = ['primary_year1', 'primary_year2'];
    else if (ageInYears < 6) ageRanges = ['primary_year1', 'primary_year2', 'primary_year3'];
    else if (ageInYears < 9) ageRanges = ['primary_year2', 'primary_year3', 'lower_elementary'];
    else ageRanges = ['lower_elementary', 'upper_elementary'];

    // Get completed work IDs
    const { data: completedWorks } = await supabase
      .from('child_work_completion')
      .select('work_id')
      .eq('child_id', childId)
      .eq('status', 'completed');

    const completedIds = completedWorks?.map(w => w.work_id) || [];

    // Get all works (without nested selects since foreign keys were dropped)
    let query = supabase
      .from('curriculum_roadmap')
      .select(`
        id,
        name,
        description,
        area_id,
        category_id,
        age_range,
        prerequisites,
        sequence,
        materials,
        levels
      `)
      .in('age_range', ageRanges)
      .order('sequence');

    if (areaId) {
      query = query.eq('area_id', areaId);
    }

    const { data: works, error } = await query;

    if (error) throw error;

    // Get area and category details separately
    const areaIds = [...new Set(works?.map(w => w.area_id).filter(Boolean) || [])];
    const categoryIds = [...new Set(works?.map(w => w.category_id).filter(Boolean) || [])];

    const { data: areas } = await supabase
      .from('curriculum_areas')
      .select('id, name, color, icon')
      .in('id', areaIds);

    const { data: categories } = await supabase
      .from('curriculum_categories')
      .select('id, name')
      .in('id', categoryIds);

    // Enrich works with area and category data
    const enrichedWorks = works?.map(work => ({
      ...work,
      curriculum_areas: areas?.find(a => a.id === work.area_id) || null,
      curriculum_categories: categories?.find(c => c.id === work.category_id) || null,
    })) || [];

    // Filter to works where prerequisites are met
    const availableWorks = enrichedWorks.filter(work => {
      // Already completed
      if (completedIds.includes(work.id)) return false;
      
      // Check prerequisites
      const prereqs = work.prerequisites || [];
      return prereqs.every((prereqId: string) => completedIds.includes(prereqId));
    });

    // Take top N
    const recommended = availableWorks.slice(0, limit);

    return NextResponse.json({
      works: recommended,
      total: availableWorks.length,
      completedCount: completedIds.length,
    });

  } catch (error) {
    console.error('Error fetching next works:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}

