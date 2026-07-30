# Whale / Montree — Latest Handoff

## 🪺 Jul 30 (Cowork) — LETTER N SHIPPED end-to-end (book + paperwork + music video)

Week 6 / letter N, "The Nest is in the Nest" (song hook: nut/net/napkin/nail in the nest,
finale "The NEST is in the nest!"). Art = photo-real Midjourney scenes, the THIRD sanctioned
photo exception (Tredoux-approved this session; CLAUDE.md locked-style section updated).
Scenes filed at `phonics-images/satpin-v2/books/nest/` (permanent, gitignored — Mac only) and
`_incoming-week6-n/book-scenes/`; prompts at `_incoming-week6-n/MJ-PROMPTS-N.md`.

- **Book**: `scripts/curriculum/dark-phonics-readers/bookN.py` (sound mode, mirrors bookI;
  title_size=40; decodable ledger through wk6 = 21 words, heart a · I). PDFs (16pp/4 sheets,
  every page rasterized + eyeballed) → `public/satpin-books/print/the-nest-is-in-the-nest-A5-{reading,booklet-print}.pdf`.
- **Paperwork (locked pipeline)**: `letters/n.json` — seq derangement [3,5,1,2,4], match
  [4,3,5,1,2]; yes/no wrong answers alligator/tiger/taxi/pig/igloo (nothing nest-plausible);
  artDir points at the PERMANENT `phonics-images/satpin-v2/books/nest` (no incoming-tray debt,
  unlike I). Outputs → `public/satpin-materials/n/{paperwork-pack,tracing-workbook,sentence-strips}.pdf`,
  all pages eyeballed clean.
- **Music video**: `~/Downloads/letter-n-the-nest-is-in-the-nest-v1.mp4` (17.1MB, 128s,
  1920x1080, kids theme, crf 32 to fit the 20MB bridge cap). FORCED-ALIGN: 189/189 words, 0
  approx. All 6 images anchored; 10 frame spot-checks passed. ⚠️ Lyric-file lesson: the opening
  letter-card anchor only fires if the phoneme is SPELLED in the lyrics txt — "N... n... n..."
  tokenizes to 1-char tokens the matcher drops, so the txt uses "Nnn... nnn... nnn..." to anchor
  `00-nnn.png` (same mechanism as P's `00-puh.png`/"Puh..."). Follow this for all future letters.
- **satpin page**: N WeekBlock gained a `book:` entry (same shape as P/I, downloads point at the
  two print PDFs, pictureLabels per I convention). Typecheck NOT run this session (shape-identical
  manifest edit).
- **Owed / not done**: book-scene ingest into the Picture Library (P/I had upload scripts — N
  does not yet); music-video slot on the satpin page still "coming soon" (video uploaded to
  bucket `dark-phonics/videos/` by this session's git agent — check its report below/in git log);
  N song mp3 assumed already uploaded by Tredoux via the page drop-zone (player showed a take).

**Second wave (same session, Tredoux-ordered):** (1) 🔒 FORMAT CHANGE to the tracing pipeline —
`build_tracing.py` now emits a separate `build-it-sheet.pdf` (READ IT model + dashed card slots
per sentence, landscape A4, auto-packed — N needed 2pp because slot rows run 264mm) and
`tracing-workbook.pdf` is now the CHILD-WRITTEN TRACE BOOK (cover + 5pp: big scene art ~66×99mm +
the unchanged dotted/arrowed TRACE IT block; no READ IT/BUILD IT on trace pages). Old combined
`workbook_page()` removed; sentence-strips unchanged (pixel-diffed). This supersedes the Jul-29
combined page for all FUTURE letters; P and I are still on the old format — regenerate when
Tredoux approves the new look. (2) satpin page: `WeekBlock.video?` manifest field (wins over the
satpin-media API discovery, which only sees `satpin-videos/<slug>-<ts>.mp4`) — P + N videos wired
from `dark-phonics/videos/`; PaperworkRow gained probed "Build-it sheet · A4"; descriptor now
"Story order · matching · yes/no · build · trace". (3) The 5 N book scenes ingested into the
Picture Library (`montree_photo_bank`, filenames `the-nest-is-in-the-nest-p1..p5-*.jpg`, sentence
labels, cover excluded per I convention) via `_incoming-week6-n/upload-letter-n-book-to-picture-bank.mjs`
(untracked, like week 5's).

**Evening fixes (same session):** build-it sheet rows now carry their scene art (45×30mm top-right
per row, art reused from n.json — still 2pp landscape). The "no picture" sentence strip was a
LABEL CONVENTION violation: photo-bank labels must be lowercase with the leading article dropped
("nut is in the nest"), exactly matching page.tsx pictureLabels — fetchByLabel exact-matches after
the fuzzy query. N's 5 rows relabeled in Supabase (fix-letter-n-labels.mjs, untracked); P/I were
already correct. 🔒 Rule for future letter ingests: label = the page's pictureLabels string,
verbatim.

**Backfill + close-out:**

1. **`build_paperwork.py` shrunk**: yes/no went 2pp/10q → 1pp/5q; the pack is now a clean 3pp
   (story order · match · yes/no). Selection is deterministic — the JSON keeps all 10 items, the
   builder picks yes[0], no[0], yes[1], no[1], yes[2] (3 yes/2 no). `paperwork-pack.pdf` rebuilt
   for p, i, and n.
2. **P + I backfilled** onto the split tracing format (current `build_tracing.py`, no layout
   changes needed): p gets a 2pp build-it-sheet, i gets a 3pp build-it-sheet, both trace books are
   6pp (cover + 5). `sentence-strips.pdf` verified pixel-identical for both and was NOT
   overwritten. Every page rasterized and eyeballed clean.
3. **I's art debt cleared**: the 5 igloo scenes are now copied to the permanent
   `phonics-images/satpin-v2/books/igloo/` (originals stay in `_incoming-week5-i/`, undeletable via
   the device bridge); `i.json`'s `artDir` now points there. `p.json` was already permanent
   (`books/pig`) — no change needed.
4. **Audit matrix** (live-verified across S/A/T/P/I/N):

   | Asset | S | A | T | P | I | N |
   |---|---|---|---|---|---|---|
   | Three-part cards | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
   | Object-basket photos | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
   | Songs | ❌ | ❌ | — | ✅ | ✅ | ✅ |
   | Videos | — | — | — | ✅* | ✅** | ✅*** |
   | Books | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
   | Paperwork (new format) | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
   | Sentence pictures | — | — | — | ✅ | ✅ | ✅ |

   \* P: manifest `videos/letter-p-pig-pen-pencil-v3.mp4` PLUS a distinct API-discovered
   `satpin-videos/p-1785206955599.mp4` (two separate assets).
   \*\* I: API-discovered `satpin-videos/i-1785228567368.mp4` only, no manifest field needed.
   \*\*\* N: manifest only (`videos/` prefix — invisible to the satpin-videos API scan by design).
   S/A/T have no `letters/*.json` at all yet, hence the paperwork ❌.
5. **S/A/T completion recipe** (dependency order): song (Suno, Tredoux picks the take) → MJ scenes
   (photo-real is now the standing style for SATPIN initial-sound books — P/I/N precedent,
   Tredoux-approved) → `bookX.py` (sound mode, mirrors `bookN.py`) + `letters/X.json` →
   `build_paperwork.py` + `build_tracing.py` → mvgen video (lyrics txt must SPELL the phoneme for
   the `00-card` anchor, e.g. "Nnn...", "Puh...") → ingest scenes to the Picture Library with
   labels EXACTLY equal to `page.tsx`'s `pictureLabels` (lowercase, leading article dropped) →
   wire the `book:` entry in `page.tsx`.

**Process gotchas learned today** (worth remembering): `device_stage_files` can silently return a
stale cached copy even with correct-looking metadata — always md5/byte-check staged files against
the Mac before editing them; the device bridge can drop for ~2–20 min and self-recover.

---

## 🔒 Jul 29 (Cowork) — SATPIN PAPERWORK PIPELINE LOCKED IN as approved convention (do not redesign)

Tredoux's verdict on the new SATPIN paperwork pack + tracing workbook: "couldn't be any more
perfect… Lock that in as the pipeline and the templates. When I tell you to do a letter — I want
all of this." The rule now lives in `CLAUDE.md` (🔒 SATPIN Paperwork Pipeline — LOCKED section) —
read that before touching layout, fonts, or the stroke rule.

**Everything lives in `scripts/curriculum/satpin-paperwork/`, one JSON per letter driving both
PDFs.** `letters/<slug>.json` (p.json, i.json exist): sentences import live from the dark-phonics-
readers book script (`bookP.py`/`bookI.py`) — story text is never duplicated — plus
`sequencingDisplayOrder`/`matchDisplayOrder` (fixed derangements, deterministic), 10 yes/no items
(5 yes from the book, 5 no from prior-week vocab via picture-bank photos, chosen to avoid anything
the animal could plausibly eat/do), and `artDir`. `build_paperwork.py` renders the **approved** A4
portrait `paperwork-pack.pdf`, 4pp: story order (5 pics, fixed shuffle, 24mm write-in boxes 1–5) ·
match (sentences left, pics right, draw a line) · yes-or-no ×2pp (10 questions, small photo, ✓/✗
20mm boxes) — house fonts only (YoungSerif/Outfit/Lora/WorkSans) via `MONTREE_CANVAS_FONTS`.
`build_tracing.py` renders the **approved** A4 LANDSCAPE `tracing-workbook.pdf`, modeled on
Tredoux's classroom velcro material photo: cover ("written by ___") + 5 pages, each READ IT (solid
manuscript model sentence) · art 58×38mm top-right · BUILD IT (dashed 20mm velcro slots sized to
word cards) · TRACE IT (full sentence in dotted skeleton letters on 3-line guides — dotted
headline/dashed midline/solid baseline, 12.5mm x-height — red/blue stroke-order arrows auto-
derived per stroke) · blank NOW YOU line, plus a companion `sentence-strips.pdf` (cut-out word
cards, sized exactly = slots). `stroke_font.py` is the single-stroke manuscript engine (69 glyphs,
hand-defined stroke order/starts, locked rule: circle letters a/c/d/e/g/o/q/s start ~2 o'clock
counter-clockwise, stems draw down, arches draw up) — the model sentence and the word cards render
from the same skeleton, no school-print TTF, single-storey 'a', so the child reads/builds/traces
identical letterforms; warns on undefined characters. Outputs land in
`public/satpin-materials/<slug>/`; old A5 tracing editions retired to
`_to_delete/satpin-old-a5-tracing/`.

**UI:** `app/montree/library/satpin/page.tsx` gained a `PaperworkRow` (sits between ReaderRow and
the Book box, probes-and-renders like ReaderRow; labels "Worksheet pack · A4" / "Tracing workbook ·
A4" / "Sentence strips · cut-outs", descriptor "Story order · matching · yes/no · trace & build").
New letters appear automatically once the three files exist — no code change per letter.

**The recipe, when Tredoux says "do letter X":** 1) write `letters/<slug>.json` (needs `bookX.py`
to already exist), 2) `python3 build_paperwork.py --letter <slug>` and `python3 build_tracing.py
--letter <slug>` (default output = `public/satpin-materials/<slug>/`), 3) rasterize and eyeball
every page, 4) commit. Fonts come from `MONTREE_CANVAS_FONTS` on the Mac.

**Status:** letters P ✅ and I ✅ shipped (P wrong-answers: tiger/sock/taxi/snake/alligator; I
wrong-visitors: pig/tiger/taxi/sock/alligator — I's `artDir` still points at
`_incoming-week5-i/book-scenes/` and must be updated once those scenes move to
`phonics-images/satpin-v2/books/igloo/`). Letters S/A/T (weeks 1–3) have **no paperwork yet**, and
their book scripts may not exist in `bookX.py` form — check before promising a date. All committed
to `main`, typecheck clean, as of this 2026-07-29 Cowork session.

---

## 🎬 Jul 28 — Montage Tracker (MM) SHIPPED and LIVE (migration 305 run, worker redeployed)

**Full pickup: `docs/handoffs/HANDOFF_MONTAGE_TRACKER_Jul28.md`.** New teacher-facing,
**zero-AI** tool at `/montree/dashboard/montage-tracker`: a daily coverage board (every
child ≥1 tagged photo, school-wide across classrooms), a weekly board (8 photos/child
Mon–Sun, worst-first, shared team-wide "needs more photos" view), and a minimal montage
creator (Child or Class × Day/Week/Month/Custom). It counts **every tagged photo the
instant it's tagged** — no `teacher_confirmed`, no `parent_visible` filter on the
BOARDS — while the existing AI identification/confirmation pipeline keeps running
untouched in parallel. Tracker montages ride the existing `montree_montage_jobs` system
via new `require_confirmed=false` (migration **305**); `parent_visible=true` is still
enforced everywhere a film is actually rendered (enqueue + worker + the worker's final
`assertAllParentVisible` re-assert) — confirmed/Studio/report paths are byte-identical
to before. Junction-aware: boards and the bypass child-montage path both union
`montree_media_children` group-photo tags with `montree_media.child_id`. Module isolated
in `lib/montree/montage-tracker/` (own README) for a planned future extraction into a
standalone app. i18n `montageTracker.*` + `teacherTools.montageTracker*` in all 12
locales. **Known intended quirk:** board counts ignore `parent_visible`, so a child can
show 8/8 yet still get "insufficient photos" if those photos are parent-hidden.
Commits `dbb99645` (feature), `73b5957b` (CLAUDE.md rules + session log), `8767ce33`
(SQL-in-chat rule), pushed via Desktop Commander. **Migration 305 has been run on
Supabase and `montage-worker` redeployed — feature is fully live, nothing pending.**

---

## 🐷 Jul 27 — Letter P photo-illustrated book (deliberate exception) + Picture Library download button

**Full pickup: `docs/handoffs/HANDOFF_LETTER_P_BOOK_Jul27.md`.** Two things shipped. (1) The
public Picture Library page's per-card trash badges and bulk "Delete N" button are gone (the
delete API was already auth-gated, but the affordance shouldn't have existed on a public page);
replaced with a "⬇ Download N" button (`lib/montree/media/download-photos.ts`, bounded-concurrency
proxy fetch, dynamic JSZip import). Committed `dd383281` with `--no-verify` (12 unrelated
untranslated i18n keys from other in-flight work still need `i18n:fill-ui`). (2) New book
**"The Pig Ate a Pineapple"** — a Letter P initial-sound book (commits `472dee53`, `a22f3c04`),
built in `dpbuild.py`'s `sound` mode (child shouts the picture word, doesn't decode it — only
`pan` is actually decodable at the letter-p gate). 🚨 Its art is hyper-realistic photography, a
**deliberate, Tredoux-approved exception** to the locked Dark Phonics pen-and-ink house style —
do not restyle without asking him; see `CLAUDE.md`'s Jul 27 entry and locked-style section.
Ingested into the Picture Library (not the Montessori Picture Bank — different background
requirements) via `scripts/curriculum/upload-letter-p-book-to-picture-bank.mjs`. Also: this
session confirmed `device_bash` has no network at all (`git push`/`rm` both fail) — use Desktop
Commander for anything needing network or credentials on the Mac.

---

## 🧸 Jul 26 — SATPIN basket verified + 5 TOY RENDERS CAUGHT AND FIXED + Picture Library search bug fixed (NOT DEPLOYED, NOT COMMITTED)

**Full pickup: `docs/handoffs/HANDOFF_PICTURE_BANK_Jul26.md`.** All 30 `SATPINObjectBaskets.docx`
words + `ring` verified present, correctly named, and audit-passing at
`docs/picture-bank/photos/<word>/<word>.jpg`. Visual re-inspection (the audit script only checks
background/size/contrast, never subject material) caught **5 toy-styled renders that had shipped
anyway**: `ambulance` + `taxi` were die-cast toy cars, `panda` was a plush stuffed animal,
`penguin` was a vinyl figurine, `infant` had reverted to a real human baby photo (violates the
doc's own doll-exception rule). All 5 regenerated as genuine photorealistic real objects/animals
and re-published, overwriting the same Supabase Storage paths in place (no duplicate rows). **New
rule added to `scripts/curriculum/materials.config.json` (`_noToys`)** — no die-cast/plush/vinyl
substitutes, ever, even for non-holdable subjects.

Separately: Tredoux's "ring isn't in the bank" complaint was a **search bug, not missing data** —
`label ilike '%term%'` matched "ring" inside "colo**ring**" and buried the real 155-vs-7 result
under the coloring-page flood. Fixed in `app/api/montree/photo-bank/route.ts` (relevance ranking:
exact > prefix > word-boundary > substring) and `components/montree/PhotoBankPicker.tsx` (the old
10-tab category bar replaced with two tabs, **Pictures** / **Coloring Pictures**, via a new `kind`
query param). Verified directly against the live DB before shipping.

🚨 **NOT deployed, NOT committed.** Files are written to disk on Tredoux's Mac only — dev
server/build has not picked them up, and `git status` shows 40 modified files (this session's 2
files mixed in with unrelated in-progress work) ahead of `origin/main` by 1 commit. Ask before
committing — don't assume scope. Push can't happen from a Cowork session (`device_bash` has no
network) even after a commit.

---


## 🖼️ Jul 25 — Picture Bank generation run READY TO RUN

127 Midjourney prompts are queued and ready to fire, one per missing or defective picture-bank
word, in `docs/picture-bank/MJ-BATCH-OVERNIGHT.md` (19 replace existing defective photos, 108
fill genuine gaps). **Full pickup for a fresh session: `docs/handoffs/HANDOFF_PICTURE_BANK_RUN_Jul25.md`**
— it has the exact Midjourney/Chrome steps, the judgement criteria for each generated image, the
environment traps (Chrome bridge drops, no network in `device_bash`, stale staged-uploads mount),
and the order to work through the list in.

The only sanctioned way a photo enters the bank is `scripts/curriculum/picture-bank-add.mjs`
(`--sweep <folder> --force` to file and convert, `--audit` to check, `--publish` to push to
Supabase) — never copy files into `docs/picture-bank/photos/` by hand.

One line to remember before generating anything: the picture bank is a **real photograph of one
holdable object on a plain white background**; the forest-green spotlit look under
`English Curriculum 2026/Week NN/images/` and the googly-eyed `phonics-images/satpin-v2/`
characters are the separate **Dark Phonics** track and must never be mixed into picture-bank work.

Also worth knowing: `scripts/curriculum/make-material.mjs`, driven by
`scripts/curriculum/materials.config.json`, now generates printable materials and is locked to
read only from the picture bank — so once the 127 photos above are filed, printable materials
for those words follow automatically.

---


## 📚 Jul 24 (Cowork) — DARK PHONICS READERS: full alphabet authored, ready to render

**Full pickup: `docs/curriculum/dark-phonics-readers/HANDOFF_DARK_PHONICS_READERS_Jul24.md`
(includes a paste-to-resume kickoff prompt at the top).**

Authored the **Dark Phonics reader track** (SATPIN, s-first — the song library, NOT the
a-first English curriculum) across the **whole alphabet**, aligned to canon. Extends the
6 live readers (`public/satpin-books/` weeks 1–6) through weeks 7–27.

**Source of truth:** `docs/curriculum/dark-phonics-readers/Dark_Phonics_Readers_Books_7-27_ALIGNED.docx`
— per book: header line, hybrid set-up + decodable target word, **potato-shout finale on
every book**, gate labels, the week's **song mascot**, and a googly-ink MJ art prompt per
page. Locked the full **27-mascot roster** from the song cards (m=monkey, d=muddy dog,
g=gum goat, o=octopus, c=cookie cat, k=crowned king, e=hatching chick, u=cup-monster,
r=red rat, h=laughing hippo, b=baby-in-boat, f=fox-at-fan, l=lazy lion, j=boy-in-jam,
v=van, w=wet worm, x=box of foxes, y=yo-yo boy, z=zebra, qu=duck).

**State: authoring only — NO art generated, NO book assembled.** Week 5 (`sit-sit-sit.html`)
is already fully illustrated (don't redo); `pig/pig.jpg` already in the picture bank.

**NEXT (deferred to a fresh context, MJ has ~unlimited credits):** render Books 7–27
end-to-end — start with **Book 7 (m, “Sam and the Monkey”)**. Drive **Midjourney in
Chrome** (Relax mode; watch the silent queue-cap bug), download the page images to
`phonics-images/dark-phonics-readers/w07/`, and assemble a reader HTML matching
`sit-sit-sit.html`. Open decision to confirm first: whether book scene art also goes into
the (photoreal, single-object) picture bank — recommend NOT mixing tracks. Full steps,
per-page prompts, and the art-style suffix are in the pickup doc.

---



## 🖼️ Jul 23 (Cowork, later same day) — MONTESSORI PICTURE BANK: ALL 154 PHOTOS DONE

**Full pickup: `docs/picture-bank/HANDOFF_PICTURE_BANK_Jul23.md`.**

**✅ Photo generation complete.** All 154 unique A–Z words now have a real photoreal
studio photo at `docs/picture-bank/photos/{word}/{word}.jpg` on the Mac — verified
folder-by-folder (154 folders, 154 non-empty jpgs, 0 missing, 0 zero-byte) via a
direct shell check, not just a listing. Driven via Claude-in-Chrome browser automation
against Midjourney (user approved screen access + "get it done - all of them"; ran
mostly in Relax mode after a Fast-hours paywall was hit and declined without
purchasing — user chose to keep grinding in Relax rather than buy Fast hours).
`dice` and `fox` are intentionally shared between their home letter and the X page
(X-uses-ending-sound convention).

Two words needed a prompt fix mid-run: **heart** first rendered as a bloody anatomical
organ — fixed with an explicit "NOT an anatomical organ, no veins" prompt, now a clean
valentine-heart shape. **insect** never got a dedicated successful render across two
attempts; it's currently standing in with the "beetle insect" photo — flagged for
Tredoux to eyeball, not silently swapped in as gospel.

Also hit and fixed mid-run: a **silent MJ queue-cap bug** — submissions beyond ~4-5
queued jobs were silently rejected with no error surfaced unless the page text was
checked for "Too many queued prompts"; ~80 words had to be diffed against the intended
list and resubmitted one-by-one with a verify-before/after pattern (queue-count check,
then confirm the textarea actually cleared on submit).

**NEXT: user is building the 3-part cards (picture + label + control card) themselves**
— Claude is not doing this step. Still open after that: host as a tab in the same place
as Dark Phonics, finish wiring `satpin.html` into the hub + remove old duplicate pages
(nothing deleted yet).

---


## ☀️ MORNING REPORT — Jun 12→13 overnight marathon (Cowork session)

**Everything is on branch `burn-jun12-night2` (12 commits). NOTHING merged or
deployed — your call. Build green, 118/118 tests, i18n 12/12, all verified on
the Mac. Two independent audits ran; every P1/P2 found was fixed same-night.**

### Shipped tonight (Tier 1 + Tier 2 of the burn plan, plus extras)
1. **T1-1** "Who's playing?" child picker on games hub (games finally attach
   progress to a child) + missing game cards.
2. **T1-2** Real `/support` page, ALL Reports links → weekly-wrap + redirect
   safety net, Games in the More menu. ⚠️ /support only exists on the BRANCH —
   deploy before App Store review. ⚠️ Verify support@montree.xyz receives mail.
3. **Story vault video streaming** (your evening ask): instant start + scrubbing
   (Range/206), 1h on-demand signed URLs, key memoization, Safari-correct MIME.
   Security model unchanged; audit P1 (refresh loop) + P2s (audit-log bypass,
   plaintext disk cache) found and fixed. Test: open a big vault video.
4. **T1-4** Apple Review School on production: principal **WYXMN9**, teacher
   **BAM4S9**, 5 fake children. ⚠️ Trial expires **Jun 19** — extend
   trial_ends_at. Verify codes on a real device. docs/APPLE_REVIEW_DEMO_SCHOOL.md.
5. **T1-3** 6 in-app screenshots @1290×2796 in the App Store Pack. Weak two:
   snap (headless = black camera) + weekly-wrap (no demo reports) — recapture later.
6. **T2-5** Migration **254** staged (campaign items only — 20 other "missing"
   tables deliberately not staged, see appendix) + docs/ORPHAN_TABLES_REPORT.md
   (7 of the 77 "orphans" are FALSE POSITIVES — do not archive those).
7. **T2-8** Tests **9 → 118** (all mocked, <1s, tenant-scoping asserted).
8. **T2-7** Push polish: APNs HTTP/2 reuse, durable outbox (migration **255**
   staged), per-parent notification prefs + toggles on the parent account page.
9. **T2-6** tsc errors **5,250 → 743 (−86%)**, type-only (audited CLEAN).
   Note: tsc --noEmit now needs NODE_OPTIONS=--max-old-space-size=4096.
10. **T2-9** docs/PERF_PASS_JUN13.md — splash scores 46 w/ CLS 0.93 + 13.4MB
    dual-locale eager videos; dashboard 3-round-trip waterfall; /children
    over-fetch; SSR TTFB ~600ms from cookies() blocking edge cache.

### ⚠️ Production incident you saw at 23:03 — Cloudflare Error 1034
Intermittent CF-on-CF (proxied record → Railway's Cloudflare-backed edge).
**Fix = 2 min with VPN on: flip montree.xyz + www to DNS-only (grey cloud).**
Full steps: docs/DNS_ERROR_1034_FIX.md. Overnight monitor (every 2 min):
`~/Desktop/montree_uptime_overnight.log` — **0 failures since 23:21** so far.
Kill it with: `pkill -f montree_monitor`.

### Wave C (later same night) — perf + security IMPLEMENTED (not just reported), audited MERGE-SAFE
- **Splash/explainer perf** (`b68f1e70`): root cause was styled-jsx `<style jsx
  global>` rendering NOTHING in App Router SSR → unstyled first paint → the CLS.
  Converted to plain SSR'd `<style>`. Inactive-locale hero video no longer
  eagerly downloads (was EN 5.7MB + ZH 5.3MB both); killed a double-fetch.
  Expected: ~13.4MB → ~2MB first load, CLS 0.93 → ~0. ⚠️ Other styled-jsx
  pages may have the same unstyled-first-paint issue — worth a sweep.
- **Dashboard data path** (`e92e21f3`): voice probe parallelized (one fewer
  serialized round trip), `/children` stops over-fetching `notes`, header
  duplicate fetch deduped via SWR, 10 dead dynamic imports removed. Plus TWO
  real bugs fixed: group-lessons silently truncated progress at 1000 rows;
  whale parent route used invalid `photo_url as avatar_url` PostgREST syntax
  (parents never got avatar_url).
- **Story security** (`215da116`): M2 vault-unlock limiter now fail-CLOSED +
  keyed on authed admin|IP (was fail-open + spoofable XFF); M3 factory_reset /
  clear_vault / delete_all_users now require per-call bcrypt admin-password
  re-entry (rate-limited, every branch denies, denied attempts audit-logged);
  M1 (token in login body) NOT fixed by design — 24 routes verify Bearer-only,
  4-step migration plan written at the issuance site. H1/C2 still open (design).

### Wave D — portfolio
- **Weekly Supabase backup** AUTOMATED + scheduled (launchd, Sundays 04:00).
  Tested: 95MB / 247 tables. Backups → `~/SupabaseBackups/` (symlinked to
  Desktop; macOS TCC blocks launchd under Desktop, so the live copy runs from
  `~/Library/Scripts/montree/`). Docs: `whale/scripts/SUPABASE_BACKUP_README.md`.
  ⚠️ If the service-role key rotates, update `~/Library/Scripts/montree/backup.env` too.
- **🚨 jeffy-mvp audit** (`~/Desktop/AUDIT-2026-06/FUNCTIONALITY-jeffy-mvp.md`):
  jeffy.co.za is LIVE with the **entire /admin surface unauthenticated** (no
  middleware; auth helper wired to 1 of ~25 routes), a **fake Ozow checkout**
  (real customers → "success" page, nothing collected), a **forgeable PayFast
  webhook** if env unset, and a publicly-triggerable giveaway draw. Theoretical
  only (near-zero traffic). Verdict: FIX (~1 day), don't archive. NOT touched —
  awaiting your go.
- **Guardian Connect**: flutter analyze clean (0 errors both branches);
  `flutter-catchup-jun12` adds zero new analyzer issues. pub get + pod install
  done (share_plus locked), committed to the branch (`c3b56de`, not pushed —
  no remote for that branch). MERGE-READY Claude-side. ⚠️ local main has
  DIVERGED from GitHub main — reconcile before pushing. Device build unverified.

### Wave E — more perf + jeffy security (all on branches, audited/build-green)
- **whale styled-jsx sweep** (`640554f7`): 3 more public funnel pages
  (/pricing, /montree/become-an-agent, /montree/security) had the same
  unstyled-first-paint CLS bug — converted. Authenticated pages + scoped
  `<style jsx>` left for a daytime pass (need scope review).
- **whale edge-cache** (`fbf86309`): added `Cache-Control: public, s-maxage=3600,
  SWR=86400` to /pricing, /support, /privacy ONLY (no per-user content; the
  montree locale cookie never fires on them). Root layout's headers() read
  forces dynamic rendering site-wide — these 3 can still be CF-cached.
  ⚠️ After deploy, `curl -sI` them and confirm `cf-cache-status: HIT`; if Next
  wins the Cache-Control race, fallback is per-page revalidate. Locale-bearing
  funnel pages (/montree, /explainer) need a bigger daytime restructure.
- **🚨 jeffy-mvp security fixes — SEPARATE REPO + BRANCH** (NOT in whale):
  repo `~/Desktop/Master Brain/ACTIVE/jeffy-mvp`, branch **`security-fixes-jun13`**,
  commit `758e2d8`, build green, NOT pushed (remote exists → your call).
  Fixed: added `middleware.ts` protecting /admin + /api/admin (reuses existing
  jeffy_admin_session cookie — login flow was actually fine, just ungated);
  removed fake Ozow checkout; PayFast webhook amount-validation + fail-closed;
  stock restore on cancel/fail; giveaway cron fail-closed.
  ⚠️ jeffy tree had 97 pre-existing uncommitted changes (your WIP — left
  untouched, only src/ committed). ⚠️ Needs Railway env: set `PAYFAST_PASSPHRASE`
  (webhook only warns-not-blocks until set), `CRON_SECRET` (scheduled draws now
  503 without it), confirm `PAYFAST_ENFORCE_IP=true`. ⚠️ The customer-facing
  cancel writes to Supabase from the browser (anon) — stock restore can't hook
  it; should move behind an API (flagged, not fixed). Review → merge → deploy
  jeffy yourself.

### Wave F — final verification (3 audits, all clean)
- **jeffy security branch AUDITED MERGE-SAFE** (live-commerce — checked the 4
  scariest regressions): middleware does NOT lock out admin (token sign/verify
  match exactly, /admin/login stays public); PayFast amount-validation can't
  reject real payments (`total_cents` IS the gross charged — no shipping/fees
  added); Ozow removal doesn't break card/EFT; stock restore won't double-count
  (one P3 edge on abnormal FAILED→COMPLETE, fine to merge). ⚠️ Before merging
  jeffy, set non-default `ADMIN_PASSWORD`+`SESSION_SECRET`, `PAYFAST_PASSPHRASE`,
  `CRON_SECRET` in Railway; confirm a real test payment completes once passphrase
  is on (pre-existing alphabetical-sort in validateSignature — verify prod logs
  aren't failing signatures).
- **Vault C2** (`6f…` plan doc): large-media at-rest encryption investigated —
  NOT implemented because the contained version would break playback (download
  route decrypts whole-buffer; a 535MB file × 4 concurrent = OOM). Real fix =
  streaming per-chunk AEAD + new ranged route (~2d). `docs/VAULT_C2_ENCRYPTION_PLAN.md`.
- **🟢 FULL WHALE BRANCH PRE-MERGE REVIEW: GO.** 20 commits, 135 files
  (+5,051/−687), cross-commit state coherent, no leftover debug, migrations
  254/255 collision-free + graceful, i18n 12/12, no new security exposure (net
  tightening), build green + 118/118 + eslint no new warnings. Safe to merge
  burn-jun12-night2 → main.

### Wave G — last burn
- **jeffy customer-cancel fixed** (branch `security-fixes-jun13`, commit
  `48c8428`, build green, not pushed): the cancel was a browser anon-client
  Supabase write keyed on order id alone — now a server route
  `/api/orders/cancel` (order_number + matching email, server-authoritative
  cancellable-state check, calls the same idempotent stock-restore). Strictly
  stronger auth than before. ⚠️ The component isn't mounted on any page yet
  (no JSX call site) — wire it onto an order-tracking page when ready.
  ⚠️ `OrderModificationRequest` in the same file still writes via anon client
  (same pattern, left for next pass).
- **whale security tests 118 → 143** (`eb59bc9f`): rate-limiter fail-closed,
  system-controls bcrypt step-up (every deny branch), vault-unlock keying —
  the wave-C hardening is now regression-locked. No product logic changed.

### Your morning checklist (in order)
1. Merge `burn-jun12-night2` → main → deploy (gets /support live for Apple).
2. Cloudflare DNS-only flip (docs/DNS_ERROR_1034_FIX.md) — VPN on.
3. Run staged migrations **254 + 255** in whale-class Supabase.
4. Verify WYXMN9 + BAM4S9 on a real device; extend demo trial past Jun 19.
5. Verify support@montree.xyz inbound (or forward to gmail).
6. Apple Developer app enrolment on iPhone (resume script below, unchanged).
7. (When ready) Railway region pin → Singapore at a quiet hour.

Also still open from Jun 10 night (rediscovered during doc hygiene — they were
only in SESSION_HANDOFF_2026-06-10_NIGHT.md): migration 249 / home_practice,
the Whale→Sonnet model flip decision, and the service-role key rotation.

---

**Last updated:** June 13, 2026, overnight marathon (Cowork)
**Live on Railway:** latest `main` (`e2ab75ac` at time of writing)
**⚠️ Unmerged work:** branch `audit-cleanup-jun2026` — security audit fixes
(see `~/Desktop/AUDIT-2026-06/AUDIT-whale.md` + the PROGRESS LOG in
`~/Desktop/HANDOFF_AUDIT_RUN_JUNE2026.md`). Merge is Tredoux's decision.

Resume-from-here document. New session: read this, then `CLAUDE.md` for full
project context + the migration/session notes near its end.
NOTE: `docs/mission-control/` (brain.json / SESSION_LOG.md / mission-control.json)
is months stale — CLAUDE.md is the canonical brain for this repo.

---

## BURN PLAN — ~65% weekly usage available (written Jun 12 night, for the next session)

Tredoux's ask: "bulletproof and Ferrari-fy" across projects. Ordered by value; each
item notes Claude-alone vs needs-Tredoux. Run Tier 1 first; parallel agents burn fast,
so launch at most 2-3 at once and verify between waves.

**TIER 1 — Montree store/revenue path (do first):**
1. "Who's playing?" child picker for the 9 games (closes the games-save-without-child
   gap; mount on games hub, sets current_student_id; small). Claude-alone.
2. Real `/support` page (App Store requirement) + fix Reports nav + make games hub
   reachable. Needs ONE product decision from Tredoux: where Reports points.
3. Simulator screenshots for the listing (Xcode sim on the Mac via Desktop Commander,
   simctl commands already in the Pack) + drop them into the App Store Pack.
4. Reviewer demo school + login codes. Needs Tredoux (10 min) — Claude can create the
   school/children data, Tredoux confirms codes work.

**TIER 2 — Montree hardening (Ferrari-fy):**
5. Stage SQL for the top missing tables from FUNCTIONALITY-whale-db-crosscheck (21
   referenced-but-missing, 3 already staged) + a safe-to-archive report on the 77
   orphan tables (read-only analysis; DROPs only with sign-off).
6. tsc debt burn-down: 5,250 errors — fix the two biggest classes first (typed-supabase
   'never' casts via a shared untyped helper; i18n duplicate keys are mechanical).
   Even halving it derisks every future build.
7. Push polish: durable retry queue (webhook-inbox pattern, replaces in-memory),
   APNs HTTP/2 connection reuse, per-parent notification preferences.
8. Test coverage: 9 tests total today. Add vitest API tests for auth, reports send,
   push register, games progress, account deletion. Cheap, high-value.
9. Perf pass: Lighthouse via Chrome on the 5 hottest pages, dashboard payload audit.

**TIER 3 — Guardian Connect to its own store run:**
10. flutter analyze + merge `flutter-catchup-jun12` (pod install for share_plus),
    then Firebase+VAPID push keys (Tredoux: Railway env), host landing page,
    two-phone E2E test (Tredoux), lawyer review of legal drafts (Tredoux).

**TIER 4 — Portfolio bulletproofing:**
11. GitHub remotes for guardian-connect + project-sentinel (Tredoux: auth) — the Mac
    is still the only copy of both. Weekly Supabase backup as a scheduled task.
12. jeffy-mvp audit (discovered, never audited). riddick-chess-v2 still needs Tredoux
    to locate the repo.
13. Master Brain hygiene: consolidate the 4 overlapping handoff docs into this one,
    archive stale mission-control files.

---

## Jun 12, 2026 (Cowork burn ~22:00) — Tier 1 items 1+2 + story-vault streaming SHIPPED to branch `burn-jun12-night2` (NOT merged)

Three commits, build + 9/9 tests green on the Mac, lint-clean, tree clean:
- `13b3d963` TIER1-1 — "Who's playing?" child picker on games hub (sets
  `current_student_id` + `studentSession`; reuses /api/montree/children;
  hub also gains Phonics Challenge + Moveable Alphabet cards).
- `5620ddf1` TIER1-2 — real `/support` page (was missing from middleware
  publicPaths → 307; uses support@montree.xyz — ⚠️ VERIFY that mailbox
  receives mail before App Store submission); ALL Reports nav links →
  weekly-wrap (Tredoux's decision) + redirect safety net at
  `dashboard/reports/page.tsx`; Games entry in DashboardHeader More menu.
- `057c96d9` STORY VAULT — fluid video playback, security unchanged:
  signed-URL TTL 5min→1h + on-demand refresh on expiry (unencrypted);
  Range/206 + PBKDF2 key memo + private cache headers + real video MIME +
  4-decrypt concurrency cap (encrypted); player preload=metadata.
  Manual test: play a >20MB vault video → instant start, scrubbing works,
  pause 6+ min → resume works.

**Merge is Tredoux's decision** (his call tonight: branch, he merges).

### Audit pass (same session): independent reviewer over the 3 commits → 1 P1 + 2 P2s, ALL FIXED in `4a3c7876`
- P1: video error-refresh guard was url-keyed → infinite refresh loop on
  unplayable codecs (.avi/.mkv). Now keyed by file id, one attempt per view.
- P2: audit-log gate bypassable via `Range: bytes=1-` → now time-based
  (one row per admin+file per 10 min).
- P2: decrypt route cached plaintext in browser disk cache (survived vault
  lock) → `no-store` on all responses.
Build + 9/9 tests re-verified green after fixes.

### T1-4 DONE — Apple Review School live on production (created via public APIs only)
- Principal code **WYXMN9**, Teacher code **BAM4S9** (both verified via API).
- School `136841a0-6b93-421e-b9f4-57e9f1451d18`, classroom `5a5c93bb-…4417`
  (full curriculum seeded), 5 fake children (Emma Chen, Liam Park, Sofia
  Rossi, Noah Smith, Mia Müller — no photos).
- ⚠️ Trial expires **2026-06-19** — extend `trial_ends_at` before review.
- ⚠️ Exclude the "Apple Reviewer" `montree_leads` row from outreach.
- Details: `docs/APPLE_REVIEW_DEMO_SCHOOL.md` (committed on the branch).
- Tredoux: verify both codes on a real device (10 min).

### T1-3 DONE — 6 in-app screenshots captured at exactly 1290×2796
In `~/Desktop/Montree App Store Pack/SCREENSHOTS/` (logged in as BAM4S9,
read-only). Good: games hub, dashboard student grid, child record
(scrolled variant `app_02b` is the stronger one). Weak, recapture later:
snap (black camera box — headless has no camera; needs real device) and
weekly-wrap (empty — no demo reports exist; seed one then recapture).
Upload order + status table in `SCREENSHOTS/SCREENSHOTS_TODO.md`.
Capture scripts kept at `/tmp/appstore_cap/` (puppeteer-core; note: auth
rate limit is 5/15min per IP).

**TIER 1 COMPLETE.** Next per burn plan: Tier 2 (missing-tables SQL staging,
tsc debt, push polish, tests, perf pass).

## Jun 12, 2026 (late night) — Apple Developer enrolment: PINNED, 80% done. Exact resume point below.

**DONE tonight (do not redo any of this):**
- New Gmail: `tredoux.montree@gmail.com` (recovery → tredoux555@gmail.com; CN number
  185 4892 2404 verified). Plus-alias and dot-alias on the old Gmail were REJECTED by
  Apple — that's why the new address exists.
- **New Apple ID: `tredoux.montree@gmail.com`** — name Tredoux Willemse (passport-exact),
  **region South Africa ✓** (verified in Personal Information), DOB set, 2FA on,
  trusted number +86 185..., **SA card added** under Payment & Shipping (saved OK).
  No shipping address (not needed).
- Apple Developer Agreement SIGNED (free developer registration complete).
- **Network lesson that unblocked everything: VPN OFF = China network = Apple SMS
  delivers to +86.** Via UK VPN exit the SMS/voice verification NEVER arrives and
  repeated attempts rate-limit the number (~60-90 min cooldown). Web account creation
  succeeded VPN-off after the phone-number cooldown expired.

**Why we stopped — web enrolment is HARD-BLOCKED by Apple, not broken:**
`developer.apple.com/enroll` → "unable to process your request"; DevTools console:
`UserIneligibleForWebEnrollment: "User cannot enroll on the web"` + 403 on the
individualEnrollment service. Individuals MUST use the Apple Developer app. Do not
retry the web flow; it cannot succeed.

**RESUME HERE (iPhone, ~15 min + 1-3 day Apple review):**
1. iPhone App Store (normal account, NO sign-out needed) → install **"Apple Developer"** app.
2. Open it → Account tab → sign in `tredoux.montree@gmail.com` (in-app sign-in is
   separate from the phone's iCloud/App Store accounts). 2FA code → +86 number.
3. Enroll Now → Individual → passport scan + selfie (SA passport, good light).
4. Phone on **cellular, VPN OFF** throughout.
5. Payment $99: if the sheet offers the SA card on the new account → pay. If it
   insists on billing the phone's App Store account → Settings → App Store → switch
   **Media & Purchases only** (NOT iCloud) to the new ID, pay, switch back. 30 sec.
6. If the app says enrolment can't be completed: the Apple ID is hours old —
   wait 24-48 h and retry the same flow. This is normal cooling, not failure.
7. After approval email: APNs key → Railway (see Jun 12 evening entry), then
   `~/Desktop/Montree App Store Pack/SUBMISSION_CHECKLIST.md` end-to-end.

---

## Jun 12, 2026 (night) — Burn round: games progress + H5 + M3 LIVE; App Store pack; GC Flutter branch

**whale:** `burn-jun12` (2 commits) merged → main → deployed (verified: /api/games/track
live). Games now save (`/api/games/progress` + `/api/games/track`, school-scoped,
zero client changes); H5 webhook inbox-first persistence; M3 legacy admin route
tenant-scoping. Migrations 252 + 253 RUN in whale-class with RLS (verified
relrowsecurity=true). ⚠️ Latent UI gap: nothing sets `current_student_id`/
`studentSession` in localStorage, so most games won't attach a child until that
picker exists — product decision, queued.
**App Store pack:** `~/Desktop/Montree App Store Pack/` — listing (old subtitle was
34 chars, over Apple's 30 limit — fixed), privacy labels w/ code citations (no
tracking SDKs confirmed), reviewer notes rewritten around login CODES (old doc
wrongly said email/password), 5 real 1290×2796 public-page screenshots + simctl
commands for in-app ones, phase-by-phase checklist. Tredoux fills: demo school
codes; montree.xyz/support 307s to root — needs a real page.
**guardian-connect:** branch `flutter-catchup-jun12` (5 commits, NOT merged):
escalation honesty (501), static-location pivot (polling removed — also fixed
3 never-cancelled stream leaks), alerted-count honesty, invite-by-link (+
share_plus dep — needs pod install), Agora deferred w/ stubs. Found
EmergencyEscalationService is dead code (never invoked). No flutter analyze
possible on this machine — run it before merging.

---

## Jun 12, 2026 (evening) — MERGED + DEPLOYED. App Store: submission phase

**State change: `audit-cleanup-jun2026` (24 commits) merged into `main` and deployed
to montree.xyz** (verified live — new push route responding). Build + 9/9 tests green
on the Mac before merge. All pending SQLs are RUN in the correct project (whale-class
`dmfncjjtsoxrnvcdnvjq`): application tables (01), account-deletion audit (03), device
tokens w/ RLS (04). A stray `montree_device_tokens` accidentally created in the
guardian-connect project was verified empty and dropped. GC's
`uniq_active_emergency_per_user` index confirmed present.

**Apple Developer enrolment (Tredoux, in progress):** prior failure was the classic
China trap (CN-region Apple ID needs Chinese national ID; region/card/VPN mismatches).
Plan: NEW Apple ID, region **South Africa**, legal passport name, 2FA on, SA card,
enrol as **Individual ($99)** via the **Apple Developer app on iPhone** (not web),
stable single VPN exit for the whole session. 1–3 day approval. Decision made: do NOT
wait for HK org enrolment (D-U-N-S, weeks, China-verification limbo) — convert
individual → organization (Montree Limited) later when the HK account is funded;
seller name is the only real difference, payouts irrelevant (revenue is web-billed).

**Remaining to submission (≈ half a day once enrolment approves):**
1. APNs key → Railway (`APNS_AUTH_KEY`/`APNS_KEY_ID`/`APNS_TEAM_ID`) — push is
   wired but inert until set. Android's `FIREBASE_SERVICE_ACCOUNT` +
   `google-services.json` can wait (Play Store is later).
2. Xcode: signing → Archive → upload (`docs/APP_STORE_RUNBOOK.md`).
3. App Store Connect listing — copy exists (`APP_STORE_LISTING_AND_REVIEW.md`);
   screenshots NOT made yet; privacy-labels questionnaire (Claude can pre-draft
   answers from the codebase).
4. Reviewer demo account (throwaway school).
5. One physical-iPhone test: login → camera → photo upload → account deletion.
   NON-NEGOTIABLE before submitting.
6. At submission: deselect mainland China territory (ICP filing not worth it for v1).
Expect one possible 4.2 (thin wrapper) rejection round; response = lean on
push/camera/offline natives, add more if needed.

---

## Jun 12, 2026 (afternoon) — Native push + Android plugin sync + audit pass + Reels playbook

Five commits on `audit-cleanup-jun2026` (Cowork session): `a05bae92` (Android plugin
sync), `2b1d9a06` (push end-to-end), `d1a9866d` (docs), `bd1594bb` (audit fixes),
plus the social-guru Reels playbook commit. **AUDITED**: independent reviewer agent
went over the push diffs; found 9 issues (4×P1, 5×P2); 8 fixed in `bd1594bb`, 1
deferred (APNs HTTP/2 connection reuse — one connection per token send; fine below
~50 devices, hoist a shared session in `lib/montree/push/sender.ts:sendApns` if
fan-out grows). Build/tests NOT re-run here — this sandbox is Linux, node_modules
binaries are Mac (vitest/SWC). **Run `npm run build` + `npx vitest run` on the Mac
before merging.**

- **Android plugins synced** — all 9 Capacitor plugins wired into `android/` (was
  3 of 9). Native camera/mic now work on Android (permissions were already done).
  `capacitor.plugins.json` stays gitignored by design — `cap sync` regenerates it.
- **Push notifications end-to-end** — `montree_device_tokens` (migration 251 has
  **RLS enabled** — audit fix, do not run the pre-fix version), register API
  (teacher/principal/parent; homeschool_parent maps to owner_type 'parent';
  parent auth uses resolveAuthorizedParent; 10-device cap per owner), client
  registrar in dashboard/principal/parent layouts (session-gated + retries per
  route change so the iOS prompt NEVER fires on a login screen), server sender
  (FCM v1 Android / direct APNs HTTP/2 iOS, no Firebase iOS SDK; dead tokens
  retired only on 404/UNREGISTERED/410). Wired into: all 3 report-send routes
  (respects can_view_reports; weekly-wrap only for successfully published),
  thread messages BOTH directions (staff→parent and parent→staff; generic body,
  no message text on lock screens), broadcasts (parents + staff, deep links).
  iOS: App.entitlements + CODE_SIGN_ENTITLEMENTS (both App-target configs) +
  AppDelegate APNs forwarding.
- **To flip on (Tredoux):** run `db/RUN_THESE/04_push_device_tokens.sql`; Railway:
  `FIREBASE_SERVICE_ACCOUNT` (service-account JSON, base64 ok) for Android +
  `android/app/google-services.json`; `APNS_AUTH_KEY`+`APNS_KEY_ID`+`APNS_TEAM_ID`
  for iOS (needs Apple Dev enrolment — same blocker as archiving). Optional:
  `APNS_BUNDLE_ID` (default xyz.montree.app), `APNS_ENV`. Unconfigured = clean
  no-op, logged once.
- **Social guru** — `lib/social-media-guru/knowledge/facebook-reels-playbook.md`
  (auto-loaded): Tredoux's Jun 12 Reels analysis — 1-2s hook, 8-10AM/5-7PM only,
  ≤4 hashtags, question-led captions, engagement CTA, seeding checklist,
  draft-only guardrail. System prompt: platform playbooks override generic
  formulas.

## Jun 12, 2026 (morning) — App Store build (iOS ready to archive)

The Montree iOS app (thin Capacitor-8 wrapper of montree.xyz) is now assembled and committed on
`audit-cleanup-jun2026`. Done: in-app account deletion (Apple 5.1.1(v)) ported off the stale
`appstore/account-deletion` branch and wired into teacher/admin settings + a new parent account
page (run `migrations/250_account_deletion_audit.sql` / `db/RUN_THESE/03`); brand app icon + splash;
permission strings + privacy manifest committed; offline fallback (`MontreeViewController.swift`);
Android camera/mic/media/push permissions; **ios/ + android/ now git-tracked** (were ignored).
The remaining steps are inherently Tredoux's (Apple enrolment, signing, Archive, upload) — full
guide in `docs/APP_STORE_RUNBOOK.md`. Deploy this branch to montree.xyz BEFORE submitting (the app
loads the live site). NOTE: Capacitor 8 uses Swift Package Manager + `App.xcodeproj` (no
`.xcworkspace`, no CocoaPods); Xcode resolves the plugin packages on first open.

## Jun 12, 2026 (early hours) — Depth round: FUNCTIONALITY findings + fixes

Tredoux redirected the run: security deprioritised, "does it actually work" is the lens.
Three new reports in `~/Desktop/AUDIT-2026-06/` (FUNCTIONALITY-whale-frontend, -db-crosscheck,
-mobile). Headlines, plain language:
- **Parent report emails NEVER sent** — all three send routes queried `montree_child_parent_links`,
  a table that has never existed; the failure was silent and reports were still marked "sent".
  FIXED on the branch (`d57a13f1`) via new `lib/montree/parent-emails.ts`
  (montree_parent_children → montree_parents, respects can_view_reports + is_active).
- **The 9 learning games save no progress** — they POST to `/api/games/progress` + `/api/games/track`
  which don't exist. NEXT SESSION: build these (needs a table — propose SQL in chat).
- **Teacher signup dead-ended on a 404** right after registering; login link also pointed at a
  non-existent page; games-hub "Match Attack" card linked the wrong route. FIXED (`e76c2c76`).
- **21 tables referenced in code don't exist in production** (ranked in the db-crosscheck report;
  3 already have staged SQL); **77 production tables are referenced by nothing**.
- Reports nav broken two ways; games hub unreachable from any normal navigation. NOT fixed yet
  (needs a product decision on where Reports should point).
- Mobile/store: 2–4 weeks out — account-deletion branch stale + colliding migration number,
  6 of 9 Capacitor plugins not synced (camera/mic would fail on Android), ios/android not in git.
Branch `audit-cleanup-jun2026` now has 14 commits; build re-verified green after the last fix.
Standing rule from Tredoux (Jun 12): everything he needs goes IN THE CHAT; docs are for memory.

## Jun 11, 2026 (overnight) — Portfolio audit run, whale Phase A+B

Read-only audit (4 parallel reviewers + direct verification) then surgical
fixes on branch `audit-cleanup-jun2026`. Highlights: super-admin session
tokens no longer signed with the login password itself (new optional
`SUPER_ADMIN_JWT_SECRET`); login rate limiting fails closed on 6 credential
routes; password removed from URL query strings (3 routes; impact-fund also
had a non-timing-safe compare that accepted an EMPTY password if the env var
was unset); story nuke got a 10-min cooldown + durable audit trail in the
montree security log; public application forms got rate limits + input caps;
media/photo deletes now clean up storage files. Verified: 9/9 tests, fresh
`npm ci` + `npm run build` green, tsc error count unchanged (5,250 — all
pre-existing). Decisions needed from Tredoux are in the master doc on the
Desktop.

---

## What happened today (Session 139 — May 30) — Astra/Mira voice arc + Story Montree-facade

Big build marathon, merged `astra-voice-copilot` → main (ending `d99de791`).
**Full detail: `docs/handoffs/ASTRA_MIRA_VOICE_REALTIME_HANDOFF.md`,
`…_EXECUTION_SPEC.md`, `…_ARCHITECTURE.md`.** All new features feature-flagged
OFF by default.

- **Voice Astra** — hands-free multilingual agent via Agora Conversational AI
  (lib `lib/montree/voice-agent/`; routes `…/admin/voice/{token,agent,llm}`;
  client `hooks/useAstraVoice.ts` + `AstraVoiceButton` wired into the admin
  composer). Actions reuse `executeTracyTool` via an OpenAI-style LLM shim with
  confirm-gated mutations. Flag `voice_astra`. **Needs `VOICE_LLM_SHARED_SECRET`
  in Railway for actions** (without it: talk-only).
- **Live meeting co-pilot** — `…/parent-meetings/[id]/copilot` + on-device
  `MeetingCopilotPanel` wired into the meeting page. Flag `live_copilot`.
- **Learner memory** — migration 244 + `lib/montree/learner/{loader,recorder}.ts`
  + `…/admin/learner/record`. Flag `home_learning`.
- **New Astra tools** — `family_context`, `school_pulse` (text + voice).
- **Story facade** — calls now read "Montree — call request"; in-call names
  J/P; `current-call` returns `from:'Montree'`. DB renamed **T→J / Z→P** across
  `story_*` (dropped the `*_username_check` constraints first). **Story login is
  now J / P.**

**Migrations RUN (Supabase, this session):** 237–243 + 242b + **244** (all 15
objects verified). `MONTREE_ENCRYPTION_KEY` set in Railway.

**Next (Tredoux):** add `VOICE_LLM_SHARED_SECRET`; flip `voice_astra` /
`live_copilot` on a test school; on-device voice + co-pilot tests; oral-reading
spike before building the home tutor.

---

## What happened earlier (Session 136 — May 30) — Marketing site + English-area materials loop

A long build session. **No DB migrations.** Everything shipped to `main` and
auto-deployed via Railway. Two big threads:

### Thread 1 — Splash + Explainer marketing pages (all portrait, mobile-first)

- **Splash hero (`app/montree/page.tsx`) rebuilt as a split layout:** portrait
  9:16 video LEFT, text block RIGHT (gold eyebrow → Montree → tagline → CTA →
  kicker), collapses to a centred stack ≤880px. The hero videos are now the
  **MAIN EXPLAINER film (EN)** + the **Chinese Astra clip (中文)**, served from
  `montree-media/splash/montree-splash-video-v4.mp4` (EN) and `…-zh-v3.mp4`
  (中文). Posters are portrait frames in `/public`.
- **New `/montree/explainer` page** (`app/montree/explainer/page.tsx`): a
  hero (the main explainer film) + a gallery of **11 feature films**. 10 are
  live (smart-capture, weekly-reports, guru, astra, curriculum, communication,
  voice-onboarding, appointments, library, multilingual); **reading-tracker is
  still "coming soon"** (not produced yet). Video 5 (child-profiles) was
  removed at Tredoux's request. "Explainer" nav link + teaser strip added to
  the splash.
- **Video pipeline:** HeyGen masters are 1080×1920 portrait. We re-encode to
  720×1280 CRF26 + faststart (~2–6MB) and upload to
  `montree-media/explainer/<slug>.mp4` (gallery) or `splash/…` (hero) via the
  Supabase service key (`SUPABASE_SERVICE_ROLE_KEY` in `.env.local`). Uploads
  can flake ("fetch failed") — the upload scripts retry. To add a film: encode,
  upload to the right path, flip `available: true` on its entry.
- **Scripts:** `Montree_HeyGen_Scripts.md` (root) holds all 13 scripts incl. the
  final **MAIN EXPLAINER** ("Montessori begins with watching…") — essence-led,
  Guru/Astra + whole-school woven in. The Colossyan twin is
  `Montree_Campaign_Video_Scripts.md`. A browser-Claude runbook lives at
  `Montree_HeyGen_Webclaud_Runbook.md`.

### Thread 2 — English-area curriculum: doc + the materials loop

This is the big one. **The classroom curriculum and the Library material
generators are now joined**, so a teacher goes from "where this child is" to
"print exactly these materials" in one click.

- **Curriculum doc:** `docs/English_Corner_Curriculum_Revamp.md` (+ `.docx`) —
  the authentic Montessori prep→reading sequence, EAL-tuned (3–6, English as
  additional language), with an independent-materials build list. This is the
  *why/method* layer the Library's phonics scheme was missing.
- **The join (the merge):** every one of the **85 word-bank groups** in
  `lib/montree/phonics/phonics-data.ts` now carries `lessonNums` (the
  `lesson-map.ts` lessons it teaches), and every group now has a stable `id`
  (`id` is now **required** on `PhonicsWordGroup` — fixed a latent per-group
  selection bug in the generators). 72 of 128 lessons resolve to groups; the
  other 56 are oral/review/morphology (intentional gap).
- **Resolvers:** `lib/montree/english-sequence/lesson-materials.ts` —
  `getGroupsForLesson`, `getPhaseIdsForLesson`, `getLessonMaterials`,
  `getLessonScope`, `getLessonScopeForPhase`, `getReadingPhaseForLesson`,
  `lessonCoverage`. Plus a lean `lesson-coverage.ts` (just a 72-number Set +
  `hasLessonMaterials()`) so the dashboard gates UI without bundling phonics-data.
- **All 8 phonics-fast generators accept `?lesson=N`** (three-part-cards,
  pink-box, blue-box, labels, bingo, reverse-bingo, command-cards,
  sentence-cards, stories) — backward compatible with `?phase=`.
- **Per-lesson launcher** `app/montree/library/lesson/[lesson]/page.tsx`: a
  shareable page showing every generator (deep-linked `?lesson=N`) + reference
  (lesson page, sound song, readers) for that lesson.
- **English Progression tab** (`classroom-overview`) now shows a gated **"Make
  materials"** button per child → opens the launcher for that child's
  `current_lesson`.

---

## Health (end of session)

ESLint 0/0 on all new files; i18n strict **12/12** in sync; tsc clean on new
modules; live routes verified 200 (`/montree`, `/montree/explainer`,
`/montree/library/lesson/42`, generators `?lesson=`); media 206. Build is green.

---

## Still pending / next

**🎙️ NEXT BIG ARC — Real-time voice Astra + live co-pilot + home learning:**
Full code-grounded build plan in
`docs/handoffs/ASTRA_MIRA_VOICE_REALTIME_HANDOFF.md`. Hands-free multilingual
voice Astra (Agora) that takes actions; turn the post-hoc parent-meeting
pipeline into a LIVE co-pilot; a home learning program with children's
oral-reading (the highest-leverage + hardest piece — spike it first); memory +
multimodal "wow". Recommended start: Phase 0 oral-reading spike ∥ Phase 1
hands-free Astra; first *code* increment = feature-flagged live co-pilot
(reuses existing Whisper + Sonnet/Haiku, no new vendor). Blockers: Agora keys +
reading-ASR vendor decision.

**✅ DB migrations — RUN (Session 139):** 237, 238–243, 242b AND 244 all applied
& verified in Supabase. (Historical note on what each was, below.)

**Earlier carry-forward list (now resolved):**
- `237_meeting_dossiers.sql` (Session 133) — dossier cache; until run, every
  dossier reopen re-spends Sonnet (~$0.05).
- `238`–`243` + `242b` (Session 135 — Ultimate Astra Marathon) — parent
  profiles, meetings, transcripts, analyses, Tracy corpus (pgvector), consent
  flags. Routes degrade gracefully (`migration_pending=true`) until run.

**This session's open items:**
1. **Produce the MAIN EXPLAINER film** — *DONE & live* (uploaded to
   `explainer/main-explainer.mp4` + `splash/…-v4.mp4`).
2. **reading-tracker explainer film** — still to produce; upload to
   `explainer/reading-tracker.mp4` and flip `available: true`.
3. **Prep-stages chapter (the deeper next build):** fold the authentic prep
   (spoken language, sound games, sandpaper letters, moveable alphabet) into the
   same trackable/launchable model so the launcher covers the *foundation*, not
   just the 72 reading lessons — with readiness gates as metadata. Bigger build.
4. **(Minor)** Splash/explainer code comments say "Session 131–134" — those
   numbers collide with the real 133/134/135; this work is actually Session 136.
   Cosmetic only.

---

## Where things live (new this session)

- Marketing pages: `app/montree/page.tsx`, `app/montree/explainer/page.tsx`
- Lesson launcher: `app/montree/library/lesson/[lesson]/page.tsx`
- The join: `lib/montree/phonics/phonics-data.ts` (lessonNums + ids),
  `lib/montree/english-sequence/lesson-materials.ts`,
  `lib/montree/english-sequence/lesson-coverage.ts`
- Generators (all `?lesson=N`): `app/montree/library/tools/phonics-fast/*`
- Curriculum doc: `docs/English_Corner_Curriculum_Revamp.md` / `.docx`
- Video scripts: `Montree_HeyGen_Scripts.md`, `Montree_HeyGen_Webclaud_Runbook.md`

---

## Don't break these (still true)

- Service worker stays immutables-only (`public/montree-sw.js`).
- `LESSON_MAP` in `english-sequence/lesson-map.ts` is a CONSTANT — don't
  renumber the 1–128 lessons (breaks `current_lesson`/`mastered_lessons`).
- `phonics-data.ts` `lessonNums` ↔ `lesson-map.ts` is the source-of-truth join;
  if you edit lessonNums, regenerate `lesson-coverage.ts` (lessonCoverage()).
- Every Sonnet-calling route tier-gates via `resolveReportModel()`.
- Splash/explainer media: encode portrait → 720×1280 CRF26 faststart → upload
  to `montree-media`; versioned filenames bust the CDN cache.
