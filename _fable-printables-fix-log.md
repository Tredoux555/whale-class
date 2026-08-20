# Dark Phonics printables — generator fix pass

**2026-08-20 · Fable (Opus fix builder).** Acting on the render-level audit of
the 23 active books. Generators fixed first, then only the in-scope PDFs
rebuilt. No git operations were run — the re-audit/shipping agent owns those.

Environment: `MONTREE_CANVAS_FONTS=scripts/curriculum/flashcards/canvas-fonts/`,
Andika from `public/fonts/`, python3 3.14 (reportlab/pypdf/PyMuPDF/Pillow all
already present), node v22, Chrome for the three-part card render. **No
dependencies were installed.**

Baseline check before touching anything: rebuilt `the-mat/paperwork-pack.pdf`
from unmodified code and compared page-raster fingerprints against the shipped
file — **bit-identical**. So the shipped PDFs are exactly what today's
generators produce, and every diff below is attributable to a fix here.

---

## F1 — Match-page swap (CRIT) — **NOT REPRODUCED; latent bug hardened instead**

**What the audit reported:** p4 "Match" pairs sentences with the wrong images,
same wrong permutation in the-sad / the-dig / the-dog / the-cot / the-kit /
the-egg, correct in the-pit / the-nap / the-mat.

**What I found.** I extracted every one of the 23 shipped match pages and
identified each rendered picture by hashing it back to the book's own art file
(`_fable-scratch/probe3.py`). Result: **all 23 pages carry each of the book's
pictures exactly once — every match page is a valid, solvable bijection.**

The six "wrong" books and the three "correct" books are *identical* in every
input that drives the page:

| | the-pit / the-nap / the-mat | the-sad … the-egg |
|---|---|---|
| `pages[].order` | `[1,2,3,4]` | `[1,2,3,4]` |
| `pages[].word` | ant, snake, cat, potato | ant, snake, cat, potato |
| `matchDisplayOrder` | `[2,4,1,3]` | `[2,4,1,3]` |
| rendered picture order | snake, potato, ant, cat | snake, potato, ant, cat |

Rendered side by side (`png/the-cot-paperwork-pack-p4.png` vs
`png/the-mat-paperwork-pack-p4.png`) the two pages are the same layout, the
same permutation, and both solvable. The audit's own grouping is also
internally inconsistent — it calls the fault "correct in books ≤ lesson 11"
while listing the-sad (wk8), the-dig (wk9) and the-dog (wk10) as broken.

**Conclusion: there is no pairing swap to fix.** I did not change the
permutation — doing so would have broken nine currently-correct worksheets to
chase a defect that isn't there.

**What I did fix:** `page_match()` did contain a real latent index bug. The
left (sentence) column was indexed by *array position*
(`cfg['pages'][i]['order']`) while the right (picture) column was indexed by
*order value* (`matchDisplayOrder[i]`). Those two only agree while `pages[]`
happens to be stored sorted with orders `1..n`. Any book whose `pages[]` were
reordered or renumbered would have silently paired sentences against the wrong
pictures — exactly the failure the audit describes, waiting to happen. Both
columns now resolve through order space via an explicit sorted `left_order`.

*Verified:* a no-op for all current data — the-mat's pairing is unchanged
(ant→snake, snake→potato, cat→ant, potato→cat, bijection YES) and the-cot's is
identical to it, both before and after.

**→ For Tredoux / re-audit:** F1 needs a human eye. If something really is
wrong with these pages it is a *design* question (e.g. snake-in-my-sock's
`matchDisplayOrder[1]` is a fixed point, so the "star" row sits opposite its
own picture — a freebie), not the index swap the audit described.

## F2 — "NOW YOU" overflow (CRIT) — **FIXED**

**Root cause:** `build_tracing.py:trace_page()` fitted the traced sentence with
`sf.fit_wrap(..., maxlines=2)`, but the page only ever draws **two** writing
lines, and the second line is what carries the blank "NOW YOU" independent
practice. Any sentence long enough to wrap onto line 2 therefore ate the
child's line and the section vanished — silently, with no warning.

Measured against every active book before the fix, this exactly reproduced the
audit's list: fully missing on all pages of ant-on-my-apple, the-pit, the-mat,
the-cot, the-egg, the-mud, the-rat; partial on the-nap, the-sad, the-dig,
the-dog, the-kit, the-hot, the-bug and all four readers. **18 books affected**,
not 15 (the-nap, the-sad and the-dig were each losing one page and were not in
the audit's list).

**Fix:** `maxlines=1`. The traced sentence now gets exactly one line and shrinks
to fit; the second line always belongs to the child. Long sentences pay in
x-height (worst case the-mat's "The potato didn't sit on the mat!" at 7.3 mm,
vs 12.5 mm for short ones) instead of costing the section. The section is never
dropped.

*Verified:* every content page of all 23 workbooks now contains "NOW YOU"
(0 failures). Rendered check: the-cot p4 shows the longest sentence on one
line with an empty guided line and the NOW YOU label beneath it. The fix is
provably inert for books that never wrapped — snake-in-my-sock, the-sat,
the-tall, the-spat and the-pat rebuild to identical rasters, so their shipped
files were left untouched.

## F3 — Match instruction wording (MED, series-wide) — **FIXED**

`build_paperwork.py:page_match()`: "Read the words. Draw a line to the
picture." → **"Match the words to the pictures. Draw a line."**

*Verified:* new wording present and old wording absent in all 23 rebuilt packs.

## F4 — the-pit casing (CRIT) — **FIXED**

**Root cause:** not the letter JSON (`dp-the-pit.json` already reads "The ant
sat in the pit!"). The works pipeline reads `flashcards/books_def.py`, where
the-pit's spreads store `text=['Sat in','the pit!']` — a mid-sentence capital.
`load_letterbook()` glued `nar + text` verbatim, printing "The ant Sat in the
pit!". books_def's own locked TEXT RULE #1 says a spread's `text` continues the
`nar`'s sentence and must start lowercase; the-pit predates the rule.

**Fix:** new `continuation_case()` helper in `build_book_works.py`, applied
only where a spread has both `nar` and `text`. Deliberately narrow — an
ALL-CAPS opening word is a shouted target word ('SOCK!') and is left alone.
Fixed in the works builder rather than in `books_def.py` so the printed book
itself is untouched.

*Verified:* the-pit's works now read "The ant sat in the pit!"; the diff is the
casing and nothing else. the-cot's four works rebuild bit-identical, proving
the helper is a no-op for compliant books.

### F4b — the-sat + the-spat, same defect (authorized scope extension)

the-sat and the-spat carried the identical books_def casing defect
("The ant Sat!", "The penguin Spat!"). Director authorized regenerating both
books' four works on 2026-08-20; done with the same fixed generator, no
further code change.

*Verified casing-only vs the shipped versions, all 8 files:* page counts
unchanged (3/3/2/3 each), embedded images byte-identical page for page, and
every differing text page differs **only** by letter case
(`old.lower() == new.lower()` on all of them). Sample: the-spat work2 control
now reads "The penguin spat! / The pig spat! / The pelican spat!"; the title
"The ___ Spat!" correctly stays title case.

| file | bytes |
|---|---|
| the-sat-work1-picture-match.pdf | 5,070,127 |
| the-sat-work2-sentence-picture-match.pdf | 5,071,747 |
| the-sat-work3-sentence-builder-guided.pdf | 5,072,010 |
| the-sat-work4-sentence-builder-free.pdf | 5,073,848 |
| the-spat-work1-picture-match.pdf | 5,797,566 |
| the-spat-work2-sentence-picture-match.pdf | 5,798,718 |
| the-spat-work3-sentence-builder-guided.pdf | 5,798,504 |
| the-spat-work4-sentence-builder-free.pdf | 5,800,016 |

Total regenerated/created PDFs rises from 64 to **72**.

## F5 — Missing works (CRIT) — **FIXED**

`snake-in-my-sock` and `ant-on-my-apple` had no works. Cause: the works builder
had only two content sources. ant-on-my-apple is absent from `books_def` 
entirely, and snake-in-my-sock's spreads there are phoneme play ('Sss— SUN!',
'Sss— SOAP!') — neither yields the decodable sentence set the works need, and
snake's books_def cast is wrong for these materials anyway.

**Fix:** added `load_dp_json()` as a third source plus an explicit
`DP_JSON_SLUGS = {'snake-in-my-sock', 'ant-on-my-apple'}` override, so these two
pre-decodable books take their sentences and art from their letter JSONs
(`pages[].sentence` / `pages[].art`). No text was invented. No other book's
source changed. The builder has no reading-level variants, so all four works
use the one existing template.

*Verified:* 8 new PDFs, established 3/3/2/3 page pattern, sentences straight
from the JSONs (Snake/Star/Soap/Seal in my sock!; An ant/alligator/anteater/
ambulance on my apple!).

## F6 — Three-part cards: style + casts + broken images (HIGH) — **FIXED**

Rebuilt `three-part-cards-{control,pictures,labels}.pdf` for the five
photo-style books from each book's **own illustrations** (`pages[].art`),
via the existing `build_three_part.mjs`.

Confirmed before rebuilding: snake-in-my-sock's control sheet used stock
photos and carried a **blank card** where `sloth` should be, with the stale
sloth/sock cast.

*Style guard:* I first re-ran the builder against the-sat (an already-correct
illustration-style book) and compared to its shipped cards — identical text and
identical layout, 0.34 % of pixels differing by >8 (Chrome antialiasing noise).
So the invocation reproduces house conventions exactly: 7.5 cm cards, green
cut-frame, Andika labels.

Casts now match each book's letter JSON exactly:
snake/star/soap/seal · ant/alligator/anteater/**ambulance** ·
penguin/pig/pelican/potato · turtle/tomato/toothbrush/tiger/taxi ·
ant/snake/cat/potato. No blank cards remain. Visually checked.

## F7 — the-rat sloth decoy (HIGH) — **FIXED (+ the same bug found in the-sad)**

`../snake-in-my-sock/p4-sloth.png` **no longer exists at all** — that slot is
now `p4-soap.png` after the snake-book cast rebuild. `build_paperwork.py` hard
-fails on a missing yes/no image, so the-rat's pack could not be rebuilt.

A preflight over all 23 books found **the identical dead reference in
`dp-the-sad.json`** ("was the sloth sad?"), which the audit missed. It had to be
fixed too or the mandated 23-book regeneration would have failed.

**Deviation from the brief, deliberate:** the brief said to use the fox at
`../fox-in-a-box/p1-fox.png`. That file exists, but **both** books already carry
a fox decoy, so using it would have printed the same picture twice on one
sheet. I used the brief's own listed alternates instead: **duck**
(`../on-a-rock/p1-duck.png`) for the-rat, **owl**
(`../owl-ate-an-orange/p1-owl.png`) for the-sad. Both files verified present.
`_notes` lines added to both JSONs recording the change and flagging it for
Tredoux's review.

*Verified:* the-rat p2 renders "did the duck chase the rat?" against the duck
illustration, answer:false, no broken art.

---

## Files changed

**Generators (3)**
- `scripts/curriculum/satpin-paperwork/build_paperwork.py` — F3 wording, F1 index hardening
- `scripts/curriculum/satpin-paperwork/build_tracing.py` — F2 `maxlines=1`
- `scripts/curriculum/book-works/build_book_works.py` — F4 `continuation_case()`, F5 `load_dp_json()`

**Data (2)**
- `scripts/curriculum/satpin-paperwork/letters/dp-the-rat.json` — F7 duck decoy + note
- `scripts/curriculum/satpin-paperwork/letters/dp-the-sad.json` — F7 owl decoy + note

**Regenerated / created (72 PDFs)**
- 8 × `public/dark-phonics-books/works/{the-sat,the-spat}/*` (F4b, regenerated)
- 23 × `public/dark-phonics-materials/<slug>/paperwork-pack.pdf`
- 18 × `public/dark-phonics-materials/<slug>/tracing-workbook.pdf`
- 15 × `public/dark-phonics-materials/<slug>/three-part-cards-*.pdf` (5 books × 3)
- 4 × `public/dark-phonics-books/works/the-pit/*` (regenerated)
- 8 × `public/dark-phonics-books/works/{snake-in-my-sock,ant-on-my-apple}/*` (new)

**Explicitly NOT touched:** build-it sheets, sentence strips (both confirmed
byte-stable by rebuilding them to scratch and comparing), retired pattern
books, hen-in-bed's reader text, `lessons.ts`, any app code, `books_def.py`.
`materials-out/` is gitignored scratch.
