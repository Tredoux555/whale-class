// components/cms/teacher/roster-shapes.ts
// The ONE shape the roster page (server) hands the roster editor (client).
//
// It exists so the server component can serialise engine records across the
// RSC boundary without dragging branded ids, Sets or Maps into client props —
// branded strings survive, but `Set<string>` does not, and a page that quietly
// serialises one is a page that breaks the day somebody adds `familyOwned`.
//
// Plain strings, plain arrays. The client re-derives nothing it was not told.

import type { RosterChildValues } from '@/lib/cms/validation';

export interface RosterRoomOption {
  id: string;
  name: string;
  /** True for a real `cms_class_teachers` assignment. */
  assigned: boolean;
}

export interface RosterChildRow {
  id: string;
  preferredName: string;
  surname: string | null;
  /** ISO date, or null when nobody has told the school yet. */
  dateOfBirth: string | null;
  ageYears: number | null;
  /** Allergen + severity, severe first — what the collapsed row shows. */
  allergyChips: { label: string; severity: 'mild' | 'moderate' | 'severe' }[];
  carriesEpipen: boolean;
  dietaryChips: string[];
  contactCount: number;
  staffNote: string | null;
  /**
   * A family account owns this record — the teacher reads it and does not
   * write it. Set on the server by `loadChildOwnership`; the API re-checks it
   * and RLS refuses it, so this flag only decides what the UI OFFERS.
   */
  familyOwned: boolean;
  /** The quick-edit form, pre-filled from the record. */
  values: RosterChildValues;
}
