#!/usr/bin/env node
// Montree Milestones — item-bank validator.
// Implements the ten schema invariants from ARCHITECTURE.md §5 plus JSON well-formedness,
// reference resolution and form A/B construct parity. Exit code 1 on any failure.
//
//   node validate.mjs            validate the bank in this directory
//   node validate.mjs --quiet    errors + summary only

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const QUIET = process.argv.includes('--quiet');

const errors = [];
const warnings = [];
const fail = (rule, msg) => errors.push(`[${rule}] ${msg}`);
const warn = (rule, msg) => warnings.push(`[${rule}] ${msg}`);

/**
 * Every band the instrument knows. A3/A4/A5 are the kindergarten bands; G1 is Montree
 * Canopy, the second tier for children of about 6–7.
 *
 * G1 IS AUTHORED as of bank 1.11.0. Every rule below that walks BANDS still skips a band
 * with no content, so the skip guards are kept: they are what let a future band be named
 * here before its content run lands.
 */
const BANDS = ['A3', 'A4', 'A5', 'G1'];

/* ------------------------------------------------------- 0. well-formedness */
const FILES = ['milestones.json', 'items-core.json', 'items-efl.json', 'observation.json', 'stimuli.json'];
const bank = {};
for (const f of FILES) {
  const p = join(DIR, f);
  if (!existsSync(p)) { fail('R0', `missing file ${f}`); continue; }
  try { bank[f] = JSON.parse(readFileSync(p, 'utf8')); }
  catch (e) { fail('R0', `${f} is not valid JSON — ${e.message}`); }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

const LOCALES = bank['milestones.json'].assessmentLocales;
const domains = bank['milestones.json'].domains;
const strands = bank['milestones.json'].strands;
const milestones = bank['milestones.json'].milestones;
const scoring = bank['milestones.json'].scoring;
const stimuli = bank['stimuli.json'].stimuli;
const obsItems = bank['observation.json'].items;
const obsChecklists = bank['observation.json'].observationChecklists;
const modules = [...bank['items-core.json'].modules, ...bank['items-efl.json'].modules];
const directItems = [...bank['items-core.json'].items, ...bank['items-efl.json'].items];
const allItems = [...directItems, ...obsItems];

const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
const DOM = byId(domains), STR = byId(strands), MIL = byId(milestones);
const STIM = byId(stimuli), ITEM = byId(allItems), MOD = byId(modules);

// header consistency across files
for (const f of FILES) {
  const h = bank[f];
  if (h.schemaVersion !== bank['milestones.json'].schemaVersion) fail('R0', `${f} schemaVersion differs`);
  if (h.bankVersion !== bank['milestones.json'].bankVersion) fail('R0', `${f} bankVersion differs`);
  if (JSON.stringify(h.assessmentLocales) !== JSON.stringify(LOCALES)) fail('R0', `${f} assessmentLocales differ`);
}
// unique ids
for (const [label, arr] of [['stimulus', stimuli], ['milestone', milestones], ['item', allItems], ['module', modules], ['strand', strands], ['domain', domains]]) {
  const seen = new Set();
  for (const x of arr) {
    if (seen.has(x.id)) fail('R0', `duplicate ${label} id ${x.id}`);
    seen.add(x.id);
  }
}

/* ------------------- R1. strand / domain references resolve ---------------- */
for (const s of strands) if (!DOM[s.domainId]) fail('R1', `strand ${s.id} → unknown domain ${s.domainId}`);
for (const m of milestones) if (!STR[m.strandId]) fail('R1', `milestone ${m.id} → unknown strand ${m.strandId}`);
for (const it of allItems) {
  if (!STR[it.strandId] && it.strandId !== 'ATL-X') fail('R1', `item ${it.id} → unknown strand ${it.strandId}`);
  if (it.moduleId !== 'M-OBS' && !MOD[it.moduleId]) fail('R1', `item ${it.id} → unknown module ${it.moduleId}`);
}
for (const mod of modules) for (const sid of mod.strandIds) {
  if (!STR[sid] && sid !== 'ATL-X') fail('R1', `module ${mod.id} → unknown strand ${sid}`);
}
for (const c of obsChecklists) {
  for (const mid of c.milestoneIds) if (!MIL[mid]) fail('R1', `checklist ${c.id} → unknown milestone ${mid}`);
  for (const iid of c.itemIds) if (!ITEM[iid]) fail('R1', `checklist ${c.id} → unknown item ${iid}`);
}

/* -------- R2. evidence itemIds exist and share the band (or are tagged) ---- */
for (const m of milestones) {
  const method = STR[m.strandId]?.method;
  if (method === 'observation') {
    const oid = m.evidence?.observationItemId;
    if (!oid || !ITEM[oid]) fail('R2', `observation milestone ${m.id} has no resolvable observation item`);
    continue;
  }
  const ids = m.evidence?.itemIds || [];
  if (!ids.length) { fail('R2', `direct milestone ${m.id} declares no evidence items`); continue; }
  for (const id of ids) {
    const it = ITEM[id];
    if (!it) { fail('R2', `milestone ${m.id} → unknown item ${id}`); continue; }
    if (it.ageBand !== m.ageBand && !m.evidence.extensionEvidence) {
      fail('R2', `milestone ${m.id} (${m.ageBand}) cites ${id} (${it.ageBand}) without extensionEvidence:true`);
    }
    if (it.strandId !== m.strandId) fail('R2', `milestone ${m.id} cites ${id} from another strand (${it.strandId})`);
    if (!it.scored) fail('R2', `milestone ${m.id} cites practice item ${id}`);
    // THE construct check (audit C1): evidence must actually test the milestone's construct.
    if (!m.constructTag) fail('R2', `direct milestone ${m.id} has no constructTag`);
    if (it.constructTag !== m.constructTag) {
      fail('R2', `milestone ${m.id} [${m.constructTag}] is evidenced by ${id} [${it.constructTag}] — construct mismatch`);
    }
  }
  if (m.evidence.evidenceBand !== m.ageBand && !m.evidence.extensionEvidence) {
    fail('R2', `milestone ${m.id} draws evidence from ${m.evidence.evidenceBand} without extensionEvidence:true`);
  }
  // byForm must partition itemIds and be non-empty for both forms
  const bf = m.evidence.byForm || {};
  for (const form of ['A', 'B']) {
    if (!bf[form]?.length) fail('R2', `milestone ${m.id} has no form-${form} evidence`);
    for (const id of bf[form] || []) if (ITEM[id]?.form !== form) fail('R2', `milestone ${m.id} byForm.${form} contains ${id} (form ${ITEM[id]?.form})`);
  }
  if (bf.A && bf.B && bf.A.length !== bf.B.length) {
    fail('R2', `milestone ${m.id} form imbalance: A=${bf.A.length} B=${bf.B.length}`);
  }
  const union = new Set([...(bf.A || []), ...(bf.B || [])]);
  if (union.size !== ids.length || ids.some((i) => !union.has(i))) {
    fail('R2', `milestone ${m.id} itemIds is not the union of byForm`);
  }
  if (typeof m.evidence.minCoverage !== 'number') fail('R2', `milestone ${m.id} missing minCoverage`);
}

// every construct tag declared for a strand+band must be carried by at least one item
for (const st of strands) {
  if (st.method !== 'direct' || !st.constructTags) continue;
  for (const band of BANDS) {
    const tags = st.constructTags[band] || [];
    if (!tags.length) continue;  // band not authored for this strand (e.g. G1 pre-Canopy)
    for (const [i, tag] of tags.entries()) {
      const mid = `${st.id}.${band}.${i + 1}`;
      const m = MIL[mid];
      if (!m) { fail('R2', `missing milestone ${mid}`); continue; }
      const n = directItems.filter((it) => it.scored && it.constructTag === tag
        && it.strandId === st.id && it.ageBand === m.evidence.evidenceBand).length;
      if (!n) fail('R2', `construct "${tag}" (${mid}) has no item carrying it`);
    }
    if (tags[0] === tags[1]) {
      warn('R2', `${st.id} ${band}: both milestones share the construct "${tags[0]}" — evidence is shared by design`);
    }
  }
}
// decodability: a word the child must READ may only use letters taught by that band
const TAUGHT = bank['milestones.json'].taughtLetters || {};
const HEART = new Set(bank['milestones.json'].heartWords || []);
for (const it of directItems) {
  if (!it.decodableWord) {
    if (/^(word_reading|cvc_read_)/.test(it.constructTag || '')) {
      fail('R2', `item ${it.id} tests reading but declares no decodableWord`);
    }
    continue;
  }
  const w = it.decodableWord.toLowerCase();
  if (HEART.has(w)) continue;
  const taught = new Set(TAUGHT[it.ageBand] || []);
  const bad = [...w].filter((ch) => !taught.has(ch));
  if (bad.length) fail('R2', `item ${it.id} asks the child to read "${w}" but ${bad.join(',')} is not taught by ${it.ageBand}`);
}

/* ------------ R3. option/stimulus references resolve, sprite ids present --- */
for (const s of stimuli) {
  if (!s.render?.svgSymbolId) fail('R3', `stimulus ${s.id} has no svgSymbolId`);
  if (!s.render?.svg || s.render.svg.length < 20) fail('R3', `stimulus ${s.id} has no inline svg body`);
  if (!s.render?.viewBox) fail('R3', `stimulus ${s.id} has no viewBox`);
  if (typeof s.render?.printMinMm !== 'number' || s.render.printMinMm < 60) fail('R3', `stimulus ${s.id} printMinMm must be ≥ 60`);
  if (!s.kind) fail('R3', `stimulus ${s.id} has no kind`);
  if (/<text/.test(s.render.svg) && !['letter', 'word', 'numeral'].includes(s.kind)) {
    fail('R3', `stimulus ${s.id} carries text but is kind=${s.kind} (child-facing pictures must not be labelled)`);
  }
}
// SVG must be well-formed XML — the paper-pack generator parses it as XML, and a duplicate
// attribute (the classic "fill twice" bug) silently blanks a stimulus in that pipeline.
for (const s of stimuli) {
  const svg = s.render.svg;
  if ((svg.match(/"/g) || []).length % 2) fail('R3', `stimulus ${s.id} has an unbalanced quote in its svg`);
  const stack = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z]+)((?:\s+[a-zA-Z-]+="[^"]*")*)\s*(\/?)>/g)) {
    const [, closing, tag, attrs, selfClose] = m;
    if (closing) {
      if (stack.pop() !== tag) fail('R3', `stimulus ${s.id} has mismatched </${tag}>`);
    } else if (!selfClose) stack.push(tag);
    const seen = new Set();
    for (const a of attrs.matchAll(/\s+([a-zA-Z-]+)="/g)) {
      if (seen.has(a[1])) fail('R3', `stimulus ${s.id} <${tag}> declares "${a[1]}" twice`);
      seen.add(a[1]);
    }
  }
  if (stack.length) fail('R3', `stimulus ${s.id} has unclosed <${stack[0]}>`);
  const tagChars = (svg.match(/[<>]/g) || []).length;
  const parsedTags = [...svg.matchAll(/<(\/?)([a-zA-Z]+)((?:\s+[a-zA-Z-]+="[^"]*")*)\s*(\/?)>/g)].length;
  if (tagChars !== parsedTags * 2) fail('R3', `stimulus ${s.id} contains markup the parser could not read (malformed tag or stray < >)`);
}
const symbolIds = new Set(stimuli.map((s) => s.render.svgSymbolId));
if (symbolIds.size !== stimuli.length) fail('R3', 'duplicate svgSymbolId in the sprite');
const usedStim = new Set();
for (const it of directItems) {
  for (const sid of it.stimulusIds || []) {
    usedStim.add(sid);
    if (!STIM[sid]) fail('R3', `item ${it.id} → unknown stimulus ${sid}`);
  }
  for (const o of it.options || []) {
    usedStim.add(o.stimulusId);
    if (!STIM[o.stimulusId]) fail('R3', `item ${it.id} option ${o.id} → unknown stimulus ${o.stimulusId}`);
  }
}
for (const s of stimuli) if (!usedStim.has(s.id)) warn('R3', `stimulus ${s.id} is not referenced by any item`);
// greyscale safety: an item may only depend on colour if it declares requiresColor
for (const it of directItems) {
  const refs = [...(it.stimulusIds || []), ...(it.options || []).map((o) => o.stimulusId)];
  const colourDependent = refs.some((r) => STIM[r] && STIM[r].render.monochromeSafe === false);
  if (colourDependent && !it.requiresColor) {
    fail('R3', `item ${it.id} uses colour-dependent stimuli but does not declare requiresColor`);
  }
}

/* ------------------- R4. tap_choice shape ---------------------------------- */
for (const it of directItems) {
  if (it.type !== 'tap_choice') continue;
  const n = it.options?.length || 0;
  if (n < 3 || n > 4) fail('R4', `tap_choice ${it.id} has ${n} options (need 3–4)`);
  const keys = it.scoring?.correctOptionIds || [];
  if (!keys.length) fail('R4', `tap_choice ${it.id} has no correctOptionIds`);
  const ids = new Set((it.options || []).map((o) => o.id));
  for (const k of keys) if (!ids.has(k)) fail('R4', `tap_choice ${it.id} key ${k} is not one of its options`);
  const stims = (it.options || []).map((o) => o.stimulusId);
  if (new Set(stims).size !== stims.length) fail('R4', `tap_choice ${it.id} repeats a stimulus among its options`);
}
for (const it of directItems) {
  if (it.type !== 'listen_do') continue;
  const seq = it.scoring?.correctSequence || [];
  if (!seq.length) fail('R4', `listen_do ${it.id} has no correctSequence`);
  const ids = new Set((it.options || []).map((o) => o.id));
  for (const k of seq) if (!ids.has(k)) fail('R4', `listen_do ${it.id} sequence step ${k} is not one of its options`);
}

/* ------------------- R5. teacher_scored_oral rubric 0/1/2 ------------------ */
for (const it of directItems) {
  if (it.type !== 'teacher_scored_oral') continue;
  const r = it.scoring?.rubric;
  if (!r) { fail('R5', `oral item ${it.id} has no rubric`); continue; }
  const levels = (r.levels || []).map((l) => l.score);
  if (JSON.stringify(levels) !== '[0,1,2]') fail('R5', `oral item ${it.id} rubric levels are ${JSON.stringify(levels)} (need [0,1,2])`);
  for (const l of r.levels || []) {
    for (const loc of LOCALES) if (!l.descriptor?.[loc]) fail('R5', `oral item ${it.id} rubric level ${l.score} missing ${loc}`);
  }
  if (it.scoring.maxPoints !== 2) fail('R5', `oral item ${it.id} maxPoints must be 2`);
}

/* ------------------- R6. observation milestones carry all 3 descriptors ---- */
for (const m of milestones) {
  if (STR[m.strandId]?.method !== 'observation') continue;
  for (const band of ['emerging', 'developing', 'secure']) {
    if (!m.bandDescriptors?.[band]?.en) fail('R6', `observation milestone ${m.id} missing "${band}" descriptor`);
  }
}
for (const it of obsItems) {
  if (it.type !== 'observation_checklist') fail('R6', `observation item ${it.id} has wrong type ${it.type}`);
  for (const band of ['emerging', 'developing', 'secure']) {
    if (!it.bandDescriptors?.[band]?.en) fail('R6', `observation item ${it.id} missing "${band}" descriptor`);
  }
  if (!MIL[it.milestoneId]) fail('R6', `observation item ${it.id} → unknown milestone ${it.milestoneId}`);
}

/* ------------------- R7. item counts per module × band × form -------------- */
const BLUEPRINT = {
  'M-LIT': { all: { 'LCL-A': 4, 'LCL-B': 3, 'LCL-C': 4, 'LCL-D': 5 } },
  'M-MATH': { all: { 'COG-A': 5, 'COG-B': 4, 'COG-C': 4, 'COG-D': 3 } },
  'M-EFL': {
    A3: { E1: 6, E2: 4, E3: 3, E4: 3, E5: 0, E6: 2 },
    A4: { E1: 6, E2: 4, E3: 3, E4: 3, E5: 1, E6: 1 },
    A5: { E1: 6, E2: 3, E3: 3, E4: 3, E5: 2, E6: 1 },
    // Canopy keeps the same 18-item English sitting and moves the weight: less naming,
    // more reading and more talking, and E6 gains a second item so asking a question and
    // describing a picture are evidenced separately instead of sharing one item.
    G1: { E1: 5, E2: 3, E3: 3, E4: 2, E5: 3, E6: 2 },
  },
  'M-FOCUS': { all: { 'ATL-X': 6 } },
};
const count = (pred) => directItems.filter(pred).length;
for (const [moduleId, spec] of Object.entries(BLUEPRINT)) {
  const forms = moduleId === 'M-FOCUS' ? ['A'] : ['A', 'B'];
  for (const band of BANDS) {
    // A band with no authored items at all (G1 before the Canopy content run) has no
    // blueprint to check against. The moment one G1 item exists this stops being skipped.
    if (!count((i) => i.ageBand === band)) continue;
    const want = spec.all || spec[band];
    if (!want) { fail('R7', `${moduleId} has items at band ${band} but no blueprint entry`); continue; }
    let total = 0;
    for (const [strandId, n] of Object.entries(want)) {
      total += n;
      for (const form of forms) {
        const got = count((i) => i.moduleId === moduleId && i.ageBand === band && i.form === form && i.strandId === strandId && i.scored);
        if (got !== n) fail('R7', `${moduleId} ${band} form ${form} strand ${strandId}: ${got} scored items, blueprint says ${n}`);
      }
    }
    for (const form of forms) {
      const got = count((i) => i.moduleId === moduleId && i.ageBand === band && i.form === form && i.scored);
      if (got !== total) fail('R7', `${moduleId} ${band} form ${form}: ${got} scored items, blueprint total ${total}`);
    }
    const prac = count((i) => i.moduleId === moduleId && i.ageBand === band && i.form === 'P');
    if (prac !== 2) fail('R7', `${moduleId} ${band}: ${prac} practice items, need exactly 2`);
    if (moduleId === 'M-FOCUS') {
      const stray = count((i) => i.moduleId === moduleId && i.form === 'B');
      if (stray) fail('R7', 'M-FOCUS must be single-form (no form B)');
    }
  }
}
// Totals at bank 1.11.0 (Canopy). 112 = 28 observation milestones × 4 bands. 230 = 56 × 4
// bands + the 6 A5 extension milestones whose evidence sits in G1. 568 = 424 scored direct
// + 32 practice + 112 observation.
if (obsItems.length !== 112) fail('R7', `observation checklist has ${obsItems.length} items, need 112`);
if (milestones.length !== 230) fail('R7', `bank has ${milestones.length} milestones, need 230`);
const totalRecords = directItems.length + obsItems.length;
if (totalRecords !== 568) fail('R7', `bank has ${totalRecords} item records, architecture §4.3 says 568`);

/* ------------------- R8. crosswalk completeness ----------------------------
 * Two regimes, because the frameworks themselves have two regimes.
 *
 * A3/A4/A5 anchor to ELOF (birth-to-five) and EYFS (to the end of Reception), and every
 * milestone must carry both. G1 (Montree Canopy) sits ABOVE both frameworks and above the
 * China MoE 3–6 Guide, so it anchors instead to the US Common Core Grade 1 standards
 * (`ccss`) and the UK National Curriculum Year 1 / Key Stage 1 programmes of study
 * (`ukNc`). At G1 the three early-years fields must be explicitly EMPTY rather than
 * stretched — a preschool goal code on a Grade-1 milestone would be an invented citation,
 * which is the one thing this rule exists to prevent. `ccss` may legitimately be empty on a
 * strand Common Core does not cover (approaches to learning, social-emotional, physical);
 * `ukNc` never may, and `otherAnchor` names the non-statutory framework in those cases. */
const G1_BAND = 'G1';
for (const m of milestones) {
  if (m.ageBand === G1_BAND) {
    if (!Array.isArray(m.crosswalk?.elof) || m.crosswalk.elof.length) {
      fail('R8', `Canopy milestone ${m.id} carries an ELOF code — ELOF stops below this band`);
    }
    if (m.crosswalk?.eyfs?.area || m.crosswalk?.eyfs?.band || m.crosswalk?.eyfs?.elg) {
      fail('R8', `Canopy milestone ${m.id} carries an EYFS citation — EYFS stops below this band`);
    }
    if (m.crosswalk?.chinaMoe !== null) fail('R8', `Canopy milestone ${m.id} carries a China-MoE code — the 3–6 Guide stops below this band`);
    if (!Array.isArray(m.crosswalk?.ccss)) fail('R8', `Canopy milestone ${m.id} has no ccss array`);
    for (const code of m.crosswalk?.ccss || []) {
      if (!/^(RF|RL|RI|W|SL|L)\.1\.\d+(\.[a-z])?$|^1\.(OA|NBT|MD|G)\.\d+$/.test(code)) {
        fail('R8', `Canopy milestone ${m.id} CCSS code "${code}" is not a well-formed Grade 1 standard id`);
      }
    }
    if (typeof m.crosswalk?.ukNc !== 'string' || !m.crosswalk.ukNc.trim()) {
      fail('R8', `Canopy milestone ${m.id} has no UK National Curriculum reference`);
    }
    if (!['expected', 'emerging_edge', 'extension'].includes(m.expectation)) fail('R8', `milestone ${m.id} bad expectation ${m.expectation}`);
    continue;
  }
  if (!Array.isArray(m.crosswalk?.elof) || !m.crosswalk.elof.length) fail('R8', `milestone ${m.id} has no ELOF code`);
  if (!m.crosswalk?.eyfs?.area || !m.crosswalk?.eyfs?.band) fail('R8', `milestone ${m.id} has no EYFS area/band`);
  for (const code of m.crosswalk.elof) {
    if (!/^P-(ATL|SE|LC|LIT|MATH|SCI|PMP) \d{1,2}$/.test(code)) fail('R8', `milestone ${m.id} ELOF code "${code}" is not a well-formed preschool goal id`);
  }
  if (STR[m.strandId]?.englishMedium && m.crosswalk.chinaMoe !== null) {
    fail('R8', `milestone ${m.id} is on an English-medium strand but still carries a China-MoE code`);
  }
  if (m.crosswalk.chinaMoe !== null && !Array.isArray(m.crosswalk.chinaMoe)) fail('R8', `milestone ${m.id} chinaMoe must be an array or null`);
  if (!['expected', 'emerging_edge', 'extension'].includes(m.expectation)) fail('R8', `milestone ${m.id} bad expectation ${m.expectation}`);
  if (!BANDS.includes(m.ageBand)) fail('R8', `milestone ${m.id} bad ageBand`);
}

/* ------------------- R9 / R11. forbidden assessment register --------------- */
// ARCHITECTURE §0. Patterns target the ASSESSMENT sense; "behind"/"mark" also have
// innocent classroom senses (a preposition; mark-making) so those are matched in context.
const FORBIDDEN = [
  [/\btest(s|ing|ed)?\b/i, 'test'],
  [/\bexams?\b/i, 'exam'],
  [/\bquiz(zes)?\b/i, 'quiz'],
  [/\bscor(e|es|ed|ing)\b/i, 'score'],
  [/\bgrade(s|d)?\b/i, 'grade'],
  [/\bmarks?\b/i, 'mark'],
  [/\bpassed?\b|\bfail(s|ed|ing|ure)?\b/i, 'pass/fail'],
  [/\bwrong\b/i, 'wrong'],
  [/\bpercentiles?\b/i, 'percentile'],
  [/\brank(s|ed|ing)?\b/i, 'rank'],
  [/\b(above|below)\s+average\b/i, 'above/below average'],
  [/\bfalling behind\b|\bbehind (his|her|their|for)\b/i, 'behind'],
];
const scanString = (rule, where, str) => {
  if (typeof str !== 'string') return;
  for (const [re, name] of FORBIDDEN) if (re.test(str)) fail(rule, `${where} uses forbidden term "${name}": “${str.slice(0, 90)}”`);
};
// R9 — milestone statements and descriptors (the rule as written in §5)
for (const m of milestones) {
  for (const loc of LOCALES) scanString('R9', `milestone ${m.id}.statement.${loc}`, m.statement?.[loc]);
  for (const b of ['emerging', 'developing', 'secure']) {
    for (const loc of LOCALES) scanString('R9', `milestone ${m.id}.${b}.${loc}`, m.bandDescriptors?.[b]?.[loc]);
  }
}
// EXEMPT, declared: items[].distractors[].rationale is internal item-writer documentation,
// never rendered on any D2 screen or in any D3 pack (bank note `internalFields`). It is not
// scanned here; a future teacher-facing item-review surface must lint it before display.
for (const f of ['items-core.json', 'items-efl.json']) {
  if (!(bank[f].internalFields || []).includes('items[].distractors[].rationale')) {
    fail('R11', `${f} does not declare distractors[].rationale as an internal-only field`);
  }
}
for (const it of directItems) {
  for (const d of it.distractors || []) {
    if (d.rationale && d.internalOnly !== true) fail('R11', `item ${it.id} distractor ${d.optionId} has a rationale not marked internalOnly`);
  }
}
// R11 (stricter than §5, matches §0) — every other child/parent/teacher-facing string
for (const it of allItems) {
  for (const loc of LOCALES) {
    scanString('R11', `${it.id}.prompt.audio.${loc}`, it.prompt?.audio?.[loc]);
    scanString('R11', `${it.id}.prompt.onScreen.${loc}`, it.prompt?.onScreen?.[loc]);
    scanString('R11', `${it.id}.prompt.teacherScript.${loc}`, it.prompt?.teacherScript?.[loc]);
    scanString('R11', `${it.id}.feedback.neutral.${loc}`, it.feedback?.neutral?.[loc]);
    scanString('R11', `${it.id}.feedback.correct.${loc}`, it.feedback?.correct?.[loc]);
    scanString('R11', `${it.id}.feedback.tryAgain.${loc}`, it.feedback?.tryAgain?.[loc]);
    for (const l of it.scoring?.rubric?.levels || []) scanString('R11', `${it.id}.rubric.${l.score}.${loc}`, l.descriptor?.[loc]);
  }
}
for (const c of obsChecklists) for (const loc of LOCALES) scanString('R11', `${c.id}.guidance.${loc}`, c.guidance?.[loc]);
for (const s of stimuli) for (const loc of LOCALES) {
  scanString('R11', `${s.id}.label.${loc}`, s.label?.[loc]);
  scanString('R11', `${s.id}.altText.${loc}`, s.altText?.[loc]);
}
for (const mod of modules) for (const loc of LOCALES) scanString('R11', `${mod.id}.name.${loc}`, mod.name?.[loc]);
// no visible timers, no reward economy
for (const it of directItems) {
  if (it.timing?.maxSeconds != null) fail('R11', `item ${it.id} declares a visible time limit`);
  if (it.badges || it.points || it.stars) fail('R11', `item ${it.id} carries a reward economy field`);
}

/* ------------------- R10. locale coverage ---------------------------------- */
for (const m of milestones) for (const loc of LOCALES) {
  if (!m.statement?.[loc]) fail('R10', `milestone ${m.id} statement missing locale ${loc}`);
}
for (const it of directItems) {
  if (it.promptLang === 'en') {
    // EFL exemption, ARCHITECTURE §3: EFL prompts are ALWAYS spoken English by design.
    if (!it.prompt?.audio?.en) fail('R10', `EFL item ${it.id} has no English audio`);
    if (it.prompt.audioLocaleFixed !== 'en') fail('R10', `EFL item ${it.id} must declare audioLocaleFixed:"en"`);
    for (const loc of LOCALES) if (!it.prompt?.teacherScript?.[loc]) fail('R10', `EFL item ${it.id} teacherScript missing ${loc}`);
  } else {
    for (const loc of LOCALES) {
      if (!it.prompt?.audio?.[loc]) fail('R10', `item ${it.id} audio missing locale ${loc}`);
      if (!it.prompt?.teacherScript?.[loc]) fail('R10', `item ${it.id} teacherScript missing locale ${loc}`);
    }
  }
}
for (const it of obsItems) for (const loc of LOCALES) {
  if (!it.statement?.[loc]) fail('R10', `observation item ${it.id} statement missing ${loc}`);
  if (!it.prompt?.teacherScript?.[loc]) fail('R10', `observation item ${it.id} teacherScript missing ${loc}`);
}
for (const s of stimuli) for (const loc of LOCALES) if (!s.label?.[loc]) fail('R10', `stimulus ${s.id} label missing ${loc}`);

/* ------------------- R12. form A/B construct parity ------------------------ */
for (const moduleId of ['M-LIT', 'M-MATH', 'M-EFL']) {
  for (const band of BANDS) {
    const sig = (form) => {
      const list = directItems.filter((i) => i.moduleId === moduleId && i.ageBand === band && i.form === form && i.scored);
      const m = {};
      for (const i of list) m[`${i.strandId}|${i.type}`] = (m[`${i.strandId}|${i.type}`] || 0) + 1;
      return m;
    };
    const a = sig('A'), b = sig('B');
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      if ((a[k] || 0) !== (b[k] || 0)) fail('R12', `${moduleId} ${band} parity mismatch on ${k}: A=${a[k] || 0} B=${b[k] || 0}`);
    }
    const pts = (form) => directItems.filter((i) => i.moduleId === moduleId && i.ageBand === band && i.form === form && i.scored)
      .reduce((s, i) => s + (i.scoring?.maxPoints || 0), 0);
    if (pts('A') !== pts('B')) fail('R12', `${moduleId} ${band} max points differ: A=${pts('A')} B=${pts('B')}`);
  }
}
// paper equivalence — D3 refuses to emit a pack without responseMode
for (const it of allItems) {
  if (!it.paper?.responseMode) fail('R12', `item ${it.id} has no paper.responseMode (D3 would refuse this pack)`);
}
// every scored direct item must evidence at least one milestone
for (const it of directItems) {
  if (!it.scored) continue;
  if (it.strandId === 'ATL-X') continue; // optional module, outside the milestone inventory by design
  if (!it.milestoneIds?.length) fail('R12', `scored item ${it.id} evidences no milestone`);
}

/* ------------------------------------------------------------------ report */
const tally = (pred) => directItems.filter(pred).length;
const lines = [];
lines.push('Montree Milestones — item bank validation');
lines.push(`bank ${bank['milestones.json'].bankVersion} · schema ${bank['milestones.json'].schemaVersion} · locales ${LOCALES.join('/')}`);
lines.push('');
lines.push('MILESTONES');
lines.push(`  total ${milestones.length}  (direct ${milestones.filter((m) => STR[m.strandId].method === 'direct').length} · observation ${milestones.filter((m) => STR[m.strandId].method === 'observation').length})`);
for (const band of BANDS) {
  const inBand = milestones.filter((m) => m.ageBand === band);
  if (!inBand.length) continue;  // band not authored yet — nothing to report on
  const exp = inBand.filter((m) => m.expectation === 'expected');
  const core = exp.filter((m) => DOM[STR[m.strandId].domainId].track === 'core').length;
  const efl = exp.filter((m) => DOM[STR[m.strandId].domainId].track === 'efl').length;
  lines.push(`  ${band}: ${inBand.length} milestones · expected ${exp.length} (core ${core} / EFL ${efl}) · emerging_edge ${inBand.filter((m) => m.expectation === 'emerging_edge').length} · extension ${inBand.filter((m) => m.expectation === 'extension').length}`);
  if (core < scoring.mapSuppressionMinN) warn('MAP', `core MAP% would be suppressed at ${band} (expected core n=${core} < ${scoring.mapSuppressionMinN})`);
  if (efl < scoring.mapSuppressionMinN) warn('MAP', `EFL MAP% will be suppressed at ${band} (expected EFL n=${efl} < ${scoring.mapSuppressionMinN}) — the milestone list is reported instead`);
}
lines.push('');
lines.push('ITEMS  (module × band × form, scored)');
for (const moduleId of ['M-LIT', 'M-MATH', 'M-EFL', 'M-FOCUS']) {
  const forms = moduleId === 'M-FOCUS' ? ['A'] : ['A', 'B'];
  const parts = [];
  for (const band of BANDS) {
    if (!tally((i) => i.moduleId === moduleId && i.ageBand === band)) continue;  // not authored
    parts.push(`${band} ` + forms.map((f) => `${f}=${tally((i) => i.moduleId === moduleId && i.ageBand === band && i.form === f && i.scored)}`).join('/')
      + ` P=${tally((i) => i.moduleId === moduleId && i.ageBand === band && i.form === 'P')}`);
  }
  lines.push(`  ${moduleId.padEnd(8)} ${parts.join('   ')}`);
}
lines.push(`  by type: tap_choice ${tally((i) => i.type === 'tap_choice')} · listen_do ${tally((i) => i.type === 'listen_do')} · teacher_scored_oral ${tally((i) => i.type === 'teacher_scored_oral')}`);
lines.push(`  scored ${tally((i) => i.scored)} · practice ${tally((i) => !i.scored)} · observation ${obsItems.length}`);
lines.push(`  TOTAL ITEM RECORDS ${directItems.length + obsItems.length}`);
lines.push(`  construct tags in use: ${new Set(directItems.filter((i) => i.constructTag).map((i) => i.constructTag)).size} · items reading a printed word: ${directItems.filter((i) => i.decodableWord).length}`);
lines.push('');
lines.push('OBSERVATION');
const obsBands = new Set(obsChecklists.map((c) => c.ageBand)).size || 1;
lines.push(`  ${obsItems.length} records in ${obsChecklists.length} checklists (${obsChecklists.length / obsBands} per band × ${obsBands} bands)`);
lines.push('');
lines.push('STIMULI');
const kinds = {};
for (const s of stimuli) kinds[s.kind] = (kinds[s.kind] || 0) + 1;
lines.push(`  ${stimuli.length} records — ` + Object.entries(kinds).map(([k, v]) => `${k} ${v}`).join(' · '));
lines.push(`  colour-dependent ${stimuli.filter((s) => !s.render.monochromeSafe).length} · items declaring requiresColor ${tally((i) => i.requiresColor)}`);
lines.push('');

if (!QUIET) console.log(lines.join('\n'));
if (warnings.length) {
  console.log(`WARNINGS (${warnings.length})`);
  for (const w of warnings.slice(0, 40)) console.log('  ' + w);
  if (warnings.length > 40) console.log(`  … ${warnings.length - 40} more`);
  console.log('');
}
if (errors.length) {
  console.error(`FAILED — ${errors.length} error(s)`);
  for (const e of errors.slice(0, 60)) console.error('  ' + e);
  if (errors.length > 60) console.error(`  … ${errors.length - 60} more`);
  process.exit(1);
}
console.log(`PASS — all rules clean (R1–R10 = ARCHITECTURE §5 invariants; R11 forbidden-register sweep across every user-facing string; R12 form A/B construct parity + paper equivalence).`);
