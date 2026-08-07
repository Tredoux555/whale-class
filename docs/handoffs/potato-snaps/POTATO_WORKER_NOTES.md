# Potato Snaps — Worker build notes (Builder 2)

Built at `/home/claude/build/potato/potato-worker/` → delivers to repo-relative
`potato-worker/`. Source: `montage-worker/` (read-only staged from the Mac).

**Gates run in-container: `npm ci` OK (308 pkgs), `tsc --noEmit` exit 0, music
beat-grid load OK (5/5), ISO-week rotation OK, storage-path helper matches
contract §3 exactly, timeline math OK (8 photos → 50.34s / 1510 frames / 8
cuts), health stub returns 200 on `/api/health`.**

---

## 1. File list (28 tracked files, ~270 KB before binaries)

```
potato-worker/
  .gitignore                              verbatim
  Dockerfile                              CHANGED (CMD + comments)
  README.md                               REWRITTEN
  package.json                            CHANGED (name/description)
  package-lock.json                       COPIED, name field swapped ×2
  tsconfig.json                           verbatim
  scripts/prepare-assets.sh               REWRITTEN
  scripts/health-server.mjs               NEW
  assets/music/*.beats.json (×5)          verbatim (committed here)
  remotion/remotion.config.ts             verbatim
  remotion/public/.gitkeep                new (empty marker)
  remotion/src/index.ts                   verbatim
  remotion/src/timing.ts                  verbatim
  remotion/src/Root.tsx                   CHANGED (stub default props only)
  remotion/src/Montage.tsx                CHANGED (branding only)
  src/config.ts                           CHANGED
  src/db.ts                               REWRITTEN
  src/media.ts                            REWRITTEN (much smaller)
  src/upload.ts                           REWRITTEN (much smaller)
  src/pipeline.ts                         CHANGED (one branch)
  src/index.ts                            CHANGED (logs, plan mode, retry pause)
  src/render.ts                           verbatim
  src/hygiene.ts                          verbatim
  src/music.ts                            verbatim
  (src/callback.ts                        DELETED — no completion callback)
```

`grep -rn "montree_"` over the tree returns **only two README lines** (the
comparison table). No `montree_*` table is referenced in any code path. The only
tables touched are `tp_montage_jobs`, `tp_photos`, `tp_children`.

---

## 2. Verbatim vs changed

### Kept byte-identical (the load-bearing machinery)
- `src/render.ts` — Remotion bundle (cached per process) → `selectComposition`
  → `renderFrames` JPEG sequence → **external ffmpeg** encode/mux. Never
  Remotion's in-process encoder. Includes `syncJobPhotosIntoBundle()` (the
  bundle-staleness fix — job #2+ would otherwise render job #1's photos) and the
  `cpus - 1` concurrency clamp.
- `src/hygiene.ts` — EXIF rotate, Laplacian blur gate, dHash near-dupe collapse,
  `MAX_PHOTOS=20` even-spread cap, 1080×1920 cover normalize.
- `src/music.ts` — precomputed `beats.json`, `USABLE_SLUGS` ×5, ISO-week
  rotation, boot-time `validateMusicAssets()` hard fail.
- `remotion/src/timing.ts` — downbeat-snapped cut planner + edge-safe Ken Burns.
- `remotion/remotion.config.ts`, `remotion/src/index.ts`, `tsconfig.json`,
  `.gitignore`, the 5 `*.beats.json`.

### Rewritten — the DB layer (`src/db.ts`)
| montage-worker | potato-worker |
|---|---|
| `montree_montage_jobs` | `tp_montage_jobs` |
| status `rendering` | `processing` |
| status `skipped_insufficient_photos` | **gone** → `failed` + plain-English `error` |
| `attempts`, `finished_at`, `output_path` | `attempt`, `completed_at`, `storage_path` |
| `next_attempt_at` exponential backoff | **no such column** → spacing is one `POLL_INTERVAL_MS` sleep in `index.ts` after a requeue (prevents a tight re-claim spin) |
| 3 photo-source fns (report JSONB / scope / explicit) | **1**: `getEligiblePhotos(media_ids, class_id)` → `tp_photos` |
| `parent_visible` filtered + asserted 3–4× | concept does not exist (photo deletion IS the curation) |
| `teacher_confirmed` filter | none (zero AI in this product) |
| `getReportMeta`/`getScopedJobMeta` | `getChildName(childId, classId)` → `tp_children` |
| `setReportMontagePath`/`setJobOutputPath` | folded into `markDone` |

**Kept from the original on purpose:** `FOR UPDATE SKIP LOCKED` claim with
`RETURNING *` (never an explicit column list — forward-compat against schema
drift), the stale-`processing` sweep, and the pg type-parser override for OIDs
1082/1114/1184 (this one matters *more* here: `week_start` is a DATE that goes
straight into the storage path and must never drift a day via a Date round-trip).

**Hardening added:** `COALESCE(attempt,0)` in the claim increment and both
stale-recovery predicates, so a NULL `attempt` can't produce `NULL+1` or strand
a `processing` row forever.

### Changed — thin adapters
- `src/media.ts` — one fetch fn + `downloadPhotos`; `assertAllParentVisible`
  removed (no analogue). Bucket comes from config (`potato-snaps`).
- `src/upload.ts` — single path builder, contract §3:
  `class/<classId>/montages/<childId>/<weekStart>-<jobId>.mp4`. No second
  pointer row to stamp.
- `src/pipeline.ts` — one branch. `MIN_RENDER_PHOTOS = 4` (enqueue enforces 8;
  the worker's re-check tolerates deletions down to 4, then records `failed`
  with a teacher-readable message — both pre-download and post-hygiene). Temp
  dirs renamed `/tmp/potato-<jobId>` (the orphan sweep matches the `potato-`
  prefix, so the two workers can never wipe each other's scratch).
- `src/config.ts` — dropped `mainAppUrl` + `workerSecret`. Reads `SUPABASE_URL`
  and falls back to `NEXT_PUBLIC_SUPABASE_URL` (accepts a var copied from the
  montage-worker service). Bucket default `potato-snaps`; attempt/stale env vars
  renamed `POTATO_*`.
- `src/index.ts` — `handleOneJob` returns `'none' | 'ok' | 'retry'`; the loop
  sleeps on anything but `'ok'`. `--plan` adapted (no report/scope).

### Changed — composition branding (`remotion/src/Montage.tsx`, `Root.tsx`)
Structure, timings, Ken Burns, crossfades, `delayRender`/`continueRender` and
the optional-asset degradation are untouched. Only tokens + text changed:
dark-forest `#0a1a0f` + gold → cream `#FFFDF6`, honey `#E8A317`, butter
`#FFD466`, baby blue `#9ED2F0`, ink navy `#23395B`; font stack Lora → Baloo 2 /
Nunito (Noto Serif SC kept as CJK fallback); eyebrow `Weekly Moments` →
`Potato Snaps`; end card `Made with Montree` → `Made with Potato Snaps`.
**This was not in the brief's "keep verbatim" list — flagging it as a
judgement call.** Rationale: a Potato Snaps film that opens dark-forest green
and signs off "Made with Montree" is a defect, and contract §9 says "NOTHING
dark-forest". Reverting is a ~40-line diff in one file.

---

## 3. Binaries that could NOT be staged — exact Mac-side commands

The `.beats.json` grids (small, text) **are** committed in the build. The `.mp3`
tracks, `overlay.png` and the fonts are not. Run this on the Mac after the build
lands, **before** committing:

```bash
cd "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/potato-worker"
bash scripts/prepare-assets.sh
```

That script does everything below. Manual equivalent if the font downloads fail:

```bash
cd "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree"
mkdir -p potato-worker/assets/music potato-worker/remotion/public
cp montage-worker/assets/music/*.mp3        potato-worker/assets/music/
cp montage-worker/assets/music/*.beats.json potato-worker/assets/music/   # idempotent
cp montage-worker/remotion/public/overlay.png potato-worker/remotion/public/
# fonts (optional — missing faces fall back to system sans, render still works)
curl -fSL "https://raw.githubusercontent.com/google/fonts/main/ofl/baloo2/Baloo2%5Bwght%5D.ttf" \
  -o potato-worker/remotion/public/Baloo2.ttf
curl -fSL "https://raw.githubusercontent.com/google/fonts/main/ofl/nunito/Nunito%5Bwght%5D.ttf" \
  -o potato-worker/remotion/public/Nunito.ttf
curl -fSL "https://raw.githubusercontent.com/notofonts/noto-cjk/main/Serif/SubsetOTF/SC/NotoSerifSC-Regular.otf" \
  -o potato-worker/remotion/public/NotoSerifSC-Regular.otf
```

🚨 **Never `cp -R montage-worker/remotion/public/. potato-worker/remotion/public/`.**
That would drag in Montree's `logo.png` (the gold M) and it would render on
every Potato Snaps end card. Copy `overlay.png` by name only. With no
`logo.png` present the end card is text-only by design (`useOptionalImage`
degrades cleanly) — drop a Potato Snaps mark in at
`remotion/public/logo.png` later if wanted.

🚨 **These binaries must be `git add`-ed.** Railway builds the Docker image from
the `potato-worker` directory (`COPY . .`), so anything not committed is not in
the image and the worker hard-fails at boot on missing music. The publish
command must stage `potato-worker/assets/music/*.mp3` and
`potato-worker/remotion/public/*` explicitly. Added repo weight ≈ **41 MB**
(28 MB mp3 + 11.6 MB Noto SC + 0.6 MB overlay + 1 MB Latin fonts).
Both trims are safe if that's unwanted: drop `NotoSerifSC-Regular.otf` (only
needed for Chinese child names, −11.6 MB) and/or ship fewer tracks by shortening
`USABLE_SLUGS` in `src/music.ts` (the boot validator only checks slugs in that
list).

Font URLs were verified reachable (HTTP 200) from the container on 2026-08-07.

---

## 4. Railway service settings

1. New service in the same Railway project. **Root directory = `potato-worker`.**
2. **4 vCPU / 4 GB.** Builder: Dockerfile (auto-detected).
3. Variables:
   - `DATABASE_URL` — same Supabase pooler string as montage-worker
   - `SUPABASE_URL` — `https://dmfncjjtsoxrnvcdnvjq.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - optional: `RENDER_CONCURRENCY=4`
   - **no** worker secret, **no** `MAIN_APP_URL` (this service makes zero
     outbound calls to the app)
4. Start command: leave blank — the Dockerfile `CMD` is
   `sh -c "node scripts/health-server.mjs & exec npx tsx src/index.ts"`.

**Healthcheck:** the repo-root `railway.json` declares
`deploy.healthcheckPath = "/api/health"` and that deploy block is inherited by
every service in the project (per CLAUDE.md, the per-service Settings field
could not override it for montage-worker). Rather than depend on a UI field,
this build ships `scripts/health-server.mjs` — a zero-dep responder that binds
`$PORT` and 200s any path — backgrounded from the start command, with `exec`
handing PID 1 to the worker so SIGTERM still reaches the graceful-shutdown path.
Verified locally: `GET /api/health` → 200 `{"ok":true,"service":"potato-worker"}`.

---

## 5. Open risks / decisions for the director

1. **Composition re-branding was not explicitly authorised** (§2 above). Keep or
   revert — one file.
2. **Health stub is my own solution, not the montage-worker one.** The exact
   `sh -c` stub montage-worker uses lives in
   `docs/handoffs/SESSION_MONTAGE_BUILD_JUL22.md`, which I could not stage (the
   device bridge disconnected mid-session). Mine is strictly self-contained and
   verified working; if the handoff documents something different, prefer
   whichever has actually survived a Railway deploy.
3. **No exponential backoff.** `tp_montage_jobs` has no `next_attempt_at`, so
   retry spacing is one poll interval (15 s). A render that times out retries at
   ~20-min intervals naturally; a fast deterministic failure burns its 3
   attempts in ~30 s and then rests as `failed`. If real backoff is wanted, that
   is one nullable column + two SQL predicates.
4. **`MIN_RENDER_PHOTOS = 4`** per contract §8 ("skips gracefully if <4
   survive"). Applied both before download and after hygiene. Confirm 4 is right
   for the post-hygiene case too — a blurry burst could legitimately fall from 8
   to 4.
5. **`error` doubles as teacher-facing copy** on the `failed` path (e.g. "Only 3
   of the 9 chosen photos are still there…"). Builder 1's board should render it
   as-is; internal exception messages also land there when a render genuinely
   fails, so the UI may want to prefix them ("Something went wrong: …").
6. **Bucket is private.** The worker uses the service-role key, which reads and
   writes private buckets fine. Playback goes through Builder 1's
   `media/proxy/[...path]` route — that route is what must resolve the private
   object, not a public URL.
7. **Repo weight** — see §3.
