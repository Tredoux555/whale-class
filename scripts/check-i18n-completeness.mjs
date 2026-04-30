#!/usr/bin/env node
// scripts/check-i18n-completeness.mjs
//
// Verifies every locale in SUPPORTED_LOCALES has all required infrastructure:
//   1. A translation file at lib/montree/i18n/<locale>.ts
//   2. An entry in LOCALE_TO_INTL (date format mapping)
//   3. An entry in LOCALE_DISPLAY_NAMES
//   4. An entry in LOCALE_SHORT_LABELS
//   5. An entry in LOCALE_AI_CONFIG
//   6. An AREA_LABELS_<UPPER> export in area-labels.ts
//   7. The locale wired into context.tsx and server.ts
//
// Run: node scripts/check-i18n-completeness.mjs
// Exit code: 0 = all good; 1 = missing pieces (so CI can gate on this).

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const I18N_DIR = join(ROOT, 'lib', 'montree', 'i18n');

function read(rel) {
  const p = join(ROOT, rel);
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
}

const localesSrc = read('lib/montree/i18n/locales.ts') || '';
const match = localesSrc.match(/SUPPORTED_LOCALES\s*=\s*\[([^\]]+)\]/);
if (!match) {
  console.error('✖ Could not parse SUPPORTED_LOCALES in lib/montree/i18n/locales.ts');
  process.exit(1);
}
const locales = match[1]
  .split(',')
  .map((s) => s.trim().replace(/['"]/g, ''))
  .filter(Boolean);

console.log(`Checking ${locales.length} locales: ${locales.join(', ')}\n`);

const errors = [];
const checks = {};

// ---------- Per-locale checks ----------
for (const locale of locales) {
  const status = {};

  // 1. Translation file
  const translationPath = join(I18N_DIR, `${locale}.ts`);
  status.translationFile = existsSync(translationPath);
  if (!status.translationFile) {
    errors.push(`${locale}: missing translation file lib/montree/i18n/${locale}.ts`);
  }

  // 2. LOCALE_TO_INTL
  status.intlMapping = new RegExp(`\\b${locale}\\s*:\\s*['"]`, 'm').test(
    localesSrc.split('LOCALE_TO_INTL')[1]?.split('}')[0] || ''
  );
  if (!status.intlMapping) errors.push(`${locale}: missing LOCALE_TO_INTL entry`);

  // 3. LOCALE_DISPLAY_NAMES
  status.displayName = new RegExp(`\\b${locale}\\s*:\\s*['"]`, 'm').test(
    localesSrc.split('LOCALE_DISPLAY_NAMES')[1]?.split('};')[0] || ''
  );
  if (!status.displayName) errors.push(`${locale}: missing LOCALE_DISPLAY_NAMES entry`);

  // 4. LOCALE_SHORT_LABELS
  status.shortLabel = new RegExp(`\\b${locale}\\s*:\\s*['"]`, 'm').test(
    localesSrc.split('LOCALE_SHORT_LABELS')[1]?.split('};')[0] || ''
  );
  if (!status.shortLabel) errors.push(`${locale}: missing LOCALE_SHORT_LABELS entry`);

  // 5. LOCALE_AI_CONFIG
  const aiConfigSrc = read('lib/montree/i18n/locale-config.ts') || '';
  status.aiConfig = new RegExp(`\\b${locale}\\s*:\\s*\\{`, 'm').test(aiConfigSrc);
  if (!status.aiConfig) errors.push(`${locale}: missing LOCALE_AI_CONFIG entry`);

  // 6. AREA_LABELS_<UPPER>
  const areaLabelsSrc = read('lib/montree/i18n/area-labels.ts') || '';
  status.areaLabels = new RegExp(
    `AREA_LABELS_${locale.toUpperCase()}\\s*:`,
    'm'
  ).test(areaLabelsSrc) ||
    new RegExp(`AREA_LABELS_${locale.toUpperCase()}\\s*=`, 'm').test(areaLabelsSrc);
  if (!status.areaLabels) {
    errors.push(`${locale}: missing AREA_LABELS_${locale.toUpperCase()} export in area-labels.ts`);
  }

  // 7. Wired into context.tsx + server.ts
  const contextSrc = read('lib/montree/i18n/context.tsx') || '';
  const serverSrc = read('lib/montree/i18n/server.ts') || '';
  status.contextWired =
    new RegExp(`from\\s+['"]\\.\\/${locale}['"]`).test(contextSrc) ||
    new RegExp(`\\b${locale}\\b`).test(contextSrc);
  status.serverWired =
    new RegExp(`from\\s+['"]\\.\\/${locale}['"]`).test(serverSrc) ||
    new RegExp(`\\b${locale}\\b`).test(serverSrc);
  if (!status.contextWired) errors.push(`${locale}: not wired into lib/montree/i18n/context.tsx`);
  if (!status.serverWired) errors.push(`${locale}: not wired into lib/montree/i18n/server.ts`);

  checks[locale] = status;
}

// ---------- Translation key parity (en is the reference) ----------
//
// The default mode warns at <85% and fails at <50%. Pass --strict to require
// 100% key-set parity (used by the pre-commit hook so new keys added to
// en.ts can never ship without translations).

const STRICT = process.argv.includes('--strict');

function extractKeys(src) {
  if (!src) return new Set();
  const cleaned = src
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const out = new Set();
  for (const line of cleaned.split('\n')) {
    const m = line.match(/^\s*['"`]([a-zA-Z][\w.-]*)['"`]\s*:/);
    if (m) out.add(m[1]);
  }
  return out;
}

const enSrc = read('lib/montree/i18n/en.ts') || '';
const enKeys = extractKeys(enSrc);
const enKeyCount = enKeys.size;

console.log(`English reference: ${enKeyCount} translation keys${STRICT ? ' (strict mode)' : ''}\n`);

for (const locale of locales) {
  if (locale === 'en') continue;
  if (!checks[locale]?.translationFile) continue;
  const src = read(`lib/montree/i18n/${locale}.ts`);
  const localeKeys = extractKeys(src);
  const missing = [...enKeys].filter((k) => !localeKeys.has(k));
  const count = localeKeys.size;
  const ratio = enKeyCount === 0 ? 1 : count / enKeyCount;
  const flag = missing.length > 0 ? '⚠ ' : '  ';
  console.log(
    `${flag}${locale}: ${count} keys (${(ratio * 100).toFixed(0)}% of en)` +
      (missing.length > 0 ? `, ${missing.length} missing` : '')
  );
  if (STRICT) {
    if (missing.length > 0) {
      errors.push(
        `${locale}: ${missing.length} keys in en.ts not yet translated (first 3: ${missing.slice(0, 3).join(', ')})`
      );
    }
  } else if (ratio < 0.5) {
    errors.push(
      `${locale}: only ${(ratio * 100).toFixed(0)}% of en keys — translation file looks incomplete`
    );
  }
}

console.log('');

// ---------- Summary ----------
if (errors.length === 0) {
  console.log(`✓ All ${locales.length} locales pass completeness checks.`);
  process.exit(0);
}

console.error(`\n✖ Found ${errors.length} issue(s):\n`);
for (const e of errors) console.error(`  - ${e}`);
console.error('\nFix these before shipping the new language.');
process.exit(1);
