# Chinese schools — payment strategy

**Status:** Strategic plan (May 16, 2026 / Session 113 V2). No code yet — operational doc for Tredoux.

---

## The constraint

Montree Limited is a Hong Kong company. A HK company **cannot directly issue mainland China fapiao (税务发票)** — that's a PRC-tax-bureau-controlled document that only PRC-registered entities can mint. Mainland Chinese schools need a fapiao to deduct the software expense from their corporate tax. Without one, they're paying with after-tax cash, which is a hard sell.

Schools in HK / Taiwan / Macau / Singapore / international Chinese diaspora **don't need fapiao** — they're outside the PRC tax system entirely.

## What we DO have today (Phase 4 / Session 111)

| Rail | Who it serves | What we issue |
|---|---|---|
| `stripe_subscription` | Western schools with credit cards | Stripe invoice + receipt |
| `alipay_invoice` | Mainland China + HK + Taiwan with Alipay/WeChat Pay | Stripe invoice (commercial, not fapiao) |
| `manual_invoice` | Russia / Argentina / Iran / restricted countries | HK commercial invoice via Wallex |

The `alipay_invoice` and `manual_invoice` rails accept payment fine. The gap is: **none of them give the school a PRC fapiao for tax deduction.**

## The strategy: hold the line, don't chase a WFOE

We do NOT pursue:

- **WFOE in Shenzhen/Shanghai** (3-6 months setup, ¥50-100k cost, ~25% PRC corporate tax + ongoing compliance). Overkill for a customer base we don't have yet.
- **PRC reseller partner** (10-30% margin, gives up direct customer relationship). Premature.

We DO:

1. **Treat fapiao as a "we don't do that yet"** — same as Stripe doesn't do every payment rail in every country. Schools where fapiao is a hard requirement get a polite decline + recommendation to come back when their accounting can accept a HK commercial invoice.
2. **Schools that accept HK commercial invoices** → onboard them on `alipay_invoice` rail. They pay via Alipay/WeChat Pay, Stripe issues a commercial invoice, payment routes through Wallex HK. Their accountant deals with cross-border-software-import accounting locally. Most international K-12 schools in PRC already handle this for other foreign SaaS (Google Workspace, Notion, etc.).
3. **Investigate Wallex's PRC invoicing module** — single courteous email (see `docs/finance/wallex-fapiao-inquiry.md`). If Wallex can issue PRC-compliant invoices on Montree's behalf as a pass-through, that becomes a low-cost option (~1-2% fee).

## When to revisit

| Trigger | Action |
|---|---|
| ≥ 10 paying PRC schools waiting for fapiao | Reopen Wallex conversation. Possibly explore Path B (WFOE). |
| China crosses 20% of monthly revenue | Path B (WFOE) starts being worth the math. |
| A single PRC school is offering ≥ $10k/year and asks for fapiao specifically | Direct negotiation. Maybe a custom reseller arrangement for that one school. |

Until ANY of those triggers fire, fapiao is a "not yet" — same posture as not supporting Iranian rial or North Korean won.

## The 95% lever: focus growth outside PRC

International English-medium Montessori schools — HK, Taiwan, Singapore, Bangkok, Tokyo, Dubai, London, Toronto, Sydney, Buenos Aires, etc. — are 95% of the global Montessori market and don't need fapiao. The Stripe Connect + alipay_invoice + manual_invoice rails already handle them.

If China takes off naturally through demand, the trigger fires. We don't carry the complexity speculatively.

## Customer-facing messaging

On the billing page (added Session 113 V2): "Card not an option? Need a custom invoice, wire transfer, or fapiao? Email me directly — I'll set up the right arrangement for your school."

For Chinese-school inbound where fapiao is requested:
> Hi [Name], Montree is a Hong Kong-registered company. We issue you a HK commercial invoice from Montree Limited, which most international schools in China are able to file with their accounting team for cross-border software services. Unfortunately as a HK entity we cannot mint a PRC fapiao directly. If your school's accounting strictly requires a fapiao for the expense to be deductible, I want to be honest with you — we don't have that capability today, and I would rather you know upfront than discover it month 3. If your accountant can work with a HK commercial invoice, we'd love to onboard your school. Either way, please reply and tell me what your situation looks like.

This template lives in `lib/montree/email.ts` as `sendChineseFapiaoExplainerEmail` (TODO — not yet built; draft above is the source).

## Operational status

- ✅ Three rails live (`stripe_subscription` / `alipay_invoice` / `manual_invoice`)
- ✅ Billing page now has "Email me directly" affordance for non-Stripe paths
- ⏳ Wallex inquiry email — draft at `docs/finance/wallex-fapiao-inquiry.md`. Send when Tredoux is ready.
- ⏳ Chinese-school auto-reply template — not yet built. Manual response for now.
- ⏳ Web Vitals / general analytics — when first PRC school inquires, log it. Trigger criteria above.
