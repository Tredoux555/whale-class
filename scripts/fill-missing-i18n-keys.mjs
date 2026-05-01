#!/usr/bin/env node
/**
 * Fill missing UI translation keys across non-English language files.
 *
 * Reads en.ts (canonical) and each non-English file, finds keys that exist
 * in EN but are missing in the target language, then asks Haiku to translate
 * them in batches and appends them to the file (alphabetically grouped at the
 * end, before the closing `};`).
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node scripts/fill-missing-i18n-keys.mjs [lang ...]
 *
 * If no langs are passed, runs against every non-English language.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const I18N_DIR = path.resolve(process.cwd(), 'lib/montree/i18n');
const HAIKU = 'claude-haiku-4-5-20251001';
const BATCH_SIZE = 25;

const LANG_NAMES = {
  zh: 'Simplified Chinese',
  es: 'Argentine Spanish (use voseo: vos tenés, ustedes for plural; AMI Montessori terminology)',
  de: 'German (formal Sie, AMI terms: Praktisches Leben, Sinnesmaterial, Mathematik, Sprache, Kulturelles)',
  fr: 'French (formal vous, AMI terms: Vie Pratique, Sensoriel, Mathématiques, Langage, Culture)',
  pt: 'Brazilian Portuguese (formal você, AMI terms: Vida Prática, Sensorial, Matemática, Linguagem, Cultural)',
  nl: 'Dutch (formal u/uw, AMI terms: Praktisch Leven, Zintuiglijk, Wiskunde, Taal, Cultureel)',
  it: 'Italian (formal Lei/Suo, AMI terms: Vita Pratica, Sensoriale, Matematica, Linguaggio, Culturale)',
  ja: 'Japanese (polite です/ます register; お子さま for "your child"; AMI terms: 日常生活, 感覚, 算数, 言語, 文化)',
  ko: 'Korean (formal 합쇼체/해요체 register; 자녀분 for "your child"; AMI terms: 일상생활, 감각, 수학, 언어, 문화)',
  uk: 'Ukrainian (formal ви register, AMI terms: Практичне Життя, Сенсорний, Математика, Мова, Культура)',
  ru: 'Russian (formal вы register, AMI terms: Практическая Жизнь, Сенсорика, Математика, Язык, Культура)',
};

async function readFile(p) { return fs.readFile(p, 'utf-8'); }

/** Parse all `'key': '...'` entries — flat structure, single-line per key.
 *  Captures multi-line entries that use template-literal ${...} continuations
 *  by reading until the next `,` at indent level 2.
 *  We only need keys + values for *simple* entries; the missing-key set we
 *  generate is also flat.
 */
function parseFlatTranslations(source) {
  const lines = source.split('\n');
  const entries = []; // { key, value, lineIndex }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match the key token on a translation line. Handles single, double, or
    // backtick-quoted keys. Value is extracted separately by extractValues().
    const m = line.match(/^\s*['"`]([a-zA-Z][\w.]*)['"`]\s*:/);
    if (m) entries.push({ key: m[1], lineIndex: i, raw: line });
  }
  return entries;
}

// Extract the EN value for each key, handling single/double/backtick quotes
// and basic backslash-escapes. Multi-line values are NOT supported (none in
// the codebase as of audit).
function extractValues(source) {
  const map = new Map();
  for (const line of source.split('\n')) {
    // Try each quote style for the value side.
    for (const q of ["'", '"', '`']) {
      const re = new RegExp(`^\\s*['"\`]([a-zA-Z][\\w.]*)['"\`]\\s*:\\s*${q}((?:[^${q}\\\\]|\\\\.)*?)${q}\\s*,?\\s*$`);
      const m = line.match(re);
      if (m) {
        // Unescape the captured value.
        const unescaped = m[2]
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\r/g, '\r')
          .replace(/\\'/g, "'")
          .replace(/\\"/g, '"')
          .replace(/\\`/g, '`')
          .replace(/\\\\/g, '\\');
        map.set(m[1], unescaped);
        break;
      }
    }
  }
  return map;
}

function escapeForSingleQuote(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** Translate a batch using Haiku tool_use (guaranteed valid JSON). */
async function translateBatch(targetLang, langDescription, batch) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  // Build a tool whose properties are exactly the batch keys.
  const properties = {};
  for (const b of batch) {
    properties[b.key] = {
      type: 'string',
      description: `Translation of "${b.en.slice(0, 80)}"`,
    };
  }
  const tool = {
    name: 'submit_translations',
    description: `Submit translations for the batch into ${langDescription}.`,
    input_schema: {
      type: 'object',
      properties,
      required: batch.map(b => b.key),
    },
  };

  const system = `You are a professional UI translator for a Montessori classroom management app called Montree. Translate UI strings into ${langDescription}.

CRITICAL rules:
- Preserve placeholders exactly: {childName}, {count}, {date}, etc.
- Preserve HTML tags exactly: <strong>, <br/>, etc.
- Keep the same approximate length (UI buttons / labels).
- Do NOT translate "Montree" — it is the product name.
- Do NOT translate "Guru" — it is a feature name (refers to the AI advisor).
- Use the AMI Montessori terminology specified.
- Return your translations by calling the submit_translations tool.`;

  const userMsg = `Translate these strings into ${langDescription}, then call submit_translations:\n\n` +
    batch.map(b => `${b.key}: ${b.en}`).join('\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      model: HAIKU,
      max_tokens: 8192,
      system,
      tools: [tool],
      tool_choice: { type: 'tool', name: 'submit_translations' },
      messages: [{ role: 'user', content: userMsg }],
    }),
  });
  if (!res.ok) throw new Error(`Haiku API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const toolUse = (data.content || []).find(c => c.type === 'tool_use');
  if (!toolUse) throw new Error(`No tool_use in response: ${JSON.stringify(data).slice(0, 300)}`);
  const parsed = toolUse.input;
  const out = new Map();
  for (const b of batch) {
    if (typeof parsed[b.key] === 'string' && parsed[b.key].trim().length > 0) {
      out.set(b.key, parsed[b.key]);
    } else {
      console.warn(`  ⚠ Missing translation for key "${b.key}" — will use English fallback`);
    }
  }
  return out;
}

async function processLanguage(lang, enEntries, enValues) {
  const file = path.join(I18N_DIR, `${lang}.ts`);
  const source = await readFile(file);
  const langEntries = parseFlatTranslations(source);
  const haveKeys = new Set(langEntries.map(e => e.key));
  const enKeys = enEntries.map(e => e.key);
  const missing = enKeys.filter(k => !haveKeys.has(k));

  console.log(`[${lang}] ${langEntries.length} keys present, ${missing.length} missing`);
  if (missing.length === 0) return { lang, added: 0 };

  // Batch translate
  const langDescription = LANG_NAMES[lang] || lang;
  const allTranslations = new Map();
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batchKeys = missing.slice(i, i + BATCH_SIZE);
    const batch = batchKeys.map(k => ({ key: k, en: enValues.get(k) }));
    process.stdout.write(`  [${lang}] batch ${Math.floor(i/BATCH_SIZE)+1}/${Math.ceil(missing.length/BATCH_SIZE)}... `);
    let attempt = 0;
    while (attempt < 3) {
      try {
        const result = await translateBatch(lang, langDescription, batch);
        for (const [k, v] of result) allTranslations.set(k, v);
        process.stdout.write(`✓ ${result.size}/${batch.length}\n`);
        break;
      } catch (e) {
        attempt++;
        process.stdout.write(`\n    ⚠ attempt ${attempt} failed: ${e.message}\n`);
        if (attempt >= 3) throw e;
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
    await new Promise(r => setTimeout(r, 400));
  }

  // Build the lines to insert (just before the closing `};`)
  const newLines = [];
  newLines.push('');
  newLines.push('  // ─── Auto-filled missing keys (from Apr 30 audit) ───');
  for (const k of missing) {
    const value = allTranslations.get(k) ?? enValues.get(k);
    newLines.push(`  '${k}': '${escapeForSingleQuote(value)}',`);
  }

  // Find the closing `};` or `} as const;` — must be the LAST occurrence at indent 0.
  const lines = source.split('\n');
  let closingIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (
      /^\}\s*;?\s*$/.test(trimmed) ||
      trimmed === '};' ||
      /^\}\s+as\s+const\s*;?\s*$/.test(trimmed)
    ) {
      closingIdx = i; break;
    }
  }
  if (closingIdx === -1) throw new Error(`Could not find closing }; in ${lang}.ts`);

  const newSource = [
    ...lines.slice(0, closingIdx),
    ...newLines,
    ...lines.slice(closingIdx),
  ].join('\n');

  await fs.writeFile(file, newSource, 'utf-8');
  console.log(`[${lang}] Wrote ${missing.length} new keys to ${lang}.ts`);
  return { lang, added: missing.length };
}

async function main() {
  // Build EN reference
  const enSource = await readFile(path.join(I18N_DIR, 'en.ts'));
  const enEntries = parseFlatTranslations(enSource);
  const enValues = extractValues(enSource);
  console.log(`EN reference: ${enEntries.length} parsed entries, ${enValues.size} with extracted values`);
  // Sanity: warn about any keys we found but couldn't extract a value for
  const missingValues = enEntries.filter(e => !enValues.has(e.key));
  if (missingValues.length > 0) {
    console.warn(`  ⚠ ${missingValues.length} keys had no extractable value (skipping):`);
    for (const e of missingValues.slice(0, 5)) console.warn(`     line ${e.lineIndex+1}: ${e.raw.slice(0, 100)}`);
  }

  const requested = process.argv.slice(2);
  const langs = requested.length > 0 ? requested : ['es','de','fr','pt','nl','it','ja','ko','uk','ru'];

  const results = [];
  for (const lang of langs) {
    try {
      const r = await processLanguage(lang, enEntries, enValues);
      results.push(r);
    } catch (e) {
      console.error(`[${lang}] FAILED: ${e.message}`);
      results.push({ lang, added: 0, error: e.message });
    }
  }
  console.log('\n=== SUMMARY ===');
  for (const r of results) {
    console.log(`  ${r.lang}: +${r.added} keys${r.error ? ` (FAILED: ${r.error})` : ''}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
