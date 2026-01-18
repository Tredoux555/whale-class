// scripts/test-montree-ai.ts
// Test script for Montree AI endpoints
// Run: npx ts-node --skip-project scripts/test-montree-ai.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkFoundationTables() {
  console.log('\n=== CHECKING FOUNDATION TABLES ===\n');
  
  // Check schools
  const { data: schools, error: schoolsError } = await supabase
    .from('montree_schools')
    .select('*')
    .limit(5);
  
  console.log('📍 montree_schools:', schoolsError ? `ERROR: ${schoolsError.message}` : `${schools?.length || 0} records`);
  if (schools?.length) {
    console.log('   Sample:', schools[0].name);
  }
  
  // Check classrooms
  const { data: classrooms, error: classroomsError } = await supabase
    .from('montree_classrooms')
    .select('*, school:montree_schools(name)')
    .limit(5);
  
  console.log('📍 montree_classrooms:', classroomsError ? `ERROR: ${classroomsError.message}` : `${classrooms?.length || 0} records`);
  if (classrooms?.length) {
    classrooms.forEach(c => console.log(`   - ${c.name} (${(c.school as any)?.name || 'no school'})`));
  }
  
  // Check children with classroom_id
  const { data: children, error: childrenError } = await supabase
    .from('montree_children')
    .select('id, name, name_chinese, classroom_id')
    .limit(20);
  
  console.log('📍 montree_children:', childrenError ? `ERROR: ${childrenError.message}` : `${children?.length || 0} records`);
  
  const withClassroom = children?.filter(c => c.classroom_id) || [];
  const withoutClassroom = children?.filter(c => !c.classroom_id) || [];
  
  console.log(`   With classroom_id: ${withClassroom.length}`);
  console.log(`   Without classroom_id: ${withoutClassroom.length}`);
  
  if (withClassroom.length) {
    console.log('   Children with classrooms:');
    withClassroom.slice(0, 5).forEach(c => console.log(`     - ${c.name} (${c.name_chinese || '-'})`));
  }
  
  // Check classroom curriculum areas
  const { data: classAreas, error: classAreasError } = await supabase
    .from('montree_classroom_curriculum_areas')
    .select('*, classroom:montree_classrooms(name)')
    .limit(10);
  
  console.log('📍 montree_classroom_curriculum_areas:', classAreasError ? `ERROR: ${classAreasError.message}` : `${classAreas?.length || 0} records`);
  
  // Check classroom curriculum works
  const { data: classWorks, error: classWorksError } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id, name, classroom_id, area_id')
    .limit(5);
  
  console.log('📍 montree_classroom_curriculum_works:', classWorksError ? `ERROR: ${classWorksError.message}` : `${classWorks?.length || 0} records`);
  
  // Check assignments
  const { data: assignments, error: assignmentsError } = await supabase
    .from('montree_child_assignments')
    .select('*, child:montree_children(name), work:montree_classroom_curriculum_works(name)')
    .limit(10);
  
  console.log('📍 montree_child_assignments:', assignmentsError ? `ERROR: ${assignmentsError.message}` : `${assignments?.length || 0} records`);
  if (assignments?.length) {
    console.log('   Sample assignments:');
    assignments.slice(0, 3).forEach(a => {
      console.log(`     - ${(a.child as any)?.name || 'unknown'}: ${(a.work as any)?.name || 'unknown'} (${a.status})`);
    });
  }
  
  return { schools, classrooms, children, classAreas, classWorks, assignments };
}

async function testAnalyzeEndpoint(childId: string) {
  console.log('\n=== TESTING /api/montree/ai/analyze ===\n');
  console.log(`Child ID: ${childId}`);
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${baseUrl}/api/montree/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ child_id: childId })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.log('❌ Error:', data.error);
      return null;
    }
    
    console.log('✅ Success!');
    console.log('\nChild:', data.child?.name);
    console.log('Classroom:', data.child?.classroom_name);
    console.log('\nSummary:', data.summary?.substring(0, 200) + '...');
    console.log('\nStrengths:', data.strengths?.slice(0, 2));
    console.log('Growth Areas:', data.growth_areas?.slice(0, 2));
    console.log('\nDevelopmental Stage:', data.developmental_stage);
    console.log('\nFallback Used:', (data as any)._meta?.ai_fallback_used || false);
    
    return data;
  } catch (error) {
    console.log('❌ Fetch error:', (error as Error).message);
    return null;
  }
}

async function testWeeklyReportEndpoint(childId: string) {
  console.log('\n=== TESTING /api/montree/ai/weekly-report ===\n');
  console.log(`Child ID: ${childId}`);
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${baseUrl}/api/montree/ai/weekly-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ child_id: childId })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.log('❌ Error:', data.error);
      return null;
    }
    
    console.log('✅ Success!');
    console.log('\nChild:', data.child?.name);
    console.log('Week:', data.week_start, '-', data.week_end);
    console.log('\nNarrative:', data.narrative?.substring(0, 300) + '...');
    console.log('\nHighlights Count:', data.highlights?.length || 0);
    console.log('Next Week Focus:', data.next_week_focus?.substring(0, 100) + '...');
    
    return data;
  } catch (error) {
    console.log('❌ Fetch error:', (error as Error).message);
    return null;
  }
}

async function testSuggestNextEndpoint(childId: string) {
  console.log('\n=== TESTING /api/montree/ai/suggest-next ===\n');
  console.log(`Child ID: ${childId}`);
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${baseUrl}/api/montree/ai/suggest-next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ child_id: childId, limit: 5 })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.log('❌ Error:', data.error);
      return null;
    }
    
    console.log('✅ Success!');
    console.log('\nChild:', data.child?.name);
    console.log('\nSuggestions:');
    data.suggestions?.forEach((s: any, i: number) => {
      console.log(`\n  ${i + 1}. ${s.work.name} (${s.work.area_name})`);
      console.log(`     Priority: ${s.priority}`);
      console.log(`     Reason: ${s.reason?.substring(0, 80)}...`);
    });
    
    return data;
  } catch (error) {
    console.log('❌ Fetch error:', (error as Error).message);
    return null;
  }
}

async function main() {
  console.log('🐋 MONTREE AI ENDPOINT TESTING');
  console.log('================================\n');
  
  // Step 1: Check all foundation tables
  const tableData = await checkFoundationTables();
  
  // Step 2: Find a child with classroom_id for testing
  const { data: testChildren, error: testChildError } = await supabase
    .from('montree_children')
    .select('id, name, name_chinese, classroom_id')
    .not('classroom_id', 'is', null)
    .limit(1);
  
  if (testChildError || !testChildren?.length) {
    console.log('\n⚠️  NO CHILDREN WITH CLASSROOM_ID FOUND');
    console.log('The AI endpoints require children assigned to classrooms.');
    console.log('\nTo fix, you need to:');
    console.log('1. Create a classroom in montree_classrooms');
    console.log('2. Assign children to that classroom');
    console.log('3. Create curriculum areas/works for the classroom');
    console.log('4. Create assignments for children');
    return;
  }
  
  const testChild = testChildren[0];
  console.log(`\n🎯 TEST CHILD: ${testChild.name} (${testChild.name_chinese || '-'})`);
  console.log(`   ID: ${testChild.id}`);
  console.log(`   Classroom ID: ${testChild.classroom_id}`);
  
  // Step 3: Test each endpoint
  await testAnalyzeEndpoint(testChild.id);
  await testWeeklyReportEndpoint(testChild.id);
  await testSuggestNextEndpoint(testChild.id);
  
  console.log('\n================================');
  console.log('🐋 TESTING COMPLETE');
}

main().catch(console.error);
