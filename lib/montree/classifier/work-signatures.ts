/**
 * Work Signatures Database
 *
 * Enriched text descriptions for ALL 270 Montessori works across 5 areas.
 * Optimized for CLIP/SigLIP text embedding matching in visual identification.
 *
 * Each signature describes WHAT IS VISIBLE in a photo, not what the work teaches.
 * Material-first, photo-specific, anti-confusion descriptions.
 * Work keys match curriculum JSON IDs exactly (pl_, se_, ma_, la_, cu_ prefixes).
 *
 * Generated: March 21, 2026 (rewritten with curriculum-aligned IDs)
 * Source: 5 curriculum JSON files + web research on physical Montessori materials
 * Method: 5 parallel agents (one per area) with web-researched visual descriptions
 * Coverage: PL=83, SE=35, MA=57, LA=45, CU=50 = 270 total
 */

export interface WorkSignature {
  /** Unique work identifier from curriculum JSON (e.g., "pl_carrying_mat") */
  work_key: string;

  /** Exact curriculum name from JSON */
  name: string;

  /** Area key: "practical_life" | "sensorial" | "mathematics" | "language" | "cultural" */
  area_key: "practical_life" | "sensorial" | "mathematics" | "language" | "cultural";

  /** Category within the area (e.g., "Preliminary Exercises", "Visual Sense - Dimension") */
  category: string;

  /**
   * Rich visual description for CLIP embedding (2-3 sentences).
   * Focus on: materials, colors, size relationships, what child is doing with it.
   * NOT what it teaches or developmental benefits.
   */
  visual_description: string;

  /** Primary visual identifiers / key materials visible in photos */
  key_materials: string[];

  /** work_keys of similar-looking materials that could cause confusion */
  confusion_pairs?: string[];

  /** How hard it is to visually identify from photo alone */
  difficulty: "easy" | "medium" | "hard";
}

// ============================================================================
// IMPORT AREA SIGNATURES FROM DEDICATED FILES
// ============================================================================

import { PRACTICAL_LIFE_SIGNATURES } from './signatures-practical-life';
import { SENSORIAL_SIGNATURES } from './signatures-sensorial';
import { MATHEMATICS_SIGNATURES } from './signatures-mathematics';
import { LANGUAGE_SIGNATURES } from './signatures-language';
import { CULTURAL_SIGNATURES } from './signatures-cultural';

// Re-export individual area arrays for consumers that need area-specific access
export {
  PRACTICAL_LIFE_SIGNATURES,
  SENSORIAL_SIGNATURES,
  MATHEMATICS_SIGNATURES,
  LANGUAGE_SIGNATURES,
  CULTURAL_SIGNATURES,
};

// ============================================================================
// AREA-LEVEL SIGNATURES (for Stage 1 area classification)
// ============================================================================

export const AREA_SIGNATURES: Record<string, string> = {
  practical_life:
    "Green area with everyday life activities: a child pouring water between pitchers, spooning beans, folding cloths, buttoning dressing frames, polishing metal, or preparing food in a small kitchen setup.",
  sensorial:
    "Orange area with sensory materials: a child stacking pink cubes, grading brown prisms, fitting cylinders into knobbed blocks, matching color tablets, or exploring geometric shapes and textures.",
  mathematics:
    "Blue area with math materials: a child manipulating golden beads, counting with number rods, using spindle boxes, working with stamp game tiles, or sliding beads on an abacus frame.",
  language:
    "Pink/rose area with reading and writing: a child tracing sandpaper letters, building words with moveable alphabet letters, reading pink/blue/green series cards, or working with grammar symbol cards.",
  cultural:
    "Purple area with knowledge materials: a child placing pieces on a wooden puzzle map, exploring botany/zoology puzzles, working with land and water form trays, or doing science experiments.",
};

// ============================================================================
// COMPLETE WORK SIGNATURES DATABASE
// ============================================================================

export const WORK_SIGNATURES: WorkSignature[] = [
  ...PRACTICAL_LIFE_SIGNATURES,
  ...SENSORIAL_SIGNATURES,
  ...MATHEMATICS_SIGNATURES,
  ...LANGUAGE_SIGNATURES,
  ...CULTURAL_SIGNATURES,
];

// ============================================================================
// EXPORT HELPER FUNCTIONS
// ============================================================================

/**
 * Get all signatures for a specific area.
 */
export function getSignaturesByArea(area_key: string): WorkSignature[] {
  return WORK_SIGNATURES.filter((sig) => sig.area_key === area_key);
}

/**
 * Get a specific work signature by its work_key.
 */
export function getSignatureByKey(work_key: string): WorkSignature | undefined {
  return WORK_SIGNATURES.find((sig) => sig.work_key === work_key);
}

/**
 * Get all work keys for a specific area (for easy iteration).
 */
export function getWorkKeysForArea(area_key: string): string[] {
  return getSignaturesByArea(area_key).map((sig) => sig.work_key);
}

/**
 * Get all confusion pairs for a work, resolved to actual signatures.
 */
export function getConfusionPairsForWork(
  work_key: string
): WorkSignature[] | undefined {
  const sig = getSignatureByKey(work_key);
  if (!sig?.confusion_pairs) return undefined;
  return sig.confusion_pairs
    .map((key) => getSignatureByKey(key))
    .filter((s): s is WorkSignature => s !== undefined);
}

/**
 * Statistics for the work signatures database.
 */
export const WORK_SIGNATURES_STATS = {
  total_works: WORK_SIGNATURES.length,
  by_area: {
    practical_life: getSignaturesByArea("practical_life").length,
    sensorial: getSignaturesByArea("sensorial").length,
    mathematics: getSignaturesByArea("mathematics").length,
    language: getSignaturesByArea("language").length,
    cultural: getSignaturesByArea("cultural").length,
  },
  difficulty_distribution: {
    easy: WORK_SIGNATURES.filter((s) => s.difficulty === "easy").length,
    medium: WORK_SIGNATURES.filter((s) => s.difficulty === "medium").length,
    hard: WORK_SIGNATURES.filter((s) => s.difficulty === "hard").length,
  },
  works_with_confusion_pairs: WORK_SIGNATURES.filter(
    (s) => s.confusion_pairs && s.confusion_pairs.length > 0
  ).length,
};

export default WORK_SIGNATURES;
