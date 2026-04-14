// One-off script: batch translate all Whale Class works missing name_zh
// Run with: npx tsx scripts/batch-translate-whale.ts

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { MONTESSORI_GLOSSARY_ZH } from '../lib/montree/classifier/montessori-glossary-zh';

const SUPABASE_URL = 'https://dmfncjjtsoxrnvcdnvjq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;
const CLASSROOM_ID = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69'; // Whale Class
const HAIKU = 'claude-haiku-4-5-20251001';

if (!SUPABASE_KEY || !ANTHROPIC_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or ANTHROPIC_API_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY, timeout: 30000 });

interface Work {
  id: string;
  name: string;
  parent_description: string | null;
  why_it_matters: string | null;
  parent_description_zh: string | null;
  why_it_matters_zh: string | null;
}

async function translateWork(work: Work): Promise<{ name: string; name_zh: string | null; status: string }> {
  const name = work.name;

  // 1. Check glossary first (free)
  let nameZh: string | null = MONTESSORI_GLOSSARY_ZH[name] || null;
  if (!nameZh) {
    const base = name.replace(/\s*-\s*.+$/, '').trim();
    nameZh = MONTESSORI_GLOSSARY_ZH[base] || null;
  }

  // 2. If not in glossary, use Haiku
  if (!nameZh) {
    const glossaryEntries = Object.entries(MONTESSORI_GLOSSARY_ZH).slice(0, 80).map(([e, c]) => `${e}=${c}`).join(', ');
    const resp = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 1024,
      system: '你是蒙台梭利教育翻译专家。翻译工作名称为简体中文，保持简洁准确。参考以下术语：\n' + glossaryEntries,
      messages: [{
        role: 'user',
        content: `Translate this Montessori work name to Chinese (Simplified). Return ONLY a JSON object with "name_zh", "parent_description_zh", and "why_it_matters_zh" fields. Keep the name short (2-6 Chinese characters preferred).

Work name: ${name}
${work.parent_description ? `Description: ${work.parent_description.slice(0, 200)}` : ''}
${work.why_it_matters ? `Why it matters: ${work.why_it_matters.slice(0, 200)}` : ''}

Return JSON:`,
      }],
    });

    const text = resp.content[0]?.type === 'text' ? resp.content[0].text : '';
    const jsonStr = text.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();
    try {
      const parsed = JSON.parse(jsonStr);
      nameZh = parsed.name_zh || null;

      const updateData: Record<string, string> = {};
      if (nameZh) updateData.name_zh = nameZh;
      if (parsed.parent_description_zh && !work.parent_description_zh) updateData.parent_description_zh = parsed.parent_description_zh;
      if (parsed.why_it_matters_zh && !work.why_it_matters_zh) updateData.why_it_matters_zh = parsed.why_it_matters_zh;

      if (Object.keys(updateData).length > 0) {
        await sb.from('montree_classroom_curriculum_works').update(updateData).eq('id', work.id);
      }
      return { name, name_zh: nameZh, status: 'haiku' };
    } catch (parseErr) {
      // Try to salvage name_zh from truncated JSON
      const nameMatch = text.match(/"name_zh"\s*:\s*"([^"]+)"/);
      if (nameMatch) {
        const salvaged = nameMatch[1];
        await sb.from('montree_classroom_curriculum_works').update({ name_zh: salvaged }).eq('id', work.id);
        return { name, name_zh: salvaged, status: 'haiku_salvaged' };
      }
      console.log(`\n  Parse error for "${name}": ${text.slice(0, 80)}`);
      return { name, name_zh: null, status: 'parse_error' };
    }
  }

  // 3. Glossary match — save
  await sb.from('montree_classroom_curriculum_works').update({ name_zh: nameZh }).eq('id', work.id);
  return { name, name_zh: nameZh, status: 'glossary' };
}

async function main() {
  const { data: works, error } = await sb.from('montree_classroom_curriculum_works')
    .select('id, name, parent_description, why_it_matters, parent_description_zh, why_it_matters_zh')
    .eq('classroom_id', CLASSROOM_ID)
    .is('name_zh', null)
    .order('name');

  if (error) { console.error('Query error:', error.message); process.exit(1); }
  if (!works || works.length === 0) { console.log('All works already have name_zh!'); return; }

  console.log(`Translating ${works.length} works...\n`);

  const BATCH = 3;
  let translated = 0, failed = 0, glossaryHits = 0;

  for (let i = 0; i < works.length; i += BATCH) {
    const batch = works.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(w => translateWork(w)));
    for (const r of results) {
      if (r.name_zh) {
        translated++;
        if (r.status === 'glossary') glossaryHits++;
      } else {
        failed++;
        console.log(`  FAILED: ${r.name} (${r.status})`);
      }
    }
    const batchNum = Math.floor(i / BATCH + 1);
    const totalBatches = Math.ceil(works.length / BATCH);
    process.stdout.write(`\rBatch ${batchNum}/${totalBatches}: ${translated} translated, ${glossaryHits} glossary, ${failed} failed`);

    if (i + BATCH < works.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`\n\nDone! Translated: ${translated}, Glossary hits: ${glossaryHits}, Failed: ${failed}, Total: ${works.length}`);
}

main().catch(e => console.error('Fatal:', e.message));
