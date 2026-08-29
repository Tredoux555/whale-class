/**
 * Dark Phonics Live — "Book Works", the FIRST online lesson.
 *
 * Lesson 1 is taught before a child can decode anything at all (the letter `s`
 * lesson, "The Snake Says Ssss" — the decodable ledger is still empty; the
 * whole Writing Shelf is correctly disabled here). So this activity is built
 * out of the LETTER BOOK instead of out of words: a real sock, four pictures,
 * a phrase, six spoken yes/no questions, and a potato.
 *
 * FIVE STEPS, walked by the teacher with Back/Next:
 *   0  The Sock          physical opener — the teacher holds up the real thing
 *   1  Match the Pictures identical picture-to-picture matching (STUDENT drags)
 *   2  Find the Picture   phrase → picture, into a pulsing frame (STUDENT drags)
 *   3  Yes or No          child answers ALOUD; the TEACHER marks ✓ / ✗
 *   4  The End            the book's potato twist page, then goodbye
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

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export interface BookCard {
  /** Stable id — this is what crosses the wire in `matched` / `drop`. */
  id: string;
  /** What the child says out loud when the picture is matched (spoken by Laura). */
  label: string;
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
  /** The four picture cards, in book order. */
  cast: BookCard[];
  /** Step 1: the RIGHT column, a fixed derangement of `cast` (no card faces its twin). */
  matchOrder: string[];
  /** Step 2: four phrase→picture rounds. */
  rounds: FindRound[];
  /** Step 3: six questions, fixed Y N Y N N Y. */
  questions: YesNoQuestion[];
  /** Step 0: what the teacher does, line by line, with the real sock in hand. */
  script: string[];
  /**
   * Step 4 — the book's own ending, not a prize: the potato twist page and the
   * line printed on it. Nothing is handed out and nothing is added up; the end
   * of the lesson is simply the end of the book.
   */
  endingImage: string;
  endingLine: string;
  goodbyeLine: string;
}

/** Titles of the five steps — used for the slide's step pills. */
export const BOOK_WORKS_STEP_TITLES = [
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

  cast: [
    { id: 'snake', label: 'snake', image: `${SOCK}/p2-snake.png` },
    { id: 'star', label: 'star', image: `${SOCK}/p3-star.png` },
    { id: 'soap', label: 'soap', image: `${SOCK}/p4-soap.png` },
    { id: 'seal', label: 'seal', image: `${SOCK}/p5-seal.png` },
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
