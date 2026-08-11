// lib/cms/engine/types.ts
// ============================================================================
// THE DATA MODEL SPINE
// ============================================================================
// This file is the waist of the hourglass. Everything a parent enters funnels
// down into these types; everything a teacher sees is derived back out of them.
// Both ends are replaceable — this is not.
//
// RULES:
//   · Pure TypeScript. No React, no Next, no Supabase, no I/O. If a module in
//     lib/cms/engine/ needs a network call, it takes the data as an argument.
//   · Every table in db/schema.sql has a counterpart here, and vice versa. If
//     you change one, change the other in the same commit.
//   · IDs are branded strings so a ChildId can never be passed where a
//     GuardianId is expected — free correctness, zero runtime cost.
// ============================================================================

// ── branded ids ─────────────────────────────────────────────────────────────
declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type OrganisationId = Brand<string, 'OrganisationId'>;
export type SchoolId = Brand<string, 'SchoolId'>;
export type ClassGroupId = Brand<string, 'ClassGroupId'>;
export type ChildId = Brand<string, 'ChildId'>;
export type GuardianId = Brand<string, 'GuardianId'>;
export type EnrollmentId = Brand<string, 'EnrollmentId'>;
export type MedicalRecordId = Brand<string, 'MedicalRecordId'>;
export type AllergyId = Brand<string, 'AllergyId'>;
export type DietaryRequirementId = Brand<string, 'DietaryRequirementId'>;
export type MembershipId = Brand<string, 'MembershipId'>;

/** Cast a raw string (a DB uuid, a form value) into a branded id. */
export function id<T extends string>(raw: string): T {
  return raw as T;
}

/** ISO-8601 date, no time component: `2026-08-11`. */
export type IsoDate = string;
/** ISO-8601 timestamp with timezone. */
export type IsoDateTime = string;
/** 24h wall-clock time in the school's local zone: `15:30`. */
export type ClockTime = string;

// ── organisation layer (the plate the hourglass stands on) ───────────────────

export interface Organisation {
  id: OrganisationId;
  name: string;
  /** URL-safe key, from lib/slugify.ts. Unique across the platform. */
  slug: string;
  countryCode: string;
  /** Locale new members and generated documents default to. */
  defaultLocale: string;
  createdAt: IsoDateTime;
}

export interface School {
  id: SchoolId;
  organisationId: OrganisationId;
  name: string;
  slug: string;
  /** IANA zone, e.g. `Africa/Johannesburg`. Attendance days are cut on this. */
  timezone: string;
  addressLine: string | null;
  phone: string | null;
  email: string | null;
  createdAt: IsoDateTime;
}

export interface ClassGroup {
  id: ClassGroupId;
  schoolId: SchoolId;
  /** The room's name as staff and parents say it: "Sunrise Room". */
  name: string;
  /** Inclusive age band the room admits, in years. */
  ageMin: number;
  ageMax: number;
  capacity: number;
  /** Free-text staff names until a staff table exists (phase 3). */
  leadTeacherName: string | null;
}

export type MembershipRole =
  | 'org_admin'
  | 'school_admin'
  | 'teacher'
  | 'parent';

/**
 * A person's authority within one school (or, for org_admin, one organisation).
 * A single human can hold several — a teacher who is also a parent at the same
 * school gets two memberships, never one blended role.
 */
export interface Membership {
  id: MembershipId;
  role: MembershipRole;
  organisationId: OrganisationId;
  /** Null only for `org_admin`, whose scope is the whole organisation. */
  schoolId: SchoolId | null;
  /** Set when the member is a guardian; null for staff. */
  guardianId: GuardianId | null;
  email: string;
  displayName: string;
  isActive: boolean;
  createdAt: IsoDateTime;
}

// ── people ──────────────────────────────────────────────────────────────────

export type Relationship =
  | 'mother'
  | 'father'
  | 'aunt'
  | 'uncle'
  | 'grandparent'
  | 'guardian'
  | 'other';

export interface Guardian {
  id: GuardianId;
  fullName: string;
  relationship: Relationship;
  phone: string | null;
  email: string | null;
  /** BCP-47 tag. Drives which dictionary the comms router picks. */
  preferredLocale: string;
  /** May this person collect the child unaccompanied? */
  canCollect: boolean;
  /** 1 = call first. Ties are broken by array order. */
  contactPriority: number;
  /** Court order / restraining note. If set, this person may NEVER collect. */
  restrictionNote: string | null;
}

export type AttendanceState = 'expected' | 'present' | 'absent' | 'collected';

export interface Child {
  id: ChildId;
  schoolId: SchoolId;
  classGroupId: ClassGroupId | null;
  /** As on the birth certificate. Used on every legal document. */
  legalName: string;
  /** What the room actually calls them. Used on every human-facing surface. */
  preferredName: string;
  dateOfBirth: IsoDate;
  /** Language spoken at home — informs comms routing and teacher briefing. */
  homeLanguage: string;
  guardians: Guardian[];
  /** Whoever is allowed to collect today. Derived, never hand-maintained. */
  authorisedCollectors: GuardianId[];
  photoUrl: string | null;
  createdAt: IsoDateTime;
}

// ── health & diet ───────────────────────────────────────────────────────────

export type AllergySeverity = 'mild' | 'moderate' | 'severe';

export interface Allergy {
  id: AllergyId;
  childId: ChildId;
  /** The allergen as the parent named it: "Peanut", "Bee sting". */
  allergen: string;
  severity: AllergySeverity;
  /** What actually happens: "hives", "anaphylaxis". */
  reaction: string;
  /** What staff must do: "EpiPen in Sunrise Room cabinet, then call 112". */
  responsePlan: string;
  /** Severe allergies must appear on the wall poster; mild ones need not. */
  requiresPoster: boolean;
}

export type DietaryReason =
  | 'allergy'
  | 'medical'
  | 'religious'
  | 'cultural'
  | 'preference';

export interface DietaryRequirement {
  id: DietaryRequirementId;
  childId: ChildId;
  /** Kitchen-facing label: "Halal", "No dairy", "Vegetarian". */
  label: string;
  reason: DietaryReason;
  /** Foods that must never be served. Drives the kitchen sheet. */
  excludedFoods: string[];
  notes: string | null;
}

export interface Medication {
  name: string;
  dose: string;
  /** "As needed", "08:00 daily", "Before outdoor play". */
  schedule: string;
  /** Is the medication physically stored at the school? */
  heldOnSite: boolean;
  storageLocation: string | null;
}

export interface MedicalRecord {
  id: MedicalRecordId;
  childId: ChildId;
  conditions: string[];
  medications: Medication[];
  doctorName: string | null;
  doctorPhone: string | null;
  emergencyNote: string | null;
  /** Records must be re-confirmed yearly; the dashboard flags stale ones. */
  lastReviewedAt: IsoDate | null;
  reviewedByName: string | null;
}

// ── enrolment (the parent's side of the hourglass) ──────────────────────────

export type EnrollmentStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'accepted'
  | 'waitlisted'
  | 'declined'
  | 'withdrawn';

/** The wizard's steps, in order. The UI renders one component per member. */
export const ENROLLMENT_STEPS = [
  'child',
  'medical',
  'dietary',
  'previous_school',
  'contacts',
  'consents',
] as const;

export type EnrollmentStep = (typeof ENROLLMENT_STEPS)[number];

export type ConsentKind =
  | 'photography'
  | 'outings'
  | 'emergency_medical'
  | 'data_processing'
  | 'sunscreen';

export interface Consent {
  kind: ConsentKind;
  granted: boolean;
  grantedByGuardianId: GuardianId | null;
  grantedAt: IsoDateTime | null;
}

export interface PreviousSchool {
  name: string;
  city: string | null;
  attendedFrom: IsoDate | null;
  attendedTo: IsoDate | null;
  reasonForLeaving: string | null;
  /** Has a transfer/records release been received? */
  recordsReleased: boolean;
}

/**
 * One application by one family for one child at one school. This is the
 * INTAKE object — the entire parent wizard writes into it, and the engine
 * reads from it to produce the child's operational record.
 */
export interface Enrollment {
  id: EnrollmentId;
  childId: ChildId;
  schoolId: SchoolId;
  requestedClassGroupId: ClassGroupId | null;
  status: EnrollmentStatus;
  /** Which wizard steps the family has finished. Drives the progress rail. */
  completedSteps: EnrollmentStep[];
  requestedStartDate: IsoDate | null;
  previousSchool: PreviousSchool | null;
  consents: Consent[];
  /** Free text the family wants the room to read on day one. */
  settlingNotes: string | null;
  submittedAt: IsoDateTime | null;
  decidedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ── derived views (what the teacher end actually consumes) ──────────────────

/** The tint scale shared by Chip and Tag. Category → colour is a design law. */
export type FlagCategory = 'allergy' | 'dietary' | 'pickup' | 'medical' | 'neutral';

/**
 * One flag on one child for one day. Produced by the engine, consumed by
 * teacher UI and by every generated document. A teacher never types one.
 */
export interface ChildFlag {
  category: FlagCategory;
  /** Already-localised where the source is data (an allergen name). */
  label: string;
  /** Optional qualifier: severity, a time, a collector's name. */
  detail?: string;
  /** Sort weight — severe allergies must float to the top of a dense row. */
  weight: number;
}

/** One row of the teacher's Today page: a child plus everything true today. */
export interface DailyRosterEntry {
  child: Child;
  attendance: AttendanceState;
  arrivedAt: ClockTime | null;
  absenceReason: string | null;
  /** Today's collector, if different from the default guardian. */
  expectedCollector: { guardianId: GuardianId; name: string; relationship: Relationship } | null;
  expectedCollectionTime: ClockTime | null;
  flags: ChildFlag[];
}

/** The whole Today page in one object. */
export interface DailyRoster {
  school: School;
  classGroup: ClassGroup;
  date: IsoDate;
  entries: DailyRosterEntry[];
  presentCount: number;
  totalCount: number;
}

/** One school's line on the org overview. */
export interface SchoolSummary {
  school: School;
  childCount: number;
  classGroupCount: number;
  allergyFlagCount: number;
  openEnrollmentCount: number;
}
