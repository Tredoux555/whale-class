#!/usr/bin/env node
// Batch-translate en.ts → es.ts using Haiku API
// Preserves already-translated keys in es.ts, translates the rest.
// Uses Argentine Spanish (voseo: vos tenés, ustedes).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-haiku-4-5-20251001';

// ── Parse a .ts translation file into a Map<key, value> ──────────
function parseTranslationFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const pairs = new Map();
  // Match lines like:   'some.key': 'Some value',
  // or                   'some.key': "Some value",
  // Handle escaped quotes inside values
  const regex = /^\s*'([^']+)':\s*(['"])(.*?)\2,?\s*$/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    pairs.set(match[1], match[3]);
  }
  return pairs;
}

// Some values have template literals or complex escapes — use a more robust parser
function parseTranslationFileRobust(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const pairs = new Map();
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip comments, empty lines, export/import/closing brace
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('export') ||
        trimmed.startsWith('import') || trimmed === '};' || trimmed === '{') continue;

    // Match 'key': 'value', or 'key': "value",
    const m = trimmed.match(/^'([^']+)':\s*(.+?),?\s*$/);
    if (!m) continue;

    const key = m[1];
    let rawVal = m[2].replace(/,\s*$/, ''); // strip trailing comma

    // Unwrap quotes
    if ((rawVal.startsWith("'") && rawVal.endsWith("'")) ||
        (rawVal.startsWith('"') && rawVal.endsWith('"'))) {
      rawVal = rawVal.slice(1, -1);
    }

    pairs.set(key, rawVal);
  }
  return pairs;
}

// ── Translate a batch of key-value pairs ─────────────────────────
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

// ── Write the complete es.ts file ────────────────────────────────
function writeEsFile(allPairs, outputPath) {
  const header = `// Spanish (Argentine) translations — Montree i18n
// Auto-translated via Haiku + human review.
// Uses voseo (vos tenés), ustedes for plural, AMI Montessori terminology.

export const es: Record<string, string> = {
`;

  const lines = [];
  for (const [key, val] of allPairs) {
    // Escape single quotes in value
    const escaped = val.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    lines.push(`  '${key}': '${escaped}',`);
  }

  const content = header + lines.join('\n') + '\n};\n';
  fs.writeFileSync(outputPath, content, 'utf-8');
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  const enPath = path.join(__dirname, '..', 'lib/montree/i18n/en.ts');
  const esPath = path.join(__dirname, '..', 'lib/montree/i18n/es.ts');

  console.log('Parsing en.ts...');
  const enPairs = parseTranslationFileRobust(enPath);
  console.log(`  Found ${enPairs.size} English keys`);

  console.log('Parsing existing es.ts...');
  const existingEs = parseTranslationFileRobust(esPath);
  console.log(`  Found ${existingEs.size} existing Spanish translations`);

  // Find keys that need translation (in en but not in es, or value === en value meaning it's a stub)
  const needsTranslation = [];
  for (const [key, enVal] of enPairs) {
    const esVal = existingEs.get(key);
    if (!esVal) {
      // Not in es.ts at all
      needsTranslation.push([key, enVal]);
    }
    // If es value exists, keep it (even if same as en — could be intentionally same like "Montree")
  }

  console.log(`  ${needsTranslation.length} keys need translation`);

  if (needsTranslation.length === 0) {
    console.log('Nothing to translate!');
    return;
  }

  // Translate in batches of 50
  const BATCH_SIZE = 50;
  const totalBatches = Math.ceil(needsTranslation.length / BATCH_SIZE);
  const allTranslated = new Map(existingEs); // Start with existing

  // Also add any en keys that weren't in the translation queue (already translated)
  // We want the final file to have ALL keys from en.ts

  let translated = 0;
  let failed = 0;

  for (let i = 0; i < needsTranslation.length; i += BATCH_SIZE) {
    const batch = needsTranslation.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    console.log(`\nBatch ${batchNum}/${totalBatches} (${batch.length} keys)...`);

    try {
      const result = await translateBatch(batch, batchNum, totalBatches);

      for (const [key, enVal] of batch) {
        const esVal = result.get(key);
        if (esVal) {
          allTranslated.set(key, esVal);
          translated++;
        } else {
          // Haiku didn't return this key — use English as fallback
          allTranslated.set(key, enVal);
          failed++;
          console.log(`  ⚠ Missing translation for: ${key}`);
        }
      }

      console.log(`  ✓ ${result.size}/${batch.length} translated`);

      // Rate limit delay
      if (i + BATCH_SIZE < needsTranslation.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (err) {
      console.error(`  ✗ Batch ${batchNum} failed:`, err.message);
      // Use English fallback for failed batch
      for (const [key, enVal] of batch) {
        if (!allTranslated.has(key)) {
          allTranslated.set(key, enVal);
          failed++;
        }
      }
    }
  }

  // Now build the final map in en.ts key order
  const orderedPairs = new Map();
  for (const [key] of enPairs) {
    const esVal = allTranslated.get(key);
    if (esVal) {
      orderedPairs.set(key, esVal);
    } else {
      // Key exists in en but not translated — use English
      orderedPairs.set(key, enPairs.get(key));
    }
  }

  console.log(`\n═══════════════════════════════════`);
  console.log(`Total keys: ${orderedPairs.size}`);
  console.log(`Translated: ${translated}`);
  console.log(`Kept existing: ${existingEs.size}`);
  console.log(`Failed (English fallback): ${failed}`);
  console.log(`═══════════════════════════════════`);

  // Write output
  const outputPath = esPath;
  console.log(`\nWriting to ${outputPath}...`);
  writeEsFile(orderedPairs, outputPath);
  console.log('Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
