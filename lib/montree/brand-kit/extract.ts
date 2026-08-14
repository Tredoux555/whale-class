'use client';

// lib/montree/brand-kit/extract.ts
// ============================================================================
// READING A LOGO, AND DECIDING WHAT MAY TOUCH PAPER.
// ============================================================================
// Ported from the founder-approved prototype (`proof/school-brand-kit.html`)
// with the binning, the contrast solving and every guard intact. Three stages,
// in order:
//
//   1 · colour math       pure, no DOM        (rgb↔hsl, WCAG luminance, solving)
//   2 · palette extraction one offscreen canvas (logo pixels → dominant + accent)
//   3 · theme derivation  pure, no DOM        (brand colours → print-safe tokens)
//
// 🚨 CLIENT-ONLY, AND THAT IS THE DESIGN. Extraction needs a canvas, and the
// alternative — shipping an image decoder to the server so it can do the same
// job more slowly — buys nothing: the answer is stored (see types.ts), so this
// runs once, in the browser of the person who chose the logo, at the moment
// they chose it. The server never re-derives; it validates and stores.
//
// 🚨 NOTHING HERE THROWS ON A BAD IMAGE. A cross-origin bitmap, a 4-pixel
// favicon and a fully transparent PNG all return a graphite fallback palette
// with a note explaining itself, because a settings screen that says "this mark
// is monochrome, here is what it will look like" is useful and one that throws
// is not.

import {
  BRAND_KIT_VERSION,
  type BrandIntensity,
  type BrandKit,
  type BrandTokens,
} from './types';

// ══════════════════════════════════════════════════════════════════════════
// PART 1 — COLOUR MATH
// ══════════════════════════════════════════════════════════════════════════

export interface Hsl {
  h: number; // degrees, 0–360
  s: number; // 0–1
  l: number; // 0–1
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** sRGB 0–255 → HSL with h in degrees 0–360, s/l in 0–1. */
export function rgbToHsl(r: number, g: number, b: number): Hsl {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

const toHex = (n: number): string => n.toString(16).padStart(2, '0');

export function hslToHex(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRgb(h, s, l);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** `#RRGGBB` → HSL. Used to re-derive tokens from a STORED kit when a school
 *  changes intensity without re-uploading their logo. */
export function hexToHsl(hex: string): Hsl {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return { h: 214, s: 0.06, l: 0.2 }; // the graphite fallback, again
  const int = parseInt(m[1], 16);
  return rgbToHsl((int >> 16) & 255, (int >> 8) & 255, int & 255);
}

/** WCAG 2.1 relative luminance. */
function relativeLuminance(r: number, g: number, b: number): number {
  const f = (v: number): number => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Contrast of a colour against white paper. White is the only background a
 *  printed sheet ever has, so there is no second parameter. */
export function contrastOnWhite(h: number, s: number, l: number): number {
  const { r, g, b } = hslToRgb(h, s, l);
  return 1.05 / (relativeLuminance(r, g, b) + 0.05);
}

/**
 * Solve for the LIGHTNESS at which (h, s) hits a target contrast on white.
 *
 * Contrast on white is monotonically decreasing in L for a fixed hue and
 * saturation, so a 22-step bisection is exact to well under one 8-bit level —
 * and, unlike "darken by 30%", it gives the same legibility for a pale yellow
 * and a deep navy. That single property is what makes the whole kit safe: a
 * school with a neon logo and a school with a near-black one get sheets that
 * are equally readable, without anybody eyeballing either.
 */
export function solveLightnessForContrast(h: number, s: number, target: number): number {
  let lo = 0.02;
  let hi = 0.98;
  if (contrastOnWhite(h, s, lo) < target) return lo; // unreachable even at black
  if (contrastOnWhite(h, s, hi) > target) return hi; // already dark enough at white
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    if (contrastOnWhite(h, s, mid) >= target) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Shortest angular distance between two hues, 0–180. */
function hueDistance(a: number, b: number): number {
  const d = Math.abs(((((a - b) % 360) + 360) % 360));
  return d > 180 ? 360 - d : d;
}

// ══════════════════════════════════════════════════════════════════════════
// PART 2 — PALETTE EXTRACTION
// ══════════════════════════════════════════════════════════════════════════

export interface PaletteSwatch extends Hsl {
  hex: string;
  /** Share of sampled ink this swatch accounts for, 0–1. */
  share: number;
}

export interface BrandPalette {
  dominant: Hsl & { hex: string };
  accent: Hsl & { hex: string };
  swatches: PaletteSwatch[];
  isMonochrome: boolean;
  accentDerived: boolean;
  chromaticShare: number;
  /** Number of ink pixels the decision was made from. */
  sampled: number;
  /** One sentence for a human, already written. Empty when there is nothing
   *  worth saying. */
  note: string;
}

const EXTRACT_DEFAULTS = {
  /** Long edge of the analysis bitmap. Big enough that a thin gold rule
   *  survives, small enough that ~30k pixels is the whole cost. Larger is NOT
   *  better: downsampling averages neighbours, and averaging red beside blue
   *  invents a purple that is in nobody's brand. */
  maxSide: 192,
  /** Anti-aliased edge pixels are the single biggest source of invented
   *  colours — a gold logo on transparency has a halo of half-opaque olive. */
  minAlpha: 200,
  /** Paper, not brand. Also catches the white card most logos are exported on. */
  whiteL: 0.94,
  whiteS: 0.15,
  /** Below this saturation a pixel is treated as neutral, not as a hue. */
  chromaFloor: 0.12,
  /** Under this share of chromatic ink the mark is read as monochrome. */
  monochromeShare: 0.1,
  /** Hue bins. 15° keeps orange and gold apart without splitting a gradient. */
  hueBins: 24,
};

export type ExtractSource = HTMLImageElement | HTMLCanvasElement;

interface Bin {
  n: number;
  sin: number;
  cos: number;
  s: number;
  l: number;
}

interface ScoredBin extends Hsl {
  n: number;
  weight: number;
  hex?: string;
}

/**
 * The palette read. Takes a LOADED image (or a canvas) and returns the two
 * colours a person would point at if you asked "what colour is this logo?".
 */
export function extractBrandPalette(
  source: ExtractSource,
  options?: Partial<typeof EXTRACT_DEFAULTS>
): BrandPalette {
  const o = { ...EXTRACT_DEFAULTS, ...(options || {}) };

  // ── 1 · downsample ───────────────────────────────────────────────────────
  const sw = (source as HTMLImageElement).naturalWidth || source.width;
  const sh = (source as HTMLImageElement).naturalHeight || source.height;
  if (!sw || !sh) return fallbackPalette('That image has no readable size.');

  const scale = Math.min(1, o.maxSide / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));

  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx) return fallbackPalette('This browser would not give us a canvas to read with.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    // A tainted canvas. Should never happen — the settings screen reads the
    // file the teacher just picked as a data URL — but a themed sheet is not
    // worth an exception on a settings page.
    return fallbackPalette('The logo could not be read (cross-origin image).');
  }

  // ── 2 · sort every pixel into chromatic bins or the neutral pile ──────────
  const bins = new Map<string, Bin>();
  let chromatic = 0;
  let neutralCount = 0;
  let neutralHueSin = 0;
  let neutralHueCos = 0;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < o.minAlpha) continue; // transparency and its halo
    const { h: ph, s: ps, l: pl } = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    if (pl > o.whiteL && ps < o.whiteS) continue; // the paper the logo sits on
    if (pl < 0.02) {
      neutralCount++; // pure black carries no hue to borrow
      continue;
    }

    if (ps < o.chromaFloor) {
      neutralCount++;
      // A black mark is rarely pure black; keep its faint cast so the derived
      // graphite leans the same way the logo does.
      neutralHueSin += Math.sin((ph * Math.PI) / 180) * ps;
      neutralHueCos += Math.cos((ph * Math.PI) / 180) * ps;
      continue;
    }

    chromatic++;
    const hueBin = Math.floor(ph / (360 / o.hueBins));
    const satBin = ps < 0.34 ? 0 : ps < 0.67 ? 1 : 2;
    const litBin = pl < 0.33 ? 0 : pl < 0.66 ? 1 : 2;
    const key = `${hueBin}:${satBin}:${litBin}`;

    let bin = bins.get(key);
    if (!bin) {
      bin = { n: 0, sin: 0, cos: 0, s: 0, l: 0 };
      bins.set(key, bin);
    }
    bin.n++;
    bin.sin += Math.sin((ph * Math.PI) / 180);
    bin.cos += Math.cos((ph * Math.PI) / 180);
    bin.s += ps;
    bin.l += pl;
  }

  const ink = chromatic + neutralCount;
  if (ink < 24) return fallbackPalette('The logo is almost entirely white or transparent.');

  const chromaticShare = chromatic / ink;

  // ── 3 · score the bins ───────────────────────────────────────────────────
  // Area alone crowns whatever colour the biggest flat shape happens to be —
  // usually a muddy mid-grey-blue. Two multipliers fix that:
  //   vividness  a saturated colour is what a person calls "the brand colour"
  //   midtone    near-black and near-white pixels are shadow, edge and paper
  const scored: ScoredBin[] = [];
  bins.forEach((bin) => {
    const meanH = ((Math.atan2(bin.sin / bin.n, bin.cos / bin.n) * 180) / Math.PI + 360) % 360;
    const meanS = bin.s / bin.n;
    const meanL = bin.l / bin.n;
    const vividness = 0.3 + 0.7 * meanS;
    const midtone = Math.max(0.15, 1 - Math.abs(meanL - 0.5) * 0.9);
    scored.push({ h: meanH, s: meanS, l: meanL, n: bin.n, weight: bin.n * vividness * midtone });
  });
  scored.sort((a, b) => b.weight - a.weight);

  // ── 4 · monochrome path ──────────────────────────────────────────────────
  if (chromaticShare < o.monochromeShare || scored.length === 0) {
    // A pure grey ink prints flat and reads as a photocopy. Give it the faint
    // cast the mark already has — or, failing that, 214° at 6%: the coolest
    // graphite that still looks deliberate rather than blue.
    const castH = ((Math.atan2(neutralHueSin, neutralHueCos) * 180) / Math.PI + 360) % 360;
    const hasCast = Math.hypot(neutralHueSin, neutralHueCos) > neutralCount * 0.015;
    const base = { h: hasCast ? castH : 214, s: 0.06, l: 0.2 };
    const hex = hslToHex(base.h, base.s, base.l);
    return {
      dominant: { ...base, hex },
      accent: { ...base, hex },
      swatches: [{ ...base, hex, share: 1 }],
      isMonochrome: true,
      accentDerived: true,
      chromaticShare,
      sampled: ink,
      note: "Monochrome mark — themed in graphite, hue borrowed from the mark's own cast.",
    };
  }

  const dominant = scored[0];

  // ── 5 · accent: the first genuinely different colour ──────────────────────
  let accent: ScoredBin | null = null;
  let accentDerived = false;
  for (let i = 1; i < scored.length; i++) {
    const c = scored[i];
    if (c.weight < dominant.weight * 0.06) break; // noise, not a second colour
    if (hueDistance(c.h, dominant.h) >= 28) {
      accent = c;
      break;
    }
  }
  if (!accent) {
    for (let i = 1; i < scored.length; i++) {
      const c = scored[i];
      if (c.weight < dominant.weight * 0.1) break;
      if (Math.abs(c.l - dominant.l) >= 0.22) {
        accent = c; // a tonal pair — light/dark of the same family
        break;
      }
    }
  }
  if (!accent) {
    // Single-hue mark (the common case for a good logo). Deepen rather than
    // invent: a fabricated complementary colour is the fastest way to make a
    // school's sheet look like it belongs to someone else.
    accent = {
      h: dominant.h,
      s: clamp(dominant.s * 0.92, 0.18, 0.9),
      l: clamp(dominant.l - 0.14, 0.12, 0.8),
      n: 0,
      weight: 0,
    };
    accentDerived = true;
  }

  const swatches: PaletteSwatch[] = scored.slice(0, 5).map((c) => ({
    h: c.h,
    s: c.s,
    l: c.l,
    hex: hslToHex(c.h, c.s, c.l),
    share: c.n / ink,
  }));

  const dominantHex = hslToHex(dominant.h, dominant.s, dominant.l);
  const accentHex = hslToHex(accent.h, accent.s, accent.l);

  // A photograph or a busy illustration spreads its weight thinly across many
  // bins. It still themes — but say so, because the result is a guess.
  const top3 = scored.slice(0, 3).reduce((t, c) => t + c.weight, 0);
  const total = scored.reduce((t, c) => t + c.weight, 0);
  const busy = scored.length > 14 && top3 / total < 0.45;

  return {
    dominant: { h: dominant.h, s: dominant.s, l: dominant.l, hex: dominantHex },
    accent: { h: accent.h, s: accent.s, l: accent.l, hex: accentHex },
    swatches,
    isMonochrome: false,
    accentDerived,
    chromaticShare,
    sampled: ink,
    note: busy
      ? 'Busy or photographic mark — the palette is a best guess. A flat logo themes more reliably.'
      : accentDerived
        ? 'Single-hue mark — the accent is a deepened tone of the same colour, not an invented one.'
        : '',
  };
}

function fallbackPalette(note: string): BrandPalette {
  const base = { h: 214, s: 0.06, l: 0.2 };
  const hex = hslToHex(base.h, base.s, base.l);
  return {
    dominant: { ...base, hex },
    accent: { ...base, hex },
    swatches: [{ ...base, hex, share: 1 }],
    isMonochrome: true,
    accentDerived: true,
    chromaticShare: 0,
    sampled: 0,
    note,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// PART 3 — THEME DERIVATION
// The rules that turn "what colour is the logo" into "what may touch paper".
// ══════════════════════════════════════════════════════════════════════════

const INTENSITY_CFG: Record<BrandIntensity, { washL: number | null; watermark: number }> = {
  whisper: { washL: null, watermark: 0 },
  classic: { washL: 0.965, watermark: 0.08 },
  full: { washL: 0.945, watermark: 0.09 },
};

/**
 * CONTRAST TARGETS — the whole safety argument in three numbers.
 *   ink      12:1  headline and name ink. Chosen by looking at renders: at
 *                  8.5:1 a monochrome school's title came out mid-grey and read
 *                  as a low-toner sheet. At 12:1 gold lands on a deep bronze and
 *                  black on a true charcoal — ink with a cast, not grey.
 *   accent  4.6:1  rules, table headings, the room line. Passes AA as body
 *                  text, which is the floor for 7–8pt uppercase.
 *   border  2.3:1  a hairline you can see and never read. Above 3:1 the table
 *                  starts to look like a spreadsheet.
 * The wash is set by LIGHTNESS, not contrast — see below.
 */
const TARGET = { ink: 12, accent: 4.6, border: 2.3 };

/**
 * SATURATION BANDS. A logo may be neon; a page of 10.5pt type may not.
 * The floors exist so a nearly-grey brand still reads as a colour rather than
 * as a printing fault — but they must NEVER be forced onto a genuinely neutral
 * mark. A black logo pushed up to the ink floor comes out MAUVE. That is a real
 * bug this guard exists to stop, not a hypothetical one.
 */
const SAT = {
  ink: [0.14, 0.42],
  accent: [0.28, 0.6],
  border: [0.1, 0.3],
  wash: [0.1, 0.4],
} as const;

/** Below this the source has no hue worth preserving — keep it that way. */
const NEUTRAL_S = 0.1;

function satFor(sourceS: number, band: readonly [number, number]): number {
  if (sourceS < NEUTRAL_S) return Math.min(sourceS, 0.08); // graphite stays graphite
  return clamp(sourceS, band[0], band[1]);
}

/**
 * When a token has to be LIGHTENED to reach its target — a near-black navy or
 * maroon lifted to 4.6:1 so a hairline is visible — pull the saturation back as
 * it rises. Lightness and saturation both add loudness; raising one while
 * holding the other is how a dignified navy becomes a highlighter.
 */
function temper(sourceL: number, solvedL: number, s: number): number {
  const lift = solvedL - sourceL;
  return lift > 0.12 ? s * (1 - Math.min(0.3, (lift - 0.12) * 0.9)) : s;
}

export interface DerivedTheme {
  tokens: BrandTokens;
  /** True when the accent was too pale to structure a sheet with and the
   *  dominant hue was used instead. Surfaced on the settings screen. */
  paleAccentFallback: boolean;
  contrast: { ink: number; accent: number; border: number };
}

/**
 * dominant + accent (as read from the logo) → the tokens that may print.
 * Pure. Takes HSL so the extractor can pass its own values through untouched,
 * and `deriveTokensFromHex` covers the "stored kit, changed intensity" case.
 */
export function deriveTokens(base: Hsl, acc: Hsl, intensity: BrandIntensity): DerivedTheme {
  const cfg = INTENSITY_CFG[intensity] || INTENSITY_CFG.classic;

  // A colour this pale is a HIGHLIGHT, not a rule. Dragging a cream down to
  // 4.6:1 does not give you "the school's cream" — it gives you an unrelated
  // bronze sitting next to a slate-blue title. When the accent is that light,
  // the sheet is structured in the DOMINANT hue instead and stays one family.
  const paleAccent = acc.l > 0.78;
  const str = paleAccent ? base : acc;

  // Ink carries the school's identity hue; the structural colour carries the
  // furniture. Solve, temper, re-solve: tempering changes saturation, which
  // moves the contrast curve, so the second solve is what guarantees the ratio.
  let inkS = satFor(base.s, SAT.ink);
  let inkL = solveLightnessForContrast(base.h, inkS, TARGET.ink);
  inkS = temper(base.l, inkL, inkS);
  inkL = solveLightnessForContrast(base.h, inkS, TARGET.ink);

  let accS = satFor(str.s, SAT.accent);
  let accL = solveLightnessForContrast(str.h, accS, TARGET.accent);
  accS = temper(str.l, accL, accS);
  accL = solveLightnessForContrast(str.h, accS, TARGET.accent);

  const borS = satFor(str.s * 0.55, SAT.border);
  const borL = solveLightnessForContrast(str.h, borS, TARGET.border);

  // The wash is set by LIGHTNESS, not contrast: it is not information, it is
  // paper. 0.965 ≈ 3.5% ink coverage, 0.945 ≈ 5.5% — both inside the range a
  // cheap classroom laser reproduces as a tint rather than as a grey smear.
  const washS = satFor(str.s * 0.6, SAT.wash);

  return {
    tokens: {
      ink: hslToHex(base.h, inkS, inkL),
      accent: hslToHex(str.h, accS, accL),
      border: hslToHex(str.h, borS, borL),
      wash: cfg.washL === null ? 'transparent' : hslToHex(str.h, washS, cfg.washL),
      watermarkOpacity: cfg.watermark,
    },
    paleAccentFallback: paleAccent,
    contrast: {
      ink: contrastOnWhite(base.h, inkS, inkL),
      accent: contrastOnWhite(str.h, accS, accL),
      border: contrastOnWhite(str.h, borS, borL),
    },
  };
}

/** The same derivation from stored hex values — the path taken when a school
 *  changes intensity without touching their logo. */
export function deriveTokensFromHex(
  dominantHex: string,
  accentHex: string,
  intensity: BrandIntensity
): DerivedTheme {
  return deriveTokens(hexToHsl(dominantHex), hexToHsl(accentHex), intensity);
}

// ══════════════════════════════════════════════════════════════════════════
// PART 4 — THE ONE CALL THE SETTINGS SCREEN MAKES
// ══════════════════════════════════════════════════════════════════════════

export interface ExtractBrandKitOptions {
  intensity?: BrandIntensity;
  /** Carried straight through onto the kit. Left null on a fresh pick: the
   *  URL only exists once the server has stored the file. */
  logoUrl?: string | null;
}

export interface ExtractBrandKitResult {
  /** Ready to preview, and ready to POST once the file has been uploaded. */
  kit: BrandKit;
  /** The raw read, for the settings screen's "here is what we saw" panel. */
  palette: BrandPalette;
}

/**
 * logo → palette → print-safe tokens, in one call.
 *
 * @param source a File / Blob, a data-or-object URL, or an already-loaded
 *               `HTMLImageElement` / `HTMLCanvasElement`.
 */
export async function extractBrandKit(
  source: File | Blob | string | ExtractSource,
  options: ExtractBrandKitOptions = {}
): Promise<ExtractBrandKitResult> {
  const intensity = options.intensity ?? 'classic';
  const image = await toImageSource(source);
  const palette = extractBrandPalette(image);
  const derived = deriveTokens(palette.dominant, palette.accent, intensity);

  return {
    palette,
    kit: {
      version: BRAND_KIT_VERSION,
      enabled: true,
      intensity,
      logoUrl: options.logoUrl ?? null,
      dominant: palette.dominant.hex,
      accent: palette.accent.hex,
      tokens: derived.tokens,
      meta: {
        isMonochrome: palette.isMonochrome,
        accentDerived: palette.accentDerived,
        paleAccentFallback: derived.paleAccentFallback,
        contrast: derived.contrast,
        note: palette.note || undefined,
        extractedAt: new Date().toISOString(),
      },
    },
  };
}

/**
 * Re-solve an existing kit's tokens for a new intensity. Pure, instant, and it
 * never needs the logo back: the two SOURCE colours are stored on the kit for
 * exactly this reason.
 */
export function retuneBrandKit(kit: BrandKit, intensity: BrandIntensity): BrandKit {
  const derived = deriveTokensFromHex(kit.dominant, kit.accent, intensity);
  return {
    ...kit,
    intensity,
    tokens: derived.tokens,
    meta: {
      ...(kit.meta || {}),
      paleAccentFallback: derived.paleAccentFallback,
      contrast: derived.contrast,
    },
  };
}

/** Read whatever the caller had into a decoded `<img>`. Object URLs are revoked
 *  as soon as the bitmap is decoded — a settings page a teacher leaves open all
 *  day must not hold a blob per logo they tried. */
async function toImageSource(
  source: File | Blob | string | ExtractSource
): Promise<ExtractSource> {
  if (typeof source !== 'string' && 'width' in source && !(source instanceof Blob)) {
    return source as ExtractSource;
  }

  let url: string;
  let revoke = false;
  if (typeof source === 'string') {
    url = source;
  } else {
    url = URL.createObjectURL(source as Blob);
    revoke = true;
  }

  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      // Harmless for same-origin and data URLs; makes a same-origin proxy URL
      // readable by canvas instead of tainting it.
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('That image could not be decoded.'));
      img.src = url;
    });
  } finally {
    if (revoke) URL.revokeObjectURL(url);
  }
}
