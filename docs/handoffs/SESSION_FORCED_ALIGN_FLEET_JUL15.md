# SESSION — Jul 15, 2026 (night, Cowork/Fable directing Sonnet+Opus) — FORCED ALIGNMENT SHIPPED + FULL FLEET LAUNCHED

> **RESUME PROMPT:** Read this file first, then `docs/curriculum/SOUNDSONG_TIMING_FIX_JUL15.md`
> (§"Forced alignment = the PRIMARY timing path" — the technical record) and
> `docs/handoffs/PLAN_FORCED_ALIGN_JUL15.md` (the build contract). Check fleet state per §3
> below BEFORE doing anything else — the fleet may have finished, may still be running, or may
> have died mid-run (the monitor is a bash loop, not a supervised service).

---

## 1. The saga: how the video-timing problem actually got solved tonight

This closes the loop opened in `HANDOFF_CHAPTER_CLOSE_JUL15.md` §3 pt3 ("word-song path
CERTIFIED, sound-song timing fix queued — NO bulk renders until Tredoux trusts").

1. **Suno downloads probed for ground-truth timing data** — checked video/stems download,
   the clip API (`studio-api-prod.suno.com/api/clip/<id>`), the page's Next.js flight payload,
   the static lyrics panel, the crop tool, and a full network trace. **Verdict: NOT AVAILABLE**
   on the current (non-Premier) account — no `aligned_lyrics`/timestamps/captions field exists
   anywhere reachable; word-level alignment is a Suno *Studio* ($24/mo) byproduct that never
   reaches an inspectable endpoint pre-payment. Full investigation logged in
   `docs/curriculum/SOUNDSONG_TIMING_FIX_JUL15.md` ("Suno ground-truth timings" section).
2. **Whisper large-v3 tested on an isolated vocals stem** (one of the 6 Suno stem WAVs) for
   W02-sound "T-T-Turtle" — **worse** than transcribing the full mix (stem-separation artifacts
   confuse the model more than they help; 98.6% approx vs 80.8% on the mix). Ruled out.
3. **Tredoux's own MacWhisper SRT** for the same song — only ~20% lyric coverage (MacWhisper
   also can't crack the stutter-chants). A **dry run** proved routing it through the pipeline
   would *regress* the render quality versus the existing engine path — caught before any render
   was spent on it.
4. **The breakthrough: stable-ts FORCED ALIGNMENT.** Instead of transcribing (guessing what was
   said), fit the ALREADY-KNOWN lyric text to the audio via DTW over the model's cross-attention
   (`stable_whisper.load_model('base').align(audio, lyrics_text, language='en')`). The text is
   never guessed — only timed. On the worst-case song (W02-sound), every word landed within
   ~0.2–0.5s of a hand-timed reference. **Tredoux, on hearing the result: "God damn! It nailed
   it!"**

## 2. What was built (Opus build → Sonnet fresh-eyes audit → SHIP)

Contract: `docs/handoffs/PLAN_FORCED_ALIGN_JUL15.md`. Full technical detail:
`docs/curriculum/SOUNDSONG_TIMING_FIX_JUL15.md` §"Forced alignment = the PRIMARY timing path".

- **Forced alignment is now the PRIMARY timing source** in `scripts/mvgen/analyze.py`
  `build_timeline()`. Priority order: `--subs` file (unchanged, always wins) → **forced
  alignment** (the normal case — lyrics are always provided in this pipeline) → whisper
  transcription (fallback only: no lyrics, align unavailable, or `MVGEN_ALIGN=off`) → no
  lyrics → empty words.
- **New file `scripts/mvgen/align_worker.py`** — a venv-side worker script. The daemon's
  Homebrew python has librosa/faster-whisper but not torch, so alignment runs as a subprocess
  in a dedicated venv (`~/mvgen-models/align-venv` — torch + stable-ts + openai-whisper,
  `base.pt` cached), talking JSON over temp files. Never imports the daemon's analyze/subs
  modules (they need libraries absent from the align venv).
- **Env knobs:** `MVGEN_ALIGN` (default on), `MVGEN_ALIGN_MODEL` (default `base` — the
  batch-proven feasibility model), `MVGEN_ALIGN_VENV` (venv directory) / `MVGEN_ALIGN_PYTHON`
  (explicit interpreter override, wins). All folded into `inputs_fingerprint` — flipping any of
  them auto-invalidates a cached timeline (forces re-analysis, doesn't silently serve stale
  timing).
- **`shot_report.json` now carries `timing_source`** (`"align"` / `"transcribe"` / `"subs"` /
  `"none"`) in the summary — a batch sweep can tell at a glance which videos are align-timed.
  This field is also the **publish quality gate** (see §4).
- Because forced-aligned words are ~0% approx, `script_should_engage` returns **False** for
  songs that previously needed script mode — they now run the **certified anchor path**
  directly. W02-sound went from "needs script mode" to anchor scheduling (5/8 images anchored,
  ratio 0.625) once alignment fixed its timing. The energy-profile DP script-schedule work from
  earlier tonight (§3.2 of the SOUNDSONG doc — RMS envelope, section energy typing, per-image
  pins, min-hold, numeric gates) stays in the engine as the fallback path for any residual
  low-approx-but-still-script-mode case; it is NOT deleted, just demoted to a backstop.
- **Tests:** `test_shotlist_matching` 106/106 · `test_mvgen_fixes` 71/71 (was 43; +28 alignment
  config/fallback/fingerprint tests) · `test_script_schedule` 80/80 on the Mac (was 70; +5
  timing_source-in-report, +5 LIVE W02 forced-align regression asserting approx 0, monotonic,
  `table` at 40.3–41.5s). **Total 257/257.** Guardrail `test_passing_song_plan_unchanged` still
  byte-identical.
- **Sonnet fresh-eyes audit: SHIP, 0 bugs found.** Live validation (no render, per contract):
  real forced alignment of W02-sound = 75 words, approx count 0, monotonic, first sung `table`
  at **40.92s** (the exact ~40.8s pin the whole timing saga was about). `MVGEN_ALIGN=off` on the
  same audio correctly degrades to `timing_source="transcribe"` (73 words, 62 approx — the old
  failure mode, reproduced on demand for regression testing).

## 3. Fleet state — CHECK THIS FIRST ON RESUME

Certified renders produced tonight (align path, 0% approx, all reviewed):
**W02-sound, W03×2, W04×2 (levitating-cat gag lands correctly on "Up!"), W05–W10×12.**

⚠️ **W09-sound "H-H-Hat"** — sparse vocabulary forced it into script mode (not enough distinct
words to anchor cleanly); the energy gate **FAILED** on this one. It rendered and is on disk,
but is flagged for **Tredoux's personal review before it's treated as certified**. Do not
assume it's good just because it published (see §4 — the publish gate is `timing_source==
"align"`, not "energy gate passed", so a script-mode video with a failed energy gate can still
get published; it's flagged in the publish report, not blocked).

W10-sound also landed in script mode but its gates **PASS**.

**Full fleet (remaining 98 videos — W01, W02-word, W11–W58 ×2 each) was launched tonight** on
the mvgen daemon queue. Monitor: `scripts/mvgen/_tmp_fleet_monitor_jul15c.sh`, PID at launch
`57642`, log `/tmp/fleet_monitor_jul15c.log`. The monitor polls `GET
http://127.0.0.1:8787/api/jobs` in a loop, logs queue counts + disk-free every pass, prunes
`_projects/` when disk drops below 8GB (guarded — see the incident below), and when the queue
fully drains it prints `FLEET_DRAINED` and auto-runs
`node scripts/curriculum/publish-videos.mjs --all` (output → `/tmp/publish_videos.log`),
printing `PUBLISH_TRIGGERED` on completion. ETA at launch (~22:50) was ~2–3 hours.

**🚨 On resume, first thing: from the Mac,**
```
tail -50 /tmp/fleet_monitor_jul15c.log
grep -E "FLEET_DRAINED|PUBLISH_TRIGGERED" /tmp/fleet_monitor_jul15c.log
tail -100 /tmp/publish_videos.log
curl -s http://127.0.0.1:8787/api/jobs | python3 -m json.tool | grep -c '"status": "done"'
```
- If `FLEET_DRAINED` and `PUBLISH_TRIGGERED` both appear: the fleet finished and published
  itself. Verify `/tmp/publish_videos.log` shows a clean run (no total-failure exit) and spot-
  check a few weeks in Curriculum Studio (`/montree/library/curriculum-studio`) for working
  video players.
- If `FLEET_DRAINED` appears but NOT `PUBLISH_TRIGGERED`: publish-videos.mjs errored or wasn't
  found — run it manually: `cd ~/Desktop/Master\ Brain/ACTIVE/montree && node
  scripts/curriculum/publish-videos.mjs --all`.
- If neither appears: the monitor may have died (Mac slept, terminal closed, disk hit 0). Check
  `ps aux | grep _tmp_fleet_monitor` and `curl -s http://127.0.0.1:8787/api/jobs` directly — if
  jobs are still queued/rendering, just let it continue or relaunch the monitor; if the queue is
  empty but nothing published, run publish-videos.mjs manually.
- Check disk free (`df -g /`) regardless — the monitor prunes but a dead monitor won't.

### The prune incident (why the monitor was rewritten mid-launch)
The **first** monitor process pruned `_projects/` inputs for 4 in-flight jobs sharing a title
with an OLDER, unrelated completed render (W02/W11/W22/W56-word) — it matched by title alone
and deleted a fresh job's audio/images while the daemon was still rendering it, killing all 4.
Inputs were rebuilt and the jobs resubmitted. **The monitor was rewritten (v2, the version now
running) to cross-reference the daemon's LIVE job list before touching any project** — a
project's title is protected for its *entire* time in the queue/rendering, however long, not
just at snapshot time. 🚨 **RULE: any prune/cleanup step that runs concurrently with a render
queue must check "is this currently a live job" against the daemon's own state, not just
title-match against on-disk output — title-matching alone is destructive.** Disk hit 3.1GB free
at one point tonight; the v2 monitor frees space per-completed-job as it goes.

## 4. Publishing videos into the curriculum library

**New script `scripts/curriculum/publish-videos.mjs`** (mirrors `upload-songs.mjs` +
`set-audio-urls.mjs` for audio, `publish-images.mjs` for images). Matches rendered folders
(`~/Desktop/Music Videos/WNN <Title>[ (sound|word)]/`) to spec songs by normalized-title +
role-tag two-pass matching (same approach that already solved phonetic-respelled filenames in
`build-capcut-packages.py`). Uploads qualifying `.mp4`s to `montree-media/curriculum-videos/
wNN-<role>.mp4` and stamps `songs[i].videoUrl` (same absolute `montree.xyz` proxy URL shape as
`audioUrl`) into the week's spec JSON. Idempotent (skip-if-same-size unless `--force`), retries
uploads 3x with backoff (uploads are known to flake), and the stamp phase re-lists the ACTUAL
bucket contents rather than trusting the local match set, so a spec is only ever written when a
real uploaded video exists for it.

**🚨 Quality gate: only publishes videos whose `shot_report.json` summary carries
`"timing_source": "align"`.** Anything with no shot_report, or `timing_source !== "align"`
(older/stale/pre-formula renders), is skipped and listed — never published. A song whose
`gates.pass.all` is false (e.g. W09-sound's energy-gate failure) still passes the
`timing_source` gate and IS published, but is flagged `⚑ energy gate failed` in the run output
so it can be reviewed later without blocking the batch.

**Run tonight (before the full fleet, on the already-certified batch): 33 videos published,
684.5MB, all 200/206 on their proxy URLs.** W01–W18 qualifying songs. **Stale-title exclusions
worked as designed** — W02-word, W11-word, W22-word, W56-word were correctly held back (their
on-disk renders at publish time were the OLD pre-formula/killed-by-prune versions sharing a
folder name with fresh in-flight jobs) and will need a **re-publish pass once their fresh
renders from tonight's fleet land** — run `publish-videos.mjs --all` again after the fleet
drains; it will pick them up automatically once their new shot_report.json shows
`timing_source: "align"`.

## 5. Other work tonight

- **Week 1 /a/ vocabulary gap fixed.** The print nomenclature materials (three-part cards,
  matching sheets, dictionary journal) only pulled vocabulary that appeared in the W01 book
  text — so **apple** was the *only* /a/ word actually illustrated in printables, even though
  the sound basket lists 8 (`ant, ax, alligator, astronaut, ambulance, anchor, abacus,
  acrobat`). Fixed: all 8 wired into `cards`/`matching`/`dictionary` `usedBy` arrays in
  `week-01.json` (images for all 8 already existed — `ax.png` was a total orphan asset never
  referenced anywhere). Validator re-run: **58/58 exit 0.** W01 pack re-rendered (11 PDFs),
  images republished, URLs verified 200.
- **Studio missing-pictures root cause (earlier tonight, before the timing saga):** the Jul-15
  Studio image work was sitting unpushed AND had a real bug — the Studio page only read the
  CURRENT week's `imageUrls`, but reused cast images (e.g. a character debuting in one week and
  reappearing in a later week's art) live under their DEBUT week's folder. Added a prior-week
  fallback lookup in `app/montree/library/curriculum-studio/page.tsx` → **1,185/1,185 image
  coverage across all 58 weeks.** **This IS already committed and pushed** — commit `a28e1ef5`
  "Curriculum Studio: published image URLs + prior-week asset fallback + flashcards" is an
  ancestor of the current `origin/main` HEAD (`9b6a09c8`) as of this write-up. Nothing owed here
  beyond a spot-check that the players actually render on a live page load.
- **CapCut packages built as an earlier fallback** (before the forced-alignment breakthrough
  made native mvgen rendering trustworthy again): `~/Desktop/Music Videos/_capcut_packages/`,
  115 packages (images + mp3 + lyrics + forced-align SRT, APFS clones, ~1GB total). Kept on disk
  as a manual-editing fallback; not part of the automated pipeline.
- **W02 table.png was a stray STOOL image** (no manifest entry, wrong subject) — replaced with
  W01's real table asset; the stool archived to `_replaced_video_audit/Week 02/`.
- **W03 Sejeena/Segina alias added** — `scripts/mvgen/curriculum-video-aliases.json` week `"03"`
  now maps `segina-on-mat.png` → `sejeena-on-mat.png` (same root cause as the prior W26/W58
  fix: the word song sings the phonetic "Sejeena" but the asset filename uses the print spelling
  "Segina", so the matcher's first-token rule could never anchor it without the alias).

## 6. Morning PUSH LIST (Tredoux, via Desktop Commander)

Nothing was committed tonight per the sacred-flow rule (Opus builds NOT committed until
Tredoux's ear/eyes confirm). Scoped push — **do not `git add -A`**, the working tree also carries
unrelated pre-existing dirt (outreach CSVs, lyf-coach files, resume/social kit zips, `.diag.mjs`,
`social/`, `verify_seed_tmp*.mjs`, `tsc-docs.tmp.json`) that is NOT part of this session:

```bash
cd ~/Desktop/Master\ Brain/ACTIVE/montree

# mvgen engine: forced alignment + tests
git add scripts/mvgen/analyze.py scripts/mvgen/align_worker.py \
        scripts/mvgen/shotlist.py scripts/mvgen/engine_slideshow.py \
        scripts/mvgen/mvgen.py scripts/mvgen/server.py \
        scripts/mvgen/test_mvgen_fixes.py scripts/mvgen/test_shotlist_matching.py \
        scripts/mvgen/curriculum-batch.py

# aliases (W03 Sejeena fix)
git add scripts/mvgen/curriculum-video-aliases.json

# curriculum publishing + coverage tooling
git add scripts/curriculum/publish-videos.mjs scripts/curriculum/build-capcut-packages.py \
        scripts/curriculum/audit-video-coverage.py scripts/curriculum/build-week.mjs \
        scripts/curriculum/verify-alias-pass-jul15.py scripts/curriculum/make-thumbnails.py

# spec content fixes (W01 /a/ vocab + any videoUrl stamps written by tonight's publish run)
git add lib/montree/english-curriculum/spec/week-*.json

# docs
git add docs/handoffs/PLAN_FORCED_ALIGN_JUL15.md \
        docs/handoffs/SESSION_FORCED_ALIGN_FLEET_JUL15.md \
        docs/handoffs/HANDOFF_CHAPTER_CLOSE_JUL15.md \
        docs/handoffs/SESSION_STUDIO_FLASHCARDS_JUL15.md \
        docs/curriculum/SOUNDSONG_TIMING_FIX_JUL15.md \
        docs/curriculum/VIDEO_COVERAGE_AUDIT_JUL14.md docs/curriculum/video-coverage-audit-jul14.json \
        docs/curriculum/AUDIT_MATERIALS_JUL15_files.md docs/curriculum/AUDIT_MATERIALS_JUL15_specs.md \
        docs/curriculum/STORY_ARC_READ_JUL15.md docs/curriculum/MJ_GENERATION_RUN_JUL14.md \
        docs/curriculum/SECTION1_VERIFY_JUL15.md docs/curriculum/WORDSONG_BATCH_JUL15.md \
        docs/curriculum/video-audit/

git commit -m "mvgen: forced-alignment primary timing path (stable-ts DTW) + video publish pipeline + W01 /a/ vocab fix"
git push origin main
```

**Verify BEFORE running the commit above** that `app/montree/library/curriculum-studio/page.tsx`
(the prior-week fallback fix) really is already pushed — it should be, per §5, but a fresh
`git status --short app/montree/library/curriculum-studio` should come back clean. If it shows
modifications, add it to the commit too.

**Leave alone / do not commit:** `.diag.mjs`, `Montree Kit*/`, `Montree-*-Kit.zip`,
`Tredoux_Willemse_Resume.pdf`, `coach_uploads.patch`, `docs/outreach/*` CSVs, `lyf-coach-*.md`,
`docs/photo-id/`, `migrations/294_outreach_v2_segments.sql`, `resume-branding-kit/`, `social/`,
`scripts/outreach-import-v2.mjs`, `scripts/_debug-outreach-tmp.mjs`, `tsc-docs.tmp.json`,
`verify_seed_tmp*.mjs`, `scripts/__pycache__/`, `scripts/curriculum/__pycache__/` — all
pre-existing dirt from other threads of work, not tonight's session.

## 7. Resume prompt

> Read `docs/handoffs/SESSION_FORCED_ALIGN_FLEET_JUL15.md` first. Check fleet completion per §3
> (`tail /tmp/fleet_monitor_jul15c.log`, grep for `FLEET_DRAINED`/`PUBLISH_TRIGGERED`, check
> `/tmp/publish_videos.log`). If the fleet finished, run `publish-videos.mjs --all` once more to
> pick up the 4 stale-title wordsongs (W02/W11/W22/W56-word) that were held back tonight, then
> spot-check several weeks' video players in Curriculum Studio. Surface W09-sound (energy gate
> failed, script mode) to Tredoux for a personal listen/watch before treating it as certified —
> re-render candidate if he rejects it (more distinct vocab in the mix, or accept as-is). Once
> the fleet + republish are both clean, run `scripts/curriculum/audit-video-coverage.py` for
> final numbers and push per §6. 🚨 Standing order still in force from earlier tonight/pt3: no
> further BULK renders without an explicit fresh go from Tredoux — the fleet launch tonight was
> already the "go," this note is for whatever comes after it.
