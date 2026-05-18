# Parent Portal — Deep Triple Audit

**Date:** 2026-05-16
**Scope:** Read-only investigation of every page under `app/montree/parent/**`, every API route under `app/api/montree/parent/**`, the parent JWT verification helpers, parent messaging access guard, and the supporting DB schema.
**Status:** READ-ONLY. No code changes were made. This document is a recommendation surface — the user picks what to ship.

Reviewer note: the parent portal is the most customer-facing surface in Montree. Bugs and security holes here are immediately visible to real families. A cross-family data leak here is reputationally fatal.

---

## Executive summary

Top issues by severity (full detail below):

1. **CRITICAL — Parent JWT carries `childId` directly; subsequent requests never re-verify the parent↔child link.** `verifyParentSession()` (`lib/montree/verify-parent-request.ts:33-83`) only validates the JWT signature. It does NOT re-query `montree_parent_invites` or `montree_parent_children` to confirm the invite is still active or that the parent is still linked to that child. The token lives 30 days. Every read endpoint (`dashboard`, `photos`, `stats`, `milestones`, `weekly-review`, `reports`, `report/[id]`) trusts `session.childId` blindly. **Effect: a revoked invite OR an unlinked parent (child moved schools / graduated / link removed via super-admin) keeps full access for up to 30 days until the token expires.** Practical scenarios where this matters: school terminates a parent account for misconduct; child transfers schools; estranged parent has their access revoked. Until the cookie expires, none of those take effect.

2. **HIGH — Parent-visible photo filter excludes only `pending_review`, NOT `teacher_confirmed=true`.** Every parent photo query (`dashboard/route.ts:184`, `photos/route.ts:41`, `report/[reportId]/route.ts:279/360/379`) uses `.or('identification_status.is.null,identification_status.neq.pending_review')`. This admits photos with `identification_status` of `haiku_drafted`, `sonnet_drafted`, `haiku_matched`, `failed`, `confirmed`, plus NULL. The canonical "approved by teacher" signal in the photo pipeline is `teacher_confirmed=true` (per `app/api/montree/photo-audit/resolve/route.ts`). Photos awaiting audit — including possibly mislabelled or wrong-child photos — surface to parents. Combined with the missing `media_type='photo'` filter on the dashboard endpoint (only `report/[reportId]` enforces it), parents can see videos, audio, and other media as `<img>` tags too.

3. **HIGH — Parent dashboard auth-gates on `localStorage`, but the real auth is the httpOnly cookie.** `app/montree/parent/dashboard/page.tsx:127-153` reads `localStorage.getItem('montree_parent_session')` and bounces to `/montree/parent` if missing. But the access-code POST sets the httpOnly cookie + a localStorage hint; if the user clears site data partially (some browsers selectively clear), localStorage can be wiped while the cookie persists. The page then forces a re-login that's unnecessary. Worse: localStorage is the SOURCE OF TRUTH for `childId` on the dashboard load path (line 139), bypassing `verifyParentSession()` until the first API call. A parent could edit localStorage to set any `childId` they want — the API will still reject it via the JWT, but the parent dashboard will attempt to load it and surface confusing errors. The localStorage-as-auth pattern is also stale across all parent pages (`dashboard`, `report`, `photos`, `milestones`).

---

## Architecture as built

### Two auth flows feed the same cookie:

```
┌──────────────────────────────────────────────────────────────────────┐
│  Path A — Invite Code (read-only)                                    │
│  Parent enters 6-char code → POST /api/montree/parent/auth/access-code│
│  → Looks up montree_parent_invites (is_active, expires, max_uses)    │
│  → JWT { sub: childId, inviteId, classroomId, parentId: NULL }       │
│  → Cookie `montree_parent_session` (30d, httpOnly)                   │
│  → localStorage { childId, childName, expires }  ← HINT, not auth    │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  Path B — Email + Password (full account)                            │
│  Parent enters email+password → POST /api/montree/parent/login       │
│  → bcrypt verify against montree_parents.password_hash               │
│  → Reads montree_parent_children join                                │
│  → JWT { sub: firstChildId, parentId, childName }                    │
│  → Cookie `montree_parent_session` (30d, httpOnly)                   │
│  → Response carries full children[] list                             │
└──────────────────────────────────────────────────────────────────────┘
```

### Every parent API endpoint goes through one of two gates:

| Gate | Used by | What it checks |
|------|---------|----------------|
| `verifyParentSession()` | dashboard, photos, stats, milestones, weekly-review, reports, report/[id], children | JWT signature only. No DB re-check of invite/parent_children. |
| `resolveMessagingParent(supabase)` | messages/* | JWT signature + `parent_messaging` feature flag + `montree_parents.is_active` + `montree_parent_children` link + child's classroom is in parent's school. Refuses invite-only sessions. |

### Data flow for a typical dashboard load:

```
Browser navigates → app/montree/parent/dashboard/page.tsx mounts
  → useEffect reads localStorage 'montree_parent_session'
    └─ missing/expired → router.push('/montree/parent') and short-circuit
    └─ present → setSelectedChild + setChildren + parallel loadReports()
  → loadReports calls GET /api/montree/parent/reports?childId=X&locale=Y
    → verifyParentSession() reads cookie
      └─ JWT invalid → 401
      └─ JWT valid → session.childId
    → if session.childId !== childId → 403 (the only DB check)
    → supabase.from('montree_weekly_reports')
        .eq('child_id', childId)
        .or('status.eq.sent,generated_at.not.is.null')
    → return reports
  → loadFullReport(reports[0].id) → GET /api/montree/parent/report/[reportId]
    → verifyParentSession() → JWT only
    → fetch report by id, check report.child_id === session.childId → 403 if not
    → fetch photos with .or('identification_status.is.null,…neq.pending_review')
    → return rich report payload
```

The `montree_parent_children` table is consulted ONLY on login (Path B). After login, the child is locked in the JWT and trusted forever.

---

## Findings — categorised

## 1. Auth & cross-family contracts

### F-1.1 — CRITICAL — Stale parent↔child link is invisible to every endpoint

**Where:** `lib/montree/verify-parent-request.ts:33-83`, every parent API route that doesn't go through `resolveMessagingParent()`.

**What:** `verifyParentSession()` is a pure JWT verifier. It returns `childId` straight from the token payload. The token was signed at login (`access-code/route.ts:137-142` or `login/route.ts:114-118`) with whatever `child_id` was attached to the invite / first parent_child link.

After that, the link's state never matters to the auth check. If a super-admin or principal:
- Sets `montree_parent_invites.is_active = FALSE`
- Deletes a `montree_parent_children` row
- Disables `montree_parents.is_active`
- Withdraws the child (sets `montree_children.is_active = FALSE`)
- Transfers the child to another classroom or school

…none of those propagate to the existing JWT. The parent keeps full read access (dashboard, photos, reports, milestones, weekly-review) for up to 30 days.

**Repro:** Log in as a parent. From the super-admin panel, delete the parent's row in `montree_parent_children`. Reload the parent dashboard — it loads. Photos still load. The weekly report still loads. The parent ONLY loses access to messaging (`resolveMessagingParent` re-queries `montree_parent_children` per request).

**Why it matters:** This is the single largest data-leak risk in the parent portal. In every real-world scenario where a school needs to revoke parent access immediately (custody dispute, parent violation of school policy, child transfer), the system can't actually revoke it. The principal sees "access revoked" but the parent still browses for a month.

**Fix sketch:** Every endpoint that funnels through `verifyParentSession()` should additionally call a (cheap, cached) check that the invite is still active AND the parent_children link still exists. Pattern: extract a `resolveAuthorizedParent(supabase, session)` helper that:
1. If `session.parentId` is set (full account): SELECT `montree_parents.is_active=true` + `EXISTS(SELECT 1 FROM montree_parent_children WHERE parent_id = $1 AND child_id = $2)` — single round-trip.
2. If `session.inviteId` is set (invite-only): SELECT `montree_parent_invites.is_active=true AND (expires_at IS NULL OR expires_at > NOW()) AND (max_uses IS NULL OR use_count <= max_uses) AND child_id = $1`.
3. Either branch fails → clear the cookie + return 401.

Alternative: lower JWT TTL from 30d to 24h to reduce the revocation window. Compromises UX for everyone to fix an edge case.

---

### F-1.2 — HIGH — `verifyParentSession()` legacy base64 fallback is forgeable

**Where:** `lib/montree/verify-parent-request.ts:58-79`

**What:** After JWT verification fails, the helper tries to base64-decode the cookie value as JSON and treat that as the session. The comment says "remove this fallback after 30 days (old cookies expire)" but the code was added at the JWT migration time. The fallback accepts any base64-encoded JSON containing `{ child_id, child_name, parent_id, ... }` — no signature, no expiry check.

**Repro:** Set the cookie `montree_parent_session=eyJjaGlsZF9pZCI6Ijxzb21lLXVhaWQ+IiwicGFyZW50X2lkIjoiPHNvbWUtdXVpZD4ifQ==` (base64 of `{"child_id":"<some-uuid>","parent_id":"<some-uuid>"}`). Visit `/api/montree/parent/dashboard`. The route returns whatever child the UUID belongs to.

The mitigation depends on guessing real UUIDs (cryptographically unlikely) AND the `parent_id` being optional — but a parent who knows another family's child_id (e.g. via a screenshot or shared report URL) could mint a forged session by hand.

**Why it matters:** UUIDs are not secrets and shouldn't be auth tokens. The fact that legacy fallback was in place is fine; the fact that it's been there since before the JWT migration in `Session 116` (per `login/route.ts` comment) means it's well past its "expires naturally in ≤30 days" deadline. Per session note logs the bug has been live for many months.

**Fix sketch:** Delete the entire `// Migration fallback` block at lines 56-79. All legacy sessions have long since expired. If kept for any longer, at MINIMUM require the JSON to have a `signed_at` timestamp older than `Now - 30d` AND fail closed if `crypto.timingSafeEqual` against an HMAC.

---

### F-1.3 — HIGH — Parent dashboard auth check uses localStorage, not cookies

**Where:** `app/montree/parent/dashboard/page.tsx:127-153`, `report/[reportId]/page.tsx:138-145`, `photos/page.tsx:51-69`, `milestones/page.tsx:83-101`.

**What:** Every parent client page gates rendering on `localStorage.getItem('montree_parent_session')`. The actual auth is the httpOnly `montree_parent_session` cookie set by the access-code / login routes. The localStorage entry is just a hint blob written by `login-select/page.tsx:102-106` with `{ childId, childName, expires }`. It's:
- Forgeable (a user can write arbitrary values via DevTools console)
- Out of sync with the cookie (expiry timestamps differ; cookie is 30d, localStorage uses the same 30d but server can revoke either independently)
- The PRIMARY source for `childId` on the dashboard until the first API call (line 139-144 of dashboard: `directChild.id = session.childId`)

**Repro:** Open `/montree/parent/dashboard` in DevTools. In Application → Local Storage, edit `montree_parent_session` JSON, change `childId` to an arbitrary UUID. Reload. The dashboard tries to load reports for that UUID. API correctly returns 403, but the page shows error toasts about "failed to load reports" rather than redirecting to login.

**Why it matters:** Three problems:
1. **Stale localStorage + valid cookie:** clearing browsing data sometimes wipes localStorage but not httpOnly cookies. The parent gets bounced to login despite having a valid session.
2. **Valid localStorage + expired cookie:** every API call returns 401 silently. The UI shows generic "failed to load" toasts rather than recognising the auth failure and re-logging in.
3. **Tampered localStorage:** the page tries to load data for a non-owned child. The errors are confusing.

**Fix sketch:** Drop localStorage entirely. Make the dashboard route call `GET /api/montree/parent/auth/access-code` (the `GET` handler that returns `authenticated: true/false` from cookie verification) on mount, and bounce to `/montree/parent` only on `authenticated: false`. The current localStorage write at `login-select/page.tsx:102-106` is non-load-bearing — server already issues the cookie. Just remove the writes + the reads.

---

### F-1.4 — HIGH — `montree_parent_children` is consulted only on login

**Where:** `app/api/montree/parent/login/route.ts:88-103` consults `montree_parent_children`. After login, no other endpoint does.

**What:** The login route reads the parent's children list, picks `children[0].id`, and bakes that into the JWT as `sub`. The login response body includes all children, which the client uses for display. But after login, no API endpoint asks "does this parent still link to this child?" — `verifyParentSession()` just trusts the JWT.

Combined with F-1.1, this means a multi-child parent who has child A removed from their account still sees child A in their dashboard (because the localStorage `montree_selected_child` is the local hint), and the dashboard fetches still work because the JWT's `childId` was set to child A at login.

**Why it matters:** Multi-child support is structurally broken on revocation. If a parent has children A and B linked, switches to A in localStorage, then has their link to A removed by the super-admin, the dashboard never notices.

**Fix sketch:** Same as F-1.1. Single `resolveAuthorizedParent` helper that re-verifies link existence each request. Multi-child parents specifically need this because the dashboard switches child via `localStorage.setItem('montree_selected_child', …)` and the next API call must verify the new child too.

---

### F-1.5 — MED — `parent_id` is never validated against `child.school_id`

**Where:** Every parent endpoint that takes a `child_id` from query string.

**What:** `dashboard/route.ts` doesn't take child_id from query — it uses `session.childId`. Good. But `photos/route.ts:14` and several others read `searchParams.get('child_id')` and check `session.childId === childId` (line 28-31). This stops cross-family access via query param, BUT the underlying schema doesn't have a cross-pollination assertion: the JWT was signed for a child who at signup-time was in school X. If that child transfers to school Y, the JWT remains valid and the parent keeps reading new data from school Y until the JWT expires. The parent might have been removed from school X's parents list but the JWT still works.

**Why it matters:** Lower-severity edge case combined with F-1.1. Even with F-1.1 fixed, schools rarely run `montree_parent_children` cleanups when kids transfer.

**Fix sketch:** As part of F-1.1's `resolveAuthorizedParent`, add `WHERE child.is_active = TRUE AND child.school_id = parent.school_id` for full accounts. For invite-only sessions, the invite is already child-scoped so this falls out naturally.

---

### F-1.6 — MED — `montree_parent_invites` `is_active` flag is checked at login but never afterward

**Where:** `app/api/montree/parent/auth/access-code/route.ts:56-58` checks `is_active=true` on the invite lookup. After that, every subsequent dashboard load goes via `verifyParentSession()` which doesn't re-check.

**What:** Same theme as F-1.1, specific to invite-only sessions. A school revokes an invite via super-admin (sets `is_active=false`), but the parent's cookie was minted while it was active. They keep working until cookie expires.

**Fix sketch:** Folded into F-1.1.

---

### F-1.7 — MED — `verifyParentSession` returns null on any error in the try block

**Where:** `lib/montree/verify-parent-request.ts:80-82`

**What:** The outer try/catch swallows ALL errors silently and returns null. If the JWT verification itself throws (which `jose` shouldn't), the route gets a generic 401. Fine. But if the cookie store throws (e.g. invalid encoded characters), the parent gets 401 without any log. Debugging "I can't log in" reports becomes a black box.

**Fix sketch:** Log to `console.warn` before returning null on the catch path. Cheap insurance.

---

## 2. Feature flag enforcement

### F-2.1 — HIGH — `parent_messaging` flag is correctly enforced (verified clean)

**Where:** `lib/montree/parent-messaging/access.ts:88-91`, every messaging route entry.

**What:** When the `parent_messaging` flag is off for the parent's school, `resolveMessagingParent` returns NextResponse 404. All 4 messaging routes (threads, threads/[id], threads/[id]/messages, recipients) gate via this resolver as their first call. Verified by grep:
- `threads/route.ts:50` — gates on resolveMessagingParent in GET, line 228 in POST
- `threads/[threadId]/route.ts:73, 162` — both GET and PATCH
- `threads/[threadId]/messages/route.ts:69, 102` — both GET and POST
- `recipients/route.ts:43` — GET

The frontend page at `messages/page.tsx:86-123` correctly handles the 404 by redirecting to dashboard. No fingerprint of the feature leaks for unflagged schools.

**Verdict:** Verified clean. Architecture works as documented.

---

### F-2.2 — MED — Cross-route flag consistency hole: server can disable parent_messaging mid-session without redirecting active thread viewers

**Where:** `app/montree/parent/messages/[threadId]/page.tsx:113-114` checks status 401/403/404 and redirects to dashboard.

**What:** If a super-admin flips `parent_messaging` from ON to OFF while a parent is actively viewing a thread, the next fetch returns 404 and the page bounces correctly. Good. BUT during the active viewer's tab, the input still works, the optimistic send goes ahead, and the parent sees "✓ sent" while the server actually rejected with 404. Server-side path is correct; client-side optimistic-send doesn't re-check.

**Repro:** Open thread. Have super-admin flip flag off. Type and tap send. Optimistic bubble shows. After ~1s server returns 404. The bubble flips to `sendFailed=true`. The toast says "Could not send" with generic copy. The user has no clue why.

**Fix sketch:** When `handleSend` receives a 404, distinguish from generic send failure by checking the error message or status code, and redirect to dashboard via `router.replace('/montree/parent/dashboard')`. Currently every non-OK response renders the same toast.

---

### F-2.3 — LOW — Feature flag check fail-closed on transient DB errors

**Where:** `lib/montree/parent-messaging/access.ts:87-91`, `lib/montree/features/server.ts isFeatureEnabled()` (not read, but the comment confirms fail-closed).

**What:** If `isFeatureEnabled()` errors (transient DB blip), it presumably returns false and the parent sees the messaging surface as if the flag were off. Acceptable security posture (fail-closed). The user-visible cost is parents getting bounced to dashboard during a DB hiccup.

**Verdict:** Not a bug. Worth surfacing as `console.warn` so transient blips can be tracked.

---

## 3. Report viewing

### F-3.1 — HIGH — Single-report endpoint doesn't filter `status='sent'`

**Where:** `app/api/montree/parent/report/[reportId]/route.ts:147-155`

**What:** The single-report GET reads `montree_weekly_reports` by `id` alone (with maybeSingle) and then checks `report.child_id === session.childId`. It does NOT verify the report's `status`. The `montree_weekly_reports` schema has a `status` column with values `'draft' | 'generating' | 'sent'` etc. The list endpoint at `reports/route.ts:35-37` correctly filters `.or('status.eq.sent,generated_at.not.is.null')`. The single-report endpoint does not.

**Repro:** While a draft report is being generated for a child, the report row exists with `status='draft'` and `content=null`. The parent doesn't see it in their list (filter correct). But if the parent somehow has the UUID (extremely unlikely — UUIDs aren't enumerable), they could open `/api/montree/parent/report/<uuid>` and see draft data.

**Why it matters:** Low practical exploitation surface (parents don't have draft UUIDs). But the principle is broken — viewing layer trusts authn, not authz state. Drafts should be invisible.

**Fix sketch:** Add `.or('status.eq.sent,generated_at.not.is.null')` to the single-report query, mirroring the list endpoint. One line.

---

### F-3.2 — HIGH — Photo filter excludes `pending_review` but admits everything else

**Where:** `app/api/montree/parent/report/[reportId]/route.ts:279, 360, 379`; `photos/route.ts:41`; `dashboard/route.ts:184`.

**What:** Every parent photo query in the portal uses `.or('identification_status.is.null,identification_status.neq.pending_review')`. This excludes only `pending_review`. Per CLAUDE.md (Photo Pipeline section) and `migrations/180_fix_pending_review_constraint.sql`, the full enum is:
- `pending` (initial)
- `pending_review` (queued for teacher)
- `haiku_drafted` (AI tagged, not confirmed)
- `sonnet_drafted` (AI tagged via Sonnet, not confirmed)
- `haiku_matched` (Gate A passed, but teacher hasn't confirmed yet)
- `confirmed` (teacher confirmed)
- `failed`
- NULL (before any pipeline run)

The canonical "approved by teacher" signal — `teacher_confirmed=true` (BOOLEAN column) — is what gets set when a teacher actions a photo via Photo Audit. The current filter admits every photo state except `pending_review`, exposing teacher-untouched AI guesses.

**Repro:** Upload a photo of child A. AI tags it incorrectly as "Cylinder Block 3". `identification_status='haiku_drafted'`, `teacher_confirmed=false`. The parent of child A sees the photo in their dashboard with the wrong work attribution. If the teacher later corrects it to a different child via Photo Audit, the parent of child A has already seen it.

**Why it matters:** Wrong-attribution photos are the worst possible parent experience. The Photo Audit pipeline exists specifically because Haiku gets it wrong sometimes. The current filter makes the audit redundant — parents see the pre-audit version.

The filter would be acceptable if the architectural contract were "parents see what the system thinks". But per the canonical Session 56 / CLAUDE.md rule, parents should see only `teacher_confirmed=true` photos.

**Fix sketch:** Replace `.or('identification_status.is.null,identification_status.neq.pending_review')` with `.eq('teacher_confirmed', true)` on every parent-facing photo query. Five sites:
- `dashboard/route.ts:184` — recentMedia
- `photos/route.ts:41` — gallery
- `report/[reportId]/route.ts:279` — savedContent fallback weekPhotos
- `report/[reportId]/route.ts:360` — junction-table-linked photos (defensive)
- `report/[reportId]/route.ts:379` — fallback by date range

Verify the schema: `teacher_confirmed BOOLEAN DEFAULT FALSE`. Photos pre-Session 56 that don't have this flag set will not appear; check migration history to confirm bulk-confirm of pre-existing photos has run. If not, ship a one-time UPDATE first.

---

### F-3.3 — HIGH — Dashboard endpoint doesn't filter `media_type='photo'`

**Where:** `app/api/montree/parent/dashboard/route.ts:178-186`

**What:** The `recentMedia` query selects from `montree_media` with no `media_type` filter. The `report/[reportId]` route correctly filters at lines 276 and 377. The dashboard does not. The result is mapped to `media_type: 'image' as const` (line 249) which falsely tags videos/audio/documents as images. Client renders them as `<img>`, producing broken thumbnails.

**Repro:** Have a teacher upload a video of the child. The dashboard's recentMedia tiles include the video URL. The `<img src=video.mp4>` fails to render.

**Why it matters:** Cosmetic + confusing. Also potentially a moderation gap if non-image media ends up surfaced. The route lies about `media_type` regardless of what's actually stored.

**Fix sketch:** Add `.eq('media_type', 'photo')` to the dashboard recentMedia query at line 181. Mirror what `report/[reportId]` does.

---

### F-3.4 — HIGH — Photos endpoint doesn't filter `media_type='photo'` either

**Where:** `app/api/montree/parent/photos/route.ts:34-43`

**What:** Same bug as F-3.3 for the standalone photo gallery. The endpoint claims to return "approved photos" but only filters by `parent_visible` and `identification_status`. Videos sneak through if any exist for the child.

**Fix sketch:** Add `.eq('media_type', 'photo')`. One line.

---

### F-3.5 — HIGH — Dashboard endpoint doesn't filter `parent_visible !== false`

**Where:** `app/api/montree/parent/dashboard/route.ts:178-186` vs `photos/route.ts:38`

**What:** The standalone photos route at `photos/route.ts:38` correctly excludes media with `parent_visible=false`. The dashboard route does NOT. A teacher who marks a photo as "not parent-visible" (the toggle exists per migration 138) expects it to vanish from the parent's view. The dashboard recentMedia tile will still show it.

**Repro:** Teacher uploads a photo, then taps "Hide from parents" in some teacher UI (migration 138 added the column; the UI might be elsewhere). `parent_visible=false`. Open parent dashboard — the photo appears in the tile strip.

**Why it matters:** Teachers expect "hide from parents" to be enforced everywhere. The dashboard hole undermines the feature.

**Fix sketch:** Add `.neq('parent_visible', false)` to dashboard recentMedia query. One line.

---

### F-3.6 — MED — Single-report endpoint doesn't enforce `media_type='photo'` on junction-linked photos

**Where:** `app/api/montree/parent/report/[reportId]/route.ts:351-369`

**What:** When report content links specific photos via `montree_report_media`, the endpoint pulls them by `id` only. No `media_type` filter. If a teacher accidentally adds a video to a report via the junction table (whether that's possible via UI or only by direct DB op), it surfaces to the parent.

**Fix sketch:** Add `.eq('media_type', 'photo')` to the `selectedPhotos` query at line 355. Same on the fallback query at line 375 (which does have `.eq('media_type', 'photo')` — partial defence already there).

---

### F-3.7 — MED — `montree_media_children` group-photo join is never queried

**Where:** Every parent photo query. The schema includes `montree_media_children` (per CLAUDE.md: "links group photos to multiple children") but the parent endpoints only filter by `montree_media.child_id`.

**What:** Group photos (e.g. classroom activity captured for many children) are typically saved with a primary `child_id` (or NULL) and additional children attached via `montree_media_children`. Per the schema description, this is how "group photos" multi-attribute. Parent endpoints don't join this table, so:
- Group photos where the focal child has `child_id IS NULL` and the actual attribution comes from `montree_media_children`: NEVER seen by ANY parent.
- Group photos where `montree_media.child_id` points to child A but `montree_media_children` also includes child B: only A's parent sees them.

**Repro:** Need to confirm via schema what the canonical group-photo pattern is. Likely Whale Class has examples.

**Fix sketch:** Add a UNION-style fetch: pull photos where `child_id = $1` OR `id IN (SELECT media_id FROM montree_media_children WHERE child_id = $1)`. Dedupe by `id`. The proxy URLs and rest of the pipeline are unaffected.

---

### F-3.8 — LOW — Locale-based parent-description override only fires for Chinese

**Where:** `app/api/montree/parent/report/[reportId]/route.ts:248-261, 451-462`

**What:** When `locale === 'zh'` and the savedContent's `report_locale !== 'zh'`, the route overrides parent descriptions with the Chinese static map. There's no equivalent for Spanish, French, etc. Multi-locale schools that generated reports in EN and view in ES get EN descriptions even if zh-equivalent static maps exist (Session 65 added Spanish map per CLAUDE.md).

**Verdict:** Cosmetic. Doesn't break security. But it's a TYPE-B locale carryover noted in Session 75.

**Fix sketch:** Use `getLocalizedField()` / `getChineseParentDescription()` extended to all supported locales. See Session 75's "TYPE B sweep" plan.

---

## 4. Messaging

### F-4.1 — HIGH — Invite-only parents cannot message, but no client UI tells them so

**Where:** `lib/montree/parent-messaging/access.ts:62-69`, `app/montree/parent/dashboard/page.tsx` (no link to /messages — by design).

**What:** Per architectural rule, invite-only sessions (`session.parentId === null`) get 403 from `resolveMessagingParent`. The dashboard correctly doesn't link to `/montree/parent/messages` — so well-behaved users don't get there. BUT a parent who bookmarked or guessed the URL hits 403, which the page renders as a redirect to dashboard. This is the right behaviour. But there's no error toast or breadcrumb explaining "messaging requires a full account, not an invite". A motivated parent might be confused.

**Verdict:** Low impact, but worth a UX nudge. Or just verify the redirect is happening cleanly.

**Fix sketch:** In `messages/page.tsx:93-95`, when status is 403, render an inline toast or banner before redirecting: "Messaging requires a parent account — please contact your teacher to set one up." Otherwise it's silent disappearance.

---

### F-4.2 — MED — Optimistic send doesn't replace local id with server id consistently

**Where:** `app/montree/parent/messages/[threadId]/page.tsx:178-217`

**What:** The send path inserts an optimistic message with `tempId = optimistic-{ts}-{rand}`. On success, it replaces by id match. Good. BUT: the server-returned `data.message` has `sender_id` as the parent's UUID, while the optimistic has `sender_id: 'me'`. The render code at line 351 does `myParticipant?.id === msg.sender_id` to identify "me". For the optimistic message, this is FALSE (because `'me'` !== parent UUID), so the bubble renders LEFT-aligned (other-person side) instead of RIGHT-aligned. As soon as the server response replaces the temp, it flips to right. Visible flicker.

**Repro:** Send a message on slow network. Watch the bubble appear on the left side momentarily, then jump to the right.

**Fix sketch:** Set the optimistic's `sender_id` to `myParticipant?.id` instead of `'me'`. The `senderLabel` helper already handles the case correctly (line 232).

---

### F-4.3 — MED — Recipients endpoint always returns a single principal — no transparency about which one

**Where:** `app/api/montree/parent/messages/recipients/route.ts:99-117`

**What:** For schools with multiple principals (rare but possible per CLAUDE.md mentions), the endpoint picks one principal via `ORDER BY last_login DESC NULLS FIRST=false, created_at DESC LIMIT 1`. The parent only sees one principal in their compose modal. If they want to message a different principal, they can't.

**Verdict:** By design per the comment block, matches `addPrincipalObserver` in `thread-resolver.ts`. But the design tradeoff means multi-principal schools have an invisible "default principal".

**Fix sketch:** Either (a) accept the architectural decision and document it, or (b) return all principals + let the parent pick. Option (b) is better UX. Multi-principal schools are otherwise broken on this surface.

---

### F-4.4 — MED — Principal as observer is automatically added on every parent_teacher thread

**Where:** `lib/montree/messaging/thread-resolver.ts:216-248`, called from `createThreadWithParticipants`.

**What:** Architectural rule per Session 96 — principal is auto-observed on every parent ↔ teacher thread. The principal sees the conversation. Parents are NOT told this. The compose modal doesn't disclose "this thread will be visible to your principal".

**Why it matters:** Privacy expectation mismatch. Many parents would assume a thread "to Teacher Jane" is private between them and Teacher Jane. The school's audit-trail policy requires the principal to see it. **Transparency from the school side is a design choice. Transparency to the parent is an ethics + GDPR-ish consideration.**

**Fix sketch:** In the compose modal at `messages/page.tsx`, when role='teacher' is picked, render a small line: "Your principal will also be able to see this conversation. (Schools require this for transparency.)" Settings allow turn-off, but the default disclosure is the right posture.

---

### F-4.5 — LOW — Thread access verification re-queries thread on every request

**Where:** `app/api/montree/parent/messages/threads/[threadId]/route.ts:32-66`, similar pattern in `messages/route.ts:33-62`.

**What:** Each request to a thread view fires:
1. `resolveMessagingParent` → SELECT parent + 2x related tables
2. `verifyParentThreadAccess` → SELECT thread + SELECT participant

So a single page render of `/montree/parent/messages/[threadId]` is doing 5+ Supabase queries before returning. Not a security issue; just chunky.

**Fix sketch:** Combine thread lookup with participant lookup in one query: `SELECT t.*, EXISTS(SELECT 1 FROM montree_message_thread_participants WHERE thread_id = t.id AND participant_role = 'parent' AND participant_id = $1) AS has_participation FROM montree_message_threads t WHERE id = $2 AND school_id = $3`.

---

### F-4.6 — LOW — Mark-read PATCH has no error path

**Where:** `app/api/montree/parent/messages/threads/[threadId]/route.ts:178-185`

**What:** The PATCH updates `last_read_at` with no error capture. If the update fails (transient DB error), the route returns `{ success: true }`. Parent sees thread as read in UI, server still has it unread. Self-corrects on next mark-read.

**Verdict:** Negligible. Worth a `.error` check if hardening.

---

## 5. UX & i18n

### F-5.1 — MED — Hardcoded `STATUS_LABELS` / `STATUS_META` duplicated across pages

**Where:** `app/montree/parent/dashboard/page.tsx:260-281`, `app/montree/parent/report/[reportId]/page.tsx:202-226`

**What:** The status labels (`'Mastered' / '已掌握' / 'Dominado'` etc) are duplicated as inline objects in both files. Two sources of truth that need to stay in sync. Adding French would require editing both.

**Fix sketch:** Extract to `lib/montree/parent/status-labels.ts` keyed by locale, import in both. Or move to i18n keys.

---

### F-5.2 — MED — Locale fallback chain is `locale === 'zh' ? labelZh : label` — only Chinese gets translated

**Where:** `app/montree/parent/dashboard/page.tsx:254-258`, `report/[reportId]/page.tsx:195-199`, `weekly-review/page.tsx:445`

**What:** Same pattern as Session 75's TYPE B issue. Area labels only have `label` (English) and `labelZh`. Spanish/French/etc fall through to English. Per CLAUDE.md the architecture was supposed to use `getAreaLabel(area, locale)` and `getLocalizedWorkName(work, locale)` everywhere by Session 75. The parent portal still has these old ternaries.

**Verdict:** Pre-existing tech debt. Not a parent-specific bug.

**Fix sketch:** Replace ternaries with the canonical helpers per the Session 75 plan.

---

### F-5.3 — MED — `loadFullReport` and `loadReports` aren't memoised by `childId`

**Where:** `app/montree/parent/dashboard/page.tsx:157-219`

**What:** `loadReports` and `loadFullReport` are regular async functions (not useCallback for `loadReports`, which redefines on every render). The `useEffect` at line 197 captures stale `locale`. Switching language while a report is loading can cause race conditions where the older response overrides the newer.

**Fix sketch:** Both functions should be `useCallback`-d with explicit deps. Pattern is consistent throughout Montree; this page is an outlier.

---

### F-5.4 — MED — `formatWeekRange` uses `getIntlLocale(locale)` for date formatting

**Where:** `app/montree/parent/dashboard/page.tsx:283-296`

**What:** Looks fine; uses the locale-aware Intl formatter. But the localStorage hint stores `childName` as `nickname` while DB might have separate `name` and `nickname` fields. The display name shown to parents could differ between sessions if the DB is updated.

**Verdict:** Cosmetic.

---

### F-5.5 — MED — Parent dashboard signs cookie's expiry vs localStorage's expiry independently

**Where:** `app/montree/parent/dashboard/page.tsx:132`, `app/montree/login-select/page.tsx:105`

**What:** localStorage's `expires` is set to `Date.now() + 30d` at login. The httpOnly cookie's `maxAge` is also 30d. The JWT's `exp` claim is 30d. Three different "30 days" that can drift. If the user's clock is wrong, localStorage check at line 132 (`session.expires < Date.now()`) could redirect to login while the cookie + JWT are still valid.

**Verdict:** Edge case. Local clock skew is rare.

**Fix sketch:** Just drop the localStorage check (per F-1.3). The cookie/JWT is the authority.

---

### F-5.6 — LOW — Hardcoded `'Activity photo'` / `'Photo'` strings throughout

**Where:** Multiple lightbox `alt=` attributes use English strings even when locale is non-English.

**Fix sketch:** Translation keys. Minor.

---

### F-5.7 — LOW — No SSR locale hint — pages mount in English then re-render

**Where:** All parent pages are `'use client'` and rely on `useI18n()` for locale. First render before hydration is English.

**Fix sketch:** Per the patterns in CLAUDE.md, the layout should pass `initialMessages` to the provider so non-EN parents don't see English-flash on first paint. Parent layout (`app/montree/parent/layout.tsx`) is currently very thin.

---

## 6. Misc

### F-6.1 — HIGH — Signup link-creation failure is silent

**Where:** `app/api/montree/parent/signup/route.ts:111-128`

**What:** After creating a parent row, the code inserts into `montree_parent_children`. If that fails (`linkError`), it `console.error`s and CONTINUES, marking the invite as used at line 124-127. The result: parent account exists, parent CANNOT see their child (no link), invite is dead.

The parent then can't log in via access-code (the invite is consumed). They try email+password login, succeed, but `montree_parent_children` is empty → empty children list → blank dashboard.

**Repro:** Force the second insert to fail (e.g. transient DB error). Parent calls support saying "I signed up but see no kids".

**Fix sketch:** Wrap the parent insert + parent_children insert in a transaction (single RPC). On link failure, DELETE the parent row and the invite consumption. Return an error to the user so they retry. Alternative: do `parent_children` insert FIRST (after looking up the invite); only mark invite consumed once the link is in place.

---

### F-6.2 — HIGH — Signup doesn't increment invite use_count or respect max_uses

**Where:** `app/api/montree/parent/signup/route.ts:46-58, 123-127`

**What:** The signup route reads `invite.used_by` and refuses if set. It doesn't read or write `use_count` or `max_uses`. The access-code login route at `auth/access-code/route.ts:91-102, 128-134` correctly increments `use_count` and enforces `max_uses`. The two routes treat invite-reuse differently:
- access-code: `is_reusable=true` + `max_uses` semantics
- signup: single-use only, gates on `used_by`

The schema column `is_reusable` is therefore meaningless for the signup path — a reusable invite gets one signup, no matter what `max_uses` says.

**Why it matters:** Schools that set up a "family invite" intending multiple parents (both mom and dad) to sign up against the same code can only do it once via signup. The second parent has to use access-code (read-only invite-mode) and never gets a full account.

**Fix sketch:** Have signup respect the same is_reusable + max_uses semantics as access-code. Increment `use_count`. Mark invite as used only when `use_count >= max_uses` (when max_uses is set).

---

### F-6.3 — MED — Parent stats endpoint excludes pending_review filter

**Where:** `app/api/montree/parent/stats/route.ts:36-39`, vs photos/dashboard/report routes.

**What:** Stats counts `mastered`, `practicing`, total works, recent activity. It uses `montree_child_progress`, not `montree_media`, so the pending_review filter doesn't apply. But — `recent_activity` (lines 56-62) is just the most recent 5 progress rows. If progress rows can be derived from unconfirmed photos (which they can via the resolve flow), an unconfirmed-photo-driven progress entry could surface here.

**Verdict:** Low risk in practice; progress entries are written when a teacher confirms or types in.

---

### F-6.4 — MED — Single-report fallback path uses `verifyChildBelongsToSchool` semantics inconsistently

**Where:** `app/api/montree/parent/report/[reportId]/route.ts:386-403`

**What:** The fallback (regenerate-from-progress) reads `montree_classroom_curriculum_works` by classroom_id. This is correct — only the child's classroom's curriculum is consulted. But the curriculum work names served back to the parent don't go through the `getLocalizedWorkName` helper (per CLAUDE.md Session 78 architecture). They go through `getChineseNameForWork()` and DB Chinese cascade only.

**Verdict:** TYPE B locale debt per Session 75.

---

### F-6.5 — MED — Locale parameter is taken from URL not session

**Where:** `app/api/montree/parent/report/[reportId]/route.ts:138`, `weekly-review/route.ts` (similar pattern)

**What:** `getLocaleFromRequest(request.url)` parses the `?locale=` query param. The frontend at `dashboard/page.tsx:181/200` correctly appends `&locale=${locale}` to every fetch. But this is client-supplied and parents could pass any string. If they pass `&locale=xx`, the server might fall through to English or crash on lookup.

**Verdict:** Likely safe because `getLocaleFromRequest` should validate against `SUPPORTED_LOCALES`. Verify.

---

### F-6.6 — LOW — `console.error('Reports query error:', error)` doesn't mask sensitive data

**Where:** `app/api/montree/parent/reports/route.ts:42`, others.

**What:** Logging error objects can leak schema details. Low risk on Railway. Not a parent-portal-specific issue.

---

### F-6.7 — LOW — No CSRF protection on PATCH/POST routes

**Where:** All mutating routes (`messages/threads POST`, `messages/threads/[id]/messages POST`, `messages/threads/[id] PATCH`, `auth/logout POST`).

**What:** `sameSite: 'lax'` on the cookie protects most cross-site POSTs. But `lax` doesn't protect against same-site CSRF (e.g. malicious comment on a thread that the parent renders elsewhere). The threat surface for parents is small (they only see their own school's data + they don't render attacker content), so CSRF risk is real but very low.

**Verdict:** Acceptable. Note for future.

---

### F-6.8 — LOW — `montree_parent_session` localStorage value is readable by any JS on the page (XSS risk)

**Where:** `app/montree/login-select/page.tsx:102`

**What:** localStorage is per-origin readable. If any XSS lands on `montree.xyz`, the attacker reads `montree_parent_session` and can replay it client-side. The httpOnly cookie is safe from this. Localstorage is the secondary hint, not the auth — but it carries `childId` which is identifying data.

**Fix sketch:** Stop writing childId / childName to localStorage. Server's `/api/montree/parent/auth/access-code` GET returns them on cookie check. Pattern is the same as F-1.3.

---

### F-6.9 — INFO — Vault routes are correctly principal-only

**Where:** `/montree/admin/conversations` and `/api/montree/admin/conversations/*`

**What:** Spot-checked — the vault routes verify principal session (not parent). No leak.

**Verdict:** Verified clean. Parents have no vault access vector.

---

### F-6.10 — INFO — Service worker cache (montree-sw.js) doesn't cache HTML pages

**Where:** `public/montree-sw.js`

**What:** Per Session 76 architectural rule, the SW caches only immutable assets. HTML routes go to network. So parent pages won't serve a cached stale dashboard for one parent to another. Cross-user cache leak verified absent.

**Verdict:** Verified clean.

---

### F-6.11 — INFO — Service worker version is `montree-v8` per Session 113 V2

**Where:** Per CLAUDE.md, `montree-sw.js` was bumped to v8 in Session 113 V2.

**Verdict:** Up to date. No staleness reported.

---

## Prioritised fix table

| # | Severity | Finding | Effort | Files |
|---|----------|---------|--------|-------|
| 1 | CRITICAL | F-1.1 — Re-verify parent↔child link on every endpoint via shared `resolveAuthorizedParent` helper | M | New `lib/montree/parent-auth-strict.ts` + 8 route files |
| 2 | HIGH | F-1.2 — Delete the base64 legacy session fallback | S | `lib/montree/verify-parent-request.ts` |
| 3 | HIGH | F-1.3 — Drop localStorage as auth source; use cookie via `/auth/access-code GET` instead | M | 4 client pages + 1 login source |
| 4 | HIGH | F-3.2 — Switch parent photo queries from `identification_status` filter to `teacher_confirmed=true` | S | 5 query sites across 3 files |
| 5 | HIGH | F-3.3, F-3.4 — Add `media_type='photo'` to dashboard + photos queries | S | 2 lines |
| 6 | HIGH | F-3.5 — Add `parent_visible != false` to dashboard recentMedia query | S | 1 line |
| 7 | HIGH | F-3.1 — Add `status='sent' OR generated_at IS NOT NULL` to single-report endpoint | S | 1 line |
| 8 | HIGH | F-6.1 — Atomic parent + parent_children insert in signup | M | `signup/route.ts` |
| 9 | HIGH | F-6.2 — Make signup respect `is_reusable` + `use_count` + `max_uses` | M | `signup/route.ts` |
| 10 | MED | F-3.6 — Add `media_type='photo'` to junction-linked photo lookup | S | 1 line |
| 11 | MED | F-3.7 — Join `montree_media_children` for group photos | M | 3 photo query sites |
| 12 | MED | F-2.2 — Distinguish 404 from generic send failure in thread send | S | `messages/[threadId]/page.tsx` |
| 13 | MED | F-4.1 — Surface "messaging requires full account" toast for invite-only sessions | S | `messages/page.tsx` |
| 14 | MED | F-4.2 — Set optimistic `sender_id` to real parent UUID | S | 1 line |
| 15 | MED | F-4.3 — Return all principals from recipients endpoint (not just primary) | S | `messages/recipients/route.ts` |
| 16 | MED | F-4.4 — Add principal-transparency disclosure to compose modal | S | `messages/page.tsx` |
| 17 | MED | F-5.1 — Extract STATUS_LABELS/STATUS_META to shared module | S | New helper file |
| 18 | MED | F-5.2 — Replace TYPE-B locale ternaries with `getLocalizedField` | M | Several files; Session 75 carryover |
| 19 | LOW | F-1.7 — Log on `verifyParentSession` catch path | S | 1 line |
| 20 | LOW | F-4.5 — Combine thread + participant lookups | S | 2 sites |
| 21 | LOW | F-6.8 — Stop writing childId to localStorage | S | `login-select/page.tsx` |

---

## Quick wins (< 30 min)

- **Add `media_type='photo'` to dashboard recentMedia query** (F-3.3) — 1 line in `app/api/montree/parent/dashboard/route.ts:181`.
- **Add `media_type='photo'` to photos/route.ts query** (F-3.4) — 1 line.
- **Add `parent_visible !== false` to dashboard recentMedia** (F-3.5) — 1 line. Mirror of `photos/route.ts:38`.
- **Add `status='sent' OR generated_at NOT NULL` to single-report query** (F-3.1) — match the list endpoint pattern.
- **Delete the entire base64 legacy fallback block** in `verifyParentSession` (F-1.2) — 20 lines, easy.
- **Log on the verifyParentSession catch path** (F-1.7) — 1 line.
- **Fix the optimistic-send sender_id** (F-4.2) — change `'me'` to `myParticipant?.id` in `messages/[threadId]/page.tsx:184`.
- **Distinguish 404 from generic send failure** (F-2.2) — small branch in handleSend.

---

## Verified-clean section (what looked fine and why)

- **`resolveMessagingParent` cross-pollination contract** (`lib/montree/parent-messaging/access.ts`): every messaging endpoint correctly filters by `parentId`, `childIds`, and `schoolId`. The parent can ONLY see threads they're a participant in AND about their own children. F-4.* are mostly UX nits; the security model is sound.

- **Parent messaging feature flag enforcement** (F-2.1): all 4 messaging route handlers gate via `resolveMessagingParent` before any DB read. 404 when off. Verified by grep.

- **Single-report `child_id` ownership check** (`report/[reportId]/route.ts:166-168`): `report.child_id !== session.childId` returns 403. This is the right defence given the JWT trust model.

- **Service worker cache scope** (Session 76 / 113 V2): HTML pages are NOT cached, so cross-parent cache poisoning is impossible.

- **Rate limiting on auth routes**: `auth/access-code` (5/15min), `login` (5/15min), `signup` (3/15min). Reasonable for the parent surface.

- **Parent messaging POST forces `ai_drafted=false`** (`messages/threads/[id]/messages/route.ts:152`): correct architectural posture. Parents can't fake "Tracy drafted this" attribution.

- **Compose modal `text-base` font size**: prevents iOS keyboard zoom. Verified at `messages/page.tsx:618, 642` and `messages/[threadId]/page.tsx:445`.

- **`addPrincipalObserver` is idempotent** (`messaging/thread-resolver.ts:236-247`): upsert with `onConflict` clause. Safe to call repeatedly.

- **Parent vault routes don't exist** — the principal-only `/montree/admin/conversations` surface has no parent equivalent. Verified by grep on `app/montree/parent/**`. No leak path.

- **`montree_parents.is_active=false` is enforced on email+password login** (`login/route.ts:58-66`). Disabled accounts can't log in.

- **Parent invite expiry check on access-code login** (`auth/access-code/route.ts:75-87`). Stops fresh logins on expired codes — but see F-1.1 / F-1.6 for the post-login window.

- **`montree_parent_invites.use_count` is incremented on access-code login** (`auth/access-code/route.ts:128-134`). Multi-use invites work via access-code, just not via signup (F-6.2).

---

## Notes for the reader

- **The CRITICAL finding (F-1.1) is the biggest single security gap in the parent portal.** Until fixed, principal revocation actions don't actually revoke. Suggested approach: ship the `resolveAuthorizedParent` helper as a one-day workstream that touches every parent endpoint. Lower-risk than reducing JWT TTL.

- **The HIGH photo-filter findings (F-3.2 through F-3.5) are all one-line fixes.** Ship them all in one commit. Risk: pre-existing photos without `teacher_confirmed=true` will disappear from parent views. Run a one-time backfill SQL (`UPDATE montree_media SET teacher_confirmed = TRUE WHERE teacher_confirmed IS NULL AND identification_status IN ('confirmed', 'haiku_matched')`) to preserve current visibility, then ship the filter.

- **`montree_media_children` group-photo finding (F-3.7) needs schema confirmation** — I didn't deep-dive the schema migration history to verify the join pattern. Worth confirming with the photo pipeline / migration history before fixing.

- **The signup route's atomic-insert issue (F-6.1) is rare in practice** but a real footgun. Worth fixing alongside the invite-reuse work (F-6.2) since they touch the same file.

- **localStorage-as-auth pattern (F-1.3, F-6.8)** has been around since Session 116 per the cookie comment. It's tech debt that should be cleaned up in a focused session, not piecemeal.

- **i18n type-B carryover (F-5.2, F-6.4)** is documented in Session 75 / 78 of CLAUDE.md. Not parent-specific; affects the whole product.

End of audit.
