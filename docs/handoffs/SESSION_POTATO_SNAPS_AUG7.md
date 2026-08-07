# SESSION — Aug 7, 2026 (Cowork/Fable directing Sonnet scouts + Opus builders) — POTATO SNAPS BUILT

**Potato Snaps: standalone photo→weekly-montage app on www.teacherpotato.xyz, totally separate from Montree.**
Teacher logs in with a 6-char class code → Capture Board (faces left, horizontal bars filling toward 8 photos
this week) → camera + tag children → at 8+ "Make montage" queues a job → potato-worker renders (same
Remotion→ffmpeg engine as montage-worker) → parents log in with a per-child code and watch weekly films.
No AI anywhere. No i18n keys (hardcoded English — hook-safe). Billing is manual (Tredoux invoices; the
tp_montage_jobs table is the ledger: done jobs × $0.50).

- **Contract**: docs/handoffs/potato-snaps/POTATO_SNAPS_CONTRACT.md (binding — tables, routes, auth,
  storage paths, worker spec). Build notes + audit in the same folder. Design spec (approved by Tredoux
  Aug 7): docs/handoffs/potato-snaps/POTATO_SNAPS_DESIGN_SPEC.html — "Lunchbox Modern": cream/honey
  #E8A317/baby-blue #9ED2F0/ink #23395B, Baloo 2 + Nunito, potato-with-camera mascot.
- **Data**: migration **318_potato_snaps.sql** — tp_classes (tz default Asia/Shanghai), tp_children,
  tp_photos, tp_photo_children, tp_parent_codes (child_id UNIQUE), tp_montage_jobs (media_ids uuid[]),
  bucket `potato-snaps` (private). RLS enabled, zero policies (service-role only). ZERO montree_ table
  reads/writes anywhere. All routes 503 cleanly pre-migration.
- **Auth**: new cookies `potato_teacher` {classId, aud:'potato-teacher'} / `potato_parent` {childId,
  classId, aud:'potato-parent'}, jose HS256 on ADMIN_SECRET, 3650d. Audience-checked (cross-forgery
  audited). Parent childId ALWAYS from cookie, never query. lib/potato/auth.ts.
- **Routes**: app/api/potato/** (14) — self-gating (middleware protects nothing under /api/potato).
  Media proxy app/api/potato/media/proxy/[...path]: bucket hard-locked to potato-snaps (404 otherwise —
  deliberately NOT the montree proxy's silent fallback), Range→206, path-prefix auth (teacher: classId
  match; parent: own child's montages + faces only — parents NEVER get raw photos, by design).
  Montage POST derives media_ids SERVER-side (child's photos in [weekStart 00:00 class-tz, +7d)),
  enforces ≥8. Board count query = same shape as montage derivation (WYSIWYG).
- **Pages**: app/potato/** — / (chooser), teacher/login, teacher (Capture Board: empty/collecting/
  ready/cooking/sent row states, least-photos-first), teacher/children, teacher/codes,
  teacher/photos/[childId] (review/delete), parents, parents/home (montage feed), hq
  (SUPER_ADMIN_PASSWORD; create class → teacher code). components/potato/CameraCapture.tsx = copy of
  the montree camera (video mode stripped), zero lib/montree imports repo-wide in the new code.
- **middleware.ts**: exactly 2 changes — '/potato' in publicPaths + montree-host redirect of /potato*
  to https://www.teacherpotato.xyz (audit mechanically diffed: nothing else touched).
- **potato-worker/**: trimmed copy of montage-worker (28 files). Verbatim: Remotion image-sequence →
  external ffmpeg (never in-process encoder), Ken Burns 1080×1920, beats.json music + ISO-week rotation,
  SKIP LOCKED claiming, stale recovery, per-job bundle re-sync. New db.ts: polls tp_montage_jobs,
  single media_ids source, <4 surviving photos → failed gracefully, no callback — updates the row
  directly. Output: class/<classId>/montages/<childId>/<weekStart>-<jobId>.mp4. End card re-branded
  Potato Snaps. ⚠️ Binaries: run `bash potato-worker/scripts/prepare-assets.sh` on the Mac (copies mp3s +
  overlay from montage-worker, downloads fonts) BEFORE committing potato-worker; never bulk-copy
  remotion/public/ (drags the Montree logo into end cards). Railway service: root dir `potato-worker`,
  4vCPU/4GB, Dockerfile, envs DATABASE_URL + SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, blank start
  command (root railway.json healthcheck trap → sh -c stub pattern kept).
- **Audit** (Sonnet fresh-eyes, FIX-FIRST): SHIP-WITH-NOTES. 0 CRIT; 1 HIGH FIXED (6 routes incl. the
  media proxy didn't re-check tp_classes.is_active against 10-year cookies — all fixed fail-closed).
  MED documented: no HQ deactivate endpoint yet (revocation = manual SQL, standard for this repo).
  Path traversal, JWT cross-forgery, timing-safe HQ compare, migration idempotency, worker atomicity,
  week math (UTC+8 Sunday trap) all independently verified. tsc 0 errors on all new files.
- **⏳ OWED after this lands**: (1) Tredoux runs migration 318 (SQL pasted in chat); (2) create the
  potato-worker Railway service; (3) live walk on www.teacherpotato.xyz — create class in /potato/hq →
  teacher login → add child + face → 8 photos → Make montage → worker renders → parent code plays it
  (include a video SEEK to prove Range/206); (4) decide pricing copy shown to schools (nothing in-app).
- **🚨 RULES for future sessions**: Potato Snaps NEVER touches montree_ tables or lib/montree (only
  lib/supabase-client). The proxy bucket allowlist stays exactly one bucket. Parents never get raw
  photos. Board count and montage media_ids must stay the same query shape (WYSIWYG).

## 💡 V2.0 DIRECTION (Tredoux, Aug 7) — "PSS" (Photo Sorting System)
Rename/reframe for scale: ONE shared login per school (not per class) so subject teachers across a big
school (~100 classes) can all shoot and tag ANY child — a school-wide photo sorting system. Needs a
school layer above tp_classes (school → classes → children), child search/filter in the tag screen
(100+ classes can't be one flat face grid), and per-school shared teacher codes. v1.0 stays flat
(class = tenant) and is being piloted in the kindergarten (17 classrooms). Do NOT build until v1.0
pilot feedback is in.
