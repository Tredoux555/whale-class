// lib/montree/constants.ts
// Shared constants for Montree platform

// Default values
export const DEFAULTS = {
  AGE_GROUP: '3-6',
  PLAN_TYPE: 'school',
  SUBSCRIPTION_STATUS: 'trialing',
  TRIAL_DAYS: 14,
} as const;

// Regex patterns
export const PATTERNS = {
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
} as const;

// Re-export color constants from types for convenience
export { STATUS_COLORS, AREA_COLORS, AREA_KEYS, ASSIGNMENT_STATUSES } from './types/curriculum';
