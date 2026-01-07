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

// Search for work by exact ID
function findWorkById(workId: string): { work: CurriculumWork | null; area: string; category: string } {
  const normalizedId = workId.toLowerCase().trim();
  
  for (const area of allAreas) {
    for (const category of area.categories) {
      for (const work of category.works) {
        if (work.id.toLowerCase() === normalizedId) {
          return { work, area: area.name, category: category.name };
        }
      }
    }
  }
  
  return { work: null, area: '', category: '' };
}

// Search for work by name with improved matching
function findWorkByName(searchName: string): { work: CurriculumWork | null; area: string; category: string } {
  const normalizedSearch = searchName.toLowerCase().trim();
  
  // 1. Try exact match first
  for (const area of allAreas) {
    for (const category of area.categories) {
      for (const work of category.works) {
        if (work.name.toLowerCase() === normalizedSearch) {
          return { work, area: area.name, category: category.name };
        }
      }
    }
  }
  
  // 2. Try Chinese name exact match
  for (const area of allAreas) {
    for (const category of area.categories) {
      for (const work of category.works) {
        if (work.chineseName && work.chineseName === searchName) {
          return { work, area: area.name, category: category.name };
        }
      }
    }
  }
  
  // 3. Try "starts with" match (e.g., "Pink Tower" matches "Pink Tower")
  for (const area of allAreas) {
    for (const category of area.categories) {
      for (const work of category.works) {
        if (work.name.toLowerCase().startsWith(normalizedSearch) || 
            normalizedSearch.startsWith(work.name.toLowerCase())) {
          return { work, area: area.name, category: category.name };
        }
      }
    }
  }
  
  // 4. Try word-based matching (all search words must be in work name)
  const searchWords = normalizedSearch.split(/\s+/).filter(w => w.length > 2);
  if (searchWords.length > 0) {
    for (const area of allAreas) {
      for (const category of area.categories) {
        for (const work of category.works) {
          const workLower = work.name.toLowerCase();
          const allWordsMatch = searchWords.every(sw => workLower.includes(sw));
          if (allWordsMatch) {
            return { work, area: area.name, category: category.name };
          }
        }
      }
    }
  }
  
  // 5. Try partial match - work name contains search or vice versa (but require significant overlap)
  for (const area of allAreas) {
    for (const category of area.categories) {
      for (const work of category.works) {
        const workLower = work.name.toLowerCase();
        // Require at least 60% character overlap
        const minLength = Math.min(workLower.length, normalizedSearch.length);
        if (minLength >= 4) {
          if (workLower.includes(normalizedSearch) || normalizedSearch.includes(workLower)) {
            return { work, area: area.name, category: category.name };
          }
        }
      }
    }
  }
  
  // 6. Levenshtein-like fuzzy match for close names (typos, slight variations)
  let bestMatch: { work: CurriculumWork; area: string; category: string; score: number } | null = null;
  
  for (const area of allAreas) {
    for (const category of area.categories) {
      for (const work of category.works) {
        const workLower = work.name.toLowerCase();
        const score = similarityScore(normalizedSearch, workLower);
        if (score > 0.7 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { work, area: area.name, category: category.name, score };
        }
      }
    }
  }
  
  if (bestMatch) {
    return { work: bestMatch.work, area: bestMatch.area, category: bestMatch.category };
  }
  
  return { work: null, area: '', category: '' };
}

// Simple similarity score (0-1) based on common characters
function similarityScore(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  
  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));
  const intersection = [...setA].filter(c => setB.has(c)).length;
  const union = new Set([...setA, ...setB]).size;
  
  // Jaccard similarity + length penalty
  const jaccardSim = intersection / union;
  const lengthRatio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
  
  return (jaccardSim * 0.6) + (lengthRatio * 0.4);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workName = searchParams.get('name');
  const workId = searchParams.get('id');
  
  if (!workName && !workId) {
    return NextResponse.json({ error: 'Missing name or id parameter' }, { status: 400 });
  }
  
  let result: { work: CurriculumWork | null; area: string; category: string };
  
  // If ID is provided, try ID lookup first
  if (workId) {
    result = findWorkById(workId);
    // If ID lookup fails, try name-based search on the ID (might be a name stored as ID)
    if (!result.work) {
      result = findWorkByName(workId);
    }
  } else {
    result = findWorkByName(workName || '');
  }
  
  const { work, area, category } = result;
  
  if (!work) {
    return NextResponse.json({ 
      found: false,
      message: 'No description found for this work',
      searchTerm: workId || workName
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
