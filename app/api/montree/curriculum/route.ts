// /api/montree/curriculum/route.ts
// Get curriculum works for Add Work selection
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface Work {
  id: string;
  name: string;
  area: string;
  areaName: string;
  category: string;
  chineseName?: string;
}

// Cache curriculum data in memory
let cachedCurriculum: Work[] | null = null;

async function loadCurriculum(): Promise<Work[]> {
  if (cachedCurriculum) return cachedCurriculum;

  const areas = [
    { file: 'practical-life.json', id: 'practical_life', name: 'Practical Life' },
    { file: 'sensorial.json', id: 'sensorial', name: 'Sensorial' },
    { file: 'math.json', id: 'mathematics', name: 'Mathematics' },
    { file: 'language.json', id: 'language', name: 'Language' },
    { file: 'cultural.json', id: 'cultural', name: 'Cultural' },
  ];

  const works: Work[] = [];

  for (const area of areas) {
    try {
      const filePath = path.join(process.cwd(), 'lib/curriculum/data', area.file);
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      // Extract works from all categories
      for (const category of data.categories || []) {
        for (const work of category.works || []) {
          works.push({
            id: work.id,
            name: work.name,
            area: area.id,
            areaName: area.name,
            category: category.name,
            chineseName: work.chineseName,
          });
        }
      }
    } catch (err) {
      console.error(`Failed to load ${area.file}:`, err);
    }
  }

  cachedCurriculum = works;
  return works;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const area = searchParams.get('area');
  const search = searchParams.get('search')?.toLowerCase();

  try {
    let works = await loadCurriculum();

    // Filter by area
    if (area && area !== 'all') {
      works = works.filter(w => w.area === area);
    }

    // Filter by search
    if (search) {
      works = works.filter(w => 
        w.name.toLowerCase().includes(search) ||
        w.chineseName?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      works,
      count: works.length,
      areas: [
        { id: 'all', name: 'All', emoji: '📋' },
        { id: 'practical_life', name: 'Practical Life', emoji: '🧼' },
        { id: 'sensorial', name: 'Sensorial', emoji: '👁️' },
        { id: 'mathematics', name: 'Mathematics', emoji: '🔢' },
        { id: 'language', name: 'Language', emoji: '📚' },
        { id: 'cultural', name: 'Cultural', emoji: '🌍' },
      ]
    });

  } catch (error: any) {
    console.error('Curriculum API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
