#!/usr/bin/env node
/**
 * Bulk Import Students from Weekly Plan
 *
 * This script:
 * 1. Takes student data extracted from weekly plans
 * 2. Uses fuzzy matching to find closest curriculum works
 * 3. Generates SQL to insert students and their progress
 *
 * Usage: node scripts/bulk-import-students.js
 */

const fs = require('fs');
const path = require('path');

// ============================================
// FUZZY MATCHING ALGORITHM
// ============================================

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score (0-1) between two strings
 */
function similarity(a, b) {
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();

  // Exact match
  if (aLower === bLower) return 1;

  // Contains match (high score)
  if (aLower.includes(bLower) || bLower.includes(aLower)) return 0.9;

  // Word overlap score
  const aWords = new Set(aLower.split(/[\s\-_]+/));
  const bWords = new Set(bLower.split(/[\s\-_]+/));
  const intersection = [...aWords].filter(w => bWords.has(w));
  const wordScore = intersection.length / Math.max(aWords.size, bWords.size);

  // Levenshtein distance score
  const maxLen = Math.max(aLower.length, bLower.length);
  const distance = levenshtein(aLower, bLower);
  const levScore = 1 - (distance / maxLen);

  // Combined score (favor word overlap)
  return Math.max(wordScore * 0.8 + levScore * 0.2, levScore);
}

/**
 * Find best matching curriculum work for a teacher's work name
 */
function findBestMatch(teacherWorkName, curriculumWorks, area = null) {
  let bestMatch = null;
  let bestScore = 0;

  // Filter by area if provided
  const candidates = area
    ? curriculumWorks.filter(w => w.area === area)
    : curriculumWorks;

  for (const work of candidates) {
    const score = similarity(teacherWorkName, work.name);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = work;
    }
  }

  return { match: bestMatch, score: bestScore };
}

// ============================================
// LOAD CURRICULUM
// ============================================

function loadCurriculum() {
  const areas = ['practical-life', 'sensorial', 'math', 'language', 'cultural'];
  const allWorks = [];

  for (const area of areas) {
    const filePath = path.join(__dirname, '../lib/montree/stem', area + '.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const areaKey = data.id || area.replace('-', '_');

    for (const cat of data.categories || []) {
      for (const work of cat.works || []) {
        allWorks.push({
          area: areaKey,
          category: cat.id,
          name: work.name,
          id: work.id,
          sequence: work.sequence || 0
        });
      }
    }
  }

  return allWorks;
}

// ============================================
// STUDENT DATA FROM WEEKLY PLAN (Week 19)
// ============================================

// Extracted from the PDF - 20 students from Whale Class
const STUDENTS = [
  { name: 'Amy', works: { practical_life: 'Cutting Practice', sensorial: 'Constructive Triangles 3', math: 'Number Formation', language: 'Review Box 1', cultural: 'Colored Globe' }},
  { name: 'Austin', works: { practical_life: 'Flower Arranging', sensorial: 'Thermal Tablets Pairing', math: 'Bank Game Addition', language: 'Word Building Work with /i/', cultural: 'Bird Studies' }},
  { name: 'Eric', works: { practical_life: 'Table Washing', sensorial: 'Geometry Figures', math: 'Positive Snake Game', language: 'Word Family Work with /u/', cultural: 'Leaves Combined' }},
  { name: 'Gengerlyn', works: { practical_life: 'Flower Arranging', sensorial: 'Binomial Cube', math: 'Numerals and Counters', language: 'CVC 3-Part Cards Moveable Alphabet', cultural: null }},
  { name: 'Hayden', works: { practical_life: 'Table Washing', sensorial: 'Color Box 3', math: 'Number and Quantity', language: 'I Spy Red Book 1', cultural: 'Tree Puzzle LA' }},
  { name: 'Henry', works: { practical_life: 'Spooning Practice', sensorial: 'Touch Boards', math: 'Linear Counting 5', language: 'Matching Work', cultural: 'Horse Puzzle LA' }},
  { name: 'Jimmy', works: { practical_life: 'Dressing Frame Bow', sensorial: 'Constructive Triangles', math: 'Long Chain with Labels', language: 'Word Family Work with /i/', cultural: 'How to Make Ice' }},
  { name: 'Joey', works: { practical_life: 'Stringing Seed Beads', sensorial: 'Color Box 3', math: 'Linear Counting 6', language: 'Word Family Work with /u/', cultural: 'Bird Puzzle' }},
  { name: 'Kayla', works: { practical_life: 'Knitting', sensorial: 'Sensorial Games', math: 'Number Formation', language: 'I Spy Red Book 1', cultural: 'Horse Puzzle LA' }},
  { name: 'Kevin', works: { practical_life: 'Rubber Band Skipping', sensorial: 'Tasting Bottles', math: 'Finger Chart 2', language: 'Phonics Book 2', cultural: 'Tree Puzzle' }},
  { name: 'KK', works: { practical_life: 'Braiding', sensorial: 'Roman Arch', math: 'Positive Snake Game', language: 'Word Building Work with /u/', cultural: 'Bird Puzzle LA' }},
  { name: 'Leo', works: { practical_life: 'Dressing Frame Shoes', sensorial: 'Geometry Combined with Cards', math: 'Boards with Numbers', language: 'Word Building Work with /o/', cultural: 'Maps' }},
  { name: 'Lucky', works: { practical_life: 'Food Preparation', sensorial: 'Geometry Figures', math: 'Skip Counting by 8', language: 'Word Family Work with /o/', cultural: 'Cultural Envelope' }},
  { name: 'MaoMao', works: { practical_life: 'Table Washing', sensorial: 'Color Box 3', math: 'Number Rods', language: 'Beginning Sounds - I Spy', cultural: null }},
  { name: 'MingXi', works: { practical_life: 'Weaving Craft', sensorial: 'Bells Matching', math: 'Bank Game Addition', language: 'Word Building Work with /o/', cultural: 'Maps' }},
  { name: 'NiuNiu', works: { practical_life: 'Folding', sensorial: 'Constructive Triangles', math: 'Linear Counting 8', language: 'Word Building Work with /e/', cultural: 'Roman Arch' }},
  { name: 'Rachel', works: { practical_life: 'Knitting', sensorial: 'Geometric Solids', math: 'Bank Game Addition', language: 'Word Building Work with /i/', cultural: 'Color Mixing' }},
  { name: 'Segina', works: { practical_life: 'Wet Pouring', sensorial: 'Pink Tower LA Game', math: 'Number Rods with Cards', language: 'Matching Work', cultural: 'Bird Puzzle LA' }},
  { name: 'Stella', works: { practical_life: 'Dressing Frame', sensorial: 'Roman Arch Practice', math: 'Bank Game Addition', language: 'Word Building Work with /e/', cultural: 'Leaf Shape Cabinet and Cards' }},
  { name: 'YueZe', works: { practical_life: 'Fuse Bead Work', sensorial: 'Thermal Tablets Grading', math: 'Finger Charts 3', language: 'Mixed Box 1', cultural: 'Bird Nomenclature' }},
];

// ============================================
// CUSTOM MAPPINGS (known teacher -> curriculum translations)
// ============================================

const CUSTOM_MAPPINGS = {
  // Practical Life
  'cutting practice': 'Scissors - Cutting Strips',
  'flower arranging': 'Flower Arranging',
  'table washing': 'Table Washing',
  'spooning practice': 'Spooning',
  'dressing frame bow': 'Dressing Frames - Bow',
  'stringing seed beads': 'Stringing Beads',
  'knitting': 'Knitting',
  'rubber band skipping': 'Outdoor Games', // No direct match
  'braiding': 'Braiding',
  'dressing frame shoes': 'Dressing Frames - Shoe Lacing',
  'food preparation': 'Food Preparation',
  'weaving craft': 'Weaving',
  'folding': 'Folding Cloths',
  'wet pouring': 'Wet Pouring',
  'dressing frame': 'Dressing Frames',
  'fuse bead work': 'Art Activities', // No direct match

  // Sensorial
  'constructive triangles 3': 'Constructive Triangles - Triangular Box',
  'constructive triangles': 'Constructive Triangles - Rectangular Box',
  'thermal tablets pairing': 'Thermic Tablets',
  'geometry figures': 'Geometric Solids',
  'binomial cube': 'Binomial Cube',
  'color box 3': 'Color Box 3 (Color Gradations)',
  'touch boards': 'Touch Boards (Rough and Smooth)',
  'sensorial games': 'Sensorial Memory Games',
  'tasting bottles': 'Tasting Bottles',
  'roman arch': 'Roman Arch',
  'geometry combined with cards': 'Geometric Cabinet',
  'bells matching': 'Bells',
  'geometric solids': 'Geometric Solids',
  'pink tower la game': 'Pink Tower',
  'roman arch practice': 'Roman Arch',
  'thermal tablets grading': 'Thermic Tablets',

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
  'boards with numbers': 'Seguin Board A (Teens)',
  'skip counting by 8': 'Skip Counting Chains',
  'number rods': 'Number Rods',
  'number rods with cards': 'Number Rods with Numerals',
  'finger charts 3': 'Addition Finger Charts',

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
  'roman arch': 'Roman Arch',
  'color mixing': 'Color Mixing Experiments',
  'leaf shape cabinet and cards': 'Botany - Leaf Cabinet',
  'bird nomenclature': 'Zoology Nomenclature Cards',
};

// ============================================
// MAIN PROCESSING
// ============================================

function processStudents() {
  console.log('Loading curriculum...');
  const curriculum = loadCurriculum();
  console.log(`Loaded ${curriculum.length} curriculum works\n`);

  const results = [];
  const unmatchedWorks = new Set();

  for (const student of STUDENTS) {
    const studentResult = {
      name: student.name,
      matches: {}
    };

    for (const [area, teacherWork] of Object.entries(student.works)) {
      if (!teacherWork) {
        studentResult.matches[area] = {
          teacher: null,
          curriculum: null,
          score: 0,
          method: 'none'
        };
        continue;
      }

      const teacherLower = teacherWork.toLowerCase().trim();

      // Try custom mapping first
      if (CUSTOM_MAPPINGS[teacherLower]) {
        const mappedName = CUSTOM_MAPPINGS[teacherLower];
        const currWork = curriculum.find(w =>
          w.name.toLowerCase() === mappedName.toLowerCase()
        );

        if (currWork) {
          studentResult.matches[area] = {
            teacher: teacherWork,
            curriculum: currWork.name,
            curriculumId: currWork.id,
            score: 1,
            method: 'custom'
          };
          continue;
        }
      }

      // Fall back to fuzzy matching
      const { match, score } = findBestMatch(teacherWork, curriculum, area);

      if (match && score > 0.5) {
        studentResult.matches[area] = {
          teacher: teacherWork,
          curriculum: match.name,
          curriculumId: match.id,
          score: Math.round(score * 100) / 100,
          method: 'fuzzy'
        };
      } else {
        // No good match - use teacher's name as-is
        studentResult.matches[area] = {
          teacher: teacherWork,
          curriculum: teacherWork, // Use teacher's name
          curriculumId: null,
          score: score ? Math.round(score * 100) / 100 : 0,
          method: 'unmatched'
        };
        unmatchedWorks.add(`${area}: ${teacherWork}`);
      }
    }

    results.push(studentResult);
  }

  return { results, unmatchedWorks: [...unmatchedWorks] };
}

// ============================================
// SQL GENERATION
// ============================================

function generateSQL(results, classroomId) {
  const lines = [];

  lines.push('-- Bulk Import Students for Whale Class');
  lines.push('-- Generated: ' + new Date().toISOString());
  lines.push('-- Classroom ID: ' + classroomId);
  lines.push('');
  lines.push('-- Note: This uses the EXISTING classroom. Make sure curriculum is seeded first.');
  lines.push('');

  // Generate student inserts
  lines.push('-- ============================================');
  lines.push('-- INSERT STUDENTS');
  lines.push('-- ============================================');
  lines.push('');

  for (const student of results) {
    lines.push(`-- ${student.name}`);
    lines.push(`INSERT INTO montree_children (classroom_id, name, age)`);
    lines.push(`VALUES ('${classroomId}', '${student.name}', 4)`);
    lines.push(`ON CONFLICT DO NOTHING;`);
    lines.push('');
  }

  // Generate progress inserts
  lines.push('-- ============================================');
  lines.push('-- INSERT PROGRESS (current works)');
  lines.push('-- ============================================');
  lines.push('');

  const areaMap = {
    practical_life: 'practical_life',
    sensorial: 'sensorial',
    math: 'mathematics',
    language: 'language',
    cultural: 'cultural'
  };

  for (const student of results) {
    lines.push(`-- ${student.name}'s current works`);

    for (const [area, match] of Object.entries(student.matches)) {
      if (!match.teacher) continue;

      const areaKey = areaMap[area] || area;
      const workName = match.curriculum || match.teacher;
      const confidence = match.method === 'custom' ? 'HIGH' :
                        match.method === 'fuzzy' ? `MEDIUM (${match.score})` : 'LOW';

      lines.push(`-- ${area}: "${match.teacher}" -> "${workName}" [${confidence}]`);
      lines.push(`INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)`);
      lines.push(`SELECT c.id, '${workName.replace(/'/g, "''")}', '${areaKey}', 'presented', NOW()`);
      lines.push(`FROM montree_children c WHERE c.name = '${student.name}' AND c.classroom_id = '${classroomId}'`);
      lines.push(`ON CONFLICT DO NOTHING;`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ============================================
// GENERATE REPORT
// ============================================

function generateReport(results, unmatchedWorks) {
  console.log('='.repeat(60));
  console.log('BULK IMPORT MATCHING REPORT');
  console.log('='.repeat(60));
  console.log('');

  let totalMatches = 0;
  let customMatches = 0;
  let fuzzyMatches = 0;
  let unmatched = 0;

  for (const student of results) {
    console.log(`\n📚 ${student.name}`);
    console.log('-'.repeat(40));

    for (const [area, match] of Object.entries(student.matches)) {
      if (!match.teacher) {
        console.log(`  ${area.padEnd(15)} (none)`);
        continue;
      }

      const icon = match.method === 'custom' ? '✅' :
                  match.method === 'fuzzy' ? '🔶' : '❌';

      console.log(`  ${area.padEnd(15)} ${icon} "${match.teacher}"`);
      if (match.curriculum !== match.teacher) {
        console.log(`                  → "${match.curriculum}" (${match.method}, ${match.score})`);
      }

      totalMatches++;
      if (match.method === 'custom') customMatches++;
      else if (match.method === 'fuzzy') fuzzyMatches++;
      else unmatched++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total matches attempted: ${totalMatches}`);
  console.log(`  ✅ Custom mappings:    ${customMatches} (${Math.round(customMatches/totalMatches*100)}%)`);
  console.log(`  🔶 Fuzzy matches:      ${fuzzyMatches} (${Math.round(fuzzyMatches/totalMatches*100)}%)`);
  console.log(`  ❌ Unmatched:          ${unmatched} (${Math.round(unmatched/totalMatches*100)}%)`);

  if (unmatchedWorks.length > 0) {
    console.log('\n⚠️  UNMATCHED WORKS (add to CUSTOM_MAPPINGS):');
    unmatchedWorks.forEach(w => console.log(`    - ${w}`));
  }
}

// ============================================
// RUN
// ============================================

const CLASSROOM_ID = process.argv[2] || 'YOUR_CLASSROOM_ID_HERE';

console.log('Processing students...\n');
const { results, unmatchedWorks } = processStudents();

// Generate and save SQL
const sql = generateSQL(results, CLASSROOM_ID);
const sqlPath = path.join(__dirname, '../migrations/seed-whale-class-students.sql');
fs.writeFileSync(sqlPath, sql);
console.log(`\n✅ SQL saved to: ${sqlPath}`);

// Show report
generateReport(results, unmatchedWorks);

// Also output JSON for review
const jsonPath = path.join(__dirname, '../whale-class-import.json');
fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
console.log(`\n✅ JSON saved to: ${jsonPath}`);
