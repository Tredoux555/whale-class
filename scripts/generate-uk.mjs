#!/usr/bin/env node
// Generates lib/montree/i18n/uk.ts from en.ts using Anthropic API (Haiku)
// Run: node generate-uk.mjs

import fs from 'fs';
import path from 'path';

const WHALE_PATH = '/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/whale';
const EN_PATH = path.join(WHALE_PATH, 'lib/montree/i18n/en.ts');
const OUT_PATH = path.join(WHALE_PATH, 'lib/montree/i18n/uk.ts');
const BATCH_SIZE = 60;
const DELAY_MS = 500;

// Read API key from .env.local
const envPath = path.join(WHALE_PATH, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envMatch = envContent.match(/^ANTHROPIC_API_KEY=(.+)$/m);
const API_KEY = envMatch?.[1]?.trim() || process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error('ERROR: ANTHROPIC_API_KEY not found in .env.local'); process.exit(1); }

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function parseEnTs(content) {
  const pairs = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const m = line.match(/^\s+'([^']+)':\s+'(.*)',?\s*$/);
    if (m) pairs.push({ key: m[1], value: m[2] });
  }
  return pairs;
}

async function translateBatch(pairs) {
  const inputLines = pairs.map(p => `${p.key}|||${p.value}`).join('\n');

  const systemPrompt = `You are a professional Ukrainian translator for a Montessori school management app called Montree.

RULES:
1. Translate each line's VALUE to Ukrainian. Keep the KEY before ||| unchanged.
2. Formal ви register throughout (ви, вас, вам, ваш — NEVER ти/твій)
3. Use "ваша дитина" for "your child"
4. AMI Montessori area terms: Практичне Життя, Сенсорний, Математика, Мова, Культура
5. Keep {placeholders} like {name}, {count}, {week} EXACTLY as-is — never translate them
6. Keep proper nouns unchanged: Montessori, Montree, Guru
7. Montessori work names (Pink Tower, Brown Stair, Sandpaper Letters etc.) — keep in English
8. Keep emoji as-is
9. Do NOT add or remove lines
10. Output format: KEY|||UKRAINIAN_TRANSLATION (one per line, no extra text)
11. For app.name or similar brand names, keep them as-is
12. Short UI strings like "Save", "Cancel", "Loading..." translate normally`;

  const userMsg = `Translate these key|||value pairs. Output exactly the same number of lines as input, same format KEY|||UKRAINIAN_VALUE:\n\n${inputLines}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text = data.content[0].text.trim();
  const lines = text.split('\n').filter(l => l.includes('|||'));

  const results = {};
  for (const line of lines) {
    const idx = line.indexOf('|||');
    if (idx === -1) continue;
    const key = line.substring(0, idx).trim();
    const val = line.substring(idx + 3).trim();
    results[key] = val;
  }
  return results;
}

async function main() {
  console.log('Reading en.ts...');
  const content = fs.readFileSync(EN_PATH, 'utf-8');
  const pairs = parseEnTs(content);
  console.log(`Found ${pairs.length} key-value pairs`);

  const translated = {};
  const failed = [];

  for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
    const batch = pairs.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(pairs.length / BATCH_SIZE);

    process.stdout.write(`Batch ${batchNum}/${totalBatches} (keys ${i+1}-${Math.min(i+BATCH_SIZE, pairs.length)})... `);

    let attempts = 0;
    let success = false;
    while (attempts < 3 && !success) {
      try {
        const results = await translateBatch(batch);
        for (const p of batch) {
          if (results[p.key]) {
            translated[p.key] = results[p.key];
          } else {
            translated[p.key] = p.value;
            failed.push(p.key);
          }
        }
        success = true;
        console.log(`✓ (${Object.keys(results).length}/${batch.length} translated)`);
      } catch (err) {
        attempts++;
        if (attempts < 3) {
          console.log(`\n  Error: ${err.message}. Retrying (${attempts}/3)...`);
          await sleep(2000 * attempts);
        } else {
          console.log(`\n  FAILED after 3 attempts: ${err.message}. Using English fallback.`);
          for (const p of batch) {
            translated[p.key] = p.value;
            failed.push(p.key);
          }
        }
      }
    }

    if (i + BATCH_SIZE < pairs.length) await sleep(DELAY_MS);
  }

  console.log('\nWriting uk.ts...');

  const lines = [
    '// Ukrainian (Українська) translations — Montree i18n',
    '// Auto-translated via Haiku. Formal ви register, AMI Montessori terminology.',
    '// Uses formal ви/вас/вам/ваш register throughout. "ваша дитина" for "your child".',
    '// AMI area terms: Практичне Життя, Сенсорний, Математика, Мова, Культура.',
    '',
    'export const uk: Record<string, string> = {',
  ];

  for (const p of pairs) {
    const val = (translated[p.key] || p.value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    lines.push(`  '${p.key}': '${val}',`);
  }

  lines.push('};');
  lines.push('');

  fs.writeFileSync(OUT_PATH, lines.join('\n'), 'utf-8');

  console.log(`\n✅ Written: ${OUT_PATH}`);
  console.log(`   Total keys: ${pairs.length}`);
  console.log(`   Translated: ${pairs.length - failed.length}`);
  if (failed.length > 0) {
    console.log(`   Fallback (English kept): ${failed.length}`);
    console.log(`   Failed keys: ${failed.slice(0, 10).join(', ')}${failed.length > 10 ? '...' : ''}`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
