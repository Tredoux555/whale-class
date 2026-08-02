// lib/montree/photo-identification/gate-a.ts
//
// Gate A — "may we auto-file this photo to a work without a teacher looking?"
//
// Extracted from process/route.ts on 2026-08-02 so the invariant below is
// TESTABLE. The thresholds deliberately stay in the route (they are tuned from
// Railway [PhotoIdentification] GateA telemetry and documented there); this
// module owns only the decision logic.
//
// 🚨 THE INVARIANT THIS EXISTS TO PROTECT:
// A photo the model itself called "not a curriculum work" must NEVER be
// auto-filed to a work. Before 2026-08-02 that was true only by accident of
// control flow — the "Other" escape hatch returned before Gate A was reached,
// so the case was structurally unreachable. Classroom recall can now suppress
// that early return, which makes this path reachable for the first time. Path 1
// (high confidence + classroom visual memory) never checked is_curriculum_work,
// so a model response that set is_curriculum_work=false alongside a real,
// already-taught work name — schema-legal, just not what the prompt asks for —
// could have auto-filed. The guard is now explicit rather than incidental.

export interface GateAIdentification {
  confidence: number;
  matchScore: number;
  is_curriculum_work?: boolean | null;
}

export interface GateAInput {
  /** Did the two-pass identification succeed at all? */
  success: boolean;
  identification: GateAIdentification | null;
  /** Does THIS classroom have visual memory for the matched work? Classroom-scoped only. */
  hasVisualMemoryForMatch: boolean;
  /** Path 1 bar — see HAIKU_TRUST_CONFIDENCE in process/route.ts. */
  trustConfidence: number;
  /** Path 2 bar — exact curriculum-name match. */
  exactMatchScore: number;
  /** Path 2 bar — confidence required for a first-sight auto-file. */
  exactFirstSightConfidence: number;
}

/**
 * True only when the photo may be auto-filed to a curriculum work.
 *
 * Path 1 — high confidence AND this classroom has already taught the work.
 * Path 2 — "first sight": an exact curriculum-name match at very high
 *          confidence, trusted even before the classroom has visual memory.
 *
 * Both paths are hard-gated on the model not having declared the photo a
 * non-curriculum-work. Everything else falls through to teacher review.
 */
export function shouldTrustHaikuMatch(input: GateAInput): boolean {
  const { success, identification: ident, hasVisualMemoryForMatch } = input;

  if (!success || !ident) return false;

  // 🚨 Load-bearing: never auto-file something the model said isn't a work.
  if (ident.is_curriculum_work === false) return false;

  const path1 =
    ident.confidence >= input.trustConfidence && hasVisualMemoryForMatch;

  const path2 =
    ident.matchScore >= input.exactMatchScore &&
    ident.confidence >= input.exactFirstSightConfidence;

  return path1 || path2;
}
