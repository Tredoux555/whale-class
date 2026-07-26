# make-material.mjs

Ad-hoc printable Montessori materials from a letter, a phonics pattern, or a word
list. Same render engine as the Curriculum Studio and `build-week.mjs`; the only
new thing is the door in.

    node scripts/curriculum/make-material.mjs --letter s
    node scripts/curriculum/make-material.mjs --letter sh --materials three_part_cards
    node scripts/curriculum/make-material.mjs --words cat,hat,mat --label "Short a"
    node scripts/curriculum/make-material.mjs --list
    node scripts/curriculum/make-material.mjs --help

Output (HTML + PDF + `_summary.json`) lands in `~/Desktop/Montree Materials/<slug>/`,
or `materials-out/<slug>/` inside the repo if the Desktop is not writable.

## How it differs from build-week.mjs

|                | build-week.mjs                        | make-material.mjs                      |
| -------------- | ------------------------------------- | -------------------------------------- |
| input          | `--week N` only                       | letter, pattern, week, or word list     |
| pictures       | a folder you populate by hand         | `phonics-images/` indexed automatically |
| engine loading | esbuild on every run                  | bundled once to `dist/`, reused         |
| portability    | Mac only (native esbuild, local paths) | anywhere (`--inline-images`)            |

`build-week.mjs` is untouched and still the right tool for producing a full
authored week pack against curated art.

## Pictures are locked

`materials.config.json` pins the picture source to the curated Montessori masters
under `~/Desktop/English Curriculum 2026`. `phonics-images/` is a different,
mixed-quality bank and is only reachable via `--image-source phonics`. Missing
masters folder = loud failure, never a quiet downgrade. See `lib/masters.mjs`.

## Files

    make-material.mjs              the CLI
    lib/image-manifest.mjs         phonics-images/ -> word index (3 naming dialects)
    lib/image-manifest.test.mjs    rule tests over real filenames — run it directly
    lib/word-source.mjs            letter -> authored week spec, or a synthesised one
    lib/engine.mjs                 bundle/load render/index.ts, platform-independent
    lib/masters.mjs                the curated masters — THE picture source
    materials.config.json          the locked picture-source decision
    lib/chrome.mjs                 find Chrome, print, refuse to report a 0-byte PDF
    dist/render-engine.mjs         generated on first run; rebuilt when sources change

## Notes

- `phonics-images/` uses three naming conventions and the engine keys images off
  the filename, so `lib/image-manifest.mjs` derives the real word and hands the
  engine a synthetic `<word>.<ext>`. Without it `ck-sock.jpg` indexes as the word
  "ck sock" and `b-banana.jpg` as "b banana".
- Book spreads, wall posters, letter art and song cards are deliberately excluded
  from the word index — they are not single-subject vocabulary pictures.
- `--inline-images` embeds pictures *and* the Andika TTFs, so the HTML prints
  correctly on a machine that has neither.
