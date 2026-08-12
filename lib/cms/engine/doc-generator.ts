// lib/cms/engine/doc-generator.ts
// ============================================================================
// STUB — signatures are real, bodies are not. Phase 3.
// ============================================================================
// The payoff of the whole hourglass: every document a room runs on, generated
// from the record instead of maintained by hand. Class lists, pickup sheets,
// name labels, dietary sheets, allergy posters, medical summaries.
//
// Each generator returns a GeneratedDocument — structured rows plus metadata —
// and NEVER a PDF blob. Rendering to PDF/print HTML is a separate concern (an
// API route), which keeps this module pure, testable and locale-agnostic.

import type { ClassGroupId, DailyRoster, IsoDate } from './types';

export type DocumentKind =
  | 'class_list'
  | 'pickup_sheet'
  | 'name_labels'
  | 'dietary_sheet'
  | 'allergy_poster'
  | 'medical_summary';

export type PageSize = 'A4' | 'Letter';

export interface DocumentOptions {
  /** Locale the document is rendered in. Falls back to the school default. */
  locale: string;
  pageSize: PageSize;
  /** Include child photos where the document supports them (labels, posters). */
  includePhotos: boolean;
  /** Sensitive documents are watermarked with who printed them, and when. */
  printedByName: string | null;
}

export interface DocumentColumn {
  key: string;
  /** Translation key for the column heading. */
  headingKey: string;
  width?: number;
}

export interface GeneratedDocument {
  kind: DocumentKind;
  classGroupId: ClassGroupId;
  date: IsoDate;
  /** Translation key for the document title. */
  titleKey: string;
  columns: DocumentColumn[];
  rows: Record<string, string>[];
  /** Rendering hints: one page per row (posters), or a flowing table (lists). */
  layout: 'table' | 'grid' | 'poster';
  options: DocumentOptions;
  generatedAt: string;
}

/** Every child in the room: preferred name, legal name, age, room, guardian. */
export function generateClassList(_roster: DailyRoster, _options: DocumentOptions): GeneratedDocument {
  throw new Error('doc-generator.generateClassList: not implemented (phase 3)');
}

/** Who may collect whom today, with authorisation status and phone order. */
export function generatePickupSheet(_roster: DailyRoster, _options: DocumentOptions): GeneratedDocument {
  throw new Error('doc-generator.generatePickupSheet: not implemented (phase 3)');
}

/** Cubby / tray / coat-hook labels, laid out for a sheet of label stock. */
export function generateNameLabels(_roster: DailyRoster, _options: DocumentOptions): GeneratedDocument {
  throw new Error('doc-generator.generateNameLabels: not implemented (phase 3)');
}

/** Kitchen-facing: every dietary requirement in the room, grouped by meal. */
export function generateDietarySheet(_roster: DailyRoster, _options: DocumentOptions): GeneratedDocument {
  throw new Error('doc-generator.generateDietarySheet: not implemented (phase 3)');
}

/**
 * Wall poster — one page per child with a severe/moderate allergy: photo,
 * allergen, reaction, response plan. Children whose allergy has
 * `requiresPoster: false` are excluded by design, not by accident.
 */
export function generateAllergyPoster(_roster: DailyRoster, _options: DocumentOptions): GeneratedDocument {
  throw new Error('doc-generator.generateAllergyPoster: not implemented (phase 3)');
}

/** Conditions, on-site medication and review dates, for the office file. */
export function generateMedicalSummary(_roster: DailyRoster, _options: DocumentOptions): GeneratedDocument {
  throw new Error('doc-generator.generateMedicalSummary: not implemented (phase 3)');
}

/** Dispatch by kind — what an API route or a "Generate" button calls. */
export function generate(
  kind: DocumentKind,
  roster: DailyRoster,
  options: DocumentOptions
): GeneratedDocument {
  switch (kind) {
    case 'class_list':
      return generateClassList(roster, options);
    case 'pickup_sheet':
      return generatePickupSheet(roster, options);
    case 'name_labels':
      return generateNameLabels(roster, options);
    case 'dietary_sheet':
      return generateDietarySheet(roster, options);
    case 'allergy_poster':
      return generateAllergyPoster(roster, options);
    case 'medical_summary':
      return generateMedicalSummary(roster, options);
  }
}
