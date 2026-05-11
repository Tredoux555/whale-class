# Montree Limited — Summary for HK accountant

**Entity:** Montree Limited (HK private company)
**CR/BR:** 80261361
**Director / 100% beneficial owner:** Tredoux Willemse
**Reporting currency:** USD (base) — HKD wallet, multi-currency wire-in
**Status:** Live revenue from May 10, 2026 onward

---

## Business model in one paragraph

Montree is a SaaS product for Montessori schools. Schools pay **$7 per active student per month** via Stripe. Montree spends that money on three things: (1) AI infrastructure (Anthropic + OpenAI APIs), (2) Stripe processing fees, (3) revenue-share commissions to referral agents. What's left is operating margin.

---

## Revenue

| Item | How it works |
|---|---|
| **Pricing model** | Flat $7 USD per active student per month. No tiers, no annual prepay, no per-feature pricing. 30-day trial, no card required. |
| **Quantity** | Stripe subscription quantity = `montree_children WHERE is_active=true` for the school. Quantity syncs automatically when students are added/removed. |
| **Billing rail** | Stripe (live mode). Stripe deducts its fee at the source; net cash lands in our HKD wallet at Airwallex via Stripe payout. |
| **Currency exposure** | All invoicing in USD. Stripe wires USD → Airwallex → DBS HK. FX from USD to HKD happens at Airwallex spot at wire time. |
| **Recognition** | Monthly subscription, recognised as earned each month. Stripe is the source of truth — every charge has a `stripe_invoice_id` we can tie back. |

---

## Direct costs (cost of revenue)

These are the costs Montree must pay to deliver the service. They scale directly with usage.

| Item | Vendor | Recognition | Notes |
|---|---|---|---|
| **AI inference — Anthropic** | Anthropic, Inc. (USD) | Per-call, accrued as used | Sonnet + Haiku models. Captured live in `montree_api_usage` table per school. |
| **AI inference — OpenAI** | OpenAI, LLC (USD) | Per-call, accrued as used | Whisper (transcription) + occasional GPT calls. Same ledger. |
| **Stripe processing fee** | Stripe Payments Europe / equiv. | At time of charge | 2.9% + $0.30 USD per successful charge. Captured per-invoice from Stripe's webhook. |
| **Hosting / infra** | Railway (USD subscription) | Monthly fixed | Hosting + Postgres mirroring; flat ~$20–50/month at current scale. |

Together these are roughly 8–20% of gross revenue depending on schools' AI tier and student mix.

---

## Commissions (referral agents)

This is the line item with the most accounting nuance.

| Item | Treatment |
|---|---|
| Each school is referred by an agent (e.g. Gloria) | Yes |
| Agent earns a fixed % of **net revenue** from each school they referred | Yes — 50% in Gloria's case, locked at code-issue time |
| **Net** is defined as: gross − Stripe fee − Anthropic cost − OpenAI cost | Yes |
| Negative net → agent's share is $0 (never clawed back) | Yes |
| Payment rail to agent | Stripe Connect Express → agent's local bank |
| Frequency | Monthly, on the 1st of the following month |
| 1099 / equivalent reporting | Stripe Connect handles this automatically per agent's jurisdiction |

**Question for you (Q1):** Do you classify these as **cost of sales** (because they're variable, directly tied to revenue per school) or as an **operating expense** (sales/marketing commission)? Different classifications can materially change gross margin presentation. My preference is cost-of-sales because they're revenue-linked and unavoidable — but happy to follow your guidance.

---

## Operating expenses (non-revenue-tied)

- Tredoux's own salary / drawings (currently $0 — early stage)
- Tools & subscriptions (design tools, AI tools beyond infra, etc.)
- HK corporate secretarial fees (Richful Deyong, annual)
- HK profits tax (when we file, due to be the second-year filing)
- Marketing spend (currently $0 organic only)

---

## Multi-currency picture

| Currency | Source | Destination |
|---|---|---|
| USD | Stripe revenue (schools pay in USD) | Stripe USD balance → Airwallex HKD account |
| HKD | Airwallex wallet (Stripe payouts land here) | DBS HK Limited account (Montree Limited, 016-478-7949855392) |
| USD | Anthropic / OpenAI / Railway billing | Paid from Stripe USD balance (where possible) or HKD converted back |
| Various | Stripe Connect payouts to agents | Stripe handles FX from our USD balance to agent's local currency |

**Question for you (Q2):** What's the cleanest treatment of the USD-held funds for accounting purposes? Should we book the USD wallet at Stripe as a separate cash account in USD, then translate to HKD at month-end at spot? Or convert immediately on receipt?

---

## What's in the ledger right now

There's a single Postgres table `montree_finance_transactions` that captures every monetary event:

- **`income`** rows: one per Stripe `invoice.paid` event, in original currency + USD-equivalent
- **`direct_cost`** rows: one per AI API call (aggregated daily) + one per Stripe fee per invoice
- **`commission`** rows: one per agent payout calculation, monthly
- **`operating_expense`** rows: manual entries for hosting, tools, etc.
- **`fx_adjustment`** rows: when wire-out FX differs materially from spot

Every row has: `source_ref` (Stripe invoice ID or API call ID), `original_currency`, `original_amount`, `fx_rate`, `usd_amount`, `category`, `school_id` where applicable, `agent_id` where applicable, `reported_at`. Unique constraint on `(source, source_ref)` so replays are idempotent.

---

## Monthly export pack (what I can produce on demand)

When you ask for a month-end pack, the system can generate:

1. **P&L (CSV + PDF)** — gross revenue, direct costs broken down, commissions, operating expenses, margin
2. **Per-school revenue (CSV)** — each school, gross, AI cost, Stripe fee, net, agent share
3. **Per-agent commission (CSV)** — each agent, schools they referred, monthly share earned, payout status
4. **Stripe reconciliation (CSV)** — every Stripe invoice + fee + payout in the month with reference IDs
5. **JSON ledger backup** — full `montree_finance_transactions` for the month, for archival

**Question for you (Q3):** What formats are easiest for you to import into your books? CSV + PDF? Excel? Direct Xero/QuickBooks export?

**Question for you (Q4):** What cadence do you want — monthly, quarterly, or both?

**Question for you (Q5):** Any HK-specific items I should capture differently (e.g., stamp duty notes, related-party transactions, anything for two-tier profits tax)?

---

## Year-end specifics for HK

- Financial year-end: Tredoux to confirm (default would be 31 March or 31 December)
- Need to file: profits tax return + audited accounts (HK requires statutory audit for all PLCs/Limiteds)
- Auditor: Richful Deyong is currently company secretary; do you recommend they audit too, or independent auditor?

---

## Open questions summary (numbered for your reply)

1. **Commission classification** — cost of sales vs operating expense?
2. **USD-held funds** — separate USD cash account translated at month-end, or convert on receipt?
3. **Export format preferences** — CSV/Excel/PDF/direct accounting system?
4. **Cadence** — monthly, quarterly, or both?
5. **HK-specific items** — anything to capture differently for tax/audit?
6. **Currency for P&L presentation** — USD (matches operations) or HKD (matches statutory entity)?
7. **Year-end** — Tredoux to confirm financial year-end date; you to confirm if there's a preference.
8. **Auditor** — Richful (current sec) or independent?

---

## What's coming next on the system side

Two pieces of build are still ahead:

- **Phase 5 — Payout calculator** (~1.5 days of build): an idempotent monthly job that aggregates `montree_finance_transactions` per school per agent and writes a payout row. This is what triggers the Stripe Connect wire-out to the agent.
- **Phase 6 — Money tab in super admin** (~2–3 days of build): the dashboard view of all the above, with the export-pack generators built into it. Right now everything's queryable via Postgres but no UI surface.

Both unblocked since Stripe is live (May 10, 2026). Targeting completion in May.

---

**Reply with your answers to the numbered questions and I'll wire the categorisation into the system so every future month's pack matches your books.**
