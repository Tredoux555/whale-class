> ⚠️ **SUPERSEDED — read `STORY_PERSONAL_PLATFORM_BUILD.md` instead.** Tredoux decided the
> AI Coach should READ the whole diary (therapist-style), so the client-side E2E approach
> below is replaced by simpler server-readable **encryption at rest** (the master spec, §3 + §9).
> This file is kept only for the crypto-pattern reference; the privacy model here no longer applies.

# Private Journal / Planner — Build Spec (run as a focused fresh session)

## What Tredoux wants
A private personal **journal + planner** built into the **Story system** — a place to
capture his true thoughts and feelings that **no one can find or read but him**. Encrypted
in a vault, like the Story media vault. "Make it nice" — a calm, beautiful, distraction-free
writing space.

## Threat model (read first — this defines the whole design)
"Where no one can find it" must mean: **even with full server/database access, the entries
are unreadable without Tredoux's journal password.** That rules out a plain password gate
over plaintext rows. The bar is **client-side end-to-end encryption** — the password is
turned into a key *in the browser*, entries are encrypted *before* they leave the device,
and the server only ever stores ciphertext + salt + iv. The server (and anyone who dumps the
DB) sees noise.

**Canonical template already in the codebase:** the Principal Vault.
- Migration: `migrations/185_principal_vault.sql` (`montree_principal_vault`)
- Crypto: `lib/montree/vault-crypto.ts` — WebCrypto PBKDF2-SHA256 (600k iters) → AES-256-GCM,
  per-record 16-byte salt + 12-byte IV, `gcm:`-versioned. `encryptRecord` / `decryptRecord` /
  `verifyPasswordAgainstRecord`. AES-GCM auth-tag failure on decrypt = wrong password.
- Routes pattern: `app/api/montree/admin/conversations/{route,[id]}.ts` (list returns
  encrypted blobs only; POST validates base64 shape + salt/iv length + iteration bounds +
  ciphertext size; server NEVER sees plaintext).
- UI pattern: `app/montree/admin/conversations/page.tsx` (first-setup → unlock gate →
  list/new/detail; vault password lives in component memory only, wiped on lock/refresh/nav).

**Reuse this pattern wholesale.** Don't invent new crypto.

🚨 **Honest caveat to tell Tredoux:** forgotten journal password = entries are
**unrecoverable** by design. There is no reset, no backdoor — that's the cost of true
privacy. Encourage a memorable-but-strong passphrase, written on paper somewhere safe
(NOT in the codebase, NOT in the same system).

## Where it lives
Inside the **Story system** (his private space), NOT the Montree app.
- Surface: `app/story/journal/` (or a tab inside the Story admin dashboard).
- Auth: Story admin session (the existing Story admin auth) **+** a separate journal vault
  password (step-up), exactly like the media vault's `x-vault-token` pattern but with the
  E2E twist (the password also derives the decryption key client-side).
- Optional "hidden entry" (like the Yo-yo entry mechanism noted in CLAUDE.md) so it isn't
  visible in nav unless you know how to reach it. Nice-to-have, decide during build.

## Schema — new migration `story_journal`
```
story_journal_entries
  id              uuid pk default gen_random_uuid()
  entry_date      date            -- plaintext, for planner sorting/calendar ONLY
  salt_b64        text not null
  iv_b64          text not null
  ciphertext_b64  text not null   -- holds {title, body, mood, tags} encrypted as JSON
  pbkdf2_iters    int  not null
  cipher_version  int  not null default 1
  created_at      timestamptz default now()
  updated_at      timestamptz default now()
  + touch trigger on update
```
Everything meaningful (title, body, mood, tags) lives INSIDE the ciphertext. Only
`entry_date` is plaintext, and only so the planner/calendar can sort without decrypting.
(If even the date should be hidden, store an encrypted sort-key instead — decide with
Tredoux.) No `user_id` needed — the Story system is single-user (him); but add a
constant owner discriminator if Story ever goes multi-user.

## API routes (all gated: Story admin auth + journal vault token)
- `GET  /api/story/journal` — list entries (id, entry_date, ciphertext blobs + salt/iv/iters). No plaintext.
- `POST /api/story/journal` — create. Validate base64 shapes, salt(16)/iv(12) byte lengths,
  iters 100k–5M, ciphertext ≤ ~256KB. Server stores as-is.
- `GET  /api/story/journal/[id]` — one entry (encrypted).
- `PATCH /api/story/journal/[id]` — update (re-encrypted blob).
- `DELETE /api/story/journal/[id]` — delete.
Mirror the conversations routes' validation + auth exactly. Never log ciphertext or password.

## The writing experience ("make it nice")
Calm, private, distraction-free — this is a sanctuary, not a form:
- Dark forest theme (Story aesthetic), Lora serif for the body, generous line-height,
  comfortable max-width (~680px), warm paper-like contrast.
- **Planner view:** a gentle month/week calendar; tap a day → write/read that day's entry.
- **Journal view:** reverse-chronological list of entries (date + decrypted title/preview,
  only after unlock).
- Distraction-free editor: title + freeform body (markdown optional), optional mood chip
  + tags, autosave-on-pause (encrypt + PATCH), a clear **Lock** button that wipes the
  in-memory key instantly.
- Lock-on-blur / lock-on-idle (e.g. 5 min) so it self-secures if he walks away.
- First-run: set journal password (entered twice). Unlock screen thereafter.
- Tiny, quiet — no analytics, no "share," no export-by-default. A genuinely private room.

## Security rules to enforce (don't let them slip)
1. Password → key derivation happens in the browser only. Password NEVER sent to the server.
2. Server stores + returns only ciphertext/salt/iv/iters. No plaintext column, ever.
3. Journal vault token (proves "unlocked this session") is separate from the derived key;
   the token authorizes the API, the key (in memory only) decrypts. Mirror `verifyVaultToken`.
4. Every route requires Story admin auth AND the journal token. No route returns plaintext.
5. In-memory key + password wiped on Lock, idle-timeout, refresh, and navigation away.
   Never in localStorage/sessionStorage.
6. Nothing logged: no ciphertext, no password, no derived key in any console/log line.
7. Forgotten password = unrecoverable. Surface this clearly at setup.

## Build order (one focused session)
1. Migration `story_journal_entries` (+ run in Supabase).
2. Reuse `vault-crypto.ts` (or a thin Story copy) for client-side encrypt/decrypt.
3. 5 API routes with strict validation + dual auth gate.
4. Journal vault token mint/verify (clone the media-vault token pattern).
5. UI: unlock gate → planner + journal views → distraction-free editor → autosave → lock.
6. Idle-lock + lock-on-blur.
7. (Optional) hidden entry point.
8. Test: write → lock → reload → unlock → read back; wrong password fails cleanly; confirm
   DB rows are pure ciphertext (`SELECT LEFT(ciphertext_b64,12) ...` shows base64 noise, and
   the plaintext never appears anywhere server-side).
9. Deploy (push via Desktop Commander per CLAUDE.md), verify on phone.

## Open questions for Tredoux before build
- Encrypt the entry **date** too (max privacy), or keep it plaintext for an easy calendar?
- Hidden entry point, or a normal (but private/locked) tab in the Story dashboard?
- Markdown support in the editor, or plain text only?
- Idle auto-lock timeout (5 min default?).
