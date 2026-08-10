// lib/montree/photo-onboarding/document-text.ts
//
// Turn an uploaded DOCX or XLSX into plain text for the extractor, and
// downscale an uploaded photo so a 12-megapixel phone shot doesn't cost more
// than the whole feature is worth.
//
// PDFs are deliberately NOT handled here — they go to the model as a document
// content block so scanned lists (no text layer) still work. See extractor.ts.
//
// Pure-JS only, no system binaries (Railway Node buildpack):
//   DOCX → mammoth (already a dependency)
//   XLSX → SheetJS (xlsx)
//   photo → sharp (already a dependency)

import sharp from 'sharp';

/** Longest edge we send to the model. Handwriting stays legible well below this. */
const MAX_IMAGE_EDGE = 2000;
const JPEG_QUALITY = 82;

/** Guard against a spreadsheet with 50k blank rows. */
const MAX_SHEET_ROWS = 2000;
const MAX_SHEET_COLS = 40;

/**
 * Resize + re-encode a photo to JPEG. Falls back to the original bytes if
 * sharp can't read it (an odd HEIC variant, a truncated upload) — the model
 * gets a shot at it either way rather than the teacher getting a hard failure.
 */
export async function prepareImage(
  buffer: Buffer
): Promise<{ base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' }> {
  try {
    const out = await sharp(buffer)
      .rotate() // honour EXIF orientation — a sideways list reads badly
      .resize({ width: MAX_IMAGE_EDGE, height: MAX_IMAGE_EDGE, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
    return { base64: out.toString('base64'), mediaType: 'image/jpeg' };
  } catch (err) {
    console.warn('[PhotoOnboarding] sharp could not process the image, sending original:', err);
    return { base64: buffer.toString('base64'), mediaType: 'image/jpeg' };
  }
}

/** DOCX → plain text via mammoth. Throws with a readable message on failure. */
export async function docxToText(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  const text = (result?.value || '').trim();
  if (!text) throw new Error('The Word document contained no readable text');
  return text;
}

/**
 * XLSX → tab-separated text, every sheet, with a header line per sheet.
 *
 * We send ALL sheets rather than just the first: schools routinely keep the
 * roster on a second tab behind a cover sheet, and a silently-empty import is
 * a worse failure than a few extra tokens.
 */
export async function xlsxToText(buffer: Buffer): Promise<string> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });

  const chunks: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,      // formatted strings — dates come out readable, not serial numbers
      defval: '',
      blankrows: false,
    });

    const lines: string[] = [];
    for (const row of rows.slice(0, MAX_SHEET_ROWS)) {
      const cells = (Array.isArray(row) ? row : []).slice(0, MAX_SHEET_COLS)
        .map((c) => (c == null ? '' : String(c).replace(/[\t\r\n]+/g, ' ').trim()));
      if (cells.every((c) => c === '')) continue;
      lines.push(cells.join('\t'));
    }

    if (lines.length > 0) {
      chunks.push(`--- Sheet: ${sheetName} ---\n${lines.join('\n')}`);
    }
  }

  const text = chunks.join('\n\n').trim();
  if (!text) throw new Error('The spreadsheet contained no readable rows');
  return text;
}
