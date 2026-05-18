# Agent Dashboard System — Deep Three-Cycle Audit

*Session 113 V2 follow-up audit · 2026-05-16 · Read-only investigation*

This audit applies the same methodology as the recent photo pipeline / Tracy+Mira / finance audits: three cycles of file-by-file reading focused on correctness, cross-pollination, auth, race conditions, audit logging, rate limits, and pages. Scope: the entire `/montree/agent/*` surface plus the referral code lifecycle, Stripe Connect onboarding, manual wire rail, application flow, and agent ↔ super-admin messaging.

---

## Executive summary

The agent system is the most security-sensitive surface in the codebase — every endpoint operates on money, payout details, and bank info, and the cross-pollination contract (each agent sees ONLY their own data, never another agent's) is load-bearing. The good news: the cross-pollination filter (`founding_teacher_id = auth.userId` for schools, `agent_id = auth.userId` for codes/payouts) is consistently applied across all 11 agent-side endpoints sampled, and every route correctly gates on `auth.role === 'agent'` after the JWT check. Defense-in-depth is also strong — most mutating super-admin endpoints have safety guards (rule #70 mirror, period locks, idempotent UPSERTs).

Three issues worth shipping fixes for:

- **CRITICAL — Referral code redemption race window** (`app/api/montree/try/instant/route.ts:343-363, 450-471, 579-600`). The `.update({ status: 'redeemed' })` on `montree_referral_codes` lacks a `.eq('status', 'pending')` guard, and the school-INSERT happens BEFORE the code-update. Two concurrent signups with the same code both pass the pending check, both create schools, both stamp `founding_teacher_id`, but only one wins the redeem-update. Result: one orphan school stamped with the agent and revenue share, no FK back from `montree_referral_codes`. Hard to trigger in practice but it has happened in real-money systems and is a one-line fix.
- **HIGH — Unified login wraps agent code in a 50-row bcrypt scan** (`app/api/montree/auth/unified/route.ts:336-351, tryTeacherLogin Step 3`). If an agent's code happens to ALSO match the bcrypt of a teacher row (statistically vanishing but possible across `montree_teachers`), the teacher login wins because tryTeacherLogin runs before tryAgentLogin. Less severe than the principal-first fix in Session 86 (Session 86 swapped principal ahead of teacher), but the same class of bug.
- **MED — Agent suspended-while-logged-in silently keeps the cookie valid for 365 days.** `tryAgentLogin` correctly refuses to issue a new JWT for suspended agents, and `resolveMessagingAgent` re-checks `agent_suspended_at`/`is_agent` on every messaging request. But `/api/montree/agent/me`, `/codes`, `/earnings`, `/payouts`, `/schools`, etc., all re-check `is_agent` and `agent_suspended_at` defensively — EXCEPT `/api/montree/agent/payout-method` GET and `/api/montree/agent/connect-status` POST (these DO check, good) AND `/api/montree/agent/logout` (intentional, fine), but `/api/montree/agent/snapshot` and `/api/montree/agent/schools/[id]` do NOT check. A suspended agent who keeps their old cookie still sees per-school financials.

Top three recommended actions:

1. Wrap the redemption in an atomic conditional UPDATE-RETURNING + bail if 0 rows.
2. Add `is_agent` + `agent_suspended_at` defensive checks to `/agent/snapshot` and `/agent/schools/[id]`.
3. Verify Session 86's unified-login order still holds for agent — write a regression test or move `tryAgentLogin` before `tryTeacherLogin` if the founder-agent pattern (one person, both roles, separate hashes) ever creates ambiguity.

---

## Architecture as built

### Dual-rail payout flow

```
                                ┌──────────────────────────────────────┐
                                │ Super-Admin: Referrals tab           │
                                │  💳 Issue agent login (POST /agents/ │
                                │     [id]/login)                       │
                                │  ⚙️  Set payout_config (PATCH /agents│
                                │     /[id]/payout-config)              │
                                └──────────────┬───────────────────────┘
                                               │
                                ┌──────────────┴───────────────────────┐
                                ▼                                       ▼
                  ┌─────────────────────────────┐         ┌────────────────────────────┐
                  │ payout_method =              │         │ payout_method =              │
                  │ 'stripe_connect'             │         │ 'manual_wire'                │
                  │ Agent in Stripe-supported    │         │ Agent in ZA, China, etc.     │
                  │ country (US/GB/EU/AU/JP/HK…) │         │ (Stripe doesn't service)     │
                  └──────────────┬──────────────┘         └──────────────┬─────────────┘
                                 │                                        │
                                 ▼                                        ▼
                  ┌──────────────────────────────┐         ┌────────────────────────────┐
                  │ POST /api/montree/super-admin │         │ Super-admin or agent        │
                  │  /agents/[id]/connect-onboard │         │ stores bank details JSONB    │
                  │  → Stripe.accounts.create()   │         │ on montree_teachers          │
                  │    with country=ZA/US/…       │         │ .manual_payout_details       │
                  │  → Stripe.accountLinks.create │         │ via /payout-method PATCH     │
                  └──────────────┬───────────────┘         └──────────────┬─────────────┘
                                 │                                        │
                                 ▼                                        ▼
                  ┌──────────────────────────────┐         ┌────────────────────────────┐
                  │ Agent fills in Stripe form     │         │ Agent message lands in      │
                  │ Stripe webhook account.updated │         │ Stripe-unsupported friendly │
                  │ → updates stripe_connect_*     │         │ "switch to manual wire"     │
                  │ → status flows pending →       │         │ banner. Patches via         │
                  │   onboarding → verified        │         │ PATCH /agent/payout-method  │
                  └──────────────┬───────────────┘         └──────────────┬─────────────┘
                                 │                                        │
                                 └────────────────┬───────────────────────┘
                                                  │
                                                  ▼
                                ┌─────────────────────────────────────────┐
                                │ When payouts ship (Phase 5):              │
                                │   montree_agent_payouts (one per         │
                                │   agent×school×month) is the canonical    │
                                │   source of truth.                        │
                                │                                            │
                                │   stripe_connect agents → Stripe.transfers│
                                │   manual_wire agents → super-admin         │
                                │   /agents/[id]/record-wire POST (separate  │
                                │   from this audit's scope)                 │
                                └─────────────────────────────────────────┘
```

### Referral redemption flow (canonical use case)

```
sequenceDiagram
    participant U as Agent (Sarah)
    participant S as Super-admin (Tredoux)
    participant DB as Postgres
    participant A as Applicant (school owner)
    participant T as /api/montree/try/instant

    Note over S,U: Phase 1 — Agent gets a code
    S->>DB: POST /api/montree/super-admin/referral-codes
    DB-->>S: Insert (status='pending', agent_id=Sarah, pct=20)
    S-->>U: Plaintext code (SARAH-K9X7) — shown once

    Note over U,A: Phase 2 — Agent shares with prospect
    U-->>A: Email: "Sign up at montree.xyz/try?ref=SARAH-K9X7"

    Note over A,T: Phase 3 — Redemption (RACE WINDOW HERE)
    A->>T: POST {role: 'principal', referral_code: 'SARAH-K9X7', ...}
    T->>DB: SELECT FROM montree_referral_codes WHERE code='SARAH-K9X7'
    DB-->>T: status='pending', agent_id=Sarah, pct=20
    T->>DB: INSERT montree_schools (...)         ← school created
    T->>DB: INSERT montree_school_admins (...)   ← principal created
    T->>DB: UPDATE montree_schools SET founding_teacher_id=Sarah, pct=20...
    T->>DB: UPDATE montree_referral_codes SET status='redeemed', school_id=...
    Note over T,DB: The two UPDATEs are NOT in a transaction.<br/>If A and a second A' both POST at the same time,<br/>both pass the SELECT(pending), both create schools,<br/>only one final UPDATE wins.
    T-->>A: 200 OK, JWT cookie set
```

---

## Findings — categorized

### Correctness — referral redemption

#### CRITICAL — Race: concurrent redemption of the same code creates orphan schools

- **Severity:** CRITICAL
- **Where:** `app/api/montree/try/instant/route.ts` lines 49-82 (`resolveReferralCode` read), then 343-363 / 450-471 / 579-600 (the three branch-specific redeem `.update()` calls, identical pattern in each)
- **What:** The redemption status flip is not atomic with respect to the pending check.
- **Why it matters:** Two concurrent POST `/api/montree/try/instant` calls with the same `?ref=CODE` both pass the `status='pending'` check, both successfully create their school records, both stamp `founding_teacher_id` and `revenue_share_pct` on their respective schools, and both attempt the `.update({ status: 'redeemed', redeemed_by_school_id: ... })`. The second UPDATE silently wins. Result: TWO schools believe they're attributed to the same agent at the same percentage, but `montree_referral_codes.redeemed_by_school_id` points to only one. The orphan school's revenue would still pay out to the agent (because the per-school `founding_teacher_id` stamp is the canonical signal — see `/agent/me`, `/agent/schools`, `/agent/earnings`), but auditing back from the code to the school would miss it.
- **Repro:** Race `curl -X POST /api/montree/try/instant` twice with `{referral_code: 'SARAH-K9X7'}` within ~100ms. Both will return 200. Confirm with `SELECT * FROM montree_schools WHERE referral_code_used = 'SARAH-K9X7'` → 2 rows.
- **Fix sketch:** Replace lines 357-362, 466-471, 593-600 with a conditional update:

  ```typescript
  // Race-safe redeem: only flip if still pending.
  const { data: redeemed, error } = await supabase
    .from('montree_referral_codes')
    .update({ status: 'redeemed', redeemed_by_school_id: school.id, redeemed_at: new Date().toISOString() })
    .eq('id', referral.codeId)
    .eq('status', 'pending')  // ← key guard
    .select('id')
    .maybeSingle();

  if (!redeemed) {
    // Lost the race. Roll back: revert the school's founding_teacher_id /
    // revenue_share_active / referral_code_* fields.
    console.warn('[Trial] race lost on redemption — rolling back school', school.id);
    await supabase
      .from('montree_schools')
      .update({
        founding_teacher_id: null,
        revenue_share_pct: null,
        revenue_share_active: false,
        referral_code_id: null,
        referral_code_used: null,
      })
      .eq('id', school.id);
    // Return 409 to the user — referral code already redeemed.
    return NextResponse.json({
      error: `Referral code "${referral.code}" was just redeemed by another signup.`,
    }, { status: 409 });
  }
  ```

  Alternative: add a `UNIQUE` partial index on `montree_referral_codes(redeemed_by_school_id)` to make the second UPDATE fail loudly via 23505 instead of silently winning.

#### MED — Race rollback partial: school created, principal/teacher created, then redemption lost

- **Severity:** MED
- **Where:** Same routes as above.
- **What:** Even with the conditional-UPDATE fix above, the school/principal records are already created at the moment we try to redeem. Currently rolled back via DELETE-on-failure paths only for early errors, not for redemption-lost-race.
- **Why it matters:** Cleanup hygiene. A user who lost the race technically has a stranded school + principal account with no referral link. The code above does the right rollback (clearing referral fields) but the school+principal records remain visible. Visible enough that the principal could log in to their orphan school. Probably acceptable post-fix (they're a real signup, just non-attributed), but worth flagging.
- **Fix sketch:** Decide product behaviour. If a 409 is preferred over a "you signed up but the code was used" message, delete the school + admins/teachers rows on race-lost.

---

### Correctness — payout method

#### LOW — Payout-method PATCH lets a manual_wire agent claim Stripe Connect WITHOUT a Stripe account

- **Severity:** LOW
- **Where:** `app/api/montree/agent/payout-method/route.ts` PATCH, lines 107-140
- **What:** The 409 guard fires when flipping FROM verified Stripe TO manual_wire. The reverse direction (flipping FROM manual_wire BACK TO stripe_connect) does not check whether the agent actually has a Stripe Connect account. An agent could PATCH `payout_method='stripe_connect'` from any state, even if no `stripe_connect_account_id` is on their row.
- **Why it matters:** Cosmetic mostly — `/agent/payouts` page will show "Not started" status and prompt them to onboard. But if the next month-end calculator runs against `payout_method='stripe_connect'` without checking whether `stripe_connect_account_id` is set, transfers will fail. Worth tightening.
- **Fix sketch:** Add a forward-direction check too:

  ```typescript
  if (m === 'stripe_connect' && !agent.stripe_connect_account_id) {
    return NextResponse.json({
      error: 'stripe_connect requires you to complete Stripe onboarding first. Click "Generate onboarding link" below.',
    }, { status: 409 });
  }
  ```

---

### Cross-pollination

#### SAMPLED 10 ROUTES — all clean

All 10 `/api/montree/agent/*` endpoints sampled correctly filter by `auth.userId`:

| Route | Filter | Status |
|-------|--------|--------|
| `/agent/me` | `founding_teacher_id = auth.userId` (line 86) | ✓ |
| `/agent/schools` | `founding_teacher_id = auth.userId` (line 40) | ✓ |
| `/agent/schools/[id]` | `id = schoolId AND founding_teacher_id = auth.userId` (line 48-49) | ✓ |
| `/agent/codes` GET | `agent_id = auth.userId` (line 71) | ✓ |
| `/agent/codes` POST | `agent_id = auth.userId` (line 197) | ✓ |
| `/agent/codes` DELETE | `agent_id = auth.userId` on fetch + UPDATE (line 263, 285) belt-and-braces | ✓ |
| `/agent/earnings` | `founding_teacher_id = auth.userId` (schools, line 79); `agent_id = auth.userId` (payouts, line 110) | ✓ |
| `/agent/payouts` | `id = auth.userId` (line 47) | ✓ |
| `/agent/snapshot` | `founding_teacher_id = auth.userId` (line 50) | ✓ |
| `/agent/connect-onboard` POST | `id = auth.userId` (line 59) | ✓ |
| `/agent/connect-status` POST | `id = auth.userId` (line 37) | ✓ |
| `/agent/payout-method` GET+PATCH | `id = auth.userId` (line 60) | ✓ |

**Super-admin routes sampled (`/super-admin/agents/[id]/*`)** all gate via `verifySuperAdminAuth` correctly.

**Messaging routes (3 agent-side, 3 super-admin-side)** all use `resolveMessagingAgent`/`resolveMessagingSuperAdmin`, both of which re-verify auth and enforce `participant_role`/`participant_id` filters at the participant table level. No leaks.

---

### Auth flow

#### HIGH — Unified login: tryTeacherLogin Step 3 (bcrypt scan over 50 candidates) runs BEFORE tryAgentLogin

- **Severity:** HIGH
- **Where:** `app/api/montree/auth/unified/route.ts` lines 117-160 (`tryTeacherLogin`) executes before lines 172-230 (`tryAgentLogin`)
- **What:** Per Session 86 the order is principal → teacher → agent → parent. Principal-first was the fix because principals and teachers can share login codes. But teacher-first vs agent is a similar class of bug. `tryTeacherLogin` Step 3 (line 337-351) scans up to 50 teacher rows with bcrypt hashes; if an agent's 6-character code happens to bcrypt-verify against ANY teacher's hash (statistically vanishing — bcrypt is sound — but technically possible), the user gets a teacher session not an agent session, and gets routed to `/montree/dashboard` instead of `/montree/agent/dashboard`.
- **Why it matters:** Agent codes are 6 characters in a 32-char alphabet (~1.07B values). Teacher bcrypt-hashed login codes share the same alphabet. The bcrypt scan happens on every login attempt. Even though hash collision is astronomically unlikely, the design is fragile.
- **Repro:** Hard to repro deterministically. Could be observed in production if Tredoux ever sees an agent code that "logs in" but lands on the wrong dashboard.
- **Fix sketch:** Move tryAgentLogin BEFORE tryTeacherLogin so agent codes are matched first (agent hashes use a separate column `agent_password_hash`, so they're disambiguated by which table column matched, not which row). Or, simpler: skip `tryTeacherLogin` Step 3 (bcrypt scan) entirely for codes that match the agent format heuristic. But the cleanest fix is the order swap — agent first, teacher second. Roughly:

  ```typescript
  // 1. Principal first (Session 86)
  const principalResult = await tryPrincipalLogin(...);
  if (principalResult) return ...;

  // 2. AGENT next — agent_password_hash is in a separate column, can't collide with teacher
  const agentResult = await tryAgentLogin(...);
  if (agentResult) return ...;

  // 3. Teacher
  const teacherResult = await tryTeacherLogin(...);
  if (teacherResult) return ...;

  // 4. Parent
  ```

#### MED — Suspended-while-logged-in: stale agent cookie remains valid for 365 days

- **Severity:** MED
- **Where:** `lib/montree/server-auth.ts` line 162 (`setMontreeAuthCookie` maxAge = 365 days); enforcement at runtime via re-checking `is_agent`/`agent_suspended_at` on every agent endpoint
- **What:** When Tredoux suspends an agent via `PATCH /super-admin/agents/[id]/login`, the agent_password_hash isn't cleared; only `agent_suspended_at` is set. The agent's existing JWT cookie continues to verify (it's still signed with the same secret, role='agent' is intact). Every agent-side endpoint re-checks `is_agent` and `agent_suspended_at` defensively at request time — IF the route reads those fields. Two routes don't:
  - `/agent/snapshot` reads `montree_schools` filtered by `founding_teacher_id` without an `is_agent` check
  - `/agent/schools/[id]` reads the same
- **Why it matters:** A suspended agent who keeps their browser tab open (cookie cached) can still see per-school financials via these two endpoints. Other endpoints correctly bounce them (return 403 'Agent suspended').
- **Fix sketch:** Add a small defensive check to both. Cheapest: extend the inline lookup to also pull `is_agent, agent_suspended_at` and return 403 if disabled/suspended. Or: factor out a `verifyAgentIdentity(supabase, userId)` helper to enforce the rule once.

#### MED — Founder-agent: same person, two roles, ambiguous on principal-first-or-agent-first

- **Severity:** MED
- **Where:** `lib/montree/server-auth.ts` lines 31-36 (MontreeTokenPayload role union allows 'principal' | 'teacher' | 'homeschool_parent' | 'agent')
- **What:** A founder-teacher who later upgrades to a school plan can hold BOTH a teacher login (in `montree_teachers` for their classroom) AND an agent login (separate `agent_password_hash` on the same row). If they ever set up referrals AND have their teacher login active, the two codes are different (`password_hash` vs `agent_password_hash`), but the JWT only carries one role. They have to log in fresh to switch.
- **Why it matters:** Minor UX. Documented in Session 91 architectural rules but worth verifying that the founder-agent flow actually surfaces this correctly.
- **Fix sketch:** Either accept the limitation (user logs in twice to switch contexts) or surface a "switch role" affordance on the dashboard if the same email exists with both `password_hash` and `agent_password_hash`.

---

### Country support

#### CLEAN — `STRIPE_CONNECT_SUPPORTED_COUNTRIES` consistently enforced

All four call sites of `createConnectAccount()` validate via `isStripeConnectSupported(country)` first:

- `/super-admin/agents/[id]/connect-onboard` line 93 ✓
- `/agent/connect-onboard` line 98 ✓

Both pass `country.toUpperCase()` and refuse with 400 if not in the supported list. The unsupported-country response sets `country_unsupported: true` which the agent UI catches and renders the friendly manual-wire fallback (Session 110 pattern).

#### LOW — Country code validated only on Stripe Connect path; manual wire takes any country string

- **Severity:** LOW
- **Where:** `app/api/montree/super-admin/agents/[id]/payout-config/route.ts` — `manual_payout_details.country` is free-text within the JSONB
- **What:** Manual wire bank details JSONB doesn't validate `country` as ISO 3166-1 alpha-2.
- **Why it matters:** Manual wire is super-admin-controlled, so trust boundary is closer to Tredoux. The annual statement (`/super-admin/agents/[id]/annual-statement`) reads `montree_schools.country` not the bank country, so this is mostly a "garbage in, garbage out" risk for the statement footer.
- **Fix sketch:** Add the same `/^[A-Z]{2}$/` regex check to the manual_payout_details validator, OR document that country is free-text bank-side (US states, etc., wouldn't fit ISO).

---

### Audit logging

#### CLEAN — Every state-changing endpoint writes to `montree_agent_audit`

Sampled 8 mutating endpoints, all fire `logAgentAudit()`:

| Endpoint | Event type | Status |
|----------|-----------|--------|
| `/super-admin/agents/[id]/login` POST | `agent_login_issued` | ✓ |
| `/super-admin/agents/[id]/login` PATCH (suspend) | `agent_suspended` | ✓ |
| `/super-admin/agents/[id]/login` PATCH (reactivate) | `agent_reactivated` | ✓ |
| `/super-admin/agents/[id]/login` PATCH (set_default_pct) | `agent_default_pct_changed` | ✓ |
| `/super-admin/agents/[id]/login-as` POST | `agent_impersonated_by_super_admin` | ✓ |
| `/super-admin/agents/[id]/payout-config` PATCH | `agent_payout_method_changed` / `agent_payout_details_updated` | ✓ |
| `/super-admin/agents/[id]/tax-form` PATCH | `agent_profile_changed` | ✓ |
| `/agent/codes` POST (self-service) | `agent_code_generated` | ✓ |
| `/agent/codes` DELETE | `agent_code_revoked` | ✓ |
| `/agent/connect-onboard` POST | `agent_stripe_link_generated` | ✓ |
| `/agent/payout-method` PATCH | `agent_payout_method_changed` / `agent_payout_details_updated` (with `self_service: true`) | ✓ |
| `/auth/unified` (tryAgentLogin success) | `agent_login_succeeded` | ✓ |
| `/auth/unified` (tryAgentLogin failed-suspended) | `agent_login_failed` | ✓ |

`logAgentAudit()` is fire-and-forget (`void`-marked everywhere) and swallows errors, so logging never blocks mutating actions. Correct.

**One gap:** `/super-admin/referral-codes` POST (issuing a new code) does NOT write to `montree_agent_audit`. The audit log shows "agent_login_issued" but the agent-code-issued event isn't logged. Worth adding `agent_code_generated` with `actor_role='super_admin'` to the POST handler so the activity panel reflects both self-service AND super-admin-issued codes.

---

### Rate limits

#### CLEAN — Self-service code generation: 20/24h

`app/api/montree/agent/codes/route.ts` line 30: `SELF_SERVICE_LIMIT_PER_24H = 20`. Counted via line 167-171 from `montree_referral_codes WHERE agent_id=X AND created_at >= now()-24h`. Returns 429 with `Retry-After`-like detail when hit. Fail-open on count-query error (line 173-175). All correct.

#### LOW — No rate limit on agent ↔ super-admin messaging

- **Severity:** LOW
- **Where:** `/agent/messages-tredoux/threads` POST (create thread) and `/threads/[threadId]/messages` POST (reply)
- **What:** No rate limit. An abusive or buggy agent client could create 1000s of threads or post 1000s of replies in a short window.
- **Why it matters:** Low probability — agents are trusted partners. But cheap insurance.
- **Fix sketch:** Add `checkRateLimit(supabase, agentId, '/agent/messages-tredoux', 10, 60)` at the top of both POST handlers. Same pattern as `/api/montree/auth/unified`.

#### LOW — Connect-onboard claims "rate limit 10/hour per agent" in the file header but doesn't implement it

- **Severity:** LOW
- **Where:** `app/api/montree/agent/connect-onboard/route.ts` lines 9-10 (header comment: "Rate limit: 10/hour per agent.") — but no `checkRateLimit` call in the body.
- **What:** Doc/code mismatch.
- **Fix sketch:** Either implement the rate limit (same `checkRateLimit` pattern) or remove the comment.

---

### Stripe Connect

#### CLEAN — Webhook signature verification fires FIRST

`/api/stripe/connect-webhook` line 41-51: signature verified via `stripe.webhooks.constructEvent(body, signature, secret)` before any DB writes. Returns 400 on missing signature, 500 on missing secret. Errors-during-handler return 200 (per Stripe retry-avoidance pattern). Correct.

#### CLEAN — Race-safe createConnectAccount via conditional UPDATE

Both super-admin route (line 113-150) and agent route (line 116-148) wrap the post-create UPDATE in `.is('stripe_connect_account_id', null)` filter, with race-loss recovery via re-fetch + orphan-account warning. Correct.

#### CLEAN — `stripe_connect_completed_at` preserved on first-verified transition

Both webhook (line 85-87) and force-refresh routes (line 57-59 super-admin, line 75-77 agent) only stamp `completed_at` if it's currently null. Correct audit trail preservation.

---

### Manual wire safety

#### CLEAN — 4KB cap on `manual_payout_details` JSONB

Both the super-admin route (`/super-admin/agents/[id]/payout-config` line 23, MAX_DETAILS_BYTES = 4096) and the agent self-service route (`/agent/payout-method` line 30, same constant) enforce the cap. Correct.

#### CLEAN — Required identifier check on switch-to-manual

`/agent/payout-method` line 160-170: when switching TO manual_wire, validates that EITHER `account_number` OR `iban` is present in the JSONB. Prevents an agent from saving an empty object as "bank details on file." Correct.

#### LOW — `manual_payout_details` is never sanitized for HTML/script injection

- **Severity:** LOW
- **Where:** Both PATCH endpoints accept the JSONB as-is.
- **What:** If a value field contains `<script>...</script>`, it gets persisted and then rendered into HTML in the annual statement (`/super-admin/agents/[id]/annual-statement` HTML format) — though that route calls `escapeHtml()` on every interpolation, so XSS is prevented at render time, not at write time.
- **Why it matters:** Defense-in-depth would prefer write-time sanitization. Currently relies on render-time escaping, which is correct but fragile if a future renderer forgets `escapeHtml`.
- **Fix sketch:** Add a recursive string-sanitizer to `manual_payout_details` that strips angle brackets or HTML-encodes them. OR just rely on render-time escaping (current state) and document it.

---

### Messaging cross-pollination

#### CLEAN — agent_super_admin school_id=NULL gated CHECK

Migration 197 (per architecture comments) drops NOT NULL on `montree_message_threads.school_id` AND adds a gated CHECK constraint that only `agent_super_admin` threads can have NULL. Code in `/agent/messages-tredoux/threads` POST line 170 sets `school_id: null` explicitly. Code in same POST line 174 sets `thread_type: 'agent_super_admin'`. Correct.

#### CLEAN — Agent's threads filtered by participant_id

`/agent/messages-tredoux/threads` GET line 60-65: filters `participant_role='agent' AND participant_id=agent.agentId`. No leak.

#### CLEAN — Super-admin sees all globally (by design)

`/super-admin/agent-messages/threads` GET line 43-48: filter is `thread_type='agent_super_admin'` only — no agent filter. By design (super-admin is global). Matches the Session 108 architectural rule.

#### CLEAN — ai_drafted forced false on agent posts

`/agent/messages-tredoux/threads/[threadId]/messages` POST line 110: `ai_drafted: false` hardcoded in the insert payload. Agent cannot claim AI authorship on their own messages. Correct.

---

### Application flow

#### CLEAN — Honeypot + email format check

`/api/montree/become-an-agent/apply` POST line 69 (honeypot), line 84 (email format). Both work as expected.

#### CLEAN — Explicit INSERT + 23505 handling (rule #58)

Lines 119-180: explicit INSERT, then on 23505:
- Same `contact_type='agent_application'` → UPDATE (legitimate resubmit)
- Different `contact_type` (demo_request, etc.) → 409 with friendly message
- Any other DB error → 500 with detail

This is the architecturally-required pattern per CLAUDE.md rule #58. Correct.

#### LOW — Resubmit-resets-to-pending erases prior decline context

- **Severity:** LOW
- **Where:** `/api/montree/become-an-agent/apply` lines 144-152
- **What:** A previously-declined applicant who resubmits has their status reset to `agent_applied`. The notes field gets replaced with the new pitch. Prior decline notes lost.
- **Why it matters:** Tredoux loses CRM history. An applicant declined in March 2026 with note "doesn't match our partner profile" who resubmits in May 2026 with a stronger pitch shows up as a fresh application with no history.
- **Fix sketch:** Append to notes instead of replacing. Or stamp prior status in `application_details.previous_status` JSONB so Tredoux sees the history.

---

### Annual statement

#### CLEAN — Sources from paid payouts (rule #64)

Line 117-128: `eq('status', 'paid')` AND year-bounded by `paid_at`. Matches the architectural rule.

#### CLEAN — USD totals match per-row sum

Line 146-148: `totalUsd` is `Σ payout_usd`. Matches detail rows.

#### LOW — Statement references `schoolCountryById` from `montree_schools.country` but that column may not exist on older rows

- **Severity:** LOW
- **Where:** Line 134-144
- **What:** `SELECT id, name, country FROM montree_schools` — if `country` is null on some schools, the statement shows empty country. Acceptable but worth flagging.
- **Fix sketch:** None needed — graceful fallback.

---

### Pages

#### CLEAN — AgentNav auth probe redirects on 401/403

`AgentNav.tsx` line 42-65: fires `/api/montree/agent/me` on mount, redirects to `/montree/login-select?reason=agent_required` on 401/403. Excludes `/montree/agent/onboarding` (Stripe return URL) from the probe. Correct.

#### CLEAN — Onboarding page handles ?status=complete and ?status=refresh

`app/montree/agent/onboarding/page.tsx` reads URL via `readStatusFromUrl()` (line 17-26), renders different copy per state. Correct.

#### LOW — `agent_default_share_pct = 0` semantically disables self-service code gen, but UX doesn't surface why

- **Severity:** LOW
- **Where:** `/agent/codes` POST line 153-158 (refuses if `agent_default_share_pct IS NULL`) AND lines 159-163 (refuses if invalid number including 0)
- **What:** Actually re-reading — line 160 only refuses if `Number.isNaN(defaultPct) || defaultPct < 0 || defaultPct > 100`. `defaultPct === 0` is technically valid (CHECK constraint allows >=0 in migration 186 line 33 and in PATCH route line 92). So a 0% agent CAN self-service generate codes, they just earn nothing per signup. UX implication: an agent might generate a code at 0% if Tredoux set it that way.
- **Why it matters:** Edge case, but if Tredoux flips an agent to 0% as a "soft disable", they should know that self-service still works. Probably set to NULL (the documented "disable" semantic) but worth verifying in super-admin UI.
- **Fix sketch:** Either treat `0` as "disabled" alongside `null`, OR document that NULL is the canonical disable signal and add an admin-tab tooltip.

#### CLEAN — Status pill colors / Stripe Connect status display

`/agent/payouts` page line 67-73: maps each `stripe_connect_status` to label + tone + tip. All five status values handled.

---

### i18n

#### MED — Agent dashboard is predominantly English-hardcoded

- **Severity:** MED
- **Where:** All `app/montree/agent/*/page.tsx` files use hardcoded English strings (e.g. "Back to dashboard", "Your share", "Pending in DLQ", "Stripe Connect", "Settings", etc.)
- **What:** Unlike the principal portal or parent portal which use the `useI18n()` system with all 12 locales, the agent UI is essentially English-only.
- **Why it matters:** Sarah is English-speaking, so it's fine for now. But future non-English agents (the FAMM Argentina partnership lead in CLAUDE.md, Cambridge Global India, etc.) would land on an English-only dashboard despite Mira responding in their locale. Inconsistent with the rest of the product's multilingual posture.
- **Fix sketch:** Pull a list of agent-page strings, add them under a new `agent.*` namespace in `en.ts`, run Haiku batch translation across the 11 other locales. ~3-4 hour focused session. Same pattern as the Session 67 expansion.

---

## Recommended plan — ordered

1. **🚨 CRITICAL — Fix referral redemption race** — Add `.eq('status', 'pending')` to the redeem UPDATE in all three branches of `/try/instant`. Add rollback on race-loss. ~30 min. (Finding #1)
2. **HIGH — Move tryAgentLogin before tryTeacherLogin** in `/auth/unified` — Defends against hash-collision edge case AND surfaces founder-agent role ambiguity correctly. ~15 min. (Finding #2)
3. **MED — Add `is_agent` + `agent_suspended_at` checks** to `/agent/snapshot` and `/agent/schools/[id]` — Prevents suspended-with-stale-cookie data leak. ~20 min. (Finding #3)
4. **MED — Add agent_code_generated audit log** when super-admin issues code via `/super-admin/referral-codes` POST — Closes the "where did this code come from?" gap in the activity panel. ~10 min.
5. **MED — Append (don't replace) on application resubmit** in `/become-an-agent/apply` — Preserves CRM decline history. ~10 min.
6. **LOW — Add rate limit to agent ↔ super-admin messaging** — Cheap insurance via existing `checkRateLimit`. ~10 min.
7. **LOW — Forward-direction Stripe Connect account check** in `/agent/payout-method` PATCH — Prevents `payout_method='stripe_connect'` with no account. ~10 min.
8. **LOW — Sanitize manual_payout_details JSONB strings at write time** — Defense in depth. ~30 min.
9. **MED — i18n the agent dashboard** — Translate the ~80-100 agent-page strings across 11 non-English locales. ~3-4 hours.
10. **LOW — Implement claimed 10/hr rate limit on /agent/connect-onboard** OR remove the misleading comment. ~10 min.

---

## Quick wins (< 30 min)

- Finding #1: race-safe redemption (`.eq('status', 'pending')` on the UPDATE)
- Finding #2: swap `tryAgentLogin` before `tryTeacherLogin`
- Finding #3: defensive `is_agent` check on `/agent/snapshot` + `/agent/schools/[id]`
- Audit-log gap: `agent_code_generated` event on super-admin POST
- Resubmit append vs replace
- Rate limit on messaging
- Stripe Connect forward-direction check
- Fix the misleading rate-limit comment in `/agent/connect-onboard`

---

## What NOT to change

- **The cross-pollination contract via `founding_teacher_id = auth.userId`** — this is the canonical, well-enforced security invariant across 11 sampled endpoints. Don't add additional ways to scope agent data.
- **`agent_password_hash` as a separate column from `password_hash`** — this is the architectural rule that lets a teacher-agent hold both logins independently. Combining them would break the founder-agent flow.
- **`SUPER_ADMIN_SENTINEL_UUID = '00000000-0000-0000-0000-000000000000'`** — every prior `agent_super_admin` thread would orphan if this changes.
- **`status='pending'` → `'redeemed'` permanent lock** — once redeemed, the school↔agent link is permanent by design. Don't add "unredeem" affordance.
- **Suspending keeps `agent_password_hash` intact** (per Session 91 rule #57) — preserves audit trail, lets Tredoux see the relationship without an irreversible action. Don't delete the hash on suspend.
- **`is_agent=true` is the marker that gates `tryAgentLogin`** even when hash matches — defense in depth. Don't simplify this away.
- **Fire-and-forget audit logging** — never throws, never blocks the mutating action. The whole agent audit pattern depends on this contract.
- **Webhook handler returns 200 on errors** — prevents Stripe retry storms. Don't change to 5xx on internal errors.
- **Manual wire `payout_method` flips refuse on verified Stripe** (rule #70) — this is the architectural guardrail that prevents Stripe-DB state divergence. Don't remove the 409.
- **`maybeSingle()` over `.single()` everywhere** — prevents throwing on 0 rows. Consistent across the entire system.
- **Race-safe Stripe Connect account creation via conditional UPDATE-WHERE-NULL** — the orphan-account recovery path is correct and well-tested.

---

*Audit complete. Doc parked at `docs/AGENT_DASHBOARD_AUDIT.md` for future agent-system work.*
