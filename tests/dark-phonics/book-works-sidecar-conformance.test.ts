/**
 * Book Works — the digital shelf must agree with the printed works.
 *
 * WHY THIS EXISTS. `lib/montree/dark-phonics/book-works-lessons.ts` says, in
 * capitals, "REGENERATE rather than hand-edit" — and for most of its life no
 * generator existed, so it was maintained by hand edits and by regex surgery
 * over its own text. On 2026-09-12 that caught up with it: the shelf had been
 * handing a child FOUR characters for every letter book from lesson 3 to
 * lesson 18, because the file was originally cut from a four-item worksheet
 * pack, while the PRINTED works pack the same child does on paper hands them
 * six or seven. Nobody noticed, because nothing compared the two. This is that
 * comparison.
 *
 * 🚨 THE PRINTED PDFs UNDER `public/dark-phonics-books/works/<slug>/` ARE THE
 * SOURCE OF TRUTH. `scripts/curriculum/book-works/build_book_works.py` writes
 * a side-car JSON per book recording exactly what it draws
 * (`--sidecars-only`), and this test reads that. The side-car exists only
 * because `public/dark-phonics-books/` is gitignored and CI therefore cannot
 * read the PDFs themselves — it is a transcript, never an authority. When this
 * test fails, the print wins over the TypeScript; a stale side-car is fixed by
 * re-running the build, never by editing the JSON.
 *
 * 🚨 TWO DIFFERENT CASTS, AND THEY ARE NOT THE SAME LENGTH — verified against
 * the printed PDFs on 2026-09-13. `characters` is the Work 1 strip, which
 * excludes the potato by standing product decision (the-mat's strip prints
 * six). `cards` is the rows of Works 2–5, which include the potato's resolved
 * line wherever the book resolves it (the-mat's work sheets print seven). The
 * shelf's `cast[]` drives the match and round works, so it is `cards` it must
 * equal. Comparing it to `characters` will "find" a bug in every book that
 * resolves its potato.
 *
 * 🚨 WHAT PRINT DOES NOT GOVERN, AND IS THEREFORE NOT ASSERTED VERBATIM:
 *   · card IDs. They are the shelf's own keys. the-bug's last row reads "The
 *     bug saw a… potato!" and the shelf sensibly keys it on the potato it
 *     pictures; the-cat-sat's five cards are word tiles (cat / sat / on /
 *     cats / tip-top), not characters at all. Both are correct.
 *   · `matchOrder`'s exact permutation. A work sheet has no shuffle — it
 *     prints its rows in book order. Lesson 2 takes its order straight from
 *     dp-ant-on-my-apple.json and lesson 13 is hand-authored. What IS held: the
 *     order is a permutation of the PRINTED cards and a derangement.
 *   · `rounds`' exact candidate rotation, for the same reason (lesson 13's is
 *     hand-authored and shorter). What IS held: one round per printed card, in
 *     printed order, each quoting its own card.
 *   · art FILE NAMES. The shelf serves re-generated live-page art whose names
 *     differ per book (the-pit prints `pit-p2.png`, the shelf serves
 *     `p2-ant.png`) and two books legitimately draw their pages from a
 *     different source than the works pack. What IS held: a card shows the
 *     lesson's own page that carries that card's sentence.
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { BOOK_TRACK } from '@/lib/montree/dark-phonics/book-works';
import { BOOK_WORKS_GENERATED_LESSONS as FIRST_LANGUAGE_LESSONS } from '@/lib/montree/dark-phonics/book-works-lessons';
import { BOOK_WORKS_GENERATED_LESSONS as SECOND_LANGUAGE_LESSONS } from '@/lib/montree/dark-phonics/book-works-lessons.second-language';

/**
 * 🚨 THIS TEST FOLLOWS THE SHELF, IT DOES NOT PICK A TRACK (2026-09-15).
 *
 * `book-works.ts` decides which wording the digital shelf serves (BOOK_TRACK),
 * and the printed pack exists in both wordings, so the transcript this test
 * conforms to must be the one for the track actually shipped. Importing the
 * first-language pack unconditionally — which is what this file used to do —
 * would have gone on passing with a green tick while the shelf served text the
 * side-cars had never seen.
 *
 * Both trees are committed, one per track, and each side-car names its own
 * track so the pair can never be silently crossed.
 */
const BOOK_WORKS_GENERATED_LESSONS =
  BOOK_TRACK === 'second' ? SECOND_LANGUAGE_LESSONS : FIRST_LANGUAGE_LESSONS;

const SIDECAR_TRACK = BOOK_TRACK === 'second' ? 'second-language' : 'first-language';

const SIDECAR_DIR = path.join(
  process.cwd(),
  'scripts',
  'curriculum',
  'book-works',
  'sidecars',
  ...(BOOK_TRACK === 'second' ? ['second-language'] : []),
);

const REGENERATE =
  'python3 scripts/curriculum/book-works/build_book_works.py --sidecars-only' +
  (BOOK_TRACK === 'second' ? ' --track second-language' : '');

type SidecarEntry = {
  subject: string;
  art: string;
  pageIndex: number;
  sentence: string;
  printedSentence: string;
};

type Sidecar = {
  slug: string;
  title: string;
  source: string;
  characters: SidecarEntry[];
  characterOrder: string[];
  worksUsingCards: string[];
  cards: SidecarEntry[];
  cardSubjects: string[];
  pairOrder: string[];
  derivedMatchOrder: number[];
  pages: { art: string; sentence: string; chant: boolean }[];
  flags: string[];
  generated_from: string;
  track: string;
};

function loadSidecars(): Map<string, Sidecar> {
  const out = new Map<string, Sidecar>();
  for (const file of readdirSync(SIDECAR_DIR).sort()) {
    // the first-language tree holds the second-language tree as a subdirectory
    if (!file.endsWith('.json')) continue;
    const parsed = JSON.parse(
      readFileSync(path.join(SIDECAR_DIR, file), 'utf8'),
    ) as Sidecar;
    out.set(parsed.slug, parsed);
  }
  return out;
}

const SIDECARS = loadSidecars();

/** `/dark-phonics-live/pages/<slug>/<file>` → `<slug>`. */
function slugOf(imagePath: string): string {
  const parts = imagePath.split('/').filter(Boolean);
  return parts[parts.length - 2] ?? '';
}

/**
 * Shelf books that have NO printed works pack, so there is nothing to conform
 * to. An explicit list rather than "skip whatever is missing", so a book that
 * loses its side-car by accident fails instead of quietly opting out.
 *
 *   the-fast / the-lost / the-jump — Easy Readers; no works pack is printed
 *   for them at all (recorded in the 2026-09-12 handoff).
 */
const SHELF_SLUGS_WITHOUT_PRINTED_PACK = new Set([
  'the-fast',
  'the-lost',
  'the-jump',
]);

const LESSONS = Object.values(BOOK_WORKS_GENERATED_LESSONS).sort(
  (a, b) => a.lessonNumber - b.lessonNumber,
);

const shelfSlug = new Map<number, string>(
  LESSONS.map((lesson) => [lesson.lessonNumber, slugOf(lesson.coverImage)]),
);

describe('book works side-cars', () => {
  it('each side-car is a transcript of the print build', () => {
    expect(SIDECARS.size).toBeGreaterThan(0);
    for (const [slug, sidecar] of SIDECARS) {
      expect(sidecar.generated_from, slug).toBe('build_book_works.py');
      expect(
        sidecar.track,
        `${slug} — this side-car transcribes the wrong wording for the track ` +
          `the shelf ships. Re-run:\n  ${REGENERATE}`,
      ).toBe(SIDECAR_TRACK);
      expect(sidecar.slug, slug).toBe(slug);
      expect(sidecar.cardSubjects, slug).toEqual(
        sidecar.cards.map((c) => c.subject),
      );
      expect(sidecar.pairOrder, slug).toEqual(
        sidecar.cards.map((c) => c.printedSentence),
      );
      expect([...sidecar.derivedMatchOrder].sort((a, b) => a - b), slug).toEqual(
        sidecar.cards.map((_c, i) => i),
      );
    }
  });

  it('every shelf book has a side-car', () => {
    const missing: string[] = [];
    for (const lesson of LESSONS) {
      const slug = shelfSlug.get(lesson.lessonNumber) ?? '';
      expect(slug, `lesson ${lesson.lessonNumber} has no derivable slug`).not.toBe('');
      if (SHELF_SLUGS_WITHOUT_PRINTED_PACK.has(slug)) continue;
      if (!SIDECARS.has(slug)) missing.push(`lesson ${lesson.lessonNumber} (${slug})`);
    }
    expect(
      missing,
      `shelf books with no side-car. Re-run:\n  ${REGENERATE}\n` +
        `(or add the slug to SHELF_SLUGS_WITHOUT_PRINTED_PACK if print really has no pack)`,
    ).toEqual([]);
  });

  it('every side-car for a shelf book is reached by a lesson', () => {
    // The reverse direction: a side-car whose slug is on the shelf must be the
    // one that lesson uses, so a book cannot be conformed under a stale name.
    const onShelf = new Set(shelfSlug.values());
    const reachable = [...SIDECARS.keys()].filter((slug) => onShelf.has(slug));
    const conformed = LESSONS.map((l) => shelfSlug.get(l.lessonNumber) ?? '')
      .filter((slug) => SIDECARS.has(slug));
    expect([...new Set(conformed)].sort()).toEqual(reachable.sort());
    expect(reachable.length).toBeGreaterThan(0);
  });

  it('the print-only books the shelf skips are named, not silently absent', () => {
    for (const slug of SHELF_SLUGS_WITHOUT_PRINTED_PACK) {
      expect(
        SIDECARS.has(slug),
        `${slug} is listed as having no printed works pack, but a side-car ` +
          `exists for it — remove it from SHELF_SLUGS_WITHOUT_PRINTED_PACK`,
      ).toBe(false);
    }
  });
});

describe.each(
  LESSONS.filter((lesson) => SIDECARS.has(shelfSlug.get(lesson.lessonNumber) ?? ''))
    .map((lesson) => ({
      lesson,
      slug: shelfSlug.get(lesson.lessonNumber) as string,
    })),
)('lesson $lesson.lessonNumber — $slug', ({ lesson, slug }) => {
  const sidecar = SIDECARS.get(slug) as Sidecar;
  const where = `lesson ${lesson.lessonNumber} (${slug})`;

  it('the cast is the printed work rows — same count, same order', () => {
    expect(
      lesson.cast.map((c) => c.sentence),
      `${where} cast — the printed works pack has ${sidecar.cards.length} ` +
        `row(s):\n  ${sidecar.pairOrder.join('\n  ')}\n` +
        `If the print is right and the shelf is wrong, fix the shelf. ` +
        `If the side-car is stale, re-run:\n  ${REGENERATE}`,
    ).toEqual(sidecar.cards.map((c) => c.sentence));
  });

  it('each card shows the lesson page its sentence comes from', () => {
    const pageFor = new Map(lesson.pages.map((p) => [p.sentence, p.art]));
    sidecar.cards.forEach((card, index) => {
      const entry = lesson.cast[index];
      const at = `${where} cast[${index}] (${card.subject})`;
      expect(entry, at).toBeTruthy();
      const art = pageFor.get(card.sentence);
      expect(
        art,
        `${at} — no page on this lesson carries the printed sentence ` +
          `${JSON.stringify(card.sentence)}`,
      ).toBeTruthy();
      expect(entry.image, `${at} — art`).toBe(art);
    });
  });

  it('card ids are unique, so every card has a home', () => {
    const ids = lesson.cast.map((c) => c.id);
    expect(new Set(ids).size, `${where} has duplicate card ids: ${ids.join(', ')}`)
      .toBe(ids.length);
    for (const entry of lesson.cast) {
      expect(entry.id, `${where} has an empty card id`).toBeTruthy();
      expect(entry.label, `${where} card ${entry.id} has no label`).toBeTruthy();
    }
  });

  it('matchOrder is a derangement of the printed cards', () => {
    const ids = lesson.cast.map((c) => c.id);
    expect(
      [...lesson.matchOrder].sort(),
      `${where} matchOrder is not a permutation of the ${sidecar.cards.length} ` +
        `printed cards`,
    ).toEqual([...ids].sort());
    lesson.matchOrder.forEach((id, index) => {
      expect(
        id,
        `${where} matchOrder slot ${index} faces its own twin (${id})`,
      ).not.toBe(ids[index]);
    });
  });

  it('there is one round per printed card, in printed order', () => {
    expect(
      lesson.rounds.map((r) => r.sentence),
      `${where} rounds — the printed works pack has ${sidecar.cards.length} rows`,
    ).toEqual(sidecar.cards.map((c) => c.sentence));
    const ids = new Set(lesson.cast.map((c) => c.id));
    lesson.rounds.forEach((round, index) => {
      const at = `${where} round ${index}`;
      expect(round.answerId, `${at} — answer is not this card`).toBe(
        lesson.cast[index].id,
      );
      expect(
        round.candidateIds,
        `${at} — the answer is not among its own candidates`,
      ).toContain(round.answerId);
      for (const candidate of round.candidateIds) {
        expect(ids.has(candidate), `${at} — candidate ${candidate} is not a card`)
          .toBe(true);
      }
      expect(new Set(round.candidateIds).size, `${at} — duplicate candidate`)
        .toBe(round.candidateIds.length);
    });
  });

  it('the Work 1 characters strip is a subset of the cast, in cast order', () => {
    // The strip and the work rows are built from the same book by the same
    // run, so every character on the strip must appear among the cards, in the
    // same relative order. (It is a strict subset wherever print gives the
    // potato a work row but no strip box.)
    const cardSentences = sidecar.cards.map((c) => c.sentence);
    let cursor = -1;
    for (const character of sidecar.characters) {
      const found = cardSentences.indexOf(character.sentence);
      expect(
        found,
        `${where} — strip character "${character.subject}" is on no work row`,
      ).toBeGreaterThan(-1);
      expect(found, `${where} — strip character "${character.subject}" is out of order`)
        .toBeGreaterThan(cursor);
      cursor = found;
      expect(lesson.cast[found], `${where} — no cast card at index ${found}`)
        .toBeTruthy();
    }
  });
});
