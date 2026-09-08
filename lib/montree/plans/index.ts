// lib/montree/plans/index.ts
// Barrel for the 3-tier plan core. WP-B / WP-C import from here or from the
// individual modules — both are stable.
export * from './types';
export { resolvePlan, loadResolvedPlan } from './resolve-plan';
export {
  PLAN_CAPABILITIES,
  CAPABILITY_FEATURE_KEYS,
  planGrants,
  hasCapability,
  loadCapabilities,
  invalidatePlanCache,
} from './capabilities';
export type { PlanCapabilities } from './capabilities';
export { applyPlan } from './apply-plan';
export type { ApplyPlanOptions, ApplyPlanResult } from './apply-plan';
