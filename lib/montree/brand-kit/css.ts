// lib/montree/brand-kit/css.ts
// ============================================================================
// THE THEME LAYER — the only stylesheet a school's brand is allowed to touch.
// ============================================================================
// `brandKitCss(kit)` returns the <style> body that `DocumentPaper` injects
// beside `DOCUMENT_PRINT_CSS`. It is a pure function of the stored kit: same
// kit in, same string out, no DOM, no clock, no I/O.
//
// 🚨 EVERY RULE IS SCOPED UNDER `.mt-branded`, AND THAT CLASS IS ONLY ON THE
// PAGE WHEN A SCHOOL HAS AN ACTIVE KIT. A school with no brand kit therefore
// prints a sheet that is not "themed with default values" — it is the same
// bytes it printed yesterday, because none of these selectors match anything.
// This is the whole compatibility argument; do not "simplify" a rule out of the
// `.mt-branded` prefix.
//
// 🚨 WHAT IT TARGETS. `components/cms/documents/*` is SHARED WITH HARBOR (CMS)
// and is never modified from the Montree side — so the theme reaches the sheet
// through the `cms-doc-*` classes that are already in the markup, plus exactly
// two Montree-owned elements that `DocumentPaper` renders itself:
//     .mt-doc-emblem     — the crest in the masthead
//     .mt-doc-watermark  — the ghost behind the sheet
// Both are <img> elements, deliberately, NOT CSS backgrounds: `background-image`
// is the first thing a browser drops when "Background graphics" is unticked in
// the print dialog, and a crest that vanishes on half the world's printers is
// worse than no crest at all. The washes and tints below ARE backgrounds and do
// degrade that way — which is correct, because they are decoration and the
// crest is identity.
//
// 🚨 WHAT IT NEVER TOUCHES. `.cms-doc-badge` and the severity/EpiPen classes.
// On this paper colour is information exactly once — a severe allergy is red
// because it is severe, not because a school chose red — and a brand may not
// repaint it. There is no rule below that names any `cms-doc-sev-*` class.

import { isBrandKitActive, type BrandKit } from './types';

/** Belt-and-braces. `parseBrandKit` has already rejected anything that is not
 *  `#RRGGBB`/`transparent`, but this string is going into a <style> tag through
 *  `dangerouslySetInnerHTML`, and a second check at the point of injection
 *  costs nothing. A value that fails here is dropped, not escaped: a colour
 *  that needs escaping is not a colour. */
function cssColor(value: string, fallback: string): string {
  return value === 'transparent' || /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

/**
 * The per-school VALUES. This is the only part of the sheet that varies between
 * two schools; everything after it is identical for every school on the
 * platform and could be a static asset.
 */
function tokenBlock(kit: BrandKit): string {
  const t = kit.tokens;
  const ink = cssColor(t.ink, '#101820');
  const accent = cssColor(t.accent, '#101820');
  const border = cssColor(t.border, '#c9d3df');
  const wash = cssColor(t.wash, 'transparent');
  const watermark = Number.isFinite(t.watermarkOpacity)
    ? Math.max(0, Math.min(0.2, t.watermarkOpacity))
    : 0;

  return `
.mt-branded .cms-doc-sheet {
  --doc-ink: ${ink};
  --doc-accent: ${accent};
  --doc-border: ${border};
  --doc-wash: ${wash};
  --doc-watermark-opacity: ${watermark};
  /* Prior art: lib/montree/birthdays/pdfTemplates.ts. The emblem sits at 62% of
     the page width, centred. Not a taste decision — it was set by looking at
     renders: narrower and the ghost reads as a smudge in the margin, wider and
     it runs under the table's outer columns where it competes with the numbers. */
  --doc-watermark-width: 62%;
  /* 13mm ≈ cap height of the 19pt title plus its subtitle: the crest reads as
     part of the masthead lockup rather than as a picture pasted beside it. */
  --doc-emblem-height: 13mm;
  /* The paper's display face. Lora is Montree's heading serif and is already
     loaded by the app shell; Georgia is the fallback every printer has. */
  --doc-display-font: var(--font-lora), 'Lora', Georgia, 'Times New Roman', serif;
}`;
}

/**
 * The rules. Identical for every school — only the custom properties above
 * change — and every selector is prefixed with `.mt-branded`.
 */
const THEME_RULES = `
/* ── the ghost ─────────────────────────────────────────────────────────────
   Position:absolute + z-index:0 is the CSS equivalent of the docx
   \`behindDocument: true\` the birthday board uses.

   THE 8% RULE (classic), inherited from that board and re-verified on these
   sheets: below ~6% the emblem disappears into the gutters and reads as a
   printing fault — a smear somebody will report as a broken printer — and
   above ~9% it starts to tint the type on top of it and compete with the
   severity badges. 8% is the value at which the crest is plainly there and
   every name, phone number and dose still reads at arm's length.

   ONE GHOST PER DOCUMENT, NOT PER PAGE: it is centred on the sheet, so a class
   list that runs to three pages carries it on the middle one. CSS cannot repeat
   an element per printed page (only @page margin boxes can, and they cannot
   take images), and a ghost stamped on page one alone would read as a header
   that failed to repeat. */
.mt-branded .mt-doc-watermark {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--doc-watermark-width);
  transform: translate(-50%, -50%);
  opacity: var(--doc-watermark-opacity);
  z-index: 0;
  pointer-events: none;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
/* Everything the reader is meant to read sits above it. \`.mt-doc-content\` is
   DocumentPaper's own wrapper around the shared body components — added only
   on the themed path, so the un-themed DOM is untouched. */
.mt-branded .cms-doc-sheet > header,
.mt-branded .cms-doc-sheet > footer,
.mt-branded .mt-doc-content {
  position: relative;
  z-index: 1;
}

/* ── the crest ─────────────────────────────────────────────────────────────
   object-fit: contain, always. A school's logo may be a square badge, a wide
   wordmark or a tall crest, and exactly none of them may be stretched to fit a
   box we chose. The height is fixed and the width follows. */
.mt-branded .mt-doc-emblem {
  height: var(--doc-emblem-height);
  width: auto;
  max-width: 46mm;
  object-fit: contain;
  display: block;
  margin-inline-end: 5mm;
  align-self: center;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.mt-branded .mt-doc-headlockup {
  display: flex;
  align-items: center;
  min-width: 0;
}

/* ── masthead ─────────────────────────────────────────────────────────────── */
.mt-branded .cms-doc-head {
  border-bottom-color: var(--doc-accent);
  position: relative;
}
.mt-branded .cms-doc-title {
  font-family: var(--doc-display-font);
  font-weight: 600;
  letter-spacing: -0.005em;
  color: var(--doc-ink);
}
.mt-branded .cms-doc-stamp b {
  color: var(--doc-ink);
  font-family: var(--doc-display-font);
  font-weight: 600;
}
.mt-branded .cms-doc-foot { border-top-color: var(--doc-border); }
.mt-branded .cms-doc-note { border-inline-start-color: var(--doc-accent); }
.mt-branded .cms-doc-section > h2 {
  font-family: var(--doc-display-font);
  font-weight: 600;
  color: var(--doc-ink);
  border-bottom-color: var(--doc-accent);
}

/* ── tables ────────────────────────────────────────────────────────────────
   The heading row becomes a band: the wash needs padding on the inline edges
   or the tint stops half a millimetre short of the first letter and reads as a
   misprint. */
.mt-branded .cms-doc-table th {
  color: var(--doc-accent);
  border-bottom-color: var(--doc-accent);
  background: var(--doc-wash);
  padding-inline: 2mm;
  padding-block: 1.4mm 1.6mm;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.mt-branded .cms-doc-table th:first-child { border-start-start-radius: 2pt; }
.mt-branded .cms-doc-table th:last-child {
  border-start-end-radius: 2pt;
  padding-inline-end: 2mm;
}
.mt-branded .cms-doc-table td {
  border-bottom-color: var(--doc-border);
  padding-inline-start: 2mm;
}
.mt-branded .cms-doc-table td:first-child { padding-inline-start: 2mm; }
.mt-branded .cms-doc-name { color: var(--doc-ink); }
/* A school's DATA is not our data: one long surname or home language must break
   rather than spill into the next column. Headings are ours and known, so they
   are left to wrap between words — break-word there hyphenates "LANGUAG/E".
   (This one arguably belongs in print-css.ts proper — it is a fix to the ink,
   not to the theme — but that file is shared with Harbor and is never edited
   from the Montree side.) */
.mt-branded .cms-doc-table td { overflow-wrap: break-word; }
/* Body copy is NOT repainted. #101820 at 10.5pt is the most legible thing on
   the sheet and a school's brand colour has no business inside a phone number.
   The theme owns the furniture; the ink stays ink. */

/* The hand-written columns on the pickup sheet — a ruled box somebody signs. */
.mt-branded .cms-doc-write { border-bottom-color: var(--doc-border); }

/* ── the allergy poster ────────────────────────────────────────────────────
   The child's name and the allergen take the school's ink. The BADGES do not:
   severity red and the EpiPen block are the information on this page and no
   brand outranks them. */
.mt-branded .cms-doc-poster-name,
.mt-branded .cms-doc-poster-allergen { color: var(--doc-ink); }
.mt-branded .cms-doc-poster dt { color: var(--doc-accent); }

/* ── name labels ───────────────────────────────────────────────────────────
   The cut grid keeps its DASHED weight — a cut guide is a tool and must stay
   legible as one — but it takes the brand's border colour. Left at the base
   #8f9dad it is the only cool-grey line on a warm sheet, and it reads as the
   one thing on the page nobody styled. */
.mt-branded .cms-doc-grid { border-top-color: var(--doc-border); }
/* \`position: relative; z-index: 0\` makes each cut cell its own stacking
   context — which is what lets the card below sit BEHIND the child's name
   (z-index:-1) while still painting in front of the cell. Without the explicit
   z-index:0 here the frame would either cover the name or disappear behind the
   sheet's white background, depending on which ancestor happened to be a
   stacking context. */
.mt-branded .cms-doc-label {
  border-inline-start-color: var(--doc-border);
  border-bottom-color: var(--doc-border);
  position: relative;
  z-index: 0;
}
.mt-branded .cms-doc-label:nth-child(3n) { border-inline-end-color: var(--doc-border); }

/* The card. It is a pseudo-element inset inside the cut cell rather than a
   border on the cell itself, for two reasons: the cell's own borders ARE the
   cut guides and must stay dashed and square, and the shared Labels() markup is
   CMS-owned so there is no wrapper element to add. Inset by 1.2mm so the frame
   is plainly inside the line you cut along. */
.mt-branded .cms-doc-label::before {
  content: '';
  position: absolute;
  inset: 1.2mm;
  border: 0.5pt solid var(--doc-border);
  border-radius: 2.5pt;
  background: var(--doc-wash);
  z-index: -1;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.mt-branded .cms-doc-label-name {
  font-family: var(--doc-display-font);
  font-weight: 500;
  font-size: 22pt;
  letter-spacing: -0.01em;
  color: var(--doc-ink);
}
/* The room line becomes the card's footer rule: small, letterspaced, in the
   accent, over a hairline that stops short of the frame. */
.mt-branded .cms-doc-label-room {
  margin-top: 2mm;
  padding-top: 1.8mm;
  font-size: 7pt;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--doc-accent);
  border-top: 0.4pt solid var(--doc-border);
  width: 60%;
}

/* ── "Full" only ───────────────────────────────────────────────────────────
   Corner marks on two OPPOSITE corners, never four: four reads as a
   certificate border, two reads as fine stationery. They hang off two
   different existing elements because one pseudo-element can only draw one
   corner and the label's own ::before is already the card frame. The name span
   is deliberately NOT positioned, so its ::after resolves against the label. */
.mt-branded[data-doc-intensity='full'] .cms-doc-label::after,
.mt-branded[data-doc-intensity='full'] .cms-doc-label-name::after {
  content: '';
  position: absolute;
  width: 3.2mm;
  height: 3.2mm;
  border-color: var(--doc-accent);
  border-style: solid;
  border-width: 0;
  z-index: 1;
  pointer-events: none;
}
.mt-branded[data-doc-intensity='full'] .cms-doc-label::after {
  top: 2.4mm;
  inset-inline-start: 2.4mm;
  border-top-width: 0.6pt;
  border-inline-start-width: 0.6pt;
}
.mt-branded[data-doc-intensity='full'] .cms-doc-label-name::after {
  bottom: 2.4mm;
  inset-inline-end: 2.4mm;
  border-bottom-width: 0.6pt;
  border-inline-end-width: 0.6pt;
}
/* A second hairline under the masthead, and banded table rows. Both are pure
   tint: with "Background graphics" off they simply are not there, and the sheet
   is still a correct sheet. */
.mt-branded[data-doc-intensity='full'] .cms-doc-head::after {
  content: '';
  position: absolute;
  inset-inline: 0;
  bottom: -1.7mm;
  height: 0.4pt;
  background: var(--doc-border);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.mt-branded[data-doc-intensity='full'] .cms-doc-table tbody tr:nth-child(even) td {
  background: var(--doc-wash);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ── print ────────────────────────────────────────────────────────────────
   The crest and the ghost are <img> elements, so they survive a print dialog
   with backgrounds disabled — but only if the tints they sit beside are told
   to print too. print-color-adjust is stated per element above; here it is
   stated once for the sheet, and the screen-only chrome is stood down.
   (@page lives in DOCUMENT_PRINT_CSS and is not repeated: two @page rules
   fighting over the same sheet is a bug nobody enjoys finding.) */
@media print {
  .mt-branded .cms-doc-sheet {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .mt-branded .mt-doc-emblem,
  .mt-branded .mt-doc-watermark {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
`;

/**
 * The stylesheet for one school. Returns `''` for a school with no active kit,
 * so the caller can inject it unconditionally.
 */
export function brandKitCss(kit: BrandKit | null | undefined): string {
  if (!isBrandKitActive(kit)) return '';
  return `${tokenBlock(kit)}\n${THEME_RULES}`;
}
