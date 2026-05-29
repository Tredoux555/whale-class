# Session 114 — Mobile + auth + meeting notes burn (May 17, 2026)

**Session window:** May 17, 2026 (continuation from `SESSION_113_V2_BURN_HANDOFF.md` after the user verified the 113 V2 audit closures and asked to "keep burning").
**Commits pushed to `origin/main`:** 7 (`11ece6ba` → `02e221b4`)
**Migration pending Supabase run:** 1 new (`214_meeting_notes.sql`) + 3 carried over from Session 113 V2 (210, 211, 213)
**Outstanding decision:** Agent → Representative rename (on hold pending user's friend's input)

---

## Headline

Seven focused ships in one continuous burn — none of them mega-features, all of them user-visible quality-of-life or audit closure. The arc:

1. **iPad menu logout fix** — `100vh` → `100dvh` so iOS dynamic toolbars stop clipping the bottom of the dashboard More menu (logout was bouncing out of reach).
2. **Present-mode per-photo hide + revert tray** — teacher can hide a photo mid-meeting, see a "N hidden" pill, tap to bring any of them back.
3. **Mobile screensaver lock overlay** — banking-app pattern. When the phone backgrounds, an immediate Montree-branded full-screen overlay drops in over Astra, parent messages, finance, etc. Tap top-left lock icon to unlock.
4. **Story F-1.2 fully closed** — JWT no longer goes in the URL on new Story logins. Two phases: cookie auth plumbing (Phase A), then login redirect → static path (Phase B). Audit finding closed.
5. **Parent meeting notes (audio-free)** — voice-record a parent meeting, get a Whisper transcript + Sonnet 3-paragraph summary, save the summary (NOT the audio). Teacher-side surface + dropped the principal allow-list so every principal also gets the existing vault.
6. **PWA polish** — offline page rethemed to dark forest; new floating online/offline status banner that pops top-of-viewport when connectivity drops.
7. **Build fix** — Next.js 16 forbids `dynamic({ ssr: false })` in Server Components; AppLockOverlay import simplified.

Plus an architectural conversation that's parked: rename "Agent" → "Representative" across user-facing strings. Two options scoped (Option A keeps code identifiers, Option B is the full rename). On hold pending Tredoux's friend's input.

---

## The 7 commits, in order

```
11ece6ba  Present mode: per-photo hide + revert tray (in-session) + iPad menu fix
e19b6af2  Mobile screensaver: banking-app lock overlay on background/screen-lock
9041cc76  Fix Railway build: AppLockOverlay direct import (Next.js 16 server-component constraint)
db69e65f  Story F-1.2 Phase A: cookie-based auth plumbing (URL JWT migration prep)
de11933c  Story F-1.2 Phase B: drop JWT from URL on new logins (audit finding CLOSED)
0b8465c2  Session 114 — Parent meeting notes (audio-free): teacher surface + drop principal allow-list
02e221b4  PWA polish: offline page retheme + floating online/offline status banner
```

---

## A. iPad menu logout (commit `11ece6ba`)

User report: "I can't log out of my iPad menu on Montree. The menu bounces, the logout is out of view." On iPad Safari the dashboard More menu's bottom items (including Logout) were getting clipped behind the dynamic browser toolbars + home indicator, and the inner scroll was rubber-banding away from them.

Fix in `components/montree/DashboardHeader.tsx` `MENU_PANEL_STYLE`:

- `maxHeight: 'calc(100vh - 80px)'` → `'calc(100dvh - 80px)'`. `dvh` (dynamic viewport height) tracks the real visible area; `vh` does not. Supported on every iPad Safari 15.4+ (2022).
- `paddingBottom: 'calc(6px + env(safe-area-inset-bottom))'` so the iPad home indicator doesn't sit on top of the last row.
- `WebkitOverflowScrolling: 'touch'` — smooth native iOS scrolling.
- `overscrollBehavior: 'contain'` — kills the rubber-band that was snapping scroll away from Logout.

🚨 **Architectural rule:** any scrollable popover that can exceed viewport height needs the 4-pattern combo: `dvh`, safe-area padding, `WebkitOverflowScrolling: 'touch'`, `overscrollBehavior: 'contain'`. AgentNav.tsx doesn't have this pattern (uses a different layout) so it didn't get touched.

---

## B. Present-mode per-photo hide + revert tray (commit `11ece6ba`)

User request mid-meeting: "Is it possible that just for the present function I can delete photos from the album? ... maybe just hide on the album before presentation so I can flick through the photos and hide anything that maybe shouldn't be there ... there should be a revert icon top right just in case something goes wrong."

Designed and shipped Option A (reuse the existing `parent_visible` flag on `montree_media`, no new column, applies to every parent-facing surface).

Changes to `app/montree/dashboard/present/page.tsx`:

- New `hiddenIds: Set<string>` state + `viewable`/`hiddenPhotos` memos. The slideshow renders `viewable` instead of `photos`.
- `Hide` pill in the top strip (between counter + close button). Tap → photo immediately disappears from the slideshow, server-side PATCH to `/api/montree/media` sets `parent_visible=false`. Persists across sessions because the `/api/montree/present/album` route already filters `parent_visible !== false`.
- `↺ N hidden` pill appears top-right when hiddenCount > 0. Tap → tray drops down with thumbnails (dimmed + "Show" overlay). Tap any thumbnail → re-PATCH `parent_visible=true`, photo returns to slideshow.
- Index clamps when viewable shrinks (hiding the last photo doesn't leave the slideshow on a now-missing index).
- `hiddenIds` resets when picking a new child.

🚨 **Architectural rule (cross-session unhide caveat):** the album route filters out `parent_visible=false`, so a photo hidden in one session won't appear in the next session's photo list. In-session unhide works (the tray shows photos hidden THIS session); cross-session unhide requires gallery / photo audit access. This is intentional — the canonical "is this safe for parents" flag persists.

---

## C. Mobile screensaver lock overlay (commits `e19b6af2` + `9041cc76`)

User: "When I open and use the app on my mobile. If I go to lock screen I want the app to show the 'screen saver' as Montree with the login on top left corner icon." Banking-app pattern — overlay snaps in when phone backgrounds/locks, stays until user taps the top-left unlock icon.

New `components/montree/AppLockOverlay.tsx`:

- Listens for `visibilitychange` + `pagehide` events. When `document.hidden === true` → `setLocked(true)`.
- Banking-app behavior (option b): overlay STAYS after the user returns to foreground until they tap the lock icon. Does not auto-clear on `visibilitychange → false`.
- Centered Montree sprout logo + Lora serif "Montree" wordmark + "Tap the lock to come back" hint.
- Top-left small gold lock icon button. Tap → `setLocked(false)`. The httpOnly cookie is still intact — no password retype.
- `pathname`-gated. Locks ONLY on sensitive surfaces (`/montree/admin/*`, `/montree/dashboard/*`, `/montree/agent/*`, `/montree/super-admin/*`, `/montree/parent/{dashboard,photos,report,milestones,messages,...}`). Public surfaces (landing, library, login flows, signup) opt out.
- z-index 99999 — above Astra (9999) and the present-mode overlay (9999).
- Respects `env(safe-area-inset-*)` for notch + home indicator.
- Body scroll locked while overlay is up (page underneath doesn't drift).

Mounted ONCE in `app/montree/layout.tsx`. Self-gates pathname internally.

**Build fix (commit `9041cc76`):** initial commit used `dynamic(() => import(...), { ssr: false })` to lazy-load the overlay. Next.js 16 turbopack errors on this in Server Components ("ssr: false is not allowed with next/dynamic in Server Components"). Fix: direct import. The component is `'use client'` already, so SSR output is null and there's no perf hit from importing it directly.

🚨 **Architectural rule locked in:** in `app/` Server Component layouts/pages, NEVER use `dynamic({ ssr: false })`. Direct import of a `'use client'` component works fine. The `dynamic + ssr: false` pattern is reserved for Client Component callers.

---

## D. Story F-1.2 fully closed — JWT out of URL (commits `db69e65f` + `de11933c`)

The Session 113 V2 audit's biggest remaining HIGH. Story user session JWTs were in the URL path (`/story/<full-24h-JWT>`), leaking through browser history, cross-device sync, link previews, Referer headers, and proxy access logs.

### Phase A — Cookie auth plumbing (`db69e65f`)

`lib/story-db.ts`:

- New `STORY_AUTH_COOKIE = 'story-auth'` constant (mirrors `MONTREE_AUTH_COOKIE` pattern from `lib/montree/server-auth.ts`).
- New `verifyUserTokenFromRequest(req)` — reads `Authorization` header first (legacy URL-token path), falls back to the `story-auth` cookie. Same role gate (REJECT admins) as the existing `verifyUserToken`.
- New `getSessionTokenFromRequest(req)` — same fallback chain, returns the 50-char prefix used by `story_login_logs`.
- New `setStoryAuthCookie(res, token)` + `clearStoryAuthCookie(res)` — httpOnly + secure (prod) + sameSite=lax + 24h maxAge (matches JWT TTL).

`app/api/story/auth/route.ts`:

- POST: sets the httpOnly cookie alongside returning the token in the response body (backward compatible — old client still works).
- DELETE: clears the cookie + accepts the token from either the Authorization header OR the cookie for the logout-tracking lookup.

7 API routes switched from `verifyUserToken(req.headers.get('authorization'))` to `verifyUserTokenFromRequest(req)`:

- `/api/story/current` — BONUS: replaced a local `verifyToken` that wasn't role-gated (admin JWTs were being accepted as user tokens).
- `/api/story/recent-messages` — same bonus fix.
- `/api/story/current-media`
- `/api/story/shared-files`
- `/api/story/heartbeat` — also uses `getSessionTokenFromRequest`.
- `/api/story/message` (POST + GET)
- `/api/story/upload-media`

After Phase A: server fully cookie-aware. Same-origin fetches auto-include the cookie (credentials default to `same-origin`). The URL still contains the JWT for legacy bookmarks.

### Phase B — Drop JWT from URL on new logins (`de11933c`)

Two-line surgical edit:

- `app/story/page.tsx` (login): on POST success, `router.push('/story/active')` instead of `router.push('/story/${data.session}')`. Token still saved to sessionStorage for the Bearer header path; the cookie is the primary auth.
- `app/story/[session]/page.tsx`: `if (!session || session !== params.session)` → `if (!session)`. Drops the URL-equality auth check (that's exactly the leak). The URL path segment is now a route marker only; legacy bookmarks `/story/<JWT>` still work because sessionStorage was populated at login.

After Phase B: new Story logins produce a clean `/story/active` URL with no JWT in the path. Legacy `/story/<JWT>` bookmarks continue working for their JWT's 24h TTL — within a day all clients are on the clean URL.

🚨 **Architectural rules locked in:**

- `STORY_AUTH_COOKIE` is the canonical user-session cookie for the Story system. Mirrors `MONTREE_AUTH_COOKIE`.
- `verifyUserTokenFromRequest(req)` is the canonical user-token verifier on EVERY Story API route. Local `jwtVerify` wrappers were a hidden audit gap because they typically lacked the admin-rejection role gate.
- Header takes precedence over cookie so legacy URL-bookmark sessions keep working through the migration window.
- The Story session URL is `/story/active` for new logins. The `[session]` dynamic route catches legacy bookmarks. Don't put a JWT in the URL again.

**F-1.2 audit finding CLOSED.**

---

## E. Parent Meeting Notes — audio-free (commit `0b8465c2`)

User asked: "Can I build something into Montree that the principal can use and the teachers can use in parents meetings that doesn't actually record the audio but rather saves what was written in summary?"

The principal-side already existed (Session 87's Principal Vault prototype, allow-listed to Tredoux). Session 114 widens that to all principals AND builds the teacher-side equivalent.

### Phase A — Drop the principal allow-list

Edited 4 files to remove `PRINCIPAL_VAULT_ENABLED_FOR` / `VAULT_ENABLED_PRINCIPAL_IDS`:

- `app/montree/admin/layout.tsx` (sidebar gate)
- `app/api/montree/admin/conversations/route.ts` (GET + POST)
- `app/api/montree/admin/conversations/[id]/route.ts` (GET + DELETE)
- `app/api/montree/admin/conversations/transcribe/route.ts` (POST)

Every authenticated principal now sees the Conversations sidebar item. Each principal sets their own vault password on first use — per-record salt + PBKDF2 keeps one principal's records independent of another's. `principal_id + school_id` filters on every query enforce cross-school scoping.

### Phase B — Teacher-side Meeting Notes (new surface)

**Migration `214_meeting_notes.sql` (pending Supabase run):**

New table `montree_meeting_notes` with columns: `id`, `school_id`, `classroom_id`, `teacher_id`, `child_id` (nullable), `child_name`, `meeting_date`, `summary` (required), `transcript` (optional), `notes`, `duration_seconds`, `locale`, `parent_visible` (default false), `shared_to_thread_id` (FK to `montree_message_threads`), `created_at`, `updated_at` + auto-bump trigger.

Three indexes: per-teacher (hot path), per-child (when child_id IS NOT NULL), per-school (future aggregation).

**3 new API routes under `/api/montree/dashboard/conversations`:**

- `/transcribe` (POST) — audio → Whisper → Sonnet 3-paragraph summary. Audio bytes flow request → Whisper → response → discarded. NO Supabase Storage upload anywhere. Tier-gated via `resolveReportModel()` — free tier returns 402.
- `/` (GET, POST) — list + save. Plain text storage (no client-side encryption, different trust model from the principal vault). Surfaces `migration_pending: true` if the table doesn't exist yet.
- `/[id]` (GET, PATCH, DELETE) — read + update + delete. Editable: `notes`, `child_id`, `child_name`, `meeting_date`, `parent_visible`. Summary + transcript are immutable (preserve the "what was said" contract).

**New page `app/montree/dashboard/conversations/page.tsx`:**

- List view: past meetings (newest first), child name + date + duration, parent_visible flag.
- New flow: consent banner → record (MediaRecorder, 16kHz audio/webm or audio/mp4) → Whisper+Sonnet → review (summary + transcript) → save form (child link from classroom roster, meeting date, teacher notes, optional transcript toggle).
- Detail view: summary + auto-save notes + parent-visible toggle + delete.
- Dark forest UI matching the rest of the dashboard. 16px input font (prevents iOS keyboard zoom). 44pt tap targets.
- Consent banner reads: *"Tell the parent first. Recording someone without telling them is illegal in many places, and even where it's legal it's the wrong way to start a relationship. Use this for your own clarity, not as evidence. The audio is never saved — only the summary and your notes."*

**Wired into `components/montree/DashboardHeader.tsx`:**

- New "Meeting Notes" entry in the More menu (Mic icon, right after Parent codes).
- `activePage` mapping updated for `/montree/dashboard/conversations`.

🚨 **Architectural rules locked in:**

- Audio bytes from any transcribe route MUST flow Blob → Whisper → discard, with NO Supabase Storage upload. Verifiable via grep.
- Consent banner is mandatory on every recording surface. Don't ship a recording flow without it.
- Teacher meeting notes are scoped by `teacher_id + school_id` on every query (canonical cross-pollination guard).
- Summary and transcript are immutable after save. PATCH only touches `notes`, `child_id`, `child_name`, `meeting_date`, `parent_visible`.
- Principal vault encryption is per-principal, NOT shared. Each principal sets their own vault password on first use; `VAULT_PASSWORD` env var is NOT used here (that's the Story vault).

**Privacy posture (verified, locked):**

- Audio: NEVER persisted. Whisper sees it for ~30s during processing, OpenAI's default 30-day retention applies on their side (audio leaves us immediately, not stored on our infra).
- Summary: plain text in the DB, visible to the teacher only (and optionally the parent thread when wired).
- Transcript: OPTIONAL on save — teacher can toggle "also save the full transcript" off if they only want the summary.

**Cost per meeting:** ~$0.18 Whisper + ~$0.01 Sonnet for a 30-min meeting. ~$10-15/mo per active teacher at high volume.

**Pending wiring (NOT in this commit):** the `parent_visible` toggle currently flips the flag but doesn't post the summary into the parent thread system (Session 97). The `shared_to_thread_id` column exists in the migration for that future use. Closing the loop is ~30-45 min focused work — flagged as the next-burn candidate but not done here.

---

## F. PWA polish — offline + status banner (commit `02e221b4`)

Two improvements for partial connectivity:

**Offline page retheme (`app/montree/offline/page.tsx`):**

- Light-emerald-on-white → dark forest scheme. Was visually inconsistent — the rest of the PWA is dark forest, but the moment a user lost connectivity they got a bright-white-on-emerald fallback that read "this is a different product."
- Hardcoded emoji icon (📴) → inline cloud-off SVG. Inline SVG matters because the user is offline when they see this page; external assets won't load.
- Gold accent on the "tips" heading + emerald CTA button preserve brand identity.
- Switched from Tailwind classes to inline styles — belt-and-braces in case the precached HTML can't pull its stylesheet from cache.

**Online status banner (`components/montree/OnlineStatusBanner.tsx` — NEW):**

- Floating pill at top of viewport when `navigator.onLine` flips false.
- "You're offline" (amber) persists until connectivity returns.
- "Back online" (emerald) shows for 2.4s then auto-dismisses.
- `pointer-events: none` — never blocks interaction.
- z-index 9998 — under AppLockOverlay (99999) but above everything else.
- Skips on the offline page itself (redundant) and on the parent-meeting presentation view (no chrome during a meeting).
- `'use client'` — SSR output is null until the offline event fires.
- Respects `env(safe-area-inset-top)` so it doesn't tuck under the iOS notch / dynamic island.

Wired into `app/montree/layout.tsx` alongside `AppLockOverlay`.

**Note on coverage:** `navigator.onLine` only reflects the device's network interface state. The "WiFi connected but captive-portaled" case isn't caught — those scenarios will look "online" in this banner but fail on fetches. The `montreeApi()` auto-retry from Session 81 Tier 4.1 (verified still in place at `lib/montree/api.ts:94-141`) handles transient retries; persistent captive-portal failures surface as standard fetch errors in API call paths. This banner is honest about the 95% case (cell signal drop, plane mode, WiFi disconnected).

🚨 **Architectural rule:** the offline page is precached by the service worker. Any future change to it must preserve self-contained rendering (no external font/image fetches that would fail offline). Inline SVG + inline styles + system-stack font is the pattern.

---

## G. Agent → Representative rename (ON HOLD)

User asked whether the rename was done. It wasn't — the system uses "Agent" everywhere (`'agent'` JWT role, `montree_teachers.is_agent`, `agent_password_hash`, `agent_default_share_pct`, `/montree/agent/*` routes, `/api/montree/agent/*` endpoints, the agent referral programme, Mira ("agent's frontline AI"), the "Become an agent" landing page, etc.). Zero hits for "ambassador" in the codebase.

Two options scoped for the user:

**Option A — User-facing strings only.** ~30 min. Rename every place a user actually reads the word: landing page, dashboard labels, emails, marketing copy, application form, Mira's prompt language. Keep code-internal identifiers (`agent_id`, `role: 'agent'`, route paths, DB column names) unchanged. Zero migration risk, no broken JWTs, no broken bookmarks. The product reads as "Representative" everywhere a user sees it.

**Option B — Full rename including code internals.** ~half-day plus a migration. Renames file paths, JWT role string, DB column names. Requires migration window because every existing agent's JWT becomes invalid (role mismatch) and every bookmark to `/montree/agent/*` 404s. Real cost: existing logged-in agents get logged out, principal-agent communication threads need a CHECK constraint widening migration.

**Recommendation: Option A.** Standard pattern when product-marketing terminology drifts from engineering identifiers. Cheap, reversible, zero blast radius.

User said: "okay set it up like that...but maybe before we touch this I'll ask my friend for her opinion. Keep this on hold and keep burning."

**Status: parked.** When the user confirms direction, execute Option A unless they say otherwise.

---

## H. Operational state Tredoux must verify

### 🚨 Migrations pending Supabase run

| Migration | What it does | When it lands |
|---|---|---|
| `210_fix_identification_status_constraint.sql` | Photo pipeline CHECK enum fix (haiku_drafted) | Carried over from Session 113 V2 |
| `211_pipeline_telemetry.sql` | `montree_pipeline_telemetry` table | Carried over from Session 113 V2 |
| `213_outreach_log_retention_and_drip_uniqueness.sql` | Drip race-guard + retention scaffold | Carried over from Session 113 V2 |
| **`214_meeting_notes.sql`** | **NEW** — teacher meeting notes table | Session 114 (this session) |

Until 214 runs: teacher Meeting Notes page surfaces a clear "Migration 214 not yet run" banner. The save path 503s, but list + record + transcribe + summary all work — only the persistence layer waits. Principal vault works without 214 (uses the existing `montree_principal_vault` table from migration 185).

### Production verification checklist (8 steps)

After Railway settles + migrations run:

1. **iPad menu logout** — open `/montree/admin` on iPad, tap More menu, scroll to bottom, confirm Logout is reachable without rubber-band bounce.
2. **Present-mode hide/revert** — open `/montree/dashboard/present`, pick a child, tap Hide on a photo, see "1 hidden" pill, tap pill → tray opens → tap thumbnail → photo returns. Hide one, navigate away, come back → it stays hidden.
3. **Mobile screensaver** — open `/montree/admin` on phone, background the app via home button, return → confirm dark forest overlay with Montree logo + top-left gold lock icon. Tap lock → page returns to where you were.
4. **Story F-1.2** — log into the Story system (teacherpotato.xyz/story). After login, URL should be `/story/active`, NOT `/story/<long-JWT>`. View browser history — no JWT-bearing URLs.
5. **Parent meeting notes — principal side** — log in as any principal (not just Tredoux). See Conversations entry in sidebar. Confirm 401 doesn't fire — the allow-list is gone.
6. **Parent meeting notes — teacher side** — log in as any teacher, open More menu, tap Meeting Notes. Should land on the page; if migration 214 not yet run, see the amber "Migration 214 not yet run" banner.
7. **Offline page retheme** — DevTools → Network → Offline → reload any /montree/* page → confirm dark forest offline page (not the old light-emerald card).
8. **Online status banner** — DevTools → Network → toggle Offline → confirm amber "You're offline" pill at top. Toggle back online → confirm green "Back online" pill for 2.4s.

---

## I. Architectural rules locked in (cumulative — additions this session)

Numbering follows from the Session 113 V2 list (#112-#138 there). New rules:

139. **`100dvh` not `100vh`** on any scrollable popover that can exceed viewport height. `vh` doesn't shrink with iOS dynamic toolbars; `dvh` does. Combine with `paddingBottom: env(safe-area-inset-bottom)`, `WebkitOverflowScrolling: 'touch'`, and `overscrollBehavior: 'contain'` for the full 4-pattern combo.
140. **The `parent_visible` flag on `montree_media` is the canonical "is this safe for parents" signal.** Every parent-facing surface (parent portal photo strip, Weekly Wrap parent strip, presentation view, single-report endpoint) filters on it. Present-mode hide writes to it; gallery exposes it; cross-session unhide requires gallery / photo audit access.
141. **App-lock overlay self-gates pathname.** Mounted once in `app/montree/layout.tsx`. Public surfaces (landing, library, login flows, signup) opt out. Banking-app pattern: overlay STAYS after foreground return until the user taps the unlock icon.
142. **NEVER `dynamic({ ssr: false })` in Server Components** (Next.js 16 constraint). Direct import a `'use client'` component instead — SSR output is null, no perf hit.
143. **`STORY_AUTH_COOKIE = 'story-auth'`** is the canonical Story user-session cookie. `verifyUserTokenFromRequest(req)` is the canonical verifier (header first, cookie fallback, REJECT admins).
144. **Story session URL is `/story/active` for new logins.** The `[session]` dynamic route catches legacy bookmarks. NEVER put a JWT in the URL again.
145. **Principal vault uses per-principal passwords, NOT shared.** Each principal sets their own vault password on first use; per-record salt + PBKDF2 keeps records independent. `VAULT_PASSWORD` env var is for the Story vault (different system entirely).
146. **Audio bytes from any transcribe route MUST flow Blob → Whisper → discard.** NO Supabase Storage upload. Verifiable via grep. The privacy promise depends on this rule.
147. **Consent banner is mandatory on every recording surface.** Hardcoded copy reminds the teacher/principal to inform the other party before pressing record.
148. **Teacher meeting notes scoped by `teacher_id + school_id`** on every query. Summary + transcript are IMMUTABLE after save. PATCH only edits `notes`, `child_id`, `child_name`, `meeting_date`, `parent_visible`.
149. **`navigator.onLine` is honest about the 95% case** (signal drop, plane mode, WiFi disconnected). Captive-portal scenarios fall through to `montreeApi()` auto-retry + standard fetch errors. The status banner is informational, not authoritative reachability.
150. **The offline page must render entirely self-contained** — inline SVG icons, inline styles, system-stack font fallbacks. External resources (fonts, images) won't load when the user sees it.

---

## J. What's NEXT — the burn list after this session

### 🥇 Genuine outstanding work

**Story F-2.3 (last remaining Story HIGH from Session 113 V2 audit).** Vault per-file DEK wrapped by per-admin master KEK. Current single `VAULT_PASSWORD` env var means password rotation requires re-encrypting every file, and no per-admin scoping. Fix: per-file random DEK at upload, wrapped by per-admin KEK (PBKDF2 from each admin's password). New `montree_vault_file_keys(file_id, admin_id, wrapped_dek)` table. Half-day scheme + half-day migration (re-wrap every existing file on first vault unlock after deploy). Requires downtime window. **Schedule as a focused session, not a burn item.**

**Parent-thread integration for meeting notes (this session's natural finisher).** When teacher toggles `parent_visible=true`, find or create the parent_teacher thread (Session 97 messaging) and post the summary as a message. Update `shared_to_thread_id` on the meeting note. Gate on `parent_messaging` feature flag — schools without the flag get the toggle but it's a no-op for now. ~30-45 min. Closes the loop on what Session 114 shipped.

**Agent → Representative rename.** ON HOLD pending user's friend's input. When user confirms, execute Option A (~30 min, user-facing strings only).

### 🥈 Unaudited surfaces (the Session 113 V2 carry-overs)

Each is half-day audit + half-day fixes via subagent:

- **Whale-Class admin SPA pages.** Audit doc flagged ~10 admin pages calling non-existent API routes. Quality-of-life for Tredoux's own daily tool. Mid-priority.
- **Agent dashboard SPA pages.** Audit before more agents onboard. Mid-priority.
- **Super-admin Stripe wiring** (Connect onboard + transfer flow). Real money — touch carefully.
- **Mira self-generated payout statements + agent annual statement export.**
- **Xero sync scaffold + log table.**
- **Recurring op-expense template auto-fire.**
- **Web Vitals data flow** (route → DB → super-admin view).

### 🥉 Photo bank improvements (multi-session carry-over)

- Direct-Supabase-URL inconsistency (photo bank route doesn't use `getProxyUrl()` Cloudflare proxy)
- Delete UX
- Search filter
- Export-to-tool shortcut

Larger scope, half-day to a day.

### 🚫 Things to NOT touch in next session

- Stripe Connect Express flow (live money — risky without dedicated time)
- Photo Pipeline AI prompts (Session 113 V2 reshuffled them materially; let the changes settle and watch metrics)
- Astra + Mira system prompts (recently rewritten)
- Rate-limiter library

---

## K. Cold-resume one-paragraph TL;DR

If you're picking this up cold: Session 114 was a 7-commit burn covering iPad menu, present-mode photo hide, mobile screensaver, Story F-1.2 closure, parent meeting notes (audio-free, both principal + teacher), and PWA polish. Migration 214 is pending Supabase run (`migrations/214_meeting_notes.sql`) — until it runs, the teacher Meeting Notes page surfaces a clear pending banner. The principal vault now works for every principal (allow-list dropped). Agent → Representative rename is parked pending the user's friend's input — Option A (user-facing strings only, ~30 min) is the recommended execution when ready. The natural next-burn finisher is parent-thread integration for meeting notes (wires the `parent_visible` toggle to actually post the summary into the parent_teacher thread system).

End of Session 114 handoff.
