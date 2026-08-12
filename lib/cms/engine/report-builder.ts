// lib/cms/engine/report-builder.ts
// ============================================================================
// STUB — signatures are real, bodies are not. Phase 6.
// ============================================================================
// Turns observations, attendance and photos into the artefacts a parent
// actually receives: the daily line, the weekly digest, the term report.
//
// The builder produces a STRUCTURED report, never a formatted string. Rendering
// to HTML/PDF, and translating it, happen downstream — that is what lets the
// same report go out in seven languages without seven builders.

import type { ChildAssessment } from './assessments';
import type { PhotoAsset } from './photo-filter';
import type { AttendanceState, ChildId, IsoDate } from './types';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'term';

export interface ReportSection {
  /** Stable key so translations and templates can target a section. */
  key: string;
  /** Translation key for the heading — NOT a rendered string. */
  headingKey: string;
  /** Machine-readable body. The renderer decides how to phrase it. */
  facts: Record<string, string | number | string[]>;
  /** Teacher's own words, in the teacher's language. Translated downstream. */
  teacherNote: string | null;
  photoIds: string[];
}

export interface ChildReport {
  childId: ChildId;
  period: ReportPeriod;
  from: IsoDate;
  to: IsoDate;
  sections: ReportSection[];
  /** Locale the teacher notes were written in. */
  sourceLocale: string;
  generatedAt: string;
}

export interface ReportInput {
  childId: ChildId;
  period: ReportPeriod;
  from: IsoDate;
  to: IsoDate;
  attendance: { date: IsoDate; state: AttendanceState }[];
  assessment: ChildAssessment | null;
  /** Already passed through photo-filter for THIS family. */
  releasedPhotos: PhotoAsset[];
  teacherNotes: { date: IsoDate; text: string; authorName: string }[];
}

/** Build one child's report for one period. Pure. */
export function buildChildReport(_input: ReportInput): ChildReport {
  throw new Error('report-builder.buildChildReport: not implemented (phase 6)');
}

/**
 * Build a whole room's reports in one pass, so shared work (attendance
 * aggregation, photo grouping) happens once rather than per child.
 */
export function buildClassReports(_inputs: ReportInput[]): ChildReport[] {
  throw new Error('report-builder.buildClassReports: not implemented (phase 6)');
}

/**
 * Compose a photo montage: choose and order the best N released photos for a
 * period. Returns photo ids in display order — the renderer does the layout.
 */
export function buildMontage(_photos: PhotoAsset[], _maxCount: number): string[] {
  throw new Error('report-builder.buildMontage: not implemented (phase 6)');
}
