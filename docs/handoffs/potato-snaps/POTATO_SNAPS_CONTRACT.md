# POTATO SNAPS — Binding Architecture Contract (Aug 7, 2026)
Author: Fable (director). Builders follow this exactly; deviations need director sign-off.
Scout reports: /home/claude/scouts/A-montage-pipeline.md + B-capture-auth-hostsplit.md

## 0. Tredoux's rulings (LOCKED)
- Name: **Potato Snaps**. Lives on **www.teacherpotato.xyz** exclusively. Branding totally distinct from Montree: darker yellow + baby blue, kindergarten-friendly, playful.
- Data: same Supabase project, **brand-new `tp_` tables only**. ZERO reads/writes to any `montree_*` table. New private storage bucket `potato-snaps`.
- Teacher login: 6-char class code → long-lived cookie. Parent login: 6-char per-child code (Montree pattern).
- Montage trigger: **teacher taps per child** when that child's weekly bar reaches 8+. Every video is a deliberate event (billable at $0.50 in Tredoux's client pricing — no billing code in v1; `tp_montage_jobs` IS the ledger).
- No AI anywhere in this product. No i18n keys — hardcoded English pages (proven hook escape hatch).

## 1. Product shape (v1)
Teacher: log in with class code → **Capture Board**: children's faces stacked on the LEFT, a horizontal bar per child filling toward 8 photos for the current week; camera capture (photo → tag one or more children); bar hits 8 → "Make montage" button lights up; tap → job queued → renders → done state on board. Secondary screens: manage children (name + face photo), parent codes (mint/print), photo review per child (delete bad shots).
Parent: enter child code → montage feed (weekly videos, newest first, plain `<video>` player). Nothing else.
HQ (Tredoux only): create a class → get its teacher code. Gated by SUPER_ADMIN_PASSWORD header/prompt.

## 2. Tables (one migration file: `migrations/309_potato_snaps.sql` — verify 309 is next free number; RLS ENABLED on every table with NO policies = deny-all, service-role only; all idempotent)
- `tp_classes`: id uuid pk default gen_random_uuid(), name text not null, login_code text unique not null, is_active boolean default true, created_at timestamptz default now().
- `tp_children`: id uuid pk, class_id uuid not null references tp_classes(id) on delete cascade, name text not null, photo_path text, sort_order int default 0, is_active boolean default true, created_at timestamptz default now().
- `tp_photos`: id uuid pk, class_id uuid not null references tp_classes(id) on delete cascade, storage_path text not null, captured_at timestamptz default now(), created_at timestamptz default now(). Index (class_id, captured_at).
- `tp_photo_children`: photo_id uuid references tp_photos(id) on delete cascade, child_id uuid references tp_children(id) on delete cascade, primary key (photo_id, child_id). Index (child_id).
- `tp_parent_codes`: id uuid pk, class_id uuid not null references tp_classes(id) on delete cascade, child_id uuid not null references tp_children(id) on delete cascade, code text unique not null, created_at timestamptz default now(), last_used_at timestamptz.
- `tp_montage_jobs`: id uuid pk, class_id uuid not null, child_id uuid not null references tp_children(id) on delete cascade, week_start date not null, status text not null default 'queued' check (status in ('queued','processing','done','failed')), media_ids uuid[] not null, storage_path text, error text, attempt int default 0, created_at timestamptz default now(), started_at timestamptz, completed_at timestamptz. Index (status, created_at); index (child_id, week_start).
- Bucket: `insert into storage.buckets (id, name, public) values ('potato-snaps','potato-snaps', false) on conflict (id) do nothing;`
- 42703-safety: all new API routes fail to clean 503 "setup pending" if tables absent pre-migration.

## 3. Storage paths (bucket `potato-snaps`, private)
- Child face: `class/<classId>/faces/<childId>.jpg`
- Photos: `class/<classId>/photos/<yyyy>/<mm>/<uuid>.jpg`
- Montages: `class/<classId>/montages/<childId>/<weekStart>-<jobId>.mp4`

## 4. Auth (new module `lib/potato/auth.ts` — no imports from lib/montree)
- jose HS256 signed with existing `ADMIN_SECRET` env (no new env var). Distinct httpOnly cookies: `potato_teacher` (payload {classId, aud:'potato-teacher'}), `potato_parent` (payload {childId, classId, aud:'potato-parent'}). TTL 3650 days. Cookies host-only (no domain attr) — set on www.teacherpotato.xyz.
- `verifyPotatoTeacher(req)` → {classId} | null. `verifyPotatoParent(req)` → {childId, classId} | null. Every /api/potato/* route self-gates (middleware gives zero automatic protection — scout-confirmed).
- HQ routes: timing-safe compare of `x-admin-password` header against SUPER_ADMIN_PASSWORD.

## 5. API routes (`app/api/potato/**`, all service-role Supabase via getSupabase())
- POST `auth/teacher` {code} → cookie. POST `auth/parent` {code} → cookie + stamp last_used_at. POST `auth/logout`.
- GET `board?week=YYYY-MM-DD` (teacher) → children[] {id, name, facePath, photoCount, latestJob {status, id}} for the week (default current week, Monday start, LOCAL date math — never toISOString for date keys; copy montage-tracker's local date helpers pattern).
- POST `photos/upload` (teacher, multipart: file + childIds[] JSON) → storage upload → tp_photos row + junction rows. Photos only, 10MB cap, jpeg/png/webp/heic. Count rule (WYSIWYG): a photo counts for every child tagged on it; counts = photos that would feed the montage — one query shape shared by board and montage media_ids derivation.
- GET `photos?childId=&week=` (teacher) → list with proxy URLs. DELETE `photos/[id]` (teacher, class-owned check) → delete row (junction cascades) + best-effort storage remove.
- GET/POST/PATCH `children` (teacher): create {name}, update {name, sortOrder, isActive}; POST `children/[id]/face` multipart face upload.
- GET `parent-codes` (teacher) → all codes for class. POST `parent-codes` {childId} → mint 6-char code (A-Z2-9 alphabet, collision-retry), returns code (also stays visible in list — kindergarten reality: codes get lost).
- POST `montage` (teacher) {childId, weekStart?} → SERVER derives media_ids = that child's photos for that week (never client-supplied — Montree security contract). Enforce ≥8 photos (400 with friendly message otherwise). Insert tp_montage_jobs 'queued'. Re-runs allowed (new row; parent feed shows latest 'done' per week).
- GET `montages?childId=` — teacher (class check) or parent (own child only, childId from cookie NOT query) → done jobs newest-first with proxy URLs.
- GET `media/proxy/[...path]` — streams ONLY from `potato-snaps` bucket (hard allowlist of exactly one bucket, 404 anything else — do NOT copy Montree proxy's silent-fallback trap). Range → 206 for mp4. AUTH: teacher cookie whose classId matches the `class/<classId>/` path prefix, OR parent cookie whose classId matches AND (path is a montage/photo of their childId OR a face path). Never buffer whole file; stream.
- HQ: GET/POST `hq/classes` (x-admin-password) → create class {name} → mint unique teacher login_code; list classes with children/photo/job counts.

## 6. Pages (`app/potato/**` — hardcoded English, self-contained styling, NO montree i18n/providers/imports; styled-jsx rule: any <style jsx> at top level of return only, else dangerouslySetInnerHTML)
- `/potato` — brand chooser: Potato Snaps logo, two big buttons: "I'm a Teacher" / "I'm a Parent".
- `/potato/teacher/login`, `/potato/teacher` (Capture Board — THE screen), `/potato/teacher/children`, `/potato/teacher/codes`, `/potato/teacher/photos/[childId]` (review/delete).
- Camera: copy `components/montree/media/CameraCapture.tsx` → `components/potato/CameraCapture.tsx` (scout: no montree coupling; keep landscape right-rail + safe-area behaviors; strip video mode — photos only v1). Tag screen: face grid multi-select → upload. NO offline IndexedDB queue in v1 (direct upload + retry toast; queue is a v2 item — keep build small).
- `/potato/parents` (code login), `/potato/parents/home` (montage feed).
- `/potato/hq` (Tredoux: password prompt → create class, see codes).
- PWA-lite: viewport + apple-touch icon + safe-area padding on sticky bars (env(safe-area-inset-top)); full manifest is v2.

## 7. Middleware (`middleware.ts` — surgical)
- Add `/potato` to `publicPaths` (else anonymous visitors 307 to `/` — scout-confirmed landmine).
- Scope to teacherpotato exclusively: on montree.xyz hosts, redirect `/potato*` → `https://www.teacherpotato.xyz/potato...`; on www.teacherpotato.xyz serve normally (follow the existing host-split mechanism; verify `/api/potato/*` passes on that host the way the dark-phonics media proxy does).

## 8. Worker (`potato-worker/` — copy of montage-worker, trimmed; separate Railway service)
- Keep verbatim: Remotion image-sequence → ffmpeg mux pipeline (NEVER Remotion's in-process encoder), 1080×1920 Ken Burns, precomputed beats.json music (5 tracks, ISO-week rotation), concurrency = cores−1, SELECT ... FOR UPDATE SKIP LOCKED claiming with RETURNING *, stale-processing recovery, per-job photo re-sync into the bundle before EVERY render (bundle-staleness trap).
- Replace db.ts sources with ONE branch: media_ids → tp_photos storage_paths (bucket potato-snaps). No report branch, no parent_visible concept (deleting a photo before montage IS the curation), no completion callback/push — worker updates tp_montage_jobs row directly (done + storage_path | failed + error).
- Envs: DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Railway: root dir `potato-worker`, and the root railway.json healthcheck applies to ALL services — use the `sh -c` start-command stub exactly like montage-worker.
- ≥8 photos enforced at enqueue; worker re-checks media exist, skips gracefully if <4 survive.

## 9. Design (tokens final after design-spec approval; structure binding)
Palette: honey/dark-yellow primary `#E8A317` (+ butter `#FFD466`), baby blue `#9ED2F0` (+ sky wash `#EAF6FD`), cream page `#FFFDF6`, ink navy text `#23395B`, coral `#FF7B6B` for destructive only. Type: Baloo 2 (display) + Nunito (body). Shapes: 24px card radii, pill-shaped bars, 56px circular face avatars with butter ring. Bar fill baby blue → flips honey-gold with a subtle celebrate state at 8+. Simple potato-face SVG mascot. NOTHING dark-forest, NOTHING Lanternlight — this is the anti-Montree register.

## 10. Build split (2 Opus builders, pinned interface = this doc)
- Builder 1 (app): migration SQL, lib/potato/auth.ts + helpers, all /api/potato routes, middleware edit, all pages per approved design spec, potato CameraCapture copy.
- Builder 2 (worker): potato-worker/ from montage-worker, trimmed per §8.
- Shared pin: table columns (§2), storage paths (§3), job status enum, week_start = local Monday date string.
- Build in container at /home/claude/build/potato/<repo-relative paths>; delivery to Mac afterwards via device_commit_files with byte/sha256 verification on the Mac (device_commit_files corrupted batches before — Jul 31 landmine; fall back to Desktop Commander write_file + sha256 manifest if sick).

## 11. Verification gates (before "done")
- Sonnet fresh-eyes adversarial audit of the full diff (security: proxy path auth, montage media_ids server-derived, class-ownership checks on every photo/child mutation, HQ timing-safe compare).
- eslint 0 errors on all new files; scoped tsc clean (scoped tsconfig must remap "@/*" to "./*" — base maps to nonexistent ./src).
- Logic harness on week-key math (UTC+8 Sunday trap: local Monday, never toISOString).
- Live verify after deploy: full walk on www.teacherpotato.xyz with a test class (create → login → add child+face → capture 8 → bar full → montage → worker renders → parent code plays it).

## 12. Tredoux's two manual steps (prepare both, click-by-click)
1. Paste migration 309 SQL in Supabase SQL editor (full SQL delivered in chat).
2. Double-click PUBLISH_POTATO_SNAPS.command (surgical staged file list, never git add -A). Plus one Railway step: create `potato-worker` service (guided click-by-click; Chrome agent can drive if he prefers).
