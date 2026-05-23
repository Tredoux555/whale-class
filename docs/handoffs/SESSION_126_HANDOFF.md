# SESSION 126 HANDOFF — Vocabulary Flashcard crop fix + Story Voice Calls (May 22, 2026)

**3 commits pushed to main:** `cc928378` → `cecc5810` → `e06f6f01`. Two distinct pieces of work: a small flashcard image-sizing fix, and a full voice-calling system for the Story app.

---

## 🚨 ONE migration pending Supabase run

**`migrations/228_story_calls.sql`** — creates the `story_calls` table that the Story voice-call signalling depends on. Run it in the Supabase SQL Editor. Idempotent. Until it's run, the admin "Call" button surfaces but returns "Could not start the call" (no crash — graceful). Everything else (the flashcard fix) needs nothing.

---

## A. Vocabulary Flashcard image crop fix (`cc928378`)

**Problem:** the Vocabulary Flashcard Maker printed images cropped — a velociraptor card lost its head and tail.

**Root cause:** the print HTML used `object-fit: cover` on the card image. `cover` fills the box and crops the overflow. The image-area box is ~2:1 (271mm × 136mm — one card per A4-landscape page, minus a fixed 40mm label area); almost no photo matches that ratio, so `cover` always crops.

**Fix:** `object-fit: cover` → `object-fit: contain` in the print CSS (whole image fits, letterboxed onto the already-white `.image-area` background → invisible), and `object-cover` → `object-contain` on the preview-grid thumbnails so the preview matches the print.

**3 independent copies all fixed** — 6 edits total:
- `app/montree/library/tools/vocabulary-flashcards/page.tsx`
- `app/admin/vocabulary-flashcards/page.tsx`
- `app/montree/dashboard/vocabulary-flashcards/page.tsx`

**🚨 Architectural rule:** flashcard/print card images use `object-fit: contain` on a white box — never `cover`. The 3 vocabulary-flashcard files are independent copies; fix all 3 together.

---

## B. Story Voice Calls — full build (`cecc5810`)

In-app voice calling for the Story system: admin (Tredoux) ↔ one Story user. Asked for as voice calls; built voice-only.

### The decision: reuse the engine, fresh UI

The genuinely hard, security-sensitive part — the Agora project, server-side token minting, UID derivation — is **reused wholesale** from Montree (`lib/montree/appointments/agora/config.ts` + `token-builder.ts`, both fully generic).

The call **UI is a fresh, lean, voice-only component** (`StoryVoiceCall.tsx`) — NOT a retrofit of Montree's `AgoraVideoCall.tsx`. Why: that component calls Montree's `useI18n()` (would break outside the Montree i18n provider — Story has none), is recording-coupled, and is video-first. Voice-only is dramatically simpler — it sidesteps the entire video render-race machinery (rule #211) because remote audio plays with no DOM mount.

### Identity & channel model

- A call is admin ↔ one Story user, keyed by `username` (Story keys everything by username — see `story_online_sessions`).
- Channel: `story-` + 20 chars base64url entropy (~120 bits), generated at call creation, stored on the row. Montree uses `montree-`; Story uses `story-` — no collision.
- UID: `deriveAgoraUid('story-admin', adminUsername)` vs `deriveAgoraUid('story-user', username)` — distinct role prefixes guarantee the two participants never hash to the same Agora UID.

### Files

**NEW:**
| Path | Role |
|------|------|
| `migrations/228_story_calls.sql` | `story_calls` table (id, username, channel, status ringing/active/ended, initiated_by, timestamps) + partial index + updated_at trigger |
| `app/api/story/agora-token/route.ts` | Mints an Agora token for admin OR user. `?as=admin\|user` mandatory. Verifies caller against the call row; flips ringing→active when the user joins. |
| `app/api/story/admin/call/route.ts` | Admin starts a call (`{username}` → ringing row + channel) or ends one (`{callId,action:'end'}`). Admin-auth gated. Supersedes stale calls to the same user. |
| `app/api/story/current-call/route.ts` | GET = the user's RINGING call (banner poll). POST = user declines/ends. User-auth gated. |
| `components/story/StoryVoiceCall.tsx` | Voice-only Agora call UI — mic, mute, hang-up, call timer, remote-present detection. `agora-rtc-sdk-ng` dynamic-imported. No video, no recording, no i18n. |
| `app/story/call/page.tsx` | The call surface. Reads `?call` & `?as` from `window.location`, pulls the right sessionStorage token, mounts StoryVoiceCall fullscreen. |

**EDITED:**
| Path | Change |
|------|--------|
| `app/story/admin/dashboard/components/OnlineUsersTab.tsx` | 📞 Call button per online student → POSTs `/api/story/admin/call` → navigates to `/story/call?...&as=admin` |
| `app/story/admin/dashboard/page.tsx` | Passes `getSession` to OnlineUsersTab (one line) |
| `app/story/[session]/page.tsx` | `incomingCall` state + `loadCurrentCall` + `declineCall` + a 5s poll + a fixed green incoming-call banner (Join / Decline) |

### The flow

1. Admin: `/story/admin` → dashboard → **👥 Active Students** tab (default) → **📞 Call** on an online student.
2. A `ringing` `story_calls` row is created; admin lands on `/story/call?as=admin`, "Calling…".
3. The student's Story page polls `/api/story/current-call` every 5s → green "Tredoux is calling you" banner with Join / Decline.
4. Join → `/story/call?as=user` → `StoryVoiceCall` fetches a token (flips the call ringing→active), joins the Agora channel, publishes mic.
5. Both connected — voice live, mute + hang up. Hang up reports the call ended; the other side gets `user-left`.

### Auth & cross-pollination

- `agora-token`: `?as` hint routes to the right verifier. `verifyAdminToken` requires `role=admin`; `verifyUserTokenFromRequest` rejects `role=admin` — a token sent down the wrong path fails cleanly. A user can only mint a token for a call where `call.username === their username` (else 403).
- `current-call` POST scoped `.eq('username', username)` — a user can only end a call addressed to them.
- `admin/call` is admin-only. Users cannot start a call.

---

## C. Audit fixes (`e06f6f01`)

Re-read all 9 files. Two real bugs found and fixed:

1. **`user-left` timer leak** (`StoryVoiceCall.tsx`) — the 1.6s "call ended" teardown timer wasn't cancelled on unmount. Manual hang-up inside that window would fire `hangUp()` on a dead component (double `router.push`, stale `setState`). Now tracked in `leaveTimerRef` and cleared in the effect cleanup.

2. **Zombie "ongoing call" banner** (`current-call` GET) — the GET returned `ringing` AND `active` calls. If both parties closed their tab mid-call without hanging up, the row stays `active` forever and the user's banner would show "Ongoing call" indefinitely. Fixed: the banner GET returns **ringing-only** — an incoming-call ringer has no job once the call is live, so a never-cleaned-up `active` call simply never surfaces.

Verified solid (no change): auth/cross-pollination, channel uniqueness, token refresh, migration idempotency, the init effect being `[]`-guarded so a changing `onClose` can't tear the call down.

---

## 🚨 Architectural rules locked in this session

1. **Flashcard print images use `object-fit: contain` on a white box — never `cover`.** The 3 vocabulary-flashcard files are independent copies; fix together.
2. **Story voice calls reuse the Agora ENGINE** (`lib/montree/appointments/agora/config.ts` + `token-builder.ts`) but have their own **voice-only UI** (`StoryVoiceCall.tsx`). Do NOT route Story through Montree's `AgoraVideoCall` — it's i18n/recording/video-coupled.
3. **`/api/story/agora-token` requires an explicit `?as=admin|user` hint.** Never guess identity from whichever cookie is present (the Montree rule #221 lesson — guessing collapses both sides to one UID).
4. **Story channels are `story-`-prefixed**; Montree channels are `montree-`. UID role prefixes are `story-admin` / `story-user`.
5. **`current-call` GET returns `ringing`-only.** Reporting `active` calls to the banner re-introduces the zombie-banner bug.
6. **Story calls are voice-only by design** — no camera, no video, no recording.
7. **`StoryVoiceCall`'s init effect is mount-once** (`[]` deps + `initRef` guard). It must NOT depend on parent callbacks — re-running would tear the live call down via the cleanup.
8. **`story_calls` keys by `username` TEXT, no FK** — consistent with `story_online_sessions` and the rest of the Story schema.

---

## Verification checklist (after migration 228 + Railway deploy)

**Flashcard fix:**
1. `montree.xyz/montree/library/tools/vocabulary-flashcards` → regenerate a deck → the velociraptor (and every card) prints whole, centred on white. Preview thumbnails match the print.

**Story voice calls (needs two devices / two browser profiles):**
2. Run `migrations/228_story_calls.sql` in Supabase.
3. Device A: sign in at `/story/admin` → dashboard → Active Students tab. Device B: sign in as a Story user, leave their Story page open.
4. Device A: tap 📞 Call on that student → lands on the call screen "Calling…".
5. Device B: within ~5s a green "[admin] is calling you" banner appears → tap Join.
6. Both connected → voice audible both ways → mute toggles → hang up ends the call cleanly on both sides.
7. Decline path: start another call, tap Decline on device B → banner clears.

---

## Known limitations (gaps, not bugs — decide whether to close)

1. **No "declined / no answer" feedback to the admin.** If the student declines or never answers, the admin sees "Calling…" until they hang up themselves. Closing it cleanly needs the admin call screen to poll call status (a new admin-facing status endpoint). ~30–45 min follow-up.
2. **Remote-audio autoplay** has no explicit `autoplay-failed` "tap to unmute" fallback. Matches Montree's production component; low risk (granting mic permission usually unlocks audio).
3. **Mic-permission-denied after channel join** — the user's side errors cleanly but the call row isn't auto-marked ended; the admin hangs up manually. Low frequency.
4. **Calling is online-only by design** — a student must have their Story page open (heartbeat in last 5 min) to appear in Active Students AND to receive the ring. Correct, not a gap.

---

## Next-session priorities

1. **Run migration 228** + walk the verification checklist on two devices.
2. **Optional: close limitation #1** — admin "declined / no answer" feedback.
3. Carry-overs from Session 125 (unchanged): `demo/*` + super-admin home-link/toggle sweep; duplicate-key cleanup in `en.ts` + locale files; i18n the library tool pages; Stage A Agora activation; Mira → Tracy super-admin scope; outreach follow-ups (FAMM Argentina, Cambridge Montessori Global, Otari NZ, Lions Gate, Montessori Norge).

---

# CONTINUATION — Call button ungated + Web Push notifications

**2 further commits:** `4a6b896f` (call button ungated) → `8ab35d59` (Web Push).

## D. Call button ungated (`4a6b896f`)

The admin Call button was rendered only per *online* user, and "online" = a heartbeat within 5 min — which wasn't registering reliably (both parties were online a long time, no button appeared). Fixed: the dashboard tab (renamed **👥 Active Students → 👥 Students**) now lists **every `story_users` user** with a 📞 Call button, online or offline. Online/offline is just a coloured dot now, never a gate.

- NEW `app/api/story/admin/users/route.ts` — `GET`, admin-auth, returns the `story_users` roster.
- `OnlineUsersTab.tsx` — fetches the full roster, cross-references the existing online poll for the dot, Call button on every row.

## E. Web Push notifications (`8ab35d59`)

Story is a PWA that registered **no service worker** — push needed one built. Now: admin places a call → the user gets a notification on their phone even with the Story app closed.

**6 new files:**
| Path | Role |
|------|------|
| `migrations/229_story_push_subscriptions.sql` | Subscription store, keyed by username, `endpoint` UNIQUE |
| `public/story-sw.js` | Push-ONLY service worker — `push` shows the call notification, `notificationclick` opens `/story/call`. No fetch interception. Scope `/story/`. |
| `lib/story/push.ts` | `sendCallPush` / `isPushConfigured` / `getVapidPublicKey`. Opt-in by env. Prunes dead (404/410) subscriptions. |
| `app/api/story/push/public-key/route.ts` | Serves the VAPID public key to the browser |
| `app/api/story/push/subscribe/route.ts` | User-auth; upserts the push subscription on `endpoint` |
| `components/story/EnableNotificationsButton.tsx` | One-tap opt-in — registers SW, requests permission, subscribes, saves. iOS-unsupported → "add to Home Screen" hint. |

**5 edited:** `package.json` (+`web-push`, +`@types/web-push`); `app/api/story/admin/call/route.ts` (fire-and-forget `sendCallPush` after the call is created); `app/story/[session]/page.tsx` (renders the opt-in button); `app/story/call/page.tsx` + `components/story/StoryVoiceCall.tsx` (user side no longer hard-requires the sessionStorage token — falls back to the `story-auth` cookie, so a notification tap opening a fresh window still authenticates).

**iOS reality:** Web Push works ONLY inside the PWA installed to the Home Screen (iOS 16.4+) — not a Safari tab. It's a notification banner, not a ringing-call screen. The opt-in button detects an unsupported context and shows the install hint.

## 🚨 Operational steps to make push live

1. **Run migrations 228 + 229** in Supabase.
2. **Set Railway env vars:**
   - `STORY_VAPID_PUBLIC_KEY` = `BNEvphJMjw8wAn-kQn_ZE8iemJflT9d9YV2IcsEh9uigcGIviAZoPNYIdTVfdXnCu-O1Bs2Gt_-sk9SidtQFhk4`
   - `STORY_VAPID_PRIVATE_KEY` = (the private key — supplied to Tredoux in chat; a credential, kept out of git)
   - `STORY_VAPID_SUBJECT` = optional, defaults to `mailto:tredoux555@gmail.com`
3. The Story user installs the PWA to their Home Screen, opens it from the icon, taps **🔔 Enable call notifications**, grants permission.
4. 2-device test: admin → 👥 Students → 📞 Call → the user's phone shows a notification → tap → joins.

Until the VAPID env is set, push is inert and the call falls back to the 5s poll-based banner (works only if the user's Story page is open).

## 🚨 Architectural rules (continuation)

- `public/story-sw.js` is push-ONLY — no fetch interception, no caching. Never add caching.
- `sendCallPush` is fire-and-forget — a push failure never blocks the call.
- VAPID private key lives ONLY in Railway env — never git/CLAUDE.md.
- Web Push is opt-in by env — absent VAPID env → inert, poll banner still works.
- The Story Call button is NOT gated on online status; `story_users` is the roster.
- The call page must not hard-block `as=user` on a missing sessionStorage token — the `story-auth` cookie is the fallback that makes the notification-tap flow work.

---

# CONTINUATION 2 — Call-500 diagnosed + voice/video choice (May 23)

**1 commit:** `a56d0e68`.

## The "Could not start the call" 500 — root cause

Verified against the production DB via the Supabase REST API:
| Table | HTTP |
|-------|------|
| `story_calls` | **404 — does not exist** |
| `story_push_subscriptions` | 200 |
| `story_users` | 200 |

**Migration 229 ran; migration 228 did NOT.** The 500 is `/api/story/admin/call`'s INSERT into the non-existent `story_calls` table. The console `5× 500 on /api/story/admin/call` and the "Could not start the call." alert are exactly that.

Could not run 228 from the dev environment — the direct DB host `db.<project>.supabase.co` doesn't resolve from the user's network. **Fix: run `migrations/228_story_calls.sql` in the Supabase SQL Editor.**

## Migration 228 amended

Since 228 never ran anywhere, the file was amended (safe — it's effectively still a draft): it now also creates a `mode TEXT NOT NULL DEFAULT 'voice' CHECK (mode IN ('voice','video'))` column, plus an idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS mode`. **One run of the current file fixes the 500 AND lands the video-call schema.**

## Voice / video choice

- Admin **👥 Students** tab: two buttons per user — **📞 Voice** (emerald) and **📹 Video** (indigo).
- `mode` flows end to end: `admin/call` stores it on the row → `agora-token` + `current-call` return it → `sendCallPush` words the notification ("voice call" / "video call") → the incoming-call banner shows 📹/📞 + the label.
- `components/story/StoryVoiceCall.tsx` rewritten to handle both: voice = the avatar UI (unchanged); video = full-bleed remote video + local self-view PiP + a camera toggle. Remote-video render race handled with the stash-track + `videoTick` + deferred-play-effect pattern (rule #211). Camera denied/missing degrades to audio — never fails the call.

## Push notifications — still inert (Railway env)

The "🔔 Enable call notifications" button showed **"Call notifications aren't switched on yet"** — that's a 503 from `/api/story/push/public-key`, i.e. `STORY_VAPID_PUBLIC_KEY` / `STORY_VAPID_PRIVATE_KEY` are **not set in Railway**. Adding the PWA to the Home Screen is necessary but not sufficient. The VAPID env vars must be set server-side (values in CONTINUATION above).

## Operational steps (user)

1. Run `migrations/228_story_calls.sql` (current amended file) in the Supabase SQL Editor → fixes the 500 + video schema.
2. Set `STORY_VAPID_PUBLIC_KEY` + `STORY_VAPID_PRIVATE_KEY` in Railway → enables push.
3. 2-device test: admin → 👥 Students → 📞 Voice / 📹 Video → student joins.

---

# CONTINUATION 3 — verified live (May 23)

No new commits. The user ran migration 228 + set the VAPID env vars; this is the verification + the final state.

**Verified against production:**
- `story_calls` table → Supabase REST API HTTP 200, `mode` column present. The "Could not start the call" 500 is resolved.
- `montree.xyz/api/story/push/public-key` → HTTP 200 (returns the VAPID key) → `STORY_VAPID_PUBLIC_KEY` + `STORY_VAPID_PRIVATE_KEY` are set in Railway. Web Push is configured server-side.
- `montree.xyz/story/admin/dashboard` → HTTP 200; `montree.xyz/api/story/*` → 200. Story is fully live on montree.xyz.

**🚨 The remaining gotcha — domain. Use `montree.xyz`, NOT `teacherpotato.xyz`.**
teacherpotato.xyz (the old domain) is currently not serving — every `/api/*` returns 404 and the Story page itself returns HTTP 000 (connection failure). The earlier "Could not start the call" 500s were on teacherpotato.xyz back when it still served a stale build + the table was missing. The Story system — admin dashboard, user pages, and the home-screen PWA — must all be used on **montree.xyz**. If the Story PWA was added to the Home Screen from teacherpotato.xyz, re-add it from `montree.xyz/story`; calls + push only work on the live domain.

**Status: Story voice + video calls — code-complete, deployed, migrations run, env set, verified.**
Remaining (all non-blocking): a 2-device end-to-end test on montree.xyz; the "declined / no answer" admin-feedback gap; optionally re-point or retire the teacherpotato.xyz domain in Railway.
