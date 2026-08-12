// components/cms/enroll/values.ts
// The wizard's whole answer set, in one type. Every step owns one member; the
// wizard owns the object; the review screen reads all of it; the API takes one
// member per POST.
//
// It is deliberately a plain record of the STEP value types from
// lib/cms/validation.ts rather than a new shape — the validators, the review
// screen and the server all read the same fields, so there is nothing to keep
// in sync.

import {
  EMPTY_ABOUT_CHILD,
  EMPTY_CONSENTS,
  EMPTY_CONTACTS,
  EMPTY_DIETARY,
  EMPTY_MEDICAL,
  EMPTY_PREVIOUS_SCHOOL,
  type AboutChildStepValues,
  type ConsentsStepValues,
  type ContactsStepValues,
  type DietaryStepValues,
  type MedicalStepValues,
  type PreviousSchoolStepValues,
} from '@/lib/cms/validation';
import { EMPTY_CHILD_STEP, type ChildStepValue } from './StepChildInfo';

export interface WizardValues {
  child: ChildStepValue;
  about_child: AboutChildStepValues;
  medical: MedicalStepValues;
  dietary: DietaryStepValues;
  previous_school: PreviousSchoolStepValues;
  contacts: ContactsStepValues;
  consents: ConsentsStepValues;
}

export const EMPTY_WIZARD: WizardValues = {
  child: EMPTY_CHILD_STEP,
  about_child: EMPTY_ABOUT_CHILD,
  medical: EMPTY_MEDICAL,
  dietary: EMPTY_DIETARY,
  previous_school: EMPTY_PREVIOUS_SCHOOL,
  contacts: EMPTY_CONTACTS,
  consents: EMPTY_CONSENTS,
};

/**
 * Rebuild the wizard's state from a saved draft's `draft_data` blob, keeping
 * anything the blob does not carry at its empty value. Shallow per step on
 * purpose — a draft written by an older build simply lacks a key, and lacking a
 * key must never blank a step the family has filled in since.
 */
export function hydrateWizardValues(
  base: WizardValues,
  draftData: Record<string, unknown> | null | undefined
): WizardValues {
  if (!draftData || typeof draftData !== 'object') return base;
  // Written as an explicit record rather than a keyed loop: a loop over
  // `keyof WizardValues` collapses the six step types into their intersection,
  // which nothing satisfies. Six lines beats a cast that hides a real mismatch.
  const merge = <T extends object>(fallback: T, parked: unknown): T =>
    parked && typeof parked === 'object' && !Array.isArray(parked)
      ? { ...fallback, ...(parked as Partial<T>) }
      : fallback;

  return {
    // Step 1 comes from the TYPED columns, never the blob — the child row is
    // the record, and the blob is only ever the form.
    child: base.child,
    about_child: merge(base.about_child, draftData.about_child),
    medical: merge(base.medical, draftData.medical),
    dietary: merge(base.dietary, draftData.dietary),
    previous_school: merge(base.previous_school, draftData.previous_school),
    contacts: merge(base.contacts, draftData.contacts),
    consents: merge(base.consents, draftData.consents),
  };
}
