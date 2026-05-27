# Health Check S131 — API + DB + Security Posture

**Scope:** Audit of `app/api/montree/**/route.ts` against architectural rules from Sessions 81, 100, 107, 109, 111, 113 V2, 118, 121. Research-only — zero code changes.

**Headline:** Two CRITICAL items (one cross-pollination violation on `/feedback`, one missing period-lock guard on `payouts PATCH mark_paid`). Public-form rate-limit coverage has two blind spots. Webhook idempotency + `maxDuration` coverage + service-role consistency + `.ilike()` escaping are all clean.

---

## 1. Cross-pollination contract

Sampled 10 recently-modified routes. All audited call `verifySchoolRequest` (or `resolveCalendarScope`, `verifySuperAdminAuth`, `resolveAppointmentsParent`) BEFORE any `.from(`. All read `auth.schoolId` / `auth.userId` / `auth.classroomId` from the verified token. Spot-verified: `app/api/montree/calendar/route.ts:21`, `app/api/montree/dashboard/class-progress/route.ts:100`, `app/api/montree/school/terms/route.ts:57`, `app/api/montree/admin/conversations/route.ts:30`, `app/api/montree/admin/today/route.ts:23`, `app/api/montree/admin/tracy/scan-thread/route.ts:26`, `app/api/montree/agent/mira/route.ts`, `app/api/montree/appointments/[id]/agora-token/route.ts:38`, `app/api/montree/calendar/summary/route.ts:27`, `app/api/montree/dashboard/english-schedule/route.ts`. Cross-pollination filters consistently use the verified token, never the body. CLEAN.

**One exception, CRITICAL:**

### CRITICAL-1 — `/api/montree/feedback` POST trusts body identity fields
**File:** `app/api/montree/feedback/route.ts:9-77`. POST accepts `school_id`, `user_type`, `user_id`, `user_name` directly from the request body with NO auth check — header comment claims "open to all authenticated users" but there's no `verifySchoolRequest` call. Anyone (unauthenticated) can POST `{ school_id: '<any uuid>', user_type: 'principal', user_id: '<any uuid>', user_name: 'Tredoux', message: 'spam' }` and the row lands in `montree_feedback` impersonating any user at any school. Visible in super-admin Feedback tab.
**Fix:** Add `const auth = await verifySchoolRequest(req); if (auth instanceof NextResponse) return auth;` at the top, derive `school_id`/`user_id`/`user_type` from `auth` (never body). Allow `verifyParent` as alternate auth for parent feedback.

---

## 2. `maxDuration` declarations on AI-calling routes

Greped every `route.ts` importing Anthropic / OpenAI / referencing `anthropic.messages.create`. **All currently AI-calling routes declare `maxDuration`.** Three apparent misses (`agent/earnings`, `super-admin/finance/reconciliation`, `super-admin/payouts`) are false positives — they reference `anthropic_cost_usd` / `openai_cost_usd` as DB column names, not SDK calls. CLEAN.

---

## 3. `.single()` vs `.maybeSingle()`

180 `.single()` calls vs 534 `.maybeSingle()` calls — overall posture is healthy. Sampled lookup-mode `.single()` calls (not INSERT/UPDATE result-fetch).

### HIGH-1 — `guru/followup/route.ts:38-50` — `.single()` on child + work_name lookup
Two reads: `montree_children WHERE id=child_id` (PK — safe to keep `.single()` if validation guarantees existence, but the parent route doesn't validate first), and `montree_child_progress WHERE child_id=… AND work_name=…` (will throw on never-touched works). The route catches the throw but the `404 PGRST116` log noise is constant.
**Fix:** Both → `.maybeSingle()`.

### HIGH-2 — `guru/work-guide/route.ts:83,91` — `.single()` on work_name lookups
Likely 0-row for new custom works.
**Fix:** `.maybeSingle()`.

### MED-1 — `principal/setup/route.ts:162,193,250` + `principal/setup-stream/route.ts:58,103,195` + `principal/register/route.ts:92,112`
Most are INSERT-RETURNING patterns where `.single()` is defensible, but a few are pre-write lookups (`school by slug`, `existing principal by email`). Audit per-line; convert lookup-mode reads.

### MED-2 — `guru/photo-insight/add-custom-work/route.ts:162` — `.single()` on classroom lookup
Could be 0 if classroom was deleted mid-request.
**Fix:** `.maybeSingle()`.

Architecture rule violation otherwise rare — most routes use `.maybeSingle()` correctly.

---

## 4. `.ilike()` SQL injection

24 `.ilike()` call sites. **Every user-typed value passes through `escapeIlike()` or an inline `.replace(/[%_\\]/g, '\\$&')` escape.** Verified: `auth/unified` line 403, `auth/teacher` line 66, `classroom-setup/describe` line 74, `classroom-setup/route` line 249, `dashboard/language-tracker` line 91-93 (tokenised + escaped), `visitors/route` line 47, `works/guide` lines 52/67/151/177/207/219, `progress/update` line 227, `guru/teaching-instructions` line 150, `guru/corrections` line 279, `guru/photo-insight` line 1997, `guru/photo-insight/add-custom-work` line 172, `guru/generate-work-content` line 111, `super-admin/health` line 288 (literal string `'%Cost-model drift%'` — no user input). CLEAN.

---

## 5. Fire-and-forget bookkeeping vs awaited

Spot-checked 5 PATCH/POST routes. **Stripe webhook (`billing/webhook/route.ts:95`) correctly fires the handler chain in a `void (async () => {…})()` IIFE** with idempotency keys + DLQ capture — exactly the Session 100 architectural rule. **`photo-audit/resolve/route.ts` fires `enrichCustomWorkInBackground()` correctly fire-and-forget.** **`progress/update/route.ts` IIFEs (Session 83 rule #74) preserved.**

### MED-3 — Tracy scan-thread + draft-response don't log to `montree_principal_agent_log` async
Both `admin/tracy/scan-thread/route.ts` and `admin/tracy/draft-response/route.ts` complete the Opus call inline. Audit/log writes (if any) need to be fire-and-forget — verify in a focused read. The current implementations probably do this correctly but Session 100 architectural rule warrants a spot-check during a slow-Tracy investigation.

---

## 6. Missing `.limit()` on potentially unbounded queries

Most heat-path SELECTs use `.limit()` correctly. Sampled:

### MED-4 — `agent/earnings/route.ts` and `agent/schools/[id]/route.ts` — unbounded `montree_api_usage` SELECTs
Both query `montree_api_usage` for cost aggregation. `montree_api_usage` grows ~50 rows/school/day at moderate use. No `.limit()` + no `.gte('created_at', …)` filter in the per-school case means the SELECT scans every row that school has ever written. Within 6-12 months this becomes the slowest endpoint in the agent dashboard.
**Fix:** Add `.gte('created_at', sinceISO)` keyed to the period being aggregated, OR `.lte('period_month', latestMonth)` if the route is per-month.

### LOW-1 — `super-admin/finance/export/route.ts` + `export/print/route.ts` — full ledger export
`montree_finance_transactions` SELECT without explicit `.limit()`. Acceptable for current ~1K row table; revisit at ~100K.

### LOW-2 — `messages/threads/route.ts`, `messages/broadcast/route.ts`, `admin/tracy/scan-thread/route.ts` — unbounded `montree_thread_messages`
The Tracy scan reads a single thread by `thread_id` (bounded by thread). Broadcast iterates participants. Acceptable for now; if any school reaches 10K+ messages on a single thread, scan-thread will OOM the prompt budget.

---

## 7. Service-role usage

Grepped `createClient.*anon` / `SUPABASE_ANON_KEY` across `app/api/montree/**/route.ts` — **zero matches.** Every route uses `getSupabase()` (service role). Consistent with rule. CLEAN.

---

## 8. Webhook idempotency

### `billing/webhook/route.ts`
- Signature verification (line 65): ✅
- Idempotency: every handler in `lib/montree/billing.ts` uses `(source='stripe_webhook', source_ref=event.id)` UNIQUE constraint on `montree_finance_transactions` (header comment line 13-15 + implementation in `routeInvoicePaid`).
- 200 on handler errors: handler runs in `void async IIFE` (line 95) so the response is 200 before the handler runs. DLQ capture in try-catch (line 152). ✅
- `maxDuration = 30` (line 39): ✅

### `stripe/connect-webhook/route.ts`
Not re-verified this audit; Session 92 commit notes confirm same pattern. If a perf/billing pass is run, spot-check this file.

CLEAN.

---

## 9. Rate-limit coverage on public routes

| Route | Public? | Rate-limited? | Verdict |
|------|---------|---------------|---------|
| `/api/montree/demo-request` POST | Yes | Yes (3 hits in file) | ✅ |
| `/api/montree/photo-bank` POST | Yes (auth optional) | Yes (4 hits) | ✅ |
| `/api/montree/become-an-agent/apply` POST | Yes (honeypot + cap only) | **No** | **HIGH-3** |
| `/api/montree/leads` POST | Yes ("public" per header) | **No** | **HIGH-4** |
| `/api/montree/feedback` POST | "Open to all authenticated" but no auth | **No** + see CRITICAL-1 | **HIGH-5** |

### HIGH-3 — `become-an-agent/apply` has no rate-limit
Header comment includes honeypot + 500-char field caps. Honeypot defeats naïve bots but not sophisticated ones — one IP can submit 1000 applications in a minute and flood `montree_outreach_contacts` + burn Resend quota on auto-acks. Session 113 V2 architectural rule #125 ("Public form endpoints MUST be rate-limited") was applied to `demo-request` but missed here.
**Fix:** Add `checkRateLimit(req, 'agent-apply', 5, 15 * 60 * 1000)` near the top.

### HIGH-4 — `leads` POST has no rate-limit
Comment line 8 says "public". Anyone can flood `montree_leads` + DM creation chain. Same fix pattern.

### HIGH-5 — `feedback` POST has no rate-limit (compounded with CRITICAL-1)
Even after CRITICAL-1 is fixed, the route should still rate-limit per-user (e.g., 10 feedback items per IP per hour) to prevent feedback-table flooding.

---

## 10. Period-lock guards on finance mutations

| Route | Guard present? | Verdict |
|------|----------------|---------|
| `super-admin/finance/ledger/route.ts` POST + DELETE | 3 hits, present | ✅ |
| `super-admin/payouts/[payoutId]/wire/route.ts` POST | 2 hits, present | ✅ |
| `super-admin/payouts/[payoutId]/record-wire/route.ts` POST | 2 hits, present | ✅ |
| `super-admin/payouts/calculate/route.ts` POST | 2 hits, present | ✅ |
| `super-admin/finance/recurring/run/route.ts` POST (cron) | Present via `isPeriodClosed` (line 70) | ✅ |
| `super-admin/payouts/route.ts` PATCH | **0 hits** | **CRITICAL-2** |
| `super-admin/finance/recurring/route.ts` POST/PATCH/DELETE | **0 hits** | **HIGH-6** |

### CRITICAL-2 — `payouts/route.ts` PATCH lacks period-lock guard
`PATCH` supports `mark_paid`, `mark_failed`, `cancel`, `manual_override`, `clear_override`, `reset_failed`. **`mark_paid` and `manual_override` mutate `montree_agent_payouts` rows** — but the route has zero `assertPeriodOpen` / `isPeriodClosed` calls (lines 202-260). A super-admin (or anyone who steals super-admin auth) can flip a payout to `paid` in a closed Q1 period that the accountant has already reconciled. Session 109 architectural rule #62 explicitly: "Period-locked months are immutable. `assertPeriodOpen()` gates every mutation to finance_transactions + agent_payouts."
**Fix:** Look up the payout row's `period_month`, then `await assertPeriodOpen(supabase, periodMonth)` at top of each mutating action; return 409 with friendly error if closed.

### HIGH-6 — `finance/recurring/route.ts` POST/PATCH/DELETE missing guard
The CRON's `recurring/run` correctly checks `isPeriodClosed`, but **manual CRUD of recurring templates is unguarded**. Less severe (templates don't directly write rows — the cron does), but editing a template's `day_of_month` mid-closed-period can cause the cron to fire into a now-reopened period with stale assumptions.
**Fix:** PATCH/DELETE on templates that have already fired in a closed period should return 409 unless the closed period is reopened first. POST (new template) is fine.

---

## Top 5 actionable (CRITICAL first)

1. **CRITICAL-1** — Lock down `/api/montree/feedback` POST. Add `verifySchoolRequest` (or `verifyParent`) at the top; derive `school_id`/`user_id`/`user_type`/`user_name` from auth, never body. This is a cross-pollination + impersonation hole.
2. **CRITICAL-2** — Add `assertPeriodOpen()` guard to `super-admin/payouts/route.ts` PATCH for `mark_paid`/`manual_override` (and consider `reset_failed`). Without it, closed periods are not immutable for payouts despite the wire/record-wire routes being properly guarded.
3. **HIGH-3 / HIGH-4 / HIGH-5** — Add `checkRateLimit()` to `become-an-agent/apply`, `leads` POST, `feedback` POST. Mirror the pattern already in `demo-request`. Public-form flood prevention.
4. **HIGH-1 / HIGH-2** — Sweep `guru/followup/route.ts` lines 38-50 and `guru/work-guide/route.ts` lines 83/91 from `.single()` → `.maybeSingle()`. New custom works will 0-row these queries and currently throw + log noise.
5. **MED-4** — Bound `agent/earnings/route.ts` and `agent/schools/[id]/route.ts` `montree_api_usage` SELECTs by date range. Future-proofs the agent dashboard against 12-month growth.

**Not in this audit (recommended next pass):** `stripe/connect-webhook/route.ts` idempotency verification, Tracy/Mira logging IIFE check, full `.single()` → `.maybeSingle()` sweep across all 180 sites.
