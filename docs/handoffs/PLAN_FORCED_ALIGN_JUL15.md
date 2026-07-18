# PLAN — Forced-alignment primary timing path (Jul 15/16, 2026)

**Status: BUILT + validated, NO render (per contract — a Sonnet fresh-eyes
auditor renders after).** Opus BUILD agent under Fable's direction. NOT committed
(Tredoux pushes via Desktop Commander). Companion doc:
`docs/curriculum/SOUNDSONG_TIMING_FIX_JUL15.md` §"Forced alignment = the PRIMARY
timing path".

---

## The contract (Fable, Jul 15 evening)

**Why.** Transcription structurally fails stutter-chant kids songs: whisper
large-v3 = 80.8% approx words on W02-sound "T-T-Turtle" (duplicate words crammed
together → even-spread guesses → subtitles drift + images anchor on guesses). A
verified feasibility test + a 115/115 batch (`scripts/curriculum/
build-capcut-packages.py`) proved **stable-ts forced alignment**
(`stable_whisper.load_model('base').align(audio, lyrics_text, language='en')` —
DTW over cross-attention; the text is KNOWN, never guessed) lands every word
monotonic within ~0.2–0.5s of hand-timed references on this worst-case song.
Durable venv: `~/mvgen-models/align-venv` (stable-ts + openai-whisper + torch;
`base.pt` cached).

**Build items (all delivered):**
1. Forced alignment is the PRIMARY timing source in `analyze.py` when lyrics are
   provided; the faster-whisper transcribe→NW-align→windowed path is the
   FALLBACK (no lyrics, align fail/unavailable, or `MVGEN_ALIGN=off`). Model via
   `MVGEN_ALIGN_MODEL` (default `base`).
2. Alignment runs as a subprocess of the align venv's python (JSON file I/O),
   because the daemon's python has no torch. Venv path configurable via
   `MVGEN_ALIGN_VENV` (default `~/mvgen-models/align-venv`).
3. Explicit `--subs` still wins over everything; alignment only replaces the
   whisper-transcription tier.
4. `inputs_fingerprint` incorporates the alignment mode+model → cached timelines
   auto-re-analyze when the mode/model flips.
5. timeline.json schema unchanged (words with start/end/approx). Align words are
   ~0% approx → `script_should_engage` returns False → the CERTIFIED anchor path
   schedules. `timing_source` added to the shot_report summary.
6. Tests stay green; new tests for approx-False propagation, fallback engagement,
   `MVGEN_ALIGN=off`, fingerprint toggle, timing_source-in-report, and a LIVE W02
   regression (`table` 40.3–41.5s, monotonic, approx 0).
7. Docs (this file + the SOUNDSONG doc).

**Hard rules:** lyrics stay TEXT ground truth everywhere; alignment supplies
timing only. No commit. No render. No curriculum-asset edits. Keep ≥5GB disk.

---

## What was built (file-by-file)

- **`scripts/mvgen/align_worker.py`** (created earlier this task, kept as-is) —
  the venv-side worker. `python align_worker.py <audio> <lyrics_file> <model>
  <language> <out_json>`; loads `stable_whisper`, calls `model.align(audio, text,
  language)` (times the text, never transcribes), writes
  `{"words":[{word,start,end}], "n":N}` and exits 0; any failure exits non-zero
  with a stderr diagnostic. Stdlib + stable_whisper only (never imports
  analyze/align/subs — they need librosa/faster-whisper, absent from the venv).

- **`scripts/mvgen/analyze.py`**
  - `_align_python()` rewritten to resolve, in order, `MVGEN_ALIGN_PYTHON`
    (explicit interpreter) → `MVGEN_ALIGN_VENV`/`<venv>/bin/python` (the
    contract's venv-dir env) → the default venv. Returns None if absent →
    caller degrades.
  - `_clean_lyrics_for_align()` rewritten to MIRROR the batch-proven
    `build-capcut-packages.split_lyric_lines` + `' '.join(...)`: drops blank
    lines and whole-line `[section]` tags (full-line bracket regex, so a sung
    line that merely starts with `[` is kept), space-joins the sung lines into
    ONE alignment string.
  - `build_timeline()` **wired**: the `elif lyrics_text:` branch now calls
    `build_forced_aligned_words` FIRST (→ `timing_source="align"`), falling back
    to `build_aligned_words` on None (→ `"transcribe"`, loud log). Subs path →
    `"subs"`; no-lyrics → `"none"`. The returned timeline dict carries a new
    `timing_source` key.
  - (`build_forced_aligned_words`, `_forced_align_words`, `_align_enabled`,
    `_align_model`, `_align_signature`, and the `compute_inputs_fingerprint` fold
    of `_align_signature()` already existed from the earlier pass and are
    unchanged except the `_clean_lyrics_for_align`/log tweaks.)

- **`scripts/mvgen/shotlist.py`** — `build_shot_report(...)` gained a
  `timing_source="transcribe"` kwarg, surfaced as `summary["timing_source"]`
  (docstring updated). Nothing else in the report/gate logic touched.

- **`scripts/mvgen/engine_slideshow.py`** — both `build_shot_report` call sites
  (the anchor/script path AND the cycle fallback) pass
  `timing_source=timeline.get("timing_source", "transcribe")`.

- **`scripts/mvgen/test_mvgen_fixes.py`** — +4 alignment tests (env config incl.
  `MVGEN_ALIGN` off spellings + `MVGEN_ALIGN_VENV`/`_PYTHON` resolution; signature
  + fingerprint toggle on mode AND model; approx-False propagation via a
  monkeypatched worker; off/missing-venv → None fallback + clean-lyrics parity).

- **`scripts/mvgen/test_script_schedule.py`** — +`test_shot_report_timing_source`
  (all 4 values flow to the summary + the default) and +`test_w02_real_align_
  regression` (LIVE: forced-aligns the real W02-sound audio via the venv, asserts
  approx 0 / monotonic / first sung `table` 40.3–41.5s; skips cleanly when the
  audio/venv are absent — e.g. in the Linux sandbox). Audio path is read from the
  W02 timeline.json's `audio.path`.

## How alignment is invoked (subprocess/env design)

`analyze._forced_align_words(audio, lyrics)` →
1. gate: `_align_enabled()` (env `MVGEN_ALIGN`), `_align_python()` (venv
   interpreter), worker file present, non-empty cleaned lyrics — any miss logs
   and returns None (→ transcription fallback);
2. writes the cleaned space-joined lyric string to a temp file;
3. `subprocess.run([venv_python, align_worker.py, audio, lyrics_file, model,
   lang, out_json], timeout=1800)`;
4. reads `out_json` → `[{word,start,end}]`; `build_forced_aligned_words` maps them
   to timeline words (no `approx` key) and runs `_finalize` for
   monotonic/non-overlapping timing.

This mirrors `build-capcut-packages.py` (same `base` model, same
space-joined-lyric-lines `align()` call) but per-song out-of-process instead of a
long-lived in-process model — correct here since analyze runs one song per call.

## Validation (no render)

- **Suites (Mac):** `test_shotlist_matching` **106/106** · `test_mvgen_fixes`
  **71/71** · `test_script_schedule` **80/80**. (Sandbox: 106 / 71 / 71 — the 9
  Mac-only checks are the W02 cached-timeline gates + the live-align regression,
  which skip without the audio/venv.) Guardrail
  `test_passing_song_plan_unchanged` green.
- **LIVE W02 forced alignment:** 75 words, **approx count 0**, monotonic
  non-decreasing, first sung `table` at **40.92s** (the ~40.8 pin).
- **End-to-end `build_timeline`:** returns `timing_source="align"` (75 words, 0
  approx) with alignment on; `timing_source="transcribe"` (73 words, **62
  approx** — the ~85% stutter-song failure) with `MVGEN_ALIGN=off`, logging the
  fallback.
- **Anchor-path handoff (contract item 5):** with align words the anchor pass
  anchors 5/8 images (ratio 0.625, approx 0%) → `script_should_engage` returns
  **False** → the certified anchor path schedules. The stutter song that
  previously needed script-mode now stays on the certified path because alignment
  fixed the timing.

## Deviations
- The contract named `MVGEN_ALIGN_VENV`; the earlier pass had shipped
  `MVGEN_ALIGN_PYTHON`. Both are now honored — `MVGEN_ALIGN_VENV` (the venv DIR,
  per contract) resolves `<venv>/bin/python`, and `MVGEN_ALIGN_PYTHON` remains as
  an explicit-interpreter override that wins. No behavior lost.
- `_clean_lyrics_for_align` now SPACE-joins (was newline-joined) to byte-match the
  batch-proven `build-capcut-packages` invocation that aligned 115/115. The log
  line that counted "lyric lines" now counts lyric words.

## What the fresh-eyes auditor should scrutinize
1. **Render a real W02-sound video** (align on) and eyeball: subtitles synced,
   `table` on-screen at ~40.8s, correct art per sung word, `shot_report.json`
   summary shows `"timing_source": "align"` + `"schedule_mode": "anchor"`.
2. **Fallback render:** `MVGEN_ALIGN=off` on the same song → confirm it still
   renders (transcription tier), `timing_source: "transcribe"`, no crash.
3. **Cache invalidation:** run once with align on, once with `MVGEN_ALIGN=off` on
   the SAME out-dir — confirm mvgen.py re-analyzes on the toggle (fingerprint
   change), not reuses the cached timeline.
4. **A low-approx WORD song** (e.g. W03-word) still goes anchor and looks
   identical to its certified render — align must not regress the already-good
   songs.
5. **A song with NO lyrics / with `--subs`** — confirm align is skipped and
   `timing_source` reads `"transcribe"` / `"subs"` respectively.
6. **Guardrail:** `test_passing_song_plan_unchanged` still byte-identical; the
   energy-DP script path + approx-run suppression + neighbor-hold untouched.
7. **Determinism:** two align runs of the same song produce identical timings
   (align has no sampling).
