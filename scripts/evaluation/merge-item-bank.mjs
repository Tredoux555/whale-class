#!/usr/bin/env node
/**
 * merge-item-bank.mjs — build lib/montree/evaluation/item-bank.json.
 *
 * The authored bank ships as five files (milestones / items-core / items-efl / observation /
 * stimuli). Montree consumes ONE file, because ARCHITECTURE.md §5 says there is exactly one
 * source of truth and no consumer may hold its own copy of item content. This script merges
 * the five, computes the canonical `bankChecksum`, and writes the single file.
 *
 * Usage — the authored-bank directory may be given three ways, in this order of precedence:
 *
 *   node scripts/evaluation/merge-item-bank.mjs <dir>            positional
 *   node scripts/evaluation/merge-item-bank.mjs --src <dir>      flag
 *   MONTREE_ITEM_BANK_SRC=<dir> node scripts/evaluation/merge-item-bank.mjs
 *
 * With none of those it searches CANDIDATE_SRC below (covering both the evalsys build tree and
 * a repo checkout that keeps the authored bank alongside the module) and, if nothing matches,
 * prints every path it tried. Resolution is anchored to this file, never to the caller's cwd,
 * and never needs a symlink.
 *
 *   --out <path>   override the output file
 *   --check        exit 1 if the file on disk is stale; write nothing
 *   --quiet        suppress the summary
 *
 * Re-run after ANY bank change and bump `bankVersion` in the authored sources — the checksum is
 * recorded on every session row, so a stored result can always be traced to the exact wording.
 */
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));   // …/scripts/evaluation
const MODULE_ROOT = resolve(HERE, '..', '..');          // the integration / repo root
const SOURCES = ['milestones.json', 'items-core.json', 'items-efl.json', 'observation.json', 'stimuli.json'];

/* ───────────────────────────────────────────────────────── argument handling */

const argv = process.argv.slice(2);
const FLAGS = new Set(['--src', '--out']);
const flagValue = (name) => {
  const i = argv.indexOf(name);
  return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
};
const positional = argv.find((a, i) => !a.startsWith('--') && !FLAGS.has(argv[i - 1]));
const CHECK = argv.includes('--check');
const QUIET = argv.includes('--quiet');

/** Every place the authored bank is plausibly kept, resolved relative to THIS script. */
const CANDIDATE_SRC = [
  join(MODULE_ROOT, 'item-bank'),                       // repo: alongside the module
  join(MODULE_ROOT, 'evalsys', 'build', 'item-bank'),   // repo: evalsys checked in
  join(MODULE_ROOT, '..', 'item-bank'),                 // evalsys: build/integration → build/item-bank
  join(MODULE_ROOT, '..', '..', 'build', 'item-bank'),
  join(MODULE_ROOT, '..', '..', 'item-bank'),
];

const looksLikeBankDir = (dir) => {
  try { return statSync(dir).isDirectory() && SOURCES.every((f) => existsSync(join(dir, f))); }
  catch { return false; }
};

const explicit = flagValue('--src') ?? positional ?? process.env.MONTREE_ITEM_BANK_SRC ?? null;

let SRC;
if (explicit) {
  SRC = isAbsolute(explicit) ? explicit : resolve(process.cwd(), explicit);
  if (!looksLikeBankDir(SRC)) {
    console.error(`merge-item-bank: ${SRC} is not an authored-bank directory.`);
    console.error(`  It must contain all of: ${SOURCES.join(', ')}`);
    process.exit(1);
  }
} else {
  SRC = CANDIDATE_SRC.map((d) => resolve(d)).find(looksLikeBankDir) ?? null;
  if (!SRC) {
    console.error('merge-item-bank: could not find the authored item-bank directory.');
    console.error('  Pass it explicitly:  node scripts/evaluation/merge-item-bank.mjs <dir>');
    console.error('  or set MONTREE_ITEM_BANK_SRC. Paths tried:');
    for (const d of CANDIDATE_SRC) console.error(`    ${resolve(d)}`);
    process.exit(1);
  }
}

const OUT = resolve(flagValue('--out') ?? join(MODULE_ROOT, 'lib', 'montree', 'evaluation', 'item-bank.json'));

/* ─────────────────────────────────────────────────────────────────── merge */

const read = (f) => JSON.parse(readFileSync(join(SRC, f), 'utf8'));
const src = Object.fromEntries(SOURCES.map((f) => [f, read(f)]));
const head = src['milestones.json'];

for (const f of SOURCES) {
  if (src[f].bankVersion !== head.bankVersion) {
    console.error(`merge-item-bank: ${f} bankVersion ${src[f].bankVersion} != ${head.bankVersion}`);
    process.exit(1);
  }
}

/**
 * Top-level authored keys the merged bank deliberately does NOT carry.
 *
 * `notes`, `internalFields`, `taughtLetters`, `heartWords` and the strand-level `constructTags`
 * index are authoring and provenance metadata, not item content: the runtime derives everything
 * it needs from `strands[]`, `milestones[]` and `items[]`, which DO carry `englishMedium`,
 * `constructTag` and `decodableWord` per record. Adding a key here changes `bankChecksum`, and
 * every stored session row references that value — so if a consumer ever genuinely needs one at
 * runtime, add it AND bump bankVersion, making it a deliberate, traceable event rather than a
 * silent hash shift. The warning below exists so a NEW authored key can never be dropped silently.
 */
const KNOWN_TOP_LEVEL = new Set([
  'schemaVersion', 'bankVersion', 'generatedAt', 'assessmentLocales', 'attribution',
  'notes', 'internalFields', 'taughtLetters', 'heartWords', 'constructTags',
  'scoring', 'domains', 'strands', 'milestones', 'stimuli', 'modules', 'module',
  'rubrics', 'observationChecklists', 'items',
]);
const surprises = new Set();
for (const f of SOURCES) {
  for (const k of Object.keys(src[f])) if (!KNOWN_TOP_LEVEL.has(k)) surprises.add(`${f}:${k}`);
}
if (surprises.size) {
  console.warn('merge-item-bank: WARNING — the authored sources carry top-level keys this script');
  console.warn('  does not know about. They are NOT in the merged bank. Decide deliberately:');
  for (const s of surprises) console.warn(`    ${s}`);
}

/** Canonical JSON: object keys sorted recursively. Arrays keep authored order. */
const canonical = (v) => {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])]));
  }
  return v;
};

// All 426 item records live in one `items` array: direct + practice + focus + observation.
// `type` discriminates them; observation items additionally carry `milestoneId`.
const items = [
  ...src['items-core.json'].items,
  ...src['items-efl.json'].items,
  ...src['observation.json'].items,
];
const seen = new Set();
for (const it of items) {
  if (seen.has(it.id)) { console.error(`merge-item-bank: duplicate item id ${it.id}`); process.exit(1); }
  seen.add(it.id);
}

const bank = {
  schemaVersion: head.schemaVersion,
  bankVersion: head.bankVersion,
  bankChecksum: '',                       // filled below; excluded from its own hash
  generatedAt: head.generatedAt,
  mergedAt: new Date().toISOString(),
  assessmentLocales: head.assessmentLocales,
  attribution: head.attribution,
  scoring: head.scoring,
  domains: head.domains,
  strands: head.strands,
  milestones: head.milestones,
  stimuli: src['stimuli.json'].stimuli,
  modules: [
    ...src['items-core.json'].modules,
    ...src['items-efl.json'].modules,
    src['observation.json'].module,
  ],
  rubrics: { ...src['items-core.json'].rubrics, ...src['items-efl.json'].rubrics },
  observationChecklists: src['observation.json'].observationChecklists,
  items,
  counts: {
    domains: head.domains.length,
    strands: head.strands.length,
    milestones: head.milestones.length,
    stimuli: src['stimuli.json'].stimuli.length,
    items: items.length,
    scoredDirectItems: items.filter((i) => i.scored === true).length,
    practiceItems: items.filter((i) => i.form === 'P').length,
    observationItems: items.filter((i) => i.type === 'observation_checklist').length,
  },
};

// mergedAt is volatile — it must not enter the checksum, or the hash changes every run.
const { bankChecksum: _drop, mergedAt: _drop2, ...hashable } = bank;
bank.bankChecksum = 'sha256:' + createHash('sha256')
  .update(JSON.stringify(canonical(hashable))).digest('hex');

const out = JSON.stringify(bank, null, 2) + '\n';

if (CHECK) {
  const cur = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null;
  if (!cur || cur.bankChecksum !== bank.bankChecksum) {
    console.error('merge-item-bank: item-bank.json is STALE — re-run without --check');
    console.error(`  on disk: ${cur?.bankVersion ?? 'missing'} ${cur?.bankChecksum ?? '—'}`);
    console.error(`  sources: ${bank.bankVersion} ${bank.bankChecksum}`);
    process.exit(1);
  }
  if (!QUIET) console.log(`merge-item-bank: up to date (${bank.bankVersion} ${bank.bankChecksum})`);
  process.exit(0);
}

writeFileSync(OUT, out, 'utf8');
if (!QUIET) {
  console.log(`merge-item-bank: wrote ${OUT}`);
  console.log(`  source  ${SRC}`);
  console.log(`  version ${bank.bankVersion}  ${bank.bankChecksum}`);
  console.log(`  ${JSON.stringify(bank.counts)}`);
}
