/**
 * Dark Phonics Live — lesson-to-board adapter.
 *
 * Thin, pure mapping from an existing Dark Phonics lesson (the `RAW` array in
 * `lib/montree/dark-phonics/lessons.ts` — hoisted out of the library page in
 * Phase 2 so both the page and this module read one list) to the whiteboard
 * "scenes" the live classroom stage renders. NO new content is authored here —
 * every string and asset comes from `RAW`, every URL goes through the same
 * media-proxy pattern the real library page uses.
 *
 * REWRITTEN 2026-08-19 after an independent audit + a direct read of the real
 * `app/montree/library/dark-phonics/page.tsx`. The first draft invented a
 * content shape (`decodable` as a paginated book, a `lessons/<n>/tracing.png`
 * asset, `pictures` addressed as `lessons/<n>/letter-card.png`) that doesn't
 * match reality. Corrected against the real file:
 *   - `RawLesson.decodable` is `string[]` — the new decodable words THIS
 *     lesson's reader introduces, not a book reference. There is no
 *     paginated "decodable book" concept in the data at all.
 *   - Bucket media keys use the curriculum's own numbering (`n`, 5–53), zero-
 *     padded to 2 digits — `pictures/lesson-NN.png`, `videos/lesson-NN.mp4`.
 *     The real file's own comment is explicit: "Use [displayN] for EVERY
 *     rendered lesson number; never for a media key or a bucket path."
 *   - Book covers: `book.cover` (a literal path, when the RAW entry sets an
 *     override) else `books/covers/<slug>.png` through the proxy — exactly
 *     mirrored from the real page's `src={book.cover ?? media(...)}`.
 *   - No per-lesson tracing image exists in the bucket. Tracing packs are
 *     PDFs in `dark-phonics-materials/<slug>/`, printed and done on paper at
 *     home — the teacher watches via the video call, not the whiteboard
 *     (matches the product research: paper + camera, not a digital trace).
 *     There is deliberately no 'tracing' scene here; do not re-add one
 *     pointing at a bucket path that doesn't exist.
 *
 * DISPLAY VS RAW NUMBERING: every other part of this scaffold (the recap
 * table's `lesson_number` CHECK, `DARK_PHONICS_LESSON_COUNT`, the "Lesson 7
 * of 49" framing in the UI) uses DISPLAY numbers (1–49). The curriculum's own
 * `n` field (5–53) is what media paths and the RAW lookup are keyed on. To
 * keep every OTHER caller in this scaffold free of that conversion,
 * `getLiveLessonScenes()`'s public parameter is the DISPLAY number — it
 * converts internally (`rawN = displayNumber + 4`) before looking up `RAW`.
 * If you ever call this with the curriculum's raw `n` by mistake, you'll get
 * the wrong lesson (or an empty stage) — use `buildLiveLessonScenes(lesson)`
 * directly if you already hold a `RAW` entry and want to skip the conversion.
 *
 * Scene order is the lesson script:
 *   1. hero        — the lesson's video (trap-beat song) if present, else its picture
 *   2. word-chips   — hard-card vocab from `words`
 *   3. decodable-words — new decodable words this lesson's reader introduces
 *   4. heart-words  — irregular sight words, if any
 *   5. book-cover(s) — one per `books` entry, then `reader` if present
 */

/* -------------------------------------------------------------------------- */
/* Lesson shape — the ONE definition, imported (Phase 2 hoist).                */
/* The local `DarkPhonics{Lesson,Book,Reader}` mirrors that used to live here  */
/* are gone: they were a copy of `RawLesson`/`Book`/`Reader` kept only because */
/* `RAW` was trapped inside a page component. It isn't any more.               */
/* -------------------------------------------------------------------------- */

import { RAW, nn, type RawLesson } from '@/lib/montree/dark-phonics/lessons';

export type { RawLesson, Book, Reader } from '@/lib/montree/dark-phonics/lessons';

/* -------------------------------------------------------------------------- */
/* Scenes                                                                      */
/* -------------------------------------------------------------------------- */

export type LiveLessonScene =
  | { type: 'hero'; kind: 'video' | 'picture'; sound: string; title: string; catchphrase: string; mediaUrl: string }
  | { type: 'word-chips'; words: string[] }
  | { type: 'decodable-words'; words: string[] }
  | { type: 'heart-words'; words: string[] }
  | { type: 'book-cover'; slug: string; title: string; coverUrl: string; kind: 'book' | 'reader' };

/* -------------------------------------------------------------------------- */
/* Media — mirrors the real page's `nn()` / `media()` helpers exactly          */
/* -------------------------------------------------------------------------- */

/** `nn()` (zero-padded lesson number) is imported from lessons.ts — same helper the library page uses. */

/** Media-proxy URL for a path inside the public `dark-phonics` bucket. Mirrors the real page's `media()`. */
export function mediaProxyUrl(path: string, v?: number): string {
  const clean = path.replace(/^\/+/, '');
  return `/api/montree/media/proxy/${clean}?bucket=dark-phonics${v ? `&v=${v}` : ''}`;
}

const PATHS = {
  video: (n: number) => `videos/lesson-${nn(n)}.mp4`,
  picture: (n: number) => `pictures/lesson-${nn(n)}.png`,
  bookCoverFallback: (slug: string) => `books/covers/${slug}.png`,
};

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

/** Progress helper for the recap card ("lesson 7 of 49"). */
export const DARK_PHONICS_LESSON_COUNT = 49;

/**
 * DISPLAY number (1–49, matching `DARK_PHONICS_LESSON_COUNT` and every
 * recap/UI reference in this scaffold) → the curriculum's raw `n` (5–53).
 * The real page's own comment: "Use [displayN] for EVERY rendered lesson
 * number; never for a media key or a bucket path" — this is the inverse.
 */
export function rawLessonNumber(displayNumber: number): number {
  return displayNumber + 4;
}

/** Inverse of `rawLessonNumber` — raw `n` → the 1–49 number parents see. */
export function displayLessonNumber(n: number): number {
  return n - 4;
}

/**
 * The lesson's song-card PICTURE (`pictures/lesson-NN.png`) for a DISPLAY
 * lesson number — the natural fallback when the hero video 404s or the codec
 * is unsupported. Same bucket/proxy convention as every other asset here.
 */
export function lessonPictureUrl(displayLessonNum: number): string {
  return mediaProxyUrl(PATHS.picture(rawLessonNumber(displayLessonNum)));
}

/**
 * The RAW lesson behind a DISPLAY number (1..49), or `null`. Used by the
 * classroom's end-of-class recap form to prefill "words drilled" from the
 * lesson's own `words` + `decodable` lists.
 */
export function getLiveLesson(displayLessonNum: number, lessons: RawLesson[] = RAW): RawLesson | null {
  return lessons.find((l) => l.n === rawLessonNumber(displayLessonNum)) ?? null;
}

/**
 * Ordered board scenes for a DISPLAY lesson number (1..49) — NOT the
 * curriculum's raw `n`. Converts internally. Returns `[]` for an unknown
 * lesson number — callers render an empty stage rather than crashing mid-class.
 */
export function getLiveLessonScenes(
  displayLessonNum: number,
  lessons: RawLesson[] = RAW
): LiveLessonScene[] {
  const rawN = rawLessonNumber(displayLessonNum);
  const lesson = lessons.find((l) => l.n === rawN);
  if (!lesson) return [];
  return buildLiveLessonScenes(lesson);
}

/** Same mapping, when the caller already holds the lesson object (keyed by real `n`, no conversion). */
export function buildLiveLessonScenes(lesson: RawLesson): LiveLessonScene[] {
  const scenes: LiveLessonScene[] = [];

  // Hero: prefer the lesson's video (the trap-beat song — the actual hook of
  // Dark Phonics) when one exists; the picture is the fallback. Both are
  // probed for existence server-side by the caller if it matters (mirrors
  // how the real library/satpin pages HEAD-probe optional assets) — this
  // adapter just returns the URL, it does not verify the object exists.
  scenes.push({
    type: 'hero',
    kind: 'video',
    sound: lesson.sound,
    title: lesson.title,
    catchphrase: lesson.catchphrase,
    mediaUrl: mediaProxyUrl(PATHS.video(lesson.n)),
  });

  if (lesson.words?.length) {
    scenes.push({ type: 'word-chips', words: lesson.words });
  }

  if (lesson.decodable?.length) {
    scenes.push({ type: 'decodable-words', words: lesson.decodable });
  }

  if (lesson.heartWords?.length) {
    scenes.push({ type: 'heart-words', words: lesson.heartWords });
  }

  for (const book of lesson.books ?? []) {
    scenes.push({
      type: 'book-cover',
      slug: book.slug,
      title: book.title,
      coverUrl: book.cover ?? mediaProxyUrl(PATHS.bookCoverFallback(book.slug), 4),
      kind: 'book',
    });
  }

  if (lesson.reader) {
    scenes.push({
      type: 'book-cover',
      slug: lesson.reader.slug,
      title: lesson.reader.title,
      // Readers don't carry a `cover` override field in RAW — fall back to
      // the same books/covers/<slug>.png convention. ASSUMPTION: readers'
      // covers live in the same bucket path shape as books' — the real page
      // doesn't render a reader cover image at all (it links out via
      // slug/materialsSlug to printable packs), so this is inferred, not
      // confirmed against a render call site.
      coverUrl: mediaProxyUrl(PATHS.bookCoverFallback(lesson.reader.slug), 4),
      kind: 'reader',
    });
  }

  return scenes;
}
