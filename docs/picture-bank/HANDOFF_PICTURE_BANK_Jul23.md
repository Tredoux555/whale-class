# Handoff — Dark Phonics tidy-up + Montessori Picture Bank (Jul 23, 2026)

Pick-up note for a fresh chat. Everything below is **done and deployed** unless marked ⏳ NEXT.

## 1. What shipped to the live site today

**Dark Phonics media packs — completed.** Each per-letter pack page
(`public/media-packs/{s,a,t,p,i,n,m,d,g,o}.html`) now has the full set:
Song · Pictures · **Flashcards** (letter-sound card + full deck) · Vocab ·
**Books & Readers** (read online + print booklet + read-along PDF). Subtitles
updated. `media-packs/index.html` reflects it. Commits `72b44a06`, `3050a874`.

**Middleware PDF bug — fixed (was breaking book PDFs site-wide).**
`middleware.ts` static-file early-exit regex was missing `pdf`, so every
`/satpin-books/**.pdf` (and any public PDF) returned the app shell instead of
the file — the "Print booklet" links had been silently broken. Added `pdf` to
the allow-list (line ~165). Commit `01f65b55`. Verified live: flashcard/vocab
PDFs `200 application/pdf`, booklets now serve real PDFs.

**New SATPIN teaching page — LIVE at `https://www.teacherpotato.xyz/satpin.html`**
(`public/satpin.html`, commit `509deb82` then simplified `3050a874`). One tidy
page for weeks 1–6 (s a t p i n): **two print-once bundles** at top —
🃏 All Flashcards (58p) and 📕 All Books (6 readers merged) — then a
week-by-week grid + on-screen links. Shelf packs were deliberately dropped
(user: quality not up to par). Two merged bundle PDFs were built and committed:
`public/shelf-packs/dark-phonics-satpin-ALL-shelf-packs.pdf` (67p — currently
UNLINKED on the page) and `dark-phonics-satpin-ALL-booklets.pdf` (64p, linked).

⏳ **NEXT (not done):** wire `satpin.html` in as a tab on the Dark Phonics hub,
then clean out the old scattered pages (`satpin-teacher.html` etc.). User wants
this ONLY after final sign-off. Nothing has been deleted.

## 2. The image insight (important — drives the Picture Bank)

We audited the SATPIN vocab images in `phonics-images/satpin-v2/vocab-iso/`
(sap, pit, pan, tin, pat, tap, ax, sock). Finding: they're all **googly-eye
storybook characters** in mixed styles. That is **correct for the circle/lesson
Dark Phonics set** (tap, pat, sap are great there) — but **wrong for Montessori
shelf 3-part cards**, which need clean photoreal single-object pictures that
answer a child's "what is this?" and correspond to an object they can hold.

**Two tracks, never mix:**
- **Circle/lesson → googly-eye characters** (already have a near-complete A–Z
  set; many in `~/Downloads` as `u6724885345_A_single_*_googly_eyes_*.png`).
- **Shelf / 3-part cards → photoreal studio photos** of concrete, holdable
  objects (the "ultra-realistic single real fox/banana on white" style the user
  is generating in Midjourney).

## 3. Montessori Picture Bank — deliverables produced (this session)

Separate track from Dark Phonics, but will live in the same place (a new
tab/section — ⏳ NEXT, not built yet). Saved under `docs/picture-bank/`:

- **`MJ-PROMPTS-A-Z.md`** — 156 copy-paste Midjourney prompts, 6 holdable
  objects per letter (A–Z), in the user's exact photoreal studio style.
- **`Montessori-Object-Picture-Bank-A-Z.xlsx`** — the same 156 as a searchable/
  filterable sheet: Letter · Sound · Object · Get (🖨️ print / 🛒 buy / ⚖️ both) ·
  **STL search term** (for finding 3D models later) · MJ prompt · reader tie ·
  notes. "Read me" tab explains the rule and flags hard letters.

**Selection rule** every object passes: (1) a 3–4 yo names it on sight;
(2) you can put a real one in the child's hand (buy a mini OR 3D-print);
(3) photographs clean as one object on white. Beginning sound. Ties to the six
readers where possible (sock/snake→book1, apple/ant→book2, pan→SPAT, etc.).

**Hard letters flagged** (thin for holdable objects, expect to tweak):
**I, U, X** (X uses words ending in x — fox/box/ox/six — by Montessori
convention), **Z**.

## 4. ⏳ NEXT STEPS (for the new chat)

1. **Generate the photos:** user runs `MJ-PROMPTS-A-Z.md` through Midjourney,
   keeps the cleanest of each, drops them in per-word folders. (Claude can't
   generate photoreal images — MJ does this.)
2. **Curation review:** sanity-check the word picks, especially I/U/X/Z, before
   or as images come in. (User floated using **Fable** for careful curation.)
3. **Build the 3-part cards** from the chosen photos (picture card + label card +
   control card, print-ready) — Claude does this once images exist.
4. **Host it:** add a "Picture Bank / 3-Part Cards" tab in the same place as
   Dark Phonics.
5. **STL sourcing (later):** use the `STL search term` column to find printable
   models per object.
6. **Finish the SATPIN tidy-up:** wire `satpin.html` into the hub tab bar, then
   remove the old duplicate pages after sign-off.

## 5. Gotchas / environment notes
- Deploys are Railway auto-deploy on `git push origin main`; teacherpotato.xyz
  is a middleware host-split of the same app. Hard-refresh (Cmd+Shift+R) after.
- Committing/pushing on the Mac occasionally hits a stale `.git/index.lock` —
  `rm -f .git/index.lock` then retry (done via Desktop Commander this session).
- Large PDFs (the 50MB booklet bundle) make pushes slow over the connection;
  they still complete.
