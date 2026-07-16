/**
 * builders/qr-cards.ts — song QR cards (scan → hosted song). Uses the repo
 * `qrcode` package via its SYNCHRONOUS create() API (builders must stay pure and
 * synchronous), rendering the module matrix straight to inline SVG.
 */

import type { WeekSpec } from '../../spec/types';
import type { AssetMap } from '../assets';
import type { BuildOpts, BuildResult } from '../index';
import QRCode from 'qrcode';
import { FRAME_COLOR, INK, KIDS_FONT, BOOK_FOREST, BOOK_GOLD } from '../geometry';
import { docShell, escapeHtml } from '../html-shell';

interface QrMatrix { size: number; data: ArrayLike<number>; }

/** Synchronous QR → inline SVG (no async, works in Node + browser). */
function qrSvg(text: string, sizePx: number): string {
  // QRCode.create is synchronous and returns a bit matrix.
  const qr = QRCode.create(text, { errorCorrectionLevel: 'H' });
  const mods = qr.modules as unknown as QrMatrix;
  const size = mods.size;
  const data = mods.data;
  const cell = sizePx / size;
  let rects = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (data[r * size + c]) {
        rects += `<rect x="${(c * cell).toFixed(2)}" y="${(r * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}"/>`;
      }
    }
  }
  return `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 ${sizePx} ${sizePx}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${sizePx}" height="${sizePx}" fill="#ffffff"/><g fill="${INK}">${rects}</g></svg>`;
}

export function buildQrCards(spec: WeekSpec, _assets: AssetMap, opts: BuildOpts = {}): BuildResult {
  const warnings: string[] = [];
  const songs = spec.songs ?? [];

  const css = `
.sheet{padding:12mm;}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8mm;}
.card{border:0.6mm solid ${FRAME_COLOR};border-radius:5mm;padding:8mm;display:flex;flex-direction:column;align-items:center;gap:5mm;height:120mm;justify-content:center;text-align:center;background:${BOOK_FOREST};}
.card .role{color:${BOOK_GOLD};font-size:11pt;letter-spacing:3px;text-transform:uppercase;font-family:system-ui;}
.card .title{color:#fff;font-size:20pt;font-weight:700;font-family:${KIDS_FONT};}
.card .qrwrap{background:#fff;padding:4mm;border-radius:3mm;}
.card .hint{color:rgba(255,255,255,0.55);font-size:10pt;font-family:${KIDS_FONT};}
.card .soon{color:rgba(255,255,255,0.5);font-size:13pt;font-family:${KIDS_FONT};padding:14mm 0;}
`;

  const card = (title: string, role: string, url?: string): string => {
    const head = `<div class="role">${escapeHtml(role)} song</div><div class="title">${escapeHtml(title)}</div>`;
    if (url) {
      return `<div class="card">${head}<div class="qrwrap">${qrSvg(url, 200)}</div><div class="hint">Scan to sing along</div></div>`;
    }
    warnings.push(`qr_cards: "${title}" has no audioUrl yet — placeholder rendered.`);
    return `<div class="card">${head}<div class="soon">🎵 Song coming soon</div><div class="hint">Produce in Suno, then add audioUrl</div></div>`;
  };

  const cards = songs.map((s) => card(s.title, s.role, s.audioUrl));

  const pages: string[] = [];
  if (cards.length === 0) {
    pages.push(`<div class="page"><div class="page-title">No songs for this week.</div></div>`);
  } else {
    for (let i = 0; i < cards.length; i += 4) {
      pages.push(`<div class="page sheet"><div class="grid">${cards.slice(i, i + 4).join('')}</div></div>`);
    }
  }

  return {
    html: docShell({ title: `${spec.displayName || `Week ${spec.week}`} — Song QR Cards`, css, body: pages.join(''), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings,
  };
}
