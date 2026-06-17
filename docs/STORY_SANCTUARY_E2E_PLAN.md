# Sanctuary — Operator-Blind Journal + Private Coach (Plan)

**Decision (Tredoux, Jun 17 2026):** Option A — *operator-blind journal, private
coach*. Her saved journal must be unreadable to **anyone** but her (not the operator,
not Tredoux, not a subpoena to Railway/Supabase). The AI Coach stays, but it only works
with what she brings to a conversation — it does **not** silently read a server-readable
copy of her diary.

This plan adapts the existing `docs/STORY_E2E_MARATHON_PLAN.md` (which covers the
*messaging/vault* surface) to the **sanctuary journal + coach** surface.

---

## The honest ceiling — read first

- **A web app cannot fully deliver "no one can ever read this."** On the web the server
  delivers the encryption JavaScript on every load, so a compromised/compelled server
  could ship a build that steals her key. The *bulletproof* version of Option A is a
  **native iOS app** with the key held in the device Keychain/Secure Enclave — the code
  is installed and verifiable once, escaping the server-delivers-the-code hole.
- **The live coach turn is still seen by the AI in the moment.** When she talks to the
  coach, that turn's text goes to Anthropic to generate a reply, then is discarded and
  never stored readable. Her *journal at rest* is unreadable to anyone; her *live coach
  chat* is processed transiently by the AI. That is the honest boundary of Option A — and
  it's a good one for a survivor: a truly private notebook + a coach she controls what she
  tells.
- **Even perfect crypto never hides metadata** (that she logs in, when, that entries
  exist), availability (the GFW can block the domain), or a seized device.

What we CAN honestly say after this build (native): *"Your journal is encrypted with your
password on your own device. We cannot read it. No one can — not even us. When you talk to
your coach, your words are sent securely to the AI to reply, then discarded."*

---

## Data-safety rule (non-negotiable)

**Do NOT migrate or re-key Tredoux's or Riddick's existing data.** Their sanctuaries use
the current server-held key (`lib/story/diary-crypto.ts`, ~16 import sites) and must keep
working untouched. The new operator-blind model is **additive and space-scoped**: a
per-space flag (`e2e: true`) selects the new path. Bayan's space is the first on it.
Existing spaces stay on the server-key path until/unless deliberately migrated. No bulk
refactor of the live crypto.

---

## Architecture

### Key (from her password, on her device)
- On first login (the claim flow already shipped), derive a 256-bit master key with
  **Argon2id** (`crypto_pwhash`, libsodium) from her password + a per-user random salt.
  Salt is stored server-side (not secret). **The master key never leaves the device.**
- Login auth and the encryption key are derived separately (different salts/domains) so
  the value sent for login can't double as the content key.
- Lost password ⇒ **content is permanently unrecoverable.** By design. She must be told
  this plainly at setup.

### Journal at rest (server-blind)
- Diary entries (`story_diary_entries`) for an `e2e` space are encrypted **on her device**
  with `crypto_secretbox` before they're sent. The server stores opaque ciphertext +
  plaintext-safe metadata only (date, mood tag if she allows it — or nothing).
- Reads return ciphertext; her device decrypts. The server, the operator, and Tredoux
  cannot read a single entry.
- Coach memory (`story_coach_memory`) + projects + plans get the same treatment for an
  `e2e` space.

### The coach channel (the key design)
- The device holds the key, so the **device assembles the coach's context**: it decrypts
  the relevant memory/recent entries locally and includes them in *that one* request.
- The server relays the assembled prompt to Anthropic, streams the reply back, and
  **persists nothing in plaintext** — any saved memory/diary the coach writes is
  re-encrypted on the device before storage.
- Net: the coach still "knows her" (device supplies context per turn), the AI sees only
  that turn transiently, and the durable store stays server-blind.

### Crypto foundation (vetted only)
- **libsodium** (`libsodium-wrappers`). Argon2id KDF, `crypto_secretbox` per record,
  `crypto_secretstream` for any media. No hand-rolled primitives. Known-answer test
  vectors before wiring (mirrors the marathon plan's Phase 0/1).

---

## Phases

**Phase 0 — Decisions + crypto core (web, ~1 day).**
Lock: password-recovery policy (lost = unrecoverable — confirm), what metadata is allowed
in clear (dates/moods or nothing), `e2e` space flag. Build `lib/story/e2e/` (KDF,
encrypt/decrypt, key lifecycle: derive on login → hold in memory → wipe on lock/logout),
unit-tested against vectors. Zero server changes.

**Phase 1 — Operator-blind journal on the web (~2–3 days).**
Wire the diary read/write for `e2e` spaces through client crypto. Server stores ciphertext.
Real win: her saved journal is server-blind **today** — with the documented web caveat
(server ships the JS). Forward-compatible with the native app.

**Phase 2 — Coach channel rework (~2–3 days).**
Move context assembly to the device for `e2e` spaces (decrypt memory/entries locally →
send per-turn). Coach writes are re-encrypted client-side. Coach keeps working without a
server-readable diary.

**Phase 3 — Native iOS app (the real claim, separate track, weeks).**
The honest "no one can read this" version. Key in Keychain/Secure Enclave, code installed
once and verifiable, App-Store-grade privacy claim. Reuses the Phase 0–2 crypto + the
existing backend (which now only ever sees ciphertext). Needs the Apple Developer account
(in progress) + a native build of the sanctuary UI.

**Phase 4 — Metadata minimization (~1 day).**
Trim login logs / IP capture / online-session tracking for `e2e` spaces; contentless push
("You have a new reflection"); short log retention.

---

## Tradeoffs she/you sign up for
- **Lost password = permanently unrecoverable journal.** No reset, ever.
- The coach **cannot silently read her whole history** — it works with what the device
  feeds it per conversation. (This is the point.)
- No server-side search/preview of entries (server can't read them).
- Web phase carries the ship-the-JS caveat; only the native app removes it.

---

## Recommendation / sequencing
1. **Phases 0–2 on the web first** — real, honest progress (server-blind journal +
   working private coach), shippable in increments, and the exact crypto the native app
   reuses. Each phase audited before the next, per Tredoux's standing rule.
2. **Phase 3 (native iOS) is the only thing that earns the literal "no one can read this"
   claim** — schedule it as its own track alongside the Apple Developer enrolment.
3. **Until Phase 3 ships, do not make an absolute "end-to-end / no one can see" claim**
   on the App Store or to her. Describe it accurately: "encrypted with your password; we
   don't read your journal."
