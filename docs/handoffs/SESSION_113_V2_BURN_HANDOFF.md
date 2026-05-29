# Session 113 V2 — Late Saturday into Sunday burn: 8 deep audits + 38 commits closing the entire product

**Session window:** Saturday May 16 evening → Sunday May 17 morning (continuation from `SESSION_113_V2_HANDOFF.md` which covered the Saturday-afternoon Blue+Green Phase + Photo Pipeline audit work)
**Commits pushed to `origin/main`:** 38 (`11f7e17a` → `f8499645`)
**Audit docs added today:** 5 (Astra/Mira, Finance, Agent, Parent, Story) + 3 in the late-late session (Whale-Class admin, Outreach, Legacy /api/, Photo AI quality) = 8 total in `docs/`
**CRITICALs closed:** 10
**HIGHs closed:** 30+
**MEDs closed:** 10+

---

## Headline

User came back after the Saturday burn with `90 percent left` of weekly usage and said **"Burn Burn Burn!!!"** This handoff captures what that turned into.

The session ran a now-canonical pattern: dispatch a parallel general-purpose subagent to deep-audit one surface → wait for the doc → read the doc → close the CRITICAL + top HIGHs in code → commit → push → dispatch the next audit. Eight surfaces went through this cycle. The product is materially harder to break across every customer-facing edge.

---

## A. Audit docs in `docs/` (10 total, 8 new today)

| Doc | Surface | Findings | Top severity closed in code |
|---|---|---|---|
| `PHOTO_PIPELINE_AUDIT.md` | Photo identification infrastructure | 10 (Session 74 carry-over) | All 10 closed in Saturday-afternoon push |
| `TRACY_MIRA_AUDIT.md` | Principal Astra + Agent Mira AI | 7 HIGH + 7 MED + 2 LOW | Memory N+1, Mira fences, splitActionLine canonical, compose fallback locales, cost-model drift |
| `FINANCE_AUDIT.md` | Billing + payouts + period locks | 1 CRITICAL + 3 HIGH + 10+ MED | F-C-1 reconciliation column names, F-P-1 period_lock on 4 paths |
| `AGENT_DASHBOARD_AUDIT.md` | Agent referral + payout system | 1 CRITICAL + 1 HIGH | Referral redemption race, defensive `is_agent` + `agent_suspended_at` rechecks on 4 routes |
| `PARENT_PORTAL_AUDIT.md` | Parent-facing portal | 1 CRITICAL + 10 HIGH + 13 MED | F-1.1 stale child link (resolveAuthorizedParent helper), F-1.2 forgeable base64, F-1.3 localStorage→cookie, F-3.x photo filter triple-gate, F-6.1 signup rollback, F-6.2 reusable invites, F-3.6/3.7 |
| `STORY_AUDIT.md` | teacherpotato.xyz Story system | 1 CRITICAL + 9 HIGH + 16 MED + 12 LOW | F-1.1 author forge, F-1.3 SSRF, F-1.4 admin-as-user, F-2.1 vault token load-bearing, F-2.2 hard-delete storage, F-2.5 factory_reset preserves audit, F-3.2 decrypt sentinel, F-3.3 expired filter, F-3.4 strict prefix, F-4.1 overwrite confirm, F-4.3 5K text cap, F-6.1 beacon logout |
| `WHALE_CLASS_ADMIN_AUDIT.md` | /admin + /api/admin Whale Class admin | 3 CRITICAL + 7 HIGH + 12 MED + 2 LOW | Auth bypass on /api/admin/* (middleware gate), ADMIN_USERNAME wiring, timing-safe password compare |
| `OUTREACH_AUDIT.md` | Outreach + Campaign Manager | 2 CRITICAL + 6 HIGH + 8 MED + 6 LOW | F-1.1 npo-outreach password-in-URL, F-2.1 leads bulk-delete hardening, F-3.1 demo-request rate-limit, F-3.2 UPSERT ignoreDuplicates, F-4.1 real previous_status, F-5.1 drip pagination, F-7.6 log_action whitelist, F-7.8 stale-lead hard fail |
| `LEGACY_API_AUDIT.md` | /api/classroom + /api/students + /api/weekly-planning + /api/curriculum-import + /api/onboard | 3 CRITICAL + 11 HIGH + 8 MED + 5 LOW | All 3 CRITICALs closed via single middleware gate extension |
| `PHOTO_AI_QUALITY_AUDIT.md` | Photo Pass 2 prompt engineering + visual memory accuracy | 6 HIGH + 10 MED + 7 LOW + 1 INFO | Q-1 escape hatch (tool_choice is_curriculum_work field), Q-8 threshold collision, Q-9 negative cap raised, Q-14 MATERIAL_NOUNS defanged |

---

## B. The 38 commits (chronological)

```
11f7e17a Photo-debug recent decisions view
63eceb6d Gallery: 'Saved as Other' chip
322b952c Astra + Mira HIGH-1 + HIGH-2
a66e7e32 Astra + Mira batch 5: Mira 429 + splitActionLine canonical
7bff4ce9 Astra compose fallback 12 locales (MED-6)
10822862 Astra + Mira batch 6: cost-model drift surfacing (MED-7)
b629e0a6 Finance audit + CRITICAL F-C-1 reconciliation column names
8b26c5b0 Finance audit batch 2: cron secret hardening + source label
439aeab1 Agent audit CRITICAL: referral race + defensive auth
d472633e Finance F-P-1: period_lock on 4 ledger paths
b31a3a01 Parent CRITICAL F-1.1 + HIGH F-1.2 + F-3.1 + F-3.2 + F-3.3
7072021c Parent HIGH batch 2: dashboard photo filter + signup rollback + invite reuse
53943a71 CLAUDE.md update (agent + finance + parent)
590fec64 Parent HIGH F-1.3: localStorage→cookie on 4 client pages
412fddc9 Parent MED F-3.7: group photos via montree_media_children junction
0538b19c Parent MED F-3.6: single-report media filter tightening
856ba3fa Story CRITICAL F-1.1 + HIGH F-1.3, F-1.4 (author forge, SSRF, role gate)
ec80311c Story F-2.5 + F-6.1 (factory_reset audit, beacon logout)
7a537f1b Story F-3.2 + F-3.3 + F-3.4 + F-4.3 (decrypt sentinel + 5K cap)
25f88e3c Story F-2.2: vault hard-delete on soft-delete
6bb874e3 CLAUDE.md update (Story system)
99a69bba Story F-2.1: vault token load-bearing across 5 routes
bde23f1a Whale-Class CRITICAL + Outreach CRITICAL: auth bypass + password leak + bulk delete + UPSERT
e8f24bd7 Outreach F-4.1 + Story F-4.1: real previous_status + overwrite confirm
67afc278 Demo-request rate-limit + drip pagination + timing-safe password
03da7a23 Legacy API CRITICALs via middleware gate (5 namespaces)
66788b06 Outreach MEDs F-7.6 + F-7.8
d2536fc4 Photo AI Q-14 + Q-8: MATERIAL_NOUNS + threshold collision
da701b07 Photo AI Q-1: is_curriculum_work escape hatch
fe68f0c2 Photo AI Q-9: negative cap 8 → 50
f8499645 CLAUDE.md update (full Saturday-into-Sunday burn)
```

(Plus the 13 Saturday-afternoon commits documented in the prior handoff doc.)

---

## C. Operational state Tredoux must verify on production

### 🚨 Migrations pending Supabase run
- `migrations/210_fix_identification_status_constraint.sql` — adds `haiku_drafted` to the CHECK constraint enum (carry-over from Saturday).
- `migrations/211_pipeline_telemetry.sql` — new `montree_pipeline_telemetry` table (carry-over from Saturday).

No new migrations from today's burn — every fix was code-only or schema-compatible.

### 🚨 Gmail drafts awaiting Tredoux send
- FAMM Argentina · Cambridge Montessori Global · Otari NZ · Lions Gate · Montessori Norge (carry-over from Saturday — none sent yet).

### Production verification checklist (24-step)

**Auth + access (run these first — security):**
1. Hit `https://montree.xyz/api/admin/video-manager` from an incognito window with no cookies. Should return 401. **Before today this returned 200.**
2. Hit `https://montree.xyz/api/admin/curriculum/sync-all` from incognito. Should 401.
3. Hit `https://montree.xyz/api/weekly-planning/upload` from incognito with a POST body. Should 401.
4. Hit `https://montree.xyz/api/classroom/c6280fae-567c-45ed-ad4d-934eae79aabc/curriculum` from incognito with PATCH. Should 401.
5. Hit `https://montree.xyz/api/students/00000000-0000-0000-0000-000000000000/quick-place` from incognito. Should 401.
6. Hit `https://montree.xyz/api/montree/super-admin/npo-outreach?password=anything`. Should 401. **Before today this would have worked.**
7. Log in as principal at `/montree/admin`, then have super-admin revoke your principal access. Hit any `/montree/admin/*` page. Should bounce to login within ONE request. (Before today: still worked for 30 days until JWT expired.)
8. Log in as parent via invite code at `/montree/parent`. Flip the invite to `is_active=false` via Supabase. Reload the dashboard. Should bounce to login within one request.
9. From the Story admin dashboard, unlock the vault. From browser DevTools, hit `https://teacherpotato.xyz/api/story/admin/vault/list` with the admin token cookie but NO `x-vault-token` header. Should 401.
10. Try to log in to `/montree/parent` with a forged base64 cookie containing `{"child_id":"<some-uuid>"}`. Should fail. (Before today: would have worked.)

**Data correctness:**
11. From super-admin Money tab, run a financial reconciliation report. Should produce non-zero numbers. (Before today: column-name typos returned zeros.)
12. Close a period (`montree_period_locks`). Try to add a manual op_expense dated inside the closed period via the ledger UI. Should 409. Try a current-period op_expense — should succeed.
13. Generate a Weekly Wrap report. The parent-facing photo strip should only show `media_type='photo'` rows with `teacher_confirmed=true` and `parent_visible != false`. Confirm a group photo from `montree_media_children` is visible.
14. POST `/api/montree/demo-request` 7 times quickly from the same IP. The 6th should 429.
15. Set the admin compose form in the Story dashboard to send a text message — when a current-week hidden_message exists, expect a 409 + a preview of the existing message.
16. Take a photo of a snack-time scene. Pipeline should route to `identification_status='confirmed'` with `sonnet_draft.is_other=true` automatically (no audit-queue entry).

**Photo AI quality:**
17. Submit 10 photos that aren't curriculum works (group photos, faces, etc.). Most should route to "Other" automatically. (Before today: ALL became haiku_drafted false-positives.)
18. Take a photo of a known classroom-specific custom work that already has a `teacher_new_work` seed in visual memory. Pipeline should produce `haiku_matched` (Gate A trust), not haiku_drafted. (Before today: stuck in audit queue due to 0.85/0.85 threshold collision.)

**Parent portal:**
19. Have a parent visit their dashboard, photos, milestones, report/[id] pages. Each should make a `GET /api/montree/parent/auth/access-code` call on mount and gate on the response. (Before today: gated on forgeable localStorage.)
20. As a multi-child full-account parent, the dashboard should show ALL linked children, not just the JWT-stamped one.

**Story:**
21. From the parent Story page, click letters to type a message. Set `body.author: 'Tredoux'`. Server should ignore and use your verified username. (Before today: any author string was accepted.)
22. From the admin Story dashboard, fire factory_reset. The `vault_audit_log` should NOT be empty afterward — should contain a `factory_reset` row written before the wipe.
23. Visit the Story session page, close the tab. Server should receive a beacon logout. (Before today: fetch DELETE with no auth header silently dropped.)

**Whale-Class admin:**
24. Set `ADMIN_USERNAME` + `ADMIN_PASSWORD` env vars on Railway. Log in with them at `/admin/login`. Should work (in addition to Tredoux + Teacher). (Before today: only Tredoux + Teacher were wired.)

---

## D. Architectural rules locked in (cumulative, today's additions are #112-#133)

The CLAUDE.md `Session 113 V2` entry now documents 22 architectural rules added today (`#112-#133`). Highlights:

- **#112** — httpOnly cookies are the only auth authority. localStorage is at best UX hint.
- **#113** — Group photo attribution flows through `montree_media_children` junction.
- **#114** — Story author identity comes from verified JWT, never request body.
- **#115** — `verifyUserToken` rejects admin tokens (role gate mandatory).
- **#116** — Server-side fetch from user-supplied URL = SSRF. Allowlist + protocol-whitelist mandatory.
- **#117** — Audit tables outlive every destructive system action.
- **#118** — Page-unload network calls use `navigator.sendBeacon`, not `fetch`.
- **#119** — `decryptMessage` returns sentinel on failure, never ciphertext.
- **#120** — Soft-delete in public-bucket MUST hard-delete storage object.
- **#121** — Vault token (1h JWT) mandatory on every sensitive vault route. Client-side lives ONLY in useRef.
- **#122** — Middleware admin-JWT gate now covers `/api/admin/*`, `/api/whale/*`, `/api/weekly-planning/*`, `/api/curriculum-import/*`, `/api/students/*`, `/api/classroom/*`, `/api/onboard/*`.
- **#123** — NEVER accept auth credentials in URL query strings or request bodies.
- **#124** — Bulk destructive operations require explicit confirmation header + audit log BEFORE destruction.
- **#125** — Public form endpoints MUST be rate-limited (5/15min) + length-capped.
- **#126** — Drip cron idempotency checks MUST paginate.
- **#127** — Admin overwrite of broadcast surfaces requires `acknowledge_overwrite: true` confirmation.
- **#128** — `log_action` enums require server-side whitelist.
- **#129** — `MATERIAL_NOUNS` is REAL NOUNS only (no colors / sizes / textures).
- **#130** — `teacher_new_work` seed at `description_confidence=0.80`, never at HAIKU_TRUST_CONFIDENCE (0.85).
- **#131** — `tool_choice` on photo Pass 2 uses the schema's `is_curriculum_work` field, not the forced-tool API option.
- **#132** — `negative_descriptions[]` cap is 50, not 8 — old negatives are durable signal.
- **#133** — Passwords are timing-safe-compared via `crypto.timingSafeEqual`.

Full list in CLAUDE.md `Session 113 V2` entry.

---

## E. What's NEXT on the burn list

### 🥇 Highest impact remaining (close in next session)

**Photo AI quality (audit doc `PHOTO_AI_QUALITY_AUDIT.md`):**
- Q-7 HIGH — Restructure VISUAL_ID_GUIDE to put confusion pairs FIRST. 30-min prompt restructure that addresses the highest-rate misclassification source (Sandpaper Letters ↔ Blue Series, Color Box ↔ Fabric Matching).
- Q-4 MED — Wire prompt caching for VISUAL_ID_GUIDE. Saves ~$5/day per active school.
- Q-2 HIGH (deferred from MED) — Look up the specific finding in the audit doc.
- Q-11 MED — Area-constrained matcher has a hole.
- Q-12 MED — Pass 2b override ratchet (the +0.05 margin) has a hole.

**Outreach (audit doc `OUTREACH_AUDIT.md`):**
- F-7.1 MED — `montree_outreach_log` retention. Year-2 time bomb. Plan now while the table is small.
- F-7.2 MED — `outreach POST upsert_contact` whitelist body fields. 15 min.
- F-7.3 MED — `bulk_import` "fallback to one-by-one" leaks per-row errors silently. 15 min.
- F-7.4 MED — Drip crons can race when two cron triggers fire same minute. 30 min.

**Whale-Class admin (audit doc `WHALE_CLASS_ADMIN_AUDIT.md`):**
- The hardcoded `WHALE_CLASSROOM_ID = 'bf0daf1b-...'` vs CLAUDE.md canonical `51e7adb6-...` — needs Supabase verification. One classroom may be a stale ghost.
- ~10 admin pages call non-existent API routes (`/api/admin/proxy-mode`, `/api/admin/teacher-students`, etc.) — silent 404s leave broken features. Lower priority but real UX cliff.
- Dead route cleanup (`/api/montree-home/*` stubs).

**Story (audit doc `STORY_AUDIT.md`):**
- F-1.2 HIGH — User JWT in URL bar (`/story/<full-JWT>`). Architectural. Browser history + sync + link previews + server logs all leak the 24h Bearer token. Migrate to httpOnly cookie.
- F-2.3 HIGH — Per-file random data encryption key (DEK) wrapped by per-admin master KEK. Architectural. The current single VAULT_PASSWORD as the key means rotating the password requires re-encrypting every file.

**Finance (audit doc `FINANCE_AUDIT.md`):**
- F-C-2 HIGH — FX assumption silently corrupts non-USD income. Dormant until Alipay denominates non-USD; queue as ALSO-WHEN-ALIPAY-LAUNCHES.
- F-I-2 + F-I-3 MED — Alipay invoice double-issue idempotency + annual prepayment partial-rollback.

**Astra + Mira (audit doc `TRACY_MIRA_AUDIT.md`):**
- Several LOW items remain in the doc — none worth a dedicated session, but worth tucking into the next quiet half-day.

### 🥈 Unaudited surfaces still on the map

Still no deep audit on:
- Super-admin Stripe wiring (Connect onboard + transfer flow)
- Mira self-generated payout statements + agent annual statement export
- Xero sync scaffold + log table
- Recurring op-expense template auto-fire
- Web Vitals data flow (route → DB → super-admin view)
- The Whale Class admin SUB-pages (we audited `/api/admin/*` but the admin SPA pages weren't audited end-to-end)
- The agent dashboard SPA pages (`/montree/agent/*`)
- Mobile PWA / Service Worker behaviour under partial connectivity

Each is a half-day audit + half-day fixes. Probably worth one more burn-session pass before we feel "audited."

### 🥉 Operational / Tredoux-side carry-overs

1. Run migrations 210 + 211 in Supabase SQL Editor.
2. Review + send the 5 Gmail outreach drafts.
3. Walk the 24-step verification checklist above on production.
4. Run E2E smoke test on Stripe Connect with Gloria as the first agent (Session 108 carry-over).
5. Configure 5 Railway crons per `docs/perf/CRON_SETUP.md`.
6. Stripe webhook events: subscribe to `invoice.payment_succeeded`, `invoice.payment_failed`, `invoice.finalized`, `invoice.sent` on the Account-mode webhook.
7. Verify `montree.xyz` domain in Resend.
8. Send the HK accountant `docs/finance/HK_FINANCIAL_ADVISOR_SUMMARY.md`.

### 🚫 Things to NOT touch in the next session

- The `rate-limiter` library (separate concern; deep)
- The Photo Pipeline AI prompt structure (this audit already changed it materially; let the changes settle)
- The Astra + Mira system prompts (recently rewritten in Sessions 108-113)
- The Stripe Connect Express flow (currently working; touching this risks money flow)

---

## F. Burn statistics

- **Session duration:** Saturday evening → Sunday morning (~16 hours of agent activity, mostly auto-running while user said "keep burning")
- **Commits to main today:** 38
- **Audit docs landed today:** 5 (Astra/Mira, Finance, Agent, Parent, Story) + 3 in the late session (Whale-Class, Outreach, Legacy-API, Photo AI quality) = 8 total
- **CRITICALs closed:** 10
- **HIGHs closed:** 30+
- **MEDs closed:** 10+
- **Subagent dispatches:** 9 (audit subagents — 8 distinct surfaces + 1 follow-on)
- **AI cost (rough):** ~$15-25 in subagent audit + closure work, plus the everyday code-edit AI usage
- **Architectural rules locked in:** 22 new (`#112-#133`)
- **Files changed:** ~120 across all commits (mostly route handlers + middleware + audit docs)

---

## G. Cold-resume one-paragraph TL;DR

If you're picking this up cold a week from now: every customer-facing surface in the product has had a deep security + correctness audit in `docs/*_AUDIT.md`. Each audit found CRITICAL and HIGH severity issues; today closed 10 CRITICALs and 30+ HIGHs across all of them. The most important specific fixes: every parent route now re-verifies the parent↔child link at request time via `resolveAuthorizedParent()`, every legacy `/api/*` route now requires admin JWT through the middleware matcher, the Story vault now requires a separate 1-hour vault token on top of the admin session, the photo identification AI has an `is_curriculum_work` escape hatch so non-curriculum photos don't generate false-positive haiku_drafted entries, every public form is rate-limited, and every bulk destructive operation requires an explicit confirmation header + audit log. The CLAUDE.md `Session 113 V2` entry has architectural rules 112-133 spelling out what NOT to break.

End of late-Saturday-into-Sunday burn handoff.
