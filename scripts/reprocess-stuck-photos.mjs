#!/usr/bin/env node
/**
 * reprocess-stuck-photos.mjs
 *
 * Finds all photos with identification_status NULL (never processed / timed out)
 * and re-triggers the Haiku two-pass identification pipeline for each one.
 *
 * Runs 3 photos in parallel to stay within Anthropic rate limits.
 *
 * Usage: node scripts/reprocess-stuck-photos.mjs
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
const CONCURRENCY = 3;

// ---- Helpers ----

function getPublicUrl(path) {
  return `${SUPABASE_URL}/storage/v1/object/public/montree-media/${path}`;
}

async function loadCurriculum(classroomId) {
  const { data } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id, name, name_chinese, area_id')
    .eq('classroom_id', classroomId)
    .eq('is_active', true);
  return data || [];
}

async function loadVisualMemory(classroomId) {
  const { data } = await supabase
    .from('montree_visual_memory')
    .select('work_name, visual_description, key_materials, negative_descriptions, description_confidence, source')
    .eq('classroom_id', classroomId)
    .order('description_confidence', { ascending: false })
    .limit(100);
  return data || [];
}

async function resolveWorkId(classroomId, workName) {
  const { data } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id')
    .eq('classroom_id', classroomId)
    .ilike('name', workName.replace(/[%_\\]/g, '\\$&'))
    .limit(1)
    .maybeSingle();
  return data?.id || null;
}

// ---- Two-pass Haiku identification ----

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
  // Build curriculum list
  const workList = curriculum.map(w => w.name).join('\n');

  // Build visual memory blocks
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
  if (!toolBlock) return null;
  return toolBlock.input;
}

// ---- Process one photo ----

async function processPhoto(media, curriculum, visualMemory) {
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

  console.log(`  Processing ${media.id.slice(0,8)}... (${childName})`);

  // Mark attempted
  await supabase.from('montree_media').update({
    identification_attempted_at: new Date().toISOString()
  }).eq('id', media.id);

  // Pass 1: Describe
  const description = await pass1Describe(photoUrl, childName, childAge);
  if (!description) {
    console.log(`  ❌ Pass 1 failed — no description`);
    await supabase.from('montree_media').update({
      identification_status: 'failed'
    }).eq('id', media.id);
    return { id: media.id, status: 'failed', reason: 'pass1_empty' };
  }
  console.log(`  Pass 1: "${description.slice(0, 80)}..."`);

  // Pass 2: Match
  const match = await pass2Match(description, curriculum, visualMemory);
  if (!match) {
    console.log(`  ❌ Pass 2 failed — no tool output`);
    await supabase.from('montree_media').update({
      identification_status: 'haiku_drafted',
      sonnet_draft: JSON.stringify({ visual_description: description }),
    }).eq('id', media.id);
    return { id: media.id, status: 'haiku_drafted', reason: 'pass2_no_tool' };
  }

  console.log(`  Pass 2: "${match.work_name}" (${(match.confidence * 100).toFixed(0)}%) — ${match.reasoning}`);

  // Gate A: Auto-confirm at high confidence + work exists in curriculum
  const GATE_A_THRESHOLD = 0.85;
  const hasVm = visualMemory.some(vm =>
    vm.work_name?.toLowerCase() === match.work_name?.toLowerCase()
  );

  if (match.confidence >= GATE_A_THRESHOLD && hasVm) {
    const workId = await resolveWorkId(WHALE_CLASSROOM, match.work_name);
    if (workId) {
      await supabase.from('montree_media').update({
        work_id: workId,
        identification_status: 'haiku_matched',
        identification_confidence: match.confidence,
        teacher_confirmed: true,
        sonnet_draft: JSON.stringify({
          visual_description: description,
          proposed_name: match.work_name,
          confidence: match.confidence,
        }),
      }).eq('id', media.id);
      console.log(`  ✅ Gate A PASS — auto-confirmed as "${match.work_name}"`);
      return { id: media.id, status: 'haiku_matched', work: match.work_name };
    }
  }

  // Gate A failed — write as haiku_drafted for teacher review
  const workId = await resolveWorkId(WHALE_CLASSROOM, match.work_name);
  await supabase.from('montree_media').update({
    identification_status: 'haiku_drafted',
    identification_confidence: match.confidence,
    work_id: workId || null,
    sonnet_draft: JSON.stringify({
      visual_description: description,
      proposed_name: match.work_name,
      confidence: match.confidence,
      suggested_area: null,
      closest_existing_match: workId ? { work_name: match.work_name, similarity: match.confidence } : null,
    }),
  }).eq('id', media.id);
  console.log(`  🟡 Haiku drafted — "${match.work_name}" (${(match.confidence * 100).toFixed(0)}%) — needs teacher review`);
  return { id: media.id, status: 'haiku_drafted', work: match.work_name, confidence: match.confidence };
}

// ---- Main ----

async function main() {
  console.log('🔍 Finding stuck photos (identification_status IS NULL)...\n');

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

  if (error) {
    console.error('Query failed:', error);
    process.exit(1);
  }

  if (!stuck || stuck.length === 0) {
    console.log('✅ No stuck photos found — all processed!');
    return;
  }

  console.log(`Found ${stuck.length} stuck photos. Loading curriculum + visual memory...\n`);

  const curriculum = await loadCurriculum(WHALE_CLASSROOM);
  const visualMemory = await loadVisualMemory(WHALE_CLASSROOM);
  console.log(`Curriculum: ${curriculum.length} works, Visual memory: ${visualMemory.length} entries\n`);

  // Process in batches of CONCURRENCY
  const results = [];
  for (let i = 0; i < stuck.length; i += CONCURRENCY) {
    const batch = stuck.slice(i, i + CONCURRENCY);
    console.log(`--- Batch ${Math.floor(i / CONCURRENCY) + 1} (${batch.length} photos) ---`);
    const batchResults = await Promise.allSettled(
      batch.map(m => processPhoto(m, curriculum, visualMemory))
    );
    for (const r of batchResults) {
      if (r.status === 'fulfilled') results.push(r.value);
      else console.error('  ❌ Error:', r.reason?.message || r.reason);
    }
    // Brief pause between batches for rate limiting
    if (i + CONCURRENCY < stuck.length) await new Promise(r => setTimeout(r, 1000));
  }

  // Summary
  console.log('\n========== SUMMARY ==========');
  const matched = results.filter(r => r.status === 'haiku_matched');
  const drafted = results.filter(r => r.status === 'haiku_drafted');
  const failed = results.filter(r => r.status === 'failed');
  console.log(`✅ Auto-confirmed: ${matched.length}`);
  console.log(`🟡 Needs review:   ${drafted.length}`);
  console.log(`❌ Failed:          ${failed.length}`);
  if (matched.length > 0) {
    console.log('\nAuto-confirmed works:');
    matched.forEach(r => console.log(`  - ${r.work}`));
  }
  if (drafted.length > 0) {
    console.log('\nNeeds teacher review:');
    drafted.forEach(r => console.log(`  - ${r.work} (${((r.confidence || 0) * 100).toFixed(0)}%)`));
  }
  console.log('\n✨ Done! Refresh Photo Audit page to see results.');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
