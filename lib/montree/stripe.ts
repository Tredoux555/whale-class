// lib/montree/stripe.ts
// Stripe integration for Montree billing

import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  
  if (!stripeInstance) {
    stripeInstance = new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
    });
  }
  
  return stripeInstance;
}

// Phase 9: Lazy-evaluated price IDs — throw on missing rather than silent fallback
let _priceIds: { basic: string; standard: string; premium: string } | null = null;
export function getPriceIds() {
  if (!_priceIds) {
    const basic = process.env.STRIPE_PRICE_BASIC;
    const standard = process.env.STRIPE_PRICE_STANDARD;
    const premium = process.env.STRIPE_PRICE_PREMIUM;
    if (!basic || !standard || !premium) {
      throw new Error('[stripe] STRIPE_PRICE_BASIC, STRIPE_PRICE_STANDARD, and STRIPE_PRICE_PREMIUM must all be set');
    }
    _priceIds = { basic, standard, premium };
  }
  return _priceIds;
}
// Backward compat — kept as getter for existing imports
export const PRICE_IDS = new Proxy({} as { basic: string; standard: string; premium: string }, {
  get(_target, prop: string) {
    return getPriceIds()[prop as keyof ReturnType<typeof getPriceIds>];
  }
});

export const PLAN_LIMITS = {
  trial: { students: 50, name: 'Trial', price: 0 },
  basic: { students: 50, name: 'Basic', price: 5000 },
  standard: { students: 200, name: 'Standard', price: 10000 },
  premium: { students: 9999, name: 'Premium', price: 20000 },
};

export type PlanType = keyof typeof PLAN_LIMITS;
