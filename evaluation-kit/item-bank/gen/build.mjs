// Montree Milestones — item-bank builder.
// Emits milestones.json, items-core.json, items-efl.json, observation.json, stimuli.json.
import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PICTURES } from './pictures.mjs';
import { SCENES } from './scenes.mjs';
import { GENERATED } from './generated.mjs';
import { DOMAINS, STRANDS, CROSSWALK, MONTREE_ENGLISH, DIRECT } from './milestones-data.mjs';
import { OBSERVATION } from './observation-data.mjs';
import { LIT, MATH, FOCUS, PRACTICE } from './items-core-data.mjs';
import { EFL, EFL_PRACTICE } from './items-efl-data.mjs';
import { CONSTRUCTS, EVIDENCE_BAND, TAUGHT_LETTERS, HEART_WORDS } from './constructs.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(OUT, { recursive: true });

const SCHEMA_VERSION = '1.0';
const BANK_VERSION = '1.1.0';
const GENERATED_AT = '2026-08-03T00:00:00Z';
const LOCALES = ['en', 'zh'];
// A3/A4/A5 = kindergarten; G1 = Montree Canopy (Grade 1). This generator is STALE at bank
// 1.1.0 and must not be run (see DO_NOT_RUN.md) — G1 is listed here only so the band
// vocabulary matches the rest of the module.
const BANDS = ['A3', 'A4', 'A5', 'G1'];
const FORMS = ['A', 'B'];

const ATTRIBUTION = {
  elof: 'US HHS, Office of Head Start — Early Learning Outcomes Framework (public domain)',
  eyfs: 'UK DfE — EYFS / Development Matters, Open Government Licence v3.0',
  chinaMoe: 'PRC Ministry of Education — 3–6岁儿童学习与发展指南 (2012). Cited as a curriculum reference, not as an evaluative standard (不是评价标准) and not as MoE endorsement.',
  domainValidity: 'IDELA (Save the Children) and OECD IELS are cited as evidence that these domains are measured internationally. No protocol is reused and no alignment is claimed.',
  note: 'Milestone wording in this bank is original. Framework codes are citations, not reproduced text.',
};

const BANK_NOTES = {
  englishMediumScope:
    'Core literacy DIRECT assessment (LCL-C Phonological awareness and LCL-D Print & alphabet knowledge) '
    + 'assumes ENGLISH-MEDIUM instruction: the rhymes, letters and printed words are English, and the '
    + 'alphabet is the Roman alphabet in the house SATPIN order. Those two strands carry '
    + '`englishMedium: true` and deliberately carry NO China-MoE crosswalk code, because 语言.阅读与书写准备 '
    + 'describes Chinese literacy readiness and this evidence does not speak to it. A school teaching in a '
    + 'language other than English should report LCL-A, LCL-B and LCL-E for the core language domain and use '
    + 'the separate EFL track (E3/E4/E5) for the child\'s English letters and sounds; LCL-C and LCL-D should '
    + 'be left unassessed rather than administered in translation. Unassessed milestones are always printed, '
    + 'never hidden.',
  evidenceLinking:
    'Every scored direct item carries a constructTag. A milestone\'s evidence is the set of items in its '
    + 'evidenceBand whose constructTag equals the milestone\'s own constructTag — never a positional slice '
    + 'of the authoring order. The validator fails the build on any mismatch.',
  sharedEvidence:
    'E6.A5.1 and E6.A5.2 are both evidenced by the single A5 spoken-production item, because the blueprint '
    + 'allows only one E6 item at that band. This is declared, not accidental.',
  decodability:
    'Any item whose construct is word_reading or cvc_read_* declares the printed word in `decodableWord`. '
    + 'Every letter in it must appear in TAUGHT_LETTERS for that band (Montree Phonics house order) or be a '
    + 'listed heart word. The validator enforces this.',
  internalFields:
    'distractors[].rationale is INTERNAL item-writer documentation. It is never rendered to a child, parent '
    + 'or teacher on any D2 screen or in any D3 pack, and is therefore exempt from the forbidden-term lint. '
    + 'A future teacher-facing item-review surface must re-lint it before displaying it.',
};

/* ------------------------------------------------------------------ stimuli */
const KIND_BY_TAG = (tags, fallback) => {
  if (tags.includes('sequence')) return 'scene';
  if (tags.includes('prepositions') || tags.includes('actions')) return 'scene';
  if (tags.includes('shapes') || tags.includes('pattern')) return 'shape';
  if (tags.includes('quantity')) return 'quantity';
  return fallback;
};

// The shared stroke constants carry fill="none"; an element that declares its own fill
// therefore ends up with two. Keep the FIRST occurrence of every attribute per tag so the
// emitted SVG is well-formed XML (the paper-pack generator parses it as XML, not HTML).
const dedupeAttrs = (svg) => svg.replace(/<([a-zA-Z]+)((?:\s+[a-zA-Z-]+="[^"]*")+)\s*(\/?)>/g,
  (_, tag, attrs, close) => {
    const seen = new Set();
    const kept = [];
    for (const m of attrs.matchAll(/\s+([a-zA-Z-]+)="([^"]*)"/g)) {
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      kept.push(`${m[1]}="${m[2]}"`);
    }
    return `<${tag} ${kept.join(' ')}${close ? '/' : ''}>`;
  });

const stimuli = [];
const addStim = (id, en, zh, alt, svg0, tags, kind) => {
  const svg = dedupeAttrs(svg0);
  stimuli.push({
    id,
    kind,
    label: { en, zh },
    altText: { en: alt, zh },
    render: {
      svgSymbolId: `sym-${id.replace(/^ST\./, '').replace(/[^a-zA-Z0-9]/g, '-')}`,
      viewBox: '0 0 100 100',
      svg,
      printMinMm: 60,
      monochromeSafe: !tags.includes('colours') && !(id.startsWith('ST.tile.')),
    },
    tags,
  });
};

for (const [key, [en, zh, alt, svg, tags]] of Object.entries(PICTURES)) {
  addStim(`ST.${key}`, en, zh, alt, svg, tags, KIND_BY_TAG(tags, 'picture'));
}
for (const [key, [en, zh, alt, svg, tags]] of Object.entries(SCENES)) {
  addStim(`ST.${key}`, en, zh, alt, svg, tags, KIND_BY_TAG(tags, 'scene'));
}
for (const [id, [en, zh, alt, svg, tags, kind]] of Object.entries(GENERATED)) {
  addStim(id, en, zh, alt, svg, tags, kind);
}
const STIM_IDS = new Set(stimuli.map((s) => s.id));

/* ------------------------------------------------------------------ rubrics */
const R = (levels) => ({
  scale: [0, 1, 2],
  levels: levels.map(([score, en, zh]) => ({ score, descriptor: { en, zh } })),
});
const RUBRICS = {
  name_object: R([
    [0, 'No response, or a word that does not match the picture.', '没有回应，或说出的词与图片不符。'],
    [1, 'Names it with a close word, or needs the first sound as a cue.', '说出相近的词，或需要提示第一个音。'],
    [2, 'Names it clearly and straight away.', '能立刻清楚地说出名称。'],
  ]),
  describe_short: R([
    [0, 'No words, or single sounds only.', '没有语言，或只有单音。'],
    [1, 'One or two words.', '只说出一两个词。'],
    [2, 'A short sentence of three or more words.', '能说出三个词以上的短句。'],
  ]),
  describe_picture: R([
    [0, 'No response, or one word.', '没有回应，或只说一个词。'],
    [1, 'Two to four words about the picture.', '用两到四个词描述图片。'],
    [2, 'A full sentence with some detail.', '能用完整句子并有一些细节。'],
  ]),
  connective: R([
    [0, 'No reason offered.', '没有说明原因。'],
    [1, 'A reason with no joining word.', '说出原因但没有使用连接词。'],
    [2, 'A reason linked with and, because or so.', '用"和""因为""所以"把原因连起来。'],
  ]),
  retell_sequence: R([
    [0, 'No retell.', '没有复述。'],
    [1, 'Talks about the pictures but not in order.', '能谈图片但顺序不对。'],
    [2, 'Tells first, next and last in the right order.', '能按先、接着、最后的顺序讲述。'],
  ]),
  explain_clear: R([
    [0, 'No explanation.', '没有说明。'],
    [1, 'Part of the steps, or hard to follow.', '只说出部分步骤，或不易听懂。'],
    [2, 'Clear enough for someone who was not there to follow.', '清楚到没在场的人也能照着做。'],
  ]),
  count_objects: R([
    [0, 'Does not count, or the number words do not match the objects.', '不会数，或数词与物品对不上。'],
    [1, 'Counts with one or two slips.', '数数时有一两处失误。'],
    [2, 'Counts each object once, in order, and says how many altogether.', '一一对应按顺序数完并说出总数。'],
  ]),
  rote_count_10: R([
    [0, 'Counts to fewer than five.', '数不到五。'],
    [1, 'Counts in order to about ten.', '能按顺序数到十左右。'],
    [2, 'Counts in order past ten.', '能按顺序数到十以上。'],
  ]),
  rote_count_20: R([
    [0, 'Counts to fewer than ten.', '数不到十。'],
    [1, 'Counts in order to about fifteen.', '能按顺序数到十五左右。'],
    [2, 'Counts in order to twenty.', '能按顺序数到二十。'],
  ]),
  letter_sound: R([
    [0, 'No sound, or a different sound.', '没有发音，或发出别的音。'],
    [1, 'Says the letter name, or gives the sound after a cue.', '说出字母名称，或经提示后说出读音。'],
    [2, 'Says the sound clearly on their own.', '能独立清楚地说出读音。'],
  ]),
  oral_personal: R([
    [0, 'No English response.', '没有用英语回应。'],
    [1, 'One English word, or needs the question repeated.', '只说一个英语词，或需要重复提问。'],
    [2, 'Answers in English clearly and appropriately.', '能用英语清楚、恰当地回答。'],
  ]),
  oral_name: R([
    [0, 'No English word.', '没有说出英语词。'],
    [1, 'An English word that is close, or unclear.', '说出相近或不清楚的英语词。'],
    [2, 'The English word, clearly said.', '能清楚地说出该英语词。'],
  ]),
  oral_phrase: R([
    [0, 'No English response.', '没有用英语回应。'],
    [1, 'One English word, or a phrase that is hard to follow.', '只说一个英语词，或短语不易听懂。'],
    [2, 'A short English phrase a listener can understand.', '能说出让人听得懂的英语短语。'],
  ]),
};

/* --------------------------------------------------------------- milestones */
const domains = DOMAINS.map(([id, en, zh, track, colorToken, sequence]) => ({
  id, name: { en, zh }, track, colorToken, sequence,
}));

const strandById = {};
const strands = STRANDS.map(([id, domainId, en, zh, method, sequence, constructSpec, englishMedium]) => {
  const s = {
    id, domainId, name: { en, zh }, method, sequence, constructSpec,
    englishMedium: !!englishMedium,
    constructTags: CONSTRUCTS[id] || null,
    stopRule: { type: 'consecutive_incorrect', n: 3, scope: 'strand' },
  };
  strandById[id] = s;
  return s;
});

const eyfsBand = (band) => (band === 'A5' ? 'Reception' : '3-4');
const moeAge = (band) => (band === 'A3' ? '(3-4岁)' : band === 'A4' ? '(4-5岁)' : '(5-6岁)');

const buildCrosswalk = (strandId, band) => {
  const [elof, area, elg, moe, areaKeys, workKeys] = CROSSWALK[strandId];
  const cw = {
    elof: [...elof],
    eyfs: { area, band: eyfsBand(band), elg: band === 'A5' ? elg : null },
    chinaMoe: moe ? [`${moe}${moeAge(band)}`] : null,
    montessori: { areaKeys: [...areaKeys], workKeys: [...workKeys] },
  };
  if (MONTREE_ENGLISH[strandId]) cw.montreeEnglish = { ...MONTREE_ENGLISH[strandId] };
  return cw;
};

const milestones = [];
const milestoneById = {};
const pushMilestone = (m) => { milestones.push(m); milestoneById[m.id] = m; };

for (const [strandId, rows] of Object.entries(DIRECT)) {
  rows.forEach((row, i) => {
    const [en, zh, expectation] = row.split('|');
    const band = BANDS[Math.floor(i / 2)];
    const n = (i % 2) + 1;
    const id = `${strandId}.${band}.${n}`;
    pushMilestone({
      id,
      strandId, domainId: strandById[strandId].domainId, ageBand: band, expectation,
      constructTag: CONSTRUCTS[strandId][band][n - 1],
      statement: { en, zh },
      bandDescriptors: null,
      evidence: {
        itemIds: [], byForm: { A: [], B: [] }, minCoverage: 0.5,
        evidenceBand: EVIDENCE_BAND[id] || band,
      },
      crosswalk: buildCrosswalk(strandId, band),
    });
  });
}

for (const [strandId, rows] of Object.entries(OBSERVATION)) {
  rows.forEach((row, i) => {
    const [en, zh, expectation, emEn, devEn, secEn, emZh, devZh, secZh] = row.split('|');
    const band = BANDS[Math.floor(i / 2)];
    const n = (i % 2) + 1;
    pushMilestone({
      id: `${strandId}.${band}.${n}`,
      strandId, domainId: strandById[strandId].domainId, ageBand: band, expectation,
      statement: { en, zh },
      bandDescriptors: {
        emerging: { en: emEn, zh: emZh },
        developing: { en: devEn, zh: devZh },
        secure: { en: secEn, zh: secZh },
      },
      evidence: { observationItemId: `IT.OBS.${strandId}.${band}.${n}`, minCoverage: 1 },
      crosswalk: buildCrosswalk(strandId, band),
    });
  });
}

/* -------------------------------------------------------------------- items */
const TYPE = { tc: 'tap_choice', ld: 'listen_do', or: 'teacher_scored_oral' };
const items = [];
const itemById = {};

const teacherScript = (type, audioEn, onScreen, extra) => {
  const base = type === 'or'
    ? `Say: “${audioEn}” Give the child time. Do not model the answer. Note 0, 1 or 2 using the rubric below.`
    : type === 'ld'
      ? `Say: “${audioEn}” Repeat once if the child asks. Record the order the child touches.`
      : `Say: “${audioEn}” Repeat once if the child asks. Wait — there is no time limit.`;
  return extra ? `${base} ${extra}` : base;
};
const teacherScriptZh = (type, audioZh) =>
  type === 'or'
    ? `说：“${audioZh}” 给孩子充分的时间，不要示范答案，按下面的描述记 0、1 或 2。`
    : type === 'ld'
      ? `说：“${audioZh}” 如果孩子要求可重复一次，记录孩子触碰的顺序。`
      : `说：“${audioZh}” 如果孩子要求可重复一次。不限时间，请耐心等待。`;

let seqCounter = {};
const nextSeq = (moduleId, band, form) => {
  const k = `${moduleId}|${band}|${form}`;
  seqCounter[k] = (seqCounter[k] || 0) + 1;
  return seqCounter[k];
};

function buildItem({ raw, id, strandId, moduleId, band, form, promptLang, isPractice }) {
  const type = TYPE[raw.t];
  const audioEn = raw.a[0];
  const audioZh = raw.a[1] || null;
  const audio = promptLang === 'en' ? { en: audioEn } : { en: audioEn, zh: audioZh };

  const item = {
    id,
    strandId,
    ageBand: band,
    form,
    moduleId,
    sequence: nextSeq(moduleId, band, form),
    type,
    promptLang,
    prompt: {
      audio,
      audioLocaleFixed: promptLang === 'en' ? 'en' : null,
      onScreen: { en: raw.s, zh: audioZh },
      teacherScript: {
        en: teacherScript(raw.t, audioEn, raw.s, raw.sup ? 'You may point to the pictures once as you say it.' : null),
        zh: teacherScriptZh(raw.t, audioZh || audioEn),
      },
    },
    stimulusIds: raw.st ? [...raw.st] : [],
    options: null,
    scoring: null,
    distractors: null,
    timing: { maxSeconds: null, advanceOn: 'response' },
    repeatAllowed: true,
    repeatMax: 1,
    requiresColor: !!raw.c,
    constructTag: (!isPractice && CONSTRUCTS[strandId] && raw.mi)
      ? CONSTRUCTS[strandId][band][raw.mi - 1] : null,
    decodableWord: raw.w || null,
    paper: { cardsPerRow: 2, responseMode: 'child points, teacher circles' },
    stop: {
      countsTowardStrandStop: !isPractice,
      countsTowardModuleStop: !isPractice,
      scored: !isPractice,
    },
  };

  if (raw.t === 'or') {
    item.options = null;
    item.paper = { cardsPerRow: 1, responseMode: 'child speaks, teacher scores 0/1/2 on the sheet' };
    item.scoring = {
      method: 'teacher_rubric',
      correctOptionIds: null,
      maxPoints: 2,
      rubric: RUBRICS[raw.r],
      rubricKey: raw.r,
    };
  } else {
    const optIds = raw.o.map((_, i) => `o${i + 1}`);
    item.options = raw.o.map((sid, i) => ({ id: optIds[i], stimulusId: sid }));
    if (raw.t === 'ld') {
      item.scoring = {
        method: 'auto_key',
        correctOptionIds: raw.k.map((i) => optIds[i]),
        correctSequence: raw.k.map((i) => optIds[i]),
        maxPoints: 1,
        rubric: null,
        note: 'Full credit only when the whole sequence is touched in the given order.',
      };
      item.paper = { cardsPerRow: 2, responseMode: 'child points in order, teacher numbers the boxes' };
    } else {
      item.scoring = {
        method: 'auto_key',
        correctOptionIds: raw.k.map((i) => optIds[i]),
        maxPoints: 1,
        rubric: null,
      };
    }
    if (raw.d) {
      item.distractors = raw.o.map((sid, i) => ({
        optionId: optIds[i],
        stimulusId: sid,
        role: raw.d[i],
        rationale: DISTRACTOR_RATIONALE[raw.d[i]] || 'Plausible alternative drawn from the same item pool.',
        internalOnly: true,
      })).filter((d) => d.role !== 'target');
    }
  }

  if (isPractice) {
    item.feedback = {
      correct: { en: 'That’s the one. Let’s keep going.', zh: '就是这个。我们继续吧。' },
      tryAgain: { en: 'Let’s try that one together.', zh: '我们一起再试一次。' },
    };
    item.scored = false;
  } else {
    item.feedback = { neutral: { en: 'Thank you.', zh: '谢谢。' } };
    item.scored = true;
  }
  if (raw.g) item.taskFamily = raw.g;
  if (raw.cat) item.vocabCategory = raw.cat;

  items.push(item);
  itemById[item.id] = item;
  return item;
}

const DISTRACTOR_RATIONALE = {
  phonological: 'Shares the onset or rime of the target word — catches a child matching on sound rather than meaning (ACCE-V design).',
  semantic: 'Same category as the target — catches a child who has the category but not the specific word.',
  unrelated: 'Different category and different sound — a child choosing this is not yet attending to the prompt.',
  quantity_near: 'One away from the target quantity — catches an approximate rather than exact count.',
  quantity_far: 'Clearly different quantity — a floor check.',
  numeral_near: 'A numeral that is commonly confused or adjacent in the sequence.',
  letter_near: 'Another taught letter — catches a partial letter-sound link.',
  word_near: 'A taught word differing by one letter — catches guessing from the first letter alone.',
  print_near: 'Another kind of mark on a page — catches a child who has not yet separated writing from drawing.',
  shape_near: 'Another shape from the same set.',
  pattern_near: 'A strip with the same pieces in a different arrangement.',
  size_near: 'The next size along — catches an approximate size judgement.',
  size_far: 'Clearly different size — a floor check.',
  colour_near: 'Right size, different colour — isolates the second attribute.',
  attribute_far: 'Wrong on both attributes — a floor check.',
  weight_near: 'Plausible but lighter.',
  weight_far: 'Clearly the lightest — a floor check.',
  position_near: 'The same number of squares in a different place — catches remembering "how many" but not "where".',
  prepotent: 'The picture just shown — the response the child must hold back.',
};

const pad = (n) => String(n).padStart(2, '0');

// --- M-LIT + M-MATH scored
for (const [moduleId, table] of [['M-LIT', LIT], ['M-MATH', MATH]]) {
  for (const [strandId, byBand] of Object.entries(table)) {
    for (const band of BANDS) {
      for (const form of FORMS) {
        byBand[band][form].forEach((raw, i) => {
          buildItem({
            raw, id: `IT.${strandId}.${band}.${form}.${pad(i + 1)}`,
            strandId, moduleId, band, form, promptLang: 'assessment', isPractice: false,
          });
        });
      }
    }
  }
}

// --- M-FOCUS scored (single form A)
for (const band of BANDS) {
  FOCUS[band].forEach((raw, i) => {
    buildItem({
      raw, id: `IT.ATL-X.${band}.A.${pad(i + 1)}`,
      strandId: 'ATL-X', moduleId: 'M-FOCUS', band, form: 'A', promptLang: 'assessment', isPractice: false,
    });
  });
}

// --- M-EFL scored
for (const [strandId, byBand] of Object.entries(EFL)) {
  for (const band of BANDS) {
    for (const form of FORMS) {
      byBand[band][form].forEach((raw, i) => {
        buildItem({
          raw, id: `IT.${strandId}.${band}.${form}.${pad(i + 1)}`,
          strandId, moduleId: 'M-EFL', band, form, promptLang: 'en', isPractice: false,
        });
      });
    }
  }
}

// --- practice items (form P)
const PRACTICE_TAG = { 'M-LIT': 'LIT', 'M-MATH': 'MATH', 'M-EFL': 'EFL', 'M-FOCUS': 'FOCUS' };
const practiceStrand = { 'M-LIT': 'LCL-A', 'M-MATH': 'COG-A', 'M-EFL': 'E1', 'M-FOCUS': 'ATL-X' };
for (const moduleId of ['M-LIT', 'M-MATH', 'M-FOCUS']) {
  for (const band of BANDS) {
    PRACTICE[moduleId][band].forEach((raw, i) => {
      buildItem({
        raw, id: `IT.PRACTICE.${PRACTICE_TAG[moduleId]}.${band}.${pad(i + 1)}`,
        strandId: practiceStrand[moduleId], moduleId, band, form: 'P',
        promptLang: 'assessment', isPractice: true,
      });
    });
  }
}
for (const band of BANDS) {
  EFL_PRACTICE[band].forEach((raw, i) => {
    buildItem({
      raw, id: `IT.PRACTICE.EFL.${band}.${pad(i + 1)}`,
      strandId: 'E1', moduleId: 'M-EFL', band, form: 'P', promptLang: 'en', isPractice: true,
    });
  });
}

/* ------------------------------------------------------- evidence wiring */
const scoredOf = (strandId, band, form) =>
  items.filter((it) => it.strandId === strandId && it.ageBand === band && it.form === form && it.scored)
    .sort((a, b) => a.id.localeCompare(b.id)).map((it) => it.id);

for (const m of milestones) {
  if (strandById[m.strandId].method !== 'direct') continue;
  const srcBand = m.evidence.evidenceBand;
  const byForm = { A: [], B: [] };
  for (const form of FORMS) {
    byForm[form] = items
      .filter((it) => it.scored && it.strandId === m.strandId && it.ageBand === srcBand
        && it.form === form && it.constructTag === m.constructTag)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((it) => it.id);
  }
  if (srcBand !== m.ageBand) m.evidence.extensionEvidence = true;
  m.evidence.byForm = byForm;
  m.evidence.itemIds = [...byForm.A, ...byForm.B];
}

// back-reference every scored direct item to the milestone(s) it evidences
const milestoneOfItem = {};
for (const m of milestones) {
  for (const id of m.evidence.itemIds || []) (milestoneOfItem[id] ||= []).push(m.id);
}
for (const it of items) {
  if (it.scored && strandById[it.strandId]?.method === 'direct') {
    it.milestoneIds = milestoneOfItem[it.id] || [];
  } else {
    it.milestoneIds = [];
  }
}

/* ------------------------------------------------------------------ modules */
const practiceIds = (moduleId, band) =>
  items.filter((i) => i.moduleId === moduleId && i.ageBand === band && i.form === 'P').map((i) => i.id);

const moduleRecord = (id, en, zh, strandIds, minutes, optional, stopN, extra = {}) => ({
  id,
  name: { en, zh },
  strandIds,
  practiceItemIds: Object.fromEntries(BANDS.map((b) => [b, practiceIds(id, b)])),
  targetMinutes: minutes,
  optional,
  stopRule: { type: 'consecutive_incorrect', n: stopN, scope: 'module' },
  extensionRule: { trigger: 'all_correct_in_strand', administerBandUp: true, maxItems: 4 },
  neutralFeedback: { en: 'Thank you.', zh: '谢谢。' },
  practiceFeedbackAllowed: true,
  ...extra,
});

const coreModules = [
  moduleRecord('M-LIT', 'Word & Sound Play', '字词与声音游戏', ['LCL-A', 'LCL-B', 'LCL-C', 'LCL-D'], 5, false, 5),
  moduleRecord('M-MATH', 'Number & Shape Play', '数字与图形游戏', ['COG-A', 'COG-B', 'COG-C', 'COG-D'], 5, false, 5),
  moduleRecord('M-FOCUS', 'Focus Games', '专注力游戏', ['ATL-X'], 3, true, 4, {
    recommendedBands: ['A4', 'A5'],
    forms: ['A'],
    note: 'Optional extension module. Never part of the ≤15-minute core sitting and never required for a complete profile.',
  }),
];
const eflModule = moduleRecord('M-EFL', 'English Time', '英语时间', ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'], 5, false, 5, {
  promptLang: 'en',
  note: 'EFL prompts are always spoken in English — that is the construct. Teacher scripts carry zh for the adult.',
});

/* ------------------------------------------------- observation checklist */
const obsItems = [];
const obsChecklists = [];
for (const band of BANDS) {
  const groups = {
    ATL: ['ATL-A', 'ATL-B', 'ATL-C', 'ATL-D'],
    SED: ['SED-A', 'SED-B', 'SED-C', 'SED-D'],
    PPL: ['PPL-A', 'PPL-B', 'PPL-C', 'PPL-D'],
    'LCL-E': ['LCL-E'],
    'COG-E': ['COG-E'],
  };
  for (const [groupId, strandIds] of Object.entries(groups)) {
    const ms = milestones.filter((m) => strandIds.includes(m.strandId) && m.ageBand === band);
    for (const m of ms) {
      obsItems.push({
        id: `IT.OBS.${m.id}`,
        milestoneId: m.id,
        strandId: m.strandId,
        domainId: m.domainId,
        ageBand: band,
        form: 'O',
        moduleId: 'M-OBS',
        type: 'observation_checklist',
        expectation: m.expectation,
        statement: m.statement,
        bandDescriptors: m.bandDescriptors,
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
    obsChecklists.push({
      id: `OBS.${groupId}.${band}`,
      domainId: groupId.includes('-') ? groupId.split('-')[0] : groupId,
      strandIds,
      ageBand: band,
      milestoneIds: ms.map((m) => m.id),
      itemIds: ms.map((m) => `IT.OBS.${m.id}`),
      guidance: {
        en: 'Rate from what you have seen in the work cycle this term. Best fit, not a checklist. Leave a milestone unrated rather than guessing — unrated milestones are reported, never hidden.',
        zh: '请根据本学期工作周期中的观察进行评定。选择最贴近的一档，而不是逐项打勾。没把握就留空，不要猜测——未评定的项目会如实报告，不会被隐藏。',
      },
    });
  }
}

/* ------------------------------------------------------------------- write */
const SCORING = {
  bands: ['emerging', 'developing', 'secure'],
  milestoneThresholds: { secure: 0.80, developing: 0.40 },
  minCoverage: 0.5,
  mapSuppressionMinN: 12,
  domainBandMinN: 6,
  mapRounding: 5,
  note: 'Criterion-referenced. No percentiles, no peer ranking, no norm tables. Thresholds are conventional, not empirically calibrated — there is no calibration sample.',
};

const header = (extra) => ({
  schemaVersion: SCHEMA_VERSION,
  bankVersion: BANK_VERSION,
  generatedAt: GENERATED_AT,
  assessmentLocales: LOCALES,
  attribution: ATTRIBUTION,
  notes: BANK_NOTES,
  internalFields: ['items[].distractors[].rationale'],
  ...extra,
});

const write = (name, obj) => {
  const json = JSON.stringify(obj, null, 2);
  writeFileSync(join(OUT, name), json + '\n', 'utf8');
  return json.length;
};

// Prune to stimuli actually referenced by an item — the bank ships no dead art.
const used = new Set();
for (const it of items) {
  for (const s of it.stimulusIds || []) used.add(s);
  for (const o of it.options || []) used.add(o.stimulusId);
}
const missing = [...used].filter((id) => !STIM_IDS.has(id));
if (missing.length) { console.error('MISSING STIMULI:', missing); process.exit(1); }
const shippedStimuli = stimuli.filter((s) => used.has(s.id));

const files = {};
files['stimuli.json'] = write('stimuli.json', header({ stimuli: shippedStimuli }));
files['milestones.json'] = write('milestones.json', header({
  scoring: SCORING, taughtLetters: TAUGHT_LETTERS, heartWords: HEART_WORDS,
  constructTags: CONSTRUCTS, domains, strands, milestones,
}));
files['items-core.json'] = write('items-core.json', header({
  modules: coreModules,
  rubrics: RUBRICS,
  items: items.filter((i) => ['M-LIT', 'M-MATH', 'M-FOCUS'].includes(i.moduleId)),
}));
files['items-efl.json'] = write('items-efl.json', header({
  modules: [eflModule],
  rubrics: Object.fromEntries(Object.entries(RUBRICS).filter(([k]) => k.startsWith('oral_') || k === 'letter_sound')),
  items: items.filter((i) => i.moduleId === 'M-EFL'),
}));
files['observation.json'] = write('observation.json', header({
  module: {
    id: 'M-OBS', name: { en: 'Observation checklist', zh: '观察记录表' },
    deliveredIn: ['montree_teacher_ui', 'paper'],
    ratedOver: 'the whole check-in window, never in a sitting',
  },
  observationChecklists: obsChecklists,
  items: obsItems,
}));

const checksum = 'sha256:' + createHash('sha256')
  .update(Object.keys(files).sort().map((k) => k + ':' + files[k]).join('|')).digest('hex');
writeFileSync(join(OUT, 'BANK_CHECKSUM.txt'), `${BANK_VERSION} ${checksum}\n`, 'utf8');

console.log('stimuli', shippedStimuli.length, '/', stimuli.length, '| milestones', milestones.length,
  '| direct+focus items', items.length, '| observation items', obsItems.length,
  '| total item records', items.length + obsItems.length);
