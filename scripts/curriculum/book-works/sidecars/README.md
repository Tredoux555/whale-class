# Book-works side-cars

**These files are GENERATED. Never hand-edit one.**

Regenerate all of them:

```
python3 scripts/curriculum/book-works/build_book_works.py --sidecars-only
```

or one book:

```
python3 scripts/curriculum/book-works/build_book_works.py --sidecars-only the-mat
```

`--sidecars-only` draws nothing — it loads each book and writes its JSON.
A normal print build writes the same file as a side effect, before any
drawing, so a committed side-car cannot fall behind the PDFs it transcribes.

## What they are for

The printed work PDFs under `public/dark-phonics-books/works/<slug>/` are the
**source of truth** for a book's cast and for its work rows. But that directory
is gitignored, so CI cannot read the PDFs — which is why, for most of this
file's life, nothing checked that the digital shelf
(`lib/montree/dark-phonics/book-works-lessons.ts`) agreed with them. On
2026-09-12 it turned out it hadn't for a long time: the shelf handed a child
four characters for every letter book from lesson 3 to lesson 18 where the
printed pack hands them six or seven.

A side-car is a **transcript of the same build that draws the PDFs** — the cast
`characters_of()` returns and the rows `load_book()` returns, written out
instead of discarded. It is what makes
`tests/dark-phonics/book-works-sidecar-conformance.test.ts` possible at all.

A side-car is never an authority of its own. When the conformance test fails,
the print wins over the TypeScript; a **stale** side-car is fixed by re-running
the command above, never by editing the JSON.

## Two casts, and they are not the same length

- **`characters`** — the Work 1 strip. Excludes the potato by standing product
  decision. `the-mat`'s strip prints six: ant, apple, sun, star, snake, cat.
- **`cards`** — the rows of Works 2–5. Includes the potato's resolved line
  wherever the book resolves it. `the-mat`'s work sheets print **seven**;
  `the-pit` and `the-pat` print six, because their last page is the unnamed
  cliffhanger "And the…?!" and an unnamed page never becomes a row.

The shelf's `cast[]` drives the match and round works, so it is **`cards`** it
must equal — not `characters`. Comparing it to `characters` will "find" a bug
in every book that resolves its potato.

## What the print does NOT govern

`subject` is a derived label for reading the file, not an id the print encodes
(the shelf keys `the-bug`'s last card on the potato it pictures, and
`the-cat-sat`'s five cards are word tiles, not characters). `derivedMatchOrder`
is a reference shape: a work sheet has no shuffle, it prints its rows in book
order. Both are documented in `build_book_works.py` beside the code that emits
them, and neither is asserted verbatim by the conformance test.

## Track and page

Written on the **first-language** track only. The second-language track rewords
every sentence, and a side-car that flip-flopped with `--track` would make the
conformance test pass or fail depending on how the print run was last invoked.
The page preset (`--page a4|a5`) changes geometry only, never content.
