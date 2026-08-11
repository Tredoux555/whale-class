// lib/cms/engine/routing.ts
// ============================================================================
// STUB — signatures are real, bodies are not. Phase 5.
// ============================================================================
// Communications routing: given a message and an audience rule, work out WHO
// receives it, IN WHICH LANGUAGE, and OVER WHICH CHANNEL — before anything is
// actually sent. Deciding and sending are separate on purpose: the decision is
// pure and testable, the send is I/O and lives in an API route.
//
// Language selection is the reason this module exists at all. A school with
// seven home languages cannot have a teacher pick per parent; the router reads
// Guardian.preferredLocale and falls back to the school's default.

import type {
  ChildId,
  ClassGroupId,
  GuardianId,
  MembershipRole,
  SchoolId,
} from './types';

export type Channel = 'in_app' | 'email' | 'sms' | 'push';

export type Audience =
  | { kind: 'child'; childId: ChildId }
  | { kind: 'class'; classGroupId: ClassGroupId }
  | { kind: 'school'; schoolId: SchoolId }
  | { kind: 'role'; schoolId: SchoolId; role: MembershipRole }
  /** Only guardians carrying a given flag category — e.g. every allergy family. */
  | { kind: 'flagged'; classGroupId: ClassGroupId; category: 'allergy' | 'dietary' | 'medical' };

export interface OutboundMessage {
  subject: string;
  body: string;
  /** Locale the author wrote in. Recipients in other locales need translation. */
  sourceLocale: string;
  /** Urgent messages escalate channel (in_app → push → sms) and ignore quiet hours. */
  urgent: boolean;
}

export interface Recipient {
  guardianId: GuardianId;
  displayName: string;
  locale: string;
  channels: Channel[];
  /** True when the message must be machine-translated before delivery. */
  needsTranslation: boolean;
}

export interface RoutingPlan {
  recipients: Recipient[];
  /** Distinct locales the body must exist in before any send happens. */
  requiredLocales: string[];
  /** Audience members deliberately skipped, with the reason (opt-out, no contact). */
  suppressed: { guardianId: GuardianId; reason: string }[];
}

/**
 * Resolve an audience into a concrete delivery plan. Pure: the caller passes
 * in the guardian/membership rows it already loaded.
 */
export function planDelivery(
  _message: OutboundMessage,
  _audience: Audience,
  _context: {
    guardians: { id: GuardianId; fullName: string; preferredLocale: string; email: string | null; phone: string | null }[];
    schoolDefaultLocale: string;
    optOuts: GuardianId[];
  }
): RoutingPlan {
  throw new Error('routing.planDelivery: not implemented (phase 5)');
}

/**
 * Pick the channel ladder for one recipient given urgency and what contact
 * details actually exist. Never returns a channel the recipient cannot receive.
 */
export function resolveChannels(
  _recipient: { email: string | null; phone: string | null; hasPushToken: boolean },
  _urgent: boolean
): Channel[] {
  throw new Error('routing.resolveChannels: not implemented (phase 5)');
}
