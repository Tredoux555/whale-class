# Story — End-to-End Encryption Marathon (Plan)

Goal as stated: make Story "solid against even a state attack."
Honest engineering goal this plan actually delivers: **a server-blind Story** —
the server stores and relays only ciphertext it cannot decrypt, built on a vetted
crypto library (libsodium). This closes the breach / leaked-key / subpoena /
malicious-operator threats. It does **not**, and cannot, make a *web app* solid
against a determined state actor. Read the ceiling section before committing.

---

## The ceiling — what this marathon does NOT achieve (read first)

Because Story is a **web app, the server delivers the encryption JavaScript on
every page load.** A state actor who seizes or legally compels the server can push
a modified bundle that exfiltrates the user's key the next time they open the page.
No library prevents this — the delivery channel is the hole. Additionally, even
flawless E2E never hides:

- **Metadata** — that two parties communicate, when, how often, payload sizes. A
  state actor learns a great deal from this alone.
- **Availability** — the Great Firewall can block the domain at any time.
- **Endpoint** — a seized or malware'd phone defeats all crypto.

**If content genuinely must survive a determined state actor, it should not live in
a web app.** The two honest routes to that bar are: (a) use Signal for that
content, or (b) ship Story as a **native app** (code installed + verifiable once,
escaping the server-delivers-code problem) — and even then, metadata, blocking, and
device seizure remain. This plan is the right move for the *server-blind* goal; it
is not a substitute for Signal at the state-actor bar.

---

## What the marathon DOES achieve (the real win)

After this, a full server breach, a leaked `MESSAGE_ENCRYPTION_KEY`/`VAULT_PASSWORD`,
or a subpoena to Railway/Supabase yields **only unreadable ciphertext**. The
operator (you) can no longer read message content or vault files either — true E2E.
Keys are derived from a passphrase the two parties exchange **out-of-band** (in
person / over Signal) and are **never sent to the server**.

---

## Crypto foundation (vetted only — no hand-rolled primitives)

- **Library:** `libsodium` (`libsodium-wrappers` in the browser, native binding in
  Node for any server-side test vectors). Audited, constant-time, misuse-resistant.
- **Key derivation:** `crypto_pwhash` (Argon2id) from the shared passphrase →
  256-bit master key. Tuned to interactive/moderate ops-limit for phones.
- **Messages:** `crypto_secretbox` (XSalsa20-Poly1305) per message with a random
  nonce. *Trade-off:* a shared symmetric key has no forward secrecy. If forward
  secrecy is required, escalate to the **Double Ratchet** via `libsignal` (heavier,
  needs a key-exchange step) — decision flagged in Phase 1.
- **Large media / vault:** `crypto_secretstream` (chunked, authenticated) encrypted
  in the browser *before* upload. Server stores ciphertext chunks; download streams
  ciphertext back; browser decrypts. This simultaneously kills the unencrypted
  `'plain'` large-media hole (audit C2) and the single-`VAULT_PASSWORD` hole (H1).
- **Key storage:** master key held in memory + optionally wrapped in IndexedDB
  under the passphrase; wiped on lock/logout. Never transmitted.

---

## Phases

**Phase 0 — Decisions + test harness (0.5 day)**
Lock: forward-secrecy yes/no (secretbox vs Double Ratchet); passphrase recovery
policy (lost passphrase = unrecoverable — confirm acceptable); which surfaces go
E2E (messages only, or messages + media + vault). Stand up libsodium known-answer
test vectors so the core is proven before wiring.

**Phase 1 — Client crypto core (1–2 days)**
`lib/story/e2e/` — Argon2id KDF, encrypt/decrypt message, secretstream for files,
key lifecycle (derive/lock/wipe). Unit-tested against vectors. Zero server changes.

**Phase 2 — Message E2E + cutover (2–3 days)**
Encrypt in browser → server stores opaque blob. Remove the server-side
`encryptMessage`/`decryptMessage` path for new messages. Parallel-run: old messages
stay readable via legacy path during a migration window, new ones are E2E. Decide
whether to re-encrypt history (requires both parties online with the passphrase).

**Phase 3 — Media + vault E2E (2–3 days)**
Client-side `crypto_secretstream` before upload across `upload-media`, vault
upload, and the chunked large-file path. `signed-download` serves ciphertext only;
browser decrypts for playback. Retire `encrypted_key='plain'` entirely.

**Phase 4 — Metadata minimization (1 day)**
Reduce what a seized server reveals: drop/trim `story_login_logs`, IP capture,
`story_online_sessions`, visit tracking; pad message sizes where cheap; shorten
log retention. Push notifications carry no content ("You have a message" only).

**Phase 5 — Delivered-code integrity (1 day, honest ceiling)**
Subresource Integrity on the crypto bundle, pinned/reproducible builds, and a
published bundle hash users can verify. Document plainly that this *raises* the bar
but does not close the server-pushes-malicious-JS gap — that requires a native app.

**Phase 6 — Fold in audit Tier 1/2 fixes (0.5–1 day)**
Short signed-URL TTLs, vault step-up for destructive ops, admin-identity rate
limiting, stop returning admin token in JSON body, hard-delete storage on clear.
(Most of Phase 3 supersedes the vault crypto items.)

**Rough total: ~8–12 focused days.** Real marathon, touching most Story routes +
the client + a data migration.

---

## Trade-offs you're signing up for

- **Lost passphrase = permanently unrecoverable content.** No reset, by design.
- **No server-side previews, captions, search, or thumbnails** — the server can't
  read content.
- **Astra / any AI feature cannot read E2E messages or vault files.**
- **Push notifications become contentless.**
- **The weekly broadcast model changes** — a server-written "default story" can't
  exist if the server can't write readable content; that flow needs rethinking.
- **Web E2E remains weaker than native** for the reasons in the ceiling section.

---

## Recommendation

1. **Do the audit's Tier 1 fixes now regardless** (hours, real wins) — short
   signed-URL TTLs, vault step-up, rate-limit on admin identity, stop leaking the
   admin token in the body, hard-delete on clear.
2. **Run this marathon if the server/subpoena threat is what you care about.** It's
   the achievable, worthwhile 90% and a clean, finite project.
3. **For the literal state-actor bar: don't trust a web app with it.** Route that
   specific content through Signal, or commit to a native Story app as a separate
   track. Building web E2E and *believing* it beats a state actor is worse than not
   building it, because false confidence gets people hurt.

The most honest version of "should we get this done": **yes to server-blind Story,
no to the illusion that any browser app is state-proof.**
