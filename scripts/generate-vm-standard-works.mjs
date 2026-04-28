#!/usr/bin/env node
// scripts/generate-vm-standard-works.mjs
//
// Batch-generate visual memory entries for all 270 standard Montessori curriculum
// works in Whale Class. Uses Haiku to write a concise LOOKS LIKE / KEY MATERIALS
// description for each work, then upserts into montree_visual_memory.
//
// Only processes works that don't already have a visual_memory row for Whale Class
// (classroom_id = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69').
//
// Run:
//   ANTHROPIC_API_KEY=sk-... SUPABASE_SERVICE_ROLE_KEY=... node scripts/generate-vm-standard-works.mjs
//
// Cost estimate: ~270 works × ~400 tokens × $0.80/MTok ≈ $0.09 total

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../lib/curriculum/data');

// ---- Config ----
const CLASSROOM_ID = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69';
const SUPABASE_URL = 'https://dmfncjjtsoxrnvcdnvjq.supabase.co';
const BATCH_SIZE = 5;
const DELAY_MS = 400;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ---- Load all curriculum works ----
function loadAllWorks() {
  const areaMap = {
    'practical-life': 'practical_life',
    sensorial: 'sensorial',
    math: 'mathematics',
    language: 'language',
    cultural: 'cultural',
  };

  const works = [];
  for (const [file, areaKey] of Object.entries(areaMap)) {
    const data = JSON.parse(readFileSync(join(dataDir, `${file}.json`), 'utf-8'));
    for (const cat of data.categories || []) {
      for (const w of cat.works || []) {
        works.push({
          work_key: w.id,
          work_name: w.name,
          area: areaKey,
          description: w.description || '',
          materials: w.materials || [],
          directAims: w.directAims || [],
          controlOfError: w.controlOfError || '',
        });
      }
    }
  }
  return works;
}

// ---- Check which works already have VM entries ----
async function loadExistingVMKeys() {
  const { data, error } = await supabase
    .from('montree_visual_memory')
    .select('work_name')
    .eq('classroom_id', CLASSROOM_ID);
  if (error) throw new Error(`Failed to load existing VM: ${error.message}`);
  return new Set((data || []).map(r => r.work_name.toLowerCase().trim()));
}

// ---- Generate description via Haiku ----
async function generateDescription(work) {
  const materialsStr = work.materials.length > 0
    ? work.materials.join(', ')
    : 'standard Montessori materials';
  const aimsStr = work.directAims.length > 0
    ? work.directAims.join(', ')
    : 'coordination and concentration';

  const prompt = `You are a Montessori classroom AI generating visual descriptions to help identify Montessori works from photos.

Work: "${work.work_name}" (${work.area.replace('_', ' ')} area)
Description: ${work.description}
Materials listed: ${materialsStr}
Direct aims: ${aimsStr}
${work.controlOfError ? `Control of error: ${work.controlOfError}` : ''}

Write a SHORT visual description (2-3 sentences, max 200 words) of what this work LOOKS LIKE in a classroom photo. Focus on:
1. The specific physical materials visible on the table or mat
2. Key visual features: colors, shapes, textures, arrangement
3. What distinguishes this work from similar Montessori works

Then list 3-6 KEY MATERIALS as a JSON array of short strings (e.g. ["pink wooden tower", "10 graduated cubes"]).

Respond in this exact JSON format:
{
  "visual_description": "...",
  "key_materials": ["...", "..."]
}`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0]?.text || '';
  // Extract JSON from response
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON in response for "${work.work_name}"`);
  return JSON.parse(match[0]);
}

// ---- Upsert into montree_visual_memory ----
async function upsertVM(work, generated) {
  const { error } = await supabase
    .from('montree_visual_memory')
    .upsert({
      classroom_id: CLASSROOM_ID,
      work_name: work.work_name,
      work_key: work.work_key,
      area: work.area,
      visual_description: generated.visual_description,
      key_materials: generated.key_materials,
      source: 'teacher_setup',
      description_confidence: 0.85,
      is_custom: false,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'classroom_id,work_name',
      ignoreDuplicates: false,
    });

  if (error) throw new Error(`Upsert failed for "${work.work_name}": ${error.message}`);
}

// ---- Main ----
async function main() {
  console.log('[VM Batch] Loading curriculum works...');
  const allWorks = loadAllWorks();
  console.log(`[VM Batch] Loaded ${allWorks.length} works`);

  console.log('[VM Batch] Checking existing visual memory entries...');
  const existingKeys = await loadExistingVMKeys();
  console.log(`[VM Batch] ${existingKeys.size} works already have VM entries`);

  const toProcess = allWorks.filter(w => !existingKeys.has(w.work_name.toLowerCase().trim()));
  console.log(`[VM Batch] ${toProcess.length} works need VM generation\n`);

  if (toProcess.length === 0) {
    console.log('[VM Batch] Nothing to do — all works already have visual memory entries!');
    return;
  }

  let succeeded = 0;
  let failed = 0;
  const failures = [];

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (work) => {
      try {
        const generated = await generateDescription(work);
        await upsertVM(work, generated);
        console.log(`  ✓ [${i + batch.indexOf(work) + 1}/${toProcess.length}] "${work.work_name}"`);
        succeeded++;
      } catch (err) {
        console.error(`  ✗ "${work.work_name}": ${err.message}`);
        failed++;
        failures.push(work.work_name);
      }
    }));

    if (i + BATCH_SIZE < toProcess.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n[VM Batch] Done: ${succeeded} succeeded, ${failed} failed`);
  if (failures.length > 0) {
    console.log('[VM Batch] Failures:', failures.join(', '));
  }
}

main().catch(err => {
  console.error('[VM Batch] Fatal:', err);
  process.exit(1);
});
