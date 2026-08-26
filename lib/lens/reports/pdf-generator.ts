// lib/lens/reports/pdf-generator.ts
// The deliverable. pdfkit, in the same shape as
// lib/montree/reports/pdf-generator.ts (a Promise around a document, chunks
// collected on 'data', resolved on 'end'), with a Lens-specific template.
//
// 🚨 THE CJK FONT IS THE WHOLE REASON THIS FILE IS CAREFUL ABOUT FONTS.
// pdfkit's fourteen standard fonts have no Chinese glyphs at all: a bilingual
// report rendered in Helvetica is a page of empty boxes, and it would LOOK like
// a rendering bug rather than a missing font, which is the expensive kind of
// failure. So a Noto Serif SC subset ships in public/lens/fonts and every run of
// text is routed to it if it contains a CJK codepoint. See docs/LENS_BUILD_LOG.md
// for how the subset was built (GB2312 level 1+2 + Latin + punctuation, 2.4MB)
// and what to do if a glyph ever comes out as tofu.
//
// 🚨 THERE IS NO BOLD CJK. The subset is Regular only — a second 2.4MB face for
// headings is not worth it. `bold()` therefore falls back to the regular CJK
// face for Chinese text, which reads correctly; it just does not get heavier.
// Latin headings are still properly bold.
//
// 🚨 NO CHILD FACES IN THE BODY. The photo appendix renders CAPTIONS ONLY, not
// images. That is a deliberate product decision, not a limitation: these are
// photographs taken in somebody else's classroom under a professional
// engagement, and a PDF is the artefact most likely to be forwarded. The photo
// log tells a reader what was photographed and when; the images themselves stay
// behind her login.

import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';
import {
  AREA_LABELS,
  ENGAGEMENT_LABELS,
  LEVEL_LABELS,
  RATING_DOMAINS,
  RATING_LABELS,
  SUBJECT_LABELS,
  ratingFromPip,
  type LensClassroom,
  type LensMoment,
  type LensObserver,
  type LensSchool,
  type LensStaff,
  type LensVisit,
} from '../types';
import { sectionTitle, type LensReportContent } from './schema';

export type PdfLanguage = 'en' | 'zh' | 'both';

/** The four report fields that are lists of items rather than prose. */
type ListKey = 'commendations' | 'recommendations' | 'required_actions' | 'next_steps';

export interface LensPdfInput {
  observer: LensObserver;
  school: LensSchool;
  visit: LensVisit;
  classroom: LensClassroom | null;
  staff: LensStaff[];
  moments: LensMoment[];
  content: LensReportContent;
  version: number;
  finalisedAt: string | null;
  language: PdfLanguage;
  debrief?: { stage: string; question: string }[];
}

// ------------------------------------------------------------------- fonts --

const CJK_ALIAS = 'LensCJK';
const HAS_CJK = /[⺀-鿿豈-﫿＀-￯]/;

/**
 * Where the CJK face might be. The first entry is the production answer:
 * start.sh runs the server from /app/.next/standalone and the Dockerfile copies
 * public/ into it, so process.cwd() + public/... resolves. The others cover a
 * dev server run from the repo root and a checkout where only the worker's full
 * copy of the font is present.
 */
const CJK_CANDIDATES = [
  'public/lens/fonts/NotoSerifSC-Lens.otf',
  'public/lens/fonts/NotoSerifSC-Regular.otf',
  'potato-worker/remotion/public/NotoSerifSC-Regular.otf',
];

let cjkPathCache: string | null | undefined;

function findCjkFont(): string | null {
  if (cjkPathCache !== undefined) return cjkPathCache;
  for (const candidate of CJK_CANDIDATES) {
    const full = path.join(process.cwd(), candidate);
    try {
      if (fs.existsSync(full)) {
        cjkPathCache = full;
        return full;
      }
    } catch {
      /* keep looking */
    }
  }
  console.warn('[lens/pdf] No CJK font found — Chinese text will not render.');
  cjkPathCache = null;
  return null;
}

/** Test seam, and a way to re-probe after the font is added to a running box. */
export function resetCjkFontCache(): void {
  cjkPathCache = undefined;
}

// ------------------------------------------------------------------ layout --

const PAGE = { size: 'A4' as const, margin: 56 };
const COLORS = {
  ink: '#14261B',
  muted: '#5C7566',
  rule: '#C9D8CE',
  gold: '#8A6E23',
  forest: '#1D5C41',
  danger: '#9B2C2C',
};
const SIZES = { cover: 26, h1: 15, h2: 12, body: 10.5, small: 8.5 };

class Writer {
  readonly doc: PDFKit.PDFDocument;
  readonly hasCjk: boolean;
  readonly width: number;

  constructor(doc: PDFKit.PDFDocument, hasCjk: boolean) {
    this.doc = doc;
    this.hasCjk = hasCjk;
    this.width = doc.page.width - PAGE.margin * 2;
  }

  /** Pick the face that can actually draw this string. */
  private face(text: string, bold: boolean): string {
    if (this.hasCjk && HAS_CJK.test(text)) return CJK_ALIAS;
    return bold ? 'Helvetica-Bold' : 'Helvetica';
  }

  text(value: string, size = SIZES.body, options: { bold?: boolean; color?: string; gap?: number } = {}) {
    if (!value) return;
    this.doc
      .font(this.face(value, options.bold ?? false))
      .fontSize(size)
      .fillColor(options.color ?? COLORS.ink)
      .text(value, { width: this.width, lineGap: options.gap ?? 2.5 });
  }

  /** A heading with the gold rule under it — the one flourish this template has. */
  heading(value: string) {
    this.breakIfNeeded(70);
    this.doc.moveDown(0.9);
    this.text(value, SIZES.h1, { bold: true, color: COLORS.forest });
    const y = this.doc.y + 3;
    this.doc
      .moveTo(PAGE.margin, y)
      .lineTo(PAGE.margin + this.width, y)
      .strokeColor(COLORS.gold)
      .lineWidth(0.8)
      .stroke();
    this.doc.y = y + 8;
  }

  subheading(value: string) {
    this.breakIfNeeded(56);
    this.doc.moveDown(0.5);
    this.text(value, SIZES.h2, { bold: true });
    this.doc.moveDown(0.2);
  }

  bullet(value: string, size = SIZES.body) {
    if (!value) return;
    this.breakIfNeeded(40);
    const indent = 14;
    const y = this.doc.y;
    this.doc.font('Helvetica').fontSize(size).fillColor(COLORS.ink).text('•', PAGE.margin, y);
    this.doc
      .font(this.face(value, false))
      .fontSize(size)
      .fillColor(COLORS.ink)
      .text(value, PAGE.margin + indent, y, { width: this.width - indent, lineGap: 2.5 });
  }

  /**
   * Add a page when there is not enough room left for the block about to be
   * drawn. pdfkit will break mid-paragraph on its own; this is what stops a
   * heading from sitting alone at the bottom of a page.
   */
  breakIfNeeded(needed: number) {
    if (this.doc.y + needed > this.doc.page.height - PAGE.margin) this.doc.addPage();
  }

  rule(color = COLORS.rule) {
    const y = this.doc.y + 4;
    this.doc
      .moveTo(PAGE.margin, y)
      .lineTo(PAGE.margin + this.width, y)
      .strokeColor(color)
      .lineWidth(0.5)
      .stroke();
    this.doc.y = y + 8;
  }
}

/** HH:MM UTC — matching what the observer saw in the app's own timeline. */
function clock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

const CONFIDENTIALITY =
  'CONFIDENTIAL. This report is prepared for the named school and its leadership. ' +
  'It records what was observed during the stated period and no more. Children are ' +
  'anonymised throughout; no child is named and no photograph of a child appears in ' +
  'this document. Please do not circulate beyond those it was written for.';

// ------------------------------------------------------------------ sections --

export async function generateLensReportPDF(input: LensPdfInput): Promise<Buffer> {
  const cjkPath = findCjkFont();
  const wantsChinese = input.language !== 'en';

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: PAGE.size,
        margins: {
          top: PAGE.margin,
          bottom: PAGE.margin,
          left: PAGE.margin,
          right: PAGE.margin,
        },
        bufferPages: true,
        info: {
          Title: `${input.school.name} — observation report`,
          Author: input.observer.name,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      let hasCjk = false;
      if (cjkPath && wantsChinese) {
        try {
          doc.registerFont(CJK_ALIAS, cjkPath);
          hasCjk = true;
        } catch (err) {
          // A font that will not load must not take the whole PDF with it —
          // an English-only report is a far better outcome than a 500.
          console.error('[lens/pdf] CJK font failed to register:', err);
        }
      }

      const w = new Writer(doc, hasCjk);

      drawCover(w, input);
      drawContext(w, input);
      drawSections(w, input);
      drawRatings(w, input);
      drawLists(w, input);
      drawDebrief(w, input);
      drawAppendix(w, input);
      drawFooters(doc, input);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function drawCover(w: Writer, input: LensPdfInput) {
  const { observer, school, visit, classroom } = input;

  // Letterhead, right-aligned at the top — the block she configured in Profile.
  const letterhead = [
    observer.letterhead_name || observer.organisation || observer.name,
    observer.letterhead_line1,
    observer.letterhead_line2,
    [observer.letterhead_email, observer.letterhead_phone].filter(Boolean).join('  ·  '),
  ].filter((line): line is string => !!line && line.trim().length > 0);

  if (letterhead.length > 0) {
    for (const [index, line] of letterhead.entries()) {
      w.doc
        .font(index === 0 ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(index === 0 ? 10.5 : 8.5)
        .fillColor(index === 0 ? COLORS.ink : COLORS.muted)
        .text(line, PAGE.margin, w.doc.y, { width: w.width, align: 'right' });
    }
    w.doc.moveDown(2);
  }

  w.doc.moveDown(3);
  w.text('OBSERVATION REPORT', SIZES.small, { bold: true, color: COLORS.gold });
  w.doc.moveDown(0.6);
  w.text(school.name, SIZES.cover, { bold: true });
  if (classroom) {
    w.doc.moveDown(0.2);
    w.text(
      `${classroom.name} — ${LEVEL_LABELS[classroom.level] ?? classroom.level}`,
      SIZES.h1,
      { color: COLORS.muted },
    );
  } else {
    w.doc.moveDown(0.2);
    w.text('Level report — whole school', SIZES.h1, { color: COLORS.muted });
  }

  w.doc.moveDown(1);
  w.rule(COLORS.gold);

  const facts: [string, string][] = [
    ['Engagement', ENGAGEMENT_LABELS[visit.engagement_type] ?? visit.engagement_type],
    ['Date of visit', visit.visit_date],
    [
      'Observer',
      [observer.name, observer.title, observer.credentials].filter(Boolean).join(', '),
    ],
    ['Version', `${input.version}${input.finalisedAt ? ` · finalised ${input.finalisedAt.slice(0, 10)}` : ' · draft'}`],
  ];
  if (school.city || school.country) {
    facts.splice(2, 0, ['Location', [school.city, school.country].filter(Boolean).join(', ')]);
  }
  if (school.affiliation) facts.splice(2, 0, ['Affiliation', school.affiliation]);

  for (const [label, value] of facts) {
    const y = w.doc.y;
    w.doc.font('Helvetica').fontSize(SIZES.small).fillColor(COLORS.muted).text(label, PAGE.margin, y, {
      width: 110,
    });
    w.doc
      .font(HAS_CJK.test(value) && w.hasCjk ? CJK_ALIAS : 'Helvetica')
      .fontSize(SIZES.body)
      .fillColor(COLORS.ink)
      .text(value, PAGE.margin + 120, y, { width: w.width - 120 });
    w.doc.moveDown(0.35);
  }

  w.doc.moveDown(2);
  w.rule();
  w.text(CONFIDENTIALITY, SIZES.small, { color: COLORS.muted, gap: 2 });

  w.doc.addPage();
}

function drawContext(w: Writer, input: LensPdfInput) {
  const { classroom, staff, visit } = input;
  // Section 2 of the template is drafted by the Guru and appears with the rest.
  // What is printed HERE is the record's own facts, which need no drafting and
  // must be right even when nothing has been drafted at all.
  w.heading('At a glance');
  const bits: string[] = [];
  if (classroom) {
    bits.push(
      [
        classroom.name,
        LEVEL_LABELS[classroom.level] ?? classroom.level,
        classroom.age_range ? `ages ${classroom.age_range}` : null,
        classroom.child_count != null ? `${classroom.child_count} children enrolled` : null,
        classroom.ratio ? `ratio ${classroom.ratio}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    );
  }
  if (visit.started_at || visit.ended_at) {
    bits.push(
      `Observed ${visit.started_at ? clock(visit.started_at) : '?'}–${
        visit.ended_at ? clock(visit.ended_at) : '?'
      } (UTC as recorded)`,
    );
  }
  bits.push(`${input.moments.length} observations recorded`);
  for (const bit of bits) w.bullet(bit);

  if (staff.length > 0) {
    w.subheading('Staff');
    for (const person of staff) {
      w.bullet(
        [
          person.name,
          person.role.replace(/_/g, ' '),
          person.training
            ? `${person.training}${person.training_level ? ` ${person.training_level}` : ''}`
            : null,
          person.years_experience != null ? `${person.years_experience} years` : null,
        ]
          .filter(Boolean)
          .join(' · '),
      );
    }
  }

  if (visit.purpose) {
    w.subheading('Purpose of the visit');
    w.text(visit.purpose);
  }
}

function drawSections(w: Writer, input: LensPdfInput) {
  const showEn = input.language !== 'zh';
  const showZh = input.language !== 'en' && w.hasCjk;

  for (const section of input.content.sections) {
    w.heading(section.title || sectionTitle(section.key));
    if (showEn && section.body_en) w.text(section.body_en);
    if (showZh && section.body_zh) {
      if (showEn) w.doc.moveDown(0.6);
      w.text(section.body_zh);
    }
    if (showZh && !section.body_zh && input.language === 'zh') {
      w.text('(This section has not been translated.)', SIZES.small, { color: COLORS.muted });
    }
  }
}

function drawRatings(w: Writer, input: LensPdfInput) {
  const entries = RATING_DOMAINS.map((domain) => [domain, input.content.ratings[domain]] as const).filter(
    (e): e is readonly [(typeof RATING_DOMAINS)[number], NonNullable<(typeof e)[1]>] => !!e[1],
  );
  if (entries.length === 0) return;

  w.heading('Ratings');
  w.text(
    'Exemplary · Established · Emerging · Not yet. The narrative above is the report; this table summarises it. A domain that was not observed in enough depth to rate is omitted.',
    SIZES.small,
    { color: COLORS.muted },
  );
  w.doc.moveDown(0.6);

  const rowHeight = 22;
  for (const [domain, level] of entries) {
    w.breakIfNeeded(rowHeight + 10);
    const y = w.doc.y;
    w.doc
      .rect(PAGE.margin, y - 3, w.width, rowHeight)
      .fillColor('#F4F8F5')
      .fill();
    w.doc
      .font('Helvetica')
      .fontSize(SIZES.body)
      .fillColor(COLORS.ink)
      .text(SUBJECT_LABELS[domain], PAGE.margin + 8, y + 3, { width: w.width / 2 });
    w.doc
      .font('Helvetica-Bold')
      .fontSize(SIZES.body)
      .fillColor(COLORS.forest)
      .text(RATING_LABELS[level], PAGE.margin + w.width / 2, y + 3, {
        width: w.width / 2 - 8,
        align: 'right',
      });
    w.doc.y = y + rowHeight + 2;
  }
}

function drawLists(w: Writer, input: LensPdfInput) {
  const showEn = input.language !== 'zh';
  const showZh = input.language !== 'en' && w.hasCjk;

  // Narrowed to the FOUR list keys, not `keyof LensReportContent`: the wider
  // type also admits `sections` and `ratings`, whose items have a different
  // shape entirely, and the compiler is right to refuse it.
  const blocks: [ListKey, string, string | null][] = [
    ['commendations', 'Commendations', null],
    ['recommendations', 'Recommendations', null],
    [
      'required_actions',
      'Required actions',
      'Compliance-critical items, kept separate from the recommendations above.',
    ],
    ['next_steps', 'Agreed next steps', null],
  ];

  for (const [key, title, note] of blocks) {
    const items = input.content[key];
    if (items.length === 0) continue;
    w.heading(title);
    if (note) {
      w.text(note, SIZES.small, { color: key === 'required_actions' ? COLORS.danger : COLORS.muted });
      w.doc.moveDown(0.4);
    }
    for (const item of items) {
      if (showEn && item.text_en) w.bullet(item.text_en);
      if (showZh && item.text_zh) w.bullet(item.text_zh);
      const meta = [item.owner ? `Owner: ${item.owner}` : null, item.due ? `Due: ${item.due}` : null]
        .filter(Boolean)
        .join('   ');
      if (meta) {
        w.doc
          .font('Helvetica')
          .fontSize(SIZES.small)
          .fillColor(COLORS.muted)
          .text(meta, PAGE.margin + 14, w.doc.y, { width: w.width - 14 });
      }
      w.doc.moveDown(0.35);
    }
  }
}

function drawDebrief(w: Writer, input: LensPdfInput) {
  if (!input.debrief || input.debrief.length === 0) return;
  w.heading('Debrief — questions for the conversation');
  w.text(
    'Open questions for the meeting that follows this report, in GROW order. The last one is the single testable thing to agree before the next visit.',
    SIZES.small,
    { color: COLORS.muted },
  );
  w.doc.moveDown(0.5);
  for (const [index, q] of input.debrief.entries()) {
    w.breakIfNeeded(40);
    const y = w.doc.y;
    w.doc
      .font('Helvetica-Bold')
      .fontSize(SIZES.small)
      .fillColor(COLORS.gold)
      .text(`${index + 1}. ${q.stage}`, PAGE.margin, y, { width: 80 });
    w.doc
      .font(w.hasCjk && HAS_CJK.test(q.question) ? CJK_ALIAS : 'Helvetica')
      .fontSize(SIZES.body)
      .fillColor(COLORS.ink)
      .text(q.question, PAGE.margin + 84, y, { width: w.width - 84, lineGap: 2 });
    w.doc.moveDown(0.4);
  }
}

function drawAppendix(w: Writer, input: LensPdfInput) {
  if (input.moments.length === 0) return;
  w.doc.addPage();
  w.heading('Appendix A — photograph log');

  const photos = input.moments.filter((m) => m.kind === 'photo');
  if (photos.length === 0) {
    w.text('No photographs were taken during this visit.', SIZES.body, { color: COLORS.muted });
  } else {
    w.text(
      'Photographs record the prepared environment and the materials. No image of a child appears in this document; the images themselves are held in the observer’s record.',
      SIZES.small,
      { color: COLORS.muted },
    );
    w.doc.moveDown(0.6);
    for (const photo of photos) {
      w.bullet(
        `${clock(photo.ts)} — ${photo.caption || photo.body || 'no caption written'}${
          photo.area ? ` (${AREA_LABELS[photo.area]})` : ''
        }`,
        SIZES.small,
      );
    }
  }

  w.heading('Appendix B — observation timeline');
  w.text(
    'Every moment recorded during the visit, in the order it was captured. Times are UTC as stamped by the device.',
    SIZES.small,
    { color: COLORS.muted },
  );
  w.doc.moveDown(0.6);

  const staffName = new Map(input.staff.map((s) => [s.id, s.name]));

  for (const moment of input.moments) {
    w.breakIfNeeded(44);
    const rating = ratingFromPip(moment.rating);
    const tags = [
      moment.subject ? SUBJECT_LABELS[moment.subject] : null,
      moment.area ? AREA_LABELS[moment.area] : null,
      moment.staff_id ? staffName.get(moment.staff_id) : null,
      moment.child_alias,
      rating ? RATING_LABELS[rating] : null,
    ]
      .filter(Boolean)
      .join(' · ');

    const y = w.doc.y;
    w.doc
      .font('Helvetica-Bold')
      .fontSize(SIZES.small)
      .fillColor(COLORS.muted)
      .text(clock(moment.ts), PAGE.margin, y, { width: 42 });

    const body = moment.transcript || moment.body || moment.caption || '(tag only)';
    w.doc
      .font(w.hasCjk && HAS_CJK.test(body) ? CJK_ALIAS : 'Helvetica')
      .fontSize(SIZES.small)
      .fillColor(COLORS.ink)
      .text(body, PAGE.margin + 46, y, { width: w.width - 46, lineGap: 1.5 });
    if (tags) {
      w.doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(COLORS.muted)
        .text(tags, PAGE.margin + 46, w.doc.y, { width: w.width - 46 });
    }
    w.doc.moveDown(0.4);
  }
}

/**
 * Page numbers and the signature line, written after the fact.
 *
 * bufferPages:true is what makes this possible — without it the pages are
 * already flushed by the time we know how many there are.
 */
function drawFooters(doc: PDFKit.PDFDocument, input: LensPdfInput) {
  const range = doc.bufferedPageRange();
  const signature =
    input.observer.signature_text ||
    [input.observer.name, input.observer.title, input.observer.credentials]
      .filter(Boolean)
      .join(', ');

  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const y = doc.page.height - PAGE.margin + 16;
    const width = doc.page.width - PAGE.margin * 2;
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(COLORS.muted)
      .text(
        `${input.school.name} · ${input.visit.visit_date} · ${signature}`,
        PAGE.margin,
        y,
        { width: width - 60, lineBreak: false },
      );
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(COLORS.muted)
      .text(`${i - range.start + 1} / ${range.count}`, PAGE.margin + width - 60, y, {
        width: 60,
        align: 'right',
        lineBreak: false,
      });
  }
}
