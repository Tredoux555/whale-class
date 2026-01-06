// app/api/curriculum/works-by-area/route.ts
// Get all curriculum works for a specific area

import { NextRequest, NextResponse } from 'next/server';
import { CURRICULUM } from '@/lib/montree/curriculum-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const area = searchParams.get('area');

    if (!area) {
      return NextResponse.json(
        { success: false, error: 'area parameter is required' },
        { status: 400 }
      );
    }

    // Normalize area name for matching
    const normalizedArea = area.toLowerCase().replace(/[_\s-]/g, '');
    
    // Find the matching curriculum area
    const curriculumArea = CURRICULUM.find(a => {
      const areaId = a.id.toLowerCase().replace(/[_\s-]/g, '');
      const areaName = a.name.toLowerCase().replace(/[_\s-]/g, '');
      return areaId === normalizedArea || 
             areaName === normalizedArea ||
             areaId.includes(normalizedArea) ||
             normalizedArea.includes(areaId);
    });

    if (!curriculumArea) {
      return NextResponse.json(
        { success: false, error: `Area "${area}" not found`, works: [] },
        { status: 200 }
      );
    }

    // Flatten all works from all categories in this area
    const works: Array<{
      id: string;
      name: string;
      name_chinese?: string;
      category: string;
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
          category: category.name,
          area: curriculumArea.id,
          sequence: sequenceCounter++,
        });
      });
    });

    return NextResponse.json({
      success: true,
      area: curriculumArea.id,
      areaName: curriculumArea.name,
      totalWorks: works.length,
      works,
    });

  } catch (error) {
    console.error('Error fetching curriculum works by area:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch curriculum works' },
      { status: 500 }
    );
  }
}
