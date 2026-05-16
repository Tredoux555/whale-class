# Session 113 V3 — Saturday autonomous burn plan

**Created:** May 17, 2026 (continuation of Session 113 V2 burn)
**Context:** Tredoux is in parent presentations all day using the Montree teacher dashboard. He cannot review agent output between runs. This handoff is the "hit-the-ground-running" doc for the post-refresh agent.
**Usage budget:** ~90% remaining at handoff time. Run hard, run parallel, don't burn it on planning.

---

## 🚨 OFF-LIMITS — TEACHER PRESENTATION SURFACES

Do NOT touch any file under these paths today. These surfaces are in active use during parent presentations:

```
app/montree/dashboard/**         (entire teacher dashboard tree)
app/montree/dashboard/present/** (album presentation route)
app/api/montree/photo-identification/**
app/api/montree/photo-audit/**
app/api/montree/media/**
app/api/montree/children/[childId]/**
app/api/montree/guru/corrections/**
lib/montree/photo-identification/**
lib/montree/work-matching.ts
components/montree/child/**
components/montree/photo-audit/**
components/montree/home/**
components/montree/onboarding/**
```

**Also off-limits** (would need real-device testing Tredoux can't do today):
- Tier 1.1 SW stale-while-revalidate API cache (biggest perf win remaining, but cross-user cache leak risk — needs iPhone testing)
- Tier 5.3 NoteField extract (touches child page)
- Any photo identification prompt / threshold / Pass 2b logic
- `app/api/montree/onboarding/voice/**` (touches voice onboarding flow)

**Hard gate:** before ANY commit, grep your file list against the off-limits paths. If any match, ABORT that agent's work — do not push.

---

## ✅ POSTURE FOR EACH AGENT

- **Read the audit doc** for your lane before any code. Each finding has a recommended fix shape.
- **Lint clean** at `--max-warnings=0` on changed files only. Zero NEW warnings. Pre-existing warnings on unchanged lines stay.
- **Pre-commit hook** runs strict i18n parity check — if you add a new `t()` key, you must backfill all 12 locales (en/zh/es/de/fr/pt/nl/it/ja/ko/uk/ru) or the commit blocks. Use `python3` script with hand-translated values for the 11 non-EN.
- **Commit message** starts with the lane code (e.g. `LANE A — Legacy API media auth + classroom-children leak`). Detailed body explaining each finding closed.
- **Push via Desktop Commander** per CLAUDE.md rule:
  ```
  cd ~/Desktop/Master\ Brain/ACTIVE/whale && rm -f .git/index.lock && git add <files> && git commit -m "..." && git push origin main
  ```
- **DB migrations:** number them 214+ (213 is taken by outreach work). Idempotent with BEGIN/COMMIT + IF NOT EXISTS. Flag as "pending Tredoux Supabase run" in commit message.
- **Self-audit checklist** at the bottom of this doc — every agent must pass before commit.

---

## 🛠 LANE DEFINITIONS

Each lane is independent and can run in parallel with the others.

### LANE A — Legacy API remaining

**Audit doc:** `docs/LEGACY_API_AUDIT.md`

**Findings to close:**
- `/api/media` route unauth — not in middleware admin-JWT matcher. Read `app/api/media/route.ts` and the middleware matcher in `middleware.ts`. Add to the matcher OR delete the route if it's truly dead.
- `/api/classroom/children` school-wide leak — `app/api/classroom/children/route.ts`. Returns all children school-wide regardless of classroom. Add classroom scoping.
- `/api/montree-home/*` dead stubs — service-role exposed. Grep for `/api/montree-home` route handlers. Delete if dead, gate if used.
- Hardcoded classroom_id in `/api/weekly-planning/upload` — Already auth-gated via middleware (`03da7a23`), but the body still hardcodes a classroom. Either derive from auth.classroomId or refuse if no body classroom_id.

**Files in scope:**
- `app/api/media/route.ts`
- `app/api/classroom/children/route.ts`
- `app/api/montree-home/**`
- `app/api/weekly-planning/upload/route.ts`
- `middleware.ts` (matcher list)

**Commit message starts with:** `LANE A — Legacy API hardening`

---

### LANE B — Whale-Class admin hardening

**Audit doc:** `docs/WHALE_CLASS_ADMIN_AUDIT.md`

**Findings to close (HIGH severity):**
- Video upload no MIME / size allowlist — `app/api/admin/video-manager/route.ts`. Add MIME allowlist (`video/mp4`, `video/webm`, `video/quicktime`) + size cap (500MB).
- Media-library upload no MIME — `app/api/admin/media-library/route.ts`. Same posture.
- Weekly-planning upload no size/type — `app/api/weekly-planning/upload/route.ts`. .docx MIME check + 50MB cap.
- JWT no role distinction — `lib/auth.ts`. Currently any admin JWT can hit any admin route. Add role claim and per-route role gating where applicable.

**Findings to verify (NOT FIX) — flag in commit body if confirmed:**
- WHALE_CLASSROOM_ID mismatch — search codebase for `bf0daf1b` and `51e7adb6-cd18-4e03-b707-eceb0a1d2e69`. CLAUDE.md says `51e7adb6...` is canonical. Report any `bf0daf1b` survivors. **DO NOT change them** — Tredoux needs to verify via Supabase query first. Just list the file:line references.

**Off-limits within Whale-Class:**
- Anything in `app/montree/dashboard/**` (the teacher surface — Whale Class admin is at `/admin/*`, different surface)
- Photo-audit / photo-identification (Tredoux uses these for confirmation flows during the day)

**Files in scope:**
- `app/api/admin/video-manager/route.ts`
- `app/api/admin/media-library/route.ts`
- `app/api/weekly-planning/upload/route.ts`
- `lib/auth.ts`

**Commit message starts with:** `LANE B — Whale-Class admin upload hardening`

---

### LANE C — Outreach final cluster

**Audit doc:** `docs/OUTREACH_AUDIT.md`

**Findings to close:**
- F-5.2 HIGH — bulk-reply Resend short-circuit. `app/api/montree/super-admin/demo-requests/bulk-reply/route.ts`. When Resend returns a quota-exceeded error mid-batch, stop the batch early and surface the count.
- F-6.1 HIGH — visitor-track geolocation inline. `app/api/montree/visitors/track/route.ts`. Currently runs geolocation lookup inline on every public POST — move to fire-and-forget OR drop if not used.
- F-7.7 MED — bulk-delete confirm. `components/montree/super-admin/LeadsTab.tsx`. Confirmation dialog text needs to say "N leads will be permanently deleted" with the actual count.
- F-7.9 MED — visitor `isp` schema rename. `montree_visitors.isp` column has a confusing name; rename via migration 214 or alias in the API response.
- F-8.1 through F-8.6 LOW — marketing/demo-request route polish items. Read the audit for specifics.

**Files in scope:**
- `app/api/montree/super-admin/demo-requests/bulk-reply/route.ts`
- `app/api/montree/visitors/track/route.ts`
- `components/montree/super-admin/LeadsTab.tsx`
- `app/api/montree/demo-request/route.ts`
- `app/api/montree/super-admin/outreach/route.ts`
- `app/montree/super-admin/marketing/**` (read-only for context; only fix specific findings)

**Commit message starts with:** `LANE C — Outreach final cluster`

---

### LANE D — Parent portal HIGH + MED

**Audit doc:** `docs/PARENT_PORTAL_AUDIT.md`

**Findings to close:**
- F-4.1 HIGH — invite-only sessions see Messages tab but the surface 403s. Hide the Messages link/tab when `session.parentId === null` (invite-only). `app/montree/parent/dashboard/page.tsx` + `app/montree/parent/messages/page.tsx`.
- F-1.5, F-1.6, F-1.7 MED — parent auth helper hardening. `lib/montree/parent-auth.ts`. Read findings.
- F-4.2, F-4.3, F-4.4 MED — messaging route correctness. `app/api/montree/parent/messages/**`.
- F-5.x MED — parent UI pages polish.

**Files in scope:**
- `app/montree/parent/**` (entire tree — this is the parent surface, separate from teacher dashboard)
- `app/api/montree/parent/**`
- `lib/montree/parent-auth.ts`
- `lib/montree/parent-messaging/**`

**Commit message starts with:** `LANE D — Parent portal HIGH + MED`

---

### LANE E — Agent dashboard hardening

**Audit doc:** `docs/AGENT_DASHBOARD_AUDIT.md`

**Findings to close:**
- HIGH — `tryAgentLogin` before `tryTeacherLogin` order. `app/api/montree/auth/unified/route.ts`. Session 86 already did principal-before-teacher; same pattern needed for agent-before-teacher when login code matches both.
- MED — suspended-cookie 365d. JWT TTL is currently 365 days; suspended agents with cached cookies still have access until expiry. Tighten to 7 days OR add server-side recheck on each request.
- MED — race rollback partial. `app/api/montree/try/instant/route.ts` referral redemption — re-read the audit; the original fix `439aeab1` may have left a window.
- MED — founder-agent ambiguity. Login resolver edge case.
- MED — i18n hardcoded. `app/montree/agent/**` has hardcoded English strings.

**Files in scope:**
- `app/api/montree/auth/unified/route.ts`
- `app/api/montree/try/instant/route.ts`
- `lib/montree/server-auth.ts`
- `app/montree/agent/**`

**Commit message starts with:** `LANE E — Agent dashboard hardening`

---

### LANE F — Financial routes AUDIT ONLY (no code changes)

🚨 **AUDIT-ONLY** — do not write to any files in scope. Write findings to `docs/FINANCIAL_ROUTES_AUDIT.md`.

**Surfaces to audit:**
1. `app/api/montree/super-admin/payouts/[id]/wire/route.ts` — Stripe Connect transfer to agent. Check:
   - Idempotency-Key on `transfers.create`
   - period_lock guard before the call
   - audit log written BEFORE the call (so a crash mid-transfer is investigable)
   - row-status update is atomic with the transfer success
   - rollback path on Stripe failure
2. `app/api/montree/cron/dunning-alipay/route.ts` and `app/api/montree/cron/generate-alipay-invoices/route.ts`:
   - Idempotency on Stripe `invoices.create`
   - OLDEST-unresolved-failure logic
   - Timezone day-counting (server vs school timezone)
   - Resend rate limit handling
3. `app/api/montree/super-admin/finance/export/route.ts` + `export/print/route.ts`:
   - Token-in-URL (violates architectural rule #123)
   - PII leak (parent emails, child names) in CSV
   - XSS in HTML export
4. `lib/montree/billing.ts` — `record-incoming-wire` + manual invoice helpers — same idempotency + period-lock audit.

**Output:** `docs/FINANCIAL_ROUTES_AUDIT.md` with finding table (severity / file / line / description / recommended fix). NO CODE CHANGES.

**If a finding is STOP-PUSH-EVERYTHING grade** (path to double-pay, misroute, write-to-wrong-school) — flag at the TOP of the audit doc with a 🚨🚨🚨 banner and a one-line summary. Tredoux will read this when he comes back.

**Commit message starts with:** `LANE F audit — financial routes (audit-only, no code changes)`

---

### LANE G — Impersonation hardening

**Surfaces:**
- `app/api/montree/super-admin/login-as/route.ts`
- `app/api/montree/super-admin/agents/[id]/login-as/route.ts` (if exists)

**Findings to check:**
- Audit log written BEFORE issuing the JWT (rule #117 — audit tables outlive every destructive action)
- Suspended agent / inactive principal should be refused
- Role on the issued JWT must be scoped to the impersonated user's role (not super-admin)
- 24h max TTL on impersonation JWT
- Banner / cookie marker so the impersonated session can be revoked centrally

**Files in scope:**
- `app/api/montree/super-admin/login-as/**`
- `lib/montree/server-auth.ts` (token issuance helpers)

**Commit message starts with:** `LANE G — Impersonation hardening`

---

### LANE H — Service worker + Web Vitals AUDIT ONLY

🚨 **AUDIT-ONLY** — do not modify the SW or Web Vitals routes. Write findings to `docs/SW_WEBVITALS_AUDIT.md`.

**Surfaces to audit:**
1. `public/montree-sw.js` — entire service worker
   - Cross-user cache poisoning (rule #2 from Session 76)
   - HTML cache vs API cache vs static-asset cache separation
   - Cache name version bump strategy
   - `event.respondWith()` scope
   - Offline navigation handling
2. `app/api/montree/perf/vitals/route.ts` — Web Vitals telemetry
   - Schema validation (rule #10 — all payload fields untrusted)
   - DoS surface (anonymous public POST)
   - SQL injection / XSS via tagged route names
   - Migration 196 column types

**Output:** `docs/SW_WEBVITALS_AUDIT.md` — finding table + recommended fixes.

**Commit message starts with:** `LANE H audit — SW + Web Vitals (audit-only)`

---

### LANE I — Mira SSE deep audit (audit-only)

🚨 **AUDIT-ONLY** — write findings to `docs/MIRA_SSE_AUDIT.md`.

**Surface:** `app/api/montree/agent/mira/route.ts` and the SSE tool-use loop.

**What to check:**
- Tool-use loop max-rounds enforcement
- Token budget enforcement
- 429 daily limit logic — Mira has a per-day cap; verify the count + reset boundary
- SSE retry-with-resume on VPN flap
- AbortController cleanup
- Cost-model assertion (rule #6)

**Output:** `docs/MIRA_SSE_AUDIT.md`.

**Commit message starts with:** `LANE I audit — Mira SSE (audit-only)`

---

## 🚀 PARALLEL DISPATCH ORDER

**Round 1 (dispatch 4 agents in ONE message — they run concurrently):**
- Agent 1 — LANE A
- Agent 2 — LANE B
- Agent 3 — LANE C
- Agent 4 — LANE D

Wait for all 4 to complete. Verify pushes landed on `origin/main` via `git log --oneline -10 origin/main`.

**Round 2 (dispatch 2 agents in parallel):**
- Agent 5 — LANE E
- Agent 6 — LANE G

Wait for both. Verify pushes.

**Round 3 (dispatch 3 audit agents in parallel — write-only to docs):**
- Agent 7 — LANE F (financial routes audit)
- Agent 8 — LANE H (SW + Web Vitals audit)
- Agent 9 — LANE I (Mira SSE audit)

These produce docs only. No code changes. No commits to main except the new audit-doc files.

**Round 4 (consolidate):**
- Read the 3 audit docs.
- If any STOP-PUSH-EVERYTHING findings, surface them at the top of the final session handoff.
- Update CLAUDE.md `Session 113 V3` block with everything landed.
- Final push.

---

## 🛡 SELF-AUDIT CHECKLIST (every agent must run before committing)

1. ✅ Did I read the audit doc for my lane first?
2. ✅ Are any of my changed files under the OFF-LIMITS list at the top of this doc?
   - If yes → abort, do not push.
3. ✅ Does `npx eslint --max-warnings=0 <changed files>` exit 0?
   - Pre-existing warnings on UNCHANGED lines may remain. Zero NEW warnings introduced.
4. ✅ Did I introduce any new `t()` key? If yes, did I backfill all 11 non-EN locales?
   - Run `node scripts/check-i18n-completeness.mjs --strict` — must pass.
5. ✅ Does my commit message start with `LANE X —` and include a detailed body explaining each finding closed?
6. ✅ If I added a migration, is it numbered 214+, idempotent, and flagged as pending Tredoux Supabase run?
7. ✅ Did I avoid touching any architectural rule listed in CLAUDE.md (rules #1-#138)?
8. ✅ For audit-only lanes (F, H, I) — did I write ONLY to a new `docs/<NAME>_AUDIT.md` and zero code changes?
9. ✅ Did I push via Desktop Commander `mcp__Desktop_Commander__start_process` with the exact command from CLAUDE.md?
10. ✅ After push, did I verify `git log --oneline -3 origin/main` shows my commit?

---

## 📦 TREDOUX-SIDE TASKS (carry-overs — Tredoux executes when back at desk)

These are NOT for the agent; they're for Tredoux:

1. **Run migrations 210 + 211 in Supabase SQL Editor** (carry-over from Session 113 V2). The SQL is in CLAUDE.md.
2. **Run migration 213** (outreach log retention + drip idempotency) in Supabase SQL Editor. SQL is in `migrations/213_outreach_log_retention_and_drip_uniqueness.sql`.
3. **Run any new migrations 214+** from this burn (e.g. visitor `isp` rename if Lane C added one).
4. **🚨 Railway region pin to Singapore** — biggest TTFB win for Asia user base. Do this AFTER the parent meeting ends, not between. The cutover gives a 1-2 min 503 window on the next deploy.
   - Railway dashboard → Settings → Region → Singapore → Save → next deploy lands there.
5. **Send the 5 Gmail drafts** (FAMM Argentina, Cambridge Montessori Global, Otari NZ, Lions Gate, Montessori Norge).
6. **Walk the 24-step verification checklist** in `docs/handoffs/SESSION_113_V2_BURN_HANDOFF.md` on production after the day's commits settle.
7. **Send HK accountant** `docs/finance/HK_FINANCIAL_ADVISOR_SUMMARY.md`.
8. **Send Wallex fapiao inquiry** — draft at `docs/finance/wallex-fapiao-inquiry.md`. Send when ready.

---

## ⚠️ IF SOMETHING GOES WRONG

- **Agent error mid-run** — that agent's work is lost. Move on to the next lane; don't retry the same one without a fresh prompt.
- **Lint fails on staged commit** — fix or revert. Do not bypass with `--no-verify`.
- **i18n parity check fails** — backfill all 11 locales before committing. Use hand-translated values via Python script (see Session 113 V2 example).
- **Push rejected (non-fast-forward)** — `git pull --rebase origin main && git push origin main`. Should be rare given parallel agents work on independent files.
- **Production 500 reported by Tredoux during the day** — STOP all parallel agents. Pull `git log`, find the offending commit, `git revert <sha>`, push. Do not start new agents until the revert lands.

---

## ✅ FINAL HANDOFF NOTES

- This doc is the source of truth for the autonomous burn. The post-refresh agent should read THIS first, then dispatch as described.
- CLAUDE.md is the architectural source of truth — read it for context but don't update until the final consolidation in Round 4.
- The 138 architectural rules in CLAUDE.md are non-negotiable. If a fix would require breaking one, surface it as a finding instead of breaking the rule.
- The user trusts the parallel-agent pattern. Default to "dispatch 4 in parallel" not "do 1 at a time."
- The user is in parent meetings all day. Don't expect interactive clarification — make conservative decisions and document them in the commit body.

**End of handoff.**
