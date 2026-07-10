# SESSION — Jul 10, 2026 (Cowork/Fable directing) — CURRICULUM STUDIO + FULL LEVEL 1 ENGLISH CURRICULUM SHIPPED

**Contract (read first): `docs/handoffs/PLAN_CURRICULUM_STUDIO_JUL10.md` (incl. §8b amendments).
Spine: `docs/curriculum/spec/MASTER_SPINE.md`. NOT COMMITTED — `lib/montree/english-curriculum/` is
entirely untracked; commit+push via Desktop Commander is the #1 owed item (an audit agent accidentally
destroyed week-04.json mid-session and only Fable's in-context copy saved it — git is the safety net).**

## What shipped (sacred flow: Fable contract → Opus builds → Sonnet audit FIX FIRST (5 CRIT, 4 WARN) → Opus 9-fix pass → Sonnet final integration re-audit **SHIP, 0 violations**)

1. **THE RULING — CMAT vs SATPIN: neither.** Tredoux's utility-first order (A→T→M→C→S→N→P→I→H→D→O→G→B→E→R→U→F→L→W→J→K→V→Y→X→Qu→Z) is the spine — it delivers SATPIN's speed-to-words (first decodable BOOK at W4) plus CMAT's confusable separation plus the narrative arc. SATPIN's 128-lesson `lesson-map.ts` untouched (interop via `weekToLessonMap`). CMAT retires.
2. **All 26 WeekSpecs authored** — `lib/montree/english-curriculum/spec/week-01..26.json`: word banks, sentence frames, 51 dark-trap song lyric sheets + Suno prompts (2/wk from W2: sound-stutter + word-frame, potato bridge gag, "Sejeena" spelling), 26 decodable book texts (8-12 spreads, page-turn reveals, cast: Cat W4→Fox W24, vet reunion W22, graduation W26), complete asset manifests with ready MJ prompts (photo + line-art coloring variants). W1-2 ported verbatim from the existing built weeks; W3-4 Fable-authored (the levitating-cat first book); W5-26 Opus-drafted against Fable exemplars. Levels 2-3 skeletons in `level2/3-skeleton.json`.
3. **Render engine** — `lib/montree/english-curriculum/render/`: one geometry source (locked print constants), 10 pure builders (3-part cards, sentence strips, matching, THE single bingo duplex impl, tracing w/ stroke-arrow SVGs for all 26 letters + qu, coloring, dictionary journal, dark-forest book, vowel wall, QR cards). Node+browser. The 4 Python-only material types are now web.
4. **Curriculum Studio** — `/montree/library/curriculum-studio` (public, 5th library card): week rail, asset drop-zone (filename→word matching, gap checklist w/ copy-MJ-prompt + cross-week ↺ badges), previews, print, combined full-pack print.
5. **Agent CLI** — `scripts/curriculum/build-week.mjs` (gap report / full HTML→PDF via headless Chrome, prior-week asset fallback, defaults to `~/Desktop/English Curriculum 2026/Week NN/`) + `scripts/curriculum/validate-specs.mjs` (decodability gate per §8b semantics — **exit 0 on all 26**).

## 🚨 Rules learned/locked
- Audit agents NEVER mutate live spec files — /tmp copies only (week-04 incident).
- Asset keys normalize `[-_\s]+`→space on BOTH write and read sides (`normalizeAssetKey`).
- Iron rule enforcement: STRICT fields (book W4+/sentences/tracing/dictionary) vs PICTURE-VOCAB fields (cumulative basket∪vocab allowed) — §8b #1. Potato never printed until decodable; the class shouts it from the picture.
- WEEK_LOADERS: one static-import line per week — a new week JSON is invisible until registered.

## Director review round (same session, post-SHIP)
- **Fable read ALL 26 weeks' lyrics + book texts personally.** 7 content fixes: W8 (ĭ→'ih' Suno respelling + 'an ink'→inchworm), W11 (ŏ→'ah' respelling w/ 'oh? No! Ah!' gag), W17 (irregular 'too' cut from book), W18 (bug rescued from under the log before the potato beat), W20 ('It's a jam'→'It's jam'), W23 (cast-member Bug taste-test → mop on a dinner plate), W24 ('It's a six'→'It is six'). **RULE: short-vowel sound songs respell the sung stutter phonetically for Suno (ih/ah/eh/uh) — printed materials keep the letter.** Validator re-run exit 0 after every batch.
- **Live browser review on the Mac (dev server + Chrome):** Studio renders beautifully; found+fixed 3 UX/defects via Opus: (1) Materials moved ABOVE Songs (core action first), (2) assets checklist + lyrics collapsed w/ Show-all toggles — zero nested scroll containers (they were hijacking page scroll), (3) **hydration mismatch** — `week` useState initializer read localStorage during render (server 1 vs client saved week → style mismatch); now init 1 + mount-effect restore. Verified live: no dev-overlay issues, W4 restores clean.

## Owed / next
1. **Tredoux: commit + push via Desktop Commander** (whole feature untracked!). Also delete stray `tsconfig.scope-curriculum.tmp.json` if present.
2. **Suno sessions**: 51 tracks off the lyric sheets (Studio copy buttons) → mvgen videos (name images after sung words).
3. **MJ art passes**: run `build-week.mjs --week N --gap-only` for prompts. Seam notes: net.png (W6 butterfly vs W14 fishing), map.png (W2 town vs W3/7 paper), hat.png W12 drift — keep subjects consistent per word.
4. **Phase 2 — Montree pack** (contract §8): `english_curriculum_pack` flag + seed ~5 works/wk into `montree_classroom_curriculum_works` (sequence 20000 band) + curated visual-memory entries + This Week view + skill-graph. Zero new tables. Mirrors phonics precedent.
5. **Phase 3 — The Conductor's Score** (printed teacher manual: room map, per-week presentation scripts, 3-period lessons, photo workflow).
6. Real-asset acceptance run on the Mac: `node scripts/curriculum/build-week.mjs --week 1` against the existing Week 1 asset folder → verify PDFs.
7. Optional cleanup queue: remap Phonics Fast off CMAT; letter-stroke visual pass (e, g, s, f, r flagged); Studio full-pack book prints A5-on-A4 (book's own button stays true A5).
