# Dark Phonics — build-it-sheet.pdf word-card centering & spacing fix — HANDOFF (2026-08-22)

Status when this was written: **all 30 books/readers' `build-it-sheet.pdf` rebuilt,
republished, deployed, and verified live.** This is a companion to
`HANDOFF_2026-08-22.md` (the materials-rebuild handoff written earlier the same
day) — that doc covers the broader 30-book Printables-row project; this one is
the definitive record of everything that happened to `build_tracing.py`'s
word-card grid and BUILD IT slots specifically, across several correction
rounds in one long session. Read this before touching `strips_draw()`,
`build_row()`, `grid_metrics()`, `card_metrics()`, or `column_widths()` in
`scripts/curriculum/satpin-paperwork/build_tracing.py` again.

Live site: montree.xyz/montree/library/dark-phonics
Repo: montree (Railway project "happy-flow", service "whale-class")
Final commit this session: `5ffc0676d` ("Dark Phonics: restore natural word
spacing between BUILD IT slots")
`STORYBOOK_PRINT_VERSION` (in `app/montree/library/dark-phonics/page.tsx`):
**22** (history: 18 → 19 centering fix → 20 CARD_GAP, reverted same day → 21
SLOT_MARGIN → 22 slot_step_gap fix)

---

## 1. What `build-it-sheet.pdf` is

A 3-page-plus A4-landscape PDF per book: pages 1–2 are "READ IT / BUILD IT"
rows (a printed model sentence, scene art, and a row of dashed BUILD IT slots
to paste word cards into); the trailing page(s) are the **word-card cutting
grid** — every word in the book, printed once, arranged as one card per cell
in a shared-border grid so a kid cuts it apart with a handful of straight
line cuts instead of trimming around each card individually.

Two pieces of geometry have to agree with each other for this to work: the
size/position of each cut-out card (`strips_draw()`) and the size/position of
the BUILD IT slot it gets pasted into (`build_row()`). Everything that went
wrong this session was one of these two falling out of sync with the other,
or with itself.

---

## 2. The three requirements, final locked state

As of commit `5ffc0676d`, all three now hold simultaneously, confirmed both
analytically (exact mm math from the real module) and visually (rendered
pages):

1. **Word centering** — every word sits centered on its own true ink
   bounding box inside its card, not on a fixed baseline assumption. Fixed
   earlier this session (see §3.1) and unchanged since.
2. **Touching-border cutting grid** — the word-card grid on the trailing
   page(s) is one shared straight line per cut (`(ncols+1)` vertical +
   `(nrows+1)` horizontal), not a rounded/inset rect per card. For the-sat's
   4×3 grid that's 9 total cuts, not ~14 or ~26. This is the **original,
   locked design** — never touch the grid-line-drawing code in
   `strips_draw()` again; every "fix" this session that touched it had to be
   reverted.
3. **2mm paste clearance, natural slot spacing** — each cut-out card is
   exactly `SLOT_MARGIN` (2mm) smaller than its BUILD IT slot on every side
   (so it drops in with room to spare), **and** adjacent BUILD IT slots are
   spaced `SLOT_GAP` (4.5mm) apart, the same natural word-like gap as
   before. Fixed via two rounds this session (see §3.3, §3.4).

---

## 3. The four rounds, in order (what broke, what fixed it)

### 3.1 Word-card centering (fixed, stayed fixed)

**Symptom:** words sat inconsistently inside their cards — some crowded the
top of the cell, others floated low — because the old code centered every
word on a fixed baseline offset (`card_u * 0.42`) that assumed every word's
ink fills the same vertical band. It doesn't; ascenders/descenders differ per
word.

**Fix:** added `text_ink_bounds(text, tracking=0.0)` to
`scripts/curriculum/satpin-paperwork/stroke_font.py` — walks every glyph's
actual stroke/dot geometry (not the font's advance box) and returns the
word's true ink `(min_x, max_x, min_y, max_y)` in em units. `strips_draw()`
now centers each word's pen position and baseline on that box instead of the
fixed offset. Design canvas documenting before/after (measured clearances
table, real rendered pages):
`https://claude.ai/code/artifact/9d1dbb5c-f610-4ecf-9a2b-8769f650c037`

This part was correct from the first pass and was never touched again.

### 3.2 CARD_GAP regression — reverted in full

**What happened:** in response to "the tabs that need to be cut out look
bigger than the slots they paste into," the cut-out card itself was shrunk
via a per-card inset rectangle (`CARD_GAP = 2mm`, square corners). This
looked plausible (still straight lines) but was wrong in practice: it
converted the grid from `(ncols+1)+(nrows+1)` shared cuts into
`2*(ncols+nrows)` individual closely-spaced parallel cuts — 14 instead of 9
for the-sat, ~26 for books with bigger grids. Caught by Tredoux: "did you
space the sentence strips as individual word again that I have to make
around 26 cuts instead of around 10 again?"

**Fix:** fully reverted `strips_draw()` to the original shared-line grid
(diffed byte-identical against the pre-CARD_GAP version). The lesson: **the
2mm clearance must never be implemented by shrinking the cut-out card** —
that's what breaks the cut count. It has to come from the paste target
instead (§3.3).

### 3.3 SLOT_MARGIN — the correct mechanism for 2mm clearance

**Fix:** instead of shrinking the card, grow the drawn BUILD IT slot itself.
Added `SLOT_MARGIN = 2.0 * mm` near `SLOT_H`/`SLOT_GAP`. In `build_row()`,
the dashed slot rect is now drawn `SLOT_MARGIN` bigger than the card's
nominal cell on every side:

```python
c.roundRect(x - SLOT_MARGIN, slot_top - SLOT_H - SLOT_MARGIN,
           cw + 2 * SLOT_MARGIN, SLOT_H + 2 * SLOT_MARGIN,
           2.0 * mm, stroke=1, fill=0)
```

The card itself (`strips_draw()`) is untouched — still full nominal size,
still one shared cut per boundary. This is the right mechanism and did not
need to change again.

### 3.4 slot_step_gap — the spacing regression this mechanism introduced

**What happened:** growing each slot by `SLOT_MARGIN` on *both* sides while
leaving the layout step between slot positions at the original fixed
`SLOT_GAP` (4.5mm) let the two-sided inflation eat directly into that gap.
Visible gap between adjacent BUILD IT boxes dropped to `SLOT_GAP -
2*SLOT_MARGIN` = **0.5mm** — reading as crowded rather than "separated like
words in a sentence" (Tredoux's exact framing, and the final, most emphatic
correction of the session).

**Fix (final, in `build_row()`):**

```python
# Slots are drawn SLOT_MARGIN bigger than their nominal cell on every
# side (see SLOT_MARGIN) -- laying them out SLOT_GAP apart as before
# would let that inflation eat into the gap, crowding neighbouring
# slots together instead of leaving them spaced apart the way words in
# a sentence are spaced. Laying slots out slot_step_gap apart instead
# (SLOT_GAP plus the 2*SLOT_MARGIN the inflation consumes) means the
# inflation exactly cancels out and the visible air between slots is
# SLOT_GAP again, same as always.
slot_step_gap = SLOT_GAP + 2 * SLOT_MARGIN
total_w = sum(widths) + slot_step_gap * (len(words) - 1)
...
x += cw + slot_step_gap   # was: x += cw + SLOT_GAP
```

Both the `total_w` centering calculation and the per-slot x-increment inside
the drawing loop had to change together — the first pass at this fix only
updated `total_w` and briefly left the increment stale, which would have
mis-centered the row. Both are correct as of `5ffc0676d`.

**Result, confirmed analytically:** visible gap between adjacent BUILD IT
slots is exactly `SLOT_GAP` = 4.5mm again, for every sentence in the-sat
(verified: `['The ant sat!', 'The snake sat!', 'The star sat!', 'The cat
sat!']` all produce `[4.5, 4.5]` mm gaps). `SLOT_MARGIN` clearance is
unaffected — still exactly 2mm per side.

---

## 4. Overflow check — worst-case sentence across all 30 books

`slot_step_gap` is wider than the old `SLOT_GAP`, so a book with many words
per sentence could in principle push `total_w` past the page's printable
width. `grid_metrics()`/`card_metrics()` size each book's card `u` to keep
`row_w` (computed with the *old* `SLOT_GAP`) within `CW = PW - 2*MG =
271mm`, but the actual drawn `total_w` uses `slot_step_gap`, adding
`2*SLOT_MARGIN*(nwords-1)` = 4mm per extra word beyond what `grid_metrics`
accounted for.

Checked across every book whose spreads could be loaded (some `dp-*.json`
configs point at a `shims/` script that doesn't exist in this repo checkout
— unrelated to Dark Phonics, skipped, not a concern):

| slug | worst sentence (words) | total_w (new) | CW | PW |
|---|---|---|---|---|
| the-cat-sat | "A cat on a cat on a cat!" (8) | 254.0mm | 271mm | 297mm |
| the-mat | (6) | 234.8mm | 271mm | 297mm |
| the-cot | (6) | 234.3mm | 271mm | 297mm |
| the-rat | (6) | 228.4mm | 271mm | 297mm |
| jump-in-the-sand | (6) | 228.4mm | 271mm | 297mm |

the-cat-sat's 8-word sentence is the single worst case in the whole
30-book set (confirmed via a grep across every `dp-*.json`/shim pair) and
still has 17mm of slack under `CW`, well under the 297mm page edge. **No
overflow risk** — safe to roll out as-is. If a future book is added with a
longer sentence than this, re-run this same check (script logic below)
before publishing.

```python
# from scripts/curriculum/satpin-paperwork, with:
# export MONTREE_CANVAS_FONTS=".../scripts/curriculum/flashcards/canvas-fonts/"
import build_tracing as bt
u, cw = bt.grid_metrics(sentences)
slot_step_gap = bt.SLOT_GAP + 2 * bt.SLOT_MARGIN
for s in sentences:
    words = s.split(' ')
    widths = cw[:len(words)]
    total_w = sum(widths) + slot_step_gap * (len(words) - 1)
    # compare total_w to bt.CW and bt.PW
```

---

## 5. Verification methodology used (reuse this — it's what finally got it right)

Both checks, every time, before claiming something is fixed:

1. **Analytic** — compute exact mm values in Python from the real module
   (`grid_metrics()`, `SLOT_GAP`, `SLOT_MARGIN`, `text_ink_bounds()`, etc.),
   not eyeballed estimates. This is what caught both the CARD_GAP cut-count
   regression and the slot-crowding regression precisely, in numbers, before
   re-rendering.
2. **Visual** — render actual pages at 220dpi with `pdftoppm` and view them
   with `Desktop_Commander__read_file` (see §6 — it renders PNGs inline
   directly, no staging bridge needed). Check both a BUILD IT row page *and*
   the trailing cutting-grid page every time — a fix that only touches one
   can silently break the other.
3. **Overflow/edge-case sweep** — when a change affects layout width/spacing,
   check the worst-case (most words, longest word) sentence across the whole
   book set, not just the one book being spot-checked. §4 is the reusable
   pattern.

---

## 6. Mac-access bridge correction (important — contradicts an earlier
   assumption from before this session's compaction)

This session has two Mac-access tool bridges, and their actual capabilities
differ from what an earlier summary assumed:

- **`mcp__remote-devices__device_bash` / `device_stage_files`** (the Cowork
  "connected folder" bridge): the folder connected as "montree" for this
  bridge is **NOT the real montree.xyz repo** — it's a small, unrelated
  scaffold project (29 files, a bare `src/app` Next.js skeleton). Do not use
  this bridge for any Dark Phonics / montree.xyz work — it cannot see the
  real repo at all. (Confirmed by `ls`: no `public/`, no `scripts/`, nothing
  matching the real project.)
- **`mcp__remote-devices__Desktop_Commander__*`**: this is the one connected
  to the real repo, via absolute Mac paths (`/Users/tredouxwillemse/Desktop/
  Master Brain/ACTIVE/montree/...`). **Correction to an earlier assumption:**
  Desktop Commander's shell *does* have `pdftoppm` (`/opt/homebrew/bin/
  pdftoppm`) and PyMuPDF (`fitz`) available — no need to route through
  device_bash for rendering. And `Desktop_Commander__read_file` renders PNG
  files directly inline when given an image path — no separate staging step
  needed to visually inspect a render.
- **Font path gotcha**: `build_tracing.py` reads fonts via
  `os.environ.get('MONTREE_CANVAS_FONTS', '/root/.claude/skills/canvas-design/
  canvas-fonts/')` — that default only exists inside a cloud container, not
  on the real Mac. Any Desktop-Commander-run build/analysis script for this
  project **must** first
  `export MONTREE_CANVAS_FONTS="/Users/tredouxwillemse/Desktop/Master Brain/
  ACTIVE/montree/scripts/curriculum/flashcards/canvas-fonts/"` or every
  import of `build_tracing`/`stroke_font` fails with a font-not-found error.

Net effect: **for this project, do everything through Desktop Commander**
(with the env var set), not device_bash. That's the one bridge that actually
reaches the real repo.

---

## 7. Full rollout — all 30 books/readers, this fix

Same slug list and pipelines as `HANDOFF_2026-08-22.md` §2 (Pipeline A: 17
sat-cast books; Pipeline B: ant-on-my-apple, snake-in-my-sock; Pipeline C: 11
Easy Readers, `fox-in-a-box` → output dir `fox-in-a-box-reader`). This fix
only touches `build-it-sheet.pdf` (word-card grid + BUILD IT slots), so the
rebuild command is the same one-liner for all 30, regardless of pipeline:

```bash
export MONTREE_CANVAS_FONTS=".../scripts/curriculum/flashcards/canvas-fonts/"
python3 scripts/curriculum/satpin-paperwork/build_tracing.py \
  --letter dp-<slug> --out "public/dark-phonics-materials/<slug-or-materialsSlug>"
```

Ran for all 30 in one background batch (`nohup ... > _verify/rebuild-log1.txt
2>&1 &`, polled via `tail`) — **0 failures**, all 30 produced a 3-page PDF.

Published all 30 via
`node scripts/curriculum/publish-static-materials.mjs <30 explicit paths>`
(dry-run first to confirm targets/sizes, then for real, backgrounded the same
way, log to `_verify/publish-log4.txt`) — **30 uploaded, 0 failed**, 188.3MB
total.

Bumped `STORYBOOK_PRINT_VERSION` 21 → **22** in
`app/montree/library/dark-phonics/page.tsx`, with an inline comment
explaining the slot_step_gap fix for future readers of that file.

Committed (`5ffc0676d`) staging only the two touched files
(`build_tracing.py`, `page.tsx` — never `git add -A`, the working tree has a
lot of unrelated dirty state from other projects), pushed to `main`.

Railway (`projectId bb3e138f-8ce5-4c9d-ba89-efce14d08e36`, `serviceId
7a625d48-3bc5-48c3-b4e9-369b6ddd6475`, `environmentId
0b5e0827-9121-4b16-941b-83e83028483f`) deployed BUILDING → SUCCESS in about 3
minutes.

**Live verification, both passed:**
- `curl -s -L https://montree.xyz/montree/library/dark-phonics | grep -o
  'build-it-sheet\.pdf?v=[0-9]*'` → `v=22`
- `curl -sI https://montree.xyz/api/montree/media/proxy/bucket/static-assets/
  dark-phonics-materials/the-sat/build-it-sheet.pdf` → `content-length:
  2807301` (matches the local rebuilt file exactly byte-for-byte),
  `last-modified` fresh from the publish run.
- Downloaded the live file directly and diffed it against the local build —
  identical.

---

## 8. What NOT to touch again without re-reading this doc

- `strips_draw()`'s grid-line drawing code (the `for i in range(len(rows) +
  1): ... c.line(...)` block and the matching vertical-line loop). This is
  the locked, correct touching-border design. Any "fix" that replaces it
  with per-card rects (rounded or square) breaks the cut count — happened
  twice this session, reverted both times.
- The 2mm clearance mechanism. It belongs on the slot (`SLOT_MARGIN` in
  `build_row()`), never on the card. If a future request changes the
  clearance amount, only `SLOT_MARGIN`'s value needs to change —
  `slot_step_gap`'s formula (`SLOT_GAP + 2*SLOT_MARGIN`) automatically stays
  correct.
- If `SLOT_GAP` or `SLOT_MARGIN` ever changes, re-run the overflow check in
  §4 against the-cat-sat (and any book added since) before publishing — it's
  the tightest margin in the set.
