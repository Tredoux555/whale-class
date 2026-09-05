# Writing Shelf — buy-once master Taobao list, handed forward

**2026-09-05 · Sonnet, writing up this session's work for whoever picks it up
next.** Read this before touching `public/writing-shelf-master-taobao-list.html`,
`docs/writing-shelf-master-taobao-list.md`, or the `#taobao` section of
`public/dark-phonics-shelves.html`.

## What was done today

Built a single **buy-once master Taobao list** for the whole Writing Shelf:
`public/writing-shelf-master-taobao-list.html` (live page) plus
`docs/writing-shelf-master-taobao-list.md` (source doc). `dark-phonics-shelves.html`'s
`#taobao` section lists furniture + Trays 1-8 + cross-shelf consumables as
93 separate per-tray rows — fine for understanding one tray at a time, useless
for actually placing an order, since the same consumable (card stock,
laminating pouches, pencils, small dishes...) repeats across trays with
different quantities. This session hand-merged all 93 rows into **34 lines**,
summed quantities, added a "used in" column naming every tray that draws on
each line, kept the 淘宝搜索词 (Taobao search terms) with per-line copy
buttons, gave each line an in-memory checkbox for ticking off while ordering,
added a print stylesheet, and closed with a **Reconciliation** section at the
bottom showing each tray's subtotal so the merge can be checked against the
source page.

## Where it's linked and live

- A `.note` callout at the top of the `#taobao` section on
  `dark-phonics-shelves.html` now points to the master list.
- The master list has a back-link to the shelf page.
- Commit `0bb63d7ef`, pushed to `main`, live at
  `https://montree.xyz/writing-shelf-master-taobao-list.html` (verified 200).
- **No middleware change needed** — `.html` is excluded from the middleware
  matcher, so `public/*.html` is already served as a static file, same as
  every other shelf page.

## Merge judgement calls (keep these in mind before editing further)

- **Small dishes** merged to 3 identical (Trays 1, 5, 8) even though Tray 5's
  spec says "~6cm" — treated as close enough to buy as one line.
- **Laminating pouches**: matt and standard/glossy kept as **two separate
  lines** — different finish, not interchangeable.
- **Card stock**: 300gsm and 250gsm kept **separate** — different weights,
  different trays need different stiffness.
- **Plain paper**: 100gsm and 100-120gsm specs merged into **one 40-sheet
  buy** — close enough in weight that one pack covers both.
- **Letter tiles** (Tray 3, bumped to buy 30, not the spec'd 18) kept
  **separate** from the Tray 2 movable alphabet — different tile sets, not
  interchangeable.
- **Excluded from the list entirely** (not purchases): Tray 1's 16 borrowed
  alphabet letters, Tray 5's word cards + sentence line, Tray 8's reused
  miniatures/sentence strips — all sourced from elsewhere on the shelf, not
  bought new.
- **Buy-column rounding**: rounds up only where the source page itself says
  items come in packs — pencils (12/pack), pouches (box of 25), card stock
  (10- or 12-sheet packs), counters (bag of 20-30).

## Verified totals (cross-checked against the shelf page's own cross-shelf figures)

300gsm card 7 sheets · 250gsm card 9 sheets · plain paper 29 sheets (36 with
a full term) · matt pouches 3 · standard pouches 13 · pencils 11 · pencil
pots 3 · split rings 2 · trays 8 · miniatures 26 pieces / 16 distinct.

## Tray size note

35x25 cm on the master list is a "~" **estimate, not a spec** — any tray
that fits an A4 sheet landscape with a margin, and fits the shelf's bays, is
fine. Buy 8 identical trays.

## Next / open

- Tredoux to place the actual Taobao order from the master list.
- The master list is **hand-built, not generated** — if the source page's
  per-tray tables in `dark-phonics-shelves.html` change, someone has to
  manually re-merge the affected lines. There is no generator script to
  re-run.
