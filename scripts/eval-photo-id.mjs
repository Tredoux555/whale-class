// scripts/eval-photo-id.mjs
//
// REAL photo-ID eval harness — replays teacher-CONFIRMED photos through the
// REAL two-pass pipeline in COLD mode (empty classroom VM + full global VM) and
// scores accuracy against ground truth (the teacher-confirmed work_id). Built so
// we NEVER guess coverage again — run it before AND after any seed or pipeline
// change.
//
// Ground truth: montree_media rows with teacher_confirmed=true AND a work_id
// pointing at a STANDARD (non-custom) classroom curriculum work. The work_key is
// the label. Custom works are excluded (they're school-private, not what the
// global-VM cold-start fix targets).
//
// Metrics reported:
//   - top-1 accuracy   (pipeline's resolved work == ground truth)
//   - top-3-chip acc.  (ground truth is the resolved work OR one of the audit
//                        UI's quick-tap chips = identification.topCandidates)
//   - Gate A auto-file precision (of the photos the pipeline WOULD auto-file in
//     cold mode — Path 2: is_curriculum_work && matchScore>=1.0 && conf>=0.90 —
//     what fraction are correct). The number that matters for trust: a wrong
//     auto-file is the worst outcome.
//   - per-area confusion matrix + the worst work-level confusions.
//
// Retrieval (migration 282) activates automatically when OPENAI_API_KEY is in
// the env. Without it, the pipeline runs retrieval-DORMANT (fail-open) = the
// pre-Step-1 baseline. The header prints which mode ran.
//
// Usage:
//   node scripts/eval-photo-id.mjs                       # 80-photo stratified sample
//   node scripts/eval-photo-id.mjs --limit 120 --per-work 3
//   node scripts/eval-photo-id.mjs --sample /tmp/evalset.json   # reuse SAME photos
//   node scripts/eval-photo-id.mjs --label before               # tag the block
//   node scripts/eval-photo-id.mjs --dry                        # print sample only
//
// Permanent regression cases (ALWAYS included, prepended):
//   - Photo A 946613be (Number Rods — the Sunshine incident) expect /number rods/i
//   - Photo B e05b14da (Brown Stair control — inverse-regression guard) expect /brown stair/i

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { build } from 'esbuild';
import { createClient } from '@supabase/supabase-js';
import { Client as PgClient } from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '..');
const HARNESS_DIR = path.join(__dirname, '_harness');

function loadEnvLocal() {
  const env = fs.readFileSync(path.join(REPO, '.env.local'), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MEDIA_BUCKET = 'montree-media';
const COLD_CLASSROOM_ID = 'c01d0000-0000-4000-8000-000000000000';

// Permanent regression cases — never sampled out.
const REGRESSION_CASES = [
  { media_id: '946613be-1b85-47f5-8992-edc75acce227', work_key: 'ma_number_rods', work_name: 'Number Rods', area_key: 'mathematics', pin: 'REGRESSION: Number Rods (Sunshine incident)' },
  { media_id: 'e05b14da-1fce-4a03-88a0-f7c24e9eff30', work_key: 'se_brown_stair', work_name: 'Brown Stair (Broad Stair)', area_key: 'sensorial', pin: 'REGRESSION: Brown Stair (inverse guard)' },
];

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : def;
}
function flag(name) { return process.argv.includes(`--${name}`); }

function normName(s) {
  return String(s || '').toLowerCase().replace(/\s*\([^)]*\)\s*$/, '').replace(/\s+/g, ' ').trim();
}

function dbPassword() {
  return fs.readFileSync(path.join(REPO, '.env.local'), 'utf8')
    .match(/DATABASE_URL=postgres:\/\/postgres:([^@]+)@/)[1];
}

async function selectSample(limit, perWork) {
  const client = new PgClient({
    host: 'aws-1-ap-southeast-1.pooler.supabase.com', port: 5432,
    user: 'postgres.dmfncjjtsoxrnvcdnvjq', password: dbPassword(),
    database: 'postgres', ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const { rows } = await client.query(
    `WITH ranked AS (
       SELECT m.id AS media_id, m.storage_path, w.work_key, w.name AS work_name, a.area_key,
              row_number() OVER (PARTITION BY w.work_key ORDER BY random()) AS rn
       FROM montree_media m
       JOIN montree_classroom_curriculum_works w ON w.id::text = m.work_id
       JOIN montree_classroom_curriculum_areas a ON a.id = w.area_id
       WHERE m.teacher_confirmed = true AND m.work_id IS NOT NULL AND m.media_type = 'photo'
         AND COALESCE(w.is_custom, false) = false AND w.work_key NOT LIKE 'custom_%'
         AND m.storage_path IS NOT NULL
     )
     SELECT media_id, storage_path, work_key, work_name, area_key
     FROM ranked WHERE rn <= $1 ORDER BY random() LIMIT $2`,
    [perWork, limit],
  );
  await client.end();
  return rows;
}

async function resolveStoragePaths(supabase, photos) {
  // Regression cases arrive without storage_path — resolve them.
  const missing = photos.filter((p) => !p.storage_path);
  for (const p of missing) {
    const { data } = await supabase.from('montree_media').select('storage_path').eq('id', p.media_id).maybeSingle();
    p.storage_path = data?.storage_path || null;
  }
  return photos.filter((p) => p.storage_path);
}

async function bundlePipeline() {
  const outfile = path.join(HARNESS_DIR, 'pipeline.bundle.mjs');
  await build({
    entryPoints: [path.join(HARNESS_DIR, 'pipeline-entry.ts')],
    bundle: true, format: 'esm', platform: 'node', target: 'node20',
    outfile, packages: 'external', alias: { '@': REPO }, logLevel: 'error',
  });
  return outfile;
}

// Replicates the process route's cold-mode Gate A "would auto-file" decision.
// Cold classroom => hasVisualMemoryForMatch is always false => only Path 2 fires.
function wouldAutoFile(id) {
  if (!id) return false;
  return id.is_curriculum_work !== false && id.matchScore >= 1.0 && id.confidence >= 0.90;
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Missing ANTHROPIC_API_KEY');

  const LIMIT = parseInt(arg('limit', '80'), 10);
  const PER_WORK = parseInt(arg('per-work', '2'), 10);
  const LABEL = arg('label', '');
  const sampleFile = arg('sample', null);
  const retrievalActive = !!process.env.OPENAI_API_KEY;

  // Resolve the photo set: reuse a saved sample (for fair before/after) or select fresh.
  let sample;
  if (sampleFile && fs.existsSync(sampleFile)) {
    sample = JSON.parse(fs.readFileSync(sampleFile, 'utf8'));
    console.log(`Loaded ${sample.length} photos from ${sampleFile}`);
  } else {
    sample = await selectSample(LIMIT, PER_WORK);
    if (sampleFile) { fs.writeFileSync(sampleFile, JSON.stringify(sample, null, 2)); console.log(`Saved sample of ${sample.length} to ${sampleFile}`); }
  }

  // Prepend regression cases (deduped if already sampled).
  const sampleIds = new Set(sample.map((s) => s.media_id));
  const photos = [...REGRESSION_CASES.filter((r) => !sampleIds.has(r.media_id)), ...sample];

  if (flag('dry')) {
    const byArea = {};
    for (const p of photos) byArea[p.area_key] = (byArea[p.area_key] || 0) + 1;
    console.log(`Sample: ${photos.length} photos`);
    console.log('by area:', JSON.stringify(byArea));
    console.log('distinct works:', new Set(photos.map((p) => p.work_key)).size);
    return;
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const resolved = await resolveStoragePaths(supabase, photos);
  for (const p of resolved) {
    p.url = `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${p.storage_path}`;
  }

  const outfile = await bundlePipeline();
  const { loadIdentificationContext, runTwoPassIdentification, loadAllCurriculumWorks } = await import(outfile);

  const context = await loadIdentificationContext(supabase, { classroomId: COLD_CLASSROOM_ID, useV2: true });
  const curriculum = loadAllCurriculumWorks();
  const staticKeys = new Set(curriculum.map((w) => w.work_key));
  const staticNames = new Set(curriculum.map((w) => normName(w.name)));

  console.log('='.repeat(80));
  console.log(`PHOTO-ID EVAL${LABEL ? `  [${LABEL}]` : ''}  —  ${new Date().toISOString()}`);
  console.log(`retrieval: ${retrievalActive ? 'ACTIVE (OPENAI_API_KEY present)' : 'DORMANT (no OPENAI_API_KEY — pre-Step-1 baseline)'}`);
  console.log(`photos: ${resolved.length} | cold VM: ${context.visualMemoryWorkNames.size} | global entries: ${context.globalVisualMemoryEntries.length} | gvm injected: ${context.globalVisualMemoryInjectedCount}`);
  console.log('='.repeat(80));

  let top1 = 0, top3 = 0, evaluable = 0, unresolvable = 0;
  let autoFiled = 0, autoFiledCorrect = 0;
  const areaConfusion = {}; // `${truthArea}=>${predArea}` -> count (mismatches only)
  const workMisses = {};    // `${truthKey} -> ${predKey}` -> count
  const regressionResults = [];

  for (const p of resolved) {
    const truthKey = p.work_key;
    const truthName = normName(p.work_name);
    const truthInStatic = staticKeys.has(truthKey) || staticNames.has(truthName);

    let res;
    try {
      res = await runTwoPassIdentification({
        photoUrl: p.url, childName: 'the child', childAge: 4,
        classroomId: COLD_CLASSROOM_ID, curriculum, locale: 'en', context, supabase,
      });
    } catch (err) {
      console.log(`  ERROR media=${p.media_id}: ${err.message}`);
      continue;
    }
    const id = res.identification;
    const predKey = id?.workKey ?? null;
    const predName = normName(id?.workName ?? '');
    const chipKeys = new Set([predKey, ...(id?.topCandidates ?? []).map((c) => c.workKey)].filter(Boolean));
    const chipNames = new Set([predName, ...(id?.topCandidates ?? []).map((c) => normName(c.workName))].filter(Boolean));

    const isTop1 = (!!predKey && predKey === truthKey) || (predName && predName === truthName);
    const isTop3 = isTop1 || chipKeys.has(truthKey) || chipNames.has(truthName);
    const filed = wouldAutoFile(id);

    if (!truthInStatic) {
      unresolvable++;
    } else {
      evaluable++;
      if (isTop1) top1++;
      if (isTop3) top3++;
      if (!isTop1) {
        const ck = `${p.area_key} => ${id?.area ?? 'none'}`;
        areaConfusion[ck] = (areaConfusion[ck] || 0) + 1;
        const wk = `${truthKey} -> ${predKey ?? 'none'}`;
        workMisses[wk] = (workMisses[wk] || 0) + 1;
      }
    }
    if (filed) { autoFiled++; if (isTop1) autoFiledCorrect++; }

    const tag = p.pin ? `  [${p.pin}]` : '';
    const verdict = isTop1 ? 'T1' : isTop3 ? 't3' : 'MISS';
    const flags = `${filed ? 'AUTOFILE' : 'draft'}${res.pass2bFired ? ' 2b' : ''}${res.pass2bImproved ? '+' : ''}`;
    const line = `[${verdict}] ${p.area_key}/${truthKey} pred=${predKey ?? 'none'} conf=${id?.confidence ?? 'n/a'} ms=${id?.matchScore ?? 'n/a'} ${flags}${truthInStatic ? '' : ' (truth not in static)'}${tag}`;
    console.log('  ' + line);
    if (p.pin) regressionResults.push({ pin: p.pin, ok: isTop1, predKey });
  }

  const pct = (n, d) => d > 0 ? `${((n / d) * 100).toFixed(1)}%` : 'n/a';
  console.log('\n' + '='.repeat(80));
  console.log(`RESULTS${LABEL ? `  [${LABEL}]` : ''}  (retrieval ${retrievalActive ? 'ACTIVE' : 'DORMANT'})`);
  console.log(`  evaluable photos (truth in static curriculum): ${evaluable}  (unresolvable: ${unresolvable})`);
  console.log(`  top-1 accuracy:        ${top1}/${evaluable}  ${pct(top1, evaluable)}`);
  console.log(`  top-3-chip accuracy:   ${top3}/${evaluable}  ${pct(top3, evaluable)}`);
  console.log(`  Gate A auto-file:      ${autoFiled} photos would auto-file`);
  console.log(`  Gate A precision:      ${autoFiledCorrect}/${autoFiled}  ${pct(autoFiledCorrect, autoFiled)}  (wrong auto-files: ${autoFiled - autoFiledCorrect})`);
  console.log('\n  Regression cases:');
  for (const r of regressionResults) console.log(`    ${r.ok ? '✅' : '❌'} ${r.pin} -> pred=${r.predKey}`);
  const areaRows = Object.entries(areaConfusion).sort((a, b) => b[1] - a[1]);
  if (areaRows.length) {
    console.log('\n  Area confusion (truth => predicted, mismatches only):');
    for (const [k, n] of areaRows) console.log(`    ${n}x  ${k}`);
  }
  const missRows = Object.entries(workMisses).sort((a, b) => b[1] - a[1]).slice(0, 15);
  if (missRows.length) {
    console.log('\n  Top work-level misses (truth -> predicted):');
    for (const [k, n] of missRows) console.log(`    ${n}x  ${k}`);
  }
  console.log('='.repeat(80));
}

main().catch((e) => { console.error('EVAL FAILED:', e); process.exit(1); });
