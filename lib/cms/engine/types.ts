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
export type ChildProfileId = Brand<string, 'ChildProfileId'>;
export type PreviousSchoolId = Brand<string, 'PreviousSchoolId'>;

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
  /**
   * The short line a TEACHER writes about this child on the roster page —
   * "Naps after lunch", "Older brother in Meadow". Phase 4, `cms_children.staff_note`.
   *
   * Deliberately NOT `ChildProfile.parentNotes`: that is the family's voice and
   * staff may not write it (migration 330). This is staff's own note, it says so
   * on the page, and it prints on the class list.
   */
  staffNote: string | null;
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
  /** Does the child carry adrenaline (EpiPen / Jext / Anapen)? The first
   *  question a relief teacher asks, and — since migration 330 — a column
   *  rather than a sentence buried in `responsePlan`. */
  carriesEpipen: boolean;
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

/** The wizard's steps, in order. The UI renders one component per member.
 *
 *  PHASE 3 inserted `about_child` at position 2 — deliberately BEFORE the
 *  clinical steps. A family's first real answer about their child should be
 *  "what do they love?", not "what are they allergic to". The database enum
 *  `cms_enrollment_step` carries the same member (migration 330). */
export const ENROLLMENT_STEPS = [
  'child',
  'about_child',
  'medical',
  'dietary',
  'previous_school',
  'contacts',
  'consents',
] as const;

export type EnrollmentStep = (typeof ENROLLMENT_STEPS)[number];

export type ConsentKind =
  | 'photography'
  /** Public use — newsletter, website, social. Split from `photography` in
   *  migration 330: a family happy with a picture on the classroom wall is
   *  often not happy with one on a public page, and one checkbox for both
   *  forces them to refuse both. */
  | 'media'
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
 * One row of the child's schooling history (migration 330, `cms_previous_schools`).
 * Phase 2 kept a single `PreviousSchool` blob on the enrolment; a real family
 * often has two or three settings behind them (a crèche, a move between
 * countries), so phase 3 gives them rows.
 */
export interface PreviousSchoolRecord {
  id: PreviousSchoolId;
  childId: ChildId;
  name: string;
  /** ISO-3166 alpha-2 where the family knows it, free text where they don't. */
  countryCode: string | null;
  city: string | null;
  attendedFrom: IsoDate | null;
  attendedTo: IsoDate | null;
  notes: string | null;
}

// ── about the child (phase 3 — the top of the hourglass) ────────────────────

/**
 * The temperament axes a PARENT is asked about. Each is a 1–5 pick between two
 * ordinary, non-judgemental ends.
 *
 * 🚨 THIS IS NOT A DIAGNOSIS AND MUST NEVER READ AS ONE. There is no "score",
 * no norm, no high/low. A 1 and a 5 are equally fine places for a child to be,
 * and every label in the UI says so. The engine's job is to carry the family's
 * own description to the person who meets the child on Monday.
 */
export type TemperamentAxis =
  /** settles easily ↔ needs time to settle */
  | 'settling'
  /** happy alone ↔ seeks company */
  | 'company'
  /** cautious ↔ adventurous */
  | 'adventure'
  /** calm energy ↔ big energy */
  | 'energy';

export const TEMPERAMENT_AXES: readonly TemperamentAxis[] = [
  'settling',
  'company',
  'adventure',
  'energy',
] as const;

/** 1–5 along each axis. A missing axis means "the family did not say". */
export type Temperament = Partial<Record<TemperamentAxis, number>>;

/**
 * What the family says about who their child IS — the record behind the
 * "About your child" wizard step, the CMS teacher insight card, and the
 * Montree Guru feed (`lib/cms/engine/guru-feed.ts`).
 *
 * Stored in `cms_child_profiles` (migration 330), which no org-layer role can
 * read: a group office compares schools, it does not read a four-year-old's
 * personality.
 */
export interface ChildProfile {
  id: ChildProfileId;
  childId: ChildId;
  schoolId: SchoolId;
  /** Free tags in the family's own words: "puddles", "Baba's singing". */
  likes: string[];
  dislikes: string[];
  interests: string[];
  temperament: Temperament;
  /** "What should the teacher know about your child?" — the free-text answer. */
  parentNotes: string | null;
  /**
   * May this profile inform the Montree Guru's picture of the child? Set by the
   * family. False means the record still serves the classroom, but never leaves
   * it for the teaching assistant.
   */
  guruSync: boolean;
  guruSyncedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
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
