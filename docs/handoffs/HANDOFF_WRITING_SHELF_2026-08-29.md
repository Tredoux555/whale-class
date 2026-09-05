# The Writing Shelf — printed program + pages, handed forward

**2026-08-29 · Sonnet, writing up this session's work for whoever picks it up
next.** Read this before touching `dark-phonics-shelves.html`,
`dark-phonics-philosophy.html`, or anything under `public/dark-phonics-shelf/`.
This covers the **physical/printed Writing Shelf and its live pages only** —
the Stage 2 strategy artifact and the digitisation work (turning the shelf
into online games / a journey player) are being handled in other sessions and
are out of scope here.

## What the Writing Shelf is

Stage 2 of Dark Phonics: encoding → creative writing, picked up after a child
has gone zero-to-CVC. The philosophy page (`dark-phonics-philosophy.html`,
live at `/dark-phonics-philosophy.html`) is **the brain** for everything else
— it was adopted this session as the source of truth. Its core claims:

- **mouth → table → paper.** A sound is said, then built with concrete
  letters on a table, before it's ever written by hand.
- **Daily 15-minute loop:** sound boxes → word chains → dictation → free
  write. Same order, every day.
- **Invented spelling is celebrated in composition** (Trays 2, 6, 7 — free
  writing, sequences, story dictation) — **and corrected only in dictation**
  (Tray 4). The two are never mixed: a child is never corrected while
  composing.
- **Sentence-first.** The child builds and writes sentences, not isolated
  words, as soon as he can.
- **Story dictation and acting** — Tray 7 — is where a child's own story gets
  written down for him and then physically acted out.

## What's live on montree.xyz

- `/dark-phonics-philosophy.html` — the philosophy/brain page.
- `/dark-phonics-shelves.html` — the 8-tray shelf guide. Each tray has three
  tabs: **Quick** / **Go deeper** / **Explain More**.
- Printables:
  - `/dark-phonics-shelf/` — **v1**, 13 pictogram sheets. Kept, not deleted,
    but no longer linked from anywhere on the shelf page.
  - `/dark-phonics-shelf/v2/` — **v2**, 10 photo-based sheets. Live, and
    **every link on the shelf page now points here**, not to v1.
  - A `PRINT-GUIDE.html` sits in each of the two printable folders.
- Library: an amber **"The Writing Shelf"** card on `/montree/library`,
  placed directly after the Dark Phonics card. Also reachable via the nav
  pills on `/montree/library/dark-phonics`.

## v1 → v2, what actually changed and why (full detail in `print-audit.html`)

v2 is a straight redesign, not new content: 13 printables → 10, 24 sheets of
paper → 16, 37 printed sides → 22, 12 risky duplex jobs → 2. The two
remaining duplex jobs (chain cards, dictation cards) are the same imposition
run together. Every version-2 sheet moved all adult-facing text — tray names,
instructions, size notes — **outside the trim rectangle**, onto the paper
that gets thrown away; the chain-card and dictation-card sheets tile an A4
into four A6 cards with zero waste and so carry no printed mark at all.

> **2026-09-05 — amended.** "No printed mark at all" turned out to be a
> problem, not a feature: it left a duplex job to be cut by eye. Those two
> sheets (and 06, whose pages 2 and 3 had been left unmarked) now carry cut
> guides. On the tiling sheets the marks are confined to the four page-edge
> midpoints and the page centre — the only positions that land in the same
> physical place on both faces under either duplex flip. The blade splits
> each mark, so ~0.13 mm of hairline survives onto a card. The short-edge
> instruction was re-verified against the actual PDFs and is correct. See
> `HANDOFF_SHELF_PRINT_FIX_2026-09-05.md`.
Pictograms were replaced with real photographs everywhere a photograph makes
sense (see "what's still not a photograph" below for where they deliberately
weren't). Full sheet-by-sheet rationale, including which v1 sheet became
which v2 sheet and why words like `cup`/`sun`/`net` were dropped from the
dictation set, is in `print-v2/PRINT-GUIDE.md` (and its rendered
`PRINT-GUIDE.html`) — read that before changing any v2 sheet.

**Chains (locked):** tap→cap→can→pan→pen · mop→hop→hot→hut→hug ·
peg→beg→bed→bad→bag · bin→big→bug→dug→mug · nut→cut→cup→cap→cat ·
rat→bat→bag→big→dig. One letter changes per step; every chain is buildable
from the Tray 3 letter tin `a b c d e g h i m n o p r t u` (doubles — 15
letters, 30 tiles).

**Dictation words (12, photos done):** cat, pig, hat, mug, bed, dog, pen,
bag, log, rug, cot, jam.

## Photos: where they live and how to add more

- **Live Picture Bank:** 22 photos uploaded, searchable by `writing-shelf`.
- **Uploader:** `scripts/curriculum/upload-writing-shelf-photos.mjs`. Runs on
  the Mac: `node --env-file=.env.local scripts/curriculum/upload-writing-shelf-photos.mjs`.
  Idempotent — safe to re-run. **Always `DRY_RUN=1` first.**
- **Repo-side source of truth for the images themselves:**
  `phonics-images/satpin-v2/cvc-photos/` (17 objects) and
  `phonics-images/satpin-v2/sequences/` (5 frames). Both are **gitignored**
  and live only on the Mac — they are not in the repo history and not part
  of any deploy.
- **pink1/pink2 stock-photo folders were rejected** — not the house style,
  and one image (`bed.jpg` in `pink1`) was flagged as inappropriate; Tredoux
  was told to delete it. `satpin-v2/cvc-photos` is the correct style and the
  only one to draw from or add to.

## Outstanding: 9 images still to generate

18 new images were needed for v2 (6 chain-card fronts + 12 sequence frames).
9 have landed (`mop`, `peg`, `bin`, `nut`, `rat`, and the complete sunflower
set `seq-A-1…4`). **9 are still outstanding**, all Midjourney, prompts in
`print-v2/MJ-PROMPTS-V2.md`:

| Needed | Holding up |
|---|---|
| `tap.png` | Chain card 1 ships with the word **tap** set large in the picture well as a text stand-in — this is temporary. Reprint sheet 1 of 2 alone once the photo lands. |
| `seq-B-2` `seq-B-3` `seq-B-4` | Egg→hen set. `seq-B-1` alone can't ship — a sequence set must be uniform, all-drawn or all-photo. |
| `seq-C-1` `seq-C-2` `seq-C-3` `seq-C-4` | Apple→core set. Currently fully drawn, not photographic. |

The MJ prompt pack is exact and locked (house string, `--ar 1:1`, disambiguator
call-outs per word) — don't freelance new prompts, use the ones in
`MJ-PROMPTS-V2.md` verbatim.

## How to work on this

1. Generate/collect the 9 outstanding images on the Mac, name them exactly
   as listed above, drop into `phonics-images/satpin-v2/cvc-photos/` (`tap.png`)
   or `.../sequences/` (`seq-B-*`, `seq-C-*`).
2. `DRY_RUN=1 node --env-file=.env.local scripts/curriculum/upload-writing-shelf-photos.mjs`,
   check the plan, then run for real.
3. Rebuild the two affected v2 sheets — chain cards (`02-chain-cards.pdf`,
   sheet 1 of 2 only, once `tap` lands) and picture sequences
   (`06-picture-sequences.pdf`, once B and C are complete) — from
   `print-v2/src/`, per `print-v2/manifest.json`.
4. Recommit the rebuilt PDFs in `print-v2/` and re-verify against
   `print-v2/PRINT-GUIDE.md`'s per-sheet spec before treating them as final.

## Key commits (chronological, on `main`)

- `c83b7b474` — pages + nav
- `2952d3eaa` — Go deeper tabs
- `4155f4f46` — v1 PDFs + 3-tab layout + print pills
- `bd7e40587` — glow removed
- `4fd2c0d49` — photo uploader
- `a7b1dc263` — v2 live
- `532903d21` — library card

## Claude artifacts (private working copies, for reference)

Philosophy `c58dcf52-…` · shelf guide `7bffe857-…` · v1→v2 audit `5efd9d20-…`
· Stage 2 strategy (separate track) `92e3604a-…` — all under
`https://claude.ai/code/artifact/<id>`.

## What's deliberately still not a photograph (don't "fix" these)

Per `MJ-PROMPTS-V2.md`: the sound-frame mat's four empty frames, the amber
heart-word symbol, the punctuation dot/`?`/`!`, ruled writing guides and fold
marks, and the grammar pack's triangle/circle tokens. Each is a symbol or a
well, not a picture of a thing — turning any of them into a photograph would
break the material. Once the 9 outstanding images land, no pictogram remains
anywhere in the set; nothing else should ever become one.

## The next session should:

- Grab the remaining 9 MJ images from Downloads on the Mac and drop them
  into `phonics-images/satpin-v2/cvc-photos/` and `.../sequences/`.
- Rebuild and recommit the two affected v2 sheets — chain cards and picture
  sequences — once their images are in place.
- Re-run `scripts/curriculum/upload-writing-shelf-photos.mjs` (dry run
  first) to sync the new photos to the live Picture Bank.
- Consider porting `dark-phonics-shelves.html` to a native app route, for
  i18n and auth — it's currently a static page outside that system.
