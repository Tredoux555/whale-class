# Potato Snaps Montage Worker

Standalone render service for Potato Snaps' weekly films. Polls a Postgres
queue (`tp_montage_jobs`), pulls the job's teacher-curated photo set from
`tp_photos`, runs a hygiene pass, renders a beat-synced Remotion composition to
an image sequence, muxes to MP4 with ffmpeg, uploads to the private
`potato-snaps` bucket, and stamps the job row.

**v1.1 renders two kinds of film** (`tp_montage_jobs.kind`):

| | `kind='child'` | `kind='class'` |
|---|---|---|
| Subject | one child's week | the whole class's week |
| `child_id` | required | **NULL** |
| Photos | <= 20 after hygiene | 8..40, teacher-curated |
| Hygiene | blur gate + near-dupe collapse | **curated** — nothing is dropped |
| Length | ~50s | ~1m50s – 2m30s |
| Timeout | `JOB_TIMEOUT_MS` (20 min) | `CLASS_JOB_TIMEOUT_MS` (45 min) |
| Output | `class/<classId>/montages/<childId>/<weekStart>-<jobId>.mp4` | `class/<classId>/montages/class/<weekStart>-<jobId>.mp4` |

Both end on the same **branded end card** (design tab 09).

Forked from Montree's `montage-worker/` — the render pipeline, hygiene pass,
music system and queue machinery are unchanged. **This service reads and writes
`tp_*` tables ONLY. It never touches a `montree_*` table.**

- **1080×1920 portrait**, H.264/AAC, `+faststart`.
- **$0/render at runtime** — the music library ships with precomputed beat
  grids; no audio analysis ever happens in the hot path.
- One job at a time, `FOR UPDATE SKIP LOCKED`, per-job timeout, 3 attempts,
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
| Composition branding | dark forest + gold, "Made with Montree" | cream + honey/baby blue, white-label school end card |
| Job kinds | report / classroom / child / event scopes | `child` + `class` |

`remotion/remotion.config.ts` and `tsconfig.json` are still byte-identical to
the montage-worker original. `hygiene.ts` and `remotion/src/timing.ts` gained
v1.1 options but are **verified bit-identical for every v1.0 input** (see
"Regression guarantees" below).

---

## Architecture (lessons kept, do not undo)

1. **Chromium**: Remotion runs in `chrome-for-testing` mode with an explicit
   browser executable (old-headless fails on modern Chrome). The Docker image
   installs system Chromium and sets `REMOTION_BROWSER_EXECUTABLE=/usr/bin/chromium`.
2. **Never Remotion's in-process encode** (it hung at audio-mix). We `renderFrames`
   a JPEG sequence, then encode + mux with ffmpeg.
3. **Bundle staleness**: `bundle()` snapshots `remotion/public` ONCE per process,
   and the bundle is cached for the process lifetime. `syncJobAssetsIntoBundle()`
   rewrites `<bundle>/public/photos/job/` **and** `<bundle>/public/branding/job/`
   before **every** render. Remove it and job #2 onward silently renders job #1's
   photos — and, since v1.1, job #1's school logo on another school's film.
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
| `JOB_TIMEOUT_MS` | no | `1200000` | Per-job hard timeout for a CHILD film (20 min). |
| `CLASS_JOB_TIMEOUT_MS` | no | `2700000` | Per-job hard timeout for a CLASS film (45 min) — 3300–4450 frames vs a child film's ~1500. |
| `POTATO_MAX_ATTEMPTS` | no | `3` | Attempts before permanent failure. |
| `POTATO_STALE_MINUTES` | no | `60` | `processing` rows older than this are recovered. 🚨 **Must exceed the largest job timeout** or the sweep re-queues class films that are merely slow; the worker warns at boot if it doesn't. |
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
CHILD film — teacher taps "Make film" on a child (bar >= 8)
  -> POST /api/potato/montage derives media_ids SERVER-side, inserts 'queued'
CLASS film — teacher curates the week in the class-film picker
  -> POST /api/potato/class-film validates class + week window + 8..40 +
     per-child coverage, inserts kind='class', child_id NULL

  -> worker claims it (FOR UPDATE SKIP LOCKED) -> 'processing', attempt+1
  -> reads tp_classes (SELECT *) for the class name + white-label branding,
     downloads any school logo / class emblem into remotion/public/branding/job
  -> re-verifies media_ids against tp_photos + class_id
       child: < 4 survive   -> 'failed' + a plain-English error (graceful skip)
       class: < 8 survive   -> 'failed' + a plain-English error
  -> download -> hygiene   child: blur / near-dupe / cap 20
                           class: CURATED — normalize only, cap 40
  -> render -> ffmpeg -> upload
  -> 'done' + storage_path
       child: class/<classId>/montages/<childId>/<weekStart>-<jobId>.mp4
       class: class/<classId>/montages/class/<weekStart>-<jobId>.mp4
```

The two paths can never collide: the child slot always holds a uuid, so the
literal `class` segment is unambiguously the class film.

A crash mid-render leaves a `processing` row; the next poll's stale sweep
requeues it (or fails it once `attempt >= POTATO_MAX_ATTEMPTS`). Re-runs are
allowed — each tap is a new row, and the parent feed shows the latest `done`
job for the week.

---

## Railway setup

1. New service in the same Railway project, **root directory = `potato-worker`**.
2. **4 vCPU / 4 GB.**
3. Env: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   (+ optionally `RENDER_CONCURRENCY=4`). v1.1 adds `CLASS_JOB_TIMEOUT_MS` and
   raises the `POTATO_STALE_MINUTES` default to 60 — both have safe defaults, so
   no Railway variable change is required.
4. Build uses the `Dockerfile` (installs Chromium + ffmpeg). Run
   `scripts/prepare-assets.sh` and commit the assets **before** the first build.


---

## v1.1 — the branded end card (design tab 09)

> "The last three seconds of every film. This is the frame a parent
> screenshots — so the school owns it."

Both kinds of film end on the same white-label lockup, laid out inside a **16:9
share-safe box** centred in the 9:16 frame so a parent cropping for a group chat
still crops the school. Order is a system law: **school first, class second,
Potato Snaps last.**

- **School mark** — `tp_classes.school_logo_path`, downloaded per job and
  contained (never cropped: school logos are often wide wordmarks) into a
  rounded square. No logo → **initials in a circle** on sky wash, same size and
  weight, so the layout does not shift when HQ finally uploads. Never a potato.
- **School name** — `tp_classes.school_name`, display 800. Steps down 72 → 58 →
  47px for long names; the box also clips, so rule #2 cannot be violated.
  No school name set → the class name is promoted into this slot and the class
  row drops its now-duplicate text.
- **Honey rule**, then **class emblem** (`tp_classes.emblem_path`, circular,
  centre-cropped like a child's face) **+ class name**.
- **Week label** — `WEEK OF SEP 7–11`, derived from `week_start` (Mon–Fri),
  handling month boundaries (`WEEK OF SEP 28–OCT 2`).
- **`made with Potato Snaps`** at 9px/ink-35 — the only mention of the product.

All measurements are the design spec's values × `1080/300`. Every branding image
is optional at every level: missing column, empty path, 404, corrupt file — each
degrades to the initials mark or simply omits the emblem. **A branding failure
can never fail a film.**

---

## v1.1 — pre-migration safety

This build may run against a database that has **not yet had the v1.1
migration** (Railway restarts on deploy, and the worker ships before/alongside
the app). Every v1.1 column is therefore read through a star:

- `claimNextJob()` keeps `RETURNING *` → `kind` and `excused_child_ids` are
  simply `undefined` on an old schema.
- `getClassRow()` uses `SELECT *` → `school_name`, `school_logo_path` and
  `emblem_path` are `undefined` on an old schema.
- `jobKind()` maps `undefined`/`null`/anything-unknown → `'child'`.

Net effect: **on an un-migrated database this worker behaves exactly like
v1.0** — no 42703, no crash-loop. It renders child films with an end card that
falls back to the class name + initials mark.

**Deploy order:** worker v1.1 → migration → app v1.1. The worker is safe before
the migration; the reverse is not true, because a v1.0 worker that claims a
`kind='class'` job would read `child_id = NULL` as a child film.

---

## Regression guarantees (v1.0 → v1.1)

Both shared modules were restructured, so both are pinned by an A/B harness
against the v1.0 originals:

- `remotion/src/timing.ts` — 105 cases (5 tracks × 0–20 photos): **bit-identical
  timelines**. The duration bounds only diverge above `LONG_FORM_THRESHOLD` (20).
- `src/hygiene.ts` — default options across 8/12/18/24/33 photos: **bit-identical
  photos and decisions**. Curated mode is opt-in per job.

A child film rendered by v1.1 is frame-for-frame the v1.0 film, apart from the
end card.

### Music grid capacity

A class film gives every photo its own downbeat, so a track whose grid is
shorter than the photo count would collapse the tail cuts to zero length —
silently dropping the last photos, and with them a child from a film that
promises "everyone is in this one". `validateMusicAssets()` now **hard-fails at
boot** if any usable track cannot carry `MAX_CLASS_PHOTOS`:

| track | downbeats | capacity | 40-photo length |
|---|---|---|---|
| flagship-felt-piano | 74 | 71 | 2m11s |
| bright-week | 50 | 47 | 1m50s |
| morning-light | 83 | 80 | 1m53s |
| term-end | 64 | 61 | 2m28s |
| wildcard-warmth | 104 | 101 | 2m8s |

Length varies with which track the ISO-week rotation picks — that is inherent to
beat-snapped cutting and a slow track (term-end, 68 bpm) simply yields a longer
film.
