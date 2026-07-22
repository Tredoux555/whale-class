# Montage Feature — Phases 1–3 Build Spec (Handoff)

*Handoff from the planning/proof session, July 22, 2026. Phase 0 proof was rendered from real photos and approved by Tredoux. Everything the build session needs is in this `montage-kit/` folder. Full research context: `PLAN.md`.*

**Division of labor (Tredoux's standing instruction): Opus builds, Sonnet does grunt work, the orchestrator thinks and verifies — it is not the end-to-end operator.**

---

## What exists already (do not rebuild)

- **`montage-kit/proof/`** — the working Remotion project from Phase 0. Composition (`src/Montage.tsx`), beat-snap timing logic (`src/timing.ts` — parameterized, clean seam for arbitrary photo counts/dates), brand title/end cards, baked grade overlay (`public/overlay.png`), Lora font. This is the starting point for the production composition, not a sketch.
- **`montage-kit/music/`** — 6 loudness-normalized (−18 LUFS) Suno tracks with precomputed beat grids (`<slug>.beats.json`: bpm, beat + downbeat timestamps, duration). `manifest.json` has stability verdicts. **No audio analysis ever happens at render time** — the worker picks a track, reads its beats.json, snaps cuts to downbeats. Two slots (naptime, warm-acoustic) are unfilled pending better takes; `tender-strings` is flagged borderline-rubato — prefer the other 5 for defaults.
- **Weekly Wrap already curates.** Teacher-selected photos per child per report live in `montree_report_media` (junction). Photos in `montree_media` (bucket `montree-media`, full path in `storage_path`), portrait 1080×1920 typical. Filter: `teacher_confirmed=true AND parent_visible=true AND media_type='photo'`.

## Phase 0 hard-won lessons (bake these in, they cost a day to learn)

1. **Chromium**: Remotion needs `Config.setChromeMode('chrome-for-testing')` with an explicit `--browser-executable`; old-headless mode fails on modern Chrome. In the production Docker image, install chrome-headless-shell or chromium and pin the path.
2. **Never use Remotion's in-process final encode** — it hung once at the audio-mix stage. Render an **image sequence** (`--sequence`), then encode + mux with ffmpeg (libx264 CRF 18→23, `+faststart`, yuv420p). Also makes failed jobs resumable/inspectable.
3. **No live CSS grading** — `mix-blend-mode` + per-frame gradients cut render speed 5× under software rasterization and caused the hang. The grade/vignette is a single pre-baked PNG overlay (`public/overlay.png`). Keep it that way.
4. **Fonts self-hosted** (`public/Lora.ttf`, registered via FontFace + delayRender *inside a component*, not module level). `@remotion/google-fonts` fetches gstatic at render time — banned.
5. **Perf measured**: 1521 frames (50s @30fps 1080×1920) = ~6.5 min on 2 vCPU, ~1.4 GB peak. **Provision the worker at 4 vCPU / 4 GB.** CPU-bound, scales ~linearly with cores.
6. **Ken Burns invariant**: min scale 1.10 with ≤1.5% pan magnitude so no photo edge is ever revealed; object-fit cover handles non-1080×1920 inputs.

## Phase 1 — Render worker service (Opus)

New top-level dir `montage-worker/` (own package.json, own Dockerfile) deployed as a **separate Railway service** in the same project (Tredoux creates the service + sets root directory in the Railway dashboard; env: `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`).

- **Queue = Postgres table** `montree_montage_jobs` (migration in the main app's `migrations/`): id, report_id FK, child_id, school_id, classroom_id, status (`queued|rendering|done|failed`), attempts, error, output_path, duration_seconds, created_at, started_at, finished_at. Worker polls with `FOR UPDATE SKIP LOCKED`, one job at a time, per-job timeout ~20 min, max 2 retries, exponential backoff.
- Job steps: fetch report's media rows via `montree_report_media` → download originals from `montree-media` → hygiene pass with sharp (EXIF auto-rotate; blur gate via variance-of-Laplacian, drop worst if >12 photos; perceptual-hash near-dupe collapse) → chronological order by `captured_at` → pick music track (rotate by week number so consecutive weeks differ; skip flagged tracks) → build props JSON → Remotion sequence render → ffmpeg encode → upload MP4 to `montree-media` at `<school_id>/<child_id>/montages/<report_id>.mp4` → update job row + `montree_reports.montage_path` (add column).
- Music assets ship in the worker image (copy `montage-kit/music/` in at build) — no runtime fetches.

## Phase 2 — Production composition (Opus, port from proof)

- Parameterize: child name, date-range subtitle ("Week of …" from report dates), photo list w/ per-photo captured_at, track slug + beats.json, photo count → duration (12–20 photos ≈ 40–60s; fewer photos = longer per-photo dwell, never <8 photos → skip render, mark job `skipped_insufficient_photos`).
- Keep: beat-snapped downbeat cuts, varied Ken Burns directions, eased curves, baked overlay grade, brand title card (name in Lora, forest #0a1a0f, gold), gold-M end card "Made with Montree".
- i18n note: child names may be Chinese characters — Lora lacks CJK glyphs. Add a Noto Serif SC fallback ttf in public/ and a font-stack check (this is Whale Class Beijing reality, not an edge case).

## Phase 3 — Integration (Opus in main app, Sonnet for the fiddly bits)

- **Trigger**: on report publish (the send route that writes final report from `montree_report_media`), INSERT a montage job if: school feature flag on (`montree_schools.montage_enabled` boolean, default false — migration) AND ≥8 eligible photos. Render failure must NEVER block or degrade report delivery — the video is an enhancement that appears when ready.
- **Parent surface**: on `/montree/parent/report/[reportId]`, if `montage_path` set, video player pinned at top (poster = first photo, `playsInline`, served via the existing media proxy — **add the montages path/bucket to the proxy allowlist**; remember the dark-phonics 502).
- **Push on completion**: reuse `lib/montree/push/sender.ts` — second notification when montage lands ("✨ Austin's week in film is ready") only if it finishes after the report-published push; if it renders fast, one combined notification.
- **Teacher controls**: in Weekly Wrap parents view — regenerate button (re-queues), and a preview before publish is v2, not v1.
- **Test child for all dev/E2E renders: Austin** — child_id `31e380ed-de39-41eb-acbe-6cec3452024f`, classroom `51e7adb6-cd18-4e03-b707-eceb0a1d2e69`, 39 confirmed parent-visible photos. (Phase 0 used Yo-yo; Tredoux asked that subsequent tests use Austin.)

## Verification gates (orchestrator enforces before "done")

1. Worker renders Austin's montage end-to-end from a real (staging-flagged) job row; ffprobe-verified; frames eyeballed.
2. Kill-test: worker killed mid-render → job retries cleanly, no orphan temp files, no corrupted upload.
3. Report publish with flag OFF → zero montage side effects. Flag ON + 5 photos → skipped gracefully, report unaffected.
4. Proxy serves the MP4 to a logged-in parent session; range requests work (video scrubbing).
5. `parent_visible=false` photos can never appear in a montage (assert in the media query + a test).

## Open items for Tredoux

- Create the Railway worker service (dashboard) when Phase 1 lands.
- Two music slots to refill in Suno when convenient (naptime ~68 BPM steady, warm-acoustic ~84 BPM steady — steadier takes, avoid rubato); drop MP3s in Downloads and any session can beat-map them with the scripts in `montage-kit/music/`.
- Decide default-on vs default-off per school at launch (spec assumes default-off, enable per school).
