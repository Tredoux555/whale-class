/**
 * Seed 20 generic students into the "Demo 1" school.
 *
 * Run from the project root:
 *   npx tsx scripts/seed-demo-students.ts
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const SCHOOL_ID = '64d7156e-3e1f-478a-89b4-26f519833d16'; // Demo 1

const STUDENTS = [
  { name: 'Emma', age: 3, gender: 'she' },
  { name: 'Liam', age: 4, gender: 'he' },
  { name: 'Sophia', age: 3.5, gender: 'she' },
  { name: 'Noah', age: 5, gender: 'he' },
  { name: 'Olivia', age: 4, gender: 'she' },
  { name: 'James', age: 3, gender: 'he' },
  { name: 'Ava', age: 4.5, gender: 'she' },
  { name: 'William', age: 5, gender: 'he' },
  { name: 'Isabella', age: 3, gender: 'she' },
  { name: 'Benjamin', age: 4, gender: 'he' },
  { name: 'Mia', age: 3.5, gender: 'she' },
  { name: 'Lucas', age: 5, gender: 'he' },
  { name: 'Charlotte', age: 4, gender: 'she' },
  { name: 'Henry', age: 3, gender: 'he' },
  { name: 'Amelia', age: 4.5, gender: 'she' },
  { name: 'Alexander', age: 5, gender: 'he' },
  { name: 'Harper', age: 3, gender: 'she' },
  { name: 'Daniel', age: 4, gender: 'he' },
  { name: 'Evelyn', age: 3.5, gender: 'she' },
  { name: 'Matthew', age: 5, gender: 'he' },
];

async function main() {
  console.log('Looking up classroom for Demo 1 school...');

  // 1. Get classroom ID
  const { data: classrooms, error: classroomErr } = await supabase
    .from('montree_classrooms')
    .select('id, name')
    .eq('school_id', SCHOOL_ID);

  if (classroomErr) {
    console.error('Error querying classrooms:', classroomErr.message);
    process.exit(1);
  }

  if (!classrooms || classrooms.length === 0) {
    console.error('No classroom found for school', SCHOOL_ID);
    process.exit(1);
  }

  const classroomId = classrooms[0].id;
  console.log(`Found classroom: ${classrooms[0].name} (${classroomId})`);

  // 2. Check if students already exist (prevent duplicates)
  const { data: existing, error: existErr } = await supabase
    .from('montree_children')
    .select('id, name')
    .eq('classroom_id', classroomId);

  if (existErr) {
    // Try alternate table name
    console.log('montree_children failed, trying "children" table...');
    const { data: existing2, error: existErr2 } = await supabase
      .from('children')
      .select('id, name')
      .eq('classroom_id', classroomId);

    if (existErr2) {
      console.error('Neither montree_children nor children table accessible:', existErr.message, existErr2.message);
      process.exit(1);
    }

    if (existing2 && existing2.length > 0) {
      console.log(`Classroom already has ${existing2.length} students. Aborting to prevent duplicates.`);
      process.exit(0);
    }

    // Insert into 'children' table
    return insertStudents('children', classroomId);
  }

  if (existing && existing.length > 0) {
    console.log(`Classroom already has ${existing.length} students. Aborting to prevent duplicates.`);
    process.exit(0);
  }

  // 3. Insert into montree_children
  return insertStudents('montree_children', classroomId);
}

async function insertStudents(tableName: string, classroomId: string) {
  const today = new Date().toISOString().split('T')[0];

  const rows = STUDENTS.map(s => ({
    classroom_id: classroomId,
    name: s.name,
    age: Math.round(s.age), // DB expects integer
    enrolled_at: today,
    settings: { gender: s.gender },
  }));

  console.log(`Inserting ${rows.length} students into ${tableName}...`);

  const { data, error } = await supabase
    .from(tableName)
    .insert(rows)
    .select('id, name');

  if (error) {
    console.error('Insert error:', error.message);
    process.exit(1);
  }

  console.log(`\nDone! Created ${data?.length || 0} students:`);
  data?.forEach((s: { id: string; name: string }) => console.log(`  - ${s.name} (${s.id})`));
  console.log('\nRefresh the Montree dashboard to see them.');
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
