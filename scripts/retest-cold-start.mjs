// scripts/retest-cold-start.mjs
//
// COLD-START RE-TEST HARNESS — the Phase 4 gate deliverable.
//
// Drives the REAL two-pass photo-identification pipeline (Pass 1 / Pass 2 /
// Pass 2b, live Haiku) against a photo in a synthetic COLD classroom context:
//   - empty classroom visual memory + empty corrections (classroomId that has
//     no rows — faithfully reproduces a brand-new school like Bright Stars)
//   - full GLOBAL visual memory as it currently stands in prod (montree_global_visual_memory)
//   - the standard 329-work runtime curriculum (loadAllCurriculumWorks)
//   - useV2:true (production default via photo_pipeline_v2 / migration 224)
//
// Prints per run: work name / confidence / matchScore / area / pass2bFired /
// pass2bImproved / gvmInjected / hasVM / hasGlobalVM. Model calls are live Haiku
// (~cents per run).
//
// Because the global table is what changes between the before-seed and
// after-seed states, run this BEFORE Phase 3's prod seed (captures the
// whale-primary before-state) and AGAIN after (curated after-state).
//
// Usage:
//   node scripts/retest-cold-start.mjs                 # default photo set, 3 runs each
//   node scripts/retest-cold-start.mjs --runs 3        # explicit run count
//   node scripts/retest-cold-start.mjs --media <id>    # single media id, N runs
//   node scripts/retest-cold-start.mjs --label before  # tag the output block

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { build } from 'esbuild';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url)); // scripts/
const REPO = path.join(__dirname, '..');
const HARNESS_DIR = path.join(__dirname, '_harness');

// ---- Load .env.local into process.env (ANTHROPIC + SUPABASE keys) BEFORE the
//      bundle is imported (the anthropic client reads the key at module load). ----
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

// Synthetic COLD classroom — no rows anywhere → empty classroom VM + corrections,
// while the global VM still loads (its query is is_active only). Mirrors the
// Bright Stars cold start (Bright Stars' real classroom also has 0 VM rows).
const COLD_CLASSROOM_ID = 'c01d0000-0000-4000-8000-000000000000';

// Default photo set: the Bright Stars failure + Whale distinctive controls.
const DEFAULT_PHOTOS = [
  { media_id: 'd7af53f8-7796-4e7e-bd64-a96544a44ae0', label: 'Bright Stars Cylinder Block (THE GATE)', expect: /cylinder block/i, childName: 'the child', childAge: 4 },
  { media_id: '61f0ae3d-f884-4bbc-b0d4-c194a97c9e41', label: 'Whale Pink Tower (control)', expect: /pink tower/i, childName: 'the child', childAge: 4 },
  { media_id: '45737fc5-2cb1-4cbd-a4e6-e8711f119c50', label: 'Whale Golden Beads (control)', expect: /golden bead/i, childName: 'the child', childAge: 4 },
];

// Distinctive single-work confirmed Whale photos — clean regression/health
// controls for the curated confusion clusters (each is a work I curated + its
// confusion partner). Select with `--set distinctive`.
const DISTINCTIVE_CONTROLS = [
  { media_id: 'fe21e2dc-743c-49dd-8ea4-be1f0faffeac', label: 'Number Rods (vs Red Rods)', expect: /number rods/i, childName: 'the child', childAge: 4 },
  { media_id: '2feb4ed4-7915-43f6-83e4-927780b39a96', label: 'Metal Insets (vs Geometric Cabinet)', expect: /metal inset/i, childName: 'the child', childAge: 4 },
  { media_id: 'bd3ce7de-b25c-4dca-839a-8edf5461b5d3', label: 'Sandpaper Letters (vs Numerals/Moveable Alphabet)', expect: /sandpaper letter/i, childName: 'the child', childAge: 4 },
  { media_id: '3173f397-9104-4862-977e-0458b3b2baeb', label: 'Knobless Cylinders (vs Cylinder Blocks)', expect: /knobless/i, childName: 'the child', childAge: 4 },
  { media_id: '57d88ac7-919f-46b0-afbd-e4c63438de11', label: 'Binomial Cube (vs Trinomial)', expect: /binomial/i, childName: 'the child', childAge: 4 },
  { media_id: '70f74bb9-2132-40bd-bccb-52930ea765fe', label: 'Moveable Alphabet (vs Sandpaper Letters)', expect: /moveable alphabet/i, childName: 'the child', childAge: 4 },
];

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

async function bundlePipeline() {
  const outfile = path.join(HARNESS_DIR, 'pipeline.bundle.mjs');
  await build({
    entryPoints: [path.join(HARNESS_DIR, 'pipeline-entry.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    outfile,
    packages: 'external', // npm deps resolved at runtime from node_modules
    alias: { '@': REPO },
    logLevel: 'error',
  });
  return outfile;
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Missing ANTHROPIC_API_KEY in .env.local');

  const RUNS = parseInt(arg('runs', '3'), 10);
  const LABEL = arg('label', '');
  const singleMedia = arg('media', null);

  const outfile = await bundlePipeline();
  const { loadIdentificationContext, runTwoPassIdentification, loadAllCurriculumWorks } = await import(outfile);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // Resolve photo set.
  const set = arg('set', 'default');
  let basePhotos = set === 'distinctive' ? DISTINCTIVE_CONTROLS : DEFAULT_PHOTOS;
  let photos = basePhotos;
  if (singleMedia) photos = [{ media_id: singleMedia, label: `media ${singleMedia}`, expect: null, childName: 'the child', childAge: 4 }];
  const filter = arg('filter', null); // substring of the label — keeps the expect regex
  if (filter) photos = basePhotos.filter((p) => p.label.toLowerCase().includes(filter.toLowerCase()));
  if (photos.length === 0) throw new Error(`no photos match --filter "${filter}"`);

  // Resolve storage paths → public URLs.
  for (const p of photos) {
    const { data, error } = await supabase.from('montree_media').select('storage_path').eq('id', p.media_id).maybeSingle();
    if (error || !data) throw new Error(`media ${p.media_id} not found: ${error?.message || 'no row'}`);
    p.url = `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${data.storage_path}`;
  }

  // Load the COLD context once (empty classroom VM + full global VM, useV2 like prod).
  const context = await loadIdentificationContext(supabase, { classroomId: COLD_CLASSROOM_ID, useV2: true });
  const curriculum = loadAllCurriculumWorks();

  console.log('='.repeat(78));
  console.log(`COLD-START HARNESS${LABEL ? `  [${LABEL}]` : ''}  —  ${new Date().toISOString()}`);
  console.log(`cold classroom VM entries: ${context.visualMemoryWorkNames.size} | global VM injected into Pass 2 prompt: ${context.globalVisualMemoryInjectedCount} | global entries total: ${context.globalVisualMemoryEntries.length} | curriculum works: ${curriculum.length}`);
  console.log('='.repeat(78));

  const summary = [];
  for (const p of photos) {
    console.log(`\n### ${p.label}`);
    console.log(`    ${p.url}`);
    const results = [];
    for (let r = 0; r < RUNS; r++) {
      const res = await runTwoPassIdentification({
        photoUrl: p.url,
        childName: p.childName,
        childAge: p.childAge,
        classroomId: COLD_CLASSROOM_ID,
        curriculum,
        locale: 'en',
        context,
      });
      const id = res.identification;
      const line = {
        run: r + 1,
        work: id?.workName ?? '(none)',
        haikuRaw: id?.haikuWorkName ?? '(none)',
        conf: id?.confidence ?? null,
        matchScore: id?.matchScore ?? null,
        area: id?.area ?? null,
        pass2bFired: res.pass2bFired,
        pass2bImproved: res.pass2bImproved,
        gvmInjected: context.globalVisualMemoryInjectedCount,
        hasVM: res.hasVisualMemoryForMatch,
        hasGVM: res.hasGlobalVisualMemoryForMatch,
        ok: p.expect ? p.expect.test(id?.workName ?? '') : null,
      };
      results.push(line);
      console.log(`  run ${line.run}: work="${line.work}" (haikuRaw="${line.haikuRaw}") conf=${line.conf} matchScore=${line.matchScore} area=${line.area} pass2bFired=${line.pass2bFired} pass2bImproved=${line.pass2bImproved} gvmInjected=${line.gvmInjected}${p.expect ? ` -> ${line.ok ? 'PASS' : 'FAIL'}` : ''}`);
    }
    if (p.expect) {
      const passes = results.filter((x) => x.ok).length;
      const verdict = passes >= Math.ceil(RUNS / 2) ? '✅ PASS' : '❌ FAIL';
      console.log(`  => ${passes}/${RUNS} runs matched /${p.expect.source}/  ${verdict}`);
      summary.push({ label: p.label, passes, runs: RUNS, verdict });
    } else {
      summary.push({ label: p.label, distinct: [...new Set(results.map((x) => x.work))] });
    }
  }

  console.log('\n' + '='.repeat(78));
  console.log(`SUMMARY${LABEL ? `  [${LABEL}]` : ''}`);
  for (const s of summary) {
    if (s.verdict) console.log(`  ${s.verdict}  ${s.label}  (${s.passes}/${s.runs})`);
    else console.log(`  ${s.label}: ${s.distinct.join(' | ')}`);
  }
  console.log('='.repeat(78));
}

main().catch((e) => { console.error('HARNESS FAILED:', e); process.exit(1); });
