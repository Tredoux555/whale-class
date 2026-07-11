#!/usr/bin/env node
/**
 * scripts/curriculum/validate-specs.mjs — the decodability gate.
 *
 * Implements PLAN_CURRICULUM_STUDIO_JUL10.md §8b amendment #1 AND the pattern-aware
 * generalization in PLAN_ENGINE_GENERALIZATION_JUL12.md §B5.
 *
 * readAloud weeks (book.readAloud === true, W1–3) are EXEMPT — a child is not
 * decoding yet; the materials are vocabulary/pictures.
 *
 * For a DECODING week (book.readAloud === false):
 *
 *   STRICT fields — book.spreads[].text (W4+), materials.sentences,
 *   materials.tracing.words, materials.dictionary:
 *     every word must be, token by token, EITHER
 *       (a) DECODABLE at this week — see the pattern-aware algorithm below, OR
 *       (b) a CUMULATIVE glue word — union of glue.new ∪ glue.known across ALL
 *           weeks ≤ this week, OR
 *       (c) an allowed character name (Segina, Sam — known by heart).
 *
 *   PICTURE-VOCAB fields — materials.threePartCards, materials.matching,
 *   materials.bingoPool, materials.coloring:
 *     ADDITIONALLY allow the CUMULATIVE union of
 *       soundBasket ∪ oralWords ∪ newWords ∪ reviewBank.
 *
 * ── Pattern-aware decodability (§B5) ────────────────────────────────────────
 *
 * A STRICT word is decodable at week W iff it passes BOTH:
 *   1. the FORBIDDEN-BEFORE gate — no pronunciation-bearing pattern the child
 *      hasn't met yet (letter-sums would false-pass "ship"@26, "ice"@41,
 *      "night"@45, "know"@45, "cake"@37, "bell"@29). And
 *   2. POSITIVE decomposition — greedy longest-match over the taught contiguous
 *      graphemes + single letters, plus split-vce (magic-e), suffix stripping
 *      (doubling-collapse + e-restore), and terminal-y-as-vowel.
 *
 * Level 1 (weeks ≤ 26) is BYTE-IDENTICAL to the pre-Jul-12 letter-sum gate:
 *   - the pattern registry is empty ≤ W26 (patterns start W27),
 *   - the doubling gate (ff/ll/ss/zz) activates only from W27 (so "buzz"@26 stays
 *     decodable — a double-z reads as its single letter at Level 1),
 *   - magic-e / suffix / y-final never fire below their weeks (38/57/55),
 *   - the only Level-1 STRICT words that touch a gate are heart/irregular ("are",
 *     "get") which are in GATE_EXEMPT, and glue ("the", "says") which is skipped
 *     before the decode check.
 *
 * THE IRON RULE: in a decoding week, a child never meets an undecodable word in
 * a STRICT field.
 *
 * Exit 1 on any decodability / structural violation. Manifest issues are warnings.
 *
 * Usage:
 *   node scripts/curriculum/validate-specs.mjs [--verbose]
 *   node scripts/curriculum/validate-specs.mjs --self-test   # in-file B5.6 fixtures
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPEC_DIR = path.join(__dirname, '..', '..', 'lib', 'montree', 'english-curriculum', 'spec');
const VERBOSE = process.argv.includes('--verbose');

// The locked utility-first spine. Week N (1-based) teaches SPINE[N-1].
const SPINE = ['a', 't', 'm', 'c', 's', 'n', 'p', 'i', 'h', 'd', 'o', 'g', 'b', 'e', 'r', 'u', 'f', 'l', 'w', 'j', 'k', 'v', 'y', 'x', 'qu', 'z'];

// Character names known by heart from the read-alouds — allowed in every field.
const CHARACTER_NAMES = new Set(['segina', 'sam']);

// Cast-name decodability exemption (curriculum contract §8b: "cast names
// decodability-exempt — known by heart"). CASE-SENSITIVE — only the capitalized
// debut form is exempt, so lowercase "cat"/"star"/"snake" still validate as real
// words. The exemption is a FALLBACK: a token is checked for normal decodability
// FIRST, and only if that fails is the capitalized cast form exempted (e.g.
// "Sheep" debuts at W27 before "ee" is taught — exempt; lowercase "sheep" fails).
const CAST_NAMES = new Set([
  'Segina', 'Cat', 'Sam', 'Ant', 'Dad', 'Dog', 'Rat', 'Pup', 'Bug',
  'Duck', 'Fox', 'Sheep', 'Chick', 'Snake', 'Bee', 'Star', 'Owl',
]);

// The W58 graduation book prints "potato" for the FIRST time — the honorary word
// by design (MASTER_SPINE §"THE POTATO RULING"). Its letters (p-o-t-a-t-o) would
// letter-sum as decodable from ~W11, so across Levels 2–3 it must be force-failed
// until its W58 apotheosis. Level 1 (weeks ≤ 26) is grandfathered — its content is
// frozen/shipped and stays BYTE-IDENTICAL (e.g. W11's legacy "A potato in the pot?!"
// gag line decodes normally, as it did pre-Jul-12). The decree guards the
// still-unauthored Level 2/3 weeks where the graduation arc actually lives.
const POTATO_GRADUATION_WEEK = 58;
const LEVEL2_START_WEEK = 27; // first Level-2 week; potato force-fail applies from here

const VALID_SOUND_TYPES = new Set([
  'vowel', 'consonant', 'digraph',
  'blend', 'vowel-team', 'magic-e', 'r-controlled', 'diphthong', 'morphology', 'silent-letters',
]);

// ── Pattern registry (§B5.1) — CUMULATIVE graphemes taught, keyed by week ─────
// Blends (W33–37) add NOTHING — they are letter-sums by design (recombined
// known sounds). 'ck' is really available from W21 (see taughtFor); listing it at
// W30 is harmless (the FLSZ doubling formalization week).
const PATTERN_REGISTRY = {
  27: ['sh'],
  28: ['ch'],
  29: ['th'],
  30: ['ck', 'ff', 'll', 'ss', 'zz'],
  31: ['ng'],
  32: ['wh'],
  38: ['a_e'],
  39: ['i_e'],
  40: ['o_e'],
  41: ['u_e', 'e_e'],
  42: ['ce', 'ci', 'cy', 'ge', 'gi', 'gy', 'tch', 'dge'],
  43: ['ai', 'ay'],
  44: ['ee', 'ea'],
  45: ['oa', 'ow'],
  46: ['igh', 'ie'],
  47: ['ar'],
  48: ['or', 'ore'],
  49: ['er', 'ir', 'ur'],
  51: ['oo'],
  52: ['ou', 'ow'],
  53: ['oi', 'oy'],
  54: ['ew', 'ue', 'au', 'aw'],
  55: ['y'],
  56: ['kn', 'wr', 'mb'],
  57: ['ing', 'ed', 's', 'es'],
  58: ['tion'],
};

/** First week a registered pattern becomes available (Infinity if never). */
function introWeek(pat) {
  for (const [wk, pats] of Object.entries(PATTERN_REGISTRY)) {
    if (pats.includes(pat)) return Number(wk);
  }
  return Infinity;
}

// Any-position substring graphemes whose letters are all known early but whose
// SOUND is a rule the child hasn't met — letter-sums would false-pass them. Their
// gate week comes from the registry. (Doublings + kn/wr/mb + magic-e + y-final are
// handled separately below with position/activation rules.)
const GATE_ANY = [
  'sh', 'ch', 'th', 'wh', 'ng',
  'ce', 'ci', 'cy', 'ge', 'gi', 'gy',
  'tch', 'dge', 'igh', 'ie',
  'ai', 'ay', 'ee', 'ea', 'oa', 'ow',
  'ar', 'or', 'ore', 'er', 'ir', 'ur',
  'oo', 'ou', 'oi', 'oy', 'ew', 'ue', 'au', 'aw',
  'tion',
];
const DOUBLINGS = ['ff', 'll', 'ss', 'zz'];

// Irregular / hard-exception words: they read by letter-sum, NOT by the pattern
// rule their spelling superficially matches, so they bypass the substring gate.
// This protects Level 1's own STRICT words ("are", "get") — byte-identical — and
// the common hard-g / irregular-magic-e words at Levels 2–3. Extend as Phase C
// authoring surfaces new hard-g exceptions.
const GATE_EXEMPT = new Set([
  // irregular VCe / heart words (would trip magic-e or ar/er gates):
  'are', 'have', 'give', 'live', 'love', 'come', 'some', 'done', 'gone', 'none',
  'one', 'were', 'where', 'there', 'here', 'was', 'what',
  // hard-g before e/i/y (would trip the soft-g gate):
  'get', 'gets', 'getting', 'given', 'giving', 'gift', 'gifts', 'gifted',
  'girl', 'girls', 'gig', 'gigs', 'geese', 'gear', 'gears', 'geek', 'gecko',
  'tiger', 'tigers', 'finger', 'fingers', 'anger', 'target', 'targets',
  'together', 'forget', 'forgets', 'begin', 'begins', 'gill', 'gills',
]);

/** Magic-e (split-vce) week for a word ending V-consonant(s)-e, else 0. */
function magicEWeek(w) {
  const m = w.match(/([aeiou])[^aeiou]{1,2}e$/);
  if (!m) return 0;
  const v = m[1];
  return v === 'a' ? 38 : v === 'i' ? 39 : v === 'o' ? 40 : 41; // u_e & e_e both W41
}

/** The FORBIDDEN-BEFORE gate (§B5.3). true = no un-taught pattern present. */
function gatePasses(w, week) {
  if (GATE_EXEMPT.has(w)) return true;
  for (const p of GATE_ANY) {
    if (w.includes(p) && introWeek(p) > week) return false;
  }
  // Doublings — enforced only from Level 2 (W ≥ 27). At Level 1 a double reads as
  // its single letter, so "buzz"@26 stays decodable (byte-identical).
  if (week >= 27) {
    for (const dp of DOUBLINGS) {
      if (w.includes(dp) && 30 > week) return false;
    }
  }
  // Silent letters — position-sensitive (kn/wr initial, mb final; all W56).
  if ((w.startsWith('kn') || w.startsWith('wr')) && 56 > week) return false;
  if (w.endsWith('mb') && 56 > week) return false;
  // Magic-e.
  const me = magicEWeek(w);
  if (me && me > week) return false;
  // Terminal y as a vowel (consonant + y at word end; ay/oy/ey are teams, gated
  // above via GATE_ANY). W55.
  if (/[^aeiou]y$/.test(w) && 55 > week) return false;
  return true;
}

/** Letters + contiguous graphemes available for POSITIVE consumption ≤ week. */
function taughtFor(week) {
  const slice = SPINE.slice(0, week);
  const singles = new Set(slice.filter((s) => s.length === 1));
  const multi = new Set();
  if (slice.includes('qu')) multi.add('qu');
  if (week >= 21) multi.add('ck'); // ck taught with k (W21)
  for (const [wk, pats] of Object.entries(PATTERN_REGISTRY)) {
    if (Number(wk) <= week) {
      for (const p of pats) if (!p.includes('_')) multi.add(p); // '_' patterns letter-sum
    }
  }
  return { singles, multi };
}

/** Greedy longest-match consumption of a word over taught graphemes. */
function greedyConsume(w, multiSorted, singles) {
  let i = 0;
  while (i < w.length) {
    let matched = false;
    for (const p of multiSorted) {
      if (w.startsWith(p, i)) { i += p.length; matched = true; break; }
    }
    if (matched) continue;
    if (singles.has(w[i])) { i += 1; continue; }
    return false;
  }
  return true;
}

/**
 * Suffix bases for a word (§B5.2): strip a taught suffix, then offer the base
 * (plus doubling-collapse "runn"→"run" and e-restore "bak"→"bake") as decode
 * candidates. Only active once the suffix's week is reached (ing/ed/s/es W57,
 * tion W58) — never fires at Level 1.
 */
function suffixBases(w, week) {
  const bases = [];
  const strips = [];
  if (week >= 58 && w.endsWith('tion') && w.length > 4) strips.push(['tion', w.slice(0, -4)]);
  if (week >= 57) {
    if (w.endsWith('ing') && w.length > 3) strips.push(['ing', w.slice(0, -3)]);
    if (w.endsWith('ed') && w.length > 2) strips.push(['ed', w.slice(0, -2)]);
    if (w.endsWith('es') && w.length > 2) strips.push(['es', w.slice(0, -2)]);
    if (w.endsWith('s') && w.length > 1) strips.push(['s', w.slice(0, -1)]);
  }
  for (const [suf, base] of strips) {
    bases.push(base);
    // doubling-collapse: a doubled final consonant → single (running → run).
    const last = base[base.length - 1];
    if (base.length >= 2 && last === base[base.length - 2] && !'aeiou'.includes(last)) {
      bases.push(base.slice(0, -1));
    }
    // e-restore: -ing/-ed dropped a silent e (baking → bake, hoped → hope).
    if (suf === 'ing' || suf === 'ed') bases.push(base + 'e');
  }
  return bases;
}

/** POSITIVE decomposition — every part must be taught by week. */
function positiveDecode(w, week) {
  const { singles, multi } = taughtFor(week);
  const multiSorted = [...multi].sort((a, b) => b.length - a.length);
  if (greedyConsume(w, multiSorted, singles)) return true;
  for (const base of suffixBases(w, week)) {
    if (base && isDecodable(base, week)) return true;
  }
  return false;
}

/** Can this bare token be read at `week`? Gate (false-pass) + positive (taught). */
function isDecodable(token, week) {
  const w = String(token).toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return true;
  if (!gatePasses(w, week)) return false;
  return positiveDecode(w, week);
}

function tokenize(str) {
  return String(str).split(/\s+/).map((t) => t.replace(/[^a-zA-Z]/g, '').toLowerCase()).filter(Boolean);
}

/**
 * Build the cumulative allow-sets for `week` from every spec at week ≤ week.
 *   glue         — union of glue.new ∪ glue.known (STRICT fields may use these)
 *   pictureVocab — union of soundBasket ∪ oralWords ∪ newWords ∪ reviewBank
 */
function cumulativeContext(specsByWeek, week) {
  const glue = new Set();
  const pictureVocab = new Set();
  for (const [wk, s] of specsByWeek) {
    if (wk > week) continue;
    for (const g of [...(s.glue?.new ?? []), ...(s.glue?.known ?? [])]) {
      for (const t of tokenize(g)) glue.add(t);
    }
    for (const w of [
      ...(s.soundBasket ?? []),
      ...(s.oralWords ?? []),
      ...(s.newWords ?? []),
      ...(s.reviewBank ?? []),
    ]) {
      for (const t of tokenize(w)) pictureVocab.add(t);
    }
  }
  return { glue, pictureVocab };
}

/** Whitespace-split tokenizer that PRESERVES case (strips punctuation only). The
 * cast-name exemption needs the original capitalization; lowercasing happens per
 * check inside evaluateToken. */
function tokenizeCased(str) {
  return String(str).split(/\s+/).map((t) => t.replace(/[^a-zA-Z]/g, '')).filter(Boolean);
}

/**
 * Decide whether a single (case-preserved, punctuation-stripped) token is allowed
 * in a field at `week`. Returns true = allowed, false = violation.
 *
 * Order matters:
 *   1. allow-lists (character names, glue, pictureVocab) — existing behavior;
 *   2. POTATO decree — force-fail before W58 even though letters letter-sum
 *      (must sit AFTER the pictureVocab allowance so Level 1's bingoPool potato
 *      stays green — it's a picture tile, not printed decodable text);
 *   3. normal pattern-aware decodability on the LOWERCASED form (contract: "FIRST
 *      attempt normal decodability");
 *   4. cast-name exemption on the ORIGINAL token, CASE-SENSITIVE ("ONLY if that
 *      fails, check whether the original token exactly matches a CAST_NAMES entry").
 *
 * @param extraAllowed  a Set of extra allowed lowercase tokens (pictureVocab) or null.
 */
function evaluateToken(origTok, week, glue, extraAllowed) {
  const lowTok = origTok.toLowerCase();
  if (!lowTok) return true;
  if (CHARACTER_NAMES.has(lowTok)) return true;
  if (glue && glue.has(lowTok)) return true;
  if (extraAllowed && extraAllowed.has(lowTok)) return true;
  // Potato graduation decree — exempt at W58+ ONLY; force-fail across Levels 2–3
  // (weeks 27–57) even though its letters letter-sum. Level 1 (weeks ≤ 26) is
  // grandfathered and falls through to normal decodability (byte-identical).
  if (lowTok === 'potato') {
    if (week >= POTATO_GRADUATION_WEEK) return true;
    if (week >= LEVEL2_START_WEEK) return false;
    // else Level 1 — fall through to normal decodability below.
  }
  // Normal pattern-aware decodability FIRST.
  if (isDecodable(lowTok, week)) return true;
  // Cast-name exemption — case-sensitive, only after decodability fails.
  if (CAST_NAMES.has(origTok)) return true;
  return false;
}

/**
 * Check a phrase against a field's rules.
 * @param extraAllowed  a Set of extra allowed tokens (pictureVocab) or null.
 */
function checkWord(rawWord, week, glue, extraAllowed, violations, field) {
  for (const origTok of tokenizeCased(rawWord)) {
    if (!evaluateToken(origTok, week, glue, extraAllowed)) {
      violations.push({ field, word: origTok.toLowerCase(), from: rawWord });
    }
  }
}

/** Structural checks (§B5.4). Level 1 never trips these (byte-identical). */
function structuralChecks(spec) {
  const issues = [];
  const week = spec.week;
  const level = spec.level;
  if (level !== 1 && level !== 2 && level !== 3) {
    issues.push(`invalid level ${JSON.stringify(level)} (expected 1 | 2 | 3)`);
  }
  if (!VALID_SOUND_TYPES.has(spec.soundType)) {
    issues.push(`invalid soundType ${JSON.stringify(spec.soundType)}`);
  }
  if (level === 2 || level === 3) {
    const s = String(spec.sound ?? '');
    if ((s.includes('_') || s.replace(/\s+/g, '').length > 2) && !spec.patternDisplay) {
      issues.push(`pattern sound "${s}" requires patternDisplay`);
    }
    const sched = PATTERN_REGISTRY[week];
    if (sched) {
      const norm = (x) => String(x ?? '').trim().toLowerCase();
      // Audit fix (Jul 12): check `sound` unconditionally — an OR against patternDisplay
      // masked sound typos (the one structural net meant to catch Phase-C copy-paste errors).
      // patternDisplay is only consulted when sound itself is empty/absent.
      const soundOk = norm(spec.sound)
        ? sched.includes(norm(spec.sound))
        : sched.includes(norm(spec.patternDisplay));
      if (!soundOk) {
        issues.push(`sound "${spec.sound}" not in registry schedule [${sched.join(', ')}] for week ${week}`);
      }
    }
  }
  return issues;
}

function validateWeek(spec, ctx) {
  const warnings = [];
  const violations = [];
  const week = spec.week;

  // Structure sanity (warnings only).
  if (week >= 2 && Array.isArray(spec.songs) && spec.songs.length !== 2) {
    warnings.push(`expected 2 songs from W2 on, found ${spec.songs.length}`);
  }
  if (week === 1 && Array.isArray(spec.songs) && spec.songs.length !== 1) {
    warnings.push(`Week 1 should ship exactly 1 song, found ${spec.songs.length}`);
  }
  if (!spec.book) warnings.push('missing book');

  const readAloud = spec.book?.readAloud === true;

  // Asset-manifest completeness (warnings). Every book image referenced should
  // be declared in assets[] (matched by parsed word). Empty image = wordless.
  const manifestWords = new Set();
  for (const a of spec.assets ?? []) {
    const stem = String(a.file || '').replace(/\.[^.]+$/, '').replace(/^\d+[-_\s]+/, '').replace(/[-_\s]coloring$/, '').replace(/[-_\s]+/g, ' ').trim().toLowerCase();
    if (stem) manifestWords.add(stem);
  }
  for (const sp of spec.book?.spreads ?? []) {
    // Canonical key form (matches parseAssetFilename / normalizeAssetKey): collapse
    // hyphens/underscores/whitespace → one space so "moon-on-mat" matches the manifest.
    const img = String(sp.image || '').toLowerCase().replace(/[-_\s]+/g, ' ').trim();
    if (img && !manifestWords.has(img)) warnings.push(`book spread ${sp.n} image "${sp.image}" not in assets[]`);
  }

  // Structural checks (count toward failure; Level 1 never trips these).
  const structural = structuralChecks(spec);

  // Decodability — decoding weeks only.
  if (!readAloud) {
    const { glue, pictureVocab } = ctx;
    const m = spec.materials ?? {};

    // STRICT fields — glue + character names + decodable ONLY.
    for (const sp of spec.book?.spreads ?? []) {
      checkWord(sp.text ?? '', week, glue, null, violations, `book:${sp.n}`);
    }
    (m.sentences ?? []).forEach((w) => checkWord(w, week, glue, null, violations, 'sentences'));
    (m.tracing?.words ?? []).forEach((w) => checkWord(w, week, glue, null, violations, 'tracing.words'));
    (m.dictionary ?? []).forEach((w) => checkWord(w, week, glue, null, violations, 'dictionary'));

    // PICTURE-VOCAB fields — additionally allow cumulative picture vocabulary.
    (m.threePartCards ?? []).forEach((w) => checkWord(w, week, glue, pictureVocab, violations, 'threePartCards'));
    (m.matching ?? []).forEach((w) => checkWord(w, week, glue, pictureVocab, violations, 'matching'));
    (m.bingoPool ?? []).forEach((w) => checkWord(w, week, glue, pictureVocab, violations, 'bingoPool'));
    (m.coloring ?? []).forEach((w) => checkWord(w, week, glue, pictureVocab, violations, 'coloring'));
  }

  return { warnings, violations, structural, readAloud };
}

// ── B5.6 in-file self-test fixtures ─────────────────────────────────────────
function runSelfTest() {
  const FIXTURES = [
    ['ship', 27, true], ['ship', 26, false],
    ['catch', 42, true], ['catch', 41, false],
    ['cake', 38, true], ['cake', 37, false],
    ['ice', 42, true], ['ice', 41, false],
    ['night', 46, true], ['night', 45, false],
    ['running', 57, true],
    ['celebration', 58, true],
    ['my', 55, true], ['my', 54, false],
    ['know', 56, true], ['know', 45, false],
    ['hand', 36, true],
    ['bell', 30, true], ['bell', 29, false],
    // Cast-name exemption (case-sensitive) + potato graduation decree.
    ['Sheep', 27, true], ['sheep', 27, false],
    ['potato', 58, true], ['potato', 57, false],
  ];
  console.log('\n🧪 Validator self-test (§B5.6)\n');
  let failed = 0;
  for (const [word, week, expected] of FIXTURES) {
    const got = evaluateToken(word, week, null, null);
    const ok = got === expected;
    if (!ok) failed++;
    console.log(`  ${ok ? '✓' : '✗'} ${word}@${week} → ${got ? 'decodable' : 'blocked'} (expected ${expected ? 'decodable' : 'blocked'})`);
  }
  console.log('');
  if (failed > 0) {
    console.log(`❌ ${failed} self-test fixture(s) FAILED\n`);
    process.exit(1);
  }
  console.log('✅ All self-test fixtures pass.\n');
  process.exit(0);
}

function main() {
  if (process.argv.includes('--self-test')) return runSelfTest();

  if (!fs.existsSync(SPEC_DIR)) {
    console.error(`spec dir not found: ${SPEC_DIR}`);
    process.exit(2);
  }
  const files = fs.readdirSync(SPEC_DIR).filter((f) => /^week-\d+\.json$/.test(f)).sort();
  if (files.length === 0) {
    console.log('No week-NN.json files found yet — nothing to validate.');
    process.exit(0);
  }

  // Load every spec first — cumulative glue + picture vocab need earlier weeks.
  const specsByWeek = new Map();
  const parsed = [];
  let parseFailures = 0;
  for (const f of files) {
    let spec;
    try {
      spec = JSON.parse(fs.readFileSync(path.join(SPEC_DIR, f), 'utf8'));
    } catch (e) {
      console.log(`✗ ${f}: invalid JSON — ${e.message}`);
      parseFailures++;
      continue;
    }
    parsed.push({ f, spec });
    if (typeof spec.week === 'number') specsByWeek.set(spec.week, spec);
  }

  let totalViolations = 0;
  let totalStructural = 0;
  console.log(`\n📚 Decodability validation — ${parsed.length} authored week(s)\n`);

  for (const { f, spec } of parsed) {
    const ctx = cumulativeContext(specsByWeek, spec.week);
    const { warnings, violations, structural, readAloud } = validateWeek(spec, ctx);
    const tag = readAloud ? '(read-aloud — decodability exempt)' : '(decoding week)';
    if (violations.length === 0 && structural.length === 0) {
      console.log(`✓ ${f}  Week ${spec.week} /${spec.sound}/ ${tag}`);
    } else {
      totalViolations += violations.length;
      totalStructural += structural.length;
      const parts = [];
      if (violations.length) parts.push(`${violations.length} decodability`);
      if (structural.length) parts.push(`${structural.length} structural`);
      console.log(`✗ ${f}  Week ${spec.week} /${spec.sound}/ — ${parts.join(' + ')} issue(s):`);
      for (const v of violations) {
        console.log(`    · [${v.field}] "${v.word}"${v.from !== v.word ? ` (in "${v.from}")` : ''} not decodable by week ${spec.week}`);
      }
      for (const s of structural) {
        console.log(`    · [structure] ${s}`);
      }
    }
    if (VERBOSE && warnings.length) {
      for (const w of warnings) console.log(`    ⚠ ${w}`);
    }
  }

  console.log('');
  if (parseFailures > 0 || totalViolations > 0 || totalStructural > 0) {
    if (totalViolations > 0) console.log(`❌ ${totalViolations} decodability violation(s) — FAILED`);
    if (totalStructural > 0) console.log(`❌ ${totalStructural} structural issue(s) — FAILED`);
    if (parseFailures > 0) console.log(`❌ ${parseFailures} spec(s) failed to parse — FAILED`);
    console.log('');
    process.exit(1);
  }
  console.log('✅ All authored weeks pass decodability.\n');
  process.exit(0);
}

main();
