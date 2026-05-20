// lib/montree/english-sequence/client-helper.ts
//
// 🚨 Session 119 Phase 2 — client-side helper that fires the "advance
// English position" toast after a successful Language-area photo
// confirm in photo-audit (or any other surface that confirms a
// Language work).
//
// Design: every confirm site already calls invalidateEnglishWeekCache()
// after server-confirmed success. This helper adds a SINGLE matching
// drop-point for the English-position prompt — single source of truth
// so future schema / endpoint changes only need one edit.
//
// What the helper does:
//   1. Inspects the photo's resolved area. Bails when not 'language'.
//   2. Fires a follow-up sonner toast with an "Advance +1" action.
//   3. On tap, POSTs to the english-progress PATCH endpoint.
//   4. Shows success / error feedback.
//
// What the helper deliberately does NOT do (yet):
//   - Match the confirmed work to the child's current lesson's mapped
//     works. Phase 3 will add a `lessonToWorks` table in lesson-map.ts
//     and gate the prompt to only fire when relevant. For Phase 2 v1
//     the teacher sees the prompt on every Language confirm — one tap
//     skips if irrelevant, one tap advances if it is. Tap cost ≤ scroll
//     cost on a busy classroom.
//   - Show the CHILD's current lesson number in the toast (would need a
//     server roundtrip first). Phase 3 will piggyback the lesson number
//     onto the confirm response so the toast can say "Advance Amy from
//     Lesson 7 to Lesson 8?".

import { toast } from 'sonner';

interface OfferAdvanceInput {
  /** The child whose photo was just confirmed. */
  childId: string | null | undefined;
  childName: string | null | undefined;
  /** The Montessori area of the confirmed work — 'language', 'mathematics',
   *  'sensorial', 'practical_life', 'cultural', or null/unknown. Helper
   *  bails on anything but 'language'. */
  area: string | null | undefined;
}

// 🚨 Audit pass 2 fix (Q7): per-child dedup window. Teachers often confirm
// 3-5 Language photos for the same child in quick succession (busy classroom
// morning — kid did sandpaper letter, build with t-s-a-p, reading card,
// they're all going in). Without dedup, each fires its own "Advance +1"
// toast and a reflex-tapping teacher could jump the child several lessons
// in 10 seconds. Window: 12s — short enough to re-prompt on the next
// distinct work session, long enough to absorb a batch of related confirms.
const PER_CHILD_DEDUP_MS = 12_000;
const lastPromptByChild = new Map<string, number>();

/**
 * Fire-and-forget. Safe to call from any confirm success path.
 * Returns void — never throws — toast handles all UX feedback.
 */
export function offerEnglishAdvance(input: OfferAdvanceInput): void {
  const { childId, childName, area } = input;
  if (!childId || !area) return;
  // Tolerate the few alias spellings the codebase has used over time.
  const norm = String(area).toLowerCase();
  if (norm !== 'language' && norm !== 'lang') return;

  // Dedup: skip if we showed a prompt for this child within the window.
  const now = Date.now();
  const lastPromptAt = lastPromptByChild.get(childId);
  if (lastPromptAt !== undefined && now - lastPromptAt < PER_CHILD_DEDUP_MS) {
    return;
  }
  lastPromptByChild.set(childId, now);

  const label = childName || 'this child';

  toast(`📚 Advance ${label}'s English position?`, {
    duration: 8000,
    action: {
      label: 'Advance +1',
      onClick: () => {
        // Fire-and-forget the PATCH. Server enforces all invariants.
        void fetch('/api/montree/dashboard/english-progress', {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'advance',
            child_id: childId,
          }),
        })
          .then(async (res) => {
            if (!res.ok) {
              const j = await res.json().catch(() => ({}));
              toast.error(j?.error || `Could not advance (${res.status})`);
              return;
            }
            const j = await res.json().catch(() => ({}));
            const newLesson = j?.current_lesson;
            const lessonLabel = j?.lesson_label;
            toast.success(
              newLesson
                ? `${label} → Lesson ${newLesson}${lessonLabel ? ' · ' + lessonLabel : ''}`
                : `${label} advanced one lesson`,
            );
          })
          .catch((err) => {
            toast.error(err instanceof Error ? err.message : 'Could not advance');
          });
      },
    },
  });
}
