# Potato Snaps — Video Upload (Aug 23, 2026)

Owner: Tredoux (Whale Class, 稻香湖幼儿园). Directed by Claude (Sonnet) with an Opus worker.
Same day as `POTATO_SNAPS_HANDOFF_2026-08-23.md` (PWA install / send-gate / teacher download);
this doc covers only the video-upload work that followed it.

---

## 0. Starting question, and what it found

Tredoux asked two things: does Potato Snaps capture photos at full phone resolution, and could
teachers upload existing videos.

- **Photo resolution:** yes. Camera capture is native resolution, JPEG re-encoded at 90% quality
  only. Gallery-picked photos are untouched original bytes — no re-encode at all.
- **Video, at the time:** no. Capture was camera-only, photo-only; a video hit the upload route
  and got HTTP 415.

Montree's separate, pre-existing video feature (`components/montree/media/CameraCapture.tsx`,
in-app recording, 30s client-side cap only, no server check, 10MB bucket cap) was reviewed as a
reference pattern — its gaps were deliberately not copied into Potato Snaps.

## 1. Scope decided

Video upload as **teacher uploads an existing video from their phone's library** (not in-app
recording), capped at **3 minutes / 200MB**, stored and downloadable by teachers.

Explicitly **not** wired into two places, on purpose:
- **Not** fed into the automated weekly montage renderer (`potato-worker/`, untouched — the
  Remotion pipeline stays photos-only).
- **Not** visible to parents. A single video frame can capture other children in the background;
  the existing parent media-proxy path already refuses raw photo/video paths for the same reason.

## 2. What shipped

### Migration `338_potato_video.sql` (applied to production)
- `tp_photos.media_type` — text, default `'photo'`, `CHECK IN ('photo','video')`.
- `tp_photos.duration_seconds` — numeric.
- `tp_photos.file_size_bytes` — bigint.
- Partial index `idx_tp_photos_class_captured_photo`, scoped to `media_type='photo'`, so
  photo-only queries (montage picker, board counts) stay fast and correct without touching that
  code.

Video rows live in the same `tp_photos` table as photos — deliberate, not a shortcut.

Storage bucket `potato-snaps` has **no explicit `file_size_limit` / `allowed_mime_types`** at the
Supabase SQL level (checked directly: both NULL). The real ceiling is a **project-level Supabase
dashboard storage limit** (Settings → Storage) that isn't visible or settable from SQL — see
Open Items below.

### Upload API (`app/api/potato/photos/upload/route.ts`, extended in place)
- Video mime support: mp4, mov/quicktime, webm, 3gp (iPhone + Chinese Android formats).
- 200MB cap on video → 413 over.
- 180s duration cap, enforced server-side against a client-reported field → 422 over. The server
  never trusts the client alone for size — it recomputes actual bytes read.
- If a video lands before the migration is live in that environment, the route responds 503
  rather than mislabeling it as a photo (which would feed a video file into the stills-only
  montage renderer). The offline queue retries automatically once the migration is live.

### Client (`components/potato/CameraCapture.tsx`, `lib/potato/offline/*`)
- "Choose a photo" gallery button now accepts video too — "Choose a photo or video".
- Duration read client-side before upload; over 3 minutes is blocked inline, asking the teacher
  to trim first. Metadata-read failures are let through rather than blocked (some mobile browsers
  are flaky reading video duration) — the server-side cap is the real backstop.
- `enqueuePhoto` generalized to `enqueueMedia` — the offline-first "save to phone before any
  network call" guarantee is unchanged and applies identically to video.

Three latent large-file bugs surfaced while wiring this up — all pre-existing, only exposed once
files got video-sized:
1. A content-hash function read whole blobs into memory. Now samples large files instead of
   reading them whole — a full read of a 150MB clip could have crashed the tab on an older device
   before the file ever reached safe storage.
2. A fixed 60-second upload timeout. Now 20 minutes for video, so a slow classroom wifi upload
   doesn't get killed and restarted from zero.
3. A stale-upload-reclaim window that would have resent an in-progress video from scratch
   mid-upload.

### Teacher UI
- Video thumbnails get a play-icon badge with duration shown.
- Full-screen viewer plays video with controls.
- The download button added in the earlier session (`downloadFilm`) is generalized to
  `downloadMedia` — one shared, non-duplicated path downloads both photos and videos, saving with
  the correct original extension (a `.mov` is never saved mislabeled as `.mp4`).

## 3. Verification performed

- Typecheck clean — zero new errors versus baseline.
- Lint clean.
- Full production build succeeded.
- Confirmed zero `<style jsx>` usage.
- Confirmed zero imports from `lib/montree/*` / `components/montree/*` (the potato/montree
  isolation rule).
- Migration verified before and after on the live database.

## 4. Open items for Tredoux

1. **Check the Supabase dashboard storage limit** (Settings → Storage) and raise to roughly
   210MB if it's currently lower. If it's under the video cap, large uploads fail silently but
   safely — the offline queue retries forever, nothing is lost, it just never lands until the
   limit is raised.
2. Large video uploads currently read fully into server memory before forwarding to storage. If
   several teachers upload big videos at once this could pressure Railway's memory — worth a look
   after real-world use, not urgent now.
3. If parents should ever see specific videos, that needs a deliberate new design (child-scoped
   signed paths), not just flipping a switch — not done, on purpose, for the child-safety reason
   in §1.

## 5. Commit

`9550714a5` — "Add video upload to Potato Snaps (gallery pick, 3min/200MB cap, teacher view +
download)"

## 6. File map

| Area | Path |
|---|---|
| Migration | `migrations/338_potato_video.sql` |
| Upload API | `app/api/potato/photos/upload/route.ts` |
| Capture / gallery-pick UI | `components/potato/CameraCapture.tsx` |
| Offline queue | `lib/potato/offline/` |
| Teacher viewer / download | `components/potato/PotatoBits.tsx`, `components/potato/PreviewSendSheet.tsx`, `app/potato/teacher/page.tsx`, `lib/potato/client.ts` |
| Reference pattern (not reused) | `components/montree/media/CameraCapture.tsx` |
| Montage renderer (untouched) | `potato-worker/` |
