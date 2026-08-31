# The Writing Shelf — physical build spec for Trays 01–03, handed forward

**2026-08-31 · Sonnet, writing up this session's work for whoever picks it up
next.** This was a **guidance session — no code shipped**. Read this before
touching `public/dark-phonics-shelves.html`, the v2 print guide under
`public/dark-phonics-shelf/v2/`, or the physical materials for Trays 1–3.

## What this session was

Two subagents ran in support of this session: one extracted the locked
content already in this repo (shelf page tray text, v2 print manifests, the
Tray 3 chain list), the other did pedagogy research — Blachman's *Road to the
Code* (Say-It-and-Move-It), Elkonin boxes (via Reading Rockets), McCandliss,
Beck, Sandak & Perfetti 2003 ("Word Building"), the AMI pink-series object
box protocol, and Ehri's phases of word reading. Every word choice below was
cross-checked against the Dark Phonics ledger
(`lib/montree/dark-phonics/lessons.ts`, the `RAW` export) — the
**dark-phonics-only rule** (no word or letter outside what's actually been
taught) was respected throughout.

## Decisions locked this session

1. **Tray 1 letter box fix.** The shelves page lists the box as
   `s a t p i n m d g o c k e u` (14 letters), but two of the six miniatures
   (bed, hat) need `b` and `h`, which aren't in that box. **Fixed: 16 single
   tiles — `s a t p i n m d g o c k e u` + `b h`.** No doubled tiles needed —
   no object word repeats a letter. Tiles ~40 mm, to fit inside the 55 mm
   sound-frame boxes, lowercase, in the traced letterforms already used
   elsewhere on the shelf.

2. **Tray 1 word orders.**
   - 3-frame presentation order, by segmentability (continuous sounds
     first): **sun → mug → hat → bed → pig → cat.**
   - VC warm-ups, pulled from the ledger: **at, it, an, in** (built in the
     3-frame mat with the third box covered).
   - **4-frame words replaced.** The page's week-3 list — *hand, milk, jump,
     sand* — is off-ledger: it uses untaught letters (`h`/`l`/`j` leaking in
     from an old master-word list). Replaced with ledger words, final-cluster
     first: **naps → snap → spat → spit → stuck** (naps/snap is a same-tile
     anagram pair). Needs no new letters beyond the fixed 16-tile box above.

3. **Tray 1 layout confirmed.** 2 mats (print sheet A, `01-sound-frame-mat.pdf`,
   printed twice — one 3-frame side up, one 4-frame side up), 10 same-colour
   glass counters in a dish, 6 miniatures (pig, cat, sun, bed, mug, hat), and
   the lidded 16-letter box, all on the same tray. Counters→letters is one
   continuous activity, per the Road to the Code staircase: all counters →
   one letter among counters → all letters. Roughly 5 words per sitting.

4. **Tray 2 object sets locked** (50/50 overlap with Tray 1, per the transfer
   research):
   - **Set A** (weeks 1–2): **cat, pig** (anchors, already known from Tray 1)
     + **dog, pot, pan, tin, mop, peg** (fresh).
   - **Set B** (rotate in once Set A is fluent twice, or weekly regardless):
     **sun, mug, hat, bed** (anchors) + **nut, bin, cot, kit** (fresh).
   - Note: `mop`, `peg`, `nut`, `bin` pre-seed four of the six chain starts
     already locked for Tray 3 (below) — deliberate.
   - No spelling correction on this tray — unchanged from the existing rule
     (invented spelling belongs to Trays 2/6/7; correction is Tray 4 only).

5. **Tray 3 build confirmed as already locked in v2** — no changes, just
   verified against the ledger and the pedagogy research:
   - Chain board = print sheet A, printed a **third** time (4-frame side).
   - Letter tin: `a b c d e g h i m n o p r t u`, doubled = **30 tiles**
     (matches the v2 manifest's `trayThreeLetterTin`).
   - 6 chain cards (print sheet B), chains verbatim:
     `tap→cap→can→pan→pen` · `mop→hop→hot→hut→hug` · `peg→beg→bed→bad→bag` ·
     `bin→big→bug→dug→mug` · `nut→cut→cup→cap→cat` · `rat→bat→bag→big→dig`.
   - Session protocol, per McCandliss word building: one tile moves at a
     time, read the word aloud at each step, read the whole chain aloud at
     the end. A beginner only gets that one chain's 6–7 tiles, not the full
     30-tile tin.

6. **ESL flags, Mandarin-L1.** The `pan→pen` and `bed→bad` steps hinge on the
   /æ/–/ɛ/ contrast, which is hard for Mandarin-L1 ears/mouths. Treat that
   single step as its own mini-lesson: keep the object photos in view side by
   side, and exaggerate the jaw drop on /æ/.

7. **Print run consolidated.** Sheet A ×3 (Tray 1 3-frame, Tray 1 4-frame,
   Tray 3 chain board), sheet B (6 chain cards), sheet C (12 dictation cards
   — doubles as Tray 1 week-4 pictures and the Tray 2 object substitute where
   a real miniature isn't available), sheet D (sight-word hearts — a, an, I,
   the, ate — plus punctuation; laminate before cutting). Cut counts: 16
   tiles for the Tray 1 box, 30 tiles for the Tray 3 tin.

## Open items / next session

- `public/dark-phonics-shelves.html` and the v2 `PRINT-GUIDE` still show the
  **old** content — the 14-letter Tray 1 box and the `hand, milk, jump, sand`
  4-frame list. The fix (fold in `b`+`h`, the `naps/snap/spat/spit/stuck`
  list, and the Tray 2 object sets, into both the page and the print guide)
  was **offered this session but not approved, and not done.**
- At print time, verify whether chain card 1's front is the real `tap`
  photo or the temporary "tap" text stand-in — the 08-29 handoff and the live
  HTML disagree on this.
- Trays 04–08 physical build guidance still to come — **Tray 04 (dictation)
  is next.**

## Reference

- Ledger (source of truth for allowed words/letters):
  `lib/montree/dark-phonics/lessons.ts` (`RAW` export).
- Shelf page (has the stale Tray 1 content described above):
  `public/dark-phonics-shelves.html`.
- v2 printables + guide: `public/dark-phonics-shelf/v2/`.
- Prior handoff (Writing Shelf printed program, 2026-08-29):
  `docs/handoffs/HANDOFF_WRITING_SHELF_2026-08-29.md`.
- Brain checkpoint for this session: `docs/mission-control/brain.json`,
  key `WRITING_SHELF_PHYSICAL_BUILD_2026_08_31`.
