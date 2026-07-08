# SESSION HANDOFF — Jul 8, 2026 — Partner Program Mint Tool + First Partner (Tatenda)

**Orchestration: Cowork/Fable advising, Opus building, Sonnet reviewing/running (Tredoux directive: Fable does no grunt work).**
**Commits: `337033ec` (feature, 12 files) + `5c578e92` (CLAUDE.md). Migration 290 RUN in Supabase (Tredoux confirmed). Deployed + runtime-verified on montree.xyz. ESLint 0 errors, scoped tsc clean.**

## 1. What this is

One super-admin form that mints everything an underprivileged-school partner needs, in one shot:
1. **Free-for-life signup link** — FND- code whose redemption grants the partner's school permanent Premium (Sonnet) + $0 billing, automatically.
2. **Referral promo link** — `<NAME>-XXXX` code at configurable share (default **20%** — Tredoux's ruling for this track, supersedes the Jul-7 10%). Schools signing up via `?ref=` are attributed to the partner.
3. **Agent dashboard login** — code + login_url, shown ONCE.

This is THE standing tool for all partner onboarding. Never hand-stitch the three underlying calls again.

## 2. How to use it

**UI:** super-admin → 🚀 Founding 100 tab → "🤝 Mint a partner package" card → partner name / email / school name / share % → copy the three artifacts.

**API:** `PATCH /api/montree/super-admin/founding` (header `x-super-admin-token`, same auth pattern as `scripts/outreach-status.py` — token cached `/tmp/montree_super_admin_token.json`, browser UA for Cloudflare, auth rate-limit 5/15min fail-closed):
```json
{ "action": "create_partner", "partner_name": "...", "email": "...", "school_name": "...", "revenue_share_pct": 20 }
```
Returns: `signup_code`, `signup_link`, `referral_code`, `referral_link`, `agent_id`, `agent_login_code` (ONE-TIME — null if agent already had a login; reissue via Referrals tab 🔑), `login_url`, `already_existed`, `already_redeemed`, `note`.

## 3. Mechanics (do not re-litigate)

- **Migration 290** (`migrations/290_partner_grant_type.sql`, RUN): `grant_type` ('founding_3_life' default | 'partner_free_life') + `partner_agent_id` on `montree_founding_waitlist`. Additive, idempotent.
- **Redemption** (`app/api/montree/try/instant/route.ts` → `redeemFoundingCode`): when `grant_type='partner_free_life'` → stamps `founding_member=true`, `billing_override_usd=0`, `billing_override_note='Partner — Premium free for life'`, `trial_ends_at=+30d`, and calls `applyAiTier(supabase, schoolId, 'sonnet', ...)`. Tier-grant failure is NON-FATAL to signup (logged loud; fix via schools PATCH). Founding-ignores-referral preserved.
- **Shared libs (anti-drift refactor):** `lib/montree/billing/apply-ai-tier.ts` (used by BOTH schools PATCH `ai_tier` and partner redemption — the two grants can never diverge; preserves the pre-refactor asymmetry: feature-flag write failure fatal, budget write non-fatal); `lib/montree/referral/create-agent-code.ts` (referral-codes POST + create_partner; 2dp pct rounding lives here); `lib/montree/referral/issue-agent-login.ts` (agents/[id]/login POST + create_partner). Old routes delegate, byte-equivalent responses.
- **$0 checkout guard** (`app/api/montree/billing/checkout/route.ts`): `billing_override_usd===0` → clean 400 "This school is on a $0 plan — no checkout needed." BEFORE Stripe price resolution, because `getOrCreateOverridePriceId()` returns null at ≤0 cents → 500. Exact `=== 0` check — null/undefined/$3 founding unaffected. NEVER remove.
- **42703-safety:** `grant_type` reads in try/instant + founding GET fall back to the legacy select ONLY on missing-column errors (`code==='42703'` / message contains 'grant_type') — pre-migration deploys degrade to founding_3_life behavior. `create_partner` itself hard-requires the migration (clear "run migration 290" 500).
- **Re-mint semantics (fresh-eyes review catches, fixed pre-ship):** re-running create_partner on an existing email is CORRECTIVE — updates the pending referral code's pct + agent display name and the waitlist row's school/contact names to the submitted values (already-redeemed schools keep their locked-in pct by design). If the email's code was ALREADY REDEEMED: the free-for-life grant is applied DIRECTLY to the redeemed school (loud 500 on failure — super-admin path, not signup) and the response carries `signup_link: null` + `already_redeemed: true` + note — never a dead link reported as success.
- **resolve-model untouched:** permanent Premium works because the `ai_tier_sonnet` feature flag outranks trial/subscription state in `lib/montree/reports/resolve-model.ts`.

## 4. First partner minted (LIVE, Jul 8)

Tatenda / tatenda@montessorionwheels.org / "Montessori on Wheels":
- signup: `FND-9HXQH9` → https://montree.xyz/montree/try?founding=FND-9HXQH9 (NOT yet redeemed)
- referral: `TATENDA-8VA6` @20% → https://montree.xyz/montree/try?ref=TATENDA-8VA6
- agent_id `fef4ed1c-5ab6-41bf-9205-493d5ebf069e`, login code `8EWWUJ` (delivered to Tredoux; unrecoverable — reissue via Referrals tab 🔑 if lost)
- waitlist row `db52a14f-8b30-43e5-8723-58c71966ce87`, `grant_type='partner_free_life'` verified live; both links returned 200.

Rules told to Tredoux: partner's OWN school uses the founding link, never their own referral link; commission dashboard numbers auto-populate ONLY from Stripe `invoice.paid` → `montree_finance_transactions` → payout calculator — off-platform billing needs manual tracking; `revenue_share_pct` locks per-school at redemption.

## 5. Incident resolved + open items

- **✅ Migration 269 corruption (Jul-6 open item):** `migrations/269_lyf_coach_billing.sql` had been overwritten in the working tree with env content including real-looking `STORY_JWT_SECRET` + `STORY_DIARY_KEY` values. Restored via `git checkout --` before the feature commit; secrets never committed. **⏳ Tredoux owes: rotate those two Story secrets** (they sat on disk in a tracked file).
- **⏳ Verify on first real redemption:** when Tatenda signs up, confirm the school row gets `billing_override_usd=0` + `founding_member=true` and `ai_tier_sonnet` feature flag (Premium surfaces work, no 402), and the FoundingTab row shows the 🤝 FREE FOR LIFE badge.
- **⏳ Working-tree strays (pre-existing, untouched):** `docs/MONTREE_SOCIAL_PLAYBOOK.md` (uncommitted Jul-1 work), `.diag.mjs`, `coach_uploads.patch`, `social/`, `docs/photo-id/`, `lyf-coach-*.md`, `tsc-docs.tmp.json`, `tsconfig.scoped.tmp.json`, `verify_seed_tmp*.mjs`, plus gitignored `tsconfig.scope-partner.json`/`tsconfig.scopecheck.json` (sandbox couldn't unlink — delete via Desktop Commander when convenient).
- **Not done (documented, deliberate):** `billing.ts::setSchoolAiTier` (Stripe webhook copy) NOT refactored into `applyAiTier` — hot webhook path, out of scope; noted in apply-ai-tier.ts.
