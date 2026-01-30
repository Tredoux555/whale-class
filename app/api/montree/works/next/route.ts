// /api/montree/works/next/route.ts
// Get the next work in sequence after a work is mastered
// Uses curriculum-data.ts as primary source
import { NextRequest, NextResponse } from 'next/server';
import { CURRICULUM, getAllWorks } from '@/lib/montree/curriculum-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workName = searchParams.get('work_name');
    const area = searchParams.get('area');
    
    if (!workName) {
      return NextResponse.json({ error: 'work_name required' }, { status: 400 });
    }

    // Get all works with area info
    const allWorks = getAllWorks().map((work) => {
      let areaInfo = { id: 'unknown', name: 'Unknown' };
      for (const areaData of CURRICULUM) {
        for (const category of areaData.categories) {
          if (category.works.some(w => w.id === work.id)) {
            areaInfo = { id: areaData.id, name: areaData.name };
            break;
          }
        }
      }
      return {
        ...work,
        area_id: areaInfo.id,
        area_name: areaInfo.name,
      };
    });

    // Find current work by name (case-insensitive)
    const currentIndex = allWorks.findIndex(
      w => w.name.toLowerCase() === workName.toLowerCase()
    );

    if (currentIndex === -1) {
      // Work not found in curriculum
      return NextResponse.json({ success: true, next_work: null });
    }

    const currentWork = allWorks[currentIndex];
    const currentArea = currentWork.area_id;

    // Find next work in SAME area
    for (let i = currentIndex + 1; i < allWorks.length; i++) {
      if (allWorks[i].area_id === currentArea) {
        const nextWork = allWorks[i];
        return NextResponse.json({
          success: true,
          next_work: {
            id: nextWork.id,
            name: nextWork.name,
            name_chinese: nextWork.chineseName,
            area: nextWork.area_id,
            description: nextWork.description,
            source: 'curriculum_data'
          }
        });
      }
    }

    // No next work in same area
    return NextResponse.json({ success: true, next_work: null });

  } catch (error) {
    console.error('Next work error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
