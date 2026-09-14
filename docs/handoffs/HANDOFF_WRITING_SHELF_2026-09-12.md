# Writing Shelf — where things stand (12 September 2026)

This is the pick-up-here note for the Dark Phonics **Writing Shelf**. It is
written for a reader with no prior context, Tredoux included. No jargon; where a
technical thing matters, it is explained in a sentence.

The Writing Shelf is a set of printable materials for Tray 1 to Tray 8 of the
classroom writing shelf. The PDFs live in `public/dark-phonics-shelf/v2/`, the
Python programs that draw them live in `scripts/curriculum/writing-shelf/`, and
the words and sentences they print come from one TypeScript file,
`lib/montree/dark-phonics/writing-shelf-language.ts`.

The work described here is all **Tray 5 — Sentence Builder**, which is now three
printed sheets: the word tin (sheet 12), the Story Starter cards (sheet 13) and
the new Sentence Builder cards (sheet 14).

---

## 1. The new thing: the Sentence Builder tray (Tray 5, print sheet 14)

Eighteen illustrated cards, built this session. Each card has a **picture on the
front and its sentence on the back** — nothing else on either face. The child
looks at the picture, says what he sees, builds that sentence out of the loose
word cards in the tin, and only then turns the card over to check himself. The
sentence on the back is the control of error; it is not a caption.

(It used to be picture and sentence on the same face. That was sent back after
the first printed proofs: a picture with the words next to it is a label, and a
child reads the words and stops looking at the picture.)

The eighteen cards are graded into **three levels, and the colour of the frame
is the level**. Nothing on the card says "hard" or "level 2" — the colour does
all of it, which is how the classic Montessori reading series has always worked:

* **Pink — pure three-letter words.**
* **Blue — four-letter words.**
* **Green — consonant blends**, where two consonants are read as one push of
  breath (st, sp, bl, cr, nd, mp).

Pink, blue and green are not colours picked for this tray. They are the
Montessori Pink, Blue and Green reading series in their own order, so a child who
meets them anywhere else in the classroom already knows what they mean.

### The eighteen sentences

**Pink — six cards, three-letter words only**

1. the cat sat
2. the ant sat
3. the sun sat
4. the ant is sad
5. the ant is hot
6. a pig in a wig

**Blue — six cards, four-letter words**

7. a fox in a box
8. the ant naps
9. the ant digs
10. the cat naps
11. the cat digs
12. the sun naps

**Green — six cards, one consonant blend each**

13. the star sat — **st**
14. the penguin spat — **sp**
15. the blob sat — **bl**
16. the crab sat — **cr**
17. the sad dad sat in the sand — **nd**
18. the cat can jump — **mp**

### Why they are arranged this way

* **The colour progression is the lesson.** Pink to blue to green is the same
  path the child walks in the reading materials, so the tray teaches the order
  as well as the words.
* **One sentence pattern is carried deliberately from pink into blue.** "a pig
  in a wig" is the last pink card and "a fox in a box" is the first blue card —
  the same sentence shape, the same kind of drawing, the same rhyme game. The
  first card of a new colour should feel like something he has already done, so
  that the only new thing is the harder word. (That same fox-in-a-box drawing is
  also on sheet 13, which helps again.)
* **Blends are met inside a sentence he can read, never drilled on their own.**
  Every green card is a whole readable sentence that happens to contain one
  blend. The child is not asked to practise "st" in isolation; he reads "the star
  sat" and the blend comes along with the meaning.
* **Every sentence is all lower case and has no full stop.** These are the
  literal words a four-year-old says about a picture. The capital letter and the
  full stop are *his* to add with a punctuation tile off the tray.

### Where the artwork came from

Fifteen of the eighteen pictures are **reused** from work the project already
owns — no new commissions, no new generation cost:

* **the-sat** flashcard tiles — cat, ant, sun and star
* **the-sad** and **the-hot** — the ant
* **the-nap** and **the-dig** — the ant, the cat and the sun
* **the-spat** — the penguin
* **w08-sand** — from the CVC picture set
* the **story-starter** drawings — pig in a wig, fox in a box

Only **three drawings were made new**: the blob, the crab, and the jumping cat
(the last one landed this session, pen-and-ink with a watercolour wash, the same
hand as the other two). That completed the green level at six blends.

**The "trim to ink" step.** The original drawings each carry however much white
space the artist or the generator left around them. Printed straight onto a card,
that white space became dead space and the drawing looked small and often sat low
on the card. The builder now measures where the actual ink starts and stops,
crops to that, gives back an even margin of white on all four sides, and then
scales the result to fill the whole picture area on the card — keeping the
drawing's proportions and centring it on the ink rather than on the file. **The
original image files are never changed**; the trimming happens on a working copy
each time the PDF is built.

---

## 2. The card design system (sheets 13 and 14)

These numbers are settled and are written down here so nobody has to rediscover
them. They live in one place in the code —
`scripts/curriculum/writing-shelf/build_14_sentence_builder_cards.py` — and sheet
13's builder imports them from there so the two decks can never drift apart.

| Thing | Setting |
|---|---|
| Card size | 80 × 120 mm printed, mounted on coloured card with a 1 cm border → 100 × 140 mm finished (fits his 100 mm card stands) |
| Frame corners | rounded, 5 mm outer radius |
| Frame stroke | 2.6 mm |
| Frame inset | outer edge sits 4 mm inside the cut line, the same on all four sides |
| Inner hairline | 0.4 mm, same colour, 2.2 mm inside the frame |
| Content box | 60 × 100 mm, even on all four sides |
| Typeface | Comic Neue (free, and legally embeddable; adult text in the page margin stays Andika) |
| Letter size | one shared size of 10.90 mm across **both** decks |
| Layout | picture on the front, sentence on the back |
| Printing | double-sided, **flipped on the SHORT edge** |

Tier colours, exact:

* pink `#D45B86`
* blue `#2F5FA6`
* green `#2F7D4F`

Those three are the whole palette. **Sheet 13 uses the same three** — it has no
colour of its own. (It briefly carried a neutral warm charcoal; that was dropped
on 2026-09-13, see section 3.)

**The colour states the difficulty of the WORDS on the card, not the group the
card is filed in.** On both sheets that is the same thing on every card but one.

**The one carried card (2026-09-13).** "a fox in a box" is *pink* work — *fox*
and *box* are three-letter words, and sheet 13 prints that same pair pink. It
sits at the **head of sheet 14's blue group** because the teacher asked for one
already-known card at the start of the harder tray, for familiarity, and that is
the card chosen for it. It therefore **keeps its position in blue and its pink
frame**. A pink card at the front of the blue stack says "you already know this
one"; painting it blue claims a difficulty the words do not have, and it was what
made sheets 13 and 14 print the same two words in two different colours. The
carry is recorded in the DATA — `card(..., carriedFrom: 1)` in
`writing-shelf-language.ts`, which sets `frameTier` and a `carried` flag, mirrored
as a fifth FRAME-tier field in the Python — so a later session can see it is
deliberate. `check()` allows a carry only in its one legitimate shape: an easier
card at the HEAD of a harder group. **Mount by the frame colour: 7 pink, 5 blue,
6 green.**

**One group to a printed sheet, on BOTH decks (2026-09-13).** He prints each
tier onto matching coloured card stock, so a sheet carrying two groups has to be
cut in half and run twice — it is not a printable sheet. Sheet 14's tiers used
to run straight on through (sheet 2 held tier 1's last two and tier 2's first
two); each group now starts a fresh sheet and its last sheet is left short
rather than topped up from the next.

* **Sheet 13** — 4 sheets, 8 pages: **pink** 4 + 4 + 2, **green** 4. Two blank
  slots at the end of the pink group.
* **Sheet 14** — **6** sheets, **12** pages (was 5 and 10): **pink** 4 + 2,
  **blue** 4 + 2, **green** 4 + 2. Two blank slots at the end of each group, six
  in all. Every one of them is deliberate: a group is never padded from the next.

This also puts the carried card where it does most good. "a fox in a box" is now
the **single pink-framed card on the first all-blue sheet**, printed on blue
stock — the clearest possible "you already know this one", and the reverse of
what the old straight-through imposition happened to produce.

**The ground fix (2026-09-13).** "bee on a tree" on sheet 13 is drawn on a
scanned textured sheet whose grain runs 226–245 within the one picture. Sheet 13
used to lift a ground by the **median** of its border, which puts the middle of
that grain at paper white and leaves the dark half of it below, so the card
printed as a soft grey box with a visible edge. It now uses sheet 14's `paper()`,
imported rather than copied: the white point is taken **below** the grain, at the
5th percentile of the border band, floored so art touching the border cannot drag
it down. Two of sheet 13's fourteen are white-pointed (pig-wig, bee-tree) and six
of sheet 14's eighteen; every other picture was already paper and is untouched.
Every processed picture on both decks now measures 255 on all four borders.

Two things worth understanding behind those numbers:

* **The double rule is the whole of the "premium" look.** A thick rounded frame
  with a faint hairline just inside it is the playing-card and certificate cue.
  The earlier version was a single thin square-cornered line, and on the printed
  proof it read as "a line someone drew", not as the edge of a designed card. The
  hairline must stay faint or the card goes muddy.
* **One letter size for the whole deck.** The size used to be worked out card by
  card, so "the cat sat" printed big on one line while "the sun sat" — exactly
  the same length — wrapped to two lines and came out visibly smaller. Now every
  sentence on both sheets is set at the same 10.90 mm; a longer sentence simply
  takes more lines, never smaller type. One card ("the penguin spat") wraps to
  two lines as a result, and that single compromise buys about 30% bigger letters
  on every other card in both decks.
* **Short-edge flip, in plain terms.** When the printer turns the sheet over
  about its short edge, top and bottom swap but left and right do not. The
  builder accounts for this by mirroring the back grid top-to-bottom and drawing
  each back upside-down, so everything lands the right way up once it is printed.
  If the printer is set to long-edge flip instead, the backs will be on the wrong
  cards.

---

## 3. Story Starter cards (sheet 13)

Fourteen cards, same shape, same frame, same printing as sheet 14. Picture on the
front, phrase on the back.

The phrases were **shortened earlier to literal short phrases** — "hen in a pen",
not "The hen is in a pen" — because that is how a young child actually says what
he sees in a picture. All of them start with a lower-case letter for the same
reason. The fourteen are: cat on a mat, pig in a wig, hen in a pen, dog on a log,
fox in a box, bug on a rug, rat in a hat, duck in a truck, nut in a hut, ant on a
pan, frog in a bog, cub in a tub, bee on a tree, sheep asleep.

Framing (revised 2026-09-13): **the frame colour is the reading tier**, the same
pink / blue / green code as sheet 14, decided card by card on the phonetics of
the words printed on the back. The deck used to be framed deck-wide in a neutral
warm charcoal with "hen in a pen" alone in pink; a neutral says nothing a child
or a teacher can act on, so it is gone.

* **pink** `#D45B86` — every content word a pure three-letter CVC, one sound a
  letter. **10 cards:** cat on a mat, pig in a wig, hen in a pen, dog on a log,
  fox in a box, bug on a rug, rat in a hat, nut in a hut, ant on a pan, cub in a
  tub. ("ant" is filed with the three-letter short-vowel words, and so are "fox"
  and "box", the x notwithstanding — the teacher's own calls.)
* **blue** `#2F5FA6` — four letters or more, no consonant blend. **0 cards.**
  Empty by fact, not by omission: every card on this deck that leaves
  three-letter CVC behind leaves it for a blend. The tier is wired all the way
  through the builder anyway, so a future blue card frames, paginates and labels
  itself with no other change.
* **green** `#2F7D4F` — a consonant blend anywhere on the card. **4 cards:**
  frog in a bog (fr), bee on a tree (tr), duck in a truck (tr), sheep asleep (sl,
  over the sh digraph).

The three hexes are imported from sheet 14's code rather than re-typed, so the
two sheets can never end up with slightly different pinks, blues or greens.

**One tier to a printed page, which is why the deck is reordered.** The cards are
grouped pink then green, and a page is filled from one tier only and then left
short rather than topped up from the next. The teacher prints each tier onto
matching coloured card stock, so a page carrying two tiers is a page he cannot
print. Ten pink cards at four a page is three pink sheets of 4 + 4 + 2 — the two
blank slots on the third are correct and must not be padded with a green card —
and the four green cards fill the fourth. Every page header names its tier on
both faces, in sheet 14's wording: `story starter cards · pink · picture side ·
sheet 1 of 4`. Still 4 duplex sheets and 8 pages; the short-edge registration was
re-verified card by card off the rebuilt PDF after the reorder.

---

## 4. The word tin (sheet 12) — REBUILT 14 September 2026

> The paragraph that used to stand here ("53 words on 63 cards, three pages")
> described a tin that no longer exists and had been wrong for two rebuilds.
> What follows is current.

**Four sets, 164 cards, 4 pages single-sided.** Pink **62**, blue **20**, green
**37**, free composition **45** (35 reader words + 10 blank cards). The card is
28 mm tall and as wide as its own word's ink plus a constant 7 mm word space, so
butted cards leave a real space between words; the tier colour is a 0.5 mm
baseline rule under the word, and a tiny grammar symbol sits above it.

### What was wrong, and what the teacher hit in class

The tin was derived from **sheet 14 only**. Sheet 13's fourteen story starters —
`cat on a mat`, `pig in a wig`, `hen in a pen` and the rest — had never been
counted, so **nineteen words had no card in any tin**: mat, pen, dog, log, bug,
rug, rat, hat, nut, hut, pan, cub, bog, bee, tree, duck, truck, sheep, asleep.
Nor was there a capitalised lead card (`Cat`, `Frog`, `Sheep`) for any of them.
A child could take a story starter off the tray and simply not be able to build
it, which is what happened on 14 September.

### The two decisions behind the rebuild (Tredoux, 14 September)

1. **Scope is sheets 13 + 14 — thirty-two sentences.** Sheet 13's fourteen
   (10 pink, 0 blue, 4 green) and sheet 14's eighteen (6 pink, 6 blue, 6 green).
   The builder reads both decks through one function, `sentences()`, and prints
   every word through `build_14.display_words()`, the single display transform,
   so `cat on a mat` asks the tin for `Cat`, `on`, `a`, `mat.` — build_12 never
   types a capital or a full stop of its own. Sheet 13's own cards are unchanged
   and still print lower case, which is right: they are phrases about a picture.
2. **Copies are a SUM, not a maximum.** A tin must lay **all** of its tier's
   sentences out on the mat **at once**, because that is how the work is used.
   So the count of each printed form is the sum over that tier's sentences, not
   the most any single one needs. Pink therefore holds eleven `a` cards, because
   eleven of its sixteen sentences want an `a`.

### Layout and the guard

**One tin to a page**, in tray order — pink page 1, blue page 2, green page 3,
free composition page 4 — and each page header names its tin. That is sheets 13
and 14's rule, for their reason: each tin prints onto its own colour of card
stock, so a page carrying two tins has to be cut in half and run twice. (The
builder's prose had claimed this for a while; the code was not actually doing
it. It is now.)

A new check, `check_buildable()`, re-derives the need from sheets 13 and 14 and
**refuses to build** unless every one of the thirty-two sentences is
simultaneously buildable out of what the sheet prints — and unless no tier tin
prints a card its sentences never ask for. Run it on its own with:

```
python3 scripts/curriculum/writing-shelf/build_12_word_card_tin.py --check
```

It prints the per-tier totals and then a negative control: it takes one card out
of the pink tin and shows the guard refusing.

### Word forms worth knowing about

- Sheet 13's lead words print capitalised and its last words carry the stop:
  `Cat … mat.`, `Frog … bog.`, `Sheep … asleep.`
- **`asleep` is filed as an adjective** (dark blue triangle) — it is what the
  sheep *is*, a predicate adjective, the one word on either deck that describes
  its subject with no verb between them.
- Four words left the free-composition set because sheet 13 now uses them in
  tier tins: **frog, hen, tub, on**. Nothing is printed in two sets.
- The word ledger in the builder grew from 64 words to 83 (nouns 30 → 48,
  adjectives 11 → 12).

### Important: the printed tin and the app's word list are deliberately separate

The app keeps its own internal list of words it considers "taught" — called
`WORD_CLASSES` in `lib/montree/dark-phonics/writing-shelf-language.ts`. That list
has **not** been changed, so the app still reports "sun", "hot" and "digs" as not
yet taught, even though the physical tiles now exist in the tin.

**This is correct behaviour, not a bug.** The printed tin is a physical material
Tredoux controls sheet by sheet; the app's list is the teaching ledger that drives
what the app considers decodable. They are allowed to move at different speeds and
they are meant to. Please do not "fix" this by quietly adding the three words to
`WORD_CLASSES` — that is a teaching decision, not a tidy-up.

The same applies, more strongly, to the green cards: star, penguin, blob, crab,
dad and sand are all outside the ledger **by design**, because a blend is past the
point where the tin stops.

**Re-affirmed 14 September:** none of the nineteen words sheet 13 brought into
the tin was added to `WORD_CLASSES` / `SENTENCE_BANK` either. The printed tin and
the app's ledger stay independent, on purpose. Do not sync them.

---

## 5. What needs printing

Per `public/dark-phonics-shelf/v2/manifest.json`, only three sheets changed and
need reprinting:

| Sheet | What it is | Pages | How |
|---|---|---|---|
| 12 | Word-card tins — 164 cards, 28 mm strips, one tin to a page | 4 | single-sided |
| 13 | Story starter cards ×14 — 80 × 120 mm | 8 | double-sided, short edge (4 sheets) |
| 14 | Illustrated sentence cards ×18 — pink, blue, green | 12 | double-sided, short edge (6 sheets) |

That is **24 pages**. Sheets 01–11 are untouched and do not need reprinting.
Sheet 12 is **4 sheets of card, one per tin** — print each tin onto its own
colour of stock if you have it, laminate, then cut.

Mounting: sheets 13 and 14 are mounted by hand on coloured backing card with a
1 cm border. On sheet 14 the backing card colour matters — **pink card for the
pink cards, blue for blue, green for green** — because on that sheet the colour is
the reading level and it is what sorts the tray after cutting.

Cutting: every sheet follows the "cut once" rule — the cards butt against each
other, each grey line runs the full width or height of the page, and one straight
stroke of the blade separates the cards on both sides of it.

For reference, the whole v2 set is 15 files (14 printables plus an A3 alternative
for the sound-frame mat) totalling 50 printed pages.

---

## 6. Open items and known limitations

1. **Five pictures still leave white above and below.** The four "the-sat" tiles
   (cat, ant, sun, star) and the sand picture are wide, landscape-shaped drawings
   (3:2), while the card's picture area is tall. Even after trimming to the ink,
   a wide drawing that fills the full 60 mm width cannot also fill the 100 mm
   height. The leftover space is plain white on a white card, so it is invisible
   rather than ugly — but those five cards do have a smaller picture than the
   others. Fixing it properly would mean re-drawing those five in a taller shape.
2. **The blob card prints at about 169 dpi rather than 300.** The blob is small
   within its source file, so once it is cropped to its ink and enlarged to fill
   the card there are fewer dots to go round. The builder warns about anything
   under 250 dpi and never invents detail by upscaling. It is acceptable on a
   soft pen-and-ink drawing; if it looks soft on the printed card, the fix is a
   new drawing with the blob larger in the frame.
3. **Story Books sets D and E — an older question, still unanswered.** Sets A, B
   and C (seed→flower, egg→hen, apple→core) had their cream paper-texture
   backgrounds lifted to pure white. Sets D (butterfly) and E (frog) are
   photographs and still carry their own background tone. Nobody has decided
   whether to colour-correct D and E to match the pure white of A/B/C, or to
   leave them as photographs. **Decision needed from Tredoux.**
4. **The summary "stock" block in `manifest.json`** (sheets of paper, printed
   sides, laminated items) was not updated when sheets 13 and 14 grew. The
   per-item page counts in the same file are correct; the summary totals are
   behind. Harmless, but worth correcting next time that file is touched.
5. **`scripts/curriculum/writing-shelf/README.md`** still describes sheet 14's
   older 1.5 mm single rule and 13 mm letter size in one paragraph. The code and
   the manifest are right; that paragraph is stale.

---

## 7. Ideas floated but not committed to

Neither of these has been started. They are recorded so they are not lost.

* **A "blend box" reference.** A small reference the child goes to when he meets a
  blend he does not know — he looks it up himself rather than asking. It would sit
  alongside the green cards.
* **A later freestyle word-building stage.** A step after the tin, where the child
  builds words and sentences of his own choosing instead of copying a card.

---

## 8. Where things live

| What | Where |
|---|---|
| The eighteen cards (the one true list: slug, level, sentence, artwork) | `lib/montree/dark-phonics/writing-shelf-language.ts` → `SENTENCE_BUILDER_CARDS` |
| Sheet 14 builder (and the frame constants both decks share) | `scripts/curriculum/writing-shelf/build_14_sentence_builder_cards.py` |
| Sheet 13 builder | `scripts/curriculum/writing-shelf/build_13_story_starter_cards.py` |
| Sheet 12 builder | `scripts/curriculum/writing-shelf/build_12_word_card_tin.py` |
| The printed PDFs and the manifest | `public/dark-phonics-shelf/v2/` |
| Print rules for the whole shelf | `CLAUDE.md`, "WRITING SHELF PRINT RULES — LOCKED" |

**Rule for anyone editing the cards:** change the TypeScript file first, then the
Python builder. The builder reads the TypeScript file and refuses to build if the
two disagree, which is deliberate — the card list must never exist in two places.

To rebuild the three sheets:

```
python3 scripts/curriculum/writing-shelf/build_12_word_card_tin.py
python3 scripts/curriculum/writing-shelf/build_13_story_starter_cards.py
python3 scripts/curriculum/writing-shelf/build_14_sentence_builder_cards.py
```

They need `reportlab` and `Pillow`, and they are safe to run twice.
