#!/usr/bin/env node
/**
 * gen-d2-projection.mjs — build the item bank that D2 (the tablet HTML) embeds.
 *
 * SOURCE OF TRUTH: lib/montree/evaluation/item-bank.json (the merged, canonical bank),
 * resolved relative to this file (../lib/...) and overridable with --bank <file>.
 * This script only ever DROPS fields the tablet cannot use; it never
 * renames one and never authors content. Field names, ids, module list (M-OBS included)
 * and the 84 observation_checklist records all stay exactly as the canonical bank has them,
 * so the tablet, the paper packs and the Montree API are reading the same words.
 *
 * bankVersion and bankChecksum are copied verbatim, and D2 re-exports them in every session
 * file, so POST /api/montree/evaluation/import matches on checksum without acceptBankDrift.
 *
 * Dropped (tablet-irrelevant, never displayed or scored on the device):
 *   items[].crosswalk? (n/a) · items[].paper · items[].distractors[].rationale ·
 *   items[].timing (constant: {maxSeconds:null, advanceOn:'response'}) ·
 *   milestones[].crosswalk · stimuli[].render.{svgSymbolId,printMinMm,monochromeSafe} ·
 *   stimuli[].tags · observation items' paper/evidenceMedia blocks
 *
 * Kept from stimuli[].render: viewBox · svg · raster (base64 data URL, where authored).
 *
 * Usage: node gen-d2-projection.mjs [--bank <file>] [--out <file>] [--check]
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2);
const CANONICAL = argv.includes('--bank')
  ? path.resolve(argv[argv.indexOf('--bank') + 1])
  : path.join(ROOT, '../lib/montree/evaluation/item-bank.json');
const OUT = argv.includes('--out') ? argv[argv.indexOf('--out') + 1]
                                   : path.join(ROOT, 'tools/bank.projected.json');

const bank = JSON.parse(fs.readFileSync(CANONICAL, 'utf8'));

const drop = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (!keys.includes(k) && v !== undefined) out[k] = v;
  return out;
};

const projectItem = (i) => {
  const o = drop(i, ['paper', 'timing', 'crosswalk']);
  if (o.distractors) o.distractors = o.distractors.map((d) => drop(d, ['rationale']));
  if (o.evidenceMedia) delete o.evidenceMedia;
  return o;
};

const projected = {
  schemaVersion: bank.schemaVersion,
  bankVersion: bank.bankVersion,
  bankChecksum: bank.bankChecksum,          // canonical, verbatim — re-exported on every session
  generatedAt: bank.generatedAt,
  mergedAt: bank.mergedAt,
  assessmentLocales: bank.assessmentLocales,
  attribution: bank.attribution,
  scoring: bank.scoring,
  domains: bank.domains,
  strands: bank.strands,
  milestones: bank.milestones.map((m) => drop(m, ['crosswalk'])),
  modules: bank.modules,                     // all five, M-OBS included
  rubrics: bank.rubrics,
  observationChecklists: bank.observationChecklists,
  stimuli: bank.stimuli.map((s) => ({
    id: s.id, kind: s.kind, label: s.label, altText: s.altText,
    render: {
      viewBox: s.render.viewBox,
      svg: s.render.svg,
      ...(s.render.raster !== undefined ? { raster: s.render.raster } : {}),
    },
  })),
  items: bank.items.map(projectItem),
  counts: bank.counts,
};

/* ---- invariants: the projection must not lose or rename anything load-bearing ---- */
const fail = [];
const eq = (a, b, what) => { if (a !== b) fail.push(`${what}: ${a} !== ${b}`); };
eq(projected.items.length, bank.items.length, 'item count');
eq(projected.stimuli.length, bank.stimuli.length, 'stimulus count');
eq(projected.milestones.length, bank.milestones.length, 'milestone count');
eq(projected.modules.length, bank.modules.length, 'module count');
eq(projected.items.filter((i) => i.type === 'observation_checklist').length, 84, 'observation records');
if (!projected.modules.some((m) => m.id === 'M-OBS')) fail.push('M-OBS module missing');
eq(projected.bankVersion, bank.bankVersion, 'bankVersion');
eq(projected.bankChecksum, bank.bankChecksum, 'bankChecksum');
const stimIds = new Set(projected.stimuli.map((s) => s.id));
for (const it of projected.items) {
  for (const o of it.options ?? []) {
    if (!('stimulusId' in o)) fail.push(`${it.id}: option field renamed`);
    if (!stimIds.has(o.stimulusId)) fail.push(`${it.id}: unresolved stimulus ${o.stimulusId}`);
  }
  for (const sid of it.stimulusIds ?? []) if (!stimIds.has(sid)) fail.push(`${it.id}: unresolved stimulus ${sid}`);
  if (it.scored !== false && it.type === 'tap_choice' && !(it.scoring.correctOptionIds || []).length)
    fail.push(`${it.id}: no correctOptionIds`);
  if (it.type === 'teacher_scored_oral' && !it.scoring.rubric) fail.push(`${it.id}: rubric dropped`);
}
for (const s of projected.stimuli) if (!s.render.svg || !s.render.viewBox) fail.push(`${s.id}: render dropped`);
if (fail.length) { console.error('PROJECTION FAILED:\n  ' + fail.join('\n  ')); process.exit(1); }

const json = JSON.stringify(projected);
if (argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  console.log(cur === json ? 'projection up to date' : 'projection STALE — re-run without --check');
  process.exit(cur === json ? 0 : 1);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, json);
console.log(
  `projected ${bank.bankVersion} ${bank.bankChecksum}\n` +
  `  -> ${OUT}  ${(json.length / 1024).toFixed(1)} KB\n` +
  `  items ${projected.items.length} (obs ${projected.items.filter(i=>i.type==='observation_checklist').length}) · ` +
  `stimuli ${projected.stimuli.length} · milestones ${projected.milestones.length} · ` +
  `modules ${projected.modules.map(m=>m.id).join(',')}\n` +
  `  source sha256 ${crypto.createHash('sha256').update(fs.readFileSync(CANONICAL)).digest('hex')}`
);
