/**
 * builders/vowel-wall.ts — full-page classroom wall posters.
 *
 * Per-level (contract B3), keyed on `spec.level` — NEVER on sound length:
 *   - Level 1  → the original 5-vowel wall (vowels Montessori blue, consonants
 *                frame green, the lit vowel always included). BYTE-IDENTICAL.
 *   - Level 2/3 → the "Pattern Tree": Level-1 letters are the trunk/roots, Level 2
 *                fills the LEFT branches (16 leaves sh→tch/dge), Level 3 the RIGHT
 *                branches/canopy (16 leaves ai/ay→-tion). W50 = Mirror Leaf
 *                (ship|sheep), W58 = potato crown. The leaf schedule is DATA.
 * Ports build_week01_pack.py build_vowel_wall, generalised.
 */

import type { WeekSpec } from '../../spec/types';
import type { AssetMap } from '../assets';
import type { BuildOpts, BuildResult } from '../index';
import { VOWEL_BLUE, FRAME_COLOR, KIDS_FONT, VOWELS, BOOK_GOLD, BOOK_EMERALD } from '../geometry';
import { docShell, escapeHtml } from '../html-shell';

export function buildVowelWall(spec: WeekSpec, _assets: AssetMap, opts: BuildOpts = {}): BuildResult {
  if ((spec.level ?? 1) >= 2) return buildPatternWall(spec, opts);

  // ── Level 1 vowel wall — UNCHANGED (byte-identical) ──────────────────────
  const warnings: string[] = [];
  const isVowel = (c: string) => (VOWELS as readonly string[]).includes(c.toLowerCase());

  // Poster set: the week's letter + this week's lit vowel (deduped).
  const letters: string[] = [];
  const push = (c?: string | null) => {
    const v = (c || '').toLowerCase();
    // Allow 1–2 char sounds so W25 "qu" gets its own poster (not just single letters).
    if (v && /^[a-z]{1,2}$/.test(v) && !letters.includes(v)) letters.push(v);
  };
  push(spec.sound);
  push(spec.vowelLights);
  // Vowel-wall celebration week → show all five vowels together.
  if (spec.celebration && /vowel wall complete/i.test(spec.celebration)) {
    for (const v of VOWELS) push(v);
  }
  if (letters.length === 0) push('a');

  const css = `
.v{display:flex;flex-direction:column;align-items:center;justify-content:center;height:29.7cm;}
.vl{font-size:170mm;font-weight:700;font-family:${KIDS_FONT};line-height:1;}
.vc{font-size:14pt;color:#999;letter-spacing:6px;font-family:system-ui;margin-top:4mm;}
`;

  const pages = letters.map((c) => {
    const vowel = isVowel(c);
    const color = vowel ? VOWEL_BLUE : FRAME_COLOR;
    const caption = vowel ? 'VOWEL' : 'SOUND';
    return `<div class="page v"><div class="vl" style="color:${color};">${escapeHtml(c)}</div><div class="vc">${caption}</div></div>`;
  });

  return {
    html: docShell({ title: `Week ${spec.week} — Wall Posters`, css, body: pages.join(''), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings,
  };
}

// ── Pattern Wall (Level 2/3) ───────────────────────────────────────────────

/**
 * The leaf schedule (DATA, sourced from MASTER_SPINE's Level 2/3 grids). Keyed by
 * week → the leaf label the class earns that week. Level 2 = W27–42 (left
 * branches), Level 3 = W43–58 (right branches/canopy).
 */
const PATTERN_LEAVES: Record<number, string> = {
  27: 'sh', 28: 'ch', 29: 'th', 30: 'ck+FLSZ', 31: 'ng', 32: 'wh',
  33: 's-bl', 34: 'l-bl', 35: 'r-bl', 36: 'fin-I', 37: 'fin-II',
  38: 'a_e', 39: 'i_e', 40: 'o_e', 41: 'u_e/e_e', 42: 'softc/g+tch/dge',
  43: 'ai/ay', 44: 'ee/ea', 45: 'oa/ow', 46: 'igh/ie', 47: 'ar',
  48: 'or/ore', 49: 'er/ir/ur', 50: 'MIRROR', 51: 'oo', 52: 'ou/ow',
  53: 'oi/oy', 54: 'ew/ue/au/aw', 55: 'y', 56: 'kn/wr/mb', 57: '-ing/-ed/-s', 58: '-tion',
};

const L2_WEEKS = Array.from({ length: 16 }, (_, i) => 27 + i); // 27..42
const L3_WEEKS = Array.from({ length: 16 }, (_, i) => 43 + i); // 43..58

function buildPatternWall(spec: WeekSpec, opts: BuildOpts = {}): BuildResult {
  const warnings: string[] = [];
  const week = spec.week;
  const display = spec.patternDisplay ?? spec.sound ?? PATTERN_LEAVES[week] ?? '';
  const isMorphology = spec.soundType === 'morphology';

  const css = `
*{box-sizing:border-box;}
.pw{display:flex;flex-direction:column;align-items:center;justify-content:center;height:29.7cm;padding:12mm;}
.pw .kick{font-size:14pt;letter-spacing:6px;color:#9ca3af;font-family:system-ui;text-transform:uppercase;}
.pw .big{font-size:150mm;font-weight:700;font-family:${KIDS_FONT};line-height:1;color:${FRAME_COLOR};}
.pw .cap{font-size:14pt;color:#999;letter-spacing:6px;font-family:system-ui;margin-top:2mm;}
.tree{padding:12mm;}
.tree h1{text-align:center;font-family:${KIDS_FONT};color:${FRAME_COLOR};font-size:24pt;margin:0 0 2mm;}
.tree .sub{text-align:center;color:#9ca3af;font-family:system-ui;font-size:11pt;letter-spacing:3px;margin-bottom:6mm;text-transform:uppercase;}
.crown{text-align:center;font-family:${KIDS_FONT};font-size:16pt;color:${BOOK_GOLD};margin-bottom:4mm;}
.branches{display:flex;gap:6mm;}
.col{flex:1;display:flex;flex-direction:column;gap:3mm;}
.col h2{font-family:system-ui;font-size:10pt;letter-spacing:2px;color:#9ca3af;text-transform:uppercase;text-align:center;margin:0 0 2mm;}
.leaf{display:flex;justify-content:space-between;align-items:center;border:0.5mm solid #d1d5db;border-radius:3mm;padding:2.5mm 4mm;font-family:${KIDS_FONT};font-size:12pt;color:#9ca3af;}
.leaf .wk{font-size:9pt;color:#c4c9d0;font-family:system-ui;}
.leaf.earned{border-color:${BOOK_EMERALD};color:${FRAME_COLOR};background:rgba(52,211,153,0.08);}
.leaf.current{border-color:${BOOK_GOLD};color:#7a5b00;background:rgba(232,201,106,0.16);border-width:0.9mm;}
.leaf.mirror.earned{border-color:${VOWEL_BLUE};color:${VOWEL_BLUE};background:rgba(36,86,199,0.08);}
.trunk{margin-top:6mm;text-align:center;font-family:system-ui;font-size:10pt;letter-spacing:3px;color:#9ca3af;border-top:0.5mm solid #e5e7eb;padding-top:4mm;}
`;

  // Page 1 — the week's earned pattern (the leaf), poster-size.
  const poster =
    `<div class="page pw"><div class="kick">${escapeHtml(
      isMorphology ? 'THE ENDING' : 'THE PATTERN',
    )}</div>` +
    `<div class="big">${escapeHtml(display)}</div>` +
    `<div class="cap">${escapeHtml((PATTERN_LEAVES[week] ?? display).toUpperCase())}</div></div>`;

  // Page 2 — the Pattern Tree. Leaves ≤ this week are "earned"; this week is "current".
  const leafRow = (wk: number) => {
    const label = PATTERN_LEAVES[wk] ?? '';
    const state = wk === week ? 'current' : wk < week ? 'earned' : '';
    const mirror = wk === 50 ? ' mirror' : '';
    const crown = wk === 58 && week >= 58 ? ' 👑' : '';
    return `<div class="leaf ${state}${mirror}"><span>${escapeHtml(label)}${crown}</span><span class="wk">W${wk}</span></div>`;
  };

  const crownLine = week >= 58
    ? `<div class="crown">👑 POTATO — crowned atop the tree</div>`
    : '';

  const tree =
    `<div class="page tree"><h1>The Pattern Tree</h1>` +
    `<div class="sub">Level 1 letters = roots · Level 2 = left branches · Level 3 = canopy</div>` +
    crownLine +
    `<div class="branches">` +
    `<div class="col"><h2>Level 2 · left branches</h2>${L2_WEEKS.map(leafRow).join('')}</div>` +
    `<div class="col"><h2>Level 3 · canopy</h2>${L3_WEEKS.map(leafRow).join('')}</div>` +
    `</div>` +
    `<div class="trunk">A B C D E F G H I J K L M N O P Q R S T U V W X Y Z — the roots</div>` +
    `</div>`;

  return {
    html: docShell({ title: `Week ${spec.week} — Pattern Wall`, css, body: poster + tree, fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings,
  };
}
