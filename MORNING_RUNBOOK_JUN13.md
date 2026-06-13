# ☀️ Morning Runbook — Jun 13, 2026 (overnight marathon)

Single source of truth for "what do I run / merge / set" after the overnight burn.
Full narrative is in `HANDOFF_LATEST.md`; architecture brain is `CLAUDE.md` (rules → #171).

**The burn list is COMPLETE.** Tier 1–4 of the original plan + extra waves (perf
implementation, story-security hardening, backups, jeffy security, audits) all
shipped. Everything is on branches, audited, build-green, nothing auto-deployed.

---

## 1. Merge the whale branch
`burn-jun12-night2` (23 commits) → `main`. Pre-merge review verdict: **GO**.
Build green, 143/143 tests, i18n 12/12, no new lint warnings, no new security
exposure. Merging auto-deploys to montree.xyz via Railway — gets `/support` live
for the Apple reviewer.

## 2. Run the SQL (Supabase SQL editor, whale-class project) — in order
See the SQL blocks below / pasted in chat. All idempotent (safe to re-run).
- **254** — `montree_campaign_items` (unblocks Campaign Command Center).
- **255** — `montree_push_outbox` + `montree_parents.notification_prefs`.
- **249** — `montree_home_practice_cards` — Jun 10 leftover, status UNCERTAIN.
  Run the existence check first; the migration is idempotent so running it
  either way is safe.

Already RUN (do NOT re-run unless verifying): 250, 251, 252, 253 + RUN_THESE 01/03/04/05/06.

## 3. Set Railway env (whale)
No NEW env var is required by the branch, but confirm these exist (the vault /
system-controls hardening assumes them): `VAULT_PASSWORD`, `VAULT_PASSWORD_HASH`,
`STORY_NUKE_CODE`, `STORY_JWT_SECRET`, `MONTREE_JWT_SECRET` (pin = current
`ADMIN_SECRET` value, per Session 140).

## 4. Cloudflare — fix Error 1034 (2 min, VPN ON)
Flip `montree.xyz` + `www` to **DNS only** (grey cloud). Steps in
`docs/DNS_ERROR_1034_FIX.md`. After deploy, `curl -sI` the cached pages and
confirm `cf-cache-status: HIT` on `/pricing`, `/support`, `/privacy`.

## 5. Apple Review School + App Store
- Verify codes on a real device: principal **WYXMN9**, teacher **BAM4S9**.
- **Extend the trial past Jun 19** (`trial_ends_at`) or the reviewer hits expiry.
- Exclude the "Apple Reviewer" `montree_leads` row from outreach.
- Recapture the 2 weak screenshots (snap = black camera headless; weekly-wrap =
  no demo reports) — see `~/Desktop/Montree App Store Pack/SCREENSHOTS/`.
- Verify `support@montree.xyz` actually receives mail.

## 6. jeffy-mvp (SEPARATE repo `~/Desktop/Master Brain/ACTIVE/jeffy-mvp`)
Branch `security-fixes-jun13` (commits `758e2d8` + `48c8428`, build green, NOT
pushed — audited MERGE-SAFE). Before merging/deploying:
- Set Railway env: non-default `ADMIN_PASSWORD` + `SESSION_SECRET`,
  `PAYFAST_PASSPHRASE`, `CRON_SECRET`; confirm `PAYFAST_ENFORCE_IP=true`.
- After passphrase is on, confirm a real test payment completes (pre-existing
  alphabetical-sort in `validateSignature` — check prod logs aren't rejecting).
- Note: the customer-cancel component isn't mounted on any page yet — wire it on
  an order-tracking page (pass `email` prop).
- Full audit: `~/Desktop/AUDIT-2026-06/FUNCTIONALITY-jeffy-mvp.md`.

## 7. Guardian Connect (SEPARATE repo)
Branch `flutter-catchup-jun12` is analyze-clean + merge-ready (Claude-side).
Merge → main, reconcile local main vs the diverged GitHub main, then a device build.

## 8. Housekeeping
- Overnight uptime monitor still running: `~/Desktop/montree_uptime_overnight.log`.
  Stop it: `pkill -f montree_monitor`. (5–8 transient `http=000` drops overnight,
  not 1034; site healthy.)
- Weekly Supabase backup is scheduled (launchd, Sundays 04:00). If the
  service-role key rotates, update `~/Library/Scripts/montree/backup.env` too.

## Bigger projects documented, NOT done (need daytime / your input)
- Vault C2 large-media at-rest encryption — `docs/VAULT_C2_ENCRYPTION_PLAN.md` (~2d, streaming AEAD).
- Vault H1 (per-file DEK/KEK), M1 (story admin token in login body — 4-step plan in the route).
- Locale-bearing funnel pages edge-caching (Option A/B restructure).
- jeffy `OrderModificationRequest` still uses the anon client (same class as the cancel fix).
