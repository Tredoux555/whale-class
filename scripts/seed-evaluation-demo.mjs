#!/usr/bin/env node
/**
 * scripts/seed-evaluation-demo.mjs — a demo school for Montree Milestones.
 *
 * Creates (or refreshes) one school, two classrooms and eighteen children with realistic
 * ages, switches the `child_evaluation` feature on for that school, and writes two full
 * check-in windows — Autumn and Winter — of completed sittings, with plausible band
 * spreads, some milestones genuinely unassessed, a handful of teacher-decided bands, and
 * real growth between the two windows.
 *
 * ── The one rule this script obeys above all others ──────────────────────────────────
 * It does NOT invent bands. Every band, every MAP%, every summary number is produced by
 * the SAME `scoreSession()` in lib/montree/evaluation/scoring.ts that the live
 * `/complete` and `/import` routes call. The script only decides what a child did on
 * each item; the scorer decides what that means. If the demo numbers look wrong, the
 * scorer is wrong — the demo cannot drift away from production behaviour.
 *
 * (scoring.ts is TypeScript, so the script bundles it with the repo's own esbuild into a
 * temporary ESM module and imports that. No second copy of the scoring rules exists.)
 *
 * ── Idempotency ──────────────────────────────────────────────────────────────────────
 * Safe to run any number of times. Fixed UUIDs for everything it owns, upserts on every
 * table, a seeded RNG keyed on (child, window, item) so a re-run produces byte-identical
 * responses, and per-session replacement of the derived rows (item responses + milestone
 * results) so a bank change cannot leave orphans behind. It never touches a row it did
 * not create, and it never deletes a school.
 *
 * ── Usage ────────────────────────────────────────────────────────────────────────────
 *   DATABASE_URL=postgres://…  node scripts/seed-evaluation-demo.mjs
 *   DATABASE_URL=…             node scripts/seed-evaluation-demo.mjs --reset
 *
 *   --reset   remove this demo's evaluation sittings first (school/children stay)
 *
 * Prerequisite: migrations/314_montree_evaluation_system.sql has been run.
 *
 * ── Assumptions about the surrounding Montree schema ─────────────────────────────────
 * The columns of montree_schools / montree_classrooms / montree_children /
 * montree_teachers / montree_school_admins vary by deployment (this repo's
 * supabase/migrations is behind production — e.g. montree_children.school_id and
 * montree_teachers.login_code exist in production but are not in the base schema file).
 * Rather than assume, every insert below is built from `information_schema.columns`:
 * a column that is not there is simply not written. The only hard requirements are
 * `id` plus the FK columns migration 314 itself references.
 */
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import pg from 'pg';
// esbuild is imported lazily inside loadScoring() — see the note there.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const EVAL_LIB = path.join(REPO, 'lib', 'montree', 'evaluation');

/* ───────────────────────────────────────────────────────────── demo identities */

const DEMO = {
  schoolId: '5e3d0a01-0000-4000-8000-000000000001',
  slug: 'milestones-demo',
  schoolName: 'Willowbrook Montessori (Milestones demo)',
  principal: {
    id: '5e3d0a02-0000-4000-8000-000000000001',
    name: 'Ana Ferreira',
    email: 'principal@milestones.demo',
    password: 'demo123',
  },
  classrooms: [
    { id: '5e3d0a03-0000-4000-8000-000000000001', name: 'Acorn Room', icon: '🌰', color: '#34d399', ageGroup: '3-6' },
    { id: '5e3d0a03-0000-4000-8000-000000000002', name: 'Cedar Room', icon: '🌲', color: '#3987e5', ageGroup: '4-5' },
  ],
  teachers: [
    { id: '5e3d0a04-0000-4000-8000-000000000001', name: 'Ms. Rosa', email: 'rosa@milestones.demo', loginCode: 'mile01', classroom: 0 },
    { id: '5e3d0a04-0000-4000-8000-000000000002', name: 'Mr. Tom', email: 'tom@milestones.demo', loginCode: 'mile02', classroom: 1 },
  ],
};

/**
 * Eighteen children across two rooms. `ageMonthsAtWinter` is the design input — the actual date of birth is
 * derived from it so the demo ages correctly no matter when it is run, and `ability` is
 * the latent the response generator draws against (0 = nothing secure yet, 1 = almost
 * everything secure). The spread is deliberately wide and unflattering in places: a demo
 * where every child is thriving is not a demo of a measurement instrument.
 */
const CHILDREN = [
  // Acorn Room — the established mixed-age 3–6 room, thirteen children. Large enough on
  // its own to clear the n = 12 reporting floor, which is what makes the classroom
  // comparison show a real figure for this room.
  { n: 1,  room: 0, name: 'Amara O.',   ageMonthsAtWinter: 38, ability: 0.42 },
  { n: 2,  room: 0, name: 'Bo L.',      ageMonthsAtWinter: 40, ability: 0.60 },
  { n: 3,  room: 0, name: 'Cato V.',    ageMonthsAtWinter: 42, ability: 0.36 },
  { n: 4,  room: 0, name: 'Dilnaz K.',  ageMonthsAtWinter: 43, ability: 0.69 },
  { n: 5,  room: 0, name: 'Eero H.',    ageMonthsAtWinter: 45, ability: 0.53 },
  { n: 6,  room: 0, name: 'Fatou D.',   ageMonthsAtWinter: 46, ability: 0.78 },
  { n: 7,  room: 0, name: 'Goran P.',   ageMonthsAtWinter: 47, ability: 0.48 },
  { n: 8,  room: 0, name: 'Hana S.',    ageMonthsAtWinter: 53, ability: 0.66 },
  { n: 9,  room: 0, name: 'Idris M.',   ageMonthsAtWinter: 54, ability: 0.74 },
  { n: 10, room: 0, name: 'Júlia C.',   ageMonthsAtWinter: 55, ability: 0.57 },
  { n: 11, room: 0, name: 'Kwame A.',   ageMonthsAtWinter: 56, ability: 0.85 },
  { n: 12, room: 0, name: 'Lena B.',    ageMonthsAtWinter: 57, ability: 0.63 },
  { n: 13, room: 0, name: 'Mateo R.',   ageMonthsAtWinter: 58, ability: 0.71 },
  // Cedar Room — opened this school year, five children. Deliberately BELOW the floor:
  // the classroom comparison must show one room with a figure and one room with the
  // reason it has none, or the suppression rule is invisible in the demo.
  { n: 14, room: 1, name: 'Noor J.',    ageMonthsAtWinter: 52, ability: 0.45 },
  { n: 15, room: 1, name: 'Otto W.',    ageMonthsAtWinter: 64, ability: 0.76 },
  { n: 16, room: 1, name: 'Priya N.',   ageMonthsAtWinter: 66, ability: 0.68 },
  { n: 17, room: 1, name: 'Quique S.',  ageMonthsAtWinter: 68, ability: 0.58 },
  { n: 18, room: 1, name: 'Rania T.',   ageMonthsAtWinter: 70, ability: 0.81 },
];

const childUuid = (n) => `5e3d0a05-0000-4000-8000-${String(n).padStart(12, '0')}`;

/**
 * Who was checked in, when. Deliberately imperfect:
 *   • Mateo joined the school in November, so he has no Autumn sitting.
 *   • Rania started a Winter check-in and it was ended early — an abandoned sitting is
 *     real data, counted openly in the transparency block rather than hidden.
 * That leaves 17 completed in Autumn, 17 in Winter and 16 children in both windows, so
 * the school-level figures and the growth figure all clear the n = 12 floor while the
 * five-child Cedar Room stays correctly below it.
 */
const ATTENDANCE = {
  autumn: { completed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18], abandoned: [] },
  winter: { completed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], abandoned: [18] },
};

/** Autumn → form A, Winter → form B (Spring returns to A). ARCHITECTURE.md §4.3. */
const WINDOWS = [
  { code: 'autumn', form: 'A', daysAgo: 118 },
  { code: 'winter', form: 'B', daysAgo: 16 },
];

const CORE_MODULES = ['M-LIT', 'M-MATH', 'M-EFL'];

/** Children who use the paper pack rather than the tablet — the packs are a real path. */
const PAPER_CHILDREN = new Set([3, 16]);

/* ─────────────────────────────────────────────────────────────────── utilities */

const args = new Set(process.argv.slice(2));
const RESET = args.has('--reset');

function log(...parts) { console.log('[seed-milestones]', ...parts); }

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

/** Deterministic 32-bit hash → seed. Same inputs, same demo, every run. */
function seedFrom(...parts) {
  const h = createHash('sha256').update(parts.join('|')).digest();
  return h.readUInt32BE(0);
}

/** mulberry32 — small, fast, and reproducible across Node versions. */
function rng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));

function isoDaysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(10, 30, 0, 0);
  return d;
}

/** `2026-2027`, matching lib/montree/evaluation/constants.ts `schoolYearFor`. */
function schoolYearFor(date = new Date(), yearStartMonth = 8) {
  const y = date.getUTCFullYear();
  const start = date.getUTCMonth() >= yearStartMonth ? y : y - 1;
  return `${start}-${start + 1}`;
}

/** DOB such that the child is exactly `months` old on `at`. */
function birthDateFor(months, at) {
  const d = new Date(at.getTime());
  d.setUTCMonth(d.getUTCMonth() - months);
  d.setUTCDate(12);
  return d.toISOString().slice(0, 10);
}

function ageMonthsBetween(birthDateIso, at) {
  const dob = new Date(`${birthDateIso}T00:00:00Z`);
  let m = (at.getUTCFullYear() - dob.getUTCFullYear()) * 12 + (at.getUTCMonth() - dob.getUTCMonth());
  if (at.getUTCDate() < dob.getUTCDate()) m -= 1;
  return m;
}

function bandForAgeMonths(m) {
  if (m < 48) return 'A3';
  if (m < 60) return 'A4';
  return 'A5';
}

const sha256 = (s) => createHash('sha256').update(s).digest('hex');

/* ────────────────────────────────────────────── load the real scoring module */

async function loadScoring() {
  // esbuild arrives with the repo's own toolchain (vitest → vite → esbuild) rather than
  // as a declared dependency of this script, so ask for it politely instead of dying with
  // a MODULE_NOT_FOUND that tells the operator nothing.
  let esbuild;
  try {
    esbuild = (await import('esbuild')).default ?? (await import('esbuild'));
  } catch {
    fail(
      'esbuild is not installed.\n' +
      '  Run `npm install` in the repo root (esbuild ships with the existing toolchain),\n' +
      '  or `npm install --no-save esbuild` for a one-off run.\n' +
      '  It is used only to load lib/montree/evaluation/scoring.ts — this script will never\n' +
      '  re-implement the scoring rules, so it genuinely cannot run without it.',
    );
  }
  const outdir = mkdtempSync(path.join(tmpdir(), 'montree-scoring-'));
  const outfile = path.join(outdir, 'scoring.mjs');
  await esbuild.build({
    entryPoints: [path.join(EVAL_LIB, 'scoring.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    outfile,
    loader: { '.json': 'json' },
    logLevel: 'silent',
  });
  return import(pathToFileURL(outfile).href);
}

/* ───────────────────────────────────────────────────── response generation */

/**
 * Turn one child's latent ability into a sitting's worth of item responses.
 *
 * What the generator decides: which items were administered, which options the child
 * tapped, and which rubric level the teacher chose. What it does NOT decide: any band,
 * any coverage figure, any percentage. Those come back from `scoreSession()`.
 */
function buildResponses({ bank, ageBand, formCode, ability, seedKey }) {
  const random = rng(seedFrom(seedKey, 'responses'));
  const responses = [];

  const items = bank.items.filter(
    (i) => i.ageBand === ageBand && i.form === formCode && CORE_MODULES.includes(i.moduleId),
  );

  // A small number of milestones are simply not reached — the teacher ran out of time,
  // or a stop rule cut the strand short. Skipping BOTH of a milestone's evidence items
  // is what makes it genuinely `unassessed` rather than merely weak.
  const directMilestones = bank.milestones.filter(
    (m) => m.ageBand === ageBand && !m.evidence?.observationItemId,
  );
  const skippedItemIds = new Set();
  for (const m of directMilestones) {
    if (random() < 0.06) {
      const declared = m.evidence?.byForm?.[formCode] ?? m.evidence?.itemIds ?? [];
      for (const id of declared) skippedItemIds.add(id);
    }
  }

  for (const item of items) {
    if (skippedItemIds.has(item.id)) {
      responses.push({
        itemId: item.id,
        administered: false,
        skippedReason: 'stop_rule',
        response: {},
      });
      continue;
    }

    // Per-strand wobble: a child who is strong overall still has a weaker strand.
    const strandNoise = (rng(seedFrom(seedKey, item.strandId))() - 0.5) * 0.22;
    // The English track is a second language for these children — systematically harder.
    const trackPenalty = item.moduleId === 'M-EFL' ? 0.14 : 0;
    const p = clamp01(ability + strandNoise - trackPenalty);

    if (item.type === 'teacher_scored_oral') {
      const roll = random();
      const level = roll < p * 0.62 ? 2 : roll < p * 0.62 + 0.32 ? 1 : 0;
      responses.push({
        itemId: item.id,
        administered: true,
        rubricScore: level,
        clientPointsAwarded: level,
        latencyMs: 2400 + Math.round(random() * 5200),
      });
      continue;
    }

    const correct = random() < p;
    const key = item.scoring?.correctSequence ?? item.scoring?.correctOptionIds ?? [];
    const optionIds = (item.options ?? []).map((o) => (typeof o === 'string' ? o : o.id));
    let chosen;
    if (correct || !optionIds.length) {
      chosen = key.length ? [...key] : optionIds.slice(0, 1);
    } else {
      const wrong = optionIds.filter((id) => !key.includes(id));
      chosen = wrong.length ? [wrong[Math.floor(random() * wrong.length)]] : [];
    }

    const base = {
      itemId: item.id,
      administered: true,
      clientPointsAwarded: correct ? (item.scoring?.maxPoints ?? 1) : 0,
      latencyMs: 1500 + Math.round(random() * 6000),
      replayCount: random() < 0.18 ? 1 : 0,
    };
    if (item.type === 'listen_do') base.sequence = chosen;
    else base.optionIds = chosen;
    responses.push(base);
  }

  return responses;
}

/**
 * Teacher observations. These are the ATL / SED / PPL / LCL-E / COG-E milestones —
 * rated over the whole window from the work cycle, best-fit against three written
 * descriptors, never a checkbox tally. A few are left un-rated: a teacher who has not
 * seen a child do something says so rather than guessing.
 */
function buildObservations({ bank, ageBand, ability, seedKey }) {
  const random = rng(seedFrom(seedKey, 'observations'));
  const out = [];
  const observationMilestones = bank.milestones.filter(
    (m) => m.ageBand === ageBand && m.evidence?.observationItemId,
  );

  for (const m of observationMilestones) {
    if (random() < 0.08) continue; // not seen this window → stays unassessed
    const strandNoise = (rng(seedFrom(seedKey, 'obs', m.strandId))() - 0.5) * 0.24;
    const p = clamp01(ability + strandNoise);
    const roll = random();
    const band = roll < p * 0.55 ? 'secure' : roll < p * 0.55 + 0.36 ? 'developing' : 'emerging';
    out.push({
      milestoneId: m.id,
      band,
      note: random() < 0.12 ? 'Seen repeatedly during the work cycle this term.' : null,
    });
  }
  return out;
}

/**
 * Teacher overrides. The system augments teacher judgement, it never overrules it — so a
 * demo without a single override would misrepresent the product. Every override carries
 * a reason, which the database itself enforces.
 */
function buildOverrides({ results, ability, seedKey }) {
  const random = rng(seedFrom(seedKey, 'overrides'));
  if (random() > 0.35) return [];
  const candidates = results.filter((r) => r.bandFinal === 'developing' || r.bandFinal === 'emerging');
  if (!candidates.length) return [];
  const pick = candidates[Math.floor(random() * candidates.length)];
  return [{
    milestoneId: pick.milestoneId,
    band: ability > 0.5 ? 'secure' : 'developing',
    reason: 'I have seen this many times in the work cycle; the sitting did not show it.',
  }];
}

/* ─────────────────────────────────────────────────────────────── database io */

async function tableColumns(client, table) {
  const { rows } = await client.query(
    'SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1',
    [table],
  );
  return new Set(rows.map((r) => r.column_name));
}

/**
 * Upsert on `id` using only the columns that actually exist in this deployment.
 * Silently dropping an unknown column is right here: the demo does not get to decide
 * what a production table looks like.
 */
async function upsertById(client, table, columns, values) {
  const available = await tableColumns(client, table);
  const entries = Object.entries(values).filter(([k]) => available.has(k));
  if (!entries.some(([k]) => k === 'id')) fail(`${table} has no id column — cannot seed idempotently`);
  const names = entries.map(([k]) => k);
  const placeholders = entries.map((_, i) => `$${i + 1}`);
  const updates = names.filter((n) => n !== 'id').map((n) => `${n} = EXCLUDED.${n}`);
  const sql =
    `INSERT INTO ${table} (${names.join(', ')}) VALUES (${placeholders.join(', ')}) ` +
    `ON CONFLICT (id) DO UPDATE SET ${updates.join(', ')} RETURNING id`;
  const { rows } = await client.query(sql, entries.map(([, v]) => v));
  void columns;
  return rows[0].id;
}

async function seedSchool(client) {
  // Reuse an existing row with this slug rather than fighting its UNIQUE constraint.
  const existing = await client.query('SELECT id FROM montree_schools WHERE slug = $1', [DEMO.slug]);
  const schoolId = existing.rows[0]?.id ?? DEMO.schoolId;

  await upsertById(client, 'montree_schools', null, {
    id: schoolId,
    name: DEMO.schoolName,
    slug: DEMO.slug,
    is_active: true,
    subscription_status: 'active',
    plan_type: 'premium',
    max_students: 100,
    // owner_email/owner_name: prod's montree_schools.owner_email is NOT NULL. The base
    // schema this script was written against does not require it, so it was omitted here
    // originally; added so the seed also runs cleanly against prod's actual constraints.
    owner_email: DEMO.principal.email,
    owner_name: DEMO.principal.name,
  });

  await upsertById(client, 'montree_school_admins', null, {
    id: DEMO.principal.id,
    school_id: schoolId,
    name: DEMO.principal.name,
    email: DEMO.principal.email,
    // SHA-256 is the legacy hash the principal login still dual-verifies (and silently
    // upgrades to bcrypt on first successful sign-in). Good enough for a demo account.
    password_hash: sha256(DEMO.principal.password),
    role: 'principal',
    is_active: true,
  });

  for (const room of DEMO.classrooms) {
    await upsertById(client, 'montree_classrooms', null, {
      id: room.id,
      school_id: schoolId,
      name: room.name,
      icon: room.icon,
      color: room.color,
      age_group: room.ageGroup,
      is_active: true,
    });
  }

  for (const teacher of DEMO.teachers) {
    await upsertById(client, 'montree_teachers', null, {
      id: teacher.id,
      school_id: schoolId,
      classroom_id: DEMO.classrooms[teacher.classroom].id,
      name: teacher.name,
      email: teacher.email,
      login_code: teacher.loginCode,
      password_hash: sha256(DEMO.principal.password),
      role: 'teacher',
      is_active: true,
    });
  }

  const winterAt = isoDaysAgo(WINDOWS[1].daysAgo);
  for (const child of CHILDREN) {
    await upsertById(client, 'montree_children', null, {
      id: childUuid(child.n),
      school_id: schoolId,
      classroom_id: DEMO.classrooms[child.room].id,
      name: child.name,
      date_of_birth: birthDateFor(child.ageMonthsAtWinter, winterAt),
      is_active: true,
    });
  }

  return schoolId;
}

async function enableFeature(client, schoolId) {
  // The definition row is migration 314's; re-assert it so the seed also works against a
  // database where only the tables were created by hand.
  await client.query(
    `INSERT INTO montree_feature_definitions (feature_key, name, description, icon, category, is_premium, default_enabled)
     VALUES ('child_evaluation', 'Montree Milestones',
             'Three-times-a-year developmental milestone check-ins with parent and funder reports.',
             'ClipboardCheck', 'assessment', false, false)
     ON CONFLICT (feature_key) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`,
  );
  await client.query(
    `INSERT INTO montree_school_features (school_id, feature_key, enabled)
     VALUES ($1, 'child_evaluation', true)
     ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = EXCLUDED.enabled`,
    [schoolId],
  );
}

async function recordBankVersion(client, bank) {
  await client.query(
    `INSERT INTO montree_evaluation_bank_versions
       (bank_version, bank_checksum, schema_version, item_count, milestone_count, stimulus_count, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (bank_version) DO UPDATE
       SET bank_checksum = EXCLUDED.bank_checksum, item_count = EXCLUDED.item_count,
           milestone_count = EXCLUDED.milestone_count, stimulus_count = EXCLUDED.stimulus_count`,
    [
      bank.bankVersion, bank.bankChecksum, bank.schemaVersion ?? null,
      bank.items.length, bank.milestones.length, (bank.stimuli ?? []).length,
      'Seeded by scripts/seed-evaluation-demo.mjs',
    ],
  );
}

async function writeSitting(client, {
  schoolId, child, windowSpec, schoolYear, bank, scoring, status,
}) {
  const at = isoDaysAgo(windowSpec.daysAgo + (child.n % 5));
  const birthDate = birthDateFor(child.ageMonthsAtWinter, isoDaysAgo(WINDOWS[1].daysAgo));
  const ageMonths = ageMonthsBetween(birthDate, at);
  const ageBand = bandForAgeMonths(ageMonths);
  const formCode = windowSpec.form;
  const classroomId = DEMO.classrooms[child.room].id;
  const deliveryMode = PAPER_CHILDREN.has(child.n) ? 'paper' : 'tablet';
  const seedKey = `${child.n}:${windowSpec.code}`;

  // Growth: everyone is a little further along by Winter, but not uniformly, and one
  // child in the group is not moving — a demo where every line goes up is not honest.
  const drift = windowSpec.code === 'autumn' ? 0 : (child.n === 7 ? -0.02 : 0.05 + (child.n % 4) * 0.02);
  const ability = clamp01(child.ability + drift);

  const responses = buildResponses({ bank, ageBand, formCode, ability, seedKey });
  const observations = buildObservations({ bank, ageBand, ability, seedKey });

  // First pass with no overrides, so the override generator can look at real bands.
  const firstPass = scoring.scoreSession({
    ageBand, formCode, modules: [...CORE_MODULES, 'M-OBS'], responses, observations,
  });
  const overrides = status === 'completed'
    ? buildOverrides({ results: firstPass.results, ability, seedKey })
    : [];

  const scored = scoring.scoreSession({
    ageBand, formCode, modules: [...CORE_MODULES, 'M-OBS'], responses, observations, overrides,
  });
  const summary = scored.summary;

  const sessionRow = {
    school_id: schoolId,
    classroom_id: classroomId,
    child_id: childUuid(child.n),
    administered_by_role: 'teacher',
    administered_by_id: DEMO.teachers[child.room].id,
    school_year: schoolYear,
    window_code: windowSpec.code,
    age_months: ageMonths,
    age_band: ageBand,
    form_code: formCode,
    modules: [...CORE_MODULES, 'M-OBS'],
    delivery_mode: deliveryMode,
    assessment_locale: 'en',
    bank_version: bank.bankVersion,
    bank_checksum: bank.bankChecksum,
    source: deliveryMode === 'paper' ? 'paper_entry' : 'montree_ui',
    status,
    started_at: new Date(at.getTime() - 14 * 60 * 1000).toISOString(),
    completed_at: status === 'completed' ? at.toISOString() : null,
    duration_seconds: status === 'completed' ? 700 + (child.n * 17) % 260 : null,
    map_percent: status === 'completed' && !summary.core.suppressed ? summary.core.mapPercent : null,
    map_denominator: status === 'completed' ? summary.core.denominator : null,
    map_suppressed: status === 'completed' ? Boolean(summary.core.suppressed) : true,
    milestones_secure: summary.counts.secure,
    milestones_developing: summary.counts.developing,
    milestones_emerging: summary.counts.emerging,
    milestones_unassessed: summary.counts.unassessed,
    milestones_exceeded: summary.core.exceeded,
    override_count: summary.overrideCount,
    efl_map_percent: status === 'completed' && !summary.efl.suppressed ? summary.efl.mapPercent : null,
    efl_map_denominator: status === 'completed' ? summary.efl.denominator : null,
    efl_map_suppressed: status === 'completed' ? Boolean(summary.efl.suppressed) : true,
    summary_json: JSON.stringify(status === 'completed' ? summary : { abandoned: true }),
    notes: status === 'abandoned' ? 'Child was not settled; sitting ended early. Partial data kept.' : null,
  };

  const names = Object.keys(sessionRow);
  const { rows } = await client.query(
    `INSERT INTO montree_evaluation_sessions (${names.join(', ')})
     VALUES (${names.map((_, i) => `$${i + 1}`).join(', ')})
     ON CONFLICT (child_id, school_year, window_code, delivery_mode) DO UPDATE
       SET ${names.filter((n) => n !== 'child_id' && n !== 'school_year' && n !== 'window_code' && n !== 'delivery_mode')
            .map((n) => `${n} = EXCLUDED.${n}`).join(', ')}
     RETURNING id`,
    names.map((n) => sessionRow[n]),
  );
  const sessionId = rows[0].id;

  // Derived rows are replaced wholesale for this session. They are re-computable from the
  // bank at any time, so nothing irreplaceable is at stake — and a bank edit that removes
  // a milestone must not leave its old result row behind pretending to be current.
  await client.query('DELETE FROM montree_evaluation_item_responses WHERE session_id = $1', [sessionId]);
  await client.query('DELETE FROM montree_evaluation_milestone_results WHERE session_id = $1', [sessionId]);

  const itemById = new Map(bank.items.map((i) => [i.id, i]));
  for (const s of scored.scored) {
    const item = itemById.get(s.itemId);
    await client.query(
      `INSERT INTO montree_evaluation_item_responses
        (session_id, school_id, classroom_id, child_id, item_id, milestone_id, strand_id, module_id,
         age_band, form_code, item_type, response, points_awarded, points_possible, is_correct,
         attempts, replay_count, latency_ms, administered, skipped_reason, client_points_awarded, answered_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
      [
        sessionId, schoolId, classroomId, childUuid(child.n), s.itemId,
        item?.milestoneId ?? null, s.strandId, s.moduleId, s.ageBand, s.formCode, s.itemType,
        JSON.stringify({
          optionIds: s.raw.optionIds ?? null,
          sequence: s.raw.sequence ?? null,
          rubricScore: s.raw.rubricScore ?? null,
        }),
        s.pointsAwarded, s.pointsPossible, s.isCorrect,
        1, s.raw.replayCount ?? 0, s.raw.latencyMs ?? null,
        s.administered, s.raw.skippedReason ?? null,
        s.raw.clientPointsAwarded ?? null, at.toISOString(),
      ],
    );
  }

  for (const r of scored.results) {
    await client.query(
      `INSERT INTO montree_evaluation_milestone_results
        (session_id, school_id, classroom_id, child_id, school_year, window_code, milestone_id,
         strand_id, domain_id, track, age_band, expectation, band_computed, band_final, band_source,
         override_reason, override_by_role, override_by_id, coverage, points_earned, points_possible, evidence_note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
      [
        sessionId, schoolId, classroomId, childUuid(child.n), schoolYear, windowSpec.code,
        r.milestoneId, r.strandId, r.domainId, r.track, r.ageBand, r.expectation,
        r.bandComputed, r.bandFinal, r.bandSource, r.overrideReason,
        r.bandSource === 'teacher_override' ? 'teacher' : null,
        r.bandSource === 'teacher_override' ? DEMO.teachers[child.room].id : null,
        r.coverage, r.pointsEarned, r.pointsPossible, r.evidenceNote,
      ],
    );
  }

  return { sessionId, summary, itemCount: scored.scored.length, resultCount: scored.results.length };
}

/* ───────────────────────────────────────────────────────────────────── main */

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    fail(
      'DATABASE_URL is not set.\n' +
      '  Local:    DATABASE_URL=postgres://postgres@localhost:5432/montree node scripts/seed-evaluation-demo.mjs\n' +
      '  Supabase: use the project\'s direct Postgres connection string (Settings → Database).',
    );
  }

  const bank = JSON.parse(readFileSync(path.join(EVAL_LIB, 'item-bank.json'), 'utf8'));
  log(`bank ${bank.bankVersion} — ${bank.items.length} items, ${bank.milestones.length} milestones`);

  const scoring = await loadScoring();
  log('scoring module loaded from lib/montree/evaluation/scoring.ts (bundled, not re-implemented)');

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    // Migration 314 must have run. Say so plainly rather than failing on a missing column.
    const probe = await client.query(
      `SELECT to_regclass('montree_evaluation_sessions') AS t, to_regclass('montree_evaluation_milestone_results') AS r`,
    );
    if (!probe.rows[0].t || !probe.rows[0].r) {
      fail('migrations/314_montree_evaluation_system.sql has not been run against this database.');
    }

    await client.query('BEGIN');

    const schoolId = await seedSchool(client);
    log(`school ${schoolId} (${DEMO.slug}) · ${DEMO.classrooms.length} classrooms · ${CHILDREN.length} children`);

    await enableFeature(client, schoolId);
    log('feature child_evaluation = ON for this school');

    await recordBankVersion(client, bank);

    if (RESET) {
      const { rowCount } = await client.query(
        'DELETE FROM montree_evaluation_sessions WHERE school_id = $1', [schoolId],
      );
      log(`--reset: removed ${rowCount} previous sitting(s) for this demo school`);
    }

    const schoolYear = schoolYearFor();
    let sittings = 0, items = 0, results = 0;

    for (const windowSpec of WINDOWS) {
      const plan = ATTENDANCE[windowSpec.code];
      for (const n of plan.completed) {
        const child = CHILDREN.find((c) => c.n === n);
        const out = await writeSitting(client, {
          schoolId, child, windowSpec, schoolYear, bank, scoring, status: 'completed',
        });
        sittings += 1; items += out.itemCount; results += out.resultCount;
      }
      for (const n of plan.abandoned) {
        const child = CHILDREN.find((c) => c.n === n);
        const out = await writeSitting(client, {
          schoolId, child, windowSpec, schoolYear, bank, scoring, status: 'abandoned',
        });
        sittings += 1; items += out.itemCount; results += out.resultCount;
      }
      log(`${windowSpec.code} (form ${windowSpec.form}) — ${plan.completed.length} completed, ${plan.abandoned.length} ended early`);
    }

    await client.query('COMMIT');
    log(`done — school year ${schoolYear}, ${sittings} sittings, ${items} item responses, ${results} milestone results`);
    log(`principal login: ${DEMO.principal.email} / ${DEMO.principal.password}`);
    log(`teacher login codes: ${DEMO.teachers.map((t) => `${t.name} ${t.loginCode}`).join(' · ')}`);
    log('re-running this script is safe; it upserts everything it owns');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
