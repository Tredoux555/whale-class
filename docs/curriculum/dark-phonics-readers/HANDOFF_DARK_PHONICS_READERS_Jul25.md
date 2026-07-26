# Handoff — Dark Phonics Readers (Weeks 7–27)

Date: 2026-07-25

## What was built

Twenty-one decodable readers were produced, covering weeks 7 through 27 of
the Dark Phonics curriculum. Each book introduces exactly one new phonics
sound, building on everything before it: m, d, g, o, c, k, ck, e, u, r, h,
b, f, l, j, v, w, x, y, z, qu.

Each book ships as two PDFs, both built with ReportLab through the existing
"Inked Hush" print engine (the same house engine used for the earlier
SATPIN weeks 1–6 books):

- `<slug>-A5-reading.pdf` — one page per spread, for reading on screen or
  as a proof
- `<slug>-A5-booklet-print.pdf` — imposed onto A4 landscape sheets in
  correct saddle-stitch order, ready to print, fold, and staple

Full book list, in order, with the target word(s) introduced and the
punchline word that closes the story:

| Week | Sound | Slug | Title | Target word(s) | Punchline |
|---|---|---|---|---|---|
| 7 | m | sam-and-the-monkey | Sam and the Monkey | mat, Sam | Sam! |
| 8 | d | dad-and-the-dog | Dad and the Dog | pad | mat! |
| 9 | g | the-goat-and-the-pig | The Goat and the Pig | pig | Sam! |
| 10 | o | on-the-pot | On the Pot | pot, dog | dog! |
| 11 | c | the-cat-and-the-cot | The Cat and the Cot | cot, cat | cat! |
| 12 | k | kim-and-the-kit | Kim and the Kit | kit, Kim | Kim! |
| 13 | ck | the-dog-ate-the-sock | The Dog Ate the Sock | sock, sick | sick! |
| 14 | e | get-off-the-egg | Get Off the Egg! | egg | egg! |
| 15 | u | stuck-in-the-mud | Stuck in the Mud | duck, mud, stuck | stuck! |
| 16 | r | under-the-rug | Under the Rug | rug, rat, under | rat! |
| 17 | h | in-the-hat | In the Hat | hat, hen | hen! |
| 18 | b | the-bug-in-the-bed | The Bug in the Bed | bed, bug | bug! |
| 19 | f | off-went-the-fan | Off Went the Fan | fan, off | fan! |
| 20 | l | it-is-not-a-log | It Is Not a Log | log, run, croc | croc! |
| 21 | j | jam-in-the-jug | Jam in the Jug | jug, jam | jam! |
| 22 | v | the-van-can-not | The Van Can Not | van | not! |
| 23 | w | it-is-not-a-wig | It Is Not a Wig | wig | cat! |
| 24 | x | what-is-in-the-box | What Is in the Box? | box, fox | fox! |
| 25 | y | yum-yam | Yum, Yam! | yam, big | big! |
| 26 | z | zip-it-up | Zip It Up | zip, bag | bag! |
| 27 | qu | quick-under-the-quilt | Quick! Under the Quilt! | quilt, squid | squid! |

## The locked format

Every book in this run follows one fixed five-sentence structure. Sentences
one through four repeat a single carrier frame — "[character] sat on
the… OBJECT!" (or the local variant such as "sat in the…" / "ate the…") —
cycling through a small cast of characters (usually Sam, then the cat, then
the dog or another animal). Sentence five is the punchline: it breaks the
frame, introduces the new decodable word, and its illustration is also used
as the book's cover image.

The teacher reads the small grey italic line (the carrier phrase, e.g. "The
cat sat on the…"). The child reads only the big bold word at the end of
each sentence. Everything the child is not reading — the carrier phrase and
any character names — is either the fixed frame or a name the child simply
says aloud; it is never phonics work for the child.

Page order is: cover, half-title, five spreads (a text page followed by an
art page, for each of the five sentences), padding pages as needed to reach
a multiple of four, a words list, and a back cover. This comes to 16 pages
per book, i.e. 4 physical sheets when imposed for saddle-stitch printing.

Unlike the earlier SATPIN books (weeks 1–6), this series has no "potato
page" — that page type was deliberately dropped by the author for weeks
7–27. The words list has also moved: it now lives at the BACK of the book,
not the front. The back cover carries a fixed tagline: "One sound. Five
sentences. One new word to read."

## Where things live

- **Art**: `phonics-images/satpin-v2/books/<object>/` — one folder per
  book, named after the object in the story. The 21 folders for this run
  are: monkey, dog, pig, pot, cot, kit, sock, egg, mud, rug, hat, bed, fan,
  log, jug, van, wig, box, yam, zip, quilt.
- **PDFs**: `public/satpin-books/print/` — both PDFs for every book, old
  and new, live flat in this one folder.
- **Build scripts**: `scripts/curriculum/dark-phonics-readers/` —
  `dpbuild.py` (the shared builder for this series) plus one `book<NN>.py`
  per book, `book07.py` through `book27.py`. Run a single book with
  `python3 book<NN>.py` from that directory.

`dpbuild.py` imports the house print engine from
`scripts/curriculum/flashcards/build_booklets.py`, and both it and the
individual `book*.py` files currently expect the art and the house engine
to be reachable at `/mnt/user-data/uploads/montree/...` — i.e. they were
written to run inside a Cowork session with the `montree` folder staged
into the container. To run them anywhere else (a plain local checkout, a
CI box, etc.), the `sys.path.insert` line and the `BOOKS_ROOT` constant in
`dpbuild.py` need to be pointed at the real local paths first.

Note on `book07.py`: the week 7 book (`sam-and-the-monkey`) predates
`dpbuild.py` and was built with its own one-off script, iterated three
times during development (`build_w07.py`, `build_w07_v2.py`,
`build_w07_v3.py`). The final, working version of that script has been
copied into this handoff's scripts folder as `book07.py` so the full
week 7–27 run is covered by one consistent naming scheme. It is
functionally equivalent to `dpbuild.py`'s `build()` but self-contained
(it does not import from `dpbuild.py`).

## Character sheets — reuse these, do not regenerate

Nine characters recur across the series. Each has a locked Midjourney
character-reference (oref) image; always reuse the same oref rather than
generating a fresh character, or consistency across books breaks.

- **Sam** — `cdn.midjourney.com/768045bf-3ddd-47ff-9672-62d8fa1d61cc/0_0`.
  Wooden Montessori peg-doll boy, polished round wooden head, no hair, blue
  denim dungarees. Sam was re-locked mid-run because he kept drifting into
  a soft-drawn, more conventionally illustrated boy — always describe him
  fully in the prompt text as well as supplying the oref, don't rely on the
  oref alone.
- **Cat** — `cdn.midjourney.com/d03bb794-d5cd-4639-b413-117a93bedc02/0_0`.
  Golden tabby.
- **Dog** — `cdn.midjourney.com/5c96cd74-bc4e-4c3e-8ebf-c263a53d8700/0_0`.
  Scruffy shaggy mutt.
- **Duck** — `cdn.midjourney.com/c4cefe00-46b3-4cad-a0b3-0bc4b3ce2c36/0_1`.
- **Pig** — `cdn.midjourney.com/37826a24-8118-43ea-abd9-5aa8a2919b12/0_0`.
- **Goat** — `cdn.midjourney.com/9a5cedf4-7aa6-4cb2-aaed-8e6355a58d6c/0_0`.
- **Octopus** — `cdn.midjourney.com/3238dba6-6ea4-4751-ad49-362eaecf73fb/0_0`.
- **Kim** — `cdn.midjourney.com/f4dde222-ad26-4703-ad60-d33395c812ac/0_0`.
  Gold paper crown, red robe.
- **Monkey** — `cdn.midjourney.com/8e153d16-7252-40f0-afb1-ded79693fa73/0_0`.
  Hairy, scratchy fur — the author explicitly likes him hairy; do not
  flatten or smooth him out in future generations.

## The art style

Every image prompt ends with this locked suffix, used verbatim:

```
, colored hand-drawn pen-and-ink, fine crosshatch, whimsical Dr. Seuss
children's-book style, big googly eyes, plain white background. no text,
no words, no letters, no numbers, no captions, no speech bubbles, no
border, no watermark --ar 3:2 --v 7 --oref <URL>
```

Always use Midjourney V7, never V8 — V8 does not support `--oref`, and
without an oref character consistency across a 21-book run collapses
completely. All art in this run is 1344×896.

## Hard-won lessons

These are the most valuable part of this document — they explain most of
the time spent and most of the visible imperfections below.

1. **Soft or oversized objects work; rigid small ones do not.** A
   character only reads as sitting ON something if the object is soft or
   open (mud, a cot, a bed, a quilt, a mat, an ink pad) or has been scaled
   up to roughly "as big as a sofa." Rigid small objects — a piggy bank, a
   pot, a sock, a jug — reliably produce "standing beside it," no matter
   how the prompt is worded. This single rule explains nearly every art
   failure in the run. The fix is to oversize the object, name the contact
   and posture explicitly ("bottom planted squarely on top, weight resting
   on it, surface sagging"), and use a low camera angle. Never use the
   word "wearing" — it pushes the model toward a costume reading instead
   of a sitting-on reading.
2. **Midjourney will not stack characters.** "The dog sat on the pig"
   renders as a dog and a pig standing side by side, every single time.
   Only objects can be sat on. The ending of this series was redesigned
   around this limitation rather than fought.
3. **Roughly one submission in five silently vanishes.** The Midjourney
   queue badge is not reliable — it can show a job as pending when it has
   actually been dropped. Always list completed jobs and diff against what
   you intended to submit before building a book from them.
4. **`curl` cannot fetch `cdn.midjourney.com`** — it sits behind
   Cloudflare and blocks direct fetches. Download images by navigating a
   real browser tab to the image URL and using an in-page fetch + blob +
   anchor-click, which saves to `~/Downloads`. Always check the returned
   byte size afterwards — a frozen renderer will silently skip the save
   with no error.
5. **Never reuse an art filename.** The Cowork file bridge serves stale
   cached copies of a filename it has seen before, which silently rebuilds
   a book using the old images even after the art has been regenerated.
   Always version the filename (`-v2`, `-v3`, …) rather than overwriting.
6. **The style bakes in fake cursive "artist signatures"** in the bottom
   corners of nearly every image. No amount of prompt wording removes
   this — confirmed over 10+ generations. If it matters, crop the bottom
   ~7% of the image; the author decided for this run that it does not
   matter enough to bother.
7. **Red jam reads as blood.** Any red, glossy liquid in this art style
   photographs as blood rather than food. Use blueberry (a
   blue/purple palette) for jam instead of the more obvious red, and check
   any red-liquid scene with fresh eyes before shipping.
8. **Do not run the browser step on Opus.** Delegate the entire Midjourney
   submit/poll/download loop to a Sonnet subagent that reports back in
   text only — screenshots are what actually burn the context budget, not
   reasoning. This is roughly a 10–20x context saving over doing it
   directly. Keep a human visual-quality check in the loop, but run it
   against a handful of sampled images, not against every image in the
   batch.

## Known imperfections, for a future fine-tune pass

None of these blocked shipping; they're listed so a future pass can target
them precisely instead of re-reviewing all 21 books from scratch.

- **Book 17, "In the Hat," page 3**: Sam's torso is still visible above the
  brim of the hat, rather than being tucked down inside it as intended.
- **Book 20, "It Is Not a Log," page 5 (cover)**: of the three characters
  riding the crocodile, the third does not clearly read as Sam.
- **Books 9–13**: several pages show a character positioned beside the
  target object rather than on/in it — specifically the goat and the dog
  on the piggy bank (book 9), the dog in rather than on the pot (book 10),
  the dog beside rather than on the cot (book 11), and Sam beside rather
  than on the sock (book 13). These are all instances of lesson #1 above
  (rigid small objects resisting the "sitting on" pose).
- **Book 8, "Dad and the Dog," cover**: the four-character group shot
  reads as muddled at a glance — the ant in the scene appears to be
  wearing the dungarees rather than Sam.
- **Fake artist signatures** appear throughout, per lesson #6 above;
  accepted as-is for this run.

## Open threads

Books 1–6 (the original SATPIN set, weeks 1–6) predate this run and use a
different, richer page grammar — 7–9 spreads per book, with whisper and
drop beats layered in. Weeks 7–27, covered by this handoff, use the
simpler locked five-sentence format the author chose for this stretch of
the curriculum; the two formats are intentionally different, not a
migration in progress.

The `♥` glyph used in the heart-words line renders as an empty box because
the Lora Italic font does not include that character. It was removed from
books 7–27 for this reason, but books 1–6 still reference it via
`books_def.py` and will still show the empty-box glitch if rebuilt as-is.

`reader-designs-v2.md`'s Part B only ever specified the page grammar for
weeks 1–6, and its "≥5 decodes per target word" rule is not met by the
simpler five-sentence format used here. This is a deliberate authorial
choice — favoring rhythm and early reading confidence over decode density
for this stretch of books — not an oversight or a spec violation to be
fixed.
