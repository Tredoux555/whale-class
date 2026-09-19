# Video transcode pipeline: extension trust removed, self-running sweep added (2026-09-19)

## 1. Symptom

A video uploaded 2026-09-18 to teacherpotato.xyz/montree.xyz did not play.
Checking the queue found 4+ `.webm` uploads from Sep 11 stuck in
`transcode_status = 'pending'` for a week — once actually swept, it turned
out to be ~25 rows across the table, not four.

## 2. Root causes (three)

1. **Extension trust.** `isIosPlayableContainer()` decided playability from
   the file's **extension** — any `.mp4`/`.m4v`/`.mov` was stamped
   `playback_path = storage_path` and `transcode_status = 'done'` without
   ever calling ffmpeg. `transcode-now` and the cron route had the same
   extension shortcut.
2. **Even a codec probe was not enough.** Raw iPhone exports are H.264/AAC
   inside the container, but `pix_fmt yuvj420p`, a -90° display-matrix
   rotation, and a fragmented `isomiso5hlsf` mp4 — none of which a browser
   plays back correctly without re-encoding.
3. **No scheduler.** The transcode was fire-and-forget in the request
   process. Railway redeploys the app many times a day, which SIGKILLs the
   in-flight ffmpeg, so a killed job left its row on `pending`/`processing`
   forever. `/api/montree/cron/video-transcode` existed as the intended
   safety net, but nothing was ever scheduled to call it — no Railway cron,
   no `vercel.json`, no external pinger.

## 3. Fix — two commits

**`37577ee27`** — ffprobe codec probe. Every video now queues `pending` and
`transcodeVideoMedia` probes codec/container; only true h264+aac-in-mp4
passes through, everything else transcodes. Probe failure defaults to
transcode (fail closed, not open).

**`357cfaa9f`** — passthrough narrowed to files **our own ffmpeg produced**:
encoder tag starts `Lavf`, `yuv420p`, rotation 0, no `moof` box, no
`hlsf`/`dash` brand. Everything else (including a raw iPhone export that
happens to be h264/aac) gets re-encoded. Also in this commit:
- `instrumentation.ts` — self-running sweep, first pass 20s after boot then
  every 5 minutes, batch size 5, swallows every failure so it can never take
  the process down.
- `lib/montree/media/transcode-sweep.ts` — the queue drain the sweep calls.
  Does not claim rows itself; offers candidates to the one claim path.
- `claimMediaForTranscode()` in `lib/montree/media/transcode.ts` — the single
  atomic claim, shared by upload's fire-and-forget, the sweep, and
  `transcode-now`. A conditional UPDATE, so multiple Railway
  instances/replicas running the sweep at once is correct, not a race.
- Stale `processing` rows (a redeploy casualty) reclaimed after 15 minutes.
  Failed rows retried up to 3 times, then left with `transcode_error` set.
- `migrations/355_montree_transcode_claim.sql` — adds
  `transcode_started_at` / `transcode_attempts` / `transcode_error`. Every
  code path is 42703-safe before it runs — the app is correct with or
  without it, it just can't reclaim stale rows until it's applied.
- `MediaDetailModal.tsx` — key-remount on `playback_path` change, `onError`
  handling, and a "still being processed" banner instead of a silently dead
  player.
- The cron route (`/api/montree/cron/video-transcode`) now delegates to the
  sweep instead of duplicating the extension-shortcut logic it used to have.
  Its dead photo-recognition hand-off (from the 2026-09-17 retirement) was
  removed in the same pass.

## 4. Verified live

Deploy `f43696c9` — SUCCESS, 06:04 UTC. Log line:
`[instrumentation] video transcode sweep armed (every 5 min)`. First sweep
fired 29s after boot; 16 webm rows transcoded in the first 6 minutes with 0
failures.

Expected pre-migration log line, harmless, do not treat as an error:
```
[Transcode] migrations/355 not applied — claiming on status alone
```

## 5. SQL Tredoux must run — NOT YET CONFIRMED RUN

Migration 355, verbatim:

```sql
-- 355_montree_transcode_claim.sql
-- Makes the video transcode queue SELF-DRIVING and crash-safe.
--
-- Why: the transcode was fire-and-forget from the upload route. Railway
-- redeploys many times a day, and a redeploy kills the in-flight ffmpeg —
-- leaving the row stuck on 'pending'/'processing' forever, because nothing
-- was scheduled to come back for it. An in-process sweep now runs every 5
-- minutes (instrumentation.ts -> lib/montree/media/transcode-sweep.ts) and
-- needs three things this migration adds:
--
--   transcode_started_at  when the current attempt CLAIMED the row. A row in
--                         'processing' older than 15 minutes is a casualty of
--                         a redeploy and goes back to 'pending'.
--   transcode_attempts    so a genuinely undecodable file is retried a bounded
--                         number of times (3) instead of burning CPU forever.
--   transcode_error       the last failure message, so a stuck clip can be
--                         diagnosed from SQL instead of from Railway logs that
--                         have already rolled over.
--
-- Purely additive and idempotent. Every code path is 42703-safe, so the app
-- runs correctly before this is applied — it just cannot reclaim stale rows.

BEGIN;

ALTER TABLE montree_media ADD COLUMN IF NOT EXISTS transcode_started_at timestamptz;
ALTER TABLE montree_media ADD COLUMN IF NOT EXISTS transcode_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE montree_media ADD COLUMN IF NOT EXISTS transcode_error text;

-- The sweep's claim scan: un-finished videos, oldest first.
CREATE INDEX IF NOT EXISTS idx_montree_media_transcode_queue
  ON montree_media (transcode_status, created_at)
  WHERE media_type = 'video' AND transcode_status IS DISTINCT FROM 'done';

COMMENT ON COLUMN montree_media.transcode_started_at IS 'When the current transcode attempt claimed this row (stale > 15 min = reclaim)';
COMMENT ON COLUMN montree_media.transcode_attempts IS 'Number of transcode attempts; the sweep stops retrying failures at 3';
COMMENT ON COLUMN montree_media.transcode_error IS 'Last transcode failure message (NULL once it succeeds)';

INSERT INTO montree_migrations (filename) VALUES ('355_montree_transcode_claim.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
```

Then re-queue every video that a buggy pre-fix run stamped `done` without
ever actually transcoding it, so the sweep picks them up:

```sql
UPDATE montree_media
SET transcode_status = 'pending', transcode_attempts = 0, transcode_error = NULL
WHERE media_type = 'video'
  AND archived_at IS NULL
  AND (playback_path IS NULL OR playback_path = storage_path);
```

**Status at handoff: NOT YET CONFIRMED RUN.**

## 6. Open items

- (a) Confirm migration 355 + the re-queue UPDATE ran, and that yesterday's
  video (`…/1789704447994-oc1iqq.mp4`, row
  `61ee4d64-c159-46dc-905e-d0927002e014`) plays. The sweep will pick it up
  automatically within 5 minutes of the SQL running — no manual trigger
  needed.
- (b) Logs show each sweep cycle firing twice a few seconds apart — likely
  two Railway instances/replicas. Harmless (claims are atomic, so no double
  transcode), but confirm the replica count.
- (c) Encoder args are kept at `-profile:v main -crf 26 -maxrate 2500k -b:a
  96k` — deliberately bandwidth-tuned for China Wi-Fi. Do not bump to
  `crf 23` (or otherwise raise bitrate) without a specific reason; it isn't
  an oversight.

## 7. Rules learned

- **Never decide playability by file extension.** An extension says nothing
  about codec, pixel format, rotation or fragmentation.
- **Passthrough only what our own ffmpeg made** — check the encoder tag and
  known-safe properties (`yuv420p`, rotation 0, non-fragmented), not just
  "the codec matches."
- **Background jobs running in the web process die on redeploy.** Anything
  queued needs a self-running sweep with atomic per-row claims, not a
  fire-and-forget call plus an unscheduled cron route.
- **A `done` stamp written by buggy code is invisible to every future
  sweep.** Fixing the code is not the whole fix — re-queuing the rows it
  mislabeled is part of the fix, and belongs in the same handoff.
- **Railway MCP hides `CRON_SECRET` values.** Trigger the transcode via a
  teacher-cookie route or the sweep itself — not by curling the cron route
  with a guessed secret.
