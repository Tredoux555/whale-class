// lib/montree/photo-identification/classroom-recall.ts
//
// "Does this photo look like something THIS classroom has already taught me?"
//
// WHY THIS EXISTS (incident, 2026-07-29, Whale Class):
// A teacher photographed a ring-tree fine-motor work. Haiku Pass 2 answered
// `is_curriculum_work: false` at 0.90 confidence ("a decorative display… not
// recognizable Montessori curriculum materials") and the route's "Other"
// escape hatch fired, returning BEFORE Gate A. The teacher then taught the
// system what it was via Tell AI, a custom work was created, and visual memory
// was seeded correctly. Twenty-two seconds later a near-identical second photo
// produced the SAME `is_curriculum_work: false` verdict and was filed as Other
// again — because the escape hatch sits upstream of every matching step, the
// freshly-written visual memory could not influence the outcome. The work's
// visual-memory row still read times_used: 0.
//
// The structural error was asking "is this a curriculum work?" as a GATE before
// matching, rather than deriving it FROM matching. A classroom's own custom
// works are precisely the ones most likely to look "not like standard Montessori
// materials" to the model, so the escape hatch was biased against exactly the
// category it should protect.
//
// This module supplies the missing evidence: TF-IDF cosine similarity between
// the photo's Pass-1 visual description and every visual-memory entry the
// classroom owns. It is deliberately:
//   - PURE (scoreClassroomRecall takes a corpus, touches no DB) so it is testable
//   - LAZY (the corpus query only runs on the ~1% of photos Haiku calls "Other")
//   - CORPUS-WIDE (it reads ALL the classroom's visual memory, not the ≤40
//     entries that fit the Pass-2 prompt budget — recall is not prompt-bound)
//
// THRESHOLDS ARE CALIBRATED, NOT GUESSED. Measured against the real Whale Class
// corpus (322 entries) on 2026-08-02:
//   the incident photo   → Ring Tree Fine Motor Work 0.305 (runner-up 0.172)
//   a Pink Tower photo   → Pink Tower               0.471 (runner-up 0.247)
//   an outdoor snapshot  → best match               0.125
// Re-run scripts against real data before moving these numbers.

/** A classroom visual-memory row, reduced to what recall needs. */
export interface RecallEntry {
  workName: string;
  visualDescription: string | null;
  keyMaterials?: string[] | null;
}

export interface RecallHit {
  workName: string;
  /** TF-IDF cosine similarity, 0..1. */
  score: number;
  /** The distinctive terms the photo and the remembered work share. */
  sharedTerms: string[];
}

/**
 * At or above this, we treat the classroom's own memory as OUTWEIGHING Haiku's
 * "not a curriculum work" verdict: the photo is NOT filed as Other.
 */
export const RECALL_OVERRIDE_SCORE = 0.25;

/**
 * At or above this, a work is worth offering to the teacher as a one-tap chip,
 * even when we still believe the photo is probably Other.
 */
export const RECALL_CANDIDATE_SCORE = 0.15;

/** Terms too generic to carry signal in a photo description. */
const STOPWORDS = new Set(
  `a an the and or of on in to with is are was were be been it its this that these those for from by at as no not two both also
   small large big little into up down over under out about there here they them their he she his her you your i we our
   image photo picture visible appears appear appearing seen shows showing sit sits sitting placed positioned surface objects object pieces piece
   child children student work working uses using use made features contains contain holds hold each other same different
   likely rather than when while very some many few one three four five`
    .split(/\s+/)
    .filter(Boolean),
);

function tokenize(text: string | null | undefined): string[] {
  if (!text) return [];
  return (text.toLowerCase().match(/[a-z]+/g) || []).filter(
    (w) => w.length > 2 && !STOPWORDS.has(w),
  );
}

function entryTokens(e: RecallEntry): string[] {
  return [...tokenize(e.visualDescription), ...tokenize((e.keyMaterials || []).join(' '))];
}

/** L2-normalised TF-IDF vector. */
function vectorize(tokens: string[], idf: Map<string, number>): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);

  const v = new Map<string, number>();
  let sumSq = 0;
  for (const [term, count] of tf) {
    // Sub-linear tf damping. Terms absent from the corpus fall back to idf=1,
    // which is the MINIMUM this idf formula can produce (a term in every
    // document scores 1). They can never contribute to the dot product — no
    // document contains them — but they do enter the query vector's L2 norm,
    // so vocabulary the classroom has never seen mildly DEFLATES the score.
    // That is the conservative direction (fewer overrides, more photos shown
    // to the teacher) and the 0.25/0.15 bars were calibrated with it in place.
    const weight = (1 + Math.log(count)) * (idf.get(term) ?? 1);
    v.set(term, weight);
    sumSq += weight * weight;
  }
  const norm = Math.sqrt(sumSq) || 1;
  for (const [term, weight] of v) v.set(term, weight / norm);
  return v;
}

/**
 * Rank the classroom's remembered works against a photo's visual description.
 *
 * Pure — no DB, no clock, no randomness. Same inputs always give the same
 * ranking, which matters because this feeds a routing decision.
 *
 * IDF is computed over the classroom's OWN corpus, so a term is "distinctive"
 * relative to what this classroom actually teaches ("tray" is generic in a
 * Practical Life shelf, "jump" is not) — it self-calibrates per classroom
 * instead of relying on a hand-tuned global word list.
 */
export function scoreClassroomRecall(
  visualDescription: string | null | undefined,
  corpus: RecallEntry[],
  limit = 3,
): RecallHit[] {
  const queryTokens = tokenize(visualDescription);
  if (queryTokens.length === 0 || corpus.length === 0) return [];

  const docs = corpus
    .map((e) => ({ workName: e.workName, tokens: entryTokens(e) }))
    .filter((d) => d.workName && d.tokens.length > 0);
  if (docs.length === 0) return [];

  // Document frequency over the classroom corpus.
  const df = new Map<string, number>();
  for (const d of docs) {
    for (const term of new Set(d.tokens)) df.set(term, (df.get(term) || 0) + 1);
  }
  const N = docs.length;
  const idf = new Map<string, number>();
  for (const [term, count] of df) idf.set(term, Math.log((N + 1) / (count + 1)) + 1);

  const qv = vectorize(queryTokens, idf);

  const hits: RecallHit[] = docs.map((d) => {
    const dv = vectorize(d.tokens, idf);
    let score = 0;
    const shared: Array<{ term: string; weight: number }> = [];
    for (const [term, qw] of qv) {
      const dw = dv.get(term);
      if (dw === undefined) continue;
      const contribution = qw * dw;
      score += contribution;
      shared.push({ term, weight: contribution });
    }
    shared.sort((a, b) => b.weight - a.weight);
    return {
      workName: d.workName,
      score,
      sharedTerms: shared.slice(0, 6).map((s) => s.term),
    };
  });

  // Sort by score, then by name so ties are deterministic rather than
  // resolving to whatever order Postgres happened to return rows in.
  hits.sort((a, b) => b.score - a.score || a.workName.localeCompare(b.workName));
  return hits.filter((h) => h.score > 0).slice(0, limit);
}

/** True when the classroom's own memory should outweigh a "not a work" verdict. */
export function hasStrongRecall(hits: RecallHit[]): boolean {
  return hits.length > 0 && hits[0].score >= RECALL_OVERRIDE_SCORE;
}
