// lib/montree/curriculum/duplicate-detection.ts
// Fuzzy duplicate detection for classroom curriculum works.
// Pure functions — no DB calls, no side effects.

export interface WorkCandidate {
  id: string;
  name: string;
  name_chinese?: string;
  area_id: string | null;
  is_custom: boolean;
  source: string | null;
  created_at: string;
  parent_description: string | null;
  why_it_matters: string | null;
  // Counts loaded by the API
  media_count: number;
  progress_count: number;
  visual_memory_exists: boolean;
}

export interface DuplicateGroup {
  works: WorkCandidate[];
  score: number; // 0–100, how confident we are these are duplicates
  reason: string; // human-readable explanation
}

/** Normalize a work name for comparison */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "'")       // normalize quotes
    .replace(/[-–—]/g, ' ')      // dashes → space
    .replace(/[()[\]{}]/g, '')   // remove brackets
    .replace(/\//g, ' ')         // slashes → space (preserves /o/ as token "o")
    .replace(/[^\w\s']/g, '')    // remove other punctuation
    .replace(/\s+/g, ' ')        // collapse whitespace
    .trim();
}

/**
 * Extract a "discriminator suffix" — a short distinguishing tail that makes
 * two otherwise-identical names represent DIFFERENT works.
 * e.g. "CVC Different Ending /o/" → "o", "CVC Different Ending /i/" → "i"
 * Returns null if no clear suffix discriminator.
 */
function extractSuffix(name: string): string | null {
  // Match trailing /X/ patterns (phonics markers)
  const phonics = name.match(/\/([^/]+)\/\s*$/);
  if (phonics) return phonics[1].toLowerCase().trim();
  // Match trailing parenthetical like "(Set A)" vs "(Set B)"
  const paren = name.match(/\(([^)]+)\)\s*$/);
  if (paren) return paren[1].toLowerCase().trim();
  return null;
}

/**
 * Check if two names share a long common prefix but differ only in a
 * short meaningful discriminator (phonics marker, set number, etc.)
 * If so, they are NOT duplicates — they're variants in a series.
 */
function isSeriesVariant(nameA: string, nameB: string): boolean {
  const suffA = extractSuffix(nameA);
  const suffB = extractSuffix(nameB);
  if (suffA && suffB && suffA !== suffB) {
    // Both have discriminator suffixes that differ — series variants, not duplicates
    return true;
  }
  return false;
}

/** Tokenize and sort words for order-independent comparison */
function sortedTokens(name: string): string {
  return normalize(name)
    .split(' ')
    .filter(w => w.length > 0)
    .sort()
    .join(' ');
}

/** Levenshtein distance between two strings */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/** Calculate similarity between two work names (0–100) */
export function similarity(nameA: string, nameB: string): { score: number; reason: string } {
  // Series variant guard — e.g. "CVC Different Ending /o/" vs "/i/"
  // These share a long prefix but differ in a meaningful discriminator
  if (isSeriesVariant(nameA, nameB)) {
    return { score: 0, reason: 'Series variants (different discriminator suffix)' };
  }

  const normA = normalize(nameA);
  const normB = normalize(nameB);

  // Exact match after normalization
  if (normA === normB) {
    return { score: 100, reason: 'Identical after normalizing punctuation/spacing' };
  }

  // Sorted tokens match (word reordering)
  const tokA = sortedTokens(nameA);
  const tokB = sortedTokens(nameB);
  if (tokA === tokB) {
    return { score: 98, reason: 'Same words in different order' };
  }

  // Check if one is a substring of the other (after normalization)
  // e.g., "Bingo" vs "Bingo Review"
  // Only flag if the shorter is at least 60% of the longer
  const shorter = normA.length <= normB.length ? normA : normB;
  const longer = normA.length <= normB.length ? normB : normA;

  // Levenshtein on normalized strings
  const dist = levenshtein(normA, normB);
  const maxLen = Math.max(normA.length, normB.length);
  const levScore = Math.round((1 - dist / maxLen) * 100);

  // Levenshtein on sorted tokens
  const tokDist = levenshtein(tokA, tokB);
  const tokMaxLen = Math.max(tokA.length, tokB.length);
  const tokLevScore = Math.round((1 - tokDist / tokMaxLen) * 100);

  // Take the best score from both approaches
  const bestScore = Math.max(levScore, tokLevScore);

  // Word overlap check
  const wordsA = new Set(normA.split(' '));
  const wordsB = new Set(normB.split(' '));
  const intersection = [...wordsA].filter(w => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  const overlapRatio = intersection.length / union.size;

  // Combine signals
  if (bestScore >= 85) {
    return {
      score: bestScore,
      reason: levScore >= tokLevScore
        ? `${dist} character edit${dist === 1 ? '' : 's'} apart`
        : `Same words, minor differences (${tokDist} edit${tokDist === 1 ? '' : 's'} on sorted tokens)`,
    };
  }

  // High word overlap even if Levenshtein is moderate
  if (overlapRatio >= 0.75 && intersection.length >= 2) {
    const score = Math.round(70 + overlapRatio * 20);
    return {
      score,
      reason: `${intersection.length}/${union.size} words shared: "${intersection.join(', ')}"`,
    };
  }

  // Substring containment (one name contains the other)
  if (shorter.length >= 4 && longer.includes(shorter) && shorter.length / longer.length >= 0.6) {
    const score = Math.round(65 + (shorter.length / longer.length) * 25);
    return { score, reason: `"${shorter}" is contained within "${longer}"` };
  }

  return { score: bestScore, reason: 'Low similarity' };
}

/** Minimum similarity score to flag as a potential duplicate */
const DUPLICATE_THRESHOLD = 75;

/**
 * Detect potential duplicate works in a classroom.
 * Groups are scoped to the same area — cross-area matches are excluded.
 */
export function detectDuplicates(works: WorkCandidate[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const assigned = new Set<string>(); // work IDs already in a group

  // Sort by name for deterministic results
  const sorted = [...works].sort((a, b) => a.name.localeCompare(b.name));

  for (let i = 0; i < sorted.length; i++) {
    if (assigned.has(sorted[i].id)) continue;

    const group: WorkCandidate[] = [sorted[i]];
    let bestScore = 0;
    let bestReason = '';

    for (let j = i + 1; j < sorted.length; j++) {
      if (assigned.has(sorted[j].id)) continue;

      // Only compare works in the same area
      if (sorted[i].area_id !== sorted[j].area_id) continue;

      const { score, reason } = similarity(sorted[i].name, sorted[j].name);
      if (score >= DUPLICATE_THRESHOLD) {
        group.push(sorted[j]);
        if (score > bestScore) {
          bestScore = score;
          bestReason = reason;
        }
      }
    }

    if (group.length >= 2) {
      // Also check pairwise between non-seed members
      // (transitive: if A≈B and A≈C, B and C might not be similar to each other,
      //  but we keep them in the group since they're all similar to A)
      for (const w of group) assigned.add(w.id);
      groups.push({
        works: group.sort((a, b) => {
          // Sort by richness: most photos + progress first (likely the "real" one)
          const scoreA = a.media_count * 2 + a.progress_count + (a.parent_description ? 1 : 0);
          const scoreB = b.media_count * 2 + b.progress_count + (b.parent_description ? 1 : 0);
          return scoreB - scoreA;
        }),
        score: bestScore,
        reason: bestReason,
      });
    }
  }

  // Sort groups by score descending (most confident first)
  return groups.sort((a, b) => b.score - a.score);
}
