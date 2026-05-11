# How your earnings are calculated

Plain English. No hidden math.

---

## The formula

For each school you refer, every month:

```
Gross  =  Number of active students  ×  $7
Net    =  Gross  −  Stripe fee  −  Montree AI cost
Your share  =  Net  ×  your %
```

That's it. There are no other deductions, no platform fees, no marketing levies.

---

## What each piece means

### Gross

The school's subscription. Flat **$7 per active student per month**. "Active" means present in the school's roster and not soft-deleted. If a school has 20 children, gross is $140 that month. If they add a 21st mid-month, Stripe prorates and we count the actual quantity billed.

### Stripe fee

What Stripe charges Montree to process the payment. Roughly **2.9% + $0.30** per successful charge. On $140 that's about $4.36. This is a real bank cost; it never goes to Montree. Stripe takes it before the money even lands.

### Montree AI cost

What Anthropic + OpenAI billed Montree that month for AI work done for that school. The cost is captured live in our `montree_api_usage` ledger — every Sonnet call, every Haiku call, every Whisper transcription. We sum it up at month end per school.

A typical 20-student classroom on the Premium tier runs **$3–$8** of AI cost per month. Heavier weekly-wrap usage pushes it higher. Free-tier schools have $0 AI cost (they aren't using the AI features).

### Your share

Your % is locked at the time your code is issued. Gloria's code = 50%. Future agents may be on different splits (some on 20%, some on 50%) depending on their pitch.

---

## A real example

School: 20 active children, on Premium tier, average AI usage.

| Line | Amount |
|---|---|
| Gross (20 × $7) | $140.00 |
| Stripe fee (2.9% + $0.30) | −$4.36 |
| AI cost (Anthropic + OpenAI for the month) | −$5.80 |
| **Net** | **$129.84** |
| Your share at 50% | **$64.92** |

That's the amount that lands in your bank account around the 1st of the following month.

---

## Why some months are smaller

Three things move the number:

1. **Student count** — if the school loses 4 children, gross drops $28 and your share drops by half that.
2. **AI cost** — if the principal generates extra Weekly Wraps mid-month or a teacher uses Guru heavily, AI cost can run higher than typical. It's still bounded — Anthropic + OpenAI together rarely exceed $20/month for a single classroom.
3. **Plan tier** — if the school is on the Core tier (cheaper AI) or Free tier (no AI), AI cost is lower or zero. Gross is the same.

---

## Why negative net rounds to zero

If a school does almost nothing in a given month — say a single student, school on the cheap end, no AI usage — gross might be $7 and Stripe fee + AI cost together might exceed it. Net comes out negative.

**We don't claw back from agents.** Negative net = your share for that month is $0. You don't owe anything. Next month resets.

---

## What you can verify

In the **Earnings** tab of your agent dashboard, every line of the math is exposed for every school, every month. You can also see:

- The Stripe invoice ID (link out to verify in Stripe)
- The exact AI cost broken down by API (Anthropic vs OpenAI)
- The Stripe fee actually charged (not estimated)
- The historical payout total per school

If anything ever looks off, tell Tredoux — the audit trail goes all the way down to individual API calls.

---

## What we do NOT deduct

To be explicit:

- ❌ No platform fee on top
- ❌ No marketing fee
- ❌ No "infrastructure" cost
- ❌ No clawback on cancelled schools (your past months stay paid)
- ❌ No fees if Stripe payouts cross currencies — Stripe absorbs that into its 2.9%
- ❌ No fees if a parent's photo upload is large or a teacher records lots of voice notes — the AI cost line is the only variable cost

---

## When this changes

If Montree's pricing changes ($7 → some other number), your gross changes too. Your **percentage** never changes for schools already linked under your code. If you're 50% and Montree drops to $5, you're still 50% of net of $5 schools.

If Anthropic or OpenAI raise their API prices, our AI cost line goes up. Your % is still your %. The system is transparent — the cost line is what we paid them, no markup.

---

That's the whole picture. The dashboard surfaces it live. No mystery, no fine print.
