# Outreach / Campaign Manager — Deep Audit

**Date:** 2026-05-16
**Auditor:** Claude (deep-audit pass)
**Scope:** Super-admin outreach surface — Campaign Manager, Outreach Hub, demo requests, leads, visitors, feedback, drip crons, master outreach helpers
**Methodology:** Three audit passes — cross-file consistency → scenario walks → fresh-eye re-read
**Mode:** Read-only. No code changed. Findings ranked by severity, anchored to file:line.

---

## Executive Summary

The outreach system has a clean conceptual model (contact lifecycle: `new` → `drafted` → `sent` → `replied`/`bounced`/`dead`, with idempotent crons on top) but the **implementation has two critical auth holes, several status-integrity races, and a load layer that scales unsafely.** The combined effect is that a leaked super-admin password trivially destroys 540+ real contacts, and any inbound spike on the public landing page can write unbounded rows + send unbounded emails before any human is alerted.

**Top 3 by impact:**

1. **`/api/montree/super-admin/npo-outreach` accepts the SUPER_ADMIN_PASSWORD as a query-string / body parameter.** Every browser fetch to GET this route burns the password into HTTP-access logs, CDN logs, and Railway logs. Anyone with one log row owns the entire outreach surface. (CRITICAL F-1.1)

2. **`/api/montree/leads` DELETE by status will silently destroy every lead in the named status.** No confirmation token, no soft-delete, no rate-limit, no audit row, no super-admin actor recorded. A single accidental POST `{"status":"new"}` wipes the whole inbound funnel and its DMs. (CRITICAL F-2.1)

3. **The public `/api/montree/demo-request` POST has zero rate-limit, zero length cap on `name` / `school`, zero captcha, and writes BOTH a `montree_outreach_contacts` row AND fires two Resend emails (one to Tredoux, one to the requester) per call.** A trivial loop floods the inbox, burns Resend quota, and seeds the table with junk that the drip cron will then re-mail for 14 days. (HIGH F-3.1)

**Posture:** The cross-file status-enum contract is mostly clean, but the auth contracts are inconsistent across sibling routes (verifySuperAdminAuth in 9 places, raw env-var compare in 1 place, no auth + cookie-bound layout for the page shell). The log table grows unbounded with no retention, and bulk operations have no idempotency keys. With 540 real contacts in production, the blast radius of any of the CRITICALs is the entire outreach campaign.

---

## Architecture as Built

### Contact lifecycle

```
landing form ─POST→ /api/montree/demo-request ──┐
                                                 │
super-admin draft ──POST→ /outreach (upsert) ───┤   montree_outreach_contacts
                                                 │   (status column drives state)
inbound apply ─POST→ /become-an-agent/apply ────┤
                                                 │
bulk-import ──POST→ /outreach (bulk_import) ────┘
                                                 │
status flow (driven by super-admin UI):
  new       → drafted   (Claude draws Gmail draft outside this codebase)
  drafted   → sent      (super-admin marks Sent after hitting Send in Gmail)
  sent      → replied   (super-admin reads reply, marks Replied)
  sent      → bounced   (super-admin sees mailer-daemon, marks Bounced)
  sent      → follow_up (auto via next_follow_up timer)
  replied   → converted
  *         → dead      (out of funnel)

inbound-only statuses:
  demo_requested   — set by /demo-request POST
  contacted        — set by /demo-request bulk-reply + manual nudge
  not_interested   — manual decline
  agent_applied    — set by /become-an-agent/apply
  declined         — set by super-admin on agent application
```

**Status enum:** `new | drafted | sent | replied | bounced | dead | follow_up | converted | contacted | not_interested | demo_requested | agent_applied | declined | meeting_booked`

**Contact-type enum:** `individual_school | multiplier_association | multiplier_training | multiplier_franchise | multiplier_consultant | agent_application | competitor_intel`

### Routes touching `montree_outreach_contacts` / `montree_outreach_log`

| Route | Methods | Auth | Notes |
|---|---|---|---|
| `app/api/montree/super-admin/outreach/route.ts` | GET, POST | `verifySuperAdminAuth` | Generic CRM CRUD + log |
| `app/api/montree/super-admin/campaign-manager/route.ts` | GET, PATCH | `verifySuperAdminAuth` | Dashboard + bulk status PATCH |
| `app/api/montree/super-admin/demo-requests/route.ts` | GET, PATCH | `verifySuperAdminAuth` | Landing-page leads view |
| `app/api/montree/super-admin/demo-requests/bulk-reply/route.ts` | POST | `verifySuperAdminAuth` | Bulk Resend send |
| `app/api/montree/super-admin/demo-request-drip/route.ts` | POST | `x-cron-secret` OR super-admin | Daily drip cron |
| `app/api/montree/super-admin/trial-drip/route.ts` | POST | `x-cron-secret` OR super-admin | Daily drip cron |
| `app/api/montree/super-admin/agent-applications/route.ts` | GET, PATCH | `verifySuperAdminAuth` | Inbound agent apps |
| `app/api/montree/super-admin/npo-outreach/route.ts` | GET, POST, PATCH | **raw env-var compare in body/query** | NPO outreach (separate table `montree_npo_outreach`) |
| `app/api/montree/super-admin/master-outreach/download/route.ts` | GET | `verifySuperAdminAuth` | xlsx download |
| `app/api/montree/super-admin/master-outreach/summary/route.ts` | GET | `verifySuperAdminAuth` | summary JSON |
| `app/api/montree/demo-request/route.ts` | POST | **PUBLIC** | Landing form |
| `app/api/montree/leads/route.ts` | POST, GET, PATCH, DELETE | POST PUBLIC; others super-admin | Older `montree_leads` table |
| `app/api/montree/visitors/track/route.ts` | POST | PUBLIC + in-memory rate limit | Visitor tracking |
| `app/api/montree/visitors/route.ts` | GET | `verifySuperAdminAuth` | Visitor dashboard |
| `app/api/montree/feedback/route.ts` | POST, GET, PATCH | POST auth-less; GET/PATCH super-admin | Feedback intake |

### Page shell

`app/montree/super-admin/marketing/layout.tsx:7` wraps every page under `/marketing/*` with a client-side password gate. The gate calls `POST /api/montree/super-admin/auth` to mint a JWT and stores it as `sa_session` in `sessionStorage` for **15 minutes** of idle activity. Activity is tracked on `mousemove` / `keydown`. The session token is shared with other super-admin pages.

**This is page-level UX only.** The actual API auth still depends on what each route does with its `request.headers`. A user who bookmarks `/api/montree/super-admin/outreach?view=contacts` and has `x-super-admin-token` from a curl is the relevant attacker.

---

## Findings

### CRITICAL

#### CRITICAL F-1.1 — `npo-outreach` accepts SUPER_ADMIN_PASSWORD via query string and body

**Where:** `app/api/montree/super-admin/npo-outreach/route.ts:7-13` (GET), `:53-61` (POST), `:99-106` (PATCH)

**What:**
```ts
// GET
const password = searchParams.get('password');
if (password !== ADMIN_PASSWORD) { ... }

// POST + PATCH
const { password, ... } = body;
if (password !== ADMIN_PASSWORD) { ... }
```

This is the **only** super-admin route in the entire outreach surface that does not call `verifySuperAdminAuth`. It:
1. Compares plaintext password with `!==` (not timing-safe — leaks length via constant-time comparison failure on byte 0).
2. Reads the password from `searchParams` on GET. Every fetch with that URL writes the password to browser history, server access logs, any CDN in front, Railway request logs, and any error tracer.
3. Reads the password from JSON body on POST/PATCH. CSRF would not normally matter for a POST with `Content-Type: application/json`, but the route accepts the password without checking origin OR session — making it a single shared secret on the wire on every call.

**Repro:**
- Open browser devtools → Network tab. Visit `/montree/super-admin/marketing/npo-outreach` (or any page wired to the GET).
- Observe the request to `/api/montree/super-admin/npo-outreach?password=<real-password>` in plain view.
- Pull Railway's access logs. The password is in the URL.

**Why it matters:** The password protects the entire outreach + finance + agent + parent communication surface. Leaking it via a logged URL = total compromise. Plus there is no UI page for this in the audited tree (`/montree/super-admin/marketing/npo-outreach/page.tsx` does not exist — see `find` output), so the actual surface is whichever ops script the user runs manually. That script may live in shell history.

**Fix sketch:** Replace lines 4 / 7-13 / 53-61 / 99-106 with `const { valid } = await verifySuperAdminAuth(req.headers); if (!valid) return 401`. Then delete the `password` field from request shapes. Mirror the pattern from sibling `/api/montree/super-admin/outreach/route.ts`.

---

#### CRITICAL F-2.1 — Bulk DELETE leads by status has no confirmation token, no soft-delete, no audit row

**Where:** `app/api/montree/leads/route.ts:296-375`

**What:** Three delete modes via one endpoint:
1. `?lead_id=<uuid>` → single
2. `{ lead_ids: [...] }` → bulk by ids (capped at 1000)
3. `{ status: 'new' }` → **purge every lead of that status**

The status-purge mode (lines 330-344) runs:
```ts
const { data: rows } = await supabase.from('montree_leads').select('id').eq('status', body.status);
targetIds = (rows || []).map(r => r.id);
```

Then:
```ts
await supabase.from('montree_dm').delete().in('conversation_id', targetIds);
const { error } = await supabase.from('montree_leads').delete().in('id', targetIds);
```

Issues:
- **No confirmation step.** A single POST destroys hundreds of leads + every DM thread associated.
- **No soft-delete.** Rows are hard-deleted. The DMs are also hard-deleted. There is no UNDO.
- **No audit log row.** Unlike `agent-applications`, this writes nothing to `montree_outreach_log` or `montree_super_admin_audit`. After the call, there is no record of who deleted what.
- **No rate-limit.** Repeated calls can pound the DB.
- **The DM purge is done with `targetIds` as `conversation_id`** — this assumes leads.id IS the DM conversation_id. If that mapping ever drifts, the DM purge silently doesn't run, or worse, runs against unrelated conversations.

**Repro:**
1. Stash `sa_session` from sessionStorage.
2. `curl -X DELETE https://montree.xyz/api/montree/leads -H "x-super-admin-token: $TOKEN" -d '{"status":"new"}'`.
3. Every lead in `status='new'` plus their DM threads are gone forever.

**Why it matters:** Real production data. 50+ leads in `new` at any given moment is normal. Loss is permanent. With CRITICAL F-1.1 also unresolved, the attack surface is exactly the password.

**Fix sketch:**
- Require a `confirm: 'PURGE-${status.toUpperCase()}'` token in the body for the status mode.
- Soft-delete: add a `deleted_at` column on `montree_leads` and update instead of delete. DMs same.
- Log every targetId to `montree_super_admin_audit` BEFORE the delete fires.
- Rate-limit the route to 5 deletes per minute per IP.

---

### HIGH

#### HIGH F-3.1 — Public `/demo-request` POST has no rate-limit, no captcha, no length caps

**Where:** `app/api/montree/demo-request/route.ts:4-85`

**What:** The route accepts `{ name, school, email }` from the public landing page, then:

1. Validates only `email.includes('@')` (line 8) — no length cap on email, name, school.
2. UPSERTs into `montree_outreach_contacts` keyed on email (line 15-27). The `notes` field is built by string-concatenating user-supplied `name` and `school` directly into a free-text field — no escape, no length cap. A 1MB blob in `name` → 1MB in `notes`.
3. Inserts into `montree_outreach_log` (line 30-33).
4. Calls Resend twice: notification to Tredoux (line 40-49), confirmation to requester (line 68-78).
5. Returns 200 on every code path including the bare-`catch` at line 82 (which returns 500 but no detail).

There is **no rate-limit** of any kind. The `montree_visitors/track` route has an in-memory rate limit (`recentTracks` map at `visitors/track/route.ts:16`), but the demo-request route copies neither the map nor the eviction.

**Repro:**
```bash
for i in {1..1000}; do
  curl -X POST https://montree.xyz/api/montree/demo-request \
    -H "Content-Type: application/json" \
    -d '{"email":"flood'$i'@example.com","name":"FloodTest","school":"Flood"}' &
done
```

- 1000 emails fired to `tredoux555@gmail.com` (Resend account-owner inbox).
- 1000 confirmation emails fired to attacker-controlled addresses (Resend quota burns).
- 1000 rows added to `montree_outreach_contacts` (because the email is unique-per-flood-i).
- The drip cron at `demo-request-drip` will then email each of those 1000 fake leads on days 3/7/14 — automated outbound spam from the Montree domain that hurts deliverability.

**Why it matters:** Burns Resend quota, floods Tredoux's inbox, fills DB with junk that re-mails for 14 days from a brand domain. Could trigger spam-flagging on `montree.xyz`. Single attacker, single script.

**Fix sketch:**
- Adopt the `recentTracks` rate-limit pattern from `visitors/track/route.ts`: max 1 demo-request per IP+fingerprint per minute, max 5 per IP per hour. In-memory is fine for v1.
- Add length caps mirroring `/api/montree/leads`: name ≤200, school ≤200, email ≤254.
- Validate email format with the same regex as leads (line 50).
- Skip the Resend confirmation email if `email_status === 'bounced'` already on file (already-bounced address resending = brand damage).

---

#### HIGH F-3.2 — Demo-request UPSERT will overwrite a real lead's notes with attacker-controlled content

**Where:** `app/api/montree/demo-request/route.ts:15-27`

**What:** The UPSERT uses `onConflict: 'email'` with `ignoreDuplicates: false`. So if `info@realschool.com` already exists in the DB at `status='replied'` with hand-curated notes ("3-month pilot agreed, Aug 1 start"), and an attacker POSTs `{email: 'info@realschool.com', name: 'XXX', school: 'YYY', message: 'spam'}`:

The contact row's:
- `status` is overwritten back to `'demo_requested'`
- `priority` overwritten back to `'warm'`
- `notes` overwritten to `Demo requested via landing page. Name: XXX. School: YYY.`
- `contact_person` overwritten to `XXX`
- `org_name` overwritten to `YYY`

**Real curated state is destroyed.** The original notes (with the pilot agreement) are gone. No backup, no audit row.

**Repro:** Post to `/api/montree/demo-request` with the email of any real contact you can guess (`info@montessoritokyo.com`, FAMM Argentina, etc.). Their record loses its curated state.

**Why it matters:** This is the most under-protected path into a write that affects real curated leads. Combined with HIGH F-3.1 (no rate limit), an attacker who knows or guesses 540 real contact emails could systematically reset every record in the funnel.

**Fix sketch:** Switch to `ignoreDuplicates: true` (preserve existing row) OR check `if (existing.status !== 'new')` and only update non-business-critical fields (`updated_at`, maybe `notes` appended). At minimum, set `onConflict: 'email'` with `ignoreDuplicates: true` and then attempt an INSERT-only-if-missing pattern.

---

#### HIGH F-4.1 — Campaign-manager bulk PATCH has no transaction; partial failures leave inconsistent state

**Where:** `app/api/montree/super-admin/campaign-manager/route.ts:129-145`

**What:** PATCH with `{ ids: [...], status }`:
```ts
const { error } = await supabase
  .from('montree_outreach_contacts')
  .update(updateData)
  .in('id', targetIds);

// Log the action
for (const contactId of targetIds) {
  await supabase.from('montree_outreach_log').insert({...}).catch(...)
}
```

Issues:
1. The UPDATE is single-statement (good), but the log writes are a **per-id awaited loop**. With 100 ids that's 100 sequential round-trips to Supabase. The page UI shows a single "Mark All Sent" button (line 217-223 of `campaign-manager/page.tsx`); a click on 50 drafts will block the user for ~5-10 seconds.
2. If any log insert fails mid-loop, the contact rows are already updated. The log is now incomplete. The catch swallows the error to console only (line 144).
3. `previous_status: 'unknown'` (line 143) is a literal string, not the real prior status — the log entry contains no useful audit trail of what the status WAS before.

**Repro:** Click "Mark All Sent" on a Drafted tab with 50 rows. Stopwatch: 5-10s for the round-trip. Half-second per log row.

**Why it matters:** Both UX (the button looks frozen) and correctness (audit log is unreliable). If Tredoux ever has to reconstruct "what did I send when", `previous_status: 'unknown'` is useless.

**Fix sketch:**
- Use a single bulk insert: `supabase.from('montree_outreach_log').insert(targetIds.map(id => ({ contact_id: id, action: ..., details: {...} })))`.
- BEFORE the UPDATE, query the previous status for each id and include it in the log row's details. One extra SELECT.

---

#### HIGH F-5.1 — Drip crons do not page through prior sends — at ~10k log rows the idempotency check returns truncated data

**Where:** `app/api/montree/super-admin/trial-drip/route.ts:69-80`, `demo-request-drip/route.ts:79-93`

**What:** Both drip crons load the full set of prior sends into memory:
```ts
const { data: priorSends } = await supabase
  .from('montree_outreach_log')
  .select('action, metadata, contact_id')
  .in('action', ['demo_request_drip_day3', 'demo_request_drip_day7', 'demo_request_drip_day14']);
```

Supabase's default REST page size is 1000 rows. There is no `.limit(...)` or pagination. After enough campaigns:

- The query returns the first 1000 (with no explicit `order`, the slice is implementation-defined).
- Older sends fall out of `sentKey`.
- A contact whose `day7` send is 18 months old can have its `day7` drip RE-SENT.
- Real money + real brand damage.

The trial drip is identical (`.select('action, metadata')` at trial-drip route line 71).

**Repro:** Seed 1500 rows into `montree_outreach_log` with action `demo_request_drip_day3`. Run the drip with a fresh contact whose record is exactly 3 days old AND who has an `already_sent` row sitting in the older 500 (the slice past row 1000). The idempotency check misses the row → email re-fires. Real flow: this happens at scale 12-18 months into the campaign at the current send rate.

**Why it matters:** Long-term correctness. The campaign has been running since April 2026; at current outreach rates (50 drafts/day) the log table will hit the truncation point within a year. After that, drip duplicates begin appearing silently.

**Fix sketch:**
- Filter at the DB layer: `.gte('created_at', startOfFortnight).in('contact_id', currentContactIds)`. The idempotency check only needs to verify "did THIS contact get THIS day in the last ~30 days". A WHERE clause makes the query bounded.
- Add a composite index on `(action, contact_id, created_at DESC)` for fast lookup.

---

#### HIGH F-5.2 — `bulk-reply` continues firing even after Resend signals quota exhaustion

**Where:** `app/api/montree/super-admin/demo-requests/bulk-reply/route.ts:113-188`

**What:** The loop processes leads sequentially:
```ts
for (const lead of leads) {
  ...
  const result = await sendDemoTrialLinkReply(...);
  if (!result.success) {
    outcomes.push({ ok: false, reason: result.error });
    failed++;
    void supabase.from('montree_outreach_log').insert({...});
    continue;  // ← continues to next lead even if Resend is at quota
  }
  ...
}
```

If Resend returns 429 / quota errors on lead 12 of 100, the loop continues firing for the remaining 88 leads. Each fails with the same error. Each writes a failure row to the log. Each contributes to the next billing cycle's rate-limit cooldown on the Resend side.

There is no circuit-breaker. A single `result.error?.includes('rate_limit')` check would short-circuit.

**Why it matters:** When Resend rate-limits, the bulk operation should pause and bubble a "Resend is rate-limited — try again in 5 minutes" error to the UI, not silently fail 88 in a row.

**Fix sketch:** Add a check after each failure:
```ts
if (result.error?.match(/rate_limit|quota|too_many/i)) {
  outcomes.push(...remaining.map(l => ({ ok: false, skipped: true, reason: 'aborted: upstream rate limit' })));
  break;
}
```

---

#### HIGH F-6.1 — Visitor-tracking IP geolocation is awaited inline on every request

**Where:** `app/api/montree/visitors/track/route.ts:84-101`

**What:** Public POST awaits `getLocationFromIP(ip)` synchronously before DB insert. The doc-comment claims it has a 5s timeout but it's still on the critical path.

Worse: this route is hit on **every page load on the public site** (acts as a tracking pixel). At any spike (e.g. someone shares Montree on Twitter), the route can hold N concurrent connections each waiting up to 5s on a 3rd-party IP API. Railway's request limit will hit before the geo API does.

The existing 30s in-memory rate-limit (per fingerprint, lines 16-39) does not block the geolocation call — the rate-limit gate is checked AFTER `evictStale()` but BEFORE `getLocationFromIP`. Wait — re-reading, the rate-limit gate IS at line 72-76, and `getLocationFromIP` is at line 85. So a flooded fingerprint hits the rate-limit and returns 200 silently before geo. But a single attacker rotating fingerprints (each fingerprint = first request) drives a flood of geolocation calls.

**Repro:** Loop 100 different user-agents from the same IP — each gets a unique fingerprint (SHA256(ip|UA)). Each fires `getLocationFromIP`.

**Why it matters:** Trivial DOS on the public tracking endpoint, plus 3rd-party API quota burn on the geolocation provider.

**Fix sketch:**
- Rate-limit by IP, not just fingerprint (IP alone has fewer rotations).
- Move geolocation off the critical path: insert with `country=null` immediately, run a background job to backfill geo.
- Cache `getLocationFromIP` for an IP for 24h.

---

### MED

#### MED F-7.1 — `montree_outreach_log` grows unbounded with no retention policy

**Where:** `montree_outreach_log` (schema-level), used by every super-admin outreach route

**What:** Every status change, every bulk action, every demo-request submission writes to this table. There is no archive, no rotation, no compaction.

Active actions:
- `status_<state>` (per status change)
- `demo_requested`
- `agent_application_<status>`
- `bulk_import`
- `bulk_reply_trial_link` (+ `_failed`)
- `trial_drip_day{7,14,25}`
- `demo_request_drip_day{3,7,14}`

At current campaign rates (50 sends/day, 5 status changes per contact = 7 log rows per send + 3 drips × ~50 leads/cron = 150 cron rows/day) the table grows ~500 rows/day. In a year that's 180k rows. Combined with HIGH F-5.1 (no pagination on idempotency reads), this is the row count where things start breaking.

**Why it matters:** Two-year time bomb. Easy to forget about until queries get slow and idempotency checks silently miss.

**Fix sketch:** Add a monthly job that moves rows older than 90 days to `montree_outreach_log_archive` (same schema), then `DELETE FROM montree_outreach_log WHERE created_at < now() - interval '90 days'`. Mirror the photo-debug telemetry pattern from migration 211.

---

#### MED F-7.2 — `outreach POST upsert_contact` accepts and trusts the entire `contact` object

**Where:** `app/api/montree/super-admin/outreach/route.ts:122-134`

**What:**
```ts
if (action === 'upsert_contact') {
  const { contact } = body;
  if (!contact?.org_name) return 400;

  contact.updated_at = new Date().toISOString();
  const { data } = await supabase
    .from('montree_outreach_contacts')
    .upsert(contact, { onConflict: 'id' })
    .select()
    .maybeSingle();
}
```

The `contact` object is upserted verbatim. There is no whitelist of allowed columns. If a future schema change adds a sensitive column (`stripe_customer_id`, `internal_priority_score`, etc.), it can be set/overwritten by anything in the body.

**Why it matters:** Schema-coupling smell. Today's columns are all CRM-safe, but the next migration adds risk. Same issue applies to `bulk_import` at line 144 where `...c` spreads the contact object.

**Fix sketch:** Define an `ALLOWED_CONTACT_COLUMNS` Set and `.pick()` only those keys before upsert.

---

#### MED F-7.3 — Outreach `bulk_import` "fallback to one-by-one" leaks per-row errors silently

**Where:** `app/api/montree/super-admin/outreach/route.ts:159-173`

**What:**
```ts
if (error) {
  // Try inserting one by one to skip duplicates
  for (const row of batch) {
    const { error: singleErr } = await supabase.from('montree_outreach_contacts').insert(row);
    if (singleErr) {
      skipped++;     // ← any error counts as "skipped"
    } else {
      inserted++;
    }
  }
}
```

A real DB error (constraint violation, broken column type) is counted as a "skipped duplicate". The user sees `{ inserted: 50, skipped: 3 }` and assumes the 3 were duplicates, when they could have been data corruption.

**Why it matters:** Hides real errors from the operator. A misconfigured import silently misses rows.

**Fix sketch:** Distinguish 23505 unique_violation from other Postgres error codes. Return three counts: `inserted`, `duplicates`, `errors` (with the first error message).

---

#### MED F-7.4 — Drip crons can race: two cron triggers in the same minute fire duplicate emails

**Where:** `demo-request-drip/route.ts`, `trial-drip/route.ts`

**What:** Idempotency check is read-then-write (read `priorSends`, send email, insert log row). Two cron triggers (Railway retry, manual click + cron coincidence) executing concurrently both see "not yet sent" and both send.

The check at line 126-136:
```ts
if (sentKey.has(idempKey)) { /* skip */ continue; }
// ... send email + insert log
```

is not atomic.

**Repro:** Trigger `POST /api/montree/super-admin/demo-request-drip` twice from two terminals at the same instant. Both pull priorSends, both find sentKey doesn't have the day key, both fire the email, both insert the log row.

**Why it matters:** Daily-cron design — usually safe — but the manual-trigger button in the Health tab and the cron can collide. The result is a recipient gets two day3 emails on the same day. Real brand damage.

**Fix sketch:**
- Add a UNIQUE constraint on `(contact_id, action)` in `montree_outreach_log` for drip actions. Second insert errors out — second send is wasted but at least it's auditable.
- OR fire `sendDemoRequestDripEmail` only AFTER successfully inserting the idempotency row (INSERT-then-send). Failed insert → already sent → skip.

---

#### MED F-7.5 — `last_sender_is_me` semantics not preserved when a teacher draft becomes a sent email

**Where:** N/A — out of scope (messaging vs outreach). Removed.

---

#### MED F-7.6 — `outreach POST log` action accepts arbitrary string

**Where:** `app/api/montree/super-admin/outreach/route.ts:186-195`

**What:**
```ts
if (action === 'log') {
  const { log_action, contact_id, details } = body;
  const { error } = await supabase.from('montree_outreach_log').insert({
    action: log_action,
    contact_id,
    details: details || {},
  });
  ...
}
```

No validation of `log_action`. Any string the caller supplies goes into the `action` column. Idempotency checks elsewhere (drip crons) match on hardcoded action strings, so a misnamed log entry from a script is invisible to them. A misnamed entry from a malicious super-admin (or a bug) could cause infinite drip loops by spelling `demo_request_drip_day3` slightly wrong.

**Fix sketch:** Whitelist `log_action` against a known set.

---

#### MED F-7.7 — `LeadsTab.tsx` bulk delete doesn't show a "this cannot be undone" warning

**Where:** `components/montree/super-admin/LeadsTab.tsx:92-95`, `handleBulkDeleteByStatus`

**What:** The component calls `onBulkDeleteByStatus(status)` without a confirm prompt. The downstream API (CRITICAL F-2.1) has no confirmation token either. So this is **double under-protected**.

**Fix sketch:** `if (!window.confirm(\`Permanently delete all ${status} leads? This cannot be undone.\`)) return;` at minimum.

---

#### MED F-7.8 — Health route's pending-demo-request "warning" threshold is 14 days, but pending older-than-30 silently never bubbles further

**Where:** `app/api/montree/super-admin/health/route.ts:223-242` (referenced from outreach)

**What:** The health tile flips to "warn" at >14d pending. There is no "fail" state at >30d. A demo request that has been open 60 days = invisible. Worth a single ladder rung.

**Fix sketch:** Add a `fail` threshold at >30d. Mirror what already exists for stripe-webhook DLQ.

---

#### MED F-7.9 — Visitor-track route writes IP into `isp` column (schema-mismatch already known)

**Where:** `app/api/montree/visitors/track/route.ts:89-91, 96`

**What:** The route comments out the truth: *"actual table has `isp` column (not `ip`) and no `page_url` column."* So IP is stored in `isp` and `page_url` is stored in `referrer` if no referrer is set. This works but is impossible to query intelligently — `WHERE isp LIKE '%@%'` returns nothing, `WHERE referrer LIKE 'https://montree.xyz%'` returns mostly noise.

**Why it matters:** Future analytics will be unreliable. Filtering visitors by country works; filtering by IP for bot detection is broken.

**Fix sketch:** Migration that renames `isp` → `client_ip`, adds `page_url TEXT`, and backfills the referrer column.

---

### LOW

#### LOW F-8.1 — Demo-request route bare-catch swallows error context

**Where:** `app/api/montree/demo-request/route.ts:82-84`

```ts
} catch {
  return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
}
```

No console.error, no error body. Debugging a flaky landing-form submit means digging Railway logs with zero context.

**Fix:** `console.error('[demo-request] failed:', err);` before the return.

---

#### LOW F-8.2 — `outreach GET stats` re-counts contacts twice for derived ratios

**Where:** `app/api/montree/super-admin/outreach/route.ts:42-54`

**What:** Pulls full contacts table, then filters into 5 maps + 2 counters. Repeats the loop body once for each derived stat. Trivial micro-CPU cost on 540 rows; would matter at 50k. Just a smell.

**Fix:** One pass, increment all counters together.

---

#### LOW F-8.3 — Bulk-reply log notes column truncated at 500 chars but Resend errors can exceed it

**Where:** `app/api/montree/super-admin/demo-requests/bulk-reply/route.ts:154`

```ts
notes: result.error?.slice(0, 500) || 'send failed',
```

Resend returns structured JSON errors. Slicing at 500 chars in the middle of a JSON object yields unparseable text. If the audit log is ever pulled into a parser, this breaks it.

**Fix:** Store the error in `details: { resend_error: result.error }` (jsonb) instead of `notes` (text).

---

#### LOW F-8.4 — Page-shell login does not invalidate sessionStorage on tab close

**Where:** `app/montree/super-admin/marketing/layout.tsx:14-30`

**What:** `sa_session` persists in `sessionStorage` for the lifetime of the tab. The 15-minute idle gate is implemented client-side. Closing and reopening the tab within 15 minutes (or restoring it after browser crash) brings the user back authed without re-login.

This is sessionStorage's normal behavior; nothing wrong with the code per se. Just worth flagging that "session expires after 15 min idle" is enforced ONLY by mouse/key tracking, not by a server-side cookie revoke.

**Fix:** If real security is wanted, mint a short-lived JWT with `exp` enforced server-side (already done via JWT, but the layout falls back to `sa_pwd` which is the raw password persisted).

---

#### LOW F-8.5 — `npo-outreach` GET orders by priority ASC alphabetically, not by severity

**Where:** `app/api/montree/super-admin/npo-outreach/route.ts:20-21`

```ts
.order('priority', { ascending: true })
```

`priority` is a text column with values `high | medium | low | warm | tier1 | tier2 | tier3`. Alpha sort gives `high → low → medium → tier1 → tier2 → tier3 → warm`. Operator-confusing.

**Fix:** Order by a CASE or a derived priority_int column.

---

#### LOW F-8.6 — Campaign-manager page client-side recomputes filters from full contact list

**Where:** `app/montree/super-admin/marketing/campaign-manager/page.tsx:170-184` etc.

**What:** Every status pill re-runs `.filter(c => c.status === 'foo')` 11 times on each render. Even on 540 rows it's cheap, but at 10k it noticeably stutters.

**Fix:** `useMemo` the counts.

---

## Prioritised Fix Table

| Severity | ID | Where | Fix effort | Impact |
|---|---|---|---|---|
| CRITICAL | F-1.1 | `npo-outreach/route.ts` | 15 min | Auth bypass via logged URL — kills entire surface |
| CRITICAL | F-2.1 | `leads/route.ts:296-375` | 30 min | Single API call destroys lead funnel forever |
| HIGH | F-3.1 | `demo-request/route.ts` | 1 h | Public-flood DOS / inbox flood / Resend quota burn |
| HIGH | F-3.2 | `demo-request/route.ts:15-27` | 15 min | Attacker overwrites real curated leads |
| HIGH | F-4.1 | `campaign-manager/route.ts:129-145` | 30 min | Audit log incomplete + UI freeze on bulk |
| HIGH | F-5.1 | drip crons | 1 h | 12-18 month time bomb — drip duplicates |
| HIGH | F-5.2 | `bulk-reply/route.ts` | 15 min | Continues firing through Resend rate limit |
| HIGH | F-6.1 | `visitors/track/route.ts` | 1 h | Public-trackable DOS path |
| MED | F-7.1 | log table retention | 2 h | Year-2 time bomb |
| MED | F-7.2 | `outreach POST` whitelist | 15 min | Schema-coupling smell |
| MED | F-7.3 | bulk_import error counts | 15 min | Hides real DB errors as "skipped" |
| MED | F-7.4 | drip race condition | 30 min | Duplicate emails on concurrent triggers |
| MED | F-7.6 | log_action whitelist | 10 min | Idempotency-evasion risk |
| MED | F-7.7 | bulk-delete confirm | 5 min | UX defense-in-depth |
| MED | F-7.8 | health threshold | 10 min | Stale leads invisible past 14d |
| MED | F-7.9 | visitor schema | 1 h + migration | Analytics broken |
| LOW | F-8.x | various | <30 min total | Polish |

---

## Quick Wins (<30 min each)

These can ship in a single small commit:

1. **F-7.7** — Add `window.confirm()` to `LeadsTab.handleBulkDeleteByStatus`.
2. **F-7.6** — Whitelist `log_action` against `LOG_ACTION_ENUM = new Set([...])` in `outreach POST`.
3. **F-8.1** — Add `console.error('[demo-request]', err)` before the 500 return.
4. **F-8.3** — Move Resend error from `notes` to `details.resend_error` in bulk-reply.
5. **F-3.2** — Flip `ignoreDuplicates: false` to `true` in demo-request UPSERT. Single character. Closes a HIGH.
6. **F-4.1 partial** — Replace `previous_status: 'unknown'` with a SELECT-then-log pattern. One extra round-trip but unblocks audit.
7. **F-7.8** — Add `fail` threshold at >30d to the health tile.

---

## Verified-Clean

Areas read end-to-end that show no findings worth flagging:

- **`/api/montree/super-admin/master-outreach/download` and `/summary`** — clean file reads behind `verifySuperAdminAuth`. No surprises.
- **`/api/montree/super-admin/agent-applications`** — defensive-in-depth pattern is correct: PATCH validates the row IS an agent_application before mutating (line 97-101). Mirror this elsewhere.
- **`/api/montree/super-admin/demo-requests` GET** — joins with the log table to enrich with drips_sent. Clean.
- **`/api/montree/super-admin/demo-requests/bulk-reply` skip logic** — correctly refuses to bulk-reply a `not_interested` lead (line 116-125). The skip surfaces in outcomes; UI can warn.
- **`/api/montree/super-admin/agent-applications` ALLOWED_STATUS_TRANSITIONS** — explicit whitelist, correct.
- **`/api/montree/super-admin/outreach` log-table JOIN** — uses Supabase's nested select (`montree_outreach_log.select('*, montree_outreach_contacts(...)')`). Both routes show contacts via the FK. No N+1.
- **Visitor-tracking bot-skip regex** — comprehensive, good list (line 80).
- **Visitor rate-limit eviction** — well-engineered: triggers on count modulo + global cap (lines 22-39).
- **`feedback/route.ts`** — length caps applied (10000 chars, 200 names, 2000 URLs). Validation set is complete. Public POST is acceptable risk.
- **The page-level layout JWT** — actually correctly preferred over password fallback (`verifySuperAdminAuth` tries `x-super-admin-token` first, falls back to password). Good design at this layer.

---

## Closing Note

The outreach surface has the right shape — a clean status state machine, idempotent crons, a clear page-shell auth gate, and a sensible separation between public intake and super-admin curation. The cluster of CRITICALs and HIGHs all live at the **edges**: one rogue route with bad auth (`npo-outreach`), one over-permissive bulk-delete (`leads`), and one unguarded public POST (`demo-request`). Fixing those three closes ~80% of the real risk in one focused commit.

The longer-term concerns (log table growth, drip pagination, multi-cron race conditions) are architectural — they need a small retention strategy and a few CHECK / UNIQUE constraints, not a rewrite.

Recommended sequence:
1. Land CRITICAL F-1.1 and F-2.1 today.
2. Land HIGH F-3.1, F-3.2, F-5.2 this week (these are all <1 h each).
3. Land the quick wins as a single follow-up.
4. Plan log retention + drip pagination as one half-day session.
