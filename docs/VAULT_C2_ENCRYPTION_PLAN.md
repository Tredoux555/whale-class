# Vault C2 — Large-media at-rest encryption (PLAN, not yet implemented)

**Finding (Session 141 audit, deferred):** large Story vault media is stored with
`encrypted_key='plain'` — NOT encrypted at rest. Only the signed-URL TTL was
shortened as a stopgap. Small media (≤20MB) IS encrypted (AES-256-GCM).

**Investigated Jun 13 (overnight). DECISION: report-only — implementing the
contained version would BREAK playback.** Details below.

## Why large files are stored plain

Split point: `DIRECT_UPLOAD_THRESHOLD = 20MB` in
`app/story/admin/dashboard/hooks/useVault.ts`.

- **Small (≤20MB)** → `app/api/story/admin/vault/upload/route.ts`. Whole file
  buffered + AES-256-GCM encrypted. Format (`encryptFile`): `iv=randomBytes(16)`,
  `salt=randomBytes(32)`, `key=pbkdf2Sync(VAULT_PASSWORD, salt, 100000, 32,
  'sha256')`, GCM. On-disk blob `salt|iv|authTag|ciphertext`; `encrypted_key`
  column = `"${iv}:${authTag}"` (mostly a non-`plain` sentinel — salt/iv/tag are
  read back out of the blob).
- **Large (>20MB)** → `chunked/init` (opens a Supabase TUS resumable upload with
  the service key) → `chunked/chunk` (server relays 8MB pieces, never holding the
  whole file) → `finalize` (writes the row with `encrypted_key='plain'`,
  `file_hash='direct-upload'`).

AES-GCM must hold the entire plaintext to encrypt (authenticated over the whole
message, not random-access). A 150–535MB video blows Node's heap and can't even
reach an encrypting handler given Railway's ~32MB body cap. The chunked path
exists *specifically* to never buffer the whole file — so there is no point in
the current pipeline where the server can GCM-encrypt without re-introducing both
the OOM and the proxy-cap problems.

## The hard blocker (read side)

`app/api/story/admin/vault/download/[id]/route.ts` (FROZEN — tonight's streaming
work) decrypts **whole-buffer in memory**: downloads the entire object, holds
ciphertext+plaintext (~2× file size) in heap, decrypts, then slices the Range out
of the decrypted buffer. It caps `MAX_CONCURRENT_DECRYPTS = 4` for exactly this
reason, and GCM cannot be random-access decrypted. `signed-download/[id]` (the
seekable path large files use today) **explicitly rejects** any file where
`encrypted_key !== 'plain'`.

So encrypting large media with the existing format means the only route that could
read it is the whole-buffer one — and a `<video>` element fires dozens of Range
requests per playback, each re-downloading + re-decrypting the full 535MB file.
Four in flight ≈ multi-GB heap → OOM; the rest 503. That **breaks playback** of
the newly-encrypted large files, violating the "never break playback" rule.

## The real fix (when prioritized) — streaming AEAD

1. **Per-chunk AES-256-GCM framing** inside `chunked/chunk`: encrypt each 8MB
   chunk independently as its own GCM frame (`[len][iv][tag][ciphertext]` per
   frame), so no step ever holds the whole file. Store a distinct `v2` sentinel
   in `encrypted_key` (e.g. `"v2-chunked"`).
2. **New `stream-download/[id]` route** that maps an HTTP Range to the set of
   frames covering it, fetches + decrypts only those frames, returns 206. The two
   existing download routes stay frozen and untouched.
3. **Backward compatibility:** legacy `plain` rows and small-encrypted rows keep
   working through the existing routes — branch on `encrypted_key`.
4. **Migration for existing plain files:** recommend leaving legacy plain as-is +
   a UI "unencrypted (legacy)" badge; optional backfill script that re-frames old
   large objects (read plain → write v2 framed → flip sentinel).

**Effort:** ~1.5–2.5 days (+1 day for the backfill script). **Cheap to fold in
H1** (per-file DEK wrapped by a KEK) in the same pass since you're already
rewriting the frame header — store a wrapped per-file key in the frame preamble.

## Status

NOT implemented (correctly — the contained version breaks playback). Existing
plain + small-encrypted media are untouched and fully working. This is a
deliberate, scoped future project, not an overnight change.
