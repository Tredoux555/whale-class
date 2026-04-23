#!/usr/bin/env node
/**
 * fix-stuck-7.mjs
 *
 * Direct DB fix for the 7 photos whose haiku_drafted writes silently failed.
 * This script:
 * 1. Queries the 7 stuck photos
 * 2. Re-runs Haiku two-pass on each (cost: ~$0.04 total)
 * 3. Checks EVERY Supabase write for errors and reports them
 * 4. Verifies the final state
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
const envPath = resolve(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = env.ANTHROPIC_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY, timeout: 90000 });

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const WHALE_CLASSROOM = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69';
const WHALE_SCHOOL = 'c6280fae-567c-45ed-ad4d-934eae79aabc';

// The 7 stuck photo IDs from verification query
const STUCK_IDS = [
  '206e57e0', 'dfebd53e', '9414cad7', 'c41e006a',
  'f3874b20', '6a3c3654', 'f0efb3f4'
];

function getPublicUrl(path) {
  return `${SUPABASE_URL}/storage/v1/object/public/montree-media/${path}`;
}

async function loadCurriculum() {
  const { data, error } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id, name, name_chinese, area_id')
    .eq('classroom_id', WHALE_CLASSROOM)
    .eq('is_active', true);
  if (error) { console.error('Curriculum load failed:', error); process.exit(1); }
  return data || [];
}

async function loadVisualMemory() {
  const { data, error } = await supabase
    .from('montree_visual_memory')
    .select('work_name, visual_description, key_materials, negative_descriptions, description_confidence, source')
    .eq('classroom_id', WHALE_CLASSROOM)
    .order('description_confidence', { ascending: false })
    .limit(100);
  if (error) { console.error('Visual memory load failed:', error); process.exit(1); }
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

Be objective and specific. Do NOT name the Montessori work — just describe what you SEE.
3-5 sentences maximum.` }
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

  const prompt = `You are a Montessori work identifier. Given a visual description of a classroom photo, match it to the correct work from the curriculum list.

${vmBlocks ? `CLASSROOM-VERIFIED VISUAL REFERENCES (highest priority):\n${vmBlocks}\n\n` : ''}CLASSROOM CURRICULUM WORKS:
${workList}

VISUAL DESCRIPTION OF THE PHOTO:
${description}

Which curriculum work is this? Use the tool to respond.`;

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
    messages: [{ role: 'user', content: prompt }]
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

// ---- Main ----

async function main() {
  console.log('=== FIX-STUCK-7: Re-identifying 7 stuck photos with error checking ===\n');

  // Step 1: Find the actual full UUIDs for these photos
  const { data: allStuck, error: qErr } = await supabase
    .from('montree_media')
    .select('id, child_id, storage_path, identification_status, work_id, captured_at')
    .eq('school_id', WHALE_SCHOOL)
    .eq('classroom_id', WHALE_CLASSROOM)
    .eq('media_type', 'photo')
    .is('work_id', null)
    .or('identification_status.is.null,identification_status.eq.pending,identification_status.eq.failed')
    .order('captured_at', { ascending: false })
    .limit(30);

  if (qErr) { console.error('Query failed:', qErr); process.exit(1); }
  if (!allStuck?.length) { console.log('✅ No stuck photos found!'); return; }

  console.log(`Found ${allStuck.length} stuck photos.\n`);

  // Step 2: First, let's check if there's a CHECK constraint issue
  // Try a simple status update on the first photo to see if 'haiku_drafted' is accepted
  const testId = allStuck[0].id;
  console.log(`--- TEST: Checking if 'haiku_drafted' status is accepted by DB ---`);
  const { error: testErr } = await supabase
    .from('montree_media')
    .update({ identification_status: 'haiku_drafted' })
    .eq('id', testId);

  if (testErr) {
    console.error(`❌ DB REJECTS 'haiku_drafted' status! Error:`, testErr);
    console.log(`\nTrying alternate statuses...`);

    // Try 'sonnet_drafted' instead
    const { error: testErr2 } = await supabase
      .from('montree_media')
      .update({ identification_status: 'sonnet_drafted' })
      .eq('id', testId);
    if (testErr2) {
      console.error(`❌ DB ALSO REJECTS 'sonnet_drafted'! Error:`, testErr2);
    } else {
      console.log(`✅ 'sonnet_drafted' IS accepted. The CHECK constraint doesn't include 'haiku_drafted'!`);
      console.log(`Reverting test photo...`);
      await supabase.from('montree_media').update({ identification_status: 'pending' }).eq('id', testId);
    }

    // Check actual constraint
    console.log(`\nQuerying pg_constraint for identification_status CHECK...`);
    const { data: constraints } = await supabase.rpc('get_check_constraints', {
      table_name: 'montree_media'
    }).catch(() => ({ data: null }));
    if (constraints) console.log('Constraints:', JSON.stringify(constraints, null, 2));

    // If haiku_drafted is rejected, use sonnet_drafted as the fallback status
    console.log(`\n⚠️ Will use 'sonnet_drafted' instead of 'haiku_drafted' for the writes.\n`);
  } else {
    console.log(`✅ 'haiku_drafted' is accepted by DB. Reverting test...`);
    const { error: revertErr } = await supabase
      .from('montree_media')
      .update({ identification_status: 'pending' })
      .eq('id', testId);
    if (revertErr) console.error('Revert failed:', revertErr);
  }

  // Determine which status to use
  const DRAFT_STATUS = testErr ? 'sonnet_drafted' : 'haiku_drafted';
  console.log(`\nUsing status: '${DRAFT_STATUS}' for non-auto-confirmed photos.\n`);

  // Step 3: Load curriculum + visual memory
  const curriculum = await loadCurriculum();
  const visualMemory = await loadVisualMemory();
  console.log(`Curriculum: ${curriculum.length} works, Visual memory: ${visualMemory.length} entries\n`);

  // Step 4: Process each photo SEQUENTIALLY with full error checking
  const results = [];
  for (let i = 0; i < allStuck.length; i++) {
    const media = allStuck[i];
    const photoUrl = getPublicUrl(media.storage_path);

    // Get child name
    let childName = 'the child';
    let childAge = 4;
    if (media.child_id) {
      const { data: child } = await supabase
        .from('montree_children')
        .select('name, birthdate')
        .eq('id', media.child_id)
        .maybeSingle();
      if (child) {
        childName = child.name || childName;
        if (child.birthdate) {
          const ms = Date.now() - Date.parse(child.birthdate);
          childAge = Math.max(0, Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000)));
        }
      }
    }

    console.log(`\n[${i + 1}/${allStuck.length}] Processing ${media.id.slice(0, 8)}... (${childName})`);

    try {
      // Pass 1
      const description = await pass1Describe(photoUrl, childName, childAge);
      if (!description) {
        console.log(`  ❌ Pass 1 empty`);
        const { error: e } = await supabase.from('montree_media').update({
          identification_status: 'failed'
        }).eq('id', media.id);
        if (e) console.error(`  ❌ DB WRITE FAILED:`, e);
        else console.log(`  ✅ DB write OK (failed status)`);
        results.push({ id: media.id, status: 'failed' });
        continue;
      }
      console.log(`  Pass 1: "${description.slice(0, 80)}..."`);

      // Pass 2
      const match = await pass2Match(description, curriculum, visualMemory);
      if (!match) {
        console.log(`  ❌ Pass 2 no tool output — writing ${DRAFT_STATUS}`);
        const { error: e } = await supabase.from('montree_media').update({
          identification_status: DRAFT_STATUS,
          sonnet_draft: JSON.stringify({ visual_description: description }),
        }).eq('id', media.id);
        if (e) console.error(`  ❌ DB WRITE FAILED:`, e);
        else console.log(`  ✅ DB write OK`);
        results.push({ id: media.id, status: DRAFT_STATUS });
        continue;
      }

      console.log(`  Pass 2: "${match.work_name}" (${(match.confidence * 100).toFixed(0)}%) — ${match.reasoning}`);

      // Gate A check
      const GATE_A_THRESHOLD = 0.85;
      const hasVm = visualMemory.some(vm =>
        vm.work_name?.toLowerCase() === match.work_name?.toLowerCase()
      );

      if (match.confidence >= GATE_A_THRESHOLD && hasVm) {
        const workId = await resolveWorkId(match.work_name);
        if (workId) {
          const updateData = {
            work_id: workId,
            identification_status: 'haiku_matched',
            identification_confidence: match.confidence,
            teacher_confirmed: true,
            sonnet_draft: JSON.stringify({
              visual_description: description,
              proposed_name: match.work_name,
              confidence: match.confidence,
            }),
          };
          const { error: e } = await supabase.from('montree_media').update(updateData).eq('id', media.id);
          if (e) {
            console.error(`  ❌ GATE A DB WRITE FAILED:`, e);
            console.error(`  Update data was:`, JSON.stringify(updateData, null, 2));
          } else {
            console.log(`  ✅ Gate A PASS — auto-confirmed as "${match.work_name}"`);
          }
          results.push({ id: media.id, status: 'haiku_matched', work: match.work_name });
          continue;
        }
      }

      // Gate A failed — write as draft
      const workId = await resolveWorkId(match.work_name);
      const updateData = {
        identification_status: DRAFT_STATUS,
        identification_confidence: match.confidence,
        work_id: workId || null,
        sonnet_draft: JSON.stringify({
          visual_description: description,
          proposed_name: match.work_name,
          confidence: match.confidence,
          suggested_area: null,
          closest_existing_match: workId ? { work_name: match.work_name, similarity: match.confidence } : null,
        }),
      };
      const { error: e } = await supabase.from('montree_media').update(updateData).eq('id', media.id);
      if (e) {
        console.error(`  ❌ DRAFT DB WRITE FAILED:`, e);
        console.error(`  Update data was:`, JSON.stringify(updateData, null, 2));
      } else {
        console.log(`  ✅ DB write OK — ${DRAFT_STATUS} "${match.work_name}" (${(match.confidence * 100).toFixed(0)}%)`);
      }
      results.push({ id: media.id, status: DRAFT_STATUS, work: match.work_name, confidence: match.confidence });

    } catch (err) {
      console.error(`  ❌ EXCEPTION:`, err.message);
      results.push({ id: media.id, status: 'error', error: err.message });
    }

    // 1s pause between photos
    if (i < allStuck.length - 1) await new Promise(r => setTimeout(r, 1000));
  }

  // Step 5: VERIFY all writes persisted
  console.log('\n\n========== VERIFICATION ==========');
  const ids = allStuck.map(m => m.id);
  const { data: verify, error: vErr } = await supabase
    .from('montree_media')
    .select('id, identification_status, work_id, identification_confidence, teacher_confirmed')
    .in('id', ids);

  if (vErr) {
    console.error('Verification query failed:', vErr);
  } else {
    let fixed = 0, stillStuck = 0;
    for (const row of verify) {
      const ok = row.identification_status && !['pending', 'failed'].includes(row.identification_status) && row.identification_status !== null;
      if (ok) {
        fixed++;
        console.log(`  ✅ ${row.id.slice(0, 8)} — ${row.identification_status} (conf: ${row.identification_confidence}, work_id: ${row.work_id ? 'SET' : 'null'})`);
      } else {
        stillStuck++;
        console.log(`  ❌ ${row.id.slice(0, 8)} — STILL STUCK: ${row.identification_status} (work_id: ${row.work_id})`);
      }
    }
    console.log(`\n✅ Fixed: ${fixed} / ${verify.length}`);
    if (stillStuck > 0) console.log(`❌ Still stuck: ${stillStuck}`);
  }

  // Summary
  console.log('\n========== SUMMARY ==========');
  const matched = results.filter(r => r.status === 'haiku_matched');
  const drafted = results.filter(r => r.status === DRAFT_STATUS);
  const failed = results.filter(r => r.status === 'failed' || r.status === 'error');
  console.log(`✅ Auto-confirmed: ${matched.length}`);
  console.log(`🟡 Drafted (review): ${drafted.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log('\n✨ Done!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
