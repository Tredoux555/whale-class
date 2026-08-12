// lib/cms/demo/seed.ts
// ============================================================================
// SEEDED DEMO RECORDS — the phase-1 stand-in for a database.
// ============================================================================
// These are ordinary `lib/cms/engine/types` values. The Today page builds its whole
// roster from them by calling the engine, exactly as it will call the engine
// when the rows come from Supabase. When db/schema.sql is wired up, this file
// is deleted and NOTHING in the pages changes.
//
// Names, rooms and allergens are DATA, not UI strings — they are deliberately
// not routed through t().

import type {
  Allergy,
  Child,
  ChildProfile,
  ClassGroup,
  DietaryRequirement,
  Guardian,
  MedicalRecord,
  Organisation,
  School,
  SchoolSummary,
} from '@/lib/cms/engine/types';
import { id } from '@/lib/cms/engine/types';
import type { DailyFacts } from '@/lib/cms/engine/roster';
import type {
  AllergyId,
  ChildId,
  ChildProfileId,
  ClassGroupId,
  DietaryRequirementId,
  GuardianId,
  MedicalRecordId,
  OrganisationId,
  SchoolId,
} from '@/lib/cms/engine/types';

const ORG_ID = id<OrganisationId>('org-harbor-trust');
const SCHOOL_ID = id<SchoolId>('school-harbor-primary');
const SUNRISE = id<ClassGroupId>('class-sunrise');

export const demoOrganisation: Organisation = {
  id: ORG_ID,
  name: 'Harbor Early Years Trust',
  slug: 'harbor-early-years-trust',
  countryCode: 'ZA',
  defaultLocale: 'en',
  createdAt: '2024-01-15T08:00:00Z',
};

export const demoSchool: School = {
  id: SCHOOL_ID,
  organisationId: ORG_ID,
  name: 'Harbor House',
  slug: 'harbor-house',
  timezone: 'Africa/Johannesburg',
  addressLine: '14 Quay Road',
  phone: '+27 21 555 0140',
  email: 'office@harborhouse.example',
  createdAt: '2024-01-20T08:00:00Z',
};

export const demoClassGroup: ClassGroup = {
  id: SUNRISE,
  schoolId: SCHOOL_ID,
  name: 'Sunrise Room',
  ageMin: 3,
  ageMax: 5,
  capacity: 21,
  leadTeacherName: 'K. Mbeki',
};

function guardian(
  key: string,
  fullName: string,
  relationship: Guardian['relationship'],
  locale: string,
  priority: number,
  canCollect = true
): Guardian {
  return {
    id: id<GuardianId>(key),
    fullName,
    relationship,
    phone: '+27 82 555 01' + String(priority).padStart(2, '0'),
    email: `${key}@example.com`,
    preferredLocale: locale,
    canCollect,
    contactPriority: priority,
    restrictionNote: null,
  };
}

function child(
  key: string,
  legalName: string,
  preferredName: string,
  dateOfBirth: string,
  homeLanguage: string,
  guardians: Guardian[]
): Child {
  return {
    id: id<ChildId>(key),
    schoolId: SCHOOL_ID,
    classGroupId: SUNRISE,
    legalName,
    preferredName,
    dateOfBirth,
    homeLanguage,
    guardians,
    authorisedCollectors: guardians.filter((g) => g.canCollect).map((g) => g.id),
    photoUrl: null,
    staffNote: null,
    createdAt: '2025-01-10T08:00:00Z',
  };
}

// ── guardians ───────────────────────────────────────────────────────────────
const ngozi = guardian('g-ngozi', 'Ngozi Okonkwo', 'mother', 'en', 1);
const chiamaka = guardian('g-chiamaka', 'Chiamaka Eze', 'aunt', 'en', 2);
const liWei = guardian('g-liwei', 'Li Wei', 'father', 'zh', 1);
const carmen = guardian('g-carmen', 'Carmen Marín', 'mother', 'es', 1);
const irina = guardian('g-irina', 'Irina Volkova', 'mother', 'ru', 1);
const yusuf = guardian('g-yusuf', 'Yusuf Haddad', 'father', 'ar', 1);
const grace = guardian('g-grace', 'Grace Wanjiku', 'mother', 'sw', 1);

// ── children ────────────────────────────────────────────────────────────────
export const demoChildren: Child[] = [
  child('c-amara', 'Amara Chidinma Okonkwo', 'Amara', '2021-06-04', 'Igbo', [ngozi, chiamaka]),
  child('c-wei', 'Zhang Wei', 'Wei', '2021-09-18', 'Mandarin', [liWei]),
  child('c-sofia', 'Sofía Marín Delgado', 'Sofía', '2021-03-27', 'Spanish', [carmen]),
  child('c-dmitri', 'Dmitri Volkov', 'Dmitri', '2021-11-02', 'Russian', [irina]),
  child('c-layla', 'Layla Haddad', 'Layla', '2022-01-14', 'Arabic', [yusuf]),
  child('c-tumelo', 'Tumelo Wanjiku', 'Tumelo', '2021-08-09', 'Swahili', [grace]),
];

const [amara, wei, sofia, dmitri, layla, tumelo] = demoChildren;

// ── health & diet ───────────────────────────────────────────────────────────
export const demoAllergies: Allergy[] = [
  {
    id: id<AllergyId>('a-amara-peanut'),
    childId: amara.id,
    allergen: 'Peanut',
    severity: 'severe',
    reaction: 'Anaphylaxis',
    responsePlan: 'EpiPen in the Sunrise Room cabinet, then call emergency services.',
    requiresPoster: true,
    carriesEpipen: true,
  },
  {
    id: id<AllergyId>('a-layla-egg'),
    childId: layla.id,
    allergen: 'Egg',
    severity: 'moderate',
    reaction: 'Hives, swelling',
    responsePlan: 'Antihistamine on file. Call the guardian.',
    requiresPoster: true,
    carriesEpipen: false,
  },
  {
    id: id<AllergyId>('a-tumelo-bee'),
    childId: tumelo.id,
    allergen: 'Bee sting',
    severity: 'mild',
    reaction: 'Local swelling',
    responsePlan: 'Cold compress. Note it in the day log.',
    requiresPoster: false,
    carriesEpipen: false,
  },
];

export const demoDietary: DietaryRequirement[] = [
  {
    id: id<DietaryRequirementId>('d-wei-veg'),
    childId: wei.id,
    label: 'Vegetarian',
    reason: 'cultural',
    excludedFoods: ['meat', 'fish', 'gelatine'],
    notes: null,
  },
  {
    id: id<DietaryRequirementId>('d-sofia-lactose'),
    childId: sofia.id,
    label: 'Lactose free',
    reason: 'medical',
    excludedFoods: ['milk', 'cheese', 'yoghurt'],
    notes: 'Oat milk provided from home.',
  },
  {
    id: id<DietaryRequirementId>('d-layla-halal'),
    childId: layla.id,
    label: 'Halal',
    reason: 'religious',
    excludedFoods: ['pork', 'non-halal meat'],
    notes: null,
  },
  {
    id: id<DietaryRequirementId>('d-amara-nofree'),
    childId: amara.id,
    label: 'Nut-free table',
    reason: 'allergy',
    excludedFoods: ['all nuts'],
    notes: 'Seated at the window table at every meal.',
  },
];

export const demoMedical: MedicalRecord[] = [
  {
    id: id<MedicalRecordId>('m-amara'),
    childId: amara.id,
    conditions: ['Peanut anaphylaxis'],
    medications: [
      {
        name: 'EpiPen Jr',
        dose: '0.15mg',
        schedule: 'As needed',
        heldOnSite: true,
        storageLocation: 'Sunrise Room cabinet',
      },
    ],
    doctorName: 'Dr N. Pillay',
    doctorPhone: '+27 21 555 0199',
    emergencyNote: 'EpiPen stored in the Sunrise Room cabinet. Reviewed 4 Aug by K. Mbeki.',
    lastReviewedAt: '2026-08-04',
    reviewedByName: 'K. Mbeki',
  },
  {
    id: id<MedicalRecordId>('m-dmitri'),
    childId: dmitri.id,
    conditions: ['Mild asthma'],
    medications: [
      {
        name: 'Inhaler',
        dose: '2 puffs',
        schedule: 'Before outdoor play',
        heldOnSite: true,
        storageLocation: 'Office medical fridge',
      },
    ],
    doctorName: 'Dr A. Botha',
    doctorPhone: '+27 21 555 0177',
    emergencyNote: null,
    lastReviewedAt: '2025-06-12',
    reviewedByName: 'K. Mbeki',
  },
];

// ── today's facts ───────────────────────────────────────────────────────────
export const demoDailyFacts: DailyFacts[] = [
  {
    childId: amara.id,
    attendance: 'present',
    arrivedAt: '08:04',
    collectorGuardianId: chiamaka.id,
    collectionTime: '15:30',
  },
  { childId: wei.id, attendance: 'present', arrivedAt: '08:12' },
  { childId: sofia.id, attendance: 'present', arrivedAt: '08:26' },
  { childId: dmitri.id, attendance: 'absent', absenceReason: 'sick' },
  {
    childId: layla.id,
    attendance: 'present',
    arrivedAt: '07:58',
    collectorGuardianId: yusuf.id,
    collectionTime: '16:15',
  },
  { childId: tumelo.id, attendance: 'expected' },
];

/** The signed-in parent for the demo dashboard: Amara's and Layla's families. */
export const demoParentName = 'Ngozi';
export const demoParentChildren: Child[] = [amara, layla];

/** The org overview's stub rows — three schools in one trust. */
export const demoSchoolSummaries: SchoolSummary[] = [
  {
    school: demoSchool,
    childCount: 118,
    classGroupCount: 6,
    allergyFlagCount: 14,
    openEnrollmentCount: 7,
  },
  {
    school: { ...demoSchool, id: id<SchoolId>('school-quay'), name: 'Quay Street', slug: 'quay-street' },
    childCount: 84,
    classGroupCount: 4,
    allergyFlagCount: 9,
    openEnrollmentCount: 3,
  },
  {
    school: { ...demoSchool, id: id<SchoolId>('school-northwind'), name: 'Northwind', slug: 'northwind' },
    childCount: 142,
    classGroupCount: 8,
    allergyFlagCount: 21,
    openEnrollmentCount: 12,
  },
];

/** Age in whole years on a given day. Used by the parent child cards. */
export function ageInYears(dateOfBirth: string, on: Date = new Date('2026-08-11')): number {
  const dob = new Date(dateOfBirth);
  let age = on.getFullYear() - dob.getFullYear();
  const monthDiff = on.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && on.getDate() < dob.getDate())) age -= 1;
  return age;
}

/** Fixed "today" so screenshots and the demo never drift. */
// ── the family's own words (phase 3) ────────────────────────────────────────
// Seeded `ChildProfile` records so the teacher's insight panel is walkable with
// no database — and so the "About your child" step has something to be checked
// against. Names, likes and notes are DATA, deliberately not routed through t().
//
// Note what is NOT here: three of the six children have no profile at all. That
// is the honest demo — a room where some families have filled the step in and
// some have not, which is what a teacher actually opens on a Monday.
export const demoChildProfiles: ChildProfile[] = [
  {
    id: id<ChildProfileId>('p-amara'),
    childId: amara.id,
    schoolId: SCHOOL_ID,
    likes: ['puddles', 'her red blanket', 'singing in the car'],
    dislikes: ['hand dryers', 'being rushed'],
    interests: ['bugs', 'pouring water', 'her baby cousin'],
    temperament: { settling: 4, company: 5, adventure: 2, energy: 3 },
    parentNotes:
      'Goodbyes are hard for about five minutes and then she is fine — one long hug, then go, and please do not come back. She will tell you when she needs the toilet, but only if you ask twice.',
    guruSync: true,
    guruSyncedAt: '2026-08-01T09:12:00Z',
    createdAt: '2026-08-01T09:12:00Z',
    updatedAt: '2026-08-01T09:12:00Z',
  },
  {
    id: id<ChildProfileId>('p-wei'),
    childId: wei.id,
    schoolId: SCHOOL_ID,
    likes: ['trains', 'noodles', 'sweeping'],
    dislikes: ['loud music'],
    interests: ['maps', 'building tall things'],
    temperament: { settling: 2, company: 2, adventure: 4, energy: 4 },
    parentNotes:
      'He speaks more Mandarin than English at home and understands far more than he says. Give him a job to do and he settles immediately.',
    guruSync: true,
    guruSyncedAt: '2026-07-28T16:40:00Z',
    createdAt: '2026-07-28T16:40:00Z',
    updatedAt: '2026-07-28T16:40:00Z',
  },
  {
    id: id<ChildProfileId>('p-layla'),
    childId: layla.id,
    schoolId: SCHOOL_ID,
    likes: ['drawing', 'her grandmother', 'cats'],
    dislikes: ['sitting still for long', 'sudden noises'],
    interests: ['animals', 'colours'],
    temperament: { settling: 3, company: 4, adventure: 3, energy: 2 },
    parentNotes:
      'She is quiet for the first hour and then she is the loudest one in the room. Both are her.',
    guruSync: false,
    guruSyncedAt: null,
    createdAt: '2026-08-04T11:05:00Z',
    updatedAt: '2026-08-04T11:05:00Z',
  },
];

export const DEMO_DATE = '2026-08-11';
export const DEMO_DATE_LABEL = 'Tuesday 11 August';
