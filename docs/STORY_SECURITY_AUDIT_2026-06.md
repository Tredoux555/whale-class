# Story System — Security Audit (June 1, 2026)

Full review of the Story user system + Story admin/vault system, focused on the
question: *"Is everything end-to-end encrypted and watertight against ISPs and a
state-level adversary (e.g. the Chinese government)?"*

Method: read the cryptographic core firsthand (`lib/message-encryption.ts`,
`lib/story-auth.ts`, `lib/story-db.ts`, vault routes) + two parallel route audits
covering all 37 Story API routes, the `[session]` page, and `StoryVoiceCall`.

---

## TL;DR — the headline answer

**No. With the current architecture it is NOT watertight against a state actor,
and it is NOT end-to-end encrypted.** It is *server-side encrypted* — the server
holds every key and decrypts everything before it reaches a client.

What you DO have is solid: TLS protects message contents from your ISP and from
passive interception on the Great Firewall, and data is encrypted at rest in the
database. What you do NOT have is protection against anyone who can reach the
*server itself* — because the server is the single point of trust and currently
holds all the keys in plaintext environment variables.

True "nobody, not even the government, can read it" is achievable only with
**end-to-end encryption** (keys live only on the two phones, never on the server —
the Signal model). That is a fundamental re-architecture, not a config change, and
even then it cannot hide *metadata* (who talked to whom, when) or survive a seized
phone or a blocked domain. See the Threat Model section.

---

## Threat model — who can see what, honestly

| Adversary | Can they read message *content*? | Can they see / block that you're using it? |
|---|---|---|
| **Your ISP (passive)** | **No** — TLS encrypts the payload. They see the domain (SNI/DNS) and traffic volume only. | Yes — they see you connect to `montree.xyz` / `teacherpotato.xyz`. |
| **Great Firewall (passive interception)** | **No** — same TLS protection. | Yes — sees SNI + DNS. |
| **Great Firewall (active)** | No (can't break TLS) | **Yes — can block the domain entirely at any time.** It currently lets the domain through; that is revocable without notice. (This is why Astrill/VPN already came up.) |
| **A server compromise / leaked env vars** | **YES — total.** `MESSAGE_ENCRYPTION_KEY` + `VAULT_PASSWORD` are plaintext env vars; the server decrypts everything. | n/a |
| **Subpoena / legal compulsion of the host (Railway/Supabase/Cloudflare — all US)** | **YES** — they can be compelled to hand over the DB + env. China can't easily compel a US host; the *US* government can. | n/a |
| **You (the operator)** | **YES** — you can read every message and vault file. This is the opposite of E2E. | n/a |
| **Someone with physical access to either phone** | **YES** regardless of any crypto. | n/a |

**Bottom line:** the network path is well-protected (TLS). The *server* is the
weak point — it sees everything in the clear, and the keys sit next to the data.
"Watertight against the Chinese government" is not a property a normal
server-mediated web app can have. The closest realistic goals are: (a) make the
server breach-resistant, (b) reduce what the server can decrypt, and ultimately
(c) move to true client-side E2E if the threat is genuinely state-level.

---

## What's already done well (credit where due)

These were hardened in the Session 113 audit and verified still in place:

- **SSRF defenses are strong.** `vault/save-from-message` enforces a host
  allowlist + protocol whitelist + rejects IP-literal hosts; `chunked/chunk`
  locks the PATCH target to the Supabase resumable-upload prefix; `finalize`
  path-regex-restricts the object key. No open SSRF found.
- **Vault dual-gate is consistent.** Every sensitive vault route requires BOTH a
  valid admin JWT AND an `x-vault-token` (signature + `vaultAccess` claim + 1h
  TTL). No vault route is missing the gate.
- **Identity comes from the verified JWT, never the request body** (author-spoof
  hole F-1.1 closed). Admin tokens are rejected where user tokens are expected,
  and vice versa (F-1.4).
- **Decrypt failures return a sentinel**, not raw ciphertext, and a strict prefix
  check closed the old "colonless string = plaintext passthrough" channel.
- **`agora-token`** requires an explicit `?as=admin|user` and scopes a user to
  calls where `call.username === their username` — no call-hijack IDOR.
- **`factory_reset` preserves the audit log** and writes a "fired by X" row before
  wiping — a stolen admin cookie cannot erase its own tracks.
- **AES-256-GCM** (authenticated encryption) is the correct algorithm choice
  throughout. The problems are key *management*, not the cipher.

---

## Findings (consolidated, severity-ranked)

### CRITICAL / architectural

**C1 — Not end-to-end encrypted; server holds all keys.**
`lib/message-encryption.ts` keys off `process.env.MESSAGE_ENCRYPTION_KEY`; the
server decrypts every message before returning it. Vault files key off
`process.env.VAULT_PASSWORD` (`vault/upload/route.ts:82`). *Why it matters:* this
is the entire answer to the watertight question — anyone reaching the server reads
everything. *Fix:* see roadmap. This is inherent to the design; treat as
server-side-at-rest encryption and size expectations accordingly.

**C2 — Large vault media stored completely UNENCRYPTED.**
`vault/signed-upload` + `chunked/*` + `finalize` store large files with
`encrypted_key='plain'` (`signed-download/[id]/route.ts:51`). `signed-download`
mints a **1-hour, inline** Supabase signed URL. *Why it matters:* a 1h bearer URL
to an unencrypted private object is shareable/loggable/screenshottable — for an
hour, anyone with the URL fetches the raw video/photo with no auth, and the file
isn't encrypted at rest at all. *Fix:* drop the TTL to ≤5 min for interactive
playback; encrypt large media via the chunked AES path rather than the `'plain'`
shortcut; at minimum flag unencrypted files distinctly in the UI.

### HIGH

**H1 — Single global vault key; unlock password is decorative (F-2.3, known/deferred).**
Every file is encrypted with the same `VAULT_PASSWORD` (PBKDF2 100k). The bcrypt
*unlock* password (`VAULT_PASSWORD_HASH`) only gates access — it is **not** the
file key. The per-session `encryptionKey` minted into the vault JWT
(`vault/unlock/route.ts:100`) is **dead code, never used**. *Why it matters:*
no key separation; one secret decrypts the whole vault; the design implies
password-derived keys that aren't implemented. *Fix:* per-file random DEK wrapped
by a KEK, or derive the file key from the operator-entered unlock password and
carry it in the (already-minted-but-unused) vault token.

**H2 — No per-user content scoping on shared reads / broadcast write.**
`recent-messages`, `current-media`, `shared-files` return *all* rows to any
authenticated user; `message` POST overwrites the shared broadcast row. *Why it
matters:* safe ONLY while the channel is strictly 2-party (its current design).
The moment a 3rd `story_users` row exists, every user reads everyone's
photos/videos/messages. *Fix:* confirm 2-party is permanent, or scope reads to the
allowed pair / add a recipient column filtered on the verified username.

**H3 — Deleted/cleared media can linger live.**
Shared files use a *public* bucket (`getPublicUrl`) and `clear_all_media` nulls DB
columns but never removes the Storage objects (`system-controls/route.ts:140`).
Shared-file delete treats storage-removal failure as log-and-continue. *Why it
matters:* "clear all media" leaves blobs retrievable at their old URLs; takedown
expectations violated. *Fix:* enumerate + `storage.remove()` the objects on clear;
treat removal failure as a hard, retried error.

### MEDIUM

- **M1 — Admin token dual-mode.** `admin/auth` returns the JWT in the JSON body
  *and* as an httpOnly cookie; the body copy is what the client replays as a
  Bearer header, defeating the cookie's XSS protection. Migrate fully to the
  httpOnly cookie + `*FromRequest` readers; stop returning the token in the body.
- **M2 — Vault-unlock brute-force keyed on spoofable `x-forwarded-for`, fails open.**
  An attacker rotating the header bypasses the 5/15min lockout and gets unlimited
  bcrypt guesses against `VAULT_PASSWORD_HASH`; a limiter DB error silently allows.
  Key the limiter on the authenticated admin identity; fail closed on this path.
  (Same spoofable header feeds the audit-log IP — undermines the forensic record.)
- **M3 — Destructive ops need no step-up.** `factory_reset` / `clear_vault` /
  `delete_all_users` are gated only by the admin token + a hardcoded
  `confirmCode === 'CONFIRM'` (not a secret). A stolen 24h admin JWT wipes
  everything. Require a fresh vault token / password re-entry for destructive ops.
- **M4 — `select('*')` over-fetch** in `recent-messages` (and unbounded `limit`
  params across admin list routes — clamp to a max).

### LOW

- **L1 — `Content-Disposition` filename** built from unsanitized DB `filename`
  (header-injection vector; admin-supplied, low likelihood). Strip CR/LF, escape.
- **L2 — No per-user rate limit** on `upload-media` (300MB) or `message` — an
  authorized user can spam large uploads / broadcast writes.
- **L3 — Shared files are public-by-URL by design** — document this; switch to
  signed URLs with short TTL if confidentiality is required.

---

## Remediation roadmap

**Tier 1 — quick wins (hours), no architecture change:**
1. C2: drop signed-download TTL to ≤5 min; encrypt large media instead of `'plain'`.
2. M2: key vault-unlock rate limit on admin identity, fail closed.
3. M3: require vault-token step-up for `factory_reset`/`clear_vault`/`delete_all_users`.
4. M1: stop returning the admin token in the JSON body.
5. H3: hard-delete storage objects on `clear_all_media` + shared-file delete.
6. L1/L2/M4: sanitize filename header, add upload/message rate limits, clamp limits, explicit column selects.

**Tier 2 — key management (half-day + migration):**
7. H1/F-2.3: per-file DEK wrapped by a KEK; wire the already-minted unlock-derived
   key through so the operator password genuinely participates in decryption.

**Tier 3 — the real "watertight" path (significant rebuild, only if the threat is genuinely state-level):**
8. **Client-side end-to-end encryption.** Both parties derive a key from a shared
   passphrase exchanged out-of-band (in person / over Signal), never sent to the
   server. The server stores only ciphertext it cannot read. Trade-offs to accept:
   lost passphrase = unrecoverable data; no server-side previews/search/captions;
   web crypto in-browser is weaker than a native app; **metadata still leaks**
   (who/when/how-much) and the **domain can still be blocked**; a compromised phone
   still defeats it. If the threat model is truly "a state actor must never read
   this," the honest recommendation is a purpose-built E2E messenger (Signal), not
   a web app — and to assume the network already reveals that two parties are
   communicating.

---

## One-line answer to "is this possible?"

You can get *very strong privacy against the network and at rest* (much of which
you already have), and you can close the real holes above. But **"watertight
against the Chinese government, including the server" is not achievable for a
server-mediated web app** — that property requires end-to-end encryption with
device-only keys, and even then it cannot hide that communication is happening or
survive a seized device or a blocked domain.
