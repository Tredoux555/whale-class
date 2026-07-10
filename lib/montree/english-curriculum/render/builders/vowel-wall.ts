/**
 * builders/vowel-wall.ts — full-page letter posters for the classroom wall.
 * Vowels print in Montessori blue; consonants in the frame green. The week's
 * lit vowel (vowelLights) is always included. Ports build_week01_pack.py
 * build_vowel_wall, generalised.
 */

import type { WeekSpec } from '../../spec/types';
import type { AssetMap } from '../assets';
import type { BuildOpts, BuildResult } from '../index';
import { VOWEL_BLUE, FRAME_COLOR, KIDS_FONT, VOWELS } from '../geometry';
import { docShell, escapeHtml } from '../html-shell';

export function buildVowelWall(spec: WeekSpec, _assets: AssetMap, opts: BuildOpts = {}): BuildResult {
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
