#!/usr/bin/env node
/**
 * Montree Milestones — item-bank structural audit.
 *
 * A repeatable, read-only check on the evidence base *underneath* the scoring model. It answers
 * four questions that no schema validator asks, because none of them are schema violations —
 * they are design exposures that only show up when you count:
 *
 *   (a) How much evidence does each milestone actually rest on, per form?
 *   (b) Which milestones are so thin that the three-band model cannot express three bands?
 *   (c) Where does the 3-consecutive-incorrect discontinue rule either never fire, or fire so
 *       early that most of a strand's evidence is forfeited?
 *   (d) Is distractor design covered evenly across the choice items?
 *
 * Read-only. Touches nothing but stdout.
 *
 * Usage:
 *   node scripts/evaluation-bank-audit.mjs              # Markdown to stdout
 *   node scripts/evaluation-bank-audit.mjs --json       # machine-readable
 *   MONTREE_ITEM_BANK=/path/to/item-bank.json node scripts/evaluation-bank-audit.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const BANK_PATH = process.env.MONTREE_ITEM_BANK
  ? resolve(process.env.MONTREE_ITEM_BANK)
  : resolve(HERE, '..', 'lib', 'montree', 'evaluation', 'item-bank.json');

const bank = JSON.parse(readFileSync(BANK_PATH, 'utf8'));
const asJson = process.argv.includes('--json');

const SECURE = bank.scoring?.milestoneThresholds?.secure ?? 0.8;
const DEVELOPING = bank.scoring?.milestoneThresholds?.developing ?? 0.4;
const MIN_COVERAGE = bank.scoring?.minCoverage ?? 0.5;

const strandById = new Map(bank.strands.map((s) => [s.id, s]));
const domainById = new Map(bank.domains.map((d) => [d.id, d]));
const itemById = new Map(bank.items.map((i) => [i.id, i]));
const BANDS = ['A3', 'A4', 'A5', 'G1'];
const FORMS = ['A', 'B'];

const out = [];
const say = (s = '') => out.push(s);
const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : '—');

/* ------------------------------------------------------------------ band reachability */

/** Which of the three bands a milestone with n binary evidence items can actually land on. */
function reachable(n) {
  if (!n) return { emerging: [], developing: [], secure: [], n: 0 };
  const buckets = { emerging: [], developing: [], secure: [] };
  for (let k = 0; k <= n; k++) {
    const r = k / n;
    const band = r >= SECURE ? 'secure' : r >= DEVELOPING ? 'developing' : 'emerging';
    buckets[band].push(`${k}/${n}`);
  }
  return { ...buckets, n };
}

/* ------------------------------------------------------------------ milestone evidence */

const rows = bank.milestones.map((m) => {
  const strand = strandById.get(m.strandId);
  const ev = m.evidence || {};
  const isObservation = Boolean(ev.observationItemId) || strand?.method === 'observation';
  const byForm = ev.byForm || {};
  const nA = (byForm.A || []).length;
  const nB = (byForm.B || []).length;
  const nDirect = (ev.itemIds || []).length;
  const nObs = ev.observationItemId ? 1 : 0;
  return {
    id: m.id,
    domainId: m.domainId,
    strandId: m.strandId,
    strandName: strand?.name?.en ?? m.strandId,
    ageBand: m.ageBand,
    expectation: m.expectation,
    method: isObservation ? 'observation' : 'direct',
    nA,
    nB,
    nDirect,
    nObs,
    nCombined: nDirect + nObs,
    minForm: isObservation ? null : Math.min(nA, nB),
  };
});

const direct = rows.filter((r) => r.method === 'direct');
const observation = rows.filter((r) => r.method === 'observation');

/* ------------------------------------------------------------------ (a) distribution */

function distribution(vals) {
  const d = new Map();
  for (const v of vals) d.set(v, (d.get(v) || 0) + 1);
  return [...d.entries()].sort((a, b) => a[0] - b[0]);
}

const distA = distribution(direct.map((r) => r.nA));
const distB = distribution(direct.map((r) => r.nB));
const distCombined = distribution(direct.map((r) => r.nDirect));

/* ------------------------------------------------------------------ (b) thin milestones */

const THIN = 2;
const thin = direct
  .filter((r) => r.minForm <= THIN)
  .sort((a, b) => a.minForm - b.minForm || a.domainId.localeCompare(b.domainId) || a.id.localeCompare(b.id));

/* ------------------------------------------------------------ (c) discontinue exposure */

const scoredDirectItems = bank.items.filter(
  (i) => i.scored === true && i.form !== 'O' && i.type !== 'observation_checklist',
);

const strandBandForm = new Map(); // key strand|band|form -> items in sequence
for (const i of scoredDirectItems) {
  const key = `${i.strandId}|${i.ageBand}|${i.form}`;
  if (!strandBandForm.has(key)) strandBandForm.set(key, []);
  strandBandForm.get(key).push(i);
}
for (const list of strandBandForm.values()) list.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

const stopRows = [...strandBandForm.entries()]
  .map(([key, items]) => {
    const [strandId, ageBand, form] = key.split('|');
    const strand = strandById.get(strandId);
    const stopN = strand?.stopRule?.type === 'consecutive_incorrect' ? strand.stopRule.n : null;
    const counting = items.filter((i) => i.stop?.countsTowardStrandStop !== false);
    const total = counting.length;
    // Earliest possible fire: a miss-run over items 1..stopN ends administration at item stopN.
    const canFire = stopN !== null && total >= stopN;
    const survivingIfEarlyStop = canFire ? stopN : total;
    const forfeited = canFire ? total - stopN : 0;
    // Milestones in this strand/band whose form evidence would be wholly forfeited.
    const seen = new Set();
    for (const i of counting.slice(0, stopN ?? total)) (i.milestoneIds || []).forEach((m) => seen.add(m));
    const strandMilestones = direct.filter((r) => r.strandId === strandId && r.ageBand === ageBand);
    const strandedMilestones = strandMilestones.filter((r) => !seen.has(r.id)).length;
    return {
      strandId,
      strandName: strand?.name?.en ?? strandId,
      domainId: strand?.domainId ?? '',
      ageBand,
      form,
      stopN,
      items: total,
      canFire,
      survivingIfEarlyStop,
      forfeited,
      forfeitPct: total ? forfeited / total : 0,
      milestonesInStrandBand: strandMilestones.length,
      strandedMilestones,
    };
  })
  .sort(
    (a, b) =>
      Number(a.canFire) - Number(b.canFire) ||
      b.forfeitPct - a.forfeitPct ||
      a.strandId.localeCompare(b.strandId),
  );

// M-FOCUS items carry the pseudo-strand `ATL-X`, which has no record in `strands[]` and so no
// stop rule at all. That is a finding in its own right, not a row in the length table.
const unregistered = stopRows.filter((r) => !strandById.has(r.strandId));
const registered = stopRows.filter((r) => strandById.has(r.strandId));
const cannotFire = registered.filter((r) => !r.canFire);
const exposed = registered.filter((r) => r.canFire && r.forfeitPct >= 0.5);

/* ------------------------------------------------------------------ (d) distractors */

const choiceItems = bank.items.filter((i) => Array.isArray(i.options) && i.options.length > 1);
const roleCounts = new Map();
let itemsWithDistractors = 0;
const missingRationale = [];
for (const i of choiceItems) {
  const ds = i.distractors || [];
  if (ds.length) itemsWithDistractors++;
  for (const d of ds) {
    roleCounts.set(d.role, (roleCounts.get(d.role) || 0) + 1);
    if (!d.rationale) missingRationale.push(`${i.id}:${d.optionId}`);
  }
}
const noDistractors = choiceItems.filter((i) => !(i.distractors || []).length);
const orphanItems = bank.items.filter(
  (i) => i.scored === true && Array.isArray(i.milestoneIds) && i.milestoneIds.length === 0,
);

/* ------------------------------------------------------------------ report */

const stamp = new Date().toISOString().slice(0, 10);

say(`<!-- generated by scripts/evaluation-bank-audit.mjs — do not hand-edit the tables below -->`);
say(`**Bank** \`${bank.bankVersion}\` · checksum \`${bank.bankChecksum ?? '—'}\` · generated ${bank.generatedAt ?? '—'} · audited ${stamp}`);
say('');
say(`**Thresholds in force:** secure ≥ ${SECURE} · developing ≥ ${DEVELOPING} · minimum coverage ${MIN_COVERAGE}`);
say('');
say(`**Inventory:** ${bank.domains.length} domains · ${bank.strands.length} strands · ${bank.milestones.length} milestones · ${bank.items.length} item records · ${bank.stimuli.length} stimuli`);
say('');

/* --- (a) */
say('## A. Evidence items per milestone');
say('');
say(`Of ${rows.length} milestones, ${direct.length} are evidenced by direct check-in items and ${observation.length} by a single teacher band judgement (\`observation_checklist\`, one rating, three descriptors — not a ratio, so the arithmetic in section B does not apply to them).`);
say('');
say('### A.1 Distribution — direct milestones');
say('');
say('| Evidence items | Milestones (Form A) | Milestones (Form B) | Milestones (A+B combined) |');
say('|---:|---:|---:|---:|');
const allN = [...new Set([...distA, ...distB, ...distCombined].map(([n]) => n))].sort((a, b) => a - b);
for (const n of allN) {
  const a = distA.find(([k]) => k === n)?.[1] ?? 0;
  const b = distB.find(([k]) => k === n)?.[1] ?? 0;
  const c = distCombined.find(([k]) => k === n)?.[1] ?? 0;
  say(`| ${n} | ${a} | ${b} | ${c} |`);
}
say('');

say('### A.2 Direct milestones by domain × band (items per form, min–max)');
say('');
say('| Domain | ' + BANDS.join(' | ') + ' |');
say('|---|' + BANDS.map(() => '---').join('|') + '|');
for (const d of bank.domains) {
  const cells = BANDS.map((band) => {
    const set = direct.filter((r) => r.domainId === d.id && r.ageBand === band);
    if (!set.length) return '—';
    const ns = set.flatMap((r) => [r.nA, r.nB]);
    const lo = Math.min(...ns);
    const hi = Math.max(...ns);
    return `${set.length} ms · ${lo === hi ? lo : `${lo}–${hi}`} items`;
  });
  say(`| ${d.id} — ${d.name.en} | ${cells.join(' | ')} |`);
}
say('');

say('### A.3 What each evidence count can express');
say('');
say(`With *n* binary items, the only reachable ratios are *k/n*. Because "secure" needs ≥ ${SECURE}, a milestone with four or fewer items requires a **perfect run** to reach secure, and a milestone with one item cannot reach "developing" at all.`);
say('');
say('| n items | emerging | developing | secure | verdict |');
say('|---:|---|---|---|---|');
for (let n = 1; n <= 8; n++) {
  const r = reachable(n);
  const verdict =
    !r.developing.length ? '**binary — developing unreachable**'
    : r.secure.length === 1 && n <= 4 ? 'secure requires every item correct'
    : 'all three bands reachable';
  say(`| ${n} | ${r.emerging.join(', ') || '—'} | ${r.developing.join(', ') || '—'} | ${r.secure.join(', ') || '—'} | ${verdict} |`);
}
say('');

/* --- (b) */
say('## B. The binary trap — thin milestones');
say('');
say(`Milestones carrying **${THIN} or fewer** direct evidence items on at least one form. At 2 items a milestone has exactly three possible outcomes (0/0.5/1.0), so a single item decides the band and "developing" is a knife-edge; at 1 item the milestone is strictly binary and the middle band cannot be produced.`);
say('');
if (!thin.length) {
  say('_None — every direct milestone carries at least three items on both forms._');
} else {
  say(`**${thin.length} of ${direct.length} direct milestones affected (${pct(thin.length, direct.length)}).**`);
  say('');
  say('| Milestone | Domain | Strand | Band | Expectation | Form A | Form B | Reachable bands (thinner form) |');
  say('|---|---|---|---|---|---:|---:|---|');
  for (const r of thin) {
    const rr = reachable(r.minForm);
    const bands = ['emerging', 'developing', 'secure'].filter((b) => rr[b].length).join(' / ') || 'none';
    say(`| \`${r.id}\` | ${r.domainId} | ${r.strandName} | ${r.ageBand} | ${r.expectation} | ${r.nA} | ${r.nB} | ${bands} |`);
  }
}
say('');
const perfectRun = direct.filter((r) => r.minForm >= 1 && r.minForm <= 4);
say(`**Wider exposure:** ${perfectRun.length} direct milestones (${pct(perfectRun.length, direct.length)}) have ≤ 4 items on their thinner form, meaning "secure" is only reachable on a flawless run of every item.`);
say('');

/* --- (c) */
say('## C. Discontinue rule vs. strand length');
say('');
say('Every strand carries the same stop rule: **3 consecutive incorrect within the strand**. Two failure shapes follow from item count.');
say('');
say('### C.1 Strand × band × form where the rule can never fire');
say('');
if (!cannotFire.length) {
  say('_None — every strand/band/form carries at least as many items as the discontinue threshold._');
} else {
  say(`${cannotFire.length} strand/band/form combinations carry fewer items than the threshold, so the discontinue rule is inert there — a child works every item regardless.`);
  say('');
  say('| Strand | Domain | Band | Form | Items | Stop threshold |');
  say('|---|---|---|---|---:|---:|');
  for (const r of cannotFire) say(`| ${r.strandId} — ${r.strandName} | ${r.domainId} | ${r.ageBand} | ${r.form} | ${r.items} | ${r.stopN ?? '—'} |`);
}
say('');
say('### C.2 Where one early miss-run forfeits most of the strand');
say('');
say('If the first three items go wrong the strand stops there. This table shows what is left unseen.');
say('');
say('| Strand | Domain | Band | Form | Items | Seen if rule fires at item 3 | Evidence forfeited | Milestones left with no evidence |');
say('|---|---|---|---|---:|---:|---:|---:|');
for (const r of registered.filter((x) => x.canFire).sort((a, b) => b.forfeitPct - a.forfeitPct || a.strandId.localeCompare(b.strandId))) {
  say(`| ${r.strandId} — ${r.strandName} | ${r.domainId} | ${r.ageBand} | ${r.form} | ${r.items} | ${r.survivingIfEarlyStop} | ${r.forfeited} (${(100 * r.forfeitPct).toFixed(0)}%) | ${r.strandedMilestones} of ${r.milestonesInStrandBand} |`);
}
say('');
say(`**${exposed.length} strand/band/form combinations forfeit half or more of their items to a single early miss-run.**`);
say('');
say('### C.3 Items outside the stop-rule system');
say('');
if (!unregistered.length) {
  say('_None — every scored item belongs to a strand carrying a stop rule._');
} else {
  const n = unregistered.reduce((a, r) => a + r.items, 0);
  say(`${n} scored items across ${unregistered.length} band/form combinations sit on pseudo-strands with **no record in \`strands[]\`** and therefore **no discontinue rule and no milestone links**: ${[...new Set(unregistered.map((r) => r.strandId))].map((x) => '`' + x + '`').join(', ')} (module ${[...new Set(unregistered.map((r) => bank.items.find((i) => i.strandId === r.strandId)?.moduleId))].join(', ')}). A child who cannot do the first task works all of them. This is defensible for an optional module that feeds no milestone, but it should be a deliberate, documented choice rather than an omission.`);
}
say('');

/* --- (d) */
say('## D. Distractor role coverage');
say('');
say(`${itemsWithDistractors} of ${choiceItems.length} multiple-choice items carry an explicit distractor design (${pct(itemsWithDistractors, choiceItems.length)}).`);
say('');
say('| Distractor role | Count |');
say('|---|---:|');
for (const [role, n] of [...roleCounts.entries()].sort((a, b) => b[1] - a[1])) say(`| ${role} | ${n} |`);
say('');
const noDistScored = noDistractors.filter((i) => i.scored === true);
const noDistPractice = noDistractors.filter((i) => i.scored !== true);
say(`- Choice items with **no** distractor design: **${noDistractors.length}** — ${noDistPractice.length} practice/unscored (expected: practice items are deliberately transparent) and **${noDistScored.length} scored**${noDistScored.length ? ` (${noDistScored.slice(0, 10).map((i) => '`' + i.id + '`').join(', ')}${noDistScored.length > 10 ? ' …' : ''})` : ''}.`);
say(`- Distractor entries missing a rationale: **${missingRationale.length}**`);
say(`- Scored items linked to **no** milestone: **${orphanItems.length}**${orphanItems.length ? ` — these are ${[...new Set(orphanItems.map((i) => i.moduleId))].join(', ')} items, which contribute no milestone evidence by design.` : ''}`);
say('');

const summary = {
  bankVersion: bank.bankVersion,
  auditedAt: stamp,
  milestones: rows.length,
  directMilestones: direct.length,
  observationMilestones: observation.length,
  thinMilestones: thin.length,
  perfectRunMilestones: perfectRun.length,
  stopRuleInert: cannotFire.length,
  itemsOutsideStopRule: unregistered.reduce((a, r) => a + r.items, 0),
  stopRuleExposed: exposed.length,
  choiceItems: choiceItems.length,
  itemsWithDistractors: itemsWithDistractors,
  orphanScoredItems: orphanItems.length,
};

if (asJson) {
  console.log(JSON.stringify({ summary, thin, stopRows, roles: Object.fromEntries(roleCounts) }, null, 2));
} else {
  console.log(out.join('\n'));
}
