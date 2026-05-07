// lib/montree/weekly-admin/doc-generator.ts
// Generates pixel-perfect Weekly Summary and Weekly Plan .docx files
// matching the handmade templates used in Whale Class, Beijing.
// These get physically printed, cut, and pasted into little books.

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Footer,
  AlignmentType,
  BorderStyle,
  WidthType,
  VerticalAlign,
  PageNumber,
  HeightRule,
} from 'docx';

// ─── Types ───────────────────────────────────────────────────

export interface ChildNotes {
  childId: string;
  childName: string;
  /** Summary doc: English sentence about the week */
  englishSummary?: string;
  /** Summary doc: Chinese text (日常：...\n感官：...\n数学：...\n语言：...\n文化：...) */
  chineseSummary?: string;
  /** Plan doc: per-area English work names */
  planAreas?: {
    practical_life?: { en?: string };
    sensorial?: { en?: string };
    mathematics?: { en?: string };
    language?: { en?: string };
    cultural?: { en?: string };
  };
  /** Plan doc: single overall Chinese developmental note (goes in col0 of notes row) */
  chineseNote?: string;
  /** Plan doc: additional notes text (goes in col6 "Notes" column of notes row) */
  notesText?: string;
}

// ─── Pre-computed Twips (verified from template measurements) ─

// Weekly Summary: 2-column "Child | Narrative" table, ONE row per child.
// Format baked from the May 7 manual draft Tredoux approved as the canonical
// look — landscape A4, dark green header, alternating row fills, Calibri.
const SUMMARY = {
  // Landscape A4. Width × Height swapped from portrait dims.
  PAGE_WIDTH: 16839,   // 29.704cm (landscape — wider than tall)
  PAGE_HEIGHT: 11907,  // 21.008cm
  MARGIN: 720,         // 1.270cm
  COL_NAME_WIDTH: 1400,    // ~2.47cm — child name column (left)
  COL_BODY_WIDTH: 13000,   // ~22.93cm — narrative column (right)
  TABLE_WIDTH: 14400,      // sum
  // Calibri renders English cleanly; fallback to SimSun for east-asia
  // characters so zh-locale exports still render Chinese inline.
  FONT: { ascii: 'Calibri', eastAsia: 'SimSun', hAnsi: 'Calibri', cs: 'Calibri' } as const,
  FONT_SIZE: 16,           // 8pt in half-points (narrative body)
  HEADER_FONT_SIZE: 20,    // 10pt for header row
  // Color palette (also documented as canonical "Montree summary doc" tokens).
  HEADER_FILL: '1D4E2A',   // deep forest green
  HEADER_TEXT: 'FFFFFF',
  ROW_FILL_A: 'EAF4EC',    // very pale green (odd rows)
  ROW_FILL_B: 'FFFFFF',    // white (even rows)
  CELL_BORDER: 'CCCCCC',   // light gray, 1pt
};

// Weekly Plan: 7 cols (Name + 5 areas + Notes), 11 rows per table
// Confirmed: 7 columns, no merged cells. Col0=Name/Week, Col1-5=areas, Col6=Notes
const PLAN = {
  PAGE_WIDTH: 11906,   // 21.001cm
  PAGE_HEIGHT: 16838,  // 29.700cm
  MARGIN: 720,         // 1.270cm
  COL_WIDTHS: [1673, 1539, 1539, 1539, 1539, 1539, 1406] as const,
  TABLE_WIDTH: 10774,  // sum (intentionally wider than content area — matches template)
  HEADER_ROW_HEIGHT: 284,
  NAME_ROW_HEIGHT: 475,
  NOTES_ROW_HEIGHT: 2041,
  HEADER_FONT: 'SimSun',
  HEADER_FONT_SIZE: 22,  // 11pt
  BODY_FONT: 'SimSun',
  BODY_FONT_SIZE: 20,    // 10pt
  CHILDREN_PER_TABLE: 5,
};

const PLAN_AREA_KEYS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'] as const;
// 7-column header: [Week#] [Practical] [Sensorial] [Math] [Language] [Science & Culture] [Notes]
// Matches the teacher's handmade template exactly
const PLAN_HEADERS_7 = ['', 'Practical', 'Sensorial', 'Math', 'Language', 'Science & Culture', 'Notes'];

// Thin black borders matching both templates
const THIN_BORDER = { style: BorderStyle.SINGLE, size: 1, color: '000000' };
const ALL_BORDERS = { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER };

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Split text on newlines into separate Paragraph objects.
 * docx-js ignores \n inside TextRun — MUST use separate Paragraphs.
 * If boldFirstLine is true, the first line gets bold styling (used for child names).
 */
function multilineParagraphs(text: string, font: string, size: number, bold?: boolean, boldFirstLine?: boolean): Paragraph[] {
  return text.split('\n').map(
    (line, i) => new Paragraph({
      children: [new TextRun({ text: line, font, size, bold: bold || (boldFirstLine && i === 0) })],
    })
  );
}

/** Create a TableCell with multiline text. */
function textCell(
  text: string,
  width: number,
  font: string,
  fontSize: number,
  opts?: { bold?: boolean; boldFirstLine?: boolean; verticalAlign?: (typeof VerticalAlign)[keyof typeof VerticalAlign] }
): TableCell {
  const paragraphs = (text || '').trim()
    ? multilineParagraphs(text, font, fontSize, opts?.bold, opts?.boldFirstLine)
    : [new Paragraph({})];
  return new TableCell({
    borders: ALL_BORDERS,
    width: { size: width, type: WidthType.DXA },
    verticalAlign: opts?.verticalAlign,
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    children: paragraphs,
  });
}

/** Empty cell with correct width and borders. */
function emptyCell(width: number): TableCell {
  return new TableCell({
    borders: ALL_BORDERS,
    width: { size: width, type: WidthType.DXA },
    children: [new Paragraph({})],
  });
}

// ─── Weekly Summary Generator ────────────────────────────────

/**
 * CANONICAL FORMAT — locked in Session 94 (May 7, 2026) from a manual draft
 * Tredoux approved as the look-and-feel for printable weekly summaries.
 * DO NOT redesign without his explicit say-so.
 *
 * Layout: landscape A4, single 2-column table with one row per child.
 *   - Col 1 (1400 dxa): child name, bold
 *   - Col 2 (13000 dxa): narrative paragraph
 *   - Header row: dark green #1D4E2A fill, white bold "Child | Activities — period"
 *   - Body rows: alternating #EAF4EC / #FFFFFF fills, 1pt #CCCCCC borders
 *   - Calibri throughout (with SimSun fallback for east-asia text)
 *   - 8pt body, 10pt header
 *
 * The narrative comes from the saved summary note (auto-filled by the system
 * or hand-edited by the teacher in the Weekly Admin tab). One paragraph per
 * child — area-by-area breakdowns belong in the Weekly Plan doc, not here.
 */
export function generateWeeklySummary(children: ChildNotes[], weekLabel: string): Document {
  const lightGrayBorder = { style: BorderStyle.SINGLE, size: 1, color: SUMMARY.CELL_BORDER };
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

  const summaryHeaderCell = (text: string, width: number): TableCell => new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: 'clear' as const, color: 'auto', fill: SUMMARY.HEADER_FILL },
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    children: [new Paragraph({
      children: [new TextRun({
        text,
        font: SUMMARY.FONT,
        size: SUMMARY.HEADER_FONT_SIZE,
        bold: true,
        color: SUMMARY.HEADER_TEXT,
      })],
    })],
  });

  const summaryBodyCell = (text: string, width: number, fillColor: string, boldName?: boolean): TableCell => new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: 'clear' as const, color: 'auto', fill: fillColor },
    borders: { top: lightGrayBorder, bottom: lightGrayBorder, left: lightGrayBorder, right: lightGrayBorder },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      children: [new TextRun({
        text: text || '',
        font: SUMMARY.FONT,
        size: SUMMARY.FONT_SIZE,
        bold: !!boldName,
      })],
    })],
  });

  // weekLabel arrives like "W23 (2026-05-04 – 2026-05-10)". Strip the bare
  // W## prefix because the period inside parens is what teachers care about.
  const headerSuffix = (() => {
    const m = weekLabel.match(/\(([^)]+)\)/);
    return m ? m[1] : weekLabel;
  })();
  const headerRow = new TableRow({
    cantSplit: true,
    children: [
      summaryHeaderCell('Child', SUMMARY.COL_NAME_WIDTH),
      summaryHeaderCell(`Activities — ${headerSuffix}`, SUMMARY.COL_BODY_WIDTH),
    ],
  });

  const childRows: TableRow[] = children.map((child, idx) => {
    const fill = idx % 2 === 0 ? SUMMARY.ROW_FILL_A : SUMMARY.ROW_FILL_B;
    const narrative = (child.englishSummary || child.chineseSummary || '').trim();
    return new TableRow({
      cantSplit: true,
      children: [
        summaryBodyCell(child.childName, SUMMARY.COL_NAME_WIDTH, fill, true),
        summaryBodyCell(narrative, SUMMARY.COL_BODY_WIDTH, fill),
      ],
    });
  });

  return new Document({
    sections: [{
      properties: {
        page: {
          size: { width: SUMMARY.PAGE_WIDTH, height: SUMMARY.PAGE_HEIGHT, orientation: 'landscape' as const },
          margin: { top: SUMMARY.MARGIN, right: SUMMARY.MARGIN, bottom: SUMMARY.MARGIN, left: SUMMARY.MARGIN },
        },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `Weekly Summary — ${weekLabel}  |  Page `, font: SUMMARY.FONT, size: 16 }),
              new TextRun({ children: [PageNumber.CURRENT], font: SUMMARY.FONT, size: 16 }),
            ],
          })],
        }),
      },
      children: [new Table({
        width: { size: SUMMARY.TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [SUMMARY.COL_NAME_WIDTH, SUMMARY.COL_BODY_WIDTH],
        rows: [headerRow, ...childRows],
      })],
    }],
  });
}

// ─── Weekly Plan Generator ───────────────────────────────────

/**
 * Build one plan table for up to 5 children.
 * 7 columns × 11 rows: 1 header + 5 children × 2 rows (name + notes).
 * Name row: child name in col0, English work names in cols 1-5, col6 empty.
 * Notes row: col0 empty, Chinese notes in cols 1-5, col6 empty.
 */
function buildPlanTable(children: ChildNotes[], weekId?: string): Table {
  // Header row
  const headerRow = new TableRow({
    height: { value: PLAN.HEADER_ROW_HEIGHT, rule: HeightRule.EXACT },
    children: PLAN_HEADERS_7.map((label, colIdx) => {
      // Col 0 can show week ID (e.g., "W23")
      const text = colIdx === 0 && weekId ? weekId : label;
      return new TableCell({
        borders: ALL_BORDERS,
        width: { size: PLAN.COL_WIDTHS[colIdx], type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 20, bottom: 20, left: 40, right: 40 },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: text
            ? [new TextRun({ text, font: PLAN.HEADER_FONT, size: PLAN.HEADER_FONT_SIZE, bold: true })]
            : [],
        })],
      });
    }),
  });

  const childRows: TableRow[] = [];

  for (const child of children) {
    // Name row: child name + English work names per area + empty notes col
    childRows.push(new TableRow({
      height: { value: PLAN.NAME_ROW_HEIGHT, rule: HeightRule.EXACT },
      children: [
        // Col 0: Child name
        textCell(child.childName, PLAN.COL_WIDTHS[0], PLAN.BODY_FONT, PLAN.BODY_FONT_SIZE, { bold: true }),
        // Cols 1-5: English work name per area
        ...PLAN_AREA_KEYS.map((key, i) =>
          textCell(child.planAreas?.[key]?.en || '', PLAN.COL_WIDTHS[i + 1], PLAN.BODY_FONT, PLAN.BODY_FONT_SIZE)
        ),
        // Col 6: empty (notes only go in the Chinese row below)
        emptyCell(PLAN.COL_WIDTHS[6]),
      ],
    }));

    // Notes row: Chinese developmental note in col0, empty cols 1-5, additional notes in col6
    // Matches the teacher's physical book format exactly
    childRows.push(new TableRow({
      height: { value: PLAN.NOTES_ROW_HEIGHT, rule: HeightRule.EXACT },
      children: [
        // Col 0: Overall Chinese developmental note for this child
        textCell(child.chineseNote || '', PLAN.COL_WIDTHS[0], PLAN.BODY_FONT, PLAN.BODY_FONT_SIZE),
        // Cols 1-5: empty
        ...PLAN_AREA_KEYS.map((_, i) => emptyCell(PLAN.COL_WIDTHS[i + 1])),
        // Col 6: Additional notes (e.g., "上周因为写数字卷，计划未变")
        textCell(child.notesText || '', PLAN.COL_WIDTHS[6], PLAN.BODY_FONT, PLAN.BODY_FONT_SIZE),
      ],
    }));
  }

  // Pad to 5 children (10 data rows) with empty rows
  const remaining = PLAN.CHILDREN_PER_TABLE - children.length;
  for (let i = 0; i < remaining; i++) {
    childRows.push(
      new TableRow({
        height: { value: PLAN.NAME_ROW_HEIGHT, rule: HeightRule.EXACT },
        children: PLAN.COL_WIDTHS.map((w) => emptyCell(w)),
      }),
      new TableRow({
        height: { value: PLAN.NOTES_ROW_HEIGHT, rule: HeightRule.EXACT },
        children: PLAN.COL_WIDTHS.map((w) => emptyCell(w)),
      })
    );
  }

  return new Table({
    width: { size: PLAN.TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: [...PLAN.COL_WIDTHS],
    rows: [headerRow, ...childRows],
  });
}

/**
 * Generates the "What is next" Weekly Plan document.
 * Multiple tables (5 children each), each on its own page.
 */
export function generateWeeklyPlan(children: ChildNotes[], weekLabel: string): Document {
  // Split children into groups of 5
  const groups: ChildNotes[][] = [];
  for (let i = 0; i < children.length; i += PLAN.CHILDREN_PER_TABLE) {
    groups.push(children.slice(i, i + PLAN.CHILDREN_PER_TABLE));
  }
  if (groups.length === 0) groups.push([]);

  const sections = groups.map((group) => ({
    properties: {
      page: {
        size: { width: PLAN.PAGE_WIDTH, height: PLAN.PAGE_HEIGHT },
        margin: { top: PLAN.MARGIN, right: PLAN.MARGIN, bottom: PLAN.MARGIN, left: PLAN.MARGIN },
      },
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: `Weekly Plan \u2014 ${weekLabel}  |  Page `, font: PLAN.BODY_FONT, size: 16 }),
            new TextRun({ children: [PageNumber.CURRENT], font: PLAN.BODY_FONT, size: 16 }),
          ],
        })],
      }),
    },
    children: [buildPlanTable(group, weekLabel)],
  }));

  return new Document({ sections });
}

// ─── Packing ─────────────────────────────────────────────────

export async function packDocument(doc: Document): Promise<Buffer> {
  const result = await Packer.toBuffer(doc);
  return Buffer.from(result);
}
