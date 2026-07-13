# Session Handoff — Jul 10, 2026 (night) — MV STUDIO SHIPPED: /admin/mvgen dashboard + local render daemon + phase-1.5 quality fixes

**Design/contract (read FIRST before touching any of this): `docs/handoffs/PLAN_MVGEN_STUDIO_JUL10.md`. Phase-1 CLI handoff: `SESSION_MVGEN_PHASE1_JUL10.md`. Sacred flow: Fable designed + wrote the contract → 2 parallel Opus builds (daemon+quality / dashboard) → Sonnet fresh-eyes FIX FIRST (2 CRIT) → Opus fixes → Sonnet re-audit SHIP (0 CRIT). NOT committed/pushed yet.**

## Tredoux's rulings (locked)
- Engine runs as a **LOCAL DAEMON on the Mac** — $0, never inside the Next.js/Railway process (spec rule). A Next.js proxy is IMPOSSIBLE in production (Railway's localhost ≠ the Mac) — do not "fix" the direct browser→localhost fetch into a proxy.
- Dashboard = **Whale admin** tab: `montree.xyz/admin` → 🎼 MV Studio card → `/admin/mvgen`. Chrome only (loopback is mixed-content-exempt in Chrome; Safari blocks it).

## What shipped
- **`scripts/mvgen/server.py`** — stdlib daemon, 127.0.0.1:8787 only. Endpoints per the contract (health, browse [$HOME-jailed], jobs CRUD + cancel [killpg], library, media [Range-streaming, ~/Desktop/Music Videos-jailed], lyrics, delete). CORS allow-list (montree.xyz + localhost:3000) + Chrome Private-Network-Access preflight header. Single-worker render queue, subprocess mvgen.py with `--progress-file`, atomic 409 same-song dedup, 1MB body cap, all job-state mutation under one lock.
- **`app/admin/mvgen/page.tsx`** — control center: daemon status banner (offline → copyable start command), New Render (file-browser modals over /api/browse, lyrics textarea w/ autoload, theme, cut cadence), live Queue (adaptive polling, progress bars, cancel, verbatim errors + log tail), Library (inline `<video>` playback via Range, delete, copy-path). Hub card appended to `TOOLS` in `app/admin/page.tsx`. Auth = existing /admin/* middleware gate — nothing per-page.
- **`next.config.ts`** — CSP: `http://127.0.0.1:8787 http://localhost:8787` added to **connect-src AND media-src** (media-src was an audit-grade catch by the UI builder: `<video src>` is governed by media-src; connect-src alone would silently block Library playback). Nothing else touched.
- **Quality fix A — lyrics are ground truth (the "subtitles are wrong" cure).** Provided lyrics are ALWAYS the displayed words; whisper only supplies timing via stdlib Needleman-Wunsch alignment (no torch). Uncovered spans → windowed re-transcription (lyric lines as initial_prompt) → re-align → RMS-gated even distribution. Post-Pass-2 **sparse-anchor rejection** (`_reject_sparse_anchors`) kills false-early anchors that strand a singing span blank (the 7.6s blank climax CRIT). Verified: potato song now 90/90 lyric words, max blank gap in singing regions 1.44s, "PO-TA-TO!" on screen at the climax.
- **Quality fix B — beat grid + musical cuts (the "doesn't follow the beat" cure).** {½T, T, 2T}+phase grid selection by mean onset strength (metric printed; 133.9bpm won for the test song); every cut snapped to the nearest strong onset (±120ms); **`--cut-every {1,2,4}` downbeats, default 2** (18 shots/66s vs the frenetic 37). Independently verified: max cut→beat distance 43.7ms. Downbeat zoom-pulse deliberately skipped (ffmpeg expression stability > eye candy).
- `scripts/mvgen/align.py` (new), analyze.py rewrite, engine cut-snapping, mvgen.py `--cut-every`/`--progress-file`, README daemon section.

## Go-live (Tredoux, on the Mac)
1. Commit + push via Desktop Commander (Railway auto-deploys the dashboard + CSP).
2. `pip3 install --break-system-packages librosa soundfile faster-whisper` (once).
3. `cd ~/Desktop/Master\ Brain/ACTIVE/montree && python3 scripts/mvgen/server.py`
4. Chrome → montree.xyz/admin → MV Studio. Pick song + images, PASTE THE LYRICS (this is the quality lever — they're in the week docs, e.g. `docs/curriculum/weeks/WEEK_01_A.md` §2), Render.
5. First render downloads whisper base (~145MB) to ~/.cache/huggingface.

## Known edges (accepted, documented)
- Chrome-only dashboard (Safari blocks HTTPS→localhost). UI says so.
- Lyrics paste >1MB → generic "can't reach daemon" instead of a clean 413 (fetch vs socket-close semantics). Non-blocking for an internal tool.
- Repeat-collapse still caps a genuine "la la la" triple at 2 subtitles in the NO-lyrics path (lyrics path unaffected — another reason to always paste lyrics).
- Jobs are in-memory (daemon restart clears the queue view; rendered files persist on disk).
- Sandbox leftovers to delete via Desktop Commander: `scripts/mvgen/__pycache__/`, `tsconfig.scope-mvgen.json` (both gitignored).

## LATE ADDITIONS (same night, after ship)

**Opus full audit ("see everything is proper"): FIXED-NOW-PROPER.** One real find fixed: daemon `IMAGE_EXTS` advertised `.gif` folders the engine can't render (server.py:54 aligned to the engine's list + lockstep comment). Live attack tests all held (symlink escape → 403, evil-origin CORS, delete-a-directory refusal, 413, cancel killpg). git status clean of collateral damage; pre-existing dirt untouched.

**🖼 LYRIC-SYNCED IMAGE SCHEDULING (`scripts/mvgen/shotlist.py`) — the "pictures don't line up with the song" cure.** Images are matched to sung words via filename keywords (04-cup.png → "cup") and each anchored image cuts in ON THE BEAT just before its word lands, holds through the mention; unanchored stretches fill with unmatched images on the normal cadence; every cut still onset-snapped. `--image-sync lyrics|cycle` (default lyrics, auto-falls-back to the old cycling when no lyrics/matches). Daemon/dashboard needed zero changes. **🚨 RULE: name images after the sung word — that's the sync lever** (min 3 letters, stopwords like a/the/is are ignored in filenames). Sacred flow again: Opus build → Sonnet FIX FIRST (2 CRIT: stopword filename tokens hijacking anchors; near-simultaneous anchors letting an image arrive AFTER its word) → Opus fixes (+ approx-word flag: even-distributed climax words get a 1.0s pre-roll instead of 0.35s) → Sonnet re-audit **SHIP, 0 CRIT**. Potato verified: mat/cup/chair on screen as sung, professor-potato at the climax, max cut→beat 48ms.

## V2 (same night, "build me a masterpiece") — PULSE + PROJECTS/UPLOAD + MACWHISPER + SHOT PLANNER — SHIPPED

**Contract: V2 ADDENDUM in `PLAN_MVGEN_STUDIO_JUL10.md`. Sacred flow: Fable addendum → 2 parallel Opus builds → Sonnet FIX FIRST (2 CRIT) → Opus fixes → Sonnet re-audit SHIP (0 CRIT, 0 WARN).**

- **🥁 Beat pulse** (`--pulse off|beat|downbeat`, default beat): zoompan z = Ken Burns drift + Σ A·exp(−(t−tb)/0.12s); beat 0.035 / downbeat 0.06 / **anchored-word 0.09** (the image punches hardest as its word is sung). ≤24 terms/shot (drop plain beats first); instability fallback ladder beat→downbeat→off (never fails a render; never triggered on ffmpeg 4.4.2 at 141 terms). Verified numerically (motion spikes land +20-37ms after beats) + `off` z-expr byte-identical to v5.
- **📁 Projects + drag-drop upload**: `~/Desktop/Music Videos/_projects/<slug>/{audio,images,subs}/`; `GET/POST /api/projects`, `POST /api/upload?project&kind` (RAW body + X-Filename [percent-DECODED server-side — audit CRIT], streaming, caps 200/30/10MB, 415/413, jailed). Dashboard: project selector + 3 dropzones w/ per-file progress; render form goes project-aware.
- **🎙 MacWhisper/subtitle import**: `--subs file.srt|.vtt` / `subs_path` on jobs — subs present ⇒ whisper NEVER runs; +lyrics ⇒ lyrics stay ground-truth display, NW-aligned onto sub timings; multi-word cues → even split + approx flag; overlap/degenerate cues sanitized; malformed subs fall back to whisper gracefully.
- **🎨 Shot Planner (the no-API Midjourney workflow)**: `POST /api/jobs {mode:"analyze"}` + `GET /api/plan?audio_path&images_dir&theme` → sections, anchors (word→image ✓), **missing-artwork checklist** (sung word × count → next-free `NN-word.png` + theme-templated MJ prompt, copy buttons). Workflow: analyze → copy prompts into MJ → drop images into the project → refresh plan → render.
- **🚨 Cache rule (audit CRIT fix): timeline.json carries `inputs_fingerprint` (sha256 lyrics+subs+model)** — changing lyrics/subs auto-re-analyzes; no-input renders still reuse. Never remove this or the Shot-Planner tweak-and-re-render loop silently serves stale alignment.
- Known non-blocking: corrupt timeline.json needs `--reanalyze`/delete (clean error, pre-existing); two simultaneous drops into one dropzone interleave batches harmlessly.

## Next (phase 3 queue)
Portrait 1080×1920 option + theme polish · auto-start daemon at login (launchd plist) · Engine B canvas (headless-Chrome, closing-screen recipe) · `kind=subs` file-browser (subs currently project-only in UI) · lyrics library panel (browse week docs from the dashboard).

### 📌 PINNED (Tredoux, end of session) — status + resume queue

- **🚨 NOTHING IS DEPLOYED.** Tredoux checked montree.xyz/admin live — the MV Studio card is absent. Correct behavior: no commit/push has happened yet, the entire mvgen phase 1 + Studio + V2 build sits UNCOMMITTED in the working tree. **First action on resume: commit + push via Desktop Commander** → Railway deploys → card appears → then on-Mac go-live per §Go-live above.
- **#1 QUEUED TWEAK (Tredoux ruling): the beat-zoom pulse should fire ONLY on key vocab words** (the anchored/lyric-matched words — e.g. punch when "cup" lands), NOT on every beat/downbeat. Build note: add pulse mode `anchor` (pulses ONLY on anchor-word hits, amplitude 0.09) and make it the **default**; keep `beat`/`downbeat`/`off` as options. Small change, contained to engine_slideshow's pulse-plan builder + mvgen.py's default flag + one line in the dashboard's pulse select. Runs through the usual sacred flow (Opus build → Sonnet fresh-eyes → ship).
- **🎬 Session ends here because a bigger project takes priority: NEW SONGS + FULL CURRICULUM REVAMP, in a fresh context.** Tredoux: what gets built next "may very well replace this whole admin page… I want it to be front and center of the system." MV Studio work resumes AFTER the new/revamped curriculum is established — and should then be REVISITED in light of it (the revamped curriculum's songs are mvgen's primary content source going forward; expect the Shot Planner/theme templates to need aligning to the new curriculum's house style).

### RESUME PROMPT
> "Read `docs/handoffs/SESSION_MVGEN_STUDIO_JUL10.md` §PINNED. First: commit+push via Desktop Commander if not yet done. Then have Opus implement the anchor-only pulse default (queued tweak #2 in §PINNED). Fable directs, Opus builds, fresh-eyes audit before done."
