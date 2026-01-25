// app/api/whale/curriculum/glossary/route.ts
// Get all works with parent descriptions for glossary

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
    // Get all works with parent descriptions
    const { data: works, error } = await supabase
      .from('curriculum_roadmap')
      .select('id, name, area_id, parent_description, why_it_matters, home_connection')
      .not('parent_description', 'is', null)
      .order('name');

    if (error) throw error;

    // Get area details
    const areaIds = [...new Set(works?.map(w => w.area_id).filter(Boolean) || [])];
    const { data: areas } = await supabase
      .from('curriculum_areas')
      .select('id, name, color, icon')
      .in('id', areaIds);

    // Enrich works with area info
    const enrichedWorks = works?.map(work => {
      const area = areas?.find(a => a.id === work.area_id);
      return {
        ...work,
        area_name: area?.name || 'General',
        area_color: area?.color || '#666',
        area_icon: area?.icon || '📚',
      };
    }) || [];

    return NextResponse.json({
      works: enrichedWorks,
      total: enrichedWorks.length,
    });

  } catch (error) {
    console.error('Error fetching glossary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch glossary' },
      { status: 500 }
    );
  }
}
