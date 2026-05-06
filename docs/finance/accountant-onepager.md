# Montree — Information for Accountants

**Prepared by:** Tredoux Willemse
**Banking:** Wallex multi-currency account (Hong Kong)
**Books base currency:** USD
**Reporting cadence:** Monthly export, plus year-end pack

---

## What Montree is

Montree is a SaaS subscription product for Montessori schools. Customers (schools) pay a per-student monthly fee. Revenue is recurring. There is no inventory, no physical product, no shipping. The business is operated solo at present and is being built up to scale.

## Revenue model

- **Pricing:** USD $7 per active student, per month.
- **Billing:** Monthly recurring, charged via Stripe. Each school is a single subscription whose amount equals `student_headcount × $7`.
- **Trial:** Schools start with a 30-day free trial. Trials are not billed and do not appear in revenue until the first paid month.
- **Refunds / cancellations:** A school that cancels mid-month is pro-rated by Stripe; the refunded amount is recorded as a negative line in the same month it occurred.

## Money flow

```
School ─── Stripe (card billing) ─── Wallex HK (bank) ─── Tredoux operates from here
                                          │
                                          ├── Pays software costs (Anthropic, OpenAI, hosting, etc.)
                                          ├── Pays referral agents (see below)
                                          └── Owner draw / retained earnings
```

Stripe deposits collected revenue (less Stripe fees) into the Wallex account, in USD. From Wallex, all expenses and partner payouts are made.

## Cost categories

Montree's costs fall into three buckets, and the export distinguishes them so they can be classified appropriately for HK profits-tax purposes:

**1. Direct cost of revenue (variable, scales with usage)**

These are costs incurred per school, per month, that wouldn't exist without that school being a customer. Tracked in real time per school.

- Anthropic API usage (Claude — primary AI provider for product features)
- OpenAI API usage (Whisper transcription, smaller text tasks)
- Stripe processing fees (typically ~2.9% + $0.30 per transaction)

**2. Referral commissions (variable, contractual)**

Montree runs a referral programme. Selected agents (teachers, training centres, consultants) are issued a unique code that they share with prospect schools. When a school redeems an agent's code at signup, that school is permanently linked to that agent. Each month, the agent receives a configurable percentage (between 10% and 50%, negotiated per agent) of the **net profit** from that school.

- **Net profit for share calculation** = School's monthly subscription − Direct cost of revenue (Anthropic + OpenAI + Stripe fee) attributable to that school.
- **Agent share** = Net profit × agreed percentage.
- **If net profit is negative** (rare; would indicate an extreme AI usage month): agent receives zero, no clawback.

Agents are paid monthly via Stripe Connect Express, which deposits directly into the agent's bank or supported wallet. Stripe Connect handles tax-form generation (1099 for US, equivalents for other jurisdictions).

**Question for you:** For HK profits-tax purposes, should referral commissions be classified as a **cost of sales** (deducted before gross profit) or as an **operating expense** (deducted after gross profit)? Both are defensible; we'd like your guidance.

**3. Operating expenses (fixed or semi-fixed)**

These are general costs of running the business, not tied to any specific school.

- Hosting (Railway)
- Database (Supabase)
- Domain registration
- Email service (Resend)
- Software subscriptions (e.g. Canva, AI tools, design tools)
- Owner time / salary (if paid out)
- Any other overheads (legal, professional fees, banking fees)

These are entered manually in Montree's super admin Money tab and exported alongside the variable costs.

## Multi-currency handling

The books are kept in **USD**. Most flows are USD-native (Stripe → Wallex USD → Anthropic/OpenAI USD billing, all USD). Where a transaction occurs in another currency:

- The transaction is recorded with both the **original currency + amount** and the **USD equivalent at the FX rate on the transaction date**.
- FX rates are pulled from Stripe (for Stripe-originated transactions, where Stripe provides the rate) or from a daily reference rate (for manually-entered expenses).
- A small "FX gain/loss" line item captures any difference between the rate at which a transaction was booked and the rate at which it was actually settled in the bank.

If you need a different base currency (HKD, for example), tell us and we'll switch the export.

## What gets exported each month

A single ZIP file delivered monthly, containing:

**1. `transactions_<month>.csv`** — every individual transaction for the period, one row per line, columns:

| Column | Example |
|--------|---------|
| date | 2026-05-31 |
| type | income / direct_cost / commission / op_expense / fx_adjustment |
| category | subscription_revenue / api_anthropic / api_openai / stripe_fee / referral_payout / hosting / domain / etc. |
| description | "School: Whale Class — May 2026 subscription" |
| school_id | (where applicable) |
| school_name | (where applicable) |
| agent_id | (where applicable, for referral payouts) |
| agent_name | (where applicable) |
| original_currency | USD / HKD / etc. |
| original_amount | 140.00 |
| fx_rate | 1.0000 |
| usd_amount | 140.00 |
| stripe_charge_id | (where applicable, for traceability) |
| notes | free text |

**2. `summary_<month>.pdf`** — one-page P&L: revenue, direct costs, gross profit, operating expenses, net profit. Year-to-date alongside the month. Same format every period.

**3. `per_school_<month>.csv`** — one row per active school per month: subscription, direct costs, agent commission, net contribution.

**4. `per_agent_<month>.csv`** — one row per agent: schools attributed, total agent earnings owed, total paid, FX rate used at payout.

**5. `backup_<month>.json`** — raw data backup (API usage detail, all line items, all references) for forensic recovery if anything is ever questioned.

## What we'd like from you

1. **Category mapping.** Confirm our categories above map to the expense classifications you use in your filings. Tell us the names you'd prefer.
2. **Agent commission classification.** Cost of sales or operating expense? (See above.)
3. **Format preferences.** Is CSV + PDF + JSON sufficient? Do you want a specific format (Xero, QuickBooks, MYOB, etc.) we should also export to?
4. **Frequency.** Monthly is our default. Do you need anything more frequent?
5. **HK-specific items.** Anything specific to HK profits-tax filing we should be capturing now that we'd otherwise have to back-fill at year-end (e.g. specific receipt requirements, vendor info, depreciation schedules)?
6. **Multi-currency.** Confirm USD as the books base is fine, or tell us if HKD is preferred.
7. **Year-end pack.** Anything you want included in the year-end version that isn't already in the monthly export.

## What this is NOT

This is not a replacement for your accounting software. Montree's Money module is the **source of truth for what happened on the Montree platform**. You remain the legal accounting record. The monthly export is the bridge between the two.

---

*Contact:* Tredoux — tredoux555@gmail.com
*Last updated:* May 6, 2026
