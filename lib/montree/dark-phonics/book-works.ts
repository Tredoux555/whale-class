/**
 * Dark Phonics Live — "Book Works", the FIRST online lesson.
 *
 * Lesson 1 is taught before a child can decode anything at all (the letter `s`
 * lesson, "The Snake Says Ssss" — the decodable ledger is still empty; the
 * whole Writing Shelf is correctly disabled here). So this activity is built
 * out of the LETTER BOOK instead of out of words: a real sock, four pictures,
 * a phrase, six spoken yes/no questions, and a potato.
 *
 * EIGHT STEPS, walked by the teacher with Back/Next:
 *   0  The Video          watch the lesson's song together (bucket mp4)
 *   1  The Book           read all 7 pages together, one page at a time
 *   2  Trace the S        finger-trace a snake shaped like an S (STUDENT traces)
 *   3  The Sock           physical opener — the teacher holds up the real thing
 *   4  Match the Pictures identical picture-to-picture matching (STUDENT drags)
 *   5  Find the Picture   phrase → picture, into a pulsing frame (STUDENT drags)
 *   6  Yes or No          child answers ALOUD; the TEACHER marks ✓ / ✗
 *   7  The End            the book's potato twist page, then goodbye
 *
 * PURE by law, exactly like live-activities.ts: no I/O, no clock, no
 * Math.random. Teacher and parent surfaces derive identical content from the
 * lesson number; only the tiny cursor crosses the wire.
 *
 * 🚨 LESSON NUMBERING: `lessonNumber` here is the DISPLAY number (1–49) — the
 * same number `getWritingShelf()` takes and the same one the live-state route
 * computes and both classroom clients hold. Display 1 === curriculum raw n=5
 * (see rawLessonNumber() in live-lesson.ts), which is the snake/sock lesson.
 * Key on DISPLAY numbers here, never on raw `n`.
 *
 * CONTENT SOURCE: the book's own sentences are copied verbatim from
 * scripts/curriculum/satpin-paperwork/letters/dp-snake-in-my-sock.json
 * (`pages[].sentence`). The yes/no set deliberately does NOT reuse that file's
 * `yesno` block: this activity needs SIX questions in a fixed Y N Y N N Y
 * rhythm (mostly alternating, with one deliberate break so a four-year-old
 * cannot pattern-guess), and its "no" pictures are borrowed from the letter-A
 * book (ant-on-my-apple) rather than from two unrelated books.
 *
 * VIDEO is the ONE asset here that is NOT static: the song lives in the
 * `dark-phonics` Supabase bucket as `videos/lesson-NN.mp4` and is reached
 * through the media proxy. Its URL is derived from the display lesson number
 * by `lessonVideoUrl()` (live-lesson.ts), never hardcoded, so lesson 2 gets
 * its own song for free. Verified live 2026-08-29: the proxy returns 200 for
 * lesson-05.mp4 and lesson-05.png, and /api/montree/phonics-videos lists 5.
 *
 * ART: static copies under public/dark-phonics-live/pages/<slug>/, downscaled
 * from the gitignored phonics-images/ originals. Plain paths, no media proxy —
 * these ship inside the build.
 *
 * 🚨 THE DIRECTORY IS LOAD-BEARING. Do NOT move this art under
 * public/dark-phonics-books/ (the obvious-looking home): that whole tree is
 * gitignored, because those assets were migrated to the Supabase `static-assets`
 * bucket and next.config.ts rewrites /dark-phonics-books/* at it. Art filed
 * there would work on a laptop, never reach the Docker image, and 404 in the
 * middle of a real class. public/dark-phonics-live/ is a plain committed
 * public directory with no rewrite over it.
 */

import {
  lessonPictureUrl,
  lessonVideoUrl,
} from '@/lib/montree/dark-phonics/live-lesson';

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export interface BookCard {
  /** Stable id — this is what crosses the wire in `matched` / `drop`. */
  id: string;
  /** The picture's plain name — alt text, aria labels, never spoken alone. */
  label: string;
  /**
   * The card's own line FROM THE BOOK. Spoken when the child matches the
   * picture, so the reward for finding it is hearing the book again — a
   * four-year-old who has just read this page gets the whole phrase back, not
   * a bare noun. Verbatim from the storybook manifest, and already in Laura's
   * permanent cache because the read-along and the phrase step speak it too.
   */
  sentence: string;
  /** Static path under public/. */
  image: string;
}

export interface FindRound {
  /** Verbatim from the book. The teacher reads it; 🔊 speaks it. */
  sentence: string;
  /** Card id that belongs in the frame. */
  answerId: string;
  /** Card ids offered on the left, in display order. */
  candidateIds: string[];
}

/** One printed page of the letter book, in book order. */
export interface BookPage {
  /** Static path under public/. */
  art: string;
  /** The page's printed line, VERBATIM from the storybook manifest. */
  sentence: string;
}

export interface YesNoQuestion {
  question: string;
  answer: boolean;
  image: string;
}

export interface BookWorksLesson {
  /** Display lesson number this content belongs to. */
  lessonNumber: number;
  title: string;
  bookTitle: string;
  /**
   * Step 0's full-bleed art. Deliberately the book's opening "A sock." page
   * rather than its printed cover: step 0 is the teacher holding up the REAL
   * sock, so the child's screen should show the sock, not a title page. (The
   * printed cover also lives only in the static-assets bucket — see the
   * directory warning at the top of this file.)
   */
  coverImage: string;
  /**
   * Step 0: the lesson's song video and its still fallback, both media-proxy
   * URLs derived from the lesson number (never hardcoded).
   */
  videoUrl: string;
  videoPosterUrl: string;
  /** Step 1: every page of the book, in order — including recap and the twist. */
  pages: BookPage[];
  /** The four picture cards, in book order. */
  cast: BookCard[];
  /** Step 4: the RIGHT column, a fixed derangement of `cast` (no card faces its twin). */
  matchOrder: string[];
  /** Step 5: four phrase→picture rounds. */
  rounds: FindRound[];
  /** Step 6: six questions, fixed Y N Y N N Y. */
  questions: YesNoQuestion[];
  /** Step 3: what the teacher does, line by line, with the real sock in hand. */
  script: string[];
  /**
   * Step 7 — the book's own ending, not a prize: the potato twist page and the
   * line printed on it. Nothing is handed out and nothing is added up; the end
   * of the lesson is simply the end of the book.
   */
  endingImage: string;
  endingLine: string;
  goodbyeLine: string;
}

/** Titles of the eight steps — used for the slide's step pills. */
export const BOOK_WORKS_STEP_TITLES = [
  'The Video',
  'The Book',
  'Trace the S',
  'The Sock',
  'Match the Pictures',
  'Find the Picture',
  'Yes or No',
  'The End',
] as const;

export const BOOK_WORKS_STEP_COUNT = BOOK_WORKS_STEP_TITLES.length;

/* -------------------------------------------------------------------------- */
/* Lesson 1 — the snake in my sock                                             */
/* -------------------------------------------------------------------------- */

const SOCK = '/dark-phonics-live/pages/snake-in-my-sock';
const APPLE = '/dark-phonics-live/pages/ant-on-my-apple';

const LESSON_1: BookWorksLesson = {
  lessonNumber: 1,
  title: 'The Snake in My Sock',
  bookTitle: 'Snake in My Sock',
  coverImage: `${SOCK}/p1-sock.png`,

  // Display 1 → raw n=5 → videos/lesson-05.mp4 + pictures/lesson-05.png,
  // both through the media proxy. Derived, so lesson 2 needs no new code.
  videoUrl: lessonVideoUrl(1),
  videoPosterUrl: lessonPictureUrl(1),

  // All seven pages, text VERBATIM from
  // scripts/curriculum/dark-phonics-storybooks/manifest.json (slug
  // snake-in-my-sock). The four-page `pages[]` in the satpin-paperwork JSON is
  // a narrower "word pages only" view of the same book — the full read-along
  // needs the opener, the recap and the potato twist too.
  pages: [
    { art: `${SOCK}/p1-sock.png`, sentence: 'A sock.' },
    { art: `${SOCK}/p2-snake.png`, sentence: 'Snake in my sock!' },
    { art: `${SOCK}/p3-star.png`, sentence: 'Star in my sock!' },
    { art: `${SOCK}/p4-soap.png`, sentence: 'Soap in my sock!' },
    { art: `${SOCK}/p5-seal.png`, sentence: 'Seal in my sock!' },
    { art: `${SOCK}/p6-recap.png`, sentence: 'Snake, star, soap, and seal in my sock?!' },
    { art: `${SOCK}/p7-potato-twist.png`, sentence: 'The potato in my sock?' },
  ],

  cast: [
    { id: 'snake', label: 'snake', sentence: 'Snake in my sock!', image: `${SOCK}/p2-snake.png` },
    { id: 'star', label: 'star', sentence: 'Star in my sock!', image: `${SOCK}/p3-star.png` },
    { id: 'soap', label: 'soap', sentence: 'Soap in my sock!', image: `${SOCK}/p4-soap.png` },
    { id: 'seal', label: 'seal', sentence: 'Seal in my sock!', image: `${SOCK}/p5-seal.png` },
  ],

  // A true derangement of ['snake','star','soap','seal'] — no card sits opposite
  // its own twin, so every match is a real look-and-find, never a straight line.
  matchOrder: ['seal', 'soap', 'snake', 'star'],

  rounds: [
    // Sentences verbatim from dp-snake-in-my-sock.json `pages[].sentence`.
    { sentence: 'Snake in my sock!', answerId: 'snake', candidateIds: ['star', 'snake', 'seal', 'soap'] },
    { sentence: 'Star in my sock!', answerId: 'star', candidateIds: ['soap', 'seal', 'star', 'snake'] },
    { sentence: 'Soap in my sock!', answerId: 'soap', candidateIds: ['soap', 'snake', 'star', 'seal'] },
    { sentence: 'Seal in my sock!', answerId: 'seal', candidateIds: ['snake', 'star', 'soap', 'seal'] },
  ],

  // Fixed Y N Y N N Y. Mostly alternating so the rhythm is learnable, with the
  // 4→5 double NO breaking it — a child who has spotted "yes, no, yes, no…"
  // must still look at the picture.
  questions: [
    { question: 'Is a snake in my sock?', answer: true, image: `${SOCK}/p2-snake.png` },
    { question: 'Is an ant in my sock?', answer: false, image: `${APPLE}/p2-ant.png` },
    { question: 'Is a star in my sock?', answer: true, image: `${SOCK}/p3-star.png` },
    { question: 'Is an alligator in my sock?', answer: false, image: `${APPLE}/p3-alligator.png` },
    { question: 'Is an anteater in my sock?', answer: false, image: `${APPLE}/p4-anteater.png` },
    { question: 'Is a seal in my sock?', answer: true, image: `${SOCK}/p5-seal.png` },
  ],

  script: [
    'Hold up the real sock — the tall red-and-white striped one.',
    'Hold up the snake. “Where is the snake?”',
    'Push the snake into the sock, slowly, so they watch it disappear.',
    '“A snake in my sock!” — say it big, then let them say it back.',
    '“Do you have a sock? Do you have a snake?” — send them running to fetch.',
    'Wait for them. When they come back, they hold theirs up and say it with you.',
  ],

  endingImage: `${SOCK}/p7-potato-twist.png`,
  endingLine: 'The potato in my sock?!',
  goodbyeLine: 'Great work today. Put your sock somewhere safe — we need it again next time.',
};

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

const LESSONS: Record<number, BookWorksLesson> = {
  1: LESSON_1,
};

/**
 * The Book Works content for a DISPLAY lesson number (1–49), or null when this
 * lesson has no book activity authored yet. The teacher's picker uses null to
 * disable the button — it never hides it.
 */
export function getBookWorks(lessonNumber: number): BookWorksLesson | null {
  return LESSONS[Math.round(lessonNumber)] ?? null;
}

/**
 * The LOCKED book-line typography rule, in code.
 *
 * Source of truth: scripts/curriculum/dark-phonics-storybooks/build_a5_readers.py
 * — "LOCKED TEXT RULE (2026-08-22)", and that file's SPLITS entry for
 * snake-in-my-sock. Every printed page is a small italic LEAD-IN plus the
 * literal LAST WORD, set big and bold, with nothing trailing after it
 * ("Snake in my" · "sock!"). The screen must read the same way the paper
 * does, so the split is derived here rather than authored per page: the
 * sentence stays verbatim in the data, and this is the one place the rule
 * lives.
 *
 * A single-word line (none exist today) returns an empty lead — the word is
 * simply the shout.
 */
export function splitBookLine(sentence: string): { lead: string; shout: string } {
  const text = sentence.trim();
  const cut = text.lastIndexOf(' ');
  if (cut < 0) return { lead: '', shout: text };
  return { lead: text.slice(0, cut), shout: text.slice(cut + 1) };
}

/** Look one card up by id. */
export function findCard(lesson: BookWorksLesson, id: string): BookCard | undefined {
  return lesson.cast.find((c) => c.id === id);
}

/**
 * EVERY card id this activity can ever put on the wire, across all lessons.
 * The live-state route validates a student's `matched`/`drop` against this set,
 * so a parent device can never write arbitrary strings into the class row.
 */
export const BOOK_WORKS_CARD_IDS: readonly string[] = Object.freeze(
  Array.from(new Set(Object.values(LESSONS).flatMap((l) => l.cast.map((c) => c.id))))
);

/** Longest `matched` array any lesson could legitimately produce. */
export const BOOK_WORKS_MATCHED_MAX = Object.values(LESSONS).reduce(
  (max, l) => Math.max(max, l.cast.length),
  0
);

/** Hard cap on a card id's length, enforced server-side. */
export const BOOK_WORKS_ID_MAX = 24;

/**
 * The tracing step's progress, as a whole percent. It is a STUDENT-owned key
 * (the child's finger is on the family's tablet, so only that device knows how
 * far the S is traced), so the live-state route bounds it server-side against
 * exactly this range — integers only, nothing else.
 */
export const BOOK_WORKS_TRACE_MIN = 0;
export const BOOK_WORKS_TRACE_MAX = 100;
