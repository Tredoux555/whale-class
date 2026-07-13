# mvgen — automated music video generator

Turns an mp3 + a folder of images into a lyric music video. **No AI at render
time** — librosa and a *local* whisper model analyse the song once, then ffmpeg
assembles every frame deterministically. Cost per video ≈ $0.

Ships the **slideshow** engine (Engine A) plus a local **daemon** (`server.py`)
that drives renders from the Whale admin *MV Studio* page. The **canvas** engine
(Engine B, p5.js/headless-Chrome) is scoped for phase 3 — `--engine canvas`
currently exits with "not built yet".

**Phase 1.5 quality fixes:**
- **Lyrics are ground truth.** With `--lyrics`, the displayed words are ALWAYS
  the lyric words; whisper supplies only *timing* via Needleman-Wunsch alignment
  (+ windowed re-transcription of any region whisper missed + RMS-gated even
  distribution as a last resort). Correct words even where the model decode-loops.
- **Beat-grid selection + musical cuts.** A `{T/2, T, 2T}`×phase grid search
  corrects librosa half/double-time errors on synth/kids tracks; cuts snap to the
  nearest strong onset and land on `--cut-every` downbeats (default every 2 bars).
- **Lyric-synced images (`--image-sync lyrics`, default).** The object on screen
  matches the word being sung: name an image after a word (`04-cup.png`) and that
  image is up — comfortably, a beat early — exactly when "cup" is sung. See
  [Lyric-synced images](#lyric-synced-images) below. Falls back to plain cycling
  when there are no lyrics or no filename matches.

---

## Install

Python 3.9+ and ffmpeg (4.4+) are required. On the Mac:

```bash
brew install ffmpeg                     # if not already present

# Python deps (system Python — the repo convention is --break-system-packages;
# a venv works too):
pip3 install --break-system-packages librosa soundfile faster-whisper
```

Notes:
- **Whisper is 100% local.** We use `faster-whisper` (CTranslate2, CPU-friendly)
  or `stable-ts` if installed. We deliberately never call the OpenAI API —
  `OPENAI_API_KEY` lives only on Railway. The first run downloads the model
  (~140 MB for `base`) from HuggingFace and caches it under
  `~/.cache/huggingface/`. Subsequent runs are offline.
- If the model download is impossible (no network / blocked), analysis degrades
  gracefully to an empty `words[]` and the video renders **without** subtitles.
  Force this on purpose with `--no-lyrics`.
- `stable-ts` is an optional upgrade (better word alignment):
  `pip3 install --break-system-packages stable-ts`.
- **Model size.** `base` is the default and recommended floor — `tiny` is much
  more prone to repeat-loop hallucinations (it produced a "A A A A A ..." wall on
  the test song). Point `--model` at a local model directory to skip the
  download entirely (e.g. `--model /path/to/faster-whisper-base`).

### Bundled fonts (`fonts/`)

The `fonts/` directory ships the theme fonts so burned-in subtitles render
**identically on every machine** (macOS silently substitutes a system serif for
Lora otherwise, changing the montree look):

- `Lora-Regular.ttf`, `Lora-Italic.ttf`, `Lora-BoldItalic.ttf` (montree theme)
- `Andika-Regular.ttf`, `Andika-Bold.ttf` (kids theme)

All are SIL Open Font License 1.1 — see `fonts/OFL-Lora.txt`. Font resolution
order per theme: bundled `fonts/` → an assets dir next to `--images`/`--audio`
(lets a project ship its own copy) → system fontconfig by name.

---

## Usage

```bash
python3 scripts/mvgen/mvgen.py \
  --audio "song.mp3" \
  --images "images/" \
  --theme kids \
  --engine slideshow \
  --out "out.mp4"
```

Key flags:

| Flag | Default | Meaning |
|------|---------|---------|
| `--audio` | (required) | input mp3 |
| `--images` | (required) | directory of images (png/jpg/webp/…) |
| `--lyrics` | none | optional lyrics `.txt` — the ground-truth display words |
| `--subs` | none | `.srt`/`.vtt` timing source (MacWhisper etc.) — **skips whisper entirely**. With `--lyrics` the lyric words stay the display text, timed from the subs. See [Subtitle import](#subtitle-import-macwhisper) |
| `--pulse` | `beat` | beat-pulse zoom "camera hit": `beat` (every beat/downbeat/anchor), `downbeat` (downbeats + anchors only), `off` (pure Ken Burns drift). See [Beat pulse](#beat-pulse) |
| `--analyze-only` | off | write `timeline.json` (+ `lyrics.txt`) and exit before rendering — feeds the Shot Planner |
| `--no-lyrics` | off | skip transcription; render without subtitles |
| `--theme` | `kids` | `montree` (dark forest + gold + Lora italic) or `kids` (bright, #2D5A27 frame + Andika) |
| `--engine` | `slideshow` | `slideshow` (built) or `canvas` (phase 3, not built) |
| `--out` | `~/Desktop/Music Videos/<song>/<song>.mp4` | output mp4 |
| `--model` | `base` | whisper model size (`tiny`/`base`/`small`/…) or a path to a local faster-whisper model dir |
| `--seed` | `42` | deterministic seed |
| `--min-seg-dur` | `1.8` | minimum shot length (merges rapid downbeats) |
| `--cut-every` | `2` | cut on every Nth downbeat — `1`/`2`/`4` bars (2 = calmer pacing) |
| `--image-sync` | `lyrics` | `lyrics`: anchor each object image to the moment its word is sung (auto-falls-back to `cycle` if no lyrics/matches). `cycle`: content-blind beat-cycling (the original behaviour). See [below](#lyric-synced-images). |
| `--progress-file` | none | append JSON-line progress `{stage,progress}` here (used by the daemon) |
| `--reanalyze` | off | force fresh analysis, ignoring cached timeline.json |

`timeline.json` is written next to the output and **reused** on re-runs, so you
can iterate on visuals without re-transcribing. Delete it or pass `--reanalyze`
to refresh. As a safety net, the cached timeline's stored duration is compared
to the actual mp3 (±0.5s) on every run; a mismatch (e.g. you swapped the audio
but kept the folder) triggers an **automatic re-analysis** with a printed notice.

**Repetitive / hard songs & `--lyrics`.** Whisper can enter a repeat-loop
hallucination on heavily repetitive tracks (chants, phonics songs). `analyze.py`
defends against this three ways: `condition_on_previous_text=False`, `base`
model, and a post-transcription **degenerate-word filter** that collapses
repeat-loops (`A A A A ...` and phrase loops like `it's a it's a ...`) to at most
two copies and drops zero-duration / past-end words. If a song is still garbled,
pass `--lyrics words.txt` — the text biases whisper's vocabulary
(`initial_prompt`). Note this biases *word choice*, not loop-prevention: a song
whose full-file decode loops in a section may simply have no subtitles there
rather than garbage (verify that section isn't just instrumental).

Output is **1920×1080 landscape, H.264 + AAC** in v1. (Portrait 1080×1920 is a
one-line change in `themes.py` — deferred to phase 2.)

### Lyric-synced images

With `--image-sync lyrics` (the default), the picture on screen lines up with the
word being sung — the whole point of the feature. It works entirely off the
**image filenames** and the ground-truth lyric timings, deterministically, with
no AI at render time (`shotlist.py`).

**Name your images after the sung word.** The keyword is extracted from the
filename by stripping any leading number/order prefix, the separators, and the
extension:

| Filename | Keyword(s) | On screen when… |
|----------|-----------|-----------------|
| `04-cup.png` | `cup` | "cup" is sung |
| `10-potato.png` | `potato` | "PO-TA-TO!" is sung (punctuation/hyphens ignored) |
| `14-ambulance.png` | `ambulance` | never sung → used as **filler** |
| `a_red_apple.png` | `red`, `apple` | either "red" or "apple" is sung ("a" is ignored) |

Rules:

- **Name images after the sung word.** The object keyword is what lines the
  image up with the lyric — pick the noun that is actually sung.
- **Multi-token names index every token** (`red_apple` → matches "red" *or*
  "apple"). Matching is case- and punctuation-insensitive.
- **Short & common tokens are ignored** — tokens under 3 letters and a small
  stopword set (`a, an, and, as, at, be, by, do, he, i, if, in, is, it, its,
  my, no, of, on, or, so, the, to, up, we, what, who, you`) are dropped, so
  `a_red_apple.png` matches "red"/"apple" only and never the ubiquitous "a"
  (which is sung on nearly every line and would otherwise hijack every shot).
- **Naive plurals fold together** — `cup.png` also matches "cups", and
  `boxes.png` matches "box"/"boxes".
- **How a shot is placed:** the first time a keyword is sung, its image starts on
  the beat-grid cut **just before** the word (with a ≥0.35 s pre-roll so it's
  comfortably up when the word lands — widened to ≈1 s when the word's timing was
  *guessed* by the even-distribution fallback) and holds across the sung run
  ("mat! …mat, mat, mat!" = one shot). Repeats of the same word don't re-cut; a
  *different* object word starts a new shot. When two different object words land
  closer together than the cut grid can separate, the later word wins its moment
  (image up on its trigger) and a `WARN compressed anchor` line is printed.
- **Gaps** (intro, instrumental breaks, stretches with no matching word) are
  filled with the **unmatched** images — those whose keyword is never sung —
  cycling on the normal `--cut-every` cadence. If they run out, the
  least-recently-shown image is reused. Every cut is still beat/onset-snapped.
- **Fallback:** no `--lyrics` (or no lyric words, or zero filename matches) →
  behaves exactly like `--image-sync cycle` (content-blind cycling in filename
  order). Force the old behaviour any time with `--image-sync cycle`.

At render time the engine prints the full **shot list** to stderr (each shot's
image, start–end, and the trigger word+time for anchored shots) — the audit trail
for "is the cup really on screen when 'cup' is sung?".

### Beat pulse

`--pulse` adds a professional "camera hit": on each beat the image **punches**
(a quick zoom-in) and decays fast, so motion lands ON the beat instead of just
drifting. It's implemented purely inside the ffmpeg `zoompan` `z` expression —
Ken Burns drift **+** `Σ A·exp(-(t−tb)/τ)` over the shot's beats — so there's no
extra pass and no AI at render time.

- **Amplitudes:** plain beat `0.035`, downbeat `0.06`, **anchor word `0.09`**
  (the sung word's image punches as the word lands). `τ = 0.12 s` (fast decay;
  instant attack, gated so it never fires before the beat).
- **Modes:** `beat` (default) pulses every beat + downbeat + anchor; `downbeat`
  pulses only downbeats + anchors (calmer); `off` is pure drift — the z
  expression is byte-identical to the pre-pulse engine (no regression).
- **Safety:** total zoom is clamped ≤ 1.5; at most 24 pulse terms per shot
  (plain beats are dropped first when over). If the pulsed expression ever
  destabilizes ffmpeg 4.4, the render **retries with fewer terms** (`beat →
  downbeat → off`) rather than failing — the fallback is logged.

### Subtitle import (MacWhisper)

If you already have accurate word timings (e.g. from **MacWhisper** or any
whisper GUI), export them as **`.srt` or `.vtt`** and pass `--subs`:

```bash
# 1. In MacWhisper: transcribe the song, then Export → SRT (or VTT).
#    Word-level export is ideal (one word per cue = exact timing); a normal
#    line/segment export also works (words are spread evenly inside each cue).
# 2. Drop the file in and let it drive the timing — whisper is NOT run:
python3 scripts/mvgen/mvgen.py --audio song.mp3 --images imgs/ \
  --subs song.srt --lyrics lyrics.txt --theme kids
```

- **`--subs` alone:** the subtitle text becomes the on-screen words.
- **`--subs` + `--lyrics`:** the **lyric words stay the display text**
  (ground truth), Needleman-Wunsch-aligned onto the subtitle timings — the best
  of both (clean words, accurate timing) with **zero** model inference.
- Multi-word cues are split evenly across the cue and flagged `approx` (wider
  image pre-roll, same as the whisper even-distribution fallback).
- The parser is stdlib and tolerant: UTF-8 BOM, CRLF, SRT numbering,
  `WEBVTT`/`NOTE`/`STYLE` blocks, `HH:MM:SS,mmm` and `MM:SS.mmm` timestamps,
  multi-line cues, inline `<...>` tags. A malformed file degrades to the normal
  whisper/lyrics path.

### Analysis only

```bash
python3 scripts/mvgen/analyze.py --audio song.mp3 --out timeline.json
# or, to also populate the Shot Planner cache + persist lyrics.txt:
python3 scripts/mvgen/mvgen.py --audio song.mp3 --lyrics lyrics.txt --analyze-only
```

Set `MVGEN_DEBUG=1` to dump the per-lyric-word matched/timed table (useful when
tuning the alignment on a new song).

---

## The daemon (MV Studio backend)

`server.py` is a tiny stdlib HTTP daemon (no FastAPI, no new deps) that the Whale
admin **MV Studio** page (`montree.xyz/admin/mvgen`) talks to. It runs on the Mac
and drives renders as subprocesses — renders NEVER run inside the Next.js/Railway
process.

```bash
cd ~/Desktop/Master\ Brain/ACTIVE/montree && python3 scripts/mvgen/server.py
```

Binds **127.0.0.1:8787 only**. Chrome allows the HTTPS page → localhost call
because loopback is a "potentially trustworthy" origin and the daemon answers
Chrome's Private Network Access preflight + normal CORS. **Chrome only** — Safari
blocks this pattern. A Railway-side proxy is impossible (its localhost ≠ your Mac).

Security: CORS allow-list (`montree.xyz`, `www.montree.xyz`, `localhost:3000` —
any other origin gets no `Access-Control-Allow-Origin`); filesystem jails
(browse → `$HOME`; media/delete/library → `~/Desktop/Music Videos`); renders run
in their own process group so cancel kills ffmpeg too.

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | `{ok, version, ffmpeg, default_model}` |
| `GET /api/browse?path=&kind=audio\|images` | jailed file browser ($HOME) |
| `POST /api/jobs` | queue a `render` (default) or `analyze` job → `202 {job_id}` (409 if that song is already running) |
| `GET /api/jobs` | all jobs, newest first (each carries its `mode`) |
| `GET /api/jobs/<id>` | one job + `log_tail` |
| `POST /api/jobs/<id>/cancel` | kill the render's process group |
| `GET /api/library` | scan `~/Desktop/Music Videos` |
| `GET /api/media?path=` | stream an mp4 with **Range** support (video scrubbing) |
| `GET /api/lyrics?audio_path=` | saved `lyrics.txt` for that song |
| `POST /api/library/delete` | delete one mp4 (jailed) |
| `GET /api/projects` | list projects + their `audio`/`images`/`subs` contents |
| `POST /api/projects` `{name}` | create a project → `201 {project}` (409 if it exists) |
| `POST /api/upload?project=&kind=audio\|image\|subs` | **raw-body** upload (filename via `X-Filename`) → `201 {saved}` |
| `GET /api/plan?audio_path=&images_dir=&theme=` | Shot Planner: cached-timeline sections/anchors/missing-artwork (404 if not analyzed yet) |

`POST /api/jobs` fields: `{mode:"render"|"analyze", audio_path, images_dir?,
lyrics_text?, subs_path?, theme, cut_every, pulse, seed, model}`. `analyze` jobs
run `mvgen.py --analyze-only` (timeline only, no render — `images_dir` optional).
One job at a time (single-worker queue); each runs
`python3 mvgen.py … --progress-file <song dir>/progress.jsonl` and the daemon
tails that file for live progress (analyze ≈ 0–40, render 40–100).

### Projects + upload

Drag-and-drop assets from the dashboard land in a **project** under the music
root, so rendered project songs still stream through the media jail:

```
~/Desktop/Music Videos/_projects/<slug>/
    audio/    (.mp3 .wav .m4a .flac,  ≤ 200 MB each)
    images/   (.png .jpg .jpeg .webp .bmp,  ≤ 30 MB each)
    subs/     (.srt .vtt .json .txt,  ≤ 10 MB each)
```

Uploads stream straight to disk (the endpoint is exempt from the 1 MB JSON body
cap but enforces its own per-kind caps → `413`; a wrong extension → `415`). The
filename comes from `X-Filename`, sanitized to a basename and collision-suffixed
(`foo.png` → `foo-2.png`). Everything is jailed to the projects root.

### Shot Planner

`GET /api/plan` reads the **cached** timeline for a song (run an `analyze` job
first) and, against an images dir, returns:

- `sections` — the song's energy sections (`start`/`end`/`label`),
- `anchors` — each sung object word mapped to the image that will show for it,
- `missing` — distinct sung nouns with **no** matching image, ranked by count,
  each with a `suggested_filename` (next free `NN-word.png`) and an `mj_prompt`
  (a plain string template per theme — **the operator is the image API**; no AI),
- `fillers` — images whose keyword is never sung (used to fill gaps).

The keyword/stopword rules are imported straight from `shotlist.py` — the plan
and the render agree on what "matches" by construction.

---

## Architecture

Three layers, matching the spec:

```
analyze.py ──▶ timeline.json ──▶ engine_slideshow.py ──▶ out.mp4
              (beats, downbeats,   (ffmpeg filter_complex)
               sections, words)
```

| File | Purpose |
|------|---------|
| `analyze.py` | librosa beat-grid/downbeat/onset/RMS-section analysis + local whisper timing + lyric ground-truth alignment → `timeline.json` |
| `align.py` | stdlib lyric↔transcript alignment (normalize, parse, Needleman-Wunsch, RMS-gated even distribution). No torch/stable-ts |
| `subs.py` | stdlib SRT/VTT parser (`--subs`): cues → word timings (multi-word cues split evenly + flagged `approx`). No deps |
| `ass_karaoke.py` | builds the ASS karaoke subtitle document (word-by-word `\kf` highlight) from the word list. Kept separate because phase-2 styling extends it |
| `shotlist.py` | beat-grid primitives (`snap_to_onset`/`build_cut_grid`/`build_segments`, shared with the cycle path) + lyric-synced image scheduling: filename→keyword index, keyword→word anchors, and the `(image, start, end)` shot list. No AI, deterministic |
| `engine_slideshow.py` | Engine A: pre-scales images, builds the shot sequence (lyric-synced via `shotlist.py`, or content-blind cycling), Ken Burns zoompan, optional frame border, burns in ASS subs — one deterministic ffmpeg call with progress parsing |
| `themes.py` | all visual params for both themes in one dict (phase-2 polish = config change) |
| `mvgen.py` | CLI glue: validate args, cache timeline, resolve theme/font, render, emit progress |
| `server.py` | the local MV Studio daemon (stdlib HTTP, 127.0.0.1:8787) |

### timeline.json shape

```jsonc
{
  "audio":     { "path", "filename", "duration", "sample_rate", "tempo" },
  "beats":     [t, ...],                        // seconds, phase/tempo-corrected grid
  "downbeats": [t, ...],                        // 4/4 heuristic, subset of beats
  "onsets":    [t, ...],                        // strong onset times (cut snapping)
  "grid":      { "base_tempo", "chosen_factor", "period", "phase", "candidates" },
  "sections":  [{ "start", "end", "level", "label", "energy" }, ...],
  "words":     [{ "word", "start", "end", "approx"? }, ...] // lyric words or []
                // "approx": true is set only on words placed by the
                // even-distribution fallback (guessed timing). Optional —
                // absent means an exact/aligned time. Readers that only need
                // word/start/end (ass_karaoke, old timelines) are unaffected.
}
```

### Design choices

- **Beat grid** is chosen from `{T/2, T, 2T}`×phase candidates by maximizing the
  mean onset strength at the grid times (a tie-break within 3% prefers the factor
  nearest 1.0, so we only halve/double when the evidence is real). This fixes
  librosa locking at half/double the musical tempo on synth/kids tracks. The
  chosen candidate's metric is printed.
- **Downbeats** use a 4/4 heuristic on the chosen grid: pick the beat phase (0–3)
  carrying the most onset energy; those are the bar lines. `--cut-every` selects
  every Nth downbeat and each cut is **snapped to the nearest strong onset within
  ±120 ms**; `--min-seg-dur` merges cuts that are too close.
- **Lyric alignment** (`--lyrics`): displayed words are always the lyric words.
  Whisper transcribes once, Needleman-Wunsch aligns transcript→lyrics for timing,
  compressed/false anchors are rejected (whisper decode-loops leave common words
  like "a"/"it's" falsely matching late transcript tokens), uncovered runs are
  windowed-re-transcribed, and anything still uncovered is even-distributed across
  the RMS-active (singing) intervals of the gap.
- **Ken Burns** is deterministic per shot index (slow zoom-in + rotating pan
  direction). zoom-*out* is avoided (glitchy in ffmpeg's zoompan).
- **Karaoke**: ASS `SecondaryColour` = unsung base, `PrimaryColour` = sung
  highlight; `\kf` sweeps each word from base→highlight exactly when sung.
- **Fonts**: every theme embeds its `.ttf` via ffmpeg `fontsdir` — resolved from
  the bundled `fonts/` dir first, then an assets dir near `--images`/`--audio`,
  then system fontconfig by name. Filter paths passed to `ass=`/`fontsdir=` are
  escaped (`\ : ' [ ] ,`) for defense in depth.
- **Determinism**: same inputs → same bytes-ish video. Whisper decode is pinned
  `beam_size=5` (beam search), `temperature=0` (no sampling), and
  `condition_on_previous_text=False` (anti-repeat); layout has no randomness
  beyond the fixed `--seed`.

### Edge cases handled

- images dir with a single image (reused for every shot)
- fewer images than shots (cycled)
- very short mp3 (<10s)
- missing font (bundled → assets → system fallback)
- no whisper / model download fails (renders without subs)
- whisper repeat-loop hallucination (degenerate-word filter collapses it)
- stale `timeline.json` from a different mp3 (duration check → auto re-analyze)
- output directory auto-created
- unexpected runtime error → clean one-line message, no traceback

### Not in phase 1

- Engine B "canvas" (p5.js/headless Chrome) — phase 3
- portrait output, section-aware colour changes, transitions — phase 2
```
