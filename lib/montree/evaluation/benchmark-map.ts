/**
 * Montree Milestones — framework crosswalk and defensible-claims language.
 *
 * Two jobs:
 *   1. Look up the ELOF / EYFS / China-MoE codes a milestone cites, and build the
 *      alignment tables D1 Appendix B and C print.
 *   2. Hold the say / never-say rules (ARCHITECTURE.md §2.6) as machine-checkable data,
 *      plus the method statement that MUST appear in the footer of every funder report.
 *
 * Licensing posture — all milestone wording in this bank is ORIGINAL. The crosswalk stores
 * framework CODES, which are citations, not reproduced text. Nothing in this module renders
 * a sentence lifted from EYFS, ELOF or the MoE Guide.
 *
 * China note, stated once and meant: the MoE 3–6岁儿童学习与发展指南 is explicitly not an
 * evaluative standard (不是评价标准). The crosswalk is a reading aid for Chinese educators.
 * It is never an endorsement, and no surface may imply that it is.
 */
import { getBankIndex } from './bank';
import type {
  AgeBand, BankIndex, CrosswalkEyfs, MapResult, MethodStatement, Milestone, Track,
} from './types';

/* ───────────────────────────────────────────────────────────────── attribution */

export interface FrameworkAttribution {
  key: 'elof' | 'eyfs' | 'chinaMoe' | 'idela' | 'iels';
  name: string;
  publisher: string;
  licence: string;
  /** How this framework may be described in copy — and how it may not. */
  useAs: string;
  url?: string;
}

export const FRAMEWORK_ATTRIBUTIONS: readonly FrameworkAttribution[] = [
  {
    key: 'elof',
    name: 'Head Start Early Learning Outcomes Framework: Ages Birth to Five',
    publisher: 'US Department of Health & Human Services, Office of Head Start',
    licence: 'US Government work — public domain',
    useAs: 'Structural anchor for our five domains. Cited by goal code.',
    url: 'https://headstart.gov/school-readiness/effective-practice-guides',
  },
  {
    key: 'eyfs',
    name: 'Early Years Foundation Stage / Development Matters',
    publisher: 'UK Department for Education',
    licence: 'Open Government Licence v3.0 — © Crown copyright',
    useAs: 'Register and reading level for milestone wording. Cited by area, band and ELG code.',
    url: 'https://www.gov.uk/government/publications/development-matters--2',
  },
  {
    key: 'chinaMoe',
    name: '3–6岁儿童学习与发展指南 (Guidelines for Learning and Development of Children Aged 3–6)',
    publisher: '中华人民共和国教育部 — PRC Ministry of Education (2012)',
    licence: 'Referenced by objective code for local legibility.',
    useAs:
      'Appendix crosswalk for the China market only. The Guide states it is not an evaluative ' +
      'standard (不是评价标准); presenting this crosswalk as MoE endorsement or as a ranking ' +
      'instrument is prohibited.',
  },
  {
    key: 'idela',
    name: 'International Development and Early Learning Assessment (IDELA)',
    publisher: 'Save the Children',
    licence: 'Cited for domain validity only. No protocol, item or scale is reused.',
    useAs: 'Evidence that the donor community measures these domains. Never an alignment claim.',
  },
  {
    key: 'iels',
    name: 'International Early Learning and Child Well-being Study (IELS)',
    publisher: 'OECD',
    licence: 'Cited for domain validity only. No instrument or scale is reused.',
    useAs: 'Evidence that these domains are the ones international studies track. Never an alignment claim.',
  },
];

/* ─────────────────────────────────────────────────────── crosswalk lookups */

export interface CrosswalkRow {
  milestoneId: string;
  domainId: string;
  strandId: string;
  track: Track;
  ageBand: AgeBand;
  expectation: string;
  constructTag: string | null;
  statementEn: string;
  elof: string[];
  eyfs: CrosswalkEyfs;
  chinaMoe: string[];
  /** TRUE where the evidence only makes sense under English-medium instruction. */
  englishMedium: boolean;
  /** FALSE means "the MoE Guide has nothing to say here", NOT "we forgot a code". */
  chinaMoeApplicable: boolean;
  chinaMoeOmittedReason: string | null;
  montessoriAreaKeys: string[];
  montessoriWorkKeys: string[];
  montreeEnglishPhase: string | null;
  montreeEnglishLessonRange: [number, number] | null;
}

/* ─────────────────────────────────────────── China-MoE scope and applicability */

/**
 * The China-MoE crosswalk is deliberately partial, and the gap is a finding, not a hole.
 *
 * 36 EFL milestones and the 12 English-medium core-literacy milestones (LCL-C phonological
 * awareness, LCL-D print & alphabet) carry NO MoE code, because 语言.阅读与书写准备 describes
 * readiness for CHINESE literacy and English rhyme, English letter-sounds and Roman-alphabet
 * print do not speak to it. Reporting a coverage figure that counts those 48 as "missing" would
 * misrepresent both frameworks. Every consumer of the crosswalk must exclude them from the
 * denominator AND say why — which is what `chinaMoeApplicable` and this note are for.
 */
export const CHINA_MOE_SCOPE_NOTE =
  'The China MoE crosswalk covers the milestones the 3–6岁儿童学习与发展指南 speaks to. It ' +
  'deliberately excludes the English (EFL) track and the two English-medium core-literacy ' +
  'strands (phonological awareness, print & alphabet), whose evidence is English rhyme, English ' +
  'letter-sounds and Roman-alphabet print — the Guide\'s 语言.阅读与书写准备 objectives describe ' +
  'readiness for Chinese literacy and do not describe this evidence. Those milestones are ' +
  'excluded from the denominator, not counted as gaps. The Guide is a development guide and ' +
  'states that it is not an evaluative standard (不是评价标准); this crosswalk is a reading aid ' +
  'for Chinese educators and is never an endorsement.';

export const CHINA_MOE_OMITTED_EFL =
  'English (EFL) track — the MoE Guide describes Chinese-language development, not English as a foreign language.';
export const CHINA_MOE_OMITTED_ENGLISH_MEDIUM =
  'English-medium literacy strand — the evidence is English rhyme, letter-sounds and Roman-alphabet print, ' +
  'which 语言.阅读与书写准备 (readiness for Chinese literacy) does not describe.';

export function isEnglishMediumStrand(strandId: string, index: BankIndex = getBankIndex()): boolean {
  return index.strandById.get(strandId)?.englishMedium === true;
}

/** Every strand whose evidence assumes English-medium instruction. */
export function englishMediumStrandIds(index: BankIndex = getBankIndex()): string[] {
  return index.bank.strands.filter((s) => s.englishMedium === true).map((s) => s.id);
}

export interface ChinaMoeApplicability {
  applicable: boolean;
  reason: string | null;
}

/** Whether the MoE Guide has anything to say about this milestone at all. */
export function chinaMoeApplicability(
  milestone: Milestone,
  index: BankIndex = getBankIndex(),
): ChinaMoeApplicability {
  if ((index.trackByDomainId.get(milestone.domainId) ?? 'core') === 'efl') {
    return { applicable: false, reason: CHINA_MOE_OMITTED_EFL };
  }
  if (isEnglishMediumStrand(milestone.strandId, index)) {
    return { applicable: false, reason: CHINA_MOE_OMITTED_ENGLISH_MEDIUM };
  }
  return { applicable: true, reason: null };
}

function toRow(m: Milestone, index: BankIndex): CrosswalkRow {
  const applicability = chinaMoeApplicability(m, index);
  return {
    milestoneId: m.id,
    domainId: m.domainId,
    strandId: m.strandId,
    track: index.trackByDomainId.get(m.domainId) ?? 'core',
    ageBand: m.ageBand,
    expectation: m.expectation,
    constructTag: m.constructTag ?? null,
    statementEn: m.statement.en,
    elof: m.crosswalk.elof ?? [],
    eyfs: m.crosswalk.eyfs,
    chinaMoe: m.crosswalk.chinaMoe ?? [],
    englishMedium: isEnglishMediumStrand(m.strandId, index),
    chinaMoeApplicable: applicability.applicable,
    chinaMoeOmittedReason: applicability.reason,
    montessoriAreaKeys: m.crosswalk.montessori?.areaKeys ?? [],
    montessoriWorkKeys: m.crosswalk.montessori?.workKeys ?? [],
    montreeEnglishPhase: m.crosswalk.montreeEnglish?.phase ?? null,
    montreeEnglishLessonRange: m.crosswalk.montreeEnglish?.lessonRange ?? null,
  };
}

export function getCrosswalk(milestoneId: string, index: BankIndex = getBankIndex()): CrosswalkRow | null {
  const m = index.milestoneById.get(milestoneId);
  return m ? toRow(m, index) : null;
}

export interface CrosswalkFilter {
  track?: Track;
  ageBand?: AgeBand;
  domainId?: string;
  strandId?: string;
}

/** The full alignment table — the source of D1 Appendix B (ELOF/EYFS) and C (China MoE). */
export function buildCrosswalkTable(filter: CrosswalkFilter = {}, index: BankIndex = getBankIndex()): CrosswalkRow[] {
  return index.bank.milestones
    .filter((m) => {
      if (filter.domainId && m.domainId !== filter.domainId) return false;
      if (filter.strandId && m.strandId !== filter.strandId) return false;
      if (filter.ageBand && m.ageBand !== filter.ageBand) return false;
      if (filter.track && (index.trackByDomainId.get(m.domainId) ?? 'core') !== filter.track) return false;
      return true;
    })
    .map((m) => toRow(m, index))
    .sort((a, b) => a.milestoneId.localeCompare(b.milestoneId));
}

export interface ChinaMoeCrosswalkTable {
  rows: CrosswalkRow[];
  /** In scope but carrying no code — a genuine gap, and reported as one. */
  missing: CrosswalkRow[];
  /** Out of scope by design, with the reason printed beside each. */
  excluded: Array<{ milestoneId: string; strandId: string; reason: string }>;
  covered: number;
  applicable: number;
  coveragePercent: number | null;
  scopeNote: string;
}

/**
 * The China MoE appendix table (D1 Appendix C). Milestones the Guide does not speak to are
 * removed from BOTH the numerator and the denominator and listed separately with their reason —
 * never silently dropped, and never counted as missing codes.
 */
export function buildChinaMoeCrosswalkTable(
  filter: CrosswalkFilter = {},
  index: BankIndex = getBankIndex(),
): ChinaMoeCrosswalkTable {
  const all = buildCrosswalkTable(filter, index);
  const inScope = all.filter((r) => r.chinaMoeApplicable);
  const rows = inScope.filter((r) => r.chinaMoe.length > 0);
  const missing = inScope.filter((r) => r.chinaMoe.length === 0);
  const excluded = all
    .filter((r) => !r.chinaMoeApplicable)
    .map((r) => ({ milestoneId: r.milestoneId, strandId: r.strandId, reason: r.chinaMoeOmittedReason ?? '' }));

  return {
    rows,
    missing,
    excluded,
    covered: rows.length,
    applicable: inScope.length,
    coveragePercent: inScope.length ? Math.round((1000 * rows.length) / inScope.length) / 10 : null,
    scopeNote: CHINA_MOE_SCOPE_NOTE,
  };
}

/** Reverse lookups — "which of our milestones cite ELOF goal P-LIT 2?" */
export function milestonesByElofGoal(goal: string, index: BankIndex = getBankIndex()): string[] {
  const needle = goal.trim().toUpperCase();
  return index.bank.milestones
    .filter((m) => (m.crosswalk.elof ?? []).some((g) => g.trim().toUpperCase() === needle))
    .map((m) => m.id);
}

export function milestonesByEyfsArea(area: string, index: BankIndex = getBankIndex()): string[] {
  const needle = area.trim().toLowerCase();
  return index.bank.milestones
    .filter((m) => (m.crosswalk.eyfs?.area ?? '').trim().toLowerCase() === needle)
    .map((m) => m.id);
}

export function milestonesByChinaMoeObjective(code: string, index: BankIndex = getBankIndex()): string[] {
  const needle = code.trim();
  return index.bank.milestones
    .filter((m) => (m.crosswalk.chinaMoe ?? []).some((c) => c.trim() === needle))
    .map((m) => m.id);
}

/** Which Montessori works a milestone points at — used to join a report to the shelf. */
export function montessoriWorkKeysFor(milestoneIds: string[], index: BankIndex = getBankIndex()): string[] {
  const keys = new Set<string>();
  for (const id of milestoneIds) {
    for (const k of index.milestoneById.get(id)?.crosswalk.montessori?.workKeys ?? []) keys.add(k);
  }
  return [...keys].sort();
}

export interface CrosswalkCoverage {
  total: number;
  withElof: number;
  withEyfs: number;
  withChinaMoe: number;
  /** Milestones the MoE Guide speaks to at all — the honest China denominator. */
  chinaMoeApplicable: number;
  /** Out of scope by design (EFL track + English-medium literacy strands). */
  chinaMoeOutOfScope: number;
  /** In scope but carrying no code. Should be 0; anything else is a real gap. */
  chinaMoeMissing: number;
  withMontessori: number;
  withMontreeEnglish: number;
}

/**
 * Coverage report — feeds D1 §4. The China figure is quoted against `chinaMoeApplicable`,
 * never against `total`: 120 of 120 in-scope milestones carry a code, which is complete
 * coverage. Quoting "120 of 168" would invent a 48-milestone gap that does not exist.
 */
export function crosswalkCoverage(index: BankIndex = getBankIndex()): CrosswalkCoverage {
  const ms = index.bank.milestones;
  const applicable = ms.filter((m) => chinaMoeApplicability(m, index).applicable);
  const withChinaMoe = ms.filter((m) => (m.crosswalk.chinaMoe ?? []).length > 0).length;
  return {
    total: ms.length,
    withElof: ms.filter((m) => (m.crosswalk.elof ?? []).length > 0).length,
    withEyfs: ms.filter((m) => Boolean(m.crosswalk.eyfs?.area)).length,
    withChinaMoe,
    chinaMoeApplicable: applicable.length,
    chinaMoeOutOfScope: ms.length - applicable.length,
    chinaMoeMissing: applicable.filter((m) => (m.crosswalk.chinaMoe ?? []).length === 0).length,
    withMontessori: ms.filter((m) => (m.crosswalk.montessori?.workKeys ?? []).length > 0).length,
    withMontreeEnglish: ms.filter((m) => Boolean(m.crosswalk.montreeEnglish)).length,
  };
}

/* ────────────────────────────────────────────── defensible-claims language */

/** Phrasings that are safe to put in front of a funder. */
export const SAY: readonly string[] = [
  'milestones typically expected at this age in mainstream early-years settings, as described in publicly available frameworks (UK EYFS Development Matters; US Head Start ELOF)',
  'consistent with',
  'in line with',
  'contributed to',
  'children in this cohort moved up a band on X% of tracked milestones over the year',
  'teacher-observed and directly-checked evidence, collected three times a year',
  'criterion-referenced classroom check-in',
];

/** Phrasings that must never appear. Each carries the reason, so a reviewer can act on it. */
export const NEVER_SAY: ReadonlyArray<{ pattern: RegExp; phrase: string; why: string }> = [
  { pattern: /\bprove[sd]?\b/i, phrase: 'proves', why: 'Causal claim. Use contribution language — "contributed to", "consistent with".' },
  { pattern: /\bcause[sd]?\b|\bcausal\b/i, phrase: 'caused', why: 'Causal claim from a non-experimental design.' },
  { pattern: /because of our (program|programme|curriculum|method)/i, phrase: 'because of our program', why: 'Attribution, not contribution. No control group exists.' },
  { pattern: /\bpercentile\b/i, phrase: 'percentile', why: 'We hold no norm sample. Percentiles cannot be computed and would be invented.' },
  { pattern: /\brank(ed|ing)?\b/i, phrase: 'rank', why: 'No peer ranking, ever. Criterion-referenced only.' },
  { pattern: /\b(IQ|intelligence quotient)\b/i, phrase: 'IQ', why: 'Not an ability instrument. No IQ-like number may be implied.' },
  { pattern: /\b\d+\s*months?\s+(ahead|behind)\b/i, phrase: 'X months ahead/behind', why: 'Developmental-age equivalents require a calibration sample we do not have.' },
  { pattern: /\bahead of (their|his|her) age\b/i, phrase: 'ahead of their age', why: 'Age-equivalent claim. Say "secured milestones from the next age band" instead.' },
  { pattern: /montessori (outperforms|beats|is better than)/i, phrase: 'Montessori outperforms traditional classrooms', why: 'Blanket claim. The Campbell review (Randolph 2023, ~0.25 SD academic / 0.33 SD non-academic) is fidelity-conditional and domain-specific.' },
  { pattern: /aligned with (the )?(OECD )?(IELS|IDELA)/i, phrase: 'aligned with OECD IELS / IDELA', why: 'We cite these for domain validity only. We reuse no protocol and claim no alignment.' },
  { pattern: /\bnormed\b|\bnorm-referenced\b/i, phrase: 'normed', why: 'This is criterion-referenced. It is not a psychometrically normed instrument.' },
  { pattern: /\bstandardi[sz]ed test\b/i, phrase: 'standardized test', why: 'It is a check-in, not a test. See the forbidden-terms list.' },
  { pattern: /\babove average\b|\bbelow average\b/i, phrase: 'above/below average', why: 'Peer comparison. Not available and not wanted.' },
];

export interface ClaimIssue { phrase: string; why: string; excerpt: string }

/** Machine-checkable review of funder- or parent-facing copy. Pure. */
export function checkClaimLanguage(text: string): ClaimIssue[] {
  if (!text) return [];
  const issues: ClaimIssue[] = [];
  for (const rule of NEVER_SAY) {
    const m = rule.pattern.exec(text);
    if (m) {
      issues.push({
        phrase: rule.phrase,
        why: rule.why,
        excerpt: text.slice(Math.max(0, m.index - 32), m.index + m[0].length + 32).trim(),
      });
    }
  }
  return issues;
}

/* ──────────────────────────────────────────────────────── method statement */

export const METHOD_CAVEAT =
  'These are criterion-referenced classroom check-ins, not psychometrically normed instruments. ' +
  'The bands are conventional thresholds, not empirically calibrated ones — there is no calibration ' +
  'sample. Parallel forms are matched by construct specification, not by item statistics. Observation ' +
  'milestones rest on teacher judgement. Figures describe the children who were checked in; they do ' +
  'not establish that any change was caused by the programme.';

const trackLabel = (t: Track) => (t === 'efl' ? 'English (EFL track)' : 'core development');

/**
 * The footer every funder-facing output must carry: what was done, the n, the unassessed
 * count, the caveat, the attributions, and — where flat or negative results exist — those
 * results. Selective reporting is a build defect, so `unassessed` is never optional here.
 */
export function buildMethodStatement(
  args: { map: MapResult; windows?: number; deliveryModes?: string[]; extra?: string },
  index: BankIndex = getBankIndex(),
): MethodStatement {
  const modes = args.deliveryModes?.length ? args.deliveryModes.join(' and ') : 'tablet or paper';
  const statement =
    `Evidence was collected in one-to-one check-ins of about fifteen minutes, ${modes}-administered by the ` +
    `child's own teacher, together with teacher observation rated across the whole check-in window` +
    `${args.windows && args.windows > 1 ? `, over ${args.windows} check-in windows` : ''}. ` +
    `Milestones are banded Emerging / Developing / Secure against the milestone statements in bank ` +
    `${index.bank.bankVersion}. This figure covers ${trackLabel(args.map.track)}: n = ${args.map.denominator} ` +
    `milestones assessed, ${args.map.unassessed} not assessed and reported as such` +
    `${args.map.exceeded ? `, ${args.map.exceeded} milestone(s) secured from the next age band` : ''}.` +
    (args.map.suppressed && args.map.suppressionReason ? ` No percentage is shown: ${args.map.suppressionReason}` : '') +
    (args.extra ? ` ${args.extra}` : '');

  return {
    statement,
    caveat: METHOD_CAVEAT,
    attribution: index.bank.attribution,
    bankVersion: index.bank.bankVersion,
    bankChecksum: index.bank.bankChecksum,
    sayNever: { say: [...SAY], never: NEVER_SAY.map((r) => r.phrase) },
  };
}

/**
 * The one sentence the Growth Story renders around MAP%. Kept here, next to the claims
 * rules, so the wording and the rules can never drift apart. Suppression is honoured:
 * when there is no percentage to report, the sentence says so rather than going quiet.
 */
export function renderMapSentence(args: { name: string; ageYears: number; map: MapResult }): string {
  const { name, ageYears, map } = args;
  if (map.suppressed || map.mapPercent === null) {
    return (
      `At this check-in, ${name} was assessed on ${map.denominator} of the milestones typically expected ` +
      `of a ${ageYears} year-old in mainstream early-years settings, and securely met ${map.met} of them. ` +
      `A percentage is not shown here — ${map.suppressionReason ?? 'too few milestones were assessed for one to be meaningful.'}`
    );
  }
  const exceeded = map.exceeded
    ? `, and has additionally secured ${map.exceeded} milestone${map.exceeded === 1 ? '' : 's'} from the next age band`
    : '';
  return (
    `At this check-in, ${name} has securely met ${map.mapPercent}% of the ${map.denominator} milestones ` +
    `typically expected of a ${ageYears} year-old in mainstream early-years settings${exceeded}.`
  );
}

/** The growth headline — the primary evidence in the parent report (ARCHITECTURE.md §2.5). */
export function renderGrowthSentence(args: {
  name: string; fromWindowLabel: string; movedUp: number; steady: number; watching: number;
}): string {
  return (
    `Since the ${args.fromWindowLabel} check-in, ${args.name} has moved up a band on ${args.movedUp} ` +
    `milestone${args.movedUp === 1 ? '' : 's'}, holds steady on ${args.steady}, and we are watching ${args.watching}.`
  );
}

export const WINDOW_LABELS: Record<string, { en: string; zh: string }> = {
  autumn: { en: 'Autumn', zh: '秋季' },
  winter: { en: 'Winter', zh: '冬季' },
  spring: { en: 'Spring', zh: '春季' },
};
