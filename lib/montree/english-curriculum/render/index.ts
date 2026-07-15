/**
 * render/index.ts — the render-engine public API.
 *
 * The Studio tab and the build-week.mjs CLI both drive the curriculum through
 * THIS module and nothing else. Every builder is a pure string builder that
 * returns a complete, standalone print document.
 */

import type { WeekSpec } from '../spec/types';
import type { AssetMap } from './assets';
import { assetGapReport as _assetGapReport } from './assets';

import { buildThreePartCards } from './builders/three-part-cards';
import { buildFlashcards } from './builders/flashcards';
import { buildSentenceStrips } from './builders/sentence-strips';
import { buildMatching } from './builders/matching';
import { buildBingo } from './builders/bingo';
import { buildTracing } from './builders/tracing';
import { buildColoring } from './builders/coloring';
import { buildDictionaryJournal } from './builders/dictionary-journal';
import { buildBook } from './builders/book';
import { buildVowelWall } from './builders/vowel-wall';
import { buildQrCards } from './builders/qr-cards';

export type MaterialType =
  | 'three_part_cards' | 'flashcards' | 'sentence_strips' | 'matching' | 'bingo'
  | 'tracing' | 'coloring' | 'dictionary_journal' | 'book'
  | 'vowel_wall' | 'qr_cards';

export interface BuildOpts {
  /** Base URL/path for the bundled Andika TTFs. Browser: '/fonts'. CLI: file://…/public/fonts. */
  fontBaseUrl?: string;
  /** Emit the auto-print script (window-open Print). Preview iframes leave this false. */
  autoPrint?: boolean;
  /** Deterministic seed for shuffled materials (bingo, matching). */
  seed?: number;
  /** Override the base card edge length (cm). */
  cardSizeCm?: number;
}

export interface BuildResult { html: string; warnings: string[]; }

/** Ordered catalogue of the ten material types (drives the Studio grid + CLI). */
export const MATERIAL_TYPES: { type: MaterialType; label: string; emoji: string }[] = [
  { type: 'three_part_cards', label: 'Three-Part Cards', emoji: '🃏' },
  { type: 'flashcards', label: 'Flashcards', emoji: '⚡' },
  { type: 'sentence_strips', label: 'Sentence Strips', emoji: '📏' },
  { type: 'matching', label: 'Word–Picture Match', emoji: '🔗' },
  { type: 'bingo', label: 'Bingo + Calling Cards', emoji: '🎲' },
  { type: 'tracing', label: 'Letter Tracing', emoji: '✍️' },
  { type: 'coloring', label: 'Colouring Pages', emoji: '🖍️' },
  { type: 'dictionary_journal', label: 'Dictionary Journal', emoji: '📓' },
  { type: 'book', label: 'The Reader (book)', emoji: '📖' },
  { type: 'vowel_wall', label: 'Wall Posters', emoji: '🅰️' },
  { type: 'qr_cards', label: 'Song QR Cards', emoji: '🎵' },
];

type Builder = (spec: WeekSpec, assets: AssetMap, opts?: BuildOpts) => BuildResult;

const BUILDERS: Record<MaterialType, Builder> = {
  three_part_cards: buildThreePartCards,
  flashcards: buildFlashcards,
  sentence_strips: buildSentenceStrips,
  matching: buildMatching,
  bingo: buildBingo,
  tracing: buildTracing,
  coloring: buildColoring,
  dictionary_journal: buildDictionaryJournal,
  book: buildBook,
  vowel_wall: buildVowelWall,
  qr_cards: buildQrCards,
};

/** Build one material type into a full standalone HTML document. Never throws. */
export function buildMaterial(
  type: MaterialType,
  spec: WeekSpec,
  assets: AssetMap,
  opts: BuildOpts = {},
): BuildResult {
  const builder = BUILDERS[type];
  if (!builder) {
    return { html: '', warnings: [`Unknown material type "${type}"`] };
  }
  try {
    return builder(spec, assets, opts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { html: `<!DOCTYPE html><html><body><pre>Render error: ${msg}</pre></body></html>`, warnings: [`${type} render error: ${msg}`] };
  }
}

/** The "what pictures do you still need" report for a week + supplied assets.
 *  Pass earlier weeks' specs to tag reused images ("copy in from Week N"). */
export function assetGapReport(spec: WeekSpec, assets: AssetMap, priorSpecs: WeekSpec[] = []) {
  return _assetGapReport(spec, assets, priorSpecs);
}

// Re-exports so callers have one import surface.
export type { AssetMap, AssetFile, ParsedFilename, AssetGap } from './assets';
export { buildAssetMap, parseAssetFilename, resolveImage } from './assets';
export { letterStrokeSVG, KNOWN_STROKE_LETTERS } from './letter-strokes';
export { escapeHtml, sanitizeImageUrl, hexColor } from './html-shell';
