// lib/montree/weekly-admin/monthly-doc-generator.ts
//
// Generates the Language Monthly Summary .docx in the locked April-format style.
// Plain Normal-styled paragraphs (no fancy table, no landscape) — exactly
// matching `docs/artifacts/Whale_Class_April_Language_Summary.docx`.
//
// Format (top to bottom):
//   "Whale Class"
//   "Language — Monthly Summary"
//   "{Month} {Year}"
//   ""
//   "{Child Name}"
//   "{Body paragraph: 2-4 sentences}"
//   ""
//   ...
//
// The bodies come from `buildChildSummaryParagraph()` in monthly-summary-builder
// OR from teacher-edited notes saved in `montree_weekly_admin_notes` where
// doc_type='monthly'. This module is pure docx packaging — it accepts the
// final text strings and produces the file.

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';

export interface MonthlyDocChild {
  childName: string;
  body: string;
}

export interface MonthlyDocInput {
  /** Top of the document. Usually the school or classroom name, e.g. "Whale Class". */
  classroomName: string;
  /** Display month, e.g. "May 2026". */
  monthLabel: string;
  children: MonthlyDocChild[];
  /** Optional title override. Default "Language — Monthly Summary". */
  titleOverride?: string;
}

const DEFAULT_TITLE = 'Language — Monthly Summary';

/**
 * Compose the .docx as a Buffer. Caller streams to client.
 */
export async function generateMonthlySummaryDoc(
  input: MonthlyDocInput
): Promise<Buffer> {
  const children: Paragraph[] = [];

  // Header block
  children.push(new Paragraph({ children: [new TextRun(input.classroomName)] }));
  children.push(
    new Paragraph({ children: [new TextRun(input.titleOverride || DEFAULT_TITLE)] })
  );
  children.push(new Paragraph({ children: [new TextRun(input.monthLabel)] }));
  children.push(new Paragraph({ children: [new TextRun('')] }));

  // Per-child block
  for (const child of input.children) {
    children.push(new Paragraph({ children: [new TextRun(child.childName)] }));
    children.push(new Paragraph({ children: [new TextRun(child.body)] }));
    children.push(new Paragraph({ children: [new TextRun('')] }));
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
