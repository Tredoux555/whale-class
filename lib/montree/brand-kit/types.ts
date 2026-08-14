// lib/montree/brand-kit/types.ts
// ============================================================================
// THE SCHOOL BRAND KIT — the stored shape, and the only gate into it.
// ============================================================================
// A school uploads a logo once. The browser reads its palette, solves a handful
// of print-safe tokens from it, and the result is parked on the school row as
// `montree_schools.settings.brand_kit`. Every class document then themes itself
// from that one object: header emblem, tinted rules, a ghosted crest.
//
// 🚨 EXTRACTION HAPPENS ONCE, AT SAVE TIME — never at print time. A teacher
// hitting Print must not wait on a canvas decode, and the sheet a school signed
// off in August must still print identically in March even if the extraction
// heuristics are improved in between. What is stored is the ANSWER, not the
// inputs to re-compute it.
//
// 🚨 EVERYTHING IN HERE IS UNTRUSTED UNTIL `parseBrandKit` HAS SEEN IT. These
// values end up inside a <style> block rendered with dangerouslySetInnerHTML
// (see brand-kit/css.ts), so a hex string that is not a hex string is a CSS
// injection. The parser is therefore the ONLY sanctioned way to turn a JSONB
// blob — or a request body — into a BrandKit: it validates every field against
// a strict shape and returns `null` rather than a half-trusted object.
//
// This module is deliberately dependency-free and framework-free: the API route
// (server), the CSS builder (shared) and the settings page (client) all import
// it. `extract.ts` is the client-only half — canvas lives there, not here.

/** Bumped when the stored shape changes in a way a reader must notice.
 *  A kit whose version this build does not understand is ignored (the school
 *  prints today's plain sheet) rather than half-read into a broken theme. */
export const BRAND_KIT_VERSION = 1;

/**
 * How loud the theme is allowed to be on paper. Three presets, not a slider:
 * a slider invites a school to invent a setting nobody has ever printed.
 *
 *   whisper — crest and tinted rules only. No wash, no watermark. For schools
 *             printing on a laser that turns any tint into a grey smear.
 *   classic — the default. Adds a 3–4% wash behind table headings and label
 *             cards, and the crest ghosted behind the sheet at 8%.
 *   full    — adds corner marks to each label, a second hairline under the
 *             masthead, and banded table rows. Still under ~6% ink coverage.
 */
export type BrandIntensity = 'whisper' | 'classic' | 'full';

export const BRAND_INTENSITIES: readonly BrandIntensity[] = ['whisper', 'classic', 'full'];

/**
 * The four colours and one opacity that are allowed to touch paper.
 *
 * These are NOT the logo's colours. Each one has been re-solved for a contrast
 * ratio against white (see extract.ts), because "the school's blue" is a brand
 * fact and "a hairline you can see but never read" is a printing fact, and the
 * whole safety argument of this feature is that the second is derived from the
 * first rather than being it.
 */
export interface BrandTokens {
  /** Titles, child names, the room stamp. Solved to ~12:1 on white. */
  ink: string;
  /** Rules, table headings, the label's room line. Solved to ~4.6:1 (AA body). */
  accent: string;
  /** Hairlines and the label frame. ~2.3:1 — visible, never readable. */
  border: string;
  /** Table-head band and label fill. A LIGHTNESS, not a contrast: it is paper,
   *  not information. `'transparent'` on whisper. */
  wash: string;
  /** 0 on whisper, 0.08 on classic, 0.09 on full. See css.ts for the why. */
  watermarkOpacity: number;
}

/** Notes from the extractor. Advisory only — nothing renders differently
 *  because of them; they exist so the settings screen can be honest about a
 *  guess ("busy mark", "single-hue mark") instead of presenting one silently. */
export interface BrandKitMeta {
  /** The mark had almost no chromatic ink — themed in graphite. */
  isMonochrome?: boolean;
  /** No genuine second colour existed; the accent is a deepened tone. */
  accentDerived?: boolean;
  /** The second colour was too pale to draw a rule with, so the sheet is
   *  structured in the dominant hue instead and stays one family. */
  paleAccentFallback?: boolean;
  /** Achieved contrast ratios on white, for the settings readout. */
  contrast?: { ink: number; accent: number; border: number };
  /** One sentence, already written for a human. */
  note?: string;
  /** ISO timestamp of the extraction that produced these tokens. */
  extractedAt?: string;
}

export interface BrandKit {
  version: number;
  /** The master switch. `false` → every document renders byte-identically to a
   *  school that never uploaded anything. Turning the theme off is not the same
   *  as forgetting the logo, so the tokens survive a disable. */
  enabled: boolean;
  intensity: BrandIntensity;
  /** Client-facing URL of the logo (house rule: always the cached proxy URL,
   *  never a raw Supabase URL). `null` → colours only, no crest, no ghost. */
  logoUrl: string | null;
  /** Storage object key, kept so a replacement upload can clean up after the
   *  one it replaces. Never rendered. */
  logoPath?: string | null;
  /** The two colours READ from the logo, before any print-safety solving.
   *  Stored so a school can change intensity — which moves the wash — without
   *  re-uploading their logo, and so the settings screen can show its work. */
  dominant: string;
  accent: string;
  tokens: BrandTokens;
  meta?: BrandKitMeta;
}

// ── validation ──────────────────────────────────────────────────────────────

/** 6-digit hex only. Not 3-digit, not named, not `rgb()`, not `var()`. The
 *  narrowest thing that can express a colour is the safest thing to inject. */
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** `transparent` is the one non-hex value a token may hold (the whisper wash). */
function isSafeColor(v: unknown): v is string {
  return typeof v === 'string' && (v === 'transparent' || HEX_RE.test(v));
}

function safeColor(v: unknown, fallback: string): string {
  return isSafeColor(v) ? v.toLowerCase() : fallback;
}

/**
 * A URL that is safe to drop into an `<img src>` AND into a CSS `url()`.
 * Same-origin relative paths (what `getProxyUrl` returns) and absolute http(s)
 * only — never `javascript:`, never `data:`, and never anything carrying a
 * quote, parenthesis, backslash, whitespace or angle bracket, all of which are
 * the characters an injected URL would need to break out of its context.
 */
export function isSafeLogoUrl(v: unknown): v is string {
  if (typeof v !== 'string' || v.length === 0 || v.length > 2048) return false;
  if (/["'()\\<>\s]/.test(v)) return false;
  if (v.startsWith('/')) return !v.startsWith('//'); // protocol-relative is not ours
  return /^https?:\/\//i.test(v);
}

function isIntensity(v: unknown): v is BrandIntensity {
  return typeof v === 'string' && (BRAND_INTENSITIES as readonly string[]).includes(v);
}

/** 0 ≤ o ≤ 0.2, rounded to 3dp. The cap is not cosmetic: above ~0.10 the ghost
 *  stops being a ghost and starts tinting the text on top of it. */
function safeOpacity(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(Math.min(0.2, n) * 1000) / 1000;
}

/** The theme a school gets when it has nothing — i.e. today's plain sheet. */
export const PLAIN_TOKENS: BrandTokens = {
  ink: '#101820',
  accent: '#101820',
  border: '#c9d3df',
  wash: 'transparent',
  watermarkOpacity: 0,
};

/**
 * The gate. Anything that is not recognisably a BrandKit becomes `null`, and a
 * `null` kit means "print exactly what this school printed yesterday".
 *
 * 🚨 It NEVER throws. It is called on a JSONB column written by an older build,
 * on a request body written by a browser, and inside a render path — three
 * places where an exception is strictly worse than an unthemed document.
 */
export function parseBrandKit(raw: unknown): BrandKit | null {
  try {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const o = raw as Record<string, unknown>;

    // Unknown FUTURE versions are ignored; there is no forwards compatibility
    // to guess at. Unversioned/older blobs are read as v1, which is all that
    // has ever been written.
    const version = typeof o.version === 'number' ? o.version : BRAND_KIT_VERSION;
    if (version > BRAND_KIT_VERSION) return null;

    const rawTokens = (o.tokens && typeof o.tokens === 'object' ? o.tokens : {}) as Record<
      string,
      unknown
    >;

    const tokens: BrandTokens = {
      ink: safeColor(rawTokens.ink, PLAIN_TOKENS.ink),
      accent: safeColor(rawTokens.accent, PLAIN_TOKENS.accent),
      border: safeColor(rawTokens.border, PLAIN_TOKENS.border),
      wash: safeColor(rawTokens.wash, PLAIN_TOKENS.wash),
      watermarkOpacity: safeOpacity(rawTokens.watermarkOpacity),
    };

    const rawMeta = (o.meta && typeof o.meta === 'object' ? o.meta : null) as Record<
      string,
      unknown
    > | null;

    const meta: BrandKitMeta | undefined = rawMeta
      ? {
          isMonochrome: rawMeta.isMonochrome === true,
          accentDerived: rawMeta.accentDerived === true,
          paleAccentFallback: rawMeta.paleAccentFallback === true,
          contrast:
            rawMeta.contrast && typeof rawMeta.contrast === 'object'
              ? {
                  ink: Number((rawMeta.contrast as Record<string, unknown>).ink) || 0,
                  accent: Number((rawMeta.contrast as Record<string, unknown>).accent) || 0,
                  border: Number((rawMeta.contrast as Record<string, unknown>).border) || 0,
                }
              : undefined,
          // The note is shown on SCREEN only, never injected into CSS — but it
          // is still clipped, because an unbounded string on a school row is a
          // storage bug waiting to happen.
          note: typeof rawMeta.note === 'string' ? rawMeta.note.slice(0, 400) : undefined,
          extractedAt:
            typeof rawMeta.extractedAt === 'string' ? rawMeta.extractedAt.slice(0, 40) : undefined,
        }
      : undefined;

    return {
      version: BRAND_KIT_VERSION,
      enabled: o.enabled !== false, // absent means "yes" — a saved kit is a wanted kit
      intensity: isIntensity(o.intensity) ? o.intensity : 'classic',
      logoUrl: isSafeLogoUrl(o.logoUrl) ? o.logoUrl : null,
      logoPath: typeof o.logoPath === 'string' && o.logoPath.length < 512 ? o.logoPath : null,
      dominant: safeColor(o.dominant, tokens.ink),
      accent: safeColor(o.accent, tokens.accent),
      tokens,
      meta,
    };
  } catch {
    return null;
  }
}

/**
 * Does this kit actually change anything on paper? Used by the render path so
 * that "enabled but never configured" is treated as OFF rather than as a theme
 * made of default greys.
 */
export function isBrandKitActive(kit: BrandKit | null | undefined): kit is BrandKit {
  if (!kit || !kit.enabled) return false;
  const t = kit.tokens;
  const paintsSomething =
    t.ink !== PLAIN_TOKENS.ink ||
    t.accent !== PLAIN_TOKENS.accent ||
    t.border !== PLAIN_TOKENS.border ||
    t.wash !== PLAIN_TOKENS.wash;
  return paintsSomething || !!kit.logoUrl;
}
