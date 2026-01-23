// Import Parent Descriptions to Supabase
// Run with: npx tsx scripts/import-parent-descriptions.ts

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase environment variables');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ParentDescription {
  work_id: string;
  area: string;
  parent_description: string;
  why_it_matters: string;
  home_connection: string;
}

async function loadDescriptions(): Promise<ParentDescription[]> {
  const descriptionsDir = path.join(__dirname, '../lib/curriculum/parent-descriptions');
  const files = fs.readdirSync(descriptionsDir).filter(f => f.endsWith('.json'));
  
  let allDescriptions: ParentDescription[] = [];
  
  for (const file of files) {
    const filePath = path.join(descriptionsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    // Handle both formats: plain array or {descriptions: [...]}
    let descriptions: ParentDescription[];
    if (Array.isArray(data)) {
      descriptions = data;
    } else if (data.descriptions && Array.isArray(data.descriptions)) {
      descriptions = data.descriptions;
    } else {
      console.error(`Unknown format in ${file}`);
      continue;
    }
    
    allDescriptions = allDescriptions.concat(descriptions);
    console.log(`✅ Loaded ${descriptions.length} descriptions from ${file}`);
  }
  
  return allDescriptions;
}

async function updateSchoolWorks(descriptions: ParentDescription[]) {
  console.log('\n📚 Updating school curriculum works...');
  
  let updated = 0;
  let notFound = 0;
  
  for (const desc of descriptions) {
    const { data, error } = await supabase
      .from('montree_school_curriculum_works')
      .update({
        parent_description: desc.parent_description,
        why_it_matters: desc.why_it_matters,
        home_connection: desc.home_connection,
      })
      .eq('work_key', desc.work_id)
      .select();
    
    if (error || !data || data.length === 0) {
      notFound++;
    } else {
      updated++;
    }
  }
  
  console.log(`   Updated: ${updated} | Not found: ${notFound}`);
  return { updated, notFound };
}

async function updateClassroomWorks(descriptions: ParentDescription[]) {
  console.log('\n🏫 Updating classroom curriculum works...');
  
  let updated = 0;
  let notFound = 0;
  
  for (const desc of descriptions) {
    const { data, error } = await supabase
      .from('montree_classroom_curriculum_works')
      .update({
        parent_description: desc.parent_description,
        why_it_matters: desc.why_it_matters,
        home_connection: desc.home_connection,
      })
      .eq('work_key', desc.work_id)
      .select();
    
    if (error || !data || data.length === 0) {
      notFound++;
    } else {
      updated++;
    }
  }
  
  console.log(`   Updated: ${updated} | Not found: ${notFound}`);
  return { updated, notFound };
}

async function main() {
  console.log('🐋 Parent Descriptions Import Script\n');
  console.log('=====================================\n');
  
  // Load all descriptions
  const descriptions = await loadDescriptions();
  console.log(`\n📊 Total descriptions loaded: ${descriptions.length}`);
  
  // Update school-level works
  const schoolResults = await updateSchoolWorks(descriptions);
  
  // Update classroom-level works
  const classroomResults = await updateClassroomWorks(descriptions);
  
  console.log('\n=====================================');
  console.log('✅ IMPORT COMPLETE');
  console.log('=====================================');
  console.log(`\nSchool works updated: ${schoolResults.updated}`);
  console.log(`Classroom works updated: ${classroomResults.updated}`);
  console.log('\nNote: "Not found" counts are normal - not all 268 works');
  console.log('may be active in every school/classroom.');
}

main().catch(console.error);
