#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local manually
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');

const env = {};
envLines.forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  try {
    // Whale Class ID
    const classroomId = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69';

    // Query all works in Whale Class
    const { data: works, error } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name, quick_guide, presentation_steps, materials, direct_aims, control_of_error, why_it_matters, parent_description, guide_content_zh')
      .eq('classroom_id', classroomId)
      .order('name');

    if (error) {
      console.error('Database error:', error);
      process.exit(1);
    }

    console.log('\n=== QUICK GUIDE TRANSLATION SCOPE ===\n');
    console.log(`Total works in Whale Class: ${works.length}\n`);

    // Count stats
    const withQuickGuide = works.filter(w => w.quick_guide).length;
    const withPresentationSteps = works.filter(w => w.presentation_steps).length;
    const withGuideContentZh = works.filter(w => w.guide_content_zh).length;
    const withWhyItMatters = works.filter(w => w.why_it_matters).length;
    const withParentDescription = works.filter(w => w.parent_description).length;

    console.log('Content Field Coverage:');
    console.log(`  - quick_guide: ${withQuickGuide} works (${(withQuickGuide/works.length*100).toFixed(1)}%)`);
    console.log(`  - presentation_steps: ${withPresentationSteps} works (${(withPresentationSteps/works.length*100).toFixed(1)}%)`);
    console.log(`  - why_it_matters: ${withWhyItMatters} works (${(withWhyItMatters/works.length*100).toFixed(1)}%)`);
    console.log(`  - parent_description: ${withParentDescription} works (${(withParentDescription/works.length*100).toFixed(1)}%)`);
    console.log(`  - guide_content_zh (already translated): ${withGuideContentZh} works (${(withGuideContentZh/works.length*100).toFixed(1)}%)\n`);

    // Show first 3 works with quick_guide
    console.log('Sample works with quick_guide:');
    const samples = works.filter(w => w.quick_guide).slice(0, 3);
    samples.forEach((work, idx) => {
      console.log(`\n${idx + 1}. ${work.name}`);
      console.log(`   quick_guide: ${work.quick_guide.substring(0, 150)}...`);
      console.log(`   has_guide_content_zh: ${work.guide_content_zh ? 'YES' : 'NO'}`);
    });

    // Find works that need translation (have content but no zh translation)
    const needsTranslation = works.filter(w =>
      (w.quick_guide || w.presentation_steps || w.why_it_matters) &&
      !w.guide_content_zh
    );

    console.log(`\n\nWorks needing guide_content_zh translation: ${needsTranslation.length}\n`);

    // Show distribution of content combinations
    const contentCombos = {};
    works.forEach(w => {
      const fields = [
        w.quick_guide ? 'quick_guide' : null,
        w.presentation_steps ? 'presentation_steps' : null,
        w.why_it_matters ? 'why_it_matters' : null,
      ].filter(Boolean);

      const key = fields.length === 0 ? 'empty' : fields.join(' + ');
      contentCombos[key] = (contentCombos[key] || 0) + 1;
    });

    console.log('Content field combinations:');
    Object.entries(contentCombos).sort((a, b) => b[1] - a[1]).forEach(([combo, count]) => {
      console.log(`  ${combo}: ${count} works`);
    });

  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
