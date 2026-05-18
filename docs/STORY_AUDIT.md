# Story System — Deep Triple Audit

**Date:** 2026-05-16
**Scope:** Read-only investigation of `app/story/**` pages, `app/api/story/**` routes, `lib/story-*` and `lib/story/**`, the Story-specific migrations, and the supporting tables (`story_users`, `story_admin_users`, `story_message_history`, `story_login_logs`, `story_admin_login_logs`, `story_online_sessions`, `story_visits`, `story_shared_files`, `vault_files`, `vault_audit_log`, `vault_unlock_attempts`).
**Status:** READ-ONLY. No code changes were made. This document is a recommendation surface — the user picks what to ship.

---

## Executive summary

Top issues by severity (full detail below):

1. **CRITICAL — Any logged-in user can impersonate any author on the broadcast hidden_message.** `POST /api/story/message` accepts `author` from the request body and writes it straight into `secret_stories.message_author`. The "decode the T" reveal on the parent page shows whatever name the attacker chose. A user can post a "message from Tredoux" to every other user in the same week's classroom story — encrypted with the system key, indistinguishable from a real admin message after decryption. The story page renders `messageAuthor` verbatim into the hidden-message panel; if multiple parents share the system, the attack is invisible.

2. **HIGH — The full 24h Bearer JWT is in the URL bar at `/story/<full-JWT>` and in every browser history entry, server log line, referrer header to image hosts, and screen recording.** `app/story/page.tsx` line 29 navigates to `/story/${data.session}`. `app/story/[session]/page.tsx` enforces `params.session === sessionStorage.getItem('story_session')` — so the URL token IS the session token. Any external image embedded in the page (or any link the user clicks out) leaks the token via Referer. Browser sync (Chrome account, Safari iCloud) ships the URL — including the JWT — across devices. Telegram/WhatsApp link previews fetch the URL on the receiver's behalf.

3. **HIGH — `/api/story/admin/vault/save-from-message` is an unconstrained SSRF reachable by any admin.** The route does `fetch(mediaUrl)` on a body field with no allowlist, no URL parsing, no host check. An authenticated admin (or anyone who steals an admin token — see #2) can pivot to internal Railway services, AWS metadata at 169.254.169.254, internal Supabase admin endpoints, file://, or other private addresses. The fetched bytes are then encrypted and stored as a "vault file" — so the response leaks back via vault download. This is a full read-side SSRF.

Overall posture: the Story system is the smallest surface in the codebase but carries asymmetric risk — admin broadcasts reach every logged-in family at once, and the vault holds sensitive material under a single shared password. The auth model has THREE different `verifyAdminToken`/`verifyStoryAdminToken`/`verifyToken` implementations across `lib/story-auth.ts`, `lib/story-db.ts`, `lib/story/auth.ts`, `lib/story/story-admin-auth.ts`, and three route-local copies — each with subtly different rules (one checks `type: 'admin'`, the others check `role: 'admin'`, one uses an optional separate `STORY_ADMIN_JWT_SECRET`, two accept cookies, the rest are header-only). This duplication is the root of multiple findings below.

---

## Architecture as built

### The user journey

```
1. Parent lands on /story → enters username + access code
2. POST /api/story/auth → bcrypt-compares against story_users → mints
   JWT { username } signed with STORY_JWT_SECRET (24h)
3. Returns { session: <JWT> } in JSON body
4. Frontend writes the JWT to sessionStorage('story_session')
   AND navigates to /story/<JWT>  ← FULL JWT IN URL
5. [session]/page.tsx checks params.session === storage.story_session
   (sanity), then loads story + media + recent messages + heartbeat
6. Every 30s POST /api/story/heartbeat updates story_online_sessions
   and self-heals story_login_logs if missing
7. Letter taps reveal hidden_message, open a compose field (POST
   /api/story/message), open recent messages, or open the media bay
8. Media uploads → POST /api/story/upload-media — 500MB cap, 24h TTL
```

### The admin journey

```
1. /story/admin → enters admin username + password
2. POST /api/story/admin/auth → bcrypt against story_admin_users →
   mints JWT { username, role: 'admin' } signed with STORY_JWT_SECRET (24h)
3. Returns { session: <JWT> } in JSON body
   AND sets HttpOnly cookie 'story-admin-token' (Phase 7 hardening)
4. Frontend writes JWT to sessionStorage('story_admin_session')
5. /story/admin/dashboard → on visibility-loss, locks screen with
   fake "Whale Class" Montree roster overlay. Tapping MaoMao unlocks.
   Pure client-side — session still in storage, real DOM still in DOM.
6. Admin tabs: Online users / Activity logs / Messages / Vault /
   Files / System controls. Each polls every 5-10s while active.
7. POST /api/story/admin/send → broadcast text/image/video/audio/document.
   Triggers a Sonnet-style cascade: insert story_message_history +
   upsert secret_stories.hidden_message + setCurrentWeek
8. POST /api/story/admin/vault/unlock with VAULT_PASSWORD → mints a
   1h "vaultToken" JWT { vaultAccess, encryptionKey }, but the
   download/list/upload routes DO NOT CHECK the vaultToken — they only
   check the admin token.
```

### Auth model — the four verify functions

| File | Function | Secret | Role check | Cookie support |
|---|---|---|---|---|
| `lib/story-auth.ts:19` | `verifyToken(token)` | `STORY_JWT_SECRET` | returns `{ username, type? }` — NO role gate | header-only (string in/string out) |
| `lib/story-db.ts:32` | `verifyAdminToken(authHeader)` | `STORY_JWT_SECRET` | `payload.role !== 'admin'` → null | header-only |
| `lib/story-db.ts:45` | `verifyUserToken(authHeader)` | `STORY_JWT_SECRET` | NO role check — returns username from ANY valid JWT | header-only |
| `lib/story/auth.ts:47/56` | `verifyUserToken`/`verifyAdminToken` | `STORY_ADMIN_JWT_SECRET` falls back to `STORY_JWT_SECRET` | yes | header-only |
| `lib/story/story-admin-auth.ts:28` | `verifyStoryAdminToken` | `STORY_JWT_SECRET` | yes | header-only |
| `app/api/story/admin/auth/route.ts:GET` | inline | `STORY_JWT_SECRET` | yes | **BOTH** header AND `story-admin-token` cookie |
| `app/api/story/current/route.ts:23` | inline `verifyToken` | `STORY_JWT_SECRET` | NO role gate | **header AND `story-admin-token` cookie** |
| `app/api/story/recent-messages/route.ts:17` | inline `verifyToken` | `STORY_JWT_SECRET` | NO role gate | header AND cookie |
| `app/api/story/admin/message-history/route.ts:13` | inline `verifyAdminToken` | `STORY_JWT_SECRET` | yes | header-only |
| `app/api/story/admin/send/route.ts:144` | `verifyStoryAdminToken` (from `lib/story/story-admin-auth.ts`) | `STORY_JWT_SECRET` | yes | header-only |

The duplication itself is not a bug. The mismatch is — see F-1.1.

---

## Findings

### 1. Cross-file consistency / auth

#### F-1.1 — CRITICAL — `POST /api/story/message` lets any logged-in user impersonate any author on the broadcast

**Where:** `app/api/story/message/route.ts:14-56`
**What:** The user-side `message` route accepts a JSON body `{ message, author }`. Line 26: `const msgAuthor = author || username;`. Both the `story_message_history` row AND the `secret_stories.hidden_message` are written with this attacker-controlled author. The parent page then surfaces `secret_stories.message_author` as the byline on the "decoded" message reveal. Encryption happens BEFORE the impersonation — `encryptMessage(trimmedMsg)` is signed with the system key, so the message is indistinguishable from a legitimate one once decrypted. The story page renders `messageAuthor` via `{messageAuthor}` (escaped by React, no XSS) but the *trust signal* is destroyed.
**Repro:**
```bash
# As any logged-in parent:
curl -X POST https://teacherpotato.xyz/api/story/message \
  -H "Authorization: Bearer <user-JWT>" \
  -H "Content-Type: application/json" \
  -d '{"message":"School closed tomorrow due to maintenance","author":"Tredoux"}'
# Every other parent in the same week now sees a "Tredoux" hidden message.
```
**Why it matters:** This is a social-engineering primitive. The Story system is used to broadcast genuine teacher messages; if any parent can author one, parents can fake announcements that look authoritative. The DB row also poisons admin's `MessagesTab` because `author` is stored verbatim. Two-week parent-side investigation if the fake message says something time-sensitive.
**Fix sketch:** Drop `author` from the accepted body. Server-side: `const msgAuthor = username;` always. The `is_from_admin` column (migration `20260118_story_session_linking.sql:44`) should be set `false` on this path and `true` on `admin/send/route.ts`. The current code path never sets `is_from_admin` — set it explicitly on both routes. UI on the story page should display the byline ONLY for `is_from_admin=true` messages.

---

#### F-1.2 — HIGH — Story JWT exposed in URL as `/story/<full-JWT>`

**Where:** `app/story/page.tsx:29`, `app/story/[session]/page.tsx:218-222`
**What:** After successful login, `router.push(\`/story/${data.session}\`)` plants the full Bearer JWT into the URL path. The `[session]/page.tsx` then validates `params.session === sessionStorage.getItem('story_session')` to refuse access on cold-load with no storage. This makes the URL the storage. Consequences:
- Browser history (Chrome/Safari/Firefox) preserves the URL with the JWT for ~90 days.
- Browser sync (Chrome account, Safari iCloud, Firefox Sync) replicates the URL with the JWT to every signed-in device.
- Any external `<img src>` or external `<a href>` on the page leaks the URL via the Referer header (the page renders user-uploaded media + admin-uploaded media, both via `getProxyUrl` which is same-origin — but if a future change adds a "Share to Telegram" or "Open in maps" link, the JWT flows out).
- Server access logs (Railway, Cloudflare, Supabase Storage) record the full URL.
- iOS/Android share sheet preview, link previews in WhatsApp/Telegram/iMessage, screen-recording during a demo — all leak the JWT.
- The JWT is valid for 24h and there's no per-session revocation.
**Repro:** Log in, copy the URL bar, paste into any other browser (no auth needed) — that browser will be denied at the page level because storage check fails. BUT: copy the JWT out of the URL, store it as Authorization Bearer header in Postman → all `/api/story/**` routes accept it for 24h.
**Why it matters:** "URL is a secret" is universally fragile. The storage check at the page level is a UX layer; the JWT is the actual auth. Anyone who saw the URL once (over your shoulder, via screenshot to support, via system logs) has 24h of API access without ever needing the password.
**Fix sketch:** Navigate to a static path like `/story/view` and rely on `sessionStorage` + cookie for the JWT. Better: move to HttpOnly cookie like the admin route already does (`story-admin-token`), and stop returning the raw JWT in the JSON body. The page-level "is this the right session" check becomes a server-side cookie check instead of a URL-vs-storage check.

---

#### F-1.3 — HIGH — SSRF in admin `vault/save-from-message`: arbitrary URL fetched and stored

**Where:** `app/api/story/admin/vault/save-from-message/route.ts:31-65`
**What:** The route accepts `{ messageId, mediaUrl, filename }` from the request body. If `mediaUrl` starts with `/api/montree/media/proxy/` it goes through the proxy path. Otherwise (line 58): `const response = await fetch(mediaUrl);` with arbitrary user-supplied URL. No host allowlist. No protocol check (so `file://`, `http://localhost:6379`, `http://169.254.169.254/latest/meta-data/` are all valid inputs). The fetched bytes are encrypted with `VAULT_PASSWORD` and stored in `vault_files` — and `vault/download` will decrypt + return them. So this is read-side SSRF: an admin can exfiltrate internal resources to themselves via the vault.
**Repro:**
```bash
# As an admin:
curl -X POST https://teacherpotato.xyz/api/story/admin/vault/save-from-message \
  -H "Authorization: Bearer <admin-JWT>" \
  -H "Content-Type: application/json" \
  -d '{"mediaUrl":"http://169.254.169.254/latest/meta-data/iam/security-credentials/","filename":"aws-creds.txt"}'
# Now GET /api/story/admin/vault/download/<id> → decrypts → returns IMDSv1 credentials
```
On Railway, IMDS isn't necessarily exposed, but internal service discovery URLs (Railway private network, Supabase Postgres pooler, internal cron endpoints) likely are. The route is also fetched with default Node fetch which respects `file://` on some configurations — worth treating as RCE-adjacent.
**Why it matters:** Even if "admin is trusted", admin tokens can leak (see F-1.2, and via Railway log noise). A leaked admin token + this route = pivot into internal network. Defense in depth says don't trust admin to never abuse fetch.
**Fix sketch:** Validate the URL. Two-tier approach:
1. If `mediaUrl` starts with `/api/montree/media/proxy/`, take the existing proxy path.
2. Otherwise refuse — only same-origin or known-good hosts allowed. Or, more aggressive: only same-origin storage paths from `story_message_history.media_url`. Look up the messageId, read `media_url` from the row, ignore the body's mediaUrl entirely. The current code already takes `messageId` but doesn't use it for the URL — only for the audit log message.

---

#### F-1.4 — HIGH — `verifyUserToken` accepts admin tokens; admin tokens accepted on user endpoints

**Where:** `lib/story-db.ts:45-55` and consumers across user-side routes
**What:** `verifyUserToken` only checks signature + extracts `payload.username`. It does NOT reject tokens where `payload.role === 'admin'`. Therefore an admin's JWT passes user-side auth and:
- `/api/story/heartbeat` records the admin in `story_online_sessions` and `story_visits` as a "regular user"
- `/api/story/upload-media` lets the admin upload media as a "regular user" with `author = adminUsername`
- `/api/story/message` lets the admin post as a "regular user"

Conversely (this part is by-design, but worth flagging):
- `/api/story/current` and `/api/story/recent-messages` accept **either** header OR `story-admin-token` cookie via their inline `verifyToken` helpers — so an admin browsing their own dashboard can also read the parent view with no JWT in the header. This dual-mode acceptance was added "Phase 7" but means a curl with the admin cookie reaches user endpoints.
**Why it matters:** It corrupts the visits/activity log. An admin's name appears in the "online users" panel they themselves are reading. A future cleanup of "admin appears in Z's visits row" is a bug fix waiting to happen. It also makes audit trails ambiguous — was this Z, or was this Tredoux logged in as admin?
**Fix sketch:** Add `if (payload.role) return null;` (or `if (payload.role === 'admin') return null;`) at the top of `verifyUserToken`. Same in `verifyToken` helpers in `current/route.ts` and `recent-messages/route.ts`. Have admins explicitly use the admin token, never the user token.

---

#### F-1.5 — MED — Three `verifyAdminToken` implementations + a separate-secret fork

**Where:**
- `lib/story-auth.ts:19` (no role gate, optional `type: 'admin'`)
- `lib/story-db.ts:32` (role gate)
- `lib/story/auth.ts:56` (separate `STORY_ADMIN_JWT_SECRET`, role gate, NEVER imported by any route — dead code)
- `lib/story/story-admin-auth.ts:28` (role gate, used by `admin/send/route.ts`)
- inline copies in `app/api/story/admin/auth/route.ts:144`, `app/api/story/admin/message-history/route.ts:13`, `app/api/story/current/route.ts:23`, `app/api/story/recent-messages/route.ts:17`
**What:** Four canonical helpers + three route-local copies. `lib/story/auth.ts` even tries a SEPARATE `STORY_ADMIN_JWT_SECRET` env var with fallback to `STORY_JWT_SECRET` — but no route ever imports it. It's the "Phase 6" intent that was never wired up.
**Why it matters:** When a future change tightens admin auth (e.g. "require non-empty `username`", or "reject tokens issued >12h ago"), there are 7 places to update. The current divergence has already produced a security gap (F-1.4).
**Fix sketch:** Pick ONE canonical helper (probably `verifyStoryAdminToken` in `lib/story/story-admin-auth.ts`). Make every other helper re-export. Delete `lib/story/auth.ts` if `STORY_ADMIN_JWT_SECRET` isn't going to ship.

---

#### F-1.6 — MED — User JWT has no `type` claim, so `verifyToken` from `lib/story-auth.ts` can't distinguish

**Where:** `lib/story-auth.ts:19-26` returns `{ username, type? }` — but `app/api/story/auth/route.ts:104` mints `new SignJWT({ username })` with no `type` field
**What:** The type signature implies a type discriminator, but the issuing route never sets it. So a "user token" has only `{ username, iat, exp }` and a "admin token" has `{ username, role: 'admin', iat, exp }`. Any consumer that uses `lib/story-auth.ts:verifyToken` and switches on `payload.type` would silently fall through to "user" for both. None do today, but it's a latent footgun.
**Fix sketch:** Either drop `type` from the type signature, or actually set `type: 'user'` on the issuance path so a future role-gate works.

---

### 2. Vault security

#### F-2.1 — HIGH — Vault unlock generates an in-memory token that no downstream route checks

**Where:** `app/api/story/admin/vault/unlock/route.ts:100-115` vs `vault/list/route.ts`, `vault/download/[id]/route.ts`, `vault/upload/route.ts`, `vault/save-from-message/route.ts`
**What:** The unlock route generates a `vaultToken` JWT with `{ vaultAccess: true, encryptionKey, iat }` and returns it to the client. The encryption key is a random hex string that's not actually used anywhere downstream — it's a decoy. The `vaultUnlocked` state in `useVault` hook is purely client-side. The vault upload/download/list routes only check `verifyAdminToken` (the admin session) — they do NOT require the vault token.
**Repro:** Steal an admin JWT (sessionStorage, network log, F-1.2). Without ever knowing the vault password, `curl -H "Authorization: Bearer <admin-JWT>" /api/story/admin/vault/list` returns the full vault index (encrypted file URLs, filenames, uploader, upload dates). Then `curl -H "Authorization: Bearer <admin-JWT>" /api/story/admin/vault/download/<id>` returns the *decrypted* file — because the download route reads `VAULT_PASSWORD` from the environment itself; the client never had to provide a password.
**Why it matters:** The vault password is theater. The actual protection is "the admin JWT" + "the VAULT_PASSWORD env var stays secret on Railway". The unlock flow exists only to gate the UI — anyone bypassing the UI gets the full vault content for 24h on a stolen token. The `vault_unlock_attempts` rate limiter does nothing for direct API access.
**Fix sketch:** Make the vaultToken actually load-bearing. Three real changes:
1. `vault/list`, `vault/download`, `vault/upload`, `vault/save-from-message` all check for a `x-vault-token` header AND verify `payload.vaultAccess && payload.iat + 3600s > now`. Without it → 401.
2. Better: do client-side encryption. Drop `VAULT_PASSWORD` from the server entirely. Derive the key on the client from the vault password (PBKDF2 + per-file salt), encrypt before upload, decrypt after download. The server only stores ciphertext + salt + IV + authTag. Then "admin token leaks" cannot decrypt the vault. (This mirrors the Principal Vault architecture from Session 87 — that one IS client-side encrypted; the Story vault is server-side. Make them consistent.)
3. At minimum, require `vault password` to be re-entered for every download/list, similar to "vault times out after 5 minutes".

---

#### F-2.2 — HIGH — Soft-deleted vault files remain in storage at their public URL

**Where:** `app/api/story/admin/vault/delete/[id]/route.ts:33-36` vs `vault/list/route.ts:18`
**What:** Delete sets `deleted_at = NOW()` on the DB row. The Supabase Storage object is NEVER removed. The bucket is configured with `getPublicUrl()` which returns a public-accessible URL — so anyone who saw the URL during the file's active period (e.g. in a Railway log line, in a CSV export, in a copy of `vault_files` from a backup) can still download the encrypted blob and brute-force the password offline.
**Why it matters:** The vault contains sensitive data (personal photos/videos that get "saved to vault" from message stream). Soft delete leaves an exfiltration window forever. Combined with `factory_reset` (which DOES remove storage) and `clear_vault` (which DOES remove storage), the inconsistency is worse — operators may believe "delete = gone".
**Fix sketch:** Hard-delete the storage object on every soft delete. The `clear_vault` path already extracts paths via regex — reuse that helper. Or, change the bucket policy from public to private + signed URLs.

---

#### F-2.3 — HIGH — Vault password derives encryption key, lives in env, and is shared across all files

**Where:** `app/api/story/admin/vault/upload/route.ts:43-47`, `vault/download/[id]/route.ts:60-68`, `vault/save-from-message/route.ts:67-71`
**What:** `VAULT_PASSWORD` is the single secret protecting every vault file. PBKDF2(password, file-specific salt, 100k, sha256) → AES-256-GCM key. Per-file salt is fine, but the password is shared. Compromise of the env (e.g. Railway dashboard, env leak in error logs, dev secret reuse) decrypts everything historical AND future.
**Why it matters:** No forward secrecy. No file-level key rotation. If `VAULT_PASSWORD` ever rotates, EVERY old file needs to be re-uploaded — and the bcrypt unlock hash (`VAULT_PASSWORD_HASH`) needs to rotate in lockstep. The current code doesn't support rotation at all.
**Fix sketch:** Per-file random data encryption key (DEK), wrapped by a per-admin master key (KEK) that's loaded from env. Then a future "rotate the master key" doesn't require re-encrypting every file — just re-wrap the DEKs. Or use the client-side encryption approach from F-2.1 fix and let the admin choose their own password; the server stores only the wrapped DEK.

---

#### F-2.4 — MED — `VAULT_PASSWORD_HASH` is captured at module-load and only logged when missing

**Where:** `app/api/story/admin/vault/unlock/route.ts:5-8`
**What:** `const VAULT_PASSWORD_HASH = process.env.VAULT_PASSWORD_HASH;` at module scope. If env is missing, `console.error` fires once and the route is broken for the lifetime of the process — but it doesn't fail-closed; the bcrypt compare is just called with `undefined`. `bcrypt.compare(password, undefined)` returns false reliably (good), but the behavior is implicit. Also: in serverless cold-start, a misconfigured env can lead to N parallel error logs as N containers spin up.
**Fix sketch:** Move the env read into the request handler, fail-fast with a 500 if missing. Match the pattern in `getJWTSecret()` (lazy + throw).

---

#### F-2.5 — MED — `vault_audit_log` is destroyed by `factory_reset`

**Where:** `app/api/story/admin/system-controls/route.ts:168-169`
**What:** `factory_reset` deletes `vault_audit_log` and `vault_unlock_attempts`. An admin (or attacker holding admin token) can cover their tracks by firing factory_reset after exfiltrating the vault.
**Why it matters:** The whole point of an audit log is non-repudiation. A factory_reset that nukes the audit log defeats it. The admin who fired the reset is logged in the audit table they just deleted.
**Fix sketch:** Preserve `vault_audit_log` and `vault_unlock_attempts` through factory_reset. Or, write a final "factory_reset fired by X at Y" row that survives (separate table, append-only).

---

#### F-2.6 — LOW — vault upload allowedTypes excludes documents/audio

**Where:** `app/api/story/admin/vault/upload/route.ts:30-33`
**What:** `allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm']`. No audio, no documents. But the admin "save to vault" button on MessagesTab works for any media message in the stream — and `save-from-message` doesn't enforce the same allowlist. So PDFs and audio CAN end up in the vault via the save-from-message path but cannot be re-uploaded directly. Documented or accidental? Worth confirming.
**Fix sketch:** Either extend the allowlist on `vault/upload` to include audio + documents (for consistency with `save-from-message`), or add the same allowlist to `save-from-message`.

---

### 3. Message rendering / message_type

#### F-3.1 — MED — `message_type` CHECK constraint history is unclear; document fallback writes `'image'` despite migration 167

**Where:** `migrations/167_story_message_type_document.sql` vs `app/api/story/admin/send/route.ts:317-342` and `app/api/story/upload-media/route.ts:180-191`
**What:** Migration 167 adds `'document'` to the CHECK constraint enum. Yet both `admin/send` and `upload-media` have fallback paths catching `23514` and inserting with `message_type='image'` instead. The comments cite "may not yet include 'document'" — suggesting migration 167 may not have been run on every env. The read side via `effectiveMessageType(storedType, filename)` then reconstructs the type from filename extension. This works, but:
- It depends on filename being preserved. If a document is uploaded with no extension, it stays as `'image'` forever — and `recent-messages`/`current-media` ship it as an `<img>` on the client, which renders broken.
- The "save to vault" button on MessagesTab disambiguates by `msg.message_type` — but the type went through `effectiveMessageType` already, so this works in practice.
- Migration 167 is in the repo but operators may not have run it. The fallback masks the issue forever.
**Repro:** Check production DB constraint: `SELECT consrc FROM pg_constraint WHERE conname = 'story_message_history_message_type_check';` — if it doesn't include `'document'`, the fallback fires on every document upload.
**Fix sketch:** Add an idempotent migration (or repair script) to force the CHECK constraint to include document, and remove the fallback paths in both routes. The dual-fallback masks the real fix and leaves a class of edge cases (filename-extension-driven detection breaks on extensionless uploads).

---

#### F-3.2 — MED — `decryptMessage` falls back to returning the raw ciphertext on failure

**Where:** `lib/message-encryption.ts:66-70`
**What:** If decryption throws (wrong key, corrupted ciphertext, mid-rotation), the function returns the **original encrypted string** verbatim. The caller has no way to distinguish "decrypted successfully" from "decrypt failed, here's the ciphertext". The parent page then renders `gcm:abc...:def...:0123456789...` as message text. The admin's MessagesTab does the same.
**Why it matters:** Mid-rotation of `MESSAGE_ENCRYPTION_KEY` would silently corrupt every old message — they'd display as gibberish ciphertext to parents. There's no operational signal that something's wrong; the page renders, just with nonsense in the message bubble.
**Fix sketch:** Return a sentinel value like `'[Message could not be decrypted]'` on failure, or throw and let the route's `try/catch` surface a 500. Don't lie about the decryption status.

---

#### F-3.3 — MED — `recent-messages` returns every recent message regardless of week, leaking expired-week messages

**Where:** `app/api/story/recent-messages/route.ts:42-49`
**What:** The query filters only on `is_expired = false` and `limit`. There's no `week_start_date` filter. The query returns messages from any week as long as `is_expired = false`. If `is_expired` is set by a cron job tied to `expires_at`, this works, but if the cron lags, expired messages appear. Also: the admin can post a message with `expires_at` in the past and it's still returned until `is_expired` is set true.
**Why it matters:** A photo or audio meant for "last week" may surface in the current week's "recent notes from teacher" panel without a clear date. Mild confusion.
**Fix sketch:** Add `AND (expires_at IS NULL OR expires_at > NOW())` server-side, or filter to current `week_start_date`. The latter is more aligned with the "this week's messages" UI.

---

#### F-3.4 — LOW — `decryptMessage` passes through plaintext without a colon — usable as a covert channel

**Where:** `lib/message-encryption.ts:33-36`
**What:** `if (!encrypted.includes(':')) return encrypted;` is the legacy path for pre-encryption messages. But a user could craft an admin-side message that was inserted with `message_content = 'plaintext-no-colon'` (via SQL direct or via a bug), and it would render unencrypted. Not a current-bug, but a future-bug surface — the data model conflates "encrypted with format" and "plaintext fallback" by string content.
**Fix sketch:** Add a one-time migration to ensure every existing message has `gcm:` prefix (re-encrypt if not), then strict-check the prefix on decrypt. Reject non-prefixed messages.

---

### 4. Admin broadcast / send

#### F-4.1 — HIGH — Admin send overwrites the current week's secret_stories hidden_message without any "do you want to overwrite" UX

**Where:** `app/api/story/admin/send/route.ts:191-222` (text branch only)
**What:** Every text message from admin overwrites `secret_stories.hidden_message` for the current week. There's no append, no version history, no warning. If admin sends "Reminder: bring a coat", then sends "Picture day Friday", the first message is GONE from the secret_stories table — though it remains in `story_message_history` (which is more of a log than a viewing surface).
**Why it matters:** The "T-letter decode" UX on the parent page reveals the LATEST hidden_message. Parents who hadn't read the first one never will. The admin has no UX warning. The compose form on the admin side is a single text field that submits and disappears, with no preview of "currently displayed hidden message".
**Fix sketch:** Either (a) make the admin UX show the current hidden message above the compose form ("Currently showing to parents: ..."), or (b) append to a list and let parents see the latest N. Option (a) is the smaller change.

---

#### F-4.2 — MED — `admin/send` audio/image/video/document branches DO NOT update `secret_stories`

**Where:** `app/api/story/admin/send/route.ts:233-356`
**What:** Only the text branch (line 191-222) upserts `secret_stories`. The media branches insert into `story_message_history` only. So a media-only admin message doesn't trigger the "new message" indicator on the parent page that's keyed off `story.updatedAt`. The user-side polling does `loadMedia()` which catches it from `current-media`, but the "red dot" notification (`hasNewMessage`) on the parent page is text-only.
**Why it matters:** Admin uploads an important video, parents don't get the notification dot. They have to manually expand the media section. Likely a documented split — text = primary, media = secondary — but worth confirming the intent.
**Fix sketch:** Add a parallel notification signal on `current-media` polls (track `lastMediaTime` like `lastMessageTime`). Or update `secret_stories.updated_at` (without changing hidden_message) so the dot fires.

---

#### F-4.3 — MED — Admin send 50,000-char text message size limit

**Where:** `app/api/story/admin/send/route.ts:165-167`, also `app/api/story/message/route.ts:20-22`
**What:** 50KB text message. Encryption inflates this by ~2x in hex. The resulting `message_content` column row is ~100KB+ before storage compression. Postgres TEXT handles it, but the secret_stories `hidden_message` column gets the same payload. Page render time on slow mobile networks grinds.
**Why it matters:** A pathological admin (or anyone hijacking a session) can DoS the parent page by sending the max-size message. Not catastrophic, but no reason for 50KB text.
**Fix sketch:** Cap at 5000 chars. The parent letter reveal UX is a single paragraph — 50KB is wildly out of bounds for the use case.

---

#### F-4.4 — LOW — `admin/send` document fallback writes message_type='image' AND audit log only fires on success — no failed-fallback alert

**Where:** `app/api/story/admin/send/route.ts:317-342`
**What:** When the 23514 CHECK violation triggers, fallback inserts with `'image'`. If that also fails (different reason — e.g. NOT NULL violation), the route returns 500 generically. Operator visibility into "the fallback fired N times" requires Railway log grep.
**Fix sketch:** When the fallback fires, log explicitly via the audit logger (`logAudit`). Tag it as `requires_review: true` so it surfaces in super-admin audit views.

---

### 5. Online presence / heartbeat

#### F-5.1 — MED — Heartbeat self-heal creates spoofable login rows

**Where:** `app/api/story/heartbeat/route.ts:86-118`
**What:** When a heartbeat arrives with a JWT that has no matching row in `story_login_logs` (e.g. the original login log insert failed all 3 retries), the heartbeat self-heals by inserting a synthetic login_log row with `username` from the JWT and current time. The token has been valid for up to 24h, but the self-heal sets `login_at = now()`. The log row's timestamp is now wrong.
**Why it matters:** Activity logs lie. A login that happened 12h ago shows as "just now" when it self-heals. Forensic analysis becomes unreliable.
**Fix sketch:** When self-healing, use `iat` from the JWT (the issued-at timestamp) as `login_at`, not `now()`. The JWT carries this for free.

---

#### F-5.2 — MED — `online-users` 10-minute "infer logout" runs on every read — race-prone

**Where:** `app/api/story/admin/online-users/route.ts:87-110`
**What:** On every admin poll (every 5s while the tab is active), the route scans `story_login_logs` for unlogged-out rows older than 10 min and bulk-updates their `logout_at`. Two admin tabs open → two concurrent inference runs → race-conditioned `UPDATE WHERE id IN (...)` on the same rows. Outcomes both succeed (idempotent), but the audit chain is muddied: which admin "logged the user out"? The action isn't attributed.
**Why it matters:** Mild. The infer-logout is a heuristic anyway. Worth attributing to a `system_inferred` author or moving to a cron.
**Fix sketch:** Move logout inference to a scheduled cron (Railway cron at `*/5 * * * *`). The admin route becomes read-only. Simpler concurrency story.

---

#### F-5.3 — MED — `story_online_sessions` upsert by session_token only — same user across two devices counts as two online users

**Where:** `app/api/story/heartbeat/route.ts:69-79`, `app/api/story/admin/online-users/route.ts:41-61`
**What:** The online-users panel dedupes by `username` via the `Map<string, ...>`. But the underlying `story_online_sessions` table is keyed by `session_token`, so two devices for the same user produce two rows. The dedup at read time keeps the most recent. Fine for online-count, but `secondsAgo` may be wrong for the device-the-admin-cares-about.
**Why it matters:** Cosmetic. The "X is online" badge is accurate within 5min.
**Fix sketch:** UI can show "X (2 devices)" if multiple sessions are active. Or upsert by `username` if there's never an intent to track multi-device.

---

#### F-5.4 — LOW — Heartbeat fires 30s on visible tab — no backoff when tab is hidden

**Where:** `app/story/[session]/page.tsx:196-216`
**What:** The `setInterval(sendHeartbeat, 30000)` runs unconditionally regardless of `document.visibilityState`. Browsers throttle background timers but a backgrounded tab on a charging laptop still fires every 30s. On a parent who left the tab open for 4h while doing other things, that's 480 heartbeats — each is a Supabase upsert.
**Fix sketch:** Wrap the interval in a visibility check. Or use the Page Visibility API to pause/resume.

---

#### F-5.5 — LOW — `story_login_logs` has no retention policy

**Where:** Migration `001_create_secret_story_tables.sql` and onwards
**What:** Every login + every heartbeat self-heal writes a row. No TTL, no archive. After a year of daily use by 30 parents × 2 logins × 365 days ≈ 22,000 rows. Plus self-heal rows that may duplicate. The `clear_login_logs` system control exists as a manual cleanup, but no scheduled job runs.
**Why it matters:** Disk grows linearly. Queries that filter by `login_at > X` keep getting slower without indexes.
**Fix sketch:** Add a cron job to archive rows older than 90 days to `story_login_logs_archive`, then delete from the live table. The query patterns benefit from a `(login_at, username)` composite index.

---

### 6. Cross-cutting / session handling

#### F-6.1 — HIGH — Auto-logout on `beforeunload` fires DELETE to logout EVERY user session

**Where:** `app/story/[session]/page.tsx:230-237`
**What:** Window unload triggers a `DELETE /api/story/auth` call. The DELETE handler marks `logout_at = NOW()` on every `story_login_logs` row matching the session_token prefix. This is intended cleanup, but:
- `sessionStorage.removeItem` happens AND the page navigates, so the auth header is no longer attached after the inflight DELETE.
- The DELETE uses `fetch('/api/story/auth', { method: 'DELETE' })` with NO auth header. So the DELETE handler reads `req.headers.get('authorization')` = null and silently skips the update.
- The logout signal never reaches the server. The session_token remains "active" until heartbeat staleness or 24h JWT expiry.
**Why it matters:** Sessions appear online for ~10 min after every real logout. The `story_online_sessions` `is_online = true` is never explicitly flipped. The activity log doesn't show clean logouts.
**Fix sketch:** Add `'Authorization': Bearer ${session}` to the DELETE call. Better: use `navigator.sendBeacon` with the token in the body — `fetch` is unreliable on unload anyway.

---

#### F-6.2 — MED — `getSessionToken` truncates to 50 chars but JWT payloads can collide on prefix

**Where:** `lib/story-db.ts:58-62`, `app/api/story/auth/route.ts:11`, `app/api/story/admin/auth/route.ts:24`
**What:** Login log session_token is stored as `token.substring(0, 50)`. JWTs share a common prefix (`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...`). Theory says 50 chars include the header (39 chars) + ~11 chars of base64-encoded payload start. Two JWTs issued in the same second with same algorithm have very similar prefixes — but the `iat` field varies. In practice 50 chars seems to be enough; in theory two simultaneous logins by the same user could collide.
**Why it matters:** If a collision happens, the heartbeat self-heal will match the wrong login_log row, and inferred logouts will close the wrong session. Vanishingly rare but unbounded if the JWT spec ever changes.
**Fix sketch:** Hash the JWT (`sha256(token).hex().slice(0, 32)`) instead of truncating. Same uniqueness property, no semantic dependency on JWT byte layout.

---

#### F-6.3 — MED — CSRF middleware skips API routes — Story APIs are unprotected by middleware

**Where:** `middleware.ts:172-189`
**What:** The middleware enforces CSRF on POST/PUT/PATCH/DELETE for non-API paths. But line 172 returns early for `/api/*`. Story API routes therefore have NO middleware-level CSRF check. The Bearer token model is the only protection.
**Why it matters:** Without CORS configured tightly, a malicious site could POST to `/api/story/auth` (though it doesn't have a valid bcrypt'd password). More relevantly: the `DELETE /api/story/auth` logout path can be triggered cross-origin (CORS preflight permitting) to log out users they're impersonating. Mitigated by SameSite cookies on the admin token, but the user-side JWT is in sessionStorage (not a cookie) so cross-origin CSRF is more theoretical.
**Fix sketch:** Either rely on the Bearer-token model (current state — it's defensible because the JWT isn't auto-attached cross-origin) OR add a same-origin check to state-changing Story API routes. Pick one.

---

#### F-6.4 — LOW — `getClientIP` inconsistency: `audit-logger.ts` parses XFF correctly, Story routes use raw

**Where:** `lib/montree/audit-logger.ts:49-53` (correct) vs `app/api/story/heartbeat/route.ts:24` and many other Story routes
**What:** `audit-logger.getClientIP` does `xff?.split(',')[0]?.trim()`. Story routes do `req.headers.get('x-forwarded-for') || 'unknown'` — storing the full comma-list `1.2.3.4, 10.0.0.1`. Downstream queries that try `WHERE ip_address = '1.2.3.4'` will miss.
**Fix sketch:** Use `getClientIP` everywhere. Cosmetic but consistent.

---

### 7. Admin dashboard / UI

#### F-7.1 — MED — Screensaver is purely client-side; session token still in storage

**Where:** `app/story/admin/dashboard/page.tsx:34-66`, `app/story/admin/dashboard/components/Screensaver.tsx`
**What:** When the admin tab becomes visible after >800ms of being hidden, a "fake Montessori classroom" overlay shows. Tap MaoMao to unlock. But:
- `sessionStorage.story_admin_session` is still set.
- DevTools → Application → Session Storage → see the JWT.
- DevTools → React → setState(isLocked, false) → bypass.
- `/api/story/admin/*` routes all accept the token directly via curl regardless of the overlay state.
**Why it matters:** The screensaver is shoulder-surfing protection, not security. The naming should reflect that. A leaked unlocked-laptop scenario is mitigated by AdminLogout (which clears storage), not by Screensaver.
**Fix sketch:** Rename internally to "decoy" not "screensaver". Document the intent. Or, on lock, ALSO `sessionStorage.removeItem('story_admin_session')` — forcing re-auth on unlock.

---

#### F-7.2 — MED — `MessageComposer` shown above ALL tabs except Vault — including Online Users and Activity Log

**Where:** `app/story/admin/dashboard/page.tsx:301-328`
**What:** The composer is rendered above every tab except Vault. So when an admin is just viewing online users or activity logs, the composer is at the top — and the message text persists across tab switches (state lives in `useAdminMessage`). An admin viewing Activity Logs who accidentally clicks send sends a typed message intended as "a draft to revisit". Mild UX bug, not a security one.
**Fix sketch:** Either hide the composer on read-only tabs (Online/Logs) or add a confirmation modal on send.

---

#### F-7.3 — LOW — `ActivityLogTab` displays IP addresses raw — including the comma-separated XFF list

**Where:** Inferred from `app/api/story/admin/visits/route.ts` and probable display logic
**What:** Combined with F-6.4: the activity log shows the raw `1.2.3.4, 10.0.0.1` XFF. Confusing to read.
**Fix sketch:** Normalize on read.

---

### 8. Misc

#### F-8.1 — MED — `effectiveMessageType` returns 'text' as final fallback — could render a blob as text

**Where:** `lib/story/document-detect.ts:21-28`
**What:** If `storedType` is null/undefined AND `isDocumentFilename` returns false, fallback is `'text'`. A media row with NULL `message_type` (legacy data, schema migration issue) and a non-document filename would render as a text message. The page renders `<p>{msg.message_content}</p>` — fine because content is encrypted/null. But it's a category error that masks an underlying schema problem.
**Fix sketch:** Default to `'unknown'` and render a "could not display" placeholder in the UI. Surfaces bad data fast.

---

#### F-8.2 — MED — `current-media`/`recent-messages` don't filter by author or scope — every parent sees every other parent's media

**Where:** `app/api/story/current-media/route.ts:16-22`, `app/api/story/recent-messages/route.ts:42-49`
**What:** The story system is by design a single-classroom broadcast — every logged-in parent sees the same week's content. There's no concept of "parent A's child's media" vs "parent B's". The `author` field on the message is the user who posted (parent name or admin name). So if parent A uploads a photo, all parents see it.
**Why it matters:** This may be intentional ("share what your kid made today"). But the absence of any scoping primitive means there's no way to add per-parent visibility later without a schema migration. And a parent who uploaded a sensitive video (mistake) cannot retract it — there's no delete-my-own-upload route, and the admin would have to do it via the System Controls "Clear all media" (which is nuclear).
**Fix sketch:** Add a per-message DELETE endpoint for the author. Or add a `visibility` column on `story_message_history` (`'all' | 'admin_only'`) so the author can mark uploads private. Either way, surface in the admin UI.

---

#### F-8.3 — LOW — `clear_login_logs` system control is destructive and irreversible — no audit log entry

**Where:** `app/api/story/admin/system-controls/route.ts:59-72`
**What:** `clear_login_logs` deletes all login logs. There's no `logAudit` call for this action. The action itself is destructive AND unaudited. Combined with `factory_reset` (which also deletes `vault_audit_log`), an admin can destroy all evidence of their actions.
**Fix sketch:** Add `logAudit({ action: 'clear_login_logs', requires_review: true })` to every system_controls action. Note: this writes to `montree_super_admin_audit` which is a different table — won't be deleted by Story-side factory_reset.

---

#### F-8.4 — LOW — `decryptMessage` doesn't differentiate AES-CBC legacy from a non-encrypted plaintext with a single colon

**Where:** `lib/message-encryption.ts:54-66`
**What:** A message stored as `not:encrypted` (e.g. someone wrote literal text "not encrypted" with a colon) attempts AES-CBC decryption with `iv = Buffer.from('not', 'hex')` (an invalid IV). Decryption throws, catch returns the original. Net behavior is OK, but defensive coding is poor.
**Fix sketch:** Reject non-prefixed messages explicitly. Use `gcm:` prefix as canonical, reject everything else.

---

#### F-8.5 — LOW — `upload-media` `image/svg+xml` is NOT in user-side allowlist but the page accept attribute lists `.svg` via the documents block

**Where:** `app/story/[session]/page.tsx:728` and `app/api/story/upload-media/route.ts:39`
**What:** The page accepts `image/*` which on most browsers DOES include SVG. The server-side `IMAGE_TYPES` excludes SVG. So a user picks an SVG → server rejects → user confused. Not a security bug, but a UX paper-cut. Compare to admin send which DOES allow SVG (`MEDIA_CONFIG.image.allowedMimes` includes `image/svg+xml`).
**Fix sketch:** Either accept SVG on both sides, or `accept="image/jpeg,image/png,image/gif,image/webp,image/heic,video/*,..."` on the file input.

---

#### F-8.6 — LOW — Story routes use `'lib/story-db.ts'` AND `'lib/story-auth.ts'` AND `'lib/story/*'` — directory split is unstable

**Where:** filesystem
**What:** `lib/story-db.ts` (singular root file) coexists with `lib/story/*` (folder of related files). Same goes for `lib/story-auth.ts` vs `lib/story/auth.ts`. Imports from one don't automatically discover the other. New helpers added to one place leave the other stale.
**Fix sketch:** Move everything into `lib/story/`. Delete the root-level `lib/story-*` files after migrating imports.

---

## Prioritised fix table

Severity × Effort × Value across all findings:

| # | Finding | Severity | Effort | Value | File |
|---|---|---|---|---|---|
| 1 | F-1.1 — Drop `author` from message body, server-set always | CRITICAL | S | L | `app/api/story/message/route.ts` |
| 2 | F-1.3 — Validate or strip `mediaUrl` in save-from-message | HIGH | S | L | `app/api/story/admin/vault/save-from-message/route.ts` |
| 3 | F-2.1 — Make `vaultToken` load-bearing on list/download/upload | HIGH | M | L | `app/api/story/admin/vault/{list,download,upload}/route.ts` |
| 4 | F-1.2 — Drop JWT from URL, use HttpOnly cookie | HIGH | M | L | `app/story/page.tsx` + `app/story/[session]/page.tsx` + auth route |
| 5 | F-1.4 — `verifyUserToken` rejects admin tokens | HIGH | S | M | `lib/story-db.ts` |
| 6 | F-2.2 — Hard-delete vault storage on soft delete | HIGH | S | M | `app/api/story/admin/vault/delete/[id]/route.ts` |
| 7 | F-6.1 — Auto-logout DELETE sends auth header | HIGH | S | M | `app/story/[session]/page.tsx` |
| 8 | F-4.1 — Admin compose preview shows current hidden_message | HIGH | M | M | dashboard MessageComposer + secret_stories surfacing |
| 9 | F-2.3 — Per-file DEK wrapped by master KEK | HIGH | L | M | vault upload/download |
| 10 | F-3.1 — Idempotent migration to ensure 'document' in CHECK | MED | S | M | new migration |
| 11 | F-3.2 — Decrypt fails return sentinel, not ciphertext | MED | S | M | `lib/message-encryption.ts` |
| 12 | F-1.5 — Consolidate to one `verifyAdminToken` | MED | M | M | lib cleanup |
| 13 | F-5.1 — Self-heal uses JWT `iat` for login_at | MED | S | M | `app/api/story/heartbeat/route.ts` |
| 14 | F-2.5 — Preserve audit logs through factory_reset | MED | S | M | `app/api/story/admin/system-controls/route.ts` |
| 15 | F-4.2 — Media-only admin send fires updated_at on secret_stories | MED | S | M | `app/api/story/admin/send/route.ts` |
| 16 | F-3.3 — `recent-messages` filters expired-by-time too | MED | S | M | `app/api/story/recent-messages/route.ts` |
| 17 | F-5.2 — Move infer-logout to a cron | MED | M | L | new cron + `online-users` |
| 18 | F-8.2 — Per-message DELETE for the author | MED | M | M | new route + UI |
| 19 | F-7.1 — Screensaver clears sessionStorage on lock | MED | S | M | `app/story/admin/dashboard/page.tsx` |
| 20 | F-2.4 — Vault env-loading moves into request handler | MED | S | L | `app/api/story/admin/vault/unlock/route.ts` |
| 21 | F-2.6 — Vault allowedTypes aligned with save-from-message | LOW | S | L | `app/api/story/admin/vault/upload/route.ts` |
| 22 | F-3.4 — Strict GCM-prefix check on decrypt | LOW | S | L | `lib/message-encryption.ts` |
| 23 | F-4.3 — Cap admin text message at 5000 chars | LOW | S | L | `app/api/story/admin/send/route.ts` |
| 24 | F-4.4 — Audit log on document fallback fire | LOW | S | L | `app/api/story/admin/send/route.ts` |
| 25 | F-5.3 — Online sessions dedupe by username server-side | LOW | S | L | heartbeat + online-users |
| 26 | F-5.4 — Heartbeat respects visibility state | LOW | S | L | `app/story/[session]/page.tsx` |
| 27 | F-5.5 — Login-logs retention cron | LOW | M | L | new cron |
| 28 | F-6.2 — Hash JWT for session_token instead of substring | LOW | S | L | auth routes |
| 29 | F-6.4 — Use `getClientIP` everywhere | LOW | S | L | Story routes (~6 files) |
| 30 | F-8.3 — Audit log for system_controls actions | LOW | S | L | `app/api/story/admin/system-controls/route.ts` |
| 31 | F-8.6 — Consolidate `lib/story/` directory | LOW | M | L | filesystem |

---

## Quick wins (< 30 min)

- **F-1.1** — Drop `author` from `app/api/story/message/route.ts:14`. One-line fix. Single highest-impact change in the audit.
- **F-1.4** — In `lib/story-db.ts:verifyUserToken`, after `jwtVerify`, add `if (payload.role) return null;`. Three-line fix.
- **F-2.5** — Remove `vault_audit_log` and `vault_unlock_attempts` from the factory_reset DELETE list. Two-line fix.
- **F-3.2** — `lib/message-encryption.ts:69` change `return encrypted;` to `return '[Message could not be decrypted]';`.
- **F-3.3** — Add `.gt('expires_at', new Date().toISOString())` to the `recent-messages` query.
- **F-5.1** — In `heartbeat/route.ts:99` self-heal insert, use `iat` from the JWT payload as `login_at`. Decode the token inline.
- **F-6.1** — `app/story/[session]/page.tsx:233`: add `headers: { Authorization: \`Bearer ${getSession()}\` }` to the DELETE fetch.
- **F-4.3** — Cap admin text at 5000 chars. Cap admin's compose textarea to match.
- **F-8.3** — Wrap each system_controls action in `logAudit(supabase, { action, requires_review: true })`.

---

## Verified-clean section

Things that look right and why I didn't flag them:

- **`message_encryption.ts` GCM mode** — uses `aes-256-gcm` with 12-byte IV (correct for GCM) and `getAuthTag()` for integrity. Per-message random IV. The legacy CBC path is documented and acceptable for back-compat.
- **`MEDIA_CONFIG.video.maxSize = 500MB`** — matches the storage bucket cap. The retry logic in `uploadWithRetry` correctly classifies transient network errors vs validation errors.
- **`effectiveMessageType` for documents stored as `'image'`** — the filename-extension-based detection is the right resolution. Both `recent-messages` (line 71) and `current-media` (line 47) use it consistently after the Session 56 fix. `admin/message-history` (line 73) too.
- **CSRF middleware** — Story APIs are intentionally exempt and rely on Bearer tokens. The user-side JWT is in sessionStorage (not a cookie), so it doesn't auto-attach cross-origin. The admin token is in BOTH sessionStorage AND a cookie — the cookie's `SameSite: 'lax'` (line 123 of `admin/auth/route.ts`) is correct for CSRF.
- **bcrypt password storage on `story_users` / `story_admin_users`** — both auth routes use `bcrypt.compare`, no hardcoded fallback (Phase 4/5 hardening). Rate limited (30/15min for user, 5/15min for admin) via DB-backed limiter.
- **Vault encryption algorithm choice** — AES-256-GCM with PBKDF2 (100k iters) is acceptable. The structural issues are around key management (F-2.3) and access control (F-2.1), not the algorithm.
- **`getProxyUrl` for media** — same-origin, no SSRF surface. Server-side `getProxyUrl` produces URLs that resolve through `/api/montree/media/proxy/*` which has its own bucket allowlist.
- **Service worker scope** — `public/montree-sw.js` excludes `/api/*` and only caches Montree-specific static assets. Story routes are not service-worker-touched.
- **`heartbeat/route.ts` returns `{ ok: true }` even on failure** — intentional pattern to never break the heartbeat client. Errors are logged server-side.
- **Visits tracking 5-minute gap** — `VISIT_GAP_MS = 5 * 60 * 1000` correctly distinguishes "back after a break" from "same session". `last_active_at` updates extend the visit naturally.
- **`react-jsx` escaping** — Author names, message content, filenames all render via React's default escaping. No `dangerouslySetInnerHTML`. No DOM-XSS surface identified in `app/story/[session]/page.tsx`.
- **CHECK constraint fallback in admin send** — the dual-path (try `'document'` first, fall back to `'image'` on 23514) is defensive — even if migration 167 isn't run, documents still send. Lots of fallback masking is bad, but THIS specific fallback is correct.
- **`Promise.allSettled` in pull-to-refresh** — properly handles partial failures in `app/story/[session]/page.tsx:182`.
- **`uploadWithRetry`** — exponential backoff (1s, 2s) on transient errors only. Doesn't retry on validation errors. Correctly classifies via error message substring matching.
- **Vault soft-delete + audit log on every operation** — every vault operation writes to `vault_audit_log` (with the exception of system-controls' factory_reset destroying the table — see F-2.5).

---

## Notes for the reader

- The Story system is a complete sub-application with its own auth, its own DB tables, its own service worker exemption. Most findings here are scoped to Story; they don't bleed into Montree.
- The biggest architectural debt is the **dual encryption model** — admin Story Vault uses server-held key (this audit's F-2.x), but the Principal Vault from Session 87 uses client-held key. Same threat model, different solutions. Worth aligning.
- **Migration 167** (CHECK constraint adds `'document'`) — verify it's been run on production. The fallback code suggests operators have not always run it. If verified, remove the fallback code.
- The `STORY_ADMIN_JWT_SECRET` env var referenced in `lib/story/auth.ts:8` is dead code. No route imports `lib/story/auth.ts`. Either wire it up (separate-secret hardening was the intent) or delete the file.
- No reads of legacy `montree_messages` table were done — out of scope.
- The Whale Class Admin (the OTHER admin surface used for video manager etc., at `/admin/*`) was not audited — out of scope for this Story audit.
- No load testing was performed. Performance findings are theoretical (e.g. F-5.4 heartbeat volume).

End of audit.
