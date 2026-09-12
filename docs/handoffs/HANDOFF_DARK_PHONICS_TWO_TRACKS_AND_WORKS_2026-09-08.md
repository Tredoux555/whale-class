# HANDOFF — DARK PHONICS: TWO TRACKS + WORKS RULES + FLEET POLISH (2026-09-08)

Consolidates three same-day handoffs/brain keys into one reference:
`HANDOFF_FOUR_WORD_RULE_2026-09-07.md`, `HANDOFF_TWO_TRACKS_2026-09-07.md`,
and the un-handoff'd `CHARACTERS_WORK_FIX_2026_09_08` / `FLEET_POLISH_2026_09_08`
brain keys. Read those for full detail; this is the map.

## 1. THE RULES (Tredoux's, verbatim intent)

- **Four-word rule (second-language track only):** every sentence a child reads
  is ≤ 4 words (`nar` + `text` together; punctuation and the `…` reveal are free;
  `___` counts as a word). Cut order: **(a)** drop the leading article, **(b)** if
  still over, drop the verb — never the subject noun, never collapse `is not`/
  `can not`. Keep the preposition phrase (`Ant in the… pit!`). Model book:
  **the-pit** (`The ant sat in the… pit!` → `Ant in the… pit!`).
- **First-language track** = the original wording, at the original paths,
  **never overwritten**. Both tracks now exist permanently side by side.
- **Works, tracing and paperwork text must match their track's book 1:1** —
  copies of the reader page, never a separate rewrite.
- **The setting (the pit / the mat / the cot / the basin …) is never a
  character and never a row in any work.** `_has_cast_subject` asks
  `characters_of()` directly, so a scene-setter page (`A pit.`, `A basin.`)
  drops out of works 1–5 the same way on both books.
- **Work 1 "Characters" = one thin strip**, single column, cast only:
  p1 blank strip, p2 control on the back (duplex) with each name printed under
  its picture, p3 cut sheet of picture tabs, real characters only. Cast is
  ordered by **first appearance**, and the potato/crew gag is **excluded** in
  every book — the gag lives in the picture, not the cast.
- **Each book's works use ONLY its own art** — borrowing the-pat's cast
  portraits into other books is reverted for good (`PORTRAIT_BOOKS` empty and
  stays empty; "now we have the characters from pat in the pit book" was the
  complaint). `prep_art()` cleans each book's own frames instead (see §3).
- **Every printable carries a PDF Title/Author/Subject** — readers, booklet
  prints, tracing workbooks, paperwork packs, three-part cards. Verified
  1115/1115 non-empty with `pdfinfo`.

## 2. LAYOUT

```
public/dark-phonics-books/print/                      L1  readers + booklet prints
public/dark-phonics-books/covers/                      L1  (shared art, both tracks)
public/dark-phonics-books/works/<slug>/                L1  works PDFs
public/dark-phonics-books/second-language/print/       L2  siblings of the above
public/dark-phonics-books/second-language/works/       L2
public/dark-phonics-books/second-language/covers/      L2
public/dark-phonics-materials/<slug>/                  L1  tracing + paperwork
public/dark-phonics-materials/second-language/<slug>/  L2
public/satpin-materials/dp-<slug>/                     L1  4 legacy mirrors
public/satpin-materials/second-language/dp-<slug>/     L2
materials-out/book-works/<slug>/                       L1  works staging (tracked, gitignored dir)
materials-out/book-works-second-language/<slug>/       L2  works staging (not staged/committed)
```

All of `public/dark-phonics-books/`, `public/dark-phonics-materials/`,
`public/satpin-materials/` are gitignored — PDFs are **published to Supabase's
`static-assets` bucket**, never committed.

Library page `app/montree/library/dark-phonics/page.tsx`: the Letter card sits
at the top of the Printables row on both tracks; beneath it are **two
collapsible tabs, "First language" / "Second language"**, closed by default,
each rendering the same pill set (Book · Tracing · Paperwork · Work 1–5 + Work
4 v2) with that track's paths. Availability is per-pill-per-track via six sets
(`L1_PRINT`/`L2_PRINT`, `L1_TRACING`/`L2_TRACING`, `PAPERWORK`/`WORKS`); a book
with nothing on a track greys the whole tab "· coming soon".

`STORYBOOK_PRINT_VERSION` is the page's cache-buster (`?v=N` on every printable
href). It was **30** after the two-tracks ship, **31** after the Characters
cast overrides, **33** after the potato-art fix, and **36** after fleet polish
(2026-09-08, commit `02e300fd8`) — the version this handoff describes. (It has
been bumped further since, to 38, by unrelated later A5-works and cut-sheet
work; bump it again on any future printable change.)

## 3. PIPELINE

Source of truth for the second-language rewrite:
`scripts/curriculum/dark-phonics-storybooks/four_word.py` — `track()`,
`transform_sentence/transform_book/transform_reader_entry/transform_dp_cfg`,
`sync_dp_cfg`, `reader_pages`, `patch_readers_module`, `out_root`, and
`SKIP_SLUGS` (the-vest/-swim/-yam/-zip/-quilt). It carries the 428 hand-ruled
whole-sentence mappings frozen by the four-word pass.

Every generator takes `--track second-language` (or `DP_TRACK=second-language`
env) and picks its own output root from `four_word.out_root()`; the default
(no flag) is first-language. Rebuild order, per track:

```bash
cd <repo>; export REPO=$PWD
export MONTREE_CANVAS_FONTS=$REPO/scripts/curriculum/flashcards/canvas-fonts
export MONTREE_REPO_ROOT=$REPO

cd scripts/curriculum/dark-phonics-storybooks && python3 build_a5_readers.py [--track second-language]
cd ../flashcards && MONTREE_FLASHCARDS_DIR=$PWD python3 _patched_build.py [--track second-language] <letter-book slugs>
MONTREE_FLASHCARDS_DIR=$PWD python3 _patched_trace.py [--track second-language] <letter-book + pattern slugs>
python3 build_tracing_booklet.py --readers --all [--track second-language]
cd ../dark-phonics-storybooks && python3 _patched_a5_tracing.py --all [--track second-language]
cd ../book-works && python3 build_book_works.py [--track second-language] <31 slugs>
#   -> cp materials-out/book-works{,-second-language}/<slug>/*.pdf public/dark-phonics-books/{,second-language/}works/<slug>/
cd ../satpin-paperwork && python3 build_paperwork.py [--track second-language] --letter dp-<stem> \
      --repo-root $REPO --out $REPO/public/dark-phonics-materials/[second-language/]<stem>
```

**Works internals** (`scripts/curriculum/book-works/build_book_works.py`):
- `characters_of()` is the single source for cast: (1) chant/recap pages out;
  (2) gag pages out (potato/crew — matched on the printed lead-in *and* on the
  art file's own name, since L2 rewords the lead-in); (3) subject = first
  lead-in word that isn't an article/connective/size adjective, falling back
  to the shout word; (4) scene-setters out once ≥2 pages have a real subject.
  Recurrence then decides protagonist vs. ensemble cast. The digital twin
  `lib/montree/dark-phonics/v2-shelf/works.ts` `charactersForBook()` runs the
  identical four tests.
- `CHARACTER_OVERRIDES` (per-slug cast list, for books the rule alone gets
  wrong): `{'big-splash': ['cat'], 'jump-in-the-sand': ['pup'],
  'this-and-that': ['moth'], 'mud-pup': ['pup']}`.
- `prep_art(path)`: crops a works picture to its drawing, floods the
  paper-tone background to pure white from the border inward, centres it on a
  white square, **no resampling** (canvas sized to the crop). Cached under
  `_prepped/` keyed by prep version + source mtime. Fixes the "borrowed
  portrait" tiles without borrowing anything.
- `works-crops.json`: **58 hand-picked crop boxes** across 9 scene-drawn
  letter books (the-rat 7, the-cot 7, the-sat 6, the-nap 6, the-mud 7, the-mat
  6, the-hot 7, the-dog 7, the-dig 5) chosen by eye so the character, not the
  hole/mat/mud it sits in, is the subject; the-pit's 7 are untouched, 4 tiles
  stay AUTO where the character already fills the frame.
- `_has_cast_subject`: asks `characters_of()` directly rather than re-deriving
  a subject — this is what drops `the-spat`'s "A basin." from works the same
  way `the-pit`'s "A pit." already was.

`publish-static-materials.mjs` `DEFAULT_DIRS`: `public/dark-phonics-materials`
(both tracks, `second-language/` is a subdir), `public/dark-phonics-books/works`
(L1), `public/dark-phonics-books/second-language` (L2 print+works+covers).
`public/dark-phonics-books/print` (L1 readers) is **not** a default dir — name
it explicitly (`--dir public/dark-phonics-books/print`). Uploads `*.pdf` only.
Needs `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from
`.env.local`.

**Media proxy edge TTL** (`app/api/montree/media/proxy/[...path]/route.ts`,
commit `99a84b29d`): the `static-assets` bucket used the same 7-day Cloudflare
edge cache as every other bucket, keyed by path — but printables are
republished **in place, under the same path**, and the page's `?v=` only
changes on a Railway deploy. A fixed PDF stayed invisible behind the stale
edge copy for up to 7 days. Fix: `static-assets` alone now gets
`Cache-Control: public, max-age=0, s-maxage=300, must-revalidate` +
`CDN-Cache-Control: public, max-age=300, must-revalidate` — a **5-minute**
edge TTL, so a republish is visible everywhere within 5 minutes with no
deploy required. Every other bucket keeps the 24h/7d headers.

## 4. VERIFY CHECKLIST (run after any publish)

1. **Railway deploy = SUCCESS** for the commit that touched the page (only
   page code needs a deploy; PDFs are Supabase-only). Fleet polish deployed as
   `0ece36ec`.
2. **JS bundle emits a new `?v=`** — confirm `STORYBOOK_PRINT_VERSION` in the
   deployed page bumped past the previous value.
3. **curl the exact page href**, not a guessed path — the page constructs
   `printPdf(path) = \`${path}?v=${STORYBOOK_PRINT_VERSION}\``; copy the real
   href it renders.
4. `pdfinfo <file> | grep Title` — non-empty on every printable.
5. **Works first row = cast, in first-appearance order**, and no setting word
   anywhere in the control page text (`pdftotext` the control page).
6. `python3 scripts/curriculum/dark-phonics-storybooks/two_track_audit.py` —
   **0 problems**: 0 sentences over 4 words, 0 paperwork/dp mismatches, 0
   works-row/work2 mismatches, both tracks.

Fleet-polish live numbers (2026-09-08): 778 hrefs both tracks @ `?v=36` → 778
HTTP 2xx, 778 non-empty Titles; scene-row absence checked on 372 live works
PDFs; first-row-present checked on 248 sentence works PDFs; 0 failures.

## 5. COMMITS, IN ORDER

| commit | one-line purpose |
|---|---|
| `4a6107d20` | Two tracks shipped: First language (original) + Second language (≤4-word), per-book tabs |
| `4e95c2000` | Characters work = single strip, cast only (no setting objects, no potato), both tracks + digital |
| `72e9541be` | Characters cast overrides for 5 pattern books (`CHARACTER_OVERRIDES`); print v31 |
| `8f2d33345` | sat-cast portraits borrowed onto 9 more letter books' works (later reverted) |
| `e15952009` | Potato gag rows keep their own art, not a cast portrait; print v33 |
| `202e9076a` | Works use each book's OWN art again — portrait borrowing removed for good; `prep_art()` added |
| `e14940380` | the-pit works: no scene row, PDF metadata titles, hand-tuned character crops |
| `99a84b29d` | Media proxy: 5-minute edge TTL for `static-assets` so a republish is visible without a deploy |
| `02e300fd8` | Fleet polish — hand-tuned crops for 9 scene books, PDF titles on every printable, scene rows out of all works; print v36 |

(`8f2d33345` was an intermediate step later reverted by `202e9076a` — kept in
the log for the full story of why portrait-borrowing is banned.)

## 6. OPEN ITEMS

- **Digital lessons on `/parents` are still first-language only.**
  `lib/montree/dark-phonics/book-works-lessons.second-language.ts` is
  generated (170 sentences, 0 unresolved, via `sync_lessons.py --track
  second-language`) but **nothing imports it** — Tredoux has not decided
  whether the digital side gets two tracks.
- **No second-language reader for the-vest / the-swim / the-yam / the-zip /
  the-quilt** — no reader art exists yet for these five. Nothing of theirs
  (dp json, shim, lesson data) has been touched by either pass.
  **MJ (art generation) is run by Tredoux himself, never by an agent.**
- **fox-in-a-box is two books under one slug**: works 2–5 build from the
  five-page easy reader in `easy-readers-manifest-v2.json`, but work 1 (the
  strip) reads the pattern reader (`dp-fox-in-a-box.json`, "A fox in a box. /
  An ox in a box. / A xylophone in a box.") because that's the reader actually
  printed and shipped. Pre-existing source mismatch, flagged not fixed.
- **7 full-bleed tiles deliberately keep a tinted background** (not
  white-flooded by `prep_art()`): the-pit's star, the-cot's ant, the-nap's
  apple + star, the-mat's sun + snake, the-dog's apple.
- **big-splash / jump-in-the-sand / this-and-that open on "Splash!" / "Jump!"
  / "This."** — by design. Easy readers have no cast "taking a turn," so the
  protagonist rule falls back to the shout word; this is a known, accepted
  edge case, not a bug (also true of `the-jump`/`the-lost`'s digital-only
  lessons picking up the *setting* as a character — trampoline, fog — flagged
  for Tredoux's eye, not fixed).
- **`_to_delete/` folders need manual deletion.** The Cowork device mount
  refuses `os.remove()`/`rm` on intermediate files (tracing proofs, stale git
  locks, preview scratch); builders move them to `_to_delete/*` instead of
  deleting. Desktop Commander (direct Mac shell) can remove them; the sandboxed
  mount cannot.
- **Repo needs a `git gc`.** Pack is 6.64 GiB with `tmp_pack_*`/`tmp_idx_*`
  garbage in `.git/objects/pack/`, which made `git push` take 30+ minutes for
  the two-tracks commit alone.

## 7. LESSON LEARNED

**Three consecutive "no change visible" republishes of the-pit's works (2026-
09-08) were not a build problem — they were a failed Railway deploy plus a
7-day Cloudflare edge cache holding a stale copy under an unchanged `?v` key.**
The PDF was correct on Supabase every time; the live URL just kept serving the
old edge copy. Fix was two-fold: (1) don't trust "I republished it," confirm
the **Railway deploy status is SUCCESS** for any page-code change; (2) don't
trust the local file, **curl the exact live href the page renders** (with its
current `?v=`) and `pdftotext`/`pdfinfo` *that* response — never assume a
publish is live because the source file changed. This is why the media-proxy
TTL fix (`99a84b29d`) exists, and why the verify checklist in §4 leads with
"confirm the deploy," not "confirm the file."
