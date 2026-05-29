# Agent Dashboard — Strategy & Build Plan

**Authored:** May 6, 2026 (Session 90, theorise-first)
**Status:** Design locked. Build phases ahead — recommended order in Section 8.
**Companion docs:**
- `docs/AGENT_REFERRAL_AND_FINANCIALS_PLAN.md` — full 7-phase blueprint (this doc fleshes out Phase 7)
- `docs/handoffs/SESSION_90_HANDOFF.md` — what's already shipped (Phases 1 + 2 + 3)

---

## 1. TL;DR

Agents (Sarah, multiplier partners, consultants) need their own dashboard so they can:

1. **Log in** with their own credentials.
2. **See which schools they referred** — live student counts, subscription status, when each school joined.
3. **Generate their own referral codes** without going through Tredoux for each pitch.
4. **Track their earnings transparently** — what they're owed for the current month, what's been paid, what each school is contributing.
5. **Check / fix their Stripe Connect setup** themselves, including resending the onboarding link if it expired.

This is **Phase 7** of the agent referral programme. Phases 1 + 2 + 3 (Tredoux-side issuing + redemption + Stripe Connect onboarding) shipped in Session 90. The dashboard is the agent-side companion.

**Build estimate: ~4-5 dedicated days, in 5 sub-phases (7a-7e).** Can ship before Phase 4 (Stripe school billing) and Phase 5 (payout calc) by showing **estimated** earnings; swap to **actual** numbers once those land.

---

## 2. Sarah's experience — UX walkthrough

A complete agent journey, from "Tredoux gives Sarah her access" through "Sarah checks her dashboard six months later."

### First contact (already shipped — Phases 1-3)

1. Sarah and Tredoux agree on terms (e.g. 50% of net profit per referred school).
2. Tredoux opens super admin → 🎟️ Referrals → "+ Issue code" → fills in Sarah's name, email, 50%, optional pitch label.
3. Tredoux gets `SARAH-3KD5` (or similar) in a banner. Copies + sends to Sarah.
4. Sarah uses the code to pitch a school. Code is permanently bound to her at that %.

### Phase 7a: Sarah gets agent login (NEW)

5. Tredoux clicks a NEW button per row in Referrals: **"Issue agent login"**.
6. A modal generates Sarah a 6-character agent login code (e.g. `K9X7M2`). Copy → email to Sarah.
7. Sarah opens `montree.xyz` → enters `K9X7M2` at the login screen → lands on **`/montree/agent/dashboard`**.

### Phase 7c-d: Sarah's dashboard (NEW)

When Sarah logs in, she sees:

**Header**
> Hi Sarah. Welcome back.
> *3 schools · $58.40 owed this month · $124.60 paid to date*

**Stripe Connect status banner** (only if not Verified)
> ⚠ Payout setup incomplete. Click here to finish — takes 5 minutes.

**Schools section**
A clean card per school she's referred:
```
 ┌────────────────────────────────────────────────────────┐
 │ Greenfield Montessori                    🇳🇿 Auckland   │
 │ Linked May 2 · Trial ends May 30                       │
 │ 18 students · ~$126/mo subscription                    │
 │ Estimated this month: $51.20 (your share)              │
 │                                                        │
 │ [View detail →]                                        │
 └────────────────────────────────────────────────────────┘
```

**Earnings section**
```
This month (estimated)        $58.40 across 3 schools
Last month (paid)             $42.10  ✓ paid May 5
Year to date                  $124.60
```
With a per-month table below.

**Codes section**
Pending codes (with Copy button + Revoke).
[+ Generate new code] button — self-service.
Redeemed codes show the school name they linked to.

### Daily routine (the value Sarah gets)

Sarah opens her dashboard once a week or when she's about to pitch a new school:
- Sees that Greenfield's student count went up 18 → 22 → "great, more revenue for me too"
- Pulls up her code list → already has `SARAH-3KD5` for Greenfield → generates a fresh `SARAH-7P9F` for the new pitch
- Goes to pitch the next school
- Comes back next month, sees `$58.40 paid 5 May` confirmed

**Key UX principle: total transparency.** Sarah sees the same math Tredoux sees. No black box. The platform is a partner she can audit, not a system she has to trust blindly.

---

## 3. Architecture

### 3.1 Identity model

**Decision: agents live in `montree_teachers`** (continuing from Phases 1-3). They get extra columns rather than a new table.

| Reason | Why |
|--------|-----|
| Phases 1-3 already use `montree_teachers` for agents | Schema continuity |
| Some agents will also be teachers at one of their schools | Shared identity is desirable |
| `founding_teacher_id` already references `montree_teachers` | No FK rewrite |
| One row, multiple roles is normal Postgres pattern | Less code complexity |

**Mental model:** a `montree_teachers` row can be:
- Just a teacher (`is_active=true`, `is_agent=false`)
- Just an agent (`is_active=false`, `is_agent=true`) — the shell agent records from Phase 1
- Both — a teacher who also refers schools

### 3.2 Schema additions

```sql
-- migrations/188_agent_dashboard.sql

ALTER TABLE montree_teachers
  -- Marker — does this row act as an agent?
  ADD COLUMN IF NOT EXISTS is_agent BOOLEAN NOT NULL DEFAULT FALSE,

  -- Agent's login credentials. Separate from password_hash so a teacher-agent
  -- can have BOTH a teacher login (school-level dashboard) AND an agent login
  -- (referral dashboard) without collision.
  ADD COLUMN IF NOT EXISTS agent_password_hash TEXT,
  ADD COLUMN IF NOT EXISTS agent_login_set_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agent_login_last_used_at TIMESTAMPTZ,

  -- Default % to apply when this agent generates a new code via self-service.
  -- Tredoux locks this when issuing the agent login. Per-pitch override
  -- still possible via the per-code revenue_share_pct column.
  ADD COLUMN IF NOT EXISTS agent_default_share_pct NUMERIC(5,2) CHECK (
    agent_default_share_pct IS NULL OR (agent_default_share_pct >= 0 AND agent_default_share_pct <= 100)
  ),

  -- Optional flag if Tredoux wants to suspend an agent without deleting.
  ADD COLUMN IF NOT EXISTS agent_suspended_at TIMESTAMPTZ,

  -- Audit
  ADD COLUMN IF NOT EXISTS agent_notes TEXT;

-- Unique partial index on agent_password_hash so two agents can't accidentally
-- get colliding hashes (statistically impossible but the constraint catches it).
CREATE INDEX IF NOT EXISTS idx_teachers_agent_active
  ON montree_teachers(id)
  WHERE is_agent = TRUE AND agent_suspended_at IS NULL;
```

**Idempotent.** Doesn't break anything in Phases 1-3.

### 3.3 Authentication

**Decision: agents log in with a 6-character alphanumeric code** (same alphabet as principals — no I/O/0/1).

**Why a code, not email/password:**
- Same login UX as teachers and principals (consistency)
- No password reset flow to build
- The code is hashed (`legacySha256`) into `agent_password_hash` — same crypto pattern as everywhere else
- Tredoux can rotate it from super admin if compromised

**Login flow extension** (`/api/montree/auth/unified/route.ts`):

Add `tryAgentLogin()` AFTER `tryPrincipalLogin()` and `tryTeacherLogin()`, BEFORE `tryParentLogin()`:

```
1. tryReferralPrecheck      — already exists (Phase 2)
2. tryPrincipalLogin        — already exists
3. tryTeacherLogin          — already exists
4. tryAgentLogin            — NEW (this phase)
5. tryParentLogin           — already exists
```

Lookup pattern:
```typescript
const { data } = await supabase
  .from('montree_teachers')
  .select('id, name, email, is_agent, agent_suspended_at, agent_default_share_pct')
  .eq('agent_password_hash', legacySha256(code))
  .eq('is_agent', true)
  .is('agent_suspended_at', null)
  .maybeSingle();
```

If found, issue a JWT with `role: 'agent'`. Set `montree-auth` cookie. Redirect to `/montree/agent/dashboard`.

**Order is deliberate:** agent comes after teacher because if a code matches both `password_hash` (teacher) AND `agent_password_hash` (agent) — statistically impossible but defensive — teacher wins. The agent dashboard is a strictly narrower view.

**JWT role enum needs `'agent'` added.** This affects:
- `lib/montree/server-auth.ts` — `MontreeRole` type
- `lib/montree/verify-request.ts` — role checks
- Cookie name resolution logic (we may want a separate cookie like `montree_agent_session` to keep agent sessions distinct from teacher sessions)

**Cookie decision: reuse `montree-auth` cookie with role inside.** Same as principal flow. Keeps middleware simple. The `verifySchoolRequest` helper already extracts role.

### 3.4 Routes

**Pages** (all under `/montree/agent/*`):

| Path | Purpose |
|------|---------|
| `/montree/agent/dashboard` | Home — header summary, schools grid, earnings, codes |
| `/montree/agent/schools` | Full list of referred schools (overflow when more than fit on dashboard) |
| `/montree/agent/schools/[id]` | Per-school detail — student count history, monthly contribution, full ledger |
| `/montree/agent/codes` | Full code management — issue new, revoke pending, history |
| `/montree/agent/earnings` | Full earnings ledger — month-by-month, exportable as CSV |
| `/montree/agent/payouts` | Stripe Connect status, payout history, re-onboarding link |
| `/montree/agent/onboarding` | EXISTING from Phase 3 (Stripe return URL) — stays as-is |
| `/montree/agent/settings` | Edit profile, change agent login code |

**APIs** (all gated on `role === 'agent'` and self-scoped to the auth'd agent):

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/montree/agent/me` | Agent profile + Stripe Connect status + summary stats |
| GET | `/api/montree/agent/schools` | Schools the agent has referred (list) |
| GET | `/api/montree/agent/schools/[id]` | Per-school detail (the agent must own this school via founding_teacher_id) |
| GET | `/api/montree/agent/codes` | Agent's referral codes |
| POST | `/api/montree/agent/codes` | Self-generate a new code |
| DELETE | `/api/montree/agent/codes?id=X` | Revoke a pending code (only the agent's own, only pending) |
| GET | `/api/montree/agent/earnings` | Earnings (real if Phase 5 live, otherwise estimates) |
| GET | `/api/montree/agent/payouts` | Payout history |
| POST | `/api/montree/agent/connect-onboard` | Generate fresh Stripe Connect onboarding URL (reuses Phase 3 helper) |
| POST | `/api/montree/agent/connect-status` | Force-refresh Stripe status from Stripe (reuses Phase 3 helper) |

**Security invariant:** every endpoint queries `WHERE founding_teacher_id = auth.userId` (or `WHERE agent_id = auth.userId` for codes). An agent can NEVER see another agent's schools, codes, or earnings. This is enforced at the query level, not just in the UI.

### 3.5 Self-service code generation rules

**Decision: agents can generate unlimited codes**, BUT:

1. **Default % is locked** to the agent's `agent_default_share_pct` (set by Tredoux when issuing the agent login). The agent CANNOT raise their own %. This prevents abuse.
2. **Per-code pitch label is required** — forces the agent to commit to which school they're pitching. Helps with audit and revocation.
3. **Soft rate limit: 20 codes per 24 hours.** Reasonable upper bound. Prevents accidental spam.
4. **Pending codes count toward the limit.** Revoking a pending code refunds the budget.

**Why no hard cap:** codes are cheap. A motivated agent legitimately pitching 50 schools should be able to. The 20/day rate limit prevents pathological behaviour without blocking real outreach.

### 3.6 Earnings calculation — current state vs ideal

**Without Phases 4 + 5 (current state):**
- Each school's monthly subscription is **estimated** as `student_count × $7`.
- API costs are computed from `montree_api_usage` per-school sums for the period.
- `net_estimate = (student_count × $7) − api_costs − stripe_fee_estimate`
- `agent_share_estimate = net_estimate × revenue_share_pct`
- The dashboard labels these as **"Estimated"** and surfaces a banner: *"Final numbers are calculated at month end."*

**With Phases 4 + 5 (ideal):**
- Stripe is the source of truth for revenue (`montree_finance_transactions` rows of type=`income`).
- `montree_agent_payouts` rows hold the locked monthly calculation (gross, fees, costs, net, share, payout).
- The dashboard reads from `montree_agent_payouts` directly. No estimates needed.

**Migration path:**
The estimate logic and the actual logic both write to the same UI fields. We just swap the data source. The agent never sees a regression in display — only an upgrade from "estimate" → "confirmed."

### 3.7 Multi-currency

USD-only for the dashboard display in v1. Per `AGENT_REFERRAL_AND_FINANCIALS_PLAN.md` the books are USD. If an agent's payout currency differs (e.g. they want HKD for ease at their bank), Stripe Connect handles the conversion at payout time. The dashboard shows USD; Stripe receipt shows the agent's local currency.

---

## 4. The agent's "first run" — onboarding flow

When an agent logs in for the FIRST time (`agent_login_last_used_at IS NULL`):

1. Land on `/montree/agent/dashboard` as usual.
2. Soft-overlay tutorial (3 cards):
   - **Card 1**: "This is your home. We show every school you've brought in, your codes, and what you're owed."
   - **Card 2**: "Generate codes by clicking [+ Generate new code]. Each one is yours forever — when a school redeems it, you're locked to that school for as long as they're paying."
   - **Card 3**: "Set up payouts now to get paid automatically each month." (Direct CTA to Stripe Connect onboarding.)
3. Stamp `agent_login_last_used_at`. Tutorial never shows again.

The Stripe Connect prompt is the most important card — without it, payouts are manual Wallex wires.

---

## 5. Super admin extensions

Tredoux needs a way to issue + manage agent logins from his super admin. Build into the existing Referrals tab:

### 5.1 New per-row buttons

Per agent row in the codes table, add:
- 🔑 **Issue / reset agent login** — generates a fresh 6-char code, displays once via the existing reveal-once banner pattern, hashes into `agent_password_hash`, sets `is_agent=true`, sets `agent_login_set_at=now`.
- ⏸ **Suspend agent** — sets `agent_suspended_at`. Their login stops working immediately. All other linkages preserved (their schools still pay them via the historical agent_id, but they can't log in or generate new codes).
- ▶ **Reactivate** — clears `agent_suspended_at`.

### 5.2 Per-agent default % edit

When Tredoux issues an agent login, he sets the agent's `agent_default_share_pct`. Editable later from super admin (changes apply to NEW codes only — existing per-school % stays locked).

### 5.3 New API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/montree/super-admin/agents/[id]/login` | Issue / reset agent login code, returns plaintext once |
| PATCH | `/api/montree/super-admin/agents/[id]/login` | Suspend / reactivate / change default % |

### 5.4 New super admin Money preview (optional Phase 6 hookup)

The Referrals tab could show a column "Total earned" per agent (sum of `montree_agent_payouts.agent_payout_usd` where status=paid). Tredoux sees what he's paid each agent at a glance.

---

## 6. UX details — the dashboard page

### 6.1 Mobile-first layout

Agents will check on phones. Single-column on narrow viewports:
- Header
- Stripe Connect banner (if not verified)
- Earnings summary (3 figures stacked)
- Schools list (cards stack vertically)
- Codes section
- Footer

Desktop: 2-3 column grid for schools, sidebar layout for the rest.

### 6.2 Theme

Dark forest gradient (matches `/montree`, `/montree/try`, `/montree/login-select`). Lora serif for headings. Inter for body. Gold (`#E8C96A`) for emphasis. Emerald (`#34d399`) for primary CTAs.

Same component library as the public-facing pages — NOT the slate dark of super admin.

### 6.3 Live data refresh

Every 60 seconds, refetch `/api/montree/agent/me` and `/api/montree/agent/schools`. Skip when tab is hidden. Same pattern as Visitors tab.

### 6.4 The "what just happened" banner

When a school redeems one of the agent's codes, the next time the agent loads the dashboard show a celebration banner:
> 🎉 Greenfield Montessori just signed up using your code SARAH-3KD5. Welcome to your dashboard, partner.

Shown once. Tracked via `agent_last_seen_school_count` vs current school count delta.

### 6.5 Real numbers, no fluff

Don't use words like "potential" or "could earn." Use exact figures with timestamps:
> Estimated this month: **$58.40**
> Based on current student counts as of just now. Final number locks at month end.

If estimate, say so. If confirmed, say so. Never blur the line.

---

## 7. Privacy, security, audit

### 7.1 What an agent can see

✅ Their own profile, codes, schools, earnings, payouts, Stripe Connect status.

❌ Other agents (existence, names, %).
❌ Schools they didn't refer.
❌ Internal financials (Tredoux's net, total platform revenue, etc.).
❌ Other principals' or teachers' login codes.
❌ Anything in super admin.

### 7.2 Server-side enforcement

Every route does:
```typescript
const auth = await verifySchoolRequest(req);
if (!auth.ok || auth.role !== 'agent') return 401;

// All queries filter by auth.userId
const { data } = await supabase
  .from('montree_schools')
  .select(...)
  .eq('founding_teacher_id', auth.userId);  // ← critical filter
```

No exceptions. Even GET endpoints filter by ownership.

### 7.3 Audit log

Each meaningful agent action writes to `montree_agent_audit` (new table):
- Login (success / failure)
- Code generation
- Code revocation
- Stripe onboarding link generation
- Profile change

Tredoux can review from super admin → "Agent activity" subview.

### 7.4 Rate limiting

Reuse the existing `lib/rate-limiter.ts` pattern from the unified login route. Apply to:
- `/api/montree/agent/codes` POST (20 / 24h, per agent)
- `/api/montree/agent/connect-onboard` POST (10 / hour, per agent)
- Login attempts (5 / 15min, per IP — already covered by unified login route)

---

## 8. Build phases (5 sub-phases)

### Phase 7a — Foundation (1 day)

1. Migration `188_agent_dashboard.sql` (schema additions per Section 3.2).
2. Super admin: 🔑 button on referrals table → modal → POST `/api/montree/super-admin/agents/[id]/login` → reveal-once banner.
3. Super admin: ⏸ / ▶ suspend toggle.
4. Super admin: edit default % for an agent.

After Phase 7a: Tredoux can issue Sarah a login code. She can't log in yet (no auth wiring). Code is in the DB.

### Phase 7b — Authentication (0.5 day)

1. Add `'agent'` to `MontreeRole` type in `lib/montree/server-auth.ts`.
2. Add `tryAgentLogin()` to `/api/montree/auth/unified/route.ts` (between teacher and parent).
3. Add agent role handling to `setMontreeAuthCookie()`.
4. Add agent route protection to `lib/montree/verify-request.ts`.

After Phase 7b: Sarah can log in with her agent code → JWT issued → cookie set → redirect to `/montree/agent/dashboard`. The page doesn't exist yet (404). Auth works in isolation.

### Phase 7c — Pages (2 days)

1. Layout shell at `/montree/agent/layout.tsx` (theme + nav).
2. Dashboard home page.
3. Schools list + per-school detail.
4. Codes management (with self-service generation).
5. Earnings ledger.
6. Payouts page (Stripe Connect status + payout history).
7. Settings page (change login code, edit profile).

After Phase 7c: Sarah logs in, sees a fully-rendered (but data-thin) dashboard. UI shipped.

### Phase 7d — APIs + data (1 day)

1. All ten endpoints in Section 3.4.
2. Earnings calculation logic — estimate-mode (until Phases 4-5) and actual-mode (after).
3. Schools list with live student counts and revenue estimates.
4. Code self-service with rate limiting.

After Phase 7d: Sarah's dashboard shows real data. Earnings are estimates. Self-service code generation works.

### Phase 7e — Polish + launch (0.5 day)

1. First-run tutorial overlay.
2. "School redeemed" celebration banner.
3. Mobile responsive sweep.
4. Empty-state UI for "no schools yet" / "no codes yet" / "no earnings yet."
5. Error states for Stripe API failures.
6. End-to-end test with a real agent (issue code → log in → generate referral → simulate redemption → verify dashboard updates).

After Phase 7e: ready for Sarah. Send her the agent login code, send her the URL. She's a partner, not a contact in your CRM.

---

## 9. Open questions (decisions to lock before Phase 7a)

These are the things that need a yes/no from you before I start building:

### Q1. Suspend agents — terminal or recoverable?

When an agent is suspended (e.g. they leave the partnership), do their schools' revenue shares stay active and accumulate, or do they freeze too?

**Recommendation: stay active.** The agent earned that link by bringing the school in. Suspending their login doesn't claw back what they're owed. Tredoux can independently zero out the revenue share by editing `montree_schools.revenue_share_active` if the relationship truly ends.

### Q2. Agent edits their own profile — what's editable?

Email, display name? Or read-only (Tredoux controls)?

**Recommendation: read-only for v1.** Editing introduces edge cases (e.g. agent changes email → Stripe Connect still has old email). Locked profile, ask Tredoux for changes. Phase 8 if real-world need.

### Q3. Code generation — Tredoux notification?

When Sarah generates a self-service code, do you get pinged?

**Recommendation: no.** Quiet by default. Add a daily summary email later if it becomes useful. Pinging on every code = noisy.

### Q4. Per-pitch % override at code-generation time?

Currently per-code % is set when Tredoux issues. With self-service, agent can either generate at their default %, OR negotiate per-school terms.

**Recommendation: locked at default for v1.** Sarah generates at 50% (her default). If a school wants different terms, Tredoux issues that one specially via super admin. Self-service stays predictable.

### Q5. Multiple agents on one school — supported?

Today: no. `founding_teacher_id` is a single column on `montree_schools`, set once at redemption.

**Recommendation: keep it single for v1.** Multi-agent splits (e.g. two consultants brought a school in together, want 25%/25%) are a v2 feature. Document for later.

### Q6. Agent dashboard URL on a separate subdomain?

`agent.montree.xyz` vs `montree.xyz/montree/agent`?

**Recommendation: subpath, not subdomain.** Less DNS / SSL hassle, same JWT cookie, consistent UX. Subdomain is a marketing decision (does "agents.montree.xyz" feel more pro to a multiplier partner?). Easy to migrate later if needed.

### Q7. When does Phase 7 ship — before or after Phases 4-5?

Phases 4 (Stripe school billing) and 5 (payout calc) are preconditions for ACCURATE earnings. Without them, Phase 7 shows estimates.

**Recommendation: ship Phase 7 BEFORE 4-5.** Sarah needs visibility now, not in a month. Estimates are honest if labelled. Real numbers swap in cleanly when Phase 5 lands. The build doesn't change shape.

---

## 10. Risks

### R1. Agents see they're owed less than expected when actuals replace estimates

If `student_count × $7` overshoots actual Stripe billing (e.g. the school had refunds, or the subscription is currently paused), the actual payout is lower than the estimate. Sarah sees `$58.40 estimated` and gets `$42.10 paid`.

**Mitigation:** label estimates clearly. Use phrases like "based on current headcount — final number subject to actual subscription activity." Add a tooltip explaining. Better to under-promise than over-promise.

### R2. Agent generates codes faster than the rate limit allows

Edge case where a motivated agent has a multi-school pitch and needs many codes at once.

**Mitigation:** the 20/day limit is generous. If it bites, surface a clear error: "You've issued 20 codes today. Reach out to Tredoux if you need more." Tredoux can manually issue from super admin.

### R3. Agent sees data they shouldn't due to a query bug

Cross-pollination is the worst possible bug for this product. An agent seeing another agent's schools = trust destroyed.

**Mitigation:** every API route is auth + filter. Add tests. Code review every route to confirm `WHERE founding_teacher_id = auth.userId` is in place. CLAUDE.md already has this as a critical architectural rule.

### R4. Stripe Connect link expires before the agent finishes onboarding

Stripe Connect onboarding links time out in ~5 minutes. Agent clicks, gets called away, comes back, link is dead.

**Mitigation:** the agent's payouts page has a "Generate fresh link" button. Always available, generates new every time. Also: send a fresh link via email when an agent's `stripe_connect_status` is `pending` for >24 hours (Phase 8 nice-to-have, not v1).

### R5. Tredoux wants to deactivate an agent but their schools still owe payouts

E.g. Sarah leaves the partnership. We don't want to keep paying her, but she's owed for last month.

**Mitigation:** suspend their login (`agent_suspended_at`). They can't log in, can't generate new codes. But `montree_agent_payouts` rows in `pending` status STILL get paid out — that's owed money. Setting `montree_schools.revenue_share_active = false` separately stops FUTURE accrual. Two-knob system handles this cleanly.

### R6. Build slips and Phase 4 lands first

If Phase 4 (Stripe billing) ships before Phase 7 dashboard, the agent dashboard logic gets simpler (less estimate code) but the launch order is wrong (Sarah waits longer).

**Mitigation:** treat them as parallel tracks. Phase 7 doesn't block on 4 because of the estimate fallback. Phase 4 doesn't block on 7 because it has its own utility (bills schools).

---

## 11. Success criteria

After Phase 7 launches, we know it's working when:

1. ✅ Sarah logs in without asking Tredoux for help.
2. ✅ She sees her referred school(s) immediately.
3. ✅ She generates a new code self-service, gives it to a school, school signs up, school appears on her dashboard within minutes.
4. ✅ Her Stripe Connect onboarding completes without going through Tredoux.
5. ✅ She sees a credible monthly estimate that matches Tredoux's super-admin view.
6. ✅ When the first real payout lands in her bank, the dashboard reflects it.
7. ✅ She doesn't ping Tredoux to ask "how am I doing this month?" — the dashboard answers it.

---

## 12. Total cost estimate

| Phase | Effort | Cost (Anthropic + OpenAI) | Notes |
|-------|--------|---------------------------|-------|
| 7a Foundation | 1 day | ~$0.50 | Migration + super admin UI |
| 7b Auth | 0.5 day | ~$0.20 | Three files |
| 7c Pages | 2 days | ~$1.50 | 7 pages + layout |
| 7d APIs + data | 1 day | ~$0.80 | 10 endpoints |
| 7e Polish | 0.5 day | ~$0.30 | Tests + edge cases |
| **Total** | **~5 days** | **~$3.30** | |

Plus ~$0.001 per dashboard page-load in production (Anthropic-powered Astra isn't on this surface; just data fetches).

---

## 13. The shape of the resume prompt

When this strategy gets picked up for build (next session or later), the kickoff is:

> "Build Phase 7a. Read `docs/AGENT_DASHBOARD_PLAN.md` Section 8 sub-phase 7a. Run migration 188 first, then super admin UI for issuing agent logins. Audit-fix until clean."

Each sub-phase has its own resume prompt. They should ship sequentially with audit-fix cycles between, same discipline as Phases 1-3.

---

## 14. What this doc is NOT

- Not a final UI mockup (that's for the build session — start sketching from Section 6).
- Not a security audit (that's done DURING build, with route-by-route enforcement of Section 7).
- Not a price negotiation tool (that's between Tredoux and the agent — this only stores what's already agreed).
- Not Phase 4 / 5 / 6 — those are independent, this is Phase 7. See `AGENT_REFERRAL_AND_FINANCIALS_PLAN.md` for the full programme.

---

## 15. Key architectural rules locked in (do NOT let future agents break these)

1. **Agents live in `montree_teachers` with `is_agent=true`.** Don't create a parallel `montree_agents` table without a migration plan.
2. **Agent login is a 6-char code hashed into `agent_password_hash`.** Separate column from `password_hash` so teacher-agents can have both.
3. **Every agent-scoped query filters by `founding_teacher_id = auth.userId` OR `agent_id = auth.userId`.** No exceptions. Cross-pollination would destroy trust instantly.
4. **JWT role for agents is `'agent'`.** Add to `MontreeRole` union, threaded everywhere.
5. **Agents see ESTIMATES until Phase 5 ships.** Always labelled. Final numbers come from `montree_agent_payouts` after.
6. **Self-service code generation defaults to the agent's locked %.** Agent cannot raise their own %.
7. **Suspended agents stop logging in but their PENDING payouts still pay.** Two-knob system: `agent_suspended_at` (login) vs `revenue_share_active` (accrual).
8. **Mobile-first layout.** Agents check on phones.
9. **Dark forest theme** (matches public Montree pages, NOT super admin slate).
10. **No notifications by default.** Quiet UI. Add daily/weekly digests later if real demand.
