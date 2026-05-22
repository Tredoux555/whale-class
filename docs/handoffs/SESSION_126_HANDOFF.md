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
