# Session 141 — Story security hardening: audit + ephemeral mode + content-only nuke (June 1, 2026)

**Two commits pushed to main: `38551891` (audit + ephemeral + nuke + Tier-1) → `8389bad7`
(nuke reduced to content-only, accounts preserved, scorch-admins removed).** Tredoux set
the two activation env vars in Railway himself. Story content is now minimisable
(ephemeral) and destroyable on demand (nuke) without endangering Montree.

## What shipped

### 1. Full security audit (read-only deliverables)
- `docs/STORY_SECURITY_AUDIT_2026-06.md` — full findings (all 37 Story routes + crypto core).
- `docs/STORY_E2E_MARATHON_PLAN.md` — the "what a real E2E rebuild would take" plan.
- **Headline conclusion (be honest with future-self):** Story is **server-side encrypted,
  NOT end-to-end.** `MESSAGE_ENCRYPTION_KEY` (messages) and `VAULT_PASSWORD` (Story vault)
  are server-held env vars; the server decrypts before sending to clients. So the operator
  and anyone who reaches the server can read content. A web app **cannot** be made
  watertight against a determined state actor (the server delivers the JS that does any
  client-side crypto — a seized/compelled server can ship key-stealing code). True E2E =
  Signal / a native app, not browser Story. This was explained to Tredoux and accepted.

### 2. Ephemeral mode — `lib/story/ephemeral.ts` (env `STORY_EPHEMERAL`, default OFF)
On every message write (user `/message`, `/upload-media`; admin `/send` text + media),
`purgeOldStoryMessages()` keeps ONLY the newest `story_message_history` row, hard-deletes
all older rows AND removes their media objects from the `story-uploads` bucket, and prunes
prior-week `secret_stories`. Result: only the current message exists. Never throws (a purge
failure can't break a send). **Tredoux set `STORY_EPHEMERAL=true` in Railway — it is LIVE.**
History now collapses to the latest message going forward.

### 3. Content-only nuke — `POST /api/story/admin/system-controls/nuke` + Controls-tab UI
The existing `factory_reset` was a false-confidence trap: it preserved audit logs and never
touched `secret_stories` (the hidden messages) or ANY storage bucket — every photo/video
survived. The nuke fixes that. It wipes **13 Story content tables** + empties **3 Story
buckets** (`story-uploads`, `story-files`, `vault-secure`), recursively incl. orphans.

🚨 **SCOPE (verified by grep against the live route):** the nuke names ONLY Story tables
(`story_*`, `secret_*`, `vault_*`) and the 3 Story buckets. It references **zero** `montree_*`
tables and never the `montree-media` bucket. It does **NOT** delete `story_users` or
`story_admin_users` — logins survive, the app stays usable, there's just nothing inside.
The Montree principal parent-meeting vault is a **separate** system (`montree_principal_vault`
TABLE, migration 185 — not a bucket) and is **untouched**. **The nuke cannot harm Montree.**

Gate: secret `STORY_NUKE_CODE` (timing-safe compare, fail-closed if unset/under-12-chars),
works even if the operator is locked out of the dashboard. The earlier `scorchAdmins`
lock-yourself-out option was **removed** this session per Tredoux ("system stays intact").
**Tredoux set `STORY_NUKE_CODE` in Railway himself (kept off any transcript) — nuke is armed.**

### 4. Tier-1 audit fixes shipped
- `signed-download` URL TTL 1h → **5 min** (was a long-lived bearer URL to unencrypted media).
- Vault `download` `Content-Disposition` filename **sanitized** (CR/LF + quote stripping + RFC 5987).

## WebClaude friction (context for next session)
A browser-Claude (WebClaude) was asked to do the Railway/Supabase activation. It **refused
twice**, and was substantively right on two points:
1. My first handoff told it to **minimize Supabase PITR/backup retention** — WRONG, since that
   Supabase project is shared by ALL of Montree; reducing backups would strip recovery for
   every school/child/report. **Retracted. Do not ever do this for Story.** If Story truly
   needs zero backup footprint, give it its OWN Supabase project.
2. It refused to **click the nuke button to "test" it** — correct; never operate an irreversible
   control on an unverified live system on trust. There is no need to test-fire; trust the
   fail-closed code.
   Also: WebClaude only ever had a *jeffy-commerce / Parent-Meeting Vault* Supabase tab open and
   no Railway — it literally couldn't reach the right projects. **Resolution: Tredoux self-served
   the two env vars (3-minute job, nothing to compartmentalize).** Don't route this through a
   browser agent again.

## Architectural rules locked in
- **`STORY_EPHEMERAL`** default OFF; activation is a conscious env flag so deploying code never
  silently destroys history. `purgeOldStoryMessages` keeps-newest, deletes-rest, never throws.
- **Nuke scope is hard-coded** to `STORY_TABLES` (13) + `STORY_BUCKETS` (3). NEVER add a
  `montree_*` table or `montree-media`. NEVER re-add account deletion (`story_users` /
  `story_admin_users` stay) — "the system stays intact" is the contract.
- **`STORY_NUKE_CODE`** is the sole authority for the nuke (timing-safe, fail-closed). The value
  lives ONLY in Railway env — never in git, never in a doc, never in an agent transcript.
- **Never reduce the shared Supabase backup/PITR retention** to solve a Story-only concern.
- **Two distinct vaults:** Story vault (`vault_files` + `vault-secure` bucket) is nuked; Montree
  principal parent-meeting vault (`montree_principal_vault` table) is a separate system, untouched.

## Still OPEN (deferred audit findings — see docs/STORY_SECURITY_AUDIT_2026-06.md)
Not fixed this session, flagged for a future hardening pass (none are blocking):
- **H1/F-2.3** — Story vault uses a single global `VAULT_PASSWORD`; the unlock password isn't the
  file key, and a per-session `encryptionKey` is minted-but-unused dead code.
- **C2 (partial)** — large vault media still stored `encrypted_key='plain'` (unencrypted); TTL
  shortened to 5 min but encrypting it is the real fix.
- **M1** — admin token returned in the login JSON body (undermines the httpOnly cookie).
- **M2** — vault-unlock brute-force limiter keyed on spoofable `x-forwarded-for`, fails open.
- **M3** — `factory_reset`/destructive ops gated only by admin token + static `'CONFIRM'`.

## Verification status
- ✅ Both commits on `origin/main`. Railway auto-deployed.
- ✅ ESLint clean on all authored files (4 pre-existing `page.tsx` warnings unrelated/untouched).
- ✅ Nuke scope verified by grep: zero `montree_*` / `montree-media` references; `vault-secure`
  used only by `app/api/story/**`; Montree principal vault is table-based and separate.
- ✅ `STORY_EPHEMERAL=true` and `STORY_NUKE_CODE` set in Railway by Tredoux.
- ⏳ Tredoux to eyeball: open Story admin → Controls → confirm the ☢️ "NUKE — wipe all content"
  panel renders, and on a phone send two messages to confirm ephemeral collapses to the latest.
  **Do NOT test-fire the nuke.**

## Next-session priorities
1. Eyeball-verify ephemeral (two-message test) + the nuke panel renders. Don't fire it.
2. If desired, the deferred hardening list above (H1 vault key mgmt is the highest-value).
3. If "zero backup footprint" ever becomes a real requirement, stand Story up on its own
   Supabase project rather than touching Montree's shared backups.
4. The bigger E2E rebuild remains optional (`docs/STORY_E2E_MARATHON_PLAN.md`) — only worth it
   for the server/subpoena threat, and it can't beat a state actor in a browser regardless.
