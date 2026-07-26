/**
 * scripts/curriculum/lib/word-source.mjs — "letter s" → a WeekSpec.
 *
 * make-material.mjs can be asked for a letter, a pattern, or a bare word list.
 * This module turns any of those into something the render engine accepts.
 *
 * TWO paths, and the order matters:
 *   1. CURRICULUM (preferred) — a letter that a week already teaches loads that
 *      week's spec UNCHANGED. Word lists, sentences, bingo pool and tracing rows
 *      are the authored, decodability-validated ones, so a card printed here is
 *      byte-identical to the same card printed from the Studio or build-week.mjs.
 *   2. SYNTHESISED — an arbitrary word list, or a letter no week covers, gets a
 *      minimal spec built here. Every field the thirteen builders read is filled
 *      with a safe default so no builder can throw on a missing branch.
 */

import fs from 'fs';
import path from 'path';

/** Digraphs that hijack a single letter's sound: "shop" is not an /s/ word. */
const HIJACKING_DIGRAPHS = ['sh', 'ch', 'th', 'wh', 'ph', 'ck', 'qu'];
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

/** Read every week-NN.json / intro-week-*.json header in the spec directory. */
export function loadWeekIndex(specDir) {
  const out = [];
  let names;
  try { names = fs.readdirSync(specDir); } catch { return out; }
  for (const name of names.sort()) {
    if (!/^week-\d+\.json$/.test(name)) continue;
    const p = path.join(specDir, name);
    try {
      const d = JSON.parse(fs.readFileSync(p, 'utf8'));
      out.push({
        week: d.week,
        sound: String(d.sound ?? ''),
        letterDisplay: String(d.letterDisplay ?? ''),
        soundType: d.soundType,
        level: d.level,
        file: name,
        path: p,
      });
    } catch { /* unreadable spec — skip, never fatal */ }
  }
  return out;
}

/** "k, ck" → ["k","ck"];  "ee ea" → ["ee","ea"]. */
function soundTokens(s) {
  return String(s).toLowerCase().split(/[,/]|\s+/).map((t) => t.trim()).filter(Boolean);
}

/**
 * Find the week that teaches `letter`. Exact whole-sound match wins, then the
 * primary (first) token, then any token, then the display label — so "ck" lands
 * on the week whose sound IS "ck" rather than the earlier "k, ck" week.
 */
export function findWeekForLetter(index, letter) {
  const q = String(letter).toLowerCase().trim();
  if (!q) return null;
  const tiers = [
    (w) => w.sound.toLowerCase().trim() === q,
    (w) => soundTokens(w.sound)[0] === q,
    (w) => soundTokens(w.sound).includes(q),
    (w) => w.letterDisplay.toLowerCase().replace(/\s+/g, '') === q,
    (w) => soundTokens(w.letterDisplay).includes(q),
  ];
  for (const test of tiers) {
    const hits = index.filter(test).sort((a, b) => a.week - b.week);
    if (hits.length) return hits[0];
  }
  return null;
}

/** Load a full spec from the index entry. */
export function loadWeekSpec(entry) {
  return JSON.parse(fs.readFileSync(entry.path, 'utf8'));
}

/**
 * Pick words for a letter from whatever pictures actually exist locally.
 * Used when no authored week covers the letter (or --auto-words is asked for).
 *
 * Ranking is pedagogical, not alphabetical: a letter followed by a vowel
 * ("sun", "sock") is a cleaner initial-sound example than a blend ("stop"),
 * and short words beat long ones.
 */
export function pickWordsForLetter(letter, availableWords, limit = 8) {
  const L = String(letter).toLowerCase().trim();
  if (!L) return [];
  const isSingle = L.length === 1;

  const candidates = [...availableWords]
    .filter((w) => /^[a-z]+$/.test(w))
    .filter((w) => w.startsWith(L))
    .filter((w) => w.length > L.length)
    .filter((w) => {
      if (!isSingle) return true;
      // "shop" must not be offered as an /s/ word.
      const pair = w.slice(0, 2);
      return !HIJACKING_DIGRAPHS.includes(pair) || pair === L;
    });

  const score = (w) => {
    const next = w[L.length] ?? '';
    let s = 0;
    if (VOWELS.has(next)) s -= 100;          // letter + vowel: the clean case
    if (w.length <= 4) s -= 20;              // short words first
    s += w.length;
    return s;
  };

  return candidates
    .sort((a, b) => score(a) - score(b) || (a < b ? -1 : 1))
    .slice(0, limit);
}

/** Sentences for a synthesised spec: the frame with each word slotted in. */
function makeSentences(words, frame) {
  if (!frame || !frame.includes('___')) return [];
  return words.slice(0, 6).map((w) => {
    const article = /^[aeiou]/.test(w) ? 'an' : 'a';
    return frame.replace(/\ba ___/, `${article} ${w}`).replace('___', w);
  });
}

/**
 * Build a minimal but COMPLETE WeekSpec. Every field the builders touch is
 * present, so `buildMaterial` can never fall off a missing branch.
 */
export function synthesiseSpec({
  words,
  letter = '',
  label = '',
  sentences = null,
  frame = 'I see a ___.',
  soundType = 'consonant',
  level = 1,
  week = 0,
}) {
  const list = words.map((w) => String(w).toLowerCase().trim()).filter(Boolean);
  const uniq = [...new Set(list)];
  const display = label || (letter ? `${letter.charAt(0).toUpperCase()}${letter.slice(1)}${letter.length === 1 ? letter : ''}` : 'Words');
  const sents = sentences && sentences.length ? sentences : makeSentences(uniq, frame);

  // A bingo board is 4×4; pad a short list by repeating rather than leaving holes.
  const bingoPool = uniq.length >= 16 ? uniq : uniq;

  return {
    week,
    level,
    sound: letter || display.toLowerCase(),
    letterDisplay: display,
    displayName: label || undefined,
    soundType,
    anchorWord: uniq[0] ?? '',
    newWords: uniq.slice(0, 4),
    reviewBank: [],
    glue: { new: [], known: [] },
    oralWords: [],
    sentenceFrame: frame,
    soundBasket: [],
    cast: { introduces: null, present: [] },
    celebration: null,
    vowelLights: null,
    songs: [],
    book: { title: display, readAloud: false, spreads: [], backCoverWords: uniq },
    materials: {
      threePartCards: uniq,
      sentences: sents,
      matching: uniq.slice(0, 6),
      bingoPool,
      tracing: { letter: letter || (uniq[0]?.[0] ?? 'a'), words: uniq.slice(0, 4) },
      coloring: uniq.slice(0, 3),
      dictionary: uniq,
    },
    // Declaring assets lets assetGapReport tell us exactly which pictures are
    // still missing, the same contract the authored weeks get.
    assets: uniq.map((w) => ({
      file: `${w}.png`,
      usedBy: ['cards', 'bingo', 'matching'],
      mjPrompt: `a single ${w}, ultra-realistic photograph, single subject centered, dramatic spotlight on deep forest-green backdrop, soft shadows, cinematic, slightly whimsical --ar 3:2 --style raw`,
    })),
    teacherFocus: label || `Initial sound /${letter}/`,
    lessonMapEquivalents: [],
  };
}
