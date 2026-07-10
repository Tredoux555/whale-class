#!/usr/bin/env node
/**
 * scripts/curriculum/validate-specs.mjs — the decodability gate.
 *
 * Implements PLAN_CURRICULUM_STUDIO_JUL10.md §8b amendment #1 exactly.
 *
 * readAloud weeks (book.readAloud === true, W1–3) are EXEMPT — a child is not
 * decoding yet; the materials are vocabulary/pictures.
 *
 * For a DECODING week (book.readAloud === false):
 *
 *   STRICT fields — book.spreads[].text (W4+), materials.sentences,
 *   materials.tracing.words, materials.dictionary:
 *     every word must be, token by token, EITHER
 *       (a) decodable with letters taught ≤ this week (spine order, + ck/qu
 *           digraphs once available), OR
 *       (b) a CUMULATIVE glue word — union of glue.new ∪ glue.known across ALL
 *           weeks ≤ this week (glue is introduced once and stays known), OR
 *       (c) an allowed character name (Segina, Sam — known by heart).
 *
 *   PICTURE-VOCAB fields — materials.threePartCards, materials.matching,
 *   materials.bingoPool, materials.coloring:
 *     ADDITIONALLY allow the CUMULATIVE union of
 *       soundBasket ∪ oralWords ∪ newWords ∪ reviewBank
 *     across ALL weeks ≤ this week (the child matches these to images; decoding
 *     is a bonus, not required).
 *
 * THE IRON RULE: in a decoding week, a child never meets an undecodable word in
 * a STRICT field.
 *
 * Exit 1 on any decodability violation. Manifest/structure issues are warnings.
 *
 * Usage: node scripts/curriculum/validate-specs.mjs [--verbose]
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

/** Letters + digraphs decodable by the end of `week`. */
function taughtFor(week) {
  const slice = SPINE.slice(0, week);
  const singles = new Set(slice.filter((s) => s.length === 1));
  const digraphs = new Set();
  if (slice.includes('qu')) digraphs.add('qu');
  if (week >= 21) digraphs.add('ck'); // ck taught with k (W21)
  return { singles, digraphs };
}

/** Can this bare token be sounded out with letters taught ≤ week? */
function decodableToken(token, week) {
  const w = token.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return true;
  const { singles, digraphs } = taughtFor(week);
  let i = 0;
  while (i < w.length) {
    const two = w.slice(i, i + 2);
    if (digraphs.has(two)) { i += 2; continue; }
    if (singles.has(w[i])) { i += 1; continue; }
    return false;
  }
  return true;
}

function tokenize(str) {
  return String(str).split(/\s+/).map((t) => t.replace(/[^a-zA-Z]/g, '').toLowerCase()).filter(Boolean);
}

/**
 * Build the cumulative allow-sets for `week` from every spec at week ≤ week.
 *   glue         — union of glue.new ∪ glue.known (STRICT fields may use these)
 *   pictureVocab — union of soundBasket ∪ oralWords ∪ newWords ∪ reviewBank
 *                  (PICTURE-VOCAB fields may ADDITIONALLY use these)
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

/**
 * Check a phrase against a field's rules.
 * @param extraAllowed  a Set of extra allowed tokens (pictureVocab) or null.
 */
function checkWord(rawWord, week, glue, extraAllowed, violations, field) {
  for (const tok of tokenize(rawWord)) {
    if (CHARACTER_NAMES.has(tok)) continue;
    if (glue.has(tok)) continue;
    if (extraAllowed && extraAllowed.has(tok)) continue;
    if (!decodableToken(tok, week)) {
      violations.push({ field, word: tok, from: rawWord });
    }
  }
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

  return { warnings, violations, readAloud };
}

function main() {
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
  console.log(`\n📚 Decodability validation — ${parsed.length} authored week(s)\n`);

  for (const { f, spec } of parsed) {
    const ctx = cumulativeContext(specsByWeek, spec.week);
    const { warnings, violations, readAloud } = validateWeek(spec, ctx);
    const tag = readAloud ? '(read-aloud — decodability exempt)' : '(decoding week)';
    if (violations.length === 0) {
      console.log(`✓ ${f}  Week ${spec.week} /${spec.sound}/ ${tag}`);
    } else {
      totalViolations += violations.length;
      console.log(`✗ ${f}  Week ${spec.week} /${spec.sound}/ — ${violations.length} decodability violation(s):`);
      for (const v of violations) {
        console.log(`    · [${v.field}] "${v.word}"${v.from !== v.word ? ` (in "${v.from}")` : ''} not decodable by week ${spec.week}`);
      }
    }
    if (VERBOSE && warnings.length) {
      for (const w of warnings) console.log(`    ⚠ ${w}`);
    }
  }

  console.log('');
  if (parseFailures > 0 || totalViolations > 0) {
    if (totalViolations > 0) console.log(`❌ ${totalViolations} decodability violation(s) — FAILED`);
    if (parseFailures > 0) console.log(`❌ ${parseFailures} spec(s) failed to parse — FAILED`);
    console.log('');
    process.exit(1);
  }
  console.log('✅ All authored weeks pass decodability.\n');
  process.exit(0);
}

main();
