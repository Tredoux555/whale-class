# Making a new Dark Phonics book — a step-by-step guide

This is written for you, Tredoux, not a developer. It walks through adding a
brand-new Dark Phonics book from a standing start: where the art goes, how to
write the text, how to build the PDFs, and how to check it before you print
anything. It assumes you're working with a Claude session that has the repo
open (either on the Mac directly, or Cowork with a Desktop Commander MCP
connection for the git/network steps).

There are **two different kinds of book** in this series, and they live in
two different files. Figure out which one you're making first:

- **Sat-cast letter book** ("The ___ Sat!", "The ___ Digs!") — the same six
  characters (ant, apple, sun, star, snake, cat) plus the potato do the same
  action on every page, one new letter sound per book. Defined in
  `scripts/curriculum/flashcards/books_def.py`.
- **Picture-word pattern book** ("Snake in My Sock", "A Tiger in the Taxi")
  — a run of picture words the child shouts, one letter sound per book, no
  "cast." Defined in `scripts/curriculum/dark-phonics-storybooks/
  manifest.json` + `build_a5_readers.py`.

If you're not sure which shape fits your new book, look at an existing book
of the target sound in `app/montree/library/dark-phonics/page.tsx` for a
close comparison, or just ask whichever Claude session you're working with.

---

## 1. Cover art and the art folder

Both series expect art as plain PNGs, one per page/spread, named to match the
page they belong to. Sat-cast books: file art under
`phonics-images/dark-phonics-books/<slug>/`, one file per spread
(`p1-ant.png`, `p2-apple.png`, ... `p7-recap.png`, `p8-potato.png`) — look at
`phonics-images/dark-phonics-books/the-dig/` for a working example folder.
Picture-word books: file art under `phonics-images/dark-phonics-books/
<slug>/<key>.png`, where `<key>` matches the `"key"` field of that page's
entry in `manifest.json` (e.g. `p2-ant.png` for the key `"p2-ant"`).

The recap/finale image (the one that shows every character/word together) is
almost always reused as the book's cover thumbnail too — see any existing
book's `cover=` line in `books_def.py` or its `recap_key` handling in
`build_a5_readers.py`.

Art style is locked across the whole series: colored hand-drawn pen-and-ink,
fine crosshatch, whimsical Dr. Seuss children's-book style, big googly eyes,
plain white background, no text/words/letters/numbers/captions/speech
bubbles/border/watermark. Copy the exact MJ prompt wording from an existing
page's `"mj_prompt"` in `manifest.json` (picture-word) or from
`docs/curriculum/satpin-redesign/art-manifest.md` (sat-cast) and just swap
the subject description — don't freehand new prompt language.

**Expression rule, every character, every page: happy or content, full stop.**
No fear, sadness, anger, or distress. The Cat gets one exception — a playful
skeptical look (eyebrow raised, good-humored) is fine, grumpy is not.

---

## 2. Writing the spreads

### The rule that governs every single page

**The literal last word of the sentence is the shout — big, bold, printed
big on its own. Everything before that word is small italic narration.**
Never make a whole phrase bold. If you're tempted to write "Has a dog." as
one bold block, stop — it's `nar="The ant has a…"` + the bold shout `"dog."`.

### Sat-cast book: one spread per `dict(...)` entry

Open `scripts/curriculum/flashcards/books_def.py` and copy the shape of an
existing letter book — `the-dig` is a clean, simple example:

```python
dict(slug='the-dig', title_lines=['The ___','Digs!'], title_accent='Digs!', title_size=46,
 band='LETTER G  ·  s a t p i n m d g (the-sat cast)', booknum='LETTER BOOK SEVEN · DIG', cover=DIG7+'/p7-recap.png',
 new='Dig', review='sat  ·  spat  ·  pat  ·  pit  ·  nap  ·  mat  ·  sad  ·  at', heart='♥  heart words — a · the',
 oral_note='the nouns live in the pictures — named aloud, never printed',
 spreads=[
  dict(nar='The ant…', text='digs.', size=92, art=DIG7+'/p1-ant.png'),
  dict(nar='The apple…', text='digs.', size=92, art=DIG7+'/p2-apple.png'),
  dict(nar='The sun…', text='digs.', size=92, art=DIG7+'/p3-sun.png'),
  dict(nar='The star…', text='digs.', size=92, art=DIG7+'/p4-star.png'),
  dict(nar='The snake…', text='digs.', size=92, art=DIG7+'/p5-snake.png'),
  dict(nar='The cat…', text='digs.', size=92, art=DIG7+'/p6-cat.png'),
  dict(text=['Dig! Dig!','Dig!'], style='drop', size=64, art=DIG7+'/p7-recap.png'),
  dict(nar="The potato doesn't…", text='dig!', size=48, art=DIG7+'/p8-potato.png'),
 ]),
```

Notes on the fields:
- `text=` on a normal spread is **always the bare shout word alone**, e.g.
  `'digs.'` — never `'The ant digs.'`. `nar=` carries everything before it.
- **Ignore the `size=` numbers you see in existing entries when writing a new
  book — they no longer do anything on narrative pages.** All narrative
  reveal words are now sized automatically by one shared rule (`reveal_size()`
  in `build_booklets.py`) so every book looks uniform. Old `size=` values are
  dead weight left over from before that rule existed; don't copy them, and
  don't add your own. (See "What NOT to do" below.)
- The **recap page** (`style='drop'`) is the one place `text=` is still a
  list of full lines — repeat the bare target word 2-3 times, capitalized
  each time as its own shout, e.g. `['Dig! Dig!','Dig!']`. This is the one
  spot the "last word only" rule doesn't apply — recap pages keep their own
  authored size and treatment on purpose.
- An **art-only cameo spread** — a page that's just a picture, no words at
  all — is a `dict(art='...png')` with no `nar` and no `text`. It renders as
  one full-page picture automatically; you don't need to do anything special.

### Picture-word book: manifest + SPLITS + COVERS

This one has three pieces that all have to agree, in two files.

**a. `scripts/curriculum/dark-phonics-storybooks/manifest.json`** — add a new
entry to the `"books"` array with the next `"num"`, the `"letter"`, `"slug"`,
`"title"`, and one `"pages"` entry per spread (`"key"`, the full natural
sentence as `"text"`, and `"mj_prompt"`). The manifest's own `"text"` is the
**whole natural sentence** — that's fine, it's just documentation/art
reference; the actual printed split happens in step b.

**b. `scripts/curriculum/dark-phonics-storybooks/build_a5_readers.py`** — add
two entries, keyed by your new slug:
- `COVERS[slug] = (title_lines, title_accent, title_size, oral_words)` —
  e.g. `'oral_words': 'ant · alligator · anteater · ambulance'`.
- `SPLITS[slug] = [(nar, text, size), ...]`, one tuple per manifest page, in
  the same order. Copy `ant-on-my-apple`'s shape:

```python
'ant-on-my-apple': [
    ('An apple.', None, 100),
    ('An ant on my…', 'apple.', 92),
    ('An alligator on my…', 'apple.', 92),
    ('An anteater on my…', 'apple.', 92),
    ('An ambulance on my…', 'apple.', 92),
    ('', ['Apple! Apple!', 'Apple!'], 64, 'drop'),
],
```

Same rule as sat-cast: `text` is the bare last word alone, `nar` is
everything before it, recap page is the target word repeated 2-3× with
`'drop'` style. The `size` number in each tuple is likewise ignored on
narrative pages now — leave it whatever an existing book uses (`92` or
`100`) rather than inventing a new number.

---

## 3. Adding the book to the library page

Open `lib/montree/dark-phonics/lessons.ts`. Find the `RAW` array entry for
your lesson's `n` (curriculum lesson number — the page shows `n - 4`, e.g.
n=6 shows as "Lesson 2"). Add a `books: [...]` array entry (or add to an
existing one — a lesson can carry more than one book) in this shape, copied
from an existing entry:

```ts
{ slug: 'the-dig', title: 'The ___ Digs!',
  description: 'The-sat cast returns: ant, apple, sun, star, snake, cat — plus the potato, who doesn't.',
  cover: '/dark-phonics-books/covers/the-dig.png', materials: true, works: true },
```

- `cover:` **must** be set explicitly to `/dark-phonics-books/covers/
  <slug>.png` — leaving it unset falls back to an unpopulated bucket path and
  the cover thumbnail breaks.
- `materials: true` / `works: true` only once those files actually exist
  (see the build step below) — a `true` flag with missing files just makes
  that one button 404 when clicked, it doesn't break the page.
- **Never touch an existing lesson's `reader:` field.** `reader` is a
  separate, older content system (the 11 gated "Easy Readers") — it is not
  interchangeable with `books`, and overwriting one with a new book slug
  breaks that lesson's PDF link.

---

## 4. Building the PDFs

Run these from the repo root on the Mac (or via Desktop Commander). First,
every build needs the fonts:

```bash
export MONTREE_CANVAS_FONTS="$(pwd)/scripts/curriculum/flashcards/canvas-fonts/"
```

**Sat-cast book** (reader, then tracing):

```bash
cd scripts/curriculum/flashcards
python3 -c "
import build_booklets as bb
from books_def import BOOKS
book = next(b for b in BOOKS if b['slug']=='the-dig')
bb.build(book)
"
python3 build_tracing_booklet.py the-dig
```

Reader output lands in `public/dark-phonics-books/print/`; the tracing
booklet needs one more step to land where the site expects it:

```bash
cp print/the-dig-A5-tracing-booklet-print.pdf ../../../public/dark-phonics-materials/the-dig/tracing-workbook.pdf
```

**Traced-word rule (2026-09-03, locked):** in word mode, each per-spread trace
page traces the LITERAL LAST WORD OF THAT SPREAD'S OWN READER PAGE — the
same word that prints big/bold on the facing reader page — not the book's
title-sentence hero word (`book['new']`). See `spread_trace_word()` in
`build_tracing_booklet.py`: it takes the spread's `text` (a string, or the
last element if it's a list — recap chants read top-to-bottom, so the list's
last item is the page's last line), strips punctuation, lowercases, and
takes the last whitespace-separated token. A spread with no `text` at all
(e.g. a wordless intro page) falls back to the book's hero word, since the
reader page itself has no word to match. This means a book's tracing pages
are NOT always the same word: the-nap's character pages trace "naps" but its
potato page traces "nap"; the-cot's finale traces "naps"; the-kit's and
the-bug's finale trace "potato"; the-dog's finale traces "dogs". This is
correct, not a bug — always cross-check against the reader page before
assuming a mismatch. Rebuild via `_patched_trace.py <slug...>` (wraps this
same `build_trace_booklet(..., mode='word', celebrate=False)`), never by
hand-editing a PDF.

**Picture-word book** (reader, then tracing):

```bash
cd scripts/curriculum/dark-phonics-storybooks
python3 build_a5_readers.py   # rebuilds the whole series, or edit main() to filter to your slug
python3 build_a5_tracing.py <your-slug>
```

`build_a5_tracing.py` writes straight to
`public/dark-phonics-materials/<slug>/tracing-workbook.pdf` — no copy step
needed for this series.

**Easy Reader tracing workbook — UNIFIED (2026-09-05, Tredoux: "readers
must look exactly like the letter books"):** the 11 standalone Easy Readers
(`mud-pup`, `hen-in-bed`, `fox-in-a-box`, `cat-cot-cut`, `the-bell-fell`,
`fish-and-chick`, `this-and-that`, `jump-in-the-sand`, `frog-and-crab`,
`big-splash`, `the-cat-sat`) no longer have their own tracing pipeline. They
go through the SAME generator as the letter books, so all 30 slugs share one
cover system (`page_cover()` + bookplate), one half-title / WORDS IN THIS
BOOK / back cover, one folio, and one A5 saddle-stitch imposition. The old
`satpin-paperwork/build_tracing.py` cover — "TRACE AND BUILD", letter badge
circle, `written by ___` — is retired; that script still owns
`build-it-sheet.pdf` only.

```bash
cd scripts/curriculum/flashcards
python3 build_tracing_booklet.py --readers --all      # all 11
python3 build_tracing_booklet.py --readers mud-pup    # just one
```

It writes straight to
`public/dark-phonics-materials/<materialsSlug>/tracing-workbook.pdf` — no
copy step. Notes:

- Readers always build in **sentence mode** (a reader page prints a whole
  sentence, with no `nar`/reveal split for word mode's `book_word_xheight()`
  to size against), so their cover badge reads `TRACE THE STORY`, the same
  badge the two pattern books carry. Sat-cast letter books stay on word mode
  (`TRACE & WRITE`).
- Source data is `lib/montree/english-curriculum/spec/easy-readers-manifest-v2.json`
  plus art at `phonics-images/easy-readers/<slug>/p1..p5.jpg` and `cover.jpg`;
  the cover band's sound is read live out of `lib/montree/dark-phonics/lessons.ts`
  by gate number, so it can't drift from the library page.
- **`fox-in-a-box` writes to `fox-in-a-box-reader/`**, not `fox-in-a-box/` —
  the library page sets `materialsSlug: 'fox-in-a-box-reader'` because a
  retired pattern storybook already owned the bare slug. `READER_MATERIALS_SLUG`
  in `build_tracing_booklet.py` encodes this; keep it in sync with `lessons.ts`.
- A reader workbook is 16 A5 pages → **8** imposed A4-landscape sheets
  (letter books are 20/24 → 10/12). The invariant that holds across the whole
  family is `print pages = reading pages ÷ 2`.

### Book works — LAYOUT STANDARD (2026-08-27, approved)

`scripts/curriculum/book-works/build_book_works.py <slug>` builds the four
manipulative works. Its layout is locked — do not revert it:

- Base / working / control sheets: solid thin rules, square corners, no gaps —
  every slot drawn full size and bordered. Never cut.
- Cut sheets: dashed guillotine lines only; tabs carry no border of their own.
- One continuous stroke per boundary (never a rect per cell), so each boundary
  is exactly one straight guillotine cut.
- `TAB_GAP = 2 mm`: cut cells are 4 mm narrower and shorter than their slot, so
  a tab drops in; the cut grid is centred on the sheet.
- Cut-sheet instruction line states the cut count: `(rows + 1) + (cols + 1)`.

### Cover bookplate — COVER STANDARD (2026-08-27, approved)

Every cover `page_cover()` draws (sat-cast readers, picture-word readers,
both tracing editions) ends with a small ex-libris "This book belongs to"
plate, bottom-left corner, 56x25mm, sitting on the page margin — a place
for the child to write their name. It's drawn by `draw_bookplate()` in
`build_booklets.py` and needs no per-book setup; it comes free with
`page_cover()`. Don't add any other "written by ___"/name line to a
cover — it will collide with this plate's footprint.

### Syncing so it goes live

The built PDFs are gitignored — they never go into a git commit or a
Railway deploy. What makes them live is syncing to the Supabase bucket:

```bash
node scripts/curriculum/publish-static-materials.mjs \
  public/dark-phonics-books/print/the-dig-A5-reading.pdf \
  public/dark-phonics-books/print/the-dig-A5-booklet-print.pdf \
  public/dark-phonics-books/covers/the-dig.png \
  public/dark-phonics-materials/the-dig/tracing-workbook.pdf
```

(List every file you just built. Run this from the Mac via Desktop Commander
— it needs `.env.local` credentials and network, which the Cowork device
bridge doesn't have.) That's it — no `git push`, no Railway redeploy needed
for the PDFs themselves to appear at their live URL. You DO still need to
commit + push if you edited any `.py`, `.ts`, or `.json` source file (the
book definition, the library page entry, the manifest).

---

## 5. Check before printing

Open the **`-A5-booklet-print.pdf`** (not the `-A5-reading.pdf` — that one's
just the reading-order proof, not what a printer uses) and check, in this
order:

1. **Every sentence page faces its picture.** Flip through — on each spread,
   the small-italic + bold-word text page should sit directly opposite its
   matching art page, never opposite the wrong page's art.
2. **Page count is a multiple of 4.** Saddle-stitch printing needs this; the
   build script prints the page count and sheet count when it runs — check
   that against what you expect.
3. **Only the last word is bold**, everything before it is small italic, on
   every narrative page. Recap page is the exception — it's fine for that
   one to be the repeated shout word in red.
4. **The reveal word fits the page** with clear margins — nothing crammed
   against the edge or overflowing.
5. **Print settings**: duplex, flip on the **short edge**, and nest the
   sheets with sheet 1 on the outside. There's a small grey printed note on
   sheet 1 of every booklet-print PDF confirming this — if it's not there,
   something's wrong with the build.
6. **Use a fresh browser tab or incognito window**, or add `?fresh=1` to the
   URL, before trusting what you see. See the cache note below.

---

## The cache gotcha — read this before you say "still broken"

PDFs are cached by the browser for **24 hours** after a sync. If you just
resynced a fixed file and it still looks wrong, it is almost always a stale
browser tab, not a real bug — Chrome's built-in PDF viewer in particular
loads a file once per tab and does **not** re-fetch it as you scroll/page
through, even with a cache-busting URL parameter. Before reporting something
as still broken:
- Close the tab entirely and open the URL fresh, or
- Open it in an incognito/private window, or
- Hard-reload (not just refresh).

A `curl` download of the same URL at the same moment can be clean even while
an old open tab still shows the broken version — that's not a contradiction,
it's the cache.

---

## What NOT to do

- **Don't add a `size=` value hoping to make a word bigger or smaller.** It's
  ignored on every narrative reveal page — the size is computed automatically
  from one shared rule so every book matches. If a word looks wrong on the
  page, that's a bug in the sizing rule itself, not something to patch around
  per-book.
- **Don't copy the pagination code into a new file.** There is exactly one
  place that lays out page order, blanks, and facing pairs
  (`build_booklets.story_pages()` / `paginate()`); every reader and tracing
  builder calls into it. If you're writing a new builder and find yourself
  typing a page-list loop by hand, stop — that's exactly the mistake that
  caused this whole mess (three drifted copies, years of silent breakage).
- **Don't trust an old browser tab.** See the cache section above.
- **Don't put the words page at the front.** The locked order is cover ·
  blank · half-title · story · WORDS IN THIS BOOK · back cover — word list at
  the **back**, not page 2.
- **Don't touch an existing lesson's `reader:` field in `lessons.ts`** when
  adding a `books:` entry — they're separate systems, see step 3.
- **Don't invert or reorder the sentence** for a "cleverer" reveal (e.g. "In
  my sock… a snake!"). Straight natural word order only, exactly as the song
  or story naturally says it, with the shout word landing last because
  that's how the sentence actually ends.

---

## Adding a reader — `materialsSlug` override

An easy reader's `slug` (in `lessons.ts`, e.g. `reader: { slug: 'fox-in-a-box',
... }`) is what names its own reader PDF and its `works` pack
(`public/dark-phonics-books/works/<slug>/`). Its tracing workbook and
paperwork pack, by contrast, live under a separate materials directory —
`public/dark-phonics-materials/<materialsSlug ?? slug>/` — and normally that
directory just reuses the reader's own slug.

`fox-in-a-box` is the one reader that overrides this: its lessons.ts entry
sets `materialsSlug: 'fox-in-a-box-reader'`, so its tracing-workbook.pdf and
paperwork-pack.pdf live at `public/dark-phonics-materials/fox-in-a-box-reader/`
— NOT `public/dark-phonics-materials/fox-in-a-box/`. That non-`-reader` path
also exists on disk (an older, pre-override build) and is exactly the
foot-gun this override exists to prevent: a manual rebuild that doesn't know
about `materialsSlug` will happily regenerate straight into
`fox-in-a-box/`, and the live site will keep serving the `-reader/` files,
silently unchanged. `page.tsx` reads this with the
`l.reader.materialsSlug ?? l.reader.slug`
fallback pattern everywhere it builds a materials path — copy that pattern,
not a bare `l.reader.slug`, when adding pills for a reader's materials. If
you rebuild `fox-in-a-box`'s tracing workbook or paperwork pack by hand,
publish it to the `-reader` suffixed directory or the live site will keep
serving the old file.
