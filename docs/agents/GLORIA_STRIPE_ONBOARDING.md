# Gloria — Stripe Connect onboarding

How to get paid by Montree. Step by step. Takes about 10 minutes.

---

## The picture

You introduced a school to Montree. They signed up using your code (`GLORIA-ZXNF`). Every month that school pays Montree a subscription, **you earn 50% of the net** — that's the share locked in your code, and it never changes for that school.

Montree pays you via Stripe Connect (Stripe's payouts product). To receive the money you need a Stripe Connect account in your name. It takes about 10 minutes to set up and you never need to touch it again.

---

## What you'll need

- Your full legal name
- Your date of birth
- A government-issued ID (passport or national ID — photo of both sides if it's a card)
- Your bank account details (account number + routing/SWIFT)
- The address you bank at
- A phone number Stripe can SMS for verification

---

## Steps

### 1. Click the onboarding link

Tredoux will send you a personal link that looks like:

```
https://connect.stripe.com/setup/e/acct_…………
```

This link is good for one use and expires after a few hours. If it expires before you finish, just tell Tredoux and he'll generate a new one in 5 seconds.

### 2. Confirm your country + business type

- **Country:** the country your bank account is in.
- **Business type:** pick **Individual** unless you specifically have a registered business. Most agents are Individual.

### 3. Enter your personal details

Stripe collects:
- Name, date of birth, home address
- ID document upload
- Sometimes a selfie (just follow Stripe's prompts)

This is the same KYC any bank would do. Stripe holds the data, not Montree — we never see your ID.

### 4. Connect your bank account

Two options usually:
- **Direct bank login** (Plaid-style) — fastest, instant verification
- **Manual** — enter routing + account number; Stripe sends two small test deposits over 1–2 days that you confirm

Either is fine. Direct is quicker.

### 5. Set your payout schedule

Stripe defaults to **automatic monthly payouts**. That's what you want — leave it as is. Once a month, Montree's payout job calculates what you're owed and Stripe wires it to your bank.

### 6. Finish

When Stripe says "You're done", you're done. Close the tab. Your status in Montree's super admin will flip from `Not setup` to `Verified` automatically within a minute.

---

## What you'll see in your dashboard

When you log in at **montree.xyz** with your agent code, you'll see:

- **Schools** — every school you referred. Each card shows the student count and the estimated monthly net you'll earn from it.
- **Earnings** — the math, transparent. Stripe revenue, minus Stripe fee, minus Montree's AI costs, equals net. 50% of net is yours.
- **Payouts** — every payout that's been wired to your bank, with the Stripe transfer ID so you can verify.

---

## How you actually get paid

1. Each month, after schools pay their Montree subscriptions, the system aggregates the revenue + costs for each school you referred.
2. It calculates your 50% share of the net.
3. A payout row gets created in your dashboard with status `pending`.
4. Stripe wires the money to your bank on Montree's payout day (1st of the following month).
5. Status flips to `paid` with the bank reference.

If your bank account is in a different currency to USD, Stripe handles the FX automatically at the spot rate when the wire goes out.

---

## Negative net months

In a slow month — small school, only a few children, lots of AI usage — net could come out negative. In that case your share is **zero**, not negative. Montree never claws back money from agents. Some months will be smaller than others; that's normal.

---

## If anything goes wrong

Tell Tredoux. The whole system has audit logs — every Stripe call, every status change, every payout calculation is recorded. Anything that looks off can be traced.

---

## Quick answers

**Do I have to declare this income to tax?**
Yes. Stripe will issue you a 1099-NEC or equivalent at year end depending on your country. The income is yours to declare wherever you live.

**Can I have multiple agents under me?**
Not yet. Each agent's codes are tied to that agent personally. If you start bringing in helpers, talk to Tredoux about how to structure it.

**What if a school I introduced cancels?**
Then no more revenue comes from them and no more share goes to you. Your past months stay paid; you just don't earn from a cancelled school going forward.

**Can my % ever change?**
For schools that are already linked under your code: no — your 50% is locked. For schools you bring in *under a new code*, Tredoux can issue a different code with a different %.

---

That's the whole thing. Click the link, walk through Stripe's form, you're done.
