# Montree — Pricing & "Founding 100" Go-to-Market

**MD handoff · Jul 4, 2026.** The decision and the numbers behind it, so anyone running the
business can act on it without re-deriving the economics.

---

## The call (one line)

Two-tier public pricing (**$3 Core / $7 Premium**) plus a time-boxed **"Founding 100"** acquisition
cohort (**free 6 months → $2/student locked for life**), onboarded in waves — to win the early land
grab while the AI photo-recognition advantage is fresh.

---

## Why this is safe: the unit economics

AI cost was the fear. It's a rounding error. Photo recognition runs on the cheap model (Haiku) in
**every** tier — the tier only changes the *report* model.

| Cost line (per student / month) | Amount |
|---|---|
| AI — Haiku tier (photos + Haiku reports) | ~$0.28 |
| AI — Sonnet tier (photos + Sonnet reports) | ~$0.55–0.75 |
| Stripe fees (~2.9% + per-charge $0.30, spread) | ~$0.06–0.08 |
| Infra + photo storage (blended at scale) | ~$0.05–0.10 |
| **All-in variable cost (Haiku tier)** | **~$0.40–0.45** |

A **free** founding school of 50 students costs ~**$14/month** to run. That's the whole reason a steep
early discount is nearly costless: you're not forgoing revenue (there's little at $2 anyway), you're
buying **proof + evangelists**.

Gross contribution margin sits at **~78–90%** at every price point.

---

## Public pricing (at launch)

- **Core — $3/student/month (Haiku):** full photo recognition + shelf/plan logic + weekly reports
  (plainer prose). The everyday product.
- **Premium — $7/student/month (Sonnet):** everything in Core + richer, warmer teacher & parent
  report writing.
- **The differentiator (photo recognition) is IDENTICAL in both tiers.** Premium only upgrades the
  report *prose*. So Core is not a crippled product — it's the full magic, plainer words.
- **Bill on active enrollment (previous month), not flat headcount** — matches the market (Transparent
  Classroom does this); summer closures = $0, quiet months cost less. Removes a real objection for
  seasonal schools; margins easily absorb it.

The tier machinery (Free / Core-Haiku / Premium-Sonnet) **already exists** in the app — this is a
packaging + messaging decision, not a build.

---

## Competitive frame — Transparent Classroom

- **TC = $2.00/student, flat, single tier** (unlimited classrooms/staff/support; billed on active
  enrollment). ~2,500 schools, grinding since 2012. Source: transparentclassroom.com/pricing.
- **TC is a MANUAL record-keeping tool** — teachers type every observation and tag every photo by hand.
- **Montree's wedge is NOT price — it's automation.** The AI recognises the work and writes the
  reports. So $3 (a dollar above TC) is justified: you're selling the teacher's time back to them. You
  don't need to undercut TC to win; you need to out-*value* them.

---

## The "Founding 100" offer

- **Free for the first 6 months, then $2/student locked for life** — below TC, forever, even after the
  list price rises to $3/$7.
- Positioned as **numbered, scarce, closing-soon** — "Founding 100 Schools." The scarcity is its own
  marketing.
- **Onboard in waves of ~15–20**, not a 100-school flood. Each wave gets white-glove setup and must
  hit a week-one "wow" before the next wave opens.

**Why free-then-locked (not free-forever, not a flat % off):**
- Kills the barrier for the risky first movers (who are the hardest and most valuable to win).
- The month-6 conversion forces a **real commitment moment** — filters tire-kickers from believers.
- Hands you a **paying, loyal, referenceable** cohort at the end, not vanity signups.
- $2-for-life is a genuine reward that undercuts TC and buys loyalty, while keeping $2 as a *prize*,
  not the market rate (protects your anchor: you don't train the market that Montree is a $2 product).

---

## The one rule that makes or breaks it

**Every founding school must hit a genuine "it just knew what my child was doing" moment in week one.**
That is the referral engine, and it beats signup count every time. 40 delighted schools that each refer
three beat 300 half-onboarded ones that churn.

This is exactly why photo-ID was hardened first (Jul 4 — see
`docs/handoffs/SESSION_PHOTO_ID_VISUAL_RETRIEVAL_BUILD_JUL4.md`): a single wrong tag on a brand-new
school's first two photos nearly killed that account. Pace signups to how many schools you can
hand-hold to a "wow."

---

## Profit at scale (illustrative — GROSS contribution, no agent commissions)

At 1,000 schools, gross profit ≈ (total students) × ~$1.55/student (on the $2 tier). It hinges on
**average school size**, not school count:

| Avg school size | $2/student (gross/mo) | $3/student (gross/mo) |
|---|---|---|
| ~30 students | ~$46k | ~$77k |
| ~50 students | ~$79k | ~$128k |
| ~80 students | ~$125k | ~$205k |

Most Montessori schools are small, so plan around a **~30–50 blended average → ~$45–80k/month gross at
1,000 schools on $2**.

**🚨 This is GROSS contribution, not take-home.** Net subtracts operating costs:
- **Agent commissions** — the referral program pays ~20% of subscription revenue on agent-referred
  schools. If half your schools come via agents, that's ~10% off the top.
- Team salaries, marketing/acquisition spend, accounting/legal (HK company), other SaaS.

The economics are excellent (~80% contribution margin). **The mountain is DISTRIBUTION — reaching
1,000 schools — not margin.** The app's outreach + agent tooling exists precisely to climb it.

---

## Immediate next moves

1. Set list price **$3 Core / $7 Premium**; keep **$2 as founder-only**.
2. Reframe outreach messaging to the **Founding 100** (free 6mo → $2-for-life, numbered/closing).
3. Fill **wave one** from the warmest already-replied leads.
4. Ship ~20, get them delighted + quoted, **then** open wave two.

---

## The honest alternative (for the record)

Conservative path: run only the existing 30-day free pilot, no lifetime discount — defensible if you'd
rather not lock in a permanent $2 cohort. **Recommendation is the aggressive Founding 100**, because
Montree is pre-validation and needs *proof* more than early revenue, and the cost of the discount is
near-zero. The decision is the owner's; this is the reasoning and the numbers to make it with.
