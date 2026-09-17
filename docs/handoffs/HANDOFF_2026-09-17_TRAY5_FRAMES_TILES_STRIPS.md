# Handoff — Tray 5: sentence frames get a subject, the tile box follows the tin, the sentence strips (2026-09-17)

Three commits shipped this session: `4229aecea`, `7046741d4`, `e02335378`. All live on montree.xyz.

## What shipped

### A. Sheets 21 (T) and 22 (U) — the sentence frame gets a subject — commit `4229aecea`
Sheet 20 gives the child a row of grammar symbols over an empty line and nothing
to say with it. `build_21_frames_picture.py` is one builder that makes two
sheets from one geometry: sheet 20's frame with a 44 mm square at the left of
every row, where the picture sits on the mats.

- **21 — draw.** A SOLID 44 mm square. He draws his own subject, then builds
  the sentence he's drawn. Plain paper.
- **22 — tile.** The same sheet to the millimetre with the square DASHED, in
  sheet 17's own placeholder language (0.35 alpha, 1.2/1.2 mm dash). A 44 mm
  picture tile off sheet 23 lands on it. 250 gsm, laminated.

Row grew 43 → 46.3333 mm to stand the 44 mm square (sheet 19's portrait row,
arrived at from the other end); six rows still fill a page, 3 pages each. Line
is 146.0 mm — sheet 20's slot widths are imported and scaled by 146/194 only,
so level 3 still spans the measure exactly. No word is printed on either sheet
— `verify()` extracts the text layer and refuses the build unless only the
adult caption comes out. `same_but_the_square()` reads all 114 fills of all 3
pages of both finished PDFs back and refuses the build if the two sheets
disagree anywhere but the square.

### B. Sheet 23 (V) — the picture tile box grows with the tin — commits `4229aecea` (first cut, 22 tiles) then `7046741d4` (tile box follows the tin, 22 → 40)
40 picture tiles, 44 mm, one object a tile, NO WORD printed — a printed word
would hand him the noun card he's meant to go find. 2 pages (24 full + 16,
whole rows, no blank cell — `check()` now refuses any tile count that leaves a
hole in a row).

The gate is the tin (`build_12`'s noun list, not a second copy of it): when the
tin grew from 30 to 48 nouns on 2026-09-14, this sheet grew with it, 22 → 40.
37 tiles come from `docs/picture-bank/photos` (one object on a plain ground);
`cot` and `rug` come from `phonics-images/satpin-v2/cvc-photos`, keeping the
same house rule; `blob` comes from `phonics-images/satpin-v2/blends` because
there is no photograph of a blob in the world. All three (`cot.png`, `rug.png`,
`blob.png`) are force-added to git so the sheet rebuilds on a fresh clone.

The eight still absent are two problems, not one list, in `HELD_BACK`:
- **No artwork anywhere, needs drawing:** `cats`, `moths`.
- **Artwork exists, held back on style:** `bog` (a snowy forest path), `cub`
  (a bear in a field), `dad` (a lifestyle photo of a man and a baby), `hill`
  and `sand` (landscapes), `tip` (a macro of a pen nib, too abstract to name;
  a second `tip` carries a stock-library watermark).

`check()` asserts `HELD_BACK` is exactly the tin's nouns minus the tiles, so it
can't go stale when a tile is added. Owner's ruling, carried forward: house-
style match beats availability.

The crop threshold is no longer a constant — it's read off each picture's own
border ring (99.5th-percentile wander + a margin), then checked comparatively
against a conservative crop, because a fixed floor ran through the blob's
grainy source and printed it at a fifth of size. `PAD_FRAC` is 0.12 (raised
from 0.04), at which none of the 40 falls back. The picture bank's live
`star.jpg` is a starfruit — right shape, wrong thing — so the sheet uses
`star.replaced-*.jpg` instead, named in `SOURCE` by exception.

### C. Sheet 24 (W) — the sentence strips — commit `e02335378`
The owner's classroom finding: the child needs a whole sentence strip to match
BEFORE building it from the tin, word under word directly beneath — not just a
sentence spoken to him.

A strip is the row of word cards FUSED INTO ONE PIECE: 28 mm tall
(`build_12.CARD_H`), width = the sum of that sentence's `build_12` card
widths, every word set at the x its own card's ink lands on
(`build_16.card_run()`, imported, not re-derived). The tier colour is the
baseline rule under the words, same as a card. Words are BLACK — the cards'
own ink, not sheets 18/19's guide-word charcoal, because a guide word is a
ghost he covers and a strip is never covered.

32 strips — sheet 13's 14 story starters + sheet 14's 18 sentence cards (16
pink, 6 blue, 10 green), both decks through `build_14.display_words()`, the
one display transform; no sentence is typed in the builder. Strips pack two
across in tray order (pink then blue then green), zero gutter, the row filled
before the next starts — the first cut wasted the right half of every page at
one strip per row; packing across took the pink tier from 2 sheets to 1 and
the whole run from 4 to 2. Ticks (sheet 12's 2 mm hairline) sit at strips'
right ends. 18 rows, 2 pages, 33,142 bytes. Laminated.

Tray 5's routine on the shelf page now: card → find strip, lay on mat line →
build underneath → read back → book.

### Totals after all three commits
23 printables, 66 sheets of paper, 89 printed sides, 16 laminated items.
SHELF PRINT VERSION 8 → 9 → 10 → 11. Sheets 01–20 untouched throughout; 21 and
22 rebuild byte-identical against the larger tin.

## Review canvases from this work
- Sheets 21–23 review: https://claude.ai/code/artifact/9d516201-408f-46d1-884c-5f9eafbebdbe
- Sentence strips: https://claude.ai/artifact/2mzucTVzyLsaz4pz6VX3zr

## How to regenerate

```
python3 scripts/curriculum/writing-shelf/build_21_frames_picture.py [--draw | --tile]
python3 scripts/curriculum/writing-shelf/build_23_picture_tiles.py
python3 scripts/curriculum/writing-shelf/build_24_sentence_strips.py [--example]
```

## Next session starts here

- **Live domain is montree.xyz** (Railway happy-flow / whale-class) — NOT
  whaleclass.com. Don't confuse the two when checking a deploy.
- Manifest's "Sheets of paper" recomputes to one more than declared — a
  pre-existing off-by-one, not caused by this session, still open.
- Three untracked strays sitting in `public/dark-phonics-shelf/v2/`, left
  uncommitted, not part of Tray 5: `18-sentence-mats-1.pdf`,
  `19-sentence-mats-portrait-1.pdf`, `mats/preview-green-1.png`. Safe to
  commit, regenerate or discard — just decide, don't leave them drifting.
- On the uncut strip sheet, two packed strips on one row read as one long
  line until it's actually cut — expected, not a bug, but worth a word to
  whoever prints it cold.
- `cats` and `moths` still need art. The owner does MidJourney generation
  himself — never hand this to an agent.
- Whatever Tredoux directs next; this session's three commits close out the
  frames/tiles/strips arc of Tray 5 cleanly.
