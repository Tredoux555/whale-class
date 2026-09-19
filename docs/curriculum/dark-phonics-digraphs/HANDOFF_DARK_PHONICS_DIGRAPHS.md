# Dark Phonics Digraphs — standing handoff

Living canonical doc. Started 2026-09-19. Read this before touching the series.

---

## 1. WHAT IT IS

A sister series to the Dark Phonics letter books. One book per **sound**, not per letter.

**Tredoux's ruling, 2026-09-19: the children can now READ.** So these are not the shouted
picture-word books any more. They are **decodable sound readers** — the child reads the
sentence off the page, the picture only confirms it.

The rules of the series:

- **One book per sound. SIX pages.** One sentence a page.
- **The sound appears at least twice on every page.**
- **The pages chain.** The last thing named on a page is the first thing on the next.
- **Vocabulary = the sheet-25 digraph mat words for that sound, plus any CVC word.**
  Nothing else.
- **Strict decodability**, with one exception: a word the mat already taught by picture
  may be used even if it is not yet decodable for that child.
- **Page 6 is the Teacher Potato cameo**, as in every Dark Phonics book.
- **Simplicity first, funny second.** A funny sentence a child cannot read is a failed page.

**Tredoux writes the texts himself.** Claude supplies the Midjourney prompt packs, the
build, and the wiring — never the story.

---

## 2. THE SPINE

Book order = the sound-book order (sheet 25 group order):

> **sh · ch · th · ee · wh · ck · ng · ea · oo · ow · oi/oy · ir/ur/er**, then
> **igh · ie · ue-ew · oe** — possibly ONE combined long-vowel finale rather than four
> thin books (group 5 is the thinnest page on the mat, 8 cells of 18). **PROPOSED**,
> Tredoux's call.

### The mat word pools (verbatim from `DIGRAPH_GROUPS`, `scripts/curriculum/writing-shelf/build_25_digraph_work.py`)

| sound | mat words |
|---|---|
| sh | ship shop shell shoe sheep shark shut shed fish dish wish brush shrimp crash splash trash thrush |
| ch | chair cheese chick chin chop cherry chest lunch bench much branch stitch chew |
| th | thumb think thin throw thank three bath teeth math moth thrush |
| ee | tree bee queen see feet green sleep week sheep three |
| wh (initial) | whale wheel whisk white wheat whistle |
| ck (final) | back sock duck kick rock clock lock neck |
| ng (final) | king ring song sing long swing wing |
| ea | eat sea read leaf pea tea bread head wheat |
| oo (long+short, ONE sound on paper) | moon spoon zoo boot food room book look foot hook cook |
| ow | snow crow show low cow how now owl |
| oi/oy | coin boy toy soil joy point oil |
| ir/ur/er | bird girl shirt fur nurse her fern |
| igh | light night high fight right sight |
| ie | pie tie field fried |
| ue/ew | blue glue new few chew true |
| oe | toe hoe foe doe shoe |

`DROP_WORDS` (white, green, blue, black, fresh, small, soft, sweet, thin, long, low, high,
true, new, few, much) are struck from the mats as colour/adjective words. They are still
perfectly good **book** words — the strike is an artwork rule, not a reading rule.

### Book 1 — "sh"

**FRAME LOCKED by Tredoux:** **"The ___ is on the ship."**

- **The SHIP is the fixed anchor prop.** Described VERBATIM in every prompt of the pack —
  same ship, same rigging, same angle words, every page. This is the sock principle.
- **sh cast candidates:** fish · dish · sheep · shell · shed · shut · shop · and
  **"Shh!"** for the potato page.
- Slug: `the-ship`.

**DRAFT six-page shape — Tredoux's text wins, this is a placeholder only:**

```
DRAFT — not approved
1  The ship is a shop.
2  The shop is on the ship.
3  A fish is on the ship.
4  The fish is in a dish.
5  A sheep shut the shop.
6  Shh! The potato is on the ship!
```

Note the chain (ship→shop→ship→fish→fish→dish→…) and the twice-a-page sound. Use it to
check a draft, not as the text.

---

## 3. ART

Locked and unchanged from the letter books:

- **The house style**, CLAUDE.md "Dark Phonics — locked Midjourney art style": colored
  hand-drawn pen-and-ink, fine crosshatch, whimsical Dr. Seuss, big googly eyes (objects
  too), plain white background. **Append the locked suffix VERBATIM** — including the full
  negative list (no text/words/letters/numbers/captions/speech bubbles/border/watermark).
- **`--ar 1:1`. v8.2. NO `--cref` / `--oref`.**
- **Fixed anchor prop + rotating cast** — one prop described verbatim in every prompt, one
  character per page.
- **The action-verb rule** (CLAUDE.md "MJ ACTION-VERB PLAYBOOK"): never write the verb.
  Build it from POSE + PROJECTILE-AS-OBJECT + TRAJECTORY (dashed ink motion line) + TARGET.
- **Expression rule:** every character reads happy or content in EVERY image. No fear,
  sadness, anger or distress, ever.
- **Test-run-first:** roll ONE character page 3× before writing the whole pack.
- **Claude delivers prompts IN CHAT.** Tredoux runs each 3×, picks the winner, drops it in
  `~/Downloads`; the agent files them.
- **Art home:** `phonics-images/dark-phonics-digraphs/<slug>/` (cover.png, p1…p6.png).

---

## 4. BUILD

1. **Book definition** — add a `dict(...)` to `BOOKS` in
   `scripts/curriculum/flashcards/books_def.py`, same shape as `the-bug`/`the-mud`:
   `slug`, `title_lines`, `title_accent`, `title_size`, `band`, `booknum`, `cover`,
   `spreads=[dict(nar=…, text=…, size=…, art=…), …]`, with an absolute Mac path constant
   for the art dir (the `PAT4`/`BUG15` convention). Obey the TEXT RULES at the top of that
   file: a `nar`+`text` page is ONE sentence and `text` starts lower-case.
2. **A5 pair** — `scripts/curriculum/flashcards/build_booklets.py` emits
   `<slug>-A5-reading.pdf` + `<slug>-A5-booklet-print.pdf`. **Note:**
   `scripts/curriculum/dark-phonics-storybooks/build_a5_readers.py` is the *Easy Reader /
   storybook* generator, not the letter-book one — the letter-book pattern is
   `books_def.py` + `build_booklets.py`. **Flagged as uncertain**; confirm which Tredoux
   means before the first build.
3. **Page wiring** (CLAUDE.md "HOW TO PUBLISH A NEW LETTER BOOK", locked 2026-08-12 — the
   rules that broke `the-bug`):
   - `RAW` in `lib/montree/dark-phonics/lessons.ts` has **`reader` and `books` — never
     interchangeable.** A new book goes into `books: [...]`. **NEVER overwrite an existing
     `reader`.**
   - Everything is a plain static file under `public/` — **no Supabase bucket upload**:
     `public/dark-phonics-books/print/<slug>-A5-{reading,booklet-print}.pdf`,
     `public/dark-phonics-books/covers/<slug>.png`,
     `public/dark-phonics-materials/<slug>/…`.
   - **Set `cover` explicitly** to `/dark-phonics-books/covers/<slug>.png`.
   - `materials: true, works: true` only once those files actually exist.
4. **Book works 1–4** — `scripts/curriculum/book-works/build_book_works.py <slug>`. It
   writes to `materials-out/` only; **copying the 4 PDFs to
   `public/dark-phonics-books/works/<slug>/` is a separate, required step every time.**
   Respect the 2026-08-27 layout standard and Work 3 v2 (blank changing-word slot).
5. **Three-part cards** need the separate DB-backed `make-material.mjs` tool, not this
   pipeline.
6. **Publish** — golden rule: source → generator → `public/` (gitignored) →
   `scripts/curriculum/publish-static-materials.mjs` → Supabase `static-assets` bucket.
   **A PDF sitting in `public/` is not live until that sync runs.**
7. **Where it appears on the classroom page** — `app/montree/library/dark-phonics/page.tsx`
   is now a thin wrapper; the body is
   `components/montree/dark-phonics/DarkPhonicsClassroom.tsx`. **PROPOSED:** a new
   **"Digraphs"** section rendered AFTER the 49 lessons, its own list keyed by sound rather
   than by lesson number, so the `displayN(n) = n − 4` lesson machinery is left untouched.
   Also add each slug to the `L1_PRINT` / `L2_PRINT` / works sets in that file. **Not
   approved — Tredoux's call.**

---

## 5. DIGITAL WORKS

**Tredoux's ruling: IDENTICAL to the existing V2 Shelf digital works.** Control card,
page-flip book, Works 1–4 scatter/drag, finger tracing — no new interaction is invented
for this series. It is the same shelf, fed by digraph books.

The code, for reference:

- `lib/montree/dark-phonics/v2-shelf/{books,works,pile,strokes,tracing-book,audio}.ts`
- `components/montree/dark-phonics-live/v2-shelf/` — `ShelfPlayer`, `ControlCard`,
  `BookReader`/`FlipBookCore`, `MatchWork`, `work-engine`, `TraceBook`.
- **`books.ts` DERIVES the reader from `getBookWorks()`** — the book text is deliberately
  NOT re-ported into TypeScript. One book text, one place.

**The data shape a book must provide** (`BookWorksLesson`, `lib/montree/dark-phonics/book-works.ts`):

```
lessonNumber, letter, traceTitle, title, bookTitle,
coverImage, videoUrl, videoPosterUrl,
pages[]      { art, sentence }            — every page in order
cast[]       { id, label, sentence, image } — the FOUR picture cards
matchOrder[] — a derangement of cast ids (no card faces its twin)
rounds[]     { sentence, answerId, candidateIds[] }
questions[]  { question, answer, image }  — six, rhythm Y N Y N N Y
script[]     — the teacher's stage directions (the ONE hand-written field)
endingImage, endingLine, goodbyeLine
```

**Registration is one line per book:** an entry keyed by number in
`BOOK_WORKS_GENERATED_LESSONS` (`lib/montree/dark-phonics/book-works-lessons.ts`, plus the
`.second-language.ts` twin); `BOOK_WORKS_LESSON_NUMBERS` is derived from that record and
everything else (the `/dark-phonics/l/[n]` route, the OG image, the shelf strip) follows.

**Uncertain, decide before building:**
- `lessonNumber` is the DISPLAY lesson number 1–49 and `letter` drives the tracing step. A
  digraph book has **no single letter and no lesson slot**. Either the keys extend past 49
  into a digraph range, or a parallel record/namespace is added. **PROPOSED**, needs a call.
- `videoUrl`/`videoPosterUrl` are derived from the lesson number via `lessonVideoUrl()`.
  **There are no digraph songs in the `dark-phonics` bucket** — step 0 needs either a new
  song or a documented skip.
- `letter` also feeds `traceTitle`/strokes — tracing a two-letter digraph is untested.

---

## 6. THE CLASSROOM MATERIALS ALREADY LIVE

Full detail: `docs/handoffs/HANDOFF_2026-09-19_DIGRAPH_BLEND_SOUND_BOOK.md`.

- **Sheets 25 / 26 / 27** — digraph mats + controls + green tabs, blend mats + controls +
  blue tabs, and the 48-page sound book. **Shelf hub print version 16**
  (`public/dark-phonics-shelves.html`, every `?v=16`).
- **The art rule is relaxed** (Tredoux, 2026-09-19): *a picture is usable if a three-year-old
  would name it with the word.* Photographs, scenes, illustrations and the circle-time cards
  all pass; circle-time cards are preferred. Only the unmistakable-failure is refused.
- **Colour and adjective words are dropped** from every mat and are not reported as missing art.
- **The two mat rules, never to regress:** (1) **THE RULE IS UNBROKEN** — one continuous
  tier-colour rule from start tick to end of row, never segmented at a gap; the tab lies ON
  the rule. (2) **IN-WORD TABS** — the tab replaces the digraph's glyphs in place, with
  `LEAD_IN` = 1.5 mm from the start tick and `TAB_PLAY` = 0.6 mm of play in the hole. The
  mat reads `stick`, never `st i ck`; the control takes no insertion at all.
- Always rebuild with `--force` after new art lands (cached crop tiles).

---

## 7. BOOK TRACKER

One row per book. "published" = synced to the Supabase `static-assets` bucket via
`publish-static-materials.mjs` — a PDF in `public/` is NOT published.

| book | slug | text locked | art filed | A5 built | works built | wired | published |
|---|---|---|---|---|---|---|---|
| Book 1 — sh | `the-ship` | yes (2026-09-19, 6 pages) | yes — `phonics-images/dark-phonics-digraphs/the-ship/` (cover + p1-fish … p6-potato) | yes — 20 pages / 5 sheets, `public/dark-phonics-books/print/the-ship-A5-{reading,booklet-print}.pdf` + `covers/the-ship.png` | no | no | no — batched upload, Tredoux's call |
| Book 2 — ch | `the-cheese` | yes (2026-09-19, 6 pages) | yes — `phonics-images/dark-phonics-digraphs/the-cheese/` (cover + p1-chest … p6-potato) | yes — 20 pages / 5 sheets, `public/dark-phonics-books/print/the-cheese-A5-{reading,booklet-print}.pdf` + `covers/the-cheese.png` | no | no | no — batched upload, Tredoux's call |

---

## 8. STATUS + NEXT

**Status (2026-09-19):** Book 1 `the-ship` text locked, art filed, book def added to
`books_def.py` (`SHIP_SH` path constant, `sound='sh'` — no builder change needed, the
`sound` field is a free string, not a single letter), A5 pair + cover built into
`public/`. NOT wired to the library page and NOT published to the bucket — see the
BOOK TRACKER above. Book 2 `the-cheese` (ch) same state. Books 3+ not started.

**Next action — Tredoux writes Book 1 ("sh", `the-ship`) text.** Then, in order:

1. Claude writes the MJ prompt pack for `the-ship` — anchor-prop clause verbatim, test-run
   one page 3× first, prompts delivered in chat.
2. Tredoux rolls, picks, drops winners in `~/Downloads`; agent files them to
   `phonics-images/dark-phonics-digraphs/the-ship/`.
3. Build: `books_def.py` entry → A5 pair → book works → copy to `public/` → publish sync.
4. Wire the page (Digraphs section) and the digital shelf entry once the open questions in
   §5 are answered.

---

## 9. STATUS UPDATE — 2026-09-19 EVENING (Tredoux's rulings)

- Book 1 `the-ship` and Book 2 `the-cheese`: **text locked**, art filed under
  `phonics-images/dark-phonics-digraphs/<slug>/`, A5 pairs built into
  `public/dark-phonics-books/print/`, covers in `covers/`. **NOT wired, NOT published.**
- Proofs + PDFs also live in `~/Desktop/digraphs and blends/`.
- Commits: `278ada3d9` and `60b15281d`.

---

## 10. LOCKED TEXTS (VERBATIM)

**`the-ship`:**

```
1  The fish is on the ship.
2  The sheep is on the ship.
3  The shark is on the ship.
4  The shoe is on the ship.
5  The shop is on the ship.
6  The potato is not on the ship!
```

Page 6: potato flying a yellow helicopter above the ship.

**`the-cheese`:**

```
1  The cheese is in the chest.
2  The cheese is on the chick.
3  The cheese is on the cherry.
4  The cheese is on the chair.
5  The cheese is on the chimp.
6  The cheese is on the potato!
```

Hard cheese wedge on chest/chick/chair/chimp; MELTED cheese on the cherry and on the
surprised potato's head.

---

## 11. WORKFLOW CHANGE — BATCH MODE

**No more one-book-at-a-time.** Next session:

1. Write ALL remaining books' texts with Tredoux (sound by sound, six lines each, one
   sentence a page, sound in every line, potato on page 6).
2. Deliver ALL prompt packs in chat (full prompts in individual code blocks, one per
   page, locked house suffix, anchor/character descriptors verbatim).
3. Tredoux rolls everything, saves winners to `~/Downloads` as `<slug>-cover.png`,
   `<slug>-p1.png` … `<slug>-p6.png`.
4. ONE batch pickup: files all art, builds all A5 pairs, builds book works, wires the
   library page, publishes to the bucket, updates the tracker.

Digital works (identical to V2 Shelf) come AFTER the books.

---

## 12. BOOK 3 — TH (OPEN QUESTION, NOT YET DECIDED)

Word pool given: thumb think thin throw thank three bath teeth math thrush moth sloth
cloth path tooth thick thud thorn throne thief.

- **Decodable now:** thin thick thud bath math moth path cloth thrush sloth.
- **Mat-picture words:** three teeth thumb tooth throw thorn throne.

**Open question for Tredoux:** anchor-prop frame ("The ___ is in the bath") or
travelling-object frame like Book 2 ("The thumb is on the ___").

---

## 13. SERIES RULES CONFIRMED IN PRACTICE

- Text first, Tredoux approves, then prompts.
- Potato page: surprised/delighted expression allowed (exception to the always-happy rule
  elsewhere in the series).
- MJ re-roll notes: potato must be INSIDE vehicles (describe the result state); "shop"
  drifts to "house" unless "shopfront/awning/window of apples" leads the prompt; objects
  default oversized unless "the size of a passenger" is stated.

---

## 14. PROCESS RULES (TREDOUX)

- Fable is director only — Sonnet scouts/ops, Opus builds.
- Context is precious — Tredoux will run the next session on **OPUS**.
- Every agent report terse.
- Everything visual goes through a proof he looks at.
- Nothing is "done" until pushed and, when live, verified.

---

## 15. RESUME PROMPT

```
Dark Phonics Digraphs — resume. Read docs/curriculum/dark-phonics-digraphs/HANDOFF_DARK_PHONICS_DIGRAPHS.md first, then memory /areas/writing-shelf-tray5.md and /areas/montree-dark-phonics.md. Books 1 (the-ship) and 2 (the-cheese) are built and unpublished. We are now writing ALL remaining books' texts first (th next — the open question is in the handoff), then delivering every prompt pack in the chat, then one batch pickup from ~/Downloads. Director only: delegate builds to Opus subagents, scouts/ops to Sonnet; terse reports; git via Desktop Commander. Open with the th word list and the two frame options, and wait for my call.
```
