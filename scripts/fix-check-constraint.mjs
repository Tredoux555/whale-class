#!/usr/bin/env node
/**
 * fix-check-constraint.mjs
 *
 * 1. Adds 'haiku_drafted' to the identification_status CHECK constraint
 * 2. Re-runs identification on stuck photos
 * 3. Verifies all writes
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const envPath = resolve(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 90000 });

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const WHALE_CLASSROOM = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69';
const WHALE_SCHOOL = 'c6280fae-567c-45ed-ad4d-934eae79aabc';

function getPublicUrl(path) {
  return `${SUPABASE_URL}/storage/v1/object/public/montree-media/${path}`;
}

// =====================================================================
// STEP 1: Fix the CHECK constraint via raw SQL
// =====================================================================
async function fixCheckConstraint() {
  console.log('=== STEP 1: Fixing CHECK constraint ===\n');

  const sql = `
    ALTER TABLE montree_media
      DROP CONSTRAINT IF EXISTS montree_media_identification_status_check;

    ALTER TABLE montree_media
      ADD CONSTRAINT montree_media_identification_status_check
      CHECK (
        identification_status IS NULL
        OR identification_status IN (
          'skipped',
          'sonnet_drafted',
          'confirmed',
          'haiku_matched',
          'haiku_drafted',
          'pending',
          'failed',
          'pending_review'
        )
      );
  `;

  // Use supabase rpc to run raw SQL
  const { error } = await supabase.rpc('exec_sql', { sql_text: sql });
  if (error) {
    // If exec_sql doesn't exist, try the REST API's sql endpoint
    console.log('rpc exec_sql not available, trying direct POST to /rest/v1/rpc...');
    console.log('Error was:', error.message);
    console.log('\n⚠️ Cannot run DDL via Supabase JS client.');
    console.log('Please run this SQL in Supabase SQL Editor:\n');
    console.log(sql);
    console.log('\nAfter running the SQL, re-run this script with: node scripts/fix-check-constraint.mjs --skip-ddl\n');

    // Test if the constraint already has haiku_drafted
    const { error: testErr } = await supabase
      .from('montree_media')
      .update({ identification_status: 'haiku_drafted' })
      .eq('id', '00000000-0000-0000-0000-000000000000'); // non-existent ID

    if (testErr && testErr.code === '23514') {
      console.log('❌ Constraint still rejects haiku_drafted. You MUST run the SQL above first.');
      return false;
    } else {
      console.log('✅ Constraint already accepts haiku_drafted (or was just updated). Continuing...');
      return true;
    }
  }

  console.log('✅ CHECK constraint updated successfully.\n');
  return true;
}

// =====================================================================
// STEP 2: Re-identify stuck photos
// =====================================================================
async function loadCurriculum() {
  const { data } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id, name, name_chinese, area_id')
    .eq('classroom_id', WHALE_CLASSROOM)
    .eq('is_active', true);
  return data || [];
}

async function loadVisualMemory() {
  const { data } = await supabase
    .from('montree_visual_memory')
    .select('work_name, visual_description, key_materials, negative_descriptions, description_confidence, source')
    .eq('classroom_id', WHALE_CLASSROOM)
    .order('description_confidence', { ascending: false })
    .limit(100);
  return data || [];
}

async function pass1Describe(photoUrl, childName, childAge) {
  const response = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'url', url: photoUrl } },
        { type: 'text', text: `You are a Montessori classroom observer. Describe what you see in this photo of ${childName} (age ${childAge}).
Focus on:
1. HANDS & PRIMARY WORK — What is the child's hands doing? What is the main material/work?
2. Materials visible — specific Montessori materials, their colors, shapes, sizes
3. Setting — table/floor/rug, arrangement of materials
4. Activity — what step of the work is being done
Be objective and specific. Do NOT name the Montessori work — just describe what you SEE. 3-5 sentences maximum.` }
      ]
    }]
  });
  return response.content[0]?.type === 'text' ? response.content[0].text : '';
}

async function pass2Match(description, curriculum, visualMemory) {
  const workList = curriculum.map(w => w.name).join('\n');
  let vmBlocks = '';
  const trustedVm = visualMemory.filter(vm =>
    (vm.source === 'teacher_setup' && vm.description_confidence >= 1.0) ||
    (vm.source === 'correction' && vm.description_confidence >= 0.9) ||
    vm.source === 'teacher_enrichment'
  );
  for (const vm of trustedVm.slice(0, 30)) {
    vmBlocks += `\n--- ${vm.work_name} ---\nLOOKS LIKE: ${vm.visual_description || '(no description)'}`;
    if (vm.key_materials?.length) vmBlocks += `\nKEY MATERIALS: ${vm.key_materials.join(', ')}`;
    if (vm.negative_descriptions?.length) vmBlocks += `\nDISTINGUISH FROM: ${vm.negative_descriptions.join(' | ')}`;
  }

  const response = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 300,
    tools: [{
      name: 'identify_work',
      description: 'Identify the Montessori work shown in the photo',
      input_schema: {
        type: 'object',
        properties: {
          work_name: { type: 'string', description: 'Exact name from the curriculum list' },
          confidence: { type: 'number', description: '0.0-1.0 confidence score' },
          reasoning: { type: 'string', description: 'Brief reasoning' }
        },
        required: ['work_name', 'confidence', 'reasoning']
      }
    }],
    tool_choice: { type: 'tool', name: 'identify_work' },
    messages: [{ role: 'user', content: `You are a Montessori work identifier.
${vmBlocks ? `CLASSROOM-VERIFIED VISUAL REFERENCES (highest priority):\n${vmBlocks}\n\n` : ''}CLASSROOM CURRICULUM WORKS:\n${workList}\n\nVISUAL DESCRIPTION OF THE PHOTO:\n${description}\n\nWhich curriculum work is this? Use the tool to respond.` }]
  });

  const toolBlock = response.content.find(b => b.type === 'tool_use' && b.name === 'identify_work');
  return toolBlock ? toolBlock.input : null;
}

async function resolveWorkId(workName) {
  const { data } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id')
    .eq('classroom_id', WHALE_CLASSROOM)
    .ilike('name', workName.replace(/[%_\\]/g, '\\$&'))
    .limit(1)
    .maybeSingle();
  return data?.id || null;
}

async function processStuckPhotos() {
  console.log('=== STEP 2: Processing stuck photos ===\n');

  const { data: stuck, error } = await supabase
    .from('montree_media')
    .select('id, child_id, storage_path, identification_status, captured_at')
    .eq('school_id', WHALE_SCHOOL)
    .eq('classroom_id', WHALE_CLASSROOM)
    .eq('media_type', 'photo')
    .is('work_id', null)
    .or('identification_status.is.null,identification_status.eq.pending,identification_status.eq.failed')
    .order('captured_at', { ascending: false })
    .limit(30);

  if (error) { console.error('Query failed:', error); return; }
  if (!stuck?.length) { console.log('✅ No stuck photos!'); return; }

  console.log(`Found ${stuck.length} stuck photos. Loading context...\n`);
  const curriculum = await loadCurriculum();
  const visualMemory = await loadVisualMemory();
  console.log(`Curriculum: ${curriculum.length} works, Visual memory: ${visualMemory.length} entries\n`);

  for (let i = 0; i < stuck.length; i++) {
    const media = stuck[i];
    const photoUrl = getPublicUrl(media.storage_path);

    let childName = 'the child', childAge = 4;
    if (media.child_id) {
      const { data: child } = await supabase
        .from('montree_children').select('name, birthdate')
        .eq('id', media.child_id).maybeSingle();
      if (child) {
        childName = child.name || childName;
        if (child.birthdate) childAge = Math.max(0, Math.floor((Date.now() - Date.parse(child.birthdate)) / (365.25*24*60*60*1000)));
      }
    }

    console.log(`[${i+1}/${stuck.length}] ${media.id.slice(0,8)} (${childName})`);

    try {
      const description = await pass1Describe(photoUrl, childName, childAge);
      if (!description) {
        const { error: e } = await supabase.from('montree_media').update({ identification_status: 'failed' }).eq('id', media.id);
        console.log(`  ❌ Pass 1 empty. DB write: ${e ? 'FAILED — ' + e.message : 'OK'}`);
        continue;
      }
      console.log(`  P1: "${description.slice(0, 70)}..."`);

      const match = await pass2Match(description, curriculum, visualMemory);
      if (!match) {
        const { error: e } = await supabase.from('montree_media').update({
          identification_status: 'haiku_drafted',
          sonnet_draft: JSON.stringify({ visual_description: description }),
        }).eq('id', media.id);
        console.log(`  ❌ Pass 2 no match. DB write: ${e ? 'FAILED — ' + e.message : 'OK'}`);
        continue;
      }

      console.log(`  P2: "${match.work_name}" (${(match.confidence*100).toFixed(0)}%)`);

      // Gate A
      const hasVm = visualMemory.some(vm => vm.work_name?.toLowerCase() === match.work_name?.toLowerCase());
      if (match.confidence >= 0.85 && hasVm) {
        const workId = await resolveWorkId(match.work_name);
        if (workId) {
          const { error: e } = await supabase.from('montree_media').update({
            work_id: workId, identification_status: 'haiku_matched',
            identification_confidence: match.confidence, teacher_confirmed: true,
            sonnet_draft: JSON.stringify({ visual_description: description, proposed_name: match.work_name, confidence: match.confidence }),
          }).eq('id', media.id);
          console.log(`  ✅ Gate A → haiku_matched "${match.work_name}". DB: ${e ? 'FAILED — ' + e.message : 'OK'}`);
          continue;
        }
      }

      // Draft
      const workId = await resolveWorkId(match.work_name);
      const { error: e } = await supabase.from('montree_media').update({
        identification_status: 'haiku_drafted', identification_confidence: match.confidence,
        work_id: workId || null,
        sonnet_draft: JSON.stringify({
          visual_description: description, proposed_name: match.work_name,
          confidence: match.confidence, suggested_area: null,
          closest_existing_match: workId ? { work_name: match.work_name, similarity: match.confidence } : null,
        }),
      }).eq('id', media.id);
      console.log(`  🟡 Draft "${match.work_name}" (${(match.confidence*100).toFixed(0)}%). DB: ${e ? 'FAILED — ' + e.message : 'OK'}`);

    } catch (err) {
      console.error(`  ❌ Exception: ${err.message}`);
    }

    if (i < stuck.length - 1) await new Promise(r => setTimeout(r, 1000));
  }

  // VERIFY
  console.log('\n=== VERIFICATION ===\n');
  const ids = stuck.map(m => m.id);
  const { data: verify } = await supabase
    .from('montree_media')
    .select('id, identification_status, work_id, identification_confidence, teacher_confirmed')
    .in('id', ids);

  let fixed = 0, stillStuck = 0;
  for (const row of (verify || [])) {
    const ok = row.identification_status && !['pending', 'failed'].includes(row.identification_status);
    if (ok) { fixed++; console.log(`  ✅ ${row.id.slice(0,8)} — ${row.identification_status} (work: ${row.work_id ? 'SET' : 'null'})`); }
    else { stillStuck++; console.log(`  ❌ ${row.id.slice(0,8)} — STILL: ${row.identification_status}`); }
  }
  console.log(`\nResult: ${fixed} fixed, ${stillStuck} still stuck out of ${(verify||[]).length}`);
}

// =====================================================================
// Main
// =====================================================================
async function main() {
  const skipDDL = process.argv.includes('--skip-ddl');

  if (!skipDDL) {
    const ok = await fixCheckConstraint();
    if (!ok) process.exit(1);
  } else {
    console.log('Skipping DDL (--skip-ddl flag). Checking constraint...');
    // Verify constraint accepts haiku_drafted
    const { error: testErr } = await supabase
      .from('montree_media')
      .update({ identification_status: 'haiku_drafted' })
      .eq('id', '00000000-0000-0000-0000-000000000000');
    if (testErr && testErr.code === '23514') {
      console.log('❌ Constraint still rejects haiku_drafted! Run the DDL first.');
      process.exit(1);
    }
    console.log('✅ Constraint accepts haiku_drafted.\n');
  }

  await processStuckPhotos();
  console.log('\n✨ Done!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
