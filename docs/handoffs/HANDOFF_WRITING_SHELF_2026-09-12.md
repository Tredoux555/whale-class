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
* sheet 13's neutral warm charcoal `#5A5248`

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

Framing: the whole deck is framed in the **warm charcoal** `#5A5248` — a
deliberate neutral, *not* a fourth reading level — except **"hen in a pen", which
is framed in the pink** `#D45B86`. That one pink card is a level marker so the
teacher can find it in the tray by eye. The pink is imported from sheet 14's code
rather than re-typed, so the two sheets can never end up with slightly different
pinks.

---

## 4. The word tin (sheet 12)

The printed tin now holds **53 words on 63 cards** (10 blanks), three pages. Three
words were added this session — **"sun", "hot" and "digs"** — because sheet 14's
pink and blue sentences need them and the tin did not have them.

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

---

## 5. What needs printing

Per `public/dark-phonics-shelf/v2/manifest.json`, only three sheets changed and
need reprinting:

| Sheet | What it is | Pages | How |
|---|---|---|---|
| 12 | Word-card tin — 53 words, 60 × 35 mm | 3 | single-sided |
| 13 | Story starter cards ×14 — 80 × 120 mm | 8 | double-sided, short edge (4 sheets) |
| 14 | Illustrated sentence cards ×18 — pink, blue, green | 10 | double-sided, short edge (5 sheets) |

That is **21 pages**. Sheets 01–11 are untouched and do not need reprinting.

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
