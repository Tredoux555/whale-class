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

// Price IDs - set these in Stripe Dashboard
export const PRICE_IDS = {
  basic: process.env.STRIPE_PRICE_BASIC || 'price_basic',
  standard: process.env.STRIPE_PRICE_STANDARD || 'price_standard',
  premium: process.env.STRIPE_PRICE_PREMIUM || 'price_premium',
};

export const PLAN_LIMITS = {
  trial: { students: 50, name: 'Trial', price: 0 },
  basic: { students: 50, name: 'Basic', price: 5000 },
  standard: { students: 200, name: 'Standard', price: 10000 },
  premium: { students: 9999, name: 'Premium', price: 20000 },
};

export type PlanType = keyof typeof PLAN_LIMITS;
