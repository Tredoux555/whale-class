import { NextRequest, NextResponse } from 'next/server';
import practicalLifeData from '@/lib/curriculum/data/practical-life.json';
import sensorialData from '@/lib/curriculum/data/sensorial.json';
import mathData from '@/lib/curriculum/data/math.json';
import languageData from '@/lib/curriculum/data/language.json';
import culturalData from '@/lib/curriculum/data/cultural.json';

interface WorkLevel {
  level: number;
  name: string;
  description: string;
  videoSearchTerms?: string[];
}

interface CurriculumWork {
  id: string;
  name: string;
  description: string;
  ageRange?: string;
  materials?: string[];
  directAims?: string[];
  indirectAims?: string[];
  controlOfError?: string;
  chineseName?: string;
  levels?: WorkLevel[];
}

interface Category {
  id: string;
  name: string;
  description: string;
  works: CurriculumWork[];
}

interface AreaData {
  id: string;
  name: string;
  categories: Category[];
}

// Load all curriculum data
const allAreas: AreaData[] = [
  practicalLifeData as AreaData,
  sensorialData as AreaData,
  mathData as AreaData,
  languageData as AreaData,
  culturalData as AreaData,
];

// Search for work by name (fuzzy match)
function findWork(searchName: string): { work: CurriculumWork | null; area: string; category: string } {
  const normalizedSearch = searchName.toLowerCase().trim();
  
  for (const area of allAreas) {
    for (const category of area.categories) {
      for (const work of category.works) {
        // Exact match
        if (work.name.toLowerCase() === normalizedSearch) {
          return { work, area: area.name, category: category.name };
        }
        // Contains match
        if (work.name.toLowerCase().includes(normalizedSearch) || 
            normalizedSearch.includes(work.name.toLowerCase())) {
          return { work, area: area.name, category: category.name };
        }
        // Chinese name match
        if (work.chineseName && work.chineseName.includes(normalizedSearch)) {
          return { work, area: area.name, category: category.name };
        }
      }
    }
  }
  
  // Fuzzy search - word matching
  for (const area of allAreas) {
    for (const category of area.categories) {
      for (const work of category.works) {
        const searchWords = normalizedSearch.split(/\s+/);
        const workWords = work.name.toLowerCase().split(/\s+/);
        const matchCount = searchWords.filter(sw => 
          workWords.some(ww => ww.includes(sw) || sw.includes(ww))
        ).length;
        if (matchCount >= Math.max(1, searchWords.length / 2)) {
          return { work, area: area.name, category: category.name };
        }
      }
    }
  }
  
  return { work: null, area: '', category: '' };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workName = searchParams.get('name');
  const workId = searchParams.get('id');
  
  if (!workName && !workId) {
    return NextResponse.json({ error: 'Missing name or id parameter' }, { status: 400 });
  }
  
  const searchTerm = workName || workId || '';
  const { work, area, category } = findWork(searchTerm);
  
  if (!work) {
    return NextResponse.json({ 
      found: false,
      message: 'No description found for this work',
      searchTerm 
    });
  }
  
  return NextResponse.json({
    found: true,
    work: {
      id: work.id,
      name: work.name,
      description: work.description,
      chineseName: work.chineseName,
      materials: work.materials || [],
      directAims: work.directAims || [],
      indirectAims: work.indirectAims || [],
      controlOfError: work.controlOfError || '',
      levels: work.levels || [],
      ageRange: work.ageRange,
    },
    area,
    category,
  });
}
