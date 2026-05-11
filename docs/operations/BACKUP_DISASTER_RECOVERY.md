# Backup + Disaster Recovery — Montree

Last reviewed: May 11, 2026

This doc captures the answers to "what happens if X breaks". Keep it current.

---

## What gets backed up (and where)

### 1. Postgres database (Supabase)

- **Provider auto-backups:** Supabase Pro plan includes daily automated backups + Point-in-Time Recovery (PITR) for the last 7 days
- **Location:** Supabase's S3 (we don't manage)
- **Access:** Supabase Dashboard → Project Settings → Database → Backups
- **Recovery time objective (RTO):** ~10 minutes for daily restore, < 1 minute for PITR
- **Recovery point objective (RPO):** PITR = < 60 seconds. Daily backup = up to 24 hours of data loss
- **What lives here:** Everything user-facing — schools, classrooms, children, teachers, parents, photos metadata, AI usage, finance transactions, payouts, audit logs

### 2. Storage (Supabase Storage / Cloudflare)

- **Provider:** Supabase Storage buckets for photo originals + report PDFs
- **CDN proxy:** Cloudflare in front of `storage/v1/object/public/*` for cache + edge delivery
- **Backup status:** Supabase does NOT auto-backup storage buckets. Originals live in S3-style storage but have no separate snapshots
- **What lives here:** Raw photo uploads, generated weekly-wrap PDFs, classroom photo bank assets, story system media
- **Risk:** If a bucket is accidentally deleted, photos are gone. Mitigation: super-admin must NEVER drop buckets; restore requires Supabase support ticket

### 3. Stripe (revenue / customer / connect accounts)

- **Stored at Stripe:** customer IDs, subscription IDs, invoice history, Connect account states, payouts
- **Backup status:** Stripe maintains everything indefinitely. No action required on our side
- **Local mirror:** `montree_billing_history`, `montree_finance_transactions`, `montree_schools.stripe_*` cols
- **If our DB is lost:** Stripe is the source of truth for everything that touched real money. We can rebuild the local mirror by re-running webhook handlers against past events.

### 4. Source code (GitHub)

- **Remote:** `github.com:Tredoux555/whale-class.git` (SSH)
- **Local mirror:** `~/Desktop/Master Brain/ACTIVE/whale` on Tredoux's Mac
- **Risk:** If GitHub is unavailable, deployment via Railway pauses. Local working copy is also a backup
- **Note:** Cowork VM SSH key "Cowork VM Feb 15" is the canonical push path. Old "Cowork VM" Feb 11 key is stale. See CLAUDE.md.

---

## Recovery procedures

### A. Database is corrupted / wrong data committed

**Most common scenario:** a manual super-admin action wrote bad data. The data is recent.

1. Go to Supabase Dashboard → Project → Database → Backups → **Point-in-Time Recovery**
2. Choose a timestamp 5-10 minutes before the bad write
3. Click "Restore" — Supabase spins up the snapshot at that point
4. The dashboard shows the restored database
5. Either:
   - Promote the restore (replaces current DB — destructive)
   - Run targeted SQL to copy the missing/correct rows back to current DB

**Less common: full DB lost / unrecoverable corruption**

1. Supabase → Project Settings → Database → Backups → pick most recent daily backup
2. Click Restore. Confirms.
3. RTO ~10 minutes.
4. Inform users via in-app banner + email (if Resend is up) about data loss window
5. Re-fire Stripe webhooks for the gap window to rebuild billing rows (Stripe Dashboard → Developers → Events → resend each event)

### B. Storage bucket missing photos

**Risk:** Tredoux or a super-admin accidentally drops/empties a bucket.

1. **Immediately stop further writes** — disable photo upload feature flag in `montree_school_features` for all schools (`UPDATE montree_school_features SET enabled = false WHERE feature_key LIKE 'photo%';`)
2. Open Supabase Support ticket — request bucket restore. Supabase keeps soft-deletes for ~30 days
3. While waiting, the DB still has photo metadata + Cloudflare cache may still hold images served in last 24h — don't bust Cloudflare cache
4. Restore + re-enable feature flags

### C. Stripe Connect transfers errored mid-flight

**Scenario:** Payout wire fires, status flips to paid in DB, but Stripe transfer fails to land.

1. Open Money tab → find the row marked `paid`
2. Click the Stripe transfer ID link → opens Stripe Dashboard
3. If Stripe shows status=failed/canceled — manually PATCH the row back to pending in Supabase:
   ```sql
   UPDATE montree_agent_payouts
   SET status = 'pending', stripe_transfer_id = NULL, paid_at = NULL, paid_by_method = NULL,
       notes = 'Reverted from paid — Stripe transfer failed (ref: <orig_transfer_id>)'
   WHERE id = '<payout_id>';
   ```
4. Re-fire the wire from the Money tab

**Idempotency guard:** Stripe `transfers.create` uses idempotencyKey `montree_payout_${payoutId}_${cents}` which dedups for ~24h. Within that window, retries are safe. Outside it, manual review required.

### D. Webhook missed events (Stripe → us)

**Scenario:** Railway was down when Stripe fired an event. Our DB is stale.

1. Stripe Dashboard → Developers → Webhooks → click the endpoint
2. Filter "Last 7 days" — find events with status=Failed or no Delivered timestamp
3. For each failed event, click → Resend
4. Stripe re-fires immediately. Our webhook handler is idempotent via `(source, source_ref)` unique constraint in `montree_finance_transactions` so replays are safe.

### E. Lost SSH access (cannot push)

**Scenario:** GitHub PAT expired OR SSH key revoked.

1. Try Desktop Commander first: `cd ~/Desktop/Master Brain/ACTIVE/whale && git push origin main 2>&1` with 30s timeout
2. If that fails: regenerate the Cowork VM SSH key in GitHub → Settings → SSH keys
3. Add new key to `~/.ssh/authorized_keys` on the Cowork VM
4. Retry push

---

## Monitoring + early-warning

### What we watch

- **Super-admin Health tab** (`/montree/super-admin/health`) — DB ping, Stripe webhook deliveries last 7d, AI cost trend, LCP p75, recent payout calcs, school counts. Run manually whenever something feels off.
- **Web Vitals** (`montree_perf_vitals` table) — auto-captures LCP/INP/CLS/FCP/TTFB on every route change. Query for p75 trends weekly.
- **Stripe Dashboard** — set up email alerts for failed payouts + disputes (Stripe → Settings → Notifications)
- **Railway** — service health alerts via Railway dashboard. Set up Slack/email integration if you want push notifications
- **Supabase** — security advisor alerts come via email when RLS gaps detected

### Sentry / error tracking

**Not yet wired.** Currently relying on Railway logs only. Future work item — flagged in CLAUDE.md backlog.

### Known weak spots

1. **Storage buckets have no own-snapshot backup** — beyond Supabase's ~30-day soft delete. Plan: Phase 7+ build a nightly rsync of photo originals to a separate cold-storage bucket
2. **Resend domain not yet verified for montree.xyz** — emails currently go from `onboarding@resend.dev` which only delivers to the Resend account owner. Verify domain before scaling outreach
3. **No automated test suite** — every production behavior is verified via smoke-test plans in session handoff docs. Plan: Phase 8 add Playwright smoke tests for the critical user flows (signup, photo capture, weekly wrap, payout wire)

---

## Quarterly checklist (do this every 3 months)

- [ ] Verify Supabase Pro plan is paid + backups are still firing nightly (check dashboard)
- [ ] Verify Stripe Connect platform settings haven't changed
- [ ] Test a Point-in-Time Recovery to a non-production project — confirm restore actually works
- [ ] Check that `montree_perf_vitals` has data for the last 7 days (telemetry pipeline alive)
- [ ] Rotate any API keys that have been live > 12 months (Anthropic, OpenAI, Resend, Stripe)
- [ ] Audit super-admin user list — remove any inactive accounts (currently just Tredoux)
- [ ] Review this doc + update RTO/RPO if anything has changed
