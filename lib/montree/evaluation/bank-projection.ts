/**
 * Montree Milestones — server-side item-bank projection.
 *
 * `item-bank.json` is 1.6 MB. Shipping it to a tablet would be both slow and wrong: it
 * carries fields the child-facing runner must never see (`distractors[].rationale` — the
 * note explaining what each wrong option is designed to catch; telling an adult that
 * invites coaching) and fields it cannot use (paper layout, framework crosswalks).
 *
 * This module builds the smallest honest slice for ONE sitting: one age band, one form,
 * the chosen modules — plus the band above where the bank genuinely treats it as
 * extension evidence, and the observation checklist when M-OBS was chosen.
 *
 * RULES (mirrors build/gen-d2-projection.mjs, which does the same job for the standalone
 * tablet file):
 *   • Only ever DROP fields. Never rename one, never author content, never recompute.
 *   • `bankVersion` and `bankChecksum` are copied verbatim, so a session recorded against
 *     a projection matches on checksum server-side with no drift allowance.
 *   • The server re-scores from the FULL bank regardless of what the client was sent —
 *     this projection decides what is shown, never what is true.
 */
import { getBankIndex } from './bank';
import type {
  AgeBand, BankItem, BankModule, Domain, FormCode, ItemBank, Milestone, ModuleId,
  ObservationChecklist, Rubric, Strand,
} from './types';

/** The band whose items may be offered as extension evidence for a child at `band`. */
const BAND_UP: Record<AgeBand, AgeBand | null> = { A3: 'A4', A4: 'A5', A5: null };

/** A stimulus as the runner needs it: the SVG body and the alt text, nothing else. */
export interface ProjectedStimulus {
  id: string;
  kind: string;
  label: ItemBank['stimuli'][number]['label'];
  altText: ItemBank['stimuli'][number]['altText'];
  render: { viewBox: string; svg: string };
}

/** What `GET /api/montree/evaluation/bank` returns and the runner engine consumes. */
export interface ProjectedBank {
  schemaVersion: string;
  bankVersion: string;
  bankChecksum: string;
  assessmentLocales: string[];
  scoring: ItemBank['scoring'];
  ageBand: AgeBand;
  formCode: FormCode;
  moduleIds: string[];
  domains: Domain[];
  strands: Strand[];
  milestones: Milestone[];
  modules: BankModule[];
  rubrics: Record<string, Rubric>;
  observationChecklists: ObservationChecklist[];
  stimuli: ProjectedStimulus[];
  items: BankItem[];
  counts: { items: number; stimuli: number; milestones: number; observationItems: number };
}

export interface ProjectionRequest {
  ageBand: AgeBand;
  formCode: FormCode;
  moduleIds: string[];
}

const drop = <T extends object>(obj: T, keys: string[]): T => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (keys.includes(k)) continue;
    if (v === undefined) continue;
    out[k] = v;
  }
  return out as T;
};

/**
 * Strip one item down to what a tablet renders and scores.
 * `distractors[].rationale` is internal review copy — removed, never merely hidden in CSS.
 */
function projectItem(item: BankItem): BankItem {
  const out = drop(item, ['paper', 'timing', 'crosswalk', 'evidenceMedia']) as BankItem;
  if (out.distractors) {
    out.distractors = out.distractors.map((d) => drop(d, ['rationale']));
  }
  return out;
}

/** Milestone ids at `band` whose evidence deliberately sits in a higher band. */
function extensionEvidenceItemIds(bank: ItemBank, band: AgeBand, formCode: FormCode): Set<string> {
  const ids = new Set<string>();
  for (const m of bank.milestones) {
    if (m.ageBand !== band || m.expectation !== 'extension') continue;
    const ev = m.evidence ?? { minCoverage: 0 };
    if (!ev.evidenceBand || ev.evidenceBand === band) continue;
    const forForm = ev.byForm?.[formCode] ?? ev.itemIds ?? [];
    for (const id of forForm) ids.add(id);
  }
  return ids;
}

/**
 * Build the slice. Pure apart from reading the process-cached bank index.
 */
export function projectBank(req: ProjectionRequest): ProjectedBank {
  const index = getBankIndex();
  const bank = index.bank;
  const { ageBand, formCode } = req;

  const moduleIds = req.moduleIds.filter((m) => index.moduleById.has(m as ModuleId));
  const wantObservation = moduleIds.includes('M-OBS');
  const directModules = moduleIds.filter((m) => m !== 'M-OBS');

  const bandUp = BAND_UP[ageBand];
  const extensionIds = bandUp ? extensionEvidenceItemIds(bank, ageBand, formCode) : new Set<string>();

  const items: BankItem[] = [];
  for (const item of bank.items) {
    if (item.type === 'observation_checklist') {
      if (wantObservation && item.ageBand === ageBand) items.push(projectItem(item));
      continue;
    }
    if (!directModules.includes(item.moduleId)) continue;
    // Practice items carry form 'P' and are band-scoped; scored items are form A or B.
    const formOk = item.form === 'P' || item.form === formCode;
    if (!formOk) continue;
    if (item.ageBand === ageBand) { items.push(projectItem(item)); continue; }
    if (bandUp && item.ageBand === bandUp && extensionIds.has(item.id)) items.push(projectItem(item));
  }

  const itemIds = new Set(items.map((i) => i.id));

  // Milestones: the child's own band (what this check-in is about) plus any milestone whose
  // evidence is entirely present in this slice, so the runner can show honest coverage.
  const milestones = bank.milestones
    .filter((m) => {
      if (m.ageBand === ageBand) return true;
      const ev = m.evidence ?? { minCoverage: 0 };
      const declared = ev.byForm?.[formCode] ?? ev.itemIds ?? [];
      return declared.length > 0 && declared.some((id) => itemIds.has(id));
    })
    .map((m) => drop(m, ['crosswalk']) as Milestone);

  const strandIds = new Set<string>();
  for (const i of items) strandIds.add(i.strandId);
  for (const m of milestones) strandIds.add(m.strandId);
  const strands = bank.strands.filter((s) => strandIds.has(s.id));

  const domainIds = new Set(strands.map((s) => s.domainId));
  for (const m of milestones) domainIds.add(m.domainId);
  const domains = bank.domains.filter((d) => domainIds.has(d.id));

  // Stimuli: only what these items actually put on screen.
  const stimulusIds = new Set<string>();
  for (const i of items) {
    for (const sid of i.stimulusIds ?? []) stimulusIds.add(sid);
    for (const o of i.options ?? []) stimulusIds.add(o.stimulusId);
  }
  const stimuli: ProjectedStimulus[] = bank.stimuli
    .filter((s) => stimulusIds.has(s.id))
    .map((s) => ({
      id: s.id,
      kind: s.kind,
      label: s.label,
      altText: s.altText,
      render: { viewBox: s.render?.viewBox ?? '0 0 100 100', svg: s.render?.svg ?? '' },
    }));

  // Rubrics: only the ones a teacher-scored oral item in this slice refers to.
  const rubrics: Record<string, Rubric> = {};
  for (const i of items) {
    const key = i.scoring?.rubricKey;
    if (key && bank.rubrics?.[key]) rubrics[key] = bank.rubrics[key];
  }

  const modules = bank.modules.filter((m) => moduleIds.includes(m.id));
  const observationChecklists = wantObservation
    ? bank.observationChecklists.filter((c) => c.ageBand === ageBand)
    : [];

  return {
    schemaVersion: bank.schemaVersion,
    bankVersion: bank.bankVersion,
    bankChecksum: bank.bankChecksum,
    assessmentLocales: bank.assessmentLocales,
    scoring: bank.scoring,
    ageBand,
    formCode,
    moduleIds,
    domains,
    strands,
    milestones,
    modules,
    rubrics,
    observationChecklists,
    stimuli,
    items,
    counts: {
      items: items.length,
      stimuli: stimuli.length,
      milestones: milestones.length,
      observationItems: items.filter((i) => i.type === 'observation_checklist').length,
    },
  };
}
