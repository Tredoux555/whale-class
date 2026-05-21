// lib/montree/english-sequence/client-helper.ts
//
// 🚨 Session 119 Phase 2 / Session 124 — client-side helper that fires an
// INFORMED "advance English position" prompt after a successful
// Language-area photo confirm in photo-audit (or any confirm surface).
//
// Session 124 sharpening: the prompt used to be blind — "Advance this
// child's English position?" with no context, so the teacher couldn't
// judge whether it made sense. It now first looks up the child's current
// lesson and shows it in the toast — "Amy is on Lesson 7 — the 'm' sound.
// Advance to Lesson 8?" — so the teacher decides knowing exactly where the
// child stands. Children already at the final lesson (128) are skipped
// silently. If the lookup fails the helper falls back to the original
// generic prompt — the nudge is never lost.
//
// Design: every confirm site calls this once after server-confirmed
// success. Single drop-point — schema/endpoint changes need one edit.

import { toast } from 'sonner';

interface OfferAdvanceInput {
  /** The child whose photo was just confirmed. */
  childId: string | null | undefined;
  childName: string | null | undefined;
  /** Montessori area of the confirmed work. Helper bails on anything but 'language'. */
  area: string | null | undefined;
}

// Per-child dedup window. Teachers confirm 3-5 Language photos for the same
// child in quick succession on a busy morning; without dedup each fires its
// own prompt and a reflex-tapping teacher could jump the child several
// lessons in 10 seconds. 12s is short enough to re-prompt on the next
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

  void (async () => {
    // Look up the child's current position so the prompt is INFORMED — the
    // teacher decides knowing where the child stands. Falls back to the
    // generic prompt if the lookup fails (never lose the nudge).
    let currentLesson: number | null = null;
    let currentLabel = '';
    let atFinal = false;
    try {
      // ?child_id= narrows the response to this one child — no need to pull
      // the whole class roll-call just to read one position.
      const res = await fetch(
        `/api/montree/dashboard/english-progress?child_id=${encodeURIComponent(childId)}`,
        { credentials: 'same-origin' },
      );
      if (res.ok) {
        const j = await res.json();
        const total = typeof j?.total_lessons === 'number' ? j.total_lessons : null;
        const row = Array.isArray(j?.children)
          ? j.children.find((c: { child_id?: string }) => c?.child_id === childId)
          : null;
        if (row && typeof row.current_lesson === 'number') {
          currentLesson = row.current_lesson;
          currentLabel = typeof row.lesson_label === 'string' ? row.lesson_label : '';
          atFinal = total !== null && row.current_lesson >= total;
        }
      }
    } catch {
      // Network/parse failure — fall through to the generic prompt.
    }

    // Already at the final lesson — nothing to advance to.
    if (atFinal) return;

    const next = currentLesson !== null ? currentLesson + 1 : null;
    const title =
      currentLesson !== null
        ? `📚 ${label} is on Lesson ${currentLesson}${currentLabel ? ` — ${currentLabel}` : ''}. Advance to ${next}?`
        : `📚 Advance ${label}'s English position?`;
    const actionLabel = next !== null ? `Advance to ${next}` : 'Advance +1';

    toast(title, {
      duration: 8000,
      action: {
        label: actionLabel,
        onClick: () => {
          // Fire-and-forget the PATCH. Server enforces all invariants.
          void fetch('/api/montree/dashboard/english-progress', {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'advance', child_id: childId }),
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
  })();
}
