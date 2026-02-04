import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CURRICULUM, getAllWorks } from '@/lib/montree/curriculum-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const areaFilter = searchParams.get('area');
    const searchQuery = searchParams.get('q')?.toLowerCase() || '';
    const classroomId = searchParams.get('classroom_id');

    // If classroom_id provided, use classroom-specific curriculum
    if (classroomId) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);

        // First, get the area_id if filtering by area
        let areaId: string | null = null;
        if (areaFilter && areaFilter !== 'all') {
          const normalizedArea = areaFilter.toLowerCase().replace('-', '_');
          const { data: areaData } = await supabase
            .from('montree_classroom_curriculum_areas')
            .select('id')
            .eq('classroom_id', classroomId)
            .eq('area_key', normalizedArea)
            .single();
          areaId = areaData?.id || null;
        }

        let query = supabase
          .from('montree_classroom_curriculum_works')
          .select(`
            *,
            area:montree_classroom_curriculum_areas!area_id (
              id, area_key, name, name_chinese, icon, color
            )
          `)
          .eq('classroom_id', classroomId)
          .eq('is_active', true)
          .order('sequence');

        if (areaId) {
          query = query.eq('area_id', areaId);
        }

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          let works = data.map(w => ({
            id: w.id, // Use actual database id for linking photos
            work_key: w.work_key, // Keep work_key for reference
            name: w.name,
            chinese_name: w.name_chinese,
            description: w.description,
            age_range: w.age_range,
            sequence: w.sequence,
            materials: w.materials,
            levels: w.levels,
            area: {
              area_key: w.area?.area_key || 'unknown',
              name: w.area?.name || 'Unknown',
              color: w.area?.color || getAreaColor(w.area?.area_key),
              icon: w.area?.icon || getAreaIcon(w.area?.area_key)
            },
            status: 'not_started'
          }));
          
          if (searchQuery) {
            works = works.filter(w => 
              w.name.toLowerCase().includes(searchQuery) ||
              w.chinese_name?.toLowerCase().includes(searchQuery)
            );
          }
          
          return NextResponse.json({ works, total: works.length, source: 'classroom' });
        }
      }
    }

    // Fallback to global curriculum
    let allWorks = getAllWorks().map((work, index) => {
      let areaInfo = { id: 'unknown', name: 'Unknown', icon: '📋', color: '#666' };
      for (const area of CURRICULUM) {
        for (const category of area.categories) {
          if (category.works.some(w => w.id === work.id)) {
            areaInfo = { id: area.id, name: area.name, icon: area.icon, color: area.color };
            break;
          }
        }
      }
      return {
        id: work.id,
        name: work.name,
        chinese_name: work.chineseName,
        description: work.description,
        age_range: work.ageRange,
        sequence: index + 1,
        materials: work.materials,
        levels: work.levels,
        area: { area_key: areaInfo.id, name: areaInfo.name, color: areaInfo.color, icon: areaInfo.icon },
        status: 'not_started'
      };
    });

    if (areaFilter && areaFilter !== 'all') {
      const normalizedFilter = areaFilter.toLowerCase().replace('-', '_');
      allWorks = allWorks.filter(w => w.area.area_key.toLowerCase().includes(normalizedFilter));
    }

    if (searchQuery) {
      allWorks = allWorks.filter(w => 
        w.name.toLowerCase().includes(searchQuery) ||
        w.chinese_name?.toLowerCase().includes(searchQuery)
      );
    }

    return NextResponse.json({ works: allWorks, total: allWorks.length, source: 'global' });

  } catch (error) {
    console.error('Works search error:', error);
    return NextResponse.json({ error: 'Failed to fetch works' }, { status: 500 });
  }
}

function getAreaIcon(areaId: string): string {
  const icons: Record<string, string> = {
    practical_life: '🧹', sensorial: '👁️', mathematics: '🔢', language: '📚', cultural: '🌍'
  };
  return icons[areaId] || '📖';
}

function getAreaColor(areaId: string): string {
  const colors: Record<string, string> = {
    practical_life: '#22c55e', sensorial: '#f97316', mathematics: '#3b82f6', language: '#ec4899', cultural: '#8b5cf6'
  };
  return colors[areaId] || '#666';
}
