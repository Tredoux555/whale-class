---
name: montessori-materials
description: Generate printable Montessori materials (three-part cards, sentence strips, matching sheets, bingo, tracing worksheets, flashcards, readers) as A4 PDFs from a letter, a phonics pattern, or a word list. Use whenever asked to make, print, or build materials, cards, strips, worksheets or a pack for a letter/sound — e.g. "make me 3-part cards for the letter s", "sentence strips for sh", "a matching sheet for cat, hat, mat".
---

# Montessori materials → PDF

One command builds any of thirteen printable materials and prints them to A4 PDFs.
It drives the repo's existing render engine (`lib/montree/english-curriculum/render/`),
so a card printed here is identical to the same card printed from the Curriculum
Studio.

## 🚨 Pictures — a locked decision

Printed materials use the **curated Montessori masters and nothing else**:

    ~/Desktop/English Curriculum 2026/Week NN/images/<word>.png
    ~/Desktop/English Curriculum 2026/_all_images_flat/<word>.png

1,141 pictures across 58 weeks plus a 1,007-file flat library. 1344×896, single
subject, centred, spotlit on a deep forest-green backdrop, one house style. Same
art `publish-images.mjs` uploads, so print and the web Studio agree.

Recorded in `scripts/curriculum/materials.config.json`. Do not change it, and do
not substitute another bank when a picture is missing.

The repo's `phonics-images/` bank is **not** this set — it is stock photos plus
illustrated alphabet plates plus Dark Phonics cast art, and building from it
produced a letter-s pack with a computer mouse for "mouse", a forest path for
"sun", and cartoons mixed in with photographs. It sits behind an explicit
`--image-source phonics` and is never a fallback. If the masters folder cannot be
found the command fails loudly — that is deliberate.

## The command

```bash
node scripts/curriculum/make-material.mjs --letter s
```

That is the whole happy path. It writes HTML **and** PDFs to
`~/Desktop/Montree Materials/letter-s/` and prints where they landed.

### Choosing what to build

| Ask | Command |
| --- | --- |
| everything for a letter | `--letter s` |
| just three-part cards | `--letter s --materials three_part_cards` |
| a couple of materials | `--letter s --materials three_part_cards,sentence_strips` |
| all thirteen | `--letter s --materials all` |
| a digraph or pattern | `--letter sh` · `--letter a_e` · `--letter ai` |
| an authored week | `--week 5` |
| an arbitrary word list | `--words cat,hat,mat,sat --label "Short a"` |
| somewhere specific | `--out "~/Desktop/Tuesday"` |

Default materials when none are named: `three_part_cards, sentence_strips,
matching, bingo, tracing`.

Material names accept the obvious synonyms — `3-part cards`, `nomenclature`,
`strips`, `match`, `trace`, `worksheet`, `colouring` all resolve. Full list:
`three_part_cards, flashcards, sentence_strips, matching, bingo, tracing,
coloring, dictionary_journal, book, vowel_wall, qr_cards`.

## Where the words come from — this matters

**A letter an authored week already teaches uses that week's spec unchanged.**
`--letter s` finds week 5 and prints *snake, sun, sock, star, soap, seal, saw,
sandwich* — the authored, decodability-validated list, not a guess. Do not
substitute your own words for a letter that has a week. Run `--list` to see every
letter/week available and how many pictures each already has.

Words are synthesised only when there is no authored week for the letter, or when
`--words` / `--auto-words` is asked for explicitly.

## Missing pictures

The masters cover the authored weeks, so gaps are rare. When one does appear the
word still prints — as the engine's placeholder tile — and is listed after the
run. Never fill a gap from another bank. Either add the picture to the week's
masters folder, or pass `--assets <folder>` for a one-off. `_summary.json` carries
the authored Midjourney prompt for anything missing.

Report gaps plainly rather than silently shipping placeholder cards.

## Useful flags

- `--gap-only` — report missing pictures, render nothing
- `--html-only` — skip the PDF step
- `--portable-dir` — copy pictures + fonts to `<out>/assets/` with relative
  paths, converting the master PNGs to JPEG q92. Use this, not `--inline-images`:
  the masters are 1.5MB PNGs and bingo references them ~120 times, so base64
  produced a 232MB document. With this a letter's pack is ~7MB.
- `--inline-images` — base64 everything into one file. Only sane for small pictures.
- `--image-source phonics` — deliberately use the rejected mixed bank
- `--card-size 6` — override the 7.5cm card edge
- `--json` — machine-readable summary on stdout
- `--rebuild` — force a render-engine rebuild
- `--list` — every letter/week, with picture coverage

## How it works, briefly

`make-material.mjs` resolves words → builds an AssetMap from the curated masters →
calls the shared `buildMaterial()` → prints each HTML with headless Chrome.

- `lib/masters.mjs` — THE picture source. Finds the masters folder (env
  `MONTREE_MASTERS`, the config path, or the Cowork mount), then reads this week's
  `Week NN/images/` over `_all_images_flat/` so the week's own art wins. Filenames
  already match the engine's convention, so nothing is derived or guessed.
- `lib/image-manifest.mjs` — only for the rejected `phonics-images/` bank, which
  uses three naming dialects (`sun.jpg`, `ck-sock.jpg`, `cast-ant.png`). Reachable
  via `--image-source phonics`; `lib/image-manifest.test.mjs` covers the rules.
- `lib/engine.mjs` — bundles `render/index.ts` once to
  `scripts/curriculum/dist/render-engine.mjs` and reuses it until a render source
  changes. The first run builds it (a few seconds); later runs are instant.

## Troubleshooting

**"No Chrome found"** — set `CHROME_BIN=/path/to/chrome`, or use `--html-only`
and print the HTML from a browser.

**"Cannot find the curated Montessori masters"** — the masters folder is not
reachable. Set `MONTREE_MASTERS=/path/to/English Curriculum 2026`. Do NOT switch
to `--image-source phonics` to get past it.

**Cards show placeholders where photos should be** — that word has no master.
Add it to the week's `images/` folder, or `--assets <folder>` for a one-off. Never
fill from another bank.

**A change to a builder isn't showing up** — `--rebuild`.
