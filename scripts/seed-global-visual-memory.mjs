// scripts/seed-global-visual-memory.mjs
//
// Seeds montree_global_visual_memory (migration 281) — the read-only global
// baseline moat ("master brain" v1) that kills photo-ID cold starts.
//
// Sources & PRECEDENCE (Canonical Seed, Jul 3 2026 — the precedence FLIP):
//   1. CURATED (authoritative for standard works) — Opus-authored, spec-grounded
//      discriminative checklists in scripts/data/curated-visual-memory/*.json.
//      For any work_key present in the curated files, the curated
//      visual_description REPLACES Whale's (Whale's classroom-biased text carried
//      no discriminative "NOT its look-alike" signal, which was the whole
//      cold-start defect). Whale's own negative_descriptions for that key ARE
//      merged in AFTER the curated ones (dedupe by 60-char prefix). source='curated'.
//   2. WHALE SEED (fallback for NOT-YET-CURATED works) — Whale Class's
//      teacher-validated STANDARD-work entries (source IN teacher_setup/correction,
//      confidence >= 0.80, real standard work_key). Descriptions scrubbed (roster
//      names removed defensively, whitespace normalized, capped at a
//      fingerprint/sentence boundary). Photo URLs / media ids deliberately NOT
//      copied — provenance recorded via source_classroom_id only. source='whale_seed'.
//
// Curated data is VALIDATED before any write (scripts/validate-curated-visual-memory.mjs):
// unknown work_keys, over-long descriptions, name/area mismatch, roster-name
// hits, duplicate keys, and non-mutual negatives all HARD-FAIL the seed.
//
// Per-area curated confidence (drives Pass 2 prompt-packing order — higher
// confidence packs first, so 0.95 curated naturally outranks capped-0.95 Whale):
//   practical_life = 0.85 (PL works vary per classroom; authored around functional
//                          signature, not exact materials)
//   everything else = 0.95
//
// Idempotent: upserts ON CONFLICT (work_key). Re-run any time.
//
// Usage:
//   node scripts/seed-global-visual-memory.mjs            # validate + seed
//   node scripts/seed-global-visual-memory.mjs --dry-run  # validate + report only
//
// 🚨 v1 CONTRACT: this script is the ONLY writer of the global table.
// No runtime code path writes to it. See migration 281 header.

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateCuratedData } from './validate-curated-visual-memory.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '..');

const DRY_RUN = process.argv.includes('--dry-run');

const WHALE_CLASSROOM_ID = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69';

// Whale Class roster (defensive scrub — audit found zero hits, but the global
// pool must never carry a child's name under any circumstances).
const ROSTER = [
  'Amy', 'Austin', 'Eric', 'Gengerlyn', 'Hayden', 'Henry', 'Jimmy', 'Joey',
  'Kayla', 'Kevin', 'KK', 'Leo', 'Lucky', 'MaoMao', 'MingXi', 'NiuNiu',
  'Rachel', 'Segina', 'Stella', 'YueZe',
];
const ROSTER_RE = new RegExp(`\\b(${ROSTER.join('|')})(?:'s)?\\b`, 'gi');

const DESC_CAP = 900; // seed-side cap; the context loader caps again at prompt time
const FINGERPRINT_SEP = ' || ';

// Per-area confidence for curated rows (see header).
function confidenceForArea(area) {
  return area === 'practical_life' ? 0.85 : 0.95;
}

// ---------------------------------------------------------------------------
// Canonical work_key → { name, area } from the static curriculum JSONs
// (lib/curriculum/data/*.json — the source of truth every classroom is
// seeded from). Global entries MUST carry canonical names so Pass 2b
// candidate names resolve at matchScore 1.0 against the static curriculum.
// ---------------------------------------------------------------------------
function loadCanonicalMap() {
  const map = new Map();
  const files = ['practical-life', 'sensorial', 'math', 'language', 'cultural'];
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(path.join(REPO, 'lib', 'curriculum', 'data', `${f}.json`), 'utf8'));
    // math.json's top-level id is 'math' but the pipeline's canonical area key
    // is 'mathematics' (VALID_AREAS in two-pass.ts / montree_visual_memory.area).
    const areaKey = j.id === 'math' ? 'mathematics' : j.id;
    for (const cat of j.categories || []) {
      for (const w of cat.works || []) {
        map.set(w.id, { name: w.name, area: areaKey });
      }
    }
  }
  return map;
}

function scrub(text) {
  if (!text) return '';
  let t = String(text)
    .replace(ROSTER_RE, 'the child')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length > DESC_CAP) {
    // Prefer cutting at a fingerprint boundary, else the last sentence end.
    const sepIdx = t.lastIndexOf(FINGERPRINT_SEP, DESC_CAP);
    if (sepIdx > 200) {
      t = t.slice(0, sepIdx).trim();
    } else {
      const dotIdx = t.lastIndexOf('. ', DESC_CAP);
      t = dotIdx > 200 ? t.slice(0, dotIdx + 1).trim() : t.slice(0, DESC_CAP).trim();
    }
  }
  return t;
}

// Merge negatives with 60-char-prefix dedupe (mirrors appendNegativeExample).
// `existing` is kept first — curated negatives lead, Whale negatives append.
function mergeNegatives(existing, additions) {
  const out = Array.isArray(existing) ? existing.filter((n) => typeof n === 'string') : [];
  for (const add of additions) {
    if (typeof add !== 'string' || !add) continue;
    const prefix = add.slice(0, 60).toLowerCase();
    if (!out.some((n) => n.slice(0, 60).toLowerCase() === prefix)) out.push(add);
  }
  return out.slice(0, 50);
}

// ---------------------------------------------------------------------------

async function main() {
  const canonical = loadCanonicalMap();
  console.log(`Canonical curriculum map: ${canonical.size} standard works`);

  // ---- 0. Validate curated data — refuse to seed on any failure ----
  const v = validateCuratedData();
  if (v.warnings.length) v.warnings.forEach((w) => console.warn('⚠', w));
  if (!v.ok) {
    console.error(`\n❌ Curated validation FAILED (${v.errors.length}). Refusing to seed:`);
    v.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log(`Curated data validated: ${v.entries.length} entries`);

  // Build curated map (canonical name/area, scrubbed text, per-area confidence).
  const curatedByKey = new Map();
  for (const e of v.entries) {
    const canon = canonical.get(e.work_key); // validator guaranteed this exists
    curatedByKey.set(e.work_key, {
      work_name: canon.name,
      area: canon.area,
      visual_description: scrub(e.visual_description),
      key_materials: Array.isArray(e.key_materials) ? e.key_materials.slice(0, 20) : null,
      negative_descriptions: (e.negative_descriptions || []).map((n) => scrub(n)).filter(Boolean),
      confidence: confidenceForArea(canon.area),
    });
  }

  const client = new Client({
    host: 'aws-1-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.dmfncjjtsoxrnvcdnvjq',
    password: process.env.SUPABASE_DB_PASSWORD || readDbPasswordFromEnvLocal(),
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  // ---- 1. Whale extraction ----
  const { rows: whaleRows } = await client.query(
    `SELECT work_key, work_name, area, visual_description, key_materials,
            negative_descriptions, description_confidence
     FROM montree_visual_memory
     WHERE classroom_id = $1
       AND is_custom = false
       AND source IN ('teacher_setup', 'correction')
       AND description_confidence >= 0.80
       AND work_key IS NOT NULL
       AND work_key NOT LIKE 'custom_%'`,
    [WHALE_CLASSROOM_ID],
  );
  console.log(`Whale seed candidates: ${whaleRows.length}`);

  // Whale map (work_key → scrubbed fields) — used for non-curated keys AND for
  // merging Whale's negatives onto curated keys.
  const whaleByKey = new Map();
  let skippedNonCanonical = 0;
  let skippedThin = 0;
  for (const r of whaleRows) {
    const canon = canonical.get(r.work_key);
    if (!canon) {
      // work_key not in the static curriculum (renamed/retired key) — a
      // global entry nothing can look up is dead weight; skip.
      skippedNonCanonical++;
      continue;
    }
    const desc = scrub(r.visual_description);
    if (!desc || desc.length < 40) { skippedThin++; continue; } // too thin to be useful
    whaleByKey.set(r.work_key, {
      work_name: canon.name, // canonical name, NOT Whale's local name
      area: canon.area,
      visual_description: desc,
      key_materials: Array.isArray(r.key_materials) ? r.key_materials.slice(0, 20) : null,
      negative_descriptions: (r.negative_descriptions || []).map((n) => scrub(n)).filter(Boolean),
      confidence: Math.min(Number(r.description_confidence) || 0.85, 0.95),
    });
  }
  if (skippedNonCanonical > 0) console.log(`Skipped ${skippedNonCanonical} Whale rows with non-canonical work_keys`);
  if (skippedThin > 0) console.log(`Skipped ${skippedThin} Whale rows with too-thin descriptions`);

  // ---- 2. Assemble upserts — CURATED is authoritative (the precedence flip) ----
  const upserts = new Map(); // work_key → row

  // 2a. Curated keys: curated visual_description REPLACES Whale; Whale negatives
  //     merged in AFTER the curated negatives (curated discriminators lead).
  for (const [k, c] of curatedByKey) {
    const whale = whaleByKey.get(k);
    upserts.set(k, {
      work_key: k,
      work_name: c.work_name,
      area: c.area,
      visual_description: c.visual_description,
      key_materials: c.key_materials,
      negative_descriptions: mergeNegatives(c.negative_descriptions, whale?.negative_descriptions || []),
      source: 'curated',
      source_classroom_id: null,
      description_confidence: c.confidence,
    });
  }

  // 2b. Whale keys NOT curated: stand as-is (fallback).
  let whaleKept = 0;
  for (const [k, w] of whaleByKey) {
    if (upserts.has(k)) continue; // curated wins
    upserts.set(k, {
      work_key: k,
      work_name: w.work_name,
      area: w.area,
      visual_description: w.visual_description,
      key_materials: w.key_materials,
      negative_descriptions: w.negative_descriptions,
      source: 'whale_seed',
      source_classroom_id: WHALE_CLASSROOM_ID,
      description_confidence: w.confidence,
    });
    whaleKept++;
  }

  const curatedCount = curatedByKey.size;
  const whaleOverwritten = [...curatedByKey.keys()].filter((k) => whaleByKey.has(k)).length;
  console.log(`Curated rows: ${curatedCount} (${whaleOverwritten} overwrite a prior Whale entry)`);
  console.log(`Whale fallback rows: ${whaleKept}`);
  console.log(`Total upserts: ${upserts.size}`);

  if (DRY_RUN) {
    for (const [k, val] of upserts) {
      console.log(`- ${k} (${val.source}, conf ${val.description_confidence}, negs ${val.negative_descriptions?.length || 0}) "${val.work_name}"`);
    }
    await client.end();
    console.log('DRY RUN — nothing written.');
    return;
  }

  // ---- 3. Upsert (chunked multi-row batches — one-by-one round-trips over
  // the pooler take ~200ms each and time out shells) ----
  let written = 0;
  const rows = [...upserts.values()];
  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const params = [];
    const tuples = [];
    for (let j = 0; j < chunk.length; j++) {
      const r = chunk[j];
      const base = j * 9;
      tuples.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, TRUE, NOW())`);
      params.push(
        r.work_key, r.work_name, r.area, r.visual_description,
        r.key_materials, r.negative_descriptions, r.source,
        r.source_classroom_id, r.description_confidence,
      );
    }
    await client.query(
      `INSERT INTO montree_global_visual_memory
         (work_key, work_name, area, visual_description, key_materials,
          negative_descriptions, source, source_classroom_id,
          description_confidence, is_active, updated_at)
       VALUES ${tuples.join(', ')}
       ON CONFLICT (work_key) DO UPDATE SET
         work_name = EXCLUDED.work_name,
         area = EXCLUDED.area,
         visual_description = EXCLUDED.visual_description,
         key_materials = EXCLUDED.key_materials,
         negative_descriptions = EXCLUDED.negative_descriptions,
         source = EXCLUDED.source,
         source_classroom_id = EXCLUDED.source_classroom_id,
         description_confidence = EXCLUDED.description_confidence,
         updated_at = NOW()`,
      params,
    );
    written += chunk.length;
  }

  const { rows: [{ count }] } = await client.query(
    'SELECT count(*) FROM montree_global_visual_memory WHERE is_active',
  );
  const { rows: bySource } = await client.query(
    'SELECT source, count(*)::int FROM montree_global_visual_memory GROUP BY source ORDER BY source',
  );
  console.log(`✅ Wrote ${written} rows. Active global entries: ${count}`);
  console.log(`   by source: ${JSON.stringify(bySource)}`);

  // Post-check: the confusion cluster that triggered this build
  const { rows: check } = await client.query(
    `SELECT work_key, work_name, source, description_confidence AS conf,
            array_length(negative_descriptions, 1) AS negs
     FROM montree_global_visual_memory
     WHERE work_key IN ('ma_spindle_box','se_cylinder_block_1','se_knobless_cylinders')`,
  );
  check.forEach((r) => console.log(`   check: ${r.work_key} → "${r.work_name}" (${r.source}, conf ${r.conf}, negs: ${r.negs})`));

  await client.end();
}

function readDbPasswordFromEnvLocal() {
  const env = fs.readFileSync(path.join(REPO, '.env.local'), 'utf8');
  const m = env.match(/DATABASE_URL=postgres:\/\/postgres:([^@]+)@/);
  if (!m) throw new Error('Could not read DB password from .env.local DATABASE_URL');
  return m[1];
}

main().catch((e) => {
  console.error('SEED FAILED:', e);
  process.exit(1);
});
