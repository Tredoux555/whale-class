#!/usr/bin/env node
// weekly-admin-engine-i18n.mjs — inserts the four weeklyAdmin.* engine /
// area-mode toggle keys (Phase 7a + 7b, PLAN_ALL_AREAS_REPORTS_AUG22.md §8)
// into all 12 Montree locale files, directly after 'weeklyAdmin.autoFillFailed'.
// Idempotent: skips a file that already has the keys.
// Run: node scripts/weekly-admin-engine-i18n.mjs
//
// Model names (Haiku / Sonnet) are proper nouns and stay untranslated — they
// are the teacher's cost/latency signal, exactly as the English reads.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const I18N_DIR = resolve(HERE, '..', 'lib', 'montree', 'i18n');

const KEYS = ['engineLegacy', 'engineAggregator', 'areasLanguageOnly', 'areasAll'];

const T = {
  en: ['Language + Haiku', 'All areas (Sonnet)', 'Language only', 'All areas'],
  zh: ['语言 + Haiku', '全部领域（Sonnet）', '仅语言', '全部领域'],
  es: ['Lenguaje + Haiku', 'Todas las áreas (Sonnet)', 'Solo Lenguaje', 'Todas las áreas'],
  de: ['Sprache + Haiku', 'Alle Bereiche (Sonnet)', 'Nur Sprache', 'Alle Bereiche'],
  fr: ['Langage + Haiku', 'Tous les domaines (Sonnet)', 'Langage uniquement', 'Tous les domaines'],
  pt: ['Linguagem + Haiku', 'Todas as áreas (Sonnet)', 'Apenas Linguagem', 'Todas as áreas'],
  nl: ['Taal + Haiku', 'Alle gebieden (Sonnet)', 'Alleen Taal', 'Alle gebieden'],
  it: ['Linguaggio + Haiku', 'Tutte le aree (Sonnet)', 'Solo Linguaggio', 'Tutte le aree'],
  ja: ['言語 + Haiku', '全領域（Sonnet）', '言語のみ', '全領域'],
  ko: ['언어 + Haiku', '전체 영역 (Sonnet)', '언어만', '전체 영역'],
  uk: ['Мова + Haiku', 'Усі сфери (Sonnet)', 'Лише мова', 'Усі сфери'],
  ru: ['Язык + Haiku', 'Все области (Sonnet)', 'Только язык', 'Все области'],
};

const q = (s) => `'${s.replace(/'/g, "\\'")}'`;
let changed = 0;
for (const [loc, vals] of Object.entries(T)) {
  if (vals.length !== KEYS.length) throw new Error(`${loc}: ${vals.length} values for ${KEYS.length} keys`);
  const file = resolve(I18N_DIR, `${loc}.ts`);
  let src = readFileSync(file, 'utf8');
  if (src.includes("'weeklyAdmin.engineLegacy'")) { console.log(`${loc}: already present`); continue; }
  const anchor = /^  'weeklyAdmin\.autoFillFailed': .*\n/m;
  if (!anchor.test(src)) throw new Error(`${loc}: no weeklyAdmin.autoFillFailed anchor`);
  const block = [
    '',
    '  // ── All-areas engine / area-mode toggles (Phase 7a+7b) ────────────────',
    ...KEYS.map((k, i) => `  'weeklyAdmin.${k}': ${q(vals[i])},`),
  ].join('\n') + '\n';
  src = src.replace(anchor, (m) => m + block);
  writeFileSync(file, src);
  changed++;
  console.log(`${loc}: inserted ${KEYS.length} keys`);
}
console.log(`done — ${changed} files changed`);
