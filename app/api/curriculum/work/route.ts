import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface Level {
  level: number;
  name: string;
  description: string;
  videoSearchTerms: string[];
}

interface Work {
  id: string;
  name: string;
  description: string;
  ageRange: string;
  prerequisites: string[];
  sequence: number;
  materials: string[];
  directAims: string[];
  indirectAims: string[];
  controlOfError: string;
  chineseName: string;
  imageUrl?: string;
  levels: Level[];
}

interface Category {
  id: string;
  name: string;
  works: Work[];
}

interface Area {
  id: string;
  name: string;
  categories: Category[];
}

// Cache for curriculum data
let curriculumCache: Map<string, Work> | null = null;

async function loadCurriculumData(): Promise<Map<string, Work>> {
  if (curriculumCache) return curriculumCache;

  const dataDir = path.join(process.cwd(), 'lib/curriculum/data');
  const files = [
    'practical-life.json',
    'sensorial.json', 
    'math.json',
    'language.json',
    'cultural.json',
  ];

  const workMap = new Map<string, Work>();

  for (const file of files) {
    try {
      const filePath = path.join(dataDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const area: Area = JSON.parse(content);

      for (const category of area.categories) {
        for (const work of category.works) {
          workMap.set(work.id, work);
        }
      }
    } catch (error) {
      console.error(`Error loading ${file}:`, error);
    }
  }

  curriculumCache = workMap;
  return workMap;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workId = searchParams.get('id');

  if (!workId) {
    return NextResponse.json({ error: 'Work ID required' }, { status: 400 });
  }

  try {
    const workMap = await loadCurriculumData();
    const work = workMap.get(workId);

    if (!work) {
      return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    }

    return NextResponse.json({ work });
  } catch (error) {
    console.error('Error fetching work:', error);
    return NextResponse.json({ error: 'Failed to fetch work' }, { status: 500 });
  }
}
