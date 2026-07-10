/**
 * builders/tracing.ts — the letter worksheet: green-dot model with numbered
 * strokes, faint trace rows, and a word-tracing section. Uses letter-strokes.ts.
 * Ports build_week01_pack.py build_worksheet, generalised to any letter.
 */

import type { WeekSpec } from '../../spec/types';
import type { AssetMap } from '../assets';
import type { BuildOpts, BuildResult } from '../index';
import { FRAME_COLOR, KIDS_FONT, LETTER_TRACE_TINT, LETTER_BAND_TINT } from '../geometry';
import { docShell, escapeHtml } from '../html-shell';
import { letterStrokeSVG } from '../letter-strokes';

export function buildTracing(spec: WeekSpec, _assets: AssetMap, opts: BuildOpts = {}): BuildResult {
  const warnings: string[] = [];
  const letter = (spec.materials?.tracing?.letter ?? spec.sound ?? 'a').toLowerCase();
  const words = spec.materials?.tracing?.words ?? [];
  const display = spec.letterDisplay || letter;

  const css = `
.sheet{padding:12mm;}
.top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4mm;}
.top .aa{font-size:26pt;font-weight:700;font-family:${KIDS_FONT};color:${FRAME_COLOR};}
.top .nm{font-size:12pt;color:#555;font-family:${KIDS_FONT};}
.instr{font-size:12pt;color:#666;font-family:${KIDS_FONT};margin:5mm 0 2mm;}
.bigletter{text-align:center;margin:2mm 0;}
.trrow{display:flex;align-items:flex-end;gap:10mm;padding:0 6mm;height:26mm;border-top:0.3mm solid #e5e7eb;border-bottom:0.5mm solid #9ca3af;margin-bottom:4mm;}
.wordrow{display:flex;flex-wrap:wrap;gap:8mm 14mm;margin-top:3mm;}
.wtrace{position:relative;font-family:${KIDS_FONT};font-weight:700;font-size:30pt;color:${LETTER_TRACE_TINT};letter-spacing:2mm;border-bottom:0.5mm solid #9ca3af;padding:0 4mm 1mm;line-height:1.1;}
`;

  const faint = letterStrokeSVG(letter, { widthMm: 24, guides: false, bandColor: LETTER_TRACE_TINT });
  const modelSmall = letterStrokeSVG(letter, { widthMm: 24, guides: false, bandColor: LETTER_BAND_TINT });
  const traceRow = modelSmall + faint.repeat(5);

  const wordSection = words.length
    ? `<div class="instr">Trace the words.</div><div class="wordrow">` +
      words.map((w) => `<div class="wtrace">${escapeHtml(w)}</div>`).join('') + `</div>`
    : '';

  const body =
    `<div class="page sheet"><div class="top"><div class="aa">${escapeHtml(display)}</div>` +
    `<div class="nm">name ______________________</div></div>` +
    `<div class="instr">Start at the green dot. Follow the numbered arrows.</div>` +
    `<div class="bigletter">${letterStrokeSVG(letter, { widthMm: 66, guides: true })}</div>` +
    `<div class="instr">Trace.</div>` +
    `<div class="trrow">${traceRow}</div>` +
    `<div class="trrow">${traceRow}</div>` +
    wordSection +
    `</div>`;

  return {
    html: docShell({ title: `Week ${spec.week} — Tracing ${display}`, css, body, fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings,
  };
}
