# PLAN — MV Studio (mvgen control center) + phase-1.5 quality fixes — Jul 10, 2026 (Fable design, LOCKED)

**Tredoux's rulings:** engine = LOCAL DAEMON on the Mac ($0, spec-compliant — renders NEVER run inside the Next.js/Railway process); dashboard = **Whale admin** tab at `/admin/mvgen` (internal creator tool, NOT Montree SaaS surface). Feedback driving the quality fixes: "doesn't follow the lyrics or the beat at all and the subtitles are wrong."

## Architecture

Browser (montree.xyz/admin/mvgen, Chrome) → `http://127.0.0.1:8787` (mvgen daemon on the Mac) → subprocess mvgen renders → `~/Desktop/Music Videos/<song>/`.

Why this works: loopback is a "potentially trustworthy" origin — Chrome exempts it from mixed-content blocking even on an HTTPS page. Two gates must be opened: (1) our CSP `connect-src` in `next.config.ts` must list `http://127.0.0.1:8787 http://localhost:8787`; (2) the daemon must answer Chrome's Private Network Access preflight (`Access-Control-Allow-Private-Network: true`) + normal CORS. Safari blocks this pattern — Chrome-only tool, documented in the UI. A server-side Next.js proxy is IMPOSSIBLE in production (Railway's localhost ≠ the Mac) — do not "fix" it that way.

Security: daemon binds 127.0.0.1 ONLY. CORS allow-list: `https://montree.xyz`, `https://www.montree.xyz`, `http://localhost:3000`. All filesystem access jailed (browse → $HOME; media/delete → ~/Desktop/Music Videos). Page auth = existing middleware admin-token gate on /admin/* (nothing to add per-page).

## API contract (daemon — stdlib http.server, no new deps, threaded)

- `GET /api/health` → `{ok, version, ffmpeg:bool, default_model}`
- `GET /api/browse?path=<abs>&kind=audio|images` → `{path, parent, dirs:[{name,path,image_count?}], files:[{name,path,size}]}`. Jail: $HOME. kind=audio → .mp3/.wav/.m4a/.flac files; kind=images → dirs (with image_count) + image files. Default path: ~/Desktop.
- `POST /api/jobs` `{audio_path, images_dir, lyrics_text?, theme:"montree"|"kids", engine:"slideshow", cut_every?:1|2|4, seed?, model?}` → `202 {job_id}`. Saves lyrics_text to `<song out dir>/lyrics.txt` (also used by render). 409 if a job already active for the same song.
- `GET /api/jobs` → `{jobs:[{job_id, song, status:"queued"|"analyzing"|"rendering"|"done"|"failed"|"cancelled", progress:0-100, stage, created_at, out_path?, error?}]}` (newest first, in-memory + this-session only is fine)
- `GET /api/jobs/<id>` → job + `{log_tail}` (last ~40 lines)
- `POST /api/jobs/<id>/cancel` → kills the whole process group (ffmpeg included; `start_new_session=True` + killpg)
- `GET /api/library` → `{videos:[{name, path, size, mtime, song, has_lyrics}]}` (scan ~/Desktop/Music Videos)
- `GET /api/media?path=<abs>` → streams mp4 with **Range support** (jail: ~/Desktop/Music Videos)
- `GET /api/lyrics?audio_path=<abs>` → `{lyrics_text|null}` (reads saved lyrics.txt for that song's out dir)
- `POST /api/library/delete` `{path}` → `{ok}` (jail: ~/Desktop/Music Videos; deletes one file)
- OPTIONS preflight on everything: 204 + `Access-Control-Allow-Origin` (echo if allow-listed) + `Access-Control-Allow-Methods: GET, POST, OPTIONS` + `Access-Control-Allow-Headers: Content-Type` + `Access-Control-Allow-Private-Network: true` (when `Access-Control-Request-Private-Network: true`) + `Access-Control-Max-Age: 86400`. Same Allow-Origin echo on actual responses.
- Job runner: ONE render at a time (queue). Executes `python3 mvgen.py … --progress-file <path>` as a subprocess; mvgen.py gains `--progress-file` (appends JSON lines `{stage, progress}`; analyze ≈ 0–40, render 40–100 parsed from ffmpeg `-progress`). Daemon tails that file.

Start command (README + offline card in UI): `cd ~/Desktop/Master\ Brain/ACTIVE/montree && python3 scripts/mvgen/server.py`

## Quality fixes (same build as the daemon — this is why the first render disappointed)

**A. Lyrics = ground truth; whisper = timing only.** When lyrics are provided: (1) transcribe as today (temp 0, degenerate filter); (2) DP-align (Needleman-Wunsch on normalized words) transcript ↔ lyric words; displayed words are ALWAYS the lyric words, timed from their matched transcript words; (3) for lyric regions with no matched timing (e.g. the 31–56s decode-loop), windowed re-transcription of JUST that audio span (with those lyric lines as initial_prompt) → re-align; still nothing → distribute that line's words evenly across the window between its anchored neighbours, gated by RMS (only where the track is actually singing). NO torch/stable-ts dependency — DP alignment is stdlib. Ship `--lyrics` as the quality path; transcription-only stays the fallback for unknown songs. **Acceptance: the potato render with the WEEK_01_A.md lyrics shows the correct words front AND back half, timed sanely.** (Ground truth lyrics: `docs/curriculum/weeks/WEEK_01_A.md` §2 "Lyrics" — extract the sung lines, strip section tags like [Chorus].)
**B. Beat grid + musical cuts.** (1) Tempo sanity: evaluate {T/2, T, 2T} beat-grid candidates (+ phase) and pick the one maximizing mean onset strength at beat times — kids synth tracks routinely half/double-time librosa. (2) Snap every cut to the nearest strong onset within ±120ms. (3) `--cut-every N` (1/2/4 downbeats, default 2 — 37 cuts in 66s was frenetic). (4) If cheaply feasible in ffmpeg expressions: subtle zoom pulse on downbeats (cap expression terms; skip if it degrades render stability — cuts landing ON the beat matter more than the pulse). **Acceptance: every cut time within 80ms of a detected beat; the chosen grid demonstrably beats the alternatives on onset alignment (print the metric).**

## Dashboard (`app/admin/mvgen/page.tsx`, client component)

Conventions (scouted): Tailwind dark slate (`bg-gray-900`/`bg-slate-800/50`, `border-slate-700`, `text-white`), emoji icons, "← Back to Admin" link, NO per-page auth (middleware covers /admin/*). Hub card appended to `TOOLS` in `app/admin/page.tsx` (id `mvgen`, 🎼, `bg-emerald-500`, "MV Studio — music video generator"). CSP: add `http://127.0.0.1:8787 http://localhost:8787` to `connect-src` in `next.config.ts` (only CSP change; note the why in a comment).

`const DAEMON = 'http://127.0.0.1:8787'`. Three panels + status:
1. **Daemon status banner** — health poll (5s). Offline → friendly card with the copyable start command + "Chrome only" note.
2. **New Render** — audio picker + images-dir picker (modal file browser over `/api/browse`); lyrics textarea (autoload via `/api/lyrics` when audio picked; "paste from the week doc" hint); theme toggle (kids/montree); cut cadence (1/2/4, default 2); Render → POST `/api/jobs`.
3. **Queue** — poll `/api/jobs` 1.5s while active: progress bar (reuse the video-manager bar pattern), stage label, expandable log tail, Cancel. Errors shown verbatim (Jun-14 rule: diagnosable).
4. **Library** — grid from `/api/library`: inline `<video controls>` via `/api/media?path=` (Range works), name/size/date, Delete (confirm), copy-path.

Verification bar: eslint --max-warnings=0 on touched files; scoped tsc (`tsconfig.scope-mvgen.json`, gitignore it); daemon runtime-tested in-sandbox over real HTTP incl. a full render job + Range request + CORS/preflight headers asserted; fresh-eyes audit before done.

---

# V2 ADDENDUM (same night, LOCKED) — beat pulse + projects/upload + subtitle import + Shot Planner

Tredoux: pulse "on the beat like professional, a quick zoom-in type effect"; drag-in song+media from the dashboard; MacWhisper SRT/VTT as timing source; MJ-has-no-API workflow = the planner generates the artwork checklist + prompts (the operator is the API).

## A. Beat-pulse effect (engine)
Per shot, the zoompan `z` expression = Ken Burns drift + Σ exponential-decay pulses: `A·exp(-(t−tb)/τ)` for each beat tb in the shot. Amplitudes: beat **0.035**, downbeat **0.06**, anchored-word landing **0.09** (the word's image punches as the word is sung). τ = **0.12s**. Attack is instant (cut/beat-aligned), decay fast — a camera "hit", not a wobble. Cap ~24 pulse terms per shot; if over, keep anchors + downbeats, drop plain beats. CLI `--pulse off|beat|downbeat` (default **beat**; downbeat = only downbeat+anchor pulses). Deterministic; if ffmpeg expression length/stability becomes a problem, fall back per-shot to downbeat mode rather than failing the render. Acceptance: numeric evidence that zoom jumps within 1 frame of beat times and decays (frame-scale or motion metric), plus viewed frames.

## B. Projects + upload (daemon + UI)
- Project = a folder `~/Desktop/Music Videos/_projects/<slug>/{audio,images,subs}/`.
- `GET /api/projects` → `{projects:[{name, slug, dir, audio:[{name,path,size}], images:[...], subs:[...], image_count}]}` · `POST /api/projects {name}` → 201 `{project}` (slug sanitized, 409 dup).
- `POST /api/upload?project=<slug>&kind=audio|image|subs` — RAW body (not multipart), filename via `X-Filename` header (sanitized: basename, no traversal, allowed extensions per kind: audio .mp3/.wav/.m4a/.flac; image .png/.jpg/.jpeg/.webp/.bmp; subs .srt/.vtt/.json/.txt). Streaming write with per-kind caps (audio 200MB, image 30MB, subs 10MB) — this endpoint is EXEMPT from the 1MB JSON body cap but enforces its own; 413 over cap, 415 bad extension. Returns `{saved:{name,path,size}}`. Jail: the projects root.
- UI: project selector + create; three dropzones (drag & drop + click-to-pick, multiple files, XHR upload w/ progress bars per file — reuse the video-manager XHR pattern); dropped files immediately usable in the render form (audio dropdown, images dir = project images/, subs dropdown).

## C. Subtitle import (MacWhisper etc.)
`--subs file.srt|.vtt` on mvgen.py + `subs_path` on POST /api/jobs. Parser (stdlib): SRT + VTT; cue-per-word files used directly as word timings; multi-word cues → words distributed evenly inside the cue span. When lyrics ALSO provided → lyrics stay ground-truth display text, NW-aligned onto the sub-derived timings (reuse align.py; skip whisper entirely). When subs given without lyrics → sub text is the display text. Whisper remains the fallback when no subs. `approx` flag set on evenly-distributed words inside multi-word cues.

## D. Shot Planner (daemon + UI)
- Analyze-only jobs: `POST /api/jobs {mode:"analyze", audio_path, lyrics_text?, subs_path?}` — runs analysis, writes the cached timeline, skips render (progress caps at 40 semantics fine: report stage analyze → done).
- `GET /api/plan?audio_path=<abs>&images_dir=<abs>` — pure read of the cached timeline + images dir → `{sections:[{start,end,label}], anchors:[{word,time,image}], missing:[{word, count, first_time, suggested_filename, mj_prompt}], fillers:[names]}`. `missing` = distinct sung words (≥3 chars, non-stopword — reuse shotlist's rules) with no matching image, ranked by count; `suggested_filename` = next free `NN-word.png`; `mj_prompt` = TEMPLATE string per theme (no AI): kids → `"a <word>, simple bright flat illustration for young children, thick outlines, friendly, plain white background --ar 16:9"`; montree → `"a <word>, elegant minimal illustration, deep forest green background #0a1a0f, gold accents, storybook style --ar 16:9"`. 404 w/ clear message if no cached timeline (UI then offers the analyze job).
- UI "Plan" panel: pick audio (project or browse) + lyrics → run analyze job → render the plan: section strip, anchor list (word→image ✓), missing-artwork checklist with copy-buttons for filename + MJ prompt, refresh button.

## Non-negotiables carried over
Loopback-only daemon, jails (projects root joins the media/delete jail set for uploads), CORS/PNA unchanged, deterministic renders, no AI at render time (planner prompts are string templates), no new Python deps, daemon start command unchanged. Fresh-eyes audit before done.
