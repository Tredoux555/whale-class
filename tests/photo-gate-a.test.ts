// tests/photo-gate-a.test.ts
//
// Gate A decides whether a photo may be auto-filed to a curriculum work with
// no teacher in the loop. These tests pin the invariant that matters most:
//
//   A photo the model itself called "not a curriculum work" must NEVER be
//   auto-filed, no matter how confident it is or how much visual memory the
//   classroom has.
//
// That used to hold only by accident of control flow — the "Other" escape
// hatch in process/route.ts returned before Gate A was reached. Classroom
// recall (2026-08-02) can now suppress that early return, so the guard is
// explicit and tested rather than incidental. If someone removes it, the
// "never files it alone" ruling silently breaks through the trusted-match
// branch instead of the Other branch.

import { describe, it, expect } from 'vitest';
import { shouldTrustHaikuMatch, type GateAInput } from '@/lib/montree/photo-identification/gate-a';

// Mirrors the tuned constants in app/api/montree/photo-identification/process/route.ts.
const BARS = {
  trustConfidence: 0.85,
  exactMatchScore: 1.0,
  exactFirstSightConfidence: 0.9,
};

function input(over: Partial<GateAInput> = {}): GateAInput {
  return {
    success: true,
    identification: { confidence: 0.95, matchScore: 0.6, is_curriculum_work: true },
    hasVisualMemoryForMatch: true,
    ...BARS,
    ...over,
  };
}

describe('shouldTrustHaikuMatch — the never-auto-file-an-Other invariant', () => {
  it('refuses to auto-file when the model says it is not a curriculum work, even at max confidence with visual memory', () => {
    expect(
      shouldTrustHaikuMatch(
        input({
          identification: { confidence: 1.0, matchScore: 1.0, is_curriculum_work: false },
          hasVisualMemoryForMatch: true,
        }),
      ),
    ).toBe(false);
  });

  it('refuses on Path 1 specifically (high confidence + classroom visual memory)', () => {
    // Path 1 historically did not check is_curriculum_work at all — this is the
    // exact hole classroom recall made reachable.
    expect(
      shouldTrustHaikuMatch(
        input({
          identification: { confidence: 0.99, matchScore: 0.2, is_curriculum_work: false },
          hasVisualMemoryForMatch: true,
        }),
      ),
    ).toBe(false);
  });

  it('refuses on Path 2 specifically (exact name match, first sight)', () => {
    expect(
      shouldTrustHaikuMatch(
        input({
          identification: { confidence: 0.95, matchScore: 1.0, is_curriculum_work: false },
          hasVisualMemoryForMatch: false,
        }),
      ),
    ).toBe(false);
  });
});

describe('shouldTrustHaikuMatch — Path 1 (taught before)', () => {
  it('trusts high confidence when the classroom has visual memory for the work', () => {
    expect(
      shouldTrustHaikuMatch(
        input({ identification: { confidence: 0.85, matchScore: 0.4, is_curriculum_work: true }, hasVisualMemoryForMatch: true }),
      ),
    ).toBe(true);
  });

  it('does not trust it without classroom visual memory', () => {
    expect(
      shouldTrustHaikuMatch(
        input({ identification: { confidence: 0.99, matchScore: 0.4, is_curriculum_work: true }, hasVisualMemoryForMatch: false }),
      ),
    ).toBe(false);
  });

  it('does not trust it just below the confidence bar', () => {
    expect(
      shouldTrustHaikuMatch(
        input({ identification: { confidence: 0.8499, matchScore: 0.4, is_curriculum_work: true }, hasVisualMemoryForMatch: true }),
      ),
    ).toBe(false);
  });
});

describe('shouldTrustHaikuMatch — Path 2 (first sight)', () => {
  it('trusts an exact name match at high confidence with no visual memory', () => {
    expect(
      shouldTrustHaikuMatch(
        input({ identification: { confidence: 0.9, matchScore: 1.0, is_curriculum_work: true }, hasVisualMemoryForMatch: false }),
      ),
    ).toBe(true);
  });

  it('requires an EXACT match — a near match is not enough', () => {
    expect(
      shouldTrustHaikuMatch(
        input({ identification: { confidence: 0.99, matchScore: 0.99, is_curriculum_work: true }, hasVisualMemoryForMatch: false }),
      ),
    ).toBe(false);
  });

  it('requires the higher first-sight confidence bar, not the Path 1 bar', () => {
    expect(
      shouldTrustHaikuMatch(
        input({ identification: { confidence: 0.86, matchScore: 1.0, is_curriculum_work: true }, hasVisualMemoryForMatch: false }),
      ),
    ).toBe(false);
  });
});

describe('shouldTrustHaikuMatch — degenerate input', () => {
  it('is false when identification failed', () => {
    expect(shouldTrustHaikuMatch(input({ success: false }))).toBe(false);
    expect(shouldTrustHaikuMatch(input({ identification: null }))).toBe(false);
  });

  it('treats an absent is_curriculum_work as permissive (only an explicit false blocks)', () => {
    // The model does not always populate the field; absence must not disable
    // auto-filing for the ordinary, well-behaved case.
    expect(
      shouldTrustHaikuMatch(
        input({ identification: { confidence: 0.95, matchScore: 0.5 }, hasVisualMemoryForMatch: true }),
      ),
    ).toBe(true);
    expect(
      shouldTrustHaikuMatch(
        input({ identification: { confidence: 0.95, matchScore: 0.5, is_curriculum_work: null }, hasVisualMemoryForMatch: true }),
      ),
    ).toBe(true);
  });
});
