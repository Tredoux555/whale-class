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

  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;

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
  if (corrections && corrections.size > 0) {
    const correctedName = corrections.get(input);
    if (correctedName) {
      const exactMatch = curriculum.find(w => w.name.toLowerCase().trim() === correctedName.toLowerCase().trim());
      if (exactMatch) {
        return {
          candidates: [{ work: exactMatch, score: 1.0 }],
          bestMatch: exactMatch,
          bestScore: 1.0,
        };
      }
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

  // 3. Sort by score descending (stable: tiebreak by sequence for determinism)
  scored.sort((a, b) => b.score - a.score || a.work.sequence - b.work.sequence);
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
