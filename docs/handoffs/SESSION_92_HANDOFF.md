# Session 92 Handoff — Phase 7 Complete (Agent Dashboard System)

**Date:** May 6-7, 2026 (overnight build, continuing from Session 91)
**Status:** Phases 7b + 7c + 7d + 7e all shipped. The full agent dashboard system is complete. Plus a teacherpotato.xyz audio-streaming bug fix.
**Companion docs:**
- `docs/AGENT_DASHBOARD_PLAN.md` — full Phase 7 strategy
- `docs/handoffs/SESSION_91_HANDOFF.md` — Phase 7a foundation (the prior commit)

---

## TL;DR

Sarah can now log in with her agent code, see her dashboard, generate her own referral codes, see her referred schools and estimated monthly earnings, complete her Stripe Connect setup self-service, and sign out. The full agent surface from AGENT_DASHBOARD_PLAN ships in this session.

Plus: the teacherpotato.xyz music-streaming bug Tredoux hit yesterday is fixed (CORS-triggering `crossOrigin="anonymous"` removed from audio/video elements — they were forcing a CORS preflight on raw Supabase URLs).

**24 files changed across 1 auth wiring + 9 APIs + 9 pages + 2 polish components + 1 teacherpotato fix.** All eslint-clean with `--max-warnings=0`. Push pending.

---

## What got built

### Phase 7b — Authentication wiring (3 files)

**`lib/montree/server-auth.ts`** — Added `'agent'` to the `MontreeTokenPayload.role` union, the `verifyMontreeToken` role-check switch, and the `setMontreeAuthCookie` role parameter type.

**`lib/montree/verify-request.ts`** — Added `'agent'` to the `VerifiedRequest.role` union with a comment documenting that `schoolId` is INERT for agent sessions (it's the agent's `montree_teachers` row's school_id, used purely to satisfy the JWT shape — agent routes self-scope via `founding_teacher_id = userId`).

**`app/api/montree/auth/unified/route.ts`** — Added `tryAgentLogin()` helper between `tryTeacherLogin` and `tryParentLogin` (matching plan Section 3.3 ordering: principal → teacher → AGENT → parent). Lookup pattern: `WHERE agent_password_hash = legacySha256(code)`. Defensive checks: refuses to authenticate if `is_agent=false` (logs warn and falls through), refuses if `agent_suspended_at` is set (logs `agent_login_failed` with reason='suspended', falls through). On success: stamps `agent_login_last_used_at` fire-and-forget, logs `agent_login_succeeded` to `montree_agent_audit` plus `login_success` to the central security log, issues JWT, sets cookie, returns redirect to `/montree/agent/dashboard`. Postgres 42P01/42703 (migration 188 not yet run) returns null silently so the unified chain continues.

### Phase 7d — Agent self-scoped APIs (9 endpoints)

All endpoints gate on `auth.role === 'agent'` and self-scope via `founding_teacher_id = auth.userId` (schools, earnings) or `agent_id = auth.userId` (codes, payouts) or `id = auth.userId` (own profile). Cross-pollination filter is the most important security invariant.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/montree/agent/me` | GET | Agent profile + referred schools list with student counts |
| `/api/montree/agent/schools` | GET | All referred schools (overflow from /me) |
| `/api/montree/agent/schools/[id]` | GET | Per-school detail with earnings estimate breakdown |
| `/api/montree/agent/codes` | GET | Agent's own referral codes, optional ?status filter |
| `/api/montree/agent/codes` | POST | Self-generate new code at locked default % (rate limited 20/24h, requires pitch_label, refuses if `agent_default_share_pct IS NULL`) |
| `/api/montree/agent/codes` | DELETE | Revoke agent's own pending code (refuses if not pending or not owned by agent) |
| `/api/montree/agent/earnings` | GET | Estimated monthly earnings per school + total. Formula: `(students × $7 − Stripe fee ≈ 2.9% + $0.30 − API costs) × share %`. Negative net → 0 (no clawback). |
| `/api/montree/agent/payouts` | GET | Stripe Connect status + payout history (history empty until Phase 5 ships) |
| `/api/montree/agent/connect-onboard` | POST | Generate fresh Stripe onboarding link (race-safe Stripe account creation) |
| `/api/montree/agent/connect-status` | POST | Force-refresh status from Stripe API (preserves `completed_at` once set) |
| `/api/montree/agent/logout` | POST | Clear cookie, return redirect |

All POSTs that mutate state write to `montree_agent_audit` (Phase 7a's table) — `agent_code_generated`, `agent_code_revoked`, `agent_stripe_link_generated`. Phase 7a's super admin "Recent agent activity" panel surfaces them.

### Phase 7c — Agent UI pages (9 files)

Dark forest gradient theme matching `/montree`, `/montree/try`, `/montree/login-select`. Mobile-first — single column on narrow viewports, multi-column grid on desktop. Lora-style typography via `font-light` headings.

| Path | Purpose |
|------|---------|
| `app/montree/agent/layout.tsx` | Shared shell — fixed-position dark forest gradient, `<AgentNav />` at top, content slot |
| `app/montree/agent/dashboard/page.tsx` | Home — greeting + summary line, Stripe banner, schools cards (max 6 with "See all"), earnings 3-tile, recent codes (max 5 with "All codes →") |
| `app/montree/agent/schools/page.tsx` | Full schools grid with per-card student count + gross estimate |
| `app/montree/agent/schools/[id]/page.tsx` | Per-school: name + linked-on date + locale, snapshot tiles (students/classrooms/your %), full estimate breakdown (gross → fees → costs → net → share). Intentionally no classroom/child detail — that's the school's private space. |
| `app/montree/agent/codes/page.tsx` | Full code management: self-service generation form (pitch label required, default % shown), reveal-once banner with Copy code + Copy share link, status filter tabs, table with Revoke action |
| `app/montree/agent/earnings/page.tsx` | Two-tile summary + formula explanation + per-school table with the full math |
| `app/montree/agent/payouts/page.tsx` | Stripe Connect status pill + "Set up payouts" / "Generate fresh link" CTA + payout history (placeholder until Phase 5) |
| `app/montree/agent/settings/page.tsx` | Read-only profile (Q2 — agent can't edit name/email; ask Tredoux). Login-reset hint. Sign-out button. |
| `components/montree/agent/AgentNav.tsx` | Sticky top nav with brand mark + 6 page links + agent name + Sign out. Mobile hamburger sheet on narrow viewports. |

### Phase 7e — Polish (2 components)

**`AgentFirstRunOverlay.tsx`** — 3-card walkthrough overlay shown ONCE per device (localStorage key `montree.agent.firstrun.dismissed.v1`). Cards: "This is your home" / "Generate codes any time" / "Set up payouts now" (final card has CTA to /montree/agent/payouts). Dismissed via the CTA, "Maybe later", "Got it", or "Skip".

**`AgentRedemptionBanner.tsx`** — Celebration banner shown when school count went up since the agent's last dashboard load. Compares `schoolCount` prop to localStorage (`montree.agent.lastSeenSchoolCount.v1`). First load silently writes baseline (no false positive on first visit). Subsequent loads with delta show "🎉 [School name] just signed up using one of your codes." Dismiss writes the new baseline.

Both injected into the dashboard page.

### teacherpotato.xyz audio fix

User reported struggling to stream music yesterday. Parallel agent audit identified that `app/whale-class/page.tsx` had `crossOrigin="anonymous"` on every `<audio>` and `<video>` element (4 instances). The whale-class page intentionally uses raw Supabase URLs on teacherpotato.xyz (the proxy 502s without Cloudflare in front). With `crossOrigin="anonymous"`, the browser sends a CORS preflight on every media request — and Supabase Storage doesn't return `Access-Control-Allow-Origin` for teacherpotato.xyz, so playback blocks.

We don't actually use any cross-origin features (no canvas frame access, no MSE, no service-worker media caching — SW v3 only caches static assets). So removing `crossOrigin="anonymous"` from all 4 elements is safe and unblocks playback without changing the URL routing or requiring Tredoux to dashboard-action Supabase CORS.

---

## Architectural rules locked in (do NOT break)

Building on Session 91's rules. New rules from this session:

1. **Cross-pollination filter is mandatory on every agent endpoint.** `WHERE founding_teacher_id = auth.userId` for school-scoped queries, `WHERE agent_id = auth.userId` for code-scoped queries, `WHERE id = auth.userId` for own-row queries. Defense in depth — even DELETE/UPDATE statements include the filter as belt-and-braces.
2. **Every agent endpoint gates on `auth.role === 'agent'`.** A teacher hitting `/api/montree/agent/me` MUST get 403, not data. This is verified at the JWT layer, not just the URL routing.
3. **Agent JWT `schoolId` is INERT.** It's the agent's `montree_teachers.school_id` (placeholder for shell agents) — used only to satisfy the JWT shape. Agent routes IGNORE it. NEVER use schoolId for agent self-scoping.
4. **Unified login order: principal → teacher → AGENT → parent.** Strictly more specific roles first. Same pattern as Session 86's principal-first fix.
5. **`is_agent=true` is required, not just hash match.** `tryAgentLogin` refuses to authenticate if `is_agent=false` even when the hash matches. Defensive against schema bugs.
6. **Agent self-service POST audits to `montree_agent_audit`.** Code generation logs `agent_code_generated` with `{ code, pitch_label, revenue_share_pct }`. Code revocation logs `agent_code_revoked`. Stripe link generation logs `agent_stripe_link_generated`. Phase 7a's audit panel surfaces all of these.
7. **First-run overlay and redemption banner use localStorage, not server state.** Decouples from server timing (e.g. `agent_login_last_used_at` is stamped fire-and-forget after login, races with first dashboard load). localStorage is the right surface for "this device has seen this banner."
8. **`crossOrigin="anonymous"` on `<audio>`/`<video>` is a CORS escalator.** Don't add it unless you actually need canvas frame access, MSE, or SW cross-origin caching. For plain playback, leave it off.
9. **Earnings is ESTIMATES until Phase 5.** Always labelled. The formula is `(students × $7 − stripe_fee_estimate − api_cost) × share %`. Negative net → 0 (no clawback, but no negative payouts either). When `montree_agent_payouts` lands, the dashboard reads from there directly without UI changes.
10. **Self-service code generation is rate-limited 20/24h per agent.** Soft fail-open: if the count query errors, proceed (better to allow a legitimate code than block one due to a transient DB issue).
11. **Self-service codes lock at the agent's `agent_default_share_pct`.** The agent CANNOT raise their own %. If `agent_default_share_pct IS NULL`, self-service is disabled (`POST /api/montree/agent/codes` 403).

---

## What is NOT shipped

Phases 4 (Stripe school billing) and 5 (payout calc) are still ahead. They're the precondition for ACTUAL earnings — until they ship, the dashboard shows estimates labelled as such. The architecture is ready to swap in actuals from `montree_agent_payouts` when Phase 5 lands.

Phase 6 (super-admin Money tab — P&L view) is also still ahead.

---

## File-by-file change list

| File | Status |
|------|--------|
| `lib/montree/server-auth.ts` | EDITED — agent in MontreeRole + role param |
| `lib/montree/verify-request.ts` | EDITED — agent in VerifiedRequest |
| `app/api/montree/auth/unified/route.ts` | EDITED — tryAgentLogin section + helper |
| `app/api/montree/agent/me/route.ts` | NEW |
| `app/api/montree/agent/schools/route.ts` | NEW |
| `app/api/montree/agent/schools/[id]/route.ts` | NEW |
| `app/api/montree/agent/codes/route.ts` | NEW (GET/POST/DELETE) |
| `app/api/montree/agent/earnings/route.ts` | NEW |
| `app/api/montree/agent/payouts/route.ts` | NEW |
| `app/api/montree/agent/connect-onboard/route.ts` | NEW |
| `app/api/montree/agent/connect-status/route.ts` | NEW |
| `app/api/montree/agent/logout/route.ts` | NEW |
| `app/montree/agent/layout.tsx` | NEW |
| `app/montree/agent/dashboard/page.tsx` | NEW |
| `app/montree/agent/schools/page.tsx` | NEW |
| `app/montree/agent/schools/[id]/page.tsx` | NEW |
| `app/montree/agent/codes/page.tsx` | NEW |
| `app/montree/agent/earnings/page.tsx` | NEW |
| `app/montree/agent/payouts/page.tsx` | NEW |
| `app/montree/agent/settings/page.tsx` | NEW |
| `components/montree/agent/AgentNav.tsx` | NEW |
| `components/montree/agent/AgentFirstRunOverlay.tsx` | NEW |
| `components/montree/agent/AgentRedemptionBanner.tsx` | NEW |
| `app/whale-class/page.tsx` | EDITED — removed crossOrigin from 4 media elements |

---

## Audit trail

- Lint: `--max-warnings=0` clean across all 24 changed/new files (eslint exit 0)
- Cross-pollination filter verified on every agent endpoint via grep
- Auth role check (`auth.role !== 'agent'`) verified on every agent endpoint
- Plaintext code never logged or persisted (Phase 7a rule preserved)
- Migration 188 graceful degradation in `tryAgentLogin` (Postgres errors → null, falls through cleanly)
- Belt-and-braces filters: DELETE on codes uses BOTH the agent_id-scoped fetch AND the agent_id-scoped update
- Race-safe Stripe Connect account creation (conditional UPDATE WHERE account_id IS NULL)

---

## Production verification checklist (after Tredoux runs migration 188 + redeploys)

After migration 188 is in Supabase and Railway has redeployed `9ad7f3xx`:

1. Super admin → 🎟️ Referrals → Issue agent login for an existing agent (Gloria from Session 90 commit `e0ee3c7d` is a good test target). Note the 6-char code.
2. Open private window → `montree.xyz` → enter the code at login → expect redirect to `/montree/agent/dashboard`.
3. Verify nav shows agent's name. Verify dashboard renders without errors.
4. Click each nav link: Dashboard / Schools / Codes / Earnings / Payouts / Settings. All should render cleanly.
5. On Codes page, generate a new code with a pitch label like "Production Test — May 7". Verify reveal banner appears with code + Copy + Copy share link buttons.
6. Verify the new code appears in the table at status='pending'.
7. Click Revoke on the new code. Confirm. Verify status flips to 'revoked'.
8. On Payouts page, click "Generate fresh link" if status isn't verified. Verify the indigo banner appears with the Stripe link.
9. Click "Sign out" in nav (mobile hamburger if narrow). Verify redirect to `/montree/login-select`.
10. Try the same code again — should authenticate fresh.
11. In another tab, check super admin → Referrals → "Recent agent activity" panel — expect to see 2 events (`agent_code_generated`, `agent_code_revoked`) plus the login event chain.
12. Test the first-run overlay: clear localStorage in DevTools, reload — overlay appears. Click through to "Set up payouts" — verify it dismisses + navigates.
13. Test the celebration banner: clear localStorage `montree.agent.lastSeenSchoolCount.v1`, set it to a number 1 lower than current count, reload — banner appears.
14. teacherpotato.xyz fix: visit `https://teacherpotato.xyz/whale-class`, click an audio song, verify it plays.

---

## Carry-overs from Session 91

Still pending:
1. Tredoux to run migration 188 in Supabase SQL Editor (was the precondition from Session 91 — still required before this session's code does anything useful)
2. Stripe Connect HK + Wallex compatibility confirmation (banker call)
3. Stripe Connect webhook setup (5-step Tredoux task in Session 90 handoff)
4. Pamela email draft `r2430204512620199011` waiting in Gmail

---

## Next session priorities

1. **Production verification** — walk the 14-step checklist above.
2. **Phase 4 — Stripe school subscription billing** (~3-4 days). Schools actually pay $7/student/month via Stripe. Without this, Phase 5 can't have real numbers.
3. **Phase 5 — Payout calculation engine** (~1.5 days). Monthly aggregator that writes to `montree_agent_payouts`. Once shipped, the agent dashboard's `paid_to_date_usd` becomes non-zero and `payout_history` populates.
4. **Phase 6 — Super-admin Money tab** (~2-3 days). Where Tredoux sees the P&L. Builds on 4 + 5.
