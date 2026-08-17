# Grace & Courtesy Book Series — Canonical Handoff

**This file is LIVING.** Every session that ships a book updates the status table
and the "NEXT" marker in the SAME commit that ships the book. Do not let this
document drift from the live page — if you build a book, you edit this file too.

Read this file before touching anything under `app/montree/library/grace-courtesy/`,
`scripts/curriculum/grace-courtesy-books/`, `scripts/curriculum/upload-grace-courtesy-book-art.mjs`,
`phonics-images/grace-courtesy-books/`, or `public/grace-courtesy-books/`.

---

## 1. What this is

A sibling series to Dark Phonics: same card-per-lesson shape, different subject.
Dark Phonics teaches a SOUND; Grace & Courtesy teaches a RULE — one rule, a
one-line WHY, the cast who learn it the hard way, a song, and a storybook.
Public page, no auth, hardcoded English (same sanctioned i18n exception as
Dark Phonics / SATPIN): `app/montree/library/grace-courtesy/page.tsx`.

Verified live as of 2026-08-17, commit `04c397cf7`.

## 2. Status table — all 20 books

Numbering starts at 1 and is shown as-is (unlike Dark Phonics' n−4 offset).
Slugs are the `book.slug` value used everywhere (print PDFs, cover, Picture
Bank tag suffix). "Song source" reflects what's ACTUALLY verified live in the
`grace-courtesy` Supabase bucket today (checked via `HEAD` on the media proxy),
not what the planning doc merely describes.

| n | Title | Slug | Song source | State |
|---|-------|------|-------------|-------|
| 1 | Walking Feet | `walking-feet` | Live in bucket (`songs/lesson-01.mp3`, 200) | **SHIPPED** |
| 2 | Indoor Voice | `indoor-voice` | Live in bucket (`songs/lesson-02.mp3`, 200) | **SHIPPED** |
| 3 | Gentle Hands | `gentle-hands` | Live in bucket (`songs/lesson-03.mp3`, 200) | **SHIPPED** |
| 4 | Wash Your Hands | `wash-your-hands` | Lyrics written (Jul-16 doc, "Day 5 — Wash, Wash, Wash") — mp3 **NOT yet produced/uploaded** (verified 502 at `songs/lesson-04.mp3` on 2026-08-17) | **NEXT — art done, song pending** |
| 5 | Roll the Mat | `roll-the-mat` | Lyrics written (Day 6 — "Roll the Mat") — mp3 not yet produced | planned |
| 6 | Push In Your Chair | `push-in-your-chair` | Lyrics written (Day 7 — "Push In Your Chair") — mp3 not yet produced | planned |
| 7 | May I Watch? | `may-i-watch` | Lyrics written (Day 8 — "May I Watch?") — mp3 not yet produced | planned |
| 8 | Everything Has a Home | `everything-has-a-home` | Lyrics written (Day 9 — "Everything Has a Home") — mp3 not yet produced | planned |
| 9 | Hello, Hello! | `hello-hello` | Lyrics written (Day 1 — "Hello, Hello!") — mp3 not yet produced | planned |
| 10 | Please and Thank You | `please-and-thank-you` | Needs NEW lyrics (Suno, locked style v2) | planned |
| 11 | My Turn, Your Turn | `my-turn-your-turn` | Needs NEW lyrics | planned |
| 12 | Excuse Me | `excuse-me` | Needs NEW lyrics | planned |
| 13 | Kind Words | `kind-words` | Needs NEW lyrics | planned |
| 14 | Helping Hands | `helping-hands` | Needs NEW lyrics | planned |
| 15 | Sorry | `sorry` | Needs NEW lyrics | planned |
| 16 | Cover Your Cough | `cover-your-cough` | Needs NEW lyrics | planned |
| 17 | Line Up | `line-up` | Needs NEW lyrics | planned |
| 18 | Walk Around the Mat | `walk-around-the-mat` | Needs NEW lyrics | planned |
| 19 | Careful Carrying | `careful-carrying` | Needs NEW lyrics | planned |
| 20 | The Whale Class Way | `the-whale-class-way` | Lyrics written (Day 10 — recap anthem, ALL rules, one line each) — mp3 not yet produced | planned (finale) |

**Correction to a common misconception:** the Jul-16 song-cycle doc
(`docs/curriculum/GRACE_AND_COURTESY_SONGS_JUL16.md`) describes assets landing
at `~/Desktop/English Curriculum 2026/Grace and Courtesy/Day NN/` on the Mac —
**that folder does not currently exist on disk** (checked 2026-08-17; neither
does `~/Desktop/Music Videos/`). Whatever raw Suno takes were produced for
Days 1/5–10 are not at that path today — they may be archived elsewhere, or
may never have been generated at all (only D1–D4 have confirmed live mp3s,
and D1–D4 map to books 9/1/2/3, of which only 1/2/3 are shipped). **Treat the
Jul-16 doc as the LYRICS + STYLE source, not as proof a produced mp3 exists.**
Always verify with a live `HEAD` request before assuming a song is ready to
wire in:
```
curl -sI "https://montree.xyz/api/montree/media/proxy/songs/lesson-NN.mp3?bucket=grace-courtesy"
```
200 = present. 502 = not uploaded yet.

## 2b. Book 4 (Wash Your Hands) — in-progress status (2026-08-17)

Art side of the per-book recipe (§4) is done:

- MJ prompt pack delivered in chat and run by Tredoux (MJ v8.2, no `--cref`/`--oref`).
- 8 winners filed at `phonics-images/grace-courtesy-books/wash-your-hands/` (`page-01-cover.png` … `page-08.png`).
- `BOOKS` entry added to `scripts/curriculum/grace-courtesy-books/build_a5_readers.py`
  (`OLIVE` accent, nudged toward `page.tsx` `PALETTE[3]`).
- `wash-your-hands-A5-reading.pdf` + `wash-your-hands-A5-booklet-print.pdf` built and
  eyeballed page-by-page (both the reading order and the booklet imposition) — clean.
- Cover copied to `public/grace-courtesy-books/covers/wash-your-hands.png`.
- `KEY_MAP['wash-your-hands']` added to `scripts/curriculum/upload-grace-courtesy-book-art.mjs`;
  all 8 pages ingested into the Picture Bank (verified via dry run, then live run — 8
  uploaded, 0 failures).

**Still blocking ship (do NOT move this book from `UPCOMING` to `RAW` until both are done):**

1. Song mp3 — lyrics exist (Day 5, "Wash, Wash, Wash" in
   `GRACE_AND_COURTESY_SONGS_JUL16.md`) but no take has been produced in Suno yet.
   Generate with the locked Suno style v2 (§5.2), pick a winner, then upload to the
   `grace-courtesy` Supabase bucket at `songs/lesson-04.mp3` via the dashboard Storage UI
   (no upload script exists for this — see §4 step 9). Confirmed still 502 as of
   2026-08-17 09:54 UTC.
2. Once the song is live, finish recipe steps 11-15: move the `UPCOMING` entry to a real
   `RawLesson` in `RAW` (`page.tsx`), scoped typecheck, update this table's row 4 to
   `SHIPPED`, commit, verify live.

## 2c. Founder override (2026-08-17): Book 5 art prep started early

Standing rule in §3 is "one book at a time" -- don't batch-author books
5-20 ahead of the founder's go-ahead on the current book. Tredoux
explicitly authorized starting Book 5 (Roll the Mat) art prep now, in
parallel with Book 4's song still being pending (see §2b) -- this is a
deliberate, founder-approved exception, not a drift from the rule. Book 4
still does not ship (UPCOMING -> RAW) until its song is live; Book 5
likewise won't ship until both its song and storybook are real. Do not
treat this as blanket permission to batch further books without asking
again.

## 3. The locked rules

- **Cast:** Cat, Ant, Apple, Star, Snake, Potato — reused verbatim from the
  Dark Phonics "the-sat" book (commit messages for books 1–3 literally say
  "the-sat cast"). Do not invent new characters for this series; new books
  reuse this exact cast with VERBATIM-REPEATED descriptor clauses per
  character, same MJ discipline as Dark Phonics. Pull the exact character
  descriptor text from the most recently shipped G&C book's MJ prompt
  delivery (check chat history / git log around that book's commit) rather
  than re-deriving it from memory each time — consistency across books
  depends on reusing the same words, not just the same idea.
- **Art style:** the locked Dark Phonics pen-and-ink Seuss house style.
  Append this exact suffix to every image prompt (see CLAUDE.md's "Dark
  Phonics — locked Midjourney art style" section for the canonical copy):
  > `, colored hand-drawn pen-and-ink, fine crosshatch, whimsical Dr. Seuss
  > children's-book style, big googly eyes, plain white background. no text,
  > no words, no letters, no numbers, no captions, no speech bubbles, no
  > border, no watermark.`
- **Tredoux runs all MJ prompts himself.** Claude delivers the prompt pack
  IN CHAT (never submits them). Test-run one character page 3× before
  committing to the full 8-page pack, same as every other locked pipeline
  in this repo.
- **One book at a time.** Do not batch-author books 5–20 ahead of Tredoux's
  go-ahead on book 4. The `RAW` array's honesty (the "N books so far" badge)
  depends on it describing only real, produced work.
- **The `UPCOMING` → `RAW` move is mandatory, and is the ONLY way a book
  ships.** `UPCOMING` in `page.tsx` holds founder-approved future titles as
  muted placeholder slots — never real lesson cards, never clickable, no
  art. The moment a book's song + storybook are real, its entry is REMOVED
  from `UPCOMING` and a new full `RawLesson` object is added to `RAW`. Never
  fake an entry in `RAW` to make progress look further along than it is.
- **Why-lines stay short and punchy** — one line, matches the tone of the
  15 existing `UPCOMING` why-lines and the 3 shipped ones ("So we don't
  CRASH.", "So friends can think.", "So friends feel safe.").
- **No i18n keys.** This page is a deliberate hardcoded-English exception,
  same reasoning as Dark Phonics and SATPIN — the content itself IS English.
  Do not add translation keys for anything on this page.
- **House 7-spread book pattern** (from the 3 shipped books' `BOOKS` entries
  in `build_a5_readers.py` — reuse this shape for every new book):
  1. Establish the rule being done correctly, softly (e.g. "Tip, toe. Tip, toe.").
  2. "Here comes Potato! `<breaks the rule>`!"
  3. The consequence — "CRASH!" or equivalent.
  4. "Oh, Potato. `<rule stated as the fix>`."
  5. Correct practice line.
  6. A second positive line, landing the rule.
  7. "Now let's sing it! (Potato sat this one out.)" — hands off to the song.
     (Potato deliberately sits out the song page in all 3 shipped books —
     keep this beat unless there's a strong reason to break it.)

## 4. The per-book recipe

When Tredoux says "build book N", run this checklist top to bottom.

1. **Write the book text.** 7 spreads following the house pattern in §3.
   Keep the cast fixed (Cat, Ant, Apple, Star, Snake, Potato); one line per
   spread, natural spoken rhythm, rule-phrase as the loud/repeated hook.
2. **Deliver the MJ prompt pack in chat.** Cover + 7 page prompts (8 images
   total), verbatim-repeated cast descriptors + the locked suffix from §3.
   Tredoux runs each 3× and picks. Test-run ONE page first if the scene is
   unusual (a new prop/setting the cast hasn't been drawn with before).
3. **File winners** to `phonics-images/grace-courtesy-books/<slug>/`:
   - `page-01-cover.jpg` (or `.png` — the 3 shipped books mix extensions;
     `build_a5_readers.py` reads whatever file the `BOOKS` entry names)
   - `page-02.jpg` … `page-08.jpg` (7 story pages)
   - Optionally a `cover.png` and/or `song-card.png` if produced separately
     (seen in the `walking-feet` folder; not required by the build script).
4. **Add the book's entry to `BOOKS` in
   `scripts/curriculum/grace-courtesy-books/build_a5_readers.py`** — one
   dict, following the 3 existing entries exactly: `num`, `slug`,
   `title_lines`, `title_accent`, `title_size` (44 for all 3 so far),
   `band_text` (`'GRACE & COURTESY  ·  RULE N  ·  <TITLE UPPERCASE>'`),
   `band_color` (pick a new RGB tuple near the existing FOREST/MOSS/HONEY
   palette — nudge toward whichever `PALETTE` slot in `page.tsx` the new
   card will land on, `i % 4` where `i` is the book's zero-based index in
   `RAW`, so the print band and the web card eyeball-match, per the HONEY
   comment in the script), `booknum` (`'BOOK FOUR'`, etc.), `cover_art`
   (filename), `why` (string or list of strings — the tail-page payoff
   line), `pages` (list of `(text, art_filename)` tuples for the 7 spreads).
5. **Run the build:**
   ```
   cd "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree"
   python3 scripts/curriculum/grace-courtesy-books/build_a5_readers.py
   ```
   This rebuilds ALL books in `BOOKS` (idempotent for the existing ones) and
   writes `<slug>-A5-reading.pdf` + `<slug>-A5-booklet-print.pdf` to
   `public/grace-courtesy-books/print/`. It hard-fails if any output PDF is
   empty or missing — a clean exit means the PDFs are real.
6. **Copy/confirm the cover** at `public/grace-courtesy-books/covers/<slug>.png`
   (a separate manual step — the build script does not copy the cover into
   `public/`; the 3 shipped books each have one there already).
7. **Rasterize and eyeball every page of both PDFs** before moving on —
   this is a hard requirement across every print pipeline in this repo,
   not optional for this series.
8. **Ingest the 8 page pictures into the Picture Bank:**
   - Add a `KEY_MAP['<slug>']` entry to
     `scripts/curriculum/upload-grace-courtesy-book-art.mjs` — 8 entries,
     `[filename, key]` pairs in reading-page order, `key` shaped like
     `p1-cover`, `p2-<noun>`, … `p8-song` (mirror the 3 existing entries;
     the `keyWord()` helper strips the `pN-` prefix for the tag, so pick a
     short descriptive noun after the dash).
   - Run it (needs `.env.local`, network — Mac only):
     ```
     DRY_RUN=1 node --env-file=.env.local scripts/curriculum/upload-grace-courtesy-book-art.mjs
     node --env-file=.env.local scripts/curriculum/upload-grace-courtesy-book-art.mjs
     ```
   - Idempotent — safe to re-run. Tags land as `grace-courtesy-book`,
     `grace-courtesy-book-<slug>`, the key word, `book-page`. This is what
     makes the page's "Book pictures" grid + "Create materials" hand-off work.
9. **Upload the song mp3 + song card png to the `grace-courtesy` Supabase
   bucket.** There is no checked-in upload script for this (checked — none
   exists for either Grace & Courtesy or Dark Phonics songs); the historical
   `publish-grace-courtesy-book1.mjs` script that DID write to this bucket
   was deliberately removed in commit `b889a8565` once the storybook moved to
   the static-PDF pattern, and its commit message notes song + song card were
   untouched by that removal — meaning they were always handled separately.
   **Do it via the Supabase dashboard Storage UI**, uploading to:
   - `songs/lesson-NN.mp3` (NN = zero-padded `n`, no offset)
   - `pictures/lesson-NN.png` (optional — the page shows "coming soon" if
     absent; not required to ship the book, but nice to have)
   Confirm afterward with the `curl -sI` check from §2.
10. **Bump cache-busters if replacing an existing file in place.** `page.tsx`
    top-of-file constants:
    - `SONG_VERSION` — bump if you overwrite an already-uploaded
      `songs/lesson-NN.mp3` (new books don't need this — only re-recordings).
    - `STORYBOOK_PRINT_VERSION` — bump if you overwrite an existing book's
      print PDFs (again, new books don't need this).
    A brand-new book number needs neither bump — the URLs are new, so
    there's nothing stale to bust.
11. **Move the entry from `UPCOMING` to `RAW` in `page.tsx`.** Delete the
    `{ n, title, why }` line from `UPCOMING`, add a full `RawLesson` object
    to the end of `RAW` (n, title, why, cast, book: {slug, title, cover},
    song: true).
12. **Run a scoped typecheck + lint** on `page.tsx` before committing (the
    base `tsconfig.json`'s `"@/*"` path maps to a nonexistent `./src/*` —
    a scoped tsconfig for this file needs `paths` overridden to map `"@/*"`
    to `"./*"`, same gotcha documented for the Dark Phonics page in
    CLAUDE.md).
13. **Update THIS file's status table** — move the shipped book's row state
    to `SHIPPED (date)`, move `NEXT` to the following book.
14. **Commit + push via Desktop Commander** (never `device_bash` for git on
    this repo — index/HEAD locks can't be unlinked from that bridge). Stage
    only the files this book actually touched: the page, the build script,
    the upload script, the new art in `phonics-images/`, the new print PDFs
    + cover in `public/`, and this handoff file. Never `git add -A`.
15. **Verify live** at `montree.xyz/montree/library/grace-courtesy` — the
    new card renders with a working song player, working print PDF links,
    and a populated book-pictures grid.

## 5. Song production for books 10–19

Books 10–19 have no lyrics yet — the Jul-16 doc's 10-song cycle only covers
what became books 1–4, 9, 20's material (Days 1–10 map onto rules Hello,
Walking Feet, Indoor Voice, Gentle Hands, Wash Your Hands, Roll the Mat, Push
In Your Chair, May I Watch?, Everything Has a Home, and the Whale Class Way
recap — see §2's mapping). For books 10–19:

1. **Write lyrics first**, following the exact song patterns in
   `docs/curriculum/GRACE_AND_COURTESY_SONGS_JUL16.md`: one rule-phrase hook
   repeated at least 3 times (intro whisper → hook 1 → verse → hook 2 →
   breakdown → final big hook), positive Montessori language only ("we do
   X", never "don't do Y"), whole-words (no syllable-splitting), and a
   potato-gag breakdown section for at least 1–2 of these songs (design
   ruling #4 in that doc: the potato is the rule-breaker who learns).
2. **Use the locked Suno style v2, unchanged:**
   `dark trap, 68 bpm, heavy 808 bass, sparse hi-hats, deep whisper-rap verses, kids choir chant on hook, playful spooky, minimal, clean vocals, nursery trap`
3. **Tredoux generates in Suno** (2 takes per song is the house convention
   from the Jul-16 doc), picks the winning take.
4. **Then follow the per-book recipe in §4** starting from step 3 (art) —
   steps 1–2 there are already covered by the lyric-writing above, or fold
   the book-text writing (§4 step 1) in alongside the lyric-writing since
   they're telling the same story.

## 6. Resume prompt

Copy-paste this to start a fresh Sonnet session on the next book:

> Read `docs/curriculum/grace-courtesy/HANDOFF_GRACE_COURTESY_SERIES.md` in
> full. Confirm the current "NEXT" book from its status table (§2), and
> build it end-to-end following the per-book recipe (§4) — or, if it needs
> new lyrics, start with the song-production steps (§5) first. Verify every
> asset with a live HEAD request before wiring it into the page, update the
> handoff's status table in the same commit, and ship via Desktop Commander
> per rule 14.

## 7. Maintenance rule (repeated — this matters)

This file must never fall behind the live page. If you ship a book, edit
this file's status table in the SAME commit. If you discover a fact here is
wrong (a path that's moved, an asset that's since gone live), correct it in
place rather than leaving stale info for the next session to trip over.
