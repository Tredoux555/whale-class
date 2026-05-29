# Session 108 Handoff — Agent System Phases 3, 4, 5 shipped + post-deploy fixes

> **State at end of session:** Migrations 203 + 204 run in Supabase. All code committed and pushed to `origin/main` (ending at `57057257`). Railway auto-deploy settled. Application form **verified working end-to-end** with `Tredouxtest@gmail.com`.
>
> **Commits in this session, in order on origin/main:**
> 1. `30836e8e` — Session 108: Phases 3 + 4 + 5 (recruitment funnel, agent↔super-admin messaging, polish) — 28 files, +4972/-395
> 2. `e83e7490` — AgentNav: fix top-right crowding (drop inline agent name, reserve MiraFloat space)
> 3. `3ef7ddc3` — Agent application route: replace UPSERT-on-email with explicit INSERT + 23505 handling
> 4. `57057257` — Landing + agent-app polish: drop What's new from nav, reposition kicker, sign Application screen as Montree
>
> **Two real-world findings logged this session:**
>
> 1. When Tredoux typed `TREDOUX-PXQ9` (a referral code he generated earlier in the session) into the unified login screen expecting to log into an agent dashboard, he was correctly redirected to `/montree/try?ref=TREDOUX-PXQ9` (school signup flow). Working as designed — referral codes route to school signup. The `<FIRSTNAME>-XXXX` format reads to humans like "this is MY login code." Agent login is a separate 6-char hash issued via Super-admin → Agents → 🔑. Future polish: disambiguate at the login screen. Not a bug.
>
> 2. First real submission via `/montree/become-an-agent` returned 500. Root cause: the original UPSERT-on-email pattern was trying to mutate a pre-existing row from earlier session testing into an `agent_application`, silently overwriting CRM history. Patched in `3ef7ddc3` — now a clean INSERT with explicit 23505 handling: legitimate resubmits update the same agent_application row, cross-type collisions return 409 with a friendly message, all other DB errors surface their `detail` in the response. Verified working end-to-end.
>
> **One architectural posture confirmed this session:**
>
> **Don't hard-delete agents.** Suspend instead (`agent_suspended_at = NOW(), is_agent = FALSE`). Hard delete is reserved for test state only — via `scripts/cleanup-test-agent.sql` with the `is_agent=true` safety check. Real agents accumulate audit history, finance ledger entries, and potentially earned payouts. The schema enforces this: `montree_agent_payouts.agent_id` is ON DELETE RESTRICT. Don't build a UI 🗑 Delete button — it invites misuse.


Per `docs/handoffs/AGENT_SYSTEM_FIX_PLAN.md` (the 3×3×3 plan). Phases 1 (E2E test) and Phase 2 (impersonation 404 hot-fix) remain blocked on Tredoux at the keyboard — those are user-action phases. Phases 3, 4, 5 are pure code and are now shipped.

---

## What's in main as of this session

**Phase 3 — Public agent recruitment funnel** (✅ shipped)
- Migration 203 — extends `montree_outreach_contacts` with `application_details JSONB`, `agent_application` contact_type, `agent_applied` status (preserves all prior status values inc. demo_requested)
- API: `POST /api/montree/become-an-agent/apply` — public application endpoint with honeypot anti-spam, field caps, auto-ack + Tredoux notification email
- API: `GET/PATCH /api/montree/super-admin/agent-applications` — super-admin review surface
- Component: `components/montree/super-admin/AgentApplicationAlert.tsx` — banner above tabs in super-admin showing pending applications
- Page: `/montree/become-an-agent` rebuilt as full recruitment landing (hero + earnings table + 4-step "how it works" + 5 rules + application form + success state)
- Redirect: `/montree/for-teachers` → `/montree/become-an-agent` (reversed from Session 98's direction)
- ReferralsTab: reads `?prefill_name=`, `?prefill_email=`, `?from_application=` URL params, opens issue-code form pre-filled, marks application 'sent' after code is issued
- super-admin/page.tsx: reads `?tab=` for deep-linking (so AgentApplicationAlert's Accept button lands in the right tab)

**Phase 4 — Agent ↔ super-admin threaded messaging** (✅ shipped, Mira/Astra assist deferred)
- Migration 204 — extends 4 messaging CHECK constraints (thread_type, created_by_role, participant_role, sender_role) to include 'agent_super_admin' / 'super_admin'. Drops NOT NULL on `montree_message_threads.school_id` with gated CHECK constraint (only agent_super_admin threads may have NULL school_id). Adds partial index for super-admin inbox queries.
- Helper module: `lib/montree/agent-super-admin-messaging/` with `types.ts` (SUPER_ADMIN_SENTINEL_UUID + display name) and `access.ts` (resolveMessagingAgent / resolveMessagingSuperAdmin)
- Agent-side APIs:
  - `GET/POST /api/montree/agent/messages-tredoux/threads`
  - `GET/PATCH /api/montree/agent/messages-tredoux/threads/[threadId]`
  - `GET/POST /api/montree/agent/messages-tredoux/threads/[threadId]/messages`
- Super-admin APIs:
  - `GET /api/montree/super-admin/agent-messages/threads`
  - `GET/PATCH /api/montree/super-admin/agent-messages/threads/[threadId]`
  - `GET/POST /api/montree/super-admin/agent-messages/threads/[threadId]/messages`
- Agent UI:
  - "Tredoux" nav entry added to `AgentNav.tsx`
  - `/montree/agent/messages-tredoux` — thread list with compose modal
  - `/montree/agent/messages-tredoux/[threadId]` — thread detail with sticky composer + optimistic UI
- Super-admin UI:
  - 📬 "Agent Inbox" tab added between Agents and Money
  - `components/montree/super-admin/AgentInboxTab.tsx` — inbox list + inline thread detail view + reply composer

**Phase 5 — Polish** (✅ shipped)
- `/montree/try` role picker reorders when `?ref=CODE` is present: Principal becomes the primary gold CTA, Teacher drops to the secondary emerald option (most code redemptions are principals).
- `MiraAvatar.tsx` — added `MIRA_PNG_AVAILABLE = false` flag. When false, renders CSS monogram only (no `/mira-avatar.png` request, no 6+ console 404s per page load). Flip to `true` and the img variant activates the moment the PNG is on disk.
- `/montree/login-select` pricing link copy ("30 days free · See pricing →") was already in place — no change needed.
- Help-DM panel for teachers: left as-is per plan decision.

---

## 🚨 Migrations to run in Supabase SQL Editor

Both are idempotent — safe to re-run. Run in order:

1. `migrations/203_agent_applications.sql`
2. `migrations/204_agent_super_admin_messaging.sql`

Until these land, the new features either degrade gracefully (Phase 3 application submit fails with a clear error) or fail loudly (Phase 4 thread creation 500s with "school_id NOT NULL" detail). The UI itself is safe to deploy.

---

## Acceptance test — Phase 3

1. Public user visits `https://montree.xyz/montree/become-an-agent` → sees the recruitment landing with hero + earnings table + 4-step flow + 5 rules + application form.
2. Submit application with name + email + message → success screen replaces form. Auto-ack email arrives (if Resend domain is verified).
3. Tredoux opens super-admin → amber banner appears at the top above the tabs showing the new application with applicant details, country, and an expandable "Read pitch" disclosure.
4. Click "✓ Accept" → redirects to Agents tab with the issue-code form open, name + email pre-filled. Set share % → submit → reveal-once gold banner appears with the new agent code. Application status flips to 'sent' (drops out of banner on next load).
5. Or click "✗ Decline" → row drops out (status='declined'). Or "✉ Reply" → opens mail client (status flips to 'contacted').

## Acceptance test — Phase 4

1. Agent logs into `/montree/agent/dashboard` via direct code login. Clicks "Tredoux" in nav → lands on `/montree/agent/messages-tredoux`. Empty state with "Start a message" CTA.
2. Click "Start a message" → modal opens. Type subject + body → submit. Page navigates to the new thread detail with the first message bubble.
3. Tredoux opens super-admin → 📬 Agent Inbox tab. Sees the new thread with agent name, snippet, "1 new" badge.
4. Click the thread → conversation view replaces inbox. Type reply → submit. Bubble appears on the right (Tredoux's side).
5. Agent refreshes their thread page → Tredoux's reply appears in the conversation.
6. Cross-pollination check: create a second test agent with their own code, log them in, confirm they only see their OWN thread (not the first agent's).

---

## What's NOT in this session

**Phase 1 — E2E validation:** Tredoux must walk `docs/handoffs/AGENT_E2E_TEST_PLAN.md` end-to-end with real Stripe + bank info. Can't be code-built. Once it passes cleanly, clear test state via `scripts/cleanup-test-agent.sql`, then onboard Gloria.

**Phase 2 — Impersonation 404 hot-fix:** Conditional on Phase 1 findings. Most likely candidates documented in `AGENT_SYSTEM_FIX_PLAN.md` Phase 2.

**Mira tool extensions** (Phase 4.7 in original plan): `start_thread_with_tredoux` / `reply_in_thread` for the agent-side AI. The messaging infrastructure is ready — Mira just needs the tool definitions and dispatch. Deferred to a focused build session.

**Astra super-admin scope** (Phase 4.8): `scan_agent_messages` / `draft_agent_reply` with role-based tool gating, separate route at `/montree/super-admin/tracy`. The thread schema supports `ai_drafted=true, ai_draft_source='tracy.draft_agent_reply'` already — Astra just needs the tools and the new route. Deferred.

**Full i18n batch** for Phase 3 + Phase 4 strings: English-only for v1. Recruitment page + form labels + new nav entries + thread UI strings. Add to next i18n sweep.

---

## Architectural rules locked in this session

49. `montree_message_threads.school_id` is **nullable ONLY for `thread_type='agent_super_admin'`** (migration 204 gated CHECK). Every other thread type stays mandatorily school-scoped.
50. **Super-admin participant identity uses `SUPER_ADMIN_SENTINEL_UUID = '00000000-0000-0000-0000-000000000000'`** in `participant_id` and `sender_id`. The role string (`'super_admin'`) is the canonical identity signal; the UUID is FK-shape filler. Don't change this value — old threads would orphan.
51. **`ai_drafted` is FORCED false on agent posts**, can be true on super-admin posts when Astra drafts. Same Session 84 rule extended to agent_super_admin scope.
52. **`resolveMessagingAgent` (super-admin scope) does NOT require schools.** An agent without referrals can still message Tredoux. Different from `agent_principal` scope which requires founded schools.
53. **Agent applications use `contact_type='agent_application'` + `status='agent_applied'`** on `montree_outreach_contacts`. The structured form payload lives in `application_details JSONB`.
54. **The PATCH endpoint for agent applications double-checks `contact_type='agent_application'`** before mutating (defense in depth — won't accidentally update a demo_request or outreach contact).
55. **`MIRA_PNG_AVAILABLE` flag in `MiraAvatar.tsx`** — flip to true when the PNG ships. Until then, CSS monogram only (no 404 storm).
56. **`/montree/for-teachers` is a 301-style redirect to `/montree/become-an-agent`** (reversed from Session 98). Keep the file so existing inbound links don't 404.

57. **Don't hard-delete agents in production.** Suspend (`agent_suspended_at = NOW(), is_agent = FALSE`) preserves audit trail, finance ledger continuity, and the RESTRICT FK on pending payouts. Hard delete is reserved for test state only, via `scripts/cleanup-test-agent.sql` which has an `is_agent=true` safety check. The schema's design forces this: `montree_agent_payouts.agent_id` is ON DELETE RESTRICT specifically because pending payouts are earned money. No UI 🗑 button — operator judgment via SQL only.

58. **Never UPSERT on a shared-key column when multiple semantic row types coexist on the same table.** `montree_outreach_contacts` holds both `demo_request` rows AND `agent_application` rows AND outreach contacts — all keyed by email uniqueness. UPSERT-on-email silently mutates one row type into another, losing CRM history. Pattern: INSERT explicitly, catch 23505, lookup the existing row's `contact_type`, UPDATE only if same-type (legitimate resubmit), return 409 if cross-type. Surfaces real errors with `detail: insertErr.message` in the 500 response so future debugging doesn't need Railway log diving. Canonical in `app/api/montree/become-an-agent/apply/route.ts`.

59. **`What's new` / `/montree/changelog` is internal-use only on the public landing.** The route exists (and the page renders) for direct-link access during internal demos, but no link to it from the public landing nav. Public visitors don't need to see the release log.

60. **The "Change your life" hero kicker sits BELOW the CTA, not above the title.** Acts as a punctuation flourish after the call to action. `.m-hero-kicker-below` modifier swaps the margin so it breathes underneath the button. Don't revert to pre-title placement without explicit reason.

61. **Agent application success state signs `— Montree`, not a personal name.** Brand voice from a brand surface. The body of the message can use first person ("I read every application personally") — that's a brand speaking warmly — but the closing signature is the brand name. Same posture applies to any future public-facing transactional UI.

---

## Files changed (24 total)

NEW:
- `migrations/203_agent_applications.sql`
- `migrations/204_agent_super_admin_messaging.sql`
- `app/api/montree/become-an-agent/apply/route.ts`
- `app/api/montree/super-admin/agent-applications/route.ts`
- `app/api/montree/agent/messages-tredoux/threads/route.ts`
- `app/api/montree/agent/messages-tredoux/threads/[threadId]/route.ts`
- `app/api/montree/agent/messages-tredoux/threads/[threadId]/messages/route.ts`
- `app/api/montree/super-admin/agent-messages/threads/route.ts`
- `app/api/montree/super-admin/agent-messages/threads/[threadId]/route.ts`
- `app/api/montree/super-admin/agent-messages/threads/[threadId]/messages/route.ts`
- `lib/montree/agent-super-admin-messaging/types.ts`
- `lib/montree/agent-super-admin-messaging/access.ts`
- `components/montree/super-admin/AgentApplicationAlert.tsx`
- `components/montree/super-admin/AgentInboxTab.tsx`
- `app/montree/agent/messages-tredoux/page.tsx`
- `app/montree/agent/messages-tredoux/[threadId]/page.tsx`
- `scripts/cleanup-test-agent.sql` (from earlier this session)
- `docs/handoffs/AGENT_E2E_TEST_PLAN.md` (from earlier this session)
- `docs/handoffs/AGENT_SYSTEM_FIX_PLAN.md` (from earlier this session)
- `docs/handoffs/SESSION_108_HANDOFF.md` (this file)

REPLACED:
- `app/montree/become-an-agent/page.tsx` (was redirect stub, now full recruitment page)
- `app/montree/for-teachers/page.tsx` (was full page, now redirect to /become-an-agent)
- `components/montree/agent/MiraAvatar.tsx` (added MIRA_PNG_AVAILABLE flag)

EXTENDED:
- `app/montree/super-admin/page.tsx` (added AgentApplicationAlert mount, AgentInboxTab tab, tab URL param reader)
- `components/montree/super-admin/ReferralsTab.tsx` (added URL prefill reader + application status update on code issue)
- `components/montree/agent/AgentNav.tsx` (added "Tredoux" nav entry)
- `app/montree/try/page.tsx` (reorder role picker when ?ref= present)

---

## Next session priorities

1. **Run migrations 203 + 204 in Supabase SQL Editor.** Verify counts after.
2. **Walk Phase 3 acceptance test** end-to-end on production.
3. **Walk Phase 4 acceptance test** including cross-pollination (two test agents, confirm they can't see each other's threads).
4. **Phase 1 E2E validation** per `AGENT_E2E_TEST_PLAN.md` — Tredoux's own agent test, real Stripe, $1 wire.
5. **Phase 2** if Phase 1 revealed the impersonation 404.
6. **Mira tool extensions** (deferred from Phase 4.7) — half-day build.
7. **Astra super-admin scope** (deferred from Phase 4.8) — needs careful role-based tool gating audit. Plan to use separate `/montree/super-admin/tracy` route for cleaner separation.
8. **i18n batch** for new strings — ~50-80 keys × 12 locales via Haiku.
9. **Onboard Gloria** once Phase 1 passes and Phase 2 (if needed) lands.

---

## What "all the agent things" looks like after this session

Public funnel: 🌱 Agent applies via `/become-an-agent` → Tredoux reviews via super-admin alert → ✓ Accept opens pre-filled code issue → reveal-once code → applicant gets the code in email + handbook (when handbook ships).

Operational: Agent logs in → dashboard → can message Tredoux directly via "Tredoux" nav → Tredoux's super-admin Agent Inbox surfaces it → reply lands back in agent's view.

Financial: (already in place from Session 107) Agent completes Stripe Connect → webhook fires → status flips → payout calc cron runs → ⚡ Wire → commission lands in agent's bank → audit trail in finance_transactions.

The whole chain — recruitment → application → vetting → code issuance → onboarding → operations → comms → payouts — is now wired end-to-end. The remaining work is human validation (Phase 1) and incremental AI assistance (Mira + Astra extensions).
