#!/usr/bin/env npx tsx
// Batch pre-translate ALL Quick Guide content to Chinese
// Uses Haiku (cheap + fast) for straightforward translation
// Writes guide_content_zh JSONB to montree_classroom_curriculum_works
//
// Usage: cd whale && npx tsx scripts/batch-translate-guides.ts
// Cost: ~$0.10-0.20 total for 384 works via Haiku
// Time: ~3-5 minutes

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const CLASSROOM_ID = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69'; // Whale Class
const BATCH_SIZE = 5;
const DELAY_MS = 500;
const MODEL = 'claude-haiku-4-5-20251001'; // Haiku — cheap for translation

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

interface Work {
  id: string;
  name: string;
  quick_guide: string | null;
  presentation_steps: Array<{ step: number; title: string; description: string; tip?: string }> | null;
  materials: string[] | null;
  direct_aims: string[] | null;
  control_of_error: string | null;
  why_it_matters: string | null;
  parent_description: string | null;
  guide_content_zh: unknown | null;
}

async function translateWork(work: Work): Promise<Record<string, unknown> | null> {
  // Build translatable fields
  const toTranslate: Record<string, unknown> = {};
  if (work.quick_guide) toTranslate.quick_guide = work.quick_guide;
  if (work.parent_description) toTranslate.parent_description = work.parent_description;
  if (work.control_of_error) toTranslate.control_of_error = work.control_of_error;
  if (work.why_it_matters) toTranslate.why_it_matters = work.why_it_matters;
  if (Array.isArray(work.direct_aims) && work.direct_aims.length > 0) toTranslate.direct_aims = work.direct_aims;
  if (Array.isArray(work.materials) && work.materials.length > 0) toTranslate.materials = work.materials;
  if (Array.isArray(work.presentation_steps) && work.presentation_steps.length > 0) {
    toTranslate.presentation_steps = work.presentation_steps;
  }

  if (Object.keys(toTranslate).length === 0) return null;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Translate this Montessori work guide from English to simplified Chinese (中文).
Keep the EXACT same JSON structure. Translate all text values naturally.
For presentation_steps, translate "title", "description", and "tip" fields.
For arrays like direct_aims and materials, translate each string.
Return ONLY valid JSON, no markdown fences.

${JSON.stringify(toTranslate)}`
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const translated = JSON.parse(cleaned);
    // Merge: keep original structure fields (name, video_search_term) + translated content
    return {
      name: work.name,
      ...translated,
    };
  } catch (err) {
    // Try to salvage — extract JSON object
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const salvaged = JSON.parse(match[0]);
        return { name: work.name, ...salvaged };
      } catch { /* fall through */ }
    }
    console.error(`  ✗ JSON parse failed for "${work.name}": ${(err as Error).message}`);
    return null;
  }
}

async function main() {
  console.log('Loading works from Whale Class...');

  const { data: works, error } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id, name, quick_guide, presentation_steps, materials, direct_aims, control_of_error, why_it_matters, parent_description, guide_content_zh')
    .eq('classroom_id', CLASSROOM_ID);

  if (error || !works) {
    console.error('Failed to load works:', error?.message);
    process.exit(1);
  }

  // Filter to works that have guide content but no Chinese cache
  const needsTranslation = (works as Work[]).filter(w =>
    !w.guide_content_zh &&
    (w.quick_guide || (Array.isArray(w.presentation_steps) && w.presentation_steps.length > 0))
  );

  const alreadyCached = (works as Work[]).filter(w => w.guide_content_zh).length;
  const noContent = works.length - needsTranslation.length - alreadyCached;

  console.log(`Total works: ${works.length}`);
  console.log(`Already cached: ${alreadyCached}`);
  console.log(`No guide content: ${noContent}`);
  console.log(`Need translation: ${needsTranslation.length}`);
  console.log('');

  let translated = 0;
  let failed = 0;

  for (let i = 0; i < needsTranslation.length; i += BATCH_SIZE) {
    const batch = needsTranslation.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(needsTranslation.length / BATCH_SIZE);
    console.log(`Batch ${batchNum}/${totalBatches} (${batch.map(w => w.name.slice(0, 25)).join(', ')})...`);

    const results = await Promise.all(batch.map(async (work) => {
      try {
        const zh = await translateWork(work);
        if (!zh) {
          console.log(`  ⊘ "${work.name}" — no translatable content`);
          return { id: work.id, name: work.name, success: false };
        }

        const { error: updateErr } = await supabase
          .from('montree_classroom_curriculum_works')
          .update({ guide_content_zh: zh })
          .eq('id', work.id);

        if (updateErr) {
          console.error(`  ✗ DB update failed for "${work.name}": ${updateErr.message}`);
          return { id: work.id, name: work.name, success: false };
        }

        console.log(`  ✓ "${work.name}"`);
        return { id: work.id, name: work.name, success: true };
      } catch (err) {
        console.error(`  ✗ "${work.name}": ${(err as Error).message}`);
        return { id: work.id, name: work.name, success: false };
      }
    }));

    translated += results.filter(r => r.success).length;
    failed += results.filter(r => !r.success).length;

    // Rate limit delay between batches
    if (i + BATCH_SIZE < needsTranslation.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  console.log('');
  console.log('═══ DONE ═══');
  console.log(`Translated: ${translated}`);
  console.log(`Failed: ${failed}`);
  console.log(`Already cached: ${alreadyCached}`);
  console.log(`No content: ${noContent}`);
  console.log(`Total: ${works.length}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
