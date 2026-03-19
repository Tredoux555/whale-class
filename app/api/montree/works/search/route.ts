import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CURRICULUM, getAllWorks } from '@/lib/montree/curriculum-data';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

// Canonical area key aliases — prevents silent "return all works" when DB has non-standard keys
const AREA_KEY_ALIASES: Record<string, string> = {
  math: 'mathematics',
  maths: 'mathematics',
  science_culture: 'cultural',
  science: 'cultural',
  culture: 'cultural',
  practical: 'practical_life',
  pl: 'practical_life',
  sensory: 'sensorial',
};
const CANONICAL_AREA_KEYS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

function normalizeAreaKey(raw: string): string {
  const key = raw.toLowerCase().replace('-', '_');
  return AREA_KEY_ALIASES[key] || key;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

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
          const normalizedArea = normalizeAreaKey(areaFilter);

          // Try canonical key first, then fall back to trying aliases in the DB
          const { data: areaData } = await supabase
            .from('montree_classroom_curriculum_areas')
            .select('id')
            .eq('classroom_id', classroomId)
            .eq('area_key', normalizedArea)
            .single();
          areaId = areaData?.id || null;

          // If canonical key didn't match, also try the raw key (handles old DB data)
          if (!areaId) {
            const rawKey = areaFilter.toLowerCase().replace('-', '_');
            if (rawKey !== normalizedArea) {
              const { data: fallbackData } = await supabase
                .from('montree_classroom_curriculum_areas')
                .select('id')
                .eq('classroom_id', classroomId)
                .eq('area_key', rawKey)
                .single();
              areaId = fallbackData?.id || null;
            }
          }

          // CRITICAL: If area filter was requested but no matching area found,
          // return empty results — NEVER silently return all works
          if (!areaId) {
            console.error(`[works/search] Area key not found for classroom ${classroomId}: tried "${normalizedArea}" and "${areaFilter}"`);
            return NextResponse.json({ works: [], total: 0, source: 'classroom', warning: `Area "${areaFilter}" not found in classroom curriculum` });
          }
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
            quick_guide: w.quick_guide || null,
            parent_description: w.parent_description || null,
            why_it_matters: w.why_it_matters || null,
            direct_aims: w.direct_aims || [],
            indirect_aims: w.indirect_aims || [],
            age_range: w.age_range,
            sequence: w.sequence,
            materials: w.materials,
            levels: w.levels,
            is_custom: w.is_custom || false,
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

          const response = NextResponse.json({ works, total: works.length, source: 'classroom' });
          response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
          return response;
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
      const normalizedFilter = normalizeAreaKey(areaFilter);
      allWorks = allWorks.filter(w => {
        const workArea = normalizeAreaKey(w.area.area_key);
        return workArea === normalizedFilter;
      });
    }

    if (searchQuery) {
      allWorks = allWorks.filter(w =>
        w.name.toLowerCase().includes(searchQuery) ||
        w.chinese_name?.toLowerCase().includes(searchQuery)
      );
    }

    const response = NextResponse.json({ works: allWorks, total: allWorks.length, source: 'global' });
    response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
    return response;

  } catch (error) {
    console.error('Works search error:', error);
    return NextResponse.json({ error: 'Failed to fetch works' }, { status: 500 });
  }
}

function getAreaIcon(areaId: string): string {
  const icons: Record<string, string> = {
    practical_life: '🧹', sensorial: '👁️', mathematics: '🔢', language: '📚', cultural: '🌍', special_events: '🎉'
  };
  return icons[areaId] || '📖';
}

function getAreaColor(areaId: string): string {
  const colors: Record<string, string> = {
    practical_life: '#22c55e', sensorial: '#f97316', mathematics: '#3b82f6', language: '#ec4899', cultural: '#8b5cf6', special_events: '#e11d48'
  };
  return colors[areaId] || '#666';
}
