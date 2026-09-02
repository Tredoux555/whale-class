# Tracing workbook fleet audit — per-page traced word fix (2026-09-03)

## The rule

Word-mode tracing pages trace the **literal last word of that spread's own
reader page** — the same word the reader prints big/bold, punctuation
stripped, lowercased — not the book's title-sentence hero word
(`book['new']`). See `spread_trace_word()` in
`scripts/curriculum/flashcards/build_tracing_booklet.py`. A spread's `text`
can be a plain string, or a list (recap chants / multi-line pages, read
top-to-bottom, so the LAST element is the page's last line); that line's
last whitespace-separated token, punctuation stripped, is the traced word.
A spread with no `text` at all (a wordless intro/cliffhanger page, e.g.
the-sat's "And the…?!") falls back to the book's hero word, since the
reader page itself has no word to match there.

**Consequence:** a book's tracing pages are not all the same word. Known,
confirmed-correct oddities:
- the-nap: character pages trace "naps", the potato page traces "nap"
  ("The potato doesn't… nap!")
- the-cot: finale spread traces "naps" ("The potato… naps.")
- the-kit: finale spread traces "potato" ("The crew helps the… potato!")
- the-bug: finale spread traces "potato" ("The bug saw a… potato!")
- the-dog: finale spread traces "dogs" ("The potato has 5… dogs!")

All five were confirmed against the actual reader PDF text (not just
`books_def.py`) during this audit — see below.

## Root cause of the original bug

Word mode's per-spread trace page previously always traced `book['new']`
(the book's hero word) regardless of what that specific reader page said —
correct for most spreads (which do repeat the hero word) but wrong for the
minority that say something else (plurals, alternate finale nouns, etc.),
e.g. the-nap traced "nap" on its "…naps." pages.

## The code change

`scripts/curriculum/flashcards/build_tracing_booklet.py`:
- Added `spread_trace_word(sp)` — extracts the per-spread traced word per
  the rule above.
- `build_trace_booklet()`'s `trace_text_page()` now computes
  `page_word = spread_trace_word(sp) or word` (word = book hero-word
  fallback) per spread, and sizes it with `compute_trace_u(page_word,
  ceiling=word_ceiling)` — `word_ceiling` is still the book-wide x-height
  ceiling (`book_word_xheight(book)`, unchanged), so a longer per-page word
  (e.g. "potato", "dogs") still auto-shrinks to fit, same mechanism already
  used for the book-wide word.

## Fleet audit (all 16 sat-cast books)

Method: (a) extracted each book's `spreads` from `books_def.py` and ran
`spread_trace_word()` against every spread to compute the expected traced
word per page; (b) cross-checked those expectations against the actual
`pdftotext -layout` output of each `public/dark-phonics-books/print/<slug>-
A5-reading.pdf` reader — confirmed the reader really does say "naps" /
"potato" / "dogs" on the pages noted above, not just that `books_def.py`
says so; (c) rendered every page of every rebuilt `tracing-workbook.pdf`
(`pdftoppm`) into a 4-wide contact sheet per book and visually read the
traced glyphs on all 16 sheets — confirmed every traced word matches the
expected word from (a)/(b), including all five named oddities; (d)
compared page count and page size (`pdfinfo`) across all 16 tracing PDFs
and against the-sat as the reference structure.

| slug | reader pages | trace pages (A4 spreads) | match? | tracing page size | notes |
|---|---|---|---|---|---|
| the-sat | 24 | 12 | yes | 841.89×595.276pt (A4) | fallback word "sat" on wordless "And the…?!" page — correct |
| the-spat | 20 | 10 | yes | 841.89×595.276pt (A4) | fewer spreads (smaller cast); fallback "spat" on "A basin."/"And the…?!" |
| the-pit | 24 | 12 | yes | 841.89×595.276pt (A4) | fallback "pit" on "A pit."/"And the…?!" |
| the-pat | 24 | 12 | yes | 841.89×595.276pt (A4) | fallback "pat" on "And the…?!" |
| the-nap | 24 | 12 | yes | 841.89×595.276pt (A4) | traces "naps" on character pages, "nap" on potato page — confirmed correct |
| the-mat | 24 | 12 | yes | 841.89×595.276pt (A4) | uniform "mat" throughout |
| the-sad | 24 | 12 | yes | 841.89×595.276pt (A4) | uniform "sad" throughout (9 spreads) |
| the-dig | 24 | 12 | yes | 841.89×595.276pt (A4) | traces "digs" on character pages, "dig" on potato page |
| the-dog | 24 | 12 | yes | 841.89×595.276pt (A4) | finale traces "dogs" ("has 5 dogs!") — confirmed correct, x-height auto-shrunk cleanly |
| the-cot | 24 | 12 | yes | 841.89×595.276pt (A4) | finale traces "naps" ("The potato… naps.") — confirmed correct |
| the-kit | 24 | 12 | yes | 841.89×595.276pt (A4) | finale traces "potato" ("crew helps the potato!") — confirmed correct, legible size |
| the-egg | 24 | 12 | yes | 841.89×595.276pt (A4) | uniform "egg" throughout |
| the-mud | 24 | 12 | yes | 841.89×595.276pt (A4) | uniform "mud" throughout |
| the-rat | 24 | 12 | yes | 841.89×595.276pt (A4) | uniform "rat" throughout |
| the-hot | 24 | 12 | yes | 841.89×595.276pt (A4) | uniform "hot" throughout |
| the-bug | 24 | 12 | yes | 841.89×595.276pt (A4) | finale traces "potato" ("bug saw a potato!") — confirmed correct |

All 16: page order, page count, and page structure (cover, half-title/word-
list, per-spread trace+art pairs, no extra/missing pages) mirror the reader
exactly, via the shared `bb.story_pages()`/`bb.paginate()` pipeline — this
was true before this fix too and was not touched. Page size is identical
across the whole fleet (A4 landscape, matching the-sat as reference).
Traced x-height is visually consistent fleet-wide; longer per-page words
("potato", "dogs", "naps") auto-shrink against the book's own ceiling and
stay legible, no odd shrinking observed. **Zero defects found — audit
passed 16/16.**

## Publish + verify

Published all 16 `public/dark-phonics-materials/<slug>/tracing-workbook.pdf`
via `node scripts/curriculum/publish-static-materials.mjs <one file>`, one
invocation per file (per the standing rule — multi-file batches can hang on
large PDFs). All 16 uploads succeeded on the first attempt this run — no
hangs. MD5-verified all 16 live URLs
(`https://montree.xyz/dark-phonics-materials/<slug>/tracing-workbook.pdf?v=28`)
against the local rebuilt files: **16/16 matched.**

## Cache bust

`STORYBOOK_PRINT_VERSION` in `app/montree/library/dark-phonics/page.tsx`
was at 27 (from the same-day Sep 2 Work-0/works-books pass) — bumped to
**28**.

## Pipeline recipe (repeat this exactly next time)

1. Rebuild via `scripts/curriculum/flashcards/_patched_trace.py <slug...>`
   (wraps `build_trace_booklet(book, dest_dir, mode='word',
   celebrate=False)`) — the only canonical path, never hand-edit a PDF.
2. Audit before publishing: extract expected trace words from
   `books_def.py` via `spread_trace_word()`, cross-check against the
   REAL reader PDF text (`pdftotext`, not just the book dict), then render
   and visually read every tracing PDF (`pdftoppm` + contact sheets) —
   traced glyphs are vector paths and never extract as text.
3. Publish via `publish-static-materials.mjs`, **one file per invocation**.
4. MD5-verify each live URL against the local file before declaring done.
5. Bump `STORYBOOK_PRINT_VERSION` in
   `app/montree/library/dark-phonics/page.tsx` by one from whatever it
   currently is (check first, don't assume the last-known number).
6. Commit + push (Desktop Commander only) and confirm the Railway deploy
   succeeds before considering the fix live.

## Open questions for the user

- Is it desired for the finale spreads of the-cot ("naps"), the-kit/the-bug
  ("potato"), and the-dog ("dogs") to trace those words instead of the
  book's own hero word? Per this fix's rule they are correct (they match
  what the reader page itself says), but flagging in case the intent was
  always "trace the hero word, always" and the reader pages themselves
  should be reconsidered instead.
- Whether the `_verify/tracing-fix-2026-09-03/before/` before-copies should
  be kept for a while (as a rollback reference) or cleaned up now that the
  audit and republish are both confirmed clean.
