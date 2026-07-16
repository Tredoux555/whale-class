# PLAN + CLOSE-OUT — GRACE & COURTESY INTRO WEEKS (Jul 16, 2026)

**Opus build against the Fable contract. Two Grace & Courtesy "Intro Weeks" (the first two weeks of
school — classroom-rules weeks, NOT phonics) are now first-class citizens of the 58-week English
curriculum engine, printable via the render engine, and visible FIRST in the public Curriculum Studio.
Content source (ground truth): `docs/curriculum/GRACE_AND_COURTESY_SONGS_JUL16.md`. NOT committed —
Tredoux pushes via Desktop Commander, scoped add (tree has unrelated pre-existing dirt — see §8).**

---

## 1. What shipped

- **Intro Week A — Grace & Courtesy: Our Classroom (Days 1–5)** — greeting, walking feet, indoor voice,
  gentle hands, hand-washing.
- **Intro Week B — Grace & Courtesy: Our Work (Days 6–10)** — roll the mat, push in your chair, may I
  watch?, everything has a home, and the class anthem "The Whale Class Way".
- Each carries its **5 songs** (lyrics VERBATIM from the doc, locked Suno style v2, `role:"rule"`,
  planned audio proxy URLs `curriculum-songs/gc-d01…gc-d10.mp3`).
- Each renders **4 printable materials**: **Rule Flashcards** (image + rule phrase), **Class Rules
  Poster** (one page, 5 rules), **Colouring Pages**, **Song QR Cards**.
- The Studio shows an **"Intro · Grace & Courtesy"** section rendered BEFORE Level 1, with an "Intro A /
  Intro B" chip and the full displayName heading; the phonics weeks 1–58 are untouched.

## 2. Registration mechanism chosen (and why)

**Sentinel week numbers 101 (A) / 102 (B) + a parallel Intro rail + `displayName` masking.**

- The two specs are `lib/montree/english-curriculum/spec/intro-week-a.json` / `intro-week-b.json` —
  deliberately NOT named `week-NN.json`, so **every publishing/seed script is blind to them** (they all
  glob `week-<NN>.json` or loop 1..58: `publish-images`, `publish-videos`, `set-audio-urls`,
  `upload-songs`, `seed-english-program`, and the phonics validator glob). Intro weeks can never leak
  into or renumber the 1–58 spine. `lesson-map.ts` is untouched.
- Registered with ONE line each in `spec/index.ts` `WEEK_LOADERS` (keys 101/102) so `getWeek(101/102)`
  resolves through the same code path as every other week — no parallel loader function.
- `WeekSpec.displayName` (new optional field) carries "Intro Week A — …"; the Studio shows it instead of
  "Week 101", so the sentinel number is **never visible to a user**. Phonics weeks omit displayName →
  they still show "Week N · sound /x/" byte-identically.
- Why not `week: 0`/negatives? The Studio's prior-spec loader fans out `week - 1` `getWeek()` calls;
  large sentinels would try to load 100 phantom weeks, and negatives/zero trip the `>= 1` guards + `pad()`.
  Instead the Studio simply **skips prior-spec loading for intro weeks** (there is no "prior" phonics
  week), keeping the number choice free and safe.

## 3. Files created / modified

**Created**
- `lib/montree/english-curriculum/spec/intro-week-a.json` — Intro Week A (Days 1–5).
- `lib/montree/english-curriculum/spec/intro-week-b.json` — Intro Week B (Days 6–10).
- `lib/montree/english-curriculum/render/builders/class-rules-poster.ts` — the ONE new builder
  (one A4 page, title band + 5 house-green rule rows; missing image → placeholder + warning).
- `docs/handoffs/PLAN_GC_INTRO_WEEKS_JUL16.md` — this doc.

**Modified**
- `spec/types.ts` — `SoundType += 'grace-courtesy'`; `SongSpec.role += 'rule'`; new optional
  `WeekSpec.displayName`; new optional `MaterialsSpec.ruleCards[]` ({image, phrase, day?}).
- `spec/index.ts` — `WEEK_LOADERS` keys 101/102; `INTRO_WEEK_NUMBERS`, `isIntroWeek()`, `INTRO_WEEK_META`.
- `render/index.ts` — `MaterialType += 'class_rules_poster'`; builder wired into `BUILDERS` +
  `MATERIAL_TYPES` (appended); new `materialTypesForSpec(spec)` (curated 4 for G&C weeks; the full 11
  MINUS the poster for phonics weeks).
- `render/builders/flashcards.ts` — rule-card mode: when `materials.ruleCards` is present, renders
  image + rule PHRASE (verbatim, no opening letter card). Absent on phonics → **byte-identical** deck.
- `app/montree/library/curriculum-studio/page.tsx` — Intro rail section (first); `materialTypesForSpec`
  drives the grid + full-pack; `displayName` in the summary; deep-link/localStorage guards accept
  101/102; prior-spec loader skips intro weeks (no 100-call fan-out).
- `scripts/curriculum/build-week.mjs` — `--intro a|b` (loads `intro-week-<x>.json`, defaults to the
  "Intro Week A/B" folders + an `images/` asset leaf); default material set now derives from
  `materialTypesForSpec(spec)`; phonics `--week N` path unchanged.
- `scripts/curriculum/validate-specs.mjs` — `VALID_SOUND_TYPES += 'grace-courtesy'`; a dedicated
  **intro-week validation pass** (globs `intro-week-*.json`, relaxed decodability-exempt mode).
- `.gitignore` — ignores the temp scoped tsconfig (see §8).

## 4. Validator changes (the hard gate)

- **All 58 phonics weeks still exit 0, byte-for-byte unchanged** — the intro specs are a different
  filename glob, so the phonics gate never sees them.
- Intro specs are **NOT skipped silently**: a new relaxed pass validates them under Grace & Courtesy
  rules — decodability is exempt (nothing to decode), but structure IS enforced: sentinel week number
  ∈ {101,102}, `soundType==='grace-courtesy'`, valid level, non-empty `ruleCards` with image+phrase,
  songs present, book present; manifest gaps are warnings. A structural problem is a hard failure.
- **Runtime result:** `validate-specs.mjs` → all 58 authored phonics weeks pass + both intro weeks
  structurally valid, **exit 0**. `--self-test` → all fixtures green.

## 5. Asset picks (one iconic image per day)

Staged (COPIED, never moved — mvgen keeps the originals) from
`~/Desktop/Music Videos/Grace and Courtesy/Day NN …/images/` into
`~/Desktop/English Curriculum 2026/Intro Week A|B/images/<stem>.png`:

| Day | Rule phrase | Stem | Source file (iconic pick) | Status |
|----|----|----|----|----|
| 1 | Hello, hello! | hello | Day 01 / `01-hello.png` (children waving) | ✅ staged |
| 2 | Walking feet | feet | Day 02 / `01-feet.png` (heel-to-toe) | ✅ staged |
| 3 | Indoor voice | voice | Day 03 / `05-friend.png` (child concentrating) | ✅ staged |
| 4 | Gentle hands | hands | Day 04 / `01-hands.png` (cupped hands) | ✅ staged |
| 5 | Wash your hands | wash | Day 05 / `03-bubbles.png` (sudsy hands) | ✅ staged |
| 6 | Roll the mat | mat | Day 06 / `01-mat.png` (rolled mat) | ⏳ Day 6–10 images pending |
| 7 | Push in your chair | chair | Day 07 / `01-chair.png` (chair tucked) | ⏳ pending |
| 8 | May I watch? | watch | Day 08 / `01-watch.png` (observing) | ⏳ pending |
| 9 | Everything has a home | home | Day 09 / `01-shelf.png` (tidy shelf) | ⏳ pending |
| 10 | That's the way! | class | Day 10 / `06-play.png` (whole class) | ⏳ pending |

Days 6–10 images were still landing at build time — Intro Week B's flashcards/poster render
placeholders + a gap report until they're staged. **Colouring line art** is a separate stream
(`~/Desktop/English Curriculum 2026/Intro Weeks/coloring/`, currently empty); when it lands, copy each
`day-NN-<word>.png` to `<stem>-coloring.png` in the matching intro `images/` folder (day 1→hello …
day 10→class) so the colouring builder resolves it.

## 6. Build results + rerun commands

- **Validator:** `node scripts/curriculum/validate-specs.mjs` → exit 0 (58 weeks + 2 intro).
  Self-test: `node scripts/curriculum/validate-specs.mjs --self-test` → all green.
- **Render:** both intro packs render via the CLI (HTML verified in the sandbox — real images resolved
  for Intro A; graceful gap report for Intro B; **no crashes, exit 0**). PDF was skipped in the sandbox
  (no Chrome). **On the Mac, rerun to get PDFs:**

```
cd ~/Desktop/Master\ Brain/ACTIVE/montree
node scripts/curriculum/build-week.mjs --intro a \
  --assets ~/Desktop/English\ Curriculum\ 2026/Intro\ Week\ A/images \
  --out    ~/Desktop/English\ Curriculum\ 2026/Intro\ Week\ A/pack
node scripts/curriculum/build-week.mjs --intro b \
  --assets ~/Desktop/English\ Curriculum\ 2026/Intro\ Week\ B/images \
  --out    ~/Desktop/English\ Curriculum\ 2026/Intro\ Week\ B/pack
# --gap-only for just the missing-picture report; --materials class_rules_poster,flashcards to scope.
```

- **Phonics regression:** Week 1 + Week 4 rebuild all 11 materials (no poster), and phonics flashcards
  keep their letter glyph card → phonics output unchanged. `materialTypesForSpec` returns the identical
  11-in-order for every phonics week.
- **Lint:** `npx eslint <touched>` → **0 errors** (2 pre-existing setState-in-effect WARNINGS in the
  Studio's spec-loading effect, not mine — my new effect was written to avoid the warning).
- **tsc:** scoped `tsc --noEmit` over the 6 touched TS/TSX files → **exit 0**.

## 7. Suno / audio / video status

- Songs carry planned proxy audio URLs (`curriculum-songs/gc-d01…gc-d10.mp3`) matching the W2 pattern —
  the QR cards encode them and the Studio audio player points at them (pre-publish, `preload="none"` →
  no fetch until played; a not-yet-live URL cannot break the page). **`videoUrl` is deliberately absent**
  so the Studio shows the quiet "coming soon" slot rather than a dead `<video>`.
- Because the intro specs are `intro-week-*.json`, the existing `set-audio-urls.mjs` / `upload-songs.mjs`
  / `publish-videos.mjs` scripts (which key on `week-NN.json`) will NOT touch them — audio/video URLs on
  the intro specs are hand-set here and stay hand-maintained (or a small intro-aware publish step later).

## 8. Owed / flagged

- **Push (Tredoux, Desktop Commander, scoped add):** my files only —
  `lib/montree/english-curriculum/spec/{intro-week-a,intro-week-b}.json`,
  `lib/montree/english-curriculum/render/builders/class-rules-poster.ts`,
  `lib/montree/english-curriculum/render/index.ts`, `lib/montree/english-curriculum/spec/{types,index}.ts`,
  `lib/montree/english-curriculum/render/builders/flashcards.ts`,
  `app/montree/library/curriculum-studio/page.tsx`,
  `scripts/curriculum/{build-week.mjs,validate-specs.mjs}`, `.gitignore`, and this doc.
  **Pre-existing tree dirt to AVOID** (not mine, do not add): `scripts/curriculum/audit-video-coverage.py`
  (M), untracked `build-capcut-packages.py` / `make-thumbnails.py` / `publish-videos.mjs` /
  `verify-alias-pass-jul15.py` / `__pycache__/`.
- **Desktop Commander delete** (sandbox `rm` blocked — gitignored so safe): repo-root
  `tsconfig.gcintro.tmp.json` + `tsconfig.gcintro.tmp.tsbuildinfo`.
- **Days 6–10 images:** when the mvgen images land, stage the iconic pick per §5 into
  `Intro Week B/images/<stem>.png`, then rerun the Intro B build for a complete pack.
- **Colouring line art:** stage `Intro Weeks/coloring/day-NN-<word>.png` → `<stem>-coloring.png` when ready.
- **Songs:** produce the 10 Suno tracks (2 takes each), then set the real mp3 URLs (the planned
  `gc-dNN.mp3` proxy keys are already in the specs) and, once certified, add `videoUrl` per song.
- **Device walk (Studio):** open `/montree/library/curriculum-studio`, confirm the Intro section renders
  first, Intro A previews show real flashcards/poster images + the 5 songs, Intro B shows graceful
  placeholders, and every phonics week is unchanged.

## 9. Rules for the next session (do not break)

- Intro weeks are `intro-week-*.json` with sentinel week 101/102 + `soundType:'grace-courtesy'` — never
  give them a `week-NN.json` filename, never renumber 1–58, never touch `lesson-map.ts`.
- A new intro material = `materialTypesForSpec` + a pure builder, never hardcoded in the Studio.
- The flashcards rule-mode branch is guarded on `materials.ruleCards`; phonics weeks must stay
  byte-identical — do not move the guard.
- `displayName` masks the sentinel number everywhere a week surfaces — keep it set on intro specs.

---

## 10. Fresh-eyes audit close-out (Jul 16, 2026 — SHIP-WITH-WARNINGS, 0 CRIT → all WARNs fixed)

A Sonnet fresh-eyes audit returned **0 CRIT, SHIP-WITH-WARNINGS**. Every warning was a
sentinel-number leak (the intro weeks' 101/102 showing through a `Week ${spec.week}` string). All
fixed by threading `displayName` / guarding on `isIntroWeek`:

1. **Studio week-strip chip** (`app/montree/library/curriculum-studio/page.tsx` ~L429) — the chip's
   tiny `W{s.week}` line printed "W101"/"W102". Now guarded: `{!isIntroWeek(s.week) && …}` — intro
   chips show only their "Intro A/B" label + word; phonics chips are unchanged.
2. **Colouring builder** (`render/builders/coloring.ts` L76) — document `<title>` was
   `Week ${spec.week} — Colouring` → "Week 101". Now `${spec.displayName || \`Week ${spec.week}\`} — Colouring`.
3. **QR-cards builder** (`render/builders/qr-cards.ts` L72) — same pattern → `${spec.displayName || …} — Song QR Cards`.
4. **Studio full-pack print** (`curriculum-studio/page.tsx` printFullPack ~L374) — `<title>Week ${spec.week} — Full Pack</title>`
   → `<title>${spec.displayName || \`Week ${spec.week}\`} — Full Pack</title>`.
5. **Landmine guard** (`spec/index.ts` `authoredWeekNumbers()` ~L142) — was returning
   `[1..58, 101, 102]` (zero callers, but a future caller could assume a pure 1–58 range). Now
   filters `n < 100` with a comment pointing at `INTRO_WEEK_NUMBERS` for the sentinels.
6. **This doc** — §4 corrected "32 authored phonics weeks pass" → all 58.

Phonics weeks stay byte-identical (they carry no `displayName`, so `spec.displayName || \`Week ${spec.week}\``
resolves to the exact prior string). Re-gated after the fixes: validator exit 0 + self-test green,
eslint 0 errors on touched files, scoped tsc exit 0, both intro packs rebuilt (PDFs non-zero), Week 4
phonics spot-check unchanged ("Week 4 — Colouring").
