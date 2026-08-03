#!/usr/bin/env node
/**
 * generate-master-seed.mjs — emit the montree_master_works seed SQL.
 *
 * The static catalog in lib/montree/stem/*.json is the curriculum spine: 329 works,
 * each with a STABLE work_key slug (`pl_carrying_mat`), a canonical English name, a
 * Chinese name, aliases and a global sequence. montree_master_works (migration 314)
 * is that spine materialised in Postgres so institutional rollups can compare a child
 * in Taipei with a child in Madrid on the same AMI-ordered axis.
 *
 * This is a ONE-OFF GENERATOR, not runtime code. It prints INSERT statements on
 * stdout; the output is pasted into migrations/314_institutional_foundations.sql.
 * Re-run it whenever the stem JSONs change, then re-paste — the ON CONFLICT DO UPDATE
 * clause means re-running the migration refreshes the spine in place.
 *
 * It deliberately RE-IMPLEMENTS the small slice of lib/montree/curriculum-loader.ts it
 * needs (area order, the area*10000 + category*100 + work sequence formula, the guide
 * fallback for age_range) because that loader is TypeScript with JSON module imports
 * and cannot be imported from a .mjs. The formula is copied verbatim — if the loader's
 * sequence formula ever changes, change it here too.
 *
 * Usage (repo root):
 *   node scripts/institutions/generate-master-seed.mjs            # SQL → stdout
 *   node scripts/institutions/generate-master-seed.mjs --count    # just the row count
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
// Script lives at <repoRoot>/scripts/institutions/ — repo root is two levels up.
// Deliberately NOT process.cwd(): the operator may run this from anywhere.
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');

const STEM_DIR = path.join(REPO_ROOT, 'lib', 'montree', 'stem');
const GUIDES_DIR = path.join(REPO_ROOT, 'lib', 'curriculum', 'comprehensive-guides');

// Mirrors the AREAS table in lib/montree/curriculum-loader.ts — order is the area sequence.
const AREAS = [
  { key: 'practical_life', stem: 'practical-life.json', guides: 'practical-life-guides.json', sequence: 1 },
  { key: 'sensorial',      stem: 'sensorial.json',      guides: 'sensorial-guides.json',      sequence: 2 },
  { key: 'mathematics',    stem: 'math.json',           guides: 'math-guides.json',           sequence: 3 },
  { key: 'language',       stem: 'language.json',       guides: 'language-guides.json',       sequence: 4 },
  { key: 'cultural',       stem: 'cultural.json',       guides: 'cultural-guides.json',       sequence: 5 },
];

const ROWS_PER_STATEMENT = 50;

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

/** Guide lookup by lowercased work name — same as curriculum-loader's buildGuideMap. */
function buildGuideMap(guidesData) {
  const map = new Map();
  const works = guidesData?.works || guidesData || [];
  for (const work of works) {
    if (work?.name) map.set(String(work.name).toLowerCase().trim(), work);
  }
  return map;
}

/** Postgres string literal. Doubles single quotes — covers apostrophes and Chinese text alike. */
function sql(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

/** Postgres jsonb literal from a JS array. */
function sqlJsonb(arr) {
  return `'${JSON.stringify(Array.isArray(arr) ? arr : []).replace(/'/g, "''")}'::jsonb`;
}

function loadWorks() {
  const works = [];

  for (const area of AREAS) {
    const areaData = readJson(path.join(STEM_DIR, area.stem));
    const guideMap = buildGuideMap(readJson(path.join(GUIDES_DIR, area.guides)));

    for (const category of areaData.categories || []) {
      const catSeq = category.sequence || 1;
      for (const work of category.works || []) {
        const workSeq = work.sequence || 1;
        const guide = guideMap.get(String(work.name).toLowerCase().trim()) || {};
        works.push({
          work_key: work.id,
          name: work.name,
          name_chinese: work.chineseName || null,
          area_key: area.key,
          category_name: category.name || null,
          // Global sequence: area * 10000 + category * 100 + work
          sequence: area.sequence * 10000 + catSeq * 100 + workSeq,
          age_range: work.ageRange || guide.age_range || '3-6',
          aliases: work.aliases || [],
        });
      }
    }
  }

  works.sort((a, b) => a.sequence - b.sequence);
  return works;
}

function main() {
  const works = loadWorks();

  // A duplicate work_key would silently collapse two works into one master row.
  const seen = new Set();
  for (const w of works) {
    if (seen.has(w.work_key)) {
      console.error(`FATAL: duplicate work_key "${w.work_key}" in the static catalog`);
      process.exit(1);
    }
    seen.add(w.work_key);
  }

  if (process.argv.includes('--count')) {
    console.log(String(works.length));
    return;
  }

  const out = [];
  out.push(`-- ${works.length} works, generated by scripts/institutions/generate-master-seed.mjs`);
  out.push('-- DO NOT HAND-EDIT: re-run the generator and re-paste.');

  for (let i = 0; i < works.length; i += ROWS_PER_STATEMENT) {
    const chunk = works.slice(i, i + ROWS_PER_STATEMENT);
    out.push('');
    out.push('INSERT INTO montree_master_works');
    out.push('  (work_key, name, name_chinese, area_key, category_name, sequence, age_range, aliases)');
    out.push('VALUES');
    chunk.forEach((w, idx) => {
      const row = `  (${sql(w.work_key)}, ${sql(w.name)}, ${sql(w.name_chinese)}, ${sql(w.area_key)}, ${sql(w.category_name)}, ${w.sequence}, ${sql(w.age_range)}, ${sqlJsonb(w.aliases)})`;
      out.push(row + (idx === chunk.length - 1 ? '' : ','));
    });
    out.push('ON CONFLICT (work_key) DO UPDATE SET');
    out.push('  name          = EXCLUDED.name,');
    out.push('  name_chinese  = EXCLUDED.name_chinese,');
    out.push('  area_key      = EXCLUDED.area_key,');
    out.push('  category_name = EXCLUDED.category_name,');
    out.push('  sequence      = EXCLUDED.sequence,');
    out.push('  age_range     = EXCLUDED.age_range,');
    out.push('  aliases       = EXCLUDED.aliases,');
    out.push('  updated_at    = NOW();');
  }

  console.log(out.join('\n'));
  console.error(`-- emitted ${works.length} works in ${Math.ceil(works.length / ROWS_PER_STATEMENT)} INSERT statements`);
}

main();
