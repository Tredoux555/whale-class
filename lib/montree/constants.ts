// lib/montree/constants.ts
// Shared constants for Montree platform

// Default values
export const DEFAULTS = {
  AGE_GROUP: '3-6',
  PLAN_TYPE: 'school',
  SUBSCRIPTION_STATUS: 'trialing',
  // Free trial length, in days. CR-1 (May 2026): 7-day trial.
  // This is the SINGLE source of truth — school creation derives
  // trial_ends_at from it, and Stripe trial_period_days follows from
  // trial_ends_at. Do not hardcode a trial length anywhere else.
  TRIAL_DAYS: 7,
} as const;

// Regex patterns
export const PATTERNS = {
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
} as const;

// Re-export color constants from types for convenience
export { STATUS_COLORS, AREA_COLORS, AREA_KEYS, ASSIGNMENT_STATUSES } from './types/curriculum';
