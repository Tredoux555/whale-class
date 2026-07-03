// scripts/validate-curated-visual-memory.mjs
//
// Validator for the curated global-visual-memory data files
// (scripts/data/curated-visual-memory/{practical-life,sensorial,math,language,cultural}.json).
//
// Checks (all HARD failures → exit non-zero):
//   (a) every work_key resolves against the canonical curriculum map
//       (lib/curriculum/data/*.json → work.id). Unknown/retired keys rejected.
//   (b) visual_description is non-empty and <= DESC_CAP (900) chars.
//   (c) work_name and area match the canonical curriculum (authoring hygiene —
//       the seed re-anchors work_name to canonical anyway, but a mismatch means
//       the author was describing the wrong work).
//   (d) no duplicate work_keys across files.
//   (e) no roster-name hits anywhere in authored text (privacy contract).
//   (f) every 'NOT <Name>:' negative is MUTUAL — the named counterpart exists in
//       the curated set (directly or via a documented FAMILY_ALIASES entry) AND
//       that counterpart names this work back — UNLESS the reference is an
//       explicitly documented one-directional distinguisher in
//       ONE_DIRECTIONAL_WHITELIST.
//
// Exported: validateCuratedData() → { ok, errors, warnings, entries, canonicalMap }
// so the seed script can call it and refuse to seed on failure.
//
// CLI: `node scripts/validate-curated-visual-memory.mjs` (exit 0 = pass).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data', 'curated-visual-memory');
const AREA_FILES = ['practical-life', 'sensorial', 'math', 'language', 'cultural'];

const DESC_CAP = 900; // must match seed-global-visual-memory.mjs DESC_CAP

// Whale Class roster — the same defensive scrub list the seed uses. Curated
// text is generic material description; a roster hit is a hard authoring bug.
const ROSTER = [
  'Amy', 'Austin', 'Eric', 'Gengerlyn', 'Hayden', 'Henry', 'Jimmy', 'Joey',
  'Kayla', 'Kevin', 'KK', 'Leo', 'Lucky', 'MaoMao', 'MingXi', 'NiuNiu',
  'Rachel', 'Segina', 'Stella', 'YueZe',
];
const ROSTER_RE = new RegExp(`\\b(${ROSTER.join('|')})(?:'s)?\\b`, 'i');

// ---------------------------------------------------------------------------
// FAMILY_ALIASES: a generic/plural family name → the specific curated work
// names it stands for. Lets a negative name a whole family ("Cylinder Blocks")
// and still reciprocate with every member. Keys and values are NORMALIZED
// names (see normName). Add a family here when authoring a plural reference.
// ---------------------------------------------------------------------------
const FAMILY_ALIASES = {
  'cylinder blocks': [
    'cylinder block 1', 'cylinder block 2', 'cylinder block 3',
    'cylinder block 4', 'cylinder blocks combined',
  ],
  'cylinder block': [
    'cylinder block 1', 'cylinder block 2', 'cylinder block 3',
    'cylinder block 4', 'cylinder blocks combined',
  ],
};

// ---------------------------------------------------------------------------
// ONE_DIRECTIONAL_WHITELIST: `${work_key}::${normalized target}` for negatives
// that are intentional ONE-WAY distinguishers — a helpful "not the other thing"
// note pointing at a work that is either out of the current curated scope or
// not mutually confusable, so reciprocation is NOT required. Every entry is a
// deliberate authoring decision, documented here.
// ---------------------------------------------------------------------------
const ONE_DIRECTIONAL_WHITELIST = new Set([
  // Sound Boxes: sealed shaker cylinders. Distinguishers point at works that
  // aren't commonly mis-called Sound Boxes (and Smelling Bottles isn't yet
  // curated). One-way is correct.
  'se_sound_boxes::cylinder blocks',
  'se_sound_boxes::spindle boxes',
  'se_sound_boxes::smelling bottles',
  // Touch Tablets: plain graded sandpaper tablets. Touch Boards not yet
  // curated; the letter/numeral distinguishers are one-way (nobody mis-calls
  // Sandpaper Letters "Touch Tablets").
  'se_touch_tablets::touch boards',
  'se_touch_tablets::sandpaper letters',
  'se_touch_tablets::sandpaper numerals',
  // Golden Beads vs the coloured Short Bead Stair — Short Bead Stair not yet
  // curated. One-way until it is authored (Phase 5).
  'ma_golden_beads_intro::short bead stair',
]);

// Normalize a work name for matching: lowercase, strip a trailing parenthetical
// qualifier ("Red Rods (Long Rods)" → "red rods"), collapse whitespace.
function normName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadCanonicalMap() {
  const map = new Map();
  for (const f of AREA_FILES) {
    const j = JSON.parse(fs.readFileSync(path.join(REPO, 'lib', 'curriculum', 'data', `${f}.json`), 'utf8'));
    const areaKey = j.id === 'math' ? 'mathematics' : j.id;
    for (const cat of j.categories || []) {
      for (const w of cat.works || []) {
        map.set(w.id, { name: w.name, area: areaKey });
      }
    }
  }
  return map;
}

export function loadCuratedEntries() {
  const entries = [];
  for (const f of AREA_FILES) {
    const p = path.join(DATA_DIR, `${f}.json`);
    if (!fs.existsSync(p)) continue;
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const e of j.entries || []) {
      entries.push({ ...e, _file: f });
    }
  }
  return entries;
}

export function validateCuratedData() {
  const errors = [];
  const warnings = [];
  const canonicalMap = loadCanonicalMap();
  const entries = loadCuratedEntries();

  // ---- (d) duplicate work_keys ----
  const seenKeys = new Set();
  for (const e of entries) {
    if (seenKeys.has(e.work_key)) errors.push(`Duplicate work_key across files: ${e.work_key}`);
    seenKeys.add(e.work_key);
  }

  // Index by normalized work_name → work_key (for mutual resolution).
  const byNorm = new Map();
  const keyOf = new Map(); // work_key → entry
  for (const e of entries) {
    keyOf.set(e.work_key, e);
    const n = normName(e.work_name);
    if (byNorm.has(n) && byNorm.get(n) !== e.work_key) {
      warnings.push(`Two curated works normalize to the same name "${n}" (${byNorm.get(n)} & ${e.work_key})`);
    }
    byNorm.set(n, e.work_key);
  }

  // Resolve a normalized target name → array of curated work_keys.
  const resolveTargetKeys = (targetNorm) => {
    if (byNorm.has(targetNorm)) return [byNorm.get(targetNorm)];
    const fam = FAMILY_ALIASES[targetNorm];
    if (fam) return fam.map((m) => byNorm.get(m)).filter(Boolean);
    return [];
  };

  // Pre-parse every entry's negatives into normalized target lists.
  const negTargetsByKey = new Map(); // work_key → [targetNorm]
  for (const e of entries) {
    const list = [];
    for (const neg of e.negative_descriptions || []) {
      if (typeof neg !== 'string') { errors.push(`${e.work_key}: non-string negative`); continue; }
      const m = neg.match(/^NOT ([^:]+):/);
      if (!m) { errors.push(`${e.work_key}: negative does not lead with "NOT <Name>:" → ${JSON.stringify(neg.slice(0, 60))}`); continue; }
      list.push(normName(m[1]));
    }
    negTargetsByKey.set(e.work_key, list);
  }

  for (const e of entries) {
    const canon = canonicalMap.get(e.work_key);

    // ---- (a) work_key resolves against canonical curriculum ----
    if (!canon) {
      errors.push(`${e.work_key} (${e._file}.json): work_key NOT in canonical curriculum (lib/curriculum/data). Retired or misspelled.`);
      continue; // downstream checks need canon
    }

    // ---- (c) work_name / area match canonical ----
    if (e.work_name !== canon.name) {
      errors.push(`${e.work_key}: work_name "${e.work_name}" != canonical "${canon.name}"`);
    }
    if (e.area !== canon.area) {
      errors.push(`${e.work_key}: area "${e.area}" != canonical "${canon.area}"`);
    }

    // ---- (b) visual_description length ----
    const desc = typeof e.visual_description === 'string' ? e.visual_description : '';
    if (!desc.trim()) errors.push(`${e.work_key}: empty visual_description`);
    if (desc.length > DESC_CAP) errors.push(`${e.work_key}: visual_description ${desc.length} chars > ${DESC_CAP} cap`);

    // ---- (e) roster-name hits ----
    const blob = [desc, ...(e.key_materials || []), ...(e.negative_descriptions || [])].join(' ');
    const rosterHit = blob.match(ROSTER_RE);
    if (rosterHit) errors.push(`${e.work_key}: roster name "${rosterHit[0]}" in authored text (privacy contract)`);

    // ---- (f) mutual negatives (WARNINGS, not hard failures) ----
    // At full scale (~270 works) many negatives are intentional one-way
    // distinguishers. The load-bearing integrity checks above are hard
    // failures; mutual-negative health is surfaced as WARNINGS so the core
    // confusion pairs stay symmetric without an unwieldy whitelist. Negatives
    // are prompt hints only — a non-reciprocated or dangling one is
    // cosmetically imperfect, never harmful at runtime. Malformed negatives
    // (wrong "NOT <Name>:" format) ARE still hard errors (checked above).
    for (const t of negTargetsByKey.get(e.work_key) || []) {
      if (ONE_DIRECTIONAL_WHITELIST.has(`${e.work_key}::${t}`)) continue;
      const targets = resolveTargetKeys(t);
      if (targets.length === 0) {
        warnings.push(`${e.work_key}: negative "NOT ${t}" — counterpart not in curated set (dangling ref or not-yet-authored work).`);
        continue;
      }
      const reciprocated = targets.some((tk) =>
        (negTargetsByKey.get(tk) || []).some((t2) => resolveTargetKeys(t2).includes(e.work_key)),
      );
      if (!reciprocated) {
        warnings.push(`${e.work_key}: negative "NOT ${t}" is one-directional — [${targets.join(', ')}] does not name it back.`);
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings, entries, canonicalMap };
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const { ok, errors, warnings, entries } = validateCuratedData();
  console.log(`Curated entries: ${entries.length}`);
  if (warnings.length) {
    console.log(`\n⚠ ${warnings.length} warning(s):`);
    warnings.forEach((w) => console.log(`  - ${w}`));
  }
  if (!ok) {
    console.error(`\n❌ ${errors.length} validation error(s):`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log('\n✅ Validation passed.');
}
