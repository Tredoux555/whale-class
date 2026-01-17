// /api/montree-v2/curriculum/route.ts
// Returns curriculum works organized by area for the Add Work page
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

interface CurriculumWork {
  id: string;
  name: string;
  description?: string;
  chineseName?: string;
}

interface CurriculumCategory {
  id: string;
  name: string;
  works: CurriculumWork[];
}

interface CurriculumArea {
  id: string;
  name: string;
  emoji: string;
  color: string;
  categories: CurriculumCategory[];
}

// Area metadata
const AREA_META: Record<string, { emoji: string; color: string }> = {
  practical_life: { emoji: '🧼', color: '#22c55e' },
  sensorial: { emoji: '👁️', color: '#f97316' },
  mathematics: { emoji: '🔢', color: '#3b82f6' },
  language: { emoji: '📚', color: '#ec4899' },
  cultural: { emoji: '🌍', color: '#8b5cf6' },
};

const AREA_FILES = [
  { id: 'practical_life', file: 'practical-life.json', name: 'Practical Life' },
  { id: 'sensorial', file: 'sensorial.json', name: 'Sensorial' },
  { id: 'mathematics', file: 'math.json', name: 'Mathematics' },
  { id: 'language', file: 'language.json', name: 'Language' },
  { id: 'cultural', file: 'cultural.json', name: 'Cultural' },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const areaFilter = searchParams.get('area');
  const searchQuery = searchParams.get('search')?.toLowerCase();

  try {
    const curriculumDir = path.join(process.cwd(), 'lib', 'curriculum', 'data');
    const areas: CurriculumArea[] = [];
    let totalWorks = 0;

    for (const areaInfo of AREA_FILES) {
      // Skip if filtering by area and doesn't match
      if (areaFilter && areaFilter !== 'all' && areaFilter !== areaInfo.id) {
        continue;
      }

      try {
        const filePath = path.join(curriculumDir, areaInfo.file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(fileContent);

        const meta = AREA_META[areaInfo.id] || { emoji: '📋', color: '#6b7280' };
        
        const categories: CurriculumCategory[] = [];
        
        for (const cat of data.categories || []) {
          const works: CurriculumWork[] = [];
          
          for (const work of cat.works || []) {
            // Apply search filter if provided
            if (searchQuery) {
              const matchesSearch = 
                work.name?.toLowerCase().includes(searchQuery) ||
                work.id?.toLowerCase().includes(searchQuery) ||
                work.chineseName?.toLowerCase().includes(searchQuery);
              if (!matchesSearch) continue;
            }
            
            works.push({
              id: work.id,
              name: work.name,
              description: work.description,
              chineseName: work.chineseName,
            });
            totalWorks++;
          }
          
          if (works.length > 0) {
            categories.push({
              id: cat.id,
              name: cat.name,
              works,
            });
          }
        }

        if (categories.length > 0) {
          areas.push({
            id: areaInfo.id,
            name: data.name || areaInfo.name,
            emoji: meta.emoji,
            color: meta.color,
            categories,
          });
        }
      } catch (err) {
        console.warn(`[Curriculum API] Failed to load ${areaInfo.file}:`, err);
        continue;
      }
    }

    return NextResponse.json({
      areas,
      totalWorks,
      filters: {
        area: areaFilter || 'all',
        search: searchQuery || null,
      }
    });

  } catch (error: any) {
    console.error('[Curriculum API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
