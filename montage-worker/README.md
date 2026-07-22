# Montree Montage Worker

Standalone render service for Montree's weekly per-child montage videos. Polls
a Postgres queue, pulls a report's teacher-selected photos, runs a hygiene pass,
renders a beat-synced Remotion composition to an image sequence, muxes to MP4
with ffmpeg, and uploads to Supabase storage.

Deployed as its **own Railway service** in the Montree project (not inside the
Next.js app — a Sunday batch of renders must never starve web requests).

- **1080×1920 portrait**, ~35–60s, H.264/AAC, `+faststart`.
- **$0/render at runtime** — the music library ships with precomputed beat
  grids; no audio analysis ever happens in the hot path.
- One job at a time, `FOR UPDATE SKIP LOCKED`, 20-min per-job timeout, 3 attempts
  with exponential backoff, self-healing stale-job recovery.

---

## Architecture (Phase 0 lessons baked in)

1. **Chromium**: Remotion runs in `chrome-for-testing` mode with an explicit
   browser executable (old-headless fails on modern Chrome). The Docker image
   installs system Chromium and sets `REMOTION_BROWSER_EXECUTABLE=/usr/bin/chromium`.
2. **Never Remotion's in-process encode** (it hung at audio-mix). We `renderFrames`
   a JPEG sequence, then encode + mux with ffmpeg — inspectable and reliable.
3. **No live CSS grading**. The warm grade/vignette is a single pre-baked PNG
   overlay (`remotion/public/overlay.png`) rendered as a plain `<Img>`.
4. **Fonts self-hosted** (`Lora.ttf` + `NotoSerifSC-Regular.otf`), registered via
   `FontFace` + `delayRender` inside the component. `@remotion/google-fonts` is
   banned (fetches gstatic at render time).
5. **Perf**: ~1500 frames (50s @30fps) ≈ 6.5 min on 2 vCPU, ~1.4 GB peak.
   **Provision 4 vCPU / 4 GB.**
6. **Ken Burns edge-safety**: scale ∈ [1.10, 1.22]; pan is hard-capped at 60% of
   the exact edge-safe bound `(S−1)/(2S)` at the minimum scale, so no photo edge
   is EVER revealed. (The build spec's stated bound `(S−1)/2` is looser and
   actually reveals edges — we use the correct stricter one; see `remotion/src/timing.ts`.)

---

## Modes

```bash
npm start                 # poll loop — claim + render forever (default)
npm run once              # process at most one job, then exit 0
npm run plan -- <jobId>   # dry-run: hygiene decisions + chosen track, no render
npm run typecheck         # tsc --noEmit (worker + composition)
npm run studio            # open Remotion Studio to preview the composition
```

`--plan <jobId>` downloads the report's photos and runs the real hygiene pass,
printing a per-photo keep/drop table (with reasons) and the track that would be
chosen — but renders nothing and touches no job status. Use it to sanity-check a
job before spending a render.

---

## Environment variables

| Var | Required | Default | Purpose |
|-----|----------|---------|---------|
| `DATABASE_URL` | **yes** | — | Postgres queue + report/media reads (Supabase pooler). |
| `SUPABASE_SERVICE_ROLE_KEY` | for render | — | Storage download/upload. |
| `NEXT_PUBLIC_SUPABASE_URL` | for render | — | Supabase project URL. |
| `MAIN_APP_URL` | no | `https://montree.xyz` | Base for the completion callback. |
| `MONTAGE_WORKER_SECRET` | no | — | If set, POSTs `/api/montree/internal/montage-complete` with `x-worker-secret`. Unset → no callback. |
| `REMOTION_BROWSER_EXECUTABLE` | no | (Remotion-managed) | Chromium path. The Docker image sets `/usr/bin/chromium`. |
| `POLL_INTERVAL_MS` | no | `15000` | Idle poll interval. |
| `RENDER_CONCURRENCY` | no | `2` | Remotion frame concurrency (raise to ~vCPU count). |
| `MONTAGE_MEDIA_BUCKET` | no | `montree-media` | Storage bucket for photos + montages. |
| `JOB_TIMEOUT_MS` | no | `1200000` | Per-job hard timeout (20 min). |
| `MONTAGE_MAX_ATTEMPTS` | no | `3` | Attempts before permanent failure. |
| `MONTAGE_STALE_MINUTES` | no | `25` | Rendering rows older than this are recovered. |

Staging jobs (`is_staging=true`) skip the completion callback so dev/E2E renders
don't fire parent push notifications.

---

## Asset preparation (run on the Mac before build/commit)

Binary assets are **not** in git. From inside `montage-worker/`:

```bash
bash scripts/prepare-assets.sh
```

This copies the approved Phase-0 assets and the beat-mapped music library out of
`../montage-kit/`, and downloads the CJK fallback font:

- `remotion/public/{overlay.png, Lora.ttf, logo.png}` ← `../montage-kit/proof/public/`
- `assets/music/<slug>.mp3` + `<slug>.beats.json` ← `../montage-kit/music/`
- `remotion/public/NotoSerifSC-Regular.otf` ← notofonts CDN (subset OTF, ~11.6 MB;
  URL verified reachable 2026-07-22:
  `https://raw.githubusercontent.com/notofonts/noto-cjk/main/Serif/SubsetOTF/SC/NotoSerifSC-Regular.otf`)

Set `MONTAGE_KIT=/path/to/montage-kit` if the kit isn't at `../montage-kit`.

The worker **hard-fails at boot** if any usable track's `.mp3`/`.beats.json` is
missing, so a bad asset prep can't silently ship.

---

## Music

Five usable tracks rotate by ISO week of the report's `week_start` (consecutive
weeks differ): `flagship-felt-piano`, `bright-week`, `morning-light`, `term-end`,
`wildcard-warmth`. `tender-strings` (borderline rubato) and the two unfilled
slots (naptime, warm-acoustic) are excluded. Refill those in Suno and beat-map
them; add the slug to `USABLE_SLUGS` in `src/music.ts`.

---

## Railway setup

1. New service in the Montree project, **root directory = `montage-worker`**.
2. **4 vCPU / 4 GB.**
3. Env: `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
   and (optionally) `MONTAGE_WORKER_SECRET`, `RENDER_CONCURRENCY=4`.
4. Build uses the `Dockerfile` (installs Chromium + ffmpeg). Run
   `scripts/prepare-assets.sh` and commit the assets **before** the first build.

---

## Hygiene pass

The curated photo set is read from the report's `montree_weekly_reports.content->'photos'`
jsonb array (each entry `{ id, url, caption, work_name, captured_at }`), joined to
`montree_media` by `id` — the `montree_report_media` junction is dead for parent
reports. Malformed/duplicate ids are filtered; the **original** `storage_path` is
used (never `cropped_storage_path`) so Ken Burns has the full frame.

1. EXIF auto-rotate (`sharp.rotate()`).
2. Perceptual near-dupe collapse (dHash, hamming ≤ 6 keeps the sharper shot).
3. Blur gate (variance of the Laplacian): drops only clearly-soft outliers, and
   never below 12 surviving photos.
4. `< 8` photos → job `skipped_insufficient_photos` (never `failed`; the report is
   unaffected). `> 20` → keep the 20 best-spread chronologically (never the first
   or last).
5. `parent_visible=true` is filtered in SQL **and** re-asserted in code before any
   download — a non-parent-visible photo can never enter a montage.

---

## Storage layout

Montages upload to `montree-media` at
`<school_id>/<child_id>/montages/<report_id>.mp4` (upsert), then
`montree_weekly_reports.montage_path` is stamped. Add this path to the media
proxy allowlist on the app side (Phase 3) — remember the dark-phonics 502.
