# Session 110 Handoff — Agent self-service payout-method switch

**One commit shipped.** Closes the friction Bayan would have hit otherwise: agents in Stripe-unsupported countries no longer need to message Tredoux to be flipped to manual_wire. They do it themselves, save their bank details once, and their /payouts page renders the manual-wire panel without any human round-trip.

> Session 109 was the architecture. This is the UX closing piece.

---

## What landed

### New route: `PATCH /api/montree/agent/payout-method`

Agent flips their own `payout_method` and provides bank details. Mirrors super-admin `payout-config` PATCH route but with agent-side auth (`verifySchoolRequest` + `role === 'agent'`) and a guardrail.

**Guardrail (rule #70 mirror, hardened in this session):**
- Refuses 409 if agent is already verified with Stripe (`charges_enabled || payouts_enabled`).
- Returns `error: 'verified_stripe_blocked'` so UI can show the friendly explanation instead of generic red error.
- Verified-agent flips still have to go through super-admin (who can reject the Stripe account in Dashboard first to avoid divergence).

**Validation:**
- ALLOWED_METHODS check (stripe_connect / manual_wire only)
- 4KB cap on `manual_payout_details` JSONB (matches super-admin)
- When method is or remains `manual_wire`, requires at least `account_number` OR `iban` — prevents empty-object submissions

**Audit log:**
- Fire-and-forget `logAgentAudit` with `actor_role='agent'` + `self_service: true` flag
- Distinguishes from super-admin-initiated changes (which use `actor_role='super_admin'`)
- IP + User-Agent captured

**Also exposed:** `GET /api/montree/agent/payout-method` — convenience read returning agent's own config + a derived `is_stripe_verified` flag. Not used by the page yet (which reads the existing `/api/montree/agent/payouts`), but useful for future tools.

### UI on `/montree/agent/payouts`

**Three new entry points to the modal:**

1. **Unsupported-country friendly banner** — when the agent picks ZA / unsupported country and submits to Stripe, the server returns `country_unsupported: true`. Instead of red error → amber banner with body copy *"Stripe doesn't cover ZA. No problem — we'll wire your monthly commissions directly via SWIFT / Wise instead. Add your bank details below and you're set."* and a green "Add bank details for manual wire" CTA. Replaces the old "reach out to Tredoux" dead end.

2. **Discreet "My country isn't here" link** — under the country picker. For agents who already know their country isn't supported (China, Argentina, etc.) and don't want to even attempt the Stripe flow. One tap to the modal.

3. **"Update bank details →" edit link** — appears on the existing manual_wire panel when details are on file. Pre-fills the modal with current values. Lets manual_wire agents update their bank info without messaging Tredoux.

**Modal (friendly fields, not raw JSON):**
- Account holder name (required) — "Exactly as on your government ID"
- Bank name (required)
- Account number / SWIFT / Branch code / Branch name (4-col grid)
- IBAN (EU agents) / Routing # (US agents) (2-col grid)
- Currency / Country (2-col grid)
- Notes (optional textarea)
- Mobile-first sizing (`text-base sm:text-sm` on every input + 16px textarea) — prevents iOS keyboard zoom-on-focus
- 44pt mobile tap targets on Cancel + Save buttons
- Click-outside to close (when not submitting)
- Error message stays visible if save fails (e.g. verified-Stripe-blocked)

**Empty-state CTA** — when an agent's row already has `payout_method='manual_wire'` but no details on file (e.g. Tredoux flipped them via super-admin but hasn't entered bank info yet), the "No bank details on file yet" amber message now ships with an "Add bank details" green button instead of "send your details to Tredoux."

### Updated copy

The manual_wire panel footer text changed from:
> "These details are visible only to Tredoux (super-admin) and you. To update them, message Tredoux from the "Tredoux" tab in the nav — he'll update on his end."

to:
> "These details are visible only to Tredoux (super-admin) and you. Updating them here saves directly — no need to message anyone."

---

## Architectural rules (cumulative — adds #79)

**79. Agents self-service their own payout method UNLESS they're verified with Stripe.** The `PATCH /api/montree/agent/payout-method` route accepts agent-initiated flips to manual_wire + bank details edits. Verified-Stripe agents (`charges_enabled || payouts_enabled`) get 409 — those flips still go through super-admin to ensure the Stripe account is rejected first and system state doesn't diverge. Audit log uses `actor_role='agent'` + `self_service: true` to distinguish from super-admin changes.

Rules #62–78 from Session 109 carry over unchanged.

---

## Files changed (2 commits)

**Self-service build (commit 1):**
- NEW `app/api/montree/agent/payout-method/route.ts` (223 lines) — GET + PATCH with guardrail, validation, audit log
- MODIFIED `app/montree/agent/payouts/page.tsx` — modal, friendly banner, edit link, 3 entry points

---

## Audit trail

Three rounds, all fixes shipped:

| Round | Caught | Fix |
|---|---|---|
| 1 | TS 5.x narrowed `supabase.update(updates)` to `never` when supabase comes from helper | Cast `updates as never` (runtime payload unchanged, matches super-admin pattern) |
| 2 | iOS keyboard zoom-on-focus — all 11 inputs + textarea were `text-sm` (14px), violating Session 106 rule #44 | Bulk-replaced to `text-base sm:text-sm` via Python script |
| 3 | Form missed `routing_number` for US-agent edge case (super-admin can put it in via raw JSON, agent edit would silently strip it) | Added Routing # field next to IBAN in a 2-col grid |

Lint clean (`--max-warnings=0` exit 0). TypeScript clean on both files (rest of project has pre-existing unrelated errors).

---

## How to verify on production (after Railway deploys)

**Test 1 — Unsupported-country friendly flow (Bayan's case):**
1. Log in as agent without Stripe Connect setup
2. Visit `/montree/agent/payouts`
3. Pick "South Africa" from country dropdown
4. Click "Set up payouts now"
5. Expect: amber banner "Stripe doesn't cover ZA…" + green "Add bank details for manual wire" CTA
6. Click CTA → modal opens with Country prefilled as "ZA"
7. Fill name + bank + account number + currency
8. Click Save bank details
9. Expect: modal closes, page reloads, hero copy switches to manual wire mode, "Bank details on file" section appears with the entered values

**Test 2 — Discreet escape hatch:**
1. Same agent, no Stripe account
2. Don't pick a country
3. Click the small "My country isn't here — set me up with manual wire instead →" link below the picker
4. Expect: modal opens with empty Country field

**Test 3 — Edit existing details:**
1. Manual wire agent with details on file
2. Visit `/montree/agent/payouts`
3. Click "Update bank details →" under "Bank details on file"
4. Expect: modal opens with all current values prefilled
5. Edit a field, save
6. Expect: page reloads, "Updated [today]" badge appears, edited value shown

**Test 4 — Verified-Stripe guardrail:**
1. Agent with Stripe Connect verified (`charges_enabled` or `payouts_enabled` true)
2. Manually craft a PATCH request via DevTools console:
   ```js
   fetch('/api/montree/agent/payout-method', {
     method: 'PATCH', headers: {'Content-Type': 'application/json'},
     body: JSON.stringify({ payout_method: 'manual_wire', manual_payout_details: { account_number: 'X', account_holder_name: 'X', bank_name: 'X', country: 'XX' }})
   }).then(r => r.json()).then(console.log);
   ```
3. Expect: 409 + `error: 'verified_stripe_blocked'`

**Test 5 — Mobile iOS keyboard:**
1. Open `/montree/agent/payouts` on iPhone
2. Open the modal
3. Tap "Account holder name" input
4. Expect: keyboard appears WITHOUT page-zoom. Cancel/Save buttons remain accessible.

**Test 6 — Audit log:**
After Test 1, check super-admin Referrals tab → "📋 Recent agent activity":
- Expect new row: `agent_payout_method_changed` with `actor_role: 'agent'` + `details: { new_method: 'manual_wire', self_service: true }`

---

## Bayan's onboarding — now even easier

The Session 109 handoff said: *"Super-admin → Referrals tab → click the 💸 button on Bayan's row → modal opens. Select Manual wire radio. Paste her bank info as JSON."*

After this session, you can ALSO just:
1. Have Bayan log in (her agent code from Session 109)
2. She visits `/montree/agent/payouts`
3. She picks ZA → friendly banner appears → she clicks CTA → fills bank details → done

You're out of the loop. The audit log still shows you what happened (`actor_role='agent'` + `self_service: true`), and the Stripe account she had (if any) is unaffected — she just needs you to reject it manually in Stripe Dashboard for cleanup. Worth doing tonight if she's keen.

---

## What's NOT in this session (deferred unchanged from Session 109)

- Wallex CSV upload + `montree_bank_statements` table (half-day, finishes B4)
- ReferralsTab 📋 tax-form button + modal (30 min UI on top of B5 API)
- Real Xero API calls in `scripts/sync-to-xero.mjs` (one-line flip after accountant)
- Phase A operational setup (Xero account, accountant, env vars)
- Mira + Astra AI tool extensions (Phase 4.7 + 4.8)
- Translation sweep (72 pages identified Session 108)
- i18n batch for new agent/finance strings

---

## Next session priorities (ordered)

1. **Bayan onboarding** — now a 5-minute self-service flow on her end after you:
   (a) Reject her HK Stripe account in Stripe Dashboard
   (b) Run the SQL to clear her stale `stripe_connect_*` columns (in Session 109 handoff)
   (c) Send her the agent login code
2. **Walk the 11-step smoke test** from Session 109 handoff (this session adds Tests 1-6 above on top)
3. **ReferralsTab 📋 tax-form UI** — 30 min, builds on B5 API from Session 109
4. **Wallex CSV upload + bank_statements** — closes the third leg of reconciliation
5. **Phase A operational setup** — Xero account, accountant
