# CVC Reading Journey — Handoff

_Last updated: May 25, 2026. Pick this chat up from exactly here._

This handoff captures the **Pink Phase decodable reading programme** ("CVC Reading
Journey") and everything built around it. All workstreams below are COMPLETE and
committed except where flagged. Read this top to bottom and you can resume cold.

---

## Where we stand — one-paragraph summary

The full Pink Phase decodable reader programme is built, audited, shipped, and
live in the Montree library. 15 decodable readers + Teacher Guide + Canva
Production Guide + 49 circle-time songs + 191 per-page Canva image prompts + a
browser-Claude Canva build brief + 15 comprehension-worksheet specs — all done
and pushed. The most recent commit (`f5959e0d`) was an unrelated iPhone
safe-area bugfix. **Nothing on the CVC Reading Journey is mid-flight.** The only
open *decisions* (not tasks) are cosmetic: whether to pick a flat-illustration
vs watercolour style for the reader art, and whether to actually run the Canva
build via a browser-Claude. Both are waiting on the user, not on code.

---

## 1. Pink Readers — the 15-book decodable series ✅ SHIPPED

A graded series of 15 decodable readers for the Pink Phase (UFLI L5–53). Real
little story books where every word is either phonics already taught or a heart
word already introduced. Fills the gap between isolated sentence cards and "a
real book."

- **Books:** `docs/readers/Book_01_*.md` … `docs/readers/Book_15_*.md`
- **Guides:** `docs/readers/Teacher_Guide.md`, `docs/readers/Canva_Production_Guide.md`
- **The bible:** `docs/readers/Pink_Readers_SERIES_PLAN.md` — series plan, decodability law.
- **Canonical word inventory:** `public/language-area-lessons.html` — every word in
  every book is checked against this per-lesson inventory. **Iron rule: a child
  never meets an undecodable word.**
- **Shipped page:** `public/pink-readers.html` (neutral branding, no Whale Class refs).
- **Library card:** amber "Pink Readers" card on `app/montree/library/language-area/page.tsx`.

**Verification done:** every book passed a word-by-word programmatic audit —
inventory↔text exact match, letter-timing vs gate, heart-word timing, plus a
vowel-team / digraph / -ng / -ing scan. All 15 clean. Hand-audited per book
while writing.

**Working titles refined for decodability** (originals used undecodable words):
B5 "Sam Can Read"→"A Big Nap"; B7 "Cat? Cot? Cut!"→"Cat? Cot? Cup?"; B12 "Stop!
Spin! Splash?"→"The Pup on the Sled"; B13 "The Green Frog"→"The Frog and the
Crab"; B15 "Sam Is a Reader"→"The Big Pink Trip".

**Build note:** `public/pink-readers.html` is generated from the 15 book `.md`
files + 2 guides by a markdown→HTML assembly script kept in **session outputs,
not git**. If a book `.md` changes, regenerate the HTML page.

---

## 2. Pink Phase Sound Songs — 49 circle-time songs ✅ SHIPPED

A Suno-ready circle-time song for every Pink Phase lesson — 49 songs, L5–53.

- **Source:** `docs/readers/Pink_Phase_Songs.md`
- **Shipped page:** `public/pink-phase-songs.html`
- **Library card:** violet "Pink Sound Songs" card on the language-area library page.

Each song drills one lesson's target sound and sings a handful of its words.
Songs are *heard, not decoded*, so connective lyrics use free ESL-friendly
English (not gated to the decodability law — that law applies to the readers,
not the songs).

**Verification done:** audited — 49 songs, every word listed in each "Words
sung" header is actually present in the lyrics. A programmatic audit caught 5
late mismatches (Book 6/9/38/48/52) — all fixed.

**Build note:** generated from the `.md` by `build_pink_songs.py` (session
outputs, not git). Regenerate the HTML if the `.md` changes.

---

## 3. Canva image prompts — 191 per-page prompts ✅ SHIPPED

Every one of the 191 reader pages now carries a ready-to-paste Canva Magic Media
image prompt. The Canva Production Guide also has a character-generation-prompt
section so the same children/cat/dog stay visually consistent across all books.

Injected by `inject_image_prompts.py` (session outputs, not git). First version
used a capturing-group `re.findall` that returned digit strings — rewrote the
audit to use `re.finditer` and refined the prompt-derive function to strip
punctuation artifacts.

---

## 4. Canva book-build brief + comprehension worksheets ✅ SHIPPED

- **Brief:** `docs/handoffs/CANVA_BOOK_BUILD_BRIEF.md` — a self-contained brief a
  browser-Claude can use to build Books 1–3 in Canva end to end (scripts + image
  prompts + cover guidance).
- **Comprehension worksheets:** specced for all 15 books. 6 boxes, deliberately
  ultra-simple for second-language pre-K students from China:
  **Who / Match / Sequence / Think / Feel / Draw.**
  (The user explicitly asked for matching + sequencing added to the original
  outline — both are in.)

---

## Open decisions (waiting on the user — NOT tasks)

These are the only things outstanding, and they're judgment calls, not work:

1. **Art style — flat illustration vs watercolour.** The user shared a Canva
   watercolour cover they liked and asked whether to (a) replicate that style,
   (b) let the book interior dictate the cover, or (c) use one interior picture
   as the cover. **Not yet decided.** If the user picks watercolour, all 191
   image prompts + the character-generation prompts should be reissued with a
   watercolour style descriptor.
2. **Cover pictures.** The user wants a cover that can be one, two, or three
   small pictures. Cover guidance exists in the Canva brief; final per-book
   cover scenes are not locked. (Note: one earlier template paired a soccer
   ball / puppy with "Cat Can Nap" — a mismatch — recommended a cat-on-Sam
   scene instead.)
3. **Actually building the Canva books / worksheets** via a browser-Claude
   using `CANVA_BOOK_BUILD_BRIEF.md`. Brief is ready; the build itself hasn't
   been run.

None of these block anything. The programme is shippable as-is.

---

## How to resume

To reissue image prompts in a new style: edit the `derive()` style descriptor in
`inject_image_prompts.py` (session outputs) and re-run, then regenerate
`public/pink-readers.html` with the markdown→HTML assembly script.

To change a book: edit the relevant `docs/readers/Book_NN_*.md`, re-run the
word-by-word decodability audit against `public/language-area-lessons.html`,
then regenerate `public/pink-readers.html`.

To change songs: edit `docs/readers/Pink_Phase_Songs.md`, re-run the
words-sung audit, regenerate `public/pink-phase-songs.html` via
`build_pink_songs.py`.

**Build scripts (`inject_image_prompts.py`, `build_pink_songs.py`, the
markdown→HTML assembler) live in session outputs, not git** — they'll need to be
recreated or located in the prior session's outputs folder.

---

## Operational notes (persist these)

- **Git push:** ALWAYS via Desktop Commander —
  `mcp__Desktop_Commander__start_process` with
  `cd ~/Desktop/Master\ Brain/ACTIVE/whale && rm -f .git/index.lock && git add ... && git commit -m "..." && git push origin main 2>&1`,
  `timeout_ms: 30000`. Never Cowork VM SSH keys, GitHub PATs, or push scripts.
- **Domain:** use `montree.xyz` — `teacherpotato.xyz` is stale.
- Build scripts stay in session outputs, never committed.
- Last commit on `main`: `f5959e0d` (iPhone safe-area bugfix — unrelated to this work).
