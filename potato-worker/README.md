# Potato Snaps Montage Worker

Standalone render service for Potato Snaps' per-child weekly montage videos.
Polls a Postgres queue (`tp_montage_jobs`), pulls the job's teacher-curated
photo set from `tp_photos`, runs a hygiene pass, renders a beat-synced Remotion
composition to an image sequence, muxes to MP4 with ffmpeg, uploads to the
private `potato-snaps` bucket, and stamps the job row.

Forked from Montree's `montage-worker/` — the render pipeline, hygiene pass,
music system and queue machinery are unchanged. **This service reads and writes
`tp_*` tables ONLY. It never touches a `montree_*` table.**

- **1080×1920 portrait**, ~35–60s, H.264/AAC, `+faststart`.
- **$0/render at runtime** — the music library ships with precomputed beat
  grids; no audio analysis ever happens in the hot path.
- One job at a time, `FOR UPDATE SKIP LOCKED`, 20-min per-job timeout, 3 attempts,
  self-healing stale-job recovery.

---

## What is different from montage-worker

| | montage-worker | potato-worker |
|---|---|---|
| Queue table | `montree_montage_jobs` | `tp_montage_jobs` |
| Photo sources | 3 branches (report JSONB / scope query / explicit `media_ids`) | **1**: `media_ids` → `tp_photos` |
| `parent_visible` gate | enforced 4× | **no such concept** — deleting a photo before the montage IS the curation |
| `teacher_confirmed` gate | usually required | **none** — zero AI in this product |
| Status enum | `queued/rendering/done/failed/skipped_insufficient_photos` | `queued/processing/done/failed` |
| Attempt column | `attempts` + `next_attempt_at` backoff | `attempt`; spacing comes from one poll-interval sleep after a requeue |
| Finished column | `finished_at` | `completed_at` |
| Output pointer | `output_path` + a report row to stamp | `storage_path` on the job row (the only pointer) |
| Completion callback | POSTs the main app with `x-worker-secret`, drives a parent push | **removed** — the job row is the whole signal |
| Bucket | `montree-media` | `potato-snaps` (private) |
| Composition branding | dark forest + gold, "Made with Montree" | cream + honey/baby blue, "Made with Potato Snaps" |

Everything else — `render.ts`, `hygiene.ts`, `music.ts`, `remotion/src/timing.ts`,
`remotion/remotion.config.ts`, `tsconfig.json` — is byte-identical to the
montage-worker original.

---

## Architecture (lessons kept, do not undo)

1. **Chromium**: Remotion runs in `chrome-for-testing` mode with an explicit
   browser executable (old-headless fails on modern Chrome). The Docker image
   installs system Chromium and sets `REMOTION_BROWSER_EXECUTABLE=/usr/bin/chromium`.
2. **Never Remotion's in-process encode** (it hung at audio-mix). We `renderFrames`
   a JPEG sequence, then encode + mux with ffmpeg.
3. **Bundle staleness**: `bundle()` snapshots `remotion/public` ONCE per process,
   and the bundle is cached for the process lifetime. `syncJobPhotosIntoBundle()`
   rewrites `<bundle>/public/photos/job/` before **every** render. Remove it and
   job #2 onward silently renders job #1's photos.
4. **Concurrency leaves one core free** (`cpus - 1`) — on a 2-vCPU box a full-core
   concurrency starved the main thread and stalled the render after frames.
5. **`RETURNING *` on the claim** (never an explicit column list) so a schema
   that has drifted a column can't 42703 the worker.
6. **pg date type parsers are overridden** so `week_start` stays the raw
   `'YYYY-MM-DD'` string — it goes straight into the storage path and must not
   drift a day through a Date round-trip.
7. **Health stub**: the repo-root `railway.json` healthcheck (`/api/health`) is
   inherited by every service in the project, so `scripts/health-server.mjs`
   answers it from the container's `sh -c` start command. Without it Railway
   restart-loops a perfectly healthy worker.

---

## Modes

```bash
npm start                 # poll loop — claim + render forever (default)
npm run once              # process at most one job, then exit 0
npm run plan -- <jobId>   # dry-run: hygiene decisions + chosen track, no render
npm run typecheck         # tsc --noEmit (worker + composition)
npm run studio            # open Remotion Studio to preview the composition
```

---

## Environment variables

| Var | Required | Default | Purpose |
|-----|----------|---------|---------|
| `DATABASE_URL` | **yes** | — | Postgres queue + `tp_photos`/`tp_children` reads (Supabase pooler). |
| `SUPABASE_URL` | for render | — | Supabase project URL (`NEXT_PUBLIC_SUPABASE_URL` also accepted). |
| `SUPABASE_SERVICE_ROLE_KEY` | for render | — | Storage download/upload on the private bucket. |
| `REMOTION_BROWSER_EXECUTABLE` | no | (Docker sets `/usr/bin/chromium`) | Chromium path. |
| `POLL_INTERVAL_MS` | no | `15000` | Idle poll interval, and the pause after a requeued failure. |
| `RENDER_CONCURRENCY` | no | `2` | Remotion frame concurrency (raise to ~vCPU count). |
| `POTATO_MEDIA_BUCKET` | no | `potato-snaps` | Storage bucket for photos + montages. |
| `JOB_TIMEOUT_MS` | no | `1200000` | Per-job hard timeout (20 min). |
| `POTATO_MAX_ATTEMPTS` | no | `3` | Attempts before permanent failure. |
| `POTATO_STALE_MINUTES` | no | `25` | `processing` rows older than this are recovered. |
| `PORT` | no | `8080` | Railway injects this; the health stub binds it. |

There is **no** `MAIN_APP_URL` and **no** worker secret — this service makes no
outbound calls to the app.

---

## Asset preparation (run on the Mac before build/commit)

Binary assets are **not** in git. From inside `potato-worker/`:

```bash
bash scripts/prepare-assets.sh
```

- `assets/music/<slug>.mp3` ← `../montage-worker/assets/music/` (the `.beats.json`
  grids are already committed here)
- `remotion/public/overlay.png` ← `../montage-worker/remotion/public/` (optional
  warm grade)
- `remotion/public/{Baloo2.ttf, Nunito.ttf, NotoSerifSC-Regular.otf}` ← Google
  Fonts / notofonts (optional; missing faces fall back to system sans)

🚨 **Never copy Montree's `logo.png`.** The end card renders text-only when it is
absent. Drop a Potato Snaps mark in at `remotion/public/logo.png` when one exists.

The worker **hard-fails at boot** if any usable track's `.mp3`/`.beats.json` is
missing, so a bad asset prep can't silently ship.

---

## Music

Five tracks rotate by ISO week of the job's `week_start` (consecutive weeks
differ): `flagship-felt-piano`, `bright-week`, `morning-light`, `term-end`,
`wildcard-warmth`. Add a slug to `USABLE_SLUGS` in `src/music.ts` to widen the
rotation — a track needs both a `.mp3` and a beat-mapped `.beats.json`.

---

## Job lifecycle

```
teacher taps "Make montage" (bar >= 8)
  -> POST /api/potato/montage derives media_ids SERVER-side, inserts 'queued'
  -> worker claims it (FOR UPDATE SKIP LOCKED) -> 'processing', attempt+1
  -> re-verifies media_ids against tp_photos + class_id
       < 4 survive          -> 'failed' + a plain-English error (graceful skip)
  -> download -> hygiene (blur / near-dupe / cap 20)
       < 4 usable           -> 'failed' + a plain-English error
  -> render -> ffmpeg -> upload
  -> 'done' + storage_path = class/<classId>/montages/<childId>/<weekStart>-<jobId>.mp4
```

A crash mid-render leaves a `processing` row; the next poll's stale sweep
requeues it (or fails it once `attempt >= POTATO_MAX_ATTEMPTS`). Re-runs are
allowed — each tap is a new row, and the parent feed shows the latest `done`
job for the week.

---

## Railway setup

1. New service in the same Railway project, **root directory = `potato-worker`**.
2. **4 vCPU / 4 GB.**
3. Env: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   (+ optionally `RENDER_CONCURRENCY=4`).
4. Build uses the `Dockerfile` (installs Chromium + ffmpeg). Run
   `scripts/prepare-assets.sh` and commit the assets **before** the first build.
