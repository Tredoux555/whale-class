#!/usr/bin/env node
/**
 * scripts/stripe/create-dark-phonics-prices.mjs
 *
 * Creates the two Dark Phonics prices in Stripe and prints the ids to paste
 * into Railway. $5/month and $30/year, one product, recurring.
 *
 * 🚨 IT NEVER RUNS ITSELF. No CI job, no postinstall, no import from the app —
 * money objects are made by a person who meant to make them. Run it by hand,
 * once, per Stripe account (test and live are separate accounts' worth of ids):
 *
 *     STRIPE_SECRET_KEY=sk_test_... node scripts/stripe/create-dark-phonics-prices.mjs
 *
 * It is idempotent by LOOKUP KEY: each price carries a lookup key
 * ('montree_dp_month' / 'montree_dp_year'), so a second run finds the existing
 * price and prints it again rather than creating a duplicate. Stripe prices are
 * immutable — to change the amount, archive the old price in the dashboard,
 * change AMOUNTS below, and run this again.
 *
 * Nothing about the school plan is touched: different product, different price
 * ids, different env vars.
 */

import Stripe from 'stripe';

const PRODUCT_NAME = 'Dark Phonics';
const PRODUCT_DESCRIPTION =
  'All 21 Dark Phonics lessons and every printable classroom set. Lessons 1-3 stay free.';

const AMOUNTS = {
  month: { unit_amount: 500, interval: 'month', lookup_key: 'montree_dp_month', env: 'STRIPE_PRICE_DP_MONTH' },
  year: { unit_amount: 3000, interval: 'year', lookup_key: 'montree_dp_year', env: 'STRIPE_PRICE_DP_YEAR' },
};

const CURRENCY = 'usd';

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error('STRIPE_SECRET_KEY is not set. Refusing to guess which account to write to.');
    process.exit(1);
  }
  const live = key.startsWith('sk_live_');
  const stripe = new Stripe(key, { apiVersion: '2024-12-18.acacia' });

  console.log(`\nDark Phonics prices — ${live ? 'LIVE' : 'TEST'} mode\n${'='.repeat(46)}`);

  // ── The product ───────────────────────────────────────────────────────────
  // Found by metadata rather than by name: a name is editable in the dashboard
  // and a second run should not make a second product because somebody tidied
  // the capitalisation.
  const found = await stripe.products.search({ query: "metadata['montree_product']:'dark_phonics'" });
  let product = found.data[0];
  if (product) {
    console.log(`product   reused  ${product.id}`);
  } else {
    product = await stripe.products.create({
      name: PRODUCT_NAME,
      description: PRODUCT_DESCRIPTION,
      metadata: { montree_product: 'dark_phonics' },
    });
    console.log(`product   CREATED ${product.id}`);
  }

  // ── The two prices ────────────────────────────────────────────────────────
  const out = {};
  for (const [plan, spec] of Object.entries(AMOUNTS)) {
    const existing = await stripe.prices.list({ lookup_keys: [spec.lookup_key], limit: 1 });
    let price = existing.data[0];
    if (price) {
      console.log(`${plan.padEnd(9)} reused  ${price.id}  (${price.unit_amount / 100} ${price.currency})`);
    } else {
      price = await stripe.prices.create({
        product: product.id,
        currency: CURRENCY,
        unit_amount: spec.unit_amount,
        recurring: { interval: spec.interval },
        lookup_key: spec.lookup_key,
        metadata: { montree_product: 'dark_phonics', montree_plan: plan },
      });
      console.log(`${plan.padEnd(9)} CREATED ${price.id}  ($${spec.unit_amount / 100}/${spec.interval})`);
    }
    out[spec.env] = price.id;
  }

  console.log(`\nPaste into Railway (${live ? 'production' : 'the test environment'}):\n`);
  for (const [env, id] of Object.entries(out)) console.log(`  ${env}=${id}`);
  console.log(`
Then, when you are ready to switch the gate on:

  DARK_PHONICS_PAYWALL=on
  STRIPE_DP_WEBHOOK_SECRET=whsec_...   (from the webhook endpoint below)

Stripe webhook endpoint to add:
  URL     https://montree.xyz/api/dark-phonics/webhook
  Events  checkout.session.completed,
          customer.subscription.created,
          customer.subscription.updated,
          customer.subscription.deleted
`);
}

main().catch((err) => {
  console.error('\nFailed:', err?.message || err);
  process.exit(1);
});
