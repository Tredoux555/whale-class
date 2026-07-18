# PLAN — Dark Phonics Flashcard in Week Packs + Studio Video Ordering (Jul 17, 2026)

## ✅ CLOSE-OUT (Jul 17/18 night) — BUILT, AUDITED (FIX-FIRST → fixed), SHIPPED-pending-push

Opus build → Sonnet fresh-eyes audit (1 CRIT: descender glyphs g/j/p/q/y overlapped the
catchphrase on 5 of 27 cards — caught by rasterizing real PDFs) → Opus fix (em-proportional
descender padding, other 22 cards byte-identical; A4_HEIGHT_CM import fixed) → raster-verified
all 5 + control. Gates: eslint 0 err, scoped tsc 0. **Coverage: 27 cards (weeks 1–26 + 30),
27/27 videoUrls verified live in the `dark-phonics` bucket.** Weeks 27–29/31–58 silently skip.
Images filed to `English Curriculum 2026/Dark Phonics/lesson-NN.png` (lessons 14/18/20 = clean
video frames; 17 = ck chicken frame; 31 = duck ref sheet). Same session: photo bank ingest
(+936 curriculum JPEGs, bank now 1,322 rows all-JPEG) + exact-dupe cleanup (−18 rows, 0 orphans)
via new `scripts/upload-curriculum-images-to-photo-bank.mjs` + `scripts/dedupe-photo-bank.mjs`.

⏳ OWED: Tredoux commit+push via DC (incl. proxy allowlist — **Studio dark-phonics videos 502
until deployed**) · DC-delete `tsconfig.darkphonics.tmp.json` + `.tsbuildinfo` · Tredoux eyeball:
lesson-17 (ck chicken) vs lesson-18 (e hens) art similarity — alternates in `Dark Phonics/_staging/`;
lesson-31 duck grey-spotlight style vs white deck · optional bank eyeball: cross-label exact-dupe
pairs (thin→thick, uranus→neptune, jumping→hop, sun, tin can) + 114 same-label variety groups
(`/tmp/photo_bank_label_variety.json`).


**Binding contract. Fable-authored. Opus builds, Sonnet audits. Tredoux-confirmed spec:
ONE double-sided flashcard per week (picture front / BIG letter + catchphrase back) added to
the existing printable week pack. NOT a full dark-phonics pack. Studio plays the dark phonics
video FIRST, then the sensible curriculum songs.**

## §1 Data (no spec churn)

- NEW `lib/montree/english-curriculum/spec/dark-phonics.json`:
  `{ "lessons": { "05": { "sound": "s", "title": "<catchphrase>", "image": "lesson-05.png", "videoUrl": "<verified-or-null>" }, ... "31": ... } }`
- Sounds + catchphrases come from the video filenames in
  `~/Desktop/Dark Phonics Songs/Dark Phonics — Final Videos (5-31)/`
  (`Lesson NN - x - Title.mp4` → sound = x, catchphrase = Title, e.g. "Kooky King",
  "Icky Sticky Pig", "Kick the Stinky Sock", "Quick Quacky Duck").
- Week → lesson via the EXISTING `weekToLessonMap`. The card renders ONLY when the mapped
  lesson exists in dark-phonics.json AND its image file exists. All other weeks: material is
  silently skipped — NOT a gap-report entry, not an error.
- 🚨 `week-NN.json` specs NOT touched. `lesson-map.ts` NOT touched. Validator NOT touched.

## §2 Assets

- Card images filed at `~/Desktop/English Curriculum 2026/Dark Phonics/lesson-NN.png`.
  Populate by: copying from `~/Desktop/Dark Phonics Songs/Dark Phonics Pictures/` (map the
  human-named files → lesson numbers using the video titles + the 44-page
  `~/Downloads/Documents/Dark-Phonics-Flashcards.pdf` lesson list + the Kaiber
  `_RECOVERY_TRACKER.md`; REPORT the full mapping table for Tredoux's eyeball).
- Lesson 31 = the square 1024×1024 duck already staged at
  `English Curriculum 2026/Dark Phonics/_staging/u6724885345_character_reference_sheet_of_a_cartoon_duck_*.png`.
- Lesson 17 = a clean ffmpeg frame from `Lesson 17 - ck - Kick the Stinky Sock.mp4` (~t=10s,
  the chicken+egg scene, verified matching deck style).
- Ambiguous or missing lessons: skip + list in the report. Never guess a mapping.
- 🚨 NEVER copy any of these into a `Week NN/images/` folder (mvgen lyric-match pollution rule).

## §3 Builder

- New pure render builder in `lib/montree/english-curriculum/render/` following the existing
  builder patterns: **dark-phonics-card**.
  - Page 1 (front): the image, generous near-full-page, house frame styling consistent with
    the pack. White paper (print rule — no dark theme on printables).
  - Page 2 (back): duplex short-edge-flip geometry, mirrored alignment (reuse the bingo duplex
    approach — ONE duplex impl posture): BIG lowercase letter(s) (digraphs "ck"/"qu" render
    both letters), catchphrase beneath in large friendly type, small `montree.xyz` footer.
- `scripts/curriculum/build-week.mjs`: register the material type, derived via
  `materialTypesForSpec` (remember the Jul-16 ALL_MATERIALS omission lesson). New
  `--dark-phonics-dir` flag, default `~/Desktop/English Curriculum 2026/Dark Phonics`.
  0-byte-PDF hard-fail guard applies.

## §4 Studio

- Curriculum Studio week view: when the week's mapped lesson has a `videoUrl` in
  dark-phonics.json, render that video FIRST in the songs area, labeled
  "Dark Phonics — <Title>", then the existing curriculum songs.
- `videoUrl` values are verified AT BUILD TIME against the Supabase `dark-phonics` bucket
  (service key, read-only listing) and baked into dark-phonics.json — NO runtime bucket
  listing, no broken embeds; missing video ⇒ null ⇒ no player.
- 🚨 No `<style jsx>` in conditional branches (May-29 Turbopack rule).

## §5 Gates

- eslint 0 errors on all touched files; scoped tsc clean.
- Regenerate packs for every week that gains the card, with EXPLICIT `--assets` and
  `--out .../pack-v2` (never bare defaults — stray `pack/` rule).
- Verify: each regenerated pack has the new non-zero card PDF; spot-open 2 cards (one single
  letter, one digraph) and read them visually.
- Deliver a per-week coverage table (week → lesson → sound → catchphrase → card yes/no →
  video yes/no).

## §6 Landmines

- Repo tree has unrelated dirt — do NOT commit or push. Tredoux pushes via Desktop Commander.
- Don't touch mvgen, games, parent surfaces, lesson-map, validator, week specs.
- Avoid new root temp tsconfigs; if unavoidable, gitignore + flag for DC delete.
- Sonnet fresh-eyes audit REQUIRED before declaring done (sacred flow).
