/**
 * Montree Milestones — design tokens.
 *
 * TWO palettes, on purpose:
 *
 *  • `T` — the dark-forest dashboard palette used by every teacher surface
 *    (`app/montree/dashboard/[childId]/layout.tsx` defines the same values inline). The
 *    Milestones tab has to sit inside that chrome without looking bolted on.
 *
 *  • `C` — the warm cream child palette from the standalone tablet build. A three-year-old
 *    meets this one full-screen, in a quiet corner, with a teacher beside them. Dark UI on
 *    a bright tablet in a sunlit classroom is the wrong call for that ten minutes, and the
 *    paper packs print from the same cream/ink pairing so the two look like one thing.
 */

/** Teacher chrome — matches the child-profile dashboard exactly. */
export const T = {
  bg: '#0a1a0f',
  panel: 'rgba(255,255,255,0.04)',
  border: 'rgba(52,211,153,0.15)',
  emerald: '#34d399',
  emeraldSoft: 'rgba(52,211,153,0.08)',
  glassBtn: 'rgba(255,255,255,0.10)',
  glassBtnHvr: 'rgba(255,255,255,0.18)',
  text: '#ffffff',
  textMd: 'rgba(255,255,255,0.85)',
  textMute: 'rgba(255,255,255,0.50)',
  amber: '#fbbf24',
  clay: '#e08a5f',
} as const;

/** Child-facing runner — warm, matte, high contrast, Montessori materials. */
export const C = {
  cream: '#FBF6EC',
  paper: '#FFFDF8',
  ink: '#2B2A26',
  inkSoft: '#5C574C',
  forest: '#2F5D3A',
  forestDark: '#234A2C',
  moss: '#7C9A63',
  clay: '#C4744B',
  sand: '#EADCC2',
  sandDark: '#D9C7A5',
  gold: '#D8A24A',
  line: 'rgba(43,42,38,.14)',
} as const;

export const SERIF = "var(--font-lora), 'Iowan Old Style', Georgia, serif";
export const SANS = "'Inter', -apple-system, system-ui, sans-serif";

/**
 * Minimum tap target. ARCHITECTURE.md §6-D2 makes this a hard rule: 96 CSS px is roughly
 * 2.5 cm on a 9.7–11" tablet, which is what a three-year-old's finger and a teacher's
 * elbow-room actually need. Never shrink it to fit more options on screen — reflow instead.
 */
export const TAP_MIN_PX = 96;
export const TAP_GAP_PX = 24;

/** The three bands, and the colours a teacher learns to read at a glance. */
export const BAND_STYLE: Record<string, { bg: string; border: string; fg: string }> = {
  secure: { bg: '#EAF2E6', border: C.moss, fg: '#3B5B2C' },
  developing: { bg: '#FBF1DE', border: C.gold, fg: '#7A5A1D' },
  emerging: { bg: '#F4EDE6', border: C.clay, fg: '#7E462A' },
  unassessed: { bg: '#F2F1EE', border: C.sandDark, fg: C.inkSoft },
};

/** Same three bands on the dark dashboard. */
export const BAND_STYLE_DARK: Record<string, { bg: string; border: string; fg: string }> = {
  secure: { bg: 'rgba(52,211,153,0.14)', border: 'rgba(52,211,153,0.45)', fg: '#6ee7b7' },
  developing: { bg: 'rgba(251,191,36,0.14)', border: 'rgba(251,191,36,0.40)', fg: '#fcd34d' },
  emerging: { bg: 'rgba(224,138,95,0.14)', border: 'rgba(224,138,95,0.40)', fg: '#f2b48c' },
  unassessed: { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.14)', fg: 'rgba(255,255,255,0.55)' },
};
