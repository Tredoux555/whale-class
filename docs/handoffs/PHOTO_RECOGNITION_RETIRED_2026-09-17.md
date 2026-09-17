# Photo recognition retired — 2026-09-17

**Decision owner approved. No migration is required for this release.**

AI photo work-identification (the two-pass Haiku → Sonnet pipeline) is switched
OFF everywhere. Nothing was deleted: every file still exists, and one
environment variable brings it back. Teacher tagging at capture time is now the
primary path, and every downstream surface — tracker, weekly and monthly
summaries, montages, parent reports — reads exactly what it always read:
`montree_media.work_id` + `montree_media.teacher_confirmed`.

---

## 1. Why

The pipeline spent Haiku ×2–3 plus Sonnet per photo, wrote nothing to
`montree_api_usage` (so the cost was invisible in the AI budget and the P&L),
and still needed a teacher to confirm the result in the audit queue. The
teacher is in the room and knows what the child was doing. Asking her once, at
the shutter, is cheaper, faster and right the first time.

## 2. The kill switch

`lib/montree/photo-identification/flag.ts`

| Export | Meaning |
| --- | --- |
| `isPhotoRecognitionEnabled()` | server-side; true only when `PHOTO_RECOGNITION_ENABLED === 'true'` |
| `isPhotoRecognitionEnabledClient()` | client mirror; `NEXT_PUBLIC_PHOTO_RECOGNITION_ENABLED === 'true'` |
| `PHOTO_RECOGNITION_RETIRED_NOTE` | the one sentence every retired endpoint answers with |
| `PHOTO_RECOGNITION_RETIRED_CODE` | `'photo_recognition_retired'` — the machine-readable marker |

Default is **OFF**. Unset, empty, `1`, `TRUE` — all off. Only the exact string
`true` turns it on. Both variables are in `.env.example`, commented, marked
"retired 2026-09-17; leave unset".

## 3. What is turned off, and how it answers

Every guard sits **above** any Anthropic/OpenAI call, so nothing can spend.

**On-demand routes → HTTP 410** with
`{ ok: true, skipped: 'photo_recognition_retired', error: <note> }`:

- `POST /api/montree/photo-identification/process`
- `POST /api/montree/photo-identification/batch`
- `GET  /api/montree/photo-identification/sweep`
- `POST /api/montree/photo-identification/requeue`
- `POST /api/montree/photo-identification/sonnet-review`
- `POST /api/montree/guru/snap-identify`
- `POST /api/montree/guru/photo-insight`
- `POST /api/montree/guru/photo-enrich`

**Cron → HTTP 200** `{ ok: true, skipped: 'photo_recognition_retired' }` (after
its `x-cron-secret` check, so the scheduler stays green and unauthenticated
callers still get 401):

- `POST /api/montree/cron/photo-sweep`

**In-process hooks:**

- `lib/montree/media/identify-trigger.ts` → returns `false` without touching the route.
- `app/api/montree/media/upload/route.ts` → the video-poster identification hand-off is flag-gated. Transcoding and the poster frame still happen; only identification stops.
- `app/api/montree/cron/video-transcode/route.ts` → same, belt-and-braces.
- `lib/montree/offline/sync-manager.ts` → the fire-and-forget `POST /process` after every upload is behind `isPhotoRecognitionEnabledClient()`. It also no longer POSTs `/api/montree/progress/update` per child for group photos: the upload route writes that progress server-side now, and keeping both would advance the ladder twice.

**If the flag is ever turned back on**, `two-pass.ts` and `sonnet-draft.ts` now
call `meterPhotoIdUsage()` (`lib/montree/photo-identification/meter.ts`) after
every Anthropic call, logging to `montree_api_usage` with endpoint
`photo-identification`. Cache reads/writes are counted as input tokens. The
cost is never invisible again.

## 4. The real flow (what replaced it)

Owner correction (2026-09-17, after this doc first shipped a tag-first
capture step): the teacher does **not** tag the work right after taking the
photo. Capture is photo → child → done — the photo vanishes and uploads in
the background, ready for the next shot. Work tagging happens later, in
wrap-up, on the "Photos to tag" page (photo-audit) via the "This is…" sheet,
same as it always did.

1. **Capture** — `app/montree/dashboard/capture/page.tsx`. Camera opens
   instantly → photo → tag child(ren) → save/enqueue immediately. No work
   step. `work_id` is `null` unless the Week-view Capture button passed
   `?workId` / `?workName` in the URL, in which case that bypass still tags
   the shot on upload (used for pre-targeted capture and by
   `tests/media/tag-first-upload.test.ts`).
2. **Upload** — `app/api/montree/media/upload/route.ts`:
   - `work_id` present (URL bypass only) → `teacher_confirmed = true`,
     `identification_status = 'confirmed'`, `identification_attempted_at = null`.
   - no `work_id` (the normal case) → `teacher_confirmed = false`,
     `identification_status = 'skipped'`, no AI, photo waits in "Photos to tag".
   - Event photos are untouched (they have no work, by design).
3. **Wrap-up tagging** — `components/montree/photo-audit/ThisIsSheet.tsx`
   ("This is…" sheet on the Photos-to-tag page), now with a **Suggested**
   chip row at the top of the picker:
   - Sourced from `GET /api/montree/progress/recent-works?childId=` — the
     child's last 3 works with tracker events plus the classroom's 5
     most-tagged works of the last 14 days (teacher-auth, school-scoped,
     child ownership proved, ≤8 rows, `no-store`). Non-blocking: a failed
     fetch just leaves the sheet as it was before.
   - Tapping a chip resolves the photo exactly like picking that work from
     search does today (`type: 'existing'`).
   - The full curriculum search, "AI thinks…" chip, and "Add as new work"
     flow are unchanged.
   - `components/montree/media/WorkQuickPick.tsx` (the capture-time picker
     this replaced) stays in the repo — unused by capture now, kept for its
     `GET /api/montree/progress/recent-works` client and available for reuse.
4. **Tracker** — for a tagged photo the resolve route calls
   `advanceProgressOnConfirm` (→ `writeProgress`, **the one door**) **once
   per tagged child**. The work is school-scoped first: the client-supplied
   `work_id` must resolve to a classroom in the caller's school or nothing is
   written. Group capture/tagging = one work for every child in the shot,
   which is what a group presentation is. A progress failure never fails the
   save.

**Statuses used are the ones that already exist** (`'confirmed'`, `'skipped'`)
— no new enum value, so the `migrations/210` constraint is untouched.

## 5. The queue

`app/montree/dashboard/photo-audit/page.tsx` (route unchanged):

- Heading is now **"Photos to tag"** (`photoAudit.wrapUpHeader`, en).
- Default filter is `untagged` (`work_id IS NULL`).
- The mount recovery sweep is gone (there is nothing to sweep).
- Every AI branch — Sonnet draft card, Haiku draft/match badges, confidence
  percentages, "Identifying…", "Tell AI what it is", "↻ Re-identify",
  sonnet-review — is behind `const AI_UI_RETIRED = true` at the top of the
  file. One line replaces them: *"Photo recognition retired — tag with
  'This is…'"*.
- `ThisIsSheet` is unchanged and remains the tag tool; `photo-audit/resolve`
  still sets `teacher_confirmed` and writes progress through the door.
- `app/api/montree/audit/photos/route.ts`: the green/amber/red zones were AI
  *confidence* buckets. With no model there is no confidence, so a tagged photo
  is green (a teacher tagged it) and `untagged` is the only count that means
  anything. Amber/red correctly fall to zero.

## 6. Plans

`photoRecognition` is **false on every tier**, Full included (and therefore for
founding members and partner schools, which resolve to `full`). The key stays
so gates, types and tests compile.

🚨 **One knock-on, deliberate and behaviour-preserving:** `photo_onboarding`
and `paper_scan` used to be `photoRecognition`'s override keys, and five live
routes gated on that capability. They are OCR/document extraction — a roster
photographed, a paper record scanned — **not** the retired pipeline. They now
gate on `orgOnboarding`, which is Full-only exactly as `photoRecognition` was.
No school gained or lost an entitlement. The routes:
`paper-scan/[scanId]/extract`, `paper-scan/upload`,
`photo-onboarding/[importId]/commit`, `photo-onboarding/[importId]/extract`,
`photo-onboarding/upload`.

## 7. Tables now dormant

Nothing is dropped. These stop receiving writes while the flag is off:

| Table | What it held |
| --- | --- |
| `montree_guru_corrections` | teacher corrections that taught the model (the self-learning loop) |
| `montree_visual_memory` | per-classroom visual descriptions of works |
| `montree_global_visual_memory` | the shared cross-school visual library + the `montree_global_vm_search` RPC (migration 282) |
| `montree_media.identification_confidence` / `.sonnet_draft` / `.identification_attempted_at` | per-photo pipeline output; new rows leave these null |

`montree_tracy_corpus` and its OpenAI embeddings are still used by Tracy
elsewhere; only `visual-retrieval.ts`'s use of them is dormant. Whisper and
DALL·E are untouched.

## 8. Optional SQL — nothing is required now

**Run none of this to ship.** It is here for a later clean-up, once the owner is
certain the decision will not be reversed. Read it before running it; the first
two are irreversible.

```sql
-- OPTIONAL, LATER. Archive the dormant learning tables (keeps the data).
CREATE TABLE IF NOT EXISTS montree_visual_memory_archive        AS TABLE montree_visual_memory;
CREATE TABLE IF NOT EXISTS montree_global_visual_memory_archive AS TABLE montree_global_visual_memory;
CREATE TABLE IF NOT EXISTS montree_guru_corrections_archive     AS TABLE montree_guru_corrections;

-- OPTIONAL, LATER, IRREVERSIBLE. Only after the archives above are verified.
-- DROP TABLE montree_visual_memory;
-- DROP TABLE montree_global_visual_memory;
-- DROP TABLE montree_guru_corrections;

-- OPTIONAL. Tidy historical rows so "Photos to tag" shows only genuinely
-- untagged photos. Cosmetic: the UI already filters on work_id.
-- UPDATE montree_media
--    SET identification_status = 'skipped'
--  WHERE work_id IS NULL
--    AND teacher_confirmed IS NOT TRUE
--    AND identification_status IN ('haiku_drafted', 'sonnet_drafted', 'failed');
```

## 9. How to re-enable

1. Set `PHOTO_RECOGNITION_ENABLED=true` (server) and
   `NEXT_PUBLIC_PHOTO_RECOGNITION_ENABLED=true` (client) and redeploy.
2. Set `photoRecognition: true` for `full` in `lib/montree/plans/capabilities.ts`
   (and decide whether `photo_onboarding` / `paper_scan` move back from
   `orgOnboarding` — they do not need to).
3. Set `AI_UI_RETIRED = false` in `app/montree/dashboard/photo-audit/page.tsx`.
4. The capture work picker can stay: a teacher-picked work already short-
   circuits identification (`!entry.work_id` gates the client trigger), so the
   two coexist — the AI only ever sees what nobody tagged.
5. Spend is metered from the first call. Watch `montree_api_usage` where
   `endpoint = 'photo-identification'`.

## 10. Tests

- `tests/media/tag-first-upload.test.ts` — new. Confirmed stamps + one door
  call per child, group = one work for all, tag-later = `'skipped'` with zero
  Anthropic calls, `/process` → 410, no plan grants `photoRecognition`, and
  only migration-210 statuses are written.
- `tests/photo-gate-a.test.ts`, `tests/photo-classroom-recall.test.ts` — kept
  green with a retirement note: pure functions, the invariants that must still
  hold on the way back in.
- `tests/photo-onboarding-reconcile.test.ts` — untouched behaviour; noted as a
  still-live surface.
- `tests/plans-capabilities.test.ts`, `tests/plans-gating.test.ts` — updated to
  the new matrix.
- `tests/progress/*` — unchanged and green, including the one-door guard.
