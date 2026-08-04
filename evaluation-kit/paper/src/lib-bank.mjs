/**
 * Montree Milestones — paper-pack bank reader.
 *
 * Reads the canonical `lib/montree/evaluation/item-bank.json` — the same file the tablet
 * runner and the API projection read — and derives every view the printed packs need.
 * Zero hand-authored item content lives here: if the bank changes, the packs change with it.
 *
 * Rules:
 *   • Only ever SELECT, GROUP and COUNT. Never author item content, never invent a threshold.
 *   • `bankVersion` / `bankChecksum` are copied verbatim onto every pack (cover + footer).
 *   • Print uses `render.svg` for EVERY stimulus. `render.raster` is deliberately ignored:
 *     vector prints losslessly at any size and stays crisp in greyscale.
 *   • Item ids are printed without their `IT.` prefix everywhere except the colour notice,
 *     which quotes the full canonical id.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
/** evaluation-kit/paper/src → repo root */
export const REPO_ROOT = resolve(HERE, '../../..');
export const DEFAULT_BANK_PATH =
  process.env.MONTREE_ITEM_BANK || resolve(REPO_ROOT, 'lib/montree/evaluation/item-bank.json');

/** Modules that appear in a sitting pack, in printed order.
 *  M-FOCUS is the optional tablet-only extension module and is never printed.
 *  M-OBS is printed as the observation booklet, not as a sitting module. */
export const PAPER_MODULE_IDS = ['M-LIT', 'M-MATH', 'M-EFL'];
export const AGE_BANDS = ['A3', 'A4', 'A5'];
export const FORM_CODES = ['A', 'B'];

export const BAND_META = {
  A3: { years: 3, label: '3 years', range: '3;0 – 3;11' },
  A4: { years: 4, label: '4 years', range: '4;0 – 4;11' },
  A5: { years: 5, label: '5 years', range: '5;0 – 5;11' },
};

export const FORM_META = {
  A: { window: 'the Autumn and Spring windows', windowShort: 'Autumn and Spring' },
  B: { window: 'the Winter window', windowShort: 'Winter' },
};

/** Strands that belong to the English (EFL) track — reported on their own, never added to
 *  the core total. */
const EFL_STRAND_IDS = new Set(['E1', 'E2', 'E3', 'E4', 'E5', 'E6']);

/** Pull the English string out of a localised `{en, zh}` value. */
export const en = (v) => (v && typeof v === 'object' ? (v.en ?? '') : (v ?? ''));

/** `IT.LCL-A.A3.A.01` → `LCL-A.A3.A.01`. The short code teachers cross-refer by. */
export const shortItemId = (id) => (String(id).startsWith('IT.') ? String(id).slice(3) : String(id));

/** Glyph printed in a record-sheet response box for a text-bearing stimulus.
 *  `the letter s` → `s`, `the numeral 4` → `4`, `the word sat` → `sat`. Pictures get no glyph. */
export function stimulusGlyph(stim) {
  if (!stim) return null;
  if (!['letter', 'word', 'numeral'].includes(stim.kind)) return null;
  const m = /^the (?:letter|numeral|word)\s+(.+)$/i.exec(en(stim.label) || '');
  return m ? m[1] : null;
}

export const EXPECTATION_LABEL = {
  expected: 'expected at this age',
  emerging_edge: 'seen in some children at this age',
  extension: 'next age band — counts as exceeded',
};

const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th', '6th'];

export function loadBank(path = DEFAULT_BANK_PATH) {
  const bank = JSON.parse(readFileSync(path, 'utf8'));
  // The one field that carries the tablet↔paper equivalence rule. Refuse to print without it.
  const missing = bank.items.filter((i) => !i.paper?.responseMode);
  if (missing.length) {
    throw new Error(
      `Refusing to build: ${missing.length} item(s) have no paper.responseMode (first: ${missing[0].id})`,
    );
  }
  return bank;
}

export function indexBank(bank) {
  return {
    bank,
    domainById: new Map(bank.domains.map((d) => [d.id, d])),
    strandById: new Map(bank.strands.map((s) => [s.id, s])),
    moduleById: new Map(bank.modules.map((m) => [m.id, m])),
    stimulusById: new Map(bank.stimuli.map((s) => [s.id, s])),
    itemById: new Map(bank.items.map((i) => [i.id, i])),
    milestoneById: new Map(bank.milestones.map((m) => [m.id, m])),
  };
}

/** Evidence a milestone can carry on one form. */
function milestoneEvidence(idx, bank, milestone, formCode) {
  const ev = milestone.evidence ?? {};
  const ids = ev.byForm?.[formCode] ?? ev.itemIds ?? [];
  const items = ids.map((id) => idx.itemById.get(id)).filter(Boolean);
  const maxPoints = items.reduce((n, i) => n + (i.scoring?.maxPoints ?? 0), 0);
  const minCoverage = ev.minCoverage ?? bank.scoring.minCoverage ?? 0.5;
  return {
    itemIds: ids,
    items,
    maxPoints,
    // fewer than this many of the milestone's items given → "not yet checked".
    minItems: Math.max(1, Math.ceil(items.length * minCoverage - 1e-9)),
  };
}

/**
 * Point total → printed cut-off row, using the bank's own thresholds and nothing else.
 * secure  = ceil(max × secureThreshold) … max
 * develop = ceil(max × developingThreshold) … secure−1   ("—" when that range is empty)
 * emerging= 0 … developing−1
 */
export function bandCutoffs(maxPoints, thresholds) {
  const secureMin = Math.ceil(maxPoints * thresholds.secure - 1e-9);
  const developingMin = Math.ceil(maxPoints * thresholds.developing - 1e-9);
  const range = (lo, hi) => (hi < lo ? '—' : lo === hi ? String(lo) : `${lo}–${hi}`);
  return {
    secureMin,
    developingMin,
    secure: range(secureMin, maxPoints),
    developing: range(developingMin, secureMin - 1),
    emerging: range(0, developingMin - 1),
  };
}

/** Group a module's ordered items into consecutive runs that share a strand. */
function groupByStrand(idx, items) {
  const groups = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.strandId === item.strandId) last.items.push(item);
    else
      groups.push({
        strandId: item.strandId,
        strand: idx.strandById.get(item.strandId),
        items: [item],
      });
  }
  for (const g of groups) {
    g.name = en(g.strand?.name);
    g.spec = g.strand?.constructSpec ?? '';
    g.strandStopN = g.strand?.stopRule?.n ?? 3;
    g.maxPoints = g.items.reduce((n, i) => n + (i.scoring?.maxPoints ?? 0), 0);
  }
  return groups;
}

/** Everything the printed pack needs for one (ageBand, formCode). */
export function buildPackView(bank, ageBand, formCode) {
  const idx = indexBank(bank);
  const thresholds = bank.scoring.milestoneThresholds;

  // ---------- sitting modules ----------
  const modules = PAPER_MODULE_IDS.map((moduleId) => {
    const mod = idx.moduleById.get(moduleId);
    const practice = (mod.practiceItemIds?.[ageBand] ?? [])
      .map((id) => idx.itemById.get(id))
      .filter(Boolean);
    const items = bank.items
      .filter((i) => i.moduleId === moduleId && i.ageBand === ageBand && i.form === formCode)
      .sort((a, b) => a.sequence - b.sequence);
    return {
      id: moduleId,
      name: en(mod.name),
      module: mod,
      practice,
      items,
      strandGroups: groupByStrand(idx, items),
      strands: (mod.strandIds ?? []).map((id) => idx.strandById.get(id)).filter(Boolean),
      strandNames: (mod.strandIds ?? []).map((id) => en(idx.strandById.get(id)?.name)),
      targetMinutes: mod.targetMinutes,
      moduleStopN: mod.stopRule?.n ?? 5,
      strandStopN: idx.strandById.get(mod.strandIds?.[0])?.stopRule?.n ?? 3,
      extensionMax: mod.extensionRule?.maxItems ?? 4,
      maxPoints: items.reduce((n, i) => n + (i.scoring?.maxPoints ?? 0), 0),
    };
  });

  /** Presentation view of one item: what the child sees, what the teacher marks. */
  const itemView = (item, code, moduleId) => {
    const context = (item.stimulusIds ?? []).map((id) => idx.stimulusById.get(id)).filter(Boolean);
    const seq = item.scoring?.correctSequence ?? null;
    const correct = new Set(item.scoring?.correctOptionIds ?? []);
    const options = (item.options ?? []).map((o) => {
      const stim = idx.stimulusById.get(o.stimulusId);
      return {
        id: o.id,
        stimulus: stim,
        glyph: stimulusGlyph(stim),
        correct: correct.has(o.id),
        // "key" for a single answer, "1st"/"2nd" for an ordered touch sequence
        keyLabel: seq
          ? seq.indexOf(o.id) >= 0
            ? ORDINAL[seq.indexOf(o.id)]
            : null
          : correct.has(o.id)
            ? 'key'
            : null,
      };
    });
    return {
      item,
      code,
      moduleId,
      id: item.id,
      shortId: shortItemId(item.id),
      strandId: item.strandId,
      strandName: en(idx.strandById.get(item.strandId)?.name),
      type: item.type,
      isPractice: item.form === 'P',
      line: en(item.prompt?.audio),
      script: en(item.prompt?.teacherScript),
      onScreen: en(item.prompt?.onScreen),
      responseMode: item.paper?.responseMode ?? '',
      cardsPerRow: item.paper?.cardsPerRow ?? 2,
      maxPoints: item.scoring?.maxPoints ?? 0,
      requiresColor: !!item.requiresColor,
      englishMedium: !!idx.strandById.get(item.strandId)?.englishMedium,
      ordered: !!seq && seq.length > 1,
      rubric: item.scoring?.rubric
        ? item.scoring.rubric.levels.map((l) => ({ score: l.score, text: en(l.descriptor) }))
        : null,
      context,
      options,
      /** child page only when there is actually something to put in front of the child */
      hasChildPage: context.length > 0 || options.length > 0,
    };
  };

  for (const m of modules) {
    m.practiceViews = m.practice.map((it, i) => itemView(it, `P${i + 1}`, m.id));
    m.itemViews = m.items.map((it) => itemView(it, String(it.sequence), m.id));
    m.allViews = [...m.practiceViews, ...m.itemViews];
    for (const g of m.strandGroups) g.views = g.items.map((it) => itemView(it, String(it.sequence), m.id));
  }

  // ---------- child pages ----------
  const childPages = modules.flatMap((m) => m.allViews.filter((v) => v.hasChildPage));
  const skippedChildPages = modules.flatMap((m) => m.allViews.filter((v) => !v.hasChildPage));

  // ---------- milestone lookup ----------
  const lookup = modules.map((m) => {
    const strandIds = new Set(m.strands.map((s) => s.id));
    const rows = bank.milestones
      .filter((ms) => ms.ageBand === ageBand && strandIds.has(ms.strandId))
      .map((ms) => {
        const ev = milestoneEvidence(idx, bank, ms, formCode);
        return {
          id: ms.id,
          statement: en(ms.statement),
          expectation: ms.expectation,
          expectationLabel: EXPECTATION_LABEL[ms.expectation] ?? ms.expectation,
          itemIds: ev.itemIds.map(shortItemId),
          maxPoints: ev.maxPoints,
          minItems: ev.minItems,
          cutoffs: bandCutoffs(ev.maxPoints, thresholds),
        };
      })
      .filter((r) => r.itemIds.length > 0);
    return { module: m, rows };
  });

  // ---------- observation booklet ----------
  const obsFor = (band) =>
    bank.observationChecklists
      .filter((c) => c.ageBand === band)
      .sort(
        (a, b) =>
          (idx.domainById.get(a.domainId)?.sequence ?? 0) -
          (idx.domainById.get(b.domainId)?.sequence ?? 0),
      )
      .map((c) => {
        const items = (c.itemIds ?? []).map((id) => idx.itemById.get(id)).filter(Boolean);
        return {
          checklist: c,
          domainId: c.domainId,
          domainName: en(idx.domainById.get(c.domainId)?.name),
          guidance: en(c.guidance),
          strandIds: c.strandIds ?? [],
          records: items.map((it) => ({
            id: it.milestoneId ?? shortItemId(it.id),
            statement: en(it.statement),
            bands: ['emerging', 'developing', 'secure'].map((b) => ({
              band: b,
              text: en(it.bandDescriptors?.[b]),
            })),
          })),
        };
      });

  const observation = obsFor(ageBand);
  const referenceBands = AGE_BANDS.filter((b) => b !== ageBand).map((b) => ({
    ageBand: b,
    meta: BAND_META[b],
    groups: obsFor(b),
  }));

  // ---------- items that cannot be answered in greyscale ----------
  const colourItems = modules
    .flatMap((m) => m.itemViews)
    .filter((v) => v.requiresColor)
    .map((v) => ({ id: v.id, strandName: v.strandName, line: v.line }));

  // ---------- counts printed on the summary sheet ----------
  const bandMilestones = bank.milestones.filter((m) => m.ageBand === ageBand);
  const isEfl = (m) => EFL_STRAND_IDS.has(m.strandId);
  const counts = {
    coreExpected: bandMilestones.filter((m) => !isEfl(m) && m.expectation === 'expected').length,
    eflExpected: bandMilestones.filter((m) => isEfl(m) && m.expectation === 'expected').length,
    extension: bandMilestones.filter((m) => m.expectation === 'extension').length,
    emergingEdge: bandMilestones.filter((m) => m.expectation === 'emerging_edge').length,
    scoredItems: modules.reduce((n, m) => n + m.items.length, 0),
    practiceItems: modules.reduce((n, m) => n + m.practice.length, 0),
    observationRecords: observation.reduce((n, g) => n + g.records.length, 0),
    observationRecordsAllBands: bank.items.filter((i) => i.type === 'observation_checklist').length,
    childPages: childPages.length,
    colourItems: colourItems.length,
  };

  return {
    ageBand,
    formCode,
    bandMeta: BAND_META[ageBand],
    formMeta: FORM_META[formCode],
    bankVersion: bank.bankVersion,
    bankChecksum: bank.bankChecksum,
    attribution: bank.attribution,
    scoring: bank.scoring,
    modules,
    childPages,
    skippedChildPages,
    lookup,
    observation,
    referenceBands,
    colourItems,
    counts,
  };
}

/** Convenience: every (band, form) view in printed order. */
export function buildAllPackViews(bank) {
  const out = [];
  for (const ageBand of AGE_BANDS) for (const formCode of FORM_CODES) out.push(buildPackView(bank, ageBand, formCode));
  return out;
}
