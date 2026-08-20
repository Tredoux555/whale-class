# Dark Phonics — Weekend Master Handoff (Finish-Line Monster Session)

Execution order. Each numbered section is a gate — do not start the next until the current one's exit condition is met.

---

## 1. Current state (verified, all committed/live as of 2026-08-20)

- **App:** v2.1 interactive lesson player, lessons 1–4 fully playable (sounds s/a/t/p), lessons 5–27 shown as locked tiles, 28–49 as a locked group tile. Adversarially audited (fresh-eyes Sonnet, Playwright playthrough, zero console errors). Lives on Desktop.
- **Printables:** all 23 currently-active books' printables fixed and re-audited; 76 PDFs live on montree.xyz, published via the new `scripts/curriculum/publish-static-materials.mjs`. Commits `6e5c1b90a`, `51112a312`.
- **8 new books:** fully designed and approved in `/home/claude/dp/full/KEY-WORD-BOOK-MAP.md`. Their `dp-*.json` data files are built and verified at `/home/claude/dp/bookrun/letters/dp-the-{fast,lost,jump,vest,swim,yam,zip,quilt}.json`. A clean-apply patch, `/home/claude/dp/bookrun/spine/lessons-spine-extension.patch`, is staged but **NOT applied** — applying it before covers exist ships 8 broken images on the public library page (each `books[]` entry hard-references `/dark-phonics-books/covers/<slug>.png`).
- **n=28 (x)** is untouched — keeps `fox-in-a-box`, gets no new book.

---

## 2. Art run

Paste `/home/claude/dp/bookrun/ARTWORK-HANDOFF.md` into a fresh Sonnet chat (Midjourney access, zero other context needed). Output: 80 PNGs (10 per book × 8 books).

Land files at:
- `phonics-images/dark-phonics-books/<slug>/p1..p9,cover.png` — one folder per book.
- Copy `cover.png` for each book to `public/dark-phonics-books/covers/<slug>.png` — the library page reads covers from here, not from `phonics-images`.

Exit condition: all 80 files present, correct filenames (cross-check against the `_notes.conventions` field of each `dp-*.json`, which spells out the exact p1 frame filename — it varies per book: `p1-fan`, `p1-fog`, `p1-log`, `p1-vest`, `p1-tub`, `p1-yam`, `p1-bug`, `p1-quilt`).

---

## 3. Wire the spine

1. From repo root: `git apply --check scripts/curriculum/satpin-paperwork/spine/lessons-spine-extension.patch && git apply scripts/curriculum/satpin-paperwork/spine/lessons-spine-extension.patch` — see `/home/claude/dp/bookrun/spine/README-apply.md` for exact preconditions (base = `lib/montree/dark-phonics/lessons.ts`, 174 lines as of 2026-08-20).
2. The patch extends `decodable` at n=23,24,25,26,27,29,30,31 with each book's NEW words (adds, never replaces existing words) and adds one `books[]` entry per lesson, each with `materials: false` (no paperwork pack required yet — that's step 4).
3. `tsc --noEmit --strict` — must be clean.
4. Copy `letters/dp-*.json` into `scripts/curriculum/satpin-paperwork/letters/`, add the eight `shims/dp-<slug>.py` (mirror an existing shim, e.g. `dp-the-bug.py`).
5. Regenerate paperwork (`build_paperwork.py`) and the app content bundle (`build_content.py`), then run `python3 /home/claude/dp/bookrun/verify.py` and confirm 8× PASS.
6. Commit.

---

## 4. Build printables for the 8 books

Generators just got fixed this weekend (see the audit doc, section 8 below) — trust them now:
- `scripts/curriculum/satpin-paperwork/build_paperwork.py`
- `scripts/curriculum/satpin-paperwork/build_tracing.py`
- `scripts/curriculum/satpin-paperwork/book-works/build_book_works.py`

The new `dp-*.json` files are already in `scripts/curriculum/satpin-paperwork/letters/` after the step-3 commit, so these generators pick the 8 books up automatically — no per-book flag needed. Run all three, then publish:

```
node scripts/curriculum/publish-static-materials.mjs
```

This is the new sync script (bucket `static-assets`, 1:1 paths) that replaced the old publish path — same one used for the 76 PDFs already live. Confirm the 8 new books' packs land at the same bucket paths as the existing 23.

---

## 5. Book PDFs (A5 reading + booklet pairs)

Builder: `scripts/curriculum/dark-phonics-storybooks/build_a5_readers.py`.

**Important — this script is NOT purely manifest-driven.** It reads `manifest.json` for `num, letter, slug, title, pages[{key,text}]` (art path = `phonics-images/dark-phonics-books/<slug>/<page-key>.png`), but the per-book cover title lines and page-by-page text splits are hand-authored in two Python dicts inside the script itself: `COVERS[slug]` (title lines, accent color, title size, oral-reading word list) and `SPLITS[slug]` (per-page narration/shout text split + font size, one tuple per manifest page, count MUST match page count exactly or it raises `SystemExit`).

To add the 8 new books:
1. Add 8 entries to `manifest.json`'s `books` list — `num` continuing the sequence (these are letter-gap books at n=23–31, so pick numbering consistent with existing convention), `letter`, `slug`, `title`, and `pages[]` with `key` + `text` for all 9 pages in file order (`p1-<frame>`, `p2-ant`..`p7-cat` per that book's 4 built cast pages only — do NOT list cast pages that weren't generated for that book, see the per-book "Note" lines in ARTWORK-HANDOFF.md), `p8-recap`, `p9-potato`. `text` = the exact sentence from the corresponding `dp-*.json`'s `_notes.recap`/`_notes.frame`/`_notes.potato` fields or `pages[].sentence`.
2. Add matching `COVERS[slug]` and `SPLITS[slug]` entries for all 8 slugs, following the existing pattern (e.g. `queen-on-the-quilt`, `zzz-at-the-zoo`) — `SPLITS` needs exactly one tuple per page in that book's `pages[]` list, so 9 tuples per new book (unlike the older 27 books, which top out at 7 pages and have no potato-twist convention besides `snake-in-my-sock`).
3. `python3 scripts/curriculum/dark-phonics-storybooks/build_a5_readers.py` — outputs `<slug>-A5-reading.pdf` and `<slug>-A5-booklet-print.pdf` per book to `public/dark-phonics-books/print/`. The script self-checks that every output PDF exists and is non-empty; a `bad` list at the end means something silently failed.

---

## 6. App burn-in (extend lesson player past lesson 4)

Contract: `/home/claude/dp/full/BUILD-CONTRACT.md` (binding — reread it, it governs pedagogy laws, step templates, and self-verification requirements). Engine: the proven v2.1 template (`/home/claude/dp/full/app/`), do not reinvent renderers.

- Data source: `/home/claude/dp/full/content.json` — needs a refresh (`build_content.py`) once art lands, to fold in the 8 new books' pages/art/decodable words alongside lessons 5–27.
- Same fleet pattern as lessons 1–4: Opus builds, a separate fresh-eyes Sonnet audits (Playwright playthrough + screenshot eyeball + data-join verification, per the contract's "Mandatory self-verification" section).
- Pedagogy laws to hold: three-period structure, sounds-not-letter-names, decodability discipline (a word renders RED only if it's in `cumulativeDecodable`/`cumulativeHeartWords` at that lesson — compute, don't hardcode), no scores/timers/failure states, cumulative ledger step before the star.

---

## 7. Songs

- Lessons 19–27 (the 8 new letter lessons, minus n=28 which has no new book) already HAVE songs live in the bucket — nothing to produce here.
- **Gap:** lesson-05 (sound `s`) song is still missing locally; v1/v2.1's remote-proxy-with-graceful-fallback behavior covers this for now, but it should be sourced before final ship.
- **Word-recordings wishlist** (for the ledger step's word-audio, falls back to `speechSynthesis` if missing): `sat`, `spat` (existing gap) + the 8 new key words — `fast, lost, jump, vest, swim, yam, zips, quilt`.

---

## 8. Open decisions parked for Tredoux

1. **hen-in-bed "my"** — the reader's payoff line "A hen in my bed!" uses `my`, which isn't decodable at its gate (`/y/` untaught until lesson 25, `my` not a heart word at lesson 18). Call: add `my` as a heart word by lesson 18, or reword the line.
2. **Retired pattern-book packs** — 9 directories + `cvc-sentence-sheets` sit inert in `dark-phonics-materials`, photo-style, unlinked from anything active. Consider archiving so they stop confusing future bulk operations.
3. **Duplex print-packs** — spec exists in `/home/claude/dp/full/DARK-PHONICS-PRINTABLES-AUDIT.md`'s fix plan (step 5: "then the duplex print-packs get built on top of clean sources"); build after the new books land and the printable fixes below are confirmed clean.
4. **dp-json week-field drift** — `the-egg` through `the-bug` are one week low in their `week` field; the readers themselves are correct. Cleanup needed in the JSON metadata only.
5. **Anteater card watermark cleanup** — flagged for cleanup, no further detail captured yet; check `ant-on-my-apple` three-part cards when doing the H1–H4 fixes below.

### Also still open from the printables audit (fix before/alongside step 4 above, per the audit's own fix plan)
- **C1** — match-page images swapped against sentences in 6 books (the-sad, the-dig, the-dog, the-cot, the-kit, the-egg), one generator bug, same permutation every time.
- **C2** — tracing workbooks losing the "NOW YOU" independent-writing block in 12+ books (layout-overflow bug).
- **C3** — works missing entirely for `snake-in-my-sock` and `ant-on-my-apple`.
- **C4** — the-pit works capitalize "Sat" mid-sentence across all 4 work PDFs.
- **C5** — same issue as open decision 1 above (hen-in-bed "my").
- **H1–H4** — stale three-part-card casts (sloth cut from snake-in-my-sock, ambulance dropped from ant-on-my-apple), a broken embedded image on 3 cards, photo-realistic style drift on 5 books' three-part cards (should be illustration, per the series' own style rule), and an orphaned sloth image on the-rat p2.
- **M1** — "Read the words. Draw a line to the picture." instruction over-claims decodability series-wide; one wording fix in the generator ("Match the words to the picture") resolves it everywhere.
- Fix plan owner: Opus fixes generators → regenerate + rebuild missing/affected packs → fresh-Sonnet re-audit each regenerated PDF against the audit checklist before it lands → then duplex print-packs.

---

## APP ⟷ BOOKS — SINGLE SOURCE OF TRUTH

**The chain (law):** `lib/montree/dark-phonics/lessons.ts` + `scripts/curriculum/satpin-paperwork/letters/dp-*.json` are the ONLY content sources → extraction produces `/home/claude/dp/full/content.json` (regenerate via `build_content.py` after the spine patch + new dp-jsons land, step 3 above) → the app's `build2.py` consumes `content.json` to emit the shipped HTML. Nobody hand-edits app content directly. If the app shows something wrong, fix `lessons.ts` or the relevant `dp-*.json` and rerun the chain — never patch the built HTML. Locked tiles, ledger words, build words, and red/black decodability all derive automatically from cumulative `decodable`/`heartWords`. Net effect: once step 3 (spine) and step 6 (content.json refresh) rerun, the 8 new books appear in the app with ZERO app-side content authoring.

**Live app copy moved:** `/Users/tredouxwillemse/Desktop/APPS/dark-phonics-lesson-player-v2.html` (no longer Desktop root) — all future pushes go there.

**Two BUILD-CONTRACT.md amendments** (append to `/home/claude/dp/full/BUILD-CONTRACT.md`, the 8 new books require both):
1. **10-word sentence handling** — sentence-builder tiles and read-step model strip must wrap cleanly at up to 10 words (the z and qu books' cast pages reach 10 words); test wrapping at both 1180×820 and 820×1180.
2. **The fully-red page** — when a read-step page is 100% child-readable (computed from `cumulativeDecodable`, not hardcoded; first occurrence is `the-zip` p1, "A bug zips up a big red bag!"), the app must detect it and trigger a distinct, bigger celebration than the normal page-complete state, with a teacher-strip line telling the teacher this is the arc's climax — the child just read a whole page alone.
