/**
 * builders/tracing.ts — the letter worksheet: green-dot model with numbered
 * strokes, faint trace rows, and a word-tracing section. Uses letter-strokes.ts.
 * Ports build_week01_pack.py build_worksheet, generalised to any letter.
 *
 * TWO modes, ONE builder (contract B2):
 *   - 'letters' (default, Level 1) — the original per-glyph stroke worksheet.
 *     Absent `materials.tracing.mode` = 'letters' = BYTE-IDENTICAL Level 1 output.
 *   - 'pattern' (Level 2/3) — a colour-coded Montessori pattern card: pattern
 *     letters RED, frame letters BLACK, silent letters GREY (soft halo). The
 *     glyphs are still the a–z stroke-arrows from letter-strokes.ts (patterns are
 *     compositions of existing letters — no new glyph art).
 */

import type { WeekSpec } from '../../spec/types';
import type { AssetMap } from '../assets';
import type { BuildOpts, BuildResult } from '../index';
import { FRAME_COLOR, KIDS_FONT, LETTER_TRACE_TINT, LETTER_BAND_TINT } from '../geometry';
import { docShell, escapeHtml } from '../html-shell';
import { letterStrokeSVG } from '../letter-strokes';

// Pattern-card presentation colours (Level 2/3 only — never touch Level 1 output).
const PATTERN_RED = '#c0392b';   // the pattern grapheme (the sound being taught)
const FRAME_INK = '#1f2937';     // the surrounding frame-word letters
const SILENT_GREY = '#9ca3af';   // silent letters (a_e's e, kn's k, wr's w, mb's b)

export function buildTracing(spec: WeekSpec, _assets: AssetMap, opts: BuildOpts = {}): BuildResult {
  const mode = spec.materials?.tracing?.mode ?? 'letters';
  if (mode === 'pattern') return buildPatternTracing(spec, opts);

  // ── Level 1 letters mode — UNCHANGED (byte-identical) ────────────────────
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

// ── Pattern-card mode (Level 2/3) ──────────────────────────────────────────

type Role = 'pattern' | 'frame' | 'silent';

/**
 * Which single letter within a contiguous pattern is silent (data-driven — no
 * per-word hardcoding). Split patterns (a_e etc.) handle silence via the `_`.
 */
const SILENT_IN_PATTERN: Record<string, string> = { kn: 'k', wr: 'w', mb: 'b' };

const colorFor = (role: Role) =>
  role === 'pattern' ? PATTERN_RED : role === 'silent' ? SILENT_GREY : FRAME_INK;

/**
 * Classify each character of `word` as pattern / frame / silent, given the
 * pattern string (which may contain `_` as the magic-e frame-slot marker).
 * Purely positional — good enough for a worksheet, no phonetics engine.
 */
function classifyWord(pattern: string, word: string): Role[] {
  const w = word.toLowerCase();
  const roles: Role[] = new Array(w.length).fill('frame');

  if (pattern.includes('_')) {
    // Magic-e style: head vowel (pronounced) + frame consonant(s) + trailing 'e'
    // (silent). e.g. "a_e" over "cake" → c(frame) a(pattern) k(frame) e(silent).
    const [head, tail] = pattern.split('_');
    const tailIdx = tail ? w.lastIndexOf(tail) : -1;
    if (tailIdx >= 0) {
      for (let k = 0; k < tail.length; k++) roles[tailIdx + k] = 'silent';
      const headIdx = head ? w.lastIndexOf(head, tailIdx - 1) : -1;
      if (headIdx >= 0) for (let k = 0; k < head.length; k++) roles[headIdx + k] = 'pattern';
    }
    return roles;
  }

  // Contiguous pattern (sh, ch, igh, kn, mb, tch …).
  const idx = w.indexOf(pattern);
  if (idx >= 0) {
    for (let k = 0; k < pattern.length; k++) roles[idx + k] = 'pattern';
    const silentChar = SILENT_IN_PATTERN[pattern];
    if (silentChar) {
      const sIdx = w.indexOf(silentChar, idx);
      if (sIdx >= 0 && sIdx < idx + pattern.length) roles[sIdx] = 'silent';
    }
  }
  return roles;
}

/** Per-character roles for the pattern's OWN display (excludes the `_` slot). */
function classifyPatternGlyphs(pattern: string): { char: string; role: Role; slot?: boolean }[] {
  if (pattern.includes('_')) {
    const [head, tail] = pattern.split('_');
    const out: { char: string; role: Role; slot?: boolean }[] = [];
    for (const c of head) out.push({ char: c, role: 'pattern' });
    out.push({ char: '', role: 'frame', slot: true }); // the frame-slot marker
    for (const c of tail) out.push({ char: c, role: 'silent' });
    return out;
  }
  const silentChar = SILENT_IN_PATTERN[pattern];
  return pattern.split('').map((c) => ({ char: c, role: silentChar === c ? 'silent' : 'pattern' as Role }));
}

/** A colour-coded word, letter by letter, as tracing text (silent letters haloed). */
function colorWord(pattern: string, word: string): string {
  const roles = classifyWord(pattern, word);
  return word
    .split('')
    .map((ch, i) => {
      const role = roles[i] ?? 'frame';
      const cls = role === 'silent' ? ' silent' : '';
      return `<span class="pl${cls}" style="color:${colorFor(role)};">${escapeHtml(ch)}</span>`;
    })
    .join('');
}

function buildPatternTracing(spec: WeekSpec, opts: BuildOpts = {}): BuildResult {
  const warnings: string[] = [];
  const pattern = (spec.materials?.tracing?.letter ?? spec.patternDisplay ?? spec.sound ?? '').toLowerCase();
  const words = spec.materials?.tracing?.words ?? [];
  const display = spec.patternDisplay ?? spec.letterDisplay ?? pattern;

  const css = `
.sheet{padding:12mm;}
.top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4mm;}
.top .aa{font-size:26pt;font-weight:700;font-family:${KIDS_FONT};color:${PATTERN_RED};}
.top .nm{font-size:12pt;color:#555;font-family:${KIDS_FONT};}
.instr{font-size:12pt;color:#666;font-family:${KIDS_FONT};margin:5mm 0 2mm;}
.pcard{display:flex;justify-content:center;align-items:flex-end;gap:2mm;margin:2mm 0 4mm;}
.pg{display:inline-block;}
.pg.silent{filter:drop-shadow(0 0 1.4mm rgba(156,163,175,0.85));}
.slot{width:22mm;height:2mm;border-bottom:0.8mm dashed ${SILENT_GREY};margin:0 2mm 8mm;}
.legend{display:flex;justify-content:center;gap:10mm;font-size:11pt;font-family:${KIDS_FONT};color:#555;margin-bottom:4mm;}
.legend b{font-weight:700;}
.wordrow{display:flex;flex-wrap:wrap;gap:8mm 14mm;margin-top:3mm;}
.wtrace{position:relative;font-family:${KIDS_FONT};font-weight:700;font-size:30pt;letter-spacing:2mm;border-bottom:0.5mm solid #9ca3af;padding:0 4mm 1mm;line-height:1.1;}
.pl{}
.pl.silent{text-shadow:0 0 1.4mm rgba(156,163,175,0.9);}
`;

  // The pattern card: big colour-coded glyphs (with the frame slot for magic-e).
  const glyphCells = classifyPatternGlyphs(pattern).map((g) => {
    if (g.slot) return `<span class="slot"></span>`;
    const color = colorFor(g.role);
    const svg = letterStrokeSVG(g.char, { widthMm: 30, guides: true, bandColor: color, guideColor: color });
    return `<span class="pg${g.role === 'silent' ? ' silent' : ''}">${svg}</span>`;
  }).join('');

  const wordSection = words.length
    ? `<div class="instr">Trace the words. The red sound is the pattern.</div><div class="wordrow">` +
      words.map((w) => `<div class="wtrace">${colorWord(pattern, w)}</div>`).join('') + `</div>`
    : '';

  const body =
    `<div class="page sheet"><div class="top"><div class="aa">${escapeHtml(display)}</div>` +
    `<div class="nm">name ______________________</div></div>` +
    `<div class="instr">This week's pattern. Start each letter at the green dot; follow the arrows.</div>` +
    `<div class="pcard">${glyphCells}</div>` +
    `<div class="legend"><span><b style="color:${PATTERN_RED};">red</b> = the pattern</span>` +
    `<span><b style="color:${FRAME_INK};">black</b> = the word</span>` +
    `<span><b style="color:${SILENT_GREY};">grey</b> = silent</span></div>` +
    wordSection +
    `</div>`;

  return {
    html: docShell({ title: `Week ${spec.week} — Pattern ${display}`, css, body, fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings,
  };
}
