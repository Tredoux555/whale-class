# HANDOFF — Chapter Close: The 58-Week Curriculum, Produced End-to-End (Jul 15, 2026)

> **RESUME PROMPT:** Read `docs/handoffs/HANDOFF_CHAPTER_CLOSE_JUL15.md`. If Tredoux's MJ picks
> are in ~/Downloads, run the reconciliation pass (§4). Then verify the render fleet finished
> (§3), re-render any weeks whose images changed, and spot-check outputs. Everything else is done.

---

## 1. What this chapter was

Started Jul 2 as "one letter a week for next year's class." Ends today as a complete, produced,
audited 58-week English program: 58 validator-green WeekSpecs, 115 songs picked and live on
montree.xyz, 580 print PDFs, ~1,100 images with a certified image→lyric matching engine, 115
music videos rendering, 115 YouTube thumbnails, and one potato wearing a crown.

## 2. Done TODAY (Jul 15)

- **Re-picks #32 (W22 dog-vet) + #87 (W56 lamb-knot) filed** — priors archived as
  `.repick1.png` in `_replaced_video_audit/`. That closed ALL 93 video-critical rerolls.
- **Alias-mapping pass vs `VIDEO_COVERAGE_AUDIT_JUL14.md`:** 24 new week-scoped aliases in
  `scripts/mvgen/curriculum-video-aliases.json` (weeks 05,08,10,11,12,14,15,22,26,30,36,38,52,
  55,56,58). Verified by `scripts/curriculum/verify-alias-pass-jul15.py`: **PASS — 34 critical
  gap lines newly phrase-covered, 0 regressions, 0 collisions.** Un-aliasable gaps (no image
  exists) are listed in the JSON's `_comment_jul15`.
- **2 certification samples rendered on Tredoux's go (W22 + W56 word):** both 10/11 matched,
  91% coverage, zero engine self-flags. Tredoux reviewed: "in order."
- **🤝 TANDEM ROUND 2 — all 48 remaining image items submitted to MJ** (30 book rerolls + 10
  nice rerolls + 8 generate leftovers; queue `docs/curriculum/video-audit/TANDEM_QUEUE2_JUL15.json`,
  n=94–141). 3 placeholder prompts sourced from week ledgers (n115–117), 3 authored by Fable
  (n109/110/113), oref files staged in `video-audit/_oref_tmp/` (delete after reconciliation).
  **⏳ Tredoux picks/downloads; reconciliation owed (§4).**
- **📋 FULL MATERIALS AUDIT — ALL GREEN** (`docs/curriculum/AUDIT_MATERIALS_JUL15_files.md` +
  `_specs.md`): 115 mp3s (take-picks match, none truncated), 580/580 valid PDFs, 1,121 images
  (no zero-bytes), validator 58/58 exit 0, 115/115 audioUrls live on montree.xyz (W30 placeholder
  RESOLVED), QR cards 58/58, Pink Readers + guides all present. Only cosmetic flags: W14/W30/
  W50/W51 have 1 coloring page each (W51's two are in the tandem queue: #138 book-coloring,
  #139 moon-coloring; W14/W30 accepted as-is unless Tredoux wants more).
- **📖 STORY ARC READ (`docs/curriculum/STORY_ARC_READ_JUL15.md`):** 58-line arc table.
  Verdict: **the story reads well end-to-end** — zero pre-debut cast appearances, W58 medley
  callbacks all real, Pattern-Tree leaf math consistent (16+16=32), Segina/Sejeena print-vs-sung
  rule airtight. **Ruling (Fable, logged):** W01/W03 "POTATO" in print are TEACHER-READ books
  (pre-decodable era) — the gag's real promise is "never printed where the children could read
  it," which held. The two over-broad W58 teacher-note lines were precision-fixed in
  `week-58.json` and the W58 pack re-rendered (pack-v2, 10 valid PDFs, book now fully art-resolved
  incl. graduation-cast-full — zero placeholders). W11 stays grandfathered. W42 "whole cast"
  flourish left as-is.
- **🎬 FULL RENDER FLEET LAUNCHED:** all 115 songs submitted to the mvgen daemon (single-worker
  queue, ~70s/video). Log `/tmp/render_fleet_jul15.log`, monitor `/tmp/fleet_monitor.log`
  (prints FLEET_DRAINED when the queue empties). Outputs: `~/Desktop/Music Videos/<song>/`.
- **🖼 115 YOUTUBE THUMBNAILS** (`~/Desktop/Music Videos/_thumbnails/wNN-<role>.png`, 1280×720,
  all <2MB): generator `scripts/curriculum/make-thumbnails.py` (--all / --week N --role X /
  --samples). House style: week hero art, diagonal dark-forest scrim, gold italic Lora title,
  Andika kicker "WEEK NN · /sound/", gold rule, M mark. Hero auto-picked by title-token match;
  director override map `HERO_OVERRIDES` in the script (W02-word → Segina-on-mat; add there if
  a pick is ever wrong). Contact sheet: `_thumbnails/_contact_sheet_all_1.png` (+ copy in
  ~/Downloads).

## 3. 🚨 SUPERSEDED — the fleet GARBLED; section-by-section restart (Jul 15 pt2)

**The full-fleet run was scrapped.** Tredoux reviewed fleet outputs: "all garbled" (subs out of
sync + wrong/random images) — everything except the 2 samples. Root cause (diagnosed from
timelines, NOT a fleet-condition bug — the pipeline is deterministic): whisper largely fails on
stutter-heavy kids-chant lyrics → 46–77% of words carry the `approx` flag (evenly-distributed
guesses) → subtitles drift seconds off the singing and images anchor at guessed times. All prior
certification samples were low-approx (2–26%) word songs, so the class was never exercised.

**Engine fix SHIPPED (Opus build → Sonnet fresh-eyes SHIP → 126/126 tests):** maximal runs of
consecutive approx words ≥5 words OR ≥6s render subtitle-free AND cannot host image anchors
(cadence fillers hold instead); short approx runs keep the old RMS-gated behavior (a 26%-approx
video was certified flawless). `shot_report.json` now carries `approx_pct`, `suppressed_spans`,
`quality_flags` (self-flag >60%). Planner parity fix in `server.py` `/api/plan` (mirrors the
anchor gate — needs a daemon restart to show in the PLANNER; renders spawn fresh subprocesses).
Also fixed the stale `test_fix3b_alias_file_loads` expectations (anchor-first W04 aliases).
Verified: W06 N-N-Nut! (77% approx, the worst case) re-rendered clean.

**State:** 59 fleet jobs cancelled · 55 garbled videos quarantined in
`~/Desktop/Music Videos/_scrapped_fleet_jul15/` (delete after Section reviews) · kept: W22 The
Vet + W56 The Lamb Can Climb (word).

**Jul 15 pt3 — THE FORMULA (current truth, supersedes the section plan above):**
- 🚨 **STANDING ORDER (Tredoux, twice): NO bulk/overnight renders. Fix + test single videos
  until he FULLY TRUSTS the system. Each render he reviews personally.**
- **Word-song path CERTIFIED by Tredoux (4/4):** W01 It's A (Potato) ("looks good"), W02 Where
  Is Segina? ("perfect"), W22 The Vet + W56 Lamb (earlier "in order"). Recipe: whisper
  **large-v3** (HF cache complete on the Mac; daemon runs MVGEN_MODEL=large-v3; `small` fallback
  at ~/mvgen-models/) + Jul-15 engine rules: approx-run suppression (subs+anchors) + neighbor-hold
  (only-sung-images; no filler rotation) + shot_report self-flags (approx_pct/suppressed_spans/
  quality_flags/held_gap_seconds/schedule_mode).
- **Sound-song script-schedule v1 = REJECTED by Tredoux on W02 T-T-Turtle** (order right, section
  TIMING still guessed via proportional split + sparse pins → images drift off real verses/hooks).
- **✅ NEXT BUILD — BUILT (Jul 15 pt3), awaiting Tredoux's ear.** Energy-profile section alignment
  shipped (`analyze.py` rms_envelope · `shotlist.py` `_type_section`/`_energy_section_bounds`/
  `_energy_fill_run`/`_place_section_images`/`compute_script_gates` · min-hold=2 beats w/
  `dropped_short_hold` · per-section gates in shot_report). Suites green **106+43+70** (27 new).
  Test renders: **W02-sound = SCRIPT path, ALL numeric gates PASS** (table now on its 40.8s pin,
  breakdown de-flashed); **W03-sound = ANCHOR path** (large-v3 → 46.8% approx, below threshold);
  **W03-word = ANCHOR path** (18.9% approx) — every image matches its sung word. Tiles in
  ~/Downloads/w0{2,3}-*_v2_check.png. Full report: `docs/curriculum/SOUNDSONG_TIMING_FIX_JUL15.md`.
  W06-sound not yet rendered (was 2nd gate target; run it next time the script path is needed).
- **Trusted renders on disk:** W01, W02 Segina, W22 Vet, W56 Lamb (+ W02 Turtle = rejected
  reference; W06 N-N-Nut = pre-script-mode, stale). **W03–W10 section-1 renders are STALE**
  (base-model, pre-formula) — re-render before showing anyone.
- **🚨 Fable context discipline (Tredoux, explicit): agents own ALL polling/waits/infra recovery;
  Fable reads evidence + decides only. Long DC sleeps time out at MCP ~120-180s — never poll-loop
  from Fable.**
- Whisper models via ModelScope mirror when HF stalls from Beijing (hf-mirror 302-hangs; direct HF
  ~76KB/s; modelscope.cn ~2MB/s: `https://modelscope.cn/api/v1/models/pengzhendong/
  faster-whisper-<size>/repo?FilePath=<file>`). Disk was the killer once already (ffmpeg exit 228
  = ENOSPC): keep ≥5GB free; _projects prunes safely (driver recreates); scrapped fleets deleted.

## 4. ⏳ OWED — reconciliation of Tredoux's 48 picks (tandem §4 protocol)

Match ~/Downloads MJ files → `TANDEM_QUEUE2_JUL15.json` entries (mtime + prompt-text match, NOT
order alone). For rerolls: archive original → `_replaced_video_audit/Week NN/` FIRST, then file
under the original filename. For the 8 generates: file under manifest filename, never overwrite
blind. Verify EVERY filed image by reading it. Then:
- **Re-render affected packs** (build-week.mjs with `--assets ".../Week NN/images" --out
  ".../Week NN/pack-v2"` — 🚨 NEVER bare defaults, that writes a stray `pack/` with the wrong
  assets dir).
- **Re-render affected week VIDEOS** (`curriculum-batch.py --week NN`) — cheap, ~70s each.
- Delete `docs/curriculum/video-audit/_oref_tmp/` and the Downloads contact-sheet/check copies.
- Re-run `scripts/curriculum/audit-video-coverage.py` for the final coverage numbers.

## 5. Rules learned/confirmed today

- 🚨 `build-week.mjs` bare invocation defaults to `--assets "Week NN/assets"` (wrong) and
  `--out "Week NN/pack"` (wrong) — always pass both flags explicitly (see §4).
- The coverage audit does NOT apply the alias layer — audit-vs-renderer gaps are expected;
  measure alias changes with `verify-alias-pass-jul15.py` (regression-diffs both).
- MJ rejects prompts wrapped in quotes (invalid --style parse) — strip wrapping quotes.
- Chrome-extension file_upload can only reach files inside the shared folder — stage orefs
  under the repo (`_oref_tmp/`) for browser agents.
- Thumbnail generator: `grep -c aplace` counts the CSS class too — count `class="aplace"` when
  checking book placeholders.

## 6. NOT committed (Tredoux pushes via Desktop Commander when ready)

`scripts/curriculum/verify-alias-pass-jul15.py` · `scripts/curriculum/make-thumbnails.py` ·
`scripts/mvgen/curriculum-video-aliases.json` (24 new entries) · `week-58.json` (2-line potato
wording fix) · `TANDEM_QUEUE2_JUL15.json` · queue/run-board updates · audit reports
(`AUDIT_MATERIALS_JUL15_*.md`, `STORY_ARC_READ_JUL15.md`) · this handoff. Plus `_oref_tmp/`
(delete after reconciliation, don't commit).

## 7. After this chapter

The produced curriculum feeds: YouTube channel (videos + thumbnails ready), Montree
`english_program` (live on Whale since Jul 14, migration 293), Curriculum Studio (already
renders audio players + QR packs). Queued theories from Jul 13 remain: works-ladder integration
polish and whatever Tredoux calls next.

## Jul 15 pt4 — NEXT ACTIONS (Fable, end of context)
- Suno timestamps: NOT available (documented in SOUNDSONG_TIMING_FIX_JUL15.md). Ground truth for sound-song sections = TREDOUX EAR: he notes section start times per failing song (~45s each, e.g. QuickTime); feed as section-times JSON/SRT into script mode (pipeline already honors --subs timing). Build the tiny ingest next session.
- W03 On the Mat misses: "Sejeena" sung vs segina-on-mat.png token + potato-on-mat anchor — add W03 aliases (sejeena-on-the-mat, verify potato-on-mat phrase) via verify-alias-pass tooling, re-render W03 word ONLY.
- Studio: flashcards + published images (1121 webp, 0 fail) + coloring fix + videoUrl slots SHIPPED (SESSION_STUDIO_FLASHCARDS_JUL15.md). Owed: Tredoux push; re-render packs to include flashcards; videoUrl population after video certification.
