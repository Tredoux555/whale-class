// /api/montree/admin/import-students/route.ts
// Bulk import students with fuzzy-matched curriculum works
// POST: { classroomId, students: [{ name, age?, works: { practical_life, sensorial, math, language, cultural }}] }

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ============================================
// FUZZY MATCHING
// ============================================

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function similarity(a: string, b: string): number {
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();
  if (aLower === bLower) return 1;
  if (aLower.includes(bLower) || bLower.includes(aLower)) return 0.9;

  const aWords = new Set(aLower.split(/[\s\-_]+/));
  const bWords = new Set(bLower.split(/[\s\-_]+/));
  const intersection = [...aWords].filter(w => bWords.has(w));
  const wordScore = intersection.length / Math.max(aWords.size, bWords.size);

  const maxLen = Math.max(aLower.length, bLower.length);
  const levScore = 1 - (levenshtein(aLower, bLower) / maxLen);

  return Math.max(wordScore * 0.8 + levScore * 0.2, levScore);
}

// ============================================
// CUSTOM MAPPINGS (teacher names -> curriculum names)
// ============================================

const CUSTOM_MAPPINGS: Record<string, string> = {
  // Practical Life
  'cutting practice': 'Cutting with Scissors',
  'flower arranging': 'Flower Arranging',
  'table washing': 'Table Scrubbing',
  'spooning practice': 'Spooning',
  'dressing frame bow': 'Dressing Frames',
  'dressing frame shoes': 'Dressing Frames',
  'dressing frame': 'Dressing Frames',
  'stringing seed beads': 'Stringing Beads',
  'knitting': 'Knitting',
  'braiding': 'Braiding',
  'food preparation': 'Food Preparation',
  'weaving craft': 'Weaving',
  'folding': 'Folding Cloths',
  'wet pouring': 'Wet Pouring',
  'fuse bead work': 'Art Activities',
  'rubber band skipping': 'Outdoor Games',

  // Sensorial
  'constructive triangles 3': 'Constructive Triangles - Triangular Box',
  'constructive triangles': 'Constructive Triangles - Rectangular Box',
  'thermal tablets pairing': 'Thermic Tablets',
  'thermal tablets grading': 'Thermic Tablets',
  'geometry figures': 'Geometric Solids',
  'binomial cube': 'Binomial Cube',
  'color box 3': 'Color Box 3 (Color Gradations)',
  'touch boards': 'Touch Boards (Rough and Smooth)',
  'sensorial games': 'Sensorial Memory Games',
  'tasting bottles': 'Tasting Bottles',
  'roman arch': 'Roman Arch',
  'roman arch practice': 'Roman Arch',
  'geometry combined with cards': 'Geometric Cabinet',
  'bells matching': 'Bells',
  'geometric solids': 'Geometric Solids',
  'pink tower la game': 'Pink Tower',

  // Mathematics
  'number formation': 'Sandpaper Numerals',
  'bank game addition': 'Bank Game (Addition)',
  'positive snake game': 'Positive Snake Game',
  'numerals and counters': 'Cards and Counters',
  'number and quantity': 'Association of Quantity and Symbol',
  'linear counting 5': 'Linear Counting - Five Chain',
  'linear counting 6': 'Linear Counting - Six Chain',
  'linear counting 8': 'Linear Counting - Eight Chain',
  'long chain with labels': 'Long Chains',
  'finger chart 2': 'Addition Finger Charts',
  'finger charts 3': 'Addition Finger Charts',
  'boards with numbers': 'Seguin Board A (Teens)',
  'skip counting by 8': 'Skip Counting Chains',
  'number rods': 'Number Rods',
  'number rods with cards': 'Number Rods with Numerals',

  // Language
  'review box 1': 'Phonetic Object Boxes',
  'word building work with /i/': 'Moveable Alphabet',
  'word building work with /u/': 'Moveable Alphabet',
  'word building work with /o/': 'Moveable Alphabet',
  'word building work with /e/': 'Moveable Alphabet',
  'word family work with /u/': 'Word Families',
  'word family work with /i/': 'Word Families',
  'word family work with /o/': 'Word Families',
  'cvc 3-part cards moveable alphabet': 'Moveable Alphabet',
  'i spy red book 1': 'Sound Games (I Spy)',
  'matching work': 'Object to Picture Matching',
  'phonics book 2': 'Phonetic Readers',
  'beginning sounds - i spy': 'Sound Games (I Spy)',
  'mixed box 1': 'Phonetic Object Boxes',

  // Cultural
  'colored globe': 'Globe - Continents',
  'bird studies': 'Animal Studies',
  'leaves combined': 'Botany - Leaf Cabinet',
  'tree puzzle la': 'Botany Puzzles',
  'horse puzzle la': 'Animal Puzzles',
  'how to make ice': 'Science Experiments',
  'bird puzzle': 'Animal Puzzles',
  'bird puzzle la': 'Animal Puzzles',
  'tree puzzle': 'Botany Puzzles',
  'maps': 'Puzzle Maps - Individual Continents',
  'cultural envelope': 'Country Study Cards',
  'color mixing': 'Color Mixing Experiments',
  'leaf shape cabinet and cards': 'Botany - Leaf Cabinet',
  'bird nomenclature': 'Zoology Nomenclature Cards',
};

const AREA_MAP: Record<string, string> = {
  practical_life: 'practical_life',
  sensorial: 'sensorial',
  math: 'mathematics',
  mathematics: 'mathematics',
  language: 'language',
  cultural: 'cultural',
};

interface StudentInput {
  name: string;
  age?: number;
  works: Record<string, string | null>;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { classroomId, students } = await request.json() as {
      classroomId: string;
      students: StudentInput[];
    };

    if (!classroomId) {
      return NextResponse.json({ error: 'classroomId required' }, { status: 400 });
    }

    if (!students?.length) {
      return NextResponse.json({ error: 'students array required' }, { status: 400 });
    }

    // Verify classroom exists
    const { data: classroom, error: classroomError } = await supabase
      .from('montree_classrooms')
      .select('id, name')
      .eq('id', classroomId)
      .single();

    if (classroomError || !classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Get curriculum works for fuzzy matching
    const { data: curriculumWorks } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name, area_id')
      .eq('classroom_id', classroomId);

    const { data: curriculumAreas } = await supabase
      .from('montree_classroom_curriculum_areas')
      .select('id, area_key')
      .eq('classroom_id', classroomId);

    const areaIdToKey: Record<string, string> = {};
    const areaKeyToId: Record<string, string> = {};
    for (const area of curriculumAreas || []) {
      areaIdToKey[area.id] = area.area_key;
      areaKeyToId[area.area_key] = area.id;
    }

    // Build work lookup
    const worksByArea: Record<string, { id: string; name: string }[]> = {};
    for (const work of curriculumWorks || []) {
      const areaKey = areaIdToKey[work.area_id] || 'unknown';
      if (!worksByArea[areaKey]) worksByArea[areaKey] = [];
      worksByArea[areaKey].push({ id: work.id, name: work.name });
    }

    const results: any[] = [];
    const errors: string[] = [];

    for (const student of students) {
      if (!student.name?.trim()) {
        errors.push('Student with empty name skipped');
        continue;
      }

      // Create student
      const { data: createdChild, error: childError } = await supabase
        .from('montree_children')
        .insert({
          classroom_id: classroomId,
          name: student.name.trim(),
          age: Math.round(student.age || 4),
        })
        .select()
        .single();

      if (childError || !createdChild) {
        errors.push(`Failed to create ${student.name}: ${childError?.message}`);
        continue;
      }

      const matchResults: any[] = [];

      // Create progress for each work
      for (const [area, teacherWork] of Object.entries(student.works)) {
        if (!teacherWork) continue;

        const areaKey = AREA_MAP[area] || area;
        const teacherLower = teacherWork.toLowerCase().trim();

        // Try custom mapping first
        let matchedWorkName = CUSTOM_MAPPINGS[teacherLower];
        let matchMethod = 'custom';
        let matchScore = 1;

        if (!matchedWorkName) {
          // Fuzzy match against curriculum
          const areaWorks = worksByArea[areaKey] || [];
          let bestMatch: { id: string; name: string } | null = null;
          let bestScore = 0;

          for (const work of areaWorks) {
            const score = similarity(teacherWork, work.name);
            if (score > bestScore) {
              bestScore = score;
              bestMatch = work;
            }
          }

          if (bestMatch && bestScore > 0.5) {
            matchedWorkName = bestMatch.name;
            matchMethod = 'fuzzy';
            matchScore = bestScore;
          } else {
            // Use teacher's name as-is
            matchedWorkName = teacherWork;
            matchMethod = 'unmatched';
            matchScore = 0;
          }
        }

        // Insert progress record
        const { error: progressError } = await supabase
          .from('montree_child_progress')
          .insert({
            child_id: createdChild.id,
            work_name: matchedWorkName,
            area: areaKey,
            status: 'presented',
            presented_at: new Date().toISOString(),
            notes: matchMethod === 'unmatched'
              ? `Original: ${teacherWork} (unmatched)`
              : matchMethod === 'fuzzy'
              ? `Original: ${teacherWork} (fuzzy ${Math.round(matchScore * 100)}%)`
              : null,
          });

        if (progressError) {
          errors.push(`Progress error for ${student.name}/${area}: ${progressError.message}`);
        }

        matchResults.push({
          area: areaKey,
          original: teacherWork,
          matched: matchedWorkName,
          method: matchMethod,
          score: matchScore,
        });
      }

      results.push({
        student: student.name,
        childId: createdChild.id,
        matches: matchResults,
      });
    }

    return NextResponse.json({
      success: true,
      imported: results.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('Import students error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
