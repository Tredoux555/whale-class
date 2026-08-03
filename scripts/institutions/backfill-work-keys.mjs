#!/usr/bin/env node
/**
 * backfill-work-keys.mjs — fill the stamps migration 311 added but never populated.
 *
 * montree_child_progress gained classroom_id / school_id / work_key in migration 311,
 * nullable, with existing rows left untouched. Every institutional rollup joins on
 * those columns: a row with a NULL work_key cannot be placed on the master spine
 * (migration 314), and a row with a NULL school_id is invisible to a school-level
 * query. This script fills them for the historical backlog. Everything written from
 * now on is stamped at write time by lib/montree/progress/write-progress.ts.
 *
 * WHAT IT FILLS (only where the column is currently NULL — never overwrites):
 *   classroom_id  ← montree_children.classroom_id
 *   school_id     ← montree_classrooms.school_id (via the child's classroom)
 *   area          ← the matched work's area
 *   work_key      ← 3 passes, most-trusted first:
 *                   1. EXACT   — the child's own classroom curriculum, by name
 *                   2. ALIAS   — the static catalog (lib/montree/stem/*.json), by
 *                                canonical name or alias
 *                   3. FUZZY   — Jaro-Winkler ≥ 0.90 against the classroom works,
 *                                then the catalog. 0.90 is the same "confident"
 *                                threshold lib/montree/paper-scan/work-matcher.ts
 *                                uses on scanned sheets.
 *
 * NORMALISATION + JARO-WINKLER ARE INLINE COPIES of normalizeWorkName / jaroWinkler
 * from lib/montree/paper-scan/work-matcher.ts. DECISION: a .mjs cannot import a .ts
 * without a build step or a loader hook, and adding either for a one-off founder
 * script is worse than 40 lines of duplication. The copies are byte-faithful — if you
 * change the matcher, change them here too. (The containment heuristic and the
 * same-area tiebreak are deliberately NOT copied: this script has no area hint to
 * lean on and containment at scale produces confident-looking wrong matches.)
 *
 * Usage (run on the Mac from the repo root, reads .env.local):
 *   node scripts/institutions/backfill-work-keys.mjs           # DRY RUN (default)
 *   node scripts/institutions/backfill-work-keys.mjs --apply   # actually write
 *
 * Dry run prints the summary table and writes every unmatched row to
 * scripts/institutions/backfill-unmatched.csv for eyeballing. --apply writes in
 * batches of 500 and prints the same summary.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const BATCH_SIZE = 500;
const PAGE_SIZE = 1000;
const FUZZY_THRESHOLD = 0.9;

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const UNMATCHED_CSV = path.join(SCRIPT_DIR, 'backfill-unmatched.csv');

// ── env ───────────────────────────────────────────────────────────────────
function loadEnv() {
  const p = path.join(REPO_ROOT, '.env.local');
  const txt = fs.readFileSync(p, 'utf8');
  const env = {};
  for (const line of txt.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[t.slice(0, i).trim()] = v;
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ── matcher (inline copies — see header) ──────────────────────────────────

/** Strip accents, punctuation and case so "Pink-Tower!" and "pink tower" compare equal. */
function normalizeWorkName(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function jaro(a, b) {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;

  const window = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aFlags = new Array(a.length).fill(false);
  const bFlags = new Array(b.length).fill(false);
  let matches = 0;

  for (let i = 0; i < a.length; i++) {
    const lo = Math.max(0, i - window);
    const hi = Math.min(i + window + 1, b.length);
    for (let j = lo; j < hi; j++) {
      if (bFlags[j] || a[i] !== b[j]) continue;
      aFlags[i] = true; bFlags[j] = true; matches++;
      break;
    }
  }
  if (!matches) return 0;

  let k = 0, transpositions = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aFlags[i]) continue;
    while (!bFlags[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  transpositions /= 2;

  return (matches / a.length + matches / b.length + (matches - transpositions) / matches) / 3;
}

function jaroWinkler(a, b) {
  const j = jaro(a, b);
  if (j < 0.7) return j;
  let prefix = 0;
  while (prefix < 4 && prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
  return j + prefix * 0.1 * (1 - j);
}

// ── static catalog (same files + sequence rules as curriculum-loader.ts) ──
const STEM_FILES = [
  ['practical_life', 'practical-life.json'],
  ['sensorial', 'sensorial.json'],
  ['mathematics', 'math.json'],
  ['language', 'language.json'],
  ['cultural', 'cultural.json'],
];

function loadCatalog() {
  const works = [];
  for (const [areaKey, file] of STEM_FILES) {
    const data = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'lib', 'montree', 'stem', file), 'utf8'));
    for (const category of data.categories || []) {
      for (const w of category.works || []) {
        works.push({
          work_key: w.id,
          name: w.name,
          area_key: areaKey,
          norms: [w.name, ...(w.aliases || [])].map(normalizeWorkName).filter(Boolean),
        });
      }
    }
  }
  return works;
}

const CATALOG = loadCatalog();

// name/alias → ALL catalog works answering to it. Names are NOT unique across areas —
// "Bells" is se_bells AND cu_bells, "Clock"/"Calendar" are mathematics AND cultural.
// First-registered-wins would file a cultural row under sensorial forever.
const CATALOG_BY_NORM = new Map();
for (const w of CATALOG) {
  for (const n of w.norms) {
    const list = CATALOG_BY_NORM.get(n);
    if (!list) CATALOG_BY_NORM.set(n, [w]);
    else if (!list.some((e) => e.work_key === w.work_key)) list.push(w);
  }
}

/**
 * Resolve a normalised name against the catalog, disambiguated by area.
 * Returns null rather than guessing when the name spans areas and `area` can't settle it —
 * an unmatched row goes in the CSV for a human; a wrongly-keyed row is invisible forever.
 */
function catalogLookup(norm, area) {
  const hits = CATALOG_BY_NORM.get(norm);
  if (!hits || hits.length === 0) return null;
  if (hits.length === 1) return hits[0];
  if (!area) return null;
  const sameArea = hits.filter((h) => h.area_key === area);
  return sameArea.length === 1 ? sameArea[0] : null;
}

// ── paged reads (Supabase caps a single select at 1000 rows) ──────────────
async function readAll(table, select, applyFilters) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    // .order('id') — without a stable sort, PostgREST paging can repeat or skip rows
    // between requests, which on a 50k-row table silently loses part of the backfill.
    let q = supabase.from(table).select(select).order('id').range(from, from + PAGE_SIZE - 1);
    if (applyFilters) q = applyFilters(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

async function main() {
  console.log(`\nMontree — backfill child-progress stamps  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);

  // 1. The rows that need anything at all.
  const rows = await readAll(
    'montree_child_progress',
    'id, child_id, work_name, area, work_key, classroom_id, school_id',
    (q) => q.or('work_key.is.null,classroom_id.is.null,school_id.is.null,area.is.null'),
  );
  console.log(`  candidate rows (any stamp NULL): ${rows.length}`);
  if (rows.length === 0) {
    console.log('\n  Nothing to do.\n');
    return;
  }

  // 2. child → classroom → school
  const children = await readAll('montree_children', 'id, classroom_id');
  const classroomByChild = new Map(children.map((c) => [c.id, c.classroom_id || null]));

  const classrooms = await readAll('montree_classrooms', 'id, school_id');
  const schoolByClassroom = new Map(classrooms.map((c) => [c.id, c.school_id || null]));

  // 3. Every classroom's curriculum, indexed per classroom by normalised name.
  const curriculum = await readAll(
    'montree_classroom_curriculum_works',
    'classroom_id, work_key, name, area_id',
  );
  const areas = await readAll('montree_classroom_curriculum_areas', 'id, area_key');
  const areaKeyById = new Map(areas.map((a) => [a.id, a.area_key]));

  const byClassroom = new Map();
  for (const w of curriculum) {
    if (!w.classroom_id || !w.work_key || !w.name) continue;
    let entry = byClassroom.get(w.classroom_id);
    if (!entry) { entry = { byNorm: new Map(), list: [] }; byClassroom.set(w.classroom_id, entry); }
    const item = { work_key: w.work_key, name: w.name, norm: normalizeWorkName(w.name), area_key: areaKeyById.get(w.area_id) || null };
    if (!item.norm) continue;
    // A list, not a single entry: a classroom copy inherits the catalog's cross-area
    // name collisions (Bells, Clock, Calendar), so the same rule applies here.
    const bucket = entry.byNorm.get(item.norm);
    if (!bucket) entry.byNorm.set(item.norm, [item]);
    else if (!bucket.some((b) => b.work_key === item.work_key)) bucket.push(item);
    entry.list.push(item);
  }

  // 4. Match.
  const stats = { total: rows.length, exact: 0, alias: 0, fuzzy: 0, unmatched: 0, already: 0, stampsOnly: 0 };
  const updates = [];
  const unmatched = [];

  for (const row of rows) {
    const classroomId = row.classroom_id || classroomByChild.get(row.child_id) || null;
    const schoolId = row.school_id || (classroomId ? schoolByClassroom.get(classroomId) || null : null);

    const patch = {};
    if (!row.classroom_id && classroomId) patch.classroom_id = classroomId;
    if (!row.school_id && schoolId) patch.school_id = schoolId;

    // NEVER touch a row that already has a work_key — it is either correct or a
    // teacher-custom key this script has no business second-guessing.
    if (row.work_key) {
      stats.already++;
      if (Object.keys(patch).length > 0) { updates.push({ id: row.id, patch }); stats.stampsOnly++; }
      continue;
    }

    const norm = normalizeWorkName(row.work_name);
    let match = null;
    let via = null;

    const classroomWorks = classroomId ? byClassroom.get(classroomId) : null;

    // Pass 1 — exact, in the child's own classroom curriculum, area-disambiguated.
    if (norm && classroomWorks) {
      const hits = classroomWorks.byNorm.get(norm);
      if (hits && hits.length === 1) { match = hits[0]; via = 'exact'; }
      else if (hits && hits.length > 1 && row.area) {
        const sameArea = hits.filter((h) => h.area_key === row.area);
        if (sameArea.length === 1) { match = sameArea[0]; via = 'exact'; }
      }
    }

    // Pass 2 — the static catalog, canonical name or alias, area-disambiguated.
    if (!match && norm) {
      const hit = catalogLookup(norm, row.area || null);
      if (hit) { match = hit; via = 'alias'; }
    }

    // Pass 3 — Jaro-Winkler ≥ 0.90, classroom first, then the catalog.
    if (!match && norm) {
      let best = null;
      if (classroomWorks) {
        let topScore = -1;
        let tied = [];
        for (const item of classroomWorks.list) {
          const score = jaroWinkler(norm, item.norm);
          if (score > topScore) { topScore = score; tied = [item]; }
          else if (score === topScore && !tied.some((t) => t.work_key === item.work_key)) tied.push(item);
        }
        if (topScore >= FUZZY_THRESHOLD) {
          let pick = tied.length === 1 ? tied[0] : null;
          if (!pick && row.area) {
            const sameArea = tied.filter((t) => t.area_key === row.area);
            if (sameArea.length === 1) pick = sameArea[0];
          }
          if (pick) best = { item: pick, score: topScore };
        }
      }
      if (!best || best.score < FUZZY_THRESHOLD) {
        // Score every catalog name/alias, keeping ALL works tied at the top so a
        // cross-area name collision can be detected rather than silently resolved.
        let topScore = -1;
        let tied = [];
        for (const w of CATALOG) {
          for (const n of w.norms) {
            const score = jaroWinkler(norm, n);
            if (score > topScore) { topScore = score; tied = [w]; }
            else if (score === topScore && !tied.some((t) => t.work_key === w.work_key)) tied.push(w);
          }
        }
        if (topScore >= FUZZY_THRESHOLD && (!best || topScore > best.score)) {
          let pick = tied.length === 1 ? tied[0] : null;
          if (!pick && row.area) {
            const sameArea = tied.filter((t) => t.area_key === row.area);
            if (sameArea.length === 1) pick = sameArea[0];
          }
          // Ambiguous across areas with no area hint → leave it unmatched, never guess.
          best = pick ? { item: pick, score: topScore } : best;
        }
      }
      if (best && best.score >= FUZZY_THRESHOLD) { match = best.item; via = 'fuzzy'; }
    }

    if (match) {
      stats[via]++;
      patch.work_key = match.work_key;
      if (!row.area && match.area_key) patch.area = match.area_key;
      updates.push({ id: row.id, patch });
    } else {
      stats.unmatched++;
      unmatched.push(row);
      if (Object.keys(patch).length > 0) { updates.push({ id: row.id, patch }); stats.stampsOnly++; }
    }
  }

  // 5. Report.
  const line = (label, n) => console.log(`    ${label.padEnd(34)} ${String(n).padStart(7)}`);
  console.log('\n  ── summary ─────────────────────────────────────────');
  line('candidate rows', stats.total);
  line('already had work_key (untouched)', stats.already);
  line('matched — exact (classroom)', stats.exact);
  line('matched — alias/name (catalog)', stats.alias);
  line(`matched — fuzzy (jaroWinkler >= ${FUZZY_THRESHOLD})`, stats.fuzzy);
  line('UNMATCHED (no work_key written)', stats.unmatched);
  line('rows to update', updates.length);
  line('  …of which stamps only', stats.stampsOnly);
  console.log('  ────────────────────────────────────────────────────\n');

  // 6. Unmatched CSV — always written, so a dry run leaves something to read.
  const csv = ['id,child_id,work_name,area,classroom_id,school_id'];
  for (const r of unmatched) {
    csv.push([r.id, r.child_id, r.work_name, r.area, r.classroom_id, r.school_id].map(csvCell).join(','));
  }
  fs.writeFileSync(UNMATCHED_CSV, csv.join('\n') + '\n', 'utf8');
  console.log(`  unmatched rows written to ${path.relative(REPO_ROOT, UNMATCHED_CSV)} (${unmatched.length})`);

  if (!APPLY) {
    console.log('\n  DRY RUN — nothing written. Re-run with --apply to commit.\n');
    return;
  }

  // 7. Write. Per-row updates (each row gets a different patch), batched so a
  //    stall never leaves an unbounded number of requests in flight.
  let written = 0;
  let failed = 0;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(({ id, patch }) =>
        supabase.from('montree_child_progress').update(patch).eq('id', id)
          .then(({ error }) => (error ? { id, error: error.message } : null)),
      ),
    );
    for (const r of results) {
      if (r) { failed++; console.error(`    update failed ${r.id}: ${r.error}`); }
      else written++;
    }
    console.log(`    batch ${Math.floor(i / BATCH_SIZE) + 1}: ${Math.min(i + BATCH_SIZE, updates.length)}/${updates.length}`);
  }

  console.log(`\n  APPLIED — ${written} rows updated, ${failed} failed.\n`);
}

main().catch((err) => {
  console.error('\nbackfill-work-keys failed:', err);
  process.exit(1);
});
