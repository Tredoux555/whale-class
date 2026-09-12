# Dark Phonics fold-book template fix — 2026-09-12

**Problem.** `public/dark-phonics-shelf/v2/07-fold-book-template.pdf` was a one-off
ReportLab PDF with no generator source. It had a full-width cut line that would split
the sheet in two, header/print instructions and a mid-sheet caption landing inside the
child's panels, and amber handwriting mid-lines identical in colour to the cut line —
unusable as a child-facing printable.

**Fix.** New generator: `scripts/curriculum/writing-shelf/build_07_fold_book.py`.
Run with `python3 scripts/curriculum/writing-shelf/build_07_fold_book.py` from repo
root. Output is now 2 pages:
- p1 — clean child sheet: 8 blank panels with writing lines, "MY BOOK" / "a book by"
  cover, amber centre slit across the middle two columns only (not full-width), grey
  dashed fold lines, no page numbers or instructional text.
- p2 — teacher sheet: 6 fold-step diagrams, the page map (p6 p7 p8 p1 upright / p5 p4
  p3 p2 inverted), and print instructions ("print page 1 only for children").

Updated alongside: `manifest.json` (page count 2), `public/dark-phonics-shelf/v2/PRINT-GUIDE.html`,
`dark-phonics-shelves.html`.

**Verification.** Sonnet-audited, committed `624edd61e` on `main`, pushed. Deploy
confirmed live: `curl -sI https://montree.xyz/dark-phonics-shelf/v2/07-fold-book-template.pdf`
→ `200`, `content-length: 4206` (matches the new 2-page build).

**Open items.**
- Other Dark Phonics printables were not audited for the same class of issue (meta/
  instructional text bleeding into child-facing panels) — worth a sweep.
