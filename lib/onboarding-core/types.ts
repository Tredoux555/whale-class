// lib/onboarding-core/types.ts
//
// The shared Child Onboarding intake shape. ONE definition, two products:
// Montree (this repo, /montree/parent/onboarding) and PSS / Potato Snaps
// (phase 2). Everything a family tells the school at enrollment lives here.
//
// 🚨 HARD RULE FOR THIS WHOLE PACKAGE (lib/onboarding-core/**):
//     imports NOTHING from lib/montree/* or lib/potato/*.
//     React + the TS stdlib only. Each adapter owns its own auth, storage
//     bucket, URL resolution, i18n and persistence — the core owns the shape,
//     the validation and the paper.
//
// Documents are stored as STORAGE PATHS, never URLs. A path means nothing
// outside its bucket, and each system resolves it through its own proxy.

/** Where an intake is in its life. */
export type IntakeStatus = 'draft' | 'submitted' | 'committed';

/** Consent keys. PIPL (and GDPR) require separate, purpose-specific consent —
 *  one blanket "I agree" checkbox is not lawful. Each of these renders as its
 *  own checkbox and carries its own grant timestamp. */
export type ConsentKey =
  | 'photo_internal'
  | 'photo_marketing'
  | 'emergency_treatment'
  | 'sunscreen_medication'
  | 'data_privacy';

export const CONSENT_KEYS: ConsentKey[] = [
  'photo_internal',
  'photo_marketing',
  'emergency_treatment',
  'sunscreen_medication',
  'data_privacy',
];

export interface ConsentRecord {
  granted: boolean;
  /** ISO timestamp of the moment it was granted; null while ungranted. */
  at: string | null;
}

export type AllergySeverity = 'mild' | 'moderate' | 'severe';
export type ToiletingStatus = 'trained' | 'training' | 'diapers' | '';
export type ChildSex = 'male' | 'female' | '';

export interface Guardian {
  name: string;
  relation: string;
  phone: string;
  wechat?: string;
  email?: string;
}

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

/** An adult the family authorises to collect the child. The photo is the
 *  point: the pickup sheet the school prints shows a face, not a name. */
export interface PickupPerson {
  name: string;
  relation: string;
  phone: string;
  /** Storage path (adapter-owned bucket), not a URL. */
  photoPath?: string;
}

export interface Allergy {
  allergen: string;
  severity: AllergySeverity;
  /** What staff must do — "epi-pen in the red bag, then call 120". */
  action?: string;
}

export interface IntakeIdentity {
  legalName: string;
  preferredName?: string;
  /** ISO date, YYYY-MM-DD. */
  dob: string;
  sex: ChildSex;
  nationality?: string;
  homeLanguages?: string[];
}

export interface IntakeFamily {
  guardians: Guardian[];
  homeAddress?: string;
}

export interface IntakeEmergency {
  contacts: EmergencyContact[];
}

export interface IntakePickup {
  persons: PickupPerson[];
  notes?: string;
}

export interface IntakeHealth {
  allergies: Allergy[];
  dietaryRestrictions?: string;
  conditions?: string;
  medications?: string;
  physicianName?: string;
  physicianPhone?: string;
  bloodType?: string;
}

/** Storage paths only. The adapter resolves them to displayable URLs. */
export interface IntakeDocuments {
  facePhotoPath?: string;
  vaccinationBookletPath?: string;
  healthCheckPath?: string;
  medicalCertPaths?: string[];
}

/** The section that becomes the child's psychological picture — this is what
 *  feeds Montree's Guru context. Everything here is optional; a family that
 *  writes one sentence has still helped. */
export interface IntakeDevelopment {
  temperamentNotes?: string;
  strengths?: string;
  growthAreas?: string;
  fears?: string;
  comfortItems?: string;
  toileting?: ToiletingStatus;
  napHabits?: string;
  eatingHabits?: string;
  separationHistory?: string;
  priorCare?: string;
  otherNotes?: string;
}

export interface IntakeForm {
  identity: IntakeIdentity;
  family: IntakeFamily;
  emergency: IntakeEmergency;
  pickup: IntakePickup;
  health: IntakeHealth;
  documents: IntakeDocuments;
  consents: Record<ConsentKey, ConsentRecord>;
  development: IntakeDevelopment;
}

export type IntakeSectionKey = keyof IntakeForm;

export const INTAKE_SECTION_ORDER: IntakeSectionKey[] = [
  'identity',
  'family',
  'emergency',
  'pickup',
  'health',
  'documents',
  'consents',
  'development',
];

export function emptyGuardian(): Guardian {
  return { name: '', relation: '', phone: '', wechat: '', email: '' };
}

export function emptyEmergencyContact(): EmergencyContact {
  return { name: '', relation: '', phone: '' };
}

export function emptyPickupPerson(): PickupPerson {
  return { name: '', relation: '', phone: '', photoPath: '' };
}

export function emptyAllergy(): Allergy {
  return { allergen: '', severity: 'mild', action: '' };
}

function emptyConsents(): Record<ConsentKey, ConsentRecord> {
  const out = {} as Record<ConsentKey, ConsentRecord>;
  for (const key of CONSENT_KEYS) out[key] = { granted: false, at: null };
  return out;
}

/** A blank, structurally complete form. Every required list starts with one
 *  empty row so the parent sees fields rather than an "Add" button alone. */
export function emptyIntake(): IntakeForm {
  return {
    identity: {
      legalName: '',
      preferredName: '',
      dob: '',
      sex: '',
      nationality: '',
      homeLanguages: [],
    },
    family: { guardians: [emptyGuardian()], homeAddress: '' },
    emergency: { contacts: [emptyEmergencyContact()] },
    pickup: { persons: [emptyPickupPerson()], notes: '' },
    health: {
      allergies: [],
      dietaryRestrictions: '',
      conditions: '',
      medications: '',
      physicianName: '',
      physicianPhone: '',
      bloodType: '',
    },
    documents: { medicalCertPaths: [] },
    consents: emptyConsents(),
    development: {
      temperamentNotes: '',
      strengths: '',
      growthAreas: '',
      fears: '',
      comfortItems: '',
      toileting: '',
      napHabits: '',
      eatingHabits: '',
      separationHistory: '',
      priorCare: '',
      otherNotes: '',
    },
  };
}

/**
 * Coerce an unknown blob (a JSONB column, a request body) into a structurally
 * complete IntakeForm. Missing sections fall back to the empty shape, so a
 * form saved by an older version of the app can always be rendered.
 */
export function normalizeIntake(input: unknown): IntakeForm {
  const base = emptyIntake();
  if (!input || typeof input !== 'object') return base;
  const raw = input as Partial<IntakeForm>;

  const consents = { ...base.consents };
  const rawConsents = raw.consents as Record<string, unknown> | undefined;
  if (rawConsents && typeof rawConsents === 'object') {
    for (const key of CONSENT_KEYS) {
      const c = rawConsents[key] as ConsentRecord | undefined;
      if (c && typeof c === 'object') {
        consents[key] = {
          granted: c.granted === true,
          at: typeof c.at === 'string' ? c.at : null,
        };
      }
    }
  }

  const guardians = raw.family?.guardians;
  const contacts = raw.emergency?.contacts;

  return {
    identity: { ...base.identity, ...(raw.identity || {}) },
    family: {
      ...base.family,
      ...(raw.family || {}),
      guardians: Array.isArray(guardians) && guardians.length > 0 ? guardians : base.family.guardians,
    },
    emergency: {
      contacts: Array.isArray(contacts) && contacts.length > 0 ? contacts : base.emergency.contacts,
    },
    pickup: {
      ...base.pickup,
      ...(raw.pickup || {}),
      persons: Array.isArray(raw.pickup?.persons) ? raw.pickup.persons : base.pickup.persons,
    },
    health: {
      ...base.health,
      ...(raw.health || {}),
      allergies: Array.isArray(raw.health?.allergies) ? raw.health.allergies : [],
    },
    documents: {
      ...base.documents,
      ...(raw.documents || {}),
      medicalCertPaths: Array.isArray(raw.documents?.medicalCertPaths)
        ? raw.documents.medicalCertPaths
        : [],
    },
    consents,
    development: { ...base.development, ...(raw.development || {}) },
  };
}

/** The name the school should actually use on a label. */
export function displayName(form: IntakeForm): string {
  const preferred = (form.identity.preferredName || '').trim();
  if (preferred) return preferred;
  return (form.identity.legalName || '').trim();
}

/** Allergens the school must not miss — the red flag on the pickup sheet.
 *  Severe first, then moderate. Mild allergies are on the health record but
 *  don't earn a warning on a sheet a stranger reads at the door. */
export function criticalAllergens(form: IntakeForm): string[] {
  const rank = (s: AllergySeverity) => (s === 'severe' ? 0 : 1);
  return (form.health.allergies || [])
    .filter((a) => !!a && (a.severity === 'severe' || a.severity === 'moderate') && !!a.allergen?.trim())
    .sort((a, b) => rank(a.severity) - rank(b.severity))
    .map((a) => a.allergen.trim());
}

/** Whole years between dob and now; null when dob is unusable. */
export function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const then = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(then.getTime())) return null;
  const now = new Date();
  let years = now.getUTCFullYear() - then.getUTCFullYear();
  const m = now.getUTCMonth() - then.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < then.getUTCDate())) years -= 1;
  if (years < 0 || years > 120) return null;
  return years;
}
