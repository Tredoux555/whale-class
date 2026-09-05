// lib/montree/print/print-window.ts
//
// The house print pipeline, in one place: a tool builds a complete HTML
// document as a string (with its own inline @page / @media print CSS) and
// hands it here; this opens it in a new window, writes it, and prints.
//
// Same shape as every existing tool page (phonics-fast, bingo, card
// generator) — window.open + document.write + print() — so a printed sheet
// behaves identically wherever it came from.

/** Returns false when the browser blocked the pop-up. */
export function printHtmlDocument(html: string, delayMs = 300): boolean {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), delayMs);
  return true;
}
