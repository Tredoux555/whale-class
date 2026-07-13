// scripts/curriculum/seed-english-program.mjs
//
// Seed the 58-week English Program as REAL curriculum works for every classroom
// in a school — the same "ride the existing rails" pattern as the Dark Phonics
// pack (scripts/seed-phonics.ts + lib/montree/phonics/sync-phonics-works.ts).
//
// Each authored week (lib/montree/english-curriculum/spec/week-NN.json) becomes
// one row in montree_classroom_curriculum_works under a NEW `english` curriculum
// area, tagged source='english_program'. Progress then flows through the ordinary
// works machinery (photo tagging, montree_child_progress by work_name, class
// progress, the works list) with zero special-casing — no new tables, no parallel
// tracker.
//
// 🚨 RUN MANUALLY, PER SCHOOL, AFTER:
//     1. migration 293 has run (defines the `english_program` feature flag), AND
//     2. a principal / super-admin has enabled `english_program` for the school.
//   This is NOT auto-run on classroom creation in v1 (deliberate — an off school
//   should carry no english rows).
//
// Usage:
//   node scripts/curriculum/seed-english-program.mjs --school <schoolId>            (apply)
//   node scripts/curriculum/seed-english-program.mjs --school <schoolId> --dry-run  (report only)
//   node scripts/curriculum/seed-english-program.mjs --dry-run                      (build rows from specs, no DB)
//
// Idempotent: only inserts work_keys not already present; reactivates any hidden
// english rows; never deletes (child progress is keyed by work_name and must
// survive an off/on cycle untouched).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SPEC_DIR = path.join(REPO_ROOT, 'lib', 'montree', 'english-curriculum', 'spec');

const AREA_KEY = 'english';
const AREA_NAME = 'English Program';
const AREA_NAME_ZH = '英语课程';
const AREA_ICON = '🔤';
const AREA_COLOR = '#E8C96A'; // gold — distinct from the 5 core-area colours
const AREA_SEQUENCE = 6;      // sorts after the 5 canonical areas (1–5)
const SOURCE = 'english_program';
const SEQUENCE_BASE = 20000;  // sits after normal works AND the phonics pack (10000-band)
const WHALE_SCHOOL_ID = 'c6280fae-567c-45ed-ad4d-934eae79aabc';

function loadEnv() {
  try {
    for (const line of fs.readFileSync(path.join(REPO_ROOT, '.env.local'), 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) {
        let v = m[2].trim();
        if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
        if (!process.env[m[1]]) process.env[m[1]] = v;
      }
    }
  } catch { /* .env.local optional for --dry-run without DB */ }
}

/** Read every authored week-NN.json (1..58). Missing files are skipped (not yet authored). */
function loadWeekSpecs() {
  const specs = [];
  for (let n = 1; n <= 58; n++) {
    const nn = String(n).padStart(2, '0');
    const file = path.join(SPEC_DIR, `week-${nn}.json`);
    if (!fs.existsSync(file)) continue;
    try {
      specs.push({ week: n, ...JSON.parse(fs.readFileSync(file, 'utf8')) });
    } catch (e) {
      console.error(`  ⚠ week-${nn}.json is unreadable — skipped: ${e.message}`);
    }
  }
  return specs;
}

/** Build the exact curriculum-work row payload for one week spec (DB-agnostic). */
function buildWorkRow(spec) {
  const nn = String(spec.week).padStart(2, '0');
  const bookTitle = spec.book?.title || spec.anchorWord || `Week ${nn}`;
  const letter = spec.letterDisplay || spec.patternDisplay || spec.sound || spec.anchorWord || '';
  const name = `Week ${nn} — /${letter}/ · ${bookTitle}`;

  const songTitles = (spec.songs || []).map((s) => s.title).filter(Boolean).join(' · ');
  const studioLink = `/montree/library/curriculum-studio?week=${spec.week}`;
  const descLines = [
    `Sound /${spec.sound ?? ''}/ · anchor "${spec.anchorWord ?? ''}".`,
    songTitles ? `Songs: ${songTitles}.` : '',
    `🎶 Curriculum Studio: ${studioLink}`,
  ].filter(Boolean);
  const description = descLines.join(' ').slice(0, 500);

  const parentDescription =
    `This week your child explores the /${spec.sound ?? ''}/ sound through the story ` +
    `“${bookTitle}”, a song, and hands-on materials — week ${spec.week} of the 58-week English Program.`;

  return {
    week: spec.week,
    work_key: `english_week_${nn}`,
    name,
    sequence: SEQUENCE_BASE + spec.week,
    description,
    parent_description: parentDescription.slice(0, 1000),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const DRY = args.includes('--dry-run');
  const schoolIdx = args.indexOf('--school');
  const schoolId = schoolIdx >= 0 ? args[schoolIdx + 1] : (DRY ? null : WHALE_SCHOOL_ID);

  const specs = loadWeekSpecs();
  const rows = specs.map(buildWorkRow);
  console.log(`Loaded ${specs.length} authored week spec(s) → ${rows.length} work row(s).`);

  if (rows.length === 0) {
    console.error('No week specs found — nothing to seed.');
    process.exit(1);
  }

  // ── No-DB dry run: just show what would be seeded and exit clean. ──
  if (DRY && !schoolId) {
    console.log('\n(dry run, no --school → building rows from specs only, no DB touched)\n');
    for (const r of rows) {
      console.log(`  W${String(r.week).padStart(2, '0')}  seq ${r.sequence}  ${r.work_key}`);
      console.log(`        name: ${r.name}`);
      console.log(`        desc: ${r.description}`);
    }
    console.log(`\n✅ ${rows.length} rows built cleanly from the specs.`);
    process.exit(0);
  }

  if (!schoolId) {
    console.error('Missing --school <schoolId>. Pass a school id, or use --dry-run alone to validate specs.');
    process.exit(1);
  }

  loadEnv();
  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — cannot reach the DB.');
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: classrooms, error: cErr } = await supabase
    .from('montree_classrooms')
    .select('id, name')
    .eq('school_id', schoolId);
  if (cErr) { console.error('classroom lookup failed:', cErr.message); process.exit(1); }
  console.log(`School ${schoolId}: ${classrooms?.length || 0} classroom(s)`);

  let totalInserted = 0, totalReactivated = 0, areasEnsured = 0;

  for (const c of classrooms || []) {
    // (a) Ensure the `english` curriculum area exists for this classroom.
    let areaId = null;
    const { data: existingArea } = await supabase
      .from('montree_classroom_curriculum_areas')
      .select('id')
      .eq('classroom_id', c.id)
      .eq('area_key', AREA_KEY)
      .maybeSingle();
    areaId = existingArea?.id || null;

    if (!areaId) {
      if (DRY) {
        console.log(`  • ${c.name || c.id}: english area MISSING (would create), works to insert: ${rows.length}`);
        continue; // can't resolve area_id without writing; report and move on
      }
      const { data: area, error: aErr } = await supabase
        .from('montree_classroom_curriculum_areas')
        .upsert({
          classroom_id: c.id,
          area_key: AREA_KEY,
          name: AREA_NAME,
          name_chinese: AREA_NAME_ZH,
          icon: AREA_ICON,
          color: AREA_COLOR,
          description: 'The 58-week English phonics program — a song, a book and a printable pack per week.',
          sequence: AREA_SEQUENCE,
          is_active: true,
        }, { onConflict: 'classroom_id,area_key' })
        .select('id')
        .maybeSingle();
      if (aErr) { console.error(`  area upsert (${c.id}) failed:`, aErr.message); process.exit(1); }
      areaId = area?.id || null;
      areasEnsured++;
    }
    if (!areaId) { console.error(`  could not resolve english area for classroom ${c.id}`); continue; }

    // Which english work_keys already exist (idempotency).
    const { data: existing, error: eErr } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('work_key, is_active')
      .eq('classroom_id', c.id)
      .eq('source', SOURCE);
    if (eErr) { console.error(`  existing lookup (${c.id}) failed:`, eErr.message); process.exit(1); }
    const have = new Set((existing || []).map((r) => r.work_key));
    const hidden = (existing || []).filter((r) => !r.is_active).length;

    const toInsert = rows.filter((r) => !have.has(r.work_key));
    console.log(`  • ${c.name || c.id}: english works present=${existing?.length || 0} (hidden=${hidden}), to insert=${toInsert.length}`);

    if (DRY) continue;

    // Reactivate any previously-hidden english rows.
    if (hidden) {
      const { data: react } = await supabase
        .from('montree_classroom_curriculum_works')
        .update({ is_active: true })
        .eq('classroom_id', c.id)
        .eq('source', SOURCE)
        .eq('is_active', false)
        .select('id');
      totalReactivated += react?.length || 0;
    }

    if (toInsert.length) {
      const payload = toInsert.map((r) => ({
        classroom_id: c.id,
        name: r.name,
        work_key: r.work_key,
        area_id: areaId,
        sequence: r.sequence,
        description: r.description,
        parent_description: r.parent_description,
        is_custom: false,
        is_active: true,
        source: SOURCE,
      }));
      const { data: ins, error: iErr } = await supabase
        .from('montree_classroom_curriculum_works')
        .insert(payload)
        .select('id');
      if (iErr) { console.error(`  insert (${c.id}) failed:`, iErr.message); process.exit(1); }
      totalInserted += ins?.length || 0;
    }
  }

  if (DRY) {
    console.log('\n(dry run — re-run without --dry-run to apply)');
  } else {
    console.log(`\nAPPLIED → areas ensured=${areasEnsured}, works inserted=${totalInserted}, reactivated=${totalReactivated}`);
    const { data: verify } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('classroom_id')
      .eq('source', SOURCE)
      .eq('is_active', true);
    const byRoom = {};
    for (const v of verify || []) byRoom[v.classroom_id] = (byRoom[v.classroom_id] || 0) + 1;
    console.log('Active english works per classroom:', byRoom);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
