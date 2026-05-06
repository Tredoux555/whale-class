# Session 91 Handoff — Phase 7a: Agent Login Foundation

**Date:** May 6, 2026 (overnight build)
**Status:** Phase 7a shipped. Push pending.
**Companion docs:**
- `docs/AGENT_DASHBOARD_PLAN.md` — full Phase 7 strategy (Section 8 sub-phase 7a is what this session built)
- `docs/handoffs/SESSION_90_HANDOFF.md` — Phases 1+2+3 (the foundation this builds on)

---

## TL;DR

Phase 7a complete. Tredoux can now issue, reset, suspend, reactivate, and edit-default-% on agent logins from super admin → 🎟️ Referrals tab. Every action writes to a new audit log surfaced inline as a collapsible "Recent agent activity" panel (Q3 modification — log don't ping).

**6 files created/modified across 1 migration + 2 API routes + 1 lib helper + 1 component edit.** All eslint-clean with `--max-warnings=0`. Migration 188 must be run in Supabase before the new buttons work.

**This is the foundation only.** Phase 7b (auth wiring so the agent can actually log in with the code) and Phase 7c (the agent dashboard UI itself) are next sessions. Sarah can be issued a code now but it won't authenticate her until 7b ships.

---

## What got built

### 1. Migration 188 — `migrations/188_agent_dashboard.sql`

Schema additions per AGENT_DASHBOARD_PLAN Section 3.2 + a new audit table for Q3.

`montree_teachers` extensions (all idempotent, IF NOT EXISTS):
- `is_agent BOOLEAN NOT NULL DEFAULT FALSE` — marker
- `agent_password_hash TEXT` — SHA-256 of agent's 6-char login code, separate from `password_hash` so a teacher-agent can hold both
- `agent_login_set_at TIMESTAMPTZ`
- `agent_login_last_used_at TIMESTAMPTZ`
- `agent_default_share_pct NUMERIC(5,2)` with CHECK (NULL or 0-100)
- `agent_suspended_at TIMESTAMPTZ`
- `agent_notes TEXT`

Indexes:
- Partial active-agent index `WHERE is_agent=TRUE AND agent_suspended_at IS NULL` (login + dashboard query path)
- Partial unique index on `agent_password_hash WHERE agent_password_hash IS NOT NULL` (prevents accidental hash collision)

`montree_agent_audit` (new table):
- Append-only event log for agent-affecting actions
- `id, agent_id, agent_display_name, agent_email, event_type, actor_role, details JSONB, ip_address, user_agent, created_at`
- `actor_role` CHECK constraint: `super_admin | agent | system`
- 3 indexes: per-agent (DESC), per-event-type (DESC), recent-global (DESC)
- ON DELETE SET NULL on `agent_id` so audit history survives agent deletion

🚨 **Migration must be run in Supabase SQL Editor before the new tab works.** Until run, the activity panel shows a clear "Run migration 188" message and the issue-login modal will 500 on POST.

### 2. API: `/api/montree/super-admin/agents/[id]/login/route.ts`

- **POST** — Issue or reset agent login. Optional body `{ default_share_pct?: number|null }` locks the agent's default % at the same time. Generates 6-char code from the principal alphabet (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, no I/O/0/1), hashes via `legacySha256()`, stores hash, returns plaintext exactly once. Sets `is_agent=true` and clears any existing suspension. Logs `agent_login_issued` event with `{ reset, default_share_pct_set, default_share_pct }` details. Plaintext NEVER persisted, NEVER logged.
- **PATCH** — `{ action: 'suspend' | 'reactivate' | 'set_default_pct', default_pct?: number|null }`. Idempotent (`already_suspended`, `already_active`, `no_change` shortcuts). Refuses operation on non-agents (`is_agent=false → 400`). Logs corresponding event types.
- Auth: `verifySuperAdminAuth(req.headers)` on both methods.
- Audit: fire-and-forget via `void logAgentAudit(...)`; logging failure never blocks the primary operation.

### 3. API: `/api/montree/super-admin/agent-audit/route.ts`

- **GET** — Paginated list of audit events. Most recent first. Optional filters by `agent_id` and `event_type`. Limit clamped 1-200 (default 50). Returns `{ events, total, limit, offset }`. Detects "table doesn't exist" (Postgres 42P01) and returns `{ events: [], total: 0, migration_pending: true }` so the UI can show "Run migration 188" instead of a 500.
- Auth: `verifySuperAdminAuth`.

### 4. Helper: `lib/montree/referral/agent-audit.ts`

`logAgentAudit(supabase, entry)` — fire-and-forget writer. Lists all current and reserved event types via the `AgentAuditEventType` union so future writers (Phase 7b login, Phase 7d code generation, etc.) don't drift. Never throws.

### 5. Updated: `app/api/montree/super-admin/referral-codes/route.ts`

GET enrichment now also pulls each agent's new Phase 7a fields (`is_agent`, `agent_login_set_at`, `agent_login_last_used_at`, `agent_default_share_pct`, `agent_suspended_at`) alongside the existing Stripe Connect fields. Wide select with narrow-fallback retry — gracefully degrades when migration 188 hasn't been run yet (page stays usable, agent flags just default to false/null).

### 6. Updated: `components/montree/super-admin/ReferralsTab.tsx`

Per-row buttons:
- 🔑 / 🔑↻ — Issue or reset agent login (modal asks for default %)
- ✏️ — Edit default % (modal explains this only affects future codes)
- ⏸ / ▶ — Suspend / reactivate (suspend has confirm dialog warning that pending payouts still pay)
- (📋 copy code, 💳 Stripe link, Revoke — unchanged)

Status pills below agent email when `is_agent=true`:
- "Active" (with last-login tooltip) / "Login issued" / "Suspended" (orange)
- "Default 50%" (when set)

Reveal-once banner (gold) — agent login plaintext shown ONCE after issuance, with Copy button. Separate from the existing referral code reveal banner so they don't fight for the same state.

Two modals — "Issue / reset agent login" and "Edit default %" — with clear UX copy explaining what each does, including the architectural rule that existing per-school % stays locked.

"Recent agent activity" panel — collapsible, below the codes table. Shows last 50 events with timestamp, plain-English description, agent name + email, actor role pill (super_admin / agent / system). Refreshes when toggled open and after suspend/reactivate/edit-pct actions. Migration-pending state shows a clear "Run migration 188" message.

The activity panel is the Q3 surface — Tredoux gets visibility on every agent action without per-event email pings. If it gets too noisy he can collapse it; if it gets too quiet we can add notifications later.

---

## Architectural rules locked in (do NOT break)

1. **Plaintext agent login codes are returned exactly ONCE on POST.** Never logged, never persisted in plaintext, never returned by GET. The DB only ever holds the SHA-256 hash in `agent_password_hash`.
2. **`is_agent=true` is the marker.** Phase 7b's `tryAgentLogin()` must check this — without it, even a matching hash should refuse to authenticate.
3. **Two-knob suspend system.** `agent_suspended_at` stops login; `montree_schools.revenue_share_active=false` stops future accrual. Independent. Pending `montree_agent_payouts` STILL pay out when suspended — that's earned money.
4. **Default % change only affects FUTURE self-generated codes.** Existing per-school revenue share stays locked at redemption time. The PATCH route does NOT touch `montree_schools.revenue_share_pct` or `montree_referral_codes.revenue_share_pct`.
5. **Issuing a fresh code clears any prior suspension.** Tredoux is explicitly re-activating by handing out a new code. To suspend, use PATCH explicitly.
6. **Every state change writes to `montree_agent_audit`.** Q3 decision: log don't ping. Audit logging is fire-and-forget — primary operation never fails because logging failed.
7. **`agent_password_hash` is SEPARATE from `password_hash`.** A teacher-agent (someone who teaches at a school they ALSO referred) can have BOTH a teacher login AND an agent login without collision. Phase 7b auth must look up via `.eq('agent_password_hash', codeHash).eq('is_agent', true)` not the teacher's password_hash column.
8. **Future tryAgentLogin order in unified login**: principal → teacher → AGENT (new) → parent. Strictly more specific roles first. Same pattern as Session 86's principal-first fix.

## Decisions locked from Q1-Q7 (Section 9 of the plan)

All confirmed by user this session:

| Q | Decision | Built into Phase 7a? |
|---|----------|---------------------|
| Q1 | Suspend = stops login, doesn't freeze pending payouts | ✅ Two-knob system documented in code + migration comments |
| Q2 | Agent profile read-only | Phase 7c (no agent UI yet) |
| Q3 | **Log don't ping (changed from recommendation)** | ✅ `montree_agent_audit` + Recent activity panel |
| Q4 | Self-service codes lock at agent's default % | Phase 7d (no self-service yet) |
| Q5 | Single agent per school | ✅ schema unchanged — `founding_teacher_id` stays single |
| Q6 | Subpath `/montree/agent/*`, not subdomain | Phase 7c |
| Q7 | Ship before Phases 4-5 with estimates | ✅ Phase 7a doesn't depend on real numbers |

---

## What is NOT shipped yet

Phase 7a is foundation only. NOT in this session:
- **Phase 7b — auth wiring.** `tryAgentLogin()` in `/api/montree/auth/unified/route.ts`, `'agent'` added to `MontreeRole` type, agent route protection in `verify-request.ts`. Agent CANNOT actually log in yet — code is in DB, but unified login won't recognize it.
- **Phase 7c — pages.** `/montree/agent/dashboard|schools|codes|earnings|payouts|settings`. None exist.
- **Phase 7d — APIs.** `/api/montree/agent/*` (me, schools, codes, earnings, payouts). None exist.
- **Phase 7e — polish.** First-run tutorial, celebration banner, mobile sweep.

Sarah can be issued a code via the new 🔑 button right now, but the code goes into the DB and stays there — until 7b ships, the unified login route doesn't know how to authenticate her with it.

---

## Production verification checklist (after Tredoux runs migration 188)

1. Open super admin → 🎟️ Referrals tab
2. Pick any pending or redeemed code with an `agent_id`
3. Click the 🔑 button (green if first time, amber 🔑↻ if reset)
4. Modal opens — enter default %, click "Issue agent login"
5. Verify gold reveal-once banner appears with the 6-char code + Copy button
6. Verify the row's Agent column now shows "Login issued" pill + "Default X%" pill
7. Click ⏸ on the same row, confirm the warning dialog
8. Verify pill changes to "Suspended" (orange), button flips to ▶
9. Click ▶ to reactivate
10. Click ✏️ to change default % — verify save works
11. Scroll down to "Recent agent activity" panel, click "▸ Show"
12. Verify the 4 actions just performed are logged with correct timestamps and "super_admin" actor role
13. Click 🔑↻ (reset) on the same row — verify a new code is generated and the modal calls it a "reset"
14. Verify the reveal banner shows the NEW code, not the old one
15. Verify the activity panel shows `agent_login_issued` with `reset: true` in the description

---

## File-by-file change list

| File | Status | Lines |
|------|--------|-------|
| `migrations/188_agent_dashboard.sql` | NEW | 127 |
| `app/api/montree/super-admin/agents/[id]/login/route.ts` | NEW | 360 |
| `app/api/montree/super-admin/agent-audit/route.ts` | NEW | 73 |
| `lib/montree/referral/agent-audit.ts` | NEW | 75 |
| `app/api/montree/super-admin/referral-codes/route.ts` | EDITED (GET enrichment widened) | +27/-9 |
| `components/montree/super-admin/ReferralsTab.tsx` | EDITED (buttons, modals, activity panel) | +~430 |

---

## Audit trail

- Lint: `--max-warnings=0` clean across all 5 changed/new files (eslint exit 0)
- Manual security review: plaintext code never logged, never persisted, never echoed in audit details
- Migration: idempotent (every clause `IF NOT EXISTS`); can be re-run safely
- Auth: every new endpoint gated via `verifySuperAdminAuth(req.headers)` first
- Architectural rules: 8 rules listed above, all locked in code comments + migration comments

---

## Next session priorities

1. **🚨 Tredoux runs migration 188 in Supabase SQL Editor.** Until run, the new buttons surface clear errors but don't function.
2. **Walk through the 15-step verification checklist above on production** after Railway redeploys.
3. **Phase 7b — Agent auth wiring** (~0.5 day). Section 8 of `AGENT_DASHBOARD_PLAN.md`. Three files: `lib/montree/server-auth.ts` (add `'agent'` to MontreeRole), `app/api/montree/auth/unified/route.ts` (add `tryAgentLogin()` between teacher and parent), `lib/montree/verify-request.ts` (agent role handling). After 7b: Sarah's code authenticates her, JWT issued, cookie set, redirect to `/montree/agent/dashboard` (which 404s until 7c).
4. **Phase 7c — Agent pages** (~2 days). The actual dashboard UI in dark forest theme.
5. **Phase 7d — Agent APIs** (~1 day). Self-scoped data fetching with `WHERE founding_teacher_id = auth.userId` filtering on every endpoint.
6. **Phase 7e — Polish** (~0.5 day). First-run tutorial, celebration banner, mobile sweep.

After 7b–7e: Sarah opens montree.xyz, types her code, sees her dashboard with referred schools, generates her own codes, sees her estimated earnings.

---

## Carry-overs from Session 90

Still pending from prior session, not touched here:
1. Stripe Connect HK + Wallex compatibility confirmation (banker call)
2. Stripe Connect webhook setup (5-step Tredoux task in Session 90 handoff)
3. Pamela email draft `r2430204512620199011` waiting in Gmail
4. Outreach: Phase 6 from Session 89 (still untouched)
5. Bingo calling card industrial-printer verification
6. v8 term reports end-to-end review

These remain on the priority list; this session was scoped strictly to Phase 7a as kicked off by user.
