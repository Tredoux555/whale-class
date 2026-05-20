# Montree Encryption Runbook

**Subject:** application-layer AES-256-GCM encryption of parent-school messages, meeting notes, and call transcripts.

**Status:** shipped Session 121, gated behind `encryption_v1` feature flag (default OFF).

**🚨 The marketing line you can defensibly use** (after flipping the flag on and verifying):

> "Every parent-school message, every meeting summary, every call transcript is encrypted at rest with AES-256-GCM — the same algorithm banks and governments use to protect classified data. Even if an attacker stole our database, they'd see scrambled bytes."

What you can NOT say:
- "We can't read your data" — server holds the key, can decrypt. (That'd require Vault-style E2E which would break Tracy/Mira.)
- "Photos are encrypted by us" — photos are encrypted-at-rest by Supabase Storage, not by our application layer.

---

## 1. What's encrypted

| Table | Column(s) | Notes |
|---|---|---|
| `montree_thread_messages` | `body` | Parent ↔ teacher, parent ↔ principal, principal observer threads, agent ↔ principal, agent ↔ super-admin |
| `montree_meeting_notes` | `summary`, `transcript`, `notes` | Teacher- and principal-authored parent-meeting notes |
| `montree_appointment_recordings` | `transcript`, `summary` | Cloud Recording Whisper transcript + Sonnet summary (Stage B, not yet active) |

Each row has an `encryption_version` column:
- **NULL** → legacy plaintext (pre-encryption rows, served as-is)
- **1** → AES-256-GCM with the current `MONTREE_ENCRYPTION_KEY`

Reads branch on `encryption_version`. Writes branch on the `encryption_v1` feature flag.

## 2. Initial activation playbook (one-time)

### Step 1 — Run migration 226

In Supabase SQL Editor, paste the contents of `migrations/226_montree_encryption_v1.sql`. Verify with:

```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name = 'encryption_version'
  AND table_name IN ('montree_thread_messages', 'montree_meeting_notes', 'montree_appointment_recordings');
```

Expected: 2 rows (3 if migration 223 has been run, else 2 — recordings table only exists post-223).

```sql
SELECT feature_key, default_enabled FROM montree_feature_definitions
WHERE feature_key = 'encryption_v1';
```

Expected: 1 row, `default_enabled = false`.

### Step 2 — Generate the encryption key

On your Mac:

```sh
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

This emits a 32-character hex string. Copy it.

**🚨 BACKUP THE KEY**:
- Save in 1Password as `MONTREE_ENCRYPTION_KEY`
- Save the key on a printed sheet, in a safe (paper backup)
- Never commit to git. Never log to console. Never paste into chat.

Losing this key permanently corrupts every encrypted row.

### Step 3 — Set the env var

**Railway production:**

Settings → Variables → New Variable:
- Key: `MONTREE_ENCRYPTION_KEY`
- Value: (the 32-char string from Step 2)

**Local `.env.local`:**

```
MONTREE_ENCRYPTION_KEY=<that string>
```

### Step 4 — Deploy

Push the Session 121 code. Railway auto-deploys. The flag is still OFF so the code reads/writes plaintext as before. No behavior change yet.

### Step 5 — Smoke test the key

Visit `/montree/admin` as a principal. Tracy should still work. Open a parent thread, see existing messages render correctly (they're legacy plaintext, encryption_version NULL).

### Step 6 — Flip the flag

In Supabase SQL Editor, enable globally:

```sql
UPDATE montree_feature_definitions
SET default_enabled = true
WHERE feature_key = 'encryption_v1';
```

OR enable per-school first (recommended — try on Whale Class):

```sql
INSERT INTO montree_school_features (school_id, feature_key, enabled)
VALUES ('c6280fae-567c-45ed-ad4d-934eae79aabc', 'encryption_v1', true)
ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true;
```

After flipping, **NEW writes are encrypted** but existing rows stay plaintext. The app still works because reads branch on `encryption_version`.

### Step 7 — Send a test message

Post a parent-thread message. In Supabase SQL Editor:

```sql
SELECT id, encryption_version, LEFT(body, 30) AS body_preview
FROM montree_thread_messages
ORDER BY sent_at DESC LIMIT 5;
```

The newest row should show `encryption_version=1` and `body_preview` starting with `gcm:`. Reload the chat in the app — should still render plaintext (server-side decrypt).

### Step 8 — Backfill existing rows (optional but recommended)

To upgrade legacy plaintext to v1:

```sh
# Dry run first
node scripts/encrypt-existing-rows.mjs --dry-run

# Live commit when ready
node scripts/encrypt-existing-rows.mjs --commit
```

The script is idempotent. Can be re-run safely.

---

## 3. Rollback playbook

### Scenario: bug in encryption path, need to flip back to plaintext

1. **Flip the flag OFF** in Supabase SQL Editor:

   ```sql
   UPDATE montree_feature_definitions
   SET default_enabled = false
   WHERE feature_key = 'encryption_v1';
   ```

2. **New writes go back to plaintext.** Existing encrypted rows still decrypt on read (the env var is still set, `encryption_version=1` rows still work via the read branch).

3. **(Optional) reverse the backfill** to fully eliminate encrypted state:

   ```sh
   node scripts/decrypt-existing-rows.mjs --dry-run
   node scripts/decrypt-existing-rows.mjs --commit
   ```

   This reads every v1 row, decrypts, writes plaintext back, clears encryption_version to NULL. Idempotent.

4. **Watch the sentinel hits.** The decrypt script aborts with a warning if it finds rows that decrypt to `[Encrypted — could not decrypt]`. That means the key in env doesn't match the key used to encrypt. Fix the env BEFORE re-running.

---

## 4. Key rotation playbook

### When to rotate

- The current key has been exposed (accidental log, screenshot, chat paste).
- A team member with key access has left.
- Annual hygiene rotation.

### How to rotate (procedure)

This requires a maintenance window of ~10-30 min depending on row count.

#### Step 1 — Decrypt all existing rows back to plaintext

```sh
# Use the CURRENT key (still in env)
node scripts/decrypt-existing-rows.mjs --commit
```

At this point all rows are `encryption_version=NULL` (plaintext). The flag is still ON, so app remains operational — new writes still go through encrypt-on-write with the current key, but no rows are currently encrypted.

#### Step 2 — Brief maintenance window

For ~30 seconds, flip the encryption flag OFF so no new writes happen with the old key while you swap:

```sql
UPDATE montree_feature_definitions
SET default_enabled = false
WHERE feature_key = 'encryption_v1';
```

#### Step 3 — Swap the key

- Generate a new 32-char hex string
- Update `MONTREE_ENCRYPTION_KEY` in Railway
- Wait for the next Railway deploy to pick it up (~30s)
- Update `.env.local` to match

#### Step 4 — Flip the flag back ON

```sql
UPDATE montree_feature_definitions
SET default_enabled = true
WHERE feature_key = 'encryption_v1';
```

#### Step 5 — Re-encrypt all rows with the new key

```sh
node scripts/encrypt-existing-rows.mjs --commit
```

Done. All rows now encrypted with the new key. Old key can be archived (don't destroy — keep in a sealed envelope in case a stale backup is restored).

---

## 5. Failure modes table

| Symptom | Cause | Fix |
|---|---|---|
| `[Encrypted — could not decrypt]` sentinel appears in UI | Key in env doesn't match key used to encrypt | Restore the correct key from 1Password / paper backup |
| 500 on POST a message after flag flip | `MONTREE_ENCRYPTION_KEY` env var not set OR wrong length | Set it in Railway; redeploy. Code falls back to plaintext on misconfig, but loud-logs `[montree-crypto] encryption_v1 flag ON but key missing` so check Railway logs |
| Tracy returns blank or sentinel content | Tracy reads `montree_thread_messages.body`; if it's encrypted but read path doesn't decrypt, sentinel surfaces | Already fixed in Session 121 — Tracy's tool-executor decrypts via `readEncryptedField`. If broken, verify `encryption_version` is in the SELECT |
| `42P01` error on writes | Migration 226 not run | Run it in Supabase SQL Editor |
| Audit log shows mismatched `gcm:` prefixes after rotation | Old key still encrypting some rows | Wait for full Railway deploy; verify env var |
| Backfill stuck at 0 rows | All rows are already encrypted, OR no rows match the filter | Read the dry-run output — `Encrypted: 0` means nothing to do. Run `--commit` if you have pending rows |

---

## 6. Architectural rules (locked in Session 121)

1. **`MONTREE_ENCRYPTION_KEY` is a 32-character utf8 string.** Generated via `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`.
2. **Each row stores its `encryption_version`.** Reads branch on this value. Writes branch on the feature flag.
3. **Ciphertext format: `gcm:<iv-hex>:<authTag-hex>:<ciphertext-hex>`.** Mirror of Story system's `lib/message-encryption.ts`.
4. **`readEncryptedField(value, version)` is the canonical decrypt helper.** Returns plaintext, or the sentinel on any failure. Never throws.
5. **`writeEncryptedField(plain, enabled)` is the canonical encrypt helper.** Returns `{ value, version }` ready to spread into an insert.
6. **`isEncryptionEnabledForSchool(supabase, schoolId)` is the canonical flag resolver.** Handles NULL school_id (agent_super_admin threads) by falling through to global default.
7. **The decrypt path stays in code forever.** Old encrypted rows must continue to decrypt cleanly through future deploys.
8. **PATCH-on-existing-row notes encryption mirrors the row's existing `encryption_version`.** A v1 row's notes update gets encrypted v1; a NULL-version row's notes update stays plaintext. Half-encrypting a row is forbidden.
9. **`shareMeetingNoteToThread` expects plaintext summary.** Callers MUST decrypt before passing. The helper re-encrypts independently for the message domain.
10. **Audio bytes are NEVER persisted.** Whisper sees them in flight only — application-layer encryption doesn't apply.
11. **Photos are NOT encrypted at the application layer.** They live in Supabase Storage with bucket-level encryption-at-rest.
12. **The Story system uses `MESSAGE_ENCRYPTION_KEY` (different env var).** Don't share keys between Story and Montree — they're separate domains with independent rotation schedules.

---

## 7. Verification commands

```sh
# Verify env var is set + correct length (don't print the value)
node -e "console.log('configured:', !!process.env.MONTREE_ENCRYPTION_KEY, 'length:', (process.env.MONTREE_ENCRYPTION_KEY||'').length)"

# Run the self-test (32 tests, includes tamper detection + key rotation)
npm exec --yes -- tsx@4.22.3 scripts/test-montree-crypto.mjs

# Probe how many rows are encrypted vs plaintext
psql ... <<EOF
SELECT
  'thread_messages' as table_name,
  COUNT(*) FILTER (WHERE encryption_version IS NULL) AS plaintext,
  COUNT(*) FILTER (WHERE encryption_version = 1) AS encrypted
FROM montree_thread_messages
UNION ALL
SELECT 'meeting_notes',
  COUNT(*) FILTER (WHERE encryption_version IS NULL),
  COUNT(*) FILTER (WHERE encryption_version = 1)
FROM montree_meeting_notes;
EOF
```

---

## 8. Subprocessor disclosure (for privacy policy)

Even with application-layer encryption, the following third parties briefly see plaintext content during normal operation:

- **OpenAI Whisper** — receives raw audio for transcription (~30s in-flight). Audio is NEVER stored in our DB or storage; bytes are discarded after Whisper responds. OpenAI's default retention is 30 days (per OpenAI policy).
- **Anthropic** — receives plaintext transcripts + summaries for Sonnet to write briefings. Subject to your existing Anthropic API agreement (30-day retention, no training).
- **Agora** — handles WebRTC media (audio + video). Streams are encrypted in transit via DTLS-SRTP. Agora's infrastructure has theoretical access during routing.
- **Supabase** — manages the database. Encryption at rest by Supabase is separate from application-layer encryption. Service-role key + Railway env var compromise would expose plaintext.

Photos in Supabase Storage are protected by bucket-level encryption-at-rest only.
