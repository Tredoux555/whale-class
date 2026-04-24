#!/usr/bin/env node
// Second-pass: translate keys in es.ts that still have English values (stubs from old file).
// Skips keys where EN===ES is legitimate (proper nouns, technical terms, short tokens).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-haiku-4-5-20251001';

// Terms that are legitimately the same in English and Spanish
const LEGIT_SAME = new Set([
  'montree', 'error', 'sensorial', 'cultural', 'email', 'guru', 'portal',
  'url', 'pdf', 'ok', 'montessori', '••••••••', 'cancel', 'premium',
  'n/a', 'status', 'admin', 'test', 'login', 'reset', 'offline', 'online',
  'app', 'id', 'api', 'type', 'data', 'info', 'menu', 'color', 'simple',
  'normal', 'general', 'principal', 'total', 'material', 'plan', 'control',
  'note', 'notes', 'detail', 'details', 'edit', 'delete', 'audio', 'video',
  'photo', 'photos', 'camera', 'manual', 'auto', 'icon', 'filter', 'alert',
]);

function parseTranslationFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const pairs = new Map();
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('export') ||
        trimmed.startsWith('import') || trimmed === '};' || trimmed === '{') continue;
    const m = trimmed.match(/^'([^']+)':\s*(.+?),?\s*$/);
    if (!m) continue;
    const key = m[1];
    let rawVal = m[2].replace(/,\s*$/, '');
    if ((rawVal.startsWith("'") && rawVal.endsWith("'")) ||
        (rawVal.startsWith('"') && rawVal.endsWith('"'))) {
      rawVal = rawVal.slice(1, -1);
    }
    pairs.set(key, rawVal);
  }
  return pairs;
}

function isLegitSame(key, value) {
  const lower = value.toLowerCase().trim();
  // Short values (≤3 chars) are often codes/abbreviations — skip
  if (value.length <= 3) return true;
  // Check against known legitimate same-in-both-languages terms
  if (LEGIT_SAME.has(lower)) return true;
  // Pure numbers, URLs, placeholders
  if (/^\d+$/.test(value)) return true;
  if (/^https?:\/\//.test(value)) return true;
  // Values that are ONLY template variables like {count} or {name}
  if (/^\{[^}]+\}$/.test(value)) return true;
  // Values that are just punctuation/symbols
  if (/^[^a-zA-Z]+$/.test(value)) return true;
  return false;
}

async function translateBatch(entries, batchNum, totalBatches) {
  const keyValueLines = entries.map(([k, v]) => `${k} = ${v}`).join('\n');

  const prompt = `Translate the following English UI strings to Argentine Spanish (Español rioplatense).

CRITICAL RULES:
- Use VOSEO: "vos tenés" (not "tú tienes"), "vos podés" (not "tú puedes")
- Use "ustedes" for plural (not "vosotros")
- Use AMI Montessori terminology: Vida Práctica, Sensorial, Matemáticas, Lenguaje, Áreas Culturales
- Keep proper nouns in English (Montessori work names like "Pink Tower", "Brown Stair")
- Keep technical terms: URL, email, PDF, etc.
- Keep {placeholders} and template variables exactly as-is
- Keep HTML tags exactly as-is (<b>, <br>, etc.)
- Maintain the same tone — warm, professional, teacher-friendly
- "your child" → "su hijo/a" in formal parent-facing text
- "child" as a label → "niño/a" or "alumno/a"
- Do NOT translate the keys (left side of =), only the values (right side)

Return ONLY the translations in EXACTLY this format, one per line:
key = translated value

Do NOT add any explanation, preamble, or markdown formatting.

Strings to translate (batch ${batchNum}/${totalBatches}):
${keyValueLines}`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
  const translated = new Map();
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf(' = ');
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 3).trim();
    if (key && val) translated.set(key, val);
  }
  return translated;
}

function writeEsFile(allPairs, outputPath) {
  const header = `// Spanish (Argentine) translations — Montree i18n
// Auto-translated via Haiku + human review.
// Uses voseo (vos tenés), ustedes for plural, AMI Montessori terminology.

export const es: Record<string, string> = {
`;
  const lines = [];
  for (const [key, val] of allPairs) {
    const escaped = val.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    lines.push(`  '${key}': '${escaped}',`);
  }
  const content = header + lines.join('\n') + '\n};\n';
  fs.writeFileSync(outputPath, content, 'utf-8');
}

async function main() {
  const enPath = path.join(__dirname, '..', 'lib/montree/i18n/en.ts');
  const esPath = path.join(__dirname, '..', 'lib/montree/i18n/es.ts');

  console.log('Parsing en.ts...');
  const enPairs = parseTranslationFile(enPath);
  console.log(`  Found ${enPairs.size} English keys`);

  console.log('Parsing existing es.ts...');
  const esPairs = parseTranslationFile(esPath);
  console.log(`  Found ${esPairs.size} Spanish keys`);

  // Find stub keys: es value === en value AND not legitimately the same
  const stubs = [];
  for (const [key, enVal] of enPairs) {
    const esVal = esPairs.get(key);
    if (esVal && esVal === enVal && !isLegitSame(key, enVal)) {
      stubs.push([key, enVal]);
    }
  }

  console.log(`  ${stubs.length} stub keys need translation (EN===ES, not legitimate)`);

  if (stubs.length === 0) {
    console.log('Nothing to translate!');
    return;
  }

  // Show some examples
  console.log('\nSample stubs:');
  for (const [k, v] of stubs.slice(0, 10)) {
    console.log(`  ${k} = ${v.substring(0, 60)}`);
  }

  // Translate in batches of 50
  const BATCH_SIZE = 50;
  const totalBatches = Math.ceil(stubs.length / BATCH_SIZE);
  let translated = 0;
  let failed = 0;

  for (let i = 0; i < stubs.length; i += BATCH_SIZE) {
    const batch = stubs.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    console.log(`\nBatch ${batchNum}/${totalBatches} (${batch.length} keys)...`);

    try {
      const result = await translateBatch(batch, batchNum, totalBatches);
      for (const [key, enVal] of batch) {
        const esVal = result.get(key);
        if (esVal && esVal !== enVal) {
          esPairs.set(key, esVal);
          translated++;
        } else if (esVal) {
          // Haiku returned same as English — keep it, might be legit
          esPairs.set(key, esVal);
          translated++;
        } else {
          failed++;
          console.log(`  ⚠ Missing: ${key}`);
        }
      }
      console.log(`  ✓ ${result.size}/${batch.length} translated`);

      if (i + BATCH_SIZE < stubs.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (err) {
      console.error(`  ✗ Batch ${batchNum} failed:`, err.message);
      failed += batch.length;
    }
  }

  // Rebuild es.ts in en.ts key order
  const orderedPairs = new Map();
  for (const [key] of enPairs) {
    const esVal = esPairs.get(key);
    orderedPairs.set(key, esVal || enPairs.get(key));
  }

  console.log(`\n═══════════════════════════════════`);
  console.log(`Stubs found: ${stubs.length}`);
  console.log(`Translated: ${translated}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total keys in output: ${orderedPairs.size}`);
  console.log(`═══════════════════════════════════`);

  console.log(`\nWriting to ${esPath}...`);
  writeEsFile(orderedPairs, esPath);
  console.log('Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
