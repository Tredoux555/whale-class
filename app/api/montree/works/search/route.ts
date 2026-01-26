import { NextRequest, NextResponse } from 'next/server';
import { CURRICULUM, getAllWorks } from '@/lib/montree/curriculum-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const areaFilter = searchParams.get('area');
    const searchQuery = searchParams.get('q')?.toLowerCase() || '';

    // Get ALL works from the full curriculum (268+ works)
    let allWorks = getAllWorks().map((work, index) => {
      // Find which area this work belongs to
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
        area: {
          area_key: areaInfo.id,
          name: areaInfo.name,
          color: areaInfo.color,
          icon: areaInfo.icon
        },
        status: 'not_started'
      };
    });

    // Filter by area if specified
    if (areaFilter && areaFilter !== 'all') {
      // Handle different area key formats
      const normalizedFilter = areaFilter.toLowerCase().replace('-', '_');
      allWorks = allWorks.filter(w => {
        const areaKey = w.area.area_key.toLowerCase();
        return areaKey === normalizedFilter || 
               areaKey.includes(normalizedFilter) ||
               normalizedFilter.includes(areaKey);
      });
    }

    // Filter by search query
    if (searchQuery) {
      allWorks = allWorks.filter(w => 
        w.name.toLowerCase().includes(searchQuery) ||
        w.chinese_name?.toLowerCase().includes(searchQuery) ||
        w.description?.toLowerCase().includes(searchQuery)
      );
    }

    return NextResponse.json({
      works: allWorks,
      total: allWorks.length,
      version: 'v101-full-curriculum'
    });

  } catch (error) {
    console.error('Works search error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch works', details: String(error) },
      { status: 500 }
    );
  }
}
