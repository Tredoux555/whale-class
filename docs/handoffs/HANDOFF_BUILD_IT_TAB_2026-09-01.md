# Handoff — visual diagrams for the "Build it" tabs

**2026-09-01. For a fresh Claude session.**

## State

Tredoux is physically building the 8 writing-shelf trays this week. The
"Build it" tab on each tray already exists (Gather → Assemble → Done when,
plus a "Build it all" aggregate tab) and is content-complete and locked to
the physical spec. What it's missing: a picture. Every other tab on every
tray (Go deeper, Explain More) already carries a hand-drawn top-down SVG of
the finished tray — Build it is the one tab a builder actually needs that
diagram on, and it's the one tab that doesn't have it. Your job is to add
it. This is a diagramming task, not a content task — do not rewrite Gather/
Assemble/Done-when text unless a diagram forces a correction.

## What exists

- Live page: `montree.xyz/dark-phonics-shelves.html`. Repo file:
  `public/dark-phonics-shelves.html` (full document). The working copy in
  this container, `/home/claude/work/shelf-guide.html`, is the **unwrapped**
  version — the publisher adds `<!doctype>`/`<head>` on deploy. To deploy:
  rewrap with doctype+head, commit via the device tools, push with Desktop
  Commander git. There is also an Artifact mirror — same file, republish to
  update: `https://claude.ai/code/artifact/7bffe857-d5dc-4bc5-b6be-d5f7755d12d7`.
- `/home/claude/work/build-it-content.html` — the original source fragment
  for the Build it tabs. It is now **stale as prose**: the live page's
  Build it content has since been reconciled against the locked physical
  spec (e.g. Tray 1's Gather block now reads 6 miniatures *pig, cat, sun,
  bed, mug, hat* and 2 mat cards, not the fragment's older 3-object/1-card
  numbers). Use the fragment only to see the section skeleton
  (`.panel.deep`, `h4 data-n`, `.traygrid`/`.tb`/`.lab`, `ul.checks`,
  `ol.script`, `.note`, `.honest`), not its numbers — read the live tab in
  `shelf-guide.html` for current facts.
- Each tray has 4 tabs, ids `tb{n}q/g/e/b` (buttons) and `tp{n}q/g/e/b`
  (panels), n = 1–8. Tab-switching JS lives around `function select(tab,
  moveFocus)` near the end of the file. Build it is tab `b` — panel id
  `tp{n}b`, e.g. `tp1b` starts around line 875 for Tray 1 (line numbers
  drift tray to tray; search `id="tp` + the number).
- **The diagram convention already exists — copy it exactly, don't invent
  a new one.** Every tray's Go-deeper and Explain-More tabs already
  contain the *same* top-down tray diagram (search `class="traytop"` —
  there are 16 instances today, 2 per tray, 0 in any Build-it panel):

  ```html
  <figure class="traytop"><div class="figscroll">
    <svg viewBox="0 0 520 156" role="img" aria-label="Top-down view of tray
      N. From left to right: <plain-English list of objects>. An arrow
      beneath runs left to right showing the order of use.">
      <defs><marker id="tvN..." viewBox="0 0 10 10" refX="8" refY="5"
        markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 9 5 L 0 9 z" class="af"/></marker></defs>
      <text class="sm" x="14" y="22">THE TRAY FROM ABOVE — LEFT TO RIGHT,
        AS HE SEES IT</text>
      <rect class="sl" x="14" y="34" width="492" height="84" rx="8"/>
      <rect class="sb" x="22" y="44" width="113" height="64" rx="5"/>
      <text class="sw-s" x="78" y="72" text-anchor="middle">objects</text>
      <text class="st-s" x="78" y="92" text-anchor="middle">6 miniatures</text>
      <!-- repeat .sb (or .ab for the amber/printed item) boxes left→right -->
      <line class="al" x1="14" y1="136" x2="506" y2="136"
        marker-end="url(#tvN...)"/>
      <text class="am" x="14" y="154">ORDER HE TOUCHES THEM</text>
    </svg>
  </div></figure>
  ```

  Give each `<marker id>` a unique suffix per instance (the existing ones
  use e.g. `tv1g`, `tv1` — collisions between duplicate ids on one page are
  silently harmless in SVG but avoid them anyway). Style tokens already in
  the page CSS: `.sl` = outer tray outline (currentColor stroke), `.sb` =
  a plain compartment box, `.ab` = an amber-accented box (use for the
  printable/laminated item — the same visual role `.tb` boxes use to mark
  print jobs elsewhere), `.sw-s` = bold label, `.st-s` = grey sub-label,
  `.am`/`.al` = the amber order-arrow + its caption, `.sm` = small caption
  header. Everything is `currentColor`/CSS-var driven — no hardcoded hex —
  so it auto-adapts to light/dark, matching every other figure on the page.
  `figure.traytop` and `.figscroll` (horizontal-scroll wrapper) are already
  styled in the page's CSS; `<figcaption>` is optional on these (the
  existing 16 instances don't use one — a `role="img"` + full `aria-label`
  carries the accessible description instead).
- Whole-shelf front elevation convention: also already exists, once, near
  the top of the page (search `SHELF ONE — GET THE SOUND OUT`) — a two-row
  front-elevation SVG, trays 1–4 top shelf / 5–8 bottom shelf. That is the
  house style for a "whole shelf" figure if you build one for the Build-it-
  all tab.

## Facts to build from (authoritative, cross-checked — don't re-derive)

- **Tray 1**: box of 16 single tiles `s a t p i n m d g o c k e u b h`
  (up to ~60 mm, fits the 70 mm / 66 mm frames — **2026-09-05**, was
  "~40 mm, fits 55 mm frames"; see `HANDOFF_SHELF_PRINT_FIX_2026-09-05.md`);
  6 miniatures pig/cat/sun/bed/mug/hat,
  presentation order sun→mug→hat→bed→pig→cat; VC warm-ups at/it/an/in
  (3rd frame covered); 4-frame words naps→snap→spat→spit→stuck.
- **Tray 2**: Set A cat, pig + dog, pot, pan, tin, mop, peg. Set B sun,
  mug, hat, bed + nut, bin, cot, kit.
- **Tray 3**: 30-tile tin (`a b c d e g h i m n o p r t u` ×2), six chains
  — tap→cap→can→pan→pen / mop→hop→hot→hut→hug / peg→beg→bed→bad→bag /
  bin→big→bug→dug→mug / nut→cut→cup→cap→cat / rat→bat→bag→big→dig.
  Beginner gets only one chain's 6–7 tiles. pan→pen and bed→bad are the
  /æ/–/ɛ/ ESL mini-lesson.
  Sound-frame mat PDF prints ×3 total (Tray 1 rests one card 3-frame-up
  and one 4-frame-up; the 3rd copy is Tray 3's board). Small-objects PDF
  prints ×2 (heart rings on Trays 4 and 5).
- **v2 printables**: `montree.xyz/dark-phonics-shelf/v2/` — 10 PDFs, all
  now photographic (no drawn-placeholder gaps left), plus `PRINT-GUIDE.html`
  and `manifest.json` (per-sheet pages/paper/duplex, and
  `trayThreeLetterTin`). Source photos: 30 images in the Picture Bank
  (search "writing-shelf"), mirrored at `phonics-images/satpin-v2/` on the
  Mac (gitignored). The mop and nut photos are flagged as possible
  reshoots — broom/acorn ambiguity in the frame.
- **Related docs**: `docs/handoffs/HANDOFF_WRITING_SHELF_2026-08-29.md`,
  `HANDOFF_SHELF_PHYSICAL_BUILD_2026-08-31.md`; brain checkpoint
  `docs/mission-control/brain.json` key
  `WRITING_SHELF_PHYSICAL_BUILD_2026_08_31`. This handoff should get its
  own key, `BUILD_IT_TAB_2026_09_01`, when you checkpoint.
- **Key commits**: `55a1eb47e` (added the Build it tab),
  `76e6026b6` (reconciled Build it content to the locked spec + restored
  PRINT-GUIDE).

## What the next session should do

- Add one `figure.traytop` diagram to each tray's Build-it panel
  (`tp{n}b`, n=1–8), placed in the "Done when" section (it illustrates the
  finished tray, matching that section's prose) — reusing the exact
  `traytop`/`figscroll`/marker/`.sl`/`.sb`/`.ab`/`.sw-s`/`.st-s`/`.am`
  pattern already on the page, not a new visual language. Mark the
  printed/laminated compartment `.ab` (amber) so a builder can see at a
  glance which pieces came off the printer versus out of the cupboard.
- Add one whole-shelf front-elevation figure to the "Build it all" tab
  (`data-tray="all"` section), styled like the existing two-row shelf
  figure near the top of the page, so a builder can see the eight trays
  in their final shelf position in one picture.
- Hand-authored inline SVG only, in the page's existing style —
  photographic mockups are explicitly not wanted here; keep everything
  `currentColor`/CSS-var so it holds up in dark mode like every other
  figure on the page.
- After editing `/home/claude/work/shelf-guide.html`, rewrap it into the
  full document (doctype+head) for `public/dark-phonics-shelves.html`,
  commit and push via the device git tools, and republish the Artifact
  mirror at the URL above so Tredoux can review before it goes live.

---

## 2026-09-05 — consolidated miniatures list added

Tredoux asked for "a list of all the mini objects I need, with how many of
each." Added as a new sub-block inside `#buildall`, anchored `#miniatures`
("Miniatures — the full list"), placed after "One shopping list for eight
trays" and using the same `tablewrap`/`table` + `.scriptnote` conventions as
the print-run tables. `#miniatures` was added to the existing
`#taobao{scroll-margin-top:64px}` rule (the sticky-nav gotcha recorded in the
09-02 handoff). No nav link — the other Build-it-all sub-blocks don't have
one either.

**Where the numbers came from.** Only Trays 1, 2 and 8 use physical 3D
miniatures; Tray 4's dictation cards and Tray 5's word cards are paper and
are already in the print run.

- Tray 1 build-it Gather: 6 — pig, cat, sun, bed, mug, hat.
- Tray 2 build-it Gather: 16, two locked sets of 8 (Set A cat, pig + dog,
  pot, pan, tin, mop, peg; Set B sun, mug, hat, bed + nut, bin, cot, kit).
- Tray 8 build-it Gather + its finished-tray SVG: 4 — cat, dog, pig, hat.

**16 distinct objects, 26 pieces.** The 26 is the new number here. The
Taobao section already says "16 distinct miniatures … not 6+16+4 separate
purchases" — true for *searching*, but all eight trays sit on the shelf
simultaneously, so an object on two trays cannot be one object. Seven need
duplicates: cat ×3, pig ×3, hat ×3, dog ×2, sun ×2, mug ×2, bed ×2; the
other nine are singles. Those seven rows are marked *assumed* in the table,
since no source doc states it explicitly. The block says in plain English
that the Taobao list counts objects to search for and this table counts
pieces to put in baskets — the two are not in conflict.

Other facts folded into the Notes column, all from existing page text: which
objects have a photo card in Tray 4's deck (cat, pig, dog, mug, hat, bed,
cot — the other nine have no card backup); that mop, peg, nut and bin also
start Tray 3 chains; that sun is object-only; that mop, peg, tin, bin, cot,
kit are the hard-to-source ones (09-02 handoff); size ~3–6 cm, matching the
Taobao rows. Miniatures never sit inside a printed frame, so the 70 mm /
66 mm frame sizes apply only to the letter tiles — stated explicitly to kill
that question.

No other page content was touched.
