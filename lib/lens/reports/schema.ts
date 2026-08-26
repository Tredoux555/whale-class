// lib/lens/reports/schema.ts
// The report's shape, the 12-section template, and the validator that stands
// between a model's JSON and the database.
//
// 🚨 WHY THIS FILE IS A VALIDATOR AND NOT A TYPE CAST.
// The draft endpoint asks Claude for structured output via a tool schema, which
// is reliable and is not a guarantee. Everything that arrives is treated as
// `unknown` and rebuilt field by field: unknown section keys are dropped, a
// rating that is not one of the four levels is dropped, evidence ids that do
// not correspond to a moment of THIS report are dropped. The result is that a
// malformed or adversarial completion produces a thinner report, never a
// corrupt row and never a claim attached to somebody else's moment.
//
// Pure — no imports beyond ./types siblings, no I/O — so the tests exercise the
// real thing rather than a copy.

import {
  isRatingDomain,
  isRatingLevel,
  RATING_DOMAINS,
  type EngagementType,
  type RatingDomain,
  type RatingLevel,
} from '../types';

// ---------------------------------------------------------------- template --

/**
 * Who writes a section.
 *   'model'  — the Lens Guru drafts prose for it, and it lives in `sections`.
 *   'list'   — a top-level array on the report (commendations, recommendations…).
 *   'system' — rendered from data at PDF time; there is nothing to draft.
 */
export type SectionSource = 'model' | 'list' | 'system';

export interface SectionTemplate {
  key: string;
  title: string;
  source: SectionSource;
  /** What the section is for, handed to the model verbatim. */
  brief: string;
  /** Only present for this engagement type, if set. */
  onlyFor?: EngagementType[];
}

/**
 * The AMI-default template, in report order. Numbers match §3 of
 * docs/MONTREE_LENS_CONCEPT.md exactly; do not renumber without changing both.
 */
export const REPORT_TEMPLATE: SectionTemplate[] = [
  {
    key: 'cover',
    title: 'Cover',
    source: 'system',
    brief:
      'School, classroom, level, date, observer, engagement type, confidentiality line. Rendered from the record — nothing to draft.',
  },
  {
    key: 'context',
    title: 'Context',
    source: 'model',
    brief:
      'Children present and enrolled, age range, staff and their training, the time observed, and the work-cycle window. Facts only, no judgement, no adjectives of quality. One short paragraph or a tight list.',
  },
  {
    key: 'summary',
    title: 'Summary',
    source: 'model',
    brief:
      'ONE paragraph, strengths-led. What a reader who reads nothing else must understand. Names the single most important strength first and the single most important area for growth second.',
  },
  {
    key: 'children',
    title: 'The Children — normalisation & work cycle',
    source: 'model',
    brief:
      'Evidence then analysis, in that order and in separate sentences. Sustained concentration, self-chosen purposeful work, repetition, independence, care of materials, respect for others’ work, social cooperation, self-regulation. Distinguish false fatigue from real disorder where the evidence allows it. Children anonymised as Child A (4;3).',
  },
  {
    key: 'environment',
    title: 'The Prepared Environment',
    source: 'model',
    brief:
      'By area — Practical Life, Sensorial, Language, Mathematics, Culture — plus order, beauty, completeness and condition of materials, accessibility at child height, mixed-age grouping, ratios, the uninterrupted three-hour work cycle, freedom within limits, outdoor and real work, inclusion. Cite the photo moments that show what you describe.',
  },
  {
    key: 'adults',
    title: 'The Prepared Adult(s)',
    source: 'model',
    brief:
      'One subsection per staff member, each headed with that person’s name and role. Quality of presentations (isolation of difficulty, one point per lesson, economy of language and movement), the three-period lesson, tone, grace and courtesy, non-interference so control of error can work, reading of sensitive periods, record-keeping and planning. This is the part that becomes the individual teacher report, so each subsection must stand alone.',
  },
  {
    key: 'commendations',
    title: 'Commendations',
    source: 'list',
    brief: 'Areas of strength. Always first among the judgement sections.',
  },
  {
    key: 'recommendations',
    title: 'Recommendations',
    source: 'list',
    brief: 'Prioritised, each tied to evidence. Phrased as “Consider…” / “It is recommended that…”.',
  },
  {
    key: 'required_actions',
    title: 'Required actions',
    source: 'list',
    brief:
      'Compliance-critical items only, kept strictly separate from recommendations. Consultation visits only.',
    onlyFor: ['consultation'],
  },
  {
    key: 'ratings',
    title: 'Ratings',
    source: 'list',
    brief: 'The light 4-level scale across the three domains, presented as a small table.',
  },
  {
    key: 'next_steps',
    title: 'Agreed next steps & follow-up',
    source: 'list',
    brief: 'One agreed testable next step per line, plus the follow-up date if one was set.',
  },
  {
    key: 'appendix',
    title: 'Appendix',
    source: 'system',
    brief: 'Photo log with captions and the timestamped observation timeline. Rendered from the record.',
  },
];

/** The section keys the model is asked to write prose for, in order. */
export const NARRATIVE_SECTION_KEYS = REPORT_TEMPLATE.filter((s) => s.source === 'model').map(
  (s) => s.key,
);

/**
 * The template as it applies to one engagement type. Required actions vanish
 * entirely for a mentoring visit or an internal review — a developmental
 * conversation has no compliance instrument in it.
 */
export function templateFor(engagement: EngagementType): SectionTemplate[] {
  return REPORT_TEMPLATE.filter((s) => !s.onlyFor || s.onlyFor.includes(engagement));
}

export function sectionTitle(key: string): string {
  const hit = REPORT_TEMPLATE.find((s) => s.key === key);
  if (hit) return hit.title;
  // Per-staff subsections are minted at draft time as `adults:<uuid>`.
  if (key.startsWith('adults:')) return 'The Prepared Adult';
  return key;
}

// ------------------------------------------------------------------ shapes --

export interface ReportSection {
  key: string;
  title: string;
  body_en: string;
  body_zh?: string;
  /** lens_moments ids this section's claims rest on. */
  evidence: string[];
}

export interface ReportListItem {
  text_en: string;
  text_zh?: string;
  /** lens_moments ids. A judgement with no evidence is flagged, never hidden. */
  evidence: string[];
  /** 1 = highest. Only meaningful on recommendations and required actions. */
  priority?: number;
  /** Only meaningful on next_steps and required actions. */
  owner?: string;
  due?: string;
}

export type ReportRatings = Partial<Record<RatingDomain, RatingLevel>>;

export interface LensReportContent {
  sections: ReportSection[];
  ratings: ReportRatings;
  commendations: ReportListItem[];
  recommendations: ReportListItem[];
  required_actions: ReportListItem[];
  next_steps: ReportListItem[];
}

export function emptyReportContent(): LensReportContent {
  return {
    sections: [],
    ratings: {},
    commendations: [],
    recommendations: [],
    required_actions: [],
    next_steps: [],
  };
}

// --------------------------------------------------------------- validation --

const MAX_SECTIONS = 40;
const MAX_LIST_ITEMS = 30;
const MAX_BODY_CHARS = 12_000;
const MAX_ITEM_CHARS = 2_000;

function str(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  // Control characters other than newline and tab have no business in a report
  // body and are the cheapest way to smuggle something past a reader's eye.
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, max).trim();
}

function optionalStr(value: unknown, max: number): string | undefined {
  const s = str(value, max);
  return s.length > 0 ? s : undefined;
}

/**
 * Evidence ids, filtered to moments that actually exist on this report.
 *
 * 🚨 THIS IS THE ANTI-FABRICATION GATE, and it is why `allowedMomentIds` is a
 * required argument rather than an option. The Guru is told that every
 * judgement must cite a moment; a model that invents a plausible uuid to
 * satisfy that instruction would otherwise produce a report whose evidence
 * chips lead nowhere — which reads as citation and is not. An id we cannot
 * resolve to a real moment of this visit is dropped, and the section is then
 * visibly uncited, which is exactly the signal the reviewer needs.
 */
export function filterEvidence(value: unknown, allowedMomentIds: Set<string>): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const raw of value) {
    if (typeof raw !== 'string') continue;
    const id = raw.trim();
    if (!allowedMomentIds.has(id)) continue;
    if (!out.includes(id)) out.push(id);
  }
  return out.slice(0, 50);
}

export interface ValidationResult {
  content: LensReportContent;
  /** Human-readable notes about what was dropped and why. Shown in the editor. */
  warnings: string[];
}

/**
 * Rebuild a model completion into a report we are willing to store.
 *
 * `allowedSectionKeys` is the engagement-aware template plus any per-staff
 * subsection keys the draft request minted; anything else is dropped.
 */
export function validateReportContent(
  raw: unknown,
  options: { allowedSectionKeys: string[]; allowedMomentIds: Iterable<string> },
): ValidationResult {
  const warnings: string[] = [];
  const allowedKeys = new Set(options.allowedSectionKeys);
  const allowedMoments = new Set(options.allowedMomentIds);
  const content = emptyReportContent();

  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  // ---- sections
  const rawSections = Array.isArray(obj.sections) ? obj.sections : [];
  if (!Array.isArray(obj.sections)) warnings.push('No sections were returned.');
  const seen = new Set<string>();
  for (const item of rawSections.slice(0, MAX_SECTIONS)) {
    if (!item || typeof item !== 'object') continue;
    const s = item as Record<string, unknown>;
    const key = str(s.key, 120);
    if (!key) continue;
    if (!allowedKeys.has(key)) {
      warnings.push(`Dropped an unknown section: "${key}".`);
      continue;
    }
    if (seen.has(key)) {
      warnings.push(`Dropped a duplicate section: "${key}".`);
      continue;
    }
    const body_en = str(s.body_en, MAX_BODY_CHARS);
    if (!body_en) {
      warnings.push(`Section "${key}" came back empty.`);
      continue;
    }
    seen.add(key);
    content.sections.push({
      key,
      title: optionalStr(s.title, 200) ?? sectionTitle(key),
      body_en,
      body_zh: optionalStr(s.body_zh, MAX_BODY_CHARS),
      evidence: filterEvidence(s.evidence, allowedMoments),
    });
  }
  // Keep the template's order regardless of what order the model emitted.
  const order = new Map(options.allowedSectionKeys.map((k, i) => [k, i]));
  content.sections.sort((a, b) => (order.get(a.key) ?? 999) - (order.get(b.key) ?? 999));

  // ---- ratings
  const rawRatings = obj.ratings && typeof obj.ratings === 'object' ? obj.ratings : {};
  for (const [domain, level] of Object.entries(rawRatings as Record<string, unknown>)) {
    if (!isRatingDomain(domain)) {
      warnings.push(`Dropped a rating for an unknown domain: "${domain}".`);
      continue;
    }
    if (!isRatingLevel(level)) {
      warnings.push(`Dropped an unrecognised rating level for ${domain}.`);
      continue;
    }
    content.ratings[domain] = level;
  }

  // ---- lists
  const listKeys = ['commendations', 'recommendations', 'required_actions', 'next_steps'] as const;
  for (const listKey of listKeys) {
    const rawList = Array.isArray(obj[listKey]) ? (obj[listKey] as unknown[]) : [];
    for (const item of rawList.slice(0, MAX_LIST_ITEMS)) {
      const built = buildListItem(item, allowedMoments);
      if (built) content[listKey].push(built);
    }
  }

  // ---- the guardrail the whole product rests on
  const uncited = content.recommendations.filter((r) => r.evidence.length === 0).length;
  if (uncited > 0) {
    warnings.push(
      `${uncited} recommendation${uncited === 1 ? '' : 's'} cite no moment. ` +
        'Attach evidence or delete the claim before finalising.',
    );
  }

  return { content, warnings };
}

function buildListItem(item: unknown, allowedMoments: Set<string>): ReportListItem | null {
  // A model that returns a bare string instead of an object is being helpful in
  // the wrong shape, not wrong — take the text and note the missing evidence.
  if (typeof item === 'string') {
    const text_en = str(item, MAX_ITEM_CHARS);
    return text_en ? { text_en, evidence: [] } : null;
  }
  if (!item || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;
  const text_en = str(o.text_en ?? o.text, MAX_ITEM_CHARS);
  if (!text_en) return null;
  const priority = Number(o.priority);
  const built: ReportListItem = {
    text_en,
    text_zh: optionalStr(o.text_zh, MAX_ITEM_CHARS),
    evidence: filterEvidence(o.evidence, allowedMoments),
  };
  if (Number.isInteger(priority) && priority >= 1 && priority <= 99) built.priority = priority;
  const owner = optionalStr(o.owner, 200);
  if (owner) built.owner = owner;
  const due = optionalStr(o.due ?? o.due_date, 40);
  if (due) built.due = due;
  return built;
}

/**
 * Read a stored JSONB blob back into the typed shape. Storage is trusted less
 * than you would expect: a row written by an older version of this file, or by
 * a hand-run SQL fix, must not crash the editor.
 */
export function readStoredContent(row: {
  sections?: unknown;
  ratings?: unknown;
  commendations?: unknown;
  recommendations?: unknown;
  required_actions?: unknown;
  next_steps?: unknown;
}): LensReportContent {
  const content = emptyReportContent();
  if (Array.isArray(row.sections)) {
    for (const raw of row.sections) {
      if (!raw || typeof raw !== 'object') continue;
      const s = raw as Record<string, unknown>;
      const key = str(s.key, 120);
      const body_en = str(s.body_en, MAX_BODY_CHARS);
      if (!key) continue;
      content.sections.push({
        key,
        title: optionalStr(s.title, 200) ?? sectionTitle(key),
        body_en,
        body_zh: optionalStr(s.body_zh, MAX_BODY_CHARS),
        evidence: Array.isArray(s.evidence)
          ? (s.evidence.filter((e) => typeof e === 'string') as string[])
          : [],
      });
    }
  }
  if (row.ratings && typeof row.ratings === 'object') {
    for (const domain of RATING_DOMAINS) {
      const level = (row.ratings as Record<string, unknown>)[domain];
      if (isRatingLevel(level)) content.ratings[domain] = level;
    }
  }
  for (const listKey of ['commendations', 'recommendations', 'required_actions', 'next_steps'] as const) {
    const rawList = row[listKey];
    if (!Array.isArray(rawList)) continue;
    for (const item of rawList) {
      const built = buildListItem(item, new Set<string>());
      if (!built) continue;
      // Stored evidence has already been through filterEvidence once; keep it.
      const o = item as Record<string, unknown>;
      built.evidence = Array.isArray(o?.evidence)
        ? (o.evidence.filter((e) => typeof e === 'string') as string[])
        : [];
      content[listKey].push(built);
    }
  }
  return content;
}
