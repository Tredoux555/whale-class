/**
 * render/html-shell.ts — the shared document skeleton + safety helpers.
 *
 * Pure string builders — no DOM, no fetch. Safe in Node (CLI) and the browser
 * (Studio). Every text interpolation MUST pass through escapeHtml(); every image
 * URL through sanitizeImageUrl(); every colour through hexColor().
 */

import { A4_WIDTH_CM, A4_HEIGHT_CM, KIDS_FONT } from './geometry';

/** Escape HTML special chars (own copy — no dependency on app libs). */
export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validate an image URL for use in a print doc. Unlike lib/sanitize.ts (which is
 * locked to Supabase/`/images`), the Studio hands us in-memory blob: object URLs
 * and the CLI hands us file:// paths, so those are allow-listed here. Anything
 * that is not on the list (javascript:, vbscript:, unknown schemes) returns ''.
 */
export function sanitizeImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  const u = String(url).trim();
  // Reject anything with control chars / quotes that could break out of the attr.
  if (/["'<>\s]/.test(u) && !u.startsWith('data:')) {
    // data: URLs legitimately contain no whitespace; everything else must be clean.
    if (!/^data:image\//.test(u)) return '';
  }
  const ALLOWED = [
    'blob:',                     // Studio in-memory object URLs
    'file:',                     // CLI local asset paths
    'data:image/png',            // canvas / reader exports
    'data:image/jpeg',
    'data:image/jpg',
    'data:image/webp',
    'data:image/gif',
    'data:image/svg+xml',
    'http://',
    'https://',
    '/',                          // repo-root relative (/images, /fonts, /brand)
  ];
  return ALLOWED.some((p) => u.startsWith(p)) ? u : '';
}

/** Validate a #rrggbb / #rgb colour; fall back to a safe default. */
export function hexColor(c: string | undefined | null, fallback = '#000000'): string {
  if (!c) return fallback;
  const v = String(c).trim();
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ? v : fallback;
}

/** @font-face block for the bundled Andika TTFs. */
export function fontFaceCss(fontBaseUrl: string): string {
  const base = fontBaseUrl.replace(/\/$/, '');
  return `
@font-face{font-family:'Andika';src:url('${base}/Andika-Regular.ttf') format('truetype');font-weight:400;font-style:normal;font-display:swap;}
@font-face{font-family:'Andika';src:url('${base}/Andika-Bold.ttf') format('truetype');font-weight:700;font-style:normal;font-display:swap;}
`;
}

/** The shared reset + A4 page frame + print colour-adjust. */
export function baseResetCss(): string {
  return `
*{margin:0;padding:0;box-sizing:border-box;}
@page{size:A4;margin:0;}
html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
body{font-family:${KIDS_FONT};background:white;position:relative;}
.page{page-break-after:always;width:${A4_WIDTH_CM}cm;height:${A4_HEIGHT_CM}cm;position:relative;overflow:hidden;}
.page:last-child{page-break-after:auto;}
.page-title{font-size:10pt;color:#999;margin-bottom:0.4cm;text-align:center;}
@media print{.page-title{display:none;}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}}
@media screen{body{padding:20px;background:#f0f0f0;}.page{background:white;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.12);}}
`;
}

export interface DocShellOpts {
  title: string;
  css: string;
  body: string;
  fontBaseUrl?: string;
  /** Emit the auto-print script (window-open Print flow). Preview iframes omit it. */
  autoPrint?: boolean;
  /** Skip the shared reset (book supplies its own @page). */
  ownReset?: boolean;
}

/** Wrap a body + css fragment into a complete, standalone print document. */
export function docShell(opts: DocShellOpts): string {
  const fontBaseUrl = opts.fontBaseUrl ?? '/fonts';
  const reset = opts.ownReset ? '' : baseResetCss();
  const printScript = opts.autoPrint
    ? `<script>window.onload=function(){setTimeout(function(){window.print();},500);};</script>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(opts.title)}</title>
<style>${fontFaceCss(fontBaseUrl)}${reset}${opts.css}</style>
</head>
<body>
${opts.body}
${printScript}
</body>
</html>`;
}

/** Emoji fallbacks for common Level-1 vocab (used when an image asset is missing). */
const PLACEHOLDER_EMOJI: Record<string, string> = {
  apple: '🍎', egg: '🥚', ant: '🐜', cat: '🐈', dog: '🐕', pig: '🐖', hen: '🐔',
  rat: '🐀', bug: '🐛', duck: '🦆', fox: '🦊', sun: '☀️', cup: '🥤', bus: '🚌',
  hat: '🎩', bag: '🎒', box: '📦', jam: '🍓', jug: '🫗', map: '🗺️', pot: '🍲',
  bed: '🛏️', net: '🥅', pen: '🖊️', web: '🕸️', log: '🪵', leg: '🦵', fig: '🫐',
  fan: '🪭', van: '🚐', vet: '🩺', yam: '🍠', zip: '🤐', potato: '🥔', book: '📖',
  chair: '🪑', table: '🪑', mat: '🟫', pencil: '✏️', man: '🧑', pin: '📌', top: '🔝',
};

/** A grey placeholder tile with an emoji hint + the word — never throws. */
export function placeholderTile(word: string): string {
  const emoji = PLACEHOLDER_EMOJI[word.toLowerCase()] ?? '🖼️';
  return `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f3f4f6;color:#9ca3af;text-align:center;gap:4px;">`
    + `<div style="font-size:min(40%,48px);line-height:1;">${emoji}</div>`
    + `<div style="font-size:11pt;font-family:${KIDS_FONT};">${escapeHtml(word)}</div>`
    + `</div>`;
}
