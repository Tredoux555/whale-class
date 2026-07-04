// Fuzzy matching utilities for intelligent work placement in curriculum
import type { CurriculumWork } from './curriculum-loader';

/**
 * Calculate fuzzy match score between two strings (0-1)
 * Returns 1 for exact match, 0.85 for substring match, scales down for word-level matching
 */
export const fuzzyScore = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // Exact match
  if (s1 === s2) return 1;

  // One contains the other — but guard against short substring false positives
  // e.g., "hand" matching "Sand Tray Handwriting" at 0.85 is too generous
  // Require the shorter string to be at least 60% of the longer string's length
  // OR use word-boundary matching for short substrings
  if (s1.includes(s2) || s2.includes(s1)) {
    const shorter = s1.length < s2.length ? s1 : s2;
    const longer = s1.length < s2.length ? s2 : s1;
    const lengthRatio = shorter.length / longer.length;
    if (lengthRatio >= 0.6) {
      return 0.85; // Genuine containment (similar length strings)
    }
    // Short substring in long string — check if it's a whole word
    const wordBoundaryRegex = new RegExp(`\\b${shorter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    if (wordBoundaryRegex.test(longer)) {
      return 0.7; // Whole word match but big length difference — moderate score
    }
    return 0.5; // Partial substring buried in longer string — low confidence
  }

  // Word-level matching
  const words1 = s1.split(/[\s\-_]+/).filter(w => w.length > 2);
  const words2 = s2.split(/[\s\-_]+/).filter(w => w.length > 2);

  let matchScore = 0;
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2) matchScore += 0.3;
      else if (w1.includes(w2) || w2.includes(w1)) matchScore += 0.2;
      else if (w1.slice(0, 4) === w2.slice(0, 4)) matchScore += 0.1; // Same prefix
    }
  }

  return Math.min(matchScore, 0.8);
};

/**
 * Find best insertion position for a work based on fuzzy matching
 * Uses keyword-based grouping for low-score matches (Montessori categories)
 */
export const findBestPosition = (workName: string, curriculumWorks: Array<Record<string, unknown>>): number => {
  if (curriculumWorks.length === 0) return 0;

  let bestScore = 0;
  let bestIndex = curriculumWorks.length; // Default: end of list

  for (let i = 0; i < curriculumWorks.length; i++) {
    const score = fuzzyScore(workName, curriculumWorks[i].name);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i + 1; // Insert after the match
    }
  }

  // If very low score, try to group by keywords
  if (bestScore < 0.2) {
    const lowerName = workName.toLowerCase();
    // Common Montessori groupings
    const keywords = [
      { terms: ['pour', 'transfer', 'spoon', 'tong', 'scoop'], range: [0, 10] },
      { terms: ['button', 'zip', 'snap', 'lace', 'bow', 'dress'], range: [10, 20] },
      { terms: ['wash', 'clean', 'polish', 'fold', 'sweep'], range: [20, 35] },
      { terms: ['food', 'cut', 'slice', 'peel', 'prepare', 'cook'], range: [35, 50] },
      { terms: ['count', 'number', 'bead', 'rod'], range: [0, 30] },
      { terms: ['add', 'subtract', 'plus', 'minus'], range: [30, 60] },
      { terms: ['multiply', 'divide', 'stamp'], range: [60, 90] },
      { terms: ['letter', 'sound', 'phonetic', 'alphabet'], range: [0, 20] },
      { terms: ['word', 'read', 'sentence', 'story'], range: [40, 80] },
      { terms: ['cylinder', 'block', 'tower', 'stair'], range: [0, 15] },
      { terms: ['color', 'tablet', 'shade'], range: [15, 25] },
      { terms: ['geometry', 'shape', 'triangle', 'square'], range: [25, 50] },
    ];

    for (const group of keywords) {
      if (group.terms.some(t => lowerName.includes(t))) {
        // Place within the range, or at start of range if curriculum is shorter
        bestIndex = Math.min(group.range[0], curriculumWorks.length);
        break;
      }
    }
  }

  return bestIndex;
};

interface Assignment {
  work_name: string;
  area: string;
  status: string;
  notes?: string;
  is_focus?: boolean;
  is_extra?: boolean;
}

/**
 * Merge imported works into curriculum with intelligent positioning
 * Finds works assigned to a child that aren't in the standard curriculum and inserts them
 * at the best position based on fuzzy matching
 */
export const mergeWorksWithCurriculum = (
  curriculumWorks: Array<Record<string, unknown>>,
  assignedWorks: Assignment[],
  areaKey: string
): Array<Record<string, unknown>> => {
  // Start with curriculum works
  const merged = [...curriculumWorks];

  // Find assigned works in this area that aren't in curriculum
  const areaAssignments = assignedWorks.filter(a => {
    const assignedArea = a.area === 'math' ? 'mathematics' : a.area;
    const checkArea = areaKey === 'math' ? 'mathematics' : areaKey;
    return assignedArea === checkArea || a.area === areaKey;
  });

  const missingWorks = areaAssignments.filter(a =>
    !curriculumWorks.find(c => c.name?.toLowerCase() === a.work_name?.toLowerCase())
  );

  // Insert each missing work at its best position
  for (const missing of missingWorks) {
    const position = findBestPosition(missing.work_name, merged);
    const newWork = {
      id: `imported-${missing.work_name}`,
      name: missing.work_name,
      status: missing.status || 'presented',
      sequence: 0, // Will be recalculated
      isImported: true,
    };
    merged.splice(position, 0, newWork);
  }

  // Preserve original DB sequences — do NOT renumber
  // Imported works get a sequence based on their insertion neighbours
  return merged.map((w, idx) => {
    if (w.isImported || !w.sequence) {
      // For imported works without a real sequence, derive from neighbours
      const prev = idx > 0 ? (merged[idx - 1].sequence || idx) : 0;
      const next = idx < merged.length - 1 ? (merged[idx + 1].sequence || idx + 2) : prev + 1;
      return { ...w, dbSequence: 0, sequence: Math.round((prev + next) / 2) || idx + 1 };
    }
    return { ...w, dbSequence: w.sequence };
  });
};

// ================================================================
// CONFUSION CLUSTERS — the SINGLE source of truth for which standard works
// look alike, and therefore need Pass 2b image re-examination + explicit
// cross-candidate injection.
// ================================================================
//
// Session 113 V2 photo AI quality audit Q-11: the `area_constrained_first`
// matching strategy in matchToCurriculumV2 is silent on the exact case the
// visual ID guide warns about. When Haiku Pass 2 returns one of these names,
// the area filter happily resolves it within the picked area at high
// confidence — even though the photo may show a DIFFERENT (often cross-area)
// work.
//
// Example: photo of NUMBER RODS (Mathematics, red+blue alternating). Pass 1
// describes "graduated rods." Pass 2 sees colour weakly, says area='sensorial',
// work_name='Brown Stair', confidence 0.75. Gate A path 2 doesn't fire (score
// < 1.0) but the wrong name is drafted — a Math work drafted as a Sensorial one.
//
// Each inner array below is a CLUSTER: a family of lowercased work names
// (canonical names, parenthetical variants, and Haiku-common aliases) that
// repeatedly get confused for one another. The two exported structures are
// DERIVED from the clusters (see buildConfusionSets):
//   - CROSS_AREA_CONFUSION_WORK_NAMES = every member of every cluster. Any name
//     in this set forces Pass 2b (the two-pass orchestrator re-examines the
//     IMAGE), which has the visual evidence needed to choose correctly.
//   - CROSS_AREA_CONFUSION_COUNTERPARTS[x] = the rest of x's cluster(s). Fed to
//     Pass 2b candidate building so the re-look is handed every sibling as an
//     explicit A/B/C candidate — INCLUDING cross-area siblings a same-area
//     candidate fill could never surface.
//
// 🚨 SCOPE (updated Jul 4 2026): historically this list held ONLY strict
// cross-area pairs, because forcing Pass 2b on a same-area work with no
// cross-area partner is a cost regression with no quality win. The graduated-
// staircase cluster is the deliberate exception — it mixes same-area Sensorial
// works (Pink Tower, Brown Stair, Red Rods) with the cross-area MATHEMATICS
// member Number Rods, because the whole silhouette family ("a set of graded
// wooden pieces") is mutually confusable and the Number Rods miss is the one
// that files a Math work as Sensorial (the Jul-4 Sunshine Montessori incident:
// a Number Rods photo drafted as "Brown Stair"). Registering the family forces
// the image re-look for every staircase photo and makes every sibling reachable
// as a candidate. Same-area confusions with NO cross-area member (Color Box 1
// vs 2 vs 3, Golden Beads vs Short Bead Stair) still belong to the per-area pool
// + Pass 2b's existing low-confidence trigger — NOT here.
//
// To register a new confusion family: add ONE cluster line here + mutual
// 'NOT <Work>:' negatives in scripts/data/curated-visual-memory/*.json (then
// re-seed) + a harness case. No other code changes.
const CONFUSION_CLUSTERS: ReadonlyArray<readonly string[]> = [
  // Graduated-dimension silhouette family. All read as "graded wooden pieces";
  // COLOUR + which dimension varies are the discriminators (visual-id-guide.ts).
  // Number Rods (Mathematics — red+blue banded) is the cross-area member that
  // made this cluster urgent. Includes the combined Pink Tower + Brown Stair
  // presentation, a common Haiku guess for any staircase silhouette.
  [
    'pink tower',
    'brown stair (broad stair)', 'brown stair', 'broad stair',
    'red rods (long rods)', 'red rods',
    'number rods', 'number rods with numerals',
    'pink tower and brown stair',
  ],
  // Sensorial ↔ Mathematics — all-red rods vs red+blue alternating rods
  // (visual-id-guide.ts "RED RODS (Sensorial) vs NUMBER RODS (Mathematics)").
  ['red rods', 'red rods (long rods)', 'number rods'],
  // Language ↔ Sensorial — square frames in a vertical rack (language, writing
  // prep) vs a wide drawer cabinet of flat shape insets (sensorial, shape
  // matching). (visual-id-guide.ts "METAL INSETS vs GEOMETRIC CABINET").
  ['metal insets', 'geometric cabinet'],
  // Sensorial ↔ Mathematics — solid wooden block with KNOBBED cylinders in
  // round sockets vs numbered compartment box holding loose spindle bundles.
  // Registered Jul 3 2026 after the Bright Stars cold-start incident: a
  // Cylinder Block photo was confidently mismatched to "Spindle Boxes" at 0.85
  // on a zero-visual-memory account. Text-only descriptions blur them; the
  // image re-examination (Pass 2b) is what disambiguates.
  [
    'cylinder block 1', 'cylinder block 2', 'cylinder block 3', 'cylinder block 4',
    'cylinder blocks', 'cylinder blocks combined',
    'spindle box', 'spindle boxes',
  ],
  // Language ↔ Mathematics — single textured characters mounted one-per-board.
  // Sandpaper Letters (pink/blue boards, alphabet) vs Sandpaper Numerals (green
  // boards, digits 0-9). Registered with the Canonical Seed (Jul 3 2026): both
  // are "rough character on a coloured board, finger-traced" and text
  // descriptions converge; only board colour + character type disambiguates.
  // ('sandpaper numbers' is a common Haiku alias for 'Sandpaper Numerals'.)
  ['sandpaper letters', 'sandpaper numerals', 'sandpaper numbers'],
];

/**
 * Derive the flat name Set + the counterpart map from CONFUSION_CLUSTERS.
 * A name that appears in multiple clusters (e.g. 'red rods') accumulates the
 * UNION of all its clusters' siblings — a superset of the old hand-maintained
 * pairs, deduped. Counterpart VALUES stay lowercased; consumers resolve them
 * against a global/classroom visual-memory entry and skip any that don't
 * resolve (aliases like 'brown stair', 'sandpaper numbers'), so non-canonical
 * cluster members are harmless as counterparts and load-bearing only for the
 * force-Pass-2b membership set.
 */
function buildConfusionSets(clusters: ReadonlyArray<readonly string[]>): {
  names: Set<string>;
  counterparts: Record<string, string[]>;
} {
  const names = new Set<string>();
  const counterpartSets = new Map<string, Set<string>>();
  for (const cluster of clusters) {
    const members = cluster.map((n) => n.toLowerCase().trim()).filter(Boolean);
    for (const m of members) {
      names.add(m);
      if (!counterpartSets.has(m)) counterpartSets.set(m, new Set());
      const set = counterpartSets.get(m)!;
      for (const other of members) {
        if (other !== m) set.add(other);
      }
    }
  }
  const counterparts: Record<string, string[]> = {};
  for (const [k, v] of counterpartSets) counterparts[k] = [...v];
  return { names, counterparts };
}

const _confusion = buildConfusionSets(CONFUSION_CLUSTERS);

/**
 * Every work name that belongs to a confusion cluster. Membership FORCES Pass 2b
 * (image re-examination) when the matcher lands on it. Derived from
 * CONFUSION_CLUSTERS — do not hand-edit; add a cluster above instead.
 */
export const CROSS_AREA_CONFUSION_WORK_NAMES: ReadonlySet<string> = _confusion.names;

/**
 * Cross-cluster counterpart map: for a confusable work name, the OTHER members
 * of its cluster(s). Consumed by Pass 2b candidate building — when the matcher
 * lands on one side, the counterpart works' visual-memory entries (classroom or
 * global) are injected as explicit candidates so the image re-examination
 * chooses between them directly. A same-area candidate fill can never surface a
 * cross-area counterpart, which is the whole point.
 *
 * Derived from CONFUSION_CLUSTERS — do not hand-edit; add a cluster above.
 */
export const CROSS_AREA_CONFUSION_COUNTERPARTS: Readonly<Record<string, readonly string[]>> =
  _confusion.counterparts;

/** Returns true if either the raw Haiku name OR the matcher's resolved name appears in the cross-area confusion list. */
export function isCrossAreaConfusable(...names: Array<string | null | undefined>): boolean {
  for (const n of names) {
    if (!n) continue;
    if (CROSS_AREA_CONFUSION_WORK_NAMES.has(n.toLowerCase().trim())) return true;
  }
  return false;
}

/**
 * Returns the lowercased counterpart work names for any confusable name in
 * the argument list (deduped; never includes the input names themselves).
 */
export function getCrossAreaCounterparts(...names: Array<string | null | undefined>): string[] {
  const inputs = new Set(names.filter((n): n is string => !!n).map(n => n.toLowerCase().trim()));
  const out = new Set<string>();
  for (const n of inputs) {
    const counterparts = CROSS_AREA_CONFUSION_COUNTERPARTS[n];
    if (!counterparts) continue;
    for (const c of counterparts) {
      if (!inputs.has(c)) out.add(c);
    }
  }
  return [...out];
}

// ================================================================
// JARO-WINKLER SIMILARITY — For disambiguating near-identical names
// Used as tiebreaker when fuzzyScore gives equal scores (e.g., "Color Box 1" vs "Color Box 2")
// ================================================================

/** Jaro similarity score between two strings (0.0 to 1.0) */
function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0.0;

  const matchWindow = Math.max(0, Math.floor(Math.max(len1, len2) / 2) - 1);
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  return (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
}

/** Jaro-Winkler similarity: boosts Jaro score for common prefixes (up to 4 chars) */
export function jaroWinkler(s1: string, s2: string): number {
  const a = s1.toLowerCase().trim();
  const b = s2.toLowerCase().trim();
  const jaro = jaroSimilarity(a, b);
  // Common prefix length (max 4)
  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  // Winkler modification: p = 0.1 (standard)
  return jaro + prefix * 0.1 * (1 - jaro);
}

// ================================================================
// V2 MATCHING — Enhanced curriculum matching for Smart Capture
// Area-constrained, alias-aware, materials-boosted, top-3 candidates
// ================================================================

interface MatchCandidate {
  work: CurriculumWork;
  score: number;
}

interface MatchResult {
  candidates: MatchCandidate[];
  bestMatch: CurriculumWork | null;
  bestScore: number;
}

/**
 * Score a single curriculum work against an identified name.
 * Checks: exact name, aliases, Chinese name, and materials boost.
 */
function scoreWork(
  identifiedName: string,
  work: CurriculumWork,
  observationText?: string,
): number {
  const input = identifiedName.toLowerCase().trim();

  // 1. Score against primary name
  let score = fuzzyScore(input, work.name);
  if (score === 1.0) return score; // Exact match — no need to check further

  // 2. Score against aliases (take best)
  if (work.aliases && work.aliases.length > 0) {
    for (const alias of work.aliases) {
      const aliasScore = fuzzyScore(input, alias);
      if (aliasScore > score) score = aliasScore;
      if (score === 1.0) return score; // Exact alias match
    }
  }

  // 3. Score against Chinese name
  if (work.chineseName) {
    const cnScore = fuzzyScore(input, work.chineseName);
    if (cnScore > score) score = cnScore;
    if (score === 1.0) return score; // Exact Chinese name match
  }

  // 4. Materials boost (up to +0.15, capped)
  // Cross-reference observation text with work's materials list
  if (observationText && work.materials && work.materials.length > 0) {
    const obsLower = observationText.toLowerCase();
    let materialBoost = 0;
    for (const mat of work.materials) {
      // Check each meaningful word in the material name (>3 chars)
      const matWords = mat.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      for (const mw of matWords) {
        if (obsLower.includes(mw)) {
          materialBoost += 0.05;
          break; // One hit per material item
        }
      }
    }
    score = Math.min(1.0, score + Math.min(materialBoost, 0.15));
  }

  return score;
}

/**
 * Enhanced curriculum matching for Smart Capture.
 *
 * Strategy:
 * 0. Check corrections alias map (instant exact match from teacher feedback)
 * 1. Area-constrained first pass (filter to Sonnet's identified area)
 * 2. Score each work (name + aliases + Chinese name + materials boost)
 * 3. Return top 3 candidates
 * 4. If area-constrained best < 0.5, retry with full curriculum (one retry only)
 *
 * @param identifiedName - Work name from Sonnet vision
 * @param area - Area from Sonnet (null or 'unknown' = search all areas)
 * @param curriculum - Full curriculum works array
 * @param corrections - Map of original_name_lowercase → corrected_name (from montree_guru_corrections)
 * @param observationText - Sonnet's observation text (for materials boost)
 * @param isFallback - Internal: prevents infinite recursion on full-curriculum retry
 */
export function matchToCurriculumV2(
  identifiedName: string,
  area: string | null,
  curriculum: CurriculumWork[],
  corrections?: Map<string, string>,
  observationText?: string,
  isFallback?: boolean,
): MatchResult {
  if (!identifiedName) return { candidates: [], bestMatch: null, bestScore: 0 };

  const input = identifiedName.toLowerCase().trim();

  // 0. Check corrections alias map first (instant match from teacher feedback)
  // SAFETY: Corrections map entries are validated — the corrected name MUST exist in the
  // curriculum to prevent poisoned corrections (e.g., a bad DB entry pointing to a nonexistent
  // work) from returning a phantom score of 1.0. If the corrected name doesn't resolve to a
  // real curriculum work, we skip the shortcut and fall through to normal matching.
  // Score is capped at 0.98 (not 1.0) so corrections don't bypass the GREEN zone threshold
  // check identically to a perfect visual match — teacher confirmation is still possible.
  if (corrections && corrections.size > 0) {
    const correctedName = corrections.get(input);
    if (correctedName) {
      const exactMatch = curriculum.find(w => w.name.toLowerCase().trim() === correctedName.toLowerCase().trim());
      if (exactMatch) {
        return {
          candidates: [{ work: exactMatch, score: 0.98 }],
          bestMatch: exactMatch,
          bestScore: 0.98,
        };
      }
      // Corrected name doesn't match any curriculum work — skip (don't trust stale correction)
      console.warn(`[Matching] Stale correction ignored: "${input}" → "${correctedName}" (corrected name not in curriculum)`);
    }
  }

  // 1. Area-constrained pool
  const hasArea = area && area !== 'unknown';
  const pool = hasArea
    ? curriculum.filter(w => w.area_key === area)
    : curriculum;

  // 2. Score each work
  const scored: MatchCandidate[] = pool.map(w => ({
    work: w,
    score: scoreWork(identifiedName, w, observationText),
  }));

  // 3. Sort by score descending
  // Tiebreaker: Jaro-Winkler similarity for disambiguating near-identical names
  // (e.g., "Color Box 2" vs "Color Box 3" when both fuzzyScore the same)
  // Final fallback: curriculum sequence for determinism
  const inputLower = identifiedName.toLowerCase().trim();
  scored.sort((a, b) => {
    const scoreDiff = b.score - a.score;
    if (Math.abs(scoreDiff) > 0.001) return scoreDiff;
    // Tiebreak: Jaro-Winkler (higher = more similar to input = ranked first)
    const jwA = jaroWinkler(inputLower, a.work.name);
    const jwB = jaroWinkler(inputLower, b.work.name);
    if (Math.abs(jwB - jwA) > 0.001) return jwB - jwA;
    // Final fallback: curriculum sequence
    return a.work.sequence - b.work.sequence;
  });
  const candidates = scored.slice(0, 3).filter(c => c.score > 0.2);

  // 4. If area-constrained best is weak, retry with full curriculum (one retry only)
  if (!isFallback && hasArea && (candidates.length === 0 || candidates[0].score < 0.5)) {
    return matchToCurriculumV2(identifiedName, null, curriculum, corrections, observationText, true);
  }

  return {
    candidates,
    bestMatch: candidates.length > 0 ? candidates[0].work : null,
    bestScore: candidates.length > 0 ? candidates[0].score : 0,
  };
}
