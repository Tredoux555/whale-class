# Pricing — what to say and what to avoid

## The line

**$7 USD per active student, per month. One plan. 30 days free, no credit card.**

That's the whole pitch. There are no tiers, no annual contracts, no setup fees, no per-classroom or per-teacher fees. The school pays for the children currently enrolled, full stop.

## Annual prepayment

Schools that pay for the year up front get **10% off** ($1,512/year for a 20-student classroom vs. $1,680 if paid monthly). Locked when the annual invoice goes out. The agent gets revenue share on either rail — there is no commission haircut for annual.

## The three payment rails

A school chooses one of three at signup or when their first invoice is generated.

1. **Stripe subscription** — Western credit card, auto-renewing. The default. Works in the US, Canada, UK, EU, Australia, NZ, most of Latin America, Singapore, Hong Kong, Japan, Korea.

2. **Alipay / WeChat invoice** — Mainland China, Hong Kong, Macau, Taiwan, Singapore. The system generates a Stripe invoice with `payment_method_types: ['alipay','wechat_pay']`. Principal scans the QR, pays in WeChat or Alipay, the webhook flips the school active.

3. **Manual invoice (SWIFT wire)** — Argentina, Russia, Iran, Lebanon, anywhere Stripe doesn't reach. Tredoux issues a PDF invoice from Montree Limited (Hong Kong). School wires USD. Tredoux records the wire via super-admin and the school flips active. Slower but works anywhere.

The agent never has to know which rail a school will use — Tredoux handles billing after the principal signs up.

## Trial

**30 days from signup. One classroom only. No credit card.** The trial gives the full Montree experience — AI, photo audit, Weekly Wrap, Astra, the works. If the school adds a second classroom before paying, they have to choose a plan.

If the trial expires and they haven't paid, the school flips to Free AI tier (no AI features) but the data stays. They can resubscribe any time.

## What to avoid in the pitch

- **Don't promise outcomes.** "You'll save 10 hours a week" is a future promise. "Schools running this report 1-2 hours saved on Friday afternoons" is an observation. Use the second form.
- **Don't lead with price.** Lead with the magic. Price is the last 30 seconds of the conversation, not the first.
- **Don't bundle.** Some agents want to offer "we'll throw in classroom setup for free." Don't — the platform already includes onboarding via Voice Onboarding.
- **Don't compare per-child price to competitors.** Montessori Compass is per-classroom; Transparent Classroom is per-teacher. Apples-to-elephants. Just state Montree's number and let it speak.

## When the principal asks for a discount

The standard answer: "Annual prepayment is a 10% discount — that's the rail we have. For longer-term commitments we don't currently discount because we want to keep the price honest and the same for every school."

For multi-campus organisations: the agent can flag "this is a 3-campus group" to Tredoux, who has discretion on per-campus pricing if it materially changes the deal. Don't promise that discount yourself.

## Agent commission

20% of every paid invoice for the agent's referred schools, indefinitely while they're paying. Annual prepayment = $302.40 commission per 20-student annual sale ($1,512 × 20%). Monthly = $28 per 20-student-month, paid monthly.

Commission only flows on PAID invoices. If a school is in trial, no commission. If a school's payment fails, no commission for that period.

## The current platform state (informal, useful to know)

- A handful of schools running Montree in production today, including the founder's own Whale Class in Beijing.
- The platform charges USD; receives via Wallex HK / DBS HK.
- All AI cost is included in the $7. The school never sees an AI surcharge.
- Every school can use Montree in any of the 12 supported languages.
