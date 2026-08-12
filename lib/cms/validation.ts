// lib/cms/validation.ts
// ============================================================================
// The gate between "a parent is typing" and "the school has a record".
// ============================================================================
// Montree carries no schema-validation dependency (no zod, no yup) and CMS adds
// none — REUSE-FIRST LAW. The rules below are lifted, deliberately, from
// lib/onboarding-core/validation.ts, which is this repo's existing answer to
// the same problem for Montree's and PSS's intake forms:
//
//   · strict ISO dates that must ROUND-TRIP (rejects 2019-02-31, which
//     `new Date()` silently turns into March 3rd),
//   · a plausible age window rather than a bare "is a date",
//   · forgiving everywhere else — a half-filled form from a busy family still
//     beats no form.
//
// It is re-implemented rather than imported because that module's entry point
// takes an `IntakeForm`, a different shape from the CMS wizard's step values.
// If the two intake models ever converge (the stated long-term intent), this
// file is the thing that should disappear into lib/onboarding-core/.
//
// Client AND server both call these. The server call is the one that counts.
// ============================================================================

export interface FieldError {
  /** The form field this belongs to, so the UI can point at it. */
  field: string;
  /** English. UI-facing messages are translated at the call site via t(). */
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: FieldError[];
}

/** Plausible age window for an early-years intake, from onboarding-core. */
const MIN_AGE_YEARS = 0;
const MAX_AGE_YEARS = 12;

/** Length ceilings. Not security (the DB is parameterised and React escapes on
 *  render) — they stop a paste accident becoming a 2MB row. */
export const MAX_NAME = 120;
export const MAX_NOTES = 2000;
export const MAX_EMAIL = 254;

export function isBlank(v: string | undefined | null): boolean {
  return !v || !String(v).trim();
}

/** Trim, collapse runs of whitespace, and cap. Every string that reaches the
 *  database goes through this. */
export function clean(v: string | undefined | null, max = MAX_NAME): string {
  return String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Strict ISO date that round-trips. Returns null for anything else. */
export function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  if (d.toISOString().slice(0, 10) !== value) return null;
  return d;
}

function yearsBetween(then: Date, now: Date): number {
  let years = now.getUTCFullYear() - then.getUTCFullYear();
  const m = now.getUTCMonth() - then.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < then.getUTCDate())) years -= 1;
  return years;
}

/** A syntactically plausible address. Deliverability is the mail server's job. */
export function isEmailShaped(value: string): boolean {
  const v = value.trim();
  return v.length <= MAX_EMAIL && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export interface ChildStepValues {
  legalName: string;
  preferredName: string;
  dateOfBirth: string;
  homeLanguage: string;
  requestedStartDate: string;
  classGroupId: string;
  settlingNotes: string;
}

/**
 * Wizard step 1. Required: the four things a school cannot open a file without
 * — who the child legally is, when they were born, what they speak at home, and
 * which room the family is asking for. Everything else is optional.
 */
export function validateChildStep(
  values: ChildStepValues,
  now: Date = new Date()
): ValidationResult {
  const errors: FieldError[] = [];

  if (isBlank(values.legalName)) {
    errors.push({ field: 'legalName', message: "The child's legal name is required." });
  }

  if (isBlank(values.dateOfBirth)) {
    errors.push({ field: 'dateOfBirth', message: 'Date of birth is required.' });
  } else {
    const dob = parseIsoDate(values.dateOfBirth.trim());
    if (!dob) {
      errors.push({ field: 'dateOfBirth', message: 'That date is not a real date.' });
    } else if (dob.getTime() > now.getTime()) {
      errors.push({ field: 'dateOfBirth', message: 'Date of birth is in the future.' });
    } else {
      const age = yearsBetween(dob, now);
      if (age < MIN_AGE_YEARS || age > MAX_AGE_YEARS) {
        errors.push({
          field: 'dateOfBirth',
          message: `That date would make the child ${age} years old — please check the year.`,
        });
      }
    }
  }

  if (isBlank(values.homeLanguage)) {
    errors.push({ field: 'homeLanguage', message: 'Home language is required.' });
  }

  if (isBlank(values.classGroupId)) {
    errors.push({ field: 'classGroupId', message: 'Please choose a room.' });
  }

  if (!isBlank(values.requestedStartDate) && !parseIsoDate(values.requestedStartDate.trim())) {
    errors.push({ field: 'requestedStartDate', message: 'That start date is not a real date.' });
  }

  return { ok: errors.length === 0, errors };
}

/** Normalise a validated step into exactly what the database should store. */
export function normaliseChildStep(values: ChildStepValues) {
  return {
    legalName: clean(values.legalName),
    preferredName: clean(values.preferredName) || clean(values.legalName),
    dateOfBirth: values.dateOfBirth.trim(),
    homeLanguage: clean(values.homeLanguage, 60),
    requestedStartDate: values.requestedStartDate.trim() || null,
    classGroupId: values.classGroupId.trim() || null,
    settlingNotes: clean(values.settlingNotes, MAX_NOTES) || null,
  };
}

/** Signup: an address, a password long enough to be worth hashing, a name. */
export function validateSignup(input: {
  email: string;
  password: string;
  fullName: string;
}): ValidationResult {
  const errors: FieldError[] = [];
  if (!isEmailShaped(input.email ?? '')) {
    errors.push({ field: 'email', message: 'Enter a valid email address.' });
  }
  if ((input.password ?? '').length < 8) {
    errors.push({ field: 'password', message: 'Use at least 8 characters.' });
  }
  if (isBlank(input.fullName)) {
    errors.push({ field: 'fullName', message: 'Your full name is required.' });
  }
  return { ok: errors.length === 0, errors };
}

// ============================================================================
// PHASE 3 — the rest of the wizard
// ============================================================================
// Steps 2–7 follow step 1's posture exactly: forgiving where a family is only
// half-finished, strict where a wrong value would be dangerous (a severity
// with no allergen, a date that does not exist, a collector with no name).
//
// FIELD NAMING FOR REPEATED ROWS. A row's error names the row it belongs to:
// `allergies.0.severity`. `errorPath()` collapses the index to `#` so the UI's
// key map stays one entry per FIELD, not one per row. Every list step uses it.
// ============================================================================

/** `allergies.0.severity` → `allergies.#.severity`. */
export function errorPath(field: string): string {
  return field.replace(/\.\d+\./g, '.#.');
}

/** Row index out of a field name, or null for a plain field. */
export function errorRowIndex(field: string): number | null {
  const m = /\.(\d+)\./.exec(field);
  return m ? Number(m[1]) : null;
}

export const MAX_TAGS = 12;
export const MAX_TAG = 40;
export const MAX_ROWS = 10;

/** Trim, drop blanks, de-duplicate case-insensitively, cap count and length.
 *  Every tag-input value in CMS goes through this before it is stored. */
export function cleanTags(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const value = clean(String(item ?? ''), MAX_TAG);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

// ── step 2 · about your child ───────────────────────────────────────────────

export const TEMPERAMENT_KEYS = ['settling', 'company', 'adventure', 'energy'] as const;
export type TemperamentKey = (typeof TEMPERAMENT_KEYS)[number];

export interface AboutChildStepValues {
  likes: string[];
  dislikes: string[];
  interests: string[];
  /** axis → 1–5. A missing axis means the family did not answer. */
  temperament: Record<string, number>;
  parentNotes: string;
  guruSync: boolean;
}

export const EMPTY_ABOUT_CHILD: AboutChildStepValues = {
  likes: [],
  dislikes: [],
  interests: [],
  temperament: {},
  parentNotes: '',
  guruSync: true,
};

/**
 * Nothing here is required — a family that skips it still gets a place. What is
 * checked is SHAPE: an axis value must be a whole number 1–5, because the
 * teacher insight card and the Guru feed both read it as a position on a line.
 */
export function validateAboutChildStep(values: AboutChildStepValues): ValidationResult {
  const errors: FieldError[] = [];
  for (const [axis, value] of Object.entries(values.temperament ?? {})) {
    if (!(TEMPERAMENT_KEYS as readonly string[]).includes(axis)) {
      errors.push({ field: `temperament.${axis}`, message: 'Unknown temperament axis.' });
      continue;
    }
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      errors.push({ field: `temperament.${axis}`, message: 'Choose a point on the line.' });
    }
  }
  return { ok: errors.length === 0, errors };
}

export function normaliseAboutChildStep(values: AboutChildStepValues) {
  const temperament: Record<string, number> = {};
  for (const axis of TEMPERAMENT_KEYS) {
    const value = values.temperament?.[axis];
    if (Number.isInteger(value) && value >= 1 && value <= 5) temperament[axis] = value as number;
  }
  return {
    likes: cleanTags(values.likes),
    dislikes: cleanTags(values.dislikes),
    interests: cleanTags(values.interests),
    temperament,
    parentNotes: clean(values.parentNotes, MAX_NOTES) || null,
    guruSync: values.guruSync !== false,
  };
}

// ── step 3 · medical & allergies ────────────────────────────────────────────

export const ALLERGY_SEVERITIES = ['mild', 'moderate', 'severe'] as const;

export interface AllergyRowValues {
  allergen: string;
  severity: string;
  reaction: string;
  responsePlan: string;
  carriesEpipen: boolean;
}

export const EMPTY_ALLERGY_ROW: AllergyRowValues = {
  allergen: '',
  severity: '',
  reaction: '',
  responsePlan: '',
  carriesEpipen: false,
};

export interface MedicalStepValues {
  conditions: string[];
  doctorName: string;
  doctorPhone: string;
  emergencyNote: string;
  allergies: AllergyRowValues[];
}

export const EMPTY_MEDICAL: MedicalStepValues = {
  conditions: [],
  doctorName: '',
  doctorPhone: '',
  emergencyNote: '',
  allergies: [],
};

/** A row the family started but left entirely blank is not an error — it is a
 *  row they changed their mind about, and it is dropped on normalise. */
function isBlankAllergy(row: AllergyRowValues): boolean {
  return (
    isBlank(row.allergen) &&
    isBlank(row.severity) &&
    isBlank(row.reaction) &&
    isBlank(row.responsePlan) &&
    !row.carriesEpipen
  );
}

/**
 * The one genuinely dangerous step. An allergy row that names an allergen MUST
 * carry a severity — the roster's flag weighting, the wall poster and the
 * kitchen sheet are all computed from it, and "unknown severity" silently reads
 * as mild. Everything else stays optional.
 */
export function validateMedicalStep(values: MedicalStepValues): ValidationResult {
  const errors: FieldError[] = [];
  const rows = values.allergies ?? [];
  if (rows.length > MAX_ROWS) {
    errors.push({ field: 'allergies', message: 'Too many allergy rows.' });
  }
  rows.forEach((row, i) => {
    if (isBlankAllergy(row)) return;
    if (isBlank(row.allergen)) {
      errors.push({ field: `allergies.${i}.allergen`, message: 'Name the allergen.' });
    }
    if (isBlank(row.severity)) {
      errors.push({ field: `allergies.${i}.severity`, message: 'Choose a severity.' });
    } else if (!(ALLERGY_SEVERITIES as readonly string[]).includes(row.severity)) {
      errors.push({ field: `allergies.${i}.severity`, message: 'Unknown severity.' });
    }
  });
  return { ok: errors.length === 0, errors };
}

export function normaliseMedicalStep(values: MedicalStepValues) {
  return {
    conditions: cleanTags(values.conditions),
    doctorName: clean(values.doctorName) || null,
    doctorPhone: clean(values.doctorPhone, 40) || null,
    emergencyNote: clean(values.emergencyNote, MAX_NOTES) || null,
    allergies: (values.allergies ?? [])
      .filter((row) => !isBlankAllergy(row))
      .slice(0, MAX_ROWS)
      .map((row) => ({
        allergen: clean(row.allergen),
        severity: row.severity as 'mild' | 'moderate' | 'severe',
        reaction: clean(row.reaction, 300),
        responsePlan: clean(row.responsePlan, MAX_NOTES),
        carriesEpipen: Boolean(row.carriesEpipen),
        // Severe allergies always reach the wall; the family does not choose.
        requiresPoster: row.severity === 'severe' || Boolean(row.carriesEpipen),
      })),
  };
}

// ── step 4 · dietary ────────────────────────────────────────────────────────

export const DIETARY_REASONS = ['allergy', 'medical', 'religious', 'cultural', 'preference'] as const;

export interface DietaryRowValues {
  label: string;
  reason: string;
  excludedFoods: string[];
  notes: string;
}

export const EMPTY_DIETARY_ROW: DietaryRowValues = {
  label: '',
  reason: '',
  excludedFoods: [],
  notes: '',
};

export interface DietaryStepValues {
  requirements: DietaryRowValues[];
}

export const EMPTY_DIETARY: DietaryStepValues = { requirements: [] };

function isBlankDietary(row: DietaryRowValues): boolean {
  return (
    isBlank(row.label) &&
    isBlank(row.reason) &&
    (row.excludedFoods ?? []).length === 0 &&
    isBlank(row.notes)
  );
}

export function validateDietaryStep(values: DietaryStepValues): ValidationResult {
  const errors: FieldError[] = [];
  const rows = values.requirements ?? [];
  if (rows.length > MAX_ROWS) {
    errors.push({ field: 'requirements', message: 'Too many dietary rows.' });
  }
  rows.forEach((row, i) => {
    if (isBlankDietary(row)) return;
    if (isBlank(row.label)) {
      errors.push({ field: `requirements.${i}.label`, message: 'Name the requirement.' });
    }
    if (isBlank(row.reason)) {
      errors.push({ field: `requirements.${i}.reason`, message: 'Choose a reason.' });
    } else if (!(DIETARY_REASONS as readonly string[]).includes(row.reason)) {
      errors.push({ field: `requirements.${i}.reason`, message: 'Unknown reason.' });
    }
  });
  return { ok: errors.length === 0, errors };
}

export function normaliseDietaryStep(values: DietaryStepValues) {
  return {
    requirements: (values.requirements ?? [])
      .filter((row) => !isBlankDietary(row))
      .slice(0, MAX_ROWS)
      .map((row) => ({
        label: clean(row.label),
        reason: row.reason as 'allergy' | 'medical' | 'religious' | 'cultural' | 'preference',
        excludedFoods: cleanTags(row.excludedFoods),
        notes: clean(row.notes, MAX_NOTES) || null,
      })),
  };
}

// ── step 5 · previous school ────────────────────────────────────────────────

export interface PreviousSchoolRowValues {
  name: string;
  countryCode: string;
  city: string;
  attendedFrom: string;
  attendedTo: string;
  notes: string;
}

export const EMPTY_PREVIOUS_SCHOOL_ROW: PreviousSchoolRowValues = {
  name: '',
  countryCode: '',
  city: '',
  attendedFrom: '',
  attendedTo: '',
  notes: '',
};

export interface PreviousSchoolStepValues {
  /** "This is their first setting" — an explicit answer, not an empty form. */
  noPreviousSchool: boolean;
  schools: PreviousSchoolRowValues[];
}

export const EMPTY_PREVIOUS_SCHOOL: PreviousSchoolStepValues = {
  noPreviousSchool: false,
  schools: [],
};

function isBlankSchool(row: PreviousSchoolRowValues): boolean {
  return (
    isBlank(row.name) &&
    isBlank(row.countryCode) &&
    isBlank(row.city) &&
    isBlank(row.attendedFrom) &&
    isBlank(row.attendedTo) &&
    isBlank(row.notes)
  );
}

export function validatePreviousSchoolStep(values: PreviousSchoolStepValues): ValidationResult {
  const errors: FieldError[] = [];
  const rows = values.schools ?? [];
  if (rows.length > MAX_ROWS) {
    errors.push({ field: 'schools', message: 'Too many schools.' });
  }
  rows.forEach((row, i) => {
    if (isBlankSchool(row)) return;
    if (isBlank(row.name)) {
      errors.push({ field: `schools.${i}.name`, message: 'Name the setting.' });
    }
    const from = isBlank(row.attendedFrom) ? null : parseIsoDate(row.attendedFrom.trim());
    const to = isBlank(row.attendedTo) ? null : parseIsoDate(row.attendedTo.trim());
    if (!isBlank(row.attendedFrom) && !from) {
      errors.push({ field: `schools.${i}.attendedFrom`, message: 'That date is not a real date.' });
    }
    if (!isBlank(row.attendedTo) && !to) {
      errors.push({ field: `schools.${i}.attendedTo`, message: 'That date is not a real date.' });
    }
    if (from && to && to.getTime() < from.getTime()) {
      errors.push({ field: `schools.${i}.attendedTo`, message: 'The end date is before the start.' });
    }
  });
  return { ok: errors.length === 0, errors };
}

export function normalisePreviousSchoolStep(values: PreviousSchoolStepValues) {
  return {
    noPreviousSchool: Boolean(values.noPreviousSchool),
    schools: values.noPreviousSchool
      ? []
      : (values.schools ?? [])
          .filter((row) => !isBlankSchool(row))
          .slice(0, MAX_ROWS)
          .map((row) => ({
            name: clean(row.name),
            countryCode: clean(row.countryCode, 60) || null,
            city: clean(row.city, 80) || null,
            attendedFrom: row.attendedFrom.trim() || null,
            attendedTo: row.attendedTo.trim() || null,
            notes: clean(row.notes, MAX_NOTES) || null,
          })),
  };
}

// ── step 6 · contacts & pickup ──────────────────────────────────────────────

export const RELATIONSHIPS = [
  'mother',
  'father',
  'aunt',
  'uncle',
  'grandparent',
  'guardian',
  'other',
] as const;

export interface ContactRowValues {
  fullName: string;
  relationship: string;
  phone: string;
  email: string;
  /** May this person collect the child unaccompanied? */
  canCollect: boolean;
  note: string;
}

export const EMPTY_CONTACT_ROW: ContactRowValues = {
  fullName: '',
  relationship: '',
  phone: '',
  email: '',
  canCollect: false,
  note: '',
};

export interface ContactsStepValues {
  contacts: ContactRowValues[];
}

export const EMPTY_CONTACTS: ContactsStepValues = { contacts: [] };

function isBlankContact(row: ContactRowValues): boolean {
  return (
    isBlank(row.fullName) &&
    isBlank(row.relationship) &&
    isBlank(row.phone) &&
    isBlank(row.email) &&
    isBlank(row.note)
  );
}

/**
 * The school must be able to reach somebody. At least ONE contact with a name
 * and a phone number is required — this is the step a school genuinely cannot
 * open a file without, and the only one in phase 3 with a hard floor.
 */
export function validateContactsStep(values: ContactsStepValues): ValidationResult {
  const errors: FieldError[] = [];
  const rows = (values.contacts ?? []).filter((row) => !isBlankContact(row));
  if (rows.length > MAX_ROWS) {
    errors.push({ field: 'contacts', message: 'Too many contacts.' });
  }
  if (rows.length === 0) {
    errors.push({ field: 'contacts', message: 'Add at least one emergency contact.' });
  }
  (values.contacts ?? []).forEach((row, i) => {
    if (isBlankContact(row)) return;
    if (isBlank(row.fullName)) {
      errors.push({ field: `contacts.${i}.fullName`, message: "Enter the person's name." });
    }
    if (isBlank(row.relationship)) {
      errors.push({ field: `contacts.${i}.relationship`, message: 'Choose a relationship.' });
    } else if (!(RELATIONSHIPS as readonly string[]).includes(row.relationship)) {
      errors.push({ field: `contacts.${i}.relationship`, message: 'Unknown relationship.' });
    }
    if (isBlank(row.phone)) {
      errors.push({ field: `contacts.${i}.phone`, message: 'Enter a phone number.' });
    }
    if (!isBlank(row.email) && !isEmailShaped(row.email)) {
      errors.push({ field: `contacts.${i}.email`, message: 'Enter a valid email address.' });
    }
  });
  return { ok: errors.length === 0, errors };
}

export function normaliseContactsStep(values: ContactsStepValues) {
  return {
    contacts: (values.contacts ?? [])
      .filter((row) => !isBlankContact(row))
      .slice(0, MAX_ROWS)
      .map((row, index) => ({
        fullName: clean(row.fullName),
        relationship: row.relationship as
          | 'mother'
          | 'father'
          | 'aunt'
          | 'uncle'
          | 'grandparent'
          | 'guardian'
          | 'other',
        phone: clean(row.phone, 40),
        email: clean(row.email, MAX_EMAIL).toLowerCase() || null,
        canCollect: Boolean(row.canCollect),
        // Call order is the order the family listed them in. Ties never happen.
        contactPriority: index + 1,
        note: clean(row.note, 300) || null,
      })),
  };
}

// ── step 7 · consents ───────────────────────────────────────────────────────

export const CONSENT_KINDS = [
  'photography',
  'media',
  'outings',
  'emergency_medical',
  'sunscreen',
  'data_processing',
] as const;

export interface ConsentsStepValues {
  /** kind → granted. A missing key is a REFUSAL, never an omission. */
  consents: Record<string, boolean>;
  /** The typed name that stands as the signature on the application. */
  signedName: string;
}

export const EMPTY_CONSENTS: ConsentsStepValues = { consents: {}, signedName: '' };

/**
 * 🚨 A consent is only ever granted by an explicit tick. There is no "assume
 * yes" branch anywhere in this file — `lib/cms/engine/photo-filter.ts` treats a
 * missing row as refusal, and this validator must never be the thing that
 * quietly turns a blank into a grant.
 */
export function validateConsentsStep(values: ConsentsStepValues): ValidationResult {
  const errors: FieldError[] = [];
  for (const kind of Object.keys(values.consents ?? {})) {
    if (!(CONSENT_KINDS as readonly string[]).includes(kind)) {
      errors.push({ field: `consents.${kind}`, message: 'Unknown consent.' });
    }
  }
  if (isBlank(values.signedName)) {
    errors.push({ field: 'signedName', message: 'Type your name to sign.' });
  }
  return { ok: errors.length === 0, errors };
}

export function normaliseConsentsStep(values: ConsentsStepValues) {
  const consents: { kind: string; granted: boolean }[] = [];
  for (const kind of CONSENT_KINDS) {
    consents.push({ kind, granted: values.consents?.[kind] === true });
  }
  return { consents, signedName: clean(values.signedName) };
}

// ============================================================================
// PHASE 4 — THE TEACHER'S ROSTER
// ============================================================================
// A teacher entering their own class is a DIFFERENT act from a family filling
// in an enrolment, and these validators say so:
//
//   · The floor is LOWER. A family applying for a place must give a legal name,
//     a date of birth and an emergency contact. A teacher typing twenty names
//     off a printed list on a Sunday night has a NAME, and that is a real,
//     useful record — the allergies and the phone numbers arrive over the next
//     fortnight, one child at a time. A form that refuses the name until the
//     phone number exists collects nothing at all.
//   · The rules that remain are the SAFETY ones, and they are identical to the
//     family's: a named allergen still needs a severity (the poster and the
//     kitchen sheet are computed from it), a named dietary requirement still
//     needs a reason, a contact still needs a phone. Those are re-used from the
//     step validators above rather than re-stated, so the two ends of the
//     hourglass can never disagree about what a valid allergy is.
// ============================================================================

/** Ceiling on ONE import. A room is not 200 children; a 200-line paste is a
 *  mistake, and refusing it beats writing it. Mirrors the parser's own cap. */
export const MAX_IMPORT_ROWS = 60;

// ── one child, as a teacher types them ──────────────────────────────────────

export interface RosterChildValues {
  /** The name the room uses. The ONLY required field. */
  preferredName: string;
  /** As on the birth certificate. Blank → the preferred name is used. */
  legalName: string;
  dateOfBirth: string;
  homeLanguage: string;
  /** Staff's own line about the child. Never the family's words. */
  staffNote: string;
  allergies: AllergyRowValues[];
  dietary: DietaryRowValues[];
  contacts: ContactRowValues[];
}

export const EMPTY_ROSTER_CHILD: RosterChildValues = {
  preferredName: '',
  legalName: '',
  dateOfBirth: '',
  homeLanguage: '',
  staffNote: '',
  allergies: [],
  dietary: [],
  contacts: [],
};

/**
 * The whole quick-edit form. Returns EVERY problem at once (the row editor
 * shows them all inline), and stays silent about everything a teacher has
 * simply not got to yet.
 */
export function validateRosterChild(
  values: RosterChildValues,
  now: Date = new Date()
): ValidationResult {
  const errors: FieldError[] = [];

  if (isBlank(values.preferredName)) {
    errors.push({ field: 'preferredName', message: "The child's name is required." });
  }

  // A date is optional here — but a date that IS given must be real, because
  // every document computes an age from it.
  if (!isBlank(values.dateOfBirth)) {
    const dob = parseIsoDate(values.dateOfBirth.trim());
    if (!dob) {
      errors.push({ field: 'dateOfBirth', message: 'That date is not a real date.' });
    } else if (dob.getTime() > now.getTime()) {
      errors.push({ field: 'dateOfBirth', message: 'Date of birth is in the future.' });
    } else {
      const years = Math.floor((now.getTime() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
      if (years > MAX_AGE_YEARS) {
        errors.push({
          field: 'dateOfBirth',
          message: `That date would make the child ${years} years old — please check the year.`,
        });
      }
    }
  }

  // The three list halves borrow the family-side validators verbatim, then
  // re-label their fields so the row editor can point at the right box.
  for (const e of validateMedicalStep({ ...EMPTY_MEDICAL, allergies: values.allergies }).errors) {
    errors.push(e);
  }
  for (const e of validateDietaryStep({ requirements: values.dietary }).errors) {
    errors.push({ ...e, field: e.field.replace(/^requirements/, 'dietary') });
  }
  // Contacts are OPTIONAL on the roster (the family step requires one) — so the
  // "add at least one" error is dropped and the per-row rules are kept.
  for (const e of validateContactsStep({ contacts: values.contacts }).errors) {
    if (e.field === 'contacts') continue;
    errors.push(e);
  }

  return { ok: errors.length === 0, errors };
}

export function normaliseRosterChild(values: RosterChildValues) {
  const preferredName = clean(values.preferredName);
  return {
    preferredName,
    // A teacher rarely knows the legal name on night one. Falling back to the
    // preferred name keeps `legal_name NOT NULL` honest without inventing a
    // different person, and the family corrects it when they connect.
    legalName: clean(values.legalName) || preferredName,
    dateOfBirth: parseIsoDate(clean(values.dateOfBirth, 10)) ? clean(values.dateOfBirth, 10) : null,
    homeLanguage: clean(values.homeLanguage, 40) || 'en',
    staffNote: clean(values.staffNote, MAX_NOTES) || null,
    allergies: normaliseMedicalStep({ ...EMPTY_MEDICAL, allergies: values.allergies }).allergies,
    dietary: normaliseDietaryStep({ requirements: values.dietary }).requirements,
    contacts: normaliseContactsStep({ contacts: values.contacts }).contacts,
  };
}

// ── the paste import ────────────────────────────────────────────────────────

export interface RosterImportRow {
  name: string;
  dateOfBirth: string;
}

/**
 * A pasted list, after the teacher has edited the preview. Rows with no name
 * are dropped rather than refused — the preview already showed them, and the
 * teacher leaving one blank means "skip this line", not "fail my import".
 */
export function validateRosterImport(rows: RosterImportRow[]): ValidationResult {
  const errors: FieldError[] = [];
  const usable = (rows ?? []).filter((r) => !isBlank(r.name));
  if (usable.length === 0) {
    errors.push({ field: 'rows', message: 'Nothing to import — add at least one name.' });
  }
  if (usable.length > MAX_IMPORT_ROWS) {
    errors.push({
      field: 'rows',
      message: `That is ${usable.length} children in one import — the limit is ${MAX_IMPORT_ROWS}.`,
    });
  }
  (rows ?? []).forEach((row, i) => {
    if (isBlank(row.name)) return;
    if (!isBlank(row.dateOfBirth) && !parseIsoDate(clean(row.dateOfBirth, 10))) {
      errors.push({ field: `rows.${i}.dateOfBirth`, message: 'That date is not a real date.' });
    }
  });
  return { ok: errors.length === 0, errors };
}

export function normaliseRosterImport(rows: RosterImportRow[]) {
  return (rows ?? [])
    .filter((row) => !isBlank(row.name))
    .slice(0, MAX_IMPORT_ROWS)
    .map((row) => {
      const name = clean(row.name);
      const dob = clean(row.dateOfBirth, 10);
      return {
        preferredName: name,
        legalName: name,
        dateOfBirth: parseIsoDate(dob) ? dob : null,
      };
    });
}
