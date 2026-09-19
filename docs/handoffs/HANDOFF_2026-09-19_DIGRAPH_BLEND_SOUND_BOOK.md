# Handoff — Dark Phonics Writing Shelf, sheets 25 / 26 / 27

2026-09-19. Three Tray 5 printables: digraph work, blend work, sound book.
SHELF PRINT VERSION is now **15** (`public/dark-phonics-shelves.html`, and every
`/dark-phonics-shelf/v2/` href on it carries `?v=15`).

Built four times today. v12 was the first build; v13 took in the first batch of
Midjourney art, the owner's relaxed art rule and the live picture library; v14
took in a second batch of twelve blend photographs; **v15 fixed the two
defects Tredoux found on the printed mats — see "TWO RULES" below, which are
the most important paragraphs in this file.**

## TWO RULES, FOUND ON THE PRINTED PROOF, NEVER TO REGRESS

1. **THE RULE IS UNBROKEN.** One continuous tier-colour rule runs from the
   start tick to the end of the row — sheet 18's line exactly. It is NEVER
   segmented at a gap. The tab is laid ON the rule, not into a hole cut in it:
   a line that stops and starts reads as a row of slots and the child loses the
   word. The only thing ever cut out of it is a descender, by sheet 16's
   knockout (`knock_gaps()` + `M16.rule_segments()`).
2. **THE WORD IS ONE WORD.** The letters are typeset as ONE normally kerned
   word at the writing size. The first build laid every fragment and every tab
   as separate word cards with the 7 mm word space G between them, and the mats
   printed `st i ck` and `sp oo n` — the word read sectioned. Now the tab
   replaces the digraph's glyphs IN PLACE: `tab_w()` is the digraph's INK plus
   `TAB_CLEAR` = 1.5 mm of paper each side (**not** + G), and the letters beside
   it shift outward by exactly the tab's surplus over their ink and not a
   millimetre more. Lay the tab and the row reads `stick`.
   **The CONTROL takes no insertion at all** — it prints the plain word,
   normally spaced, with the studied sound in the tier colour: `stick`, never
   `st i ck`.

`lay_out()` is the one place that positions anything; `draw_cell()` carries
both rules in its docstring.

## What is on the shelf now (v15)

| file | pages | bytes |
|---|---|---|
| `25-digraph-mats.pdf` | 5 | 2 501 668 |
| `25-digraph-mats-control.pdf` | 5 | 2 502 942 |
| `25-digraph-tabs.pdf` | 5 | 36 370 (104 green tabs) |
| `26-blend-mats.pdf` | 5 | 2 679 152 |
| `26-blend-mats-control.pdf` | 5 | 2 680 610 |
| `26-blend-tabs.pdf` | 5 | 35 510 (82 blue tabs) |
| `27-sound-book-print.pdf` | 24 | 4 794 859 (48 A5 pages, 12 sheets) |
| `27-sound-book-reading.pdf` | 48 | 4 812 651 (proofing only, in no count) |

Cells filled, out of eighteen:

| sheet 25, digraphs | | sheet 26, blends | |
|---|---|---|---|
| 1 · sh ch th ee | **18** | 1 · st sp sn sm | **18** |
| 2 · wh ck ng ea | **18** | 2 · sl sw sk sc | 12 |
| 3 · oo · ow | 14 | 3 · bl cl fl gl pl | 16 |
| 4 · oi oy · ir ur er · igh | 13 | 4 · br cr dr fr gr tr pr | **18** |
| 5 · ie · ue ew · oe | 8 | 5 · nd nt mp lk st ft lt | **18** |

Sheet 27 runs 43 sound pages, up to five pictures each.

## THE ART RULE CHANGED (Tredoux, 2026-09-19) — this supersedes the first build

The old gate was purist: one photographed object on a plain white ground, and
nothing else. **It is gone.** The rule is now one sentence:

> **A picture is usable if a three-year-old would name it with the word.**

Real photographs, scenes, illustrations, and the curriculum and circle-time
cards the children already know from the songs all pass — the circle-time cards
are *preferred*, because the child meets the same picture twice. People in the
frame are fine. What is still refused is the picture that is not unmistakable:
a crocodile for `snap`, a ribbon for `silk`, a pencil tip for `point`, a slate
of sums for `math`, a green pepper for `green`.

**Colour and adjective words are off every mat.** `white`, `green`, `blue`,
`black`, `fresh` and their kind are struck from the pools before the art gate
sees them (`DROP_WORDS` in the builder) and are NOT reported as missing
artwork, because no artwork would fix them.

## Three trees feed a mat now

`art_for()` in `build_25_digraph_work.py` resolves, in order:

1. `docs/picture-bank/photos/<word>/` — the shelf's own library on disk.
2. `docs/picture-bank/live-bank-art.json` — a `word -> public_url` map into the
   LIVE picture library at montree.xyz. **Every entry was looked at by eye**
   before it was written down. The file is downloaded once into
   `scripts/curriculum/writing-shelf/.build/live-bank-art/` and the built PDF
   carries the pixels, so the printable never needs the network at print time.
   The cache is a build artefact; the JSON map is the committed thing.
3. `phonics-images/`, for the two words sheet 23 vetted there (`clip`, `light`).

Sheet 23's `object_crop` reads a plain border ring, and a full-bleed photograph
has none: on `teeth` it proposed a 153 px sliver of a 1024 px frame and the tile
fell to 191 dpi. `prepare()` now falls back to the whole frame whenever the
proposed crop is less than a quarter of it.

## The 2026-09-19 pickup

Twenty-two Midjourney winners were identified by eye out of `~/Downloads`,
converted to JPEG q90 and filed at `docs/picture-bank/photos/<word>/<word>.jpg`:

> back · bath · bench · branch · chest · chew · chin · feet · field · foot ·
> hoe · hook · neck · pea · shrimp · stitch · teeth · three · thrush · toe ·
> trash · wheat

All twenty-two were ingested into the live picture library by
`scripts/curriculum/upload-digraph-work-photos.mjs` (storage
`photo-bank/digraph-work/<word>.jpg`, `category='picture-bank'`,
`tags=[<word>,'picture-bank','digraph-work']`) — the same shape as
`upload-writing-shelf-photos.mjs`, run on the Mac with `--env-file=.env.local`.

Rejected from the same batch, and why: `thumb` (a wooden artist's hand — the
live bank's real thumbs-up is better), `back` (a wooden chair — superseded by
the photograph of a child's back), `kick` (a football on its own — the live
bank's `kicking` shows the kick), `green` (a pepper) and `white` (a feather),
both struck as colour words.

Fifty-four more words take their art from the live library — see
`live-bank-art.json`. Seventeen live candidates were looked at and turned away:
band, bread, cry, eat, frame, fruit, glass, grass, grin, joy, math, point,
silk, snap, stop, thank, wish.

## The second pickup (v14)

Twelve more Midjourney winners, identified by eye, filed at
`docs/picture-bank/photos/<word>/<word>.jpg` and ingested with
`tags=[<word>,'picture-bank','blend-work']`:

> balance · glass · skate · skirt · slide · smoke · snap · spade · spot ·
> step · stick · stop

Two things to know about this batch:

* **`balance` is filed but is on no mat.** It was asked for on the `bl` mat,
  and `b-a-l-a-n-c-e` carries no `bl` — it can leave no gap, and `check()`
  refuses a word with no gap at all. The photograph is in the bank and in the
  live library, ready for whatever it is really for.
* **`scooter` never arrived.** It is the right word for the `sc` column and it
  would leave BOTH gaps (`sc` from this tin, `oo` from the green tin), so it is
  named in a comment beside the `sc` pool. `scale` was struck from that pool on
  the owner's instruction.
* **`prepare()` caches a cropped tile per word and only re-cuts with
  `--force`.** Four words (step, stop, snap, spot) had stale tiles from the v12
  run and the first v14 build printed the OLD pictures. **Always rebuild with
  `--force` after new art lands.**

## The rules that still matter

* **The gap is `build_12.card_w()`**, called and never copied — at THIS sheet's
  own space, `g=2 * TAB_CLEAR`. A tab cut off the tab sheet fills the hole on
  the mat because both numbers come out of one function at one argument, and
  that fit is the control of error.
* **Mats and controls are never cut and never laminated.** No cut line is drawn
  on either file. Only the tab sheets carry `cutmarks.py`.
* **Nothing is invented.** A thin group is a SHORT page with empty trailing
  cells — no picture, no rule, no tick. Cells fill column by column.
* **Green tabs serve both sheets.** A blend word carrying a digraph leaves both
  gaps; the green tab is counted into `25-digraph-tabs.pdf` and the blend mats'
  caption says where it comes from. `26-blend-tabs.pdf` prints blue only.
* **Sheet 27 imports sheet 15's page machinery** — the same rule, tab, folio,
  logical page and saddle imposition. Its fore edge is halved (green digraphs
  top, blue blends bottom), not divided in three.
* **Long and short `oo` are one sound on paper.** One tab either way.

## Open items — THE ARTWORK COMMISSION

Run either builder to print the current list. **Blend words still missing art**
(Tredoux rolls these next):

> stem · stub · stud · snag · slab · scab · blob · clam · globe · glob ·
> glen · plug · bread · brim · cry · crib · crop · drop · frame · fruit ·
> grass · grin · grid · grip · trim · trot · trap · tram · prize · prop ·
> sand · band · point · camp · silk · list · raft · melt · scooter

Digraph words still missing art:

> shut · wish · think · thank · math · week · eat · bread · room · show ·
> how · now · joy · point · her · fight · right · sight · fried · foe · doe

Sheet 25 group 5 (`ie · ue ew · oe`) is still the thinnest page at 8 of 18, and
`sc`, `bl`, `fr`, `gr` and `pr` are the thinnest blend columns — one word each.

Other open items:

* Two sound-book pages print `st` (initial `st`, final `st`). Left as is: they
  are genuinely different work. Decide whether the page should say which.
* `update_shelf_index.py` does not touch `dark-phonics-shelves.html`; that
  page's `?v=` bump and its three prose tables are still by hand (they were
  updated by hand for v13: tab counts, the sound book's page count, and the art
  rule sentence).

## The v15 copy on the Desktop

The six changed PDFs are also copied to
`/Users/tredouxwillemse/Desktop/digraphs and blends/`, same filenames, for
printing without the browser.
