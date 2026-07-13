# Session Handoff — Jul 10, 2026 (evening) — MVGEN PHASE 1 BUILT + SHIPPED (Fable directed, Opus built ×2, Sonnet fresh-eyes ×2)

**Spec:** `docs/handoffs/SESSION_OUTREACH_BATCH2_3_AND_MVGEN_SPEC_JUL10.md` §mvgen. **Verdict chain (sacred flow):** Opus build → Sonnet fresh-eyes **FIX FIRST (2 CRIT)** → Opus fix pass → Sonnet re-audit **SHIP (0 CRIT)**. Full end-to-end render of "A is for Potato" runtime-audited frame-by-frame per the Jun-14 rule. **NOT committed/pushed yet** — Tredoux pushes via Desktop Commander as usual.

## What exists now — `scripts/mvgen/`

- `analyze.py` — librosa: beat grid, downbeats (4/4 heuristic), onset strength, RMS sections; local whisper (faster-whisper, stable-ts also supported) word timestamps, `temperature=0` + `beam_size=5` + `condition_on_previous_text=False`, degenerate-word filter (zero-duration drop, repeat-loop collapse windows 1–4, past-end drop) → one `timeline.json` per song. Degrades to empty `words[]` (render proceeds, no subs) if whisper/model unavailable.
- `engine_slideshow.py` — Engine A: images cut on downbeats, deterministic Ken Burns zoompan, theme frame border, ASS subs burned in; one ffmpeg filter_complex; returncode + stderr surfaced; handles 1 image / images<shots (cycles) / missing font.
- `ass_karaoke.py` — ASS doc builder, `\kf` word-by-word sweep (centiseconds correct), line end-pad clamped to next line start.
- `themes.py` — one dict, both themes: **montree** (#0a1a0f dark forest, gold highlight, Lora Italic, no frame) + **kids** (white, #2D5A27 frame, Andika Bold). 1920×1080 30fps v1 (portrait = one-line change, phase 2).
- `mvgen.py` — CLI: `--audio --images --lyrics --no-lyrics --theme montree|kids --engine slideshow|canvas --out --model --seed --preset --crf --reanalyze`. Default out `~/Desktop/Music Videos/<song>/<song>.mp4` (outside git). Timeline cached per song + **duration guard** (cached vs ffprobe ±0.5s → auto re-analyze). `--engine canvas` exits cleanly "not built yet" (phase 3). Clean one-line errors, no tracebacks.
- `fonts/` — **bundled** Lora Regular/Italic/BoldItalic (static instances pinned from variable fonts; `OFL-Lora.txt` attribution) + Andika Regular/Bold. Font resolution per theme: bundled → assets dir → system, embedded via ffmpeg `fontsdir` (no reliance on OS-installed fonts — CRIT-2 fix; the sandbox coincidentally had Lora, the Mac doesn't).
- `README.md` — install, usage, timeline schema, cache behavior, lyrics-bias usage.

## Run it on the Mac

```
pip3 install --break-system-packages librosa soundfile faster-whisper
python3 scripts/mvgen/mvgen.py \
  --audio ~/Desktop/"English Curriculum 2026"/"Week 01"/"A is for Potato.mp3" \
  --images ~/Desktop/"English Curriculum 2026"/"Week 01"/images \
  --theme kids --engine slideshow
```

First run downloads faster-whisper **base** (~145MB) to `~/.cache/huggingface/`. Output → `~/Desktop/Music Videos/A is for Potato/`. Sample renders from the audited sandbox run were delivered to Tredoux (kids + montree).

## Runtime audit results (verified, twice, independently)

h264 1920×1080 + aac 48kHz, 66.37s vs 66.32s mp3 (±0.5s ✓), `blackdetect` clean, frames viewed at 5/11/14.6/25/26/33/41/57s: real lyrics, karaoke sweep visible mid-line (kids yellow/white, montree gold/cream), Lora italic confirmed rendering from the bundled ttf, subtitle-free frames only where timeline has no words.

## 🚨 Known limitations (documented, accepted for phase 1)

1. **Test-song back half (31–56s) renders subtitle-free although it IS sung** ("it's a chair… it's a potato…" — RMS 0.19–0.26, verified sung by segment-transcription). Whisper base's full-file decode enters an "it's a" repeat-loop there; the degenerate filter correctly collapses it to nothing rather than burning garbage. Mitigations available today: `--lyrics file.txt` (biases decode via initial_prompt), bigger `--model small|medium` on the Mac. **Future work (phase 2 candidate): opt-in segmented/windowed transcription mode** — recovers this song's back half but would regress normal songs, so deliberately NOT the default.
2. **Repeat-collapse caps identical consecutive words at 2** — a genuine "la la la" triple loses its 3rd subtitle (audio unaffected). Unavoidable ambiguity vs hallucination loops; note for song curation.
3. `_ff_escape` on the `ass=`/`fontsdir=` filter paths is best-effort — ffmpeg's ass-filter option parser re-splits on `:`/`,` regardless of escaping (known ffmpeg quirk). Zero practical risk (paths come from clean `mkdtemp`); the robust fix if ever needed is chdir + relative filename.
4. `--out` with a shell-quoted literal `~` isn't expanded (let the shell expand it — normal usage).
5. `scripts/mvgen/__pycache__/` left by sandbox testing — gitignored (this session); **delete via Desktop Commander** when convenient.

## Phase 2 / 3 queue (build order from the spec)

- **Phase 2:** ASS karaoke styling polish + full theme polish (portrait 1080×1920 option, per-theme positioning/effects); segmented-transcription opt-in flag; NIT cleanups (#4 above).
- **Phase 3:** Engine B "canvas" — seeded p5.js scene reading `timeline.json`, headless-Chrome frame capture → ffmpeg mux (reuse the closing-screen recipe in `docs/handoffs/SESSION_PARENT_SAFEAREA_CLOSING_SCREEN_JUL5.md`).

### RESUME PROMPT (fresh session)

> "Read `docs/handoffs/SESSION_MVGEN_PHASE1_JUL10.md` and have Opus build mvgen phase 2 (karaoke/theme polish + portrait + segmented-transcription flag). Fable directs, Opus builds, fresh-eyes audit before done."
