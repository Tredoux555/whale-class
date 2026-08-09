/**
 * Montree Milestones — the bank, loaded once and indexed.
 *
 * `item-bank.json` is THE single source of truth (ARCHITECTURE.md §5). The tablet app and
 * the paper-pack generator embed the very same file; no consumer holds its own copy of
 * item content. Everything in this module is read-only: nothing here ever mutates the bank.
 *
 * Regenerate the file with:
 *   node scripts/evaluation/merge-item-bank.mjs --src <authored-bank-dir>
 * and validate it with the CLI validator before shipping.
 */
import rawBank from './item-bank.json';
import type {
  AgeBand, BankIndex, BankItem, Domain, ItemBank, Milestone, Strand, Track,
} from './types';

/** The cast is deliberate: `resolveJsonModule` infers a 1.5 MB literal type we do not want. */
export const BANK: ItemBank = rawBank as unknown as ItemBank;

function buildIndex(bank: ItemBank): BankIndex {
  const domainById = new Map<string, Domain>(bank.domains.map((d) => [d.id, d]));
  const strandById = new Map<string, Strand>(bank.strands.map((s) => [s.id, s]));
  const milestoneById = new Map<string, Milestone>(bank.milestones.map((m) => [m.id, m]));
  const itemById = new Map<string, BankItem>(bank.items.map((i) => [i.id, i]));
  const stimulusById = new Map(bank.stimuli.map((s) => [s.id, s]));
  const moduleById = new Map(bank.modules.map((m) => [m.id, m]));

  const trackByDomainId = new Map<string, Track>(bank.domains.map((d) => [d.id, d.track]));

  const observationItemByMilestoneId = new Map<string, BankItem>();
  for (const item of bank.items) {
    if (item.type === 'observation_checklist' && item.milestoneId) {
      observationItemByMilestoneId.set(item.milestoneId, item);
    }
  }

  const milestonesByBandAndTrack = new Map<string, Milestone[]>();
  for (const m of bank.milestones) {
    const track = trackByDomainId.get(m.domainId) ?? 'core';
    const key = `${m.ageBand}::${track}`;
    const list = milestonesByBandAndTrack.get(key);
    if (list) list.push(m);
    else milestonesByBandAndTrack.set(key, [m]);
  }

  return {
    bank,
    domainById,
    strandById,
    milestoneById,
    itemById,
    stimulusById,
    moduleById,
    observationItemByMilestoneId,
    milestonesByBandAndTrack,
    trackByDomainId,
  };
}

let cached: BankIndex | null = null;

/** Built once per process. Cheap to call from a request path. */
export function getBankIndex(bank: ItemBank = BANK): BankIndex {
  if (bank === BANK) {
    if (!cached) cached = buildIndex(bank);
    return cached;
  }
  return buildIndex(bank);
}

export const BANK_VERSION = BANK.bankVersion;
export const BANK_CHECKSUM = BANK.bankChecksum;

/**
 * Age band from age in months. A child is always assessed at their chronological band.
 * ≥ 72 months (6 years) is Montree Canopy (G1) — the Grade 1 tier.
 */
export function ageBandFromMonths(ageMonths: number): AgeBand {
  if (ageMonths < 48) return 'A3';
  if (ageMonths < 60) return 'A4';
  if (ageMonths < 72) return 'A5';
  return 'G1';
}

/** Autumn→A, Winter→B, Spring→A (ARCHITECTURE.md §4.3). Overridable by the teacher. */
export function defaultFormForWindow(windowCode: string): 'A' | 'B' {
  return windowCode === 'winter' ? 'B' : 'A';
}

export function trackForDomain(domainId: string, index: BankIndex = getBankIndex()): Track {
  return index.trackByDomainId.get(domainId) ?? 'core';
}

/**
 * Structural sanity check — the runtime twin of the CLI validator's cheapest rules.
 * The routes call this once at module load so a truncated or half-merged bank fails
 * loudly at boot instead of silently producing wrong bands in a child's report.
 */
export function assertBankUsable(bank: ItemBank = BANK): void {
  const problems: string[] = [];
  if (!bank.bankVersion) problems.push('bankVersion missing');
  if (!bank.bankChecksum?.startsWith('sha256:')) problems.push('bankChecksum missing or malformed');
  if (!bank.milestones?.length) problems.push('no milestones');
  if (!bank.items?.length) problems.push('no items');
  if (!bank.scoring?.milestoneThresholds) problems.push('scoring config missing');
  if (problems.length) {
    throw new Error(`[montree-milestones] item-bank.json is unusable: ${problems.join('; ')}`);
  }
}
