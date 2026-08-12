// lib/montree/cms-bridge/document-source.ts
// ============================================================================
// THE BRIDGE. CMS phase 6.
// ============================================================================
// The founder is a Montessori teacher with a real room (Whale Class) whose
// twenty children already live in Montree's own tables. The CMS document engine
// is the thing he wants pointed at them — without a second login, a second
// database, or retyping a single name.
//
// This module is the whole seam: Montree rows in, a CMS `DocumentSource` out.
//
// 🚨 DIRECTION LAW (amended, CLAUDE.md CMS section):
//     CMS still imports NOTHING from lib/montree/**. That has not changed and
//     must not. What phase 6 adds is the OTHER direction: Montree may import
//     the PURE engine (lib/cms/engine/*) and the brand-neutral PAPER
//     (components/cms/documents/*). Paper is white in both brands by law, so a
//     printed sheet is not a brand surface. Harbor SCREEN chrome stays behind —
//     the montree surface builds its own dark-forest toolbar.
//
// 🚨 THIS FILE IS PURE. No supabase, no fetch, no clock, no i18n. The route
//     reads rows and hands them here; every decision below is testable in
//     `tests/montree-cms-bridge.test.ts` with a fixture and nothing else.
//
// 🚨 COMMITTED INTAKE ONLY. `montree_child_intake` is review-gated (standing
//     rule, Aug 10): nothing a parent submits touches the live record until a
//     teacher commits it. A document is the live record on paper, so a draft or
//     an unreviewed submission may never reach one. The caller filters on
//     status; `buildDocumentSource` filters AGAIN, because a document that
//     prints an unreviewed allergy is worse than one that prints none.
//
// 🚨 SPARSE IS THE NORMAL CASE, NOT THE EDGE CASE. On the day this ships, Whale
//     Class has twenty children and zero intake rows. Every child still appears
//     on the class list and the labels with whatever is genuinely known (name,
//     nickname, birthday, the teacher's own note); the health documents come
//     back honestly empty and the surface points at the intake flow. Nothing
//     here invents a value it was not given.

import {
  id,
  type Allergy,
  type AllergySeverity,
  type Child,
  type ChildId,
  type ClassGroup,
  type ClassGroupId,
  type DietaryRequirement,
  type Guardian,
  type GuardianId,
  type MedicalRecord,
  type Medication,
  type Relationship,
  type School,
  type SchoolId,
} from '@/lib/cms/engine/types';
import type { DocumentSource } from '@/lib/cms/engine/doc-generator';
import { normalizeIntake, type IntakeForm } from '@/lib/onboarding-core';

// ── the rows this bridge reads ──────────────────────────────────────────────
// Declared structurally rather than imported from a DB-types package, for the
// same reason the CMS guru feed declares its output structurally: the shape a
// module depends on should be visible in the module.

export interface MontreeSchoolRow {
  id: string;
  name?: string | null;
  /** IANA zone from `montree_schools.timezone` (lib/montree/school-time.ts). */
  timezone?: string | null;
  slug?: string | null;
}

export interface MontreeClassroomRow {
  id: string;
  school_id?: string | null;
  name?: string | null;
  /** "3-6" on `montree_classrooms.age_group`. Parsed, never guessed. */
  age_group?: string | null;
}

/** `montree_children`, exactly the columns that exist (schema scouted, not
 *  imagined): id · name · nickname · date_of_birth · age · notes · photo_url ·
 *  settings · classroom_id · school_id · is_active · enrolled_at. */
export interface MontreeChildRow {
  id: string;
  name?: string | null;
  nickname?: string | null;
  date_of_birth?: string | null;
  age?: number | null;
  notes?: string | null;
  photo_url?: string | null;
  classroom_id?: string | null;
  school_id?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

/** A `montree_child_intake` row. `data` is the JSONB IntakeForm. */
export interface MontreeIntakeRow {
  child_id: string;
  status?: string | null;
  data?: unknown;
  committed_at?: string | null;
}

export interface DocumentSourceInput {
  school: MontreeSchoolRow;
  classroom: MontreeClassroomRow;
  /** Active children only — the caller filters `is_active`; so do we. */
  children: MontreeChildRow[];
  /** Committed intakes for those children. Anything else is dropped. */
  intakes: MontreeIntakeRow[];
  /** The day the documents are FOR: YYYY-MM-DD in the SCHOOL's zone. */
  date: string;
  /** Carried onto guardians so a future comms router has it. Never printed. */
  locale?: string;
}

/**
 * The sentinel a child with no known birthday carries, so the paper prints
 * "Not known" instead of a plausible wrong age. Value duplicated from
 * `lib/cms/db/queries.ts` / `doc-generator.ts` on purpose — the bridge does not
 * import the CMS db layer, and the engine's own guard keys on this exact string.
 */
export const UNKNOWN_DOB = '1900-01-01';

// ── small, honest converters ────────────────────────────────────────────────

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** ISO date or null. `montree_children.date_of_birth` is a DATE column, but a
 *  timestamp string has been seen in the wild, so take the date part. */
function isoDate(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

/** Free text into list items. Handles the CJK separators a Chinese parent's
 *  keyboard actually emits (、，；) alongside the Latin ones. */
function splitList(value: unknown): string[] {
  const raw = text(value);
  if (!raw) return [];
  return raw
    .split(/[,;\n\r，、；]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function clamp(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

/**
 * `montree_classrooms.age_group` is free-ish text with one dominant form:
 * "3-6". Parsed when it parses, left at the widest sane band when it does not.
 * The band is not printed on any document today — it exists because ClassGroup
 * requires it, and a made-up narrow band would be a lie waiting to be read.
 */
function ageBand(ageGroup: unknown): { ageMin: number; ageMax: number } {
  const match = /(\d{1,2})\s*[-–—~]\s*(\d{1,2})/.exec(text(ageGroup));
  if (!match) return { ageMin: 0, ageMax: 18 };
  const lo = Number(match[1]);
  const hi = Number(match[2]);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo) return { ageMin: 0, ageMax: 18 };
  return { ageMin: lo, ageMax: hi };
}

// ── relationships ───────────────────────────────────────────────────────────

/**
 * Montree's intake asks for a RELATION as free text; the CMS engine types it.
 * Anything unrecognised becomes 'other' — which prints as "Other", an honest
 * word, rather than being forced into "guardian" and implying legal standing
 * nobody claimed.
 *
 * Chinese terms are first-class here: this school's families type 妈妈, not
 * "mother", and a relative dropped into "Other" on an emergency sheet is a
 * small daily insult in the room this was built for.
 */
const RELATIONSHIP_PATTERNS: [RegExp, Relationship][] = [
  [/(^|\b)(mother|mom|mum|mama|maman|мама|мать|母亲|妈妈|妈|母)/i, 'mother'],
  [/(^|\b)(father|dad|papa|père|папа|отец|父亲|爸爸|爸|父)/i, 'father'],
  // 🚨 `nana` / `nan` (British for a grandmother) MUST be whole words. Without
  // the trailing guard, "nanny" — a paid carer, routinely the ONLY name on a
  // pickup list — matched `nan` and printed as the child's grandparent on the
  // emergency sheet. Caught by tests/montree-cms-bridge.test.ts.
  [
    /(^|\b)(grand(ma|pa|mother|father|parent)|granny|nana(?![a-z])|nan(?![a-z])|abuel|бабушка|дедушка|奶奶|爷爷|外婆|外公|姥姥|姥爷|祖母|祖父)/i,
    'grandparent',
  ],
  [/(^|\b)(aunt|auntie|tía|тётя|阿姨|姑姑|姨妈|舅妈)/i, 'aunt'],
  [/(^|\b)(uncle|tío|дядя|叔叔|舅舅|伯伯|姑父)/i, 'uncle'],
  [/(^|\b)(guardian|legal guardian|опекун|监护人|法定监护人)/i, 'guardian'],
];

export function toRelationship(raw: unknown): Relationship {
  const value = text(raw);
  if (!value) return 'other';
  for (const [pattern, relationship] of RELATIONSHIP_PATTERNS) {
    if (pattern.test(value)) return relationship;
  }
  return 'other';
}

// ── allergies ───────────────────────────────────────────────────────────────

/**
 * Does this allergy's response text say the child carries an adrenaline
 * auto-injector? Montree's intake has no boolean for it (CMS gained one in
 * migration 330; Montree's `Allergy` is `{ allergen, severity, action? }`), and
 * the poster's whole ordering rule is "EpiPen children first".
 *
 * So it is READ, from the one field where a parent would ever write it, in the
 * words they would write it in. A false positive costs a child a place at the
 * top of a poster they were already on; a false negative is exactly today's
 * behaviour. The asymmetry is why this heuristic is allowed to exist — and why
 * it is confined to this one function.
 */
const EPIPEN_PATTERN =
  /(epi[-\s]?pen|epipen|jext|anapen|auvi[-\s]?q|emerade|adrenal|epinephrin|肾上腺素|注射笔|自动注射)/gi;

// 🚨 NEGATION GUARD. "No EpiPen needed" and "EpiPen not required" both contain
// the word, and without this a parent explicitly saying their child does NOT
// carry one was printed at the top of the poster as if they did — the exact
// false positive the asymmetry note above accepts, but only for genuine
// ambiguity, not a plain negative sentence. Checked on a short window either
// side of the match (not the whole string) so an unrelated "no" elsewhere in
// the response plan — "no other allergies, carries an EpiPen" — still flags.
const EPIPEN_NEGATION_WORD = /\b(no|not|never|doesn'?t|don'?t|isn'?t|without|none)\b/i;
const EPIPEN_NEGATION_WINDOW = 20;

export function carriesEpipenFrom(action: unknown): boolean {
  const value = text(action);
  const pattern = new RegExp(EPIPEN_PATTERN);
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value))) {
    const before = value.slice(Math.max(0, match.index - EPIPEN_NEGATION_WINDOW), match.index);
    const after = value.slice(
      match.index + match[0].length,
      match.index + match[0].length + EPIPEN_NEGATION_WINDOW
    );
    if (!EPIPEN_NEGATION_WORD.test(before) && !EPIPEN_NEGATION_WORD.test(after)) return true;
  }
  return false;
}

function toSeverity(raw: unknown): AllergySeverity {
  const value = text(raw).toLowerCase();
  if (value === 'severe' || value === 'moderate' || value === 'mild') return value;
  // An unreadable severity is treated as the WORST case, never the mildest:
  // a row that lost its severity in a migration must not quietly become "mild".
  return 'severe';
}

// ── guardians / collectors ──────────────────────────────────────────────────

interface PersonDraft {
  name: string;
  relation: string;
  phone: string;
  email: string;
  /** May this person take the child home? */
  canCollect: boolean;
}

/**
 * Everybody the family named, once each, in the order a school would call them.
 *
 * ORDER: guardians (the family) → emergency contacts (who you ring) → pickup
 * people who are nobody else on the list (who may collect). That is the order
 * `contactPriority` gets, and the emergency-contacts document prints in it.
 *
 * WHO MAY COLLECT: guardians and the explicitly authorised pickup people.
 * Emergency-contact-only people may NOT — "the person you ring at 11am is not
 * always the person allowed to take the child home at 3pm" (doc-generator.ts),
 * and Montree's own printed authorisation sheet already draws that same line
 * (lib/onboarding-core/print/PickupSheets.tsx shows guardians AND pickup people).
 *
 * DEDUPE on name+phone: the same grandmother is routinely typed into both the
 * emergency list and the pickup list, and a sheet that names her twice reads as
 * two different people at the door.
 */
function peopleFrom(form: IntakeForm | null): PersonDraft[] {
  if (!form) return [];
  const out: PersonDraft[] = [];
  const seen = new Map<string, PersonDraft>();

  const push = (draft: PersonDraft) => {
    if (!draft.name) return;
    const key = `${draft.name.toLocaleLowerCase()}|${draft.phone.replace(/\D/g, '')}`;
    const existing = seen.get(key);
    if (existing) {
      // Merge rather than duplicate: whichever row knew a phone or a collect
      // right wins, so listing granny twice can only ever ADD information.
      existing.phone = existing.phone || draft.phone;
      existing.email = existing.email || draft.email;
      existing.relation = existing.relation || draft.relation;
      existing.canCollect = existing.canCollect || draft.canCollect;
      return;
    }
    seen.set(key, draft);
    out.push(draft);
  };

  for (const guardian of form.family?.guardians ?? []) {
    push({
      name: text(guardian?.name),
      relation: text(guardian?.relation),
      phone: text(guardian?.phone),
      email: text(guardian?.email),
      canCollect: true,
    });
  }
  for (const contact of form.emergency?.contacts ?? []) {
    push({
      name: text(contact?.name),
      relation: text(contact?.relation),
      phone: text(contact?.phone),
      email: '',
      canCollect: false,
    });
  }
  for (const person of form.pickup?.persons ?? []) {
    push({
      name: text(person?.name),
      relation: text(person?.relation),
      phone: text(person?.phone),
      email: '',
      canCollect: true,
    });
  }
  return out;
}

// ── the build ───────────────────────────────────────────────────────────────

function toSchool(row: MontreeSchoolRow, timezone: string): School {
  return {
    id: id<SchoolId>(row.id),
    // Montree has no organisation row for an ordinary school, and the document
    // engine never reads this field — it is carried so the type is honest about
    // where the school sits. The school stands for itself.
    organisationId: id(row.id),
    name: text(row.name) || '—',
    slug: text(row.slug) || row.id,
    timezone,
    addressLine: null,
    phone: null,
    email: null,
    createdAt: '',
  };
}

function toClassGroup(row: MontreeClassroomRow, schoolId: SchoolId): ClassGroup {
  const band = ageBand(row.age_group);
  return {
    id: id<ClassGroupId>(row.id),
    schoolId,
    name: text(row.name) || '—',
    ageMin: band.ageMin,
    ageMax: band.ageMax,
    // Capacity and lead teacher are not on `montree_classrooms`. 0 / null say
    // "not recorded"; a made-up 24 would print as fact on a room's own page.
    capacity: 0,
    leadTeacherName: null,
  };
}

/**
 * The child's name, three ways, from what Montree actually stores.
 *
 * `montree_children.name` is the full name the roster carries and `nickname` is
 * what the room calls them, so nickname → preferredName is a direct read. When
 * there is no nickname the preferred name is the FIRST word of the full name,
 * which is what a label on a coat peg has to say — and `surnameOf` in the
 * engine then suppresses a repeated family name, so nothing prints twice.
 * A committed intake's own preferred name wins over the derived guess, because
 * the family typed it on purpose.
 */
function namesFor(row: MontreeChildRow, form: IntakeForm | null): {
  legalName: string;
  preferredName: string;
} {
  const rosterName = text(row.name);
  const legalName = text(form?.identity?.legalName) || rosterName || '—';
  const nickname = text(row.nickname);
  const intakePreferred = text(form?.identity?.preferredName);
  const firstWord = rosterName.split(/\s+/)[0] ?? '';
  const preferredName = nickname || intakePreferred || firstWord || legalName;
  return { legalName, preferredName };
}

function toChild(
  row: MontreeChildRow,
  form: IntakeForm | null,
  schoolId: SchoolId,
  classGroupId: ClassGroupId,
  locale: string,
  people: PersonDraft[]
): Child {
  const { legalName, preferredName } = namesFor(row, form);
  const guardians: Guardian[] = people.map((person, index) => ({
    id: id<GuardianId>(`${row.id}:g${index}`),
    fullName: person.name,
    relationship: toRelationship(person.relation),
    phone: person.phone || null,
    email: person.email || null,
    preferredLocale: locale,
    canCollect: person.canCollect,
    contactPriority: index + 1,
    // Montree's intake has no court-order / no-contact field. Null is the
    // truth, and the emergency sheet prints nothing rather than an empty label.
    restrictionNote: null,
  }));

  return {
    id: id<ChildId>(row.id),
    schoolId,
    classGroupId,
    legalName,
    preferredName,
    // No birthday on file → the sentinel, so the paper says "Not known".
    // `montree_children.age` is deliberately NOT converted into one: an integer
    // age cannot produce a date, and a fabricated birthday prints as fact.
    dateOfBirth: isoDate(row.date_of_birth) || UNKNOWN_DOB,
    homeLanguage: text(form?.identity?.homeLanguages?.[0]),
    guardians,
    authorisedCollectors: guardians.filter((g) => g.canCollect).map((g) => g.id),
    photoUrl: text(row.photo_url) || null,
    // `montree_children.notes` IS the teacher's own line about this child —
    // the same thing `cms_children.staff_note` holds. It prints on the class
    // list, clamped so one long note cannot push a 20-child room onto page 3.
    staffNote: text(row.notes) ? clamp(text(row.notes), 160) : null,
    createdAt: text(row.created_at),
  };
}

function allergiesFor(childId: ChildId, form: IntakeForm | null): Allergy[] {
  const rows = form?.health?.allergies ?? [];
  const out: Allergy[] = [];
  rows.forEach((allergy, index) => {
    const allergen = text(allergy?.allergen);
    if (!allergen) return;
    const severity = toSeverity(allergy?.severity);
    const responsePlan = text(allergy?.action);
    const carriesEpipen = carriesEpipenFrom(responsePlan);
    out.push({
      id: id(`${String(childId)}:a${index}`),
      childId,
      allergen,
      severity,
      // Montree's intake asks WHAT TO DO, not what happens. Empty is honest;
      // the poster simply omits the "Reaction" line rather than printing a
      // heading over nothing.
      reaction: '',
      responsePlan,
      // The CMS rule, unchanged: the wall poster carries severe allergies and
      // children carrying adrenaline. Twenty mild pollen notes are a wall
      // nobody reads.
      requiresPoster: severity === 'severe' || carriesEpipen,
      carriesEpipen,
    });
  });
  return out;
}

function dietaryFor(childId: ChildId, form: IntakeForm | null): DietaryRequirement[] {
  const raw = text(form?.health?.dietaryRestrictions);
  if (!raw) return [];
  const parts = splitList(raw);
  return [
    {
      id: id(`${String(childId)}:d0`),
      childId,
      // One free-text answer becomes ONE requirement, headed by the family's own
      // words. The kitchen sheet then groups by that label, which for free text
      // degrades gracefully to one group per child — honest, and still readable.
      label: clamp(raw, 60),
      // 🚨 'medical', and this is a reading of the source rather than a guess:
      // Montree collects this field INSIDE `health`, beside allergies,
      // conditions and medications. The record frames it as health information,
      // so 'medical' is what the data supports — and it is the reading that
      // keeps a cook cautious. 'preference' would invite a kitchen to treat a
      // dairy exclusion as a whim.
      reason: 'medical',
      // Only split when the answer really is a list. "No dairy, no egg" is two
      // rules a cook can shop against; one long sentence is not, and chopping
      // it would produce nonsense line items.
      excludedFoods: parts.length >= 2 && parts.every((p) => p.length <= 40) ? parts : [],
      notes: raw.length > 60 ? raw : null,
    },
  ];
}

function medicalFor(
  childId: ChildId,
  form: IntakeForm | null,
  committedAt: string | null
): MedicalRecord | null {
  if (!form) return null;
  const health = form.health ?? { allergies: [] };
  const conditions = splitList(health.conditions);
  const medicationText = text(health.medications);
  const doctorName = text(health.physicianName) || null;
  const doctorPhone = text(health.physicianPhone) || null;
  const bloodType = text(health.bloodType);

  const medications: Medication[] = medicationText
    ? [
        {
          name: medicationText,
          dose: '',
          schedule: '',
          // 🚨 TRUE on purpose. Montree's intake never asks whether the school
          // stores the medicine, and the emergency-contacts document prints
          // ONLY medications flagged as held on site. Marking these false would
          // silently drop a child's medication off the sheet an ambulance crew
          // reads. The location is null — the paper prints nothing for it — so
          // this claims the drug exists, never that it is in a named cupboard.
          heldOnSite: true,
          storageLocation: null,
        },
      ]
    : [];

  // Blood type has no slot in the CMS medical model and rides the emergency
  // note rather than being dropped — an ambulance asks for it early. It is
  // written as the bare value; the document prints the note verbatim.
  const emergencyNote = bloodType || null;

  if (
    conditions.length === 0 &&
    medications.length === 0 &&
    !doctorName &&
    !doctorPhone &&
    !emergencyNote
  ) {
    // Nothing clinical on file. Returning null (rather than an empty record)
    // keeps the index page's "medical records" count honest.
    return null;
  }

  return {
    id: id(`${String(childId)}:m`),
    childId,
    conditions,
    medications,
    doctorName,
    doctorPhone,
    emergencyNote,
    // The teacher's commit IS the review — that is what review-gating means.
    lastReviewedAt: isoDate(committedAt),
    reviewedByName: null,
  };
}

/**
 * Montree rows → the CMS engine's `DocumentSource`.
 *
 * Children come through even with no intake at all; the health collections are
 * simply empty for them. That is the Whale Class case on day one and it must
 * produce a perfectly good class list and a perfectly good sheet of labels.
 */
export function buildDocumentSource(input: DocumentSourceInput): DocumentSource {
  const timezone = text(input.school.timezone) || 'UTC';
  const school = toSchool(input.school, timezone);
  const classGroup = toClassGroup(input.classroom, school.id);
  const locale = text(input.locale);

  // Committed only, and only the newest one per child if a table ever holds two.
  const formByChild = new Map<string, { form: IntakeForm; committedAt: string | null }>();
  for (const row of input.intakes ?? []) {
    if (!row || typeof row.child_id !== 'string') continue;
    if (text(row.status) !== 'committed') continue;
    const existing = formByChild.get(row.child_id);
    const committedAt = text(row.committed_at) || null;
    if (existing && (existing.committedAt || '') >= (committedAt || '')) continue;
    formByChild.set(row.child_id, { form: normalizeIntake(row.data), committedAt });
  }

  const children: Child[] = [];
  const allergies: Allergy[] = [];
  const dietary: DietaryRequirement[] = [];
  const medical: MedicalRecord[] = [];

  for (const row of input.children ?? []) {
    if (!row || typeof row.id !== 'string' || !row.id) continue;
    // Archived children never reach a document (the Aug-10 is_active rule).
    if (row.is_active === false) continue;

    const committed = formByChild.get(row.id) ?? null;
    const form = committed?.form ?? null;
    const child = toChild(row, form, school.id, classGroup.id, locale, peopleFrom(form));
    children.push(child);

    allergies.push(...allergiesFor(child.id, form));
    dietary.push(...dietaryFor(child.id, form));
    const record = medicalFor(child.id, form, committed?.committedAt ?? null);
    if (record) medical.push(record);
  }

  return {
    school,
    classGroup,
    date: isoDate(input.date) || input.date,
    children,
    allergies,
    dietary,
    medical,
  };
}

// ── what the index page says out loud ───────────────────────────────────────

/**
 * The honest half of the empty state. `countDocumentData` in the engine counts
 * what IS there; this counts what is MISSING, which on a brand-new feature is
 * the more useful number: "2 children have no committed intake yet" is what
 * turns a blank allergy poster from a bug into a to-do.
 */
export interface IntakeCoverage {
  children: number;
  withCommittedIntake: number;
  withoutCommittedIntake: number;
  /** Children with no birthday on file — the class list prints "Not known". */
  withoutDateOfBirth: number;
  /** Any committed intake at all? Drives "the feature has never been used". */
  anyIntake: boolean;
}

export function summariseIntakeCoverage(input: DocumentSourceInput): IntakeCoverage {
  const committed = new Set(
    (input.intakes ?? [])
      .filter((row) => row && text(row.status) === 'committed' && typeof row.child_id === 'string')
      .map((row) => row.child_id)
  );
  const active = (input.children ?? []).filter((row) => row && row.id && row.is_active !== false);
  const withIntake = active.filter((row) => committed.has(row.id)).length;
  return {
    children: active.length,
    withCommittedIntake: withIntake,
    withoutCommittedIntake: active.length - withIntake,
    withoutDateOfBirth: active.filter((row) => !isoDate(row.date_of_birth)).length,
    anyIntake: withIntake > 0,
  };
}
