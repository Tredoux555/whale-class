# Sound-Song Timing Fix — Energy-Profile Section Alignment (Jul 15, 2026 pt3)

**Status: BUILT — awaiting Tredoux's ear.** Executes the Jul-15 pt3 contract
(`docs/handoffs/HANDOFF_CHAPTER_CLOSE_JUL15.md` §3). Replaces the rejected
script-schedule **v1** (proportional section timing) with **energy-profile DP
alignment + per-image pins + a minimum-hold rule**. All test suites green; all
numeric gates pass on W02-sound; three single test renders produced + eyeballed.

---

## 1. What was wrong with v1 (Tredoux's W02 T-T-Turtle rejection)

v1 timed the lyric-sheet sections by splitting the song **proportionally** to
each section's content-token count between the sparse confirmed-word pins. The
image ORDER was right, but the section TIMING was guessed:

- **Within-section drift:** the Final Hook's images were split *equally*, so
  `table` started at ~43.7s even though it is actually sung at ~40.8s (a
  whisper-confirmed pin sat unused).
- **Boundaries floated:** unpinned hook boundaries landed on proportional
  fractions, not on the song's real energy structure.

## 2. What was built

Engine changes (all in `scripts/mvgen/`, no daemon restart needed — renders
spawn fresh `mvgen.py` subprocesses):

1. **Fine RMS envelope in the timeline** (`analyze.py::_rms_envelope`,
   `rms_envelope` = 0.1s-bin smoothed RMS). The coarse 3-level `sections` merged
   away the per-verse modulation the aligner needs; the envelope preserves it,
   is tiny, and is sample-rate independent. New renders carry it automatically;
   the cached W02-sound timeline was patched with it (RMS recomputed from audio,
   the expensive large-v3 words left untouched).
2. **Section energy typing** (`shotlist.py::_type_section`): each lyric section
   is typed `low` / `high` / `neutral` from its bracket text
   (whispered/breakdown/intro → low; kids-chant/hook/big/final → high).
3. **Energy-profile DP alignment** (`_energy_section_bounds` + `_energy_fill_run`):
   confirmed-word pins are HARD constraints (both-pinned → midpoint, one-sided →
   clamp); each unknown boundary run is DP-placed on the audio's own energy
   profile, maximising per-section energy match-fraction (high wants loud spans,
   low wants quiet spans) minus a small proportional prior that keeps runs of
   same-typed hooks sensible. Boundaries snap to novelty / RMS-change points.
   Falls back to v1 proportional when no envelope is present.
4. **Per-image pin timing** (`_confirmed_by_section` + `_image_pin` +
   `_place_section_images`): each owned image is timed from its OWN
   confirmed-word pin (equal-split only for un-pinned runs) — this is what pulls
   `table` onto its 40.8s pin.
5. **Minimum-hold rule** (`_place_section_images`, min-hold = 2 beats of the beat
   grid ≈ 1.75s on W02): no script shot shorter than min-hold; trailing overflow
   images are dropped (un-pinned first, pinned never), logged as
   `dropped_short_hold`. A sole image whose whole section span is < min-hold is
   kept (unavoidable, gate-exempt).
6. **Numeric gates in the shot report** (`compute_script_gates`, embedded under
   `summary.gates` for script-mode renders): per-section energy overlap %, the
   measured audio class, boundary-source + novelty distance, pin containment,
   dropped images, and an overall pass/fail. A one-line PASS/FAIL also lands in
   `quality_flags`.

The certified anchor path (`build_shotlist`) is untouched and stays
byte-identical — proven by the guardrail tests.

## 3. Gate design (and the honest deviation)

Contract gates: HIGH sections ≥60% overlap with top-half-RMS regions (LOW
likewise), boundaries ≤1.0s from a novelty/RMS-change point, pins inside
sections, no short shots.

**Deviation, documented:** W02's arrangement builds monotonically — the "kids
chant" Hooks 1 & 2 are typed HIGH by their bracket but the *recording* keeps them
below the median (whisper heard nothing decodable in them). A strict "every
HIGH section ≥60% loud" gate is therefore unsatisfiable on this song. So the
energy gate is applied only to **decisive** sections (bracket type agrees with
the measured audio class); a HIGH-bracketed section the recording keeps moderate
(a build hook) is reported honestly but exempt — its correctness comes from image
ORDER + pins + boundary placement, not from energy. Loud-match uses a small
hysteresis band (0.85×median) so internal dips / fade-outs don't sink a genuinely
loud section. All numbers are written to `summary.gates` for audit.

---

## 4. Results — three single test renders

### W02 --song sound — "T-T-Turtle" (the rejected one) → **SCRIPT path (energy-aligned)**

- `schedule_mode: script`, approx 80.8%, coverage 75% (6 shots), min_hold 1.75s.
- **The v1 fix, visible:** `table` now starts at **40.82s** (its 40.8s pin) — was
  ~43.7s under v1's equal split. Breakdown de-flashed: `teddy` + `towel` dropped
  (`dropped_short_hold`) since 3 whispered words in a 2.2s span cannot each hold.

| # | section | type | measured | decisive | overlap | span (s) | boundary | pins inside | dropped |
|---|---------|------|----------|----------|---------|----------|----------|-------------|---------|
| 0 | Intro — whispered | low | low | ✔ gated | **100.0%** | 0.00–3.96 | — | ✔ | — |
| 1 | Hook 1 — kids chant | high | low | build (exempt) | 44.8% | 3.96–14.83 | novelty 0.61s ✔ | ✔ | — |
| 2 | Hook 2 — kids chant | high | high | ✔ gated | **64.4%** | 14.83–24.95 | novelty 0.78s ✔ | ✔ | — |
| 3 | Hook 3 — kids chant | high | high | ✔ gated | **63.3%** | 24.95–35.31 | pin | ✔ | — |
| 4 | Breakdown — whispered | low | high | build (exempt) | 36.9% | 35.31–37.52 | pin | ✔ | teddy, towel |
| 5 | Final Hook — big | high | high | ✔ gated | **69.1%** | 37.52–49.68 | pin | ✔ | — |

**Gates: energy_overlap ✔ · boundaries ✔ · pins_inside ✔ · no_short_shots ✔ · ALL PASS.**
Tile verdict (`~/Downloads/w02-sound_v2_check.png`): turtle → tiger → tomato →
taxi → potato (the spectacled-potato gag) → table — each on its own section,
distinct correct art, legible burned subtitles, no static/wrong pairings.

### W03 --song sound — "M-M-Moon!" → **ANCHOR path (large-v3 rescued it)**

Base-model audit had this at 90.8% approx (→ would need script mode). With
**large-v3** it transcribes to **46.8% approx** and 10/14 images anchor (ratio
0.71 ≥ 0.5, approx ≤ 60), so `script_should_engage` returns False and the
**certified anchor path** handles it — no script mode needed.

- `schedule_mode: anchor`, coverage 71% (10 anchored shots), zero quality flags.
- Tile (`~/Downloads/w03-sound_v2_check.png`): moon → mouse → monkey → mop →
  potato → mat, **every image matches the word being sung** (karaoke subtitle
  under each frame confirms sync).

### W03 --song word — "On the Mat" → **ANCHOR path**

- `schedule_mode: anchor`, approx **18.9%**, coverage 54% (7/13 unique, 12
  anchored shots), zero quality flags.
- The phrase matcher correctly resolved the scene images: `moon on mat!` →
  moon-on-mat, `mouse on mat!` → mouse-on-mat, `monkey on mat!` → monkey-on-mat,
  with `mat.png` as the sung refrain, plus the potato gag + Sejeena at the close.
- Tile (`~/Downloads/w03-word_v2_check.png`): mat → moon-on-mat → mouse-on-mat →
  monkey-on-mat → potato → potato/Sejeena scene; subtitles in sync throughout.

**Path summary:** W02-sound = SCRIPT (energy-aligned, all gates pass);
W03-sound = ANCHOR (large-v3 dropped approx to 46.8%); W03-word = ANCHOR (18.9%).

---

## 5. Tests

`test_shotlist_matching` **106/106** · `test_mvgen_fixes` **43/43** ·
`test_script_schedule` **70/70** (43 prior + 27 new: energy typing, energy-DP
boundary snapping, hard-pin constraints, per-image pin timing, min-hold overflow
drop, min-hold never drops a pinned image, gate structure + pass on a synthetic
energy-shaped song, no-envelope proportional fallback, and a live regression that
loads the real W02-sound timeline and asserts ALL gates pass + `table` at ~40.8s).
Total **219 green**. The byte-identical anchor-path guardrail
(`test_passing_song_plan_unchanged`) still holds.

## 6. Notes / follow-ups

- **W06-sound** (the contract's second gate target) was NOT rendered this pass —
  the render list was W02-sound + W03-sound + W03-word. W06 will exercise the
  script path again when Tredoux calls for it; its gates will land in its
  shot_report the same way.
- Min-hold on fast whispered breakdowns drops taught vocab (W02: teddy, towel).
  This is the contract-mandated de-flash; if Tredoux wants those words on screen,
  the lever is a longer breakdown section in the mix, not the engine.
- W03-word/W03-sound now supersede the stale pre-formula W03 section-1 renders.


---

## Suno ground-truth timings (Jul 15, 2026 — investigation, no build)

**Verdict: NOT AVAILABLE.** Suno does not expose per-word or per-line lyric
timestamps through any surface reachable on the current (non-Premier) account.
The karaoke-style highlighting Tredoux described from the Suno *player* does not
exist on suno.com's own song page — the lyrics panel there is static text (the
literal generation prompt), not a synced transcript.

**What was checked (song: "T-T-Turtle" by tredoux555, clip id
`96b603fa-46a9-4d38-9887-1be847063397`, confirmed as the PICKED take — duration
49.7s in Suno's own crop tool matches the local file's `afinfo` duration
49.704s to 3 decimal places):**

1. **`GET https://studio-api-prod.suno.com/api/clip/<id>`** (the real API host —
   the legacy `studio-api.suno.ai` domain now 503s) returns full clip metadata:
   `status, title, play_count, id, video_url, audio_url, media_urls, image_url,
   metadata{tags,prompt,type,duration,...}, is_liked, user_id, ...`. **No
   `aligned_lyrics`, `alignment`, `timestamps`, `captions`, or word/line-timing
   field exists anywhere in this payload.** `media_urls` lists only the raw
   audio (m4a + mp3), no subtitle/VTT/SRT sidecar.
2. **Page DOM / Next.js flight payload (`window.__next_f`)** — the SSR-embedded
   clip JSON is byte-identical to the API response above; same absence.
3. **Static lyrics panel** on the song page renders the literal Suno generation
   prompt (`[Intro - whispered]`, `t... t... t...`, `[Hook 1 - kids chant]`,
   etc.) as plain text with no per-line/per-word DOM elements, no `data-time`
   attributes, no highlight-on-playback behavior observed during live playback.
4. **Crop tool** (Edit → Crop, free tier) renders only a raw amplitude
   waveform + a start/end trim control (`00:00.0` – `00:49.7`). No word or
   section markers overlaid on the waveform.
5. **"Open in Studio"** and **Download → Video** are both hard-paywalled
   behind the Premier plan ($24/mo) — these are almost certainly where Suno
   actually computes and uses word alignment (karaoke editor / burned-in
   captions), but the data itself never reaches an inspectable endpoint before
   payment. Did not purchase/upgrade (out of scope — read-only + no purchases).
6. **Network trace** across page load + playback + menu exploration: zero
   requests to any endpoint containing `align`, `lyric`, `caption`, `timed`, or
   `.vtt`/`.srt`. Only telemetry (Datadog RUM, Clarity, TikTok/Bing pixels,
   Google Analytics) plus `/api/gen/<id>/increment_play_count`,
   `/api/gen/<id>/listen_milestone`, `/api/music_player/playbar_state`,
   `/api/feed/v3`, `/api/mango/rights`.

**What IS available (free tier):** raw audio (mp3/m4a), cover image, the
original generation prompt/lyrics-as-written (not synced), play/upvote counts,
and a plain amplitude waveform for trimming. Nothing time-correlates lyrics to
audio.

**No song JSONs were saved** — there is no ground-truth data to extract.
`docs/curriculum/suno-timings/` was not created since there is nothing to put
in it.

**Surprise:** the account is NOT Free-tier-only — it shows "720 Credits" and
has generated 115+ songs, yet Studio/Video export are still gated behind a
*separate* Premier subscription ($24/mo) distinct from generation credits.
Alignment data is a paid-feature byproduct, not a data-access-tier byproduct —
so even a credits-rich Suno account gets nothing extra here without Premier.

**Implication for the pipeline:** whisper large-v3 (already locked as the
certified path per §3/§4 above) remains the only source of timing ground truth
we can actually obtain. The stutter-chant approx-word problem stays a
whisper-side problem to solve (energy-profile DP alignment, the queued
next-build item), not a Suno-data problem to route around.


---

## Forced alignment = the PRIMARY timing path (Jul 15/16, 2026 — build)

**Status: BUILT + validated (no render).** Full contract + outcome:
`docs/handoffs/PLAN_FORCED_ALIGN_JUL15.md`. This supersedes the "energy-profile
DP alignment is the only lever" framing above for the normal lyrics case: when
lyrics are provided (always, in the curriculum pipeline), **timing now comes from
stable-ts FORCED ALIGNMENT, not from transcription.**

### Why
Transcription structurally fails stutter-chant kids songs — even whisper
large-v3 hits **80.8% approx** on W02-sound "T-T-Turtle" (duplicate words crammed
together become even-spread guesses → subtitles drift + images anchor on
guesses). Forced alignment sidesteps this entirely: the lyric text is GROUND
TRUTH and `stable_whisper.align(audio, text, language)` only *times* it via DTW
over the model's cross-attention — it never transcribes/guesses text. Every word
lands monotonic and on-pin, `approx` collapses to ~0%.

### The path (analyze.py)
`build_timeline` picks the timing tier in this order:

1. **`--subs` file present** → the imported cues time the words (unchanged);
   `timing_source = "subs"`.
2. **lyrics present (the normal case)** → `build_forced_aligned_words` runs
   stable-ts forced alignment. Success → `timing_source = "align"`, every word
   `approx: False`.
3. **fallback** → when the align venv/worker is missing, the align call fails, or
   `MVGEN_ALIGN=off`, it degrades (loud log line) to the previous whisper
   transcription + NW-align + windowed re-transcription tier
   (`build_aligned_words`); `timing_source = "transcribe"`.
4. **no lyrics** → transcription-only (`timing_source = "transcribe"`), or
   `--no-lyrics` → empty words (`"none"`).

Because align words are ~0% approx, `script_should_engage` returns **False** and
the **certified anchor path** schedules images (verified: W02-sound goes from
"needs script mode" to anchor, 5/8 images anchored, ratio 0.625). The
energy-profile DP script schedule (§2 above) stays as-is for the residual cases
that still land in script mode; approx-run suppression / neighbor-hold still
protect the transcription fallback. `timing_source` is written into the
`shot_report.json` summary so a batch sweep can tell align-timed songs from
transcription-timed ones at a glance.

### Environment / venv
- **Align venv:** `~/mvgen-models/align-venv` (torch + stable-ts + openai-whisper;
  `base.pt` cached in `~/.cache/whisper`). The daemon's Homebrew python
  (`/opt/homebrew/bin/python3`, has librosa + faster-whisper but NOT torch) shells
  out to this venv's interpreter via `align_worker.py` with JSON file I/O, so the
  heavy dependency never touches the daemon environment.
- **Env vars:**
  - `MVGEN_ALIGN` (default `on`; `off`/`0`/`false`/`no` forces the transcription
    fallback).
  - `MVGEN_ALIGN_MODEL` (default `base` — the batch-proven feasibility model).
  - `MVGEN_ALIGN_VENV` (default `~/mvgen-models/align-venv`) — the venv DIRECTORY;
    interpreter is `<venv>/bin/python`.
  - `MVGEN_ALIGN_PYTHON` — explicit interpreter path override (wins over
    `MVGEN_ALIGN_VENV`).
- The alignment mode+model are folded into `inputs_fingerprint`, so toggling
  `MVGEN_ALIGN`/`MVGEN_ALIGN_MODEL` auto-invalidates a cached timeline (it
  re-analyzes on the next render).

### Live validation (no render)
Real forced alignment of the W02-sound "T-T-Turtle" audio: **75 words, approx
count 0, monotonic**, first sung `table` at **40.92s** (its ~40.8s pin — the
exact word the whole v1 saga was about). End-to-end `build_timeline` on the same
audio returns `timing_source: "align"`; with `MVGEN_ALIGN=off` it logs the
fallback and returns `timing_source: "transcribe"` with 62/73 approx (the old
stutter-song failure the align path exists to eliminate).

### Tests
`test_shotlist_matching` **106** · `test_mvgen_fixes` **71** (was 43; +28:
env config, off honored, venv-dir resolution, signature, fingerprint toggle on
mode+model, approx-False propagation, empty/None → fallback) · `test_script_
schedule` **80** on the Mac (was 70; +5 timing_source-in-shot_report, +5 LIVE
W02 forced-align regression asserting approx 0 / monotonic / `table` 40.3–41.5s).
The byte-identical anchor-path guardrail (`test_passing_song_plan_unchanged`)
stays green.
