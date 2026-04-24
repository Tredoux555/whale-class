#!/usr/bin/env node
// Step 2: Add name_es columns + batch translate 384 Whale Class works to Argentine Spanish
// Run: cd ~/Desktop/Master\ Brain/ACTIVE/whale && node scripts/batch-translate-es.mjs

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';
config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const CLASSROOM_ID = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69'; // Whale Class
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const BATCH_SIZE = 5;
const DELAY_MS = 500;

if (!SUPABASE_URL || !SUPABASE_KEY || !ANTHROPIC_KEY) {
  console.error('Missing env vars. Ensure .env.local has SUPABASE and ANTHROPIC keys.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

// --- Step A: Add columns if not exist ---
async function addColumns() {
  console.log('\n=== Step A: Adding name_es, parent_description_es, why_it_matters_es columns ===');
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE montree_classroom_curriculum_works
        ADD COLUMN IF NOT EXISTS name_es TEXT,
        ADD COLUMN IF NOT EXISTS parent_description_es TEXT,
        ADD COLUMN IF NOT EXISTS why_it_matters_es TEXT;
    `
  });
  if (error) {
    // RPC might not exist — tell user to run SQL manually
    console.warn('[AddColumns] RPC exec_sql not available:', error.message);
    console.warn('[AddColumns] Please run this SQL in Supabase SQL Editor:');
    console.warn(`  ALTER TABLE montree_classroom_curriculum_works
    ADD COLUMN IF NOT EXISTS name_es TEXT,
    ADD COLUMN IF NOT EXISTS parent_description_es TEXT,
    ADD COLUMN IF NOT EXISTS why_it_matters_es TEXT;`);

    // Try a simple test query to see if columns already exist
    const { data: test, error: testErr } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('name_es')
      .limit(1);

    if (testErr && testErr.message.includes('name_es')) {
      console.error('[AddColumns] Column name_es does NOT exist yet. Cannot proceed.');
      console.error('[AddColumns] Run the ALTER TABLE SQL above in Supabase SQL Editor first.');
      process.exit(1);
    }
    console.log('[AddColumns] Column name_es already exists — proceeding.');
  } else {
    console.log('[AddColumns] Columns added successfully.');
  }
}

// --- Step B: Load works needing translation ---
async function loadWorks() {
  const { data, error } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id, name, parent_description, why_it_matters, name_es')
    .eq('classroom_id', CLASSROOM_ID)
    .order('name');

  if (error) {
    console.error('[LoadWorks] Failed:', error.message);
    process.exit(1);
  }
  return data || [];
}

// --- Step C: Translate a single work ---
async function translateWork(work) {
  const systemPrompt = 'Sos un traductor profesional de educación Montessori. Traducí del inglés al español rioplatense (Argentina), manteniendo un tono cálido y profesional, adecuado para que lo lean los padres. Usá voseo (vos, tocá, mirá, podés) y "ustedes" para plural. La traducción debe ser natural y fluida, no mecánica. Usá "su hijo/a" para "your child". Usá los términos Montessori estándar en español (vida práctica, sensorial, matemáticas, lenguaje, cultura).';

  try {
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Traducí el siguiente nombre y descripciones de un trabajo Montessori al español argentino. Llamá a la herramienta submit_translation con los tres campos traducidos. Cada campo debe estar en español argentino.

Nombre del trabajo (inglés): ${work.name}

parent_description (inglés):
${work.parent_description || '(none)'}

why_it_matters (inglés):
${work.why_it_matters || '(none)'}`,
      }],
      tools: [{
        name: 'submit_translation',
        description: 'Enviá las tres traducciones al español argentino.',
        input_schema: {
          type: 'object',
          properties: {
            translated_name: {
              type: 'string',
              description: 'Nombre corto en español del trabajo Montessori.',
            },
            translated_parent_description: {
              type: 'string',
              description: 'Traducción al español de parent_description. Cadena vacía si la entrada era (none).',
            },
            translated_why_it_matters: {
              type: 'string',
              description: 'Traducción al español de why_it_matters. Cadena vacía si la entrada era (none).',
            },
          },
          required: ['translated_name', 'translated_parent_description', 'translated_why_it_matters'],
        },
      }],
      tool_choice: { type: 'tool', name: 'submit_translation' },
    });

    const toolBlock = response.content.find(
      b => b.type === 'tool_use' && b.name === 'submit_translation'
    );
    if (!toolBlock?.input) return null;

    const { translated_name, translated_parent_description, translated_why_it_matters } = toolBlock.input;

    const tokens = response.usage || {};
    return {
      name_es: translated_name?.trim() || null,
      parent_description_es: translated_parent_description?.trim() || null,
      why_it_matters_es: translated_why_it_matters?.trim() || null,
      input_tokens: tokens.input_tokens || 0,
      output_tokens: tokens.output_tokens || 0,
    };
  } catch (err) {
    console.error(`  [Translate] Error for "${work.name}":`, err.message);
    return null;
  }
}

// --- Main ---
async function main() {
  console.log('=== Spanish Batch Translation for Whale Class ===\n');

  // Step A
  await addColumns();

  // Step B
  const allWorks = await loadWorks();
  console.log(`\nLoaded ${allWorks.length} works from Whale Class.`);

  const needsTranslation = allWorks.filter(w => !w.name_es);
  const alreadyDone = allWorks.length - needsTranslation.length;
  console.log(`Already translated: ${alreadyDone}`);
  console.log(`Needs translation: ${needsTranslation.length}\n`);

  if (needsTranslation.length === 0) {
    console.log('All works already translated! Nothing to do.');
    return;
  }

  let translated = 0;
  let failed = 0;
  let totalInput = 0;
  let totalOutput = 0;

  for (let i = 0; i < needsTranslation.length; i += BATCH_SIZE) {
    const batch = needsTranslation.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(needsTranslation.length / BATCH_SIZE);
    console.log(`--- Batch ${batchNum}/${totalBatches} (${batch.length} works) ---`);

    const results = await Promise.all(batch.map(async (work) => {
      const result = await translateWork(work);
      if (!result || !result.name_es) {
        console.log(`  ✗ "${work.name}" — no translation`);
        return { work, success: false };
      }

      // Save to DB
      const updateData = {};
      if (result.name_es) updateData.name_es = result.name_es;
      if (result.parent_description_es) updateData.parent_description_es = result.parent_description_es;
      if (result.why_it_matters_es) updateData.why_it_matters_es = result.why_it_matters_es;

      const { error } = await supabase
        .from('montree_classroom_curriculum_works')
        .update(updateData)
        .eq('id', work.id);

      if (error) {
        console.log(`  ✗ "${work.name}" — DB error: ${error.message}`);
        return { work, success: false };
      }

      totalInput += result.input_tokens;
      totalOutput += result.output_tokens;
      console.log(`  ✓ "${work.name}" → "${result.name_es}"`);
      return { work, success: true };
    }));

    for (const r of results) {
      if (r.success) translated++;
      else failed++;
    }

    // Delay between batches
    if (i + BATCH_SIZE < needsTranslation.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total works: ${allWorks.length}`);
  console.log(`Already translated: ${alreadyDone}`);
  console.log(`Newly translated: ${translated}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total tokens: ${totalInput} input + ${totalOutput} output`);
  const cost = (totalInput * 0.8 + totalOutput * 4) / 1_000_000;
  console.log(`Estimated cost: $${cost.toFixed(4)}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
