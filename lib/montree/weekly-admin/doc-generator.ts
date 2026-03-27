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

// Weekly Summary: 3 cols × 8 rows grid, each cell = one child
const SUMMARY = {
  PAGE_WIDTH: 11907,   // 21.008cm
  PAGE_HEIGHT: 16839,  // 29.704cm
  MARGIN: 720,         // 1.270cm
  COL_WIDTH: 3402,     // 6.001cm (3 equal columns)
  ROW_HEIGHT: 3402,    // 6.001cm
  TABLE_WIDTH: 10206,  // 3 × 3402
  FONT: 'SimSun',     // handles mixed EN/ZH text (matches Plan doc font)
  FONT_SIZE: 18,       // 9pt in half-points
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
 */
function multilineParagraphs(text: string, font: string, size: number, bold?: boolean): Paragraph[] {
  return text.split('\n').map(
    (line) => new Paragraph({
      children: [new TextRun({ text: line, font, size, bold })],
    })
  );
}

/** Create a TableCell with multiline text. */
function textCell(
  text: string,
  width: number,
  font: string,
  fontSize: number,
  opts?: { bold?: boolean; verticalAlign?: (typeof VerticalAlign)[keyof typeof VerticalAlign] }
): TableCell {
  const paragraphs = (text || '').trim()
    ? multilineParagraphs(text, font, fontSize, opts?.bold)
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
 * Generates the "What was done" Weekly Summary document.
 * 3 columns × N rows table. Each cell = one child.
 * Cell format: "Name: English sentence.\n\n日常：...\n感官：...\n数学：...\n语言：...\n文化：..."
 */
export function generateWeeklySummary(children: ChildNotes[], weekLabel: string): Document {
  // Build cell content for each child
  const cellContents: string[] = children.map((child) => {
    const en = child.englishSummary || '';
    const zh = child.chineseSummary || '';
    if (!en && !zh) return `${child.childName}:`;
    const parts = [`${child.childName}: ${en}`];
    if (zh) {
      parts.push('');
      parts.push(zh);
    }
    return parts.join('\n');
  });

  // Pad to fill complete rows (multiple of 3)
  while (cellContents.length % 3 !== 0) {
    cellContents.push('');
  }

  // Build table rows
  const rows: TableRow[] = [];
  for (let i = 0; i < cellContents.length; i += 3) {
    rows.push(new TableRow({
      height: { value: SUMMARY.ROW_HEIGHT, rule: HeightRule.EXACT },
      children: [0, 1, 2].map((offset) =>
        textCell(cellContents[i + offset], SUMMARY.COL_WIDTH, SUMMARY.FONT, SUMMARY.FONT_SIZE)
      ),
    }));
  }

  // Ensure at least 8 rows (matching template)
  while (rows.length < 8) {
    rows.push(new TableRow({
      height: { value: SUMMARY.ROW_HEIGHT, rule: HeightRule.EXACT },
      children: [0, 1, 2].map(() => emptyCell(SUMMARY.COL_WIDTH)),
    }));
  }

  return new Document({
    sections: [{
      properties: {
        page: {
          size: { width: SUMMARY.PAGE_WIDTH, height: SUMMARY.PAGE_HEIGHT },
          margin: { top: SUMMARY.MARGIN, right: SUMMARY.MARGIN, bottom: SUMMARY.MARGIN, left: SUMMARY.MARGIN },
        },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `Weekly Summary \u2014 ${weekLabel}  |  Page `, font: SUMMARY.FONT, size: 16 }),
              new TextRun({ children: [PageNumber.CURRENT], font: SUMMARY.FONT, size: 16 }),
            ],
          })],
        }),
      },
      children: [new Table({
        width: { size: SUMMARY.TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [SUMMARY.COL_WIDTH, SUMMARY.COL_WIDTH, SUMMARY.COL_WIDTH],
        rows,
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
