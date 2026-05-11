# Session 104 Handoff — May 11, 2026

**Tagline:** Auto-run session. Three docs for Gloria + agents + HK accountant. Teacher-driven parent invite system with principal visibility. Agent → principal messaging. Feature toggle modal spacing pass. Three audit-fix cycles, all clean.

---

## What you asked for

From the screenshots + tired-typed notes:

1. **Gloria Stripe Connect onboarding** — what to send her, how she gets 50% of net.
2. **Deduction calculation** — clear math an agent can verify.
3. **Financial dashboard + HK tax-agent summary** — where it is, what to give the accountant.
4. **Teachers onboard parents; principal sees all codes too** — picture 2 + 4.
5. **Parent messaging set up cleanly** — teacher ↔ parent + principal, principal ↔ parent + teacher, agent → principal only.
6. **Feature toggle modal looked messy** — picture 6.
7. **Audit-fix until clean. Don't ask. Auto-run.**

---

## What shipped

### A. Three documentation deliverables

| File | For |
|------|-----|
| `docs/agents/GLORIA_STRIPE_ONBOARDING.md` | Gloria personally — 10-min Stripe Connect walkthrough, what she needs, how she sees her dashboard |
| `docs/agents/AGENT_DEDUCTION_EXPLAINER.md` | Any agent — plain-English math on Gross → Stripe fee → AI cost → Net → 50% share, with a worked example |
| `docs/finance/HK_FINANCIAL_ADVISOR_SUMMARY.md` | The HK accountant — revenue model, three cost categories, multi-currency picture, monthly export pack, 8 numbered open questions |

The HK doc explicitly answers your "where is my financial dashboard?" question: **Phase 6 (super-admin Money tab) isn't built yet — that's the next major build**. The doc names exactly what the dashboard will export. Phase 5 (payout calculator, ~1.5 days) and Phase 6 (Money tab, ~2-3 days) are documented as the immediate next builds — both unblocked since Stripe is live since May 10.

### B. Teacher-driven parent invite system (4 files)

**Backend:**
- `app/api/montree/admin/parent-codes/route.ts` — **NEW**. Principal-only GET. Lists every active child in the school + their latest active invite code + QR + parent URL. Returns clean empty when no children. Fixes the existing `/montree/admin/parent-codes/page.tsx` (which was calling a route that didn't exist).
- `app/api/montree/admin/parent-codes/generate-all/route.ts` — **NEW**. Principal-only POST. Idempotent fill-the-gaps generator — only creates codes for children who don't already have one.
- `app/api/montree/dashboard/parent-codes/route.ts` — **NEW**. Teacher-scoped:
  - **GET**: lists children in the teacher's `auth.classroomId` only
  - **POST**: creates a code for a single child (idempotent — returns existing if already active)
  - **PUT**: resets — revokes prior active codes, issues a fresh one

**Frontend:**
- `app/montree/dashboard/parent-codes/page.tsx` — **NEW**. Dark forest aesthetic matching `/dashboard/messages`. Per-child card with Copy / Email / Reset. Print-friendly QR codes hidden on screen, shown on print. Empty state when no children.
- `components/montree/DashboardHeader.tsx` — added "Parent codes" entry to the More menu (KeyRound icon), wired `activePage` detection.

**Cross-pollination contract** (Session 84 rule):
- Admin route requires `auth.role === 'principal'`, filters by `school_id = auth.schoolId`
- Dashboard route requires `auth.role === 'teacher' || 'homeschool_parent'`, filters by `classroom_id = auth.classroomId AND school_id = auth.schoolId`
- POST/PUT re-fetch the child row and verify `child.school_id === auth.schoolId AND child.classroom_id === auth.classroomId` before any write
- Both routes call the canonical `generate_parent_invite_code` Postgres function from migration 095 — same alphabet (no I/O/0/1) as the rest of Montree

### C. Agent → Principal messaging (10 files)

Built by a parallel agent and audited. Mirrors the parent messaging shape from Sessions 97/98.

**Migration:**
- `migrations/197_agent_messaging.sql` — **NEW**. Widens four CHECK constraints from migration 190: `thread_type` adds `'agent_principal'`; `participant_role`, `created_by_role`, `sender_role` all add `'agent'`. Idempotent (drops + re-adds each constraint).

**Library:**
- `lib/montree/agent-messaging/types.ts` — `MessagingAgent`, `AgentRecipientSchool`
- `lib/montree/agent-messaging/access.ts` — `resolveMessagingAgent()`: gates on `role='agent'`, double-checks `is_agent=true + agent_suspended_at IS NULL` in DB, resolves `schoolIds` via `founding_teacher_id = auth.userId`

**API routes:**
- `app/api/montree/agent/messages/threads/route.ts` — GET (list agent's threads, joined to their founded schools), POST (create thread to school's principal)
- `app/api/montree/agent/messages/threads/[threadId]/route.ts` — GET (detail), PATCH (mark_read)
- `app/api/montree/agent/messages/threads/[threadId]/messages/route.ts` — GET (max 500), POST (server forces `ai_drafted=false`)
- `app/api/montree/agent/messages/recipients/route.ts` — `{ schools: [{ school_id, school_name, principal | null }] }`

**UI:**
- `app/montree/agent/messages/page.tsx` — list + floating + button + compose modal (pick school → subject → body)
- `app/montree/agent/messages/[threadId]/page.tsx` — iMessage-style detail with sticky reply composer
- `components/montree/agent/AgentNav.tsx` — "Messages" link added between Mira and Schools

**Type widening (Audit round 1 catch):**
- `lib/montree/messaging/types.ts` — `ParticipantRole` widened to include `'agent'`; `ThreadType` widened to include `'agent_principal'`
- `lib/montree/messaging/thread-resolver.ts` — `createThreadWithParticipants` `createdBy.role` widened to `ParticipantRole` (was literal three-role union). Drops unsafe casts in the agent route.

### D. Feature toggle modal spacing pass

`components/montree/super-admin/SchoolFeaturesModal.tsx` — restructured padding + visual hierarchy:
- Header padding `py-4` → `py-5`, added `mt-0.5` between school name and feature count, close button became a 32px hit target with rounded background on hover
- Bulk actions row `py-2` → `py-3`, button padding `py-1` → `py-1.5`, label changes "Enable All" → "Enable all" / "Disable All" → "Disable all", added slight `bg-slate-900/30` to delineate the row from the body
- Feature list outer padding `py-3` → `py-5`, category-group spacing `space-y-4` → `space-y-7`, category heading tracking widened (`[0.12em]`) and `mb-2` → `mb-3` for breathing room
- Per-feature row padding `px-3 py-2` → `px-3.5 py-3`, gained a clearer hover affordance on disabled rows (`hover:border-slate-600/60`), max-height widened `max-h-[80vh]` → `max-h-[85vh]` so all groups fit on shorter laptops without the body scroll feeling cramped

---

## 🚨 Pre-deploy / Tredoux action required

1. **Run migration 197 in Supabase SQL Editor.** Without this, agent → principal POSTs fail with a CHECK constraint error (caught + surfaced as a clean 500 with "has migration 197 been run?" message, but the user can't actually send until the migration runs).

   ```sql
   -- File: migrations/197_agent_messaging.sql
   -- Run the whole file as-is. Idempotent.
   ```

2. **Stripe Connect setup on the platform account** — picture 1 showed "You can only create new accounts if you've signed up for Connect, which you can do at https://dashboard.stripe.com/connect." Steps:
   - Go to https://dashboard.stripe.com/connect
   - Click "Get started" with Connect (Express, since agents are individuals)
   - Confirm Connect is enabled on the live platform account
   - Then click 💳 on Gloria's row in super-admin Referrals — the onboarding link will generate cleanly

3. **Send Gloria** `docs/agents/GLORIA_STRIPE_ONBOARDING.md`. Once Stripe Connect is enabled on your platform, generate her onboarding link from the 💳 button and send her both the doc + the link.

4. **Send the HK accountant** `docs/finance/HK_FINANCIAL_ADVISOR_SUMMARY.md`. The doc ends with 8 numbered questions to bounce back. Reply with their answers and Phase 6 (Money tab) can be wired to match their categorisation directly.

---

## Verification status

- ✅ All new files lint clean (`--max-warnings=0`) on every changed file
- ✅ `tsc --noEmit --incremental false` from clean state: zero errors anywhere
- ✅ Pre-existing warnings on `DashboardHeader.tsx` (Bell unused, useCallback dep at line 348, img at line 785) are unchanged — I didn't introduce new ones
- ✅ Three consecutive clean audit rounds (round 1 caught the ThreadType/ParticipantRole type-system hole; round 2 confirmed lint + tsc clean after the fix; round 3 verified `addPrincipalObserver` correctly does NOT fire on agent_principal threads, and that existing `/montree/admin/parent-codes` page works against the new API shape)

---

## Architectural rules locked in this session

1. **Teacher messaging surface is `/montree/dashboard/messages`** (Session 103). Teacher invite for parents lives at `/montree/dashboard/parent-codes`. Principal sees both at `/montree/admin/communication` (messages) and `/montree/admin/parent-codes` (codes). One UX tree, two views, same backend.

2. **Teacher creates parent codes scoped to their classroom.** Principal sees school-wide. Both use the canonical `generate_parent_invite_code` Postgres function — never roll a new alphabet.

3. **`/api/montree/admin/parent-codes`** is principal-only. **`/api/montree/dashboard/parent-codes`** is teacher-only (+ homeschool_parent). Trying to call the wrong one with the wrong role → 403. No silent fallback.

4. **`montree_message_threads.thread_type`** now formally includes `'agent_principal'` in the TypeScript union. Don't cast.

5. **`ParticipantRole`** now includes `'agent'`. The agent role is distinct from `'teacher'` — agents don't show up in classroom_teachers broadcasts even though they're stored in `montree_teachers` (with `is_agent=true`).

6. **`addPrincipalObserver()` only fires on `parent_teacher` and `parent_principal` threads.** The principal is already a direct participant on `agent_principal` threads — no observer double-add.

7. **`ai_drafted = false` is server-forced on agent POSTs.** Mira drafts emails elsewhere; she does not ghost-write through the messaging surface.

8. **Stripe Connect is a precondition.** Until enabled on the platform account, the agent connect-onboard route fails with a clean error. We don't try to work around it.

9. **The HK accountant is the source of categorisation truth.** Don't lock down "cost of sales vs operating expense" decisions on commissions or any other line item until they reply.

---

## Carry-overs (priority-ordered)

1. **🚨 Run migration 197** in Supabase. Required for agent messaging POSTs.
2. **🚨 Enable Stripe Connect** on the platform account.
3. **🚨 Verify migration 196** (from Session 103) — Web Vitals telemetry. Was queued as a Session 103 prereq; check if it landed.
4. **Send Gloria** the Stripe Connect onboarding link + her doc.
5. **Send the HK accountant** the summary doc. Wait for replies to questions 1–8 before wiring categorisation into Phase 6.
6. **Phase 5 — Payout calculator** (~1.5 days). Now that Stripe is live + the finance ledger exists, an idempotent monthly aggregator reading `montree_finance_transactions` → writing `montree_agent_payouts` per agent per school per month. This is what makes Gloria's monthly payout actually happen.
7. **Phase 6 — Super-admin Money tab** (~2-3 days). The financial dashboard. Five sub-views: Income / Direct costs / Commissions / Operating expenses / P&L. Plus CSV/PDF/JSON exports for the accountant's monthly pack. Builds on Phase 5.
8. **Onboard the real Gloria** as the first agent end-to-end. Now actually testable once Stripe Connect is on.
9. **Outreach follow-ups** — FAMM Argentina, Cambridge Montessori Global, Otari NZ Susan West, Lions Gate, Montessori Norge.
10. **Optional polish:**
    - Print stylesheet on `/montree/dashboard/parent-codes` could be tightened — currently uses minimal print CSS, works but could be prettier
    - i18n keys for the new parent-codes page (currently English-only inline strings)
    - i18n keys for the agent messaging UI (also English-only)
    - DashboardHeader still has three pre-existing lint warnings (Bell unused, useCallback dep, img on line 785). Not introduced by this session — clean-up backlog.

---

## Repo state at end of Session 104

- New files: 11 (parent codes routes + page + agent messaging routes + UI + docs + handoff)
- Modified: 5 (DashboardHeader, SchoolFeaturesModal, messaging types, thread-resolver, AgentNav)
- New migration awaiting Supabase run: **197_agent_messaging.sql**
- Three audit-fix cycles run, ending clean
- Lint: 0 errors, 0 warnings on every new/modified file (pre-existing warnings on DashboardHeader unchanged)
- TypeScript: clean

**End of Session 104 handoff. Pick up Session 105 with migration 197 + Stripe Connect activation + send Gloria's package.**
