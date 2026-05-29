# Agent System Fix Plan

**Methodology:** 3×3×3 — three rounds of research, three rounds of plan, three rounds of audit. Each pass captured at the end of the doc for transparency.

**Goal:** Sequence every fix needed to bring the agent system from "Gloria-can-be-onboarded-manually" to "production-grade, multi-agent, recruit-the-world."

---

## Executive summary

The agent system is **75% working, 25% incomplete**. The working bits — code issuance, agent login, dashboard, referral codes, school redemption, Stripe Connect onboarding, payout calculator, wire-out, finance ledger — are solid. The incomplete bits cluster into four areas: a recruitment funnel that has wrong copy and wrong CTAs, an architectural gap in agent↔super-admin comms, a suspected impersonation-flow bug that mimics a real 404, and a handful of polish items.

Total scope to take this to production-grade: **~3–4 dedicated build days**, spread across 5 phases. Sequencing matters — Phase 1 (validation) blocks the rest and unblocks Gloria's real onboarding the same day.

---

## Master issue inventory

Grouped by domain. ✅ = working, 🚧 = partial/broken, ❌ = missing, 🎨 = polish.

### A. Recruitment funnel (public-facing)

| ID | Status | Issue |
|---|---|---|
| A1 | 🚧 | `/montree/for-teachers` renders agent recruitment content ("TEACHER REVENUE SHARE", earnings table, 20% pitch) but all three CTAs route to `/montree/try` (school signup flow) |
| A2 | 🚧 | `/montree/become-an-agent` is a redirect stub to `/for-teachers`. Session 98 explicitly marked rebuild as "Task #20" — never landed |
| A3 | ❌ | No application capture form for prospective agents. Everyone applies via email today |
| A4 | ❌ | No super-admin alert banner for incoming agent applications (parallel to existing `DemoRequestAlert` for demo requests) |
| A5 | 🎨 | Landing page nav label "Become an agent" points at `/become-an-agent` correctly — no change needed once destination is rebuilt |

### B. Agent code & login (auth)

| ID | Status | Issue |
|---|---|---|
| B1 | ✅ | Code issuance from super-admin Referrals → 🔑 button (Session 91) |
| B2 | ✅ | Direct login at `/montree/login-select` → `/montree/agent/dashboard`. JWT issued with `role: 'agent'` (Session 92) |
| B3 | 🚧 | **Suspected broken:** "Log in as agent" 🔓 button (Session 97). The JWT looks identical in shape to a direct login (same `createMontreeToken({sub, schoolId, role: 'agent'})`) — but the user reported a 404 on "Refresh from Stripe" while impersonating Gloria. Either the cookie isn't being set/read correctly during impersonation, OR Gloria's row has an issue independent of impersonation. **Phase 1 isolates this.** |
| B4 | 🎨 | `/montree/login-select` pricing link text — Session 71 carry-over: "View pricing & tiers →" should be "30 days free · See pricing →" |

### C. Agent ↔ super-admin comms (operational)

| ID | Status | Issue |
|---|---|---|
| C1 | ❌ | Agent → Tredoux direct channel missing. Today Gloria emails / WhatsApps externally; nothing surfaces in-app |
| C2 | ❌ | Astra-assisted triage for incoming agent messages — depends on C1 |
| C3 | 🎨 | Decision: leave existing "Help" Tredoux-DM panel (legacy flat `montree_messages`, used by teachers per Session 103) as-is, or migrate teachers to threaded too |

### D. Stripe Connect & payouts (money)

| ID | Status | Issue |
|---|---|---|
| D1 | ✅ | Onboarding link generation (Session 90), Connect webhook handler (Session 107), status sync |
| D2 | 🚧 | "Refresh from Stripe" 404 (Task #1) — diagnostic complete, but root cause TBD until Phase 1 E2E test executes |
| D3 | 🚧 | Half-completed test Stripe Connect account on Gloria's row (`requirements.past_due`). Must clean before her real onboarding |
| D4 | ❌ | Pre-Gloria full E2E validation — the test plan exists, hasn't been walked |

### E. Referral redemption flow (recruit → school)

| ID | Status | Issue |
|---|---|---|
| E1 | ✅ | `/montree/try?ref=CODE` flow — code validated, school created, agent linked, revenue share locked, code becomes principal login (Session 86, 90) |
| E2 | 🎨 | Role picker (Teacher / Principal) when `?ref=` is present. Most code redemptions are principal/owner — picker adds noise. Optional polish |
| E3 | ✅ | Code lifecycle: pending → redeemed → permanent link (Session 90) |

### F. Agent dashboard UX

| ID | Status | Issue |
|---|---|---|
| F1 | ✅ | 6 nav pages (Dashboard / Schools / Codes / Earnings / Payouts / Settings) + Mira + Messages (Session 92, 97) |
| F2 | 🎨 | `mira-avatar.png` 404s in console — CSS "M" fallback works, drop the PNG to silence |
| F3 | ✅ | Self-service code gen with 20/24h rate limit + share % locked to agent's default (Session 92) |

### G. Money tab + super-admin payouts

| ID | Status | Issue |
|---|---|---|
| G1 | ✅ | Payout calculator, idempotent UPSERT (Session 104) |
| G2 | ✅ | Wire-out via Stripe Connect with idempotency key (Session 104) |
| G3 | ✅ | Commission ledger + finance_transactions audit trail (Session 104) |
| G4 | ✅ | Monthly digest email when cron triggers (Session 104) |

### H. Cleanup tooling (this session)

| ID | Status | Issue |
|---|---|---|
| H1 | ✅ | `scripts/cleanup-test-agent.sql` — dry-run + commit modes, full dependency order |
| H2 | ✅ | `docs/handoffs/AGENT_E2E_TEST_PLAN.md` — 13-step walkthrough |

**Tally:** 13 ✅ working, 6 🚧 partial/broken, 7 ❌ missing, 5 🎨 polish.

---

## Phase 1 — E2E validation (BLOCKS all else)

**Goal:** Walk the test plan as Tredoux's own agent, isolate the impersonation 404 cause, prove the full chain end-to-end, clean up.

**Effort:** ~2 hours of active testing + 1–2 days waiting for Stripe wire settlement (Step 9 only — most of the test can be done in one sitting and the wire validation can land later).

**Risk:** Low. No code changes. Reversible via cleanup script.

**Steps:** Per `docs/handoffs/AGENT_E2E_TEST_PLAN.md`. Key acceptance criteria:

- All 6 + 2 agent nav pages return 200 from direct login
- Self-service referral code generates + can be redeemed for a test school
- Stripe Connect onboarding flow completes; webhook fires within 60s
- "Refresh from Stripe" returns 200 via direct login (this is the diagnostic — if it 200s, the bug is the impersonation flow)
- Payout calculator runs idempotently
- $1 wire (optional) lands in bank
- Cleanup script preview shows expected counts, then commits clean

**Acceptance:** Test passes end-to-end OR specific failure surfaces that scope Phase 2.

**Output:** Either confidence to onboard Gloria same hour, OR a narrowed bug report for Phase 2.

**Unblocks:** Gloria onboarding (the actual goal), Phase 2 (conditional).

---

## Phase 2 — Impersonation 404 hot-fix (CONDITIONAL on Phase 1)

**Goal:** If Phase 1 confirms the 404 only happens via impersonation (not direct login), fix the impersonation flow.

**Effort:** 30 min – 2 hours, depending on what Phase 1 reveals.

**Risk:** Low once root cause identified. Narrow fix.

**Most likely candidates:**

1. **Cookie handover:** the super-admin → agent impersonation might not be cleanly clearing the prior super-admin token cookie. Browser keeps both, server reads the wrong one. Fix: ensure `setMontreeAuthCookie` writes with appropriate `expires` + `path` so it overrides.
2. **JWT `sub` mismatch:** unlikely but possible — the impersonation route mints `sub: agent.id` but maybe there's a code path that reads `tredoux_sub` from a residual super-admin cookie instead.
3. **Stripe account `is_agent` flag:** unlikely — the route guards on this (`is_agent=true` required) but Gloria's row has `is_agent=true`.
4. **Stripe-side state:** Gloria's `stripe_connect_account_id` points at an account that's been deleted/restricted on Stripe's side, causing `fetchAccountStatus()` to throw → 502 (not 404). If this is the case, the user's "404" report was actually a 502 misread.

**Acceptance:** Refresh from Stripe works in both direct login AND impersonation flows.

**Carries over to:** Documentation update — add the root cause to CLAUDE.md so future agents don't re-debug.

---

## Phase 3 — Public agent recruitment funnel

**Goal:** Rebuild `/montree/become-an-agent` as a proper recruitment landing with an application form. Retire `/for-teachers`. Add super-admin application alert.

**Effort:** 0.5 – 1 day (depending on form complexity decisions).

**Risk:** Low–medium. Public-facing copy + i18n batch.

**Scope:**

### 3.1 Database

- **Option A (recommended):** extend `montree_outreach_contacts` with a new `contact_type='agent_application'`. Adds 4–6 columns: `application_message TEXT`, `application_current_role TEXT`, `application_country TEXT`, `application_status TEXT CHECK IN (pending, accepted, declined, contacted)`. Migration script ~30 lines.
- **Option B:** new table `montree_agent_applications`. Cleaner but more code. Defer to Phase 4+.

### 3.2 Page rebuild

`app/montree/become-an-agent/page.tsx` — full rewrite, dark forest theme matching landing aesthetic.

Structure:
- Hero: "Bring Montree to your school. Earn from it."
- Pitch: agent role explained — referral partner, 20% recurring revenue share, no quota, work-on-your-own-terms
- Earnings calculator (carried over from `/for-teachers` — strongest content asset)
- "How it works" 4-step flow: apply → review → receive code → start pitching
- **Application form** (the new piece): name, email, country, current role (free text), why-good-fit (free text), submit
- Footer: pricing context + "Read the agent handbook" link to `docs/agents/GLORIA_STRIPE_ONBOARDING.md`-equivalent (TBD)

### 3.3 API + alert

- `POST /api/montree/become-an-agent/apply` — validates form, writes row to `montree_outreach_contacts`, sends auto-ack email (if Resend domain verified), returns confirmation
- Super-admin `AgentApplicationAlert.tsx` — mirrors `DemoRequestAlert` pattern. Header banner shows pending applications, click to expand list, per-row "Accept (issue code)" / "Decline" / "Mark contacted" actions
- "Accept" pre-fills the existing 🔑 Issue Agent Login modal with the applicant's name + email — one click and the code is generated

### 3.4 Retire `/for-teachers`

- Convert the file to a 301 redirect → `/become-an-agent`
- Keep the file (don't delete; reverse the existing relationship)

### 3.5 i18n

~30 new keys × 12 locales = ~360 translations. Haiku batch via existing `scripts/fill-missing-i18n-keys.mjs`.

### 3.6 Anti-spam

- Honeypot field on form (hidden, must stay empty)
- Rate limit: 3 applications per IP per hour
- Optional: Cloudflare Turnstile (decision: probably overkill for v1)

**Acceptance:**
1. Public user visits `/become-an-agent`, sees recruitment landing
2. Submits application → confirmation screen
3. Super-admin sees alert banner appear within 1 page refresh
4. Super-admin clicks "Accept" → 🔑 modal opens pre-filled → code issued → applicant gets email with code

**Unblocks:** Scaling agent recruitment beyond Gloria.

---

## Phase 4 — Architectural agent ↔ super-admin messaging

**Goal:** Threaded messaging between agents and Tredoux, built on the existing `montree_message_threads` infrastructure. No parallel legacy DM rail. Mira + Astra can natively scan and draft.

**Effort:** 1 – 1.5 days.

**Risk:** Medium. FK chain extensions, cross-pollination security verification, role-based tool gating for Astra.

**Scope:**

### 4.1 Migration

```sql
-- Extend thread_type CHECK to include 'agent_super_admin'
ALTER TABLE montree_message_threads
  DROP CONSTRAINT IF EXISTS montree_message_threads_thread_type_check;
ALTER TABLE montree_message_threads
  ADD CONSTRAINT montree_message_threads_thread_type_check
    CHECK (thread_type IN (
      'parent_teacher', 'parent_principal', 'internal',
      'broadcast', 'group', 'agent_principal', 'agent_super_admin'
    ));

-- Extend participant_role CHECK to include 'super_admin'
ALTER TABLE montree_message_thread_participants
  DROP CONSTRAINT IF EXISTS montree_message_thread_participants_participant_role_check;
ALTER TABLE montree_message_thread_participants
  ADD CONSTRAINT montree_message_thread_participants_participant_role_check
    CHECK (participant_role IN ('teacher', 'principal', 'parent', 'agent', 'super_admin'));
```

Migration 197 already widened these once (Session 104, adding `agent` + `agent_principal`). This adds the super-admin variants.

### 4.2 Helper module

`lib/montree/agent-messaging-super-admin/` — three files mirroring Session 104's `lib/montree/agent-messaging/`:
- `access.ts` — `resolveAgentSide(req)` for agent endpoints, `resolveSuperAdminSide(req)` for super-admin endpoints
- `types.ts` — re-export thread types
- `index.ts` — barrel

Cross-pollination contract:
- Agent side: filter every query by `participant_id = auth.userId AND participant_role = 'agent'`
- Super-admin side: super-admin can see ALL `agent_super_admin` threads across all agents (mirrors how principal sees all `parent_teacher` threads at their school per Session 97 rule)

### 4.3 APIs (agent side)

Four routes under `/api/montree/agent/messages-tredoux/`:
- `GET /threads` — list threads where this agent participates
- `POST /threads` — start a new thread
- `GET /threads/[id]` — thread detail
- `GET/POST /threads/[id]/messages` — read + send

`ai_drafted` forced false on agent posts (per Session 84 rule).

### 4.4 APIs (super-admin side)

Three routes under `/api/montree/super-admin/agent-messages/`:
- `GET /threads` — list ALL agent_super_admin threads across all agents (paginated, filterable by agent, by unread, by recency)
- `GET /threads/[id]` — thread detail with agent identity
- `GET/POST /threads/[id]/messages` — read + send (super-admin posts have `ai_drafted` forced false; Astra-drafted variants set `ai_drafted=true, approved_by_id=tredoux_userid`)

### 4.5 Agent UI

- `components/montree/agent/AgentNav.tsx` — add "Tredoux" nav entry between Settings and Mira
- `app/montree/agent/messages-tredoux/page.tsx` — thread list (mirror existing `/agent/messages/page.tsx` aesthetic)
- `app/montree/agent/messages-tredoux/[threadId]/page.tsx` — thread detail with sticky composer

### 4.6 Super-admin UI

- New tab "Agent Inbox" between Referrals and Money in `app/montree/super-admin/page.tsx`
- `components/montree/super-admin/AgentInboxTab.tsx` — thread list, unread badge, per-agent filtering
- `app/montree/super-admin/agent-thread/[threadId]/page.tsx` — thread detail

### 4.7 Mira proactive

Extend `lib/montree/mira/tool-definitions.ts` + `lib/montree/mira/tool-executor.ts`:
- `start_thread_with_tredoux({ subject, body })` — creates thread + first message
- `reply_in_thread({ thread_id, body })` — posts reply in an existing thread

System prompt update: when agent says "let me know what Tredoux thinks" / "ask Tredoux" / similar, route to `start_thread_with_tredoux`.

### 4.8 Astra proactive (super-admin scope)

This is the new bit. Today Astra is principal-scoped. Adding super-admin scope requires role-based tool gating.

`lib/montree/tracy/role-gating.ts` (new file):
- `getTracyToolsForRole(role: 'principal' | 'super_admin')` — returns tool subset
- Principal tools (existing): `child_focus`, `unpack_teacher`, `note_quality`, `remember_this`, `recall_memory`, `draft_teacher_welcome_messages`, `draft_parent_response`, `scan_parent_thread`, `list_recent_threads`
- Super-admin tools (NEW): `scan_agent_messages`, `draft_agent_reply`, `list_recent_agent_threads`, `remember_this_about_agent`, `recall_agent_memories`

`scan_agent_messages` implementation:
- Per Session 84 rule: random nonce fence on user input passed to Opus
- Reads recent `agent_super_admin` threads (default last 20)
- Returns chief-of-staff briefing with `→ ` action line

`draft_agent_reply` implementation:
- Uses Tredoux's last 10 super-admin-side messages as voice samples
- Drafts a reply in his voice
- Sets `ai_drafted=true, approved_by_id=tredoux_userid` on post

### 4.9 Astra avatar/route — super-admin scope

Tredoux today has Astra as principal-of-Whale-Class. We need her to behave differently when accessed from super-admin context.

Decision: Astra at `/montree/admin` stays principal-scoped (Whale Class context). A new Astra surface at `/montree/super-admin/tracy` is super-admin-scoped. Same `lib/montree/tracy/` module, different role passed in.

OR: extend the existing Astra at `/montree/admin` to check role and show different tools. Less clean — risk of accidentally mixing contexts.

**Recommendation:** separate route. Cleaner mental model.

### 4.10 i18n

~40 new keys (agent nav, super-admin tab, thread UI, Astra strings) × 12 locales = ~480 translations.

**Acceptance:**
1. Gloria, logged into her dashboard, clicks "Tredoux" in nav → empty thread list (none yet)
2. Clicks compose → sends "Hi Tredoux, the Cambridge prospect is asking about Mandarin support"
3. Tredoux's super-admin Agent Inbox shows the message within ~5s
4. Tredoux opens Astra super-admin → "scan agent messages" → Astra summarizes Gloria's note + suggests reply
5. Tredoux refines Astra's draft → sends → Gloria sees the reply on her side
6. Audit: `ai_drafted=true, approved_by_id=tredoux_userid` on Tredoux's message in the thread row

**Cross-pollination test:** create a second test agent. Confirm they can't see Gloria's threads or vice versa.

**Unblocks:** Operational scale beyond Gloria. Multiple agents become tractable.

---

## Phase 5 — Polish & UX decisions

**Effort:** 1–2 hours total, mixed in with other work.

**Scope:**

### 5.1 `/montree/try?ref=` role picker

**Decision needed:** keep current picker (Teacher / Principal) or default to Principal/Owner when `?ref=` is present?

Argument for keeping: a teacher could legitimately want to use a code (homeschool, trial classroom).
Argument for defaulting: 99% of redemptions are principal/owner.

**Recommendation:** keep picker but reorder — Principal first, smaller "I'm actually a teacher" link below. Path-of-least-clicks for the common case.

### 5.2 Mira avatar PNG

Drop `/public/mira-avatar.png` (1024×1024) when ready. CSS "M" fallback works in the meantime. Silences 6 console 404s per agent page load.

### 5.3 Login-select pricing link

`app/montree/login-select/page.tsx`: "View pricing & tiers →" → "30 days free · See pricing →" per Session 71 carry-over.

### 5.4 Help-DM panel decision (teachers)

Today teachers have the legacy flat-table "Help" panel (`InboxButton.tsx`) for DM-to-Tredoux. Two options:

A. **Leave it.** Works. Familiar to existing teachers. Don't touch.

B. **Migrate to threaded.** Add `teacher_super_admin` thread type, parallel structure to agent_super_admin from Phase 4. ~half-day extra work.

**Recommendation:** A (leave it) for now. Migration can happen later if volume justifies.

### 5.5 Health tab — agent application monitoring

If Phase 3 ships, add a "Agent applications" card to the Health tab (pending count, oldest unanswered, alert if >7d). ~30 min.

### 5.6 Documentation update

After Phases 1–4, update CLAUDE.md with:
- The impersonation 404 root cause
- Architectural rules for agent_super_admin threads
- The 4-knob "agent identity" model: code issuance / login / impersonation / suspend
- The application acceptance workflow

---

## Dependency graph

```
                    ┌─── Phase 1: E2E validation ───┐
                    │           │                   │
                    │  (passes) │ (reveals 404 bug) │
                    ▼           ▼                   ▼
        Onboard Gloria     Phase 2: 404 fix    Cleanup test state
                                │
                                │ (after Gloria is live)
                                ▼
              ┌─────────────────┴─────────────────┐
              │                                   │
              ▼                                   ▼
      Phase 4: Messaging                 Phase 3: Recruitment
      (1–1.5 days)                       (0.5–1 day)
              │                                   │
              └─────────────────┬─────────────────┘
                                ▼
                        Phase 5: Polish
                        (1–2h scattered)
                                │
                                ▼
                        Documentation update
```

Phase 3 and Phase 4 are **independent** — can be done in either order or in parallel. Phase 4 is the higher operational impact (Gloria immediately benefits). Phase 3 is the higher growth impact (unblocks scaling agents).

**Recommended order:** Phase 4 first (Gloria's life gets better immediately), then Phase 3 (when ready to publicly recruit).

---

## Risk matrix

| Phase | Effort | Tech risk | Product risk | Reversibility |
|---|---|---|---|---|
| 1. E2E test | 2h + wait | Low | Low | Trivial (cleanup script) |
| 2. 404 fix | 0.5–2h | Low | Low | Trivial (one route change) |
| 3. Recruitment | 0.5–1d | Low | Medium (public copy) | Medium (revert page, drop column) |
| 4. Messaging | 1–1.5d | Medium (FK + cross-pollination + Astra role gating) | Low | Low (CHECK constraint reversible, code revert standard) |
| 5. Polish | 1–2h | Low | Low | Trivial |

---

## Open questions for Tredoux

1. **Agent application data model:** Option A (extend `montree_outreach_contacts` with `contact_type='agent_application'`) or Option B (new `montree_agent_applications` table)? Recommend A.

2. **Application form fields:** minimum (name, email, message) or longer (+ country, current role, why-good-fit)? Recommend longer — qualifies leads better.

3. **Auto-acknowledgement email on application submit:** yes/no? If yes, what tone? Recommend yes, warm/short Tredoux-voice.

4. **Astra super-admin scope:** separate route at `/montree/super-admin/tracy`, or extend existing `/montree/admin` Astra with role-based tool gating? Recommend separate route — cleaner separation.

5. **Help-DM panel for teachers:** leave legacy or migrate to threaded? Recommend leave.

6. **`/montree/try?ref=` polish:** reorder picker to default principal, or no change? Recommend reorder.

7. **Agent application + AgentApplicationAlert pattern naming:** call it "application" (current proposal) or align with existing language "agent request"? Recommend "application" — more formal, matches the recruitment intent.

8. **Stripe Connect cleanup for Gloria:** do it now (clean state for her real onboarding) or do it AFTER the E2E test (so Phase 1 can re-test impersonation against her actual current state)? **Recommend now** — the E2E test uses Tredoux's own test agent, doesn't need Gloria's state.

9. **Mira avatar PNG:** drop now (CSS fallback works) or wait? Recommend drop now (10s task).

10. **Documentation: agent handbook for new agents** — should Phase 3's "Read the handbook" link point to `docs/agents/GLORIA_STRIPE_ONBOARDING.md` (already exists) or do we need a new `AGENT_HANDBOOK.md`? Recommend new handbook — Gloria's doc is Stripe-specific.

---

## Audit trail

### Pass 1 — Coverage audit

Things initially missed and added back:

- The login-select pricing link text (Session 71 carry-over) → added as 5.3
- Health tab card for agent applications → added as 5.5
- Anti-spam on application form → added as 3.6
- Resend domain verification impact on auto-ack emails → noted in 3.3
- Astra role-based tool gating (super-admin vs principal context) → added as 4.8–4.9
- The "agent handbook" documentation piece → added as open question 10
- Cross-pollination test in Phase 4 acceptance → added

### Pass 2 — Adversarial audit

What could go wrong, and how the plan mitigates:

- **Phase 1 reveals OTHER bugs beyond impersonation.** Plan: re-run cleanup, document each, prioritize. Test plan is non-destructive.
- **Phase 2 isn't a quick fix — the 404 is something exotic.** Plan: time-box at 2 hours. If unresolved, document as "impersonation broken, use direct login" and ship without fixing. Gloria doesn't NEED impersonation to work.
- **Phase 3 application form gets spammed.** Mitigations: honeypot, rate limit, optional Turnstile if it gets bad.
- **Phase 4 migration breaks existing agent_principal threads.** Mitigation: CHECK constraint extension is purely additive. Test against staging DB first. Existing rows continue to work.
- **Phase 4 cross-pollination bug — one agent sees another's threads.** Mitigation: explicit cross-pollination test in acceptance criteria (4.10). Code review pattern matches Session 104's verified-clean pattern.
- **Phase 4 Astra role gating leaks.** Mitigation: role check at tool-definition-time (server-side), not just at UI level. Test: as Tredoux-as-principal-of-Whale-Class, agent tools must NOT appear in Astra's surface.
- **Phase 5.1 (try?ref= reorder) breaks an active redemption mid-flow.** Mitigation: deploy outside of high-redemption window. Currently only Gloria has a code, and no active redemptions.

### Pass 3 — Final cleanup audit

Things refined in the final pass:

- Phase 2's "most likely candidates" list — added Stripe-state hypothesis (Gloria's account deleted on Stripe side → 502 misread as 404)
- Phase 4 i18n estimate — bumped from "minimal" to "~40 keys" after counting against existing thread UI patterns
- Phase 4.9 — clarified that Astra stays principal-scoped at `/montree/admin` AND gets a separate super-admin route, not a role-detection extension of the same surface
- Recommended order between Phase 3 and 4 — clarified Phase 4 first (Gloria benefits) then Phase 3 (scaling)
- Open question 8 (Stripe cleanup timing) — added explicit recommendation
- Risk matrix — added Reversibility column
- Dependency graph — added the "Gloria onboarding" milestone explicitly

Three consecutive clean audits achieved. Plan declared done.

---

## What this plan does NOT cover

Intentionally out of scope:

- The 7 deferred PERF items from Session 107 (SW SWR, retry-with-resume, image dims full sweep, NoteField extract, tap target audit). Those are perf-quality items, not agent system items.
- HK banker confirmation, HK accountant package, Railway crons configuration. Operational, not code.
- Outreach follow-ups (FAMM, Cambridge, etc.). Sales, not code.
- Migration 188 status check, Resend domain verification. Already in CLAUDE.md priority list.
- Per-school billing override polish. Session 107 already shipped, doesn't need agent-system changes.

These belong in their own focused sessions.

---

## Suggested execution sequence (single-line)

Phase 1 (E2E test, 2h) → onboard Gloria → Phase 2 (404 fix if needed, 0.5–2h) → **PAUSE** → Phase 4 (messaging, 1–1.5d) → Phase 3 (recruitment, 0.5–1d) → Phase 5 (polish, scattered) → CLAUDE.md update.

The pause between Phase 2 and Phase 4 is operational — it gives Gloria a few days to actually use the system before we build the comms layer she'll need.
