// components/cms/documents/print-css.ts
// ============================================================================
// THE INK. Extracted from PrintFrame.tsx in CMS phase 6 — byte-identical.
// ============================================================================
// These rules describe PAPER, not Harbor. They carry no design tokens, no hover
// states and no brand colour: a white sheet, a ruled table, a severity badge,
// an A4 @page box. That is precisely why they can be shared.
//
// WHY THIS FILE EXISTS. Phase 6 pointed the same document engine at Montree's
// own children, inside the Montree teacher dashboard. Two surfaces now render
// the identical sheet — `/cms/teacher/documents/<doc>` (Harbor screen chrome)
// and `/montree/dashboard/class-documents/<doc>` (dark-forest screen chrome).
// The SCREEN chrome is emphatically NOT shared — Harbor and Montree's `.btn`
// are protected brands and must never leak into each other. The INK is, because
// there is only one right way for a class list to look on paper and maintaining
// two copies of it would guarantee they drift.
//
// 🚨 WHY IT IS NOT IN globals.css — unchanged from PrintFrame's original note:
//   1. `@page` CANNOT be scoped to a selector. A `@page { size: A4 }` rule in
//      the global stylesheet would apply to every print in the whole repo.
//      The proven house pattern is a plain <style> tag on the page that owns
//      the paper (`lib/onboarding-core/print/*` does exactly this).
//   2. `.cms-doc-*` describe INK, not the design system.
//
// The class PREFIX stays `cms-doc-` on both surfaces on purpose: renaming it
// per brand would fork the stylesheet, which is the thing this file prevents.

export const DOCUMENT_PRINT_CSS = `
@page { size: A4 portrait; margin: 13mm 12mm; }

.cms-doc-sheet {
  background: #ffffff;
  color: #101820;
  font-size: 10.5pt;
  line-height: 1.42;
  max-width: 190mm;
  margin: 0 auto;
  padding: 12mm 11mm 10mm;
  border: 1px solid #dce4ef;
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(21,38,60,0.05), 0 18px 40px -28px rgba(21,38,60,0.45);
}

.cms-doc-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 6mm;
  padding-bottom: 3.5mm;
  border-bottom: 1.6pt solid #101820;
  margin-bottom: 6mm;
}
.cms-doc-title { font-size: 19pt; font-weight: 700; line-height: 1.12; margin: 0; }
.cms-doc-sub { font-size: 9.5pt; color: #4a5867; margin: 1.5mm 0 0; }
.cms-doc-stamp { font-size: 9pt; color: #4a5867; text-align: end; white-space: nowrap; }
.cms-doc-stamp b { display: block; font-size: 11pt; color: #101820; font-weight: 700; }

/* 🚨 THE RTL FIX. dir="auto" gives a Latin child's name its own LTR run —
   correct — but it also makes that ELEMENT ltr, so text-align:start resolves to
   LEFT and the name flies to the far side of an Arabic page. unicode-bidi:
   plaintext keeps the per-paragraph direction for the TEXT while the element
   itself inherits the sheet's direction, so the name reads left-to-right AND
   sits against the right margin, which is what an Arabic reader expects.
   (No backticks in this block: it lives inside a template literal.) */
.cms-doc-sheet [dir='auto'] { unicode-bidi: plaintext; }
/* text-align:start is NOT enough here: with unicode-bidi:plaintext the CSS spec
   resolves start against the PARAGRAPH's direction, so a Latin name still lands
   on the left. The alignment has to be stated against the SHEET's direction. */
[dir='rtl'] .cms-doc-sheet [dir='auto'] { text-align: right; }

.cms-doc-table { width: 100%; border-collapse: collapse; }
/* Repeat the column headings on every printed page — a class list that spills
   onto page 2 with no headings is a page of anonymous columns. */
.cms-doc-table thead { display: table-header-group; }
.cms-doc-table tfoot { display: table-footer-group; }
.cms-doc-table tr { break-inside: avoid; page-break-inside: avoid; }
.cms-doc-table th {
  text-align: start;
  font-size: 8pt;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #4a5867;
  font-weight: 700;
  padding: 0 2.5mm 2mm 0;
  border-bottom: 0.8pt solid #101820;
}
.cms-doc-table td {
  padding: 2.2mm 2.5mm 2.2mm 0;
  border-bottom: 0.4pt solid #c9d3df;
  vertical-align: top;
}
.cms-doc-table th:last-child, .cms-doc-table td:last-child { padding-inline-end: 0; }
.cms-doc-name { font-weight: 700; }
.cms-doc-quiet { color: #4a5867; }
.cms-doc-num { font-variant-numeric: tabular-nums; white-space: nowrap; }

/* A ruled box a hand writes in — signature, time, collected-by. */
.cms-doc-write { border-bottom: 0.5pt solid #8f9dad; display: block; height: 6.5mm; }

.cms-doc-badge {
  display: inline-block;
  font-size: 8pt;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 0.6mm 1.8mm;
  border-radius: 2.5pt;
  border: 0.8pt solid currentColor;
  white-space: nowrap;
}
/* The ONE place colour survives onto paper: severity is the information. */
.cms-doc-sev-severe   { color: #9E342D; background: #FBEAE8; }
.cms-doc-sev-moderate { color: #976A18; background: #FBF1DE; }
.cms-doc-sev-mild     { color: #4a5867; background: #F1F4F8; }
.cms-doc-epipen       { color: #ffffff; background: #9E342D; border-color: #9E342D; }

.cms-doc-section { margin-top: 7mm; break-inside: avoid; page-break-inside: avoid; }
.cms-doc-section > h2 {
  font-size: 12.5pt;
  margin: 0 0 2.5mm;
  padding-bottom: 1.5mm;
  border-bottom: 0.8pt solid #101820;
}
.cms-doc-note {
  font-size: 9pt;
  color: #4a5867;
  margin: 2mm 0 0;
  padding-inline-start: 3mm;
  border-inline-start: 2pt solid #c9d3df;
}

/* ── the allergy poster: one child per page, readable across a kitchen ── */
.cms-doc-poster {
  break-after: page;
  page-break-after: always;
  padding-bottom: 6mm;
}
/* 🚨 :last-child (not :last-of-type) never matches here: the footer note
   below the poster loop ("Severe allergies and children carrying adrenaline
   only...") is always the true last child of the sheet, so the LAST
   .cms-doc-poster section is never ":last-child" and kept forcing a break —
   printing a near-blank trailing page after every allergy poster, even with
   one entry. :last-of-type matches by TAG (section), ignoring the trailing
   <p>/<footer> siblings of a different tag, which is what "the last actual
   poster" means here. */
.cms-doc-poster:last-of-type { break-after: auto; page-break-after: auto; }
@media screen {
  .cms-doc-poster:not(:last-child) {
    border-bottom: 1px dashed #c9d3df;
    margin-bottom: 10mm;
    padding-bottom: 10mm;
  }
}
.cms-doc-poster-name { font-size: 34pt; font-weight: 700; line-height: 1.05; margin: 0; }
.cms-doc-poster-allergen { font-size: 26pt; font-weight: 700; line-height: 1.1; margin: 3mm 0 0; }
.cms-doc-poster-band {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3mm;
  margin: 4mm 0 5mm;
}
.cms-doc-poster-band .cms-doc-badge { font-size: 13pt; padding: 1.6mm 4mm; border-radius: 4pt; }
.cms-doc-poster dl { margin: 0; }
.cms-doc-poster dt {
  font-size: 8.5pt;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #4a5867;
  font-weight: 700;
  margin-top: 4mm;
}
.cms-doc-poster dd { font-size: 13pt; margin: 1mm 0 0; }

/* ── name labels: cut-guide grid ── */
.cms-doc-grid { display: grid; gap: 0; border-top: 0.4pt dashed #8f9dad; }
.cms-doc-label {
  border-inline-start: 0.4pt dashed #8f9dad;
  border-bottom: 0.4pt dashed #8f9dad;
  min-height: 30mm;
  padding: 3mm;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  break-inside: avoid;
  page-break-inside: avoid;
}
.cms-doc-label:nth-child(3n) { border-inline-end: 0.4pt dashed #8f9dad; }
.cms-doc-label-name { font-size: 21pt; font-weight: 700; line-height: 1.1; }
.cms-doc-label-room { font-size: 8.5pt; color: #4a5867; margin-top: 1.5mm; }

.cms-doc-foot {
  margin-top: 7mm;
  padding-top: 2.5mm;
  border-top: 0.4pt solid #c9d3df;
  font-size: 7.5pt;
  color: #6b7887;
  display: flex;
  flex-wrap: wrap;
  gap: 4mm;
  justify-content: space-between;
}

.cms-doc-empty {
  text-align: center;
  padding: 18mm 6mm;
  color: #4a5867;
  font-size: 11pt;
}

@media print {
  html, body {
    background: #ffffff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .cms-root { background: #ffffff !important; }
  .cms-doc-screen { display: none !important; }
  .cms-doc-shell { padding: 0 !important; background: #ffffff !important; }
  .cms-doc-sheet {
    max-width: none;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }
  /* The paper's own header repeats nothing — it is the masthead, printed once.
     Column headings repeat via thead, which is the part that matters. */
}
`;
