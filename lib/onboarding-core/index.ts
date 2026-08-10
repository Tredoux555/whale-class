// lib/onboarding-core/index.ts
//
// Public surface of the shared Child Onboarding core. Adapters (Montree now,
// PSS in phase 2) import from here — never from the individual files, so the
// internal layout can move without breaking either product.
//
// The print components are NOT re-exported here on purpose: they are 'use client'
// React components and pulling them into a server route's import graph via a
// barrel is how you get a "client component in a server file" build failure.
// Import them directly:
//   import LabelSheets from '@/lib/onboarding-core/print/LabelSheets';
//   import PickupSheets from '@/lib/onboarding-core/print/PickupSheets';

export type {
  IntakeStatus,
  ConsentKey,
  ConsentRecord,
  AllergySeverity,
  ToiletingStatus,
  ChildSex,
  Guardian,
  EmergencyContact,
  PickupPerson,
  Allergy,
  IntakeIdentity,
  IntakeFamily,
  IntakeEmergency,
  IntakePickup,
  IntakeHealth,
  IntakeDocuments,
  IntakeDevelopment,
  IntakeForm,
  IntakeSectionKey,
} from './types';

export {
  CONSENT_KEYS,
  INTAKE_SECTION_ORDER,
  emptyGuardian,
  emptyEmergencyContact,
  emptyPickupPerson,
  emptyAllergy,
  emptyIntake,
  normalizeIntake,
  displayName,
  criticalAllergens,
  ageFromDob,
} from './types';

export type { IntakeStrings } from './strings';
export { EN } from './strings';

export type { ValidationError, ValidationResult } from './validation';
export { validateIntake, summarizeErrors } from './validation';
