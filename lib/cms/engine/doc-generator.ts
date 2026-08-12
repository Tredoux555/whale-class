// lib/cms/engine/doc-generator.ts
// ============================================================================
// THE PAYOFF OF THE WHOLE HOURGLASS. Phase 5.
// ============================================================================
// Every piece of paper a Montessori room runs on, generated from the record
// instead of maintained by hand: the class list, the pickup sheet on the door,
// the kitchen's dietary sheet, the allergy poster on the wall, the emergency
// contact file, the cubby labels.
//
// RULES — the same ones the rest of lib/cms/engine lives by, and they are what
// make this module worth having:
//
//   1. PURE. Records in, DOCUMENT MODELS out. No I/O, no clock (the caller
//      passes the date), no React, no Supabase. A page reads rows through
//      lib/cms/db/queries.ts, hands them here, and renders whatever comes back.
//   2. NO LOCALE. Not one string in this file is user-facing English. Column
//      headings are TRANSLATION KEYS; ages are numbers, not "4 years"; dates
//      are ISO, not "5 March". The VIEW localises, because the same document
//      must print in Arabic without the engine knowing Arabic exists.
//   3. NO PDF, NO HTML. A generator returns structured rows. Rendering is a
//      separate concern (components/cms/documents/**), which is what keeps this
//      testable and lets one model drive both a screen preview and paper.
//   4. THE SAFETY ORDERING IS THE ENGINE'S JOB, NOT THE VIEW'S. Severe before
//      moderate before mild; EpiPen children first on the poster. A renderer
//      that forgot to sort would produce a poster that kills somebody slowly.
//
// Phase 3's stub declared one flat `GeneratedDocument` with `rows:
// Record<string,string>[]`. That shape was replaced deliberately: an allergy
// poster is not a table, a label sheet is not a table, and flattening a child's
// four authorised collectors into a string column is exactly the kind of lossy
// pre-rendering that forces a view to re-parse its own data. Each document now
// has its own model, and `GeneratedDocument` is their discriminated union.
// ============================================================================

import type {
  Allergy,
  AllergySeverity,
  Child,
  ChildId,
  ClassGroup,
  DietaryReason,
  DietaryRequirement,
  Guardian,
  IsoDate,
  MedicalRecord,
  Relationship,
  School,
} from './types';

// ── kinds ───────────────────────────────────────────────────────────────────

export type DocumentKind =
  | 'class_list'
  | 'pickup_sheet'
  | 'name_labels'
  | 'dietary_sheet'
  | 'allergy_poster'
  | 'emergency_contacts';

/** In the order the documents index lists them — commonest first. */
export const DOCUMENT_KINDS: readonly DocumentKind[] = [
  'class_list',
  'pickup_sheet',
  'allergy_poster',
  'dietary_sheet',
  'emergency_contacts',
  'name_labels',
] as const;

export type PageSize = 'A4' | 'Letter';

export interface DocumentOptions {
  /** Locale the VIEW will render in. Carried so it lands in the model's meta
   *  and the renderer never has to be told twice. */
  locale: string;
  pageSize: PageSize;
  /** Who pressed print. Printed small in the footer of the sensitive ones. */
  printedByName: string | null;
  /** ISO timestamp. Passed in, never read from a clock — see rule 1. */
  generatedAt: string;
}

export function defaultOptions(locale: string, generatedAt: string): DocumentOptions {
  return { locale, pageSize: 'A4', printedByName: null, generatedAt };
}

/** Everything every generator is allowed to see. Assembled by the page from
 *  `loadTeacherRoster` (live) or `lib/cms/demo/seed.ts` (demo). */
export interface DocumentSource {
  school: School;
  classGroup: ClassGroup;
  /** The day the document is FOR, in the school's own timezone. */
  date: IsoDate;
  children: Child[];
  allergies: Allergy[];
  dietary: DietaryRequirement[];
  medical: MedicalRecord[];
}

/** The header block every document shares. */
export interface DocumentMeta {
  kind: DocumentKind;
  schoolName: string;
  roomName: string;
  date: IsoDate;
  locale: string;
  pageSize: PageSize;
  printedByName: string | null;
  generatedAt: string;
  /** Children the document actually covers — not always the whole room. */
  rowCount: number;
  totalChildren: number;
}

// ── shared derivations ──────────────────────────────────────────────────────

/** Severe first. Also the weight the roster's flags use — one scale, one file. */
const SEVERITY_ORDER: Record<AllergySeverity, number> = { severe: 0, moderate: 1, mild: 2 };

/** The unknown-date-of-birth sentinel a staff-entered child carries
 *  (`lib/cms/db/queries.ts`'s `UNKNOWN_DOB`). Duplicated here rather than
 *  imported — the engine does not depend on the db layer — the same reason
 *  `components/cms/documents/DocumentBody.tsx` duplicates it for the view. */
const UNKNOWN_DOB = '1900-01-01';

/**
 * Whole years and the leftover months on a given day. Returned as NUMBERS: "4y
 * 2m" is a locale decision and belongs to the view. Returns null for a date the
 * engine cannot read, rather than a wrong age.
 *
 * 🚨 A staff-entered child with no known birthday carries UNKNOWN_DOB
 * (1900-01-01), which is a syntactically real date — without this guard it
 * would compute a false ~126-year-old rather than print "Not known", exactly
 * the wrong-plausible-age bug the sentinel exists to prevent.
 */
export function ageOn(dateOfBirth: IsoDate, on: IsoDate): { years: number; months: number } | null {
  if (dateOfBirth === UNKNOWN_DOB) return null;
  const dob = new Date(`${dateOfBirth}T00:00:00Z`);
  const day = new Date(`${on}T00:00:00Z`);
  if (Number.isNaN(dob.getTime()) || Number.isNaN(day.getTime())) return null;
  let months =
    (day.getUTCFullYear() - dob.getUTCFullYear()) * 12 + (day.getUTCMonth() - dob.getUTCMonth());
  if (day.getUTCDate() < dob.getUTCDate()) months -= 1;
  if (months < 0) return null;
  return { years: Math.floor(months / 12), months: months % 12 };
}

/**
 * Family name, or null when it merely repeats the preferred name. "Zhang Wei"
 * with preferred "Wei" must not print as "Wei Wei" — the same rule the Today
 * page applies, kept here so every document inherits it.
 */
export function surnameOf(child: Pick<Child, 'legalName' | 'preferredName'>): string | null {
  const last = child.legalName.trim().split(/\s+/).slice(-1)[0] ?? '';
  return last && last.toLowerCase() !== child.preferredName.trim().toLowerCase() ? last : null;
}

/** Roll-order: preferred name, case-folded, locale-aware. */
function byName(a: Child, b: Child): number {
  return a.preferredName.localeCompare(b.preferredName);
}

function allergiesOf(source: DocumentSource, childId: ChildId): Allergy[] {
  return source.allergies
    .filter((a) => a.childId === childId)
    .sort((x, y) => SEVERITY_ORDER[x.severity] - SEVERITY_ORDER[y.severity]);
}

function dietaryOf(source: DocumentSource, childId: ChildId): DietaryRequirement[] {
  return source.dietary.filter((d) => d.childId === childId);
}

function medicalOf(source: DocumentSource, childId: ChildId): MedicalRecord | null {
  return source.medical.find((m) => m.childId === childId) ?? null;
}

/**
 * The people who may collect this child, in call order.
 *
 * 🚨 `child.authorisedCollectors` is the DERIVED truth (lib/cms/db/mappers.ts
 * computes it: a restriction note beats every other row, then the link, then
 * the guardian's own flag). This function filters on that list rather than on
 * `guardian.canCollect`, so a court order can never be undone by a document.
 */
export function collectorsOf(child: Child): Guardian[] {
  const allowed = new Set<string>(child.authorisedCollectors.map(String));
  return child.guardians
    .filter((g) => allowed.has(String(g.id)))
    .sort((a, b) => a.contactPriority - b.contactPriority);
}

function meta(
  kind: DocumentKind,
  source: DocumentSource,
  options: DocumentOptions,
  rowCount: number
): DocumentMeta {
  return {
    kind,
    schoolName: source.school.name,
    roomName: source.classGroup.name,
    date: source.date,
    locale: options.locale,
    pageSize: options.pageSize,
    printedByName: options.printedByName,
    generatedAt: options.generatedAt,
    rowCount,
    totalChildren: source.children.length,
  };
}

// ── 1 · class list ──────────────────────────────────────────────────────────

export interface ClassListRow {
  childId: string;
  preferredName: string;
  surname: string | null;
  legalName: string;
  dateOfBirth: IsoDate;
  age: { years: number; months: number } | null;
  homeLanguage: string;
  /** Allergen + how bad it is, severe first. Empty means no allergy on file.
   *  🚨 The SEVERITY travels with the name. "Peanut" alone on a class list is a
   *  fact without a weight, and a relief teacher reading it cannot tell a
   *  life-threatening allergy from a rash. */
  allergens: { name: string; severity: AllergySeverity }[];
  carriesEpipen: boolean;
  hasSevereAllergy: boolean;
  dietaryLabels: string[];
  staffNote: string | null;
}

export interface ClassListDoc {
  kind: 'class_list';
  meta: DocumentMeta;
  rows: ClassListRow[];
}

/** The room on one page: who is in it, how old they are, what to watch for. */
export function generateClassList(
  source: DocumentSource,
  options: DocumentOptions
): ClassListDoc {
  const rows: ClassListRow[] = [...source.children].sort(byName).map((child) => {
    const allergies = allergiesOf(source, child.id);
    return {
      childId: String(child.id),
      preferredName: child.preferredName,
      surname: surnameOf(child),
      legalName: child.legalName,
      dateOfBirth: child.dateOfBirth,
      age: ageOn(child.dateOfBirth, source.date),
      homeLanguage: child.homeLanguage,
      allergens: allergies.map((a) => ({ name: a.allergen, severity: a.severity })),
      carriesEpipen: allergies.some((a) => a.carriesEpipen),
      hasSevereAllergy: allergies.some((a) => a.severity === 'severe'),
      dietaryLabels: dietaryOf(source, child.id).map((d) => d.label),
      staffNote: child.staffNote ?? null,
    };
  });
  return { kind: 'class_list', meta: meta('class_list', source, options, rows.length), rows };
}

// ── 2 · pickup sheet ────────────────────────────────────────────────────────

export interface PickupCollector {
  guardianId: string;
  name: string;
  relationship: Relationship;
  phone: string | null;
  /** 1 = call first. */
  priority: number;
}

export interface PickupSheetRow {
  childId: string;
  childName: string;
  surname: string | null;
  collectors: PickupCollector[];
  /** True when NOBODY on file may collect — the row a manager must resolve
   *  before the end of the day, and the reason this is not an empty cell. */
  noCollector: boolean;
  /** Severe/EpiPen allergens, so the person at the door sees them too. */
  criticalAllergens: string[];
}

export interface PickupSheetDoc {
  kind: 'pickup_sheet';
  meta: DocumentMeta;
  rows: PickupSheetRow[];
  /** Blank columns the paper carries: time out, collected by, signature. The
   *  VIEW draws them; naming them here is what makes it a GATE sheet rather
   *  than a list of phone numbers. */
  signatureColumns: readonly ['collectedBy', 'time', 'signature'];
}

/** The sheet on the door: who may take whom, in call order, with a place to sign. */
export function generatePickupSheet(
  source: DocumentSource,
  options: DocumentOptions
): PickupSheetDoc {
  const rows: PickupSheetRow[] = [...source.children].sort(byName).map((child) => {
    const collectors = collectorsOf(child);
    const allergies = allergiesOf(source, child.id);
    return {
      childId: String(child.id),
      childName: child.preferredName,
      surname: surnameOf(child),
      collectors: collectors.map((g) => ({
        guardianId: String(g.id),
        name: g.fullName,
        relationship: g.relationship,
        phone: g.phone,
        priority: g.contactPriority,
      })),
      noCollector: collectors.length === 0,
      criticalAllergens: allergies
        .filter((a) => a.severity === 'severe' || a.carriesEpipen)
        .map((a) => a.allergen),
    };
  });
  return {
    kind: 'pickup_sheet',
    meta: meta('pickup_sheet', source, options, rows.length),
    rows,
    signatureColumns: ['collectedBy', 'time', 'signature'],
  };
}

// ── 3 · dietary sheet (the kitchen's copy) ──────────────────────────────────

export interface DietaryChildEntry {
  childId: string;
  childName: string;
  surname: string | null;
  excludedFoods: string[];
  notes: string | null;
  /** Allergen names that are ALSO a food risk — the kitchen must see both. */
  allergens: string[];
}

export interface DietaryGroup {
  /** The requirement as the family named it: "Halal", "Lactose free". */
  label: string;
  reason: DietaryReason;
  children: DietaryChildEntry[];
  /** Every excluded food across the group, de-duplicated — the shopping rule. */
  excludedFoods: string[];
}

export interface DietarySheetDoc {
  kind: 'dietary_sheet';
  meta: DocumentMeta;
  groups: DietaryGroup[];
  /** Children with a food ALLERGY but no dietary requirement on file. A kitchen
   *  reading only the dietary groups would miss them entirely, which is the
   *  single most dangerous thing this document could do. */
  allergyOnly: DietaryChildEntry[];
}

/**
 * Grouped BY REQUIREMENT, not by child. A cook plating twenty lunches asks
 * "who is dairy-free?" and needs one line to answer it; a per-child list makes
 * them read the whole page for every meal.
 */
export function generateDietarySheet(
  source: DocumentSource,
  options: DocumentOptions
): DietarySheetDoc {
  const childById = new Map(source.children.map((c) => [String(c.id), c]));
  const groups = new Map<string, DietaryGroup>();
  const covered = new Set<string>();

  for (const child of [...source.children].sort(byName)) {
    for (const requirement of dietaryOf(source, child.id)) {
      const key = `${requirement.label.toLocaleLowerCase()}|${requirement.reason}`;
      let group = groups.get(key);
      if (!group) {
        group = {
          label: requirement.label,
          reason: requirement.reason,
          children: [],
          excludedFoods: [],
        };
        groups.set(key, group);
      }
      group.children.push({
        childId: String(child.id),
        childName: child.preferredName,
        surname: surnameOf(child),
        excludedFoods: requirement.excludedFoods,
        notes: requirement.notes,
        allergens: allergiesOf(source, child.id).map((a) => a.allergen),
      });
      for (const food of requirement.excludedFoods) {
        if (!group.excludedFoods.some((f) => f.toLocaleLowerCase() === food.toLocaleLowerCase())) {
          group.excludedFoods.push(food);
        }
      }
      covered.add(String(child.id));
    }
  }

  const allergyOnly: DietaryChildEntry[] = [];
  for (const allergy of source.allergies) {
    const key = String(allergy.childId);
    if (covered.has(key)) continue;
    if (allergyOnly.some((e) => e.childId === key)) continue;
    const child = childById.get(key);
    if (!child) continue;
    allergyOnly.push({
      childId: key,
      childName: child.preferredName,
      surname: surnameOf(child),
      excludedFoods: [],
      notes: null,
      allergens: allergiesOf(source, child.id).map((a) => a.allergen),
    });
  }
  allergyOnly.sort((a, b) => a.childName.localeCompare(b.childName));

  const sorted = [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
  return {
    kind: 'dietary_sheet',
    meta: meta('dietary_sheet', source, options, sorted.length),
    groups: sorted,
    allergyOnly,
  };
}

// ── 4 · allergy poster (the wall) ───────────────────────────────────────────

export interface AllergyPosterEntry {
  allergyId: string;
  childId: string;
  childName: string;
  surname: string | null;
  allergen: string;
  severity: AllergySeverity;
  reaction: string;
  responsePlan: string;
  carriesEpipen: boolean;
  /** Where the pen or the antihistamine actually is, lifted from the medical
   *  record's on-site medication. The poster is useless without it. */
  medicationLocation: string | null;
}

export interface AllergyPosterDoc {
  kind: 'allergy_poster';
  meta: DocumentMeta;
  entries: AllergyPosterEntry[];
  epipenCount: number;
  severeCount: number;
}

/**
 * The page that goes on the wall at adult eye height. Big, glanceable, and
 * deliberately NOT everybody: only allergies flagged `requiresPoster` (which
 * lib/cms/validation.ts derives from "severe, or carries a pen"). A wall of
 * twenty mild pollen notes is a wall nobody reads, and the one that matters
 * disappears into it.
 *
 * Sorted EpiPen first, then severity, then name. That order is a safety
 * decision: the child a relief teacher must know about before anything else is
 * the one with adrenaline in the cabinet.
 */
export function generateAllergyPoster(
  source: DocumentSource,
  options: DocumentOptions
): AllergyPosterDoc {
  const childById = new Map(source.children.map((c) => [String(c.id), c]));

  const entries: AllergyPosterEntry[] = source.allergies
    .filter((a) => a.requiresPoster)
    .map((allergy) => {
      const child = childById.get(String(allergy.childId));
      if (!child) return null;
      const record = medicalOf(source, allergy.childId);
      const held = record?.medications.find((m) => m.heldOnSite) ?? null;
      return {
        allergyId: String(allergy.id),
        childId: String(child.id),
        childName: child.preferredName,
        surname: surnameOf(child),
        allergen: allergy.allergen,
        severity: allergy.severity,
        reaction: allergy.reaction,
        responsePlan: allergy.responsePlan,
        carriesEpipen: allergy.carriesEpipen,
        medicationLocation: held?.storageLocation ?? null,
      };
    })
    .filter((e): e is AllergyPosterEntry => e !== null)
    .sort((a, b) => {
      if (a.carriesEpipen !== b.carriesEpipen) return a.carriesEpipen ? -1 : 1;
      const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      return bySeverity !== 0 ? bySeverity : a.childName.localeCompare(b.childName);
    });

  return {
    kind: 'allergy_poster',
    meta: meta('allergy_poster', source, options, entries.length),
    entries,
    epipenCount: entries.filter((e) => e.carriesEpipen).length,
    severeCount: entries.filter((e) => e.severity === 'severe').length,
  };
}

// ── 5 · emergency contacts ──────────────────────────────────────────────────

export interface EmergencyContact {
  guardianId: string;
  name: string;
  relationship: Relationship;
  phone: string | null;
  priority: number;
  canCollect: boolean;
  /** A court order / no-contact note. Printed IN FULL and never abbreviated. */
  restrictionNote: string | null;
}

export interface EmergencyContactsRow {
  childId: string;
  childName: string;
  surname: string | null;
  dateOfBirth: IsoDate;
  contacts: EmergencyContact[];
  doctorName: string | null;
  doctorPhone: string | null;
  conditions: string[];
  /** Name + dose + where it is kept, for the medications held on site. */
  medications: { name: string; dose: string; schedule: string; location: string | null }[];
  emergencyNote: string | null;
  criticalAllergens: string[];
}

export interface EmergencyContactsDoc {
  kind: 'emergency_contacts';
  meta: DocumentMeta;
  rows: EmergencyContactsRow[];
}

/**
 * The file somebody opens with a phone already in their hand. Every contact the
 * child has, in the order the family said to call them, plus the doctor and the
 * one or two clinical facts an ambulance crew asks for first.
 *
 * Contacts are NOT filtered to collectors: the person you ring at 11am is not
 * always the person allowed to take the child home at 3pm, and conflating the
 * two is how a school ends up phoning nobody.
 */
export function generateEmergencyContacts(
  source: DocumentSource,
  options: DocumentOptions
): EmergencyContactsDoc {
  const rows: EmergencyContactsRow[] = [...source.children].sort(byName).map((child) => {
    const record = medicalOf(source, child.id);
    const allowed = new Set<string>(child.authorisedCollectors.map(String));
    return {
      childId: String(child.id),
      childName: child.preferredName,
      surname: surnameOf(child),
      dateOfBirth: child.dateOfBirth,
      contacts: [...child.guardians]
        .sort((a, b) => a.contactPriority - b.contactPriority)
        .map((g) => ({
          guardianId: String(g.id),
          name: g.fullName,
          relationship: g.relationship,
          phone: g.phone,
          priority: g.contactPriority,
          canCollect: allowed.has(String(g.id)),
          restrictionNote: g.restrictionNote,
        })),
      doctorName: record?.doctorName ?? null,
      doctorPhone: record?.doctorPhone ?? null,
      conditions: record?.conditions ?? [],
      medications: (record?.medications ?? [])
        .filter((m) => m.heldOnSite)
        .map((m) => ({
          name: m.name,
          dose: m.dose,
          schedule: m.schedule,
          location: m.storageLocation,
        })),
      emergencyNote: record?.emergencyNote ?? null,
      criticalAllergens: allergiesOf(source, child.id)
        .filter((a) => a.severity === 'severe' || a.carriesEpipen)
        .map((a) => a.allergen),
    };
  });
  return {
    kind: 'emergency_contacts',
    meta: meta('emergency_contacts', source, options, rows.length),
    rows,
  };
}

// ── 6 · name labels ─────────────────────────────────────────────────────────

export interface LabelCell {
  childId: string;
  /** What the room calls them — a three-year-old finds their peg by this. */
  name: string;
  surname: string | null;
  roomName: string;
}

export interface LabelsDoc {
  kind: 'name_labels';
  meta: DocumentMeta;
  cells: LabelCell[];
  /** Grid the view lays out. 3 × 8 on A4 is a coat-peg/cubby label at roughly
   *  63 × 34 mm — big enough to read from across a corridor, small enough that
   *  a room of 24 is one sheet. */
  columns: number;
  rowsPerPage: number;
}

export function generateNameLabels(
  source: DocumentSource,
  options: DocumentOptions
): LabelsDoc {
  const cells: LabelCell[] = [...source.children].sort(byName).map((child) => ({
    childId: String(child.id),
    name: child.preferredName,
    surname: surnameOf(child),
    roomName: source.classGroup.name,
  }));
  return {
    kind: 'name_labels',
    meta: meta('name_labels', source, options, cells.length),
    cells,
    columns: 3,
    rowsPerPage: 8,
  };
}

// ── dispatch ────────────────────────────────────────────────────────────────

export type GeneratedDocument =
  | ClassListDoc
  | PickupSheetDoc
  | DietarySheetDoc
  | AllergyPosterDoc
  | EmergencyContactsDoc
  | LabelsDoc;

/** What a document page calls once it has resolved its room and its rows. */
export function generate(
  kind: DocumentKind,
  source: DocumentSource,
  options: DocumentOptions
): GeneratedDocument {
  switch (kind) {
    case 'class_list':
      return generateClassList(source, options);
    case 'pickup_sheet':
      return generatePickupSheet(source, options);
    case 'dietary_sheet':
      return generateDietarySheet(source, options);
    case 'allergy_poster':
      return generateAllergyPoster(source, options);
    case 'emergency_contacts':
      return generateEmergencyContacts(source, options);
    case 'name_labels':
      return generateNameLabels(source, options);
  }
}

// ── the index page's live counts ────────────────────────────────────────────

/**
 * What each card on /cms/teacher/documents says under its title ("3 allergies ·
 * 1 EpiPen"), and — just as importantly — whether the document has anything in
 * it at all. A card that offers to print an empty allergy poster is a card that
 * wastes a teacher's morning; `isEmpty` is what turns it into "add allergies in
 * Roster first".
 */
export interface DocumentCounts {
  children: number;
  allergies: number;
  posterAllergies: number;
  epipens: number;
  severeAllergies: number;
  dietaryRequirements: number;
  dietaryGroups: number;
  collectors: number;
  childrenWithoutCollector: number;
  contacts: number;
  medicalRecords: number;
}

export function countDocumentData(source: DocumentSource): DocumentCounts {
  const dietaryGroups = new Set(
    source.dietary.map((d) => `${d.label.toLocaleLowerCase()}|${d.reason}`)
  );
  let collectors = 0;
  let withoutCollector = 0;
  let contacts = 0;
  for (const child of source.children) {
    const n = collectorsOf(child).length;
    collectors += n;
    contacts += child.guardians.length;
    if (n === 0) withoutCollector += 1;
  }
  return {
    children: source.children.length,
    allergies: source.allergies.length,
    posterAllergies: source.allergies.filter((a) => a.requiresPoster).length,
    epipens: source.allergies.filter((a) => a.carriesEpipen).length,
    severeAllergies: source.allergies.filter((a) => a.severity === 'severe').length,
    dietaryRequirements: source.dietary.length,
    dietaryGroups: dietaryGroups.size,
    collectors,
    childrenWithoutCollector: withoutCollector,
    contacts,
    medicalRecords: source.medical.length,
  };
}

/** Does this document have anything to print? Drives the empty state per card. */
export function hasData(kind: DocumentKind, counts: DocumentCounts): boolean {
  switch (kind) {
    case 'allergy_poster':
      return counts.posterAllergies > 0;
    case 'dietary_sheet':
      return counts.dietaryRequirements > 0 || counts.allergies > 0;
    case 'pickup_sheet':
      return counts.collectors > 0;
    case 'emergency_contacts':
      return counts.contacts > 0;
    case 'class_list':
    case 'name_labels':
      return counts.children > 0;
  }
}
