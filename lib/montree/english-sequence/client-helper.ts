// lib/montree/english-sequence/client-helper.ts
//
// 🛑 RETIRED 2026-09-06 — the "advance this child's English position" nudge
// is gone with the 128-lesson pointer it moved.
//
// Constitution rule 8: mastery is DERIVED. A letter is finished when its
// five Dark Phonics works are mastered (rule 7), so there is no position to
// advance and no toast that could honestly offer to advance it. The old
// helper PATCHed /api/montree/dashboard/english-progress, which now answers
// 410 Gone.
//
// The function survives as a NO-OP so the four call sites in
// app/montree/dashboard/photo-audit/page.tsx keep compiling untouched (that
// file is a write surface owned elsewhere). Delete the calls and then this
// file when that page is next revised.

interface OfferAdvanceInput {
  childId: string | null | undefined;
  childName: string | null | undefined;
  area: string | null | undefined;
}

/** No-op. Retired — see the file header. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function offerEnglishAdvance(_input: OfferAdvanceInput): void {
  // Intentionally empty: nothing to advance, nothing to prompt.
}
