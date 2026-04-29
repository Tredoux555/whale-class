#!/usr/bin/env node
// scripts/add-language.mjs
//
// Scaffold a new language for Montree. Updates every infrastructure file so the
// only remaining work is filling in the actual translations + DB columns.
//
// Usage:
//   node scripts/add-language.mjs <code> <native-name> <short-label> <intl-locale>
//
// Example:
//   node scripts/add-language.mjs sv "Svenska" "SV" "sv-SE"
//
// What this does:
//   1. Adds <code> to SUPPORTED_LOCALES in lib/montree/i18n/locales.ts
//   2. Adds entries to LOCALE_TO_INTL, LOCALE_DISPLAY_NAMES, LOCALE_SHORT_LABELS
//   3. Adds an AREA_LABELS_<UPPER> stub in lib/montree/i18n/area-labels.ts
//   4. Adds a LOCALE_AI_CONFIG stub in lib/montree/i18n/locale-config.ts
//   5. Creates lib/montree/i18n/<code>.ts as a copy of en.ts (English placeholder
//      until real translations are dropped in)
//   6. Wires the new locale into context.tsx and server.ts
//
// What this does NOT do (manual follow-up):
//   - Translate the strings in <code>.ts (run a translation pass)
//   - Add `name_<code>` / `parent_description_<code>` / `why_it_matters_<code>` /
//     `guide_content_<code>` columns to montree_classroom_curriculum_works in the DB
//     (the column suffix mapping is auto-derived, but the columns must exist)
//   - Translate area labels (the AREA_LABELS_<UPPER> entries are stubbed in English)
//   - Translate AI config strings (aiLanguageInstruction etc. are stubbed)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ---------- Args ----------
const [, , code, nativeName, shortLabel, intlLocale] = process.argv;
if (!code || !nativeName || !shortLabel || !intlLocale) {
  console.error('Usage: node scripts/add-language.mjs <code> <native-name> <short-label> <intl-locale>');
  console.error('Example: node scripts/add-language.mjs sv "Svenska" "SV" "sv-SE"');
  process.exit(1);
}
if (!/^[a-z]{2}$/.test(code)) {
  console.error(`✖ Locale code "${code}" should be 2 lowercase letters (e.g. "sv")`);
  process.exit(1);
}
const upper = code.toUpperCase();

console.log(`\nScaffolding language: ${nativeName} (${code})\n`);

function read(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}
function write(rel, contents) {
  writeFileSync(join(ROOT, rel), contents);
}
function patch(rel, transform) {
  const src = read(rel);
  const next = transform(src);
  if (src === next) {
    console.log(`  ⚠  ${rel}: no changes (already wired or pattern not found)`);
    return false;
  }
  write(rel, next);
  console.log(`  ✓  ${rel}`);
  return true;
}

// ---------- 1. lib/montree/i18n/locales.ts ----------
patch('lib/montree/i18n/locales.ts', (src) => {
  if (src.includes(`'${code}'`)) return src; // already there
  let next = src.replace(
    /(SUPPORTED_LOCALES\s*=\s*\[)([^\]]+)(\])/,
    (_, open, body, close) => `${open}${body.trimEnd()}, '${code}'${close}`
  );
  next = next.replace(
    /(LOCALE_TO_INTL[^{]*\{[\s\S]*?ru:\s*['"][^'"]+['"],?)/,
    (m) => `${m}\n  ${code}: '${intlLocale}',`
  );
  next = next.replace(
    /(LOCALE_DISPLAY_NAMES[^{]*\{[\s\S]*?ru:\s*['"][^'"]+['"],?)/,
    (m) => `${m}\n  ${code}: '${nativeName}',`
  );
  next = next.replace(
    /(LOCALE_SHORT_LABELS[^{]*\{[\s\S]*?ru:\s*['"][^'"]+['"],?)/,
    (m) => `${m}\n  ${code}: '${shortLabel}',`
  );
  return next;
});

// ---------- 2. lib/montree/i18n/area-labels.ts ----------
patch('lib/montree/i18n/area-labels.ts', (src) => {
  if (src.includes(`AREA_LABELS_${upper}`)) return src;
  const stub = `\nexport const AREA_LABELS_${upper}: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  cultural: 'Cultural',
};\n`;
  let next = src + stub;
  next = next.replace(
    /(AREA_LABELS\s*:\s*Record<[^>]+>\s*=\s*\{[\s\S]*?ru:\s*AREA_LABELS_RU,?)/,
    (m) => `${m}\n  ${code}: AREA_LABELS_${upper},`
  );
  return next;
});

// ---------- 3. lib/montree/i18n/locale-config.ts ----------
patch('lib/montree/i18n/locale-config.ts', (src) => {
  if (new RegExp(`^\\s*${code}\\s*:\\s*\\{`, 'm').test(src)) return src;
  const stub = `  ${code}: {
    languageName: '${nativeName} (TODO: add English label)',
    aiLanguageInstruction:
      '\\n\\nLANGUAGE REQUIREMENT: You MUST respond ENTIRELY in ${nativeName}. ' +
      'Every word of your response must be in ${nativeName}. Do not use any English except for ' +
      'proper nouns (like Montessori work names). ' +
      'TODO: add formal register guidance, "your child" phrasing, AMI Montessori terminology.',
    aiShortDirective: 'in ${nativeName}',
    yourChild: 'TODO',
    dateFormatHint: 'TODO',
  },\n`;
  return src.replace(
    /(export const LOCALE_AI_CONFIG[\s\S]*?ru:\s*\{[\s\S]*?\},)\s*\n\};/,
    (_m, before) => `${before}\n${stub}};`
  );
});

// ---------- 4. lib/montree/i18n/<code>.ts (translation file) ----------
const targetTranslation = `lib/montree/i18n/${code}.ts`;
if (existsSync(join(ROOT, targetTranslation))) {
  console.log(`  ⚠  ${targetTranslation}: already exists, skipping`);
} else {
  const enSrc = read('lib/montree/i18n/en.ts');
  const stub = `// Auto-scaffolded by scripts/add-language.mjs.
// TODO: replace these English strings with ${nativeName} translations.
// Run a Haiku translation script (see scripts/generate-fr.mjs as reference).

${enSrc.replace(/export const en\s*=/, `export const ${code} =`)}\n`;
  write(targetTranslation, stub);
  console.log(`  ✓  ${targetTranslation} (English placeholder — translate before shipping)`);
}

// ---------- 5. lib/montree/i18n/context.tsx ----------
patch('lib/montree/i18n/context.tsx', (src) => {
  if (src.includes(`from './${code}'`)) return src;
  let next = src.replace(
    /(import\s*\{\s*ru\s*\}\s*from\s*['"]\.\/ru['"];)/,
    (m) => `${m}\nimport { ${code} } from './${code}';`
  );
  next = next.replace(
    /(messages[^=]*=\s*\{[^}]*ru)\s*\}/,
    (_m, before) => `${before}, ${code} }`
  );
  return next;
});

// ---------- 6. lib/montree/i18n/server.ts ----------
patch('lib/montree/i18n/server.ts', (src) => {
  if (src.includes(`from './${code}'`)) return src;
  let next = src.replace(
    /(import\s*\{\s*ru\s*\}\s*from\s*['"]\.\/ru['"];)/,
    (m) => `${m}\nimport { ${code} } from './${code}';`
  );
  next = next.replace(
    /(LOCALE_TO_MESSAGES[^=]*=\s*\{[^}]*ru)\s*\}/,
    (_m, before) => `${before}, ${code} }`
  );
  return next;
});

// ---------- Done ----------
console.log(`\n✓ Scaffolding for "${code}" complete.\n`);
console.log('Next steps:');
console.log(`  1. Translate lib/montree/i18n/${code}.ts (currently English placeholder)`);
console.log(`  2. Translate AREA_LABELS_${upper} in lib/montree/i18n/area-labels.ts`);
console.log(`  3. Fill in LOCALE_AI_CONFIG.${code} TODOs in lib/montree/i18n/locale-config.ts`);
console.log(`  4. Run DB migration to add columns:`);
console.log(`       ALTER TABLE montree_classroom_curriculum_works`);
console.log(`         ADD COLUMN IF NOT EXISTS name_${code} TEXT,`);
console.log(`         ADD COLUMN IF NOT EXISTS parent_description_${code} TEXT,`);
console.log(`         ADD COLUMN IF NOT EXISTS why_it_matters_${code} TEXT,`);
console.log(`         ADD COLUMN IF NOT EXISTS guide_content_${code} JSONB;`);
console.log(`  5. Run translation script for curriculum work names + guides`);
console.log(`  6. Verify: node scripts/check-i18n-completeness.mjs\n`);
