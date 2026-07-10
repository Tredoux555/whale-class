# PLAN — CURRICULUM STUDIO + LEVEL 1 ENGLISH CURRICULUM (Jul 10, 2026)

**This is the binding build contract. Fable authored it; Opus builds against it; Sonnet audits against it. Read fully before touching anything.**

## 0. Mission

Turn Tredoux's 26-Week Sound Curriculum (the locked spine, `docs/curriculum/26_WEEK_SOUND_CURRICULUM.md`) into:
1. A machine-readable **master spec** — one `week-NN.json` per week, single source of truth for ALL content.
2. A unified **render engine** — one TS module that turns a WeekSpec + assets into every printable material.
3. **Curriculum Studio** — a public Library tab: pick week → drop images → preview/print everything.
4. An **agent-drivable CLI** — `scripts/curriculum/build-week.mjs --week N` renders the full weekly pack HTML→PDF unattended on the Mac.
5. (Phase 2, separate build) Montree app integration: curriculum pack seeded into `montree_classroom_curriculum_works`, photo-ID visual memory, This Week view.
6. (Phase 3) *The Conductor's Score* — the printed teacher manual.

## 1. LOCKED DECISIONS (Tredoux-approved Jul 10 — do not re-litigate)

- **Phonics spine = the utility-first order** A→T→M→C→S→N→P→I→H→D→O→G→B→E→R→U→F→L→W→J→K→V→Y→X→Qu→Z. CMAT retires. SATPIN survives only as the untouched 128-lesson `lesson-map.ts` long-arc tracker; a week→lesson equivalence map ships in the spec module. NEVER renumber `lesson-map.ts`.
- **Scope**: Level 1 (26 weeks) built in full. Levels 2–3 = designed skeletons only (`spec/level2-skeleton.json`, `level3-skeleton.json`).
- **Old satellites** (15 Pink Readers, 49 acoustic Pink Phase Songs, Dark Phonics, Phonics Fast): KEEP as library extras. Do not delete, do not re-gate, do not modify.
- **Backend**: local Mac CLI + headless Chrome (mvgen pattern). No server-side Puppeteer on Railway.
- **Songs**: 2/week from W2 (sound song = stutter pattern; word song = sentence frame), W1 = one song. Dark trap Suno base style (locked string in §5). Supersedes acoustic songs as the curriculum path.
- **Coloring art**: MJ-generated line art (`<word>-coloring.png` in the manifest), NOT hand-authored SVG shapes and NOT CSS filters. The engine composes pages from these assets.
- **Design language**: books = dark forest `#0a1a0f` + gold `#E8C96A` + Andika; print materials = `#2D5A27` frames + locked geometry (§4). Andika bundled via `@font-face`, never OS fonts.
- **Montree wiring is ON** (reverses the Jul-2 "do not wire into Montree" note — Tredoux's explicit instruction).
- Public/open-source: everything under `/montree/library/` stays unauthenticated by design.

## 2. FILE MAP (all new files)

```
lib/montree/english-curriculum/
  spec/
    types.ts                # WeekSpec + related interfaces — THE schema (already authored by Fable)
    index.ts                # loader: getWeek(n), getAllWeeks(), weekToLessonMap
    week-01.json … week-26.json
    level2-skeleton.json    # 16 weeks × {sound(s), focus, unit} — design only
    level3-skeleton.json
  render/
    geometry.ts             # ALL locked print constants (single source; see §4)
    html-shell.ts           # shared doc shell: @page, fonts, print CSS, escapeHtml/sanitizeImageUrl
    adaptive-font.ts        # ONE implementation of shrink-to-fit (port of print-utils.ts adaptiveLabelFontSize)
    letter-strokes.ts       # stroke-path data for a–z lowercase print (SVG paths + numbered arrows + start dot)
    assets.ts               # AssetMap type, filename→word matching, gap report (mirrors mvgen Shot Planner)
    builders/
      three-part-cards.ts   # control card / picture card / label — 7.5cm squares
      sentence-strips.ts    # 21×6.5 control strips + 6.5 picture + 14.5 sentence cards
      matching.ts           # word↔picture draw-a-line sheet
      bingo.ts              # boards + duplex calling cards — THE single duplex-mirror implementation
      tracing.ts            # letter worksheet: stroke arrows + shrinking trace rows + word section
      coloring.ts           # 2×2 grid + hero page from *-coloring.png assets
      dictionary-journal.ts # color + trace + write journal pages
      book.ts               # A5 landscape dark-forest page-turn-reveal book
      vowel-wall.ts         # full-page letter posters (vowel blue #2456c7 for vowels)
      qr-cards.ts           # song QR cards (qrcode pkg already in repo)
    index.ts                # buildMaterial(type, spec, assets, opts) => string (full HTML doc)
app/montree/library/curriculum-studio/
  page.tsx                  # the Studio (client component; may split components/ beside it)
scripts/curriculum/
  build-week.mjs            # the agent CLI (node, repo-local; headless Chrome for PDF)
docs/curriculum/spec/MASTER_SPINE.md   # human-readable 26-week map (Fable-authored)
```

**Also touched (minimal):** `app/montree/library/page.tsx` — add a 5th top-level card "Curriculum Studio" (peer of Content Creation Tools, not inside the tools grid). NOTHING else in the existing generators is modified in this phase.

## 3. RENDER ENGINE API CONTRACT (build UI and CLI against this in parallel)

```ts
// render/index.ts
export type MaterialType =
  | 'three_part_cards' | 'sentence_strips' | 'matching' | 'bingo'
  | 'tracing' | 'coloring' | 'dictionary_journal' | 'book'
  | 'vowel_wall' | 'qr_cards';

export interface AssetMap {
  // word (lowercase) -> usable image URL (object URL in browser, file:// path in CLI)
  images: Record<string, string>;
  coloring: Record<string, string>;   // from *-coloring.png
  audio?: Record<string, string>;     // song mp3s (QR cards link to hosted URLs from spec, not local audio)
}

export interface BuildResult { html: string; warnings: string[]; }
export function buildMaterial(type: MaterialType, spec: WeekSpec, assets: AssetMap, opts?: BuildOpts): BuildResult;
export function assetGapReport(spec: WeekSpec, assets: AssetMap): { missing: {file: string; usedBy: string[]; mjPrompt: string}[] };
```

Rules:
- Every builder returns a **complete standalone HTML document** (inline CSS, @font-face for Andika via `/fonts/…` in browser or absolute file path in CLI — take a `fontBaseUrl` in `BuildOpts`).
- Builders are **pure** — no fetch, no DOM APIs beyond string building; they must run in Node (CLI) AND browser (Studio). This is the load-bearing constraint.
- Missing image → render an emoji/placeholder tile + push a warning; NEVER throw mid-render.
- `escapeHtml` on every text interpolation; hex-validate any color; whitelist fonts (audit-flagged pattern from print-utils).
- Bingo duplex: copy the geometry from `public/tools/picture-bingo-generator.html` — per-row column mirror (`rowItems.slice().reverse()`), SHORT-EDGE flip, identical fixed header heights front/back. This becomes the only implementation going forward (existing tools untouched for now).
- Geometry constants come ONLY from `render/geometry.ts` (§4). No magic numbers in builders.

## 4. LOCKED GEOMETRY + DESIGN CONSTANTS (`render/geometry.ts`)

Ported from `components/card-generator/print-utils.ts` + `picture-bingo-generator.html` + `docs/curriculum/tools/build_week01_pack.py`:
- A4 21×29.7cm; 3-part cards 7.5cm square, white inner border 0.5cm, radius 0.4cm, frame `#2D5A27`.
- Sentence strips: control 21×6.5 (14.5 text + 6.5×6.5 picture + 1cm gap); standalone picture 6.5×6.5; standalone sentence 14.5×6.5.
- Bingo: boards 4×4 (2× border thickness vs calling cards), duplex calling cards 3×3 short-edge flip, `gap:0` diamond cut-guides.
- Book: A5 landscape 210×148mm, dark forest `#0a1a0f`, gold `#E8C96A`, emerald glow accents, Andika, full-bleed right pages.
- Vowel blue `#2456c7`. Kids font Andika (bundled `public/fonts/Andika-*`— check `scripts/mvgen/fonts/` and `docs/curriculum/tools/` for existing TTFs; copy into `public/fonts/` if absent).
- Tracing: numbered strokes, SVG `<marker>` arrowheads, green start dot (port `svg_letter_a` conventions from `build_week01_pack.py`, generalized to all 26 letters in `letter-strokes.ts`).

## 5. WEEKSPEC CONTENT RULES (enforced by authoring, checked by audit)

- **Decodability**: `book.spreads[].text` and every `materials.*` word uses ONLY letters taught ≤ that week + glue words already introduced (`glue.known ∪ glue.new`). W1–3 books are `readAloud: true` (exempt). THE IRON RULE: a child never meets an undecodable word.
- Glue schedule (locked): `the`+`is` W4 · `I` W6 · `and` decodable W10 · `on` glue from W4, decodable + celebrated W11 · `says` W25. Oral-only: `where`, `your`.
- Songs: ONE pattern per song, ~10–15 unique words; sound songs never say a stop consonant with schwa ("t" not "tuh" — Suno prompt must enforce, per Dark Phonics sound-accuracy rules); lyrics use week vocab + free natural connectives (songs are heard, not decoded).
- Suno base style (locked): `dark trap, 68 bpm, heavy 808 bass, sparse hi-hats, deep whisper-rap verses, kids choir chant on hook, playful spooky, minimal, clean vocals, nursery trap`.
- MJ style suffix (books/cards art, locked): `ultra-realistic photograph, single subject centered, dramatic spotlight on deep forest-green backdrop, soft shadows, cinematic, slightly whimsical --ar 3:2 --style raw`. Coloring variant: `simple thick-outline coloring book line art, black lines on pure white, no shading, child-friendly --ar 3:4`.
- Asset manifest rule (locked): every image the week needs is listed in `assets[]` with exact filename (`<word>.png` / `<word>-coloring.png`) + ready-to-run MJ prompt, BEFORE anything renders.
- Character canon: Segina (peg-doll girl, black pigtails, red dress; sung "Sejeena"); cast joins Cat W4, Ant W6, Dog W12, Rat W15, Bug W18, Duck W21, Fox W24; vet reunion W22; potato = permanent running gag; counting tune = Ten Little Indians.
- Vowel wall lights: A W1, I W8, O W11, E W14, U W16 (complete → celebration).

## 6. CURRICULUM STUDIO (UI spec)

Route `/montree/library/curriculum-studio` (public). Dark-forest theme consistent with the library.
1. **Week rail**: 26 tiles (letter, anchor word, celebration badges). Level 2/3 tiles visible but marked "designed — coming".
2. **Week view**: spine summary (sound, words, frame, glue, cast) · **Assets panel**: drop-zone (multi-file; match by filename→word, show ✓/✗ per manifest entry; unmatched files flagged) + "Copy MJ prompt" per missing asset + optional Photo Bank picker reuse · **Materials grid**: the 10 material types, each with Preview (iframe srcdoc) + Print (window.open + print, existing pattern) · **Songs panel**: lyric sheets + copy-Suno-prompt buttons · **Full pack**: sequential print of everything.
3. Dropped images live in-memory (object URLs) — no upload, no storage, no auth. `localStorage` may remember week selection only.
4. Uses ONLY the render-engine API (§3). Zero rendering logic in the page.

## 7. CLI spec (`scripts/curriculum/build-week.mjs`)

- `node scripts/curriculum/build-week.mjs --week 3 [--materials book,bingo] [--out DIR] [--assets DIR]`
- Default assets dir: `~/Desktop/English Curriculum 2026/Week NN/assets/`; default out: `~/Desktop/English Curriculum 2026/Week NN/pack/`.
- Loads spec JSON + scans assets (filename→word) → prints the **gap report** (missing files + MJ prompts) → renders each material to HTML → PDFs via headless Chrome (`chrome --headless --no-pdf-header-footer --print-to-pdf=…`; locate Chrome like mvgen does, fall back to `CHROME_BIN`).
- `--gap-only` = report and exit (the "what pictures do you still need" contract, mirrors mvgen Shot Planner).
- Exit non-zero only on hard errors; missing assets = warnings + placeholder renders unless `--strict`.
- Node-runnable with zero deps beyond repo `node_modules` (esbuild-register or plain compiled imports — builder may bundle `render/` via esbuild the way `retest-cold-start.mjs` bundles the pipeline).

## 8. PHASE 2 — MONTREE PACK (separate build, after Studio ships)

Mirror `sync-phonics-works.ts` precedent exactly: `english_curriculum_pack` FeatureKey + `montree_feature_definitions` migration; seed ~5 works/week into `montree_classroom_curriculum_works` (`source='english_curriculum_pack'`, `sequence = 20000 + week*100 + idx`, work_keys `enwk_03_three_part_cards` style); curated visual-memory entries in `scripts/data/curated-visual-memory/language.json` (+ add work_keys to the canonical map the validator reads); classroom-level current-week pointer + This Week view; skill-graph entries. Mastery invariant untouched — weekly seeding is ADDITIVE via `seed-recommended-work.ts`, nothing leaves a shelf without teacher-confirmed mastery. Zero new tables.

## 8b. CONTRACT AMENDMENTS (Fable, same day — post-build rulings)

1. **Decodability validator semantics (final):** STRICT fields = `book.spreads[].text` (W4+ only; readAloud weeks exempt), `materials.sentences`, `materials.tracing.words`, `materials.dictionary` — every word must decompose into taught letters ≤ week + that week's `glue.known ∪ glue.new` (glue is cumulative across weeks). PICTURE-VOCAB fields = `threePartCards`, `matching`, `bingoPool`, `coloring` — additionally allow the CUMULATIVE union of `soundBasket ∪ oralWords ∪ newWords ∪ reviewBank` from ALL weeks ≤ current (picture-supported vocabulary continuity; the child matches these to images, decoding is a bonus). Character names (Segina, Sam) allowed everywhere (known by heart from read-alouds).
2. **Coloring assets:** confirmed MJ line art (`<word>-coloring.png` + the line-art prompt suffix). week-01/02.json must gain coloring asset entries following the week-03/04 pattern (mechanical fix, port the pattern).
3. **Wordless/suspense spreads:** `BookSpread.image` may be `""` — builders render a full-dark page (no placeholder warning).
4. **Suno base style v2 (Jul 11, locked, supersedes §5):** `dark trap, 68 bpm, heavy 808 bass, sparse hi-hats, deep whisper-rap verses, kids choir chant on hook, playful spooky, minimal, clean vocals, nursery trap`. Applied to every `songs[].sunoStyle` across all 26 weeks.
5. **WHOLE-WORDS lyric rule (Jul 11, locked):** never syllable-split a real word in `songs[].lyrics`. Sing the whole word (`POTATO!`, not `PO-TA-TO!`; `zigzag`, not `Zig-zag`; `duck… sock… rock…`, not `d-u-ck… so-ck… ro-ck…`). TWO deliberate exceptions are KEPT: (a) initial-sound stutters — the locked teaching pattern (`C-c-cat!`, `T-t-turtle!`, `Ih-ih-in!`, `Ah-ah-on!`, `Kw-kw-kw`, `Zzz-zzz-zzz`); and (b) uppercase letter-name spell-outs where spelling aloud IS the point (`O-N`, `B-O-X`, `F-O-X`, `S-I-X`, `M-I-X`, `Q-U`, `A-E-I-O-U`). Update any `sunoNotes` that quote a removed split to use the whole word.

## 9. SACRED FLOW + ACCEPTANCE

Fable contract (this doc) → Opus build → Sonnet fresh-eyes audit (FIX FIRST) → Opus fixes → Sonnet re-audit SHIP.
**Acceptance test (runtime, Jun-14 rule)**: `build-week.mjs --week 1` and `--week 2` run unattended against the real Week 1/2 asset folders (or placeholder assets) and produce openable PDFs for all 10 material types; Studio renders Week 1 previews in the browser; decodability validator (a small script `scripts/curriculum/validate-specs.mjs` — REQUIRED deliverable) passes on all authored weeks: every book/materials word decomposes into taught letters + known glue for its week.

## 10. NON-GOALS (this phase)

No edits to `lesson-map.ts`, `phonics-data.ts`, existing generators, Pink Readers/Songs pages. No Supabase writes. No deletion of the Python week tools (they become legacy reference). No server-side rendering. Manual (Conductor's Score) is Phase 3.
