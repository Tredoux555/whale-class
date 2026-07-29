# SATPIN paperwork — next letter in five steps

1. Copy `letters/i.json` to `letters/<slug>.json`; set letter/week/bookTitle/`bookScript`
   (the reader's own build script — sentences and art are read from it, never retyped)
   and `artDir` (repo-relative).
2. Fill `pages[]` in **story order** (word, lowercase sentence, art filename under `artDir`).
   Pick `sequencingDisplayOrder` + `matchDisplayOrder` — two different fixed *derangements*,
   so rebuilds are deterministic and no row answers itself.
3. Write the 10 `yesno` items: 5 true from the book (`imageArt`), 5 false from earlier weeks'
   vocabulary (`imageWord` → `docs/picture-bank/photos/<w>/<w>.jpg`). Optional
   `workbook.coverArt` overrides the workbook cover picture.
4. `python3 build_paperwork.py --letter <slug>` and `python3 build_tracing.py --letter <slug>`.
5. Outputs land in `public/satpin-materials/<slug>/`: `paperwork-pack.pdf` (A4 portrait, 4 pp),
   `tracing-workbook.pdf` (A4 landscape, cover + one page per spread) and
   `sentence-strips.pdf` (cut-out word cards, sized to the workbook's velcro slots).

`--repo-root` and `--out` override the defaults; fonts come from `MONTREE_CANVAS_FONTS`
(default: the canvas-design skill folder, same as `flashcards/build_booklets.py`).
The manuscript letterforms, stroke order and arrows live in `stroke_font.py` — edit a glyph
there and every model sentence, word card and tracing line follows.
