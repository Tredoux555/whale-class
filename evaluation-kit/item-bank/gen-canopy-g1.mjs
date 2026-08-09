#!/usr/bin/env node
/**
 * gen-canopy-g1.mjs — the Montree Canopy (band G1) content run.
 *
 * ONE-OFF AUTHORING SPLICE, committed for the record. It is NOT the stale gen/build.mjs
 * generator (see gen/DO_NOT_RUN.md): it does not regenerate the bank from scratch and it
 * never rewrites A3/A4/A5 content. It only:
 *
 *   1. appends the G1 (Montree Canopy, ages 6–7) records to the five authored files,
 *   2. appends six A5 `extension` milestones whose evidence sits in G1 — which is what
 *      finally makes "exceeded" reachable at A5 (scoring.ts counts secure extension
 *      milestones declared at the child's own band),
 *   3. applies the three verified crosswalk corrections from research/k-standards.md
 *      (ATL-B → P-ATL 10/11, ATL-C → P-ATL 9/8, COG-D eyfsElg null → 'Numerical Patterns'),
 *   4. bumps bankVersion 1.10.0 → 1.11.0 in all five headers.
 *
 * It is idempotent: re-running it detects the G1 records already present and refuses.
 *
 * AFTERWARDS, in order:
 *   node evaluation-kit/item-bank/validate.mjs
 *   node scripts/evaluation/merge-item-bank.mjs
 *   node evaluation-kit/gen-d2-projection.mjs && node evaluation-kit/build-d2.mjs
 *
 * ── WHAT G1 IS ──────────────────────────────────────────────────────────────────
 * A SECOND TIER of the same instrument, not a second instrument: same 6 domains, same
 * 28 strands, same Emerging/Developing/Secure model, same suppression posture, same
 * report. 56 milestones (28 direct-tested, 28 teacher-observed), mirroring the
 * kindergarten per-band shape exactly.
 *
 * ── CROSSWALK BASIS AT G1 ───────────────────────────────────────────────────────
 * ELOF is a birth-to-five framework and EYFS ends at Reception; neither covers Grade 1,
 * and the China MoE 3–6 Guide stops at six. Carrying a preschool code on a Grade-1
 * milestone would be an invented citation, so G1 milestones carry `elof: []`,
 * `eyfs: {area:null,band:null,elg:null}` and `chinaMoe: null`, and carry instead
 * `ccss` (US Common Core Grade 1) and `ukNc` (UK National Curriculum, Year 1 / KS1).
 * Same discipline, different licensed frameworks. The validator's R8 knows about this.
 *
 * ── VOCABULARY ──────────────────────────────────────────────────────────────────
 * The word "grade" is on the forbidden register (ARCHITECTURE §0). Nothing authored
 * here says "Grade 1" in a child-, parent- or teacher-facing string: the tier's public
 * name is Montree Canopy, everywhere.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const FILES = ['milestones.json', 'items-core.json', 'items-efl.json', 'observation.json', 'stimuli.json'];
const bank = Object.fromEntries(FILES.map((f) => [f, JSON.parse(readFileSync(join(DIR, f), 'utf8'))]));

const NEW_VERSION = '1.11.0';
const OLD_VERSION = '1.10.0';

if (bank['milestones.json'].milestones.some((m) => m.ageBand === 'G1')) {
  console.error('gen-canopy-g1: the bank already carries G1 records — nothing to do.');
  process.exit(1);
}

/* ═══════════════════════════════════════════════════════════ 1. STIMULI ═══════ */

const newStimuli = [];
const have = new Set(bank['stimuli.json'].stimuli.map((s) => s.id));
const symId = (id) => 'sym-' + id.replace(/^ST\./, '').replace(/[._]/g, '-').toLowerCase();

const push = (s) => { if (!have.has(s.id)) { have.add(s.id); newStimuli.push(s); } return s.id; };

const INK = '#12100e';
const PAPER = '#fdfcf7';
const SAND = '#d9c7a5';

/** A printed word or sentence, drawn exactly like the existing ST.word.* records. */
function textStim(id, text, kind, labelEn, labelZh, altEn, altZh, fontSize, tags) {
  return push({
    id,
    kind,
    label: { en: labelEn, zh: labelZh },
    altText: { en: altEn, zh: altZh },
    render: {
      svgSymbolId: symId(id),
      viewBox: '0 0 100 100',
      svg: `<rect x="4" y="26" width="92" height="48" rx="6" fill="${PAPER}" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`
        + `<text x="50" y="50" font-family="Andika, Comic Sans MS, Verdana, sans-serif" font-size="${fontSize}" fill="${INK}" text-anchor="middle" dominant-baseline="central">${text}</text>`,
      printMinMm: 60,
      monochromeSafe: true,
    },
    tags,
  });
}

const word = (w) => {
  const id = `ST.word.${w}`;
  if (have.has(id)) return id;
  return textStim(id, w, 'word', `the word ${w}`, `单词 ${w}`, `the printed word ${w}`, `单词 ${w}`, 30, ['words']);
};

/** A printed sentence. `kind: 'word'` — the bank's kind for printed text a child reads. */
const sentence = (slug, text, zh) => {
  const id = `ST.sent.g1.${slug}`;
  if (have.has(id)) return id;
  return push({
    id,
    kind: 'word',
    label: { en: `the sentence: ${text}`, zh: `句子：${zh}` },
    altText: { en: `the printed sentence ${text}`, zh: `印出的句子：${zh}` },
    render: {
      svgSymbolId: symId(id),
      viewBox: '0 0 100 100',
      svg: `<rect x="3" y="30" width="94" height="40" rx="6" fill="${PAPER}" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`
        + `<text x="50" y="50" font-family="Andika, Comic Sans MS, Verdana, sans-serif" font-size="9" fill="${INK}" text-anchor="middle" dominant-baseline="central">${text}</text>`,
      printMinMm: 60,
      monochromeSafe: true,
    },
    tags: ['sentences'],
  });
};

const numeral = (n) => {
  const id = `ST.num.${n}`;
  if (have.has(id)) return id;
  return textStim(id, String(n), 'numeral', `the numeral ${n}`, `数字 ${n}`, `the numeral ${n}`, `数字 ${n}`, String(n).length > 2 ? 30 : 38, ['numerals']);
};

/** A two-letter grapheme card (sh / ch / th / ng / ck / qu). */
const digraph = (d, zh) => {
  const id = `ST.dig.${d}`;
  if (have.has(id)) return id;
  return textStim(id, d, 'letter', `the letters ${d}`, `字母组合 ${d}`, `the two letters ${d}`, `两个字母 ${d}`, 34, ['letters', 'digraphs']);
};

/* ── clock faces ─────────────────────────────────────────────────────────────────
 * Drawn with tick marks and two hands and NO digits: a labelled face would make the
 * stimulus a reading item, and R3 forbids text on a non-letter/word/numeral kind.
 * The child is told the time and taps the face, so nothing has to be read. */
function clock(h, m) {
  const id = `ST.clock.${h}_${String(m).padStart(2, '0')}`;
  if (have.has(id)) return id;
  const pt = (angleDeg, r) => {
    const a = (angleDeg - 90) * Math.PI / 180;
    return [50 + r * Math.cos(a), 50 + r * Math.sin(a)].map((v) => v.toFixed(1));
  };
  let ticks = '';
  for (let i = 0; i < 12; i++) {
    const long = i % 3 === 0;
    const [x1, y1] = pt(i * 30, long ? 32 : 36);
    const [x2, y2] = pt(i * 30, 41);
    ticks += `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${INK}" stroke-width="${long ? 3 : 1.8}" stroke-linecap="round"/>`;
  }
  const minuteAngle = m * 6;
  const hourAngle = ((h % 12) + m / 60) * 30;
  const [mx, my] = pt(minuteAngle, 34);
  const [hx, hy] = pt(hourAngle, 22);
  return push({
    id,
    kind: 'shape',
    label: { en: `a clock showing ${clockWords(h, m).en}`, zh: `显示${clockWords(h, m).zh}的钟` },
    altText: { en: `a clock face with the hands at ${clockWords(h, m).en}`, zh: `指针指向${clockWords(h, m).zh}的钟面` },
    render: {
      svgSymbolId: symId(id),
      viewBox: '0 0 100 100',
      svg: `<circle cx="50" cy="50" r="46" fill="${PAPER}" stroke="${INK}" stroke-width="3"/>${ticks}`
        + `<path d="M50 50 L${hx} ${hy}" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`
        + `<path d="M50 50 L${mx} ${my}" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`
        + `<circle cx="50" cy="50" r="3.4" fill="${INK}"/>`,
      printMinMm: 60,
      monochromeSafe: true,
    },
    tags: ['time', 'clocks'],
  });
}
const HOUR_ZH = ['十二', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一'];
const HOUR_EN = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'];
function clockWords(h, m) {
  const i = h % 12;
  return m === 0
    ? { en: `${HOUR_EN[i]} o’clock`, zh: `${HOUR_ZH[i]}点整` }
    : { en: `half past ${HOUR_EN[i]}`, zh: `${HOUR_ZH[i]}点半` };
}

/* ── solid (3-D) shapes ────────────────────────────────────────────────────────── */
const SOLIDS = {
  cube: {
    en: 'cube', zh: '正方体',
    svg: `<path d="M24 38 L52 24 L80 38 L52 52 Z" fill="${PAPER}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
      + `<path d="M24 38 L24 68 L52 82 L52 52 Z" fill="${SAND}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
      + `<path d="M80 38 L80 68 L52 82 L52 52 Z" fill="${PAPER}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`,
  },
  cuboid: {
    en: 'cuboid', zh: '长方体',
    svg: `<path d="M16 42 L50 26 L88 42 L54 58 Z" fill="${PAPER}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
      + `<path d="M16 42 L16 66 L54 82 L54 58 Z" fill="${SAND}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
      + `<path d="M88 42 L88 66 L54 82 L54 58 Z" fill="${PAPER}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`,
  },
  sphere: {
    en: 'sphere', zh: '球体',
    svg: `<circle cx="50" cy="52" r="34" fill="${PAPER}" stroke="${INK}" stroke-width="3"/>`
      + `<ellipse cx="50" cy="52" rx="34" ry="11" fill="none" stroke="${INK}" stroke-width="2"/>`
      + `<path d="M28 30 A16 12 0 0 1 42 24" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`,
  },
  cylinder: {
    en: 'cylinder', zh: '圆柱体',
    svg: `<path d="M24 30 L24 70 A26 10 0 0 0 76 70 L76 30 Z" fill="${SAND}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
      + `<ellipse cx="50" cy="30" rx="26" ry="10" fill="${PAPER}" stroke="${INK}" stroke-width="3"/>`,
  },
  cone: {
    en: 'cone', zh: '圆锥体',
    svg: `<path d="M50 18 L78 72 A28 10 0 0 1 22 72 Z" fill="${SAND}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
      + `<ellipse cx="50" cy="72" rx="28" ry="10" fill="none" stroke="${INK}" stroke-width="2"/>`,
  },
  pyramid: {
    en: 'pyramid', zh: '金字塔（棱锥）',
    svg: `<path d="M50 16 L20 74 L52 84 Z" fill="${SAND}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
      + `<path d="M50 16 L82 66 L52 84 Z" fill="${PAPER}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
      + `<path d="M20 74 L82 66" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`,
  },
};
const solid = (k) => {
  const id = `ST.solid.${k}`;
  if (have.has(id)) return id;
  const s = SOLIDS[k];
  return push({
    id,
    kind: 'shape',
    label: { en: s.en, zh: s.zh },
    altText: { en: `a ${s.en}`, zh: s.zh },
    render: { svgSymbolId: symId(id), viewBox: '0 0 100 100', svg: s.svg, printMinMm: 60, monochromeSafe: true },
    tags: ['shapes', 'solids'],
  });
};

/* ── fraction shapes ───────────────────────────────────────────────────────────── */
const arc = (fromDeg, toDeg, fill) => {
  const p = (d) => {
    const a = (d - 90) * Math.PI / 180;
    return [(50 + 40 * Math.cos(a)).toFixed(1), (50 + 40 * Math.sin(a)).toFixed(1)];
  };
  const [x1, y1] = p(fromDeg), [x2, y2] = p(toDeg);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `<path d="M50 50 L${x1} ${y1} A40 40 0 ${large} 1 ${x2} ${y2} Z" fill="${fill}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`;
};
const FRACTIONS = {
  circle_halves: { en: 'a circle cut into two equal parts', zh: '被分成两等份的圆', svg: arc(0, 180, PAPER) + arc(180, 360, PAPER) },
  circle_half_shaded: { en: 'a circle with one half coloured in', zh: '涂了二分之一的圆', svg: arc(0, 180, SAND) + arc(180, 360, PAPER) },
  circle_quarters: { en: 'a circle cut into four equal parts', zh: '被分成四等份的圆', svg: arc(0, 90, PAPER) + arc(90, 180, PAPER) + arc(180, 270, PAPER) + arc(270, 360, PAPER) },
  circle_quarter_shaded: { en: 'a circle with one quarter coloured in', zh: '涂了四分之一的圆', svg: arc(0, 90, SAND) + arc(90, 180, PAPER) + arc(180, 270, PAPER) + arc(270, 360, PAPER) },
  circle_three_quarters_shaded: { en: 'a circle with three quarters coloured in', zh: '涂了四分之三的圆', svg: arc(0, 90, PAPER) + arc(90, 180, SAND) + arc(180, 270, SAND) + arc(270, 360, SAND) },
  circle_uneven: { en: 'a circle cut into two parts that are not equal', zh: '被分成两个不相等部分的圆', svg: arc(0, 120, PAPER) + arc(120, 360, PAPER) },
  circle_uneven_shaded: { en: 'a circle with one of two unequal parts coloured in', zh: '两个不相等部分中涂了一份的圆', svg: arc(0, 120, SAND) + arc(120, 360, PAPER) },
  square_halves: {
    en: 'a square cut into two equal parts', zh: '被分成两等份的正方形',
    svg: `<rect x="14" y="14" width="72" height="72" fill="${PAPER}" stroke="${INK}" stroke-width="2.6"/><path d="M50 14 L50 86" stroke="${INK}" stroke-width="2.6"/>`,
  },
  square_half_shaded: {
    en: 'a square with one half coloured in', zh: '涂了二分之一的正方形',
    svg: `<rect x="14" y="14" width="72" height="72" fill="${PAPER}" stroke="${INK}" stroke-width="2.6"/><rect x="14" y="14" width="36" height="72" fill="${SAND}" stroke="${INK}" stroke-width="2.6"/>`,
  },
  square_quarters: {
    en: 'a square cut into four equal parts', zh: '被分成四等份的正方形',
    svg: `<rect x="14" y="14" width="72" height="72" fill="${PAPER}" stroke="${INK}" stroke-width="2.6"/><path d="M50 14 L50 86 M14 50 L86 50" stroke="${INK}" stroke-width="2.6"/>`,
  },
  square_quarter_shaded: {
    en: 'a square with one quarter coloured in', zh: '涂了四分之一的正方形',
    svg: `<rect x="14" y="14" width="72" height="72" fill="${PAPER}" stroke="${INK}" stroke-width="2.6"/><rect x="14" y="14" width="36" height="36" fill="${SAND}" stroke="${INK}" stroke-width="2.6"/><path d="M50 14 L50 86 M14 50 L86 50" stroke="${INK}" stroke-width="2.6"/>`,
  },
  square_uneven: {
    en: 'a square cut into four parts that are not equal', zh: '被分成四个不相等部分的正方形',
    svg: `<rect x="14" y="14" width="72" height="72" fill="${PAPER}" stroke="${INK}" stroke-width="2.6"/><path d="M36 14 L36 86 M14 62 L86 62 M62 62 L62 86" stroke="${INK}" stroke-width="2.6"/>`,
  },
  square_uneven_shaded: {
    en: 'a square with one of two unequal parts coloured in', zh: '两个不相等部分中涂了一份的正方形',
    svg: `<rect x="14" y="14" width="72" height="72" fill="${PAPER}" stroke="${INK}" stroke-width="2.6"/><rect x="14" y="14" width="24" height="72" fill="${SAND}" stroke="${INK}" stroke-width="2.6"/>`,
  },
};
const frac = (k) => {
  const id = `ST.frac.${k}`;
  if (have.has(id)) return id;
  const f = FRACTIONS[k];
  return push({
    id,
    kind: 'shape',
    label: { en: f.en, zh: f.zh },
    altText: { en: f.en, zh: f.zh },
    render: { svgSymbolId: symId(id), viewBox: '0 0 100 100', svg: f.svg, printMinMm: 60, monochromeSafe: true },
    tags: ['shapes', 'fractions'],
  });
};

/** Tens-and-ones material: `t` ten-rods and `o` unit beads. Golden-bead shaped. */
function baseTen(t, o) {
  const id = `ST.b10.${t}${o}`;
  if (have.has(id)) return id;
  let svg = '';
  for (let i = 0; i < t; i++) svg += `<rect x="${8 + i * 13}" y="14" width="9" height="58" rx="3" fill="${SAND}" stroke="${INK}" stroke-width="2.4"/>`;
  for (let i = 0; i < o; i++) svg += `<circle cx="${12 + (i % 5) * 11}" cy="${82 - Math.floor(i / 5) * 12}" r="4.2" fill="${PAPER}" stroke="${INK}" stroke-width="2.2"/>`;
  return push({
    id,
    kind: 'quantity',
    label: { en: `${t} tens and ${o} ones`, zh: `${t}个十和${o}个一` },
    altText: { en: `${t} ten-rods and ${o} single beads`, zh: `${t}根十条和${o}颗单珠` },
    render: { svgSymbolId: symId(id), viewBox: '0 0 100 100', svg, printMinMm: 60, monochromeSafe: true },
    tags: ['quantity', 'place-value'],
  });
}

/* ═══════════════════════════════════════════════════════ 2. ITEM BUILDERS ═════ */

/** Distractor rationales are INTERNAL item-writer documentation (bank note `internalFields`). */
const ROLE_NOTE = {
  unrelated: { en: 'Different category and different sound — a child choosing this is not yet attending to the prompt.' },
  semantic: { en: 'Same category as the target — catches a child who has the category but not the specific word.' },
  word_near: { en: 'A word differing by one or two letters — catches guessing from the first letter alone.' },
  letter_near: { en: 'Another taught two-letter sound — catches a partial grapheme–sound link.' },
  phonological: { en: 'Shares sounds with the target but not the one asked for — catches a near miss on the sound itself.' },
  numeral_near: { en: 'A numeral that is commonly confused or adjacent in the sequence.' },
  print_near: { en: 'The same digits the other way round — catches reading the digits without their place value.' },
  quantity_near: { en: 'One or two away from the target — catches an approximate rather than exact calculation.' },
  quantity_far: { en: 'Clearly different quantity — a floor check.' },
  shape_near: { en: 'Another shape from the same set.' },
  pattern_near: { en: 'The same parts arranged differently — catches naming the parts without seeing whether they are equal.' },
  position_near: { en: 'The same objects in a different place — catches the nouns without the position word.' },
  size_near: { en: 'The next size along — catches an approximate size judgement.' },
  size_far: { en: 'Clearly different size — a floor check.' },
  attribute_far: { en: 'Wrong on the attribute being compared — a floor check.' },
  time_near: { en: 'The same hour at the other half of the clock — catches the hour without the minute hand.' },
  time_far: { en: 'A different hour altogether — a floor check.' },
  prepotent: { en: 'The picture just shown — the response the child must hold back.' },
};

const NEUTRAL = { en: 'Thank you.', zh: '谢谢。' };
const TIMING = { maxSeconds: null, advanceOn: 'response' };
const coreItems = [];
const eflItems = [];

const scriptEn = (say, tail) => `Say: “${say}” ${tail}`;
const scriptZh = (say, tail) => `说：“${say}” ${tail}`;
const TAIL_TAP_EN = 'Repeat once if the child asks. Wait — there is no time limit.';
const TAIL_TAP_ZH = '如果孩子要求可重复一次。不限时间，请耐心等待。';
const TAIL_SEQ_EN = 'Repeat once if the child asks. Record the order the child touches.';
const TAIL_SEQ_ZH = '如果孩子要求可重复一次，记录孩子触碰的顺序。';
const TAIL_ORAL_EN = 'Give the child time. Do not model the answer. Note 0, 1 or 2 using the descriptors below.';
const TAIL_ORAL_ZH = '给孩子充分的时间，不要示范答案，按下面的描述记 0、1 或 2。';

/**
 * @param {object} o
 * o.id o.strand o.module o.form o.seq o.tag o.milestone
 * o.audio {en,zh} o.on {en,zh} o.stim []  o.opts [[stimId, role|null], …] (first is the key)
 * o.type 'tap'|'seq'|'oral'   o.rubricKey  o.decodable  o.en (EFL: English-only prompt)
 * o.seqLen — for listen_do, how many of the leading options form the sequence
 */
function item(o) {
  const list = o.module === 'M-EFL' ? eflItems : coreItems;
  const isEfl = !!o.en;
  const opts = (o.opts || []).map(([stimulusId], i) => ({ id: `o${i + 1}`, stimulusId }));
  const key = o.type === 'seq'
    ? opts.slice(0, o.seqLen ?? 1).map((x) => x.id)
    : [opts[0]?.id].filter(Boolean);
  const distractors = (o.opts || []).slice(o.type === 'seq' ? (o.seqLen ?? 1) : 1)
    .map(([stimulusId, role], i) => ({
      optionId: `o${i + 1 + (o.type === 'seq' ? (o.seqLen ?? 1) : 1)}`,
      stimulusId,
      role: role || 'unrelated',
      rationale: ROLE_NOTE[role || 'unrelated'].en,
      internalOnly: true,
    }));

  const tailEn = o.type === 'oral' ? TAIL_ORAL_EN : o.type === 'seq' ? TAIL_SEQ_EN : TAIL_TAP_EN;
  const tailZh = o.type === 'oral' ? TAIL_ORAL_ZH : o.type === 'seq' ? TAIL_SEQ_ZH : TAIL_TAP_ZH;

  const rec = {
    id: o.id,
    strandId: o.strand,
    ageBand: 'G1',
    form: o.form,
    moduleId: o.module,
    sequence: o.seq,
    type: o.type === 'oral' ? 'teacher_scored_oral' : o.type === 'seq' ? 'listen_do' : 'tap_choice',
    promptLang: isEfl ? 'en' : 'assessment',
    prompt: {
      audio: isEfl ? { en: o.audio.en } : { en: o.audio.en, zh: o.audio.zh },
      audioLocaleFixed: isEfl ? 'en' : null,
      onScreen: isEfl ? { en: o.on.en, zh: null } : { en: o.on.en, zh: o.audio.zh },
      teacherScript: {
        en: scriptEn(o.audio.en, tailEn),
        zh: scriptZh(isEfl ? o.audio.en : o.audio.zh, tailZh),
      },
    },
    stimulusIds: o.stim || [],
    options: o.type === 'oral' ? null : opts,
    scoring: o.type === 'oral'
      ? {
        method: 'teacher_rubric',
        correctOptionIds: null,
        maxPoints: 2,
        rubric: RUBRICS[o.rubricKey],
        rubricKey: o.rubricKey,
      }
      : o.type === 'seq'
        ? {
          method: 'auto_key',
          correctOptionIds: key,
          correctSequence: key,
          maxPoints: 1,
          rubric: null,
          note: 'Full credit only when the whole sequence is touched in the given order.',
        }
        : { method: 'auto_key', correctOptionIds: key, maxPoints: 1, rubric: null },
    distractors: o.type === 'oral' ? null : distractors,
    timing: TIMING,
    repeatAllowed: true,
    repeatMax: 1,
    requiresColor: false,
    constructTag: o.tag ?? null,
    decodableWord: o.decodable ?? null,
    paper: {
      cardsPerRow: o.type === 'oral' ? 1 : 2,
      responseMode: o.type === 'oral'
        ? 'child speaks, teacher notes 0/1/2 on the sheet'
        : o.type === 'seq'
          ? 'child points in order, teacher numbers the boxes'
          : 'child points, teacher circles',
    },
    stop: { countsTowardStrandStop: true, countsTowardModuleStop: true, scored: true },
    feedback: { neutral: NEUTRAL },
    scored: true,
    ...(o.taskFamily ? { taskFamily: o.taskFamily } : {}),
    milestoneIds: o.milestone ? [o.milestone] : [],
  };
  list.push(rec);
  return rec;
}

/** Practice items: never scored, never exported, warm feedback allowed. */
function practice(id, module, strand, seq, form, audioEn, audioZh, onEn, opts, isEfl) {
  const list = module === 'M-EFL' ? eflItems : coreItems;
  list.push({
    id,
    strandId: strand,
    ageBand: 'G1',
    form: 'P',
    moduleId: module,
    sequence: seq,
    type: 'tap_choice',
    promptLang: isEfl ? 'en' : 'assessment',
    prompt: {
      audio: isEfl ? { en: audioEn } : { en: audioEn, zh: audioZh },
      audioLocaleFixed: isEfl ? 'en' : null,
      onScreen: isEfl ? { en: onEn, zh: null } : { en: onEn, zh: audioZh },
      teacherScript: {
        en: scriptEn(audioEn, TAIL_TAP_EN),
        zh: scriptZh(isEfl ? audioEn : audioZh, TAIL_TAP_ZH),
      },
    },
    stimulusIds: [],
    options: opts.map((stimulusId, i) => ({ id: `o${i + 1}`, stimulusId })),
    scoring: { method: 'auto_key', correctOptionIds: ['o1'], maxPoints: 1, rubric: null },
    distractors: null,
    timing: TIMING,
    repeatAllowed: true,
    repeatMax: 1,
    requiresColor: false,
    constructTag: null,
    decodableWord: null,
    paper: { cardsPerRow: 2, responseMode: 'child points, teacher circles' },
    stop: { countsTowardStrandStop: false, countsTowardModuleStop: false, scored: false },
    feedback: {
      correct: { en: 'That’s the one. Let’s keep going.', zh: '就是这个。我们继续吧。' },
      tryAgain: { en: 'Let’s try that one together.', zh: '我们一起再试一次。' },
    },
    scored: false,
    milestoneIds: [],
  });
  void form;
}

/* ── rubrics authored for Canopy ─────────────────────────────────────────────── */
const rub = (l0, l1, l2) => ({
  scale: [0, 1, 2],
  levels: [
    { score: 0, descriptor: l0 },
    { score: 1, descriptor: l1 },
    { score: 2, descriptor: l2 },
  ],
});
const NEW_CORE_RUBRICS = {
  retell_detail: rub(
    { en: 'No retell.', zh: '没有复述。' },
    { en: 'Tells the events but leaves out the order or the detail.', zh: '能讲出事件，但缺少顺序或细节。' },
    { en: 'Tells the events in order and adds what someone did or felt.', zh: '能按顺序讲述，并说出人物做了什么或有什么感受。' },
  ),
  word_meaning: rub(
    { en: 'No meaning offered.', zh: '说不出词的意思。' },
    { en: 'Gives an example without saying what the word means.', zh: '只举例子，没有说出词义。' },
    { en: 'Says what the word means in their own words.', zh: '能用自己的话说出词义。' },
  ),
  segment_word: rub(
    { en: 'Repeats the whole word, or gives one sound only.', zh: '只重复整个词，或只说出一个音。' },
    { en: 'Gives the first and last sounds, or misses one in the middle.', zh: '能说出首音和尾音，或漏掉中间某个音。' },
    { en: 'Says every sound in the word, in order.', zh: '能按顺序说出词中的每一个音。' },
  ),
  decode_new_word: rub(
    { en: 'No attempt, or says a different word they already know.', zh: '没有尝试，或说成自己已认识的另一个词。' },
    { en: 'Sounds out part of it, or needs a start from the adult.', zh: '只拼读出一部分，或需要成人起个头。' },
    { en: 'Sounds out every part and blends it into one whole word.', zh: '能逐音拼读并连成一个完整的词。' },
  ),
  read_sentence: rub(
    { en: 'Reads no more than a word or two.', zh: '最多只能读出一两个词。' },
    { en: 'Reads most of it, stopping often or needing help.', zh: '能读出大部分，但常停顿或需要帮助。' },
    { en: 'Reads the whole sentence and puts right anything they slip on.', zh: '能读完整句，并能自行改正读错的地方。' },
  ),
  count_on_past_hundred: rub(
    { en: 'Restarts at one, or stops within a few numbers.', zh: '从一重新数起，或数几个就停下。' },
    { en: 'Counts on for a while but loses the sequence at a ten or at a hundred.', zh: '能接着数一段，但在整十或一百处断掉。' },
    { en: 'Counts on in order across a ten and past one hundred.', zh: '能按顺序跨过整十并数过一百。' },
  ),
  name_solid: rub(
    { en: 'No name and nothing said about it.', zh: '既说不出名称，也说不出特点。' },
    { en: 'Names it, or describes it, but not both.', zh: '能说出名称或描述特点，但不能兼顾。' },
    { en: 'Names it and says one thing that is true of every one of them.', zh: '能说出名称，并说出这类形体共同的一个特点。' },
  ),
};
const NEW_EFL_RUBRICS = {
  english_question: rub(
    { en: 'No question asked.', zh: '没有提出问题。' },
    { en: 'A question word or a phrase with a question in it.', zh: '只说出疑问词，或短语中带有提问的意思。' },
    { en: 'A whole English question a listener can answer.', zh: '能说出让人听得懂并能回答的完整英语问句。' },
  ),
};
const RUBRICS = {
  ...bank['items-core.json'].rubrics,
  ...bank['items-efl.json'].rubrics,
  ...NEW_CORE_RUBRICS,
  ...NEW_EFL_RUBRICS,
};

/* ══════════════════════════════════════ 3. DIRECT ITEMS — M-LIT (band G1) ═════ */
/* Canopy literacy: decoding taught two-letter sounds and vowel teams, reading a
 * short sentence, hearing every sound in a word, telling long from short vowels,
 * and answering an inference question about something read aloud.
 * CCSS RF.1.2–RF.1.4, RL.1.1–RL.1.3, L.1.4–L.1.5 · UK English Y1 word reading,
 * comprehension and spoken language. */

const IT = (s, f, n) => `IT.${s}.G1.${f}.${String(n).padStart(2, '0')}`;

/* ── LCL-A · receptive language & listening ──────────────────────────────────── */
item({
  id: IT('LCL-A', 'A', 1), strand: 'LCL-A', module: 'M-LIT', form: 'A', seq: 1,
  type: 'tap', tag: 'inference_from_read_aloud', milestone: 'LCL-A.G1.1',
  audio: {
    en: 'Listen. Ben came inside. His coat was dripping and his shoes were covered in mud. Tap the picture that shows where Ben had been.',
    zh: '听。本进屋来了，他的外套在滴水，鞋上全是泥。请点出本刚才待过的地方。',
  },
  on: { en: 'inference: where had Ben been?' },
  opts: [['ST.rain'], ['ST.sun', 'semantic'], ['ST.bed', 'unrelated'], ['ST.book', 'unrelated']],
});
item({
  id: IT('LCL-A', 'A', 2), strand: 'LCL-A', module: 'M-LIT', form: 'A', seq: 2,
  type: 'tap', tag: 'inference_from_read_aloud', milestone: 'LCL-A.G1.1',
  audio: {
    en: 'Listen. Mia put on her coat. She opened the door. Then she stepped out into the garden. Tap the picture that shows what Mia did last.',
    zh: '听。米娅穿上外套，打开门，然后走进了花园。请点出米娅最后做的那件事。',
  },
  on: { en: 'inference: what happened last?' },
  opts: [['ST.sq_outside'], ['ST.sq_door', 'position_near'], ['ST.sq_coat', 'position_near'], ['ST.sc_sleep', 'unrelated']],
});
item({
  id: IT('LCL-A', 'A', 3), strand: 'LCL-A', module: 'M-LIT', form: 'A', seq: 3,
  type: 'seq', seqLen: 3, tag: 'three_step_instruction', milestone: 'LCL-A.G1.2',
  audio: { en: 'Touch the tree, then the cup, then the shoe.', zh: '先摸树，再摸杯子，最后摸鞋。' },
  on: { en: 'three-step: tree, cup, shoe' },
  opts: [['ST.tree'], ['ST.cup'], ['ST.shoe'], ['ST.hat', 'unrelated']],
});
item({
  id: IT('LCL-A', 'A', 4), strand: 'LCL-A', module: 'M-LIT', form: 'A', seq: 4,
  type: 'seq', seqLen: 3, tag: 'three_step_instruction', milestone: 'LCL-A.G1.2',
  audio: { en: 'Touch the bell, then the leaf, then the key.', zh: '先摸铃铛，再摸树叶，最后摸钥匙。' },
  on: { en: 'three-step: bell, leaf, key' },
  opts: [['ST.bell'], ['ST.leaf'], ['ST.key'], ['ST.net', 'unrelated']],
});
item({
  id: IT('LCL-A', 'B', 1), strand: 'LCL-A', module: 'M-LIT', form: 'B', seq: 1,
  type: 'tap', tag: 'inference_from_read_aloud', milestone: 'LCL-A.G1.1',
  audio: {
    en: 'Listen. The cat kept calling and calling beside her empty bowl. Tap the picture that shows what the cat wanted.',
    zh: '听。猫守着空碗一直叫个不停。请点出猫想要的东西。',
  },
  on: { en: 'inference: what did the cat want?' },
  opts: [['ST.milk'], ['ST.ball', 'semantic'], ['ST.sock', 'unrelated'], ['ST.hat', 'unrelated']],
});
item({
  id: IT('LCL-A', 'B', 2), strand: 'LCL-A', module: 'M-LIT', form: 'B', seq: 2,
  type: 'tap', tag: 'inference_from_read_aloud', milestone: 'LCL-A.G1.1',
  audio: {
    en: 'Listen. Sam planted a seed. He watered it every morning for weeks. Tap the picture that shows what happened last.',
    zh: '听。山姆种下一颗种子，接连几周每天早上都浇水。请点出最后发生的事。',
  },
  on: { en: 'inference: what happened last?' },
  opts: [['ST.sq_flower'], ['ST.sq_water', 'position_near'], ['ST.sq_seed', 'position_near'], ['ST.sc_run', 'unrelated']],
});
item({
  id: IT('LCL-A', 'B', 3), strand: 'LCL-A', module: 'M-LIT', form: 'B', seq: 3,
  type: 'seq', seqLen: 3, tag: 'three_step_instruction', milestone: 'LCL-A.G1.2',
  audio: { en: 'Touch the box, then the mug, then the sock.', zh: '先摸盒子，再摸马克杯，最后摸袜子。' },
  on: { en: 'three-step: box, mug, sock' },
  opts: [['ST.box'], ['ST.mug'], ['ST.sock'], ['ST.pen', 'unrelated']],
});
item({
  id: IT('LCL-A', 'B', 4), strand: 'LCL-A', module: 'M-LIT', form: 'B', seq: 4,
  type: 'seq', seqLen: 3, tag: 'three_step_instruction', milestone: 'LCL-A.G1.2',
  audio: { en: 'Touch the fish, then the flower, then the mop.', zh: '先摸鱼，再摸花，最后摸拖把。' },
  on: { en: 'three-step: fish, flower, mop' },
  opts: [['ST.fish'], ['ST.flower'], ['ST.mop'], ['ST.jug', 'unrelated']],
});

/* ── LCL-B · expressive language & vocabulary ────────────────────────────────── */
item({
  id: IT('LCL-B', 'A', 1), strand: 'LCL-B', module: 'M-LIT', form: 'A', seq: 5,
  type: 'oral', rubricKey: 'retell_detail', tag: 'retell_with_detail', milestone: 'LCL-B.G1.1',
  audio: {
    en: 'Look at these three pictures. Tell me the story. Say what happened first, next and last, and tell me one thing about how it felt.',
    zh: '看这三张图，给我讲这个故事。说说先发生什么、接着发生什么、最后发生什么，再说一说当时的感受。',
  },
  on: { en: 'retell with detail (coat → door → outside)' },
  stim: ['ST.sq_coat', 'ST.sq_door', 'ST.sq_outside'],
  opts: [],
});
item({
  id: IT('LCL-B', 'A', 2), strand: 'LCL-B', module: 'M-LIT', form: 'A', seq: 6,
  type: 'oral', rubricKey: 'word_meaning', tag: 'word_meaning_and_category', milestone: 'LCL-B.G1.2',
  audio: {
    en: 'Here is a word: soaked. When your coat is soaked, what does that mean?',
    zh: '这里有一个词：湿透。说一件外套湿透了，是什么意思？',
  },
  on: { en: 'word meaning: soaked' },
  stim: ['ST.rain'],
  opts: [],
});
item({
  id: IT('LCL-B', 'A', 3), strand: 'LCL-B', module: 'M-LIT', form: 'A', seq: 7,
  type: 'tap', tag: 'word_meaning_and_category', milestone: 'LCL-B.G1.2',
  audio: {
    en: 'Bread, banana and cake all belong together — they are things we eat. Tap one more thing we eat.',
    zh: '面包、香蕉和蛋糕是一类的——它们都是吃的。请再点一个可以吃的东西。',
  },
  on: { en: 'category: things we eat' },
  opts: [['ST.egg'], ['ST.sock', 'unrelated'], ['ST.key', 'unrelated'], ['ST.mop', 'unrelated']],
});
item({
  id: IT('LCL-B', 'B', 1), strand: 'LCL-B', module: 'M-LIT', form: 'B', seq: 5,
  type: 'oral', rubricKey: 'retell_detail', tag: 'retell_with_detail', milestone: 'LCL-B.G1.1',
  audio: {
    en: 'Look at these three pictures. Tell me the story. Say what happened first, next and last, and tell me one thing about how it felt.',
    zh: '看这三张图，给我讲这个故事。说说先发生什么、接着发生什么、最后发生什么，再说一说当时的感受。',
  },
  on: { en: 'retell with detail (seed → water → flower)' },
  stim: ['ST.sq_seed', 'ST.sq_water', 'ST.sq_flower'],
  opts: [],
});
item({
  id: IT('LCL-B', 'B', 2), strand: 'LCL-B', module: 'M-LIT', form: 'B', seq: 6,
  type: 'oral', rubricKey: 'word_meaning', tag: 'word_meaning_and_category', milestone: 'LCL-B.G1.2',
  audio: {
    en: 'Here is a word: enormous. If someone says the tree is enormous, what does that mean?',
    zh: '这里有一个词：巨大。如果有人说那棵树很巨大，是什么意思？',
  },
  on: { en: 'word meaning: enormous' },
  stim: ['ST.at_tree_tall'],
  opts: [],
});
item({
  id: IT('LCL-B', 'B', 3), strand: 'LCL-B', module: 'M-LIT', form: 'B', seq: 7,
  type: 'tap', tag: 'word_meaning_and_category', milestone: 'LCL-B.G1.2',
  audio: {
    en: 'A hen, a duck and a bird all belong together — they are all animals. Tap one more animal.',
    zh: '母鸡、鸭子和小鸟是一类的——它们都是动物。请再点一只动物。',
  },
  on: { en: 'category: animals' },
  opts: [['ST.fox'], ['ST.cap', 'unrelated'], ['ST.jug', 'unrelated'], ['ST.log', 'unrelated']],
});

/* ── LCL-C · phonological awareness (English-medium strand) ──────────────────── */
item({
  id: IT('LCL-C', 'A', 1), strand: 'LCL-C', module: 'M-LIT', form: 'A', seq: 8,
  type: 'oral', rubricKey: 'segment_word', tag: 'phoneme_segmentation', milestone: 'LCL-C.G1.1',
  audio: { en: 'This is a hand. Say the word hand. Now say it again, one sound at a time.', zh: '这是 hand（手）。请说出 hand 这个词，然后一个音一个音地再说一遍。' },
  on: { en: 'segment: hand' },
  stim: ['ST.hand'],
  opts: [],
});
item({
  id: IT('LCL-C', 'A', 2), strand: 'LCL-C', module: 'M-LIT', form: 'A', seq: 9,
  type: 'oral', rubricKey: 'segment_word', tag: 'phoneme_segmentation', milestone: 'LCL-C.G1.1',
  audio: { en: 'This is milk. Say the word milk. Now say it again, one sound at a time.', zh: '这是 milk（牛奶）。请说出 milk 这个词，然后一个音一个音地再说一遍。' },
  on: { en: 'segment: milk' },
  stim: ['ST.milk'],
  opts: [],
});
item({
  id: IT('LCL-C', 'A', 3), strand: 'LCL-C', module: 'M-LIT', form: 'A', seq: 10,
  type: 'tap', tag: 'vowel_sound_contrast', milestone: 'LCL-C.G1.2',
  audio: { en: 'Listen to the middle sound in cake. Tap the picture whose name has that same middle sound.', zh: '听 cake 中间的那个音。请点出名称中间是同一个音的图片。' },
  on: { en: 'middle sound as in cake' },
  opts: [['ST.rain'], ['ST.cat', 'phonological'], ['ST.dog', 'unrelated'], ['ST.moon', 'unrelated']],
});
item({
  id: IT('LCL-C', 'A', 4), strand: 'LCL-C', module: 'M-LIT', form: 'A', seq: 11,
  type: 'tap', tag: 'vowel_sound_contrast', milestone: 'LCL-C.G1.2',
  audio: { en: 'Listen to the middle sound in tree. Tap the picture whose name has that same middle sound.', zh: '听 tree 中间的那个音。请点出名称中间是同一个音的图片。' },
  on: { en: 'middle sound as in tree' },
  opts: [['ST.leaf'], ['ST.bed', 'phonological'], ['ST.log', 'unrelated'], ['ST.bus', 'unrelated']],
});
item({
  id: IT('LCL-C', 'B', 1), strand: 'LCL-C', module: 'M-LIT', form: 'B', seq: 8,
  type: 'oral', rubricKey: 'segment_word', tag: 'phoneme_segmentation', milestone: 'LCL-C.G1.1',
  audio: { en: 'This is a bird. Say the word bird. Now say it again, one sound at a time.', zh: '这是 bird（鸟）。请说出 bird 这个词，然后一个音一个音地再说一遍。' },
  on: { en: 'segment: bird' },
  stim: ['ST.bird'],
  opts: [],
});
item({
  id: IT('LCL-C', 'B', 2), strand: 'LCL-C', module: 'M-LIT', form: 'B', seq: 9,
  type: 'oral', rubricKey: 'segment_word', tag: 'phoneme_segmentation', milestone: 'LCL-C.G1.1',
  audio: { en: 'This is a truck. Say the word truck. Now say it again, one sound at a time.', zh: '这是 truck（卡车）。请说出 truck 这个词，然后一个音一个音地再说一遍。' },
  on: { en: 'segment: truck' },
  stim: ['ST.truck'],
  opts: [],
});
item({
  id: IT('LCL-C', 'B', 3), strand: 'LCL-C', module: 'M-LIT', form: 'B', seq: 10,
  type: 'tap', tag: 'vowel_sound_contrast', milestone: 'LCL-C.G1.2',
  audio: { en: 'Listen to the middle sound in hat. Tap the picture whose name has that same middle sound.', zh: '听 hat 中间的那个音。请点出名称中间是同一个音的图片。' },
  on: { en: 'middle sound as in hat' },
  opts: [['ST.bag'], ['ST.cake', 'phonological'], ['ST.pig', 'unrelated'], ['ST.mop', 'unrelated']],
});
item({
  id: IT('LCL-C', 'B', 4), strand: 'LCL-C', module: 'M-LIT', form: 'B', seq: 11,
  type: 'tap', tag: 'vowel_sound_contrast', milestone: 'LCL-C.G1.2',
  audio: { en: 'Listen to the middle sound in bed. Tap the picture whose name has that same middle sound.', zh: '听 bed 中间的那个音。请点出名称中间是同一个音的图片。' },
  on: { en: 'middle sound as in bed' },
  opts: [['ST.hen'], ['ST.leaf', 'phonological'], ['ST.bus', 'unrelated'], ['ST.sock', 'unrelated']],
});

/* ── LCL-D · print & word reading (English-medium strand) ────────────────────── */
item({
  id: IT('LCL-D', 'A', 1), strand: 'LCL-D', module: 'M-LIT', form: 'A', seq: 12,
  type: 'tap', tag: 'decode_taught_pattern_word', milestone: 'LCL-D.G1.1', decodable: 'fish',
  audio: { en: 'This is a fish. Read the words and tap the one that says fish.', zh: '这是一条鱼。请读一读这些词，点出写着 fish 的那个。' },
  on: { en: 'word reading: fish' },
  stim: ['ST.fish'],
  opts: [[word('fish')], [word('fist'), 'word_near'], [word('dish'), 'word_near'], [word('wish'), 'word_near']],
});
item({
  id: IT('LCL-D', 'A', 2), strand: 'LCL-D', module: 'M-LIT', form: 'A', seq: 13,
  type: 'tap', tag: 'decode_taught_pattern_word', milestone: 'LCL-D.G1.1', decodable: 'rain',
  audio: { en: 'This is rain. Read the words and tap the one that says rain.', zh: '这是雨。请读一读这些词，点出写着 rain 的那个。' },
  on: { en: 'word reading: rain' },
  stim: ['ST.rain'],
  opts: [[word('rain')], [word('ran'), 'word_near'], [word('rail'), 'word_near'], [word('main'), 'word_near']],
});
item({
  id: IT('LCL-D', 'A', 3), strand: 'LCL-D', module: 'M-LIT', form: 'A', seq: 14,
  type: 'oral', rubricKey: 'decode_new_word', tag: 'decode_taught_pattern_word', milestone: 'LCL-D.G1.1', decodable: 'chog',
  audio: { en: 'This is a made-up word from a made-up language. Sound it out and say the whole word.', zh: '这是一个自造语言里的自造词。请把每个音拼读出来，再连成一个完整的词。' },
  on: { en: 'made-up word: chog' },
  stim: [word('chog')],
  opts: [],
});
item({
  id: IT('LCL-D', 'A', 4), strand: 'LCL-D', module: 'M-LIT', form: 'A', seq: 15,
  type: 'oral', rubricKey: 'read_sentence', tag: 'read_sentence_aloud', milestone: 'LCL-D.G1.2',
  audio: { en: 'Read this sentence out loud to me.', zh: '请把这句话读给我听。' },
  on: { en: 'read aloud: The big fish is in the net.' },
  stim: [sentence('a1', 'The big fish is in the net.', '大鱼在网里。')],
  opts: [],
});
item({
  id: IT('LCL-D', 'A', 5), strand: 'LCL-D', module: 'M-LIT', form: 'A', seq: 16,
  type: 'tap', tag: 'read_sentence_aloud', milestone: 'LCL-D.G1.2',
  audio: { en: 'Read this sentence to yourself, then tap the picture it tells about.', zh: '请自己读一读这句话，然后点出它讲的那张图。' },
  on: { en: 'sentence → picture: The cat is on the table.' },
  stim: [sentence('a2', 'The cat is on the table.', '猫在桌子上。')],
  opts: [['ST.sc_cat_on'], ['ST.sc_cat_under', 'position_near'], ['ST.sc_cat_in', 'position_near'], ['ST.sc_cat_behind', 'position_near']],
});
item({
  id: IT('LCL-D', 'B', 1), strand: 'LCL-D', module: 'M-LIT', form: 'B', seq: 12,
  type: 'tap', tag: 'decode_taught_pattern_word', milestone: 'LCL-D.G1.1', decodable: 'book',
  audio: { en: 'This is a book. Read the words and tap the one that says book.', zh: '这是一本书。请读一读这些词，点出写着 book 的那个。' },
  on: { en: 'word reading: book' },
  stim: ['ST.book'],
  opts: [[word('book')], [word('boot'), 'word_near'], [word('hook'), 'word_near'], [word('back'), 'word_near']],
});
item({
  id: IT('LCL-D', 'B', 2), strand: 'LCL-D', module: 'M-LIT', form: 'B', seq: 13,
  type: 'tap', tag: 'decode_taught_pattern_word', milestone: 'LCL-D.G1.1', decodable: 'moon',
  audio: { en: 'This is the moon. Read the words and tap the one that says moon.', zh: '这是月亮。请读一读这些词，点出写着 moon 的那个。' },
  on: { en: 'word reading: moon' },
  stim: ['ST.moon'],
  opts: [[word('moon')], [word('mood'), 'word_near'], [word('noon'), 'word_near'], [word('man'), 'word_near']],
});
item({
  id: IT('LCL-D', 'B', 3), strand: 'LCL-D', module: 'M-LIT', form: 'B', seq: 14,
  type: 'oral', rubricKey: 'decode_new_word', tag: 'decode_taught_pattern_word', milestone: 'LCL-D.G1.1', decodable: 'shab',
  audio: { en: 'This is a made-up word from a made-up language. Sound it out and say the whole word.', zh: '这是一个自造语言里的自造词。请把每个音拼读出来，再连成一个完整的词。' },
  on: { en: 'made-up word: shab' },
  stim: [word('shab')],
  opts: [],
});
item({
  id: IT('LCL-D', 'B', 4), strand: 'LCL-D', module: 'M-LIT', form: 'B', seq: 15,
  type: 'oral', rubricKey: 'read_sentence', tag: 'read_sentence_aloud', milestone: 'LCL-D.G1.2',
  audio: { en: 'Read this sentence out loud to me.', zh: '请把这句话读给我听。' },
  on: { en: 'read aloud: The hen sat on six eggs.' },
  stim: [sentence('b1', 'The hen sat on six eggs.', '母鸡卧在六个蛋上。')],
  opts: [],
});
item({
  id: IT('LCL-D', 'B', 5), strand: 'LCL-D', module: 'M-LIT', form: 'B', seq: 16,
  type: 'tap', tag: 'read_sentence_aloud', milestone: 'LCL-D.G1.2',
  audio: { en: 'Read this sentence to yourself, then tap the picture it tells about.', zh: '请自己读一读这句话，然后点出它讲的那张图。' },
  on: { en: 'sentence → picture: The ball is under the chair.' },
  stim: [sentence('b2', 'The ball is under the chair.', '球在椅子下面。')],
  opts: [['ST.sc_ball_under_chair'], ['ST.sc_ball_on_chair', 'position_near'], ['ST.sc_ball_behind_chair', 'position_near'], ['ST.sc_ball_in_box', 'position_near']],
});

practice('IT.PRACTICE.LIT.G1.01', 'M-LIT', 'LCL-A', 1, 'P', 'Tap the tree.', '请点一下树。', 'practice: tree',
  ['ST.tree', 'ST.cup', 'ST.dog', 'ST.hat'], false);
practice('IT.PRACTICE.LIT.G1.02', 'M-LIT', 'LCL-A', 2, 'P', 'Tap the shoe.', '请点一下鞋。', 'practice: shoe',
  ['ST.shoe', 'ST.key', 'ST.sun', 'ST.bag'], false);

/* ═════════════════════════════════════ 4. DIRECT ITEMS — M-MATH (band G1) ════ */
/* Canopy mathematics: counting on past a hundred, tens and ones, adding and taking
 * away within twenty, everyday problems, solid shapes, halves and quarters, and
 * telling the time to the hour and half past.
 * CCSS 1.NBT.1–3, 1.OA.1/1.OA.6, 1.G.1–3, 1.MD.1/1.MD.3 · UK Maths Y1 number and
 * place value, addition and subtraction, fractions, measurement, shape. */

/* ── COG-A · number sense & counting ─────────────────────────────────────────── */
item({
  id: IT('COG-A', 'A', 1), strand: 'COG-A', module: 'M-MATH', form: 'A', seq: 1,
  type: 'oral', rubricKey: 'count_on_past_hundred', tag: 'count_past_hundred', milestone: 'COG-A.G1.1',
  audio: { en: 'Start at ninety-seven and keep counting on for me.', zh: '请从九十七开始，接着往下数给我听。' },
  on: { en: 'count on from 97' },
  stim: [numeral(97)],
  opts: [],
});
item({
  id: IT('COG-A', 'A', 2), strand: 'COG-A', module: 'M-MATH', form: 'A', seq: 2,
  type: 'tap', tag: 'count_past_hundred', milestone: 'COG-A.G1.1',
  audio: { en: 'Tap the number that comes straight after ninety-nine.', zh: '请点出九十九后面紧接着的那个数。' },
  on: { en: 'after 99' },
  stim: [numeral(99)],
  opts: [[numeral(100)], [numeral(101), 'numeral_near'], [numeral(90), 'numeral_near'], [numeral(10), 'print_near']],
});
item({
  id: IT('COG-A', 'A', 3), strand: 'COG-A', module: 'M-MATH', form: 'A', seq: 3,
  type: 'tap', tag: 'count_past_hundred', milestone: 'COG-A.G1.1',
  audio: { en: 'I am counting in tens: ten, twenty, thirty. Tap the number that comes next.', zh: '我在十个十个地数：十、二十、三十。请点出下一个数。' },
  on: { en: 'count in tens: next after 30' },
  opts: [[numeral(40)], [numeral(31), 'numeral_near'], [numeral(50), 'numeral_near'], [numeral(34), 'print_near']],
});
item({
  id: IT('COG-A', 'A', 4), strand: 'COG-A', module: 'M-MATH', form: 'A', seq: 4,
  type: 'tap', tag: 'tens_and_ones', milestone: 'COG-A.G1.2',
  audio: { en: 'Tap the number that has four tens and two ones.', zh: '请点出由四个十和二个一组成的数。' },
  on: { en: '4 tens and 2 ones' },
  opts: [[numeral(42)], [numeral(24), 'print_near'], [numeral(40), 'numeral_near'], [numeral(4), 'quantity_far']],
});
item({
  id: IT('COG-A', 'A', 5), strand: 'COG-A', module: 'M-MATH', form: 'A', seq: 5,
  type: 'tap', tag: 'tens_and_ones', milestone: 'COG-A.G1.2',
  audio: { en: 'Here are some tens and some ones. Tap the number they make.', zh: '这里有几个十和几个一。请点出它们合起来是哪个数。' },
  on: { en: 'base-ten → numeral (36)' },
  stim: [baseTen(3, 6)],
  opts: [[numeral(36)], [numeral(63), 'print_near'], [numeral(39), 'numeral_near'], [numeral(9), 'quantity_far']],
});
item({
  id: IT('COG-A', 'B', 1), strand: 'COG-A', module: 'M-MATH', form: 'B', seq: 1,
  type: 'oral', rubricKey: 'count_on_past_hundred', tag: 'count_past_hundred', milestone: 'COG-A.G1.1',
  audio: { en: 'Start at one hundred and eight and keep counting on for me.', zh: '请从一百零八开始，接着往下数给我听。' },
  on: { en: 'count on from 108' },
  stim: [numeral(108)],
  opts: [],
});
item({
  id: IT('COG-A', 'B', 2), strand: 'COG-A', module: 'M-MATH', form: 'B', seq: 2,
  type: 'tap', tag: 'count_past_hundred', milestone: 'COG-A.G1.1',
  audio: { en: 'Tap the number that comes straight after one hundred and nine.', zh: '请点出一百零九后面紧接着的那个数。' },
  on: { en: 'after 109' },
  stim: [numeral(109)],
  opts: [[numeral(110)], [numeral(101), 'numeral_near'], [numeral(190), 'print_near'], [numeral(11), 'quantity_far']],
});
item({
  id: IT('COG-A', 'B', 3), strand: 'COG-A', module: 'M-MATH', form: 'B', seq: 3,
  type: 'tap', tag: 'count_past_hundred', milestone: 'COG-A.G1.1',
  audio: { en: 'I am counting in fives: five, ten, fifteen. Tap the number that comes next.', zh: '我在五个五个地数：五、十、十五。请点出下一个数。' },
  on: { en: 'count in fives: next after 15' },
  opts: [[numeral(20)], [numeral(16), 'numeral_near'], [numeral(25), 'numeral_near'], [numeral(12), 'quantity_far']],
});
item({
  id: IT('COG-A', 'B', 4), strand: 'COG-A', module: 'M-MATH', form: 'B', seq: 4,
  type: 'tap', tag: 'tens_and_ones', milestone: 'COG-A.G1.2',
  audio: { en: 'Tap the number that has six tens and three ones.', zh: '请点出由六个十和三个一组成的数。' },
  on: { en: '6 tens and 3 ones' },
  opts: [[numeral(63)], [numeral(36), 'print_near'], [numeral(60), 'numeral_near'], [numeral(6), 'quantity_far']],
});
item({
  id: IT('COG-A', 'B', 5), strand: 'COG-A', module: 'M-MATH', form: 'B', seq: 5,
  type: 'tap', tag: 'tens_and_ones', milestone: 'COG-A.G1.2',
  audio: { en: 'Here are some tens and some ones. Tap the number they make.', zh: '这里有几个十和几个一。请点出它们合起来是哪个数。' },
  on: { en: 'base-ten → numeral (52)' },
  stim: [baseTen(5, 2)],
  opts: [[numeral(52)], [numeral(25), 'print_near'], [numeral(57), 'numeral_near'], [numeral(7), 'quantity_far']],
});

/* ── COG-B · quantity, comparison & early operations ─────────────────────────── */
item({
  id: IT('COG-B', 'A', 1), strand: 'COG-B', module: 'M-MATH', form: 'A', seq: 6,
  type: 'tap', tag: 'add_subtract_within_twenty', milestone: 'COG-B.G1.1',
  audio: { en: 'Eight and six. Tap the number they make altogether.', zh: '八加六。请点出它们合起来是多少。' },
  on: { en: '8 + 6' },
  opts: [[numeral(14)], [numeral(13), 'quantity_near'], [numeral(15), 'quantity_near'], [numeral(2), 'quantity_far']],
});
item({
  id: IT('COG-B', 'A', 2), strand: 'COG-B', module: 'M-MATH', form: 'A', seq: 7,
  type: 'tap', tag: 'add_subtract_within_twenty', milestone: 'COG-B.G1.1',
  audio: { en: 'Fifteen, take away seven. Tap the number that is left.', zh: '十五减去七。请点出还剩多少。' },
  on: { en: '15 − 7' },
  opts: [[numeral(8)], [numeral(7), 'quantity_near'], [numeral(9), 'quantity_near'], [numeral(22), 'quantity_far']],
});
item({
  id: IT('COG-B', 'A', 3), strand: 'COG-B', module: 'M-MATH', form: 'A', seq: 8,
  type: 'tap', tag: 'word_problem_within_twenty', milestone: 'COG-B.G1.2',
  audio: { en: 'There were twelve apples in the basket. The children ate five of them. Tap the number of apples left in the basket.', zh: '篮子里有十二个苹果，孩子们吃掉了五个。请点出篮子里还剩几个苹果。' },
  on: { en: 'problem: 12 apples, 5 eaten' },
  stim: ['ST.apple'],
  opts: [[numeral(7)], [numeral(17), 'quantity_far'], [numeral(6), 'quantity_near'], [numeral(8), 'quantity_near']],
});
item({
  id: IT('COG-B', 'A', 4), strand: 'COG-B', module: 'M-MATH', form: 'A', seq: 9,
  type: 'tap', tag: 'word_problem_within_twenty', milestone: 'COG-B.G1.2',
  audio: { en: 'Six birds were sitting in the tree. Seven more birds flew to the tree. Tap the number of birds in the tree now.', zh: '树上有六只鸟，又飞来七只。请点出现在树上一共有几只鸟。' },
  on: { en: 'problem: 6 birds, 7 more' },
  stim: ['ST.bird'],
  opts: [[numeral(13)], [numeral(12), 'quantity_near'], [numeral(14), 'quantity_near'], [numeral(1), 'quantity_far']],
});
item({
  id: IT('COG-B', 'B', 1), strand: 'COG-B', module: 'M-MATH', form: 'B', seq: 6,
  type: 'tap', tag: 'add_subtract_within_twenty', milestone: 'COG-B.G1.1',
  audio: { en: 'Nine and seven. Tap the number they make altogether.', zh: '九加七。请点出它们合起来是多少。' },
  on: { en: '9 + 7' },
  opts: [[numeral(16)], [numeral(15), 'quantity_near'], [numeral(17), 'quantity_near'], [numeral(2), 'quantity_far']],
});
item({
  id: IT('COG-B', 'B', 2), strand: 'COG-B', module: 'M-MATH', form: 'B', seq: 7,
  type: 'tap', tag: 'add_subtract_within_twenty', milestone: 'COG-B.G1.1',
  audio: { en: 'Sixteen, take away eight. Tap the number that is left.', zh: '十六减去八。请点出还剩多少。' },
  on: { en: '16 − 8' },
  opts: [[numeral(8)], [numeral(7), 'quantity_near'], [numeral(9), 'quantity_near'], [numeral(24), 'quantity_far']],
});
item({
  id: IT('COG-B', 'B', 3), strand: 'COG-B', module: 'M-MATH', form: 'B', seq: 8,
  type: 'tap', tag: 'word_problem_within_twenty', milestone: 'COG-B.G1.2',
  audio: { en: 'There were fourteen buns on the tray. The class ate six of them. Tap the number of buns left on the tray.', zh: '托盘上有十四个小面包，班上的孩子吃掉了六个。请点出托盘上还剩几个。' },
  on: { en: 'problem: 14 buns, 6 eaten' },
  stim: ['ST.bun'],
  opts: [[numeral(8)], [numeral(20), 'quantity_far'], [numeral(7), 'quantity_near'], [numeral(9), 'quantity_near']],
});
item({
  id: IT('COG-B', 'B', 4), strand: 'COG-B', module: 'M-MATH', form: 'B', seq: 9,
  type: 'tap', tag: 'word_problem_within_twenty', milestone: 'COG-B.G1.2',
  audio: { en: 'Five ducks were on the pond. Eight more ducks swam over. Tap the number of ducks on the pond now.', zh: '池塘里有五只鸭子，又游来八只。请点出现在池塘里一共有几只鸭子。' },
  on: { en: 'problem: 5 ducks, 8 more' },
  stim: ['ST.duck'],
  opts: [[numeral(13)], [numeral(12), 'quantity_near'], [numeral(14), 'quantity_near'], [numeral(3), 'quantity_far']],
});

/* ── COG-C · shape, space & pattern ──────────────────────────────────────────── */
item({
  id: IT('COG-C', 'A', 1), strand: 'COG-C', module: 'M-MATH', form: 'A', seq: 10,
  type: 'tap', tag: 'name_solid_shape', milestone: 'COG-C.G1.1',
  audio: { en: 'Tap the cube.', zh: '请点出正方体。' },
  on: { en: 'solid: cube' },
  opts: [[solid('cube')], [solid('cuboid'), 'shape_near'], [solid('cylinder'), 'shape_near'], [solid('sphere'), 'shape_near']],
});
item({
  id: IT('COG-C', 'A', 2), strand: 'COG-C', module: 'M-MATH', form: 'A', seq: 11,
  type: 'oral', rubricKey: 'name_solid', tag: 'name_solid_shape', milestone: 'COG-C.G1.1',
  audio: { en: 'What is this shape called? Tell me one thing that is true about every one of them.', zh: '这个形体叫什么？再说出这类形体都有的一个特点。' },
  on: { en: 'name and describe: cylinder' },
  stim: [solid('cylinder')],
  opts: [],
});
item({
  id: IT('COG-C', 'A', 3), strand: 'COG-C', module: 'M-MATH', form: 'A', seq: 12,
  type: 'tap', tag: 'halves_and_quarters', milestone: 'COG-C.G1.2',
  audio: { en: 'Tap the shape that has one half coloured in.', zh: '请点出涂了二分之一的那个图形。' },
  on: { en: 'one half shaded' },
  opts: [[frac('circle_half_shaded')], [frac('circle_quarter_shaded'), 'pattern_near'], [frac('circle_uneven_shaded'), 'pattern_near'], [frac('circle_three_quarters_shaded'), 'pattern_near']],
});
item({
  id: IT('COG-C', 'A', 4), strand: 'COG-C', module: 'M-MATH', form: 'A', seq: 13,
  type: 'tap', tag: 'halves_and_quarters', milestone: 'COG-C.G1.2',
  audio: { en: 'Tap the shape that is cut into four equal parts.', zh: '请点出被分成四等份的那个图形。' },
  on: { en: 'four equal parts' },
  opts: [[frac('square_quarters')], [frac('square_halves'), 'pattern_near'], [frac('square_uneven'), 'pattern_near'], [frac('circle_halves'), 'pattern_near']],
});
item({
  id: IT('COG-C', 'B', 1), strand: 'COG-C', module: 'M-MATH', form: 'B', seq: 10,
  type: 'tap', tag: 'name_solid_shape', milestone: 'COG-C.G1.1',
  audio: { en: 'Tap the cone.', zh: '请点出圆锥体。' },
  on: { en: 'solid: cone' },
  opts: [[solid('cone')], [solid('pyramid'), 'shape_near'], [solid('cylinder'), 'shape_near'], [solid('cube'), 'shape_near']],
});
item({
  id: IT('COG-C', 'B', 2), strand: 'COG-C', module: 'M-MATH', form: 'B', seq: 11,
  type: 'oral', rubricKey: 'name_solid', tag: 'name_solid_shape', milestone: 'COG-C.G1.1',
  audio: { en: 'What is this shape called? Tell me one thing that is true about every one of them.', zh: '这个形体叫什么？再说出这类形体都有的一个特点。' },
  on: { en: 'name and describe: sphere' },
  stim: [solid('sphere')],
  opts: [],
});
item({
  id: IT('COG-C', 'B', 3), strand: 'COG-C', module: 'M-MATH', form: 'B', seq: 12,
  type: 'tap', tag: 'halves_and_quarters', milestone: 'COG-C.G1.2',
  audio: { en: 'Tap the shape that has one quarter coloured in.', zh: '请点出涂了四分之一的那个图形。' },
  on: { en: 'one quarter shaded' },
  opts: [[frac('square_quarter_shaded')], [frac('square_half_shaded'), 'pattern_near'], [frac('square_uneven_shaded'), 'pattern_near'], [frac('circle_half_shaded'), 'pattern_near']],
});
item({
  id: IT('COG-C', 'B', 4), strand: 'COG-C', module: 'M-MATH', form: 'B', seq: 13,
  type: 'tap', tag: 'halves_and_quarters', milestone: 'COG-C.G1.2',
  audio: { en: 'Tap the shape that is cut into two equal parts.', zh: '请点出被分成两等份的那个图形。' },
  on: { en: 'two equal parts' },
  opts: [[frac('circle_halves')], [frac('circle_uneven'), 'pattern_near'], [frac('circle_quarters'), 'pattern_near'], [frac('square_quarters'), 'pattern_near']],
});

/* ── COG-D · measurement, sorting & classification ───────────────────────────── */
item({
  id: IT('COG-D', 'A', 1), strand: 'COG-D', module: 'M-MATH', form: 'A', seq: 14,
  type: 'tap', tag: 'read_clock_half_hour', milestone: 'COG-D.G1.1',
  audio: { en: 'Tap the clock that shows three o’clock.', zh: '请点出显示三点整的那个钟。' },
  on: { en: 'clock: three o’clock' },
  opts: [[clock(3, 0)], [clock(3, 30), 'time_near'], [clock(9, 0), 'time_near'], [clock(12, 0), 'time_far']],
});
item({
  id: IT('COG-D', 'A', 2), strand: 'COG-D', module: 'M-MATH', form: 'A', seq: 15,
  type: 'tap', tag: 'read_clock_half_hour', milestone: 'COG-D.G1.1',
  audio: { en: 'Tap the clock that shows half past six.', zh: '请点出显示六点半的那个钟。' },
  on: { en: 'clock: half past six' },
  opts: [[clock(6, 30)], [clock(6, 0), 'time_near'], [clock(7, 30), 'time_near'], [clock(3, 30), 'time_far']],
});
item({
  id: IT('COG-D', 'A', 3), strand: 'COG-D', module: 'M-MATH', form: 'A', seq: 16,
  type: 'tap', tag: 'compare_by_measure', milestone: 'COG-D.G1.2',
  audio: { en: 'Here are three trees. Tap the one that is tallest of all.', zh: '这里有三棵树。请点出最高的那一棵。' },
  on: { en: 'tallest of three' },
  opts: [['ST.at_tree_tall'], ['ST.at_tree_mid', 'size_near'], ['ST.at_tree_short', 'size_far'], ['ST.at_rod_long', 'attribute_far']],
});
item({
  id: IT('COG-D', 'B', 1), strand: 'COG-D', module: 'M-MATH', form: 'B', seq: 14,
  type: 'tap', tag: 'read_clock_half_hour', milestone: 'COG-D.G1.1',
  audio: { en: 'Tap the clock that shows nine o’clock.', zh: '请点出显示九点整的那个钟。' },
  on: { en: 'clock: nine o’clock' },
  opts: [[clock(9, 0)], [clock(9, 30), 'time_near'], [clock(3, 0), 'time_near'], [clock(12, 0), 'time_far']],
});
item({
  id: IT('COG-D', 'B', 2), strand: 'COG-D', module: 'M-MATH', form: 'B', seq: 15,
  type: 'tap', tag: 'read_clock_half_hour', milestone: 'COG-D.G1.1',
  audio: { en: 'Tap the clock that shows half past ten.', zh: '请点出显示十点半的那个钟。' },
  on: { en: 'clock: half past ten' },
  opts: [[clock(10, 30)], [clock(10, 0), 'time_near'], [clock(11, 30), 'time_near'], [clock(4, 30), 'time_far']],
});
item({
  id: IT('COG-D', 'B', 3), strand: 'COG-D', module: 'M-MATH', form: 'B', seq: 16,
  type: 'tap', tag: 'compare_by_measure', milestone: 'COG-D.G1.2',
  audio: { en: 'Here are three rods. Tap the one that is shortest of all.', zh: '这里有三根棒。请点出最短的那一根。' },
  on: { en: 'shortest of three' },
  opts: [['ST.at_rod_short'], ['ST.at_rod_mid', 'size_near'], ['ST.at_rod_long', 'size_far'], ['ST.at_pencil_long', 'attribute_far']],
});

practice('IT.PRACTICE.MATH.G1.01', 'M-MATH', 'COG-A', 1, 'P', 'Tap the star.', '请点一下星星。', 'practice: star',
  ['ST.star', 'ST.moon', 'ST.sun', 'ST.cloud'], false);
practice('IT.PRACTICE.MATH.G1.02', 'M-MATH', 'COG-A', 2, 'P', 'Tap the circle.', '请点一下圆形。', 'practice: circle',
  ['ST.circle', 'ST.square', 'ST.triangle', 'ST.rectangle'], false);

/* ═════════════════════════════ 5. FOCUS GAMES — M-FOCUS (band G1, form A) ════ */
/* Optional module, outside the milestone inventory by design (strand ATL-X carries
 * no milestones and no construct tag). At Canopy the rule is held for longer and the
 * memory pattern is denser than at A5. */
const focus = (n, taskFamily, audioEn, audioZh, onEn, stim, opts) => item({
  id: IT('ATL-X', 'A', n), strand: 'ATL-X', module: 'M-FOCUS', form: 'A', seq: n,
  type: 'tap', tag: null, milestone: null, taskFamily,
  audio: { en: audioEn, zh: audioZh }, on: { en: onEn }, stim, opts,
});
focus(1, 'inhibition', 'When you see the cup, tap the jug. Tap the jug.', '看到杯子时，请点水壶。请点水壶。',
  'cup → tap jug', ['ST.cup'], [['ST.jug'], ['ST.cup', 'prepotent'], ['ST.mug', 'semantic'], ['ST.pot', 'semantic']]);
focus(2, 'inhibition', 'When you see the big ball, tap the small one. Tap the small one.', '看到大球时，请点小球。请点小球。',
  'big ball → tap small ball', ['ST.at_ball_big'], [['ST.at_ball_small'], ['ST.at_ball_big', 'prepotent'], ['ST.at_ball_mid', 'size_near'], ['ST.ball', 'semantic']]);
focus(3, 'inhibition', 'Here is a tall tree. Tap the short one.', '这是一棵高的树。请点矮的那一棵。',
  'tall tree → tap short tree', ['ST.at_tree_tall'], [['ST.at_tree_short'], ['ST.at_tree_tall', 'prepotent'], ['ST.at_tree_mid', 'size_near'], ['ST.tree', 'semantic']]);
focus(4, 'memory', 'Look at the squares that are filled in. Now tap the one that is the same.', '看清楚哪些格子被涂满了。现在请点出一样的那一个。',
  'remember 3 cells', ['ST.grid.1-5-9'], [['ST.grid.1-5-9'], ['ST.grid.3-5-7', 'position_near'], ['ST.grid.1-2-3', 'position_near'], ['ST.grid.7-8-9', 'position_near']]);
focus(5, 'memory', 'Look at the squares that are filled in. Now tap the one that is the same.', '看清楚哪些格子被涂满了。现在请点出一样的那一个。',
  'remember 3 cells', ['ST.grid.2-5-8'], [['ST.grid.2-5-8'], ['ST.grid.4-5-6', 'position_near'], ['ST.grid.1-5-9', 'position_near'], ['ST.grid.3-5-7', 'position_near']]);
focus(6, 'memory', 'Look at the squares that are filled in. Now tap the one that is the same.', '看清楚哪些格子被涂满了。现在请点出一样的那一个。',
  'remember 3 cells', ['ST.grid.4-5-6'], [['ST.grid.4-5-6'], ['ST.grid.2-5-8', 'position_near'], ['ST.grid.7-8-9', 'position_near'], ['ST.grid.1-2-3', 'position_near']]);

practice('IT.PRACTICE.FOCUS.G1.01', 'M-FOCUS', 'ATL-X', 1, 'P', 'Tap the sun.', '请点一下太阳。', 'practice: sun',
  ['ST.sun', 'ST.moon', 'ST.star', 'ST.cloud'], false);
practice('IT.PRACTICE.FOCUS.G1.02', 'M-FOCUS', 'ATL-X', 2, 'P', 'Tap the moon.', '请点一下月亮。', 'practice: moon',
  ['ST.moon', 'ST.sun', 'ST.cloud', 'ST.star'], false);

/* ══════════════════════════════════════ 6. DIRECT ITEMS — M-EFL (band G1) ════ */
/* The English track stays a separate track, never folded into core language. At
 * Canopy it moves from single words to a three-part instruction, the middle sound in
 * a word, two-letter sounds, reading a short English sentence, and asking a question
 * rather than only answering one.
 *
 * Design patterns only — the shape of the tasks follows the way primary-age English
 * checks are usually built (picture-matching listening, a small closed vocabulary,
 * modelled question frames). No CEFR, Cambridge or Trinity level is claimed anywhere,
 * here or in the report. */

/* ── E1 · receptive vocabulary ───────────────────────────────────────────────── */
const efl = (o) => item({ ...o, module: 'M-EFL', en: true });

efl({ id: IT('E1', 'A', 1), strand: 'E1', form: 'A', seq: 1, type: 'tap', tag: 'english_vocab_school_day', milestone: 'E1.G1.1',
  audio: { en: 'Tap the bell.' }, on: { en: 'vocabulary: bell' },
  opts: [['ST.bell'], ['ST.bag', 'semantic'], ['ST.box', 'semantic'], ['ST.book', 'semantic']] });
efl({ id: IT('E1', 'A', 2), strand: 'E1', form: 'A', seq: 2, type: 'tap', tag: 'english_vocab_school_day', milestone: 'E1.G1.1',
  audio: { en: 'Tap the shirt.' }, on: { en: 'vocabulary: shirt' },
  opts: [['ST.shirt'], ['ST.coat', 'semantic'], ['ST.sock', 'semantic'], ['ST.shoe', 'semantic']] });
efl({ id: IT('E1', 'A', 3), strand: 'E1', form: 'A', seq: 3, type: 'tap', tag: 'english_vocab_school_day', milestone: 'E1.G1.1',
  audio: { en: 'Tap the jug.' }, on: { en: 'vocabulary: jug' },
  opts: [['ST.jug'], ['ST.mug', 'semantic'], ['ST.cup', 'semantic'], ['ST.pot', 'semantic']] });
efl({ id: IT('E1', 'A', 4), strand: 'E1', form: 'A', seq: 4, type: 'tap', tag: 'english_vocab_action_and_place', milestone: 'E1.G1.2',
  audio: { en: 'Tap the picture that shows sweeping.' }, on: { en: 'action: sweeping' },
  opts: [['ST.sc_sweep'], ['ST.sc_wash', 'semantic'], ['ST.sc_run', 'semantic'], ['ST.sc_read', 'semantic']] });
efl({ id: IT('E1', 'A', 5), strand: 'E1', form: 'A', seq: 5, type: 'tap', tag: 'english_vocab_action_and_place', milestone: 'E1.G1.2',
  audio: { en: 'Tap the picture where the cat is behind the box.' }, on: { en: 'position: behind' },
  opts: [['ST.sc_cat_behind'], ['ST.sc_cat_in', 'position_near'], ['ST.sc_cat_next', 'position_near'], ['ST.sc_cat_on', 'position_near']] });
efl({ id: IT('E1', 'B', 1), strand: 'E1', form: 'B', seq: 1, type: 'tap', tag: 'english_vocab_school_day', milestone: 'E1.G1.1',
  audio: { en: 'Tap the door.' }, on: { en: 'vocabulary: door' },
  opts: [['ST.door'], ['ST.box', 'semantic'], ['ST.bed', 'semantic'], ['ST.chair', 'semantic']] });
efl({ id: IT('E1', 'B', 2), strand: 'E1', form: 'B', seq: 2, type: 'tap', tag: 'english_vocab_school_day', milestone: 'E1.G1.1',
  audio: { en: 'Tap the coat.' }, on: { en: 'vocabulary: coat' },
  opts: [['ST.coat'], ['ST.cap', 'semantic'], ['ST.hat', 'semantic'], ['ST.shirt', 'semantic']] });
efl({ id: IT('E1', 'B', 3), strand: 'E1', form: 'B', seq: 3, type: 'tap', tag: 'english_vocab_school_day', milestone: 'E1.G1.1',
  audio: { en: 'Tap the mug.' }, on: { en: 'vocabulary: mug' },
  opts: [['ST.mug'], ['ST.jug', 'semantic'], ['ST.cup', 'semantic'], ['ST.pan', 'semantic']] });
efl({ id: IT('E1', 'B', 4), strand: 'E1', form: 'B', seq: 4, type: 'tap', tag: 'english_vocab_action_and_place', milestone: 'E1.G1.2',
  audio: { en: 'Tap the picture that shows washing hands.' }, on: { en: 'action: washing hands' },
  opts: [['ST.sc_wash'], ['ST.sc_drink', 'semantic'], ['ST.sc_eat', 'semantic'], ['ST.sc_sleep', 'semantic']] });
efl({ id: IT('E1', 'B', 5), strand: 'E1', form: 'B', seq: 5, type: 'tap', tag: 'english_vocab_action_and_place', milestone: 'E1.G1.2',
  audio: { en: 'Tap the picture where the ball is between the boxes.' }, on: { en: 'position: between' },
  opts: [['ST.sc_ball_between'], ['ST.sc_ball_in_box', 'position_near'], ['ST.sc_ball_on_chair', 'position_near'], ['ST.sc_ball_under_chair', 'position_near']] });

/* ── E2 · listening & instruction-following ──────────────────────────────────── */
efl({ id: IT('E2', 'A', 1), strand: 'E2', form: 'A', seq: 6, type: 'seq', seqLen: 3, tag: 'three_step_en', milestone: 'E2.G1.1',
  audio: { en: 'Touch the cup, then the book, then the tree.' }, on: { en: 'three-step: cup, book, tree' },
  opts: [['ST.cup'], ['ST.book'], ['ST.tree'], ['ST.hat', 'unrelated']] });
efl({ id: IT('E2', 'A', 2), strand: 'E2', form: 'A', seq: 7, type: 'seq', seqLen: 3, tag: 'three_step_en', milestone: 'E2.G1.1',
  audio: { en: 'Touch the hat, then the shoe, then the pen.' }, on: { en: 'three-step: hat, shoe, pen' },
  opts: [['ST.hat'], ['ST.shoe'], ['ST.pen'], ['ST.mug', 'unrelated']] });
efl({ id: IT('E2', 'A', 3), strand: 'E2', form: 'A', seq: 8, type: 'seq', seqLen: 2, tag: 'instruction_with_order_en', milestone: 'E2.G1.2',
  audio: { en: 'Before you touch the ball, touch the key.' }, on: { en: 'order word: before' },
  opts: [['ST.key'], ['ST.ball'], ['ST.mop', 'unrelated'], ['ST.nut', 'unrelated']] });
efl({ id: IT('E2', 'B', 1), strand: 'E2', form: 'B', seq: 6, type: 'seq', seqLen: 3, tag: 'three_step_en', milestone: 'E2.G1.1',
  audio: { en: 'Touch the mat, then the bell, then the fox.' }, on: { en: 'three-step: mat, bell, fox' },
  opts: [['ST.mat'], ['ST.bell'], ['ST.fox'], ['ST.jug', 'unrelated']] });
efl({ id: IT('E2', 'B', 2), strand: 'E2', form: 'B', seq: 7, type: 'seq', seqLen: 3, tag: 'three_step_en', milestone: 'E2.G1.1',
  audio: { en: 'Touch the jug, then the leaf, then the box.' }, on: { en: 'three-step: jug, leaf, box' },
  opts: [['ST.jug'], ['ST.leaf'], ['ST.box'], ['ST.pen', 'unrelated']] });
efl({ id: IT('E2', 'B', 3), strand: 'E2', form: 'B', seq: 8, type: 'seq', seqLen: 2, tag: 'instruction_with_order_en', milestone: 'E2.G1.2',
  audio: { en: 'Before you touch the duck, touch the log.' }, on: { en: 'order word: before' },
  opts: [['ST.log'], ['ST.duck'], ['ST.net', 'unrelated'], ['ST.rug', 'unrelated']] });

/* ── E3 · phonological awareness in English ──────────────────────────────────── */
efl({ id: IT('E3', 'A', 1), strand: 'E3', form: 'A', seq: 9, type: 'tap', tag: 'english_medial_vowel', milestone: 'E3.G1.1',
  audio: { en: 'Listen to the middle sound in cat. Tap the picture with the same middle sound.' }, on: { en: 'middle sound: cat' },
  opts: [['ST.bag'], ['ST.pig', 'phonological'], ['ST.dog', 'phonological'], ['ST.cup', 'phonological']] });
efl({ id: IT('E3', 'A', 2), strand: 'E3', form: 'A', seq: 10, type: 'tap', tag: 'english_medial_vowel', milestone: 'E3.G1.1',
  audio: { en: 'Listen to the middle sound in pot. Tap the picture with the same middle sound.' }, on: { en: 'middle sound: pot' },
  opts: [['ST.log'], ['ST.fig', 'phonological'], ['ST.hen', 'phonological'], ['ST.bus', 'phonological']] });
efl({ id: IT('E3', 'A', 3), strand: 'E3', form: 'A', seq: 11, type: 'tap', tag: 'english_phoneme_blend', milestone: 'E3.G1.2',
  audio: { en: 'Listen to these sounds and put them together: f — o — x. Tap the picture.' }, on: { en: 'blend: f-o-x' },
  opts: [['ST.fox'], ['ST.box', 'phonological'], ['ST.fig', 'phonological'], ['ST.sock', 'unrelated']] });
efl({ id: IT('E3', 'B', 1), strand: 'E3', form: 'B', seq: 9, type: 'tap', tag: 'english_medial_vowel', milestone: 'E3.G1.1',
  audio: { en: 'Listen to the middle sound in pig. Tap the picture with the same middle sound.' }, on: { en: 'middle sound: pig' },
  opts: [['ST.tin'], ['ST.pan', 'phonological'], ['ST.mop', 'phonological'], ['ST.mug', 'phonological']] });
efl({ id: IT('E3', 'B', 2), strand: 'E3', form: 'B', seq: 10, type: 'tap', tag: 'english_medial_vowel', milestone: 'E3.G1.1',
  audio: { en: 'Listen to the middle sound in bus. Tap the picture with the same middle sound.' }, on: { en: 'middle sound: bus' },
  opts: [['ST.nut'], ['ST.net', 'phonological'], ['ST.cat', 'phonological'], ['ST.log', 'phonological']] });
efl({ id: IT('E3', 'B', 3), strand: 'E3', form: 'B', seq: 11, type: 'tap', tag: 'english_phoneme_blend', milestone: 'E3.G1.2',
  audio: { en: 'Listen to these sounds and put them together: d — u — ck. Tap the picture.' }, on: { en: 'blend: d-u-ck' },
  opts: [['ST.duck'], ['ST.dog', 'phonological'], ['ST.cup', 'phonological'], ['ST.sock', 'unrelated']] });

/* ── E4 · two-letter sounds (the Canopy form of letter–sound knowledge) ──────── */
efl({ id: IT('E4', 'A', 1), strand: 'E4', form: 'A', seq: 12, type: 'tap', tag: 'digraph_sound_receptive', milestone: 'E4.G1.1',
  audio: { en: 'Tap the two letters that make the sound sh.' }, on: { en: 'grapheme for /sh/' },
  opts: [[digraph('sh')], [digraph('ch'), 'letter_near'], [digraph('th'), 'letter_near'], [digraph('ck'), 'letter_near']] });
efl({ id: IT('E4', 'A', 2), strand: 'E4', form: 'A', seq: 13, type: 'oral', rubricKey: 'letter_sound', tag: 'digraph_sound_expressive', milestone: 'E4.G1.2',
  audio: { en: 'What sound do these two letters make together?' }, on: { en: 'say the sound: th' },
  stim: [digraph('th')], opts: [] });
efl({ id: IT('E4', 'B', 1), strand: 'E4', form: 'B', seq: 12, type: 'tap', tag: 'digraph_sound_receptive', milestone: 'E4.G1.1',
  audio: { en: 'Tap the two letters that make the sound ch.' }, on: { en: 'grapheme for /ch/' },
  opts: [[digraph('ch')], [digraph('sh'), 'letter_near'], [digraph('th'), 'letter_near'], [digraph('ng'), 'letter_near']] });
efl({ id: IT('E4', 'B', 2), strand: 'E4', form: 'B', seq: 13, type: 'oral', rubricKey: 'letter_sound', tag: 'digraph_sound_expressive', milestone: 'E4.G1.2',
  audio: { en: 'What sound do these two letters make together?' }, on: { en: 'say the sound: ng' },
  stim: [digraph('ng')], opts: [] });

/* ── E5 · word and sentence reading in English ───────────────────────────────── */
efl({ id: IT('E5', 'A', 1), strand: 'E5', form: 'A', seq: 14, type: 'tap', tag: 'read_english_word_pattern', milestone: 'E5.G1.1', decodable: 'tree',
  audio: { en: 'Read the words and tap the one that says tree.' }, on: { en: 'word: tree' }, stim: ['ST.tree'],
  opts: [[word('tree')], [word('three'), 'word_near'], [word('free'), 'word_near'], [word('true'), 'word_near']] });
efl({ id: IT('E5', 'A', 2), strand: 'E5', form: 'A', seq: 15, type: 'tap', tag: 'read_english_word_pattern', milestone: 'E5.G1.1', decodable: 'chair',
  audio: { en: 'Read the words and tap the one that says chair.' }, on: { en: 'word: chair' }, stim: ['ST.chair'],
  opts: [[word('chair')], [word('chain'), 'word_near'], [word('hair'), 'word_near'], [word('char'), 'word_near']] });
efl({ id: IT('E5', 'A', 3), strand: 'E5', form: 'A', seq: 16, type: 'tap', tag: 'read_english_sentence', milestone: 'E5.G1.2',
  audio: { en: 'Read this sentence to yourself, then tap the picture it tells about.' }, on: { en: 'sentence: The cat is under the table.' },
  stim: [sentence('e1', 'The cat is under the table.', '猫在桌子下面。')],
  opts: [['ST.sc_cat_under'], ['ST.sc_cat_on', 'position_near'], ['ST.sc_cat_in', 'position_near'], ['ST.sc_cat_behind', 'position_near']] });
efl({ id: IT('E5', 'B', 1), strand: 'E5', form: 'B', seq: 14, type: 'tap', tag: 'read_english_word_pattern', milestone: 'E5.G1.1', decodable: 'shoe',
  audio: { en: 'Read the words and tap the one that says shoe.' }, on: { en: 'word: shoe' }, stim: ['ST.shoe'],
  opts: [[word('shoe')], [word('show'), 'word_near'], [word('shop'), 'word_near'], [word('hoe'), 'word_near']] });
efl({ id: IT('E5', 'B', 2), strand: 'E5', form: 'B', seq: 15, type: 'tap', tag: 'read_english_word_pattern', milestone: 'E5.G1.1', decodable: 'truck',
  audio: { en: 'Read the words and tap the one that says truck.' }, on: { en: 'word: truck' }, stim: ['ST.truck'],
  opts: [[word('truck')], [word('trick'), 'word_near'], [word('track'), 'word_near'], [word('duck'), 'word_near']] });
efl({ id: IT('E5', 'B', 3), strand: 'E5', form: 'B', seq: 16, type: 'tap', tag: 'read_english_sentence', milestone: 'E5.G1.2',
  audio: { en: 'Read this sentence to yourself, then tap the picture it tells about.' }, on: { en: 'sentence: The ball is on the chair.' },
  stim: [sentence('e2', 'The ball is on the chair.', '球在椅子上。')],
  opts: [['ST.sc_ball_on_chair'], ['ST.sc_ball_under_chair', 'position_near'], ['ST.sc_ball_behind_chair', 'position_near'], ['ST.sc_ball_in_box', 'position_near']] });

/* ── E6 · spoken production ──────────────────────────────────────────────────── */
efl({ id: IT('E6', 'A', 1), strand: 'E6', form: 'A', seq: 17, type: 'oral', rubricKey: 'english_question', tag: 'english_ask_question', milestone: 'E6.G1.1',
  audio: { en: 'Look at this picture. Ask me a question about it in English.' }, on: { en: 'ask a question' },
  stim: ['ST.sc_read'], opts: [] });
efl({ id: IT('E6', 'A', 2), strand: 'E6', form: 'A', seq: 18, type: 'oral', rubricKey: 'oral_phrase', tag: 'english_describe_picture', milestone: 'E6.G1.2',
  audio: { en: 'Tell me about this picture in English.' }, on: { en: 'describe the picture' },
  stim: ['ST.sc_eat'], opts: [] });
efl({ id: IT('E6', 'B', 1), strand: 'E6', form: 'B', seq: 17, type: 'oral', rubricKey: 'english_question', tag: 'english_ask_question', milestone: 'E6.G1.1',
  audio: { en: 'Look at this picture. Ask me a question about it in English.' }, on: { en: 'ask a question' },
  stim: ['ST.sc_jump'], opts: [] });
efl({ id: IT('E6', 'B', 2), strand: 'E6', form: 'B', seq: 18, type: 'oral', rubricKey: 'oral_phrase', tag: 'english_describe_picture', milestone: 'E6.G1.2',
  audio: { en: 'Tell me about this picture in English.' }, on: { en: 'describe the picture' },
  stim: ['ST.sc_sweep'], opts: [] });

practice('IT.PRACTICE.EFL.G1.01', 'M-EFL', 'E1', 1, 'P', 'Tap the dog.', null, 'practice: dog',
  ['ST.dog', 'ST.cat', 'ST.cup', 'ST.hat'], true);
practice('IT.PRACTICE.EFL.G1.02', 'M-EFL', 'E1', 2, 'P', 'Tap the sun.', null, 'practice: sun',
  ['ST.sun', 'ST.moon', 'ST.tree', 'ST.key'], true);

/* ═══════════════════════════════════ 7. MILESTONES — band G1 (Canopy) ════════ */

const STRAND = Object.fromEntries(bank['milestones.json'].strands.map((s) => [s.id, s]));

/**
 * A Canopy crosswalk. ELOF/EYFS/China-MoE are all preschool frameworks that stop before
 * this band, so they are carried as explicit empties rather than stretched, and the
 * citation weight moves to `ccss` (US Common Core Grade 1) and `ukNc` (UK National
 * Curriculum Year 1 / Key Stage 1). `otherAnchor` names the non-statutory framework a
 * non-academic strand is written against, where one applies.
 */
const cw = (ccss, ukNc, otherAnchor, montessori, montreeEnglish) => ({
  elof: [],
  eyfs: { area: null, band: null, elg: null },
  chinaMoe: null,
  ccss,
  ukNc,
  ...(otherAnchor ? { otherAnchor } : {}),
  montessori,
  ...(montreeEnglish ? { montreeEnglish } : {}),
});
const mo = (areaKeys, workKeys) => ({ areaKeys, workKeys });

const g1Milestones = [];
const g1ObsItems = [];

/** Direct milestone: evidence is derived from the items already authored above. */
function direct(strandId, n, tag, en, zh, crosswalk) {
  const id = `${strandId}.G1.${n}`;
  const all = [...coreItems, ...eflItems]
    .filter((i) => i.scored && i.strandId === strandId && i.constructTag === tag);
  const byForm = { A: all.filter((i) => i.form === 'A').map((i) => i.id), B: all.filter((i) => i.form === 'B').map((i) => i.id) };
  g1Milestones.push({
    id,
    strandId,
    domainId: STRAND[strandId].domainId,
    ageBand: 'G1',
    expectation: 'expected',
    constructTag: tag,
    statement: { en, zh },
    bandDescriptors: null,
    evidence: {
      itemIds: [...byForm.A, ...byForm.B],
      byForm,
      minCoverage: 0.5,
      evidenceBand: 'G1',
    },
    crosswalk,
  });
}

/** Observation milestone + its paired checklist record (one call authors both). */
function observed(strandId, n, en, zh, bands, crosswalk) {
  const id = `${strandId}.G1.${n}`;
  const itemId = `IT.OBS.${strandId}.G1.${n}`;
  const bandDescriptors = {
    emerging: { en: bands[0][0], zh: bands[0][1] },
    developing: { en: bands[1][0], zh: bands[1][1] },
    secure: { en: bands[2][0], zh: bands[2][1] },
  };
  g1Milestones.push({
    id,
    strandId,
    domainId: STRAND[strandId].domainId,
    ageBand: 'G1',
    expectation: 'expected',
    statement: { en, zh },
    bandDescriptors,
    evidence: { observationItemId: itemId, minCoverage: 1 },
    crosswalk,
  });
  g1ObsItems.push({
    id: itemId,
    milestoneId: id,
    strandId,
    domainId: STRAND[strandId].domainId,
    ageBand: 'G1',
    form: 'O',
    moduleId: 'M-OBS',
    type: 'observation_checklist',
    expectation: 'expected',
    statement: { en, zh },
    bandDescriptors,
    scoring: { method: 'teacher_band', bands: ['emerging', 'developing', 'secure'], maxPoints: null, rubric: null },
    evidenceNote: { maxChars: 300, optional: true },
    evidenceMedia: { field: 'montree_media.id', optional: true },
    paper: { cardsPerRow: 1, responseMode: 'teacher ticks one band and may add an evidence note' },
    prompt: {
      teacherScript: {
        en: 'Rate this from what you have already seen in the work cycle. Choose the best fit — this is a judgement, not a tally.',
        zh: '请根据你在工作周期中已经观察到的情况评定。选择最贴近的一档——这是整体判断，不是逐项打勾。',
      },
    },
  });
}

/* ── ATL · approaches to learning (observation) ──────────────────────────────── */
const ATL_MO = mo(['practical_life'], ['pl_work_cycle']);
observed('ATL-A', 1, 'Works with deep focus on one activity for a long stretch.', '能长时间专注地做一项活动。', [
  ['Stays with an activity for a few minutes before moving on.', '能投入几分钟后就转去做别的。'],
  ['Works for a good stretch and comes back after a short break.', '能投入较长一段时间，短暂离开后会回来继续。'],
  ['Works right through a long stretch and would rather not be interrupted.', '能一气呵成地长时间工作，不愿被打断。'],
], cw([], 'Key Stage 1 — PSHE: Health and Wellbeing (self-management)', 'NAEYC Approaches to Learning', ATL_MO));
observed('ATL-A', 2, 'Picks up work begun on another day and carries it through to the end.', '能接着前几天开始的工作继续做到完成。', [
  ['Starts again from the beginning, or leaves it.', '要么从头再来，要么放下不做。'],
  ['Picks it up again once someone reminds them where they stopped.', '经人提醒上次做到哪里后能接着做。'],
  ['Finds their own work, sees where they stopped, and finishes it.', '能自己找到工作、看出上次停在哪里并完成它。'],
], cw([], 'Key Stage 1 — PSHE: Health and Wellbeing (setting and working towards goals)', 'NAEYC Approaches to Learning', ATL_MO));

const ATL_B_MO = mo(['practical_life'], ['pl_free_choice']);
observed('ATL-B', 1, 'Chooses their own work and begins it without being told.', '能自己选择工作并主动开始。', [
  ['Waits to be pointed towards something.', '要等别人指点才开始。'],
  ['Chooses on most days, with a word from an adult now and then.', '多数日子能自己选择，偶尔需要成人提一句。'],
  ['Comes in, decides, and begins on their own.', '进教室后能自己决定并开始工作。'],
], cw([], 'Key Stage 1 — PSHE: Living in the Wider World (taking responsibility)', 'NAEYC Approaches to Learning', ATL_B_MO));
observed('ATL-B', 2, 'Asks a question when they are unsure what to do, instead of stopping.', '不确定该怎么做时会开口提问，而不是停下来。', [
  ['Goes quiet or waits when stuck.', '卡住时会沉默或干等。'],
  ['Asks once an adult comes near.', '成人走近时才会问。'],
  ['Seeks someone out and asks a clear question.', '会主动找人并把问题问清楚。'],
], cw(['SL.1.1.c'], 'English Year 1 — Spoken language: ask relevant questions to extend understanding', 'CASEL — Self-Awareness', ATL_B_MO));

const ATL_C_MO = mo(['sensorial'], ['se_problem_solving']);
observed('ATL-C', 1, 'Tries a way of their own before asking an adult for help.', '在向成人求助前会先自己试一种办法。', [
  ['Asks for help as soon as something is hard.', '一遇到困难就求助。'],
  ['Tries once, then asks.', '会试一次，然后求助。'],
  ['Tries more than one way, and can say what they tried.', '会尝试不止一种办法，并能说出自己试过什么。'],
], cw([], 'Key Stage 1 — Science: working scientifically (solving problems practically)', 'CASEL — Responsible Decision-Making', ATL_C_MO));
observed('ATL-C', 2, 'Looks back over their own work and puts right whatever does not look right.', '会回头检查自己的工作，并改正看起来不对的地方。', [
  ['Says it is finished without looking back over it.', '不回头检查就说做完了。'],
  ['Looks back when asked, and changes what an adult points out.', '经要求会回头看，并改成人指出的地方。'],
  ['Looks back without being asked and puts things right on their own.', '不用别人说就会回头检查并自行改正。'],
], cw(['RF.1.4.c'], 'English Year 1 — Word reading: re-reading to check the text makes sense', 'Montessori control of error', ATL_C_MO));

const ATL_D_MO = mo(['practical_life'], ['pl_grace_courtesy']);
observed('ATL-D', 1, 'Moves calmly from one activity to the next with little help.', '能平静地从一项活动过渡到下一项，几乎不需要帮助。', [
  ['Needs an adult alongside them at each change.', '每次转换都需要成人陪在身边。'],
  ['Moves on with a reminder, and settles again quickly.', '经提醒能转换，并很快重新投入。'],
  ['Finishes, tidies and moves on without being prompted.', '能自行收尾、整理并转入下一项。'],
], cw([], 'Key Stage 1 — PSHE: Health and Wellbeing (managing change and routines)', 'CASEL — Self-Management', ATL_D_MO));
observed('ATL-D', 2, 'Waits their turn and holds back a first impulse when the moment calls for it.', '能等待轮到自己，并在需要时忍住第一反应。', [
  ['Acts straight away and finds waiting hard.', '常立刻行动，很难等待。'],
  ['Waits with a reminder, for a short time.', '经提醒能短暂等待。'],
  ['Waits, and stops themselves without anyone saying anything.', '能自行等待并克制自己，无需他人提醒。'],
], cw([], 'Key Stage 1 — PSHE: Health and Wellbeing (self-regulation)', 'CASEL — Self-Management', ATL_D_MO));

/* ── SED · social & emotional (observation) ──────────────────────────────────── */
const SED_MO = mo(['practical_life'], ['pl_grace_courtesy']);
observed('SED-A', 1, 'Talks with a familiar adult about their own work and what they are trying to do.', '能与熟悉的成人谈自己的工作和想做的事。', [
  ['Answers a direct question about the work.', '别人直接问起时才回答。'],
  ['Shows the work and says a little about it.', '会展示工作并简单说一说。'],
  ['Starts the conversation and explains what they are aiming for.', '会主动开口，并说明自己想达成什么。'],
], cw(['SL.1.4'], 'English Year 1 — Spoken language: give well-structured explanations', 'CASEL — Relationship Skills', SED_MO));
observed('SED-A', 2, 'Asks an adult for what they need, in words, at a good moment.', '能在合适的时机用语言向成人表达需要。', [
  ['Shows what they need without words, or waits.', '用动作示意或干等，不开口。'],
  ['Asks, but often breaks in on something else.', '会开口，但常打断别人正在做的事。'],
  ['Waits for a good moment and asks clearly.', '会等合适的时机并清楚地提出。'],
], cw(['SL.1.6'], 'English Year 1 — Spoken language: speak audibly and fluently', 'CASEL — Relationship Skills', SED_MO));

observed('SED-B', 1, 'Takes turns in a group activity without an adult reminding them.', '在集体活动中能自觉轮流，不需成人提醒。', [
  ['Takes turns when an adult manages it.', '在成人组织下能轮流。'],
  ['Takes turns with an occasional reminder.', '偶尔需要提醒就能轮流。'],
  ['Keeps the turns going, and helps others keep them too.', '能自觉轮流，还会帮助同伴一起遵守。'],
], cw(['SL.1.1.a'], 'English Year 1 — Spoken language: take turns in discussion', 'CASEL — Relationship Skills', SED_MO));
observed('SED-B', 2, 'Builds on what another child has just said in a conversation.', '在交谈中能接着同伴刚说的话往下说。', [
  ['Talks alongside others rather than to them.', '各说各的，较少互相回应。'],
  ['Answers a peer, then moves to their own subject.', '会回应同伴，但很快转回自己的话题。'],
  ['Picks up a peer’s idea and adds to it across several exchanges.', '能接住同伴的想法并连续几轮往下谈。'],
], cw(['SL.1.1.b'], 'English Year 1 — Spoken language: build on the contributions of others', 'CASEL — Relationship Skills', SED_MO));

observed('SED-C', 1, 'Names how they feel with a word that fits, not only happy or sad.', '能用贴切的词说出自己的感受，而不只是"开心"或"难过"。', [
  ['Uses happy or sad for most feelings.', '大多只用开心或难过来表达。'],
  ['Finds a more exact word with a little help.', '在稍加引导下能找到更贴切的词。'],
  ['Chooses a word that fits, and says what brought the feeling on.', '能选出贴切的词，并说出感受的由来。'],
], cw([], 'Key Stage 1 — PSHE: Health and Wellbeing (feelings and emotions)', 'CASEL — Self-Awareness', SED_MO));
observed('SED-C', 2, 'Uses a way of their own to settle when they are upset.', '难过时能用自己的办法平复情绪。', [
  ['Needs an adult to settle them.', '需要成人帮助才能平复。'],
  ['Uses a familiar way when reminded of it.', '经提醒能用熟悉的办法。'],
  ['Chooses a way and uses it without being asked.', '能自行选择并使用平复的办法。'],
], cw([], 'Key Stage 1 — PSHE: Health and Wellbeing (managing feelings)', 'CASEL — Self-Management', SED_MO));

observed('SED-D', 1, 'Greets, thanks and asks politely without being prompted.', '能主动问候、道谢并礼貌地提出请求。', [
  ['Uses courteous words when reminded.', '经提醒会使用礼貌用语。'],
  ['Uses them with familiar people most of the time.', '面对熟悉的人时多数能做到。'],
  ['Uses them with everyone, including visitors, unprompted.', '对所有人（包括来访者）都能主动做到。'],
], cw([], 'Key Stage 1 — PSHE: Relationships (courtesy and respect)', 'Montessori Grace & Courtesy', SED_MO));
observed('SED-D', 2, 'Settles a small disagreement with a friend using words.', '能用语言化解与同伴之间的小分歧。', [
  ['Comes to an adult with the disagreement.', '遇到分歧就找成人。'],
  ['Talks it through with an adult nearby.', '在成人在旁时能谈开。'],
  ['Talks it through with the other child on their own.', '能自己和同伴谈开并解决。'],
], cw([], 'Key Stage 1 — PSHE: Relationships (managing disagreement)', 'CASEL — Relationship Skills', SED_MO));

/* ── LCL-E · writing (observation) ───────────────────────────────────────────── */
const LCLE_MO = mo(['language'], ['la_metal_insets', 'la_moveable_alphabet']);
observed('LCL-E', 1, 'Writes a sentence of their own with a capital letter, spaces between the words and a full stop.', '能自己写出一句话，句首大写、词间留空、句末有句号。', [
  ['Writes words, with the spaces or the capital letter still coming.', '能写出词，但空格或大写还不稳定。'],
  ['Writes a sentence with most of the punctuation in place.', '能写出句子，大部分标点和大写都到位。'],
  ['Writes a sentence with the capital, the spaces and the full stop all in place.', '写出的句子大写、空格和句号都齐全。'],
], cw(['L.1.1.j', 'L.1.2.a', 'L.1.2.b'], 'English Year 1 — Writing: leaving spaces between words, capital letters and full stops', null, LCLE_MO));
observed('LCL-E', 2, 'Writes a short piece of two or more sentences that holds together from beginning to end.', '能写出两句以上、前后连贯的短文。', [
  ['Writes one sentence at a time, each on its own.', '一次只写一句，句与句之间没有联系。'],
  ['Writes two or three sentences on one subject.', '能围绕一个话题写两三句。'],
  ['Writes a short piece with a clear beginning and a closing idea.', '能写出有开头也有收尾的短文。'],
], cw(['W.1.3', 'W.1.5'], 'English Year 1 — Writing: sequencing sentences to form short narratives', null, LCLE_MO));

/* ── COG-E · scientific & world exploration (observation) ────────────────────── */
const COGE_MO = mo(['cultural'], ['cu_living_nonliving']);
observed('COG-E', 1, 'Asks a question about the world and suggests a way to find out.', '能提出关于世界的问题，并想出一种寻找答案的办法。', [
  ['Notices something and says what they see.', '能注意到现象并说出所见。'],
  ['Asks a question about it.', '会就此提出问题。'],
  ['Asks a question and suggests how they could find out.', '既能提问，也能说出可以怎样去找答案。'],
], cw(['W.1.7', 'W.1.8'], 'Key Stage 1 — Science: working scientifically (asking simple questions)', null, COGE_MO));
observed('COG-E', 2, 'Keeps a simple record of what they notice and says what it shows.', '能把观察到的内容简单记录下来，并说出记录说明了什么。', [
  ['Talks about what they noticed without recording it.', '能说出观察到的，但不做记录。'],
  ['Draws or tallies what they noticed.', '会用画图或计数的方式记录。'],
  ['Records it in a chart or tally and says what it shows.', '能用表格或计数记录，并说出其中的意思。'],
], cw(['1.MD.4'], 'Key Stage 1 — Science: working scientifically (gathering and recording data)', null, COGE_MO));

/* ── PPL · physical development & practical life (observation) ───────────────── */
observed('PPL-A', 1, 'Forms letters and numerals starting in the right place and moving in the right direction.', '写字母和数字时起笔位置和运笔方向都正确。', [
  ['Forms them recognisably, starting in various places.', '能写得认得出，但起笔位置不定。'],
  ['Forms most of them the right way round.', '大部分字形的方向正确。'],
  ['Forms letters and numerals correctly and comfortably, at speed.', '能正确、轻松且较快地书写字母和数字。'],
], cw(['L.1.1.a'], 'English Year 1 — Handwriting: form lower-case letters in the correct direction', null, mo(['practical_life'], ['pl_transferring', 'pl_dressing_frames'])));
observed('PPL-A', 2, 'Uses scissors and other classroom tools accurately and safely.', '能准确、安全地使用剪刀和其他教室用具。', [
  ['Uses a tool with an adult alongside.', '需成人在旁才能使用工具。'],
  ['Uses familiar tools on their own, roughly accurately.', '能独立使用熟悉的工具，准确度一般。'],
  ['Uses tools accurately, and puts them away safely.', '能准确使用工具，并安全归位。'],
], cw([], 'Key Stage 1 — Design and Technology: using tools safely', 'Montessori Practical Life', mo(['practical_life'], ['pl_transferring'])));

observed('PPL-B', 1, 'Throws, catches or kicks with control in a game.', '在游戏中能有控制地投掷、接住或踢球。', [
  ['Sends and stops a ball at close range.', '近距离能把球送出并挡住。'],
  ['Catches or kicks accurately most of the time.', '多数时候能准确接住或踢中。'],
  ['Keeps control of the ball inside a game with others.', '在与同伴的游戏中能持续控球。'],
], cw([], 'Key Stage 1 — Physical Education: master basic movements including throwing and catching', null, mo(['practical_life'], ['pl_carrying'])));
observed('PPL-B', 2, 'Puts movements together — hopping, skipping, jumping — and keeps their balance.', '能把跳、蹦、单脚跳等动作连起来并保持平衡。', [
  ['Performs one movement at a time.', '一次只能做一个动作。'],
  ['Links two movements with a pause between.', '能把两个动作连起来，中间会停顿。'],
  ['Links several movements smoothly, staying balanced.', '能流畅地连贯多个动作并保持平衡。'],
], cw([], 'Key Stage 1 — Physical Education: developing balance, agility and co-ordination', null, mo(['practical_life'], ['pl_carrying'])));

observed('PPL-C', 1, 'Looks after their own belongings and personal care without an adult.', '能自己照顾好个人物品和生活自理，不需成人帮忙。', [
  ['Manages with a step-by-step reminder.', '需要一步步提醒才能完成。'],
  ['Manages most of it independently.', '大部分能独立完成。'],
  ['Manages it all, and notices when something is missing.', '全部能独立完成，还能发现东西少了。'],
], cw([], 'Key Stage 1 — PSHE: Health and Wellbeing (personal care and independence)', null, mo(['practical_life'], ['pl_care_of_self'])));
observed('PPL-C', 2, 'Gets themselves ready for what comes next without being told.', '不用别人说就能为下一项活动做好准备。', [
  ['Follows the group once it has started moving.', '要等大家开始行动才跟上。'],
  ['Gets ready with a reminder.', '经提醒能做好准备。'],
  ['Sees what is coming and gets ready on their own.', '能预见接下来的安排并自行准备好。'],
], cw([], 'Key Stage 1 — PSHE: Health and Wellbeing (routines and organisation)', null, mo(['practical_life'], ['pl_care_of_self'])));

observed('PPL-D', 1, 'Sets up what they need and clears it all away afterwards.', '能自己准备所需材料，用完后全部收拾归位。', [
  ['Clears away when asked.', '经要求会收拾。'],
  ['Sets up and clears away with a reminder.', '经提醒能准备和收拾。'],
  ['Sets up, clears away and leaves the space ready for the next child.', '能准备、收拾，并把环境留给下一个孩子。'],
], cw([], 'Key Stage 1 — PSHE: Living in the Wider World (caring for the shared environment)', 'Montessori Practical Life', mo(['practical_life'], ['pl_care_of_environment'])));
observed('PPL-D', 2, 'Keeps up a job for the classroom right across the week.', '能坚持完成一整周的班级职责。', [
  ['Does the job on the day they are reminded.', '经提醒的那天会做。'],
  ['Does it most days of the week.', '一周中大部分日子会做。'],
  ['Does it every day without being reminded.', '每天都主动完成，无需提醒。'],
], cw([], 'Key Stage 1 — PSHE: Living in the Wider World (responsibility in the community)', 'Montessori care of community', mo(['practical_life'], ['pl_care_of_environment'])));

/* ── direct milestones · language & literacy ─────────────────────────────────── */
const LANG_MO = mo(['language'], ['la_oral_language']);
direct('LCL-A', 1, 'inference_from_read_aloud',
  'Answers a question about something read aloud, including one they have to work out for themselves.',
  '能回答关于朗读内容的问题，包括需要自己推想才能答出的问题。',
  cw(['RL.1.1', 'RI.1.1', 'SL.1.2'], 'English Year 1 — Reading comprehension: making inferences on the basis of what is being said and done', null, LANG_MO));
direct('LCL-A', 2, 'three_step_instruction',
  'Follows a spoken instruction with three parts, in order, the first time it is said.',
  '能一次听清并按顺序完成含三个步骤的口头指令。',
  cw(['SL.1.1.a', 'SL.1.2'], 'English Year 1 — Spoken language: listen and respond appropriately to adults and their peers', null, LANG_MO));
direct('LCL-B', 1, 'retell_with_detail',
  'Retells a story in order and says what someone did or how they felt.',
  '能按顺序复述故事，并说出人物做了什么或有什么感受。',
  cw(['RL.1.2', 'SL.1.4'], 'English Year 1 — Reading comprehension: retelling and discussing significant events', null, LANG_MO));
direct('LCL-B', 2, 'word_meaning_and_category',
  'Says what a word means in their own words, and groups words that belong together.',
  '能用自己的话说出词义，并把同一类的词归在一起。',
  cw(['L.1.4.a', 'L.1.5.a'], 'English Year 1 — Reading comprehension: discussing word meanings and linking new meanings to those already known', null, LANG_MO));

const PHON_MO = mo(['language'], ['la_sound_games']);
direct('LCL-C', 1, 'phoneme_segmentation',
  'Says every sound in a spoken word, in order.',
  '能按顺序说出一个词里的每一个音。',
  cw(['RF.1.2.d'], 'English Year 1 — Word reading: applying phonic knowledge and skill as the route to decode words', null, PHON_MO,
    { phase: 'blue', lessonRange: [1, 27] }));
direct('LCL-C', 2, 'vowel_sound_contrast',
  'Hears whether two words have the same middle vowel sound.',
  '能听出两个词中间的元音是否相同。',
  cw(['RF.1.2.a'], 'English Year 1 — Word reading: respond speedily with the correct sound to graphemes', null, PHON_MO,
    { phase: 'blue', lessonRange: [1, 27] }));

const PRINT_MO = mo(['language'], ['la_moveable_alphabet', 'la_reading_folder']);
direct('LCL-D', 1, 'decode_taught_pattern_word',
  'Reads a word with a two-letter sound or a vowel team by sounding it out — even a word they have never seen.',
  '能通过拼读读出含双字母音或元音组合的词，包括从未见过的词。',
  cw(['RF.1.3.a', 'RF.1.3.c'], 'English Year 1 — Word reading: blend sounds in unfamiliar words containing taught GPCs · Year 1 phonics check (made-up words)', null, PRINT_MO,
    { phase: 'blue', lessonRange: [1, 27] }));
direct('LCL-D', 2, 'read_sentence_aloud',
  'Reads a short sentence and shows they know what it says.',
  '能读出一句短句，并表明自己明白句子的意思。',
  cw(['RF.1.4.a', 'RF.1.4.c'], 'English Year 1 — Word reading: read aloud books closely matched to their improving phonic knowledge', null, PRINT_MO,
    { phase: 'blue', lessonRange: [1, 27] }));

/* ── direct milestones · cognition & mathematics ─────────────────────────────── */
const NUM_MO = mo(['mathematics'], ['ma_golden_beads', 'ma_hundred_board']);
direct('COG-A', 1, 'count_past_hundred',
  'Counts on past one hundred from any number, and counts in tens and in fives.',
  '能从任意数往上数过一百，并能十个十个、五个五个地数。',
  cw(['1.NBT.1'], 'Mathematics Year 1 — Number and place value: count to and across 100, forwards and backwards, from any given number', null, NUM_MO));
direct('COG-A', 2, 'tens_and_ones',
  'Knows what each digit in a two-digit number stands for, and uses that to say which number is larger.',
  '知道两位数中每个数位的含义，并据此判断哪个数更大。',
  cw(['1.NBT.2', '1.NBT.3'], 'Mathematics Year 1 — Number and place value: represent and compare numbers using tens and ones', null, NUM_MO));

const OPS_MO = mo(['mathematics'], ['ma_golden_beads', 'ma_stamp_game']);
direct('COG-B', 1, 'add_subtract_within_twenty',
  'Adds and takes away within twenty in a way that works for them.',
  '能用适合自己的方法在二十以内进行加法和减法。',
  cw(['1.OA.6'], 'Mathematics Year 1 — Addition and subtraction: number bonds and related subtraction facts within 20', null, OPS_MO));
direct('COG-B', 2, 'word_problem_within_twenty',
  'Works out an everyday problem that needs adding or taking away.',
  '能解决需要用加法或减法的日常生活问题。',
  cw(['1.OA.1'], 'Mathematics Year 1 — Addition and subtraction: solve one-step problems with concrete objects and pictorial representations', null, OPS_MO));

const GEO_MO = mo(['sensorial', 'mathematics'], ['se_geometric_solids', 'se_geometric_cabinet']);
direct('COG-C', 1, 'name_solid_shape',
  'Names a solid shape and says one thing that is true of every one of them.',
  '能说出立体图形的名称，并说出这类形体共有的一个特点。',
  cw(['1.G.1', '1.G.2'], 'Mathematics Year 1 — Geometry: recognise and name common 3-D shapes', null, GEO_MO));
direct('COG-C', 2, 'halves_and_quarters',
  'Finds a half and a quarter of a shape, and notices when the parts are not equal.',
  '能找出图形的二分之一和四分之一，并看出各部分是否相等。',
  cw(['1.G.3'], 'Mathematics Year 1 — Fractions: recognise, find and name a half and a quarter', null, GEO_MO));

const MEAS_MO = mo(['sensorial'], ['se_red_rods', 'se_knobbed_cylinders']);
direct('COG-D', 1, 'read_clock_half_hour',
  'Reads the time on a clock at the hour and at half past.',
  '能读出钟面上的整点和半点时间。',
  cw(['1.MD.3'], 'Mathematics Year 1 — Measurement: tell the time to the hour and half past the hour', null, MEAS_MO));
direct('COG-D', 2, 'compare_by_measure',
  'Compares three things and picks out the longest, the tallest or the shortest.',
  '能比较三样东西，并找出最长、最高或最短的那一个。',
  cw(['1.MD.1'], 'Mathematics Year 1 — Measurement: compare, describe and solve practical problems for lengths and heights', null, MEAS_MO));

/* ── direct milestones · English track ───────────────────────────────────────── */
const EN_VOCAB = mo(['language'], ['la_english_vocabulary']);
const EN_ORAL = mo(['language'], ['la_english_oral']);
const EN_SOUND = mo(['language'], ['la_english_sound_games']);
const EN_LETTER = mo(['language'], ['la_english_letter_sounds']);
const EN_CVC = mo(['language'], ['la_english_cvc']);
direct('E1', 1, 'english_vocab_school_day',
  'Points to everyday classroom things named in English.', '听到英语说出的日常教室物品名称时能指出来。',
  cw([], 'English as an additional language — receptive vocabulary (no CEFR or Cambridge level is claimed)', 'Primary EFL practice — picture-pointing receptive vocabulary', EN_VOCAB));
direct('E1', 2, 'english_vocab_action_and_place',
  'Points to the picture for an English word about doing something or about where something is.',
  '听到表示动作或位置的英语词时能指出相应的图片。',
  cw([], 'English as an additional language — receptive vocabulary (no CEFR or Cambridge level is claimed)', 'Primary EFL practice — picture-pointing receptive vocabulary', EN_VOCAB));
direct('E2', 1, 'three_step_en',
  'Follows a spoken English instruction with three parts.', '能听懂并完成含三个步骤的英语口头指令。',
  cw([], 'English as an additional language — listening (no CEFR or Cambridge level is claimed)', 'Primary EFL practice — listen-and-do', EN_ORAL));
direct('E2', 2, 'instruction_with_order_en',
  'Follows an English instruction that says which part to do first.', '能听懂含先后次序的英语指令并按序完成。',
  cw([], 'English as an additional language — listening (no CEFR or Cambridge level is claimed)', 'Primary EFL practice — listen-and-do', EN_ORAL));
direct('E3', 1, 'english_medial_vowel',
  'Hears the middle sound in a short English word.', '能听出英语短词中间的那个音。',
  cw([], 'English as an additional language — phonological awareness (no CEFR or Cambridge level is claimed)', null, EN_SOUND,
    { phase: 'blue', lessonRange: [1, 12] }));
direct('E3', 2, 'english_phoneme_blend',
  'Blends English sounds said one at a time into a whole word.', '能把一个一个说出的英语音合成完整的词。',
  cw([], 'English as an additional language — phonological awareness (no CEFR or Cambridge level is claimed)', null, EN_SOUND,
    { phase: 'blue', lessonRange: [1, 12] }));
direct('E4', 1, 'digraph_sound_receptive',
  'Finds the two letters that make a given English sound.', '能找出发出某个英语音的那两个字母。',
  cw([], 'English as an additional language — letter and sound knowledge (no CEFR or Cambridge level is claimed)', null, EN_LETTER,
    { phase: 'blue', lessonRange: [1, 8] }));
direct('E4', 2, 'digraph_sound_expressive',
  'Says the sound two letters make together.', '能说出两个字母组合在一起发出的音。',
  cw([], 'English as an additional language — letter and sound knowledge (no CEFR or Cambridge level is claimed)', null, EN_LETTER,
    { phase: 'blue', lessonRange: [1, 8] }));
direct('E5', 1, 'read_english_word_pattern',
  'Reads an English word containing a two-letter sound or a vowel team.', '能读出含双字母音或元音组合的英语词。',
  cw([], 'English as an additional language — word reading (no CEFR or Cambridge level is claimed)', null, EN_CVC,
    { phase: 'blue', lessonRange: [1, 27] }));
direct('E5', 2, 'read_english_sentence',
  'Reads a short English sentence and shows they know what it says.', '能读出一句英语短句，并表明自己明白它的意思。',
  cw([], 'English as an additional language — word reading (no CEFR or Cambridge level is claimed)', null, EN_CVC,
    { phase: 'blue', lessonRange: [1, 27] }));
direct('E6', 1, 'english_ask_question',
  'Asks a simple question in English.', '能用英语提出一个简单的问题。',
  cw([], 'English as an additional language — spoken production (no CEFR or Cambridge level is claimed)', 'Primary EFL practice — modelled question frames', EN_ORAL));
direct('E6', 2, 'english_describe_picture',
  'Describes a picture in English in a short sentence.', '能用一句简短的英语描述一张图片。',
  cw([], 'English as an additional language — spoken production (no CEFR or Cambridge level is claimed)', 'Primary EFL practice — modelled question frames', EN_ORAL));

/* ════════════════ 8. A5 EXTENSION MILESTONES — "exceeded" becomes reachable ══ */
/* An A5 child who is already reading vowel teams or counting past a hundred has, until
 * now, had nowhere for that to land: `exceeded` counts secure milestones declared at the
 * child's OWN band whose evidence sits in the band above, and A5 had none, because there
 * was no band above. Canopy supplies one. Each of these is an ordinary A5 milestone with
 * `expectation: 'extension'` and evidence drawn from G1 — the same declared shape the
 * bank already uses at A3/A4 (E5.A3.1, E5.A4.2, E6.A4.2).
 *
 * They ride the module extensionRule: a child who gets a whole strand right is offered
 * the band above, which for A5 is now G1. */
const A5_OF = (strandId) => bank['milestones.json'].milestones.find((m) => m.id === `${strandId}.A5.1`);
function extension(strandId, n, tag, en, zh, itemA, itemB) {
  const src = A5_OF(strandId);
  g1Milestones.push({
    id: `${strandId}.A5.${n}`,
    strandId,
    domainId: STRAND[strandId].domainId,
    ageBand: 'A5',
    expectation: 'extension',
    constructTag: tag,
    statement: { en, zh },
    bandDescriptors: null,
    evidence: {
      itemIds: [itemA, itemB],
      byForm: { A: [itemA], B: [itemB] },
      minCoverage: 0.5,
      evidenceBand: 'G1',
      extensionEvidence: true,
    },
    crosswalk: JSON.parse(JSON.stringify(src.crosswalk)),
  });
  for (const id of [itemA, itemB]) {
    const it = [...coreItems, ...eflItems].find((x) => x.id === id);
    if (!it) throw new Error(`extension ${strandId}.A5.${n}: no such G1 item ${id}`);
    it.milestoneIds.push(`${strandId}.A5.${n}`);
  }
}
extension('LCL-D', 3, 'decode_taught_pattern_word',
  'Reads a word with two letters that make one sound.', '能读出含两个字母发一个音的词。',
  IT('LCL-D', 'A', 1), IT('LCL-D', 'B', 1));
extension('LCL-D', 4, 'read_sentence_aloud',
  'Reads a whole short sentence aloud.', '能把一句短句完整地读出来。',
  IT('LCL-D', 'A', 4), IT('LCL-D', 'B', 4));
extension('COG-A', 3, 'count_past_hundred',
  'Counts on past one hundred from a number they are given.', '能从给定的数往上数过一百。',
  IT('COG-A', 'A', 1), IT('COG-A', 'B', 1));
extension('COG-B', 3, 'add_subtract_within_twenty',
  'Adds and takes away within twenty.', '能在二十以内进行加法和减法。',
  IT('COG-B', 'A', 1), IT('COG-B', 'B', 1));
extension('COG-C', 3, 'halves_and_quarters',
  'Finds a half of a shape.', '能找出图形的二分之一。',
  IT('COG-C', 'A', 3), IT('COG-C', 'B', 4));
extension('E5', 3, 'read_english_word_pattern',
  'Reads an English word with a taught two-letter sound.', '能读出含学过的双字母音的英语词。',
  IT('E5', 'A', 2), IT('E5', 'B', 1));

/* ═════════════ 9. CROSSWALK CORRECTIONS (research/k-standards.md §2 and §4) ═══ */
/* Three verified fixes, applied to the kindergarten milestones already in the bank.
 *   ATL-B  P-ATL 11/12 → P-ATL 10/11 — P-ATL 10 is the goal literally titled
 *          "demonstrates initiative and independence"; 12 is creativity and belongs
 *          nowhere in this strand.
 *   ATL-C  P-ATL 9/10 → P-ATL 9/8 — P-ATL 10 (initiative) belongs to ATL-B; P-ATL 8
 *          (holds information in mind and manipulates it) is the goal adjacent to
 *          reasoning about a problem. This was a straight transposition.
 *   COG-D  eyfs.elg null → 'Numerical Patterns' — since the 2021 EYFS reform there is
 *          no standalone ELG for measurement or sorting; that content was folded into
 *          Numerical Patterns. A labelled best fit beats a gap.
 * The EYFS string "Characteristics of Effective Teaching and Learning" is CORRECT
 * (DfE statutory framework paragraphs 1.18 and 2.16) and is deliberately not touched. */
let fixed = 0;
for (const m of bank['milestones.json'].milestones) {
  if (m.strandId === 'ATL-B') { m.crosswalk.elof = ['P-ATL 10', 'P-ATL 11']; fixed++; }
  if (m.strandId === 'ATL-C') { m.crosswalk.elof = ['P-ATL 9', 'P-ATL 8']; fixed++; }
  if (m.strandId === 'COG-D' && m.crosswalk.eyfs.elg === null) {
    m.crosswalk.eyfs.elg = 'Numerical Patterns';
    m.crosswalk.eyfs.elgNote = 'Best fit. Since the 2021 EYFS reform there is no dedicated ELG for measurement, sorting or classification; that content sits inside Numerical Patterns.';
    fixed++;
  }
}

/* ═══════════════════════════════════════════════ 10. SPLICE AND WRITE ════════ */

const M = bank['milestones.json'];
const C = bank['items-core.json'];
const E = bank['items-efl.json'];
const O = bank['observation.json'];
const S = bank['stimuli.json'];

/* — milestones.json — */
M.milestones.push(...g1Milestones);
M.taughtLetters.G1 = [
  's', 'a', 't', 'p', 'i', 'n', 'm', 'd', 'g', 'o', 'c', 'k', 'ck', 'e', 'u', 'r', 'h', 'b', 'f',
  'l', 'j', 'v', 'w', 'x', 'y', 'z', 'qu', 'sh', 'ch', 'th', 'ng',
];
M.constructTags = {
  ...M.constructTags,
  ...Object.fromEntries(
    ['LCL-A', 'LCL-B', 'LCL-C', 'LCL-D', 'COG-A', 'COG-B', 'COG-C', 'COG-D', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6']
      .map((sid) => [sid, {
        ...M.constructTags[sid],
        G1: [1, 2].map((n) => g1Milestones.find((m) => m.id === `${sid}.G1.${n}`).constructTag),
      }]),
  ),
};
for (const s of M.strands) {
  if (s.method === 'direct' && s.constructTags) s.constructTags = M.constructTags[s.id];
}
M.notes.canopyG1 = 'Montree Canopy is band G1, the second tier of this instrument for children of about 6–7 who have outgrown the kindergarten bands. It is the same instrument, not a second one: same domains, strands, three-band model and suppression posture. Its crosswalk anchors are the US Common Core Grade 1 standards (`crosswalk.ccss`) and the UK National Curriculum Year 1 / Key Stage 1 programmes of study (`crosswalk.ukNc`), because ELOF, EYFS and the China MoE 3–6 Guide are all early-years frameworks that stop below this band — those three fields are therefore carried as explicit empties at G1 rather than stretched to fit. `crosswalk.otherAnchor` names the non-statutory framework (CASEL, NAEYC, PSHE, Montessori) a non-academic strand is written against. The EFL track claims no CEFR, Cambridge or Trinity level at this band either, exactly as at A3–A5.';
M.notes.exceededAtA5 = 'Six A5 milestones carry `expectation: "extension"` with evidence in G1 (LCL-D.A5.3/4, COG-A.A5.3, COG-B.A5.3, COG-C.A5.3, E5.A5.3). Until Canopy existed there was no band above A5, so an A5 child could never register as having exceeded the band. These six make that reachable, using the declared extension-evidence shape the bank already uses at A3 and A4.';

/* — items-core.json — */
C.items.push(...coreItems);
Object.assign(C.rubrics, NEW_CORE_RUBRICS);
for (const mod of C.modules) {
  if (mod.id === 'M-LIT') mod.practiceItemIds.G1 = ['IT.PRACTICE.LIT.G1.01', 'IT.PRACTICE.LIT.G1.02'];
  if (mod.id === 'M-MATH') mod.practiceItemIds.G1 = ['IT.PRACTICE.MATH.G1.01', 'IT.PRACTICE.MATH.G1.02'];
  if (mod.id === 'M-FOCUS') {
    mod.practiceItemIds.G1 = ['IT.PRACTICE.FOCUS.G1.01', 'IT.PRACTICE.FOCUS.G1.02'];
    mod.recommendedBands = ['A4', 'A5', 'G1'];
  }
}

/* — items-efl.json — */
E.items.push(...eflItems);
Object.assign(E.rubrics, NEW_EFL_RUBRICS);
for (const mod of E.modules) {
  if (mod.id === 'M-EFL') mod.practiceItemIds.G1 = ['IT.PRACTICE.EFL.G1.01', 'IT.PRACTICE.EFL.G1.02'];
}

/* — observation.json — */
O.items.push(...g1ObsItems);
const GUIDANCE = {
  en: 'Rate from what you have seen in the work cycle this term. Best fit, not a checklist. Leave a milestone unrated rather than guessing — unrated milestones are reported, never hidden.',
  zh: '请根据本学期工作周期中的观察进行评定。选择最贴近的一档，而不是逐项打勾。没把握就留空，不要猜测——未评定的项目会如实报告，不会被隐藏。',
};
const checklist = (id, domainId, strandIds) => {
  const ms = g1Milestones.filter((m) => m.ageBand === 'G1' && strandIds.includes(m.strandId));
  return {
    id,
    domainId,
    strandIds,
    ageBand: 'G1',
    milestoneIds: ms.map((m) => m.id),
    itemIds: ms.map((m) => m.evidence.observationItemId),
    guidance: GUIDANCE,
  };
};
O.observationChecklists.push(
  checklist('OBS.ATL.G1', 'ATL', ['ATL-A', 'ATL-B', 'ATL-C', 'ATL-D']),
  checklist('OBS.SED.G1', 'SED', ['SED-A', 'SED-B', 'SED-C', 'SED-D']),
  checklist('OBS.PPL.G1', 'PPL', ['PPL-A', 'PPL-B', 'PPL-C', 'PPL-D']),
  checklist('OBS.LCL-E.G1', 'LCL', ['LCL-E']),
  checklist('OBS.COG-E.G1', 'COG', ['COG-E']),
);

/* — stimuli.json — */
S.stimuli.push(...newStimuli);

/* — headers — */
const STAMP = new Date().toISOString().slice(0, 10) + 'T00:00:00Z';
for (const f of FILES) {
  if (bank[f].bankVersion !== OLD_VERSION) throw new Error(`${f} is at ${bank[f].bankVersion}, expected ${OLD_VERSION}`);
  bank[f].bankVersion = NEW_VERSION;
  bank[f].generatedAt = STAMP;
}

for (const f of FILES) writeFileSync(join(DIR, f), JSON.stringify(bank[f], null, 2) + '\n', 'utf8');

/* — report — */
const count = (a, p) => a.filter(p).length;
console.log(`Montree Canopy content run — bank ${OLD_VERSION} → ${NEW_VERSION}`);
console.log(`  milestones      +${g1Milestones.length}  (G1 ${count(g1Milestones, (m) => m.ageBand === 'G1')}`
  + ` = direct ${count(g1Milestones, (m) => m.ageBand === 'G1' && STRAND[m.strandId].method === 'direct')}`
  + ` / observation ${count(g1Milestones, (m) => m.ageBand === 'G1' && STRAND[m.strandId].method === 'observation')}`
  + `; A5 extension ${count(g1Milestones, (m) => m.expectation === 'extension')})  → total ${M.milestones.length}`);
console.log(`  core items      +${coreItems.length}  (scored ${count(coreItems, (i) => i.scored)}, practice ${count(coreItems, (i) => !i.scored)})  → total ${C.items.length}`);
console.log(`  EFL items       +${eflItems.length}  (scored ${count(eflItems, (i) => i.scored)}, practice ${count(eflItems, (i) => !i.scored)})  → total ${E.items.length}`);
console.log(`  observation     +${g1ObsItems.length}  in +5 checklists  → total ${O.items.length}`);
console.log(`  stimuli         +${newStimuli.length}  → total ${S.stimuli.length}`);
console.log(`  crosswalk fixes  ${fixed} milestone records (ATL-B, ATL-C, COG-D)`);
console.log(`  TOTAL ITEM RECORDS ${C.items.length + E.items.length + O.items.length}`);
