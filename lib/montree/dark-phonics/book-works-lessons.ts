/**
 * Book Works — lessons 2 to 10.
 *
 * Lesson 1 stays in book-works.ts, hand-authored and shipped; these nine are
 * MACHINE-DERIVED from the repo's own curriculum data and must stay that way.
 * Nothing a child reads here was written by hand:
 *
 *   pages[].sentence   scripts/curriculum/flashcards/books_def.py BOOKS[].spreads
 *                      (lead-in `nar` + shout `text`, joined — the same locked
 *                      split splitBookLine() re-derives for the screen), and
 *                      for ant-on-my-apple the storybook manifest's pages[].
 *   cast[]             dp-<slug>.json pages[] (word, sentence, art) verbatim.
 *   matchOrder         dp-<slug>.json matchDisplayOrder — asserted a derangement
 *                      for all nine, so no card ever faces its own twin.
 *   rounds[]           the cast's own sentences; only the candidate ORDER is
 *                      computed (a fixed rotation per round, deterministic).
 *   questions[]        dp-<slug>.json yesno[] — wording and art verbatim; only
 *                      WHICH six and in what order is chosen (see below).
 *   endingImage/Line   the book's last page and its printed line.
 *
 * The one thing written by hand is `script[]` — the physical opener. Those are
 * TEACHER stage directions (plain instructions, deliberately my words), and
 * every line the teacher SAYS inside them is quoted verbatim from the book.
 *
 * 🚨 QUESTION SELECTION is a judgement call, recorded here so it can be
 * reversed in one line. The source files hold either 4 questions (alternating
 * true/false) or 10 (five true, then five false). Taking "the first six" of a
 * 10-set would give five YES answers then one NO — which a four-year-old beats
 * by simply always saying yes. So: three trues and three falses are taken in
 * source order and laid out YES NO YES NO NO YES — the same rhythm Lesson 1
 * ships with, mostly alternating with one deliberate break. The 4-question
 * books are reordered YES NO NO YES for the same reason. No wording, answer or
 * image is altered by any of this.
 *
 * REGENERATE rather than hand-edit: the generator reads books_def.py, the
 * dp-<slug>.json letters and the storybook manifest.
 */

import {
  lessonPictureUrl,
  lessonVideoUrl,
} from '@/lib/montree/dark-phonics/live-lesson';
import type { BookWorksLesson } from '@/lib/montree/dark-phonics/book-works';

/** Every page image ships in the build under this committed public directory. */
const P = '/dark-phonics-live/pages';

export const BOOK_WORKS_LESSONS_2_10: Record<number, BookWorksLesson> = {
  2: {
    lessonNumber: 2,
    letter: 'a',
    traceTitle: 'Trace the a',
    title: 'A Is for Apple',
    bookTitle: 'Ant on My Apple',
    coverImage: `${P}/ant-on-my-apple/p1-apple.png`,
    videoUrl: lessonVideoUrl(2),
    videoPosterUrl: lessonPictureUrl(2),
    pages: [
      { art: `${P}/ant-on-my-apple/p1-apple.png`, sentence: 'An apple.' },
      { art: `${P}/ant-on-my-apple/p2-ant.png`, sentence: 'An ant on my apple!' },
      { art: `${P}/ant-on-my-apple/p3-alligator.png`, sentence: 'An alligator on my apple!' },
      { art: `${P}/ant-on-my-apple/p4-anteater.png`, sentence: 'An anteater on my apple!' },
      { art: `${P}/ant-on-my-apple/p5-ambulance.png`, sentence: 'An ambulance on my apple!' },
      { art: `${P}/ant-on-my-apple/p6-recap.png`, sentence: 'An ant, an alligator, an anteater, and an ambulance on my apple?!' },
    ],
    cast: [
      { id: 'ant', label: 'ant', sentence: 'An ant on my apple!', image: `${P}/ant-on-my-apple/p2-ant.png` },
      { id: 'alligator', label: 'alligator', sentence: 'An alligator on my apple!', image: `${P}/ant-on-my-apple/p3-alligator.png` },
      { id: 'anteater', label: 'anteater', sentence: 'An anteater on my apple!', image: `${P}/ant-on-my-apple/p4-anteater.png` },
      { id: 'ambulance', label: 'ambulance', sentence: 'An ambulance on my apple!', image: `${P}/ant-on-my-apple/p5-ambulance.png` },
    ],
    matchOrder: ['anteater', 'ant', 'ambulance', 'alligator'],
    rounds: [
      { sentence: 'An ant on my apple!', answerId: 'ant', candidateIds: ['alligator', 'anteater', 'ambulance', 'ant'] },
      { sentence: 'An alligator on my apple!', answerId: 'alligator', candidateIds: ['anteater', 'ambulance', 'ant', 'alligator'] },
      { sentence: 'An anteater on my apple!', answerId: 'anteater', candidateIds: ['ambulance', 'ant', 'alligator', 'anteater'] },
      { sentence: 'An ambulance on my apple!', answerId: 'ambulance', candidateIds: ['ant', 'alligator', 'anteater', 'ambulance'] },
    ],
    questions: [
      { question: 'is an ant on my apple?', answer: true, image: `${P}/ant-on-my-apple/p2-ant.png` },
      { question: 'is a snake on my apple?', answer: false, image: `${P}/snake-in-my-sock/p2-snake.png` },
      { question: 'is a tiger on my apple?', answer: false, image: `${P}/tiger-in-the-taxi/p4-tiger.png` },
      { question: 'is an alligator on my apple?', answer: true, image: `${P}/ant-on-my-apple/p3-alligator.png` },
    ],
    script: [
      'Hold up a real apple and the toy ant.',
      'Show the apple on its own first. “An apple.”',
      'Walk the ant up onto it, slowly, so they watch it arrive.',
      '“An ant on my apple!” — say it big, then let them say it back.',
      '“Do you have an apple? Do you have an ant?” — send them running to fetch.',
      'Wait for them. When they come back, they hold theirs up and say it with you.',
    ],
    endingImage: `${P}/ant-on-my-apple/p6-recap.png`,
    endingLine: 'An ant, an alligator, an anteater, and an ambulance on my apple?!',
    goodbyeLine: 'Great work today. Put your things somewhere safe — we need them again next time.',
  },
  3: {
    lessonNumber: 3,
    letter: 't',
    traceTitle: 'Trace the t',
    title: 'Tick-Tock, T!',
    bookTitle: 'The ___ Sat!',
    coverImage: `${P}/the-sat/sat-p1.png`,
    videoUrl: lessonVideoUrl(3),
    videoPosterUrl: lessonPictureUrl(3),
    pages: [
      { art: `${P}/the-sat/sat-p1.png`, sentence: 'The ant… Sat!' },
      { art: `${P}/the-sat/sat-p2.png`, sentence: 'The snake… Sat!' },
      { art: `${P}/the-sat/sat-p3.png`, sentence: 'The apple… Sat!' },
      { art: `${P}/the-sat/sat-p4.png`, sentence: 'The sun… Sat!' },
      { art: `${P}/the-sat/sat-p5.png`, sentence: 'The star… Sat!' },
      { art: `${P}/the-sat/sat-p6.png`, sentence: 'The cat… Sat!' },
      { art: `${P}/the-sat/sat-p7.png`, sentence: 'Sat! Sat! Sat!', chant: true },
      { art: `${P}/the-sat/sat-p8.png`, sentence: 'And the…?!' },
    ],
    cast: [
      { id: 'ant', label: 'ant', sentence: 'The ant sat!', image: `${P}/the-sat/sat-p1.png` },
      { id: 'snake', label: 'snake', sentence: 'The snake sat!', image: `${P}/the-sat/sat-p2.png` },
      { id: 'star', label: 'star', sentence: 'The star sat!', image: `${P}/the-sat/sat-p5.png` },
      { id: 'cat', label: 'cat', sentence: 'The cat sat!', image: `${P}/the-sat/sat-p6.png` },
    ],
    matchOrder: ['snake', 'cat', 'ant', 'star'],
    rounds: [
      { sentence: 'The ant sat!', answerId: 'ant', candidateIds: ['snake', 'star', 'cat', 'ant'] },
      { sentence: 'The snake sat!', answerId: 'snake', candidateIds: ['star', 'cat', 'ant', 'snake'] },
      { sentence: 'The star sat!', answerId: 'star', candidateIds: ['cat', 'ant', 'snake', 'star'] },
      { sentence: 'The cat sat!', answerId: 'cat', candidateIds: ['ant', 'snake', 'star', 'cat'] },
    ],
    questions: [
      { question: 'did the ant sit?', answer: true, image: `${P}/the-sat/sat-p1.png` },
      { question: 'did the fox sit?', answer: false, image: `${P}/fox-in-a-box/p1-fox.png` },
      { question: 'did the snake sit?', answer: true, image: `${P}/the-sat/sat-p2.png` },
      { question: 'did the horse sit?', answer: false, image: `${P}/horse-in-my-hat/p4-horse.png` },
      { question: 'did the duck sit?', answer: false, image: `${P}/on-a-rock/p1-duck.png` },
      { question: 'did the apple sit?', answer: true, image: `${P}/the-sat/sat-p3.png` },
    ],
    script: [
      'Stand the toy ant on the table where they can see it.',
      '“The ant… Sat!” — sit the ant down hard on the word.',
      'Do it again with the snake, then the cat, letting them shout “Sat!” each time.',
      '“Can you make your toy sit?” — send them running to fetch one.',
    ],
    endingImage: `${P}/the-sat/sat-p8.png`,
    endingLine: 'And the…?!',
    goodbyeLine: 'Great work today. Put your things somewhere safe — we need them again next time.',
  },
  4: {
    lessonNumber: 4,
    letter: 'p',
    traceTitle: 'Trace the p',
    title: 'Pop, Pop, P!',
    bookTitle: 'The ___ Spat!',
    coverImage: `${P}/the-spat/p1-basin.png`,
    videoUrl: lessonVideoUrl(4),
    videoPosterUrl: lessonPictureUrl(4),
    pages: [
      { art: `${P}/the-spat/p1-basin.png`, sentence: 'A basin.' },
      { art: `${P}/the-spat/p2-penguin.png`, sentence: 'The penguin… Spat!' },
      { art: `${P}/the-spat/p3-pig.png`, sentence: 'The pig… Spat!' },
      { art: `${P}/the-spat/p4-pelican.png`, sentence: 'The pelican… Spat!' },
      { art: `${P}/the-spat/p5-recap.png`, sentence: 'Spat! Spat! Spat!', chant: true },
      { art: `${P}/the-spat/p6-potato.png`, sentence: 'And the…?!' },
    ],
    cast: [
      { id: 'penguin', label: 'penguin', sentence: 'The penguin spat!', image: `${P}/the-spat/p2-penguin.png` },
      { id: 'pig', label: 'pig', sentence: 'The pig spat!', image: `${P}/the-spat/p3-pig.png` },
      { id: 'pelican', label: 'pelican', sentence: 'The pelican spat!', image: `${P}/the-spat/p4-pelican.png` },
      { id: 'potato', label: 'potato', sentence: 'The potato spat!', image: `${P}/the-spat/p6-potato.png` },
    ],
    matchOrder: ['pig', 'potato', 'penguin', 'pelican'],
    rounds: [
      { sentence: 'The penguin spat!', answerId: 'penguin', candidateIds: ['pig', 'pelican', 'potato', 'penguin'] },
      { sentence: 'The pig spat!', answerId: 'pig', candidateIds: ['pelican', 'potato', 'penguin', 'pig'] },
      { sentence: 'The pelican spat!', answerId: 'pelican', candidateIds: ['potato', 'penguin', 'pig', 'pelican'] },
      { sentence: 'The potato spat!', answerId: 'potato', candidateIds: ['penguin', 'pig', 'pelican', 'potato'] },
    ],
    questions: [
      { question: 'did the penguin spit?', answer: true, image: `${P}/the-spat/p2-penguin.png` },
      { question: 'did the quill spit?', answer: false, image: `${P}/queen-on-the-quilt/p1-quill.png` },
      { question: 'did the rabbit spit?', answer: false, image: `${P}/rabbit-in-the-rocket/p1-rabbit.png` },
      { question: 'did the pig spit?', answer: true, image: `${P}/the-spat/p3-pig.png` },
    ],
    script: [
      'Hold up a real basin or bowl, and the toy penguin.',
      'Show the basin on its own first. “A basin.”',
      'Lean the penguin over it. “The penguin… Spat!” — make the noise, big.',
      '“Do you have a bowl? Do you have an animal?” — send them running to fetch.',
    ],
    endingImage: `${P}/the-spat/p6-potato.png`,
    endingLine: 'And the…?!',
    goodbyeLine: 'Great work today. Put your things somewhere safe — we need them again next time.',
  },
  5: {
    lessonNumber: 5,
    letter: 'i',
    traceTitle: 'Trace the i',
    title: 'I, I, Itsy I',
    bookTitle: 'The ___ Sat in the Pit!',
    coverImage: `${P}/the-pit/p1-pit.png`,
    videoUrl: lessonVideoUrl(5),
    videoPosterUrl: lessonPictureUrl(5),
    pages: [
      { art: `${P}/the-pit/p1-pit.png`, sentence: 'A pit.' },
      { art: `${P}/the-pit/p2-ant.png`, sentence: 'The ant sat in the… pit!' },
      { art: `${P}/the-pit/p3-apple.png`, sentence: 'The apple sat in the… pit!' },
      { art: `${P}/the-pit/p4-sun.png`, sentence: 'The sun sat in the… pit!' },
      { art: `${P}/the-pit/p5-star.png`, sentence: 'The star sat in the… pit!' },
      { art: `${P}/the-pit/p6-snake.png`, sentence: 'The snake sat in the… pit!' },
      { art: `${P}/the-pit/p7-cat.png`, sentence: 'The cat sat in the… pit!' },
      { art: `${P}/the-pit/p8-recap.png`, sentence: 'Sat in the pit! Sat in the pit! Sat in the pit!', chant: true },
      { art: `${P}/the-pit/p9-potato.png`, sentence: 'And the…?!' },
    ],
    cast: [
      { id: 'ant', label: 'ant', sentence: 'The ant sat in the pit!', image: `${P}/the-pit/p2-ant.png` },
      { id: 'snake', label: 'snake', sentence: 'The snake sat in the pit!', image: `${P}/the-pit/p6-snake.png` },
      { id: 'cat', label: 'cat', sentence: 'The cat sat in the pit!', image: `${P}/the-pit/p7-cat.png` },
      { id: 'potato', label: 'potato', sentence: 'The potato sat in the pit!', image: `${P}/the-pit/p9-potato.png` },
    ],
    matchOrder: ['snake', 'potato', 'ant', 'cat'],
    rounds: [
      { sentence: 'The ant sat in the pit!', answerId: 'ant', candidateIds: ['snake', 'cat', 'potato', 'ant'] },
      { sentence: 'The snake sat in the pit!', answerId: 'snake', candidateIds: ['cat', 'potato', 'ant', 'snake'] },
      { sentence: 'The cat sat in the pit!', answerId: 'cat', candidateIds: ['potato', 'ant', 'snake', 'cat'] },
      { sentence: 'The potato sat in the pit!', answerId: 'potato', candidateIds: ['ant', 'snake', 'cat', 'potato'] },
    ],
    questions: [
      { question: 'did the ant sit in the pit?', answer: true, image: `${P}/the-pit/p2-ant.png` },
      { question: 'did the duck sit in the pit?', answer: false, image: `${P}/on-a-rock/p1-duck.png` },
      { question: 'did the frog sit in the pit?', answer: false, image: `${P}/frog-on-the-fan/p1-frog.png` },
      { question: 'did the cat sit in the pit?', answer: true, image: `${P}/the-pit/p7-cat.png` },
    ],
    script: [
      'Make a pit — a cupped hand, a bowl, a hole in a cushion.',
      'Show it empty first. “A pit.”',
      'Drop the toy ant in. “The ant sat in the… pit!”',
      '“Do you have a pit? Do you have an ant?” — send them running to fetch.',
    ],
    endingImage: `${P}/the-pit/p9-potato.png`,
    endingLine: 'And the…?!',
    goodbyeLine: 'Great work today. Put your things somewhere safe — we need them again next time.',
  },
  6: {
    lessonNumber: 6,
    letter: 'n',
    traceTitle: 'Trace the n',
    title: 'N for the Nose',
    bookTitle: 'The ___ Naps!',
    coverImage: `${P}/the-nap/p1-ant.png`,
    videoUrl: lessonVideoUrl(6),
    videoPosterUrl: lessonPictureUrl(6),
    pages: [
      { art: `${P}/the-nap/p1-ant.png`, sentence: 'The ant… naps.' },
      { art: `${P}/the-nap/p2-apple.png`, sentence: 'The apple… naps.' },
      { art: `${P}/the-nap/p3-sun.png`, sentence: 'The sun… naps.' },
      { art: `${P}/the-nap/p4-star.png`, sentence: 'The star… naps.' },
      { art: `${P}/the-nap/p5-snake.png`, sentence: 'The snake… naps.' },
      { art: `${P}/the-nap/p6-cat.png`, sentence: 'The cat… naps.' },
      { art: `${P}/the-nap/p7-recap.png`, sentence: 'Nap! Nap! Nap!', chant: true },
      { art: `${P}/the-nap/p8-potato.png`, sentence: 'The potato doesn’t… nap!' },
    ],
    cast: [
      { id: 'ant', label: 'ant', sentence: 'The ant naps.', image: `${P}/the-nap/p1-ant.png` },
      { id: 'snake', label: 'snake', sentence: 'The snake naps.', image: `${P}/the-nap/p5-snake.png` },
      { id: 'cat', label: 'cat', sentence: 'The cat naps.', image: `${P}/the-nap/p6-cat.png` },
      { id: 'potato', label: 'potato', sentence: 'The potato doesn\'t nap!', image: `${P}/the-nap/p8-potato.png` },
    ],
    matchOrder: ['snake', 'potato', 'ant', 'cat'],
    rounds: [
      { sentence: 'The ant naps.', answerId: 'ant', candidateIds: ['snake', 'cat', 'potato', 'ant'] },
      { sentence: 'The snake naps.', answerId: 'snake', candidateIds: ['cat', 'potato', 'ant', 'snake'] },
      { sentence: 'The cat naps.', answerId: 'cat', candidateIds: ['potato', 'ant', 'snake', 'cat'] },
      { sentence: 'The potato doesn\'t nap!', answerId: 'potato', candidateIds: ['ant', 'snake', 'cat', 'potato'] },
    ],
    questions: [
      { question: 'did the ant nap?', answer: true, image: `${P}/the-nap/p1-ant.png` },
      { question: 'did the potato nap?', answer: false, image: `${P}/the-nap/p8-potato.png` },
      { question: 'did the apple nap?', answer: true, image: `${P}/the-nap/p2-apple.png` },
      { question: 'did the unicorn nap?', answer: false, image: `${P}/under-my-umbrella/p1-unicorn.png` },
      { question: 'did the volcano nap?', answer: false, image: `${P}/volcano-in-the-van/p4-volcano.png` },
      { question: 'did the sun nap?', answer: true, image: `${P}/the-nap/p3-sun.png` },
    ],
    script: [
      'Lay the toy ant down on its side, eyes closed.',
      '“The ant… naps.” — say it softly, almost a whisper.',
      'Do the snake and the cat the same way, and let them whisper it with you.',
      '“Can you make your toy nap?” — send them running to fetch one.',
    ],
    endingImage: `${P}/the-nap/p8-potato.png`,
    endingLine: 'The potato doesn’t… nap!',
    goodbyeLine: 'Great work today. Put your things somewhere safe — we need them again next time.',
  },
  7: {
    lessonNumber: 7,
    letter: 'm',
    traceTitle: 'Trace the m',
    title: 'Mmm, That\'s Good!',
    bookTitle: 'The ___ Sat on the Mat!',
    coverImage: `${P}/the-mat/p1-ant.png`,
    videoUrl: lessonVideoUrl(7),
    videoPosterUrl: lessonPictureUrl(7),
    pages: [
      { art: `${P}/the-mat/p1-ant.png`, sentence: 'The ant sat on the… mat!' },
      { art: `${P}/the-mat/p2-apple.png`, sentence: 'The apple sat on the… mat!' },
      { art: `${P}/the-mat/p3-sun.png`, sentence: 'The sun sat on the… mat!' },
      { art: `${P}/the-mat/p4-star.png`, sentence: 'The star sat on the… mat!' },
      { art: `${P}/the-mat/p5-snake.png`, sentence: 'The snake sat on the… mat!' },
      { art: `${P}/the-mat/p6-cat.png`, sentence: 'The cat sat on the… mat!' },
      { art: `${P}/the-mat/p7-recap.png`, sentence: 'Mat! Mat! Mat!', chant: true },
      { art: `${P}/the-mat/p8-potato.png`, sentence: 'The potato didn’t sit on the… mat!' },
    ],
    cast: [
      { id: 'ant', label: 'ant', sentence: 'The ant sat on the mat!', image: `${P}/the-mat/p1-ant.png` },
      { id: 'snake', label: 'snake', sentence: 'The snake sat on the mat!', image: `${P}/the-mat/p5-snake.png` },
      { id: 'cat', label: 'cat', sentence: 'The cat sat on the mat!', image: `${P}/the-mat/p6-cat.png` },
      { id: 'potato', label: 'potato', sentence: 'The potato didn\'t sit on the mat!', image: `${P}/the-mat/p8-potato.png` },
    ],
    matchOrder: ['snake', 'potato', 'ant', 'cat'],
    rounds: [
      { sentence: 'The ant sat on the mat!', answerId: 'ant', candidateIds: ['snake', 'cat', 'potato', 'ant'] },
      { sentence: 'The snake sat on the mat!', answerId: 'snake', candidateIds: ['cat', 'potato', 'ant', 'snake'] },
      { sentence: 'The cat sat on the mat!', answerId: 'cat', candidateIds: ['potato', 'ant', 'snake', 'cat'] },
      { sentence: 'The potato didn\'t sit on the mat!', answerId: 'potato', candidateIds: ['ant', 'snake', 'cat', 'potato'] },
    ],
    questions: [
      { question: 'did the ant sit on the mat?', answer: true, image: `${P}/the-mat/p1-ant.png` },
      { question: 'did the potato sit on the mat?', answer: false, image: `${P}/the-mat/p8-potato.png` },
      { question: 'did the apple sit on the mat?', answer: true, image: `${P}/the-mat/p2-apple.png` },
      { question: 'did the zebra sit on the mat?', answer: false, image: `${P}/zzz-at-the-zoo/p1-zebra.png` },
      { question: 'did the jellyfish sit on the mat?', answer: false, image: `${P}/jellyfish-in-the-jar/p4-jellyfish.png` },
      { question: 'did the sun sit on the mat?', answer: true, image: `${P}/the-mat/p3-sun.png` },
    ],
    script: [
      'Put a real mat, cloth or placemat on the table.',
      'Sit the toy ant on it. “The ant sat on the… mat!”',
      'Do the snake and the cat, letting them shout “mat!” each time.',
      '“Do you have a mat? Put your toy on it.” — send them running to fetch.',
    ],
    endingImage: `${P}/the-mat/p8-potato.png`,
    endingLine: 'The potato didn’t sit on the… mat!',
    goodbyeLine: 'Great work today. Put your things somewhere safe — we need them again next time.',
  },
  8: {
    lessonNumber: 8,
    letter: 'd',
    traceTitle: 'Trace the d',
    title: 'D for the Dog',
    bookTitle: 'The ___ Is Sad!',
    coverImage: `${P}/the-sad/p1-ant.png`,
    videoUrl: lessonVideoUrl(8),
    videoPosterUrl: lessonPictureUrl(8),
    pages: [
      { art: `${P}/the-sad/p1-ant.png`, sentence: 'The ant is… sad.' },
      { art: `${P}/the-sad/p2-apple.png`, sentence: 'The apple is… sad.' },
      { art: `${P}/the-sad/p3-sun.png`, sentence: 'The sun is… sad.' },
      { art: `${P}/the-sad/p4-star.png`, sentence: 'The star is… sad.' },
      { art: `${P}/the-sad/p5-snake.png`, sentence: 'The snake is… sad.' },
      { art: `${P}/the-sad/p6-cat.png`, sentence: 'The cat is… sad.' },
      { art: `${P}/the-sad/p7-recap.png`, sentence: 'Sad! Sad! Sad!', chant: true },
      { art: `${P}/the-sad/p8-potato.png`, sentence: 'The potato is not… sad!' },
      { art: `${P}/the-sad/p9-finale.png`, sentence: 'Now the whole crew is not… sad!' },
    ],
    cast: [
      { id: 'ant', label: 'ant', sentence: 'The ant is sad.', image: `${P}/the-sad/p1-ant.png` },
      { id: 'snake', label: 'snake', sentence: 'The snake is sad.', image: `${P}/the-sad/p5-snake.png` },
      { id: 'cat', label: 'cat', sentence: 'The cat is sad.', image: `${P}/the-sad/p6-cat.png` },
      { id: 'potato', label: 'potato', sentence: 'The potato is not sad!', image: `${P}/the-sad/p8-potato.png` },
    ],
    matchOrder: ['snake', 'potato', 'ant', 'cat'],
    rounds: [
      { sentence: 'The ant is sad.', answerId: 'ant', candidateIds: ['snake', 'cat', 'potato', 'ant'] },
      { sentence: 'The snake is sad.', answerId: 'snake', candidateIds: ['cat', 'potato', 'ant', 'snake'] },
      { sentence: 'The cat is sad.', answerId: 'cat', candidateIds: ['potato', 'ant', 'snake', 'cat'] },
      { sentence: 'The potato is not sad!', answerId: 'potato', candidateIds: ['ant', 'snake', 'cat', 'potato'] },
    ],
    questions: [
      { question: 'was the ant sad?', answer: true, image: `${P}/the-sad/p1-ant.png` },
      { question: 'was the potato sad?', answer: false, image: `${P}/the-sad/p8-potato.png` },
      { question: 'was the apple sad?', answer: true, image: `${P}/the-sad/p2-apple.png` },
      { question: 'was the dinosaur sad?', answer: false, image: `${P}/dinosaur-on-a-drum/p4-dinosaur.png` },
      { question: 'was the owl sad?', answer: false, image: `${P}/owl-ate-an-orange/p1-owl.png` },
      { question: 'was the sun sad?', answer: true, image: `${P}/the-sad/p3-sun.png` },
    ],
    script: [
      'Hold up the toy ant and turn its face away, drooping.',
      '“The ant is… sad.” — say it low and slow.',
      'Do the snake and the cat the same way.',
      'Then the potato: “The potato is not… sad!” — big and bright, and they cheer.',
    ],
    endingImage: `${P}/the-sad/p9-finale.png`,
    endingLine: 'Now the whole crew is not… sad!',
    goodbyeLine: 'Great work today. Put your things somewhere safe — we need them again next time.',
  },
  9: {
    lessonNumber: 9,
    letter: 'g',
    traceTitle: 'Trace the g',
    title: 'G for the Goat',
    bookTitle: 'The ___ Digs!',
    coverImage: `${P}/the-dig/p1-ant.png`,
    videoUrl: lessonVideoUrl(9),
    videoPosterUrl: lessonPictureUrl(9),
    pages: [
      { art: `${P}/the-dig/p1-ant.png`, sentence: 'The ant… digs.' },
      { art: `${P}/the-dig/p2-apple.png`, sentence: 'The apple… digs.' },
      { art: `${P}/the-dig/p3-sun.png`, sentence: 'The sun… digs.' },
      { art: `${P}/the-dig/p4-star.png`, sentence: 'The star… digs.' },
      { art: `${P}/the-dig/p5-snake.png`, sentence: 'The snake… digs.' },
      { art: `${P}/the-dig/p6-cat.png`, sentence: 'The cat… digs.' },
      { art: `${P}/the-dig/p7-recap.png`, sentence: 'Dig! Dig! Dig!', chant: true },
      { art: `${P}/the-dig/p8-potato.png`, sentence: 'The potato doesn\'t… dig!' },
    ],
    cast: [
      { id: 'ant', label: 'ant', sentence: 'The ant digs.', image: `${P}/the-dig/p1-ant.png` },
      { id: 'snake', label: 'snake', sentence: 'The snake digs.', image: `${P}/the-dig/p5-snake.png` },
      { id: 'cat', label: 'cat', sentence: 'The cat digs.', image: `${P}/the-dig/p6-cat.png` },
      { id: 'potato', label: 'potato', sentence: 'The potato doesn\'t dig!', image: `${P}/the-dig/p8-potato.png` },
    ],
    matchOrder: ['snake', 'potato', 'ant', 'cat'],
    rounds: [
      { sentence: 'The ant digs.', answerId: 'ant', candidateIds: ['snake', 'cat', 'potato', 'ant'] },
      { sentence: 'The snake digs.', answerId: 'snake', candidateIds: ['cat', 'potato', 'ant', 'snake'] },
      { sentence: 'The cat digs.', answerId: 'cat', candidateIds: ['potato', 'ant', 'snake', 'cat'] },
      { sentence: 'The potato doesn\'t dig!', answerId: 'potato', candidateIds: ['ant', 'snake', 'cat', 'potato'] },
    ],
    questions: [
      { question: 'did the ant dig?', answer: true, image: `${P}/the-dig/p1-ant.png` },
      { question: 'did the potato dig?', answer: false, image: `${P}/the-dig/p8-potato.png` },
      { question: 'did the apple dig?', answer: true, image: `${P}/the-dig/p2-apple.png` },
      { question: 'did the ox dig?', answer: false, image: `${P}/fox-in-a-box/p2-ox.png` },
      { question: 'did the frog dig?', answer: false, image: `${P}/frog-on-the-fan/p1-frog.png` },
      { question: 'did the sun dig?', answer: true, image: `${P}/the-dig/p3-sun.png` },
    ],
    script: [
      'Scratch at the table with the toy ant\'s front legs.',
      '“The ant… digs.” — dig along with the word.',
      'Do the snake and the cat, and let them dig on the table with you.',
      '“Can you make your toy dig?” — send them running to fetch one.',
    ],
    endingImage: `${P}/the-dig/p8-potato.png`,
    endingLine: 'The potato doesn\'t… dig!',
    goodbyeLine: 'Great work today. Put your things somewhere safe — we need them again next time.',
  },
  10: {
    lessonNumber: 10,
    letter: 'o',
    traceTitle: 'Trace the o',
    title: 'O for the Octopus',
    bookTitle: 'The ___ Has a Dog!',
    coverImage: `${P}/the-dog/p1-ant.png`,
    videoUrl: lessonVideoUrl(10),
    videoPosterUrl: lessonPictureUrl(10),
    pages: [
      { art: `${P}/the-dog/p1-ant.png`, sentence: 'The ant has a… dog.' },
      { art: `${P}/the-dog/p2-apple.png`, sentence: 'The apple has a… dog.' },
      { art: `${P}/the-dog/p3-sun.png`, sentence: 'The sun has a… dog.' },
      { art: `${P}/the-dog/p4-star.png`, sentence: 'The star has a… dog.' },
      { art: `${P}/the-dog/p5-snake.png`, sentence: 'The snake has a… dog.' },
      { art: `${P}/the-dog/p6-cat.png`, sentence: 'The cat has a… dog.' },
      { art: `${P}/the-dog/p7-recap.png`, sentence: 'Dog! Dog! Dog!', chant: true },
      { art: `${P}/the-dog/p8-potato.png`, sentence: 'The potato has 5… dogs!' },
    ],
    cast: [
      { id: 'ant', label: 'ant', sentence: 'The ant has a dog.', image: `${P}/the-dog/p1-ant.png` },
      { id: 'snake', label: 'snake', sentence: 'The snake has a dog.', image: `${P}/the-dog/p5-snake.png` },
      { id: 'cat', label: 'cat', sentence: 'The cat has a dog.', image: `${P}/the-dog/p6-cat.png` },
      { id: 'potato', label: 'potato', sentence: 'The potato has 5 dogs!', image: `${P}/the-dog/p8-potato.png` },
    ],
    matchOrder: ['snake', 'potato', 'ant', 'cat'],
    rounds: [
      { sentence: 'The ant has a dog.', answerId: 'ant', candidateIds: ['snake', 'cat', 'potato', 'ant'] },
      { sentence: 'The snake has a dog.', answerId: 'snake', candidateIds: ['cat', 'potato', 'ant', 'snake'] },
      { sentence: 'The cat has a dog.', answerId: 'cat', candidateIds: ['potato', 'ant', 'snake', 'cat'] },
      { sentence: 'The potato has 5 dogs!', answerId: 'potato', candidateIds: ['ant', 'snake', 'cat', 'potato'] },
    ],
    questions: [
      { question: 'did the ant have a dog?', answer: true, image: `${P}/the-dog/p1-ant.png` },
      { question: 'did the duck have a dog?', answer: false, image: `${P}/on-a-rock/p1-duck.png` },
      { question: 'did the apple have a dog?', answer: true, image: `${P}/the-dog/p2-apple.png` },
      { question: 'did the chick have a dog?', answer: false, image: `${P}/on-a-rock/p2-chick.png` },
      { question: 'did the rabbit have a dog?', answer: false, image: `${P}/rabbit-in-the-rocket/p1-rabbit.png` },
      { question: 'did the sun have a dog?', answer: true, image: `${P}/the-dog/p3-sun.png` },
    ],
    script: [
      'Hold up the toy ant, and a second small toy as its dog.',
      'Walk them together. “The ant has a… dog.”',
      'Do the snake and the cat, each with their own dog.',
      '“Do you have a dog? Go and fetch it!” — send them running.',
    ],
    endingImage: `${P}/the-dog/p8-potato.png`,
    endingLine: 'The potato has 5… dogs!',
    goodbyeLine: 'Great work today. Put your things somewhere safe — we need them again next time.',
  },
};
